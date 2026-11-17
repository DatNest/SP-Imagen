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
export const NOVELAI_SCHEDULES = Object.freeze({
    native: 'Native', karras: 'Karras', exponential: 'Exponential', polyexponential: 'Polyexponential',
});
const UC_PRESET_IDS = Object.freeze({ heavy: 0, light: 1, furry: 2, human: 3, none: 4 });

export function novelAIModelCapabilities(model) {
    const medium = model === MEDIUM_MODEL;
    const v5 = model.startsWith('nai-diffusion-5-');
    return { medium, v5, customUndesiredContent: !medium, cfgRescale: !medium,
        sampler: !medium, steps: !medium, scheduler: !v5 };
}
const UC_HEAVY_COMMON = 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page';
const UC_LIGHT_V5 = 'lowres, bad hands, bad anatomy, artistic error, sepia, white haze, worst quality, very displeasing, jpeg artifacts, 0::ai-generated::';
const UC_FURRY_COMMON = '{worst quality}, distracting watermark, unfinished, bad quality, {widescreen}, upscale, {sequence}, {{grandfathered content}}, blurred foreground, chromatic aberration, sketch, everyone, [sketch background], simple, [flat colors], ych (character), outline, multiple scenes, [[horror (theme)]], comic';
const UC_HUMAN_COMMON = `${UC_HEAVY_COMMON}, @_@, mismatched pupils, glowing eyes, bad anatomy`;
const UC_LIGHT_V45_FULL = 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page';
const UC_HEAVY_V45_CURATED = 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page';
const UC_LIGHT_V45_CURATED = 'blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page';
const UC_HUMAN_V45_CURATED = 'blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page';
const NEGATIVE_PRESETS = Object.freeze({
    'nai-diffusion-5-full': Object.freeze({ human: UC_HUMAN_COMMON, heavy: UC_HEAVY_COMMON, light: UC_LIGHT_V5, furry: UC_FURRY_COMMON, none: '' }),
    'nai-diffusion-5-curated': Object.freeze({ human: UC_HUMAN_COMMON, heavy: UC_HEAVY_COMMON, light: UC_LIGHT_V5, furry: UC_FURRY_COMMON, none: '' }),
    'nai-diffusion-4-5-full': Object.freeze({ human: UC_HUMAN_COMMON, heavy: UC_HEAVY_COMMON, light: UC_LIGHT_V45_FULL, furry: UC_FURRY_COMMON, none: '' }),
    'nai-diffusion-4-5-curated': Object.freeze({ human: UC_HUMAN_V45_CURATED, heavy: UC_HEAVY_V45_CURATED, light: UC_LIGHT_V45_CURATED, none: '' }),
});
const NEGATIVE_PRESET_LABELS = Object.freeze({ human: 'Люди · рекомендуется', heavy: 'Сильный', light: 'Лёгкий', furry: 'Фурри', none: 'Без встроенного негатива' });
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
        negativePreset: 'human',
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
    const negativePresets = NEGATIVE_PRESETS[settings.model === MEDIUM_MODEL ? 'nai-diffusion-5-full' : settings.model];
    if (!negativePresets || !Object.hasOwn(negativePresets, settings.negativePreset)) settings.negativePreset = defaults.negativePreset;
    if (!Object.hasOwn(DIMENSIONS, settings.resolution)) settings.resolution = defaults.resolution;
    if (!Object.hasOwn(NOVELAI_SAMPLERS, settings.sampler)) settings.sampler = defaults.sampler;
    if (!Object.hasOwn(NOVELAI_SCHEDULES, settings.noiseSchedule)) settings.noiseSchedule = defaults.noiseSchedule;
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

export function getNovelAINegativePresetOptions(model) {
    if (model === MEDIUM_MODEL) return { heavy: 'Сильный · фиксирован' };
    const presets = NEGATIVE_PRESETS[model] || NEGATIVE_PRESETS['nai-diffusion-5-full'];
    return Object.fromEntries(Object.keys(presets).map(key => [key, NEGATIVE_PRESET_LABELS[key]]));
}

// The same effective values are shown in the UI and used for every API request.
// Stored user settings stay untouched so switching back from Medium restores them.
export function resolveNovelAIRequestSettings(input) {
    const settings = normalizeNovelAISettings(input);
    if (settings.neverSpendAnlas) {
        if (settings.resolution === 'big') settings.resolution = 'normal';
        settings.steps = Math.min(settings.steps, 28);
    }
    if (settings.model === MEDIUM_MODEL) {
        settings.steps = 14;
        settings.sampler = 'k_euler_ancestral';
        settings.cfgRescale = 0;
        settings.skipCfgAboveSigma = 0;
        settings.negativePreset = 'heavy';
        settings.negativePrompt = '';
    }
    return settings;
}

// To stay faithful to the working ExtBlocks flow, send the director prompt to
// NovelAI as ONE intact line. Do not split characters, bubbles or Text: into
// separate client-side structures. ExtBlocks passed one finished prompt line to
// the image backend; reproducing that path keeps speech-bubble instructions and
// printed text exactly where the director placed them.
export function splitCharacterPrompts(prompt) {
    return { base: String(prompt || '').trim(), characters: [] };
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
    const customNegative = splitCharacterPrompts(medium ? '' : negativePrompt);
    const presetText = medium ? UC_HEAVY_COMMON : NEGATIVE_PRESETS[settings.model]?.[settings.negativePreset] || '';
    // Use the ORIGINAL stored negative preset byte-for-byte for every mode.
    // Do not filter, edit, rephrase or auto-correct any prompt text.
    const negative = {
        base: [presetText, customNegative.base].filter(Boolean).join(', '),
        characters: customNegative.characters,
    };
    const maxCharacters = settings.model.startsWith('nai-diffusion-5-') ? 22 : 6;
    if (Math.max(positive.characters.length, negative.characters.length) > maxCharacters) throw new Error(`Эта модель поддерживает до ${maxCharacters} отдельных секций персонажей.`);
    const caption = (base, characters) => ({
        base_caption: base,
        char_captions: characters.map(char_caption => ({ char_caption, centers: [{ x: 0.5, y: 0.5 }] })),
    });
    const [width, height] = DIMENSIONS[settings.resolution][aspectRatio];
    const seed = settings.seed < 0 ? Math.floor(Math.random() * 4294967296) : settings.seed;
    const parameters = {
        params_version: 4, prompt: positive.base, width, height, steps: settings.steps, scale: settings.cfgScale,
        cfg_rescale: settings.cfgRescale, sampler: settings.sampler, noise_schedule: settings.noiseSchedule,
        seed, n_samples: 1, negative_prompt: negative.base, qualityToggle: false,
        ucPreset: UC_PRESET_IDS[settings.negativePreset], deliberate_euler_ancestral_bug: false, prefer_brownian: true,
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

export async function generateNovelAI({ settings: input, prompt, style = '', aspectRatio = '2:3', kind = 'snapshot', signal }) {
    const settings = resolveNovelAIRequestSettings(input);
    const fullPrompt = [String(style || '').trim(), String(prompt || '').trim()].filter(Boolean).join(', ');
    if (!fullPrompt) throw new Error('Промпт изображения пуст.');
    const { parameters, basePrompt } = buildParameters(settings, fullPrompt, settings.negativePrompt, aspectRatio);
    if (settings.neverSpendAnlas) await verifyFreeAccess(settings, signal);
    const response = await fetchWithTimeout(requestUrl(settings), {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/zip, application/octet-stream, application/json' },
        body: JSON.stringify({ action: 'generate', model: settings.model, input: basePrompt, parameters }),
    }, 600000, signal);
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`NovelAI ${response.status}: ${detail.slice(0, 800)}`);
    }
    const src = await imageSourceFromNovelAIResponse(response);
    return { src, seed: parameters.seed, settings };
}


// /ai/generate-image responds with a ZIP containing image_0.png.
// Read the central directory rather than local header sizes (ZIP bit 3 may be set).
async function imageSourceFromNovelAIResponse(response) {
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length > 80 * 1024 * 1024) throw new Error('NovelAI вернул слишком большой архив изображения.');
    if (bytes.length < 4) throw new Error('NovelAI вернул пустой или повреждённый файл.');
    const magic = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) >>> 0;
    if (magic === 0x04034b50) {
        const imageBytes = await firstImageFromZip(bytes);
        return 'data:' + guessImageMime(imageBytes) + ';base64,' + bytesToBase64(imageBytes);
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'data:image/png;base64,' + bytesToBase64(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'data:image/jpeg;base64,' + bytesToBase64(bytes);
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'data:image/webp;base64,' + bytesToBase64(bytes);
    if (bytes[0] === 0x7b) {
        let result;
        try { result = JSON.parse(new TextDecoder().decode(bytes)); }
        catch { throw new Error('NovelAI вернул повреждённый JSON вместо картинки.'); }
        const image = result?.images?.[0]?.image;
        if (typeof image === 'string' && image.trim()) return image.startsWith('data:') ? image : 'data:image/png;base64,' + image;
    }
    throw new Error('NovelAI вернул неподдерживаемый формат. Ожидался ZIP с PNG.');
}

function guessImageMime(bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/webp';
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
    throw new Error('В архиве NovelAI найден файл с неизвестным типом изображения.');
}

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }
    if (typeof btoa === 'function') return btoa(binary);
    throw new Error('В браузере отсутствует функция Base64 для сохранения изображения.');
}

async function firstImageFromZip(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = n => view.getUint16(n, true);
    const u32 = n => view.getUint32(n, true);
    let end = -1;
    // EOCD must appear in the last 65,557 bytes of a conventional ZIP.
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
        if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) { end = p; break; }
    }
    if (end < 0) throw new Error('В ответе NovelAI отсутствует таблица ZIP-архива.');
    const entries = u16(end + 10), centralOffset = u32(end + 16);
    if (!entries || entries > 64 || centralOffset >= end) throw new Error('Список файлов NovelAI ZIP повреждён.');
    const decoder = new TextDecoder();
    let pos = centralOffset;
    for (let i = 0; i < entries; i++) {
        if (pos + 46 > bytes.length || u32(pos) !== 0x02014b50) throw new Error('Повреждён индекс архива NovelAI.');
        const flags = u16(pos + 8), method = u16(pos + 10), compSize = u32(pos + 20), rawSize = u32(pos + 24);
        const nameSize = u16(pos + 28), extraSize = u16(pos + 30), commentSize = u16(pos + 32), local = u32(pos + 42);
        if (pos + 46 + nameSize + extraSize + commentSize > bytes.length) throw new Error('Повреждено имя файла NovelAI.');
        const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameSize));
        pos += 46 + nameSize + extraSize + commentSize;
        if (!/\.(png|jpe?g|webp)$/i.test(name) || name.endsWith('/')) continue;
        if (flags & 1) throw new Error('NovelAI вернул зашифрованный ZIP.');
        if (![0, 8].includes(method) || compSize > 60 * 1024 * 1024 || rawSize > 60 * 1024 * 1024) throw new Error('Неподдерживаемый метод сжатия ZIP NovelAI.');
        if (local + 30 > bytes.length || u32(local) !== 0x04034b50) throw new Error('Повреждён локальный заголовок ZIP NovelAI.');
        const start = local + 30 + u16(local + 26) + u16(local + 28);
        if (start + compSize > bytes.length) throw new Error('Повреждён файл в ZIP NovelAI.');
        const compressed = bytes.subarray(start, start + compSize);
        if (method === 0) return compressed;
        if (typeof DecompressionStream !== 'function') throw new Error('Браузер не поддерживает распаковку ZIP (DecompressionStream). Обнови браузер.');
        let data;
        try {
            const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            data = new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (e) {
            throw new Error('Не удалось распаковать изображение NovelAI: ' + String(e?.message || e));
        }
        if (rawSize !== data.length) throw new Error('Изображение NovelAI не прошло проверку размера ZIP.');
        return data;
    }
    throw new Error('ZIP-архив NovelAI не содержит PNG/JPEG/WebP.');
}

// Pure helpers for local regression tests.
export const __spImagenNovelAITest = Object.freeze({ buildParameters, imageSourceFromNovelAIResponse });
