/** Literal wardrobe-marker parsing. No regex written by users, no other extensions. */
export const WARDROBE_NAME_PLACEHOLDER = '{{имя}}';
const RECOGNIZED_LABELS = ['одежда','outfit','clothes','clothing','наряд','гардероб','экипировка','wardrobe'];
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanName = value => String(value || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*\([^()]*\)\s*$/u, '').replace(/\s+/g,' ').trim();
const cleanWear = value => String(value || '').replace(/\s+/g,' ').trim();
const hasSlot = value => String(value || '').includes(WARDROBE_NAME_PLACEHOLDER);

/** One or many rows, e.g. ♀️ Sorabella (wife) | State: sleepy | Clothes: blue dress | Place: home. */
export function parseLabeledWardrobeRows(text,label='') {
  const labels = label ? [String(label).trim().toLocaleLowerCase()] : RECOGNIZED_LABELS;
  const pairs = [];
  const lines = String(text || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|li|tr)>/gi, '\n').split(/\r?\n/).slice(0,1500);
  for (const line of lines) {
    const fields = line.split('|');
    if (fields.length < 2) continue;
    const name = cleanName(fields[0].replace(/<[^>]*>/g,' '));
    if (!name) continue;
    for (const field of fields.slice(1)) {
      const match = field.replace(/<[^>]*>/g,' ').trim().match(/^([^:：]{1,65})\s*[:：]\s*(.*)$/u);
      if (match && labels.includes(match[1].trim().toLocaleLowerCase()) && cleanWear(match[2])) {
        pairs.push([name,cleanWear(match[2])]);
        break;
      }
    }
    if (pairs.length > 1000) throw new Error('Слишком много записей одежды.');
  }
  return pairs;
}

/** Narrow pre-check for historical messages. A literal {{имя}} must not be searched verbatim. */
export function mayMatchWardrobeBoundary(text, rule) {
  if (!rule?.start) return false;
  const start = String(rule.start);
  if (!hasSlot(start)) return String(text).includes(start);
  const parts = start.split(WARDROBE_NAME_PLACEHOLDER).filter(Boolean);
  const haystack=String(text).toLocaleLowerCase();
  return parts.length > 0 && parts.every(part => haystack.includes(part.toLocaleLowerCase()));
}

function namedStartRegex(start) {
  if (start.split(WARDROBE_NAME_PLACEHOLDER).length !== 2) {
    throw new Error('Используй {{имя}} один раз в начале записи.');
  }
  const [before,after] = start.split(WARDROBE_NAME_PLACEHOLDER);
  if (!after.trim() || (before + after).trim().length < 2) {
    throw new Error('После {{имя}} должен быть разделитель, например двоеточие или ].');
  }
  const prefix=before?escapeRegex(before):'(?:^|\\n)[ \\t]*';
  return new RegExp(prefix+'([^\\r\\n<>\\[\\]⟦⟧]{1,90}?)'+escapeRegex(after),'giu');
}

/**
 * A named start is the source of ownership: [LOOK:{{имя}}]text[/LOOK],
 * <look name="{{имя}}">text</look>, or Одежда_{{имя}}: text\n.
 * A plain container may hold multiple named rows, but never assigns a whole block to one person.
 */
export function boundedWardrobe(text,rule,{fallbackName='',requireNames=false}={}) {
  const input = String(text || '');
  const start = String(rule?.start || '');
  const end = String(rule?.end || '');
  if (!start.trim()) throw new Error('Укажи начало записи с одеждой.');
  const named = hasSlot(start);
  if (!named && !end) throw new Error('Для общего блока укажи начало и конец. Для записи без конца используй {{имя}}.');
  const pairs=[],ranges=[];
  if (named) {
    const regex=namedStartRegex(start);
    let found;
    while ((found=regex.exec(input))!==null) {
      const name=cleanName(found[1]);
      // A marker beginning with the name itself must not mistake an RP sentence for a name.
      if(start.startsWith(WARDROBE_NAME_PLACEHOLDER) && (name.split(/\s+/).length>3 || /[.!?;,]/.test(name)))continue;
      const from=found.index+found[0].length;
      let to=end?input.indexOf(end,from):input.indexOf('\n',from);
      if (to<0 && !end) to=input.length;
      if (to<0) continue;
      const after=to+(end?end.length:0);
      // Missing closing delimiter: never absorb the following character's entry.
      if (end) {
        regex.lastIndex=from;
        const next=regex.exec(input);
        regex.lastIndex=from;
        if (next && next.index<to) continue;
      }
      const wear=cleanWear(input.slice(from,to).replace(/<[^>]*>/g,' '));
      if (name&&wear&&wear.length<=3000) {
        pairs.push([name,wear]);
        ranges.push([found.index,after]);
      }
      regex.lastIndex=Math.max(regex.lastIndex,after);
      if (pairs.length>1000) throw new Error('Слишком много записей одежды.');
    }
  } else {
    let pos=0;
    while(pos<input.length){
      const a=input.indexOf(start,pos);if(a<0)break;
      const from=a+start.length,b=input.indexOf(end,from);if(b<0)break;
      const content=input.slice(from,b),found=[];
      found.push(...parseLabeledWardrobeRows(content));
      // Allow [LOOK:Name]clothes[/LOOK] / ⟦LOOK:Name⟧clothes⟦/LOOK⟧ even when only outer tags are supplied.
      if (!found.length){
        const match=content.match(/^\s*([^\]\u27e7\r\n]{1,90})[\]\u27e7]\s*([^\r\n][\s\S]*)$/u);
        if(match && cleanName(match[1]) && cleanWear(match[2])) found.push([cleanName(match[1]),cleanWear(match[2])]);
      }
      // HTML records with a name attribute and visible body text.
      if (!found.length) for (const match of content.matchAll(/<(?:div|span|li|article|p)\b[^>]*\b(?:data-name|name)=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:div|span|li|article|p)>/giu)){
        const name=cleanName(match[1]),wear=cleanWear(match[2].replace(/<[^>]*>/g,' '));
        if(name&&wear)found.push([name,wear]);
      }
      // A single-person card/persona may deliberately omit the name from the bounded body.
      if(!found.length && fallbackName && !requireNames && !content.includes('|')){
        const wear=cleanWear(content.replace(/<[^>]*>/g,' '));
        if(wear&&wear.length<=3000)found.push([fallbackName,wear]);
      }
      if(found.length){pairs.push(...found);ranges.push([a,b+end.length]);}
      pos=b+end.length;
      if(pairs.length>1000) throw new Error('Слишком много записей одежды.');
    }
  }
  // Remove only successfully extracted tags from the director's narrative copy.
  let stripped=input;
  for(const [a,b] of ranges.sort((x,y)=>y[0]-x[0]))stripped=stripped.slice(0,a)+' '+stripped.slice(b);
  return {text:stripped,pairs};
}
