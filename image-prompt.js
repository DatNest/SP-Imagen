/** Final image prompt normalization and consistent comic lettering. */
export function normalizeImagePrompt(value) {
    const text = String(value || '');
    let description = '', quoted = false, escaped = false, textAt = -1;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (escaped) { description += c; escaped = false; continue; }
        if (c === '\\') { description += c; escaped = true; continue; }
        if (c === '"') { quoted = !quoted; description += c; continue; }
        if (!quoted && text.startsWith('Text:', i) && (i === 0 || /[\s;.]/.test(text[i - 1]))) { textAt = i; break; }
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
    const markers = [...full.matchAll(textEnd)];
    const last = markers.at(-1);
    const visual = last ? full.slice(0, last.index) : full;
    const tail = last ? full.slice(last.index + last[0].length) : '';
    const firstCharacter = visual.search(/\s\|\s*(?:girl|boy|cat|other)\s*,/iu);
    const base = firstCharacter < 0 ? visual : visual.slice(0, firstCharacter);
    const actors = firstCharacter < 0 ? '' : visual.slice(firstCharacter);
    const parsed = parseBubbles(base);
    const bubbles = parsed?.entries || [];
    const candidates = bubbles.length
        ? bubbles.map(b => ({ words: b.words, description: b.description }))
        : tail.split(/\r?\n\s*\r?\n/).filter(Boolean).map(words => ({ words, description: '' }));

    const selected = [];
    for (const item of candidates) {
        if (selected.length >= maxLines) break;
        const words = wholeShortPhrase(item.words, maxWords);
        if (words) selected.push({ ...item, words });
    }
    let nextBase = base.trimEnd();
    if (parsed) {
        nextBase = parsed.prefix;
        if (selected.length) {
            const speech = selected.map((item, i) =>
                `Speech bubble ${i + 1}: ${item.description}, containing exactly ${JSON.stringify(item.words)} inside the outlined balloon`);
            nextBase += '; ' + speech.join('; ');
            nextBase += '; all speech bubble text inside bubble outlines, no floating text or captions outside the balloons';
        }
    }
    const nextVisual = (nextBase + actors).trimEnd();
    return selected.length ? nextVisual + '\n\nText: ' + selected.map(x => x.words).join('\n\n') : nextVisual;
}
