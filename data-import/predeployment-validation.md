# Case Study Explorer pre-deployment validation — 2026-10-19

Status: **Ready for deployment review after polygon-click fix.** No merge or deployment was performed.

## Final browser checks

- The updated catalogue loads with 161 papers. Previous checks confirmed all 161 in unfiltered Data View, functioning island/NbS Type/Ecosystem filters, 16 geographically unresolved papers in All islands, HCDP rainfall lookup, and a 161-row CSV export.
- Direct polygon clicks were tested in the local Chrome page. An Oʻahu island path, an Oʻahu area path, and the Northwestern Hawaiian Islands region path were each hit directly. None retained a geographic selection in Data View; results reverted to the unselected list (161 unfiltered, or 68 under the Oʻahu filter). By contrast, the Northwestern Region sidebar control selected three related papers. This is a deployment-blocking map interaction defect.
- The browser log exposed one `TypeError: not granted` entry with the page URL, but did not provide a stack or a reproducible connection to the polygon issue. No failed-resource message was present in the available log. Network-request status could not be inspected comprehensively through the available browser interface. The loaded map tiles, 161-paper catalogue, and rainfall value demonstrate that those resources were available in this session, not that every request succeeded.

## Post-fix browser validation

Leaflet was bubbling polygon clicks to the map-level click handler, which immediately cleared the geographic focus. Mouse-event bubbling is now disabled for island, area, and region GeoJSON layers; the map background click and rainfall query remain unchanged.

- Direct Oʻahu island polygon click: Data View retained `SELECTED GEO Oʻahu` and showed 68 related papers.
- Direct Waiʻanae Kai Forest Reserve area polygon click: Data View retained `SELECTED AREA` and showed 2 related papers.
- Direct Northwestern Region polygon click: Data View retained `SELECTED GEO Northwestern Region` and showed 3 related papers.
- The rainfall panel showed each selected area. The updated page loaded the 161-paper catalogue, and the fresh browser console contained no errors or warnings after all three clicks.
- JavaScript syntax checks for the explorer and rainfall scripts and `git diff --check` passed. No automated browser-test suite was found in the repository.

The earlier `TypeError: not granted` was not reproduced in the fresh post-fix console; its origin remains undetermined. Papers 144 and 151 remain manual data-review items, and duplicate DOI records 12 and 46 remain unchanged. These are documented data-quality items, not blockers for the repaired polygon interaction.

## Data items retained for manual review

- Paper 144: keep the current Hawaiʻi Island association. Its source also mentions statewide Kamehameha Schools lands; review whether broader scope should be represented later.
- Paper 151: keep the current Molokaʻi association. Its source also says statewide applicability; review whether broader scope should be represented later.
- Paper IDs 12 and 46 share DOI `10.3390/su15139937`; retain both records unchanged pending a separate duplicate decision.

The migration data and unrelated site features were not changed during this final check.
