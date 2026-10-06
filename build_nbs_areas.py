#!/usr/bin/env python3
"""Build Leaflet-ready polygons for the normalized NbS Locations.area field.

The script queries authoritative ArcGIS REST services, keeps only project areas,
documents substitutions, repairs/simplifies geometry, and writes RFC 7946
GeoJSON in EPSG:4326.  Areas without a defensible polygon are retained with a
null geometry and ``geometry_status=unresolved`` so the audit trail is complete.

Run with the Python environment bundled with QGIS, for example:

  PYTHONHOME=/Applications/QGIS.app/Contents/Frameworks \
  PROJ_DATA=/Applications/QGIS.app/Contents/Resources/qgis/proj \
  /Applications/QGIS.app/Contents/MacOS/python3.12 build_nbs_areas.py \
    --locations "/path/to/nbs-paper-review-for-map - Locations.csv"
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
from shapely import make_valid
from shapely.geometry import MultiPolygon, mapping, shape
from shapely.ops import unary_union


AHUPUAA_URL = (
    "https://geodata.hawaii.gov/arcgis/rest/services/"
    "HistoricCultural/MapServer/1"
)
MOKU_URL = (
    "https://geodata.hawaii.gov/arcgis/rest/services/"
    "HistoricCultural/MapServer/3"
)
RESERVES_URL = (
    "https://geodata.hawaii.gov/arcgis/rest/services/"
    "Terrestrial/MapServer/1"
)
MARINE_URL = (
    "https://geodata.hawaii.gov/arcgis/rest/services/"
    "CoastalMarine/MapServer/39"
)
PMNM_URL = (
    "https://gis.ngdc.noaa.gov/arcgis/rest/services/nccos/"
    "PMNM_DSCS_Predictions/MapServer/0"
)

STATE_SOURCE = "Hawaiʻi Statewide GIS / DLNR"
STATE_AHUPUAA_SOURCE = "Hawaiʻi Statewide GIS / OHA / DLNR SHPD Ahupuaʻa"
STATE_MOKU_SOURCE = "Hawaiʻi Statewide GIS / DLNR SHPD Moku"
MARINE_SOURCE = "Hawaiʻi DLNR Division of Aquatic Resources"
NOAA_SOURCE = "NOAA Papahānaumokuākea Marine National Monument"


def normalize(value: str) -> str:
    """ASCII-only comparison key; output labels always preserve Hawaiian marks."""
    value = unicodedata.normalize("NFKD", value or "")
    value = value.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "", value)


def query_geojson(layer_url: str, where: str = "1=1") -> gpd.GeoDataFrame:
    """Query a public ArcGIS layer as GeoJSON in WGS 84."""
    response = requests.get(
        f"{layer_url}/query",
        params={
            "where": where,
            "outFields": "*",
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
        },
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        raise RuntimeError(f"ArcGIS error from {layer_url}: {data['error']}")
    return gpd.GeoDataFrame.from_features(data.get("features", []), crs="EPSG:4326")


def selected_union(frame: gpd.GeoDataFrame, mask) -> object:
    """Return a repaired union for selected polygons, failing on empty matches."""
    selected = frame.loc[mask]
    if selected.empty:
        raise RuntimeError("An expected authoritative GIS feature was not found")
    geometries = [make_valid(g) for g in selected.geometry if g is not None and not g.is_empty]
    if not geometries:
        raise RuntimeError("Matched features contain no usable geometry")
    return make_valid(unary_union(geometries))


def simplify_web(geometry, tolerance_degrees: float = 0.00025):
    """Topology-preserving simplification (~25 m in Hawaiʻi) for web display."""
    if geometry is None:
        return None
    geometry = polygon_only(make_valid(geometry))
    geometry = geometry.simplify(tolerance_degrees, preserve_topology=True)
    return polygon_only(make_valid(geometry))


def polygon_only(geometry):
    """Discard line/point artifacts from MakeValid while retaining all polygons."""
    if geometry is None or geometry.is_empty:
        return None
    if geometry.geom_type == "Polygon":
        return geometry
    if geometry.geom_type == "MultiPolygon":
        return geometry

    polygons = []

    def collect(part):
        if part is None or part.is_empty:
            return
        if part.geom_type == "Polygon":
            polygons.append(part)
        else:
            for child in getattr(part, "geoms", []):
                collect(child)

    collect(geometry)
    if not polygons:
        raise ValueError(f"Geometry contains no polygonal component: {geometry.geom_type}")
    # Constructing explicitly prevents line/point artifacts from reappearing in
    # a subsequent MakeValid operation. Source polygon parts are non-overlapping
    # after the union/repair steps above.
    return polygons[0] if len(polygons) == 1 else MultiPolygon(polygons)


def read_project_areas(path: Path) -> list[tuple[str, str]]:
    """Return distinct nonblank (area, island) pairs in source-table order."""
    areas: OrderedDict[str, str] = OrderedDict()
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            area = (row.get("area") or "").strip()
            island = (row.get("island") or "").strip()
            # The table contains both labels for the same multi-island category.
            if island == "Multiple Hawaiian Islands":
                island = "Multiple"
            if not area:
                continue
            if area in areas and areas[area] != island:
                raise ValueError(f"Area {area!r} has conflicting islands")
            areas.setdefault(area, island)
    return list(areas.items())


def build(locations_path: Path, output_path: Path, report_path: Path) -> None:
    project_areas = read_project_areas(locations_path)

    # Read authoritative layers once. Selection below is deliberately explicit.
    ahu = query_geojson(AHUPUAA_URL)
    moku = query_geojson(MOKU_URL)
    reserves = query_geojson(RESERVES_URL)
    marine = query_geojson(MARINE_URL)
    pmnm = query_geojson(PMNM_URL)

    ahu_key = ahu["ahupuaa"].fillna("").map(normalize)
    ahu_island_key = ahu["mokupuni"].fillna("").map(normalize)
    moku_key = moku["moku"].fillna("").map(normalize)
    moku_island_key = moku["mokupuni"].fillna("").map(normalize)
    reserve_key = reserves["name"].fillna("").map(normalize)

    geometries: dict[str, dict] = {}

    def match(area, island, source, url, status, note, geometry):
        geometries[area] = {
            "island": island,
            "source_name": source,
            "source_url": url,
            "geometry_status": status,
            "geometry_note": note,
            "geometry": simplify_web(geometry),
        }

    # Historic land divisions.
    match(
        "Heʻeia ahupuaʻa", "Oʻahu", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "exact", "Exact official Heʻeia ahupuaʻa boundary; multipart pieces dissolved.",
        selected_union(ahu, (ahu_key == "heeia") & (ahu_island_key == "oahu")),
    )
    match(
        "Limahuli Valley, Hāʻena", "Kauaʻi", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary",
        "Official Hāʻena ahupuaʻa used because a separate authoritative Limahuli Valley polygon was not found.",
        selected_union(ahu, (ahu_key == "haena") & (ahu_island_key == "kauai")),
    )
    match(
        "Hālawa Valley", "Molokaʻi", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary", "Official Hālawa ahupuaʻa used as the defensible boundary for the named valley.",
        selected_union(ahu, (ahu_key == "halawa") & (ahu_island_key == "molokai")),
    )
    kaupulehu = selected_union(ahu, (ahu_key == "kaupulehu") & (ahu_island_key == "hawaii"))
    match(
        "Kaʻūpūlehu Preserve, North Kona", "Hawaiʻi Island", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary",
        "Official Kaʻūpūlehu ahupuaʻa used because a public authoritative preserve boundary was not found.",
        kaupulehu,
    )
    match(
        "Kaʻūpūlehu dryland forest", "Hawaiʻi Island", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary",
        "Official Kaʻūpūlehu ahupuaʻa used because the dryland-forest study footprint is not an official polygon.",
        kaupulehu,
    )
    match(
        "Waiʻoli Valley", "Kauaʻi", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary", "Official Waiʻoli ahupuaʻa used as the defensible boundary for the named valley.",
        selected_union(ahu, (ahu_key == "waioli") & (ahu_island_key == "kauai")),
    )
    match(
        "Kaʻāmola ahupuaʻa", "Molokaʻi", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "exact", "Exact official Kaʻamola ahupuaʻa boundary.",
        selected_union(ahu, (ahu_key == "kaamola") & (ahu_island_key == "molokai")),
    )
    match(
        "Lāʻie / BYU–Hawaiʻi campus case", "Oʻahu", STATE_AHUPUAA_SOURCE, AHUPUAA_URL,
        "broader_boundary",
        "Official Lāʻiewai and Lāʻiemaloʻo ahupuaʻa dissolved as a broader Lāʻie unit; the campus footprint is smaller.",
        selected_union(
            ahu,
            ahu_key.isin(["laiewai", "laiemaloo"]) & (ahu_island_key == "oahu"),
        ),
    )
    match(
        "Kona", "Hawaiʻi Island", STATE_MOKU_SOURCE, MOKU_URL,
        "broader_boundary",
        "Official Kona moku on Hawaiʻi Island used; the source wording does not distinguish North from South Kona.",
        selected_union(moku, (moku_key == "kona") & (moku_island_key == "hawaii")),
    )

    # Managed terrestrial areas, refuges, and parks.
    match(
        "East Maui, including Waikamoi", "Maui", STATE_SOURCE, RESERVES_URL,
        "approximate",
        "Official Waikamoi Preserve and Waikamoi Preserve EMI polygons used; these do not represent all of East Maui.",
        selected_union(reserves, reserve_key.str.startswith("waikamoipreserve")),
    )
    match(
        "Puʻu Waʻawaʻa, North Kona", "Hawaiʻi Island", STATE_SOURCE, RESERVES_URL,
        "approximate",
        "Official Puʻu Waʻawaʻa Forest Reserve and Forest Bird Sanctuary used for the broader named locality.",
        selected_union(reserves, reserve_key.isin(["puuwaawaaforestreserve", "puuwaawaaforestbirdsanctuary"])),
    )
    match(
        "Waiʻanae Kai Forest Reserve", "Oʻahu", STATE_SOURCE, RESERVES_URL,
        "exact", "Exact official Waiʻanae Kai Forest Reserve boundary.",
        selected_union(reserves, reserve_key == "waianaekaiforestreserve"),
    )
    match(
        "Hakalau Forest National Wildlife Refuge", "Hawaiʻi Island", STATE_SOURCE, RESERVES_URL,
        "exact",
        "Official Hakalau Forest National Wildlife Refuge units dissolved into one logical refuge feature.",
        selected_union(reserves, reserve_key.str.startswith("hakalauforestnationalwildliferefuge")),
    )
    match(
        "Keālia Pond National Wildlife Refuge", "Maui", STATE_SOURCE, RESERVES_URL,
        "exact", "Exact official Keālia Pond National Wildlife Refuge boundary.",
        selected_union(reserves, reserve_key == "kealiapondnationalwildliferefuge"),
    )
    match(
        "Hawaiʻi Volcanoes National Park", "Hawaiʻi Island", STATE_SOURCE, RESERVES_URL,
        "exact", "Official national-park component polygons dissolved into one park feature.",
        selected_union(reserves, reserve_key == "hawaiivolcanoesnationalpark"),
    )
    match(
        "Pōhakuloa, Hawaiʻi Volcanoes National Park, and Puʻu Makaʻala",
        "Hawaiʻi Island", STATE_SOURCE, RESERVES_URL, "exact",
        "Named official Pōhakuloa, Hawaiʻi Volcanoes National Park, and Puʻu Makaʻala units dissolved as one multipart project geography.",
        selected_union(
            reserves,
            reserve_key.str.startswith("pohakuloatrainingareareservation")
            | (reserve_key == "hawaiivolcanoesnationalpark")
            | (reserve_key == "puumakaalanaturalareareserve"),
        ),
    )

    # Marine areas.
    marine_site_key = marine["site_name"].fillna("").map(normalize)
    match(
        "Kāneʻohe Bay (Moku o Loʻe)", "Oʻahu", MARINE_SOURCE, MARINE_URL,
        "approximate",
        "Official Moku o Loʻe marine laboratory refuge used; it is within Kāneʻohe Bay but does not cover the entire bay.",
        selected_union(marine, marine_site_key.str.startswith("mokuoloe")),
    )
    match(
        "11 MLCDs plus the Moku o Loʻe marine refuge", "Multiple", MARINE_SOURCE, MARINE_URL,
        "exact",
        "All official DLNR Marine Life Conservation District polygons plus the Moku o Loʻe refuge dissolved into one multipart feature.",
        selected_union(
            marine,
            (marine["major_class"].fillna("") == "MLCD")
            | marine_site_key.str.startswith("mokuoloe"),
        ),
    )
    match(
        "Papahānaumokuākea region", "Northwestern Hawaiian Islands", NOAA_SOURCE, PMNM_URL,
        "approximate",
        "Official NOAA Papahānaumokuākea Marine National Monument boundary used for the broader 'region' wording.",
        selected_union(pmnm, pd.Series(True, index=pmnm.index)),
    )

    unresolved_notes = {
        "statewide": "Statewide is an aggregate/island-level concept, not a single project area polygon.",
        "primarily the north shore; comparative Indigenous land-trust examples elsewhere": "The wording combines an imprecise shore region with unspecified comparison sites.",
        "multiple forest sites": "Multiple forest sites are not named, so no defensible polygon can be selected.",
        "multiple urban sites including Kānewai and Kalauao/Kaʻōnohi": "The wording combines multiple local sites and does not define a single official project boundary.",
        "ʻUlupalakua Ranch / Puʻu Makua": "No authoritative public ranch/project boundary was found for this combined wording.",
        "Heʻeia Fishpond, Kāneʻohe Bay": "The wording combines a fishpond and a much larger bay; no single official polygon represents both.",
        "Kumaipo fire area": "A current authoritative public incident/study perimeter was not identified.",
        "Kanakaleonui Bird Corridor, Mauna Kea region": "No authoritative public bird-corridor polygon was identified.",
        "main Hawaiian Islands and Northwestern Hawaiian Islands": "This is a cross-archipelago aggregate already represented at island level, not one area polygon.",
        "linked to the Hawaiʻi-based longline fishery": "A fishery linkage is not a bounded project geography.",
        "five loko iʻa sites in the Hilo/Keaukaha area": "The five sites are not named in the normalized area field.",
        "Koʻolau watershed and Pearl Harbor aquifer": "The wording combines different watershed and aquifer geographies; no single boundary is defensible.",
        "Koʻolau and Waiʻanae watersheds / Pearl Harbor aquifer": "The wording combines several watershed and aquifer units; no single boundary is defensible.",
        "Mahanaloa Gulch": "No authoritative public polygon for the named gulch was identified.",
        "Kohala watershed and Pelekane Bay": "The wording combines an upland watershed and coastal bay without a defined project footprint.",
        "all major islands": "This is an island-level aggregate, not a distinct area polygon.",
        "ʻUlupalakua Ranch": "No authoritative public ranch boundary was identified.",
        "Hawaiʻi, Palau, and Pacific Northwest/Alaska examples": "The wording combines widely separated illustrative examples and is not one project geography.",
        "three dryland plant communities": "The communities are not named as official spatial units.",
        "13 exclosures across a rainfall gradient": "Individual exclosure locations and boundaries are not provided.",
    }

    rows = []
    for index, (area, island) in enumerate(project_areas, start=1):
        if area in geometries:
            record = geometries[area]
            if record["island"] != island:
                raise ValueError(
                    f"Island mismatch for {area!r}: table={island!r}, match={record['island']!r}"
                )
        else:
            record = {
                "island": island,
                "source_name": "",
                "source_url": "",
                "geometry_status": "unresolved",
                "geometry_note": unresolved_notes.get(
                    area, "No defensible authoritative polygon was identified for this wording."
                ),
                "geometry": None,
            }
        rows.append(
            {
                "area_id": f"area_{index:03d}",
                "area_name": area,
                "island": record["island"],
                "source_name": record["source_name"],
                "source_url": record["source_url"],
                "geometry_status": record["geometry_status"],
                "geometry_note": record["geometry_note"],
                "geometry": record["geometry"],
            }
        )

    output = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    # Final validity and duplicate-ID checks.
    if output["area_id"].duplicated().any() or output["area_name"].duplicated().any():
        raise ValueError("Unexpected duplicate area identifiers or names")
    nonnull = output.geometry.notna()
    output.loc[nonnull, "geometry"] = output.loc[nonnull, "geometry"].map(
        lambda geometry: polygon_only(make_valid(geometry))
    )
    invalid = output.loc[nonnull & ~output.geometry.is_valid]
    if not invalid.empty:
        raise ValueError(f"Invalid output geometries: {invalid['area_name'].tolist()}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    # Write RFC 7946 directly. GDAL's RFC7946 writer can introduce lower-
    # dimensional antimeridian repair artifacts into otherwise polygon-only
    # features; direct serialization preserves the audited geometry types.
    def rounded(value):
        if isinstance(value, (list, tuple)):
            return [rounded(item) for item in value]
        if isinstance(value, float):
            # Eight decimal places avoids topology collapse in tiny marine and
            # park-boundary slivers while remaining compact for the web.
            return round(value, 8)
        return value

    features = []
    for row in rows:
        geometry = row["geometry"]
        properties = {key: value for key, value in row.items() if key != "geometry"}
        geometry_json = None
        if geometry is not None:
            geometry_json = mapping(geometry)
            geometry_json = {
                "type": geometry_json["type"],
                "coordinates": rounded(geometry_json["coordinates"]),
            }
            # Precision rounding can collapse a negligible sliver to a point.
            # Repair after rounding, then strip any non-polygon artifacts.
            geometry = polygon_only(make_valid(shape(geometry_json)))
            geometry_json = mapping(geometry)
        features.append(
            {"type": "Feature", "properties": properties, "geometry": geometry_json}
        )
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(
            {"type": "FeatureCollection", "features": features},
            handle,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    # Re-open the artifact to prove it is valid GeoJSON and WGS 84.
    check = gpd.read_file(output_path)
    if check.crs is None or check.crs.to_epsg() != 4326:
        raise ValueError(f"Unexpected output CRS: {check.crs}")
    if len(check) != len(output):
        raise ValueError("GeoJSON re-open count differs from source count")
    with output_path.open(encoding="utf-8") as handle:
        parsed = json.load(handle)
    if parsed.get("type") != "FeatureCollection":
        raise ValueError("Output is not a GeoJSON FeatureCollection")

    report = output.drop(columns="geometry").copy()
    report["has_geometry"] = output.geometry.notna()
    report.to_csv(report_path, index=False, encoding="utf-8")

    counts = output["geometry_status"].value_counts().to_dict()
    print(f"Wrote {output_path} ({len(output)} records; {nonnull.sum()} polygons)")
    print(f"Status counts: {counts}")
    print(f"Wrote audit report: {report_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--locations",
        type=Path,
        default=Path.home() / "Downloads" / "nbs-paper-review-for-map - Locations.csv",
        help="Path to the Locations CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).with_name("nbs-areas.geojson"),
        help="Output GeoJSON path",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(__file__).with_name("nbs-area-resolution.csv"),
        help="Output resolution audit CSV",
    )
    args = parser.parse_args()
    build(args.locations.expanduser().resolve(), args.output.resolve(), args.report.resolve())


if __name__ == "__main__":
    main()
