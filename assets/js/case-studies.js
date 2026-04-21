const filterGroups = document.querySelectorAll("[data-filter-group]");
const caseResults = document.querySelector("[data-case-results]");
const caseResultsSummary = document.querySelector("[data-case-results-summary]");
const activeFilter = document.querySelector("[data-active-filter]");
const caseStudyMapCanvas = document.querySelector("#case-study-map-canvas");

const FIELDNAME_GROUPS = [
  { label: "Core", match: (field) => field === "ID" },
  {
    label: "Org",
    match: (field) =>
      ["OrgName", "OrgEmail", "OrgPhone", "OrgWebSite"].includes(field),
  },
  {
    label: "OrgMa",
    match: (field) =>
      ["OrgMa_Ad", "OrgMaCity", "OrgMa_Stat", "OrgMa_Zip"].includes(field),
  },
  {
    label: "Organization Profile",
    match: (field) => ["YrFnd_Num", "Mission", "group_type"].includes(field),
  },
  { label: "_all", match: (field) => field.endsWith("_all") },
  { label: "_top", match: (field) => field.endsWith("_top") },
  {
    label: "Geography",
    match: (field) =>
      [
        "District",
        "beyond_study_area",
        "Other_Oʻahu",
        "Other_State",
        "Statewide",
        "Nationally",
        "Other_Pacific",
        "Internationally",
      ].includes(field),
  },
  { label: "PS_all", match: (field) => field.startsWith("PS_all_") },
  { label: "PS_top", match: (field) => field.startsWith("PS_top_") },
  { label: "PO", match: (field) => field.startsWith("PO_") },
  { label: "OF_all", match: (field) => field.startsWith("OF_all_") },
  { label: "OF_top", match: (field) => field.startsWith("OF_top_") },
  { label: "Serv", match: (field) => field.startsWith("Serv_") },
  {
    label: "Capacity",
    match: (field) =>
      ["PctSt", "FTStaff", "PartTime", "Members", "Volunteers", "OccVolHrs"].includes(field),
  },
  {
    label: "Evaluation",
    match: (field) => ["Track", "Metrics", "Goals"].includes(field),
  },
  { label: "Infl", match: (field) => field.startsWith("Infl_") },
  { label: "Shr", match: (field) => field.startsWith("Shr_") },
  {
    label: "Funding",
    match: (field) =>
      field === "budget" || field.startsWith("Fund_") || field.startsWith("Fnd_"),
  },
  { label: "Res", match: (field) => field.startsWith("Res_") },
  { label: "Other", match: () => true },
];

function normalizeAnswerTypeLabel(label) {
  const raw = (label || "").trim();
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");

  if (compact === "openend" || compact === "openended") {
    return "open-ended";
  }

  return raw;
}

function normalizeDataTypeLabel(label) {
  const raw = (label || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return raw;
  }

  if (lower === "text") {
    return "Text";
  }

  if (lower === "numerical") {
    return "Numerical";
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function normalizeDefinitionGroupLabel(label) {
  const raw = (label || "").trim();

  if (!raw) {
    return raw;
  }

  const dashMatch = raw.match(/^([^-(]+?)\s*-/);
  if (dashMatch) {
    return dashMatch[1].trim();
  }

  const slashMatch = raw.match(/^([^/]+)\//);
  if (slashMatch) {
    return slashMatch[1].trim();
  }

  const words = raw.split(/\s+/).filter(Boolean);
  const firstWord = (words[0] || "").replace(/[^\p{L}\p{N}'ʻ-]+/gu, "");

  if (!firstWord) {
    return raw;
  }

  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
}

function getFieldNameCategory(label) {
  const field = label || "";
  const group = FIELDNAME_GROUPS.find((item) => item.match(field));
  return group ? group.label : "Other";
}

function mergeGroupItems(groupName, items) {
  if (groupName !== "AnswerType" && groupName !== "DataType") {
    return items;
  }

  const merged = new Map();

  items.forEach((item) => {
    const normalizedLabel =
      groupName === "AnswerType"
        ? normalizeAnswerTypeLabel(item.label)
        : normalizeDataTypeLabel(item.label);
    const current = merged.get(normalizedLabel) || { label: normalizedLabel, count: 0 };
    current.count += item.count ?? 0;
    merged.set(normalizedLabel, current);
  });

  return Array.from(merged.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.label.localeCompare(b.label);
  });
}

function groupDefinitionItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const groupLabel = normalizeDefinitionGroupLabel(item.label);
    const current = grouped.get(groupLabel) || { label: groupLabel, count: 0 };
    current.count += item.count ?? 0;
    grouped.set(groupLabel, current);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.label.localeCompare(b.label);
  });
}

function createFilterOptionMarkup(groupName, item, index) {
  const inputId = `filter-${groupName}-${index}`;
  const safeLabel = item.label || "Untitled";
  const safeCount = item.count ?? 0;

  return `
    <label class="evaluate-filter-option" for="${inputId}" data-filter-item="${groupName}" data-filter-value="${safeLabel}">
      <input id="${inputId}" type="checkbox" />
      <span class="evaluate-filter-dot" aria-hidden="true"></span>
      <span class="evaluate-filter-text">${safeLabel}</span>
      <span class="evaluate-filter-count">${safeCount}</span>
    </label>
  `;
}

function renderFieldNameGroup(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const category = getFieldNameCategory(item.label || "");
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(item);
  });

  return FIELDNAME_GROUPS.map((group) => group.label)
    .filter((category) => grouped.has(category))
    .map((category) => {
      const count = grouped.get(category).length;

      return `
        <button class="evaluate-filter-group-row" type="button" data-filter-item="FieldNameGroup" data-filter-value="${category}">
          <span class="evaluate-filter-dot" aria-hidden="true"></span>
          <span class="evaluate-filter-text">${category}</span>
          <span class="evaluate-filter-count">${count}</span>
        </button>
      `;
    })
    .join("");
}

function recordMatchesFilter(groupName, value, record) {
  if (groupName === "FieldNameGroup") {
    return getFieldNameCategory(record.FieldName || "") === value;
  }

  if (groupName === "AnswerType") {
    return normalizeAnswerTypeLabel(record.AnswerType) === value;
  }

  if (groupName === "DataType") {
    return normalizeDataTypeLabel(record.DataType) === value;
  }

  if (groupName === "Definition") {
    return normalizeDefinitionGroupLabel(record.Definition) === value;
  }

  return (record[groupName] || "") === value;
}

function renderRecordCard(record) {
  return `
    <article class="evaluate-case-placeholder-card evaluate-record-card">
      <div class="evaluate-record-media">
        <div class="evaluate-record-tags">
          <span class="evaluate-record-tag">${record.DataType || "Data"}</span>
          <span class="evaluate-record-tag evaluate-record-tag-muted">${record.AnswerType || "Answer"}</span>
        </div>
        <div class="evaluate-record-media-copy">
          <span class="evaluate-record-media-icon" aria-hidden="true"></span>
          <p>Awaiting image</p>
        </div>
      </div>
      <div class="evaluate-record-body">
        <strong>${record.FieldName || "Untitled field"}</strong>
        <p class="evaluate-record-question">${record.Question || "—"}</p>
        <dl class="evaluate-record-meta">
          <div>
            <dt>Definition</dt>
            <dd>${record.Definition || "—"}</dd>
          </div>
          <div>
            <dt>DataType</dt>
            <dd>${record.DataType || "—"}</dd>
          </div>
          <div>
            <dt>AnswerType</dt>
            <dd>${record.AnswerType || "—"}</dd>
          </div>
        </dl>
      </div>
    </article>
  `;
}

function renderResults(groupName, value) {
  if (!caseResults || !caseResultsSummary || !window.caseStudyRecords) {
    return;
  }

  const matches = window.caseStudyRecords.filter((record) => recordMatchesFilter(groupName, value, record));
  const filterLabel = groupName === "FieldNameGroup" ? "FieldName" : groupName;

  caseResultsSummary.textContent = `${value}: ${matches.length} matching field${matches.length === 1 ? "" : "s"}`;

  if (activeFilter) {
    activeFilter.hidden = false;
    activeFilter.innerHTML = `
      <button class="evaluate-active-filter-clear" type="button" data-clear-results aria-label="Clear selected filter">×</button>
      <span>${filterLabel} | ${value}</span>
    `;
  }

  if (!matches.length) {
    caseResults.innerHTML = `
      <article class="evaluate-case-placeholder-card">
        <strong>No matching fields</strong>
        <p>No records matched this filter in the current data dictionary.</p>
      </article>
    `;
    return;
  }

  caseResults.innerHTML = `
    <article class="evaluate-case-placeholder-card evaluate-results-intro-card">
      <strong>${value}</strong>
      <p>Showing ${matches.length} matching fields from the data dictionary.</p>
    </article>
    ${matches.map((record) => renderRecordCard(record)).join("")}
  `;
}

function resetResults() {
  if (!caseResults || !caseResultsSummary) {
    return;
  }

  if (activeFilter) {
    activeFilter.hidden = true;
    activeFilter.innerHTML = "";
  }

  caseResultsSummary.textContent = "Select a filter on the left to inspect matching fields.";
  caseResults.innerHTML = `
    <article class="evaluate-case-placeholder-card evaluate-results-intro-card">
      <strong>Filter-driven results</strong>
      <p>Click a group like <span class="evaluate-inline-code">Org</span> under <span class="evaluate-inline-code">FieldName</span> to show all matching fields with their Definition, Question, DataType, and AnswerType.</p>
    </article>
  `;
}

if (filterGroups.length && window.caseStudyFilters) {
  filterGroups.forEach((group) => {
    const groupName = group.dataset.filterGroup || "";
    const items = mergeGroupItems(groupName, window.caseStudyFilters[groupName] || []);

    if (!items.length) {
      group.innerHTML = `
        <p class="evaluate-filter-empty">No data available yet.</p>
      `;
      return;
    }

    if (groupName === "FieldName") {
      group.innerHTML = renderFieldNameGroup(items);
      return;
    }

    if (groupName === "Definition") {
      group.innerHTML = groupDefinitionItems(items)
        .map((item, index) => createFilterOptionMarkup(groupName, item, index))
        .join("");
      return;
    }

    group.innerHTML = items.map((item, index) => createFilterOptionMarkup(groupName, item, index)).join("");
  });

  document.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-clear-results]");
    if (clearButton) {
      resetResults();
      return;
    }

    const trigger = event.target.closest("[data-filter-item]");

    if (!trigger) {
      return;
    }

    renderResults(trigger.dataset.filterItem || "", trigger.dataset.filterValue || "");
  });
}

if (caseStudyMapCanvas && typeof window.L !== "undefined") {
  const caseStudyMapRecords = [
    {
      label: "Honolulu",
      detail: "Urban watershed and coastal resilience case cluster",
      coords: [21.3069, -157.8583],
    },
    {
      label: "Kaneohe",
      detail: "Community stewardship and ecological restoration activity",
      coords: [21.4097, -157.7989],
    },
    {
      label: "Waimanalo",
      detail: "Place-based monitoring and cultural landscape efforts",
      coords: [21.3347, -157.7003],
    },
  ];

  const map = window.L.map(caseStudyMapCanvas, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([21.38, -157.82], 10);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    detectRetina: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  caseStudyMapRecords.forEach((record, index) => {
    const marker = window.L.circleMarker(record.coords, {
      radius: index === 0 ? 12 : 10,
      color: index === 0 ? "#18211f" : "#f6f4ee",
      weight: index === 0 ? 3 : 2,
      fillColor: index === 0 ? "#a8cf6b" : "#7ca746",
      fillOpacity: 0.96,
    }).addTo(map);

    marker.bindTooltip(`${record.label}: ${record.detail}`, {
      permanent: false,
      direction: "top",
      offset: [0, -10],
      className: "evaluate-map-tooltip",
    });
  });

  map.whenReady(() => {
    window.setTimeout(() => map.invalidateSize(), 120);
  });
}
