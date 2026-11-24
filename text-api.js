import { directTextOrigin, requireTrustedDirectEndpoint, credentialRequestOptions } from './security-network.js';

export function defaultTextApiSettings() {
    return { mode: 'st', profileId: '', endpoint: '', approvedOrigin: '', apiKey: '', model: '', temperature: 0.2, maxTokens: 16000, streaming: false, jsonMode: false, jailbreak: false, jailbreakText: '', reasoningMode: 'inherit', reasoningProtocol: 'auto', reasoningEffort: 'medium', reasoningBudget: 4096 };
}

export function normalizeTextApiSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    const settings = { ...defaultTextApiSettings(), ...input };
    settings.mode = settings.mode === 'direct' ? 'direct' : 'st';
    settings.profileId = String(settings.profileId || '');
    settings.endpoint = String(settings.endpoint || '').trim().replace(/\/+$/, '');
    settings.apiKey = String(settings.apiKey || '').trim();
    settings.approvedOrigin = String(settings.approvedOrigin || '').trim();
    settings.model = String(settings.model || '').trim();
    settings.temperature = Number(settings.temperature);
    settings.maxTokens = Math.trunc(Number(settings.maxTokens));
    if (!Number.isFinite(settings.temperature) || settings.temperature < 0 || settings.temperature > 2) settings.temperature = 0.2;
    if (!Number.isInteger(settings.maxTokens) || settings.maxTokens < 1000 || settings.maxTokens > 100000) settings.maxTokens = 16000;
    settings.streaming = settings.streaming === true;
    settings.jsonMode = settings.jsonMode === true;
    settings.jailbreak = settings.jailbreak === true;
    settings.jailbreakText = String(settings.jailbreakText || '').slice(0, 10000);
    if (!['inherit','off','effort','budget'].includes(settings.reasoningMode)) settings.reasoningMode = 'inherit';
    if (!['auto','openrouter','openai','none'].includes(settings.reasoningProtocol)) settings.reasoningProtocol = 'auto';
    if (!['minimal','low','medium','high','xhigh'].includes(settings.reasoningEffort)) settings.reasoningEffort = 'medium';
    settings.reasoningBudget = Math.trunc(Number(settings.reasoningBudget));
    if (!Number.isInteger(settings.reasoningBudget) || settings.reasoningBudget < 128 || settings.reasoningBudget > 100000) settings.reasoningBudget = 4096;
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

// Provider-specific reasoning transport. Never silently send an OpenRouter
// object to OpenAI or pretend unsupported models accept adjustable thinking.
export function reasoningProtocolFor(settings, profile = null) {
    if (settings.reasoningProtocol !== 'auto') return settings.reasoningProtocol;
    const api=String(profile?.api||'').toLowerCase();
    const origin=String(profile?.['api-url']||settings.endpoint||'');
    let host='';
    try{host=new URL(origin).hostname.toLowerCase();}catch{}
    if(api.includes('openrouter')||host==='openrouter.ai'||host.endsWith('.openrouter.ai'))return 'openrouter';
    if(api==='openai'||host==='api.openai.com')return 'openai';
    return 'none';
}

export function reasoningRequestOptions(settings, profile = null, forST = false) {
    const mode = settings.reasoningMode;
    if (mode === 'inherit') return {};
    const protocol = reasoningProtocolFor(settings,profile);
    if (protocol === 'none') throw new Error('У выбранного подключения неизвестный формат reasoning. Выбери OpenRouter/OpenAI вручную или «Как в профиле».');
    if (mode === 'budget' && (protocol !== 'openrouter' || forST))
        throw new Error('Лимит токенов reasoning поддержан только для прямого OpenRouter API. В профиле ST используй уровень или его собственные настройки.');
    if (protocol === 'openrouter') {
        if (forST) return {reasoning_effort: mode === 'off' ? 'none' : settings.reasoningEffort};
        if (mode === 'off') return {reasoning:{enabled:false}};
        if (mode === 'budget') return {reasoning:{max_tokens:settings.reasoningBudget}};
        return {reasoning:{effort:settings.reasoningEffort}};
    }
    if (mode === 'budget') throw new Error('OpenAI Chat Completions не поддерживает ручной reasoning budget в этом формате. Используй усилие.');
    // OpenAI's support for "none" and xhigh depends on model version.
    // Pass exact requested effort: the API can reject unsupported values explicitly.
    const effort=mode === 'off' ? 'none' : settings.reasoningEffort;
    // For OpenAI reasoning chat models the output ceiling is max_completion_tokens.
    // ST forwards request overrides to its chat-completion backend.
    return forST
        ? {reasoning_effort:effort,max_tokens:undefined,max_completion_tokens:settings.maxTokens}
        : {reasoning_effort:effort};
}

function withManualJailbreak(settings,messages) {
    if (!settings.jailbreak) return messages;
    const extra=settings.jailbreakText.trim();
    if (!extra) throw new Error('Jailbreak включён, но его текст пуст. Введи инструкцию либо выключи галочку.');
    const list=messages.slice();
    const position=list[0]?.role==='system'?1:0;
    list.splice(position,0,{role:'system',content:extra});
    return list;
}

async function collectSillyTavernStream(response) {
    if (typeof response !== 'function') throw new Error('SillyTavern не предоставила потоковый ответ. Отключи Streaming для этого профиля.');
    let text='';
    for await (const chunk of response()) {
        if(typeof chunk?.text==='string') text=chunk.text; // ST sends cumulative text
    }
    if(!text.trim()) throw new Error('Поток завершился без итогового текста режиссёра.');
    return text.trim();
}

async function generateWithSillyTavernProfile(context, settings, messages, signal) {
    if (!settings.profileId) throw new Error('Выбери отдельный профиль подключения SillyTavern для SP Imagen.');
    const service = await connectionService(context);
    if (!service?.sendRequest) throw new Error('Менеджер профилей SillyTavern недоступен. Выбери «Прямой API».');
    const profile=service.getProfile?.(settings.profileId);
    // Profile managers preserve their native instruct formatting for text completions.
    // Model-specific overrides are supported only for chat completion profiles.
    const selectedApi=profile&&service.validateProfile?.(profile);
    if(settings.reasoningMode!=='inherit'&&selectedApi?.selected!=='openai')
        throw new Error('Ручное reasoning через профиль ST поддержано только для Chat Completion. Выбери «Как в профиле» или прямой API.');
    const overrides=reasoningRequestOptions(settings,profile,true);
    const response = await service.sendRequest(settings.profileId, withManualJailbreak(settings,messages), settings.maxTokens, {
        stream:settings.streaming, signal, extractData: true, includePreset: false, includeInstruct: true,
    },overrides);
    if(settings.streaming)return await collectSillyTavernStream(response);
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
    try { return await fetch(url, credentialRequestOptions({ ...options, signal: controller.signal })); }
    catch (error) {
        if (controller.signal.aborted && !outerSignal?.aborted) throw new Error('Текстовый API не ответил вовремя.');
        if (outerSignal?.aborted) throw error;
        if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(error?.message || error))) {
            let host = 'текстовому API';
            try { host = new URL(url).origin; } catch {}
            throw new Error('Текстовый API: Failed to fetch (' + host + '). Запрос не получил HTTP-ответ: проверь endpoint, соединение, CORS или выбери подключение через профиль SillyTavern. Автоматический повтор отключён, чтобы не создавать лишних платных запросов.', { cause: error });
        }
        throw error;
    } finally { clearTimeout(timer); outerSignal?.removeEventListener('abort', abort); }
}

function validate(settings) {
    if (!settings.endpoint) throw new Error('Укажи endpoint текстового API.');
    if (!settings.apiKey) throw new Error('Укажи API-ключ текстовой модели.');
    if (!settings.model) throw new Error('Укажи модель текстового API.');
    requireTrustedDirectEndpoint(settings.endpoint, settings.approvedOrigin);
}

async function collectDirectStream(response) {
    if (!response.body?.getReader) throw new Error('Текстовый API не вернул поток SSE. Отключи Streaming.');
    const reader=response.body.getReader(),decoder=new TextDecoder();
    let buffer='',result='',wasDone=false;
    const consume=packet=>{
        for(const line of packet.split(/\r?\n/)){
            if(!line.startsWith('data:'))continue;
            const payload=line.slice(5).trim();
            if(payload==='[DONE]'){wasDone=true;continue;}
            if(!payload)continue;
            let data;
            try{data=JSON.parse(payload)}catch{throw new Error('Провайдер вернул повреждённый SSE-фрагмент.');}
            if(data?.error)throw new Error('Ошибка текстового API при streaming: '+String(data.error?.message||data.error).slice(0,400));
            const delta=data?.choices?.[0]?.delta?.content;
            if(typeof delta==='string')result+=delta;
            else if(Array.isArray(delta)){
                for(const p of delta)if(typeof p?.text==='string')result+=p.text;
            } else if(typeof data?.choices?.[0]?.text==='string')result+=data.choices[0].text;
        }
    };
    try{
        while(!wasDone){
            const next=await reader.read();
            buffer+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done}).replace(/\r\n/g,'\n');
            let split;
            while((split=buffer.indexOf('\n\n'))!==-1){
                const packet=buffer.slice(0,split);buffer=buffer.slice(split+2);
                consume(packet);
            }
            if(next.done)break;
        }
        if(!wasDone&&buffer.trim())consume(buffer);
    }finally{try{await reader.cancel()}catch{}reader.releaseLock?.();}
    if(!result.trim())throw new Error('Streaming завершился без итогового текста. Возможно, модель потратила лимит на reasoning.');
    return result.trim();
}

export async function generateTextCompletion(input, messages, signal, context = globalThis.SillyTavern?.getContext?.()) {
    const settings = normalizeTextApiSettings(input);
    if (settings.mode === 'st') return await generateWithSillyTavernProfile(context, settings, messages, signal);
    validate(settings);
    const options=reasoningRequestOptions(settings);
    const payload={model:settings.model,messages:withManualJailbreak(settings,messages),
        stream:settings.streaming,...options};
    if(settings.reasoningMode!=='inherit'&&reasoningProtocolFor(settings)==='openai')
        payload.max_completion_tokens=settings.maxTokens;
    else payload.max_tokens=settings.maxTokens;
    // Reasoning models may reject temperature even when it is supported by
    // their non-thinking sibling. Only send it without a manual reasoning override.
    if(settings.reasoningMode==='inherit')payload.temperature=settings.temperature;
    // Explicit opt-in for compatible direct Chat Completions endpoints only.
    if(settings.jsonMode&&messages.some(m=>m.role==='system'&&String(m.content).includes('sp-imagen-slots-v1')))payload.response_format={type:'json_object'};
    const url=chatUrl(settings.endpoint);
    requireTrustedDirectEndpoint(settings.endpoint, settings.approvedOrigin);
    const optionsFetch={
        method:'POST',
        headers:{Authorization:`Bearer ${settings.apiKey}`,'Content-Type':'application/json',Accept:settings.streaming?'text/event-stream':'application/json'},
        body:JSON.stringify(payload)
    };
    if(settings.streaming){
        // Keep abort listener alive until the entire stream is consumed, not
        // just until the HTTP headers arrive. Never auto-retry billed requests.
        const controller=new AbortController();
        const abort=()=>controller.abort(signal?.reason);
        if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
        const timeout=setTimeout(()=>controller.abort(),180000);
        try{
            const response=await fetch(url,credentialRequestOptions({...optionsFetch,signal:controller.signal}));
            if(!response.ok)throw new Error(`Текстовый API: ошибка HTTP ${response.status}.`);
            return await collectDirectStream(response);
        }catch(error){
            if(controller.signal.aborted&&!signal?.aborted)throw new Error('Streaming текстовой модели превысил 3 минуты.');
            throw error;
        }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
    }
    const response=await fetchWithTimeout(url,optionsFetch,180000,signal);
    if(!response.ok) {
        throw new Error(`Текстовый API: ошибка HTTP ${response.status}.`);
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('Текстовый API вернул нечитаемый JSON.'); }
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.output_text;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Текстовый API не вернул текст. Если модель потратила все токены на reasoning, увеличь максимум токенов.');
    return content.trim();
}

export async function testSillyTavernProfile(context, input, signal, systemPrompt = 'Проверка подключения. Ответь только OK.') {
    const settings = normalizeTextApiSettings(input);
    return await generateWithSillyTavernProfile(context, { ...settings, maxTokens: Math.max(512, Math.min(1024, settings.maxTokens)) }, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'OK' },
    ], signal);
}

export async function testTextApi(input, signal) {
    const settings = normalizeTextApiSettings(input);
    if (!settings.endpoint || !settings.apiKey) throw new Error('Укажи endpoint и API-ключ.');
    requireTrustedDirectEndpoint(settings.endpoint, settings.approvedOrigin);
    const response = await fetchWithTimeout(modelsUrl(settings.endpoint), {
        cache: 'no-store', headers: { Authorization: `Bearer ${settings.apiKey}`, Accept: 'application/json' },
    }, 15000, signal);
    if (!response.ok) {
        throw new Error(`Текстовый API: ошибка HTTP ${response.status}.`);
    }
    const data = await response.json();
    const models = Array.isArray(data?.data) ? data.data.map(item => String(item?.id || '')).filter(Boolean) : [];
    return models;
}
