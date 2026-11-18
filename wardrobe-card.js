// Native SillyTavern card/persona wardrobe source. This module never reads another extension.
// The data is read only; character and persona descriptions are never modified.
export const DEFAULT_CARD_WARDROBE = Object.freeze({
  enabled: false,
  start: '⟦ГАРДЕРОБ ПЕРСОНАЖЕЙ⟧',
  end: '⟦/ГАРДЕРОБ ПЕРСОНАЖЕЙ⟧',
});
export const DEFAULT_PERSONA_WARDROBE = Object.freeze({
  enabled: false,
  start: '⟦ГАРДЕРОБ ПЕРСОНЫ⟧',
  end: '⟦/ГАРДЕРОБ ПЕРСОНЫ⟧',
});
export function normalizeCardWardrobeSource(raw, defaults) {
  const source = {...defaults, ...(raw && typeof raw === 'object' ? raw : {})};
  if (typeof source.enabled !== 'boolean') throw Error('Переключатель источника одежды должен быть включён или выключен.');
  for (const key of ['start','end']) {
    if (typeof source[key] !== 'string' || source[key].length > 120) throw Error('Граница блока одежды должна быть строкой до 120 символов.');
    if (source.enabled && !source[key].trim()) throw Error('Заполни обе границы блока одежды.');
  }
  if(source.enabled && source.start === source.end) throw Error('Начало и конец блока одежды должны различаться.');
  return { enabled: source.enabled, start: source.start, end: source.end };
}
export function extractCardWardrobe(text, rule, fallbackName, { requireNames = false } = {}) {
  const matches = [];
  if (!rule?.enabled || !rule.start || !rule.end || typeof text !== 'string') return matches;
  let position = 0;
  while(position < text.length) {
    const start = text.indexOf(rule.start, position);
    if(start < 0) break;
    const bodyStart = start + rule.start.length;
    const end = text.indexOf(rule.end, bodyStart);
    if(end < 0) break; // Never parse an unclosed block.
    const body = text.slice(bodyStart,end).trim();
    position = end + rule.end.length;
    if(!body) continue;
    // Narrator/multi-character cards: explicit name is required for each entry.
    const entries = [...body.matchAll(/⟦ОДЕЖДА:([^⟦\]⟧\r\n]{1,80})⟧\s*([\s\S]*?)\s*⟦\/ОДЕЖДА⟧/gu)];
    if(entries.length) {
      for (const entry of entries) {
        const name = entry[1].trim(), clothing = entry[2].trim();
        if(name && clothing)matches.push([name,clothing.slice(0,3000)]);
      }
    } else if(!requireNames && fallbackName && !body.includes('⟦ОДЕЖДА:')) {
      matches.push([String(fallbackName).trim(),body.slice(0,3000)]);
    }
  }
  return matches;
}
export function getCardPersonaWardrobe(st, wardrobe) {
  const items=[];
  if(!st || !wardrobe) return items;
  const char = st.characters?.[st.characterId];
  const charText = String(char?.description || char?.data?.description || '');
  const charName = char?.name || st.name2 || '';
  // An explicit named entry also works for ordinary character cards.
  const characterItems=extractCardWardrobe(charText,wardrobe.card,charName,{requireNames:/^(?:narrator|нарратор|рассказчик)$/iu.test(charName)});
  // substituteParams is SillyTavern's native way to resolve the active persona.
  // If it is unavailable, do not guess from another persona's saved description.
  let personaText = '';
  try {personaText = String(st.substituteParams?.('{{persona}}') || st.personaDescription || '');}
  catch {personaText = '';}
  if(personaText.trim()==='{{persona}}')personaText='';
  items.push(...extractCardWardrobe(personaText,wardrobe.persona,st.name1||'',{requireNames:false}));
  items.push(...characterItems); // RP overrides both; active persona overrides narrator card.
  return items;
}
