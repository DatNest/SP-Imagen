/** Final image prompt normalization and consistent comic lettering. */
export function normalizeImagePrompt(value,{parseLettering=true}={}) {
    const text = String(value || '');
    let description = '', quoted = false, escaped = false, textAt = -1;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (escaped) { description += c; escaped = false; continue; }
        if (c === '\\') { description += c; escaped = true; continue; }
        if (c === '"') { quoted = !quoted; description += c; continue; }
        if (parseLettering && !quoted && text.startsWith('Text:', i) && (i === 0 || /[\s;.]/.test(text[i - 1]))) { textAt = i; break; }
        if (c === '|' && (quoted || !/^[ \t]*(?:girl|boy|cat|other)\b/.test(text.slice(i + 1)))) description += '—';
        else description += c;
    }
    if (textAt < 0) return description;
    const unwrap = s => s.replace(/^\(\s*("[\s\S]*")\s*\)$/, '$1');
    const fragments = s => s.split(/\r?\n[ \t]*\r?\n/).map(x => unwrap(x.trim()));
    let annotation = unwrap(fragments(text.slice(textAt + 5).trim()).join('\n\n'));
    annotation = fragments(annotation).map(part => {
        let s = part;
        for (const [left, right] of [['"', '"'], ['«', '»'], ['“', '”']])
            if (s.startsWith(left) && s.endsWith(right) && s.length >= 2) {
                s = s.slice(left.length, -right.length);
                break;
            }
        return s.replace(/\|/g, '—');
    }).join('\n\n');
    return description.trimEnd() + '\n\nText: ' + annotation;
}

const countWords = text => (String(text || '').trim().match(/\S+/gu) || []).length;
const textEnd = /\r?\n\s*\r?\nText:\s*/gu;

function wholeShortPhrase(value, limit) {
    const text = String(value || '').trim();
    if (!text) return '';
    const hasDanglingTail = /[.!?…][\s»”"]+[\p{L}\p{N}]/u.test(text) && !/[.!?…][»”"]?$/.test(text);
    if (countWords(text) <= limit && !hasDanglingTail) return text;
    // Only complete sentences actually returned by the director are eligible.
    // Never cut a phrase at word N and create "Это значит, что" fragments.
    const sentences = text.match(/[^.!?…]+[.!?…]+(?:[»”"])?/gu) || [];
    for (const part of sentences) {
        const candidate = part.trim();
        if (candidate && countWords(candidate) <= limit) return candidate;
    }
    return '';
}

function parseBubbles(base) {
    const marker = /(?:^|;\s*)Speech bubble\s+\d+\s*:/giu;
    const pos = base.search(marker);
    if (pos < 0) return null;
    const prefix = base.slice(0, pos).replace(/\s*;\s*$/, '').trimEnd();
    const entries = [];
    const raw = base.slice(pos);
    const pattern = /Speech bubble\s+\d+\s*:\s*([\s\S]*?)(?=(?:;\s*Speech bubble\s+\d+\s*:)|$)/giu;
    for (const item of raw.matchAll(pattern)) {
        const body = item[1].trim().replace(/;\s*$/, '');
        const speech = body.match(/^(.*?)\bsaying\s+"((?:\\.|[^"\\])*)"\s*$/iu);
        if (!speech) continue;
        entries.push({ description: speech[1].trim().replace(/[;,\s]+$/, ''), words: speech[2].replace(/\\"/g, '"') });
    }
    return { prefix, entries };
}

/**
 * Keep selected bubble text and the terminal Text: exactly in sync.
 * Limits are ceilings, not quotas; drop long un-splittable lines instead of truncating.
 * No new LLM request and no rewriting of the original words.
 */
export function limitComicDialogue(prompt, kind, settings) {
    if (kind !== 'comic' && kind !== 'story_page') return String(prompt || '');
    const dialogue = settings?.dialogue || settings || {};
    const maxLines = kind === 'comic' ? dialogue.comicLines : dialogue.storyLines;
    const maxWords = kind === 'comic' ? dialogue.comicWords : dialogue.storyWords;
    if (!Number.isInteger(maxLines) || !Number.isInteger(maxWords)) return String(prompt || '');

    const full = String(prompt || '');
    const last = [...full.matchAll(textEnd)].at(-1);
    const visual = last ? full.slice(0, last.index) : full;
    const tail = last ? full.slice(last.index + last[0].length) : '';
    const firstCharacter = visual.search(/\s\|\s*(?:girl|boy|cat|other)\s*,/iu);
    const base = firstCharacter < 0 ? visual : visual.slice(0, firstCharacter);
    const actors = firstCharacter < 0 ? '' : visual.slice(firstCharacter);
    const parsed = parseBubbles(base);
    const foundMarkers = [...base.matchAll(/Speech bubble\s+\d+\s*:/giu)].length;
    if (!foundMarkers) return full; // Object lettering is not spoken dialogue.
    if (!parsed || parsed.entries.length !== foundMarkers ||
        /Speech bubble\s+\d+\s*:/iu.test(actors) || !last) {
        console.warn('[SP Imagen] Dialogue limits skipped: bubble format or location is ambiguous. Review Text:.');
        return full;
    }
    const bubbles = parsed.entries, replacements = [];
    for (let index = 0; index < bubbles.length; index++) {
        const b = bubbles[index];
        const shortened = wholeShortPhrase(b.words, maxWords);
        if (maxLines > 0 && !shortened) {
            console.warn('[SP Imagen] Dialogue limits skipped: a line cannot be shortened without changing the words.');
            return full;
        }
        replacements.push(index < maxLines ? shortened : null);
    }
    if (replacements.every((words, i) => words === bubbles[i].words)) return full;

    // Preserve other printed text fragments verbatim, in their original positions.
    // If bubble-to-Text matching is ambiguous, never delete anything.
    const fragments = tail.split(/\r?\n\s*\r?\n/u).map(s => s.trim()).filter(Boolean);
    const values = bubbles.map(x => x.words.trim());
    const frequencies = new Map(), expected = new Map();
    for (const line of fragments) frequencies.set(line, (frequencies.get(line) || 0) + 1);
    for (const line of values) expected.set(line, (expected.get(line) || 0) + 1);
    if (values.some(line => frequencies.get(line) !== expected.get(line))) {
        console.warn('[SP Imagen] Dialogue limits skipped: Text: fragments cannot be matched unambiguously.');
        return full;
    }
    let bubbleIndex = 0;
    const printed = [];
    for (const line of fragments) {
        if (bubbleIndex < bubbles.length && line === values[bubbleIndex]) {
            const replacementText = replacements[bubbleIndex++];
            if (replacementText) printed.push(replacementText);
        } else if (values.includes(line)) {
            console.warn('[SP Imagen] Dialogue limits skipped: speech bubble order is ambiguous.');
            return full;
        } else {
            printed.push(line);
        }
    }
    if (bubbleIndex !== bubbles.length) return full;
    let resultBase = parsed.prefix;
    const selected = bubbles.flatMap((b, index) => {
        const words = replacements[index];
        return words ? [{...b, words}] : [];
    });
    if (selected.length) {
        const serialized = selected.map((b, index) =>
            'Speech bubble ' + (index + 1) + ': ' +
            b.description.replace(/[;, \t]+$/u, '') + ', saying ' + JSON.stringify(b.words));
        resultBase += '; ' + serialized.join('; ');
    }
    const result = (resultBase + actors).trimEnd();
    return printed.length ? result + '\n\nText: ' + printed.join('\n\n') : result;
}
