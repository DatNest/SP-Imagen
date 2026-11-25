import { credentialRequestOptions, isLocalGalleryImage } from './security-network.js';
import { parseCfgNumber, NOVELAI_SAMPLERS } from './novelai.js';

export const NAISTERA_ORIGIN = 'https://naistera.org';
export const NAISTERA_MODELS = Object.freeze({
    'novelai-v5': 'NovelAI V5',
    'novelai-v5-medium': 'NovelAI V5 Medium',
    'novelai-v4.5': 'NovelAI V4.5',
});
export function normalizeNaisteraSettings(input = {}) {
    const s = input || {};
    return {
        apiKey: String(s.apiKey || '').trim(),
        model: Object.hasOwn(NAISTERA_MODELS,s.model) ? s.model : 'novelai-v5',
        steps: s.steps === undefined ? 23 : parseCfgNumber(s.steps),
        cfgScale: s.cfgScale === undefined ? 7 : parseCfgNumber(s.cfgScale),
        cfgRescale: s.cfgRescale === undefined ? 0 : parseCfgNumber(s.cfgRescale),
        sampler: Object.hasOwn(NOVELAI_SAMPLERS,s.sampler) ? s.sampler : 'k_euler_ancestral',
        negativePrompt: String(s.negativePrompt || '').trim(),
    };
}
export function validateNaisteraSettings(s) {
    if (!s.apiKey || /^pst-/i.test(s.apiKey)) throw Error('Укажи токен NAISTERA, а не постоянный токен NovelAI.');
    if (!Number.isInteger(s.steps) || s.steps < 1 || s.steps > 50) throw Error('Steps: целое число от 1 до 50.');
    if (!Number.isFinite(s.cfgScale) || s.cfgScale < 0 || s.cfgScale > 10) throw Error('CFG scale: от 0 до 10.');
    if (!Number.isFinite(s.cfgRescale) || s.cfgRescale < 0 || s.cfgRescale > 1) throw Error('CFG rescale: от 0 до 1.');
}
export function imageProvider(state, config, reuseSnapshot = false) {
    const snapshot = reuseSnapshot ? config?.spImagenDirect : null;
    if (reuseSnapshot) return snapshot?.provider === 'naistera' ? 'naistera' : 'novelai';
    return state.imageProvider === 'naistera' ? 'naistera' : 'novelai';
}
export function publicNaisteraSettings(s) {
    return {model:s.model,steps:s.steps,cfgScale:s.cfgScale,cfgRescale:s.cfgRescale,sampler:s.sampler,negativePrompt:s.negativePrompt};
}
function headers(s) {
    if (!s.apiKey || /^pst-/i.test(s.apiKey)) throw Error('Укажи токен NAISTERA, а не постоянный токен NovelAI.');
    return {Authorization:'Bearer '+s.apiKey,Accept:'application/json'};
}
async function request(path, s, options, signal) {
    const response = await fetch(NAISTERA_ORIGIN + path, credentialRequestOptions({
        ...options, headers:{...headers(s),...options?.headers}, signal,
    }));
    if (!response.ok) throw Error('NAISTERA: HTTP '+response.status+'. Проверь токен, доступ к модели и остаток кредитов.');
    return response.json();
}
async function bounded(signal, ms, run) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort',abort,{once:true});
    const timer = setTimeout(()=>controller.abort(),ms);
    try {
        if (controller.signal.aborted) throw Error('Запрос отменён.');
        return await run(controller.signal);
    } catch (error) {
        if (signal?.aborted) throw error;
        if (controller.signal.aborted) throw Error('NAISTERA: время ожидания истекло. Запрос мог быть принят; автоматического повтора нет.');
        if (error instanceof TypeError) throw Error('NAISTERA: сеть или CORS. Проверь соединение. Автоматического повтора нет.');
        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort',abort);
    }
}
async function catalog(s, signal) {
    const data = await request('/api/models',s,{method:'GET'},signal);
    if (data?.authenticated === false) throw Error('NAISTERA: токен не подтверждён.');
    const models = Array.isArray(data?.models) ? data.models : [];
    return models.filter(m=>Object.hasOwn(NAISTERA_MODELS,m?.id) && m.visible!==false && m.deprecated!==true);
}
export async function checkNaisteraConnection(input, signal) {
    const s=normalizeNaisteraSettings(input);
    return bounded(signal,15000,async sig=>{
        const models=await catalog(s,sig);
        if (!models.length) throw Error('NAISTERA: доступные модели NovelAI не найдены.');
        return models.map(m=>m.id);
    });
}
function numberRule(rule,value,name,integer=false) {
    if (!rule || !Number.isFinite(rule.min) || !Number.isFinite(rule.max) || rule.min>rule.max)
        throw Error('NAISTERA: неизвестные ограничения '+name+'.');
    if (!Number.isFinite(value) || (integer && !Number.isInteger(value)) || value<rule.min || value>rule.max)
        throw Error('NAISTERA: '+name+' — от '+rule.min+' до '+rule.max+'.');
    return value;
}
export function buildNaisteraPayload(s, model, prompt, style, aspectRatio) {
    if (!['1:1','2:3','3:2','9:16','16:9'].includes(aspectRatio)) throw Error('NAISTERA: неподдерживаемый формат.');
    const medium=s.model==='novelai-v5-medium';
    const rules=model?.parameters;
    if (!rules || !Array.isArray(rules.sampler?.choices)) throw Error('NAISTERA: параметры модели недоступны.');
    const full=[String(style||'').trim(),String(prompt||'').trim()].filter(Boolean).join(', ');
    if (!String(prompt||'').trim()) throw Error('Промпт изображения пуст.');
    const sampler=medium?'k_euler_ancestral':s.sampler;
    if (!rules.sampler.choices.includes(sampler)) throw Error('NAISTERA: sampler недоступен для выбранной модели.');
    const body={prompt:full,aspect_ratio:aspectRatio,model:s.model,
        steps:numberRule(rules.steps,medium?14:s.steps,'Steps',true),
        scale:numberRule(rules.scale,s.cfgScale,'CFG scale'),sampler};
    if (!medium && rules.cfg_rescale) body.cfg_rescale=numberRule(rules.cfg_rescale,s.cfgRescale,'CFG rescale');
    if (!medium && model.negative_prompt===true && s.negativePrompt) body.negative_prompt=s.negativePrompt;
    return body;
}
function delay(ms,signal) {
    return new Promise((resolve,reject)=>{
        if(signal.aborted){reject(signal.reason);return;}
        const stop=()=>{clearTimeout(timer);reject(signal.reason);};
        const timer=setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},ms);
        signal.addEventListener('abort',stop,{once:true});
    });
}
export async function generateNaistera({settings:input,prompt,style='',aspectRatio='2:3',signal}) {
    const s=normalizeNaisteraSettings(input);
    validateNaisteraSettings(s);
    return bounded(signal,600000,async sig=>{
        const models=await catalog(s,sig);
        const model=models.find(m=>m.id===s.model);
        if (!model) throw Error('NAISTERA: выбранная модель недоступна.');
        const body=buildNaisteraPayload(s,model,prompt,style,aspectRatio);
        let result=await request('/api/generate',s,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},sig);
        const job=result?.job_id;
        if (job && !result?.data_url) {
            if (!/^[a-zA-Z0-9_-]{1,128}$/.test(String(job))) throw Error('NAISTERA: некорректный ID задачи.');
            while (!result?.data_url) {
                if (result?.status==='failed'||result?.status==='cancelled'||result?.error) throw Error('NAISTERA: генерация не завершилась.');
                if (result?.status==='completed') throw Error('NAISTERA: изображение отсутствует.');
                await delay(3000,sig);
                result=await request('/api/generate/jobs/'+encodeURIComponent(job),s,{method:'GET'},sig);
            }
        }
        if (result?.media_kind==='video' || !/^data:image\/(?:png|jpe?g|webp);base64,/i.test(result?.data_url||'') || !isLocalGalleryImage(result.data_url))
            throw Error('NAISTERA: ответ не содержит поддерживаемое изображение.');
        return {src:result.data_url,seed:null,settings:{...publicNaisteraSettings(s),steps:body.steps,sampler:body.sampler,cfgRescale:body.cfg_rescale??0,negativePrompt:body.negative_prompt||''}};
    });
}
