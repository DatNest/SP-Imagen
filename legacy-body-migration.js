/**
 * Migrate retired body fields into editable, unassigned catalogue entries.
 * Retain original strings in a non-prompt archive and preserve existing
 * explicitly selected regions. Never guess visibility of recovered details.
 */
import { normalizeSkinTags, normalizeAppearanceCatalog } from './appearance-board.js';
import { NSFW_AREAS } from './appearance-mode-state.js';

export const LEGACY_BODY_FIELDS = Object.freeze({
  thighMarks: 'legs',
  kneeMarks: 'legs',
  shinMarks: 'legs',
  shoulderMarks: 'arms',
  forearmMarks: 'arms',
  nudeUpper: 'upper_front',
  nudeLower: 'lower_front',
});

const normalize = value => String(value || '').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
export const splitLegacyBodyTags = value => String(value || '')
  .split(/[,;\r\n]+/g)
  .map(s=>s.trim())
  .filter(Boolean);

const intimate=/\b(?:nipples?|areol(?:a|ae|as)|labia|vulva(?:r)?|clitoris|genitals?|genitalia|pubic hair|pubic area|mons pubis|penis|testicles?|scrotum|anus|anal opening)\b/iu;

// All legacy strings are copied into active catalogues before retirement.
// Original field text is kept separately for recovery; it is never a prompt source.
export function migrateLegacyBodyFields(record){
 if(!record||typeof record!=='object'||Array.isArray(record))return {changed:false,added:0};
 const found=Object.keys(LEGACY_BODY_FIELDS).filter(k=>Object.hasOwn(record,k)&&typeof record[k]==='string');
 if(!found.length)return {changed:false,added:0};
 const skin=normalizeSkinTags(record.appearanceSkin);
 const catalog=normalizeAppearanceCatalog(record.appearanceCatalog,record.base||'',skin,record,record.appearanceSections);
 const knownSkin=new Set(skin.tags.map(t=>normalize(t.text)));
 const explicit=new Set(Object.keys(NSFW_AREAS).flatMap(k=>splitLegacyBodyTags(record[k])).map(normalize));
 const archive={...(record.legacyBodyArchive||{})};
 let added=0;
 function addChip(mode,text){
  const target=catalog.modes[mode],identity=normalize(text);
  if(target.tags.some(t=>normalize(t.text)===identity))return;
  if(text.length>1200||target.tags.length>=700)throw Error('Старые отметины не перенесены: превышен лимит каталога. Исходные данные сохранены.');
  const used=new Set(target.tags.map(t=>t.id));let n=0,id;
  do{id='recovered'+(++n);}while(used.has(id));
  target.tags.push({id,text});added++;
 }
 for(const field of found){
  if(!Object.hasOwn(archive,field))archive[field]=record[field];
  for(const text of splitLegacyBodyTags(record[field])){
   // Specific anatomy belongs to its own mode. Ambiguous body traits stay
   // available in skin, never assigned to an automatically chosen region.
   const mode=explicit.has(normalize(text))||intimate.test(text)?'nsfw':'skin';
   addChip(mode,text);
   // Existing skin IDs and all their explicit selections are preserved.
   // New unassigned chips live in the mode catalogue, as for ordinary UI additions.
  }
 }
 // A retired shared catalogue may contain the same legacy fragments. Do
 // not leave these as unassigned base chips unless actually in the base.
 const baseNames=new Set(String(record.base||'').split(',').map(normalize));
 const recovered=new Set(found.flatMap(k=>splitLegacyBodyTags(record[k])).map(normalize));
 const base=catalog.modes.base,prior=base.tags;
 const retain=t=>{
  if(baseNames.has(normalize(t.text)))return true;
  // Only remove entries from an old shared catalogue, not modern user-authored mode copies.
  if(record.appearanceCatalog?.modes)return true;
  const parts=splitLegacyBodyTags(t.text);
  return !(parts.length&&parts.every(x=>recovered.has(normalize(x))||knownSkin.has(normalize(x))||explicit.has(normalize(x))));
 };
 base.tags=prior.filter(retain);
 base.sections=base.sections.map(s=>({...s,before:prior.slice(0,s.before).filter(retain).length}));
 record.appearanceSkin=skin;
 record.appearanceCatalog=catalog;
 record.legacyBodyArchive=archive;
 for(const field of found)delete record[field];
 return {changed:true,added,selected:0};
}

/** Recover only identifiable anatomy from the retired body-field migration.
 * Preserve original storage; recovered chips are available in NSFW, unassigned.
 */
export function separateMigratedAnatomy(record){
 const skin=normalizeSkinTags(record?.appearanceSkin);
 const explicit=new Set(Object.keys(NSFW_AREAS).flatMap(k=>splitLegacyBodyTags(record?.[k])).map(normalize));
 const moved=skin.tags.filter(t=>/^legacy\d+$/.test(t.id)&&(explicit.has(normalize(t.text))||intimate.test(t.text)));
 if(!moved.length)return record;
 const ids=new Set(moved.map(t=>t.id)),keys=new Set(moved.map(t=>normalize(t.text)));
 const catalog=normalizeAppearanceCatalog(record.appearanceCatalog,record.base||'',skin,record,record.appearanceSections);
 const removeTags=(data,shouldRemove)=>{
  const prior=data.tags;
  return {...data,tags:prior.filter(t=>!shouldRemove(t)),sections:data.sections.map(s=>({...s,before:prior.slice(0,s.before).filter(t=>!shouldRemove(t)).length}))};
 };
 // Retain any independently authored duplicate in the skin catalogue.
 const retainedKeys=new Set(skin.tags.filter(t=>!ids.has(t.id)).map(t=>normalize(t.text)));
 catalog.modes.skin=removeTags(catalog.modes.skin,t=>keys.has(normalize(t.text))&&!retainedKeys.has(normalize(t.text)));
 const target=catalog.modes.nsfw;
 const existing=new Set(target.tags.map(t=>normalize(t.text))),used=new Set(target.tags.map(t=>t.id));
 for(const tag of moved){
  if(existing.has(normalize(tag.text)))continue;
  let id=tag.id,n=0;
  while(used.has(id))id='recovered'+(++n);
  target.tags.push({id,text:tag.text});used.add(id);existing.add(normalize(tag.text));
 }
 if(target.tags.length>700)throw Error('Восстановление анатомии: превышен лимит тегов NSFW. Сохранённые данные не изменены.');
 const clean={...skin,tags:skin.tags.filter(t=>!ids.has(t.id)),selections:Object.fromEntries(Object.entries(skin.selections).map(([k,v])=>[k,v.filter(id=>!ids.has(id))])),
  sections:skin.sections.map(s=>({...s,before:skin.tags.slice(0,s.before).filter(t=>!ids.has(t.id)).length}))};
 return {...record,appearanceSkin:clean,appearanceCatalog:catalog};
}

/** Shared non-mutating projection for editor, generation and explicit save.
 * No opening, preview, or generation writes the source record.
 */
export function prepareBodyAppearance(record){
 if(!record||typeof record!=='object'||Array.isArray(record))return record;
 const hasLegacy=Object.keys(LEGACY_BODY_FIELDS).some(k=>typeof record[k]==='string');
 let next=hasLegacy?{...record}:record;
 if(hasLegacy)migrateLegacyBodyFields(next);
 next=separateMigratedAnatomy(next);
 const source=next.appearanceSkin;
 if(source){
  const normalized=normalizeSkinTags(source);
  // Only persist the correction when the visible identities actually differ:
  // preserve healthy current records and their exact serialized user data.
  const tags=Array.isArray(source.tags)?source.tags:[];
  if(tags.length!==normalized.tags.length||tags.some((t,i)=>t?.id!==normalized.tags[i]?.id||t?.text!==normalized.tags[i]?.text)){
   next={...next,appearanceSkin:normalized};
  }
 }
 return next;
}
