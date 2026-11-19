// Small deterministic repairs of the director's illustration prompt.
// This module never calls a text model, changes character traits, or touches NovelAI.
const SECTION = /\|\s*(boy|girl|cat|other)\s*,\s*([^,;|\n]{1,100})/gi;
const APPEARANCE_VIEWS = new Set(['none','face','head','upper_front','upper_back','full_front','full_back','arms','legs']);

function partsOfPrompt(value) {
  const text = String(value || '');
  const split = text.indexOf('\n\nText:');
  return split < 0 ? [text, ''] : [text.slice(0, split), text.slice(split)];
}

// Restore character entry separators if the model used prose semicolons.
export function normalizeDirectorSections(value) {
  const [description, lettering] = partsOfPrompt(value);
  return description.replace(/;\s*(?=(?:boy|girl|cat|other)\s*,)/gi, ' | ') + lettering;
}

// Model output such as [[JI_VIS:id:upper_front]] is not an actual library ID.
// Resolve only an unambiguous library character; never invent appearance tags.
export function resolveVisibilityAliases(value, records) {
  if (!(records instanceof Map) || !records.size) return String(value || '');
  return String(value || '').replace(/\[\[([a-z][a-z0-9_]*)_VIS:([a-z][a-z0-9_]*):([a-z_]+)\]\]/gi, (whole, prefix, rawId, view) => {
    const id = rawId.toLowerCase();
    if (prefix.toUpperCase() === 'NESS' && records.has(id)) return whole;
    if (!APPEARANCE_VIEWS.has(view)) return whole;
    if (records.has(id)) return `[[NESS_VIS:${id}:${view}]]`;
    if (id !== 'id') return whole;
    const key = prefix.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const matches = [...records].filter(([recordId, record]) => [recordId, record?.name, record?.promptName, ...(record?.aliases || [])].some(name =>
      String(name || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === key
    ));
    return matches.length === 1 ? `[[NESS_VIS:${matches[0][0]}:${view}]]` : whole;
  });
}

// Character counts belong at the very beginning, once per named character
// section, even if the user selected an extra composition/style prefix.
export function normalizeSubjectCounts(value) {
  const [description, lettering] = partsOfPrompt(value);
  const seen = new Set(), totals = {boy:0, girl:0, cat:0, other:0};
  for (const match of description.matchAll(SECTION)) {
    const kind = match[1].toLowerCase();
    const identity = match[2].trim().toLocaleLowerCase();
    const key = kind + ':' + identity;
    if (!seen.has(key)) { seen.add(key); totals[kind]++; }
  }
  if (!seen.size) return String(value || '');
  const first = description.search(/\|\s*(?:boy|girl|cat|other)\s*,/i);
  if (first < 0) return String(value || '');
  let base = description.slice(0,first);
  const sections = description.slice(first);
  // Delete only standalone quantity tags from the base. Other descriptive
  // content (including a user's custom artistic profile) remains unchanged.
  base = base.replace(/(^|[,;]\s*)\d+\s*(?:boys?|girls?|cats?|others?)(?=\s*[,;]|$)/gi, '$1');
  base = base.replace(/(^|[,;]\s*)\d+\s*people(?=\s*[,;]|$)/gi, '$1');
  base = base.replace(/,\s*(?:,\s*)+/g, ', ').replace(/;\s*(?:,\s*)+/g, '; ')
    .replace(/^[\s,;]+|[\s,;]+$/g,'');
  const tags = Object.entries(totals).filter(([,count])=>count).map(([kind,count])=>count+kind);
  return tags.join(', ') + (base ? ', ' + base : '') + ' ' + sections.trimStart() + lettering;
}

// If both bubble descriptions and the authoritative final Text: block exist,
// use the exact Russian lines there instead of an English paraphrase in panels.
export function synchronizeBubbleText(value) {
  const [description, lettering] = partsOfPrompt(value);
  if (!lettering) return String(value || '');
  const lines = lettering.slice('\n\nText:'.length).trim().split(/\n\s*\n/)
    .map(line=>line.trim()).filter(Boolean);
  const matches = [...description.matchAll(/\bRussian text\s+([^;|\n]+)(?=\s*;|$)/gi)];
  if (!lines.length || matches.length !== lines.length) return String(value || '');
  let index=0;
  return description.replace(/\bRussian text\s+([^;|\n]+)(?=\s*;|$)/gi, () =>
    'Russian text «' + lines[index++].replace(/^['"«“]|['"»”]$/g, '') + '»'
  ) + lettering;
}
