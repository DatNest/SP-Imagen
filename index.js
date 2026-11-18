import { mountViewportOverlay } from './viewport-overlay.js';
import { eventSource, event_types } from '../../../../script.js';
import { createPromptJson, parsePromptJson, SP_IMAGEN_PROMPT_JSON_KEYS } from './prompt-json.js';
import { saveBase64AsFile } from '../../../utils.js';
import { createSpImagenRuntime } from './runtime.js';
import { createSpImagenLibraryRuntime } from './library-runtime.js';
import { installSpImagenMediaSlots } from './media-slots.js';
import { SP_IMAGEN_PROMPTS, SP_IMAGEN_RELEASE } from './official-prompts.js';
import { decidePromptUpdate } from './update-policy.js';
import { NOVELAI_MODELS, NOVELAI_SAMPLERS, checkNovelAISubscription, defaultNovelAISettings, generateNovelAI, normalizeNovelAISettings } from './novelai.js';
import { defaultTextApiSettings, generateTextCompletion, listSillyTavernProfiles, normalizeTextApiSettings, testSillyTavernProfile, testTextApi } from './text-api.js';

const EXTENSION_KEY = 'spImagen';
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

const clone = value => JSON.parse(JSON.stringify(value));
const hash = async value => {
    const bytes = new TextEncoder().encode(String(value ?? ''));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

function context() {
    return SillyTavern.getContext();
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
    if (value.legacyPromptMigration !== 1) {
        const sets = root.ExtBlocks?.sets;
        if (Array.isArray(sets)) for (const name of Object.keys(PROFILE_LABELS)) {
            const legacy = sets.flatMap(set => Array.isArray(set?.global_blocks) ? set.global_blocks : []).find(block => block?.name === name && typeof block.prompt === 'string' && block.prompt.trim());
            if (legacy && !value.prompts[name]) value.prompts[name] = legacy.prompt;
        }
        value.legacyPromptMigration = 1;
    }
    return value;
}

function saveSettings() {
    context().saveSettingsDebounced?.();
}

async function synchronizePrompts() {
    const state = settings();
    let changed = false;
    for (const [name, shippedPrompt] of Object.entries(SP_IMAGEN_PROMPTS)) {
        const exists = typeof state.prompts[name] === 'string' && Boolean(state.prompts[name].trim());
        const currentHash = exists ? await hash(state.prompts[name]) : '';
        const shippedHash = await hash(shippedPrompt);
        const previousOfficialHash = state.promptBases[name];
        const decision = decidePromptUpdate({ exists, currentHash, previousOfficialHash, shippedHash });
        if (decision === 'install') {
            state.prompts[name] = shippedPrompt;
            state.promptBases[name] = shippedHash;
            changed = true;
            continue;
        }
        if (decision === 'adopt') {
            state.promptBases[name] = shippedHash;
            changed = true;
            continue;
        }
        if (decision === 'none') continue;
        if (decision === 'update') {
            state.prompts[name] = shippedPrompt;
            state.promptBases[name] = shippedHash;
            delete state.pendingPrompts[name];
            changed = true;
        } else {
            state.pendingPrompts[name] = { shippedHash };
            changed = true;
        }
    }
    if (state.seenRelease !== SP_IMAGEN_RELEASE) changed = true;
    if (changed) saveSettings();
}

async function getRuntime() {
    return runtime ??= createSpImagenRuntime({ getExtension: () => extensionApi, getMediaSlots: () => mediaSlots });
}

async function getLibraryRuntime() {
    return libraryRuntime ??= createSpImagenLibraryRuntime({ getExtension: () => extensionApi });
}

function hasNew() {
    const state = settings();
    return state.seenRelease !== SP_IMAGEN_RELEASE || Object.keys(state.pendingPrompts).length > 0;
}

function refreshNewIndicators() {
    const value = hasNew();
    document.querySelectorAll('[data-spi-new]').forEach(node => { node.hidden = !value; });
    document.querySelectorAll('[data-spi-prompts]').forEach(node => {
        node.textContent = `Промпты${value ? '  NEW!' : ''}`;
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
    head.append(backButton, heading, minimizeButton);
    dialog.append(head);
    overlay.append(dialog);
    const stopViewport = mountViewportOverlay(overlay);
    const background = [...document.body.children].filter(node => node !== overlay).map(node => [node, node.inert]);
    for (const [node] of background) node.inert = true;
    const previous = document.activeElement;
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
        for (const [node, inert] of background) node.inert = value ? inert : true;
        minimizeButton.focus();
    };
    minimizeButton.addEventListener('click', () => setCollapsed(!collapsed));
    let resolveClosed;
    const closedPromise = new Promise(resolve => { resolveClosed = resolve; });
    const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        for (const [node, inert] of background) node.inert = inert;
        stopViewport();
        overlay.remove();
        previous?.focus?.();
        options.onClose?.();
        resolveClosed();
    };
    backButton.addEventListener('click', () => typeof options.back === 'function' ? options.back() : close());
    const onKey = event => {
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
    if (!Object.hasOwn(SP_IMAGEN_PROMPTS, name)) throw new Error(`Не найден профиль ${PROFILE_LABELS[name] || name}.`);
    const text = String(prompt || '').trim();
    if (!text) throw new Error('Промпт не может быть пустым.');
    settings().prompts[name] = text;
    saveSettings();
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
    intro.textContent = 'Импорт заменяет три режиссёрских промпта. Для начала можно скачать шаблон с полями test.';
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.json,application/json';
    upload.hidden = true;
    upload.setAttribute('aria-label', 'Файл JSON промптов');
    const toolbar = document.createElement('div');
    toolbar.className = 'spi-dialog-actions spi-transfer-toolbar';
    const pick = button('Выбрать файл .json', toolbar, () => upload.click());
    button('Экспорт текущих', toolbar, () => downloadPromptJson('SP_IMAGEN_prompts.json', createPromptJson(settings().prompts)));
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
            const question = sample
                ? 'Некоторые поля содержат test — это только шаблон, с ним генерация не будет работать. Всё равно заменить три режиссёрских промпта?'
                : 'Заменить три текущих режиссёрских промпта данными из JSON?';
            if (!confirm(question)) return;
            const state = settings();
            for (const key of SP_IMAGEN_PROMPT_JSON_KEYS) state.prompts[key] = imported[key];
            saveSettings();
            status.textContent = 'Импортировано 3 промпта. Тексты сохранены в настройках.';
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

function openPromptWindow(name) {
    const prompt = settings().prompts[name];
    if (typeof prompt !== 'string') return toastr.error(`Профиль ${PROFILE_LABELS[name] || name} не найден.`, 'SP Imagen');
    const { dialog, close } = shell(`SP Imagen · ${PROFILE_LABELS[name]}`, 'spi-prompt-window', { back: true });
    const area = document.createElement('textarea');
    area.value = prompt;
    area.setAttribute('aria-label', `Промпт ${PROFILE_LABELS[name]}`);
    const status = document.createElement('p');
    status.className = 'spi-status';
    const actions = document.createElement('div');
    actions.className = 'spi-dialog-actions';
    button('Сбросить', actions, () => {
        if (confirm(`Заменить текущий промпт ${PROFILE_LABELS[name]} официальным из установленной версии SP Imagen?`)) area.value = shippedPrompt(name);
    });
    button('Отмена', actions, close);
    button('Сохранить', actions, async () => {
        try {
            await savePrompt(name, area.value);
            status.textContent = 'Промпт сохранён.';
            setTimeout(close, 250);
        } catch (error) { status.textContent = String(error?.message || error); }
    }, true);
    dialog.append(area, status, actions);
    requestAnimationFrame(() => area.focus());
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
    const { dialog, close, closed } = shell('SP Imagen · Промпты', 'spi-prompt-center', {
        back: backToHub,
        onClose: () => { promptCenterOpen = false; refreshNewIndicators(); if (backToHub) openHub(); },
    });
    const copy = document.createElement('p');
    copy.textContent = 'Промпты обновлены. Выберите версию.';
    const list = document.createElement('div');
    list.className = 'spi-prompt-list';
    for (const [name, label] of Object.entries(PROFILE_LABELS)) {
        const row = document.createElement('div');
        row.className = `spi-prompt-row${pending.has(name) ? ' spi-conflict' : ''}`;
        const title = document.createElement('strong');
        title.textContent = label;
        if (pending.has(name)) {
            const badge = document.createElement('span');
            badge.className = 'spi-new'; badge.textContent = 'NEW!'; title.append(badge);
        }
        const actions = document.createElement('div');
        actions.className = 'spi-dialog-actions';
        if (pending.has(name)) {
            button('Оставить мой', actions, async () => {
                await resolvePromptUpdate(name, false); row.remove();
                if (!Object.keys(settings().pendingPrompts).length) state.seenRelease = SP_IMAGEN_RELEASE;
                saveSettings(); refreshNewIndicators();
            });
            button('Поставить новый', actions, async () => {
                await resolvePromptUpdate(name, true); row.remove();
                if (!Object.keys(settings().pendingPrompts).length) state.seenRelease = SP_IMAGEN_RELEASE;
                saveSettings(); refreshNewIndicators();
            }, true);
        } else button('Открыть', actions, () => openPromptWindow(name));
        row.append(title, actions); list.append(row);
    }
    const footer = document.createElement('div');
    footer.className = 'spi-dialog-actions';
    button('Закрыть', footer, () => {
        if (!Object.keys(state.pendingPrompts).length) state.seenRelease = SP_IMAGEN_RELEASE;
        saveSettings(); close();
    }, true);
    const transfer = document.createElement('div');
    transfer.className = 'spi-dialog-actions spi-prompt-transfer';
    button('↥ ↧ Импорт / экспорт JSON', transfer, openPromptJsonTransfer);
    if (pending.size) dialog.append(copy);
    dialog.append(transfer, list, footer);
    if (askUpdates && pending.size) dialog.querySelector('button')?.focus();
    return closed;
}

function formField(parent, labelText, control, note = '') {
    const label = document.createElement('label');
    label.className = 'spi-field';
    const title = document.createElement('span');
    title.textContent = labelText;
    label.append(title, control);
    if (note) { const small = document.createElement('small'); small.textContent = note; label.append(small); }
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
    const readDraft = () => normalizeTextApiSettings({ mode: mode.value, profileId: profile.value, endpoint: endpoint.value, apiKey: token.value, model: model.value, temperature: Number(temperature.value), maxTokens: Number(maxTokens.value) });
    const refreshMode = () => {
        profileControl.parentElement.hidden = mode.value !== 'st';
        refreshProfilesButton.hidden = mode.value !== 'st';
        for (const control of [endpointControl, modelControl, tokenControl]) control.parentElement.hidden = mode.value !== 'direct';
    };
    mode.addEventListener('change', refreshMode);
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
            const next = readDraft();
            if (next.mode === 'st') { await testSillyTavernProfile(context(), next); status.textContent = 'Выбранный профиль SillyTavern ответил.'; }
            else { const models = await testTextApi(next); status.textContent = models.length ? `Подключение работает. Моделей найдено: ${models.length}.` : 'Подключение ответило, но список моделей пуст.'; }
        } catch (error) { status.textContent = String(error?.message || error); }
        finally { control.disabled = false; }
    });
    button('Отмена', actions, close);
    button('Сохранить', actions, () => {
        const next = readDraft();
        if (next.mode === 'st' && !next.profileId) { status.textContent = 'Выбери отдельный профиль SillyTavern.'; return; }
        if (next.mode === 'direct' && (!next.endpoint || !next.apiKey || !next.model)) { status.textContent = 'Заполни endpoint, API-ключ и модель.'; return; }
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
    const endpoint = input(draft.endpoint); formField(grid, 'Адрес NovelAI', endpoint, 'Обычно https://image.novelai.net');
    const model = select(NOVELAI_MODELS, draft.model); formField(grid, 'Модель', model);
    const resolution = select({ small: 'Small', normal: 'Normal', big: 'Big' }, draft.resolution); formField(grid, 'Размер', resolution, 'При защите Anlas используется Normal.');
    const steps = input(draft.steps, 'number'); steps.min = '1'; steps.max = '50'; formField(grid, 'Steps', steps);
    const cfg = input(draft.cfgScale, 'number'); cfg.min = '0'; cfg.max = '10'; cfg.step = '0.1'; formField(grid, 'CFG scale', cfg);
    const rescale = input(draft.cfgRescale, 'number'); rescale.min = '0'; rescale.max = '1'; rescale.step = '0.01'; formField(grid, 'CFG rescale', rescale);
    const sampler = select(NOVELAI_SAMPLERS, draft.sampler); formField(grid, 'Sampler', sampler);
    const seed = input(draft.seed, 'number'); seed.min = '-1'; seed.max = '4294967295'; formField(grid, 'Seed', seed, '-1 создаёт новый вариант при каждом запуске.');
    const negative = document.createElement('textarea'); negative.className = 'spi-short-area'; negative.value = draft.negativePrompt;
    formField(grid, 'Негативный промпт', negative, 'Для V5 Medium используется обязательный негативный промпт модели.');
    const readDraft = () => normalizeNovelAISettings({
        ...draft, enabled: enabled.checked, neverSpendAnlas: neverSpend.checked,
        apiKey: token.value, endpoint: endpoint.value, model: model.value, resolution: resolution.value,
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
    const renderList = () => {
        library.replaceChildren();
        const heading = document.createElement('h3'); heading.textContent = 'Библиотека стилей'; library.append(heading);
        button('+ Новый стиль', library, () => {
            const style = { id: `spi-style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: `Стиль ${novelai.styles.length + 1}`, value: '' };
            novelai.styles.push(style); selectedId = style.id; persist(); renderList(); syncEditor(); name.focus(); name.select();
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
        const none = button('◉ Без стиля', library, () => { novelai.activeStyleId = ''; persist(); renderList(); syncEditor(); });
        none.classList.toggle('spi-active', !novelai.activeStyleId);
        for (const style of novelai.styles) {
            const row = document.createElement('div'); row.className = `spi-style-row${selectedId === style.id ? ' spi-selected' : ''}`;
            row.dataset.styleId = style.id;
            const activate = button(novelai.activeStyleId === style.id ? '●' : '○', row, event => {
                event.stopPropagation(); novelai.activeStyleId = novelai.activeStyleId === style.id ? '' : style.id; selectedId = style.id; persist(); renderList(); syncEditor();
            });
            activate.title = novelai.activeStyleId === style.id ? 'Выключить стиль' : 'Сделать активным';
            const summary = document.createElement('button'); summary.type = 'button'; summary.className = 'spi-style-summary';
            const strong = document.createElement('strong'); strong.textContent = style.name;
            const small = document.createElement('small'); small.textContent = style.value || 'Пустой стиль';
            summary.append(strong, small); summary.onclick = () => { selectedId = style.id; renderList(); syncEditor(); };
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
    return (await getLibraryRuntime()).openLibraryEditor();
}

function openHub(page = 'home') {
    const existing = document.querySelector('.spi-hub');
    if (existing) { existing.querySelector('button:not([hidden])')?.focus(); return; }
    let currentPage = page;
    const render = nextPage => {
        currentPage = nextPage;
        body.replaceChildren();
        backButton.hidden = currentPage === 'home';
        heading.textContent = currentPage === 'home' ? 'SP Imagen' : 'SP Imagen · Настройки';
        if (currentPage === 'home') {
            button('⚙ Настройки', body, () => render('settings'));
            const prompts = button(`✎ Промпты${hasNew() ? '  NEW!' : ''}`, body, () => void openPromptCenter({ backToHub: true }));
            prompts.dataset.spiPrompts = '';
            button('📚 Библиотека', body, () => void openRuntimeChild(openLibrary));
        } else {
            button('Генерация', body, () => void openRuntimeChild(() => getRuntime().then(api => api.openSettings())));
            button('Текстовая модель', body, () => void openTextApiSettings({ back: true }));
            button('NovelAI', body, () => void openNovelAISettings({ back: true }));
            button('Стили', body, () => void openStyleLibrary({ back: true }));
        }
        body.querySelector('button')?.focus();
    };
    const { overlay, dialog, close, heading, backButton } = shell('SP Imagen', 'spi-hub', { back: () => render('home') });
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

function getDirector(kind) {
    const name = `sp_ness_${kind}_director`;
    const prompt = settings().prompts[name];
    return typeof prompt === 'string' && prompt.trim() ? { name, prompt } : null;
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

async function generateImage(config, { reuseSnapshot = false, signal } = {}) {
    const saved = settings().novelai;
    if (!saved.enabled) throw new Error('Прямое подключение NovelAI выключено в SP Imagen.');
    const snapshot = reuseSnapshot ? config?.spImagenDirect : null;
    const style = snapshot?.style || activeStyle(saved) || { id: '', name: 'Без стиля', value: '' };
    const requestSettings = snapshot?.settings ? { ...saved, ...snapshot.settings, apiKey: saved.apiKey, endpoint: saved.endpoint, enabled: true } : saved;
    const result = await generateNovelAI({
        settings: requestSettings,
        prompt: config.prompt,
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
    const api = await getRuntime();
    const calls = {
        sp_imagen_menu: () => openHub(),
        sp_ness_generate_at: () => api.generateAt(request),
        sp_ness_settings: () => api.openSettings(),
        sp_ness_library_editor: () => openLibrary(),
        sp_ness_prompt_editor: () => openPromptCenter(),
        sp_ness_manual_prepare: () => api.manualPrepare(),
        sp_ness_shared_review: () => api.reviewScene(),
        sp_ness_shared_library: () => api.prepareLibrary(),
        sp_ness_npc_prepare: () => api.prepareNpc(),
        sp_ness_snapshot_scene_parser: () => api.prepareRp('snapshot'),
        sp_ness_comic_scene_parser: () => api.prepareRp('comic'),
        sp_ness_story_page_scene_parser: () => api.prepareRp('story_page'),
        sp_ness_snapshot_render: () => api.renderImage('snapshot'),
        sp_ness_comic_render: () => api.renderImage('comic'),
        sp_ness_story_page_render: () => api.renderImage('story_page'),
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
    mount.append(root);
    refreshNewIndicators();
}

async function initialize() {
    if (initialized) { settingsPanel(); mediaSlots?.refresh?.(); return; }
    if (initializing) return;
    initializing = true;
    try {
        await synchronizePrompts();
        mediaSlots = await installSpImagenMediaSlots({ getExtension: () => extensionApi });
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
    version: '2.4.1',
    get hasNew() { return hasNew(); },
    get hubChildOpen() { return hubChildOpen; },
    run,
    openHub,
    openLibrary,
    openPrompts: openPromptCenter,
    persistImageSource,
    directGenerationEnabled,
    generateImage,
    getDirector,
    generateText,
};

eventSource.on(event_types.APP_READY, initialize);
if (document.readyState !== 'loading') void initialize();
