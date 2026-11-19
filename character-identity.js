/** One identity lookup used by Comic JSON and the final image-prompt assembler.
 * Names are matched whole, never by substring, so one actor cannot borrow another's traits.
 */
const romanLetters = Object.freeze({
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
});

export function normalizeCharacterName(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function romanize(value) {
  return value.replace(/дж/g, 'j').replace(/[а-яё]/gu, char => romanLetters[char] ?? char);
}

export function characterNameKeys(value) {
  const key = normalizeCharacterName(value);
  if (!key) return [];
  const roman = romanize(key);
  return key === roman ? [key] : [key, roman];
}

export function findCharacter(directory, { id, name } = {}) {
  if (!(directory instanceof Map)) return null;
  const requestedId = String(id ?? '').trim();
  if (requestedId && directory.has(requestedId)) return { id: requestedId, record: directory.get(requestedId) };
  const idFold = normalizeCharacterName(requestedId);
  if (idFold) {
    const direct = [...directory].filter(([key]) => normalizeCharacterName(key) === idFold);
    if (direct.length === 1) return { id: direct[0][0], record: direct[0][1] };
  }
  const names = [name, requestedId].flatMap(characterNameKeys).filter(Boolean);
  if (!names.length) return null;
  const wanted = new Set(names);
  const matches = [...directory].filter(([key, record]) =>
    [key, record?.name, record?.promptName, ...(Array.isArray(record?.aliases) ? record.aliases : [])]
      .some(value => characterNameKeys(value).some(alias => wanted.has(alias))));
  return matches.length === 1 ? { id: matches[0][0], record: matches[0][1] } : null;
}

/** Every stored character is available for exact identity lookup; no one is
 * rendered unless a director explicitly creates that character's section. */
export function buildCharacterDirectory(master) {
  const entries = {...(master?.personas || {}), ...(master?.characters || {})};
  return new Map(Object.entries(entries)
    .filter(([,record]) => record && typeof record === 'object')
    .map(([id, record]) => [id, {
      base: record.base || '',
      name: record.name || '',
      promptName: record.promptName || '',
      aliases: Array.isArray(record.aliases) ? record.aliases : [],
      ranges: Array.isArray(record.appearanceRanges) ? record.appearanceRanges : [],
      selections: record.appearanceSelections || {},
    }]));
}
