// Generated from modules/media_slots.js.
import { withOperationDeadline } from './operation-timeout.js';
export async function installSpImagenMediaSlots(options) {
  'use strict';
  const { getExtension } = options || {};

  const host = window;
  if (!host?.SillyTavern?.getContext || !document.getElementById('chat')) {
    throw new Error('SP Imagen: контекст SillyTavern недоступен в текущем окне.');
  }
  const doc = document;
  const context = () => host.SillyTavern.getContext();
  const STORE = 'ness_media_slots_v2';
  const KINDS = Object.freeze(['snapshot', 'comic', 'story_page']);
  const LABEL = Object.freeze({ snapshot: 'Snapshot', comic: 'Comic', story_page: 'Story Page' });
  const LIMIT = 10;
  const CLEANUP_KEY = '__spImagenOwnedMediaSlotsCleanup';
  const mounted = new Map();
  const busy = new Set();
  const subscriptions = [];
  let openMenu = null;
  let promptPopup = null;
  let guideDemo = null;
  let wand = null;

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  try { host[CLEANUP_KEY]?.(); } catch (_) {}


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
    :host([data-ms="floating"]), :host([data-ms="prompt-preview"]) {
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
    :host([data-ms="prompt-preview"]) { --ms-panel: var(--SmartThemeBlurTintColor, #2c2734); color: var(--SmartThemeBodyColor, #f7edf7); inline-size: min(360px, var(--ms-max-width)); padding: 12px; }
    .prompt-title { font-weight: 700; margin: 0 0 8px; white-space: normal; }
    .prompt-text { display: block; white-space: pre-wrap; overflow-wrap: anywhere; max-block-size: min(40dvh, 320px);
      overflow: auto; font: 12px/1.5 ui-monospace, monospace; padding: 9px; border: 1px solid var(--ms-line);
      border-radius: 6px; background: color-mix(in srgb, var(--ms-panel) 65%, transparent); }
    .prompt-actions { display: flex; justify-content: flex-end; gap: 8px; margin-block-start: 9px; flex-wrap: wrap; }
    .prompt-actions button { border: 1px solid var(--ms-line); border-radius: 6px; padding: 7px 10px; }
    .prompt-inputs { display: grid; gap: 10px; margin-block-start: 10px; }
    .prompt-field { display: grid; gap: 5px; }
    .prompt-field label { font-weight: 600; white-space: normal; }
    .prompt-field small { opacity: .8; white-space: normal; }
    .prompt-field textarea, .prompt-field input {
      inline-size: 100%; min-inline-size: 0; border: 1px solid var(--ms-line); border-radius: 8px;
      padding: 9px; background: color-mix(in srgb, var(--ms-panel) 72%, transparent); color: inherit; font: inherit;
    }
    .prompt-field textarea { min-block-size: 120px; resize: vertical; }
    .prompt-field input { min-block-size: 38px; }
    .prompt-note { margin: 8px 0 0; white-space: normal; font-size: 12px; opacity: .85; }
    .guide-saved { border: 1px dashed var(--ms-line); border-radius: 7px; font-size: 16px; }
    .guide-result { margin-block: 8px; }
    .guide-result p { white-space: normal; margin: 6px 4px; }
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

  // All popovers use the same viewport-aware positioning and can flip above or to the sides.
  function positionPopup(node, anchor, options = {}) {
    const viewport = host.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const right = left + (viewport?.width ?? host.innerWidth);
    const bottom = top + (viewport?.height ?? host.innerHeight);
    const gap = 8;
    node.style.setProperty('--ms-max-width', Math.max(0, right - left - gap * 2) + 'px');
    node.style.setProperty('--ms-max-height', Math.max(0, bottom - top - gap * 2) + 'px');
    doc.body.append(node);
    const reference = anchor.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const placements = Array.isArray(options.prefer) && options.prefer.length ? options.prefer : ['bottom', 'top', 'right', 'left'];
    const candidates = {
      bottom: {
        x: clamp(reference.left, left + gap, right - rect.width - gap),
        y: reference.bottom + gap,
        fits: reference.bottom + gap + rect.height <= bottom - gap,
      },
      top: {
        x: clamp(reference.left, left + gap, right - rect.width - gap),
        y: reference.top - gap - rect.height,
        fits: reference.top - gap - rect.height >= top + gap,
      },
      right: {
        x: reference.right + gap,
        y: clamp(reference.top, top + gap, bottom - rect.height - gap),
        fits: reference.right + gap + rect.width <= right - gap,
      },
      left: {
        x: reference.left - gap - rect.width,
        y: clamp(reference.top, top + gap, bottom - rect.height - gap),
        fits: reference.left - gap - rect.width >= left + gap,
      },
    };
    let chosen = placements.map(key => candidates[key]).find(candidate => candidate?.fits) || candidates.bottom;
    let x = clamp(chosen.x, left + gap, right - rect.width - gap);
    let y = clamp(chosen.y, top + gap, bottom - rect.height - gap);
    node.style.setProperty('--ms-left', x + 'px');
    node.style.setProperty('--ms-top', y + 'px');
  }

  function closePromptPopup() {
    promptPopup?.node.remove();
    promptPopup = null;
  }

  function showPromptPopup(anchor, prompt, label) {
    closeToolsMenu();
    closePromptPopup();
    const { node, root } = component('prompt-preview');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-label', label);
    const title = element('div', 'prompt-title', label);
    const text = element('div', 'prompt-text', String(prompt || 'Промпт отсутствует.'));
    const actions = element('div', 'prompt-actions');
    const close = element('button', '', 'Закрыть');
    close.addEventListener('click', closePromptPopup);
    actions.append(close);
    root.append(title, text, actions);
    positionPopup(node, anchor, { prefer: ['top', 'bottom', 'right', 'left'] });
    promptPopup = { node, anchor, text };
    return text;
  }

  function showPromptEditor(anchor, index, kind, config, { previewOnly = false } = {}) {
    closeToolsMenu();
    closePromptPopup();
    const { node, root } = component('prompt-preview');
    const label = `Промпт и стиль · ${LABEL[kind]}`;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-label', label);
    const title = element('div', 'prompt-title', label);
    const inputs = element('div', 'prompt-inputs');

    const promptField = element('div', 'prompt-field');
    const promptLabel = element('label', '', 'Промпт картинки');
    const promptArea = doc.createElement('textarea');
    promptArea.value = String(config?.prompt || '');
    promptArea.spellcheck = false;
    const promptHelp = element('small', '', 'Можно поправить детали сцены, подписи и ошибки, не меняя общий глобальный профиль.');
    promptField.append(promptLabel, promptArea, promptHelp);

    const styleField = element('div', 'prompt-field');
    const styleLabel = element('label', '', 'Стиль только для этой перегенерации');
    const styleInput = doc.createElement('textarea');
    styleInput.value = String(config?.spImagenDirect?.style?.value || '');
    styleInput.spellcheck = false;
    styleInput.placeholder = 'Например: warm colors, soft lineart, watercolor textures';
    const styleHelp = element('small', '', 'Это поле не меняет общий активный стиль SP Imagen. Оно применяется только к этой картинке и её следующим перегенерациям.');
    styleField.append(styleLabel, styleInput, styleHelp);

    const note = element('p', 'prompt-note', previewOnly
      ? 'Учебный режим: можно попробовать изменить поля. Генерация не запускается, изменения не сохраняются.'
      : 'После удачной перегенерации новая версия сохранится в галерее этого поста и станет текущей для следующего редактирования.');
    inputs.append(promptField, styleField, note);

    const actions = element('div', 'prompt-actions');
    const close = element('button', '', 'Закрыть');
    const rerun = element('button', '', 'Перегенерировать');
    close.addEventListener('click', closePromptPopup);
    if (previewOnly) rerun.textContent = 'Перегенерировать (пример)';
    rerun.addEventListener('click', async () => {
      if (previewOnly || guideDemo) {
        note.textContent = 'В обычном режиме создаётся новая версия с исправленным промптом и стилем. Здесь это только пример, без запроса в NovelAI.';
        return;
      }
      rerun.disabled = true;
      close.disabled = true;
      try {
        const next = clone(config) || {};
        next.prompt = String(promptArea.value || '').trim();
        if (!next.prompt) throw new Error('Промпт не может быть пустым.');
        next.spImagenDirect ||= { version: 1, provider: 'novelai', settings: {} };
        next.spImagenDirect.style = {
          id: 'sp-imagen-inline-style',
          name: 'Разовый стиль',
          value: String(styleInput.value || '').trim(),
        };
        await regenerate(index, kind, next);
        closePromptPopup();
      } catch (error) {
        host.toastr?.error?.(String(error?.message || error), 'SP Imagen');
        rerun.disabled = false;
        close.disabled = false;
      }
    });
    actions.append(close, rerun);
    root.append(title, inputs, actions);
    positionPopup(node, anchor, { prefer: ['top', 'bottom', 'left', 'right'] });
    promptPopup = { node, anchor, text: promptArea };
    return promptArea;
  }

  function toggleToolsMenu(view) {
    const wasOpen = openMenu?.toggle === view.toggle;
    closeToolsMenu();
    closePromptPopup();
    if (wasOpen) return;
    if (guideDemo?.view === view && guideDemo.clearOnStar) {
      guideDemo.marker?.remove();
      guideDemo.marker = null;
      guideDemo.clearOnStar = false;
    }

    const { node, root } = component('floating');
    for (const kind of KINDS) {
      const option = element('button', 'option', LABEL[kind]);
      option.addEventListener('click', () => {
        closeToolsMenu(true);
        // Training uses the REAL profile menu but never runs a model or saves chat data.
        if (guideDemo?.view === view) {
          guideDemo.kind = kind;
          return;
        }
        if (context().chat?.[view.index] === view.message) {
          void executeCommand('sp_ness_generate_at', view, kind);
        }
      });
      root.append(option);
    }

    positionPopup(node, view.toggle, { prefer: ['top', 'bottom', 'right', 'left'] });
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
    const view = { node, root, anchor, index, message, tools, toggle, gallery, promptButton: null, cards: new Map() };
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
    const editorButton = galleryButton('📝', 'Открыть промпт и стиль этой картинки', () => showPromptEditor(
      editorButton, index, kind, guideDemo?.view?.index === index ? guideSampleConfig() : item.config,
      { previewOnly: guideDemo?.view?.index === index }
    ), locked || !item.config);
    editorButton.classList.add('prompt-edit');
    actions.append(
      editorButton,
      galleryButton(locked ? '⏳' : '↻', 'Повторить эту версию', () => regenerate(index, kind), locked || !item.config),
      galleryButton('↓', 'Скачать', () => saveSelected(index, kind)),
      galleryButton('🗑', 'Удалить из галереи', () => deleteSelected(index, kind), locked),
    );
    bar.append(navigation, actions);
    section.append(heading, frame, bar);
    return section;
  }

  function newestSavedPrompt(slots) {
    let latest = null;
    for (const kind of KINDS) {
      for (const version of slots?.[kind]?.versions || []) {
        if (typeof version.config?.prompt !== 'string' || !version.config.prompt.trim()) continue;
        if (!latest || Number(version.at || 0) > Number(latest.at || 0)) latest = { ...version, kind };
      }
    }
    return latest;
  }

  function updatePostPromptIcon(view, slots) {
    const saved = newestSavedPrompt(slots);
    if (!saved) {
      view.promptButton?.remove();
      view.promptButton = null;
      return;
    }
    if (!view.promptButton) {
      const button = element('button', 'tool prompt-saved', '▤');
      button.title = 'Открыть промпт последней сохранённой картинки';
      button.setAttribute('aria-label', button.title);
      button.addEventListener('click', () => {
        if (guideDemo?.view === view) return;
        const actual = newestSavedPrompt(slotsOf(context().chat?.[view.index]));
        if (actual) showPromptPopup(button, actual.config.prompt, `Промпт · ${LABEL[actual.kind]}`);
      });
      view.tools.append(button);
      view.promptButton = button;
    }
  }

  function updatePost(view, slots, chatId) {
    view.tools.hidden = !eligible(view.message);
    updatePostPromptIcon(view, slots);
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
    if (guideDemo?.view === view) endGuideDemo();
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

  // Guide UI is transient DOM only. No chat metadata, message extras, network calls or real generation.
  function guideSampleConfig() {
    return {
      prompt: '1girl, blue eyes, soft lighting, sitting at a table',
      aspect_ratio: '2:3',
      image_size: '1K',
      spImagenDirect: { style: { id: '', name: 'Учебный стиль', value: 'warm colors, soft lineart' } },
    };
  }

  function guideResult(view) {
    // Prefer the actual gallery only if its saved version can open the editor.
    // Older images may have no saved config; give the tour a safe demo instead.
    if (view.cards.size && view.gallery.querySelector('.prompt-edit:not(:disabled)')) return view.gallery;
    if (!guideDemo.result) {
      const example = element('div', 'card guide-result');
      example.append(element('div', 'heading', 'Готовая картинка — учебный пример'));
      example.append(element('p', '', 'Здесь появится изображение после генерации.'));
      const actions = element('div', 'actions');
      const edit = element('button', 'tool prompt-edit', '📝');
      edit.title = 'Изменить промпт и стиль этой картинки';
      edit.setAttribute('aria-label', edit.title);
      edit.addEventListener('click', () => showPromptEditor(edit, view.index,
        guideDemo?.kind || 'snapshot', guideSampleConfig(), { previewOnly: true }));
      actions.append(edit, element('span', '', '←  1 / 1  →      ↻   ↓   🗑'));
      example.append(actions);
      view.root.append(example);
      guideDemo.result = example;
    }
    return guideDemo.result;
  }

  function endGuideDemo() {
    if (!guideDemo) return;
    const demo = guideDemo;
    guideDemo = null;
    closeToolsMenu();
    closePromptPopup();
    demo.marker?.remove();
    demo.result?.remove();
    if (demo.view?.promptButton) demo.view.promptButton.hidden = false;
    if (demo.extraMount && mounted.get(demo.view.index) === demo.view) {
      unmountPost(demo.view);
      mounted.delete(demo.view.index);
    }
  }

  function currentGuideView() {
    if (guideDemo && context().chat === guideDemo.chat && context().chatId === guideDemo.chatId
       && guideDemo.view.node.isConnected && context().chat?.[guideDemo.view.index] === guideDemo.view.message) {
      return guideDemo.view;
    }
    endGuideDemo();
    paint();
    let view = [...mounted.values()].reverse().find(candidate => eligible(candidate.message) && !candidate.tools.hidden);
    let extraMount = false;
    if (!view) {
      // A long conversation may have its newest visible RP message outside the usual ten-post gallery window.
      const current = context(), chatElement = doc.getElementById('chat');
      for (let index = (current.chat?.length || 0) - 1; index >= 0; index--) {
        const message = current.chat[index];
        if (!eligible(message)) continue;
        const anchor = chatElement?.querySelector(`.mes[mesid="${index}"] .mes_text`);
        if (!anchor) continue;
        view = mountPost(anchor, index, message);
        mounted.set(index, view);
        updatePost(view, slotsOf(message), current.chatId);
        extraMount = true;
        break;
      }
    }
    if (!view) return null;
    guideDemo = { view, chat: context().chat, chatId: context().chatId, marker: null,
      result: null, kind: 'snapshot', clearOnStar: false, extraMount };
    if (view.promptButton) view.promptButton.hidden = true;
    return view;
  }

  function guideStep(section) {
    const view = currentGuideView();
    if (!view) return null;
    if (section === 'post-star') {
      closeToolsMenu(); closePromptPopup();
      view.toggle.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      return view.toggle;
    }
    if (section === 'post-formats') {
      if (openMenu?.toggle !== view.toggle) toggleToolsMenu(view);
      return openMenu?.node.shadowRoot?.querySelector('.option') ?? null;
    }
    if (section === 'post-saved' || section === 'post-view') {
      if (!guideDemo.marker) {
        const marker = element('button', 'tool guide-saved', '▤');
        marker.title = 'Учебный значок сохранённого промпта';
        marker.setAttribute('aria-label', marker.title);
        marker.addEventListener('click', () => showPromptPopup(marker,
          'Учебный пример (не отправляется в NovelAI):\n\n1girl, blue eyes, soft lighting, sitting at a table',
          `Учебный промпт · ${LABEL[guideDemo?.kind || 'snapshot']}`));
        view.tools.append(marker);
        guideDemo.marker = marker;
      }
      if (section === 'post-view') return promptPopup?.text
        || showPromptPopup(guideDemo.marker, 'Учебный пример: 1girl, blue eyes, soft lighting', 'Учебный промпт');
      closePromptPopup();
      return guideDemo.marker;
    }
    if (section === 'post-replace') {
      closePromptPopup(); closeToolsMenu();
      guideDemo.clearOnStar = true;
      return view.toggle;
    }
    if (section === 'post-cleared') {
      return openMenu?.node.shadowRoot?.querySelector('.option') ?? view.toggle;
    }
    if (section === 'post-result') {
      closeToolsMenu(); closePromptPopup();
      const result = guideResult(view);
      result.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
      return result;
    }
    if (section === 'post-edit') {
      closeToolsMenu(); closePromptPopup();
      const result = guideResult(view);
      const button = result.querySelector('.prompt-edit:not(:disabled)');
      button?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      return button;
    }
    if (section === 'post-editor') {
      return promptPopup?.node ?? null;
    }
    return view.toggle;
  }

  async function publish(index, kind, item) {
    if (!KINDS.includes(kind) || !safeUrl(item?.src)) throw new Error('Неверный слот или адрес изображения.');
    const current = context();
    const originalChat = current.chat, originalId = current.chatId;
    const message = originalChat?.[index];
    if (!message || !eligible(message)) throw new Error('Целевой RP-пост не найден.');
    const extension = getExtension?.();
    // File saving is outside the text/image API deadlines. Give it a bounded
    // wait too, so a disconnected backend cannot indefinitely hold the lock.
    const storedSrc = typeof extension?.persistImageSource === 'function'
      ? await withOperationDeadline(
          () => extension.persistImageSource(item.src),
          60000,
          'Сохранение файла изображения не подтвердилось за 60 секунд. Проверь соединение и попробуй снова.',
          { code: 'SP_IMAGEN_FILE_TIMEOUT' }
        )
      : item.src;
    if (!safeUrl(storedSrc)) throw new Error('SP Imagen не смог сохранить файл изображения.');
    if (context().chat !== originalChat || context().chatId !== originalId || originalChat[index] !== message) {
      throw new Error('Чат изменился до сохранения картинки.');
    }
    const hadExtra = Boolean(message.extra);
    const previous = hadExtra && Object.hasOwn(message.extra, STORE)
      ? JSON.parse(JSON.stringify(message.extra[STORE])) : undefined;
    const storedItem = { ...item, src: storedSrc };
    try {
      migrateMessage(message);
      const slots = slotsOf(message, true);
      addVersion(slots[kind], storedItem);
      paint();
      // A chat-save timeout is NOT proof of failure: the host's save promise
      // might still finish. Keep the image attached rather than rolling back
      // a potentially successful save or silently losing the generated file.
      try {
        await withOperationDeadline(
          () => current.saveChat(),
          45000,
          'SillyTavern не подтвердил сохранение чата за 45 секунд.',
          { code: 'SP_IMAGEN_CHAT_SAVE_TIMEOUT' }
        );
      } catch (error) {
        if (error?.code === 'SP_IMAGEN_CHAT_SAVE_TIMEOUT') {
          paint();
          return { ...storedItem, savePending: true };
        }
        throw error;
      }
      if (context().chat !== originalChat || context().chatId !== originalId || originalChat[index] !== message) {
        throw new Error('Чат изменился во время сохранения галереи.');
      }
      paint();
      return storedItem;
    } catch (error) {
      // Confirmed save failures restore the previous state. Timeouts are
      // handled above because their final outcome is unknown.
      if (message.extra) {
        if (previous === undefined) delete message.extra[STORE];
        else message.extra[STORE] = previous;
        if (!hadExtra && !Object.keys(message.extra).length) delete message.extra;
      }
      paint();
      throw error;
    }
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

  async function regenerate(index, kind, overrideConfig = null) {
    const current = context();
    const chat = current.chat;
    const message = chat?.[index];
    const slot = slotsOf(message, false)?.[kind];
    const item = slot?.versions?.[slot.selected];
    const config = clone(overrideConfig || item?.config);
    if (!config) throw new Error('У этой версии не сохранён промпт.');
    const extension = getExtension?.();
    if (!extension?.directGenerationEnabled?.() || typeof extension.generateImage !== 'function') {
      throw new Error('Для повторной генерации включи SP Imagen → NovelAI и укажи API-токен.');
    }
    const lock = `${current.chatId}|${index}|${kind}`;
    if (busy.has(lock)) return;
    busy.add(lock);
    paint();
    try {
      // The viewer always shows the most recent request, including a regeneration.
      if (typeof config.prompt === 'string' && config.prompt.trim()) {
        current.chatMetadata.variables ||= {};
        current.chatMetadata.variables.sp_imagen_last_final_image_prompt = config.prompt;
        await current.saveMetadata?.();
      }
      const generated = await extension.generateImage(config, { reuseSnapshot: true });
      if (context().chat !== chat || context().chatId !== current.chatId || chat[index] !== message) {
        throw new Error('Чат изменился во время повторной генерации.');
      }
      await publish(index, kind, generated);
    } finally {
      busy.delete(lock);
      paint();
    }
  }

  async function runAction(action) {
    try { await action(); }
    catch (error) { host.toastr?.error?.(String(error?.message || error), 'SP Imagen'); }
  }

  // Only one image request may start from this chat at a time. Navigation,
  // help, and settings remain usable while the image request is running.
  const pendingGenerationClicks = new WeakSet();
  async function executeCommand(command, view, kind) {
    const current = context();
    const request = view && { chat: current.chat, chatId: current.chatId, index: view.index, message: view.message, kind };
    if (request && current.chat[request.index] !== request.message) return;
    if (command === 'sp_ness_generate_at' && typeof guideDemo !== 'undefined' && guideDemo) return;
    const extension = getExtension?.();
    if (!extension?.installed || typeof extension.run !== 'function') {
      host.toastr?.error?.('SP Imagen не загружен.', 'SP Imagen');
      return;
    }
    const generationChat = command === 'sp_ness_generate_at' ? current.chat : null;
    if (generationChat && pendingGenerationClicks.has(generationChat)) return;
    if (generationChat) pendingGenerationClicks.add(generationChat);
    try { await runAction(() => extension.run(command, kind, request)); }
    finally { if (generationChat) pendingGenerationClicks.delete(generationChat); }
  }

  function installMenuCommands(force = false) {
    const menu = doc.getElementById('extensionsMenu');
    if (!menu || !force && wand?.node.parentNode === menu) return;
    wand?.node.remove();
    wand = component('wand');
    const isNew = Boolean(getExtension?.()?.hasNew);
    for (const [command, label] of [
      ['sp_imagen_menu', `✧ SP Imagen${isNew ? '  NEW!' : ''}`],
    ]) {
      const entry = element('button', 'option', label);
      entry.addEventListener('click', () => void executeCommand(command));
      wand.root.append(entry);
    }
    menu.append(wand.node);
  }

  function documentClick(event) {
    if (event.target.closest?.('#extensionsMenuButton')) installMenuCommands();
    const clicked = event.composedPath();
    if (openMenu && !clicked.includes(openMenu.node) && !clicked.includes(openMenu.toggle)) closeToolsMenu();
    if (promptPopup && !clicked.includes(promptPopup.node) && !clicked.includes(promptPopup.anchor)) closePromptPopup();
  }

  function escapeMenu(event) {
    if (event.key === 'Escape' && (openMenu || promptPopup)) {
      event.preventDefault();
      event.stopPropagation();
      closeToolsMenu(true);
      closePromptPopup();
    }
  }

  function viewportChanged(event) {
    if (openMenu && event.target !== openMenu.node) closeToolsMenu();
    if (promptPopup && event.target !== promptPopup.node) closePromptPopup();
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
  const chatChanged = () => { endGuideDemo(); closeToolsMenu(); closePromptPopup(); migrateTail(); installMenuCommands(); paint(); };
  const messageChanged = () => paint();
  subscribe('CHAT_CHANGED', chatChanged);
  for (const name of ['CHARACTER_MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) {
    subscribe(name, messageChanged);
  }

  function dispose() {
    endGuideDemo();
    closeToolsMenu();
    closePromptPopup();
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
    delete host[CLEANUP_KEY];
  }

  const manager = {
    installed: true,
    version: 62,
    controlsRevision: 24,
    guideStep,
    endGuideDemo,
    supportedKinds: KINDS,
    publish,
    focus,
    refresh: paint,
    refreshMenu: () => installMenuCommands(true),
    migrate: async () => migrateTail(),
    dispose,
  };
  host[CLEANUP_KEY] = dispose;
  migrateTail();
  paint();
  return manager;
}
