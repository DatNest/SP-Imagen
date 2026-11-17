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
let requestServicesPromise;
let proxyPresetsPromise;
async function connectionService(context) {
    if (context?.ConnectionManagerRequestService) return context.ConnectionManagerRequestService;
    if (!connectionServicePromise) connectionServicePromise = import('../../shared.js').then(module => module.ConnectionManagerRequestService || null).catch(() => null);
    return await connectionServicePromise;
}

async function requestServices(context) {
    if (context?.ChatCompletionService && context?.TextCompletionService) {
        return { chat: context.ChatCompletionService, text: context.TextCompletionService };
    }
    if (!requestServicesPromise) {
        requestServicesPromise = import('../../../custom-request.js').then(module => ({
            chat: module.ChatCompletionService || null,
            text: module.TextCompletionService || null,
        })).catch(() => ({ chat: null, text: null }));
    }
    const imported = await requestServicesPromise;
    return {
        chat: context?.ChatCompletionService || imported.chat,
        text: context?.TextCompletionService || imported.text,
    };
}

function selectedProfile(context, service, profileId) {
    const profiles = context?.extensionSettings?.connectionManager?.profiles;
    const profile = Array.isArray(profiles) ? profiles.find(item => item?.id === profileId) : null;
    if (profile) return profile;
    return service?.getProfile?.(profileId) || null;
}

function selectedApiMap(context, service, profile) {
    const mapped = profile?.api ? context?.CONNECT_API_MAP?.[profile.api] : null;
    if (mapped) return mapped;
    return service?.validateProfile?.(profile) || null;
}

async function selectedProxy(profile) {
    if (!profile?.proxy) return null;
    if (!proxyPresetsPromise) {
        proxyPresetsPromise = import('../../../openai.js').then(module => Array.isArray(module.proxies) ? module.proxies : []).catch(() => []);
    }
    const presets = await proxyPresetsPromise;
    return presets.find(item => item?.name === profile.proxy) || null;
}

async function sendStrictProfileRequest(context, service, profileId, messages, maxTokens, temperature, signal) {
    const profile = selectedProfile(context, service, profileId);
    const apiMap = selectedApiMap(context, service, profile);
    if (!profile || !apiMap?.selected) return { supported: false };
    const services = await requestServices(context);
    if (apiMap.selected === 'openai' && apiMap.source && services.chat?.processRequest) {
        const proxy = await selectedProxy(profile);
        const response = await services.chat.processRequest({
            stream: false,
            messages,
            max_tokens: maxTokens,
            temperature,
            model: profile.model,
            chat_completion_source: apiMap.source,
            secret_id: profile['secret-id'],
            custom_url: profile['api-url'],
            vertexai_region: profile['api-url'],
            zai_endpoint: profile['api-url'],
            siliconflow_endpoint: profile['api-url'],
            minimax_endpoint: profile['api-url'],
            reverse_proxy: proxy?.url,
            proxy_password: proxy?.password,
            custom_prompt_post_processing: profile['prompt-post-processing'],
        }, { presetName: undefined }, true, signal);
        return { supported: true, response };
    }
    if (apiMap.selected === 'textgenerationwebui' && apiMap.type && services.text?.processRequest) {
        const response = await services.text.processRequest({
            stream: false,
            prompt: messages,
            max_tokens: maxTokens,
            temperature,
            model: profile.model,
            api_type: apiMap.type,
            api_server: profile['api-url'],
            secret_id: profile['secret-id'],
        }, { presetName: undefined, instructName: undefined, instructSettings: undefined }, true, signal);
        return { supported: true, response };
    }
    return { supported: false };
}

export async function listSillyTavernProfiles(context) {
    const service = await connectionService(context);
    const source = await Promise.resolve(service?.getSupportedProfiles?.() || context?.extensionSettings?.connectionManager?.profiles || []);
    return (Array.isArray(source) ? source : []).map(profile => typeof profile === 'string'
        ? { id: profile, name: profile }
        : { id: String(profile?.id || ''), name: String(profile?.name || profile?.id || 'Профиль') }).filter(profile => profile.id);
}

export function extractCompletionText(response) {
    if (typeof response === 'string') return response.trim();
    if (response?.data && typeof response.data === 'object' && response.data !== response) {
        const nested = extractCompletionText(response.data);
        if (nested) return nested;
    }
    const direct = [response?.content, response?.text, response?.data, response?.output_text].find(value => typeof value === 'string');
    if (direct?.trim()) return direct.trim();
    const message = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? response?.message?.content;
    if (typeof message === 'string' && message.trim()) return message.trim();
    const blocks = Array.isArray(message) ? message : Array.isArray(response?.content) ? response.content : Array.isArray(response?.output) ? response.output : [];
    const text = blocks.flatMap(block => Array.isArray(block?.content) ? block.content : [block])
        .filter(block => !['reasoning', 'thinking', 'analysis'].includes(String(block?.type || '').toLowerCase()))
        .map(block => typeof block === 'string' ? block : block?.text ?? block?.content ?? '')
        .filter(value => typeof value === 'string' && value.trim()).join('\n').trim();
    return text;
}

async function generateWithSillyTavernProfile(context, settings, messages, signal) {
    if (!settings.profileId) throw new Error('Выбери отдельный профиль подключения SillyTavern для SP Imagen.');
    const service = await connectionService(context);
    if (!service) throw new Error('Менеджер профилей SillyTavern недоступен. Выбери «Прямой API».');
    const isolated = await sendStrictProfileRequest(context, service, settings.profileId, messages, settings.maxTokens, settings.temperature, signal);
    if (!isolated.supported) throw new Error('Эта версия SillyTavern не поддерживает изолированный запрос. Обнови SillyTavern или выбери «Прямой API».');
    const response = isolated.response;
    const content = extractCompletionText(response);
    if (!content) throw new Error('Профиль SillyTavern вернул пустой ответ.');
    return content;
}

function chatUrl(endpoint) {
    if (/\/chat\/completions$/i.test(endpoint)) return endpoint;
    return `${endpoint}/chat/completions`;
}

async function fetchWithTimeout(url, options, timeoutMs, outerSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort(outerSignal?.reason);
    outerSignal?.addEventListener('abort', abort, { once: true });
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
    const content = extractCompletionText(data);
    if (!content) throw new Error('Текстовый API не вернул текст.');
    return content;
}

export async function testSillyTavernProfile(context, input, signal) {
    const settings = normalizeTextApiSettings(input);
    return await generateWithSillyTavernProfile(context, { ...settings, maxTokens: 64 }, [
        { role: 'system', content: 'Проверка подключения. Ответь только OK.' },
        { role: 'user', content: 'OK' },
    ], signal);
}

export async function testTextApi(input, signal) {
    const settings = normalizeTextApiSettings(input);
    return await generateTextCompletion({ ...settings, mode: 'direct', maxTokens: 1000 }, [
        { role: 'system', content: 'Проверка подключения. Ответь только OK.' },
        { role: 'user', content: 'OK' },
    ], signal);
}
