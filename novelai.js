export const NOVELAI_MODELS = Object.freeze({
    'nai-diffusion-5-full': 'NAI V5 Full',
    'nai-diffusion-5-full-medium': 'NAI V5 Full Medium',
    'nai-diffusion-5-curated': 'NAI V5 Curated',
    'nai-diffusion-4-5-full': 'NAI V4.5 Full',
    'nai-diffusion-4-5-curated': 'NAI V4.5 Curated',
});

export const NOVELAI_SAMPLERS = Object.freeze({
    k_euler_ancestral: 'Euler Ancestral',
    k_euler: 'Euler',
    k_dpmpp_2m: 'DPM++ 2M',
    k_dpmpp_2m_sde: 'DPM++ 2M SDE',
    k_dpmpp_2s_ancestral: 'DPM++ 2S Ancestral',
    k_dpmpp_sde: 'DPM++ SDE',
});

const MEDIUM_MODEL = 'nai-diffusion-5-full-medium';
const MEDIUM_NEGATIVE = 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page';
const DIMENSIONS = Object.freeze({
    small: { '1:1': [640, 640], '2:3': [512, 768], '3:2': [768, 512], '9:16': [448, 832], '16:9': [832, 448] },
    normal: { '1:1': [1024, 1024], '2:3': [832, 1216], '3:2': [1216, 832], '9:16': [768, 1344], '16:9': [1344, 768] },
    big: { '1:1': [1472, 1472], '2:3': [1024, 1536], '3:2': [1536, 1024], '9:16': [1088, 1920], '16:9': [1920, 1088] },
});

export function defaultNovelAISettings() {
    return {
        enabled: false,
        endpoint: 'https://image.novelai.net',
        apiKey: '',
        model: 'nai-diffusion-5-full',
        neverSpendAnlas: true,
        resolution: 'normal',
        steps: 23,
        cfgScale: 7,
        cfgRescale: 0,
        sampler: 'k_euler_ancestral',
        noiseSchedule: 'karras',
        seed: -1,
        skipCfgAboveSigma: 0,
        negativePrompt: '',
        styles: [],
        activeStyleId: '',
    };
}

export function normalizeNovelAISettings(value) {
    const defaults = defaultNovelAISettings();
    const input = value && typeof value === 'object' ? value : {};
    const settings = { ...defaults, ...input };
    settings.enabled = settings.enabled === true;
    settings.neverSpendAnlas = settings.neverSpendAnlas !== false;
    settings.endpoint = String(settings.endpoint || defaults.endpoint).trim().replace(/\/+$/, '');
    settings.apiKey = String(settings.apiKey || '').trim();
    if (!Object.hasOwn(NOVELAI_MODELS, settings.model)) settings.model = defaults.model;
    if (!Object.hasOwn(DIMENSIONS, settings.resolution)) settings.resolution = defaults.resolution;
    if (!Object.hasOwn(NOVELAI_SAMPLERS, settings.sampler)) settings.sampler = defaults.sampler;
    for (const key of ['steps', 'cfgScale', 'cfgRescale', 'seed', 'skipCfgAboveSigma']) settings[key] = Number(settings[key]);
    settings.negativePrompt = String(settings.negativePrompt || '').trim();
    settings.styles = Array.isArray(settings.styles) ? settings.styles.map((style, index) => ({
        id: String(style?.id || `spi-style-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`),
        name: String(style?.name || '').trim() || `Стиль ${index + 1}`,
        value: String(style?.value || '').trim(),
    })) : [];
    if (!settings.styles.some(style => style.id === settings.activeStyleId)) settings.activeStyleId = '';
    return settings;
}

function resolveRequestSettings(input) {
    const settings = normalizeNovelAISettings(input);
    const medium = settings.model === MEDIUM_MODEL;
    if (settings.neverSpendAnlas) {
        settings.resolution = 'normal';
        settings.steps = settings.model.startsWith('nai-diffusion-4-5-') ? 28 : 23;
    }
    if (medium) {
        settings.steps = 14;
        settings.sampler = 'k_euler_ancestral';
        settings.cfgRescale = 0;
        settings.skipCfgAboveSigma = 0;
    }
    return settings;
}

function splitCharacterPrompts(prompt) {
    const [base = '', ...characters] = String(prompt || '').split(/\\?\|/u).map(part => part.trim());
    return { base, characters };
}

function validate(settings, aspectRatio) {
    const errors = [];
    if (!settings.apiKey) errors.push('Укажи постоянный API-токен NovelAI.');
    if (!Object.hasOwn(NOVELAI_MODELS, settings.model)) errors.push('Выбери модель NovelAI.');
    if (!DIMENSIONS[settings.resolution]?.[aspectRatio]) errors.push('Выбери поддерживаемый размер и формат.');
    if (!Number.isInteger(settings.steps) || settings.steps < 1 || settings.steps > 50) errors.push('Steps: целое число от 1 до 50.');
    if (!Number.isFinite(settings.cfgScale) || settings.cfgScale < 0 || settings.cfgScale > 10) errors.push('CFG scale: от 0 до 10.');
    if (!Number.isFinite(settings.cfgRescale) || settings.cfgRescale < 0 || settings.cfgRescale > 1) errors.push('CFG rescale: от 0 до 1.');
    if (!Number.isInteger(settings.seed) || settings.seed < -1 || settings.seed > 4294967295) errors.push('Seed: -1 или число до 4294967295.');
    if (!Object.hasOwn(NOVELAI_SAMPLERS, settings.sampler)) errors.push('Выбери sampler.');
    if (!settings.model.startsWith('nai-diffusion-5-') && !['native', 'karras', 'exponential', 'polyexponential'].includes(settings.noiseSchedule)) errors.push('Выбери noise schedule.');
    if (errors.length) throw new Error(errors.join(' '));
}

function buildParameters(settings, prompt, negativePrompt, aspectRatio) {
    validate(settings, aspectRatio);
    const positive = splitCharacterPrompts(prompt);
    const medium = settings.model === MEDIUM_MODEL;
    const negative = splitCharacterPrompts(medium ? MEDIUM_NEGATIVE : negativePrompt);
    const maxCharacters = settings.model.startsWith('nai-diffusion-5-') ? 22 : 6;
    if (Math.max(positive.characters.length, negative.characters.length) > maxCharacters) throw new Error(`Эта модель поддерживает до ${maxCharacters} отдельных секций персонажей.`);
    const caption = (base, characters) => ({
        base_caption: base,
        char_captions: characters.map(char_caption => ({ char_caption, centers: [{ x: 0.5, y: 0.5 }] })),
    });
    const [width, height] = DIMENSIONS[settings.resolution][aspectRatio];
    const seed = settings.seed < 0 ? Math.floor(Math.random() * 4294967296) : settings.seed;
    const parameters = {
        params_version: 4, width, height, steps: settings.steps, scale: settings.cfgScale,
        cfg_rescale: settings.cfgRescale, sampler: settings.sampler, noise_schedule: settings.noiseSchedule,
        seed, n_samples: 1, negative_prompt: negative.base, qualityToggle: false,
        ucPreset: medium ? 0 : 3, deliberate_euler_ancestral_bug: false, prefer_brownian: true,
        skip_cfg_above_sigma: settings.skipCfgAboveSigma || null,
        v4_prompt: { caption: caption(positive.base, positive.characters), use_coords: false, use_order: true },
        v4_negative_prompt: {
            caption: caption(negative.base, Array.from({ length: Math.max(positive.characters.length, negative.characters.length) }, (_, index) => negative.characters[index] || '')),
            legacy_uc: false,
        },
    };
    if (settings.model.startsWith('nai-diffusion-5-')) { delete parameters.noise_schedule; delete parameters.skip_cfg_above_sigma; }
    if (medium) delete parameters.cfg_rescale;
    return { parameters, basePrompt: positive.base };
}

function requestUrl(settings) {
    return settings.endpoint.endsWith('/ai/generate-image') ? settings.endpoint : `${settings.endpoint}/ai/generate-image`;
}

async function fetchWithTimeout(url, options, timeoutMs, outerSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort(outerSignal?.reason);
    outerSignal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('Время ожидания NovelAI истекло.', 'TimeoutError')), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    catch (error) {
        if (controller.signal.aborted && !outerSignal?.aborted) throw new Error('Время ожидания NovelAI истекло. Повтори запуск.');
        throw error;
    } finally { clearTimeout(timer); outerSignal?.removeEventListener('abort', abort); }
}

export async function checkNovelAISubscription(input, signal) {
    const settings = normalizeNovelAISettings(input);
    if (!settings.apiKey) throw new Error('Сначала укажи API-токен NovelAI.');
    const url = new URL(requestUrl(settings));
    url.pathname = url.pathname.replace(/\/ai\/generate-image$/, '/user/subscription');
    const response = await fetchWithTimeout(url, { cache: 'no-store', headers: { Authorization: `Bearer ${settings.apiKey}`, Accept: 'application/json' } }, 15000, signal);
    if (!response.ok) throw new Error(`NovelAI ${response.status}: не удалось проверить подписку.`);
    return await response.json();
}

async function verifyFreeAccess(settings, signal) {
    const subscription = await checkNovelAISubscription(settings, signal);
    if (subscription?.active !== true || subscription.tier !== 3 || !Number.isFinite(subscription.expiresAt) || subscription.expiresAt * 1000 <= Date.now()) {
        throw new Error('Защита Anlas требует активную подписку NovelAI Opus. Можно выключить защиту в настройках подключения.');
    }
    const usage = subscription.usage;
    const regular = usage?.isNegative === false && Number.isFinite(usage.percent) && usage.percent > 0;
    const extra = Number.isFinite(usage?.purchasedPercent) && usage.purchasedPercent > 0 && usage.purchasedPercent <= 400;
    if (settings.model.startsWith('nai-diffusion-5-') && !regular && !extra) throw new Error('Защита Anlas: доступный лимит V5 не найден.');
}

export async function generateNovelAI({ settings: input, prompt, style = '', aspectRatio = '2:3', signal }) {
    const settings = resolveRequestSettings(input);
    const fullPrompt = [String(style || '').trim(), String(prompt || '').trim()].filter(Boolean).join(', ');
    if (!fullPrompt) throw new Error('Промпт изображения пуст.');
    const { parameters, basePrompt } = buildParameters(settings, fullPrompt, settings.negativePrompt, aspectRatio);
    if (settings.neverSpendAnlas) await verifyFreeAccess(settings, signal);
    const response = await fetchWithTimeout(requestUrl(settings), {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'generate', model: settings.model, input: basePrompt, parameters }),
    }, 600000, signal);
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`NovelAI ${response.status}: ${detail.slice(0, 800)}`);
    }
    let result;
    try { result = await response.json(); } catch { throw new Error('NovelAI вернул ответ, который не удалось прочитать.'); }
    const image = result?.images?.[0]?.image;
    if (typeof image !== 'string' || !image.trim()) throw new Error('NovelAI не вернул картинку.');
    return { src: `data:image/png;base64,${image}`, seed: parameters.seed, settings };
}
