(() => {
  const root = document.querySelector('[data-evidence-only]');
  if (!root) return;
  const analytics = root.querySelector('.hx-analytics');
  const settings = root.querySelector('.hx-analytics-steps');
  const scope = root.querySelector('[data-matrix-scope]');
  const grid = root.querySelector('[data-matrix-grid]');
  if (!analytics || !settings || !scope || !grid) return;

  const workspace = document.createElement('div');
  workspace.className = 'evidence-workspace';
  workspace.innerHTML = `
    <aside class="evidence-geography" aria-labelledby="evidence-geography-title">
      <div class="evidence-workspace-name"><strong>Evidence explorer</strong><span>Hawaiʻi NbS research</span></div>
      <div class="evidence-geography-body">
        <h2 id="evidence-geography-title">Geographic scope</h2>
        <label class="evidence-place-search"><span class="evidence-sr-only">Search islands and study areas</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg><input type="search" placeholder="Find an island or area" autocomplete="off" /></label>
        <fieldset class="evidence-place-list"><legend class="evidence-sr-only">Choose a geographic scope</legend><div data-evidence-places></div></fieldset>
        <p class="evidence-place-empty" hidden>No places match your search.</p>
      </div>
    </aside>
    <div class="evidence-main-panel"></div>`;
  root.prepend(workspace);
  const mainPanel = workspace.querySelector('.evidence-main-panel');
  mainPanel.append(settings, analytics);
  scope.closest('label').hidden = true;
  settings.setAttribute('aria-label', 'Chart dimensions');

  const toolbar = document.createElement('div');
  toolbar.className = 'evidence-chart-toolbar';
  toolbar.innerHTML = `<div class="evidence-view-switch" role="group" aria-label="Evidence display"><button type="button" data-evidence-view="matrix" aria-pressed="true"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/></svg>Matrix</button><button type="button" data-evidence-view="table" aria-pressed="false"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="1"/><path d="M1.5 6h13M1.5 10h13M6 2v12"/></svg>Table</button></div><button type="button" class="evidence-download" disabled><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 2v10m-4-4 4 4 4-4M3 13v4h14v-4"/></svg>Download data</button>`;
  root.querySelector('.hx-analytics-heading').after(toolbar);
  const source = document.createElement('p');
  source.className = 'evidence-source';
  source.innerHTML = 'Source: <a href="../assets/data/nbs-papers.json" download>Hawaiʻi NbS Hub case-study collection</a> · <a href="#evidence-methods">About this data</a>';
  analytics.append(source);
  root.dataset.evidenceView = 'matrix';

  const placeSearch = workspace.querySelector('input[type="search"]');
  const places = workspace.querySelector('[data-evidence-places]');
  const empty = workspace.querySelector('.evidence-place-empty');
  const download = toolbar.querySelector('.evidence-download');
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036fʻ‘’']/g, '').toLowerCase();

  const syncSelection = () => {
    places.querySelectorAll('input').forEach(input => {
      input.checked = input.value === scope.value;
      input.closest('label').classList.toggle('is-selected', input.checked);
    });
  };
  const renderPlaces = () => {
    const query = normalize(placeSearch.value.trim());
    const options = [...scope.options].filter(option => option.value !== 'sidebar');
    const visible = options.filter(option => !option.value || normalize(option.textContent).includes(query));
    places.replaceChildren();
    visible.forEach(option => {
      const label = document.createElement('label');
      label.className = 'evidence-place-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'evidence-geographic-scope';
      radio.value = option.value;
      const text = document.createElement('span');
      text.textContent = option.textContent;
      label.append(radio, text);
      places.append(label);
    });
    empty.hidden = !query || visible.some(option => option.value);
    syncSelection();
  };
  places.addEventListener('change', event => {
    if (event.target.type !== 'radio') return;
    scope.value = event.target.value;
    scope.dispatchEvent(new Event('change', { bubbles: true }));
    syncSelection();
  });
  placeSearch.addEventListener('input', renderPlaces);
  new MutationObserver(renderPlaces).observe(scope, { childList: true });

  const preferredAxes = () => {
    const row = root.querySelector('[data-matrix-rows]');
    const column = root.querySelector('[data-matrix-columns]');
    if (!row.options.length || !column.options.length) return;
    row.value = 'ecosystem';
    column.value = 'nbs';
    row.dispatchEvent(new Event('change', { bubbles: true }));
  };
  let axesInitialized = false;
  const setView = view => {
    root.dataset.evidenceView = view;
    toolbar.querySelectorAll('[data-evidence-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.evidenceView === view)));
  };
  toolbar.addEventListener('click', event => {
    const button = event.target.closest('[data-evidence-view]');
    if (button) setView(button.dataset.evidenceView);
  });
  settings.querySelector('.evidence-reset').addEventListener('click', () => {
    setView('matrix');
    preferredAxes();
    placeSearch.value = '';
    renderPlaces();
  });

  const syncChart = () => {
    const row = root.querySelector('[data-matrix-rows]');
    const column = root.querySelector('[data-matrix-columns]');
    if (!axesInitialized && row.options.length && column.options.length) {
      axesInitialized = true;
      preferredAxes();
      return;
    }
    root.dataset.evidenceColumns = column.value;
    const rowLabel = row.selectedOptions[0]?.textContent;
    const columnLabel = column.selectedOptions[0]?.textContent;
    if (rowLabel && columnLabel) root.querySelector('.hx-analytics-heading h2').textContent = `${rowLabel} by ${columnLabel}`;
    download.disabled = !grid.querySelector('table');
    syncSelection();
  };
  new MutationObserver(syncChart).observe(grid, { childList: true });

  download.addEventListener('click', () => {
    const table = grid.querySelector('table');
    if (!table) return;
    const headers = [...table.tHead.rows[0].cells].slice(1, -1).map(cell => cell.textContent.trim());
    const rowLabel = root.querySelector('[data-matrix-rows]').selectedOptions[0].textContent;
    const columnLabel = root.querySelector('[data-matrix-columns]').selectedOptions[0].textContent;
    const scopeLabel = scope.selectedOptions[0].textContent;
    const rows = [[rowLabel, columnLabel, 'Unique papers', 'Geographic scope']];
    [...table.tBodies[0].rows].forEach(row => {
      const cells = [...row.cells];
      headers.forEach((header, index) => rows.push([cells[0].textContent.trim(), header, Number(cells[index + 1].textContent.trim()) || 0, scopeLabel]));
    });
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hawaii-nbs-evidence.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  renderPlaces();
  syncChart();
})();
