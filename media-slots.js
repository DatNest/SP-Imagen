// Generated from modules/media_slots.js.
import { withOperationDeadline } from './operation-timeout.js';
import { readPostDraft, discardPostDraft } from './post-drafts.js';
import { collectPostPrompts } from './post-prompt-state.js';
import { openExplanation } from './onboarding.js';
import { getRequestHeaders } from '../../../../script.js';
import { spImagenOwnedImagePath, isReferencedInCurrentChat, deleteSpImagenOwnedFile } from './gallery-file-cleanup.js';
import { isLocalGalleryImage } from './security-network.js';
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
  const KINDS = Object.freeze(['snapshot','comic','story_page']); // Permanent built-in slots.
  const LABEL = new Proxy({snapshot:'Snapshot',comic:'Comic',story_page:'Story Page'},{
    get: (base,kind)=> typeof kind==='string'
      ? (getExtension?.()?.getGenerationProfileLabel?.(kind)||base[kind]||kind)
      : base[kind],
  });
  const validCustomId=id=>/^custom_[a-z0-9_-]{3,75}$/i.test(String(id||''));
  const generationProfiles=()=>getExtension?.()?.getGenerationProfiles?.()||KINDS.map(k=>({id:k,name:LABEL[k],visible:true}));
  const availableKinds=slots=>[...new Set([...KINDS,...generationProfiles().map(x=>x.id).filter(validCustomId),...Object.keys(slots||{}).filter(validCustomId)])];
  const validKind=id=>KINDS.includes(id)||generationProfiles().some(x=>x.id===id&&validCustomId(id));
  const LIMIT = 10;
  const CLEANUP_KEY = '__spImagenOwnedMediaSlotsCleanup';
  const mounted = new Map();
  const busy = new Set();
  const subscriptions = [];
  let openMenu = null;
  let promptPopup = null;
  let imageViewer = null;
  let guideDemo = null;
  let wand = null;

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  try { host[CLEANUP_KEY]?.(); } catch (_) {}


  const safeUrl = value => isLocalGalleryImage(value, host.location?.origin)
    && !/\[IMG:|\/error\.svg(?:\?|$)/i.test(value);
  // Preserve historical image references without making background network requests.
  // Old remote URLs must remain in chat data, but are NEVER assigned to an <img src>.
  const storedSource = value => typeof value === 'string' && value.length > 0 && value.length <= 55 * 1024 * 1024;
  const remoteImage = value => typeof value === 'string' && /^https?:\/\//i.test(value)
    && !safeUrl(value) && value.length < 8192;
  const openLegacyRemote = value => {
    if (!remoteImage(value)) return;
    if (!host.confirm('Это изображение хранится на внешнем сайте. Открытие передаст сайту твой IP-адрес и сведения браузера.\n\nОткрыть ссылку вручную?')) return;
    host.open(value, '_blank', 'noopener,noreferrer');
  };

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
      // Do not allocate empty custom slots for every RP post. Create a custom
      // slot only when that profile actually publishes an image.
      for (const kind of KINDS) {
        if (!slots[kind] || !Array.isArray(slots[kind].versions)) slots[kind] = { versions: [], selected: 0, collapsed: true };
      }
    }
    for (const kind of availableKinds(slots)) {
      const slot = slots[kind];
      if (!slot || !Array.isArray(slot.versions)) continue;
      // Never discard imported external versions: hiding a remote preview is
      // not permission to delete historical data from a user's saved chat.
      slot.selected = Math.max(0, Math.min(Math.trunc(Number(slot.selected)) || 0, Math.max(0, slot.versions.length - 1)));
      slot.collapsed = slot.collapsed !== false;
    }
    return slots;
  }

  function addVersion(slot, item) {
    if (!slot || !storedSource(item?.src) || slot.versions.some(version => version.src === item.src)) return false;
    slot.versions.push({ src: item.src, config: item.config || null, at: Number(item.at) || Date.now() });
    slot.selected = slot.versions.length - 1;
    slot.collapsed = false; // Show a newly generated image until the reader folds it.
    return true;
  }

  function migrateMessage(message) {
    const legacy = Array.isArray(message?.extra?.sp_imagen_embeds) ? message.extra.sp_imagen_embeds : [];
    const existing = slotsOf(message, false);
    if (!legacy.length && !existing) return false;
    const slots = slotsOf(message, true);
    let changed = false;
    for (const item of legacy) {
      if (!KINDS.includes(item?.kind) || !storedSource(item?.src)) continue;
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
      inline-size: min(15em, var(--ms-max-width));
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
    .prompt-source-select { display:block;inline-size:100%;min-block-size:38px;margin-block:8px;padding:6px 8px;border:1px solid var(--ms-line);border-radius:8px;background:var(--ms-panel);color:inherit;font:inherit; }
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
    :host([data-ms="editor-modal"]) {
      position: fixed !important;
      inset: var(--ms-editor-top, 0px) auto auto var(--ms-editor-left, 0px) !important;
      z-index: 2147482000 !important;
      inline-size: var(--ms-editor-width, 100vw) !important;
      block-size: var(--ms-editor-height, 100dvh) !important;
      min-inline-size: 0; max-inline-size: none;
      display: grid !important; place-items: center;
      padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
        max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
      background: rgba(10, 9, 16, .56); overflow: hidden;
    }
    .editor-window {
      position: relative; display: flex; flex-direction: column;
      inline-size: min(650px, 100%); min-inline-size: 0; max-block-size: 100%;
      overflow: hidden; color: var(--SmartThemeBodyColor, #f6eff7);
      background: var(--SmartThemeBlurTintColor, #282530);
      border: 1px solid var(--ms-line); border-radius: 14px;
      box-shadow: 0 16px 45px rgba(0, 0, 0, .32);
    }
    .editor-window .prompt-field textarea, .editor-window .prompt-field input,
    .editor-style-save-card input {
      color: var(--SmartThemeBodyColor, #f6eff7);
      background: color-mix(in srgb, var(--SmartThemeBlurTintColor, #282530) 90%, var(--SmartThemeBodyColor, #f6eff7) 10%);
      border: 1px solid var(--ms-line);
    }
    .editor-head, .editor-footer { display: flex; align-items: center; gap: 12px; padding: 12px 15px; flex: 0 0 auto; }
    .editor-head { justify-content: space-between; border-block-end: 1px solid var(--ms-line); }
    .editor-head strong { white-space: normal; }
    .editor-head .close-x { margin-inline-start: auto; inline-size: 36px; block-size: 36px;
      display: grid; place-items: center; border-radius: 7px; font-size: 24px; }
    .editor-head .close-x:hover, .editor-footer button:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
    .editor-body { min-block-size: 0; overflow: auto; overscroll-behavior: contain;
      padding: 14px 16px; scrollbar-width: thin; }
    .editor-footer { justify-content: flex-end; flex-wrap: wrap; border-block-start: 1px solid var(--ms-line); }
    .editor-footer button, .editor-save-style, .editor-style-save-panel button {
      padding: 9px 13px; min-block-size: 38px; border: 1px solid var(--ms-line);
      border-radius: 8px; background: color-mix(in srgb, currentColor 7%, transparent);
    }
    .editor-footer .editor-primary, .editor-style-save-panel .editor-primary {
      background: color-mix(in srgb, var(--SmartThemeQuoteColor, #b49ccc) 34%, transparent);
      font-weight: 600;
    }
    .editor-style-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .editor-style-row select { min-block-size: 40px; inline-size: 100%;
      color: inherit; background: var(--SmartThemeBlurTintColor, #282530);
      border: 1px solid var(--ms-line); border-radius: 7px; padding: 7px; }
    .editor-save-style { inline-size: 100%; text-align: center; }
    .editor-style-save-panel {
      position: absolute; z-index: 2; inset: 0; background: var(--SmartThemeBlurTintColor, #282530);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .editor-style-save-panel[hidden] { display: none !important; }
    .editor-style-save-card { display: grid; gap: 12px; inline-size: min(380px, 100%); }
    .editor-style-save-card h3 { margin: 0; font-size: 1rem; }
    .editor-style-save-card label { display: grid; gap: 6px; }
    .editor-style-save-card input { inline-size: 100%; min-block-size: 40px; padding: 8px;
      border: 1px solid var(--ms-line); border-radius: 7px; color: inherit;
      background: color-mix(in srgb, var(--ms-panel) 75%, transparent); }
    .editor-style-save-card .prompt-actions { margin-block-start: 0; }
    @media (max-width: 480px) {
      .editor-head, .editor-footer { padding: 9px 11px; }
      .editor-body { padding: 10px 12px; }
      .editor-footer button { flex: 1 1 auto; text-align: center; }
      .prompt-field textarea { min-block-size: 96px; }
    }
    .guide-saved { border: 1px dashed var(--ms-line); border-radius: 7px; font-size: 16px; }
    .guide-result { margin-block: 8px; }
    .guide-result p { white-space: normal; margin: 6px 4px; }
    :host([data-ms="image-viewer"]) {
      position: fixed !important; inset: 0 !important;
      inline-size: 100vw !important; block-size: 100dvh !important;
      z-index: 2147482600 !important; background: transparent !important;
      overflow: hidden !important;
    }
    .image-viewer-backdrop {
      display: grid; place-items: center; position: absolute; inset: 0;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
        max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      background: rgba(12, 9, 13, .88);
      cursor: zoom-out;
    }
    .image-viewer-stage {
      position: relative; display: grid; place-items: center;
      inline-size: fit-content; max-inline-size: 100%; max-block-size: 100%;
      min-inline-size: 0; min-block-size: 0;
      cursor: default;
    }
    .image-viewer-stage .image-viewer-image {
      display: block; inline-size: auto; block-size: auto;
      max-inline-size: min(96vw, 1400px); max-block-size: calc(100dvh - 48px);
      object-fit: contain; border-radius: 6px;
      box-shadow: 0 12px 45px rgba(0,0,0,.35);
    }
    .image-viewer-close {
      position: absolute; top: 7px; right: 7px; z-index: 1;
      display: grid; place-items: center; inline-size: 42px; block-size: 42px;
      border-radius: 12px; border: 1px solid rgba(255,255,255,.6);
      background: rgba(18,14,18,.75); color: #fff; font-size: 27px;
      text-align: center;
    }
    .image-viewer-close:hover { background: rgba(18,14,18,.95); }
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
    .menu-empty {font-size:12px;line-height:1.45;opacity:.85;padding:8px;}
    .option-row {display:flex;align-items:center;min-inline-size:0;gap:.25em;}
    .option-row>.option {flex:1 1 auto;min-inline-size:0;}
    .experimental-row {display:flex;align-items:center;gap:5px;min-inline-size:0;margin:3px 3px 6px;}
    .experimental-toggle {display:flex;flex:1;align-items:center;justify-content:space-between;gap:12px;min-block-size:45px;min-inline-size:0;padding:9px 10px;border:1px solid var(--ms-line);border-radius:9px;cursor:pointer;white-space:normal;}
    .menu-help {flex:none;display:inline-grid;place-items:center;inline-size:30px;block-size:30px;padding:0;border:1px solid var(--ms-line);border-radius:50%;color:inherit;background:transparent;font-weight:700;cursor:pointer;}
    .menu-help:hover,.menu-help:focus-visible {background:var(--ms-panel);outline-offset:2px;}
    .experimental-toggle-text {display:grid;gap:2px;min-inline-size:0;}
    .experimental-toggle-text strong {font-size:13px;font-weight:750;}
    .experimental-toggle-text small {font-size:11px;opacity:.8;white-space:normal;}
    .experimental-toggle input {inline-size:18px;block-size:18px;flex:none;accent-color:var(--SmartThemeQuoteColor, #b49ccc);}
    .experimental-heading {padding:9px 9px 3px;font-size:11px;opacity:.85;font-weight:700;letter-spacing:.03em;}
    .experimental-profile {border-inline-start:3px solid var(--SmartThemeQuoteColor, #b49ccc);padding-inline-start:10px;}
    .text-mode-toggle {display:inline-flex;align-items:center;gap:5px;min-block-size:44px;
      padding:4px 7px;flex:none;white-space:nowrap;font-size:11px;cursor:pointer;
      border-radius:7px;border:1px solid var(--ms-line);user-select:none;}
    .text-mode-toggle input {position:absolute;inline-size:1px;block-size:1px;opacity:0;}
    .text-mode-toggle .text-track {inline-size:25px;block-size:15px;flex:none;position:relative;
      border-radius:99px;border:1px solid currentColor;opacity:.75;}
    .text-mode-toggle .text-track::after {content:'';position:absolute;inset-block-start:2px;inset-inline-start:2px;
      inline-size:9px;block-size:9px;border-radius:50%;background:currentColor;transition:transform 110ms ease;}
    .text-mode-toggle input:checked+.text-track::after {transform:translateX(10px);}
    .text-mode-toggle:focus-within {outline:2px solid currentColor;outline-offset:-2px;}
    @media (prefers-reduced-motion: reduce) {.text-mode-toggle .text-track::after {transition:none;}}
    .option {
      display: block;
      inline-size: 100%;
      min-block-size: 36px;
      padding: .45em .65em;
      text-align: start;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    @media (hover: hover) {
      .generate:hover { opacity: 1; }
      .tool:not(:disabled):hover, .option:hover {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }
    }
    .gallery { display: grid; gap: .4em; margin-block: .25em .65em; }
    .card[data-collapsed="true"] { padding-block: .18em; }
    .heading { display:flex; width:100%; justify-content:space-between; align-items:center; gap:.6em; border-radius:.35em; padding:.35em .45em; font-weight:600; }
    .heading-meta { display:flex; gap:.65em; align-items:center; font-size:.9em; opacity:.85; }
    .heading-chevron { min-inline-size:1.1em; text-align:center; }
    .frame[hidden], .bar[hidden], .draft-status[hidden], .draft-icon[hidden] { display:none !important; }
    .card {
      min-inline-size: 0;
      padding: .45em;
      border: 1px solid var(--ms-line);
      border-radius: .65em;
      background: color-mix(in srgb, var(--ms-panel) 35%, transparent);
      font-size: .9em;
    }
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

  function closeImageViewer() {
    const previous=imageViewer;
    imageViewer=null;
    previous?.node.remove();
    if(previous?.anchor?.isConnected)previous.anchor.focus({preventScroll:true});
  }
  function showImageViewer(anchor,src,label) {
    if(!safeUrl(src))return;
    closeToolsMenu();
    closeImageViewer();
    const {node,root}=component('image-viewer');
    node.setAttribute('role','dialog');
    node.setAttribute('aria-modal','true');
    node.setAttribute('aria-label','Просмотр изображения · '+label);
    const backdrop=element('div','image-viewer-backdrop');
    const stage=element('div','image-viewer-stage');
    const image=element('img','image-viewer-image');
    image.src=src;image.alt=label;
    const close=element('button','image-viewer-close','×');
    close.title='Закрыть просмотр';close.setAttribute('aria-label','Закрыть просмотр изображения');
    close.addEventListener('click',closeImageViewer);
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeImageViewer();});
    stage.append(image,close);backdrop.append(stage);root.append(backdrop);
    doc.body.append(node);imageViewer={node,anchor};
    close.focus({preventScroll:true});
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
    const previous = promptPopup;
    previous?.node.remove();
    promptPopup = null;
    if (previous?.type === 'editor' && previous.anchor?.isConnected) {
      previous.anchor.focus({preventScroll:true});
    }
  }

  function requestClosePromptPopup() {
    if (promptPopup?.type === 'editor') {
      if (promptPopup.closeStyleNaming?.()) return false;
      if (promptPopup.isDirty?.() && !host.confirm('Промпт или стиль изменены. Отменить правки и закрыть окно?')) return false;
    }
    closePromptPopup();
    return true;
  }

  function positionEditorModal(node) {
    const vp = host.visualViewport;
    node.style.setProperty('--ms-editor-left', `${vp?.offsetLeft ?? 0}px`);
    node.style.setProperty('--ms-editor-top', `${vp?.offsetTop ?? 0}px`);
    node.style.setProperty('--ms-editor-width', `${vp?.width ?? host.innerWidth}px`);
    node.style.setProperty('--ms-editor-height', `${vp?.height ?? host.innerHeight}px`);
    if (!node.isConnected) doc.body.append(node);
  }

  function showPromptPopup(anchor, prompt, label, sources = null) {
    closeToolsMenu();
    if (!requestClosePromptPopup()) return null;
    const { node, root } = component('prompt-preview');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-label', label);
    const title = element('div', 'prompt-title', label);
    const text = element('div', 'prompt-text', String(prompt || 'Промпт отсутствует.'));
    const actions = element('div', 'prompt-actions');
    const close = element('button', '', 'Закрыть');
    close.addEventListener('click', () => requestClosePromptPopup());
    actions.append(close);
    if(Array.isArray(sources)&&sources.length){
      const picker=element('select','prompt-source-select');
      picker.setAttribute('aria-label','Выбрать этап сохранённого промпта');
      for(const item of sources){
        const option=element('option','',item.label);option.value=item.id;picker.append(option);
      }
      picker.value=sources.find(item=>item.id==='final')?.id||sources[0].id;
      const selected=sources.find(item=>item.id===picker.value);
      text.textContent=selected?.text||'Промпт отсутствует.';
      picker.addEventListener('change',()=>{
       const current=sources.find(item=>item.id===picker.value);
       text.textContent=current?.text||'Промпт отсутствует.';
      });
      root.append(title,picker,text,actions);
    }else root.append(title,text,actions);
    positionPopup(node, anchor);
    promptPopup = { node, anchor, text, type: 'preview' };
    return text;
  }

  function showPromptEditor(anchor, index, kind, config, { previewOnly = false } = {}) {
    closeToolsMenu();
    if (!requestClosePromptPopup()) return null;
    const { node, root } = component('editor-modal');
    const label = `Промпт и стиль · ${LABEL[kind]}`;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', label);

    const windowPanel = element('section', 'editor-window');
    const head = element('div', 'editor-head');
    const heading = element('strong', '', label);
    const closeX = element('button', 'close-x', '×');
    closeX.title = 'Закрыть';
    closeX.setAttribute('aria-label', 'Закрыть редактор');
    closeX.addEventListener('click', () => requestClosePromptPopup());
    head.append(heading, closeX);
    const body = element('div', 'editor-body');
    const inputs = element('div', 'prompt-inputs');

    const promptField = element('div', 'prompt-field');
    const promptLabel = element('label', '', 'Промпт картинки');
    const promptArea = doc.createElement('textarea');
    promptArea.value = String(config?.prompt || '');
    promptArea.maxLength = 45000;
    promptArea.spellcheck = false;
    const promptHelp = element('small', '', 'Исправляй детали сцены и текст. Для перегенерации не нужно заново обращаться к режиссёру.');
    promptField.append(promptLabel, promptArea, promptHelp);

    const extension = getExtension?.();
    const styles = () => extension?.listImageStyles?.() || [];
    const initialStyle = clone(config?.spImagenDirect?.style || {id:'', name:'Без стиля', value:''});
    let chosenStyle = clone(initialStyle);
    const styleField = element('div', 'prompt-field');
    const styleLabel = element('label', '', 'Стиль только для этой картинки');
    const styleChoices = element('div', 'editor-style-row');
    const styleSelect = doc.createElement('select');
    styleSelect.setAttribute('aria-label', 'Выбрать стиль из сохранённых');
    const styleInput = doc.createElement('textarea');
    styleInput.value = String(initialStyle.value || '');
    styleInput.maxLength = 20000;
    styleInput.spellcheck = false;
    styleInput.placeholder = 'Например: warm colors, soft lineart, watercolor textures';
    const styleHelp = element('small', '', 'Можно выбрать сохранённый стиль или вписать новый. Общий активный стиль не изменится.');
    const saveStyle = element('button', 'editor-save-style', '+ Добавить этот стиль в мои стили');
    saveStyle.disabled = previewOnly;

    function refreshStyles(selected = 'current') {
      styleSelect.replaceChildren();
      const addOption = (key, text) => {
        const option = doc.createElement('option'); option.value = key; option.textContent = text;
        styleSelect.append(option);
      };
      addOption('current', 'Стиль этой картинки');
      addOption('none', 'Без стиля');
      addOption('manual', 'Свой текст');
      for (const style of styles()) addOption(`saved:${style.id}`, style.name);
      styleSelect.value = selected;
      if (styleSelect.selectedIndex < 0) styleSelect.value = 'manual';
    }
    refreshStyles();
    styleSelect.addEventListener('change', () => {
      if (styleSelect.value === 'current') chosenStyle = clone(initialStyle);
      else if (styleSelect.value === 'none') chosenStyle = {id:'', name:'Без стиля', value:''};
      else if (styleSelect.value.startsWith('saved:')) {
        chosenStyle = clone(styles().find(style => `saved:${style.id}` === styleSelect.value) || {id:'',name:'Без стиля',value:''});
      } else return;
      styleInput.value = chosenStyle.value;
    });
    styleInput.addEventListener('input', () => {
      chosenStyle = {id:'', name:'Свой стиль', value:styleInput.value};
      styleSelect.value = 'manual';
    });
    styleChoices.append(styleSelect);
    styleField.append(styleLabel, styleChoices, styleInput, styleHelp, saveStyle);

    const note = element('p', 'prompt-note', previewOnly
      ? 'Учебный режим: изменение полей не отправляет запрос в NovelAI и не сохраняется.'
      : 'После перегенерации новая версия появится в галерее поста, сохранив обновлённые промпт и стиль.');
    inputs.append(promptField, styleField, note);
    body.append(inputs);

    const foot = element('div', 'editor-footer');
    const cancel = element('button', '', 'Отмена');
    const rerun = element('button', 'editor-primary', previewOnly ? 'Перегенерировать (пример)' : 'Перегенерировать');
    cancel.addEventListener('click', () => requestClosePromptPopup());
    foot.append(cancel, rerun);
    windowPanel.append(head, body, foot);

    const styleSaveLayer = element('div', 'editor-style-save-panel');
    styleSaveLayer.hidden = true;
    const styleSaveCard = element('section', 'editor-style-save-card');
    const styleSaveTitle = element('h3', '', 'Сохранить стиль в список');
    const nameLabel = element('label', '', 'Название нового стиля');
    const styleName = doc.createElement('input');
    styleName.type = 'text'; styleName.maxLength = 90;
    styleName.placeholder = 'Например: Тёплая акварель';
    nameLabel.append(styleName);
    const styleSaveActions = element('div', 'prompt-actions');
    const styleSaveCancel = element('button', '', 'Отмена');
    const styleSaveConfirm = element('button', 'editor-primary', 'Сохранить стиль');
    styleSaveActions.append(styleSaveCancel, styleSaveConfirm);
    styleSaveCard.append(styleSaveTitle, nameLabel, styleSaveActions);
    styleSaveLayer.append(styleSaveCard);
    windowPanel.append(styleSaveLayer);
    root.append(windowPanel);

    const closeStyleNaming = () => {
      if (styleSaveLayer.hidden) return false;
      styleSaveLayer.hidden = true;
      saveStyle.focus({preventScroll:true});
      return true;
    };
    styleSaveCancel.addEventListener('click', closeStyleNaming);
    saveStyle.addEventListener('click', () => {
      if (!styleInput.value.trim()) {
        host.toastr?.warning?.('Сначала введи текст стиля.', 'SP Imagen');
        styleInput.focus(); return;
      }
      styleName.value = chosenStyle.name === 'Свой стиль' || chosenStyle.name === 'Без стиля'
        ? '' : (chosenStyle.name || '');
      styleSaveLayer.hidden = false;
      styleName.focus({preventScroll:true});
    });
    styleSaveConfirm.addEventListener('click', () => {
      try {
        if (previewOnly) return;
        const saved = extension?.saveImageStyle?.({name:styleName.value, value:styleInput.value});
        if (!saved) throw new Error('Сохранение стиля недоступно.');
        chosenStyle = clone(saved);
        refreshStyles(`saved:${saved.id}`);
        styleSaveLayer.hidden = true;
        saveStyle.focus({preventScroll:true});
        host.toastr?.success?.('Стиль добавлен в раздел «Стили».', 'SP Imagen');
      } catch (error) { host.toastr?.error?.(String(error?.message || error), 'SP Imagen'); }
    });

    const initialPrompt = promptArea.value;
    const initialStyleText = styleInput.value;
    const isDirty = () => promptArea.value !== initialPrompt || styleInput.value !== initialStyleText
      || String(chosenStyle.id || '') !== String(initialStyle.id || '')
      || String(chosenStyle.name || '') !== String(initialStyle.name || '');
    rerun.addEventListener('click', async () => {
      if (previewOnly || guideDemo) {
        note.textContent = 'В обычном режиме появится новая версия картинки. Здесь это только пример, без генерации.';
        return;
      }
      rerun.disabled = true;
      cancel.disabled = true;
      closeX.disabled = true;
      try {
        const next = clone(config) || {};
        next.prompt = promptArea.value.trim();
        if (!next.prompt) throw new Error('Промпт не может быть пустым.');
        next.spImagenDirect ||= {version:1, provider:'novelai', settings:{}};
        next.spImagenDirect.style = {...clone(chosenStyle), value:styleInput.value.trim()};
        await regenerate(index, kind, next);
        closePromptPopup();
      } catch (error) {
        host.toastr?.error?.(String(error?.message || error), 'SP Imagen');
        rerun.disabled = false;
        cancel.disabled = false;
        closeX.disabled = false;
      }
    });
    positionEditorModal(node);
    promptPopup = {node, anchor, text:promptArea, type:'editor', isDirty, closeStyleNaming};
    closeX.focus({preventScroll:true});
    return promptArea;
  }

  function toggleToolsMenu(view) {
    const wasOpen = openMenu?.toggle === view.toggle;
    closeToolsMenu();
    if (!requestClosePromptPopup()) return;
    if (wasOpen) return;
    if (guideDemo?.view === view && guideDemo.clearOnStar) {
      guideDemo.marker?.remove();
      guideDemo.marker = null;
      guideDemo.clearOnStar = false;
    }

    const { node, root } = component('floating');
    const testMode=Boolean(getExtension?.()?.experimentalModeEnabled);
    const testToggle=element('label','experimental-toggle');
    const toggleText=element('span','experimental-toggle-text');
    toggleText.append(element('strong','',testMode?'🧪 Тест: ON':'🧪 Тест: OFF'));
    toggleText.append(element('small','',testMode?'Тестовые профили доступны ниже':'Старые профили не изменены'));
    const testInput=element('input');testInput.type='checkbox';testInput.checked=testMode;
    testInput.setAttribute('aria-label','Включить тестовые профили режиссёра');
    testInput.addEventListener('change',()=>{
      getExtension?.()?.setExperimentalMode?.(testInput.checked);
      closeToolsMenu();toggleToolsMenu(view);
    });
    const testRow=element('div','experimental-row');
    const testHelp=element('button','menu-help','?');
    testHelp.setAttribute('aria-label','Справка: тестовые профили');
    testHelp.addEventListener('click',event=>{event.stopPropagation();openExplanation('Тестовый режим','OFF оставляет обычные встроенные и собственные профили. ON добавляет 🧪 Snapshot, 🧪 Comic и 🧪 Story Page. Тестовый режиссёр заполняет отдельные поля JSON за один запрос: начало, сцену с композицией и ключевыми действиями, рамки, пузыри, персонажей и надписи. Код собирает их для NovelAI; предыдущие профили и картинки не меняются.');});
    testToggle.append(toggleText,testInput);testRow.append(testToggle,testHelp);root.append(testRow);
    const available=getExtension?.()?.getVisibleGenerationProfiles?.()||KINDS.map(id=>({id,name:LABEL[id]}));
    let testHeaderAdded=false;
    if(!available.length){const note=element('div','menu-empty','Включи хотя бы один профиль в настройках SP Imagen.');root.append(note);}
    for (const item of available) {
      const kind=item.id;
      if(!validKind(kind))continue;
      if(item.experimental&&!testHeaderAdded){root.append(element('div','experimental-heading','ТЕСТОВЫЕ ПРОФИЛИ · JSON-СЛОТЫ'));testHeaderAdded=true;}
      // Per-click lettering choice is ephemeral; this switch affects no saved RP text.
      // It has no listeners outside this menu and never writes chat settings.
      const toggleable = (item.builtIn !== false || item.experimental===true) && ['comic','story_page'].includes(item.baseKind||kind);
      const row = toggleable ? element('div','option-row') : root;
      const option = element('button', item.experimental?'option experimental-profile':'option', item.name||LABEL[kind]);
      let showText = true;
      option.addEventListener('click', () => {
        closeToolsMenu(true);
        // Training uses the REAL profile menu but never runs a model or saves chat data.
        if (guideDemo?.view === view) {
          guideDemo.kind = kind;
          return;
        }
        if (context().chat?.[view.index] === view.message) {
          void executeCommand('sp_ness_generate_at', view, kind, showText);
        }
      });
      row.append(option);
      if(toggleable){
        const toggle=element('label','text-mode-toggle');
        toggle.title='Переключает наличие реплик и надписей только для следующей генерации.';
        const input=element('input');input.type='checkbox';input.checked=true;
        input.setAttribute('aria-label','Показывать текст на изображении · '+(item.name||LABEL[kind]));
        const track=element('span','text-track');
        const label=element('span','text-mode-label','Текст');
        input.addEventListener('change',()=>{
          showText=input.checked;
          label.textContent=showText?'Текст':'Без текста';
        });
        toggle.append(input,track,label);
        const textHelp=element('button','menu-help','?');
        textHelp.title='Что делает текст в комиксе';textHelp.setAttribute('aria-label','Справка: текст и пузыри');
        textHelp.addEventListener('click',event=>{event.stopPropagation();openExplanation('Текст в комиксе','«Текст» разрешает режиссёру использовать установленные в RP реплики и надписи. В тестовом профиле каждый Speech bubble привязан к панели и персонажу, а точные слова повторяются в Text: в конце промпта. «Без текста» отключает пузыри и надписи только на этот запуск.');});
        row.append(toggle,textHelp);
        root.append(row);
      }
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
    const view = { node, root, anchor, index, message, tools, toggle, gallery, promptButton: null, draftButton:null, discardDraftButton:null, cards: new Map() };
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
    const displayName=generationProfiles().find(p=>p.id===kind)?.name||slot.label||item?.config?.profileName||LABEL[kind];
    const section = element('section', 'card');
    const collapsed = slot.collapsed !== false;
    section.dataset.collapsed = String(collapsed);
    const heading = element('button', 'heading');
    heading.title = collapsed ? 'Развернуть изображение' : 'Свернуть изображение';
    heading.setAttribute('aria-label', `${collapsed ? 'Развернуть' : 'Свернуть'} ${displayName}`);
    heading.setAttribute('aria-expanded', String(!collapsed));
    const name = element('span', 'heading-title', displayName);
    const meta = element('span', 'heading-meta');
    meta.append(element('span','heading-count',`${selected+1} / ${slot.versions.length}`),
        element('span','heading-chevron',collapsed ? '▸' : '▾'));
    heading.append(name,meta);
    heading.addEventListener('click', () => void runAction(() => toggleCollapse(index,kind)));
    const frame = element('button', 'frame');
    frame.hidden = collapsed;
    frame.dataset.aspect = item.config?.aspect_ratio || '2:3';
    if (safeUrl(item.src)) {
      const image = element('img');
      image.src = item.src;
      image.alt = `${displayName} · версия ${selected + 1}`;
      image.loading = 'lazy';
      frame.addEventListener('click', () => showImageViewer(frame,item.src,image.alt));
      frame.append(image);
    } else {
      // Do not load external URLs or potentially executable protocols automatically.
      frame.append(element('span','external-image-warning',remoteImage(item.src)
        ? 'Внешнее изображение скрыто · Нажми, чтобы открыть ссылку'
        : 'Недопустимый источник изображения · исходная запись сохранена'));
      frame.addEventListener('click', () => openLegacyRemote(item.src));
    }

    const bar = element('div', 'bar');
    bar.hidden = collapsed;
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
      galleryButton(locked ? '⏳' : '↻', 'Повторить с текущим активным стилем', () => regenerate(index, kind), locked || !item.config),
      galleryButton('↓', 'Скачать', () => saveSelected(index, kind)),
      galleryButton('🗑', 'Удалить из галереи', () => deleteSelected(index, kind), locked),
    );
    bar.append(navigation, actions);
    section.append(heading, frame, bar);
    return section;
  }

  function newestSavedPrompt(slots) {
    let latest = null;
    for (const kind of availableKinds(slots)) {
      for (const version of slots?.[kind]?.versions || []) {
        if (typeof version.config?.prompt !== 'string' || !version.config.prompt.trim()) continue;
        if (!latest || Number(version.at || 0) > Number(latest.at || 0)) latest = { ...version, kind };
      }
    }
    return latest;
  }

  function promptSources(view,slots){
    const ctx=context();
    const draft=eligible(view.message)?readPostDraft(ctx,view.index):null;
    const saved=newestSavedPrompt(slots);
    const source=collectPostPrompts(view.message,draft,saved);
    const items=[];
    if(source.finalPrompt)items.push({id:'final',label:'Итоговый промпт NovelAI',text:source.finalPrompt});
    if(source.directorRaw)items.push({id:'director',label:'Ответ режиссёра · JSON / HTML',text:source.directorRaw});
    if(source.parsedScene)items.push({id:'parsed',label:'Собранные RP-посты',text:source.parsedScene});
    return items;
  }

  function updatePostPromptIcon(view, slots) {
    const sources=promptSources(view,slots);
    if (!sources.length) {
      view.promptButton?.remove();
      view.promptButton = null;
      return;
    }
    if (!view.promptButton) {
      const button=element('button','tool prompt-saved','▤');
      button.title='Просмотреть сохранённые RP-посты, ответ режиссёра и итоговый промпт';
      button.setAttribute('aria-label',button.title);
      button.addEventListener('click',()=>{
        if(guideDemo?.view===view)return;
        const actual=promptSources(view,slotsOf(context().chat?.[view.index]));
        if(actual.length)showPromptPopup(button,actual[0].text,'Промпты этого RP-поста',actual);
      });
      view.tools.append(button);view.promptButton=button;
    }
    view.promptButton.title='Сохранено этапов: '+sources.length+'. Открыть промпты этого поста';
  }

  function updatePostDraftControls(view) {
    const current=context();
    const draft=eligible(view.message) ? readPostDraft(current,view.index) : null;
    if(!draft){
      view.draftButton?.remove();view.draftButton=null;
      view.discardDraftButton?.remove();view.discardDraftButton=null;
      return;
    }
    const stage=draft.final?.config?.prompt?'готовый промпт':draft.review?'сцена и персонажи':'сбор сцены';
    if(!view.draftButton){
      const button=element('button','tool draft-resume');
      button.addEventListener('click',()=>void executeCommand('sp_ness_resume_post',view));
      view.tools.append(button);view.draftButton=button;
    }
    view.draftButton.textContent='↪ Продолжить · '+stage;
    view.draftButton.title='Продолжить сохранённый черновик без лишней генерации текста';
    view.draftButton.setAttribute('aria-label',view.draftButton.title);
    if(!view.discardDraftButton){
      const button=element('button','tool draft-discard','×');
      button.title='Удалить черновик этого RP-поста';
      button.setAttribute('aria-label',button.title);
      button.addEventListener('click',()=>void runAction(async()=>{
        const live=context();
        if(live.chat?.[view.index]!==view.message)return;
        if(!host.confirm('Удалить сохранённый черновик этого поста? Картинки в галерее останутся.'))return;
        discardPostDraft(live,view.index);
        paint();
      }));
      view.tools.append(button);view.discardDraftButton=button;
    }
  }

  function updatePost(view, slots, chatId) {
    view.tools.hidden = !eligible(view.message);
    updatePostPromptIcon(view, slots);
    updatePostDraftControls(view);
    for (const kind of availableKinds(slots)) {
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
      if (previous?.item === item && previous.selected === slot.selected && previous.count === count && previous.locked === locked && previous.collapsed === (slot.collapsed!==false)) continue;
      const node = card(view.index, kind, slot, locked);
      if (previous) previous.node.replaceWith(node);
      else {
        const order=availableKinds(slots),nextKind=order.slice(order.indexOf(kind)+1).find(key=>view.cards.has(key));
        view.gallery.insertBefore(node, view.cards.get(nextKind)?.node ?? null);
      }
      view.cards.set(kind, { node, item, selected: slot.selected, count, locked, collapsed: slot.collapsed!==false });
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
        if (!eligible(message) && !availableKinds(slots).some(kind => slots?.[kind]?.versions?.length)) continue;
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
    if(section==='post-test-mode'){
      if(openMenu?.toggle!==view.toggle)toggleToolsMenu(view);
      return openMenu?.node.shadowRoot?.querySelector('.experimental-toggle')||view.toggle;
    }
    if (section === 'post-formats' || section === 'post-formats-text') {
      if (openMenu?.toggle !== view.toggle) toggleToolsMenu(view);
      const root=openMenu?.node.shadowRoot;
      return section === 'post-formats-text'
        ? root?.querySelector('.text-mode-toggle') ?? root?.querySelector('.option') ?? null
        : root?.querySelector('.option') ?? null;
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
    if (!(validKind(kind)||validCustomId(kind)) || !safeUrl(item?.src)) throw new Error('Неверный слот или адрес изображения.');
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
    if (!safeUrl(storedSrc) || /^data:/i.test(storedSrc)) throw new Error('SP Imagen не смог сохранить PNG как файл SillyTavern. Встраивание большого base64 в чат запрещено, чтобы не расходовать память.');
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
      if(!slots[kind]||!Array.isArray(slots[kind].versions))
        slots[kind]={versions:[],selected:0,collapsed:true};
      slots[kind].label=String(item?.config?.profileName||slots[kind].label||LABEL[kind]).slice(0,100);
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

  async function toggleCollapse(index,kind) {
    const current = context();
    const slot = slotsOf(current.chat?.[index],false)?.[kind];
    if(!slot) return;
    const before=slot.collapsed!==false;
    slot.collapsed=!before;
    paint();
    try{ await current.saveChat(); }
    catch(error){ slot.collapsed=before; paint(); throw error; }
  }

  async function deleteSelected(index, kind) {
    const current = context();
    const slot = slotsOf(current.chat?.[index], false)?.[kind];
    if (!slot?.versions?.length) return;
    const lock = `${current.chatId}|${index}|${kind}`;
    if (busy.has(lock)) throw new Error('Дождись завершения генерации перед удалением изображения.');
    const chat = current.chat, chatId = current.chatId, message = chat[index];
    const selected = slot.selected, selectedImage = slot.versions[selected];
    if (!selectedImage) return;
    const ownedPath = spImagenOwnedImagePath(selectedImage.src, host.location?.origin);
    const prompt = ownedPath
      ? 'Удалить версию '+(selected+1)+' из '+slot.versions.length+'? Изображение исчезнет из этой галереи, а его файл на сервере SillyTavern будет удалён, если он не используется больше нигде в текущем чате. Если этот же файл вставлен в другой чат, ссылка там перестанет работать. Это необратимо.'
      : 'Удалить версию '+(selected+1)+' из '+slot.versions.length+'? Запись исчезнет из галереи. Внешние или старые источники файлов не удаляются.';
    if (!host.confirm(prompt)) return;
    if (context().chat !== chat || context().chatId !== chatId || chat[index] !== message) return;
    busy.add(lock);
    const before = slot.versions.slice();
    const oldSelected = slot.selected;
    const legacy = Array.isArray(message.extra?.sp_imagen_embeds) ? message.extra.sp_imagen_embeds : null;
    const legacyBefore = legacy ? legacy.slice() : null;
    try {
      // Remove the legacy copy too, or migration would resurrect the deleted card.
      if (legacy) message.extra.sp_imagen_embeds = legacy.filter(item =>
        !(item?.kind === kind && item?.src === selectedImage.src));
      slot.versions.splice(selected, 1);
      slot.selected = Math.min(selected, Math.max(0, slot.versions.length - 1));
      paint();
      try {
        await current.saveChat();
      } catch (error) {
        slot.versions = before;
        slot.selected = oldSelected;
        if (legacyBefore) message.extra.sp_imagen_embeds = legacyBefore;
        paint();
        throw error;
      }
      // Never delete an owned file still used by another version or RP message.
      // Other chat files are not available for inspection from this active session.
      if (!ownedPath) return;
      if (isReferencedInCurrentChat(chat, selectedImage.src)) {
        host.toastr?.info?.('Запись удалена. Файл оставлен на сервере: он всё ещё используется в текущем чате.', 'SP Imagen');
        return;
      }
      try {
        await deleteSpImagenOwnedFile(selectedImage.src, {
          origin: host.location?.origin,
          fetchImpl: host.fetch.bind(host),
          headers: getRequestHeaders(),
        });
        host.toastr?.success?.('Изображение удалено из галереи и файлов SillyTavern.', 'SP Imagen');
      } catch (error) {
        // Do not restore a possibly deleted image when the network state is unknown.
        host.toastr?.warning?.('Запись в галерее удалена, но удаление файла не подтверждено: '+String(error?.message||error), 'SP Imagen');
      }
    } finally {
      busy.delete(lock);
      paint();
    }
  }

  async function saveSelected(index, kind) {
    const slot = slotsOf(context().chat?.[index])?.[kind];
    const item = slot?.versions?.[slot.selected];
    if (!item) return;
    if (!safeUrl(item.src)) {
      openLegacyRemote(item.src);
      return;
    }
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
    // This gallery card's profile is authoritative, even for older saved
    // images that never stored a kind in their direct-generation snapshot.
    config.kind = kind;
    const extension = getExtension?.();
    if (!extension?.directGenerationEnabled?.() || typeof extension.generateImage !== 'function') {
      throw new Error('Для повторной генерации включи SP Imagen → NovelAI и укажи API-токен.');
    }
    const lock = `${current.chatId}|${index}|${kind}`;
    if (busy.has(lock)) throw new Error('Эта картинка уже генерируется.');
    busy.add(lock);
    paint();
    try {
      // Repeat uses the NEW active style; an editor submission uses its explicitly
      // chosen style. Both reuse model/sampler settings saved with the image.
      // Never await chat metadata before a paid NAI request: a stalled save must
      // not prevent sending the actual image prompt.
      const generated = await extension.generateImage(config, {
        reuseSnapshot: true,
        useActiveStyle: overrideConfig === null,
      });
      if (context().chat !== chat || context().chatId !== current.chatId || chat[index] !== message) {
        throw new Error('Чат изменился во время повторной генерации.');
      }
      await publish(index, kind, generated);
      // The image is safely published before updating last-prompt history.
      if (typeof generated.config?.prompt === 'string' && generated.config.prompt.trim()) {
        current.chatMetadata.variables ||= {};
        current.chatMetadata.variables.sp_imagen_last_final_image_prompt = generated.config.prompt;
        // Saving last-prompt history is best effort and must not lock the gallery.
        void Promise.resolve().then(() => current.saveMetadata?.())
          .catch(error => console.warn('[SP Imagen] Не удалось сохранить последний промпт:', error));
      }
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
  async function executeCommand(command, view, kind, includeText = true) {
    const current = context();
    const request = view && { chat: current.chat, chatId: current.chatId, index: view.index, message: view.message, kind, includeText };
    if (request && current.chat[request.index] !== request.message) return;
    if (command === 'sp_ness_generate_at' && typeof guideDemo !== 'undefined' && guideDemo) return;
    const extension = getExtension?.();
    if (!extension?.installed || typeof extension.run !== 'function') {
      host.toastr?.error?.('SP Imagen не загружен.', 'SP Imagen');
      return;
    }
    const generationChat = ['sp_ness_generate_at','sp_ness_resume_post'].includes(command) ? current.chat : null;
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
    if (promptPopup?.type === 'preview' && !clicked.includes(promptPopup.node) && !clicked.includes(promptPopup.anchor)) closePromptPopup();
  }

  function escapeMenu(event) {
    if(event.key==='Escape'&&imageViewer){event.preventDefault();event.stopPropagation();closeImageViewer();return;}
    if (event.key === 'Escape' && (openMenu || promptPopup)) {
      event.preventDefault();
      event.stopPropagation();
      closeToolsMenu(true);
      requestClosePromptPopup();
    }
  }

  function viewportChanged(event) {
    if (openMenu && event.target !== openMenu.node) closeToolsMenu();
    if (promptPopup?.type === 'editor') positionEditorModal(promptPopup.node);
    else if (promptPopup && event.target !== promptPopup.node) closePromptPopup();
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
  const chatChanged = () => { endGuideDemo(); closeToolsMenu(); closePromptPopup(); closeImageViewer(); migrateTail(); installMenuCommands(); paint(); };
  const messageChanged = () => paint();
  subscribe('CHAT_CHANGED', chatChanged);
  for (const name of ['CHARACTER_MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) {
    subscribe(name, messageChanged);
  }

  function dispose() {
    endGuideDemo();
    closeToolsMenu();
    closePromptPopup();
    closeImageViewer();
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
    version: 65,
    controlsRevision: 27,
    bundleVersion: '2.9.34',
    guideStep,
    endGuideDemo,
    get supportedKinds(){return availableKinds();},
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
