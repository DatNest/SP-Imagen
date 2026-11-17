import { eventSource, event_types } from '../../../../script.js';
import { saveBase64AsFile } from '../../../utils.js';
import { createSpImagenRuntime } from './runtime.js';
import { createSpImagenLibraryRuntime } from './library-runtime.js';
import { installSpImagenMediaSlots } from './media-slots.js';
import { SP_IMAGEN_PROMPTS } from './official-prompts.js';
import { SP_AUX_PROMPTS, SP_AUX_DESCRIPTIONS } from './editable-prompts.js';
import { NOVELAI_MODELS, NOVELAI_SAMPLERS, NOVELAI_SCHEDULES, checkNovelAISubscription, defaultNovelAISettings, generateNovelAI, getNovelAINegativePresetOptions, novelAIModelCapabilities, resolveNovelAIRequestSettings, normalizeNovelAISettings } from './novelai.js';
import { defaultTextApiSettings, generateTextCompletion, listSillyTavernProfiles, normalizeTextApiSettings, testSillyTavernProfile, testTextApi } from './text-api.js';

const EXTENSION_KEY = 'spImagen';
const PROMPT_DESCRIPTIONS = Object.freeze({
    sp_ness_snapshot_director: { title: 'Snapshot · режиссёр', description: 'Главный системный промпт для одного кадра. Передаётся режиссёру вместе с RP, библиотекой, одеждой и композицией.' },
    sp_ness_comic_director: { title: 'Comic · режиссёр', description: 'Главный системный промпт комикса: панели, краткие реплики и оформление пузырей.' },
    sp_ness_story_page_director: { title: 'Story Page · режиссёр', description: 'Главный системный промпт страницы с последовательными моментами и репликами.' },
});
const ALL_DEFAULT_PROMPTS = Object.freeze({ ...SP_IMAGEN_PROMPTS, ...SP_AUX_PROMPTS });
function promptOverrides() {
    const store = settings();
    if (!store.promptOverrides || typeof store.promptOverrides !== 'object' || Array.isArray(store.promptOverrides)) store.promptOverrides = {};
    return store.promptOverrides;
}
function effectivePrompt(id) {
    if (!Object.hasOwn(ALL_DEFAULT_PROMPTS, id)) return '';
    const override = promptOverrides()[id];
    return typeof override === 'string' && override.trim() ? override : ALL_DEFAULT_PROMPTS[id];
}
function listEditablePrompts() {
    return Object.keys(ALL_DEFAULT_PROMPTS).map(id => ({
        id, title: PROMPT_DESCRIPTIONS[id]?.title || SP_AUX_DESCRIPTIONS[id]?.title || id,
        description: PROMPT_DESCRIPTIONS[id]?.description || SP_AUX_DESCRIPTIONS[id]?.description || '',
        text: effectivePrompt(id), original: ALL_DEFAULT_PROMPTS[id], changed: effectivePrompt(id) !== ALL_DEFAULT_PROMPTS[id],
    }));
}
async function savePromptOverrides(values) {
    const previous = { ...promptOverrides() };
    const next = {};
    for (const [id, value] of Object.entries(values || {})) {
        if (!Object.hasOwn(ALL_DEFAULT_PROMPTS, id)) throw Error('Неизвестный промпт: ' + id);
        if (typeof value !== 'string' || !value.trim() || value.length > 60000) throw Error('Промпт «' + id + '» должен содержать от 1 до 60 000 символов.');
        if (value !== ALL_DEFAULT_PROMPTS[id]) next[id] = value;
    }
    settings().promptOverrides = next;
    try { await context().saveSettingsDebounced?.(); }
    catch (error) { settings().promptOverrides = previous; throw error; }
}

const PROFILE_LABELS = {
    sp_ness_snapshot_director: 'Snapshot',
    sp_ness_comic_director: 'Comic',
    sp_ness_story_page_director: 'Story Page',
};

let runtime;
let libraryRuntime;
let initialized = false;
let initializing = false;
let initializationAttempts = 0;
let promptCenterOpen = false;

const clone = value => JSON.parse(JSON.stringify(value));
function context() {
    return SillyTavern.getContext();
}

function settings() {
    const root = context().extensionSettings;
    root[EXTENSION_KEY] ??= {};
    const value = root[EXTENSION_KEY];
    value.version ??= 1;
    value.novelai = normalizeNovelAISettings(value.novelai);
    value.textApi = normalizeTextApiSettings(value.textApi);
    return value;
}

function saveSettings() {
    context().saveSettingsDebounced?.();
}

async function getRuntime() {
    return runtime ??= createSpImagenRuntime();
}

async function getLibraryRuntime() {
    return libraryRuntime ??= createSpImagenLibraryRuntime();
}

function hasNew() { return false; }

function refreshNewIndicators() {
    document.querySelectorAll('[data-spi-new]').forEach(node => { node.hidden = true; });
    document.querySelectorAll('[data-spi-prompts]').forEach(node => { node.textContent = 'Промпты'; });
    globalThis.__nessImageSlotsV4?.refresh?.();
    globalThis.__nessImageSlotsV4?.refreshMenu?.();
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
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'menu_button spi-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Закрыть');
    closeButton.hidden = !options.closeButton;
    head.append(backButton, heading, closeButton);
    dialog.append(head);
    overlay.append(dialog);
    // Show exactly one SP Imagen dialog at a time, also on narrow screens.
    const covered = [...document.querySelectorAll('.spi-overlay')].map(node => [node, node.hidden]);
    for (const [node] of covered) node.hidden = true;
    // Top-level portal: CSS themes can transform <body>, which changes the
    // containing block for position:fixed and pushes mobile dialogs offscreen.
    document.documentElement.append(overlay);
    const background = [...document.documentElement.children].filter(node => node !== overlay).map(node => [node, node.inert]);
    for (const [node] of background) node.inert = true;
    const viewport = window.visualViewport;
    let frame = null, stopped = false;
    const fitViewport = () => {
        if (stopped) return;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            frame = null;
            if (stopped) return;
            const width = viewport?.width || window.innerWidth;
            const height = viewport?.height || window.innerHeight;
            const top = viewport?.offsetTop || 0, left = viewport?.offsetLeft || 0;
            overlay.style.left = `${left}px`;
            overlay.style.top = `${top}px`;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${height}px`;
        });
    };
    fitViewport();
    window.addEventListener('resize', fitViewport);
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    const previous = document.activeElement;
    let closed = false;
    let resolveClosed;
    const closedPromise = new Promise(resolve => { resolveClosed = resolve; });
    const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey, true);
        stopped = true;
        if (frame !== null) cancelAnimationFrame(frame);
        window.removeEventListener('resize', fitViewport);
        viewport?.removeEventListener('resize', fitViewport);
        viewport?.removeEventListener('scroll', fitViewport);
        for (const [node, inert] of background) node.inert = inert;
        overlay.remove();
        for (const [node, wasHidden] of covered) if (node.isConnected) node.hidden = wasHidden;
        previous?.focus?.({ preventScroll: true });
        options.onClose?.();
        resolveClosed();
    };
    backButton.addEventListener('click', () => typeof options.back === 'function' ? options.back() : close());
    closeButton.addEventListener('click', close);
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
    return { overlay, dialog, close, closed: closedPromise, heading, backButton, closeButton };
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
    return effectivePrompt(name);
}

function openPromptWindow(name) {
    const prompt = shippedPrompt(name);
    if (!prompt) return toastr.error(`Профиль ${PROFILE_LABELS[name] || name} не найден.`, 'SP Imagen');
    const { dialog, close } = shell(`SP Imagen · ${PROFILE_LABELS[name]}`, 'spi-prompt-window', { back: true });
    const area = document.createElement('textarea');
    area.value = prompt;
    area.readOnly = true;
    area.setAttribute('aria-label', `Оригинальный промпт ${PROFILE_LABELS[name]}`);
    const status = document.createElement('p');
    status.className = 'spi-status';
    status.textContent = 'Оригинальный промпт ExtBlocks защищён от изменений.';
    const actions = document.createElement('div');
    actions.className = 'spi-dialog-actions';
    button('Закрыть', actions, close, true);
    dialog.append(area, status, actions);
}

function openPromptCenter({ backToHub = false } = {}) {
    if (promptCenterOpen) return;
    promptCenterOpen = true;
    const { dialog, close } = shell('SP Imagen · Оригинальные промпты', 'spi-prompt-center', {
        back: backToHub,
        onClose: () => { promptCenterOpen = false; if (backToHub) openHub(); },
    });
    const list = document.createElement('div');
    list.className = 'spi-prompt-list';
    for (const [name, label] of Object.entries(PROFILE_LABELS)) {
        const row = document.createElement('div');
        row.className = 'spi-prompt-row';
        const title = document.createElement('strong'); title.textContent = label;
        const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
        button('Открыть', actions, () => openPromptWindow(name));
        row.append(title, actions); list.append(row);
    }
    const footer = document.createElement('div'); footer.className = 'spi-dialog-actions';
    button('Закрыть', footer, close, true);
    dialog.append(list, footer);
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

// Small in-window accordion for less frequently changed options. No nested popup.
function settingsGroup(grid, title, explanation, controls) {
    const details = document.createElement('details');
    details.className = 'spi-settings-section';
    const summary = document.createElement('summary');
    summary.textContent = title;
    const note = document.createElement('p');
    note.className = 'spi-settings-section-note';
    note.textContent = explanation;
    const body = document.createElement('div');
    body.className = 'spi-settings-section-fields';
    for (const control of controls) {
        const label = control?.closest?.('.spi-field');
        if (label) body.append(label);
    }
    details.append(summary, note, body);
    grid.append(details);
    return details;
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

async function openTextApiSettings({ back = false } = {}) {
    const draft = clone(settings().textApi || defaultTextApiSettings());
    const { dialog, close, closed } = shell('SP Imagen · Текстовая модель', 'spi-connection-window', { back });
    const grid = document.createElement('div'); grid.className = 'spi-form-grid';
    const mode = select({ st: 'Профиль подключения SillyTavern', direct: 'Прямой OpenAI-совместимый API' }, draft.mode);
    formField(grid, 'Откуда брать текстовую модель?', mode, 'SP Imagen отправляет только собственное задание.');
    const profile = document.createElement('select');
    const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Выбери профиль ExtBlocks Big'; profile.append(placeholder);
    const profileControl = formField(grid, 'Какой готовый профиль использовать?', profile, 'Выбери то же подключение и модель, что использовались в пресете Big ExtBlocks. История чата не отправляется.');
    const profiles = await listSillyTavernProfiles(context()).catch(() => []);
    for (const item of profiles) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; profile.append(option); }
    profile.value = profiles.some(item => item.id === draft.profileId) ? draft.profileId : '';
    const endpoint = input(draft.endpoint); const endpointControl = formField(grid, 'Адрес подключения (для прямого API)', endpoint, 'Адрес до /v1; SP Imagen добавит /chat/completions.');
    const model = input(draft.model); const modelControl = formField(grid, 'Название модели у провайдера', model, 'Точный идентификатор модели, если используешь прямой API.');
    const token = input(draft.apiKey, 'password'); token.autocomplete = 'off';
    const tokenWrap = document.createElement('div'); tokenWrap.className = 'spi-token-row'; tokenWrap.append(token);
    button('Показать', tokenWrap, () => { token.type = token.type === 'password' ? 'text' : 'password'; tokenWrap.lastElementChild.textContent = token.type === 'password' ? 'Показать' : 'Скрыть'; });
    const tokenControl = formField(grid, 'API-ключ', tokenWrap, 'Не попадает в экспорты SP Imagen.');
    const temperature = input(draft.temperature, 'number'); temperature.min = '0'; temperature.max = '2'; temperature.step = '0.1'; formField(grid, 'Свобода ответов модели (Temperature)', temperature, 'Обычно оставляй значение из рабочего профиля. Чем выше число, тем свободнее ответы.');
    const maxTokens = input(draft.maxTokens, 'number'); maxTokens.min = '1000'; maxTokens.max = '100000'; maxTokens.step = '1000'; formField(grid, 'Максимальная длина ответа', maxTokens, 'Сколько текста модель может вернуть за один запрос. Если промпт обрывается — увеличь это число.');
    settingsGroup(grid, 'Дополнительные параметры текстовой модели', 'Обычно их не нужно менять. Оставь значения того профиля, на котором уже работали картинки.', [temperature, maxTokens]);
    const status = document.createElement('p'); status.className = 'spi-status';
    const readDraft = () => normalizeTextApiSettings({ mode: mode.value, profileId: profile.value, endpoint: endpoint.value, apiKey: token.value, model: model.value, temperature: Number(temperature.value), maxTokens: Number(maxTokens.value) });
    const refreshMode = () => {
        profileControl.parentElement.hidden = mode.value !== 'st';
        for (const control of [endpointControl, modelControl, tokenControl]) control.parentElement.hidden = mode.value !== 'direct';
    };
    mode.onchange = refreshMode; refreshMode();
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
    button('Проверить подключение', actions, async event => {
        const control = event.currentTarget; control.disabled = true; status.textContent = 'Проверяю подключение…';
        try {
            const next = readDraft();
            if (next.mode === 'st') { await testSillyTavernProfile(context(), next); status.textContent = 'Выбранный профиль SillyTavern ответил.'; }
            else { await testTextApi(next); status.textContent = 'Текстовый API ответил.'; }
        }
        catch (error) { status.textContent = String(error?.message || error); }
        finally { control.disabled = false; }
    });
    button('Отмена', actions, close);
    button('Сохранить', actions, () => {
        const next = readDraft();
        if (next.mode === 'st' && !next.profileId) { status.textContent = 'Выбери отдельный профиль SillyTavern.'; return; }
        if (next.mode === 'direct' && (!next.endpoint || !next.apiKey || !next.model)) { status.textContent = 'Заполни endpoint, API-ключ и модель.'; return; }
        settings().textApi = next; saveSettings(); close();
    }, true);
    dialog.append(grid, status, actions);
    return closed;
}

function openNovelAISettings({ back = false } = {}) {
    const draft = clone(settings().novelai || defaultNovelAISettings());
    const { dialog, close, closed } = shell('SP Imagen · Подключение NovelAI', 'spi-connection-window', { back });
    const grid = document.createElement('div'); grid.className = 'spi-form-grid';
    const enabled = input('', 'checkbox'); enabled.checked = draft.enabled;
    formField(grid, 'Использовать NovelAI', enabled, 'Нужно для создания и повторной генерации изображений.');
    const neverSpend = input('', 'checkbox'); neverSpend.checked = draft.neverSpendAnlas;
    formField(grid, 'Ни в коем случае не тратить Anlas', neverSpend, 'Проверяет Opus и доступный лимит перед каждой отправкой.');
    const token = input(draft.apiKey, 'password'); token.autocomplete = 'off';
    const tokenWrap = document.createElement('div'); tokenWrap.className = 'spi-token-row'; tokenWrap.append(token);
    button('Показать', tokenWrap, () => { token.type = token.type === 'password' ? 'text' : 'password'; tokenWrap.lastElementChild.textContent = token.type === 'password' ? 'Показать' : 'Скрыть'; });
    formField(grid, 'Постоянный API-токен NovelAI', tokenWrap, 'Токен NovelAI, обычно начинается с pst-.');
    const endpoint = input(draft.endpoint); formField(grid, 'Адрес NovelAI', endpoint, 'Обычно https://image.novelai.net');
    const model = select(NOVELAI_MODELS, draft.model); formField(grid, 'Модель', model);
    const modelNotice = document.createElement('p');
    modelNotice.className = 'spi-model-notice';
    grid.append(modelNotice);
    const resolution = select({ small: 'Small', normal: 'Normal', big: 'Big' }, draft.resolution);
    formField(grid, 'Размер', resolution, 'Защита Anlas допускает Small и Normal. Выбор Big сохраняется на случай отключения защиты.');
    const steps = input(draft.steps, 'number'); steps.min = '1'; steps.max = '50';
    formField(grid, 'Шаги генерации (Steps)', steps, 'Сколько шагов делает модель, рисуя картинку. В некоторых моделях значение фиксировано.');
    const cfg = input(draft.cfgScale, 'number'); cfg.min = '0'; cfg.max = '10'; cfg.step = '0.1'; formField(grid, 'Насколько точно следовать описанию (CFG)', cfg, 'Более высокое значение сильнее привязывает картинку к промпту.');
    const rescale = input(draft.cfgRescale, 'number'); rescale.min = '0'; rescale.max = '1'; rescale.step = '0.01';
    const rescaleControl = formField(grid, 'Коррекция CFG (дополнительно)', rescale, 'Нужна не всем моделям. Если не знаешь, оставь 0.');
    const sampler = select(NOVELAI_SAMPLERS, draft.sampler);
    const samplerControl = formField(grid, 'Способ рисования (Sampler)', sampler, 'Выбери алгоритм рисования; Medium использует только Euler Ancestral.');
    const scheduler = select(NOVELAI_SCHEDULES, draft.noiseSchedule);
    const schedulerControl = formField(grid, 'Порядок шагов (Scheduler)', scheduler, 'Дополнительная настройка для V4.5. Для V5 не нужна.');
    const seed = input(draft.seed, 'number'); seed.min = '-1'; seed.max = '4294967295'; formField(grid, 'Номер варианта (Seed)', seed, '-1 — каждый раз новый вариант. Фиксированное число — повторяемый вариант при одинаковом запросе.');
    const negativePreset = select(getNovelAINegativePresetOptions(draft.model), draft.negativePreset);
    const negativePresetControl = formField(grid, 'Чего модель должна избегать (готовый набор)', negativePreset, 'Выбери готовый набор нежелательных деталей. В Medium он фиксирован.');
    const negative = document.createElement('textarea'); negative.className = 'spi-short-area'; negative.value = draft.negativePrompt;
    const negativeControl = formField(grid, 'Что ещё не рисовать (дополнительно)', negative, 'Необязательно. Текст сохранится при смене модели.');
    settingsGroup(grid, 'Подключение NovelAI и ключ', 'Обычно достаточно настроить один раз. Токен никому не отправляется, кроме API NovelAI для генерации.', [token, endpoint]);
    settingsGroup(grid, 'Как модель будет рисовать?', 'Дополнительные параметры. В режиме Medium неподходящие изменения автоматически недоступны.', [steps, cfg, rescale, sampler, scheduler, seed]);
    settingsGroup(grid, 'Чего избегать на картинке?', 'Необязательные ограничения изображения. Если всё работает — оставь как есть.', [negativePreset, negative]);

    // Keep user-adjustable High/Curated settings while Medium temporarily locks controls.
    const preferred = {
        resolution: draft.resolution, steps: draft.steps, sampler: draft.sampler,
        cfgRescale: draft.cfgRescale, noiseSchedule: draft.noiseSchedule,
        negativePreset: draft.negativePreset,
    };
    for (const [node, key] of [[resolution, 'resolution'], [steps, 'steps'], [sampler, 'sampler'],
        [rescale, 'cfgRescale'], [scheduler, 'noiseSchedule']]) {
        node.addEventListener('change', () => { if (!node.disabled) preferred[key] = node.type === 'number' ? Number(node.value) : node.value; });
    }
    negativePreset.addEventListener('change', () => { if (!negativePreset.disabled) preferred.negativePreset = negativePreset.value; });
    const refreshModelControls = () => {
        const caps = novelAIModelCapabilities(model.value);
        const guard = neverSpend.checked;
        const effective = resolveNovelAIRequestSettings({
            ...draft, model: model.value, neverSpendAnlas: guard, ...preferred,
        });
        steps.disabled = !caps.steps;
        steps.max = guard ? '28' : '50';
        steps.value = String(effective.steps);
        sampler.disabled = !caps.sampler;
        sampler.value = effective.sampler;
        rescale.disabled = !caps.cfgRescale;
        rescale.value = String(effective.cfgRescale);
        schedulerControl.hidden = !caps.scheduler;
        scheduler.value = preferred.noiseSchedule;
        resolution.querySelector('option[value="big"]').disabled = guard;
        resolution.value = effective.resolution;

        negativePreset.replaceChildren();
        const options = getNovelAINegativePresetOptions(model.value);
        for (const [key, label] of Object.entries(options)) {
            const option = document.createElement('option'); option.value = key; option.textContent = label; negativePreset.append(option);
        }
        negativePreset.value = Object.hasOwn(options, preferred.negativePreset) ? preferred.negativePreset : Object.hasOwn(options, 'human') ? 'human' : 'heavy';
        negativePreset.disabled = !caps.customUndesiredContent;
        negative.disabled = !caps.customUndesiredContent;
        if (caps.medium) {
            modelNotice.textContent = 'V5 Medium · фиксировано: 14 Steps, Euler Ancestral, сильный негатив; CFG Rescale и пользовательский негатив недоступны. CFG scale остаётся настраиваемым.';
            negativePresetControl.querySelector('small').textContent = 'В Medium используется только фиксированный Heavy.';
            negativeControl.querySelector('small').textContent = 'Недоступен в Medium; сохранённый негатив вернётся в других моделях.';
        } else {
            modelNotice.textContent = guard
                ? 'Защита Anlas: не более 28 шагов, размер не выше Normal. Значения вне ограничений сохраняются для режима без защиты.'
                : 'Параметры модели доступны в пределах её возможностей. Встроенные промпты изображения не изменяются.';
            negativePresetControl.querySelector('small').textContent = 'Пресеты подбираются по выбранной модели.';
            negativeControl.querySelector('small').textContent = 'Ваш текст сохраняется при смене модели.';
        }
        if (caps.medium && guard) modelNotice.textContent += ' Защита Anlas активна.';
    };
    model.addEventListener('change', refreshModelControls);
    neverSpend.addEventListener('change', refreshModelControls);
    refreshModelControls();
    const status = document.createElement('p'); status.className = 'spi-status';
    const readDraft = () => normalizeNovelAISettings({
        ...draft, enabled: enabled.checked, neverSpendAnlas: neverSpend.checked,
        apiKey: token.value, endpoint: endpoint.value, model: model.value,
        ...preferred, cfgScale: Number(cfg.value), seed: Number(seed.value), negativePrompt: negative.value,
    });
    const actions = document.createElement('div'); actions.className = 'spi-dialog-actions';
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
        if (next.enabled && !next.apiKey) { status.textContent = 'Вставь API-токен NovelAI.'; token.focus(); return; }
        const root = settings(); root.novelai = next; saveSettings(); close();
    }, true);
    dialog.append(grid, status, actions);
    requestAnimationFrame(() => enabled.focus());
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

function openLastDirectorResponse() {
    const raw = String(context()?.chatMetadata?.variables?.naicom_last_director_raw || '');
    if (!raw.trim()) return toastr.info('В этом чате ещё нет сохранённого ответа режиссёра.', 'SP Imagen');
    const { dialog, close } = shell('SP Imagen · Ответ режиссёра', 'spi-raw-response', { back: true });
    const note = document.createElement('p');
    note.textContent = 'Это исходный ответ модели до разбора.';
    const area = document.createElement('textarea');
    area.value = raw;
    area.readOnly = true;
    area.setAttribute('aria-label', 'Исходный ответ режиссёра');
    const status = document.createElement('p');
    status.className = 'spi-status';
    const actions = document.createElement('div');
    actions.className = 'spi-dialog-actions';
    button('Скопировать', actions, async () => {
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(raw);
            else { area.focus(); area.select(); if (!document.execCommand('copy')) throw new Error('copy failed'); }
            status.textContent = 'Ответ скопирован.';
        } catch { status.textContent = 'Не удалось скопировать автоматически. Выдели текст вручную.'; area.focus(); area.select(); }
    }, true);
    button('Закрыть', actions, close);
    dialog.append(note, area, status, actions);
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
            const prompts = button('✎ Промпты', body, () => void openRuntimeChild(() => getRuntime().then(api => api.openSettings('prompts'))));
            prompts.dataset.spiPrompts = '';
            button('📚 Библиотека', body, () => void openRuntimeChild(openLibrary));
            if (context()?.chatMetadata?.variables?.naicom_pending_image) button('↻ Повторить картинку без режиссёра', body, () => void openRuntimeChild(() => getRuntime().then(api => api.retryPendingImage()).then(result => { toastr.success(result,'SP Imagen'); })));
        } else {
            button('Генерация', body, () => void openRuntimeChild(() => getRuntime().then(api => api.openSettings())));
            button('Все промпты', body, () => void openRuntimeChild(() => getRuntime().then(api => api.openSettings('prompts'))));
            button('Текстовая модель', body, () => void openTextApiSettings({ back: true }));
            button('NovelAI', body, () => void openNovelAISettings({ back: true }));
            button('Стили', body, () => void openStyleLibrary({ back: true }));
            button('Последний ответ режиссёра', body, openLastDirectorResponse);
            if (context()?.chatMetadata?.variables?.naicom_pending_image) button('↻ Отправить сохранённый промпт в NovelAI', body, () => void openRuntimeChild(() => getRuntime().then(api => api.retryPendingImage()).then(result => { toastr.success(result,'SP Imagen'); })));
        }
        if(!window.matchMedia('(pointer: coarse)').matches)body.querySelector('button')?.focus({preventScroll:true});
    };
    const { overlay, dialog, close, heading, backButton } = shell('SP Imagen', 'spi-hub', { back: () => render('home'), closeButton: true });
    const body = document.createElement('nav');
    body.className = 'spi-hub-menu';
    body.setAttribute('aria-label', 'Разделы SP Imagen');
    dialog.append(body);
    const openRuntimeChild = async opener => {
        if (overlay.inert) return;
        overlay.inert = true;
        overlay.hidden = true;
        globalThis.__spImagenHubChild = true;
        try { await opener(); }
        catch (error) { toastr.error(String(error?.message || error), 'SP Imagen'); }
        finally {
            delete globalThis.__spImagenHubChild;
            if (overlay.isConnected) { overlay.hidden = false; overlay.inert = false; if(!window.matchMedia('(pointer: coarse)').matches)body.querySelector('button')?.focus({preventScroll:true}); }
        }
    };
    render(currentPage);
    return close;
}

function getDirector(kind) {
    const name = `sp_ness_${kind}_director`;
    const prompt = effectivePrompt(name);
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
    const novelai = settings().novelai;
    return novelai.enabled === true && Boolean(novelai.apiKey);
}

function snapshotGenerationConfig(config, kind='snapshot') {
 const current=settings().novelai;
 const {apiKey,endpoint,enabled,styles,activeStyleId,...publicSettings}=current;
 return {...config,spImagenDirect:{version:1,kind,provider:'novelai',style:clone(activeStyle(current)||{id:'',name:'Без стиля',value:''}),settings:clone(publicSettings)}};
}

async function generateImage(config, { reuseSnapshot = false, kind = 'snapshot', signal } = {}) {
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
        kind: snapshot?.kind || kind,
        signal,
    });
    const publicSettings = {
        model: result.settings.model, neverSpendAnlas: result.settings.neverSpendAnlas,
        resolution: result.settings.resolution, steps: result.settings.steps,
        cfgScale: result.settings.cfgScale, cfgRescale: result.settings.cfgRescale,
        sampler: result.settings.sampler, noiseSchedule: result.settings.noiseSchedule,
        seed: -1, skipCfgAboveSigma: result.settings.skipCfgAboveSigma,
        negativePreset: result.settings.negativePreset, negativePrompt: result.settings.negativePrompt,
    };
    return {
        src: result.src,
        config: {
            ...config,
            spImagenDirect: { version: 1, kind: snapshot?.kind || kind, provider: 'novelai', style: clone(style), settings: publicSettings, generatedSeed: result.seed },
        },
    };
}

async function run(command, kind) {
    const api = await getRuntime();
    const calls = {
        sp_imagen_menu: () => openHub(),
        sp_ness_generate_at: () => api.generateAt(),
        sp_ness_resume_at: () => api.resumePost({}),
        sp_ness_settings: () => api.openSettings(),
        sp_ness_library_editor: () => openLibrary(),
        sp_ness_prompt_editor: () => api.openSettings('prompts'),
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
    const root = document.createElement('div');
    root.id = 'spi-extension-settings';
    root.className = 'extension_container spi-settings';
    root.innerHTML = `<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>SP Imagen <span class="spi-new" data-spi-new>NEW!</span></b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content"><div class="spi-actions"></div></div></div>`;
    const actions = root.querySelector('.spi-actions');
    button('Открыть SP Imagen', actions, () => openHub(), true);
    document.getElementById('extensions_settings2')?.append(root);
    refreshNewIndicators();
}

async function initialize() {
    if (initialized || initializing) return;
    initializing = true;
    try {
        await installSpImagenMediaSlots();
        settingsPanel();
        refreshNewIndicators();
        initialized = true;
    } catch (error) {
        console.error('[SP Imagen]', error);
        initializationAttempts++;
        if (initializationAttempts < 3) setTimeout(() => void initialize(), 1500);
        else toastr.error(String(error?.message || error), 'SP Imagen');
    } finally {
        initializing = false;
    }
}

globalThis.__spImagenExtension = {
    installed: true,
    version: '2.4.4',
    get hasNew() { return hasNew(); },
    set hasNew(_) {},
    run,
    openHub,
    openLibrary,
    openPrompts: () => getRuntime().then(api => api.openSettings('prompts')),
    persistImageSource,
    directGenerationEnabled,
    generateImage,
    snapshotGenerationConfig,
    getDirector,
    getAuxPrompt: effectivePrompt,
    listEditablePrompts,
    savePromptOverrides,
    generateText,
};

eventSource.on(event_types.APP_READY, initialize);
if (document.readyState !== 'loading') void initialize();
