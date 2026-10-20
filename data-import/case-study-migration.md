# Case Study Explorer data migration

Source: `data-import/nbs-paper-review-for-map.xlsx`, worksheet `all`, rows 3–163.
The two worksheet header rows are excluded from the 161 source records.

- Source rows: 161
- Matched existing website records: 50
- Newly added records: 111
- Output catalogue records: 161
- New records without a defensible island/region association: 16
- New records without a publication year: 1

## Field mapping

| Website field | `all` column |
| --- | --- |
| `Paper ID / DOI` | `1.1 Paper ID` |
| `Title` | `1.2 Title` |
| `Year` | First four-digit publication year in `1.3 Authors and Year` |
| `NbS Type` | `2.1 Primary NbS Type` |
| Island/region link | `2.2 Island(s)`; explicit names only |
| `Ecosystem` | `2.3 Ecosystem Setting` |
| `Indicators Measured / Reported` | `4.3 Biophysical metrics`, `4.6 Social/cultural outcomes (detail)`, `4.8 Economic appraisal type` |

Existing paper IDs and geographic associations were preserved. New records have no invented area, site, latitude, or longitude. The raw island description remains in `case-study-migration.csv`.

## Duplicate and unresolved records

- Identifier `10.3390/su15139937` occurs in paper IDs 12, 46. These were already separate entries in the 50-record baseline; review whether ID 46 should be retired in a dedicated cleanup. Both remain for this migration.
- See `case-study-migration.csv` for every source row, match method, duplicate flag, island association, and unresolved issue.
- Unresolved records remain visible in Data View and appear under All islands; an island filter does not include them until geography is verified.
- No source column supplies verified new coordinates, study sites, or polygon geometries.

## Reproduction

Run `python3 scripts/import_case_study_all.py` from the repository root with pandas and openpyxl installed. Repeated runs replace generated IDs 51 onward. `--dry-run` checks counts without writing files.
