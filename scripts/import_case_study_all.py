#!/usr/bin/env python3
"""Import the authoritative Excel `all` sheet into the case-study JSON data.

Run from the repository root:
    python3 scripts/import_case_study_all.py

Requires pandas and an .xlsx reader (openpyxl). Existing paper IDs and their
verified location records are retained. Newly imported rows receive only
explicit island/region associations; no points or area polygons are inferred.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-import/nbs-paper-review-for-map.xlsx"
DATA = ROOT / "assets/data"
REPORTS = ROOT / "data-import"

COL = {
    "identifier": "1.1 Paper ID",
    "title": "1.2 Title",
    "authors_year": "1.3 Authors and Year",
    "nbs": "2.1 Primary NbS Type",
    "islands": "2.2 Island(s)",
    "ecosystem": "2.3 Ecosystem Setting",
    "biophysical": "4.3 Biophysical metrics",
    "social": "4.6 Social/cultural outcomes (detail)",
    "economic": "4.8 Economic appraisal type",
}

ISLAND_PATTERNS = (
    ("geo_oahu", r"\boahu\b"),
    ("geo_kauai", r"\bkauai\b"),
    ("geo_maui", r"\bmaui\b"),
    ("geo_molokai", r"\bmolokai\b"),
    ("geo_lanai", r"\blanai\b"),
    ("geo_kahoolawe", r"\bkahoolawe\b"),
    ("geo_niihau", r"\bniihau\b"),
    ("geo_hawaii_island", r"\bhawaii\s+island\b|\bbig\s+island\b"),
)


def clean(value: object) -> str:
    return "" if pd.isna(value) else str(value).strip()


def normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKD", clean(value)).casefold()
    text = "".join(char for char in text if not unicodedata.combining(char))
    return text.replace("ʻ", "'").replace("’", "'").replace("‘", "'")


def normalize_title(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_text(value))


def normalize_identifier(value: object) -> str:
    text = clean(value).lower()
    text = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", text)
    text = re.sub(r"^doi:\s*", "", text)
    doi = re.search(r"10\.\d{4,9}/\S+", text)
    if doi:
        return doi.group(0).rstrip(".,;)")
    return re.sub(r"\s+", "", text)


def parse_year(value: object) -> str:
    match = re.search(r"(?<!\d)((?:19|20)\d{2})(?!\d)", clean(value))
    return match.group(1) if match else ""


def geography(raw: str) -> tuple[list[str], str]:
    """Map only unambiguous island names or explicit archipelago scopes."""
    text = normalize_text(raw).replace("'", "")
    explicit = [unit for unit, pattern in ISLAND_PATTERNS if re.search(pattern, text)]
    if "northwestern hawaiian islands" in text or "papahanaumokuakea" in text:
        explicit.append("geo_nwhi")
    if "pelagic north pacific" in text:
        explicit.append("geo_pelagic_north_pacific")
    if explicit:
        return list(dict.fromkeys(explicit)), "explicit island/region name"

    # These phrases designate the Hawaiian archipelago as a whole. Merely
    # mentioning Hawaiʻi in a comparative or Pacific study does not.
    statewide = (
        "statewide", "hawaii-wide", "hawaiian islands", "hawaiian archipelago",
        "multiple main hawaiian islands", "main hawaiian islands",
    )
    if any(phrase in text for phrase in statewide):
        return ["geo_all_hawaiian_islands"], "explicit archipelago scope"
    return [], "island or region not specific enough for a map association"


def read_all(path: Path) -> list[tuple[int, dict[str, str]]]:
    table = pd.read_excel(path, sheet_name="all", header=[0, 1], dtype=object)
    table.columns = [str(second).strip() for _, second in table.columns]
    missing = set(COL.values()) - set(table.columns)
    if missing:
        raise ValueError(f"The `all` sheet is missing columns: {sorted(missing)}")
    records = []
    for excel_row, row in enumerate(table.to_dict("records"), start=3):
        record = {key: clean(value) for key, value in row.items()}
        if not record[COL["identifier"]] or not record[COL["title"]]:
            raise ValueError(f"Excel row {excel_row} lacks an identifier or title")
        records.append((excel_row, record))
    return records


def indicators(row: dict[str, str]) -> str:
    parts = []
    for label, column in (
        ("Biophysical", COL["biophysical"]),
        ("Social/cultural", COL["social"]),
        ("Economic", COL["economic"]),
    ):
        if row[column]:
            parts.append(f"{label}: {row[column]}")
    return " | ".join(parts)


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def import_data(*, dry_run: bool) -> dict[str, object]:
    source_rows = read_all(SOURCE)
    current_papers = json.loads((DATA / "nbs-papers.json").read_text(encoding="utf-8"))
    current_links = json.loads((DATA / "nbs-paper-locations.json").read_text(encoding="utf-8"))
    current_locations = json.loads((DATA / "nbs-locations.json").read_text(encoding="utf-8"))
    units = {unit["geo_unit_id"]: unit for unit in json.loads(
        (DATA / "nbs-geo-units.json").read_text(encoding="utf-8"))}

    # IDs 1–50 are the curated baseline. Generated IDs start at 51, so a
    # second run replaces its own generated records instead of appending them.
    papers = [paper for paper in current_papers if 1 <= int(paper["paper_id"]) <= 50]
    if len(papers) != 50 or {paper["paper_id"] for paper in papers} != {
        str(number) for number in range(1, 51)
    }:
        raise ValueError("Expected all 50 curated baseline IDs")
    generated_ids = sorted(int(paper["paper_id"]) for paper in current_papers
                           if int(paper["paper_id"]) > 50)
    if generated_ids and generated_ids != list(range(51, 51 + len(generated_ids))):
        raise ValueError("Existing generated paper IDs are not contiguous from 51")
    links = [link for link in current_links if int(link["paper_id"]) <= 50]
    locations = [location for location in current_locations if int(location["paper_id"]) <= 50]

    by_identifier: dict[str, list[int]] = defaultdict(list)
    by_title: dict[str, list[int]] = defaultdict(list)
    for index, (_, row) in enumerate(source_rows):
        by_identifier[normalize_identifier(row[COL["identifier"]])].append(index)
        by_title[normalize_title(row[COL["title"]])].append(index)

    used: set[int] = set()
    audit: list[dict[str, str]] = []
    matched = {}
    for paper in papers:
        identifier = normalize_identifier(paper.get("Paper ID / DOI"))
        title = normalize_title(paper.get("Title"))
        id_hits = by_identifier.get(identifier, []) if identifier else []
        title_hits = by_title.get(title, []) if title else []
        available_id_hits = [index for index in id_hits if index not in used]
        available_title_hits = [index for index in title_hits if index not in used]
        if len(available_id_hits) == 1:
            index, method = available_id_hits[0], "identifier"
        elif len(available_title_hits) == 1:
            index, method = available_title_hits[0], "normalized title"
        else:
            raise ValueError(f"Cannot uniquely match existing paper {paper['paper_id']}")
        used.add(index)
        matched[index] = paper["paper_id"]
        _, row = source_rows[index]
        # The `all` sheet owns current catalogue fields. Curated legacy
        # intervention/status descriptions remain attached to existing IDs.
        paper["Paper ID / DOI"] = row[COL["identifier"]]
        paper["Title"] = row[COL["title"]]
        paper["Year"] = parse_year(row[COL["authors_year"]]) or paper.get("Year", "")
        paper["NbS Type"] = row[COL["nbs"]]
        paper["Ecosystem"] = row[COL["ecosystem"]]
        paper["Indicators Measured / Reported"] = indicators(row)
        audit.append({
            "excel_row": str(source_rows[index][0]), "paper_id": paper["paper_id"],
            "status": "matched_existing", "match_method": method,
            "identifier": row[COL["identifier"]], "title": row[COL["title"]],
            "island_source": row[COL["islands"]], "geo_units": "preserved legacy links",
            "issue": "",
        })

    next_id = max(int(paper["paper_id"]) for paper in papers) + 1
    for index, (excel_row, row) in enumerate(source_rows):
        if index in used:
            continue
        paper_id = str(next_id)
        next_id += 1
        year = parse_year(row[COL["authors_year"]])
        paper = {
            "paper_id": paper_id,
            "Paper ID / DOI": row[COL["identifier"]],
            "Title": row[COL["title"]],
            "Year": year,
            "NbS Type": row[COL["nbs"]],
            "NbS Implementation / Intervention": "",
            "Implementation Status": "",
            "Ecosystem": row[COL["ecosystem"]],
            "Indicators Measured / Reported": indicators(row),
        }
        papers.append(paper)
        unit_ids, reason = geography(row[COL["islands"]])
        for unit_id in unit_ids:
            if unit_id not in units:
                raise ValueError(f"Unknown geographic unit {unit_id} at Excel row {excel_row}")
            unit = units[unit_id]
            links.append({"paper_id": paper_id, "geo_unit_id": unit_id, "area_id": "", "site_id": ""})
            locations.append({
                "paper_id": paper_id, "geo_unit_id": unit_id,
                "geo_unit_name": unit["geo_unit_name"],
                "geo_unit_type": unit["geo_unit_type"],
                "area_id": "", "area_name": "", "site_id": "", "site_name": "",
                "latitude": "", "longitude": "", "coordinate_precision": "",
                "mapping_note": f"Island-level association from `all`!2.2 Island(s): {row[COL['islands']]}",
            })
        issues = []
        if not unit_ids:
            issues.append(reason)
        if not year:
            issues.append("publication year not present in source")
        audit.append({
            "excel_row": str(excel_row), "paper_id": paper_id,
            "status": "new" if unit_ids else "new_geo_unresolved", "match_method": "",
            "identifier": row[COL["identifier"]], "title": row[COL["title"]],
            "island_source": row[COL["islands"]], "geo_units": "; ".join(unit_ids),
            "issue": "; ".join(issues),
        })

    # Report conflicts even if they were already present in the baseline.
    paper_by_identifier: dict[str, list[dict]] = defaultdict(list)
    for paper in papers:
        paper_by_identifier[normalize_identifier(paper["Paper ID / DOI"])].append(paper)
    duplicate_groups = {
        identifier: group for identifier, group in paper_by_identifier.items()
        if identifier and len(group) > 1
    }
    for item in audit:
        identifier = normalize_identifier(item["identifier"])
        if identifier in duplicate_groups:
            item["issue"] = "; ".join(part for part in (
                item["issue"],
                "duplicate identifier with paper IDs " + ", ".join(
                    paper["paper_id"] for paper in duplicate_groups[identifier]),
            ) if part)

    ids = [paper["paper_id"] for paper in papers]
    if len(ids) != len(set(ids)):
        raise ValueError("Imported paper IDs are not unique")
    if len(papers) != len(source_rows):
        raise ValueError("Every `all` row must map to exactly one output record")
    if any(link["paper_id"] not in set(ids) or link["geo_unit_id"] not in units for link in links):
        raise ValueError("A paper-location link references a missing paper or geo unit")
    if any(loc["paper_id"] not in set(ids) for loc in locations):
        raise ValueError("A location references a missing paper")

    summary = {
        "source_rows": len(source_rows), "matched_existing": len(matched),
        "new_records": len(source_rows) - len(matched),
        "output_records": len(papers),
        "duplicate_identifiers": [
            {"identifier": identifier, "paper_ids": [paper["paper_id"] for paper in group],
             "titles": [paper["Title"] for paper in group]}
            for identifier, group in duplicate_groups.items()
        ],
        "new_geographically_unresolved": sum(item["status"] == "new_geo_unresolved" for item in audit),
        "new_missing_year": sum(item["status"].startswith("new") and
                                "publication year" in item["issue"] for item in audit),
        "paper_location_links": len(links), "location_rows": len(locations),
    }
    if not dry_run:
        write_json(DATA / "nbs-papers.json", papers)
        write_json(DATA / "nbs-paper-locations.json", links)
        write_json(DATA / "nbs-locations.json", locations)
        with (REPORTS / "case-study-migration.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(audit[0]))
            writer.writeheader()
            writer.writerows(sorted(audit, key=lambda item: int(item["excel_row"])))
        report = [
            "# Case Study Explorer data migration",
            "",
            "Source: `data-import/nbs-paper-review-for-map.xlsx`, worksheet `all`, rows 3–163.",
            "The two worksheet header rows are excluded from the 161 source records.",
            "",
            f"- Source rows: {summary['source_rows']}",
            f"- Matched existing website records: {summary['matched_existing']}",
            f"- Newly added records: {summary['new_records']}",
            f"- Output catalogue records: {summary['output_records']}",
            f"- New records without a defensible island/region association: {summary['new_geographically_unresolved']}",
            f"- New records without a publication year: {summary['new_missing_year']}",
            "",
            "## Field mapping",
            "",
            "| Website field | `all` column |",
            "| --- | --- |",
            "| `Paper ID / DOI` | `1.1 Paper ID` |",
            "| `Title` | `1.2 Title` |",
            "| `Year` | First four-digit publication year in `1.3 Authors and Year` |",
            "| `NbS Type` | `2.1 Primary NbS Type` |",
            "| Island/region link | `2.2 Island(s)`; explicit names only |",
            "| `Ecosystem` | `2.3 Ecosystem Setting` |",
            "| `Indicators Measured / Reported` | `4.3 Biophysical metrics`, `4.6 Social/cultural outcomes (detail)`, `4.8 Economic appraisal type` |",
            "",
            "Existing paper IDs and geographic associations were preserved. New records have no invented area, site, latitude, or longitude. The raw island description remains in `case-study-migration.csv`.",
            "",
            "## Duplicate and unresolved records",
            "",
        ]
        for group in summary["duplicate_identifiers"]:
            report.append(f"- Identifier `{group['identifier']}` occurs in paper IDs {', '.join(group['paper_ids'])}. These were already separate entries in the 50-record baseline; review whether ID 46 should be retired in a dedicated cleanup. Both remain for this migration.")
        report.extend([
            "- See `case-study-migration.csv` for every source row, match method, duplicate flag, island association, and unresolved issue.",
            "- Unresolved records remain visible in Data View and appear under All islands; an island filter does not include them until geography is verified.",
            "- No source column supplies verified new coordinates, study sites, or polygon geometries.",
            "",
            "## Reproduction",
            "",
            "Run `python3 scripts/import_case_study_all.py` from the repository root with pandas and openpyxl installed. Repeated runs replace generated IDs 51 onward. `--dry-run` checks counts without writing files.",
            "",
        ])
        (REPORTS / "case-study-migration.md").write_text("\n".join(report), encoding="utf-8")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="validate and report counts without writing files")
    args = parser.parse_args()
    print(json.dumps(import_data(dry_run=args.dry_run), ensure_ascii=False, indent=2))
