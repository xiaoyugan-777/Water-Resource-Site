# Research Evidence Matrix — source fields and validation

Source: `data-import/nbs-paper-review-for-map.xlsx`, `all` worksheet (161 records). The website uses the migrated `assets/data/nbs-papers.json` and existing verified geographic link files.

## Dimension availability

| Requested dimension | Source field | Website status |
| --- | --- | --- |
| NbS Type | `2.1 Primary NbS Type` | Available as `NbS Type`; enabled. 139 distinct source labels. |
| Ecosystem | `2.3 Ecosystem Setting` | Available as semicolon-delimited `Ecosystem`; enabled. 75 distinct values after splitting, without renaming. |
| Publication Year | Year parsed from `1.3 Authors and Year` | Available as `Year`; enabled. 23 distinct years; one paper has no verified year and is omitted when Year is an axis. |
| Climate Change Impact | `4.10 Climate impacts addressed` and `4.11 NbS helped address climate impact?` | Present in workbook but not in website JSON as a verified, categorical dimension. Requires a reviewed category vocabulary and paper-level mapping. |
| Social Outcomes | `4.4 Social/cultural outcomes?`, `4.5 Direction — social/cultural`, `4.6 Social/cultural outcomes (detail)` | Present as flags/direction/free-text detail. Requires reviewed outcome categories and mapping; not enabled. |
| Ecological Outcomes | `4.1 Biophysical outcomes?`, `4.2 Direction — biophysical`, `4.3 Biophysical metrics` | Present as flags/direction/free-text metrics. Requires reviewed category mapping; not enabled. |

Geography comes from the existing Case Study Explorer `focus` and sidebar island selection. It is not an axis and no new geographic associations were created.

## Calculation and interaction checks

- Default axes: NbS Type × Ecosystem. Unfiltered geographic scope: All islands, 161 papers represented.
- Selecting Oʻahu in Analytics: 68 papers. Clicking the Oʻahu map polygon while Analytics was open synchronized the geographic selector to Oʻahu without leaving Analytics.
- Clicking the Waiʻanae Kai Forest Reserve area polygon synchronized the selector to that area and reduced the base set to 2 papers. Clicking the Northwestern Region polygon synchronized its scope and showed 3 papers.
- Oʻahu / `Loko iʻa / Indigenous aquaculture / fishpond restoration or management` / `Wetland`: the circle showed 4 and Data View showed exactly 4 matching papers. All four cards listed Oʻahu.
- With the existing Ecosystem sidebar filter `Coastal / marine` also active, the same Oʻahu matrix cell showed 2; Data View showed 2. Independent JSON inspection identified those two papers as IDs 61 and 64.
- Clearing the matrix cell restored the 19-paper Oʻahu + Coastal / marine base set without clearing the geographic scope or sidebar filter.
- The matrix uses sets of paper IDs for cells and totals. A paper with multiple ecosystem values contributes once to a given cell and once to each unique-paper total.
- Selecting Publication Year as an axis represented 160 of 161 papers; the source paper without a year was not assigned an invented year.
- JavaScript syntax and `git diff --check` passed. Browser console had no errors or warnings during the final Analytics checks.

The high cardinality of the source NbS Type and Ecosystem labels makes the full matrix large; the table scrolls horizontally and vertically. No category consolidation or invented statistics were applied. No merge or deployment was performed.
