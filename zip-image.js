/** Minimal dependency-free ZIP reader for NovelAI's image_0.png output. */
export async function extractNovelAiPng(input) {
    const data = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (data.byteLength < 22 || data.byteLength > 100 * 1024 * 1024) throw new Error('NovelAI вернул пустой или чрезмерно большой архив.');
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const inBounds = (position, length) => position >= 0 && length >= 0 && position + length <= data.byteLength;
    let end = -1;
    for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end === -1) throw new Error('Ответ NovelAI не является ZIP-архивом.');
    const total = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true);
    const centralOffset = view.getUint32(end + 16, true);
    if (total === 0 || total > 100 || !inBounds(centralOffset, centralSize)) throw new Error('Некорректный каталог ZIP от NovelAI.');
    let pos = centralOffset, selected = null;
    for (let i = 0; i < total; i++) {
        if (!inBounds(pos, 46) || view.getUint32(pos, true) !== 0x02014b50) throw new Error('Повреждён каталог ZIP от NovelAI.');
        const method = view.getUint16(pos + 10, true), compressed = view.getUint32(pos + 20, true);
        const expanded = view.getUint32(pos + 24, true), nameLength = view.getUint16(pos + 28, true);
        const extraLength = view.getUint16(pos + 30, true), commentLength = view.getUint16(pos + 32, true);
        const localOffset = view.getUint32(pos + 42, true);
        if (!inBounds(pos + 46, nameLength + extraLength + commentLength)) throw new Error('Повреждена запись ZIP от NovelAI.');
        const name = new TextDecoder().decode(data.subarray(pos + 46, pos + 46 + nameLength));
        if (/^(?:.*\/)?(?:image_\d+|\d+|[^/]+)\.png$/i.test(name) && (!selected || /(?:^|\/)image_0\.png$/i.test(name))) {
            selected = { method, compressed, expanded, localOffset };
            if (/(?:^|\/)image_0\.png$/i.test(name)) break;
        }
        pos += 46 + nameLength + extraLength + commentLength;
    }
    if (!selected) throw new Error('В архиве NovelAI не найдено изображение PNG.');
    if (selected.expanded === 0 || selected.expanded > 80 * 1024 * 1024 || selected.compressed > 80 * 1024 * 1024) throw new Error('Недопустимый размер изображения в архиве NovelAI.');
    const offset = selected.localOffset;
    if (!inBounds(offset, 30) || view.getUint32(offset, true) !== 0x04034b50) throw new Error('Не найдена ZIP-запись PNG.');
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    if (!inBounds(start, selected.compressed)) throw new Error('PNG в ZIP обрезан.');
    const payload = data.subarray(start, start + selected.compressed);
    let result;
    if (selected.method === 0) result = payload;
    else if (selected.method === 8) {
        if (typeof DecompressionStream !== 'function') throw new Error('Браузер не поддерживает распаковку ZIP (deflate-raw).');
        const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        result = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('NovelAI вернул ZIP с неподдерживаемым методом сжатия.');
    if (result.length !== selected.expanded || result.length < 8 || ![137,80,78,71,13,10,26,10].every((x, i) => result[i] === x)) {
        throw new Error('Повреждён PNG внутри архива NovelAI.');
    }
    return result;
}

export async function imageBlobDataUrl(image) {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Не удалось прочитать полученное изображение.'));
        reader.readAsDataURL(new Blob([image], { type: 'image/png' }));
    });
}
