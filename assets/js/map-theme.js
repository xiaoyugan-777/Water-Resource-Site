(() => {
  let theme = 'light';
  try { theme = localStorage.getItem('nbsMapTheme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
  const group = document.createElement('div');
  group.className = 'map-theme-switch';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Map color mode');
  group.innerHTML = '<button type="button" data-map-theme="dark">Dark mode</button><button type="button" data-map-theme="light">Light mode</button>';
  const control = document.createElement('div');
  control.className = 'map-mode-control';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'map-mode-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'map-mode-options');
  trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></svg><span>Mode</span>';
  group.id = 'map-mode-options';
  group.hidden = true;
  control.append(trigger, group);
  const close = () => { group.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
  trigger.addEventListener('click', () => { const open = group.hidden; group.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('click', event => { if (!control.contains(event.target)) close(); });
  control.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); trigger.focus(); } });
  const mount = () => {
    const rail = document.querySelector('.hx-tool-rail, .case-studies-page .hx-case-nav');
    if (!rail) return false;
    (rail.querySelector('.case-rail-bottom') || rail).append(control);
    return true;
  };
  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    observer.observe(document.body, { childList:true, subtree:true });
  }
  const apply = (value, persist = true) => {
    theme = value;
    document.documentElement.dataset.mapTheme = theme;
    group.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mapTheme === theme)));
    if (persist) { try { localStorage.setItem('nbsMapTheme', theme); } catch (_) {} }
    document.dispatchEvent(new CustomEvent('nbs-map-theme-change', { detail: theme }));
  };
  group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { apply(button.dataset.mapTheme); close(); trigger.focus(); }));
  apply(theme, false);
  window.addEventListener('storage', event => { if (event.key === 'nbsMapTheme') apply(event.newValue === 'dark' ? 'dark' : 'light', false); });
})();
