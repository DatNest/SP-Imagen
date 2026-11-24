import { startQuickGuide, stopQuickGuide, makeGuideSteps, addFieldHelp } from './onboarding.js';
import { resolveImageStyle } from './image-style-selection.js';
import { PROFILE_KINDS, PROFILE_SWITCHES, normalizeProfile, normalizeExtraRule, normalizeProfileStore, profileById, generationFormats, baseKindFor, migrateLegacyProfiles, promoteBuiltInProfiles, primaryProfileId, isStructuredDirectorPrompt } from './profiles.js';
import { CODE_PROMPT_LABELS, CODE_PROMPT_DEFAULTS, resolveCodePrompt } from './code-prompts.js';
import { mountViewportOverlay } from './viewport-overlay.js';
import { eventSource, event_types, getRequestHeaders } from '../../../../script.js';
import { createLibraryStore, createLibraryFileTransport } from './library-persistence.js';
import { MASTER_LIBRARY_KEY, MASTER_BACKUP_KEY } from './shared-data.js';
import { createPromptJson, parsePromptJson, SP_IMAGEN_PROMPT_JSON_KEYS } from './prompt-json.js';
import { saveBase64AsFile } from '../../../utils.js';
import { createSpImagenRuntime } from './runtime.js';
import { createSpImagenLibraryRuntime } from './library-runtime.js';
import { installSpImagenMediaSlots } from './media-slots.js';
import { SP_IMAGEN_PROMPTS, SP_IMAGEN_RELEASE } from './official-prompts.js';
import { pageTextEnabled } from './page-text-mode.js';
import { experimentalProfileFor, experimentalDirectorPrompt } from './experimental-director.js';
import { decidePromptUpdate } from './update-policy.js';
import { NOVELAI_MODELS, NOVELAI_SAMPLERS, checkNovelAISubscription, defaultNovelAISettings, generateNovelAI, normalizeNovelAISettings } from './novelai.js';
import { defaultTextApiSettings, generateTextCompletion, listSillyTavernProfiles, normalizeTextApiSettings, reasoningRequestOptions, testSillyTavernProfile, testTextApi } from './text-api.js';
import { OFFICIAL_NOVELAI_ORIGIN, directTextOrigin, officialNovelAIEndpoint } from './security-network.js';

const EXTENSION_KEY = 'spImagen';
// Change with every extension build. Including packaged hashes also detects changed shipped instructions.
const SP_IMAGEN_BUNDLE_VERSION = '2.9.63';
const PROFILE_LABELS = {
    sp_ness_snapshot_director: 'Snapshot',
    sp_ness_comic_director: 'Comic',
    sp_ness_story_page_director: 'Story Page',
};

let runtime;
let libraryRuntime;
let mediaSlots;
let initialized = false;
let initializing = false;
let initializationAttempts = 0;
let promptCenterOpen = false;
let hubChildOpen = false;
let activeHub = null;
// One modal lock shared by every top-level SP Imagen popup, including nested windows.
// Capture the original state once and restore only when the final modal is dismissed.
const expandedDialogs = new Set();
const originalBackgroundInert = new Map();
function syncModalBackground() {
    if (!expandedDialogs.size) {
        for (const [node, wasInert] of originalBackgroundInert) if (node.isConnected) node.inert = wasInert;
        originalBackgroundInert.clear();
        return;
    }
    for (const node of document.body.children) {
        if (!originalBackgroundInert.has(node)) originalBackgroundInert.set(node, node.inert);
        node.inert = true;
    }
}

const clone = value => JSON.parse(JSON.stringify(value));
const hash = async value => {
    const bytes = new TextEncoder().encode(String(value ?? ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

function context() {
    return SillyTavern.getContext();
}
const libraryStore=createLibraryStore({transport:createLibraryFileTransport({headers:getRequestHeaders}),legacy:()=>{
    const global=context()?.extensionSettings?.variables?.global||{};
    return {current:global[MASTER_LIBRARY_KEY],previous:global[MASTER_BACKUP_KEY]};
}});

// Import only persistent SP Imagen chat data from previous releases.
// The new namespace prevents collisions with old scripts; nothing is read from other extensions.
const migratedChats = new WeakSet();
function migratePreviousChatData(st = context()) {
    const chat = st?.chat;
    if (!chat || typeof chat !== 'object' || migratedChats.has(chat) || !st.chatMetadata) return;
    migratedChats.add(chat);
    const vars = st.chatMetadata.variables ||= {};
    let changed = false;
    for (const key of ['user_settings', 'skip_prompt_preview', 'chat_cast_ids', 'last_final_image_prompt', 'last_director_raw']) {
        const oldKey = `naicom_${key}`;
        const newKey = `sp_imagen_${key}`;
        if (vars[newKey] === undefined && vars[oldKey] !== undefined) {
            vars[newKey] = vars[oldKey];
            changed = true;
        }
    }
    if (changed) void Promise.resolve(st.saveMetadata?.()).catch(error => console.warn('[SP Imagen] migration save:', error));
}

function settings() {
    const root = context().extensionSettings;
    root[EXTENSION_KEY] ??= {};
    const value = root[EXTENSION_KEY];
    value.version ??= 1;
    value.promptBases ??= {};
    value.pendingPrompts ??= {};
    value.seenRelease ??= 0;
    value.novelai = normalizeNovelAISettings(value.novelai);
    value.textApi = normalizeTextApiSettings(value.textApi);
    value.prompts ??= {};
    value.codePrompts ??= {};
    value.customProfiles ??= [];
    value.activeProfiles ??= {};
    const migrated=migrateLegacyProfiles(value);
    const promoted=promoteBuiltInProfiles(value);
    if(migrated||promoted)context().saveSettingsDebounced?.();
    return value;
}

function saveSettings() {
    context().saveSettingsDebounced?.();
}

// A backup contains only bundled prompt slots. User-created profiles are never replaced.
function snapshotBundledPrompts(state = settings()) {
    return {
        createdAt: new Date().toISOString(),
        bundle: state.appliedBundleSignature || '',
        prompts: clone(state.prompts || {}),
        codePrompts: clone(state.codePrompts || {}),
    };
}
function validPromptSnapshot(backup) {
    return backup && typeof backup === 'object' && backup.prompts && typeof backup.prompts === 'object'
        && !Array.isArray(backup.prompts) && backup.codePrompts && typeof backup.codePrompts === 'object'
        && !Array.isArray(backup.codePrompts);
}
function saveManualPromptBackup() {
    const state = settings();
    state.promptBackups ??= {};
    state.promptBackups.manual = snapshotBundledPrompts(state);
    saveSettings();
}
function exchangePromptBackup(slot = 'manual') {
    const state = settings(), backups = state.promptBackups || {}, previous = backups[slot];
    if (!validPromptSnapshot(previous)) throw new Error('Резервной копии пока нет. Сначала сделай её.');
    const now = snapshotBundledPrompts(state);
    // Copy only bundled official and system prompt values. Never touch customProfiles or activeProfiles.
    state.prompts = clone(previous.prompts);
    state.codePrompts = clone(previous.codePrompts);
    for (const [name, shipped] of Object.entries(SP_IMAGEN_PROMPTS))
        if (typeof state.prompts[name] !== 'string' || !state.prompts[name].trim()) state.prompts[name] = shipped;
    state.promptBackups[slot] = now; // Swap: a second click reverses the action.
    saveSettings();
}
function resetAllBundledPrompts() {
    const state = settings();
    state.promptBackups ??= {};
    state.promptBackups.manual = snapshotBundledPrompts(state);
    state.prompts = { ...SP_IMAGEN_PROMPTS };
    state.codePrompts = {}; // Empty overrides resolve to packaged CODE_PROMPT_DEFAULTS.
    state.promptBases = {};
    state.pendingPrompts = {};
    state.seenRelease = SP_IMAGEN_RELEASE;
    saveSettings();
}
async function synchronizePrompts() {
    const state = settings();
    // All bundled director AND service instructions are version-owned, not
    // user-owned: no saved setting is allowed to shadow the shipped originals.
    // Only customProfiles from "Создать профиль" may persist across updates.
    const signature = SP_IMAGEN_BUNDLE_VERSION + ':'
        + await hash(JSON.stringify(SP_IMAGEN_PROMPTS) + '\n' + JSON.stringify(CODE_PROMPT_DEFAULTS));
    const shippedNames = Object.keys(SP_IMAGEN_PROMPTS);
    const exactDirectors = Object.keys(state.prompts).length === shippedNames.length
        && shippedNames.every(name => state.prompts[name] === SP_IMAGEN_PROMPTS[name]);
    const oldOverrides = Object.keys(state.codePrompts).length > 0;
    // A code/CSS-only release must not reset otherwise identical official
    // prompts or replace the user's last automatic backup. The version prefix
    // may change while the verified packaged prompt-content hash stays equal.
    const shippedHash = signature.slice(signature.indexOf(':') + 1);
    const installedHash = String(state.appliedBundleSignature || '').split(':').at(-1);
    const unchangedPrompts = installedHash === shippedHash && exactDirectors && !oldOverrides;
    if (unchangedPrompts) {
        if (state.appliedBundleSignature !== signature) {
            state.appliedBundleSignature = signature;
            await Promise.resolve(context().saveSettingsDebounced?.());
        }
        return;
    }
    const alreadyInstalled = Object.keys(state.prompts).length || Object.keys(state.codePrompts).length;
    state.promptBackups ??= {};
    if (alreadyInstalled) state.promptBackups.automatic = snapshotBundledPrompts(state);
    state.prompts = { ...SP_IMAGEN_PROMPTS };
    // Service prompts always resolve directly from this release.
    state.codePrompts = {};
    state.promptBases = Object.fromEntries(await Promise.all(
        Object.entries(SP_IMAGEN_PROMPTS).map(async ([key, value]) => [key, await hash(value)])));
    state.pendingPrompts = {};
    state.seenRelease = SP_IMAGEN_RELEASE;
    state.appliedBundleSignature = signature;
    await Promise.resolve(context().saveSettingsDebounced?.());
}

async function getRuntime() {
    const loaded = runtime ??= createSpImagenRuntime({ getExtension: () => extensionApi, getMediaSlots: () => mediaSlots, libraryStore });
    if (typeof loaded.resumePost !== 'function' || typeof loaded.generateAt !== 'function')
        throw new Error('SP Imagen: модули обновились не полностью. Останови генерацию, обнови расширение целиком и перезагрузи страницу без кэша.');
    return loaded;
}

async function getLibraryRuntime() {
    const loaded=libraryRuntime ??= createSpImagenLibraryRuntime({ getExtension: () => extensionApi, libraryStore });
    if(loaded?.bundleVersion!==SP_IMAGEN_BUNDLE_VERSION)
        throw new Error('SP Imagen: несовместимая версия библиотеки. Не запускай генерацию и обнови расширение целиком, затем перезагрузи страницу без кэша.');
    return loaded;
}

function hasNew() {
    const state = settings();
    return state.seenRelease !== SP_IMAGEN_RELEASE || Object.keys(state.pendingPrompts).length > 0;
}

function refreshNewIndicators() {
    const value = hasNew();
    document.querySelectorAll('[data-spi-new]').forEach(node => { node.hidden = !value; });
    document.querySelectorAll('[data-spi-prompts]').forEach(node => {
        node.textContent = `Профили${value ? '  NEW!' : ''}`;
    });
    mediaSlots?.refresh?.();
    mediaSlots?.refreshMenu?.();
}

function shell(title, className = '', options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'spi-overlay';
    const dialog = document.createElement('section');
    dialog.className = `spi-dialog ${className}`.trim();
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title);
    const head = document.createElement('header');
    head.className = 'spi-dialog-head';
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'menu_button spi-back';
    backButton.textContent = '←';
    backButton.setAttribute('aria-label', 'Назад');
    backButton.hidden = !options.back;
    const heading = document.createElement('h2');
    heading.textContent = title;
    const minimizeButton = document.createElement('button');
    minimizeButton.type = 'button';
    minimizeButton.className = 'menu_button spi-minimize';
    minimizeButton.textContent = '−';
    minimizeButton.title = 'Свернуть окно';
    minimizeButton.setAttribute('aria-label', 'Свернуть окно');
    minimizeButton.setAttribute('aria-expanded', 'true');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'menu_button spi-close';
    closeButton.textContent = '×';
    closeButton.title = 'Закрыть окно';
    closeButton.setAttribute('aria-label', 'Закрыть окно');
    head.append(backButton, heading, minimizeButton, closeButton);
    dialog.append(head);
    overlay.append(dialog);
    const previous = document.activeElement;
    const stopViewport = mountViewportOverlay(overlay);
    expandedDialogs.add(overlay);
    syncModalBackground();
    let closed = false;
    let collapsed = false;
    const setCollapsed = value => {
        if (closed || value === collapsed) return;
        collapsed = value;
        overlay.classList.toggle('spi-collapsed', value);
        dialog.setAttribute('aria-modal', value ? 'false' : 'true');
        minimizeButton.textContent = value ? '□' : '−';
        minimizeButton.title = value ? 'Развернуть окно' : 'Свернуть окно';
        minimizeButton.setAttribute('aria-label', minimizeButton.title);
        minimizeButton.setAttribute('aria-expanded', String(!value));
        if (value) expandedDialogs.delete(overlay);
        else expandedDialogs.add(overlay);
        syncModalBackground();
        minimizeButton.focus();
    };
    minimizeButton.addEventListener('click', () => setCollapsed(!collapsed));
    let resolveClosed;
    const closedPromise = new Promise(resolve => { resolveClosed = resolve; });
    const close = (reason = 'user') => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        if (event_types.CHAT_CHANGED) eventSource.removeListener?.(event_types.CHAT_CHANGED, onChatChanged);
        expandedDialogs.delete(overlay);
        syncModalBackground();
        stopViewport();
        overlay.remove();
        if (reason !== 'chat') previous?.focus?.();
        options.onClose?.(reason);
        resolveClosed();
    };
    const onChatChanged = () => close('chat');
    if (event_types.CHAT_CHANGED) eventSource.on?.(event_types.CHAT_CHANGED, onChatChanged);
    closeButton.addEventListener('click', () => close());
    backButton.addEventListener('click', () => typeof options.back === 'function' ? options.back() : close());
    const onKey = event => {
        if (document.querySelector('.spi-onboarding,.spi-guide-explain-overlay')) return;
        if (overlay.inert || [...document.querySelectorAll('.spi-overlay')].at(-1) !== overlay) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
        if (event.key !== 'Tab') return;
        const nodes = [...dialog.querySelectorAll('button,textarea,input,select')].filter(node => !node.disabled && node.getClientRects().length);
        if (!nodes.length) return;
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    return { overlay, dialog, close, closed: closedPromise, heading, backButton, setCollapsed };
}

function button(label, parent, action, primary = false) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `menu_button${primary ? ' interactable' : ''}`;
    node.textContent = label;
    node.addEventListener('click', action);
    parent.append(node);
    return node;
}

function shippedPrompt(name) {
    return SP_IMAGEN_PROMPTS[name] ?? '';
}

async function savePrompt(name, prompt) {
    throw new Error('Встроенные режиссёры защищены от редактирования. Создай копию профиля.');
}

function downloadPromptJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
    } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

function openPromptJsonTransfer() {
    const { dialog, close } = shell('SP Imagen · JSON промптов', 'spi-prompt-json');
    const intro = document.createElement('p');
    intro.textContent = 'Импорт создаёт три самостоятельных профиля на основе режиссёров Snapshot, Comic и Story Page. Встроенные инструкции остаются неизменными. Импортированные профили можно показывать по ✧ или скрывать.';
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.json,application/json';
    upload.hidden = true;
    upload.setAttribute('aria-label', 'Файл JSON промптов');
    const toolbar = document.createElement('div');
    toolbar.className = 'spi-dialog-actions spi-transfer-toolbar';
    const pick = button('Выбрать файл .json', toolbar, () => upload.click());
    button('Экспорт текущих', toolbar, () => downloadPromptJson('SP_IMAGEN_prompts.json', createPromptJson(builtInDirectorTemplates())));
    button('Шаблон JSON (test)', toolbar, () => downloadPromptJson('SP_IMAGEN_prompts_TEMPLATE.json', createPromptJson({}, { template: true })));
    const label = document.createElement('label');
    label.className = 'spi-json-label';
    const caption = document.createElement('span');
    caption.textContent = 'Или вставь JSON текстом';
    const area = document.createElement('textarea');
    area.className = 'spi-json-text';
    area.spellcheck = false;
    area.placeholder = '{\n  "format": "sp-imagen-prompts",\n  "version": 1,\n  "prompts": { … }\n}';
    label.append(caption, area);
    addFieldHelp(label, 'JSON промптов', 'Можно вставить содержимое JSON-файла или загрузить готовый файл выше. Не забудь сначала проверить структуру перед импортом.');
    const status = document.createElement('p');
    status.className = 'spi-status';
    status.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'spi-dialog-actions';
    button('Закрыть', actions, close);
    button('Проверить и импортировать', actions, () => {
        try {
            const imported = parsePromptJson(area.value);
            const sample = SP_IMAGEN_PROMPT_JSON_KEYS.some(key => imported[key].trim() === 'test');
            if (sample) throw new Error('Шаблон с test нельзя включать в генерацию. Сначала заполни все три инструкции.');
            if (!confirm('Создать три пользовательские копии из JSON? Официальные режиссёры не изменятся. Новые копии нужно включить в «Мои промпты».')) return;
            const state = settings();
            const importedCopies = SP_IMAGEN_PROMPT_JSON_KEYS.map(key => {
                const kind = key.replace(/^sp_ness_(snapshot|comic|story_page)_director$/, '$1');
                const profile = normalizeProfile({
                    id:'custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),
                    name:'Импорт · '+PROFILE_LABELS[key],kind, prompt:'',directorPrompt:imported[key],options:{}
                });
                if(!profile||!profile.directorPrompt.trim())throw new Error('Неверная инструкция '+PROFILE_LABELS[key]);
                return profile;
            });
            // Commit all three at once: malformed third item must not leave partial copies.
            state.customProfiles.push(...importedCopies);
            saveSettings();
            status.textContent = 'Созданы три пользовательские копии. Встроенные промпты не изменены. Открой «Мои промпты» и включи нужную копию.';
            refreshNewIndicators();
        } catch (error) { status.textContent = String(error?.message || error); }
    }, true);
    upload.onchange = async () => {
        const file = upload.files?.[0];
        if (!file) return;
        pick.disabled = true;
        try {
            if (file.size > 1048576) throw Error('Файл больше 1 МБ.');
            area.value = await file.text();
            status.textContent = area.value.trim() ? `Загружен ${file.name}. Проверь и импортируй.` : 'Файл пустой. Скачай шаблон JSON (test).';
        } catch (error) { status.textContent = String(error?.message || error); }
        finally { pick.disabled = false; upload.value = ''; }
    };
    dialog.append(intro, upload, toolbar, label, status, actions);
}

function builtInDirectorTemplates(){
    return Object.fromEntries(Object.keys(PROFILE_LABELS).map(key=>[key,experimentalDirectorPrompt(key.replace(/^sp_ness_(snapshot|comic|story_page)_director$/,'$1'))]));
}
function openPromptWindow(name) {
    const prompt = builtInDirectorTemplates()[name];
    if (!prompt) return toastr.error(`Профиль ${PROFILE_LABELS[name] || name} не найден.`, 'SP Imagen');
    const { dialog, close } = shell(`SP Imagen · ${PROFILE_LABELS[name]} (только чтение)`, 'spi-prompt-window', { back: true });
    const area = document.createElement('textarea');
    area.value = prompt; area.readOnly = true; area.spellcheck = false;
    area.setAttribute('aria-label', `Текущая встроенная инструкция ${PROFILE_LABELS[name]}, только чтение`);
    const note = document.createElement('p'); note.className='spi-status';
    note.textContent='Встроенная инструкция доступна только для чтения. Чтобы изменить правила, создай пользовательскую копию выбранного формата.';
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
    button('Закрыть', actions, close, true);
    dialog.append(note, area, actions);
}

async function resolvePromptUpdate(name, useShipped) {
    const official = shippedPrompt(name);
    if (!official) return;
    const state = settings();
    if (useShipped) state.prompts[name] = official;
    state.promptBases[name] = await hash(official);
    delete state.pendingPrompts[name];
    saveSettings();
}

function openPromptCenter({ askUpdates = false, backToHub = false } = {}) {
    if (promptCenterOpen) return;
    promptCenterOpen = true;
    const state = settings();
    const pending = new Set(Object.keys(state.pendingPrompts));
    const { dialog, close, closed } = shell('SP Imagen · Профили', 'spi-prompt-center', {
        back: backToHub,
        onClose: reason => { promptCenterOpen = false; refreshNewIndicators(); if (backToHub && reason !== 'chat') openHub(); },
    });
    const copy = document.createElement('p');
    copy.textContent = 'Встроенные инструкции обновлены. Твои профили остаются отдельными.';
    const scroll=document.createElement('div');scroll.className='spi-profile-scroll';
    const heading=(title,parent)=>{const h=document.createElement('h3');h.textContent=title;parent.append(h);return h;};
    const helpButton=(holder,title,description)=>{
        holder.classList.add('spi-profile-help-row');
        return addFieldHelp(holder,title,description);
    };
    heading('Встроенные профили',scroll);
    const list=document.createElement('div');list.className='spi-prompt-list';
    for (const [key,label] of Object.entries(PROFILE_LABELS)) {
        const kind=key.replace(/^sp_ness_(snapshot|comic|story_page)_director$/,'$1');
        const row=document.createElement('div');row.className='spi-prompt-row spi-profile-card'+(pending.has(key)?' spi-conflict':'');
        const head=document.createElement('div');head.className='spi-profile-card-head';
        const title=document.createElement('strong');title.textContent=label;
        const visible=document.createElement('label');visible.className='spi-profile-visible';
        visible.title='Показывать профиль в меню генерации по звёздочке';
        const check=document.createElement('input');check.type='checkbox';check.checked=settings().visibleBuiltIns?.[kind]!==false;
        const span=document.createElement('span');span.textContent='✧ В меню';
        visible.append(check,span);
        check.onchange=()=>{settings().visibleBuiltIns[kind]=check.checked;saveSettings();mediaSlots?.refresh?.();};
        head.append(title,visible);
        const actions=document.createElement('div');actions.className='spi-dialog-actions spi-profile-card-actions';
        button('Просмотр',actions,()=>openPromptWindow(key)).classList.add('spi-profile-action');
        const copyHelp=document.createElement('div');actions.append(copyHelp);
        button('Создать копию',copyHelp,()=>openCustomProfileEditor(null,renderCustom,{
            name:'Копия · '+label,kind,directorPrompt:builtInDirectorTemplates()[key],
            visible:true,parser:{posts:null,instructions:'',options:{}},
        }),true).classList.add('spi-profile-action','spi-profile-action-copy');
        helpButton(copyHelp,'Самостоятельная копия '+label,
            'Создаётся НОВЫЙ независимый профиль, который не заменяет '+label+'. Он получит собственную строку в выборе по звёздочке и отдельную галерею.\n\nИзмени скопированную инструкцию и сохрани. Сразу после сохранения новый профиль доступен для генерации, если включено «Показывать по ✧». Исходный '+label+' продолжает работать без изменений. У копии можно отдельно задать число RP-постов, передаваемые источники и правила разбора.\n\nСохраняй JSON-схему и её поля: расширение само собирает секции персонажей, бабблы и Text:.');
        row.append(head,actions);list.append(row);
    }
    scroll.append(list);
    heading('Собственные профили генерации',scroll);
    const profileHint=document.createElement('p');profileHint.className='spi-profile-hint';
    profileHint.textContent='Каждый профиль — отдельная кнопка в меню ✧, собственные инструкции режиссёра, разбор данных и галерея. Галочка определяет, виден ли он при генерации.';
    scroll.append(profileHint);
    const customList=document.createElement('div');customList.className='spi-custom-profile-list';scroll.append(customList);
    const createActions=document.createElement('div');createActions.className='spi-dialog-actions';
    const profileCreate=button('＋ Создать свой профиль',createActions,()=>openCustomProfileEditor(null,renderCustom),true);
    profileCreate.classList.add('spi-create-custom-profile','spi-profile-add-button');
    const profileHelp=document.createElement('div');createActions.append(profileHelp);
    helpButton(profileHelp,'Создать собственный профиль',
        'Это отдельный режим генерации с собственным именем и полным промптом режиссёра. Можно начать с одного из встроенных шаблонов и переписать его целиком.\n\nВ «Настройке разбора» задаются число читаемых RP-постов, источники (сцена, библиотека, одежда, композиция) и дополнительные указания по разбору. Эти параметры используются только при выборе этого профиля. Галочка возле него показывает или скрывает профиль в меню ✧; сохранённые изображения не удаляются.');
    scroll.append(createActions);
    heading('Дополнительные правила для всех профилей',scroll);
    const rulesHint=document.createElement('p');rulesHint.className='spi-profile-hint';
    rulesHint.textContent='Здесь обычные инструкции, которые дословно добавляются в системный промпт режиссёра при любом выбранном профиле. Это не новые режимы генерации и не префиксы NAI5.';
    scroll.append(rulesHint);
    const rulesList=document.createElement('div');rulesList.className='spi-extra-rules-list';scroll.append(rulesList);
    const addActions=document.createElement('div');addActions.className='spi-dialog-actions';
    const addRow=document.createElement('div');addActions.append(addRow);
    const addButton=button('＋ Добавить промпт',addRow,()=>openExtraRuleEditor(null,renderCustom),true);
    addButton.classList.add('spi-prompt-add','spi-profile-add-button');
    helpButton(addRow,'Добавить дополнительный промпт',
        'Впиши название и текст правила. После сохранения оно будет добавляться ДОСЛОВНО в инструкции режиссёра для Snapshot, Comic, Story Page и всех собственных профилей.\n\nНапример: «Framing: always use a close or medium shot». Режиссёр получит эту инструкцию как написано и будет применять её к описанию сцены. Сам текст НЕ вставляется механически перед тегами 1girl/1boy в финальный промпт NAI5.\n\nМожно создавать несколько правил: все включённые работают вместе. Галочка возле каждого правила управляет его применением. «Изменить» меняет текст для следующих генераций; исходные режиссёры от этого не переписываются.');
    scroll.append(addActions);
    const renderCustom=()=>{
        const store=normalizeProfileStore(settings());
        const top=scroll.scrollTop,left=scroll.scrollLeft;
        customList.replaceChildren();rulesList.replaceChildren();
        if(!store.profiles.length){const p=document.createElement('p');p.className='spi-status';p.textContent='Пока нет личных режимов генерации.';customList.append(p);}
        for(const profile of store.profiles){
            const row=document.createElement('div');row.className='spi-prompt-row spi-profile-card';
            const head=document.createElement('div');head.className='spi-profile-card-head';
            const info=document.createElement('div');info.className='spi-profile-card-info';
            const title=document.createElement('strong');title.textContent=profile.name;
            const meta=document.createElement('small');meta.textContent=PROFILE_KINDS[profile.kind]+' · свой режиссёр';
            info.append(title,meta);
            const toggle=document.createElement('label');toggle.className='spi-profile-visible';toggle.title='Показывать профиль в меню генерации по звёздочке';
            const check=document.createElement('input');check.type='checkbox';check.checked=profile.visible;
            toggle.append(check,document.createTextNode('✧ В меню'));
            check.onchange=()=>{const target=settings().customProfiles.find(p=>p.id===profile.id);if(target){target.visible=check.checked;saveSettings();mediaSlots?.refresh?.();}};
            head.append(info,toggle);
            const actions=document.createElement('div');actions.className='spi-dialog-actions spi-profile-card-actions';
            button('Изменить',actions,()=>openCustomProfileEditor(profile,renderCustom)).classList.add('spi-profile-action');
            const dup=document.createElement('div');actions.append(dup);
            button('Создать копию',dup,()=>openCustomProfileEditor(null,renderCustom,{...profile,id:'',name:'Копия · '+profile.name})).classList.add('spi-profile-action','spi-profile-action-copy');
            helpButton(dup,'Копия личного профиля','Создаёт НОВЫЙ независимый профиль на основе этой инструкции. Его можно изменить и показывать отдельно в меню ✧. Исходный профиль не изменяется, галереи у них раздельные.');
            row.append(head,actions);customList.append(row);
        }
        if(!store.rules.length){const p=document.createElement('p');p.className='spi-status';p.textContent='Пока нет общих дополнительных правил.';rulesList.append(p);}
        for(const rule of store.rules){
            const row=document.createElement('div');row.className='spi-prompt-row spi-profile-card spi-profile-rule';
            const head=document.createElement('div');head.className='spi-profile-card-head';
            const title=document.createElement('strong');title.textContent=rule.name;
            const active=document.createElement('label');active.className='spi-profile-visible';active.title='Применять правило ко всем режиссёрам';
            const check=document.createElement('input');check.type='checkbox';check.checked=rule.enabled;
            active.append(check,document.createTextNode('Применять'));
            check.onchange=()=>{const r=settings().extraPrompts.find(x=>x.id===rule.id);if(r){r.enabled=check.checked;saveSettings();}};
            head.append(title,active);
            const actions=document.createElement('div');actions.className='spi-dialog-actions spi-profile-card-actions';
            button('Изменить',actions,()=>openExtraRuleEditor(rule,renderCustom)).classList.add('spi-profile-action');
            row.append(head,actions);rulesList.append(row);
        }
        scroll.scrollTop=top;scroll.scrollLeft=left;
    };
    renderCustom();
    const footer = document.createElement('div');
    footer.className = 'spi-dialog-actions';
    button('Закрыть', footer, () => {
        if (!Object.keys(state.pendingPrompts).length) state.seenRelease = SP_IMAGEN_RELEASE;
        saveSettings(); close();
    }, true);
    const transfer = document.createElement('div');
    transfer.className = 'spi-dialog-actions spi-prompt-transfer';
    button('↥ ↧ Импорт / экспорт JSON', transfer, openPromptJsonTransfer);
    const backups = document.createElement('div'); backups.className = 'spi-dialog-actions spi-prompt-transfer';
    backups.style.flexWrap = 'wrap';
    const backupInfo = document.createElement('p'); backupInfo.className = 'spi-status';
    backupInfo.style.flexBasis = '100%';
    backupInfo.textContent = 'Сохраняй и восстанавливай копии инструкций. Экспорт встроенных профилей содержит их действующие инструкции. Личные профили управляются отдельно.';
    const backupButton = button('◇ Сделать резервную копию промптов', backups, () => {
        try { saveManualPromptBackup(); backupInfo.textContent = 'Копия сохранена. Кнопка обмена меняет старые и текущие промпты местами.'; syncBackupButtons(); }
        catch (error) { backupInfo.textContent = String(error?.message || error); }
    });
    const manualSwap = button('↔ Моя копия / текущие', backups, () => {
        try { exchangePromptBackup('manual'); backupInfo.textContent = 'Промпты обменяны с ручной копией. Повторное нажатие вернёт прежние.'; }
        catch (error) { backupInfo.textContent = String(error?.message || error); }
        syncBackupButtons();
    });
    const autoSwap = button('↔ До обновления / текущие', backups, () => {
        try { exchangePromptBackup('automatic'); backupInfo.textContent = 'Промпты обменяны с автоматической копией. Повторное нажатие отменит обмен.'; }
        catch (error) { backupInfo.textContent = String(error?.message || error); }
        syncBackupButtons();
    });
    const resetAll = button('↺ Сбросить все встроенные промпты', backups, () => {
        if (!confirm('Вернуть ВСЕ встроенные промпты из этой версии? Личные профили останутся нетронутыми. Текущие промпты сохранятся в ручную резервную копию.')) return;
        resetAllBundledPrompts();
        backupInfo.textContent = 'Все встроенные промпты восстановлены. Предыдущую версию можно вернуть через «Моя копия / текущие».';
        syncBackupButtons();
    });
    resetAll.title = 'Восстановить стандартные системные инструкции. Личные профили не изменяются.';
    function syncBackupButtons() {
        const slots = settings().promptBackups || {};
        manualSwap.disabled = !validPromptSnapshot(slots.manual);
        autoSwap.disabled = !validPromptSnapshot(slots.automatic);
    }
    syncBackupButtons();
    // Maintenance controls are available on demand, not a wall of
    // competing buttons above the actual list of generation profiles.
    const maintenance=document.createElement('details');maintenance.className='spi-profile-maintenance';
    const maintenanceTitle=document.createElement('summary');
    maintenanceTitle.textContent='Управление · импорт и резервные копии';
    maintenance.append(maintenanceTitle,transfer,backups,backupInfo);

    if(pending.size)dialog.append(copy);
    dialog.append(maintenance,scroll,footer);
    return closed;
}
function openExtraRuleEditor(existing=null,refresh=()=>{}){
    const {dialog,close}=shell(existing?'SP Imagen · Изменить правило':'SP Imagen · Новый дополнительный промпт','spi-prompt-window spi-custom-profile-editor');
    const form=document.createElement('div');form.className='spi-custom-profile-form';
    const name=document.createElement('input');name.type='text';name.maxLength=100;name.value=existing?.name||'';name.placeholder='Например, Ракурсы';
    formField(form,'Название правила',name,'Видно только в списке правил; не добавляется в инструкции режиссёра.');
    const prompt=document.createElement('textarea');prompt.className='spi-custom-prompt';prompt.maxLength=20000;prompt.value=existing?.prompt||'';prompt.spellcheck=false;
    formField(form,'Дополнительный промпт · дословно',prompt,'Весь текст без перефразирования передаётся режиссёру при каждом активном формате. Сам по себе он не вставляется в начало NAI5.');
    const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=existing?.enabled!==false;
    formField(form,'Применять ко всем профилям',enabled,'Сними галочку, чтобы сохранить правило, не передавая его режиссёру.');
    const status=document.createElement('p');status.className='spi-status';status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='spi-dialog-actions';
    if(existing)button('Удалить правило',actions,()=>{if(!confirm('Удалить дополнительное правило «'+existing.name+'»?'))return;settings().extraPrompts=settings().extraPrompts.filter(x=>x.id!==existing.id);saveSettings();close();refresh();});
    button('Отмена',actions,close);
    button('Сохранить',actions,()=>{
        const rule=normalizeExtraRule({id:existing?.id||'rule_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),name:name.value,prompt:prompt.value,enabled:enabled.checked});
        if(!rule){status.textContent='Заполни название и текст правила.';return;}
        const store=settings(),at=store.extraPrompts.findIndex(x=>x.id===rule.id);
        if(at>=0)store.extraPrompts[at]=rule;else store.extraPrompts.push(rule);
        saveSettings();close();refresh();
    },true);
    dialog.append(form,status,actions);
    if(!window.matchMedia?.('(pointer:coarse)').matches)name.focus({preventScroll:true});
}
function openCustomProfileEditor(existing=null,refresh=()=>{},template=null){
    const seed=existing||template||{},created=!existing;
    const {dialog,close}=shell(created?'SP Imagen · Новый профиль':'SP Imagen · Редактировать профиль','spi-prompt-window spi-custom-profile-editor');
    const form=document.createElement('div');form.className='spi-custom-profile-form';
    const name=document.createElement('input');name.type='text';name.maxLength=100;name.value=seed.name||'';name.placeholder='Например, Портрет в диалоге';
    formField(form,'Название профиля',name,'Так он будет называться в меню генерации и галерее.');
    const kind=select(PROFILE_KINDS,seed.kind||'snapshot');
    formField(form,'Базовый тип разбора',kind,'Определяет стандартное число постов и доступные настройки Comic/Story Page. Полная инструкция ниже — твоя собственная.');
    const field=document.createElement('textarea');field.className='spi-custom-prompt spi-director-prompt';field.maxLength=100000;field.spellcheck=false;
    field.value=seed.directorPrompt||'';
    const getTemplate=()=>experimentalDirectorPrompt(kind.value);
    if(!field.value)field.value=getTemplate();
    const templateActions=document.createElement('div');templateActions.className='spi-dialog-actions';
    button('Взять шаблон выбранного типа',templateActions,()=>{if(field.value.trim()&&!confirm('Заменить введённый текст промпта шаблоном '+PROFILE_KINDS[kind.value]+'?'))return;field.value=getTemplate();});
    button('Начать с чистого листа',templateActions,()=>{if(field.value.trim()&&!confirm('Очистить весь текст собственной инструкции режиссёра?'))return;field.value='';field.focus();});
    form.append(templateActions);
    formField(form,'Полная инструкция собственного режиссёра',field,'Настрой инструкции своего режиссёра. Сохраняй структуру выбранного формата ответа.');
    const visible=document.createElement('input');visible.type='checkbox';visible.checked=seed.visible!==false;
    formField(form,'Показывать по ✧',visible,'Когда галочка выключена, профиль скрыт из меню генерации, но его прежние картинки сохраняются.');
    const advanced=document.createElement('details');advanced.className='spi-profile-advanced';advanced.open=false;
    const summary=document.createElement('summary');summary.textContent='Для опытных · настройка сбора и разбора данных';advanced.append(summary);
    const posts=document.createElement('input');posts.type='number';posts.min=1;posts.max=20;posts.step=1;posts.value=seed.parser?.posts??'';
    posts.placeholder='По общим настройкам';
    formField(advanced,'Сколько RP-постов читать · 1–20',posts,'Пусто — брать число из обычных настроек выбранного типа. Меняет реальное количество считываемых постов.');
    const parser=document.createElement('textarea');parser.className='spi-custom-prompt';parser.maxLength=10000;parser.value=seed.parser?.instructions||'';
    parser.placeholder='Например: выделяй жесты и текущее положение предметов; игнорируй пересказ прошлых событий.';
    formField(advanced,'Дополнительные инструкции разбору сцены',parser,'Этот текст дословно получает режиссёр. Он направляет извлечение деталей из уже собранных постов; механический сбор и очистка сохраняют настройки SP Imagen.');
    const fieldset=document.createElement('fieldset');fieldset.className='spi-profile-checks';
    const legend=document.createElement('legend');legend.textContent='Какие источники и настройки передавать';fieldset.append(legend);
    const switches={};
    for(const [key,[label,help]] of Object.entries(PROFILE_SWITCHES)){
        const row=document.createElement('label');row.className='spi-profile-check';
        const check=document.createElement('input');check.type='checkbox';check.checked=seed.parser?.options?.[key]!==false&&seed.options?.[key]!==false;
        const span=document.createElement('span');span.textContent=label;
        row.append(check,span);addFieldHelp(row,label,help);fieldset.append(row);switches[key]=check;
    }
    advanced.append(fieldset);form.append(advanced);
    const status=document.createElement('p');status.className='spi-status';status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='spi-dialog-actions';
    if(existing)button('Удалить профиль',actions,()=>{
        if(!confirm('Удалить профиль «'+existing.name+'»? Его старые изображения останутся в галерее.'))return;
        settings().customProfiles=settings().customProfiles.filter(x=>x.id!==existing.id);saveSettings();mediaSlots?.refresh?.();close();refresh();
    });
    button('Отмена',actions,close);
    button('Сохранить',actions,()=>{
        const postsValue=posts.value.trim(),number=postsValue===''?null:Number(postsValue);
        if(number!==null&&(!Number.isInteger(number)||number<1||number>20)){status.textContent='Количество постов: от 1 до 20.';return;}
        const profile=normalizeProfile({
            id:existing?.id||'custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
            name:name.value,kind:kind.value,directorPrompt:field.value,visible:visible.checked,
            parser:{posts:number,instructions:parser.value,options:Object.fromEntries(Object.entries(switches).map(([k,el])=>[k,el.checked]))}
        });
        if(!profile){status.textContent='Заполни название и инструкцию режиссёра.';return;}
        const store=settings(),at=store.customProfiles.findIndex(x=>x.id===profile.id);
        if(at>=0)store.customProfiles[at]=profile;else store.customProfiles.push(profile);
        saveSettings();mediaSlots?.refresh?.();close();refresh();
    },true);
    dialog.append(form,status,actions);
    if(!window.matchMedia?.('(pointer:coarse)').matches)name.focus({preventScroll:true});
}
function openAllCodePrompts() {
    const {dialog,close}=shell('SP Imagen · Все системные промпты','spi-all-code-prompts');
    const intro=document.createElement('p');intro.textContent='Здесь все остальные системные инструкции, кроме профилей Snapshot, Comic и Story Page. Изменения действуют только внутри SP Imagen. Каждый текст можно вернуть к исходному.';
    const list=document.createElement('div');list.className='spi-code-prompt-list';
    for (const [key,label] of Object.entries(CODE_PROMPT_LABELS)) {
        const details=document.createElement('details');details.className='spi-code-prompt';
        const summary=document.createElement('summary');summary.textContent=label;details.append(summary);
        const area=document.createElement('textarea');area.value=resolveCodePrompt(settings().codePrompts,key);area.className='spi-code-prompt-area';area.spellcheck=false;
        const actions=document.createElement('div');actions.className='spi-dialog-actions';
        const status=document.createElement('span');status.className='spi-status';
        button('Вернуть исходный',actions,()=>{if(!confirm('Вернуть исходную инструкцию?'))return;delete settings().codePrompts[key];area.value=CODE_PROMPT_DEFAULTS[key];saveSettings();status.textContent='Восстановлено.';});
        button('Сохранить',actions,()=>{if(!area.value.trim()){status.textContent='Пустую инструкцию сохранить нельзя.';return;}settings().codePrompts[key]=area.value;saveSettings();status.textContent='Сохранено.';},true);
        details.append(area,actions,status);list.append(details);
    }
    const footer=document.createElement('div');footer.className='spi-dialog-actions';button('Закрыть',footer,close,true);
    dialog.append(intro,list,footer);
}

function formField(parent, labelText, control, note = '') {
    const label = document.createElement('label');
    label.className = 'spi-field';
    const title = document.createElement('span');
    title.textContent = labelText;
    label.append(title, control);
    if (note) { const small = document.createElement('small'); small.textContent = note; label.append(small); }
    addFieldHelp(label, labelText, note);
    parent.append(label);
    return control;
}

function input(value = '', type = 'text') {
    const node = document.createElement('input');
    node.type = type; node.value = value;
    return node;
}

function select(options, value) {
    const node = document.createElement('select');
    for (const [key, label] of Object.entries(options)) {
        const option = document.createElement('option'); option.value = key; option.textContent = label; node.append(option);
    }
    node.value = value;
    return node;
}

function openTextApiSettings({ back = false } = {}) {
    const draft = clone(settings().textApi || defaultTextApiSettings());
    const { dialog, close, closed } = shell('SP Imagen · Текстовая модель', 'spi-connection-window', { back });
    const grid = document.createElement('div'); grid.className = 'spi-form-grid';
    const status = document.createElement('p'); status.className = 'spi-status'; status.setAttribute('role', 'status');
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
    // Mount the complete dialog before any asynchronous profile discovery.
    dialog.append(grid, status, actions);
    const mode = select({ st: 'Профиль подключения SillyTavern', direct: 'Прямой OpenAI-совместимый API' }, draft.mode);
    formField(grid, 'Откуда брать модель', mode);
    const profile = document.createElement('select');
    const profileControl = formField(grid, 'Профиль SillyTavern', profile, 'Основной RP-чат не переключается.');
    const refreshProfilesButton = button('↻ Обновить профили', grid, () => void refreshProfiles());
    refreshProfilesButton.classList.add('spi-refresh-profiles');
    const endpoint = input(draft.endpoint); const endpointControl = formField(grid, 'Endpoint', endpoint, 'Адрес до /v1; SP Imagen добавит /chat/completions.');
    const model = input(draft.model); const modelControl = formField(grid, 'Модель', model, 'Точное ID модели вашего API.');
    const token = input(draft.apiKey, 'password'); token.autocomplete = 'off';
    const tokenWrap = document.createElement('div'); tokenWrap.className = 'spi-token-row'; tokenWrap.append(token);
    button('Показать', tokenWrap, () => { token.type = token.type === 'password' ? 'text' : 'password'; tokenWrap.lastElementChild.textContent = token.type === 'password' ? 'Показать' : 'Скрыть'; });
    const tokenControl = formField(grid, 'API-ключ', tokenWrap, 'Не попадает в экспорты SP Imagen.');
    const temperature = input(draft.temperature, 'number'); temperature.min = '0'; temperature.max = '2'; temperature.step = '0.1'; formField(grid, 'Temperature', temperature);
    const maxTokens = input(draft.maxTokens, 'number'); maxTokens.min = '1000'; maxTokens.max = '100000'; maxTokens.step = '1000'; formField(grid, 'Максимум токенов', maxTokens);
    const streaming=input('','checkbox');streaming.checked=draft.streaming;
    formField(grid,'Streaming · потоковый ответ',streaming,'Режиссёр получает готовый результат после завершения потока.');
    const jsonMode=input('','checkbox');jsonMode.checked=draft.jsonMode;
    formField(grid,'JSON Mode · прямой API',jsonMode,'Включай только если модель поддерживает response_format: json_object. Для профилей SillyTavern настройка не применяется.');
    const jailbreak=input('','checkbox');jailbreak.checked=draft.jailbreak;
    formField(grid,'Jailbreak · дополнительная system-инструкция',jailbreak,'Необязательная собственная инструкция. Может повлиять на строгий формат HTML.');
    const jailbreakText=document.createElement('textarea');jailbreakText.className='spi-short-area';jailbreakText.value=draft.jailbreakText;
    const jailbreakControl=formField(grid,'Текст Jailbreak',jailbreakText,'Включается только галочкой.');
    const reasoningMode=select({inherit:'Как в профиле / по умолчанию',off:'Отключить (если модель поддерживает)',effort:'Уровень reasoning',budget:'Бюджет reasoning'},draft.reasoningMode);
    formField(grid,'Reasoning',reasoningMode);
    const reasoningProtocol=select({auto:'Определить по провайдеру',openrouter:'OpenRouter',openai:'OpenAI'},draft.reasoningProtocol);
    const protocolControl=formField(grid,'Протокол reasoning',reasoningProtocol,'Для нестандартного прокси укажи протокол вручную.');
    const reasoningEffort=select({minimal:'Minimal',low:'Low',medium:'Medium',high:'High',xhigh:'XHigh'},draft.reasoningEffort);
    const effortControl=formField(grid,'Уровень',reasoningEffort,'Доступные уровни зависят от конкретной модели.');
    const reasoningBudget=input(draft.reasoningBudget,'number');reasoningBudget.min='128';reasoningBudget.max='100000';reasoningBudget.step='128';
    const budgetControl=formField(grid,'Бюджет токенов',reasoningBudget,'Только прямой API OpenRouter.');
    const readDraft = () => normalizeTextApiSettings({
      ...draft,mode:mode.value,profileId:profile.value,endpoint:endpoint.value,apiKey:token.value,
      model:model.value,temperature:Number(temperature.value),maxTokens:Number(maxTokens.value),
      streaming:streaming.checked,jsonMode:jsonMode.checked,jailbreak:jailbreak.checked,jailbreakText:jailbreakText.value,
      reasoningMode:reasoningMode.value,reasoningProtocol:reasoningProtocol.value,
      reasoningEffort:reasoningEffort.value,reasoningBudget:Number(reasoningBudget.value)
    });
    const approveTarget = next => {
        if (next.mode !== 'direct') return next;
        const origin = directTextOrigin(next.endpoint);
        if (next.approvedOrigin !== origin) {
            const warning = 'Этот API-сервер получит твой ключ и отправляемые режиссёру данные.\n\nАдрес: '+origin
              +'\n\nРазрешить передачу ТОЛЬКО этому серверу? Отмена заблокирует запрос.';
            if (!window.confirm(warning)) throw new Error('Подключение к стороннему API не разрешено.');
            next.approvedOrigin = origin;
            draft.approvedOrigin = origin;
        }
        return next;
    };
    const refreshMode = () => {
        profileControl.parentElement.hidden = mode.value !== 'st';
        refreshProfilesButton.hidden = mode.value !== 'st';
        for (const control of [endpointControl, modelControl, tokenControl]) control.parentElement.hidden = mode.value !== 'direct';
        temperature.parentElement.hidden=mode.value==='st'||reasoningMode.value!=='inherit';
        jailbreakControl.parentElement.hidden=!jailbreak.checked;
        protocolControl.parentElement.hidden=reasoningMode.value==='inherit';
        effortControl.parentElement.hidden=reasoningMode.value!=='effort';
        budgetControl.parentElement.hidden=reasoningMode.value!=='budget';
    };
    for(const control of [mode,reasoningMode,jailbreak])control.addEventListener('change',refreshMode);
    const fillProfiles = (profiles, selected) => {
        profile.replaceChildren();
        const option = document.createElement('option'); option.value = ''; option.textContent = 'Выбери профиль'; profile.append(option);
        for (const item of profiles) {
            const child = document.createElement('option'); child.value = item.id; child.textContent = item.name; profile.append(child);
        }
        // The saved choice is preserved if discovery fails or the profile was renamed.
        if (selected && !profiles.some(item => item.id === selected)) {
            const saved = document.createElement('option'); saved.value = selected; saved.textContent = 'Сохранённый профиль (' + selected + ')'; profile.append(saved);
        }
        profile.value = selected || '';
    };
    let discoverRun = 0;
    let disposed = false;
    async function refreshProfiles() {
        const currentRun = ++discoverRun;
        refreshProfilesButton.disabled = true;
        status.textContent = 'Загружаю профили SillyTavern…';
        try {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Не удалось получить список профилей за 8 секунд. Можно попробовать ещё раз или выбрать прямой API.')), 8000);
            });
            let profiles;
            try { profiles = await Promise.race([listSillyTavernProfiles(context()), timeout]); }
            finally { clearTimeout(timer); }
            if (disposed || currentRun !== discoverRun) return;
            fillProfiles(profiles, profile.value);
            status.textContent = profiles.length ? `Найдено профилей: ${profiles.length}.` : 'Список профилей пуст. Проверь Connection Manager SillyTavern или выбери прямой API.';
        } catch (error) {
            if (disposed || currentRun !== discoverRun) return;
            status.textContent = String(error?.message || error);
        } finally {
            if (!disposed && currentRun === discoverRun) refreshProfilesButton.disabled = false;
        }
    }
    fillProfiles([], draft.profileId);
    refreshMode();
    button('Проверить подключение', actions, async event => {
        const control = event.currentTarget; control.disabled = true; status.textContent = 'Проверяю подключение…';
        try {
            const next = approveTarget(readDraft());
            if (next.mode === 'st') { await testSillyTavernProfile(context(), next, undefined, resolveCodePrompt(settings().codePrompts,'text_profile_connection_test')); status.textContent = 'Выбранный профиль SillyTavern ответил.'; }
            else { const models = await testTextApi(next); status.textContent = models.length ? `Подключение работает. Моделей найдено: ${models.length}.` : 'Подключение ответило, но список моделей пуст.'; }
        } catch (error) { status.textContent = String(error?.message || error); }
        finally { control.disabled = false; }
    });
    button('Проверить параметры · 1 текстовый запрос',actions,async event=>{
      const control=event.currentTarget;control.disabled=true;
      status.textContent='Проверяю настройки реальным запросом к модели. Он может быть платным…';
      try {
       const next=approveTarget(readDraft());
       const response=await generateTextCompletion({...next,maxTokens:Math.max(1000,Math.min(2048,next.maxTokens))},
         [{role:'system',content:'Answer only OK.'},{role:'user',content:'OK'}],undefined,context());
       status.textContent='Ответ модели: '+response.slice(0,150);
      }catch(error){status.textContent='Режим не подтверждён: '+String(error?.message||error);}
      finally{control.disabled=false;}
    });
    button('Отмена', actions, close);
    button('Сохранить', actions, () => {
        let next;
        try { next = approveTarget(readDraft()); }
        catch(error){status.textContent=String(error?.message||error);return;}
        if (next.mode === 'st' && !next.profileId) { status.textContent = 'Выбери отдельный профиль SillyTavern.'; return; }
        if (next.mode === 'direct' && (!next.endpoint || !next.apiKey || !next.model)) { status.textContent = 'Заполни endpoint, API-ключ и модель.'; return; }
        if(next.jailbreak&&!next.jailbreakText.trim()){status.textContent='Jailbreak включён, но текст пуст.';return;}
        try{
         const profile=next.mode==='st'?context().ConnectionManagerRequestService?.getProfile?.(next.profileId):null;
         if(next.reasoningMode!=='inherit')reasoningRequestOptions(next,profile,next.mode==='st');
        }catch(error){status.textContent=String(error?.message||error);return;}
        settings().textApi = next; saveSettings(); close();
    }, true);
    void closed.then(() => { disposed = true; discoverRun++; });
    void refreshProfiles();
    return closed;
}

function openNovelAISettings({ back = false } = {}) {
    const draft = clone(settings().novelai || defaultNovelAISettings());
    const { dialog, close, closed } = shell('SP Imagen · Подключение NovelAI', 'spi-connection-window', { back });
    const grid = document.createElement('div'); grid.className = 'spi-form-grid';
    const status = document.createElement('p'); status.className = 'spi-status'; status.setAttribute('role', 'status');
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
    dialog.append(grid, status, actions);
    try {
    const enabled = input('', 'checkbox'); enabled.checked = draft.enabled;
    formField(grid, 'Генерировать напрямую через NovelAI', enabled, 'Картинки создаются самим SP Imagen, без SillyImages и временных постов.');
    const neverSpend = input('', 'checkbox'); neverSpend.checked = draft.neverSpendAnlas;
    formField(grid, 'Ни в коем случае не тратить Anlas', neverSpend, 'Проверяет Opus и доступный лимит перед каждой отправкой.');
    const token = input(draft.apiKey, 'password'); token.autocomplete = 'off';
    const tokenWrap = document.createElement('div'); tokenWrap.className = 'spi-token-row'; tokenWrap.append(token);
    button('Показать', tokenWrap, () => { token.type = token.type === 'password' ? 'text' : 'password'; tokenWrap.lastElementChild.textContent = token.type === 'password' ? 'Показать' : 'Скрыть'; });
    formField(grid, 'Постоянный API-токен NovelAI', tokenWrap, 'Токен NovelAI, обычно начинается с pst-.');
    const endpoint = input(OFFICIAL_NOVELAI_ORIGIN);
    endpoint.readOnly = true;
    formField(grid, 'Защищённый адрес NovelAI', endpoint, 'Фиксирован: ключ отправляется только на официальный сервер. Сторонние адреса запрещены.');
    const model = select(NOVELAI_MODELS, draft.model); formField(grid, 'Модель', model);
    const resolution = select({ small: 'Small', normal: 'Normal', big: 'Big' }, draft.resolution); formField(grid, 'Размер', resolution, 'При защите Anlas используется Normal.');
    const steps = input(draft.steps, 'number'); steps.min = '1'; steps.max = '50'; formField(grid, 'Steps', steps);
    const cfg = input(draft.cfgScale, 'number'); cfg.min = '0'; cfg.max = '10'; cfg.step = '0.1'; formField(grid, 'CFG scale', cfg);
    const rescale = input(draft.cfgRescale, 'number'); rescale.min = '0'; rescale.max = '1'; rescale.step = '0.01'; formField(grid, 'CFG rescale', rescale);
    const sampler = select(NOVELAI_SAMPLERS, draft.sampler); formField(grid, 'Sampler', sampler);
    const seed = input(draft.seed, 'number'); seed.min = '-1'; seed.max = '4294967295'; formField(grid, 'Seed', seed, '-1 создаёт новый вариант при каждом запуске.');
    const negative = document.createElement('textarea'); negative.className = 'spi-short-area'; negative.value = draft.negativePrompt;
    const negativeField=formField(grid, 'Негативный промпт', negative, 'Настраивается для Full/Curated; в V5 Full Medium NovelAI использует собственный фиксированный Undesired Content.');
    const updateModelFields=()=>{negativeField.parentElement.hidden=model.value==='nai-diffusion-5-full-medium';};
    model.addEventListener('change',updateModelFields);updateModelFields();
    const readDraft = () => normalizeNovelAISettings({
        ...draft, enabled: enabled.checked, neverSpendAnlas: neverSpend.checked,
        apiKey: token.value, endpoint: OFFICIAL_NOVELAI_ORIGIN, model: model.value, resolution: resolution.value,
        steps: Number(steps.value), cfgScale: Number(cfg.value), cfgRescale: Number(rescale.value),
        sampler: sampler.value, seed: Number(seed.value), negativePrompt: negative.value,
    });
    button('Проверить подключение', actions, async event => {
        const control = event.currentTarget; control.disabled = true; status.textContent = 'Проверяю подписку NovelAI…';
        try {
            const subscription = await checkNovelAISubscription(readDraft());
            const tier = subscription?.tier === 3 ? 'Opus' : `уровень ${subscription?.tier ?? '?'}`;
            const usage = subscription?.usage;
            status.textContent = `Подключение работает: ${tier}. Основной остаток: ${Number(usage?.percent ?? 0).toFixed(1)}%; дополнительный: ${Number(usage?.purchasedPercent ?? 0).toFixed(1)}%.`;
        } catch (error) { status.textContent = String(error?.message || error); }
        finally { control.disabled = false; }
    });
    button('Отмена', actions, close);
    button('Сохранить', actions, () => {
        const next = readDraft();
        try { officialNovelAIEndpoint(next.endpoint); }
        catch(error){status.textContent=String(error?.message||error);return;}
        if (next.enabled && !next.apiKey) { status.textContent = 'Поле «API-токен NovelAI» пустое. Для автономной генерации требуется токен NovelAI.'; token.focus(); return; }
        const root = settings(); root.novelai = next; saveSettings(); close();
    }, true);
    requestAnimationFrame(() => enabled.focus());
    } catch (error) {
        status.textContent = 'Не удалось открыть настройки: ' + String(error?.message || error);
        button('Закрыть', actions, close);
        console.error('[SP Imagen] NovelAI settings', error);
    }
    return closed;
}

function openStyleLibrary({ back = false } = {}) {
    const rootSettings = settings();
    let novelai = rootSettings.novelai;
    const { dialog, close, closed } = shell('SP Imagen · Стили', 'spi-style-window', { back });
    const layout = document.createElement('div'); layout.className = 'spi-style-layout';
    const library = document.createElement('section'); library.className = 'spi-style-library';
    const editor = document.createElement('section'); editor.className = 'spi-style-editor';
    const editorTitle = document.createElement('h3'); editorTitle.textContent = 'Редактор';
    const editorStatus = document.createElement('p'); editorStatus.className = 'spi-status';
    const name = input(''); const value = document.createElement('textarea');
    value.placeholder = 'Например: 0.5::artist:name::, soft warm light, delicate lineart';
    const nameField = formField(editor, 'Название', name);
    const valueField = formField(editor, 'Стиль-префикс', value);
    nameField.parentElement.hidden = true; valueField.parentElement.hidden = true;
    editor.prepend(editorTitle);
    editor.append(editorStatus);
    let selectedId = novelai.activeStyleId || novelai.styles[0]?.id || '';

    const persist = () => {
        rootSettings.novelai = novelai = normalizeNovelAISettings(novelai);
        saveSettings();
    };
    const current = () => novelai.styles.find(style => style.id === selectedId);
    const syncEditor = () => {
        const style = current();
        nameField.parentElement.hidden = !style; valueField.parentElement.hidden = !style;
        name.value = style?.name || ''; value.value = style?.value || '';
        editorStatus.textContent = style ? (novelai.activeStyleId === style.id ? 'Активный стиль · автосохранение' : 'Выбран для редактирования · автосохранение') : 'Выбери или создай стиль.';
    };
    let noneStyleButton = null;
    const syncListState = () => {
        noneStyleButton?.classList.toggle('spi-active', !novelai.activeStyleId);
        for (const row of library.querySelectorAll('.spi-style-row')) {
            const id = row.dataset.styleId;
            const active = novelai.activeStyleId === id;
            row.classList.toggle('spi-selected', selectedId === id);
            const control = row.querySelector('[data-style-activate]');
            if (control) {
                control.textContent = active ? '●' : '○';
                control.title = active ? 'Выключить стиль' : 'Сделать активным';
            }
        }
    };
    const renderList = () => {
        const scrollTop = library.scrollTop, scrollLeft = library.scrollLeft;
        library.replaceChildren();
        const heading = document.createElement('h3'); heading.textContent = 'Библиотека стилей'; library.append(heading);
        button('+ Новый стиль', library, () => {
            const style = { id: `spi-style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `Стиль ${novelai.styles.length + 1}`, value: '' };
            novelai.styles.push(style); selectedId = style.id; persist(); renderList(); syncEditor(); name.focus({preventScroll:true}); name.select();
        }, true);
        button('Импорт из Inline Images', library, () => {
            const source = context().extensionSettings?.inline_image_gen;
            const sourceStyles = Array.isArray(source?.styles) ? source.styles : [];
            if (!sourceStyles.length) { editorStatus.textContent = 'В Inline Images не найдены стили.'; return; }
            const signatures = new Set(novelai.styles.map(style => `${style.name}\n${style.value}`));
            let added = 0, importedActive = '';
            for (const item of sourceStyles) {
                const candidate = { id: `spi-style-${Date.now()}-${added}-${Math.random().toString(36).slice(2, 8)}`, name: String(item?.name || '').trim() || `Стиль ${novelai.styles.length + 1}`, value: String(item?.value || '').trim() };
                const signature = `${candidate.name}\n${candidate.value}`;
                if (signatures.has(signature)) continue;
                signatures.add(signature); novelai.styles.push(candidate); added++;
                if (item?.id && item.id === source.activeStyleId) importedActive = candidate.id;
            }
            if (importedActive) novelai.activeStyleId = importedActive;
            if (added) { selectedId = importedActive || novelai.styles.at(-1).id; persist(); renderList(); syncEditor(); }
            editorStatus.textContent = added ? `Импортировано стилей: ${added}.` : 'Все стили Inline Images уже есть в SP Imagen.';
        });
        noneStyleButton = button('◉ Без стиля', library, () => { novelai.activeStyleId = ''; persist(); syncListState(); syncEditor(); });
        noneStyleButton.classList.toggle('spi-active', !novelai.activeStyleId);
        for (const style of novelai.styles) {
            const row = document.createElement('div'); row.className = `spi-style-row${selectedId === style.id ? ' spi-selected' : ''}`;
            row.dataset.styleId = style.id;
            const activate = button(novelai.activeStyleId === style.id ? '●' : '○', row, event => {
                event.stopPropagation(); novelai.activeStyleId = novelai.activeStyleId === style.id ? '' : style.id; selectedId = style.id; persist(); syncListState(); syncEditor();
            });
            activate.dataset.styleActivate = '';
            activate.title = novelai.activeStyleId === style.id ? 'Выключить стиль' : 'Сделать активным';
            const summary = document.createElement('button'); summary.type = 'button'; summary.className = 'spi-style-summary';
            const strong = document.createElement('strong'); strong.textContent = style.name;
            const small = document.createElement('small'); small.textContent = style.value || 'Пустой стиль';
            summary.append(strong, small); summary.onclick = () => { selectedId = style.id; syncListState(); syncEditor(); };
            const duplicate = button('⧉', row, event => {
                event.stopPropagation(); const copy = { ...clone(style), id: `spi-style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `${style.name} — копия` };
                novelai.styles.push(copy); selectedId = copy.id; persist(); renderList(); syncEditor();
            });
            duplicate.title = 'Дублировать';
            const remove = button('🗑', row, event => {
                event.stopPropagation(); if (!confirm(`Удалить стиль «${style.name}»?`)) return;
                novelai.styles = novelai.styles.filter(item => item.id !== style.id);
                if (novelai.activeStyleId === style.id) novelai.activeStyleId = '';
                if (selectedId === style.id) selectedId = novelai.styles[0]?.id || '';
                persist(); renderList(); syncEditor();
            });
            remove.title = 'Удалить';
            row.replaceChildren(activate, summary, duplicate, remove); library.append(row);
        }
        library.scrollTop = scrollTop;
        library.scrollLeft = scrollLeft;
    };
    const saveEditor = () => {
        const style = current(); if (!style) return;
        style.name = name.value.trim() || style.name; style.value = value.value.trim(); persist();
        editorStatus.textContent = 'Сохранено автоматически.';
        const row = [...library.querySelectorAll('.spi-style-row')].find(node => node.dataset.styleId === style.id);
        if (!row) renderList(); else { row.querySelector('strong').textContent = style.name; row.querySelector('small').textContent = style.value || 'Пустой стиль'; }
    };
    name.addEventListener('input', saveEditor); value.addEventListener('input', saveEditor);
    renderList(); syncEditor(); layout.append(library, editor);
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions'; button('Готово', actions, close, true);
    dialog.append(layout, actions);
    return closed;
}

async function openLibrary() {
    migratePreviousChatData();
    return (await getLibraryRuntime()).openLibraryEditor();
}

function openHub(page = 'home') {
    migratePreviousChatData();
    if (activeHub?.dialog.isConnected) {
        activeHub.setCollapsed(false);
        activeHub.dialog.querySelector('button:not([hidden])')?.focus();
        return activeHub.close;
    }
    let currentPage = page;
    const render = nextPage => {
        currentPage = nextPage;
        body.replaceChildren();
        backButton.hidden = currentPage === 'home';
        heading.textContent = currentPage === 'home' ? 'SP Imagen' : 'SP Imagen · Настройки';
        if (currentPage === 'home') {
            button('⚙ Настройки', body, () => render('settings')).dataset.spiAction = 'settings';
            const prompts = button(`✎ Профили${hasNew() ? '  NEW!' : ''}`, body, () => void openPromptCenter({ backToHub: true }));
            prompts.dataset.spiPrompts = ''; prompts.dataset.spiAction = 'prompts';
            button('▤ Все промпты', body, openAllCodePrompts).dataset.spiAction='all-prompts';
            button('▤ Посмотреть последний промпт', body, openLastPrompt).dataset.spiAction = 'last-prompt';
            button('📚 Библиотека', body, () => void openRuntimeChild(openLibrary)).dataset.spiAction = 'library';
        } else {
            button('Генерация', body, () => void openRuntimeChild(() => getRuntime().then(api => api.openSettings()))).dataset.spiAction = 'generation';
            button('Текстовая модель', body, () => void openTextApiSettings({ back: true })).dataset.spiAction = 'text-api';
            button('NovelAI', body, () => void openNovelAISettings({ back: true })).dataset.spiAction = 'novelai';
            button('Стили', body, () => void openStyleLibrary({ back: true })).dataset.spiAction = 'styles';
        }
        // A quiet, always-accessible entry, not another large menu button.
        const quick = document.createElement('button');
        quick.type = 'button';
        quick.className = 'spi-guide-link';
        quick.textContent = '💡 Быстрый гайд';
        quick.title = 'Небольшая экскурсия для первого знакомства с SP Imagen';
        quick.addEventListener('click', () => void launchQuickGuide());
        body.append(quick);
        body.querySelector('button')?.focus();
    };
    const { overlay, dialog, close, heading, backButton, setCollapsed } = shell('SP Imagen', 'spi-hub', {
        back: () => render('home'),
        onClose: () => { activeHub = null; },
    });
    activeHub = { dialog, close, setCollapsed, render };
    const body = document.createElement('nav');
    body.className = 'spi-hub-menu';
    body.setAttribute('aria-label', 'Разделы SP Imagen');
    dialog.append(body);
    const openRuntimeChild = async opener => {
        if (overlay.inert) return;
        overlay.inert = true;
        hubChildOpen = true;
        try { await opener(); }
        catch (error) { toastr.error(String(error?.message || error), 'SP Imagen'); }
        finally {
            hubChildOpen = false;
            if (overlay.isConnected) { overlay.inert = false; body.querySelector('button')?.focus(); }
        }
    };
    render(currentPage);
    return close;
}


// Navigation is part of the existing SP Imagen dialogs, not a parallel UI implementation.
// The guide never generates an image, sends a model request or saves user settings.
// Navigate actual SP Imagen screens. Keep the library mounted while introducing its fields.
async function showGuideSection(view) {
    if (view.startsWith('post-')) {
        if (view === 'post-star') {
            // Leave all editing dialogs using their normal close handlers before touring the chat.
            for (const overlay of [...document.querySelectorAll('.spi-overlay')].reverse()) {
                overlay.querySelector('.spi-close')?.click();
            }
            activeHub?.close?.();
        }
        return mediaSlots?.guideStep?.(view) ?? null;
    }
    const isLibrary = view === 'library' || view.startsWith('library-');
    const libraryOverlay = document.querySelector('#sp-imagen-review-overlay');
    if (isLibrary && libraryOverlay) {
        if (view === 'library') {
            // Only the actual Back control may leave a draft editor. Never discard or save it for the guide.
            libraryOverlay.querySelector('.ness-editor-back')?.click();
        } else if (view !== 'library-footer') {
            const api = await getLibraryRuntime();
            api.openFirstVisibleRecordForGuide();
        }
        const tabNames = {
            'library-appearance':'Внешность',
            'library-skin':'Внешность',
            'library-nsfw':'Внешность',
            'library-aliases':'Другие имена',
            'library-prompt':'Данные для промпта',
        };
        const tab = tabNames[view];
        if (tab) {
            const element = [...libraryOverlay.querySelectorAll('[role="tab"]')].find(node => node.textContent.trim() === tab);
            if(element?.getAttribute('aria-selected')!=='true')element?.click();
        }
        // The tour changes only which mode is visible. It never saves or
        // mutates the user's selected appearance tags.
        const modeLabel = view==='library-appearance'?'Ракурсы'
            :view==='library-skin'?'Под одеждой'
            :view==='library-nsfw'?'NSFW':null;
        if(modeLabel){
            const button=[...libraryOverlay.querySelectorAll('.ness-tagboard-modes button')]
              .find(node=>node.textContent.trim()===modeLabel);
            if(button?.getAttribute('aria-pressed')!=='true')button?.click();
        }
        return;
    }
    // All previous feature panels are dismissed by their existing close handlers.
    const otherOverlays = [...document.querySelectorAll('.spi-overlay')].filter(node => !node.querySelector('.spi-hub'));
    for (const overlay of otherOverlays.reverse()) overlay.querySelector('.spi-close')?.click();
    if (libraryOverlay) {
        const closeLibrary=libraryOverlay.querySelector('.ness-close-dialog');
        closeLibrary?.click();
        if (libraryOverlay.isConnected) {
            if (!confirm('В библиотеке остались несохранённые изменения. Закрыть без сохранения и продолжить обучение?')) {
                throw new Error('Сначала сохрани библиотеку или закрой её вручную, чтобы продолжить обучение.');
            }
            closeLibrary?.click();
        }
    }
    await Promise.resolve();
    if (view === 'finish') return;
    openHub();
    if (['settings','text-api','novelai','generation','styles'].includes(view)) activeHub?.render('settings');
    else activeHub?.render('home');
    if (view === 'home' || view === 'settings') return;
    if (view === 'prompts') openPromptCenter();
    else if (view === 'text-api') void openTextApiSettings().catch(error => console.warn('[SP Imagen] guide text API:',error));
    else if (view === 'novelai') void openNovelAISettings().catch(error => console.warn('[SP Imagen] guide NovelAI:',error));
    else if (view === 'styles') void openStyleLibrary().catch(error => console.warn('[SP Imagen] guide styles:',error));
    else if (isLibrary) {
        const api = await getLibraryRuntime();
        void api.openLibraryEditor().catch(error => console.warn('[SP Imagen] guide library:',error));
        // Re-enter the requested subpage when navigating backwards from another feature.
        if(view!=='library'&&view!=='library-footer'){
            for(let attempt=0;attempt<14;attempt++){
                if(document.querySelector('#sp-imagen-review-overlay'))return showGuideSection(view);
                await new Promise(resolve=>setTimeout(resolve,55));
            }
        }
    } else if (view === 'generation') {
        if (!context().chatMetadata) return;
        const api = await getRuntime();
        void api.openSettings().catch(error => console.warn('[SP Imagen] guide settings:',error));
    }
}

function launchQuickGuide() {
    let hasCharacters = false;
    try {
        const api = libraryRuntime ?? createSpImagenLibraryRuntime({getExtension:()=>extensionApi,libraryStore});
        hasCharacters = api.utilities.libraryEntries(api.utilities.loadMasterLibrary()).length > 0;
    } catch (error) { console.warn('[SP Imagen] library guide availability:',error); }
    return startQuickGuide({ navigate: showGuideSection, steps: makeGuideSteps(hasCharacters), onExit: () => mediaSlots?.endGuideDemo?.() });
}

function openLastPrompt() {
    migratePreviousChatData();
    const variables = context().chatMetadata?.variables || {};
    const finalPrompt = String(variables.sp_imagen_last_final_image_prompt || '').trim();
    const directorOutput = String(variables.sp_imagen_last_director_raw || '').trim();
    const { dialog, close } = shell('SP Imagen · Последний промпт', 'spi-prompt-window');
    const toolbar = document.createElement('div');
    toolbar.className = 'spi-dialog-actions spi-last-prompt-toolbar';
    const selection = document.createElement('select');
    selection.setAttribute('aria-label', 'Что показать');
    for (const [value, label] of [['final', 'Итоговый промпт NovelAI'], ['director', 'Последний ответ режиссёра']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        selection.append(option);
    }
    const area = document.createElement('textarea');
    area.readOnly = true;
    area.spellcheck = false;
    area.setAttribute('aria-label', 'Сохранённый текст промпта');
    const status = document.createElement('p');
    status.className = 'spi-status';
    status.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'spi-dialog-actions';
    const show = () => {
        const value = selection.value === 'director' ? directorOutput : finalPrompt;
        area.value = value;
        status.textContent = value ? `${value.length.toLocaleString('ru-RU')} символов. Только просмотр.`
            : 'В этом чате такого промпта ещё нет. Он сохранится после следующего запроса.';
    };
    selection.addEventListener('change', show);
    toolbar.append(selection);
    addFieldHelp(toolbar, 'Что показать', 'Выбирай между готовым заданием для NovelAI и исходным ответом режиссёра. Это только просмотр и копирование, без новой генерации.');
    button('Скопировать', actions, async () => {
        if (!area.value) { status.textContent = 'Пока нечего копировать.'; return; }
        try {
            await navigator.clipboard.writeText(area.value);
            status.textContent = 'Промпт скопирован.';
        } catch {
            area.focus(); area.select();
            status.textContent = 'Выделила текст. Используй «Копировать» в меню телефона.';
        }
    });
    button('Закрыть', actions, close);
    dialog.append(toolbar, area, status, actions);
    show();
}

function getDirector(kind,{includeText=true}={}) {
    const builtin=experimentalProfileFor(kind);
    if(builtin)return {name:builtin.name,prompt:experimentalDirectorPrompt(builtin.kind,{includeText}),source:'bundled',baseKind:builtin.kind,structured:true};
    const personal=profileById(settings(),kind);
    if(personal)return {name:personal.name,prompt:personal.directorPrompt,source:'custom',baseKind:personal.kind,structured:isStructuredDirectorPrompt(personal.directorPrompt)};
    return null;
}

async function generateText(_kind, messages, signal) {
    return await generateTextCompletion(settings().textApi, messages, signal, context());
}

async function persistImageSource(source) {
    const value = String(source || '');
    const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([a-z\d+/=]+)$/i);
    if (!match) return value;
    const extension = /^png$/i.test(match[1]) ? 'png' : /^webp$/i.test(match[1]) ? 'webp' : 'jpeg';
    return await saveBase64AsFile(match[2], 'sp-imagen', `image_${Date.now()}`, extension);
}

function activeStyle(novelai = settings().novelai) {
    return novelai.styles.find(style => style.id === novelai.activeStyleId) || null;
}

function directGenerationEnabled() {
    return settings().novelai.enabled === true;
}

function listImageStyles() {
    return settings().novelai.styles.map(style => ({id: style.id, name: style.name, value: style.value}));
}

function saveImageStyle({name, value}) {
    const title = String(name || '').trim().slice(0, 90);
    const description = String(value || '').trim().slice(0, 20000);
    if (!title) throw new Error('Укажи название нового стиля.');
    if (!description) throw new Error('Нельзя сохранить пустой стиль.');
    const state = settings();
    const duplicate = state.novelai.styles.some(style => style.name.toLocaleLowerCase() === title.toLocaleLowerCase());
    if (duplicate) throw new Error('Стиль с таким названием уже есть. Укажи другое название.');
    const style = {id: `spi-style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: title, value: description};
    // Never change activeStyleId here: saving a style from a single image must not
    // apply it to the user's other images or chats.
    state.novelai.styles.push(style);
    saveSettings();
    return {...style};
}

function snapshotGenerationConfig(config, kind='snapshot') {
    const saved=settings().novelai;
    // Preserve settings necessary for a resumed request, but NEVER store credentials.
    const {apiKey, endpoint, enabled, styles, activeStyleId, ...publicSettings}=saved;
    const profile=profileById(settings(),kind);
    if(profile?.parser?.options?.useNegativePrompt===false)publicSettings.negativePrompt='';
    const style=profile?.parser?.options?.useArtStyle===false
        ? {id:'',name:'Без стиля',value:''}
        : clone(activeStyle(saved)||{id:'',name:'Без стиля',value:''});
    return {
        ...clone(config), kind,
        spImagenDirect: {version:1,provider:'novelai',style,settings:clone(publicSettings)}
    };
}

async function generateImage(config, { reuseSnapshot = false, useActiveStyle = false, signal } = {}) {
    const saved = settings().novelai;
    if (!saved.enabled) throw new Error('Прямое подключение NovelAI выключено в SP Imagen.');
    const snapshot = reuseSnapshot ? config?.spImagenDirect : null;
    const profileId = config?.kind || config?.spImagenKind || context().chatMetadata?.variables?.sp_imagen_active_kind || 'snapshot';
    const profile = profileById(settings(),profileId);
    const style = resolveImageStyle({
        activeStyle:activeStyle(saved),
        snapshotStyle:snapshot?.style,
        useActiveStyle,
        allowArtStyle:profile?.parser?.options?.useArtStyle!==false,
    });
    const requestSettings = snapshot?.settings ? { ...saved, ...snapshot.settings, apiKey: saved.apiKey, endpoint: saved.endpoint, enabled: true } : {...saved};
    if (!snapshot && profile?.parser?.options?.useNegativePrompt === false) requestSettings.negativePrompt = '';
    const result = await generateNovelAI({
        settings: requestSettings,
        prompt: config.prompt,
        profileId,
        baseLettering: config.structuredDirector===true || experimentalProfileFor(profileId)?.id.startsWith('custom_test_') || (!reuseSnapshot && !!experimentalProfileFor(profileId)),
        style: style.value,
        aspectRatio: config.aspect_ratio || requestSettings.novelaiAspectRatio || '2:3',
        signal,
    });
    const publicSettings = {
        model: result.settings.model, neverSpendAnlas: result.settings.neverSpendAnlas,
        resolution: result.settings.resolution, steps: result.settings.steps,
        cfgScale: result.settings.cfgScale, cfgRescale: result.settings.cfgRescale,
        sampler: result.settings.sampler, noiseSchedule: result.settings.noiseSchedule,
        seed: -1, skipCfgAboveSigma: result.settings.skipCfgAboveSigma,
        negativePrompt: result.settings.negativePrompt,
    };
    return {
        src: result.src,
        config: {
            ...config,
            spImagenDirect: { version: 1, provider: 'novelai', style: clone(style), settings: publicSettings, generatedSeed: result.seed },
        },
    };
}

async function run(command, kind, request = null) {
    migratePreviousChatData();
    const api = await getRuntime();
    const calls = {
        sp_imagen_menu: () => openHub(),
        sp_imagen_quick_guide: () => launchQuickGuide(),
        sp_ness_generate_at: () => api.generateAt(request),
        sp_ness_resume_post: () => api.resumePost(request),
        sp_ness_settings: () => api.openSettings(),
        sp_ness_library_editor: () => openLibrary(),
        sp_ness_prompt_editor: () => openPromptCenter(),
        sp_ness_manual_prepare: () => api.manualPrepare(),
        sp_ness_shared_review: () => api.reviewScene(),
        sp_ness_shared_library: () => api.prepareLibrary(),
        sp_ness_npc_prepare: () => api.prepareNpc(),
        sp_ness_snapshot_scene_parser: () => api.prepareRp(primaryProfileId('snapshot')),
        sp_ness_comic_scene_parser: () => api.prepareRp(primaryProfileId('comic')),
        sp_ness_story_page_scene_parser: () => api.prepareRp(primaryProfileId('story_page')),
        sp_ness_snapshot_render: () => api.renderImage(primaryProfileId('snapshot')),
        sp_ness_comic_render: () => api.renderImage(primaryProfileId('comic')),
        sp_ness_story_page_render: () => api.renderImage(primaryProfileId('story_page')),
    };
    const call = calls[command];
    if (!call) throw new Error(`SP Imagen: неизвестная команда ${command}${kind ? ` (${kind})` : ''}.`);
    return call();
}

function settingsPanel() {
    if (document.getElementById('spi-extension-settings')) return;
    const mount = document.getElementById('extensions_settings2');
    if (!mount) return;
    const root = document.createElement('div');
    root.id = 'spi-extension-settings';
    root.className = 'extension_container spi-settings';
    root.innerHTML = `<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>SP Imagen <span class="spi-new" data-spi-new>NEW!</span></b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><div class="spi-actions"></div></div></div>`;
    const actions = root.querySelector('.spi-actions');
    button('Открыть SP Imagen', actions, () => openHub(), true);
    const guide = document.createElement('button'); guide.type = 'button'; guide.className = 'spi-guide-link'; guide.textContent = '💡 Быстрый гайд'; guide.addEventListener('click', launchQuickGuide); root.querySelector('.inline-drawer-content').append(guide);
    mount.append(root);
    refreshNewIndicators();
}

async function initialize() {
    migratePreviousChatData();
    if (initialized) { settingsPanel(); mediaSlots?.refresh?.(); return; }
    if (initializing) return;
    initializing = true;
    try {
        try{await libraryStore.refresh();}catch(error){console.warn('[SP Imagen] library storage:',error);toastr.warning('Хранилище библиотеки недоступно. Данные не перезаписаны.');}
        await synchronizePrompts();
        mediaSlots = await installSpImagenMediaSlots({ getExtension: () => extensionApi });
        if (mediaSlots?.bundleVersion !== SP_IMAGEN_BUNDLE_VERSION) {
            mediaSlots?.dispose?.();
            throw new Error('SP Imagen: обнаружена смешанная версия файлов галереи. Генерация остановлена. Обнови расширение целиком и перезагрузи страницу с отключённым кэшем.');
        }
        settingsPanel();
        refreshNewIndicators();
        initialized = true;
        if (Object.keys(settings().pendingPrompts).length) setTimeout(() => openPromptCenter({ askUpdates: true }), 800);
    } catch (error) {
        console.error('[SP Imagen]', error);
        initializationAttempts++;
        if (initializationAttempts < 3) setTimeout(() => void initialize(), 1500);
        else toastr.error(String(error?.message || error), 'SP Imagen');
    } finally {
        initializing = false;
    }
}

const extensionApi = {
    installed: true,
    version: SP_IMAGEN_BUNDLE_VERSION,
    get hasNew() { return hasNew(); },
    get hubChildOpen() { return hubChildOpen; },
    run,
    openHub,
    openLibrary,
    openPrompts: openPromptCenter,
    openLastPrompt,
    quickGuide: launchQuickGuide,
    persistImageSource,
    directGenerationEnabled,
    generateImage,
    snapshotGenerationConfig,
    listImageStyles,
    saveImageStyle,
    getDirector,
    getActiveProfile: kind => experimentalProfileFor(kind)||profileById(settings(),kind),
    getProfileBaseKind: kind => baseKindFor(settings(),kind),
    getGenerationProfiles: () => generationFormats(settings()),
    getVisibleGenerationProfiles: () => generationFormats(settings(),{visibleOnly:true}),
    getGenerationProfileLabel: kind => generationFormats(settings()).find(p=>p.id===kind)?.name||(Object.hasOwn(PROFILE_KINDS,kind)?PROFILE_KINDS[kind]+' · архив':'Свой профиль'),
    getGlobalDirectorRules: () => normalizeProfileStore(settings()).rules.filter(r=>r.enabled),
    getCodePrompt: key => resolveCodePrompt(settings().codePrompts,key),
    generateText,
};

eventSource.on(event_types.APP_READY, initialize);
if (event_types.CHAT_CHANGED) eventSource.on(event_types.CHAT_CHANGED, stopQuickGuide);
if (document.readyState !== 'loading') void initialize();
