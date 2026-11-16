// Generated from modules/media_slots.js.
export async function installSpImagenMediaSlots() {
  'use strict';

  const candidates = [];
  for (const candidate of [window.parent, window.top, window]) {
    try {
      if (candidate?.SillyTavern?.getContext && candidate.document?.getElementById('chat') && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    } catch (_) {}
  }
  const host = candidates[0];
  if (!host) throw new Error('SP Imagen: SillyTavern недоступен.');

  const doc = host.document;
  const context = () => host.SillyTavern.getContext();
  const STORE = 'ness_media_slots_v2';
  const KINDS = Object.freeze(['snapshot', 'comic', 'story_page']);
  const LABEL = Object.freeze({ snapshot: 'Snapshot', comic: 'Comic', story_page: 'Story Page' });
  const LIMIT = 10;
  const CLEANUP_KEY = '__nessMediaSlotsV5Cleanup';
  const mounted = new Map();
  const busy = new Set();
  const subscriptions = [];
  let openMenu = null;
  let wand = null;

  try { host[CLEANUP_KEY]?.(); } catch (_) {}
  try { host.__nessImageSlotsV4?.dispose?.(); } catch (_) {}

  const safeUrl = value => typeof value === 'string'
    && /^(?:\/|user\/images\/|https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(value)
    && !/\[IMG:|\/error\.svg(?:\?|$)/i.test(value);

  function slotsOf(message, create = false) {
    if (!message) return null;
    if (!message.extra) {
      if (!create) return null;
      message.extra = {};
    }
    let slots = message.extra[STORE];
    if ((!slots || typeof slots !== 'object' || Array.isArray(slots)) && create) {
      slots = {};
      message.extra[STORE] = slots;
    }
    if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return null;
    if (create) {
      for (const kind of KINDS) {
        if (!slots[kind] || !Array.isArray(slots[kind].versions)) slots[kind] = { versions: [], selected: 0 };
      }
    }
    for (const kind of KINDS) {
      const slot = slots[kind];
      if (!slot || !Array.isArray(slot.versions)) continue;
      if (slot.versions.some(item => !safeUrl(item?.src))) {
        slot.versions = slot.versions.filter(item => safeUrl(item?.src));
      }
      slot.selected = Math.max(0, Math.min(Math.trunc(Number(slot.selected)) || 0, Math.max(0, slot.versions.length - 1)));
    }
    return slots;
  }

  function addVersion(slot, item) {
    if (!slot || !safeUrl(item?.src) || slot.versions.some(version => version.src === item.src)) return false;
    slot.versions.push({ src: item.src, config: item.config || null, at: Number(item.at) || Date.now() });
    slot.selected = slot.versions.length - 1;
    return true;
  }

  function migrateMessage(message) {
    const legacy = Array.isArray(message?.extra?.sp_imagen_embeds) ? message.extra.sp_imagen_embeds : [];
    const existing = slotsOf(message, false);
    if (!legacy.length && !existing) return false;
    const slots = slotsOf(message, true);
    let changed = false;
    for (const item of legacy) {
      if (!KINDS.includes(item?.kind) || !safeUrl(item?.src)) continue;
      changed = addVersion(slots[item.kind], {
        src: item.src,
        config: item.config || null,
        at: Date.parse(item.generated_at) || Date.now(),
      }) || changed;
    }
    return changed;
  }

  function migrateTail() {
    const current = context();
    const chat = current?.chat;
    if (!Array.isArray(chat)) return;
    let changed = false;
    for (let index = Math.max(0, chat.length - LIMIT); index < chat.length; index++) {
      changed = migrateMessage(chat[index]) || changed;
    }
    if (changed) void current.saveChat?.().catch(error => console.error('[SP Imagen] migration save', error));
  }

  const uiCss = `
    :host {
      --ms-panel: var(--SmartThemeBlurTintColor, Canvas);
      --ms-line: var(--SmartThemeBorderColor, currentColor);
      display: block !important;
      visibility: visible !important;
      box-sizing: border-box;
      min-inline-size: 0;
      color: inherit;
      font: inherit;
      line-height: 1.35;
    }
    :host([data-ms="post"]) { clear: both; }
    :host([data-ms="post"][hidden]), .gallery[hidden], .post-tools[hidden] { display: none !important; }
    :host([data-ms="wand"]) { opacity: 1 !important; pointer-events: auto !important; }
    :host([data-ms="floating"]) {
      position: fixed !important;
      inset: var(--ms-top, 0px) auto auto var(--ms-left, 0px) !important;
      z-index: 2147482000 !important;
      inline-size: min(12em, var(--ms-max-width));
      max-block-size: var(--ms-max-height);
      overflow: auto;
      overscroll-behavior: contain;
      padding: .25em;
      border: 1px solid var(--ms-line);
      border-radius: .6em;
      background: var(--ms-panel);
      backdrop-filter: blur(var(--SmartThemeBlurStrength, 10px));
      box-shadow: 0 4px 16px color-mix(in srgb, var(--SmartThemeShadowColor, CanvasText), transparent 70%);
    }
    *, *::before, *::after { box-sizing: border-box; }
    button {
      appearance: none;
      margin: 0;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: inherit;
      cursor: pointer;
      touch-action: manipulation;
      white-space: nowrap;
    }
    button:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -2px;
    }
    button:disabled { opacity: .45; cursor: default; }
    .post-tools {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: center;
      padding: .5em .75em;
    }
    .generate, .tool, .option { border-radius: .4em; }
    .generate { opacity: .8; font-size: 1.25em; }
    .generate[aria-expanded="true"], .generate:focus-visible { opacity: 1; }
    .generate, .tool { min-inline-size: 32px; min-block-size: 32px; text-align: center; }
    .option {
      display: block;
      inline-size: 100%;
      min-block-size: 36px;
      padding: .45em .65em;
      text-align: start;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (hover: hover) {
      .generate:hover { opacity: 1; }
      .tool:not(:disabled):hover, .option:hover {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }
    }
    .gallery { display: grid; gap: .65em; margin-block: .25em .65em; }
    .card {
      min-inline-size: 0;
      padding: .45em;
      border: 1px solid var(--ms-line);
      border-radius: .65em;
      background: color-mix(in srgb, var(--ms-panel) 35%, transparent);
      font-size: .9em;
    }
    .heading { padding: .15em .3em .45em; font-weight: 600; }
    .frame {
      display: grid;
      inline-size: 100%;
      aspect-ratio: 2 / 3;
      max-block-size: 72vh;
      max-block-size: 72dvh;
      border-radius: .4em;
      overflow: hidden;
      background: color-mix(in srgb, currentColor 5%, transparent);
      cursor: zoom-in;
    }
    .frame[data-aspect="1:1"] { aspect-ratio: 1; }
    .frame[data-aspect="9:16"] { aspect-ratio: 9 / 16; }
    img { display: block; inline-size: 100%; block-size: 100%; min-block-size: 0; object-fit: contain; }
    .bar, .actions { display: flex; align-items: center; flex-wrap: wrap; gap: .2em; }
    .bar { justify-content: space-between; padding-block-start: .35em; }
    .count { padding-inline: .15em; font-variant-numeric: tabular-nums; white-space: nowrap; }
    @media (pointer: coarse) {
      .generate, .tool { min-inline-size: 44px; min-block-size: 44px; }
      .option { min-block-size: 44px; }
    }
  `;
  const sheet = typeof host.CSSStyleSheet?.prototype.replaceSync === 'function' && host.ShadowRoot
    && 'adoptedStyleSheets' in host.ShadowRoot.prototype ? new host.CSSStyleSheet() : null;
  sheet?.replaceSync(uiCss);

  function element(tag, className, label) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (label) node.textContent = label;
    if (tag === 'button') node.type = 'button';
    return node;
  }

  function component(role) {
    const node = element('ness-media-slots');
    node.dataset.ms = role;
    const root = node.attachShadow({ mode: 'open' });
    if (sheet) root.adoptedStyleSheets = [sheet];
    else root.append(element('style', '', uiCss));
    return { node, root };
  }

  function closeToolsMenu(restoreFocus = false) {
    if (!openMenu) return;
    const { node, toggle } = openMenu;
    openMenu = null;
    node.remove();
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && toggle.isConnected) toggle.focus({ preventScroll: true });
  }

  function toggleToolsMenu(view) {
    const wasOpen = openMenu?.toggle === view.toggle;
    closeToolsMenu();
    if (wasOpen) return;

    const { node, root } = component('floating');
    for (const kind of KINDS) {
      const option = element('button', 'option', LABEL[kind]);
      option.addEventListener('click', () => {
        closeToolsMenu(true);
        if (context().chat?.[view.index] === view.message) {
          void executeCommand('sp_ness_generate_at', view, kind);
        }
      });
      root.append(option);
    }

    const viewport = host.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const right = left + (viewport?.width ?? host.innerWidth);
    const bottom = top + (viewport?.height ?? host.innerHeight);
    const gap = 8;
    node.style.setProperty('--ms-max-width', Math.max(0, right - left - gap * 2) + 'px');
    node.style.setProperty('--ms-max-height', Math.max(0, bottom - top - gap * 2) + 'px');
    doc.body.append(node);
    const anchor = view.toggle.getBoundingClientRect();
    const menu = node.getBoundingClientRect();
    const x = Math.max(left + gap, Math.min(anchor.left, right - menu.width - gap));
    const preferredY = anchor.bottom + gap + menu.height <= bottom - gap ? anchor.bottom + gap : anchor.top - gap - menu.height;
    const y = Math.max(top + gap, Math.min(preferredY, bottom - menu.height - gap));
    node.style.setProperty('--ms-left', x + 'px');
    node.style.setProperty('--ms-top', y + 'px');
    view.toggle.setAttribute('aria-expanded', 'true');
    openMenu = { node, toggle: view.toggle };
    root.querySelector('button')?.focus({ preventScroll: true });
  }

  function eligible(message) {
    return message && !message.is_system && typeof message.mes === 'string' && message.mes.trim()
      && message.name !== 'GlassPhone' && !message.extra?.isSmsSilent && !message.extra?.sp_imagen_transport;
  }

  function mountPost(anchor, index, message) {
    const { node, root } = component('post');
    const tools = element('div', 'post-tools');
    const toggle = element('button', 'generate', '✧');
    toggle.title = 'Создать изображение';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', 'false');
    const gallery = element('div', 'gallery');
    const view = { node, anchor, index, message, tools, toggle, gallery, cards: new Map() };
    toggle.addEventListener('click', () => toggleToolsMenu(view));
    tools.append(toggle);
    root.append(tools, gallery);
    anchor.parentElement.append(node);
    return view;
  }

  function galleryButton(label, title, action, disabled = false) {
    const button = element('button', 'tool', label);
    button.title = title;
    button.setAttribute('aria-label', title);
    button.disabled = disabled;
    button.addEventListener('click', () => void runAction(action));
    return button;
  }

  function card(index, kind, slot, locked) {
    const selected = slot.selected;
    const item = slot.versions[selected];
    const section = element('section', 'card');
    const heading = element('div', 'heading', LABEL[kind]);
    const frame = element('button', 'frame');
    frame.dataset.aspect = item.config?.aspect_ratio || '2:3';
    const image = element('img');
    image.src = item.src;
    image.alt = `${LABEL[kind]} · версия ${selected + 1}`;
    image.loading = 'lazy';
    frame.addEventListener('click', () => host.open(item.src, '_blank', 'noopener'));
    frame.append(image);

    const bar = element('div', 'bar');
    const navigation = element('div', 'actions');
    const actions = element('div', 'actions');
    navigation.append(
      galleryButton('←', 'Предыдущая версия', () => choose(index, kind, -1), selected === 0),
      element('span', 'count', `${selected + 1} / ${slot.versions.length}`),
      galleryButton('→', 'Следующая версия', () => choose(index, kind, 1), selected === slot.versions.length - 1),
    );
    actions.append(
      galleryButton(locked ? '⏳' : '↻', 'Повторить эту версию', () => regenerate(index, kind), locked || !item.config),
      galleryButton('↓', 'Скачать', () => saveSelected(index, kind)),
      galleryButton('🗑', 'Удалить из галереи', () => deleteSelected(index, kind), locked),
    );
    bar.append(navigation, actions);
    section.append(heading, frame, bar);
    return section;
  }

  function updatePost(view, slots, chatId) {
    view.tools.hidden = !eligible(view.message);
    for (const kind of KINDS) {
      const slot = slots?.[kind];
      const item = slot?.versions?.[slot.selected];
      const previous = view.cards.get(kind);
      if (!item) {
        previous?.node.remove();
        view.cards.delete(kind);
        continue;
      }
      const locked = busy.has(`${chatId}|${view.index}|${kind}`);
      const count = slot.versions.length;
      if (previous?.item === item && previous.selected === slot.selected && previous.count === count && previous.locked === locked) continue;
      const node = card(view.index, kind, slot, locked);
      if (previous) previous.node.replaceWith(node);
      else {
        const nextKind = KINDS.slice(KINDS.indexOf(kind) + 1).find(key => view.cards.has(key));
        view.gallery.insertBefore(node, view.cards.get(nextKind)?.node ?? null);
      }
      view.cards.set(kind, { node, item, selected: slot.selected, count, locked });
    }
    view.gallery.hidden = !view.cards.size;
    view.node.hidden = view.tools.hidden && view.gallery.hidden;
    if (view.tools.hidden && openMenu?.toggle === view.toggle) closeToolsMenu();
  }

  function unmountPost(view) {
    if (openMenu?.toggle === view.toggle) closeToolsMenu();
    view.node.remove();
  }

  function paint() {
    const current = context();
    const chat = current?.chat;
    const chatElement = doc.getElementById('chat');
    if (!Array.isArray(chat) || !chatElement) return;
    const first = Math.max(0, chat.length - LIMIT);
    for (const [index, view] of mounted) {
      if (index >= first && view.node.isConnected && view.anchor.isConnected && view.message === chat[index]) continue;
      unmountPost(view);
      mounted.delete(index);
    }
    for (let index = first; index < chat.length; index++) {
      const messageElement = chatElement.querySelector(`.mes[mesid="${index}"]`);
      const anchor = messageElement?.querySelector('.mes_text');
      if (!anchor) continue;
      const message = chat[index];
      const slots = slotsOf(message);
      let view = mounted.get(index);
      if (view && view.anchor !== anchor) {
        unmountPost(view);
        mounted.delete(index);
        view = null;
      }
      if (!view) {
        if (!eligible(message) && !KINDS.some(kind => slots?.[kind]?.versions?.length)) continue;
        view = mountPost(anchor, index, message);
        mounted.set(index, view);
      }
      updatePost(view, slots, current.chatId);
    }
  }

  async function publish(index, kind, item) {
    if (!KINDS.includes(kind) || !safeUrl(item?.src)) throw new Error('Неверный слот или адрес изображения.');
    const extension = host.__spImagenExtension;
    const storedSrc = typeof extension?.persistImageSource === 'function'
      ? await extension.persistImageSource(item.src)
      : item.src;
    const storedItem = { ...item, src: storedSrc };
    if (!safeUrl(storedItem.src)) throw new Error('SP Imagen не смог сохранить файл изображения.');
    const current = context();
    const message = current.chat?.[index];
    if (!message) throw new Error('Целевое сообщение не найдено.');
    migrateMessage(message);
    const slots = slotsOf(message, true);
    addVersion(slots[kind], storedItem);
    await current.saveChat();
    paint();
    return storedItem;
  }

  async function focus(index, kind) {
    paint();
    const view = mounted.get(index);
    return view ? view.cards.has(kind) : !doc.querySelector(`#chat .mes[mesid="${index}"]`);
  }

  async function choose(index, kind, delta) {
    const current = context();
    const slot = slotsOf(current.chat?.[index], false)?.[kind];
    if (!slot) return;
    const before = slot.selected;
    slot.selected = Math.max(0, Math.min(before + delta, slot.versions.length - 1));
    if (slot.selected === before) return;
    paint();
    try { await current.saveChat(); }
    catch (error) { slot.selected = before; paint(); throw error; }
  }

  async function deleteSelected(index, kind) {
    const current = context();
    const slot = slotsOf(current.chat?.[index], false)?.[kind];
    if (!slot?.versions?.length) return;
    const selected = slot.selected;
    if (!host.confirm(`Удалить версию ${selected + 1} из ${slot.versions.length}?`)) return;
    const before = slot.versions.slice();
    slot.versions.splice(selected, 1);
    slot.selected = Math.min(selected, Math.max(0, slot.versions.length - 1));
    paint();
    try { await current.saveChat(); }
    catch (error) { slot.versions = before; slot.selected = selected; paint(); throw error; }
  }

  async function saveSelected(index, kind) {
    const slot = slotsOf(context().chat?.[index])?.[kind];
    const item = slot?.versions?.[slot.selected];
    if (!item) return;
    const response = await host.fetch(item.src);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const url = host.URL.createObjectURL(await response.blob());
    const link = doc.createElement('a');
    link.href = url;
    link.download = `ness-${kind}.png`;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    host.URL.revokeObjectURL(url);
  }

  function instruction(config) {
    return JSON.stringify(config).replace(/&/g, '\\u0026').replace(/'/g, '\\u0027').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  }

  async function regenerate(index, kind) {
    const current = context();
    const chat = current.chat;
    const message = chat?.[index];
    const slot = slotsOf(message, false)?.[kind];
    const item = slot?.versions?.[slot.selected];
    if (!item?.config) throw new Error('У этой версии не сохранён промпт.');
    const lock = `${current.chatId}|${index}|${kind}`;
    if (busy.has(lock)) return;
    busy.add(lock);
    paint();
    const extension = host.__spImagenExtension;
    if (item.config.spImagenDirect && extension?.directGenerationEnabled?.() && typeof extension.generateImage === 'function') {
      try {
        const generated = await extension.generateImage(item.config, { reuseSnapshot: true });
        if (context().chat !== chat || context().chatId !== current.chatId || chat[index] !== message) throw new Error('Чат изменился во время повторной генерации.');
        await publish(index, kind, generated);
        return;
      } finally {
        busy.delete(lock);
        paint();
      }
    }
    const temporary = {
      name: 'System', is_user: false, is_system: true,
      mes: `<naicom>\n<img data-iig-instruction='${instruction(item.config)}' src="[IMG:GEN]" />\n</naicom>`,
      extra: { type: 'narrator', api: 'manual', model: 'slash command', sp_imagen_transport: true },
    };
    const temporaryIndex = chat.length;
    try {
      chat.push(temporary);
      current.addOneMessage(temporary);
      await current.eventSource.emit(current.event_types.CHARACTER_MESSAGE_RENDERED, temporaryIndex);
      if (context().chat !== chat || chat[temporaryIndex] !== temporary || chat[index] !== message) throw new Error('Чат изменился.');
      const src = String(temporary.mes || '').match(/<img\b[^>]*\bsrc=(['"])([^'"]+)\1/i)?.[2];
      if (!safeUrl(src)) throw new Error('Генератор не вернул готовое изображение.');
      await publish(index, kind, { src, config: item.config });
      if (chat.length !== temporaryIndex + 1 || chat[temporaryIndex] !== temporary) throw new Error('Чат изменился.');
      chat.pop();
      doc.querySelector(`#chat .mes[mesid="${temporaryIndex}"]`)?.remove();
      await current.saveChat();
    } finally {
      busy.delete(lock);
      paint();
    }
  }

  async function runAction(action) {
    try { await action(); }
    catch (error) { host.toastr?.error?.(String(error?.message || error), 'SP Imagen'); }
  }

  async function executeCommand(command, view, kind) {
    const current = context();
    if (view && host.__nessPostRequest) return;
    const request = view && { chat: current.chat, chatId: current.chatId, index: view.index, message: view.message, kind };
    if (request) host.__nessPostRequest = request;
    try {
      const extension = host.__spImagenExtension;
      if (!extension?.installed || typeof extension.run !== 'function') throw new Error('SP Imagen не загружен.');
      await runAction(() => extension.run(command, kind));
    } finally {
      if (request && host.__nessPostRequest === request) delete host.__nessPostRequest;
    }
  }

  function installMenuCommands(force = false) {
    const menu = doc.getElementById('extensionsMenu');
    if (!menu || !force && wand?.node.parentNode === menu) return;
    wand?.node.remove();
    wand = component('wand');
    const isNew = Boolean(host.__spImagenExtension?.hasNew);
    for (const [command, label] of [
      ['sp_ness_library_editor', '📚 SP Imagen · Библиотека'],
      ['sp_ness_settings', '⚙ SP Imagen · Настройки'],
      ['sp_ness_prompt_editor', `✎ SP Imagen · Промпты${isNew ? '  NEW!' : ''}`],
    ]) {
      const entry = element('button', 'option', label);
      entry.addEventListener('click', () => void executeCommand(command));
      wand.root.append(entry);
    }
    menu.append(wand.node);
  }

  function documentClick(event) {
    if (event.target.closest?.('#extensionsMenuButton')) installMenuCommands();
    if (!openMenu) return;
    const clicked = event.composedPath();
    if (!clicked.includes(openMenu.node) && !clicked.includes(openMenu.toggle)) closeToolsMenu();
  }

  function escapeMenu(event) {
    if (event.key === 'Escape' && openMenu) {
      event.preventDefault();
      event.stopPropagation();
      closeToolsMenu(true);
    }
  }

  function viewportChanged(event) {
    if (openMenu && event.target !== openMenu.node) closeToolsMenu();
  }

  function subscribe(name, handler) {
    const current = context();
    const event = current.event_types?.[name] || current.eventTypes?.[name];
    if (!event || !current.eventSource) return;
    current.eventSource.on(event, handler);
    subscriptions.push([current.eventSource, event, handler]);
  }

  installMenuCommands();
  subscribe('APP_READY', installMenuCommands);
  doc.addEventListener('click', documentClick, true);
  doc.addEventListener('keydown', escapeMenu, true);
  doc.addEventListener('scroll', viewportChanged, true);
  host.addEventListener('resize', viewportChanged);
  host.visualViewport?.addEventListener('resize', viewportChanged);
  host.visualViewport?.addEventListener('scroll', viewportChanged);
  const chatChanged = () => { closeToolsMenu(); migrateTail(); installMenuCommands(); paint(); };
  const messageChanged = () => paint();
  subscribe('CHAT_CHANGED', chatChanged);
  for (const name of ['CHARACTER_MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) {
    subscribe(name, messageChanged);
  }

  function dispose() {
    closeToolsMenu();
    doc.removeEventListener('click', documentClick, true);
    doc.removeEventListener('keydown', escapeMenu, true);
    doc.removeEventListener('scroll', viewportChanged, true);
    host.removeEventListener('resize', viewportChanged);
    host.visualViewport?.removeEventListener('resize', viewportChanged);
    host.visualViewport?.removeEventListener('scroll', viewportChanged);
    for (const [bus, event, handler] of subscriptions) {
      try { bus.removeListener?.(event, handler); } catch (_) {}
    }
    subscriptions.length = 0;
    for (const view of mounted.values()) unmountPost(view);
    mounted.clear();
    wand?.node.remove();
    if (host.__nessImageSlotsV4 === manager) delete host.__nessImageSlotsV4;
    if (host.__nessImageSlotsV3 === manager) delete host.__nessImageSlotsV3;
    delete host[CLEANUP_KEY];
  }

  const manager = {
    installed: true,
    version: 61,
    controlsRevision: 23,
    supportedKinds: KINDS,
    publish,
    focus,
    refresh: paint,
    refreshMenu: () => installMenuCommands(true),
    migrate: async () => migrateTail(),
    dispose,
  };
  host.__nessImageSlotsV4 = manager;
  host.__nessImageSlotsV3 = manager;
  host[CLEANUP_KEY] = dispose;
}
