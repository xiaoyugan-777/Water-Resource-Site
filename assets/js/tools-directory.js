(() => {
  const tools = [...toolCatalog].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  function cardId(tool) {
    return 'tool-' + normalize(tool.previousName || tool.name).replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  }
  const byName = new Map(tools.map(tool => [tool.name, tool]));
  for (const tool of tools) {
    if (tool.previousName) byName.set(tool.previousName, tool);
  }
  for (const link of document.querySelectorAll('[data-tool]')) {
    link.href = './tools-explorer.html#' + cardId(byName.get(link.dataset.tool));
  }

  const grid = document.getElementById('tool-directory-cards');
  if (!grid) return;
  const filter = document.getElementById('tool-category');
  const form = document.getElementById('tool-filters');
  const counts = new Map();
  for (const tool of tools) counts.set(tool.group, (counts.get(tool.group) || 0) + 1);
  for (const group of ['', ...Array.from(counts.keys()).sort()]) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'category';
    checkbox.value = group;
    checkbox.defaultChecked = group === '';
    label.append(checkbox, (group || 'All categories') + ' (' + (counts.get(group) || tools.length) + ')');
    filter.append(label);
  }
  function previewCard(tool, href, reasons = []) {
    const link = document.createElement('a');
    link.className = 'resource-explorer-card';
    link.href = href;
    if (tool.screenshot || tool.url) {
      const preview = document.createElement('div');
      preview.className = 'resource-explorer-preview';
      const image = document.createElement('img');
      const publicPage = new URL(tool.url || '', 'https://hawaii-nbs-hub.vercel.app/pages/');
      image.loading = 'lazy';
      image.alt = '';
      image.addEventListener('error', () => preview.remove(), { once: true });
      image.src = tool.screenshot || 'https://s.wordpress.com/mshots/v1/'
        + encodeURIComponent(publicPage.href) + '?w=800&h=450';
      preview.append(image);
      link.append(preview);
    }
    if (reasons.length) {
      const reason = document.createElement('small');
      reason.textContent = reasons.join(' · ');
      link.append(reason);
    }
    const title = document.createElement('h3');
    title.textContent = tool.name;
    const description = document.createElement('p');
    description.textContent = tool.description;
    link.append(title, description);
    return link;
  }
  for (const [index, tool] of tools.entries()) {
    const id = cardId(tool);
    if (grid.dataset.view === 'preview') {
      grid.append(previewCard(tool, './tools-explorer.html#' + id));
      continue;
    }
    const card = document.createElement('article');
    card.id = id;
    card.className = 'tool-result';
    const category = document.createElement('small');
    const selectCard = document.createElement('a');
    selectCard.href = '#' + id;
    selectCard.className = 'tool-select';
    selectCard.setAttribute('aria-label', 'Select ' + tool.name);
    selectCard.textContent = String(index + 1).padStart(2, '0') + ' · ' + tool.group;
    category.append(selectCard);
    if (tool.url) {
      const isPdf = /\.pdf(?:[?#]|$)/i.test(tool.url);
      const icon = document.createElement('span');
      icon.className = 'tool-format-icon';
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', isPdf ? 'PDF document' : 'Web link');
      icon.innerHTML = isPdf
        ? '<svg viewBox="0 0 32 32"><path d="M6 2h13l7 7v21H6z M19 2v8h7"/><text x="16" y="23" text-anchor="middle" fill="currentColor" stroke="none" font-size="9" font-weight="700">PDF</text></svg>'
        : '<svg viewBox="0 0 24 24"><path d="m20 11-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l10-10a3.5 3.5 0 0 1 5 5l-10 10a1.5 1.5 0 0 1-2.1-2.1l9-9"/></svg>';
      category.prepend(icon);
    }
    const title = document.createElement('h3');
    const name = document.createElement(tool.url ? 'a' : 'span');
    name.textContent = tool.name;
    if (tool.url) name.href = tool.url;
    title.append(name);
    const description = document.createElement('p');
    description.textContent = tool.description;
    const owner = document.createElement('p');
    owner.className = 'tool-owner';
    owner.textContent = tool.owner;
    const fields = document.createElement('dl');
    for (const [label, value] of [
      ['Question it answers', tool.question], ['Why it matters for flooding', tool.floodRelevance],
      ['How to use it', tool.howTo], ['Good to know', tool.goodToKnow],
      ['Status', tool.status || 'To be confirmed'], ['Suggested audience', tool.audience.join(', ')], ['Island coverage', tool.islands || 'To be confirmed']
    ]) {
      if (!value) continue;
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = label;
      definition.textContent = value;
      const field = document.createElement('div');
      field.append(term, definition);
      fields.append(field);
    }
    card.append(category, title, owner, description, fields);
    if (tool.url) {
      const source = document.createElement('a');
      source.href = tool.url;
      source.textContent = /\.pdf(?:[?#]|$)/i.test(tool.url) ? 'Open PDF' : 'Open tool';
      card.append(source);
    }
    card.addEventListener('click', event => {
      if (!event.target.closest('a') && !window.getSelection()?.toString()) selectCard.click();
    });
    if (tool.reportUrl) {
      const report = document.createElement('a');
      report.href = tool.reportUrl;
      report.textContent = 'Related case study (PDF)';
      card.append(report);
    }
    if (tool.contactUrl) {
      const contact = document.createElement('a');
      contact.href = tool.contactUrl;
      contact.textContent = 'Contact the team';
      card.append(contact);
    }
    if (tool.screenshot) {
      const image = document.createElement('img');
      image.src = tool.screenshot;
      image.alt = tool.name + ' screenshot';
      image.loading = 'lazy';
      card.append(image);
    }
    grid.append(card);
  }
  const cards = Array.from(grid.children);
  const nameFilter = document.getElementById('tool-name');
  const initials = new Set(tools.map(tool => normalize(tool.name).charAt(0)));
  for (const letter of ['', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'initial';
    radio.value = letter.toLowerCase();
    radio.defaultChecked = !letter;
    radio.disabled = Boolean(letter) && !initials.has(radio.value);
    label.append(radio, letter || 'All letters');
    nameFilter.append(label);
  }
  const ownerFilter = document.getElementById('tool-owner');
  const owners = [...new Set(tools.map(tool => tool.owner).filter(Boolean))];
  owners.sort((a, b) => a.localeCompare(b, 'en'));
  for (const owner of ['', ...owners]) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'organization';
    radio.value = owner;
    radio.defaultChecked = owner === '';
    label.append(radio, owner || 'All organizations');
    ownerFilter.append(label);
  }
  const empty = document.getElementById('tool-empty');
  function normalize(text) {
    return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[ʻ‘’']/g, '').trim();
  }
  const query = document.getElementById('directory-query');
  const searchableText = tools.map(tool => normalize(
    [tool.name, tool.description, tool.group, tool.owner, tool.status].join(' ')
  ));
  const view = document.getElementById('directory-view');
  const map = document.getElementById('directory-map');
  function renderMap(visibleTools) {
    map.replaceChildren();
    if (!visibleTools.length) return;
    const chart = document.createElement('div');
    chart.className = 'coverage-chart';
    const groups = new Map();
    for (const tool of visibleTools) {
      const area = tool.islands || 'Coverage to be confirmed';
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area).push(tool);
    }
    map.append(chart);
    for (const [area, entries] of groups) {
      const group = document.createElement('details');
      const heading = document.createElement('summary');
      heading.textContent = area + ' (' + entries.length + ')';
      group.append(heading);
      for (const tool of entries) {
        const link = document.createElement('a');
        link.href = './tools-explorer.html#' + cardId(tool);
        link.textContent = tool.name;
        link.addEventListener('click', () => {
          if (grid.dataset.view !== 'preview') {
            view.value = 'list';
            applyFilter();
          }
        });
        group.append(link);
      }
      map.append(group);
      if (area === 'Oʻahu' || area === 'All islands') {
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = area === 'Oʻahu' ? 'coverage-oahu' : 'coverage-state';
        pin.textContent = heading.textContent;
        pin.addEventListener('click', () => { group.open = true; heading.focus(); });
        chart.append(pin);
      }
    }
  }
  view.addEventListener('change', applyFilter);
  function applyFilter() {
    const terms = normalize(query.value).split(/\s+/).filter(Boolean);
    const initial = form.elements.initial.value;
    const owner = form.elements.organization.value;
    const categories = new Set(Array.from(filter.querySelectorAll('input:checked'), input => input.value));
    grid.dataset.layout = view.value;
    grid.hidden = view.value === 'map';
    map.hidden = !grid.hidden;
    const visibleTools = [];
    tools.forEach((tool, index) => {
      const visible = (categories.has('') || categories.has(tool.group))
        && terms.every(term => searchableText[index].includes(term))
        && normalize(tool.name).startsWith(initial)
        && (!owner || tool.owner === owner);
      cards[index].hidden = !visible;
      if (visible) visibleTools.push(tool);
    });
    const matches = visibleTools.length;
    if (!map.hidden) renderMap(visibleTools);
    empty.hidden = matches > 0;
    document.getElementById('tool-result-count').textContent = matches + (matches === 1 ? ' result' : ' results');
  }
  form.addEventListener('submit', event => event.preventDefault());
  query.addEventListener('input', applyFilter);
  nameFilter.addEventListener('change', applyFilter);
  ownerFilter.addEventListener('change', applyFilter);
  filter.addEventListener('change', event => {
    const all = filter.querySelector('input[value=""]');
    const options = Array.from(filter.querySelectorAll('input:not([value=""])'));
    if (event.target === all) {
      for (const option of options) option.checked = false;
    }
    all.checked = !options.some(option => option.checked);
    applyFilter();
  });
  form.addEventListener('reset', () => requestAnimationFrame(applyFilter));
  applyFilter();
  if (grid.dataset.view !== 'preview') {
    const section = document.getElementById('tool-recommendations');
    const shelf = section.querySelector('.recommendation-grid');
    const byId = new Map(tools.map(tool => [cardId(tool), tool]));
    function recommend(current) {
      if (!current) return;
      try { sessionStorage.setItem('recent-directory-tool', cardId(current)); } catch {}
      const related = tools.filter(tool => tool !== current).map(tool => {
        const island = current.islands && current.islands !== 'All islands' && tool.islands === current.islands;
        const category = tool.group === current.group;
        const reasons = [island && current.islands, category && current.group].filter(Boolean);
        return { tool, reasons, score: (island ? 2 : 0) + Number(category) };
      }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 4);
      shelf.replaceChildren();
      section.hidden = !related.length;
      for (const { tool, reasons } of related) {
        shelf.append(previewCard(tool, '#' + cardId(tool), reasons));
      }
    }
    function showSelectedCard() {
      const selected = document.getElementById(location.hash.slice(1));
      if (selected && byId.has(selected.id)) {
        if (selected.hidden) form.reset();
        if (grid.hidden) view.value = 'list';
        applyFilter();
        selected.scrollIntoView({ block: 'center' });
        recommend(byId.get(selected.id));
      }
    }
    // Reopening the current fragment does not fire hashchange.
    shelf.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link?.hash === location.hash && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        showSelectedCard();
      }
    });
    grid.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link) recommend(byId.get(link.closest('.tool-result')?.id));
    });
    try { recommend(byId.get(sessionStorage.getItem('recent-directory-tool'))); } catch {}
    window.addEventListener('hashchange', showSelectedCard);
    if (location.hash) showSelectedCard();
  }
})();
