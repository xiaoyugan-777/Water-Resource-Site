/* Collection navigation only; the site's primary navigation stays independent. */
(() => {
  const nav = document.querySelector('.resource-explorer-subnav');
  if (!nav) return;
  const menus = [...nav.querySelectorAll('.resource-collection-menu')];
  let closeTimer;
  let activeMenu;
  const close = () => {
    clearTimeout(closeTimer);
    menus.forEach(menu => {
      menu.querySelector('button').setAttribute('aria-expanded', 'false');
      menu.querySelector('.resource-collection-panel').hidden = true;
    });
    activeMenu = null;
  };
  const open = menu => {
    clearTimeout(closeTimer);
    if (activeMenu !== menu) close();
    menu.querySelector('button').setAttribute('aria-expanded', 'true');
    menu.querySelector('.resource-collection-panel').hidden = false;
    activeMenu = menu;
    document.querySelectorAll('.nature-nav-dropdown[open]').forEach(item => { item.open = false; });
  };
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036fʻ’']/g, '').toLowerCase();
  menus.forEach(menu => {
    const trigger = menu.querySelector('button');
    menu.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') open(menu);
    });
    menu.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !menu.contains(document.activeElement)) {
        closeTimer = setTimeout(close, 220);
      }
    });
    trigger.addEventListener('click', event => {
      // A mouse enters the trigger before clicking; keep that hover-open panel open.
      if (event.pointerType === 'touch' && activeMenu === menu) close();
      else open(menu);
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activeMenu === menu ? close() : open(menu);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(menu);
        menu.querySelector('.resource-collection-browse').focus();
      }
    });
    menu.addEventListener('focusout', () => {
      setTimeout(() => {
        if (activeMenu === menu && !menu.contains(document.activeElement) && !menu.matches(':hover')) close();
      }, 0);
    });
    menu.querySelector('input').addEventListener('input', event => {
      const term = normalize(event.target.value.trim());
      let count = 0;
      menu.querySelectorAll('.resource-topic-group').forEach(group => {
        let visible = 0;
        group.querySelectorAll('li').forEach(item => {
          const matches = normalize(`${group.querySelector('h3').textContent} ${item.textContent}`).includes(term);
          item.hidden = !matches;
          if (matches) visible++;
        });
        group.hidden = visible === 0;
        count += visible;
      });
      menu.querySelector('.resource-topic-empty').hidden = count !== 0;
    });
  });
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeMenu) {
      const trigger = activeMenu.querySelector('button');
      close();
      trigger.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!nav.contains(event.target)) close();
  });
  document.querySelector('.nature-navigation')?.addEventListener('pointerenter', close);
  document.querySelector('.nature-navigation')?.addEventListener('focusin', close);
})();
