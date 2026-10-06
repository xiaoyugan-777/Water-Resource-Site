#!/usr/bin/env python3
"""Enrich an existing nbs-areas GeoJSON from the Locations hierarchy table.

This is deliberately a properties-only operation. Existing GeoJSON geometry
objects are copied unchanged and compared before and after writing. Any geometry
change, ambiguous table mapping, duplicate area ID, or invalid polygon aborts
the update.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape


HIERARCHY_FIELDS = (
    "area_id",
    "area_name",
    "island",
    "parent_island_id",
)


def clean(value: object) -> str:
    return "" if value is None else str(value).strip()


def geometry_digest(features: list[dict]) -> str:
    """Stable digest of geometry JSON only, preserving feature order."""
    payload = [feature.get("geometry") for feature in features]
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def read_locations(path: Path) -> dict[str, dict[str, str]]:
    """Create an exact-area lookup using nonblank-ID rows as authoritative."""
    groups: dict[str, list[dict[str, str]]] = defaultdict(list)
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {
            "area",
            "island",
            "island_id",
            "area_id",
            "parent_island_id",
        }
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Locations table is missing fields: {sorted(missing)}")
        for row in reader:
            area = clean(row.get("area"))
            if area:
                groups[area].append({key: clean(value) for key, value in row.items()})

    lookup: dict[str, dict[str, str]] = {}
    for area, rows in groups.items():
        # Prefer rows already participating in the updated hierarchy. This
        # resolves the legacy blank-ID duplicate for the statewide record.
        candidates = [row for row in rows if row["area_id"]]
        if not candidates:
            candidates = rows

        result = {"area_name": area}
        for field in ("area_id", "island", "island_id", "parent_island_id"):
            values = {row[field] for row in candidates}
            if len(values) != 1:
                raise ValueError(
                    f"Ambiguous {field} values for area {area!r}: {sorted(values)!r}"
                )
            result[field] = values.pop()
        lookup[area] = result
    return lookup


def validate_geometry(document: dict) -> None:
    """Verify all non-null geometries are valid polygons in lon/lat bounds."""
    for feature in document.get("features", []):
        geometry_json = feature.get("geometry")
        if geometry_json is None:
            continue
        geometry = shape(geometry_json)
        name = feature.get("properties", {}).get("area_name", "<unnamed>")
        if geometry.geom_type not in {"Polygon", "MultiPolygon"}:
            raise ValueError(f"Non-polygon geometry for {name!r}: {geometry.geom_type}")
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Invalid or empty geometry for {name!r}")
        xmin, ymin, xmax, ymax = geometry.bounds
        if xmin < -180 or xmax > 180 or ymin < -90 or ymax > 90:
            raise ValueError(f"Coordinates outside EPSG:4326 bounds for {name!r}")


def enrich(
    locations_path: Path,
    geojson_path: Path,
    report_path: Path,
) -> None:
    lookup = read_locations(locations_path)
    with geojson_path.open(encoding="utf-8") as handle:
        document = json.load(handle)

    if document.get("type") != "FeatureCollection":
        raise ValueError("Input is not a GeoJSON FeatureCollection")
    features = document.get("features", [])
    before_digest = geometry_digest(features)
    before_geometries = [feature.get("geometry") for feature in features]
    validate_geometry(document)

    report_rows: list[dict[str, str]] = []
    matched_ids: list[str] = []
    unmatched: list[str] = []

    for feature in features:
        properties = feature.setdefault("properties", {})
        area_name = clean(properties.get("area_name"))
        hierarchy = lookup.get(area_name)
        if hierarchy is None:
            unmatched.append(area_name)
            report_rows.append(
                {
                    "area_name": area_name,
                    "match_status": "unmatched",
                    "area_id": clean(properties.get("area_id")),
                    "island": clean(properties.get("island")),
                    "island_id": "",
                    "parent_island_id": clean(properties.get("parent_island_id")),
                    "hierarchy_note": "No exact Locations.area match; properties unchanged.",
                    "has_geometry": str(feature.get("geometry") is not None).lower(),
                }
            )
            continue

        # Update only Area-level hierarchy fields. Never add site_id or
        # parent_area_id, which belong to lower-level site/anchor records.
        properties["area_id"] = hierarchy["area_id"]
        properties["area_name"] = hierarchy["area_name"]
        properties["island"] = hierarchy["island"]
        properties["parent_island_id"] = hierarchy["parent_island_id"]

        if hierarchy["area_id"]:
            matched_ids.append(hierarchy["area_id"])

        issues = []
        if not hierarchy["area_id"]:
            issues.append("missing area_id")
        if not hierarchy["parent_island_id"]:
            issues.append("missing parent_island_id")
        if hierarchy["parent_island_id"] != hierarchy["island_id"]:
            issues.append(
                "parent_island_id does not equal the Locations island_id"
            )
        status = "matched" if not issues else "matched_hierarchy_incomplete"
        report_rows.append(
            {
                "area_name": area_name,
                "match_status": status,
                "area_id": hierarchy["area_id"],
                "island": hierarchy["island"],
                "island_id": hierarchy["island_id"],
                "parent_island_id": hierarchy["parent_island_id"],
                "hierarchy_note": "; ".join(issues),
                "has_geometry": str(feature.get("geometry") is not None).lower(),
            }
        )

    duplicate_ids = sorted(
        area_id for area_id in set(matched_ids) if matched_ids.count(area_id) > 1
    )
    if duplicate_ids:
        raise ValueError(f"Duplicate matched area_id values: {duplicate_ids}")

    # Site-only hierarchy fields must never be introduced on area features.
    for feature in features:
        properties = feature.get("properties", {})
        if "site_id" in properties or "parent_area_id" in properties:
            raise ValueError("Area feature contains a site-only hierarchy field")

    validate_geometry(document)
    if before_geometries != [feature.get("geometry") for feature in features]:
        raise ValueError("Geometry changed in memory during hierarchy enrichment")
    if before_digest != geometry_digest(features):
        raise ValueError("Geometry digest changed during hierarchy enrichment")

    temporary = geojson_path.with_suffix(geojson_path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, separators=(",", ":"))

    # Reopen the exact artifact before replacing the original.
    with temporary.open(encoding="utf-8") as handle:
        written = json.load(handle)
    if before_geometries != [
        feature.get("geometry") for feature in written.get("features", [])
    ]:
        temporary.unlink(missing_ok=True)
        raise ValueError("Serialized geometry differs from the original")
    if before_digest != geometry_digest(written.get("features", [])):
        temporary.unlink(missing_ok=True)
        raise ValueError("Serialized geometry digest differs from the original")
    validate_geometry(written)
    os.replace(temporary, geojson_path)

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(report_rows[0]))
        writer.writeheader()
        writer.writerows(report_rows)

    complete = sum(row["match_status"] == "matched" for row in report_rows)
    incomplete = sum(
        row["match_status"] == "matched_hierarchy_incomplete"
        for row in report_rows
    )
    print(f"Features: {len(features)}")
    print(f"Matched with complete hierarchy: {complete}")
    print(f"Matched with table hierarchy gaps: {incomplete}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"Geometry SHA-256 preserved: {before_digest}")
    print(f"Updated: {geojson_path}")
    print(f"Report: {report_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--locations",
        type=Path,
        default=Path.home() / "Downloads" / "nbs-paper-review-for-map - Locations.csv",
    )
    parser.add_argument(
        "--geojson",
        type=Path,
        default=Path(__file__).with_name("nbs-areas.geojson"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(__file__).with_name("nbs-area-hierarchy-report.csv"),
    )
    args = parser.parse_args()
    enrich(
        args.locations.expanduser().resolve(),
        args.geojson.expanduser().resolve(),
        args.report.expanduser().resolve(),
    )


if __name__ == "__main__":
    main()
