// Compatibility with the original ExtBlocks-style Comic director response.
// Pure local conversion: no model request, no HTML execution, no changes to user prompts.
const SPACE = /\s+/g;
const clean = value => String(value ?? '').trim().replace(SPACE, ' ');
const normalizeName = value => clean(value).normalize('NFKC').toLocaleLowerCase().replace(/ё/g, 'е');

function assertText(value, label, max = 12000) {
    if (typeof value !== 'string' || value.length > max) throw Error('JSON Comic: неверное поле «' + label + '».');
    return value.trim();
}
function assertRows(rows, label, limit) {
    if (!Array.isArray(rows) || rows.length > limit) throw Error('JSON Comic: неверный список «' + label + '».');
    return rows;
}
const pattern = /^([^\r\n:：]{1,100}?)\s*[_\s-]outfit\s*[:：]\s*(.+)$/iu;
function readOutfits(wardrobe) {
    const outfits = new Map();
    for (const line of String(wardrobe || '').split(/\r?\n/)) {
        const match = line.trim().match(pattern);
        if (match) outfits.set(normalizeName(match[1]), clean(match[2]));
    }
    return outfits;
}
function personRecord(person, library) {
    const id = clean(person.id).toLowerCase();
    const exact = library?.get?.(id);
    if (exact) return { id, record: exact };
    const named = [...(library?.entries?.() || [])].filter(([, record]) =>
        [record.name, record.promptName, ...(record.aliases || [])].some(name => normalizeName(name) && normalizeName(name) === normalizeName(person.name)));
    return named.length === 1 ? { id: named[0][0], record: named[0][1] } : null;
}
function stripLeadingDuplicate(details, name, base) {
    let text = clean(details);
    if (!text || !base) return text;
    const escapedName = clean(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escapedName) text = text.replace(new RegExp('^' + escapedName + '\\s*,\\s*', 'iu'), '');
    const normalizedText = normalizeName(text).replace(/[,;]+$/g, '');
    const normalizedBase = normalizeName(base).replace(/[,;]+$/g, '');
    if (normalizedText === normalizedBase) return '';
    if (normalizedText.startsWith(normalizedBase + ',') || normalizedText.startsWith(normalizedBase + ';')) {
        return text.slice(base.length).replace(/^[,;\s]+/, '');
    }
    return text;
}
function findOutfit(person, match, outfits) {
    const choices = [person.name, person.id, match?.id, match?.record.name,
        match?.record.promptName, ...(match?.record.aliases || [])];
    for (const name of choices) {
        const candidate = outfits.get(normalizeName(name));
        if (candidate) return candidate;
    }
    return '';
}
function category(gender) {
    const value = String(gender || '').toLowerCase();
    if (value === 'girl') return 'girl';
    if (value === 'boy') return 'boy';
    if (value === 'cat') return 'cat';
    return 'other';
}
function countLabel(count, type) { return count ? String(count) + type + (count > 1 ? 's' : '') : ''; }
const sentence = s => clean(s).replace(/^[,;\s]+|[,;\s]+$/g, '');

export function isLegacyComicData(data) {
    return data !== null && typeof data === 'object' && !Array.isArray(data)
        && Object.keys(data).sort().join(',') === 'bubbles,people,scene,text';
}

export function assembleLegacyComic(data, { kind = 'comic', wardrobe = '', library = new Map() } = {}) {
    if (!isLegacyComicData(data) || !['comic', 'story_page'].includes(kind)) {
        throw Error('Неподдерживаемый JSON-формат режиссёра.');
    }
    const scene = data.scene;
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) throw Error('JSON Comic: отсутствует описание сцены.');
    const panels = assertRows(scene.panels, 'scene.panels', 5);
    if (panels.length < 2 || !Number.isInteger(scene.panel_count) || scene.panel_count !== panels.length) {
        throw Error('JSON Comic: число панелей не совпадает с их описаниями.');
    }
    const setting = assertText(scene.setting, 'scene.setting');
    const layout = assertText(scene.layout, 'scene.layout');
    const borders = assertText(scene.borders, 'scene.borders');
    const people = assertRows(data.people, 'people', 22);
    const bubbles = assertRows(data.bubbles, 'bubbles', 30);
    const text = assertText(data.text, 'text', 20000);
    const counts = { girl: 0, boy: 0, cat: 0, other: 0 };
    for (const person of people) {
        if (!person || typeof person !== 'object') throw Error('JSON Comic: неверная запись персонажа.');
        counts[category(person.gender)]++;
    }
    const tags = ['girl', 'boy', 'cat', 'other'].map(type => countLabel(counts[type], type)).filter(Boolean);
    const base = [
        [...tags, `${panels.length} panels comic page`, ...(bubbles.length ? ['text'] : [])].join(', '),
        sentence(setting), sentence(layout),
        ...panels.map((panel, index) => {
            if (!panel || typeof panel !== 'object' || panel.number !== index + 1) throw Error('JSON Comic: нарушен порядок панелей.');
            const type = assertText(panel.type, 'panel.type');
            const content = assertText(panel.content, 'panel.content');
            return `Panel ${index + 1}: ${sentence(type)}, ${sentence(content)}`;
        }),
        sentence(borders),
    ].filter(Boolean).join('; ');
    const outfits = readOutfits(wardrobe);
    const actorText = people.map(person => {
        const type = category(person.gender);
        const name = assertText(person.name, 'people.name', 160);
        const details = assertText(person.details, 'people.details', 12000);
        const actions = assertText(person.actions, 'people.actions', 3500);
        const match = personRecord(person, library);
        const baseAppearance = clean(match?.record?.base || '');
        const outfit = findOutfit(person, match, outfits);
        const detailBody = stripLeadingDuplicate(details, name, baseAppearance);
        const pieces = [name];
        if (baseAppearance) pieces.push(sentence(baseAppearance));
        if (outfit) pieces.push('current outfit: ' + outfit);
        if (detailBody) pieces.push(sentence(detailBody));
        const body = pieces.join(', ') + (actions ? '; ' + sentence(actions) : '');
        return type + ', ' + body;
    });
    const lettering = bubbles.map((bubble, index) => {
        if (!bubble || typeof bubble !== 'object') throw Error('JSON Comic: неверная реплика.');
        const phrase = assertText(bubble.text, 'bubbles.text', 6000);
        const position = assertText(bubble.position, 'bubbles.position');
        const shape = assertText(bubble.shape, 'bubbles.shape');
        const border = assertText(bubble.border, 'bubbles.border');
        const tail = assertText(bubble.tail, 'bubbles.tail');
        return `Speech bubble ${index + 1}: ${sentence(shape)}, ${sentence(border)}, ${sentence(position)}, tail ${sentence(tail)}, saying "${phrase.replace(/"/g, '\\"')}"`;
    });
    const speech = lettering.length ? '; ' + lettering.join('; ') : '';
    const visual = base + speech + (actorText.length ? ' | ' + actorText.join(' | ') : '');
    const annotation = text.replace(/^Text:\s*/iu, '').trim();
    const dialog = bubbles.length ? bubbles.map(b => b.text).join('\n\n') : annotation;
    const prompt = visual + (dialog ? '\n\nText: ' + dialog : '');
    if (prompt.length > 45000) throw Error('JSON Comic: итоговый промпт длиннее 45 000 символов.');
    return { prompt, aspect_ratio: '2:3', image_size: '1K' };
}
