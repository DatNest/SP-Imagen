/** SP Imagen: parse model output as data only. Never insert model HTML into the DOM. */
const CONTRACT_ERROR = 'Ответ режиссёра не содержит полноценный HTML-блок с одним img и JSON-инструкцией. Исходный ответ сохранён в sp_imagen_last_director_raw.';

function decodeAttribute(value) {
    return String(value).replace(/&(#(?:x[\da-f]+|\d+)|quot|apos|lt|gt|amp);/gi, (match, entity) => {
        const known = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' };
        const key = entity.toLowerCase();
        if (Object.hasOwn(known, key)) return known[key];
        if (!key.startsWith('#')) return match;
        const point = key.startsWith('#x') ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
        return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    });
}

function parseJsonInstruction(value) {
    const json = String(value);
    try { return { config: JSON.parse(json), repaired: false }; }
    catch (error) {
        // Only repair escaping inside a fully closed envelope; never invent missing prompt data.
        const shape = json.match(/^\s*\{\s*"prompt"\s*:\s*"([\s\S]*)"\s*,\s*"aspect_ratio"\s*:\s*"(1:1|2:3|9:16)"\s*,\s*"image_size"\s*:\s*"1K"\s*\}\s*$/);
        if (!shape) throw new Error('Повреждённый или обрезанный JSON режиссёра. Исходный ответ сохранён в sp_imagen_last_director_raw.', { cause: error });
        const body = shape[1];
        let escaped = '';
        for (let index = 0; index < body.length; index++) {
            const char = body[index];
            if (char === '\\') {
                const next = body[index + 1];
                if (next && /["\\/bfnrt]/.test(next)) { escaped += char + next; index++; }
                else if (next === 'u' && /^[0-9a-f]{4}$/i.test(body.slice(index + 2, index + 6))) { escaped += body.slice(index, index + 6); index += 5; }
                else escaped += '\\\\';
            } else if (char === '"') escaped += '\\"';
            else if (char.charCodeAt(0) < 32) escaped += JSON.stringify(char).slice(1, -1);
            else escaped += char;
        }
        try {
            return { config: { prompt: JSON.parse('"' + escaped + '"'), aspect_ratio: shape[2], image_size: '1K' }, repaired: true };
        } catch { throw new Error('Не удалось восстановить строку JSON без потери содержимого. Исходный ответ сохранён.'); }
    }
}

function validateImageConfig(result) {
    const config = result.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)
        || Object.keys(config).sort().join(',') !== 'aspect_ratio,image_size,prompt'
        || typeof config.prompt !== 'string' || !config.prompt.trim() || config.prompt.length > 45000
        || !['1:1', '2:3', '9:16'].includes(config.aspect_ratio) || config.image_size !== '1K') {
        throw new Error('В ответе режиссёра отсутствует корректный prompt, aspect_ratio или image_size. Исходный ответ сохранён.');
    }
    return result;
}

export function parseImageHtml(raw) {
    let text = String(raw ?? '').trim();
    if (/^```/.test(text)) text = text.replace(/^```(?:html|xml|json)?[^\S\r\n]*\r?\n?/i, '').replace(/\s*```\s*$/, '').trim();
    // Some models return only the JSON payload. The same schema is validated below.
    if (text.startsWith('{') && text.endsWith('}')) return validateImageConfig(parseJsonInstruction(text));
    const envelopes = [...text.matchAll(/<(naicom|image_lite)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)];
    // A few text models omit the optional outer wrapper but still provide a complete img instruction.
    // Accept that case only when the entire answer is the single image tag.
    const inner = envelopes.length === 1 ? envelopes[0][2].trim() : envelopes.length === 0 ? text : '';
    if (!inner) throw new Error(CONTRACT_ERROR);
    const images = [...inner.matchAll(/<img\b(?:"[^"]*"|'[^']*'|[^'">])*\/?>/gi)];
    if (images.length !== 1 || inner.replace(images[0][0], '').replace(/<\/img\s*>/gi, '').trim()) throw new Error(CONTRACT_ERROR);
    const attrs = {};
    const rawTag = images[0][0].slice(4).replace(/\/?>\s*$/, '');
    const attrPattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    for (const match of rawTag.matchAll(attrPattern)) {
        const key = match[1].toLowerCase();
        if (Object.hasOwn(attrs, key)) throw new Error('Повторяющийся HTML-атрибут режиссёра: ' + key);
        attrs[key] = decodeAttribute(match[2] ?? match[3]);
    }
    if (attrs.src !== '[IMG:GEN]' || !attrs['data-iig-instruction']) {
        throw new Error('В HTML режиссёра отсутствует data-iig-instruction или src="[IMG:GEN]". Исходный ответ сохранён.');
    }
    return validateImageConfig(parseJsonInstruction(attrs['data-iig-instruction']));
}
