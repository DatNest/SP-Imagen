export function defaultTextApiSettings() {
    return { mode: 'st', profileId: '', endpoint: '', apiKey: '', model: '', temperature: 0.2, maxTokens: 16000 };
}

export function normalizeTextApiSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    const settings = { ...defaultTextApiSettings(), ...input };
    settings.mode = settings.mode === 'direct' ? 'direct' : 'st';
    settings.profileId = String(settings.profileId || '');
    settings.endpoint = String(settings.endpoint || '').trim().replace(/\/+$/, '');
    settings.apiKey = String(settings.apiKey || '').trim();
    settings.model = String(settings.model || '').trim();
    settings.temperature = Number(settings.temperature);
    settings.maxTokens = Math.trunc(Number(settings.maxTokens));
    if (!Number.isFinite(settings.temperature) || settings.temperature < 0 || settings.temperature > 2) settings.temperature = 0.2;
    if (!Number.isInteger(settings.maxTokens) || settings.maxTokens < 1000 || settings.maxTokens > 100000) settings.maxTokens = 16000;
    return settings;
}

let connectionServicePromise;
async function connectionService(context) {
    if (context?.ConnectionManagerRequestService) return context.ConnectionManagerRequestService;
    if (!connectionServicePromise) connectionServicePromise = import('../../shared.js').then(module => module.ConnectionManagerRequestService || null).catch(() => null);
    return await connectionServicePromise;
}

export async function listSillyTavernProfiles(context) {
    const service = await connectionService(context);
    const source = await Promise.resolve(service?.getSupportedProfiles?.() || context?.extensionSettings?.connectionManager?.profiles || []);
    return (Array.isArray(source) ? source : []).map(profile => typeof profile === 'string'
        ? { id: profile, name: profile }
        : { id: String(profile?.id || ''), name: String(profile?.name || profile?.id || 'Профиль') }).filter(profile => profile.id);
}

async function generateWithSillyTavernProfile(context, settings, messages, signal) {
    if (!settings.profileId) throw new Error('Выбери отдельный профиль подключения SillyTavern для SP Imagen.');
    const service = await connectionService(context);
    if (!service?.sendRequest) throw new Error('Менеджер профилей SillyTavern недоступен. Выбери «Прямой API».');
    const response = await service.sendRequest(settings.profileId, messages, settings.maxTokens, {
        stream: false, signal, extractData: true, includePreset: false, includeInstruct: true,
    });
    const content = typeof response === 'string' ? response : response?.content ?? response?.text;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Профиль SillyTavern вернул пустой ответ.');
    return content.trim();
}

function chatUrl(endpoint) {
    if (/\/chat\/completions$/i.test(endpoint)) return endpoint;
    return `${endpoint}/chat/completions`;
}

function modelsUrl(endpoint) {
    try {
        const url = new URL(chatUrl(endpoint));
        url.pathname = url.pathname.replace(/\/chat\/completions$/i, '/models');
        return url.href;
    } catch { return `${endpoint}/models`; }
}

async function fetchWithTimeout(url, options, timeoutMs, outerSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort(outerSignal?.reason);
    if (outerSignal?.aborted) abort();
    else outerSignal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    catch (error) {
        if (controller.signal.aborted && !outerSignal?.aborted) throw new Error('Текстовый API не ответил вовремя.');
        throw error;
    } finally { clearTimeout(timer); outerSignal?.removeEventListener('abort', abort); }
}

function validate(settings) {
    if (!settings.endpoint) throw new Error('Укажи endpoint текстового API.');
    if (!settings.apiKey) throw new Error('Укажи API-ключ текстовой модели.');
    if (!settings.model) throw new Error('Укажи модель текстового API.');
}

export async function generateTextCompletion(input, messages, signal, context = globalThis.SillyTavern?.getContext?.()) {
    const settings = normalizeTextApiSettings(input);
    if (settings.mode === 'st') return await generateWithSillyTavernProfile(context, settings, messages, signal);
    validate(settings);
    const response = await fetchWithTimeout(chatUrl(settings.endpoint), {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: settings.model, messages, temperature: settings.temperature, max_tokens: settings.maxTokens, stream: false }),
    }, 180000, signal);
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Текстовый API ${response.status}: ${detail.slice(0, 800)}`);
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('Текстовый API вернул нечитаемый JSON.'); }
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.output_text;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Текстовый API не вернул текст.');
    return content.trim();
}

export async function testSillyTavernProfile(context, input, signal, systemPrompt = 'Проверка подключения. Ответь только OK.') {
    const settings = normalizeTextApiSettings(input);
    return await generateWithSillyTavernProfile(context, { ...settings, maxTokens: 64 }, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'OK' },
    ], signal);
}

export async function testTextApi(input, signal) {
    const settings = normalizeTextApiSettings(input);
    if (!settings.endpoint || !settings.apiKey) throw new Error('Укажи endpoint и API-ключ.');
    const response = await fetchWithTimeout(modelsUrl(settings.endpoint), {
        cache: 'no-store', headers: { Authorization: `Bearer ${settings.apiKey}`, Accept: 'application/json' },
    }, 15000, signal);
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Текстовый API ${response.status}: ${detail.slice(0, 500)}`);
    }
    const data = await response.json();
    const models = Array.isArray(data?.data) ? data.data.map(item => String(item?.id || '')).filter(Boolean) : [];
    return models;
}
