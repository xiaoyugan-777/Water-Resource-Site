(() => {
  const root = document.querySelector("[data-case-study-explorer]");
  if (!root) return;

  const scriptURL = document.currentScript.src;
  const logoURL = new URL("../images/oleson-lab-logo.png", scriptURL).href;
  const dataURLs = {
    coast: new URL("../data/hawaii-coast.geojson", scriptURL),
    areas: new URL("../data/nbs-areas.geojson", scriptURL),
    region: new URL("../data/nbs-map-region.geojson", scriptURL),
    areaIdMap: new URL("../data/nbs-area-id-map.json", scriptURL),
    papers: new URL("../data/nbs-papers.json", scriptURL),
    locations: new URL("../data/nbs-locations.json", scriptURL),
    paperLocations: new URL("../data/nbs-paper-locations.json", scriptURL),
    geoUnits: new URL("../data/nbs-geo-units.json", scriptURL),
    members: new URL("../data/nbs-geo-unit-members.json", scriptURL),
  };
  const rainfallURLs = {
    values: new URL("../data/rainfall-values.png", scriptURL),
    metadata: new URL("../data/rainfall-metadata.json", scriptURL),
  };

  const ISLE_TO_GEO = {
    Kauai: "geo_kauai",
    Niihau: "geo_niihau",
    Oahu: "geo_oahu",
    Molokai: "geo_molokai",
    Maui: "geo_maui",
    Lanai: "geo_lanai",
    kahoolawe: "geo_kahoolawe",
    Hawaii: "geo_hawaii_island",
  };
  const ISLAND_FILTER_ORDER = [
    "geo_kauai",
    "geo_niihau",
    "geo_oahu",
    "geo_molokai",
    "geo_lanai",
    "geo_kahoolawe",
    "geo_maui",
    "geo_hawaii_island",
    "geo_nwhi",
  ];
  const HAWAII_BOUNDS = [
    [18.75, -160.5],
    [22.45, -154.65],
  ];
  // Display names shown in the UI. The registry keeps "Hawaiʻi Island" to
  // disambiguate from the state, but in island lists the bare name reads better.
  const GEO_DISPLAY_NAMES = {
    geo_hawaii_island: "Hawaiʻi Island (Big Island)",
    geo_nwhi: "Northwestern Region",
  };
  const geoDisplayName = (geoID, fallback) =>
    GEO_DISPLAY_NAMES[geoID] || fallback || geoID;

  root.innerHTML = `
    <header class="hx-fullscreen-bar">
      <div><span class="hx-eyebrow">HAWAIʻI • NATURE-BASED SOLUTIONS</span><h2>Case Study Explorer</h2></div>
      <button type="button" class="hx-expand-btn hx-bar-expand" data-expand-map aria-label="Expand map to fullscreen" title="Expand map">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/></svg>
        <span>Expand map</span>
      </button>
      <button type="button" class="hx-fullscreen-exit" data-exit-map aria-label="Exit fullscreen">
        <span aria-hidden="true">✕</span> Back to page
      </button>
    </header>
    <div class="hx-case-layout">
      <aside class="hx-case-nav" aria-label="Map regions">
        <div class="hx-case-brand"><img class="hx-case-logo" src="${logoURL}" alt="" /></div>
        <p class="hx-case-nav-kicker">HAWAIʻI</p>
        <h2>Case Study<br>Explorer</h2>
        <p class="hx-case-nav-copy">Nature-based solutions research across the Hawaiian archipelago.</p>
        <nav>
          <button type="button" class="is-active" data-main-islands><span>01</span>Main Hawaiian Islands</button>
          <button type="button" data-nwhi><span>02</span>Northwestern Region</button>
        </nav>
        <div class="hx-case-nav-total"><strong data-total-papers>—</strong><span>research papers</span></div>
      </aside>

      <div class="hx-stage">
        <div class="hx-map-summary" data-map-summary>Loading case-study geography…</div>
        <div class="hx-canvas" aria-label="Interactive map of Hawaiʻi islands and NbS study areas"></div>
        <div class="hx-legend">
          <strong>Map layers</strong>
          <span><i class="hx-case-island-key"></i> Island · clickable</span>
          <span><i class="hx-case-area-key"></i> Area · clickable</span>
          <span><i class="hx-case-region-key"></i> Region · clickable</span>
          <span><i class="hx-case-site-key"></i> Study site · reference only</span>
          <span><i class="hx-case-schematic-key"></i> Schematic placement</span>
          <small>Only geography related to the filtered papers is shown.</small>
          <section class="hx-rainfall-info" data-rainfall-info aria-live="polite">
            <h3>Rainfall</h3>
            <p data-rainfall-location>Select a location</p>
            <b data-rainfall-value hidden></b>
            <small data-rainfall-meta>Loading monthly estimate…</small>
          </section>
        </div>
        <p class="hx-error" data-error hidden role="alert"></p>
      </div>

      <aside class="hx-sidebar hx-case-panel" aria-label="Case study filters and results">
        <div class="hx-case-tabs" role="tablist" aria-label="Explorer panel">
          <button type="button" class="is-active" role="tab" aria-selected="true" data-panel-tab="filters">Filter</button>
          <button type="button" role="tab" aria-selected="false" data-panel-tab="results">Data View</button>
        </div>
        <div class="hx-case-panel-scroll">
          <div data-panel="filters">
            <div class="hx-case-panel-head">
              <div><p class="hx-eyebrow">REFINE RESULTS</p><h3>Filter Papers</h3></div>
            </div>
            <section class="hx-case-filters" aria-label="Paper filters">
              <div class="hx-filter-field">
                <span class="hx-filter-label">Island</span>
                <div class="hx-island-options" data-filter-islands role="group" aria-label="Select one or more islands">
                  <button type="button" class="is-active" data-island-option="" aria-pressed="true">All islands</button>
                </div>
              </div>
              <div class="hx-filter-field">
                <span class="hx-filter-label">NbS Type</span>
                <div class="hx-multi-options hx-nbs-options" data-filter-nbs role="group" aria-label="Select one or more NbS types">
                  <button type="button" class="is-active" data-nbs-option="" aria-pressed="true">All NbS types</button>
                </div>
              </div>
              <div class="hx-filter-field"><span class="hx-filter-label">Ecosystem</span><div class="hx-multi-options hx-ecosystem-options" data-filter-ecosystem><button type="button" class="is-active" data-ecosystem-option="" aria-pressed="true">All ecosystems</button></div></div>
            </section>
            <div class="hx-case-filter-actions">
              <button type="button" class="hx-case-reset" data-reset>Reset</button>
              <button type="button" class="hx-case-apply" data-apply-filters>Apply filters</button>
            </div>
            <p class="hx-case-hint">Select filters, then use Data View to inspect papers. Island, area and region polygons are clickable.</p>
          </div>
          <div data-panel="results" hidden>
            <section class="hx-detail" data-selection aria-live="polite"></section>
            <section class="hx-case-results" aria-live="polite">
              <div class="hx-case-results-head"><h3>Case studies</h3><span data-result-count>Loading…</span></div>
              <div data-paper-results></div>
            </section>
            <p class="hx-disclaimer">Study-site markers are display-only. Papers without polygon geometry remain available here.</p>
          </div>
        </div>
      </aside>
    </div>
    <section class="hx-analytics" data-analytics aria-label="Research Evidence Matrix">
      <div class="hx-analytics-heading"><div><p class="hx-eyebrow">RESEARCH EVIDENCE / HAWAIʻI</p><h2>Evidence at a glance</h2></div><p data-matrix-summary></p></div>
      <div class="hx-analytics-steps">
        <label><span>Geographic scope</span><select data-matrix-scope aria-label="Geographic scope"></select></label>
        <label><span>Rows</span><select data-matrix-rows aria-label="Matrix rows"></select></label>
        <label><span>Columns</span><select data-matrix-columns aria-label="Matrix columns"></select></label>
      </div>
      <p class="hx-analytics-note">Unique papers at each intersection. Select a count to inspect its papers and mapped locations.</p>
      <div class="hx-matrix-scroll" data-matrix-grid></div>
    </section>`;

  const $ = (selector) => root.querySelector(selector);
  const error = $("[data-error]");
  if (!window.L) {
    error.hidden = false;
    error.textContent = "The map library could not load. Check your connection and reload.";
    return;
  }

  const map = L.map($(".hx-canvas"), {
    scrollWheelZoom: true,
    minZoom: 5,
    maxZoom: 14,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    zoomControl: false,
  });
  L.control.zoom({ position: "topright" }).addTo(map);
  L.control.scale({ imperial: true, metric: true }).addTo(map);

  const rainfallLocation = $("[data-rainfall-location]");
  const rainfallValue = $("[data-rainfall-value]");
  const rainfallMeta = $("[data-rainfall-meta]");
  const rainfallQuery = window.HCDPRainfall?.createRainfallQuery({
    metadataURL: rainfallURLs.metadata.href,
    rasterURL: rainfallURLs.values.href,
  });
  let rainfallSelectionID = 0;

  const formatRainfallPeriod = (period) => {
    const match = /^(\d{4})-(\d{2})$/.exec(String(period || ""));
    if (!match) return period || "Monthly rainfall";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
  };

  const updateRainfallMetadata = (metadata) => {
    const status = metadata.status ? ` · ${metadata.status}` : "";
    rainfallMeta.textContent = `${formatRainfallPeriod(metadata.period)} · HCDP · monthly estimate${status}, not real-time`;
  };

  rainfallQuery?.getMetadata()
    .then(updateRainfallMetadata)
    .catch(() => {
      rainfallMeta.textContent = "HCDP monthly estimate · metadata unavailable";
    });

  async function selectRainfallLocation({ lat, lng, label, approximate = false }) {
    const selectionID = ++rainfallSelectionID;
    rainfallValue.hidden = false;

    if (approximate) {
      rainfallLocation.textContent = label ? `Selected site: ${label}` : "Selected approximate site";
      rainfallValue.textContent = "Rainfall unavailable for approximate Study Site location";
      return;
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const coordinateLabel = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`;
    rainfallLocation.textContent = label
      ? `Selected location: ${label} · ${coordinateLabel}`
      : `Selected location: ${coordinateLabel}`;
    rainfallValue.textContent = "Loading rainfall…";

    if (!rainfallQuery) {
      rainfallValue.textContent = "Rainfall data could not be loaded";
      return;
    }

    const result = await rainfallQuery.getRainfallAt(latitude, longitude);
    if (selectionID !== rainfallSelectionID) return;
    if (result.metadata) updateRainfallMetadata(result.metadata);
    if (result.status === "ok") {
      rainfallValue.textContent = `${result.value.toFixed(1)} ${result.metadata.unit}`;
    } else if (result.status === "out-of-bounds" || result.status === "no-data") {
      rainfallValue.textContent = "No rainfall data available";
    } else {
      console.error("Rainfall query failed", result.error);
      rainfallValue.textContent = "Rainfall data could not be loaded";
    }
  }

  // Shared interface for map clicks, Study Sites, and future filter controls.
  root.rainfall = Object.freeze({
    getRainfallAt: (lat, lng) => rainfallQuery?.getRainfallAt(lat, lng),
    selectRainfallLocation,
  });

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 14, attribution: "Tiles © Esri, Maxar, Earthstar Geographics" },
  ).addTo(map);
  map.attributionControl.addAttribution(
    '<a href="https://planning.hawaii.gov/gis/">Hawaiʻi Statewide GIS</a>',
  );
  function fitMainHawaiianIslands() {
    map.fitBounds(HAWAII_BOUNDS, { padding: [18, 18], animate: false });
    map.setZoom(Math.min(map.getZoom() + 1.5, 8.5), { animate: false });
  }
  function fitSelectedIslands(islandIDs, animate = true) {
    if (!islandIDs.length || !state) {
      fitMainHawaiianIslands();
      return;
    }
    const bounds = L.latLngBounds([]);
    islandIDs.forEach((islandID) => {
      const unit = state.geoUnitById.get(islandID);
      const feature = unit?.geo_unit_type === "region"
        ? state.regionFeatureByGeo.get(islandID)
        : state.islandFeatureByGeo.get(islandID);
      if (feature) bounds.extend(L.geoJSON(feature).getBounds());
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [38, 38], maxZoom: islandIDs.length === 1 ? 9 : 8.5, animate });
    } else {
      fitMainHawaiianIslands();
    }
  }
  fitMainHawaiianIslands();

  map.createPane("caseIslands");
  map.getPane("caseIslands").style.zIndex = 410;
  map.createPane("caseRegions");
  map.getPane("caseRegions").style.zIndex = 415;
  map.createPane("caseAreas");
  map.getPane("caseAreas").style.zIndex = 420;
  map.createPane("caseSites");
  map.getPane("caseSites").style.zIndex = 430;
  const islandGroup = L.layerGroup().addTo(map);
  const areaGroup = L.layerGroup().addTo(map);
  const regionGroup = L.layerGroup().addTo(map);
  const siteGroup = L.layerGroup().addTo(map);
  let state = null;
  let focus = null;
  let matrixCell = null;
  let matrixRows = "nbs";
  let matrixColumns = "ecosystem";
  let matrixView = { rows: [], columns: [], cells: new Map() };
  let mapActivated = false;
  let appliedFilters = { islands: [], nbs: [], ecosystems: [] };

  function showPanel(name) {
    root.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    root.querySelectorAll("[data-panel-tab]").forEach((tab) => {
      const active = tab.dataset.panelTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  root.querySelectorAll("[data-panel-tab]").forEach((tab) => {
    tab.addEventListener("click", () => showPanel(tab.dataset.panelTab));
  });

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const splitValues = (value) =>
    String(value || "").split(";").map((part) => part.trim()).filter(Boolean);

  function addOptions(select, values, sort = true) {
    const options = sort
      ? [...values].sort((a, b) => a.label.localeCompare(b.label))
      : values;
    options.forEach(({ value, label }) => select.add(new Option(label, value)));
  }

  function paperCovers(paperID) {
    return state.coversByPaper.get(String(paperID)) || new Set();
  }

  function filteredPaperIds() {
    const islandIDs = appliedFilters.islands;
    const nbsTypes = appliedFilters.nbs;
    const ecosystems = appliedFilters.ecosystems;
    return new Set(
      state.papers
        .filter((paper) => {
          const covers = paperCovers(paper.paper_id);
          return (
            (!islandIDs.length || islandIDs.some((islandID) => covers.has(islandID))) &&
            (!nbsTypes.length || nbsTypes.includes(paper["NbS Type"])) &&
            (!ecosystems.length || ecosystems.some((value) => splitValues(paper.Ecosystem).includes(value)))
          );
        })
        .map((paper) => String(paper.paper_id)),
    );
  }

  function focusPaperIds(filteredIDs) {
    if (!focus) return filteredIDs;
    const related = new Set(
      state.papers
        .filter((paper) => {
          const pid = String(paper.paper_id);
          if (!filteredIDs.has(pid)) return false;
          if (focus.type === "geo") return paperCovers(pid).has(focus.id);
          const rows = state.rowsByPaper.get(pid) || [];
          return rows.some((row) => row.area_id === focus.id);
        })
        .map((paper) => String(paper.paper_id)),
    );
    return related;
  }

  const MATRIX_AXES = {
    nbs: { label: "NbS Type", values: (paper) => paper["NbS Type"] ? [paper["NbS Type"]] : [] },
    ecosystem: { label: "Ecosystem", values: (paper) => splitValues(paper.Ecosystem) },
    year: { label: "Publication Year", values: (paper) => paper.Year ? [String(paper.Year)] : [] },
  };
  const matrixKey = (row, column) => `${row}\u0000${column}`;
  const axisValues = (paper, axis) => unique(MATRIX_AXES[axis].values(paper));

  function buildMatrix(baseIDs) {
    const rows = new Set();
    const columns = new Set();
    const cells = new Map();
    const rowTotals = new Map();
    const columnTotals = new Map();
    const represented = new Set();
    state.papers.forEach((paper) => {
      const id = String(paper.paper_id);
      if (!baseIDs.has(id)) return;
      const rowValues = axisValues(paper, matrixRows);
      const columnValues = axisValues(paper, matrixColumns);
      if (!rowValues.length || !columnValues.length) return;
      represented.add(id);
      rowValues.forEach((row) => {
        rows.add(row);
        if (!rowTotals.has(row)) rowTotals.set(row, new Set());
        rowTotals.get(row).add(id);
        columnValues.forEach((column) => {
          columns.add(column);
          if (!columnTotals.has(column)) columnTotals.set(column, new Set());
          columnTotals.get(column).add(id);
          const key = matrixKey(row, column);
          if (!cells.has(key)) cells.set(key, new Set());
          cells.get(key).add(id);
        });
      });
    });
    return {
      rows: [...rows].sort((a, b) => a.localeCompare(b)),
      columns: [...columns].sort((a, b) => a.localeCompare(b)),
      cells, rowTotals, columnTotals, represented,
    };
  }

  function scopeLabel() {
    if (focus) return focus.label;
    if (appliedFilters.islands.length) return appliedFilters.islands
      .map((id) => geoDisplayName(id, state.geoUnitById.get(id)?.geo_unit_name)).join(" + ");
    return "All islands";
  }

  function syncScopeControl() {
    const select = $("[data-matrix-scope]");
    const value = focus ? `${focus.type}:${focus.id}`
      : appliedFilters.islands.length === 1 ? `geo:${appliedFilters.islands[0]}`
        : appliedFilters.islands.length > 1 ? "sidebar" : "";
    select.querySelector('[value="sidebar"]')?.remove();
    if (value === "sidebar") select.add(new Option(scopeLabel(), "sidebar"));
    select.value = value;
  }

  function renderMatrix(baseIDs) {
    matrixView = buildMatrix(baseIDs);
    syncScopeControl();
    $("[data-matrix-summary]").textContent = `${scopeLabel()} · ${baseIDs.size} papers after current filters · ${matrixView.represented.size} with both selected attributes`;
    const columns = matrixView.columns;
    const rows = matrixView.rows;
    const header = columns.map((column) => `<th scope="col" title="${escapeHTML(column)}"><span>${escapeHTML(column)}</span></th>`).join("");
    const totals = columns.map((column) => `<td class="hx-matrix-total">${matrixView.columnTotals.get(column).size}</td>`).join("");
    const body = rows.map((row, rowIndex) => {
      const cells = columns.map((column, columnIndex) => {
        const count = matrixView.cells.get(matrixKey(row, column))?.size || 0;
        if (!count) return "<td></td>";
        const selected = matrixCell?.row === row && matrixCell?.column === column;
        return `<td><button type="button" class="hx-matrix-circle${selected ? " is-selected" : ""}" data-matrix-cell="${rowIndex}:${columnIndex}" aria-label="${escapeHTML(`${row} × ${column}: ${count} paper${count === 1 ? "" : "s"}`)}" aria-pressed="${selected}">${count}</button></td>`;
      }).join("");
      return `<tr><th scope="row">${escapeHTML(row)}</th>${cells}<td class="hx-matrix-total">${matrixView.rowTotals.get(row).size}</td></tr>`;
    }).join("");
    $("[data-matrix-grid]").innerHTML = rows.length && columns.length
      ? `<table class="hx-matrix"><thead><tr><th scope="col">${escapeHTML(MATRIX_AXES[matrixRows].label)} / ${escapeHTML(MATRIX_AXES[matrixColumns].label)}</th>${header}<th scope="col">Total</th></tr></thead><tbody>${body}</tbody><tfoot><tr><th scope="row">Unique papers</th>${totals}<td class="hx-matrix-total">${matrixView.represented.size}</td></tr></tfoot></table>`
      : '<p class="hx-matrix-empty">No papers have both selected attributes under these filters.</p>';
  }

  function islandStyle(selected = false) {
    return {
      color: selected ? "#b9f5ff" : "#46d8ff",
      weight: selected ? 5.5 : 3.5,
      fillColor: selected ? "#27c8e8" : "#0d8aa8",
      fillOpacity: selected ? 0.32 : 0.06,
      className: selected ? "hx-island-selected" : "",
    };
  }

  function areaStyle(selected = false) {
    return {
      color: selected ? "#d4faff" : "#38d6e8",
      weight: selected ? 3 : 1.8,
      fillColor: selected ? "#39d7ef" : "#087e9b",
      fillOpacity: selected ? 0.42 : 0.24,
    };
  }

  function regionStyle(selected = false) {
    return {
      color: selected ? "#b9f5ff" : "#5bdcf5",
      weight: selected ? 5 : 1.8,
      fillColor: selected ? "#27c8e8" : "#087e9b",
      fillOpacity: selected ? 0.3 : 0.1,
      dashArray: "6 4",
      className: selected ? "hx-island-selected" : "",
    };
  }

  function clearSidebarIslands() {
    appliedFilters.islands = [];
    $("[data-filter-islands]").querySelectorAll("[data-island-option]").forEach((button) => {
      const active = !button.dataset.islandOption;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function selectGeography(type, id, label, layer) {
    mapActivated = true;
    if (appliedFilters.islands.length) clearSidebarIslands();
    focus = { type, id, label };
    matrixCell = null;
    if (layer?.getBounds) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [45, 45], maxZoom: 10 });
    }
    render();
    showPanel("results");
    $(".hx-case-panel").scrollTo({ top: 0, behavior: "smooth" });
  }

  function drawIslandFeature(feature, geoID) {
    const label = geoDisplayName(geoID, state.geoUnitById.get(geoID)?.geo_unit_name);
    const isSelected = () =>
      appliedFilters.islands.includes(geoID) || (focus?.type === "geo" && focus.id === geoID);
    const layer = L.geoJSON(feature, {
      pane: "caseIslands",
      bubblingMouseEvents: false,
      style: islandStyle(isSelected()),
    });
    layer.bindTooltip(label);
    layer.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      selectGeography("geo", geoID, label, layer);
      selectRainfallLocation({ lat: event.latlng.lat, lng: event.latlng.lng, label });
    });
    layer.on("mouseover", () => layer.setStyle(islandStyle(true)));
    layer.on("mouseout", () =>
      layer.setStyle(islandStyle(isSelected())),
    );
    layer.addTo(islandGroup);
  }

  // Hover style for areas: unmistakable highlight so users see it's interactive.
  function areaHoverStyle() {
    return {
      color: "#d9fbff",
      weight: 4,
      fillColor: "#41dff5",
      fillOpacity: 0.46,
    };
  }

  function drawAreaFeature(feature, newAreaID, areaName) {
    const layer = L.geoJSON(feature, {
      pane: "caseAreas",
      bubblingMouseEvents: false,
      style: areaStyle(focus?.type === "area" && focus.id === newAreaID),
    });
    layer.bindTooltip(areaName);
    layer.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      selectGeography("area", newAreaID, areaName, layer);
      selectRainfallLocation({ lat: event.latlng.lat, lng: event.latlng.lng, label: areaName });
    });
    layer.on("mouseover", () => {
      layer.setStyle(areaHoverStyle());
      layer.bringToFront();
    });
    layer.on("mouseout", () =>
      layer.setStyle(areaStyle(focus?.type === "area" && focus.id === newAreaID)),
    );
    layer.addTo(areaGroup);
  }

  function drawRegionFeature(feature, geoID) {
    const label = geoDisplayName(geoID, state.geoUnitById.get(geoID)?.geo_unit_name);
    const isSelected = () =>
      appliedFilters.islands.includes(geoID) || (focus?.type === "geo" && focus.id === geoID);
    const layer = L.geoJSON(feature, {
      pane: "caseRegions",
      bubblingMouseEvents: false,
      style: regionStyle(isSelected()),
    });
    layer.bindTooltip(label);
    layer.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      selectGeography("geo", geoID, label, layer);
      selectRainfallLocation({ lat: event.latlng.lat, lng: event.latlng.lng, label });
    });
    layer.on("mouseover", () => layer.setStyle(regionStyle(true)));
    layer.on("mouseout", () =>
      layer.setStyle(regionStyle(isSelected())),
    );
    layer.addTo(regionGroup);
  }

  function drawRow(row, drawn) {
    if (row.geo_unit_id) drawGeoUnit(row.geo_unit_id, drawn);
    if (row.area_id && state.areaGeomsByNewId.has(row.area_id)) {
      const areaKey = `area:${row.area_id}`;
      if (!drawn.has(areaKey)) {
        drawn.add(areaKey);
        state.areaGeomsByNewId.get(row.area_id).forEach((feature) => {
          drawAreaFeature(feature, row.area_id, row.area_name || row.area_id);
        });
      }
    }

  }

  // Sampling points are drawn in a second pass, grouped by coordinate so
  // shared locations get one marker with a popup listing every paper there.
  function drawPoint(lat, lng, items) {
    const first = items[0].row;
    const coordinatePrecisions = items.map(({ row }) => String(row.coordinate_precision || ""));
    const schematic = coordinatePrecisions.some((precision) => precision.includes("Schematic"));
    const precise = coordinatePrecisions.every((precision) =>
      /^Paper-reported (study|field-site|site) coordinate$/.test(precision));
    const marker = L.circleMarker([lat, lng], schematic
      ? { pane: "caseSites", radius: 5, color: "#f0bc60", weight: 2, dashArray: "3 2", fillColor: "#fff", fillOpacity: 0.9 }
      : { pane: "caseSites", radius: 4, color: "#fff", weight: 1.5, fillColor: "#f0bc60", fillOpacity: 0.95 });
    const tipLabel = first.site_name || first.area_name || geoDisplayName(first.geo_unit_id, first.geo_unit_name);
    if (tipLabel) marker.bindTooltip(schematic ? `${tipLabel} (schematic)` : tipLabel);
    const paperRows = items.map(({ paper }) =>
      `<li>${escapeHTML(paper.Title || "Untitled")} <span>(${escapeHTML(paper.Year || "n.d.")})</span></li>`
    ).join("");
    marker.bindPopup(`
      <div class="hx-point-popup">
        <strong>${escapeHTML(tipLabel || "Study site")}</strong>
        <p class="hx-point-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}${schematic ? " · schematic placement" : ""}</p>
        <ul>${paperRows}</ul>
      </div>`);
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event.originalEvent);
      selectRainfallLocation({
        lat,
        lng,
        label: tipLabel || undefined,
        source: "study-site",
        approximate: !precise,
      });
    });
    marker.addTo(siteGroup);
  }

  function drawGeoUnit(geoID, drawn) {
    const unit = state.geoUnitById.get(geoID);
    if (!unit) return;
    if (unit.geo_unit_type === "island") {
      if (drawn.has(`geo:${geoID}`)) return;
      drawn.add(`geo:${geoID}`);
      const feature = state.islandFeatureByGeo.get(geoID);
      if (feature) drawIslandFeature(feature, geoID);
    } else if (unit.geo_unit_type === "island_group") {
      (state.membersByGroup.get(geoID) || []).forEach((memberID) => {
        if (drawn.has(`geo:${memberID}`)) return;
        drawn.add(`geo:${memberID}`);
        const feature = state.islandFeatureByGeo.get(memberID);
        if (feature) drawIslandFeature(feature, memberID);
      });
    } else if (unit.geo_unit_type === "region") {
      if (drawn.has(`geo:${geoID}`)) return;
      drawn.add(`geo:${geoID}`);
      const feature = state.regionFeatureByGeo.get(geoID);
      if (feature) drawRegionFeature(feature, geoID);
    }
  }

  function renderMap(filteredIDs) {
    islandGroup.clearLayers();
    areaGroup.clearLayers();
    regionGroup.clearLayers();
    siteGroup.clearLayers();
    const drawn = new Set();
    // Keep explicitly filtered islands visible and highlighted, including
    // combinations that currently return no papers.
    appliedFilters.islands.forEach((geoID) => {
      const unit = state.geoUnitById.get(geoID);
      if (unit?.geo_unit_type === "region") {
        const feature = state.regionFeatureByGeo.get(geoID);
        if (!feature) return;
        drawn.add(`geo:${geoID}`);
        drawRegionFeature(feature, geoID);
      } else {
        const feature = state.islandFeatureByGeo.get(geoID);
        if (!feature) return;
        drawn.add(`geo:${geoID}`);
        drawIslandFeature(feature, geoID);
      }
    });
    // When islands are filtered, only draw rows matching the filter — not
    // other rows of the same paper (e.g. paper 22's "All islands" row
    // should not light up Kauaʻi when filtering by Northwestern Region).
    const rowMatchesIslandFilter = (row) => {
      if (!appliedFilters.islands.length) return true;
      const covers = new Set();
      if (row.geo_unit_id) {
        covers.add(row.geo_unit_id);
        (state.membersByGroup.get(row.geo_unit_id) || []).forEach((m) => covers.add(m));
      }
      return appliedFilters.islands.some((id) => covers.has(id));
    };
    state.papers.forEach((paper) => {
      const pid = String(paper.paper_id);
      if (!filteredIDs.has(pid)) return;
      (state.rowsByPaper.get(pid) || []).forEach((row) => {
        if (rowMatchesIslandFilter(row)) drawRow(row, drawn);
      });
    });
    // Second pass: sampling points, grouped by coordinate so shared
    // locations get one marker whose popup lists every paper there.
    const pointsByKey = new Map();
    state.papers.forEach((paper) => {
      const pid = String(paper.paper_id);
      if (!filteredIDs.has(pid)) return;
      (state.rowsByPaper.get(pid) || []).forEach((row) => {
        if (!rowMatchesIslandFilter(row)) return;
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const key = `${lat},${lng}`;
        if (!pointsByKey.has(key)) pointsByKey.set(key, { lat, lng, items: [] });
        pointsByKey.get(key).items.push({ row, paper });
      });
    });
    pointsByKey.forEach(({ lat, lng, items }) => drawPoint(lat, lng, items));
  }

  function renderInitialMap() {
    islandGroup.clearLayers();
    areaGroup.clearLayers();
    regionGroup.clearLayers();
    siteGroup.clearLayers();
    ISLAND_FILTER_ORDER.forEach((geoID) => {
      const feature = state.islandFeatureByGeo.get(geoID);
      if (feature) drawIslandFeature(feature, geoID);
    });
  }

  function paperCard(paper) {
    const pid = String(paper.paper_id);
    const rows = state.rowsByPaper.get(pid) || [];
    const placeLabels = unique(rows.map((row) => geoDisplayName(row.geo_unit_id, row.geo_unit_name)));
    const areaLabels = unique(rows.map((row) => row.area_name));
    const siteLabels = unique(rows.map((row) => row.site_name));
    const nullAreas = unique(
      rows
        .filter((row) => row.area_id && !state.areaGeomsByNewId.has(row.area_id))
        .map((row) => row.area_name || row.area_id),
    );
    const schematic = rows.some((row) =>
      String(row.coordinate_precision || "").includes("Schematic"),
    );
    const identifier = String(paper["Paper ID / DOI"] || "").trim();
    const identifierMarkup = identifier
      ? identifier.startsWith("10.")
        ? `<a href="https://doi.org/${encodeURIComponent(identifier)}" target="_blank" rel="noopener">${escapeHTML(identifier)}</a>`
        : escapeHTML(identifier)
      : "";
    return `
      <article class="hx-paper-card">
        <p class="hx-paper-meta">${escapeHTML(paper.Year || "Year unavailable")}${identifierMarkup ? ` · ${identifierMarkup}` : ""}</p>
        <h4>${escapeHTML(paper.Title || "Untitled paper")}</h4>
        <dl>
          <dt>NbS Type</dt><dd>${escapeHTML(paper["NbS Type"] || "—")}</dd>
          <dt>Ecosystem</dt><dd>${escapeHTML(paper.Ecosystem || "—")}</dd>
          <dt>Place</dt><dd>${escapeHTML(placeLabels.join("; ") || "Not specified")}</dd>
          ${areaLabels.length ? `<dt>Area</dt><dd>${escapeHTML(areaLabels.join("; "))}${nullAreas.length ? ' <span class="hx-no-geometry">No area polygon</span>' : ""}</dd>` : ""}
          ${siteLabels.length ? `<dt>Study site</dt><dd>${escapeHTML(siteLabels.join("; "))}${schematic ? ' <span class="hx-no-geometry">Schematic placement</span>' : ""}</dd>` : ""}
        </dl>
      </article>`;
  }

  function downloadCSV(papers) {
    const columns = [
      "paper_id", "title", "year", "doi_or_id", "nbs_type", "ecosystem",
      "geo_unit_id", "place", "area_id", "area", "site_id", "study_site",
      "latitude", "longitude",
    ];
    const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = papers.map((paper) => {
      const locations = state.rowsByPaper.get(String(paper.paper_id)) || [];
      const joined = (field) => unique(locations.map((row) => row[field])).join("; ");
      return {
        paper_id: paper.paper_id,
        title: paper.Title,
        year: paper.Year,
        doi_or_id: paper["Paper ID / DOI"],
        nbs_type: paper["NbS Type"],
        ecosystem: paper.Ecosystem,
        geo_unit_id: joined("geo_unit_id"),
        place: joined("geo_unit_name"),
        area_id: joined("area_id"),
        area: joined("area_name"),
        site_id: joined("site_id"),
        study_site: joined("site_name"),
        latitude: joined("latitude"),
        longitude: joined("longitude"),
      };
    });
    const csv = [columns.join(","), ...rows.map((row) => columns.map((key) => csvValue(row[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nbs-case-studies.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderResults(shownIDs) {
    const papers = state.papers.filter((paper) => shownIDs.has(String(paper.paper_id)));
    const selection = $("[data-selection]");
    selection.innerHTML = matrixCell
      ? `<p class="hx-eyebrow">SELECTED MATRIX CELL</p><h3>${escapeHTML(matrixCell.row)} × ${escapeHTML(matrixCell.column)}</h3><p>${papers.length} matching paper${papers.length === 1 ? "" : "s"} · ${escapeHTML(scopeLabel())}</p><button type="button" data-clear-matrix-cell>Clear matrix cell</button><button type="button" class="hx-download-csv" data-download-csv>Download CSV</button>`
      : focus
      ? `<p class="hx-eyebrow">SELECTED ${focus.type.toUpperCase()}</p><h3>${escapeHTML(focus.label)}</h3><p>${papers.length} related paper${papers.length === 1 ? "" : "s"} under the current filters.</p><button type="button" data-clear-selection>Show all filtered papers</button><button type="button" class="hx-download-csv" data-download-csv>Download CSV</button>`
      : `<p class="hx-eyebrow">MAP &amp; RESULTS</p><h3>All matching case studies</h3><p>Click an island, area or region polygon to focus these results. Papers without mappable geometry remain listed below.</p><button type="button" class="hx-download-csv" data-download-csv>Download CSV</button>`;
    selection.querySelector("[data-clear-selection]")?.addEventListener("click", () => {
      focus = null;
      render();
    });
    selection.querySelector("[data-clear-matrix-cell]")?.addEventListener("click", () => {
      matrixCell = null;
      render();
    });
    selection.querySelector("[data-download-csv]")?.addEventListener("click", () => downloadCSV(papers));
    $("[data-result-count]").textContent = `${papers.length} of ${state.papers.length} papers`;
    $("[data-paper-results]").innerHTML = papers.length
      ? papers.map(paperCard).join("")
      : '<p class="hx-empty">No papers match this map selection and filter combination.</p>';
  }

  function render() {
    if (!state) return;
    const filteredIDs = filteredPaperIds();
    const baseIDs = focusPaperIds(filteredIDs);
    renderMatrix(baseIDs);
    const mappedIDs = matrixCell
      ? matrixView.cells.get(matrixKey(matrixCell.row, matrixCell.column)) || new Set()
      : baseIDs;
    const hasActiveFilters = [
      appliedFilters.islands.length,
      appliedFilters.nbs.length,
      appliedFilters.ecosystems.length,
    ].some(Boolean);
    const showResearchLayers = mapActivated || Boolean(focus) || Boolean(matrixCell) || hasActiveFilters;
    if (showResearchLayers) renderMap(mappedIDs);
    else renderInitialMap();
    renderResults(mappedIDs);
    const selected = mappedIDs;
    const islandLabel = appliedFilters.islands
      .map((islandID) => geoDisplayName(islandID, state.geoUnitById.get(islandID)?.geo_unit_name))
      .join(" + ");
    const filters = [
      islandLabel,
      appliedFilters.nbs.join(" + "),
      appliedFilters.ecosystems.join(" + "),
    ].filter(Boolean);
    $(`[data-map-summary]`).innerHTML = showResearchLayers
      ? `<strong>${selected.size}</strong> paper${selected.size === 1 ? "" : "s"}${matrixCell ? ` · ${escapeHTML(matrixCell.row)} × ${escapeHTML(matrixCell.column)}` : focus ? ` in ${escapeHTML(focus.label)}` : ""}${filters.length ? ` · ${escapeHTML(filters.join(" · "))}` : ""}`
      : `<strong>8</strong> main Hawaiian islands · select a place or filter to explore`;
  }

  map.on("click", (event) => {
    if (focus || matrixCell) {
      focus = null;
      matrixCell = null;
      render();
    }
    selectRainfallLocation({
      lat: event.latlng.lat,
      lng: event.latlng.lng,
      source: "map",
    });
  });

  Promise.all(
    Object.values(dataURLs).map((url) =>
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${url.pathname}`);
        return response.json();
      }),
    ),
  )
    .then(([coast, areas, region, areaIdMap, papers, locations, paperLocations, geoUnits, members]) => {
      const geoUnitById = new Map(geoUnits.map((u) => [u.geo_unit_id, u]));
      const membersByGroup = new Map();
      members.forEach((m) => {
        if (!membersByGroup.has(m.geo_unit_id)) membersByGroup.set(m.geo_unit_id, []);
        membersByGroup.get(m.geo_unit_id).push(m.member_geo_unit_id);
      });

      const islandFeatureByGeo = new Map();
      coast.features.forEach((feature) => {
        if (Number(feature.properties.water) !== 0) return;
        const geoID = ISLE_TO_GEO[feature.properties.isle];
        if (!geoID) return;
        if (!islandFeatureByGeo.has(geoID)) {
          islandFeatureByGeo.set(geoID, { type: "FeatureCollection", features: [] });
        }
        islandFeatureByGeo.get(geoID).features.push(feature);
      });

      const areaGeomsByNewId = new Map();
      areas.features.forEach((feature) => {
        if (!feature.geometry) return;
        const targets = areaIdMap[feature.properties.area_id] || [];
        targets.forEach(({ new_area_id }) => {
          if (!areaGeomsByNewId.has(new_area_id)) areaGeomsByNewId.set(new_area_id, []);
          areaGeomsByNewId.get(new_area_id).push(feature);
        });
      });

      const regionFeatureByGeo = new Map();
      (region.features || []).forEach((feature) => {
        const geoID = feature.properties.geo_unit_id;
        if (geoID && feature.geometry) regionFeatureByGeo.set(geoID, feature);
      });

      const locationKey = (row) =>
        [row.paper_id, row.geo_unit_id, row.area_id, row.site_id].map(String).join("|");
      const locationByKey = new Map(locations.map((row) => [locationKey(row), row]));
      const joinedLocations = paperLocations.map((link) => {
        const location = locationByKey.get(locationKey(link)) || {};
        const unit = geoUnitById.get(link.geo_unit_id);
        return {
          ...location,
          ...link,
          geo_unit_name: location.geo_unit_name || unit?.geo_unit_name || "",
          geo_unit_type: location.geo_unit_type || unit?.geo_unit_type || "",
        };
      });

      const rowsByPaper = new Map();
      joinedLocations.forEach((row) => {
        const pid = String(row.paper_id);
        if (!rowsByPaper.has(pid)) rowsByPaper.set(pid, []);
        rowsByPaper.get(pid).push(row);
      });
      const areaNameById = new Map();
      joinedLocations.forEach((row) => {
        if (row.area_id && areaGeomsByNewId.has(row.area_id) && !areaNameById.has(row.area_id)) {
          areaNameById.set(row.area_id, row.area_name || row.area_id);
        }
      });

      const coversByPaper = new Map();
      rowsByPaper.forEach((rows, pid) => {
        const covers = new Set();
        rows.forEach((row) => {
          if (row.geo_unit_id) {
            covers.add(row.geo_unit_id);
            (membersByGroup.get(row.geo_unit_id) || []).forEach((m) => covers.add(m));
          }
        });
        coversByPaper.set(pid, covers);
      });

      state = {
        papers,
        rowsByPaper,
        coversByPaper,
        geoUnitById,
        membersByGroup,
        islandFeatureByGeo,
        areaGeomsByNewId,
        areaNameById,
        regionFeatureByGeo,
      };

      $("[data-total-papers]").textContent = papers.length;

      const scopeSelect = $("[data-matrix-scope]");
      scopeSelect.add(new Option("All islands", ""));
      ISLAND_FILTER_ORDER.filter((id) => geoUnitById.has(id)).forEach((id) =>
        scopeSelect.add(new Option(geoDisplayName(id, geoUnitById.get(id).geo_unit_name), `geo:${id}`)));
      [...regionFeatureByGeo.keys()].filter((id) => !ISLAND_FILTER_ORDER.includes(id)).forEach((id) =>
        scopeSelect.add(new Option(geoDisplayName(id, geoUnitById.get(id)?.geo_unit_name), `geo:${id}`)));
      [...areaNameById].sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) =>
        scopeSelect.add(new Option(`Area · ${name}`, `area:${id}`)));
      scopeSelect.addEventListener("change", () => {
        clearSidebarIslands();
        matrixCell = null;
        if (!scopeSelect.value || scopeSelect.value === "sidebar") {
          focus = null;
          mapActivated = true;
          fitMainHawaiianIslands();
          render();
          return;
        }
        const [type, id] = scopeSelect.value.split(":");
        const feature = type === "area" ? areaGeomsByNewId.get(id)
          : regionFeatureByGeo.get(id) || islandFeatureByGeo.get(id);
        const label = type === "area" ? areaNameById.get(id)
          : geoDisplayName(id, geoUnitById.get(id)?.geo_unit_name);
        const geometry = type === "area" && feature
          ? { type: "FeatureCollection", features: feature } : feature;
        selectGeography(type, id, label, geometry ? L.geoJSON(geometry) : null);
      });
      for (const [key, axis] of Object.entries(MATRIX_AXES)) {
        $("[data-matrix-rows]").add(new Option(axis.label, key));
        $("[data-matrix-columns]").add(new Option(axis.label, key));
      }
      $("[data-matrix-rows]").value = matrixRows;
      $("[data-matrix-columns]").value = matrixColumns;
      ["rows", "columns"].forEach((side) => {
        $(`[data-matrix-${side}]`).addEventListener("change", (event) => {
          if (side === "rows") matrixRows = event.target.value;
          else matrixColumns = event.target.value;
          if (matrixRows === matrixColumns) {
            const other = Object.keys(MATRIX_AXES).find((key) => key !== event.target.value);
            if (side === "rows") matrixColumns = other;
            else matrixRows = other;
            $("[data-matrix-rows]").value = matrixRows;
            $("[data-matrix-columns]").value = matrixColumns;
          }
          matrixCell = null;
          render();
        });
      });
      $("[data-matrix-grid]").addEventListener("click", (event) => {
        const button = event.target.closest("[data-matrix-cell]");
        if (!button) return;
        const [rowIndex, columnIndex] = button.dataset.matrixCell.split(":").map(Number);
        matrixCell = { row: matrixView.rows[rowIndex], column: matrixView.columns[columnIndex] };
        render();
        showPanel("results");
      });

      const islandOptions = $("[data-filter-islands]");
      ISLAND_FILTER_ORDER.filter((geoID) => geoUnitById.has(geoID)).forEach((geoID) => {
        islandOptions.insertAdjacentHTML(
          "beforeend",
          `<button type="button" data-island-option="${escapeHTML(geoID)}" aria-pressed="false">${escapeHTML(geoDisplayName(geoID, geoUnitById.get(geoID).geo_unit_name))}</button>`,
        );
      });
      const nbsOptions = $("[data-filter-nbs]");
      unique(papers.map((paper) => paper["NbS Type"])).sort().forEach((value) => {
        nbsOptions.insertAdjacentHTML("beforeend", `<button type="button" data-nbs-option="${escapeHTML(value)}" aria-pressed="false">${escapeHTML(value)}</button>`);
      });
      const ecosystemOptions = $("[data-filter-ecosystem]");
      unique(papers.flatMap((paper) => splitValues(paper.Ecosystem))).sort().forEach((value) => ecosystemOptions.insertAdjacentHTML("beforeend", `<button type="button" data-ecosystem-option="${escapeHTML(value)}" aria-pressed="false">${escapeHTML(value)}</button>`));
      islandOptions.addEventListener("click", (event) => {
        const button = event.target.closest("[data-island-option]");
        if (!button) return;
        const allButton = islandOptions.querySelector('[data-island-option=""]');
        if (!button.dataset.islandOption) {
          islandOptions.querySelectorAll("[data-island-option]").forEach((option) => {
            const active = option === allButton;
            option.classList.toggle("is-active", active);
            option.setAttribute("aria-pressed", String(active));
          });
        } else {
          button.classList.toggle("is-active");
          button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
          const hasSelectedIsland = Boolean(islandOptions.querySelector('[data-island-option]:not([data-island-option=""]).is-active'));
          allButton.classList.toggle("is-active", !hasSelectedIsland);
          allButton.setAttribute("aria-pressed", String(!hasSelectedIsland));
        }
        $("[data-apply-filters]").classList.add("is-pending");
      });
      nbsOptions.addEventListener("click", (event) => {
        const button = event.target.closest("[data-nbs-option]");
        if (!button) return;
        const allButton = nbsOptions.querySelector('[data-nbs-option=""]');
        if (!button.dataset.nbsOption) {
          nbsOptions.querySelectorAll("[data-nbs-option]").forEach((option) => {
            const active = option === allButton;
            option.classList.toggle("is-active", active);
            option.setAttribute("aria-pressed", String(active));
          });
        } else {
          button.classList.toggle("is-active");
          button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
          const hasSelected = Boolean(nbsOptions.querySelector('[data-nbs-option]:not([data-nbs-option=""]).is-active'));
          allButton.classList.toggle("is-active", !hasSelected);
          allButton.setAttribute("aria-pressed", String(!hasSelected));
        }
        $("[data-apply-filters]").classList.add("is-pending");
      });
      ecosystemOptions.addEventListener("click", (event) => {
        const button = event.target.closest("[data-ecosystem-option]"); if (!button) return;
        const all = ecosystemOptions.querySelector('[data-ecosystem-option=""]');
        if (!button.dataset.ecosystemOption) ecosystemOptions.querySelectorAll("[data-ecosystem-option]").forEach((option) => { const active = option === all; option.classList.toggle("is-active", active); option.setAttribute("aria-pressed", String(active)); });
        else { button.classList.toggle("is-active"); button.setAttribute("aria-pressed", String(button.classList.contains("is-active"))); const any = Boolean(ecosystemOptions.querySelector('[data-ecosystem-option]:not([data-ecosystem-option=""]).is-active')); all.classList.toggle("is-active", !any); all.setAttribute("aria-pressed", String(!any)); }
        $("[data-apply-filters]").classList.add("is-pending");
      });
      $("[data-apply-filters]").addEventListener("click", () => {
        const nextFilters = {
          islands: [...islandOptions.querySelectorAll('[data-island-option]:not([data-island-option=""]).is-active')]
            .map((button) => button.dataset.islandOption),
          nbs: [...nbsOptions.querySelectorAll('[data-nbs-option]:not([data-nbs-option=""]).is-active')]
            .map((button) => button.dataset.nbsOption),
          ecosystems: [...ecosystemOptions.querySelectorAll('[data-ecosystem-option]:not([data-ecosystem-option=""]).is-active')].map((button) => button.dataset.ecosystemOption),
        };
        const islandChanged = nextFilters.islands.join("|") !== appliedFilters.islands.join("|");
        appliedFilters = nextFilters;
        matrixCell = null;
        // Clicking Apply is an explicit request to show research layers, even
        // when every dropdown is set to its "All" option.
        mapActivated = true;
        if (islandChanged) {
          focus = null;
          root.querySelectorAll(".hx-case-nav nav button").forEach((button) => button.classList.remove("is-active"));
          $("[data-main-islands]").classList.add("is-active");
          fitSelectedIslands(appliedFilters.islands);
        }
        $("[data-apply-filters]").classList.remove("is-pending");
        render();
      });
      $("[data-main-islands]").addEventListener("click", () => {
        focus = null;
        matrixCell = null;
        mapActivated = false;
        root.querySelectorAll(".hx-case-nav nav button").forEach((button) => button.classList.remove("is-active"));
        $("[data-main-islands]").classList.add("is-active");
        fitMainHawaiianIslands();
        render();
      });
      $("[data-nwhi]").addEventListener("click", () => {
        mapActivated = true;
        clearSidebarIslands();
        matrixCell = null;
        const feature = regionFeatureByGeo.get("geo_nwhi");
        const label = geoUnitById.get("geo_nwhi")?.geo_unit_name || "Northwestern Hawaiian Islands";
        focus = { type: "geo", id: "geo_nwhi", label };
        root.querySelectorAll(".hx-case-nav nav button").forEach((button) => button.classList.remove("is-active"));
        $("[data-nwhi]").classList.add("is-active");
        if (feature) {
          const bounds = L.geoJSON(feature).getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 7 });
        }
        render();
        showPanel("results");
      });
      $("[data-reset]").addEventListener("click", () => {
        root.querySelectorAll(".hx-case-filters select").forEach((select) => {
          select.value = "";
        });
        islandOptions.querySelectorAll("[data-island-option]").forEach((option) => {
          const active = !option.dataset.islandOption;
          option.classList.toggle("is-active", active);
          option.setAttribute("aria-pressed", String(active));
        });
        nbsOptions.querySelectorAll("[data-nbs-option]").forEach((option) => {
          const active = !option.dataset.nbsOption;
          option.classList.toggle("is-active", active);
          option.setAttribute("aria-pressed", String(active));
        });
        ecosystemOptions.querySelectorAll("[data-ecosystem-option]").forEach((option) => { const active = !option.dataset.ecosystemOption; option.classList.toggle("is-active", active); option.setAttribute("aria-pressed", String(active)); });
        appliedFilters = { islands: [], nbs: [], ecosystems: [] };
        matrixCell = null;
        $("[data-apply-filters]").classList.remove("is-pending");
        focus = null;
        mapActivated = false;
        root.querySelectorAll(".hx-case-nav nav button").forEach((button) => button.classList.remove("is-active"));
        $("[data-main-islands]").classList.add("is-active");
        fitMainHawaiianIslands();
        render();
      });
      // Fullscreen toggle for the map explorer. The button lives in the page
      // header (outside the explorer), so query the document.
      const expandBtn = document.querySelector("[data-expand-map]");
      const exitBtn = root.querySelector("[data-exit-map]");
      const expandLabel = expandBtn ? expandBtn.querySelector("span") : null;
      const updateExpandBtn = () => {
        if (!expandBtn) return;
        const isFull = document.fullscreenElement === root;
        if (expandLabel) expandLabel.textContent = isFull ? "Exit fullscreen" : "Expand map";
        expandBtn.setAttribute("aria-label", isFull ? "Exit fullscreen" : "Expand map to fullscreen");
        expandBtn.setAttribute("title", isFull ? "Exit fullscreen" : "Expand map");
      };
      if (expandBtn) {
        expandBtn.addEventListener("click", () => {
          if (document.fullscreenElement === root) {
            document.exitFullscreen();
          } else if (root.requestFullscreen) {
            root.requestFullscreen();
          }
        });
      }
      exitBtn?.addEventListener("click", () => {
        if (document.fullscreenElement === root) document.exitFullscreen();
      });
      document.addEventListener("fullscreenchange", () => {
        updateExpandBtn();
        // Leaflet needs to recalculate after the container resizes.
        requestAnimationFrame(() => map.invalidateSize({ pan: true, animate: false }));
        setTimeout(() => {
          map.invalidateSize({ pan: true, animate: false });
          if (!focus) {
            fitSelectedIslands(appliedFilters.islands, false);
          }
        }, 180);
      });
      new ResizeObserver(() => map.invalidateSize({ pan: true, animate: false })).observe($(".hx-stage"));
      render();
      // Reframe once the dashboard has reached its final size so the full main
      // island chain is prominent and consistently visible on first load.
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: true, animate: false });
        fitMainHawaiianIslands();
      });
    })
    .catch((caught) => {
      console.error(caught);
      error.hidden = false;
      error.textContent = "Case-study data could not load. Run the site through a local web server and reload.";
      $("[data-result-count]").textContent = "Data unavailable";
    });
})();
