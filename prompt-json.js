// Dedicated exchange format for the three director prompts. No automatic edits to shipped prompts.
export const SP_IMAGEN_PROMPT_JSON_FORMAT = 'sp-imagen-prompts';
export const SP_IMAGEN_PROMPT_JSON_KEYS = Object.freeze([
    'sp_ness_snapshot_director',
    'sp_ness_comic_director',
    'sp_ness_story_page_director',
]);

export function createPromptJson(prompts = {}, { template = false } = {}) {
    const rows = {};
    for (const key of SP_IMAGEN_PROMPT_JSON_KEYS) {
        const existing = prompts?.[key];
        rows[key] = template || typeof existing !== 'string' || !existing.trim() ? 'test' : existing;
    }
    return { format: SP_IMAGEN_PROMPT_JSON_FORMAT, version: 1, prompts: rows };
}

export function parsePromptJson(text) {
    if (typeof text !== 'string' || text.length > 1048576) throw Error('JSON слишком большой (максимум 1 МБ).');
    const contents = text.replace(/^\uFEFF/, '').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1');
    if (!contents) throw Error('JSON пустой. Скачай шаблон и заполни поля.');
    let raw;
    try { raw = JSON.parse(contents); } catch { throw Error('Не получилось прочитать JSON. Проверь кавычки и запятые.'); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        raw.format !== SP_IMAGEN_PROMPT_JSON_FORMAT || raw.version !== 1 ||
        !raw.prompts || typeof raw.prompts !== 'object' || Array.isArray(raw.prompts)) {
        throw Error('Нужен JSON промптов SP Imagen версии 1. Скачай шаблон для примера.');
    }
    const unexpected = Object.keys(raw.prompts).filter(key => !SP_IMAGEN_PROMPT_JSON_KEYS.includes(key));
    if (unexpected.length) throw Error('Неизвестное поле промпта: ' + unexpected[0]);
    const parsed = {};
    for (const key of SP_IMAGEN_PROMPT_JSON_KEYS) {
        const value = raw.prompts[key];
        if (typeof value !== 'string' || !value.trim()) throw Error(`Поле ${key} должно содержать непустой текст.`);
        parsed[key] = value;
    }
    return parsed;
}
