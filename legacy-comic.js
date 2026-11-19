import {findCharacter, characterNameKeys, normalizeCharacterName} from './character-identity.js';
// Compatibility with the original ExtBlocks-style Comic director response.
// Pure local conversion: no model request, no HTML execution, no changes to user prompts.
const SPACE = /\s+/g;
const clean = value => String(value ?? '').trim().replace(SPACE, ' ');

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
        if (match) for (const key of characterNameKeys(match[1])) outfits.set(key, clean(match[2]));
    }
    return outfits;
}
function stripLeadingDuplicate(details, name, base) {
    let text = clean(details);
    // Existing director responses occasionally repeat the gender, name, and fixed
    // appearance before the actual scene-specific pose. They are not extra actors.
    text = text.replace(/^(?:girl|boy|cat|other)\s*,\s*/iu, '');
    const escapedName = clean(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escapedName) text = text.replace(new RegExp('^' + escapedName + '\\s*,\\s*', 'iu'), '');
    if (!text || !base) return text;
    const canonical = value => normalizeCharacterName(value).replace(/\s*[,;]+\s*/g, ', ').trim();
    if (canonical(text) === canonical(base)) return '';
    if (canonical(text).startsWith(canonical(base) + ',') || canonical(text).startsWith(canonical(base) + ';')) {
        return text.slice(base.length).replace(/^[,;\s]+/g, '');
    }
    const separator = text.indexOf(';');
    if (separator < 0) return text;
    const first = text.slice(0, separator);
    const rest = text.slice(separator + 1).trim();
    const tokens = value => (normalizeCharacterName(value).match(/[\p{L}\p{N}]+/gu) || []);
    const expected = tokens(base), repeated = tokens(first);
    if (expected.length < 25 || repeated.length < expected.length * 0.45) return text;
    const available = new Map();
    for (const word of expected) available.set(word, (available.get(word) || 0) + 1);
    let overlap = 0;
    for (const word of repeated) {
        const left = available.get(word) || 0;
        if (left) { overlap++; available.set(word, left - 1); }
    }
    // The first clause is nearly the library identity (possibly with one changed
    // tag). Keep only the actual scene-specific description after the semicolon.
    return overlap / expected.length >= 0.62 ? rest : text;
}
function findOutfit(person, match, outfits) {
    const choices = [person.name, person.id, match?.id, match?.record?.name,
        match?.record?.promptName, ...(match?.record?.aliases || [])];
    for (const name of choices) for (const key of characterNameKeys(name)) {
        const value = outfits.get(key);
        if (value) return value;
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
        const match = findCharacter(library, {id:person.id, name});
        const baseAppearance = clean(match?.record?.base || '');
        const outfit = findOutfit(person, match, outfits);
        // One final-pass renderer owns all permanent appearance insertion.
        // A canonical ID marker is inserted for legacy people with unusual aliases;
        // the adapter itself never writes a permanent appearance string.
        const marker = details.match(/\[\[(?:NESS_VIS:[a-z][a-z0-9_]*|[a-z][a-z0-9_]*:id):[^\]\r\n]+\]\]/iu)?.[0] || '';
        const unmarked = marker ? details.replace(marker, '').replace(/^[\s,;]+/, '') : details;
        const detailBody = stripLeadingDuplicate(unmarked, name, baseAppearance);
        const pieces = [name];
        if (marker) pieces.push(marker);
        else if (match && /^[a-z][a-z0-9_]*$/.test(match.id)) pieces.push(`[[NESS_VIS:${match.id}:base]]`);
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
