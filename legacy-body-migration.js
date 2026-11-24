/**
 * One-time, lossless-to-the-level-of-individual-legacy-tags migration.
 * Old body text is tokenized into comma/semicolon/newline delimited fragments,
 * preserving their original content and existing skin assignments.
 *
 * Region mapping is intentionally conservative:
 * arms: shoulder/forearm marks
 * legs: thigh/knee/shin marks
 * upper_front: uncovered upper body
 * lower_front: uncovered lower body
 *
 * Do not guess the exact anatomical subregion of arbitrary prose. In particular
 * nudeUpper/nudeLower are NOT automatically put into NSFW chest/genital areas.
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

export function migrateLegacyBodyFields(record) {
  if(!record || typeof record !== 'object' || Array.isArray(record))return {changed:false,added:0};
  const found=Object.entries(LEGACY_BODY_FIELDS).filter(([key])=>
    Object.hasOwn(record,key) && typeof record[key]==='string'
  );
  if(!found.length)return {changed:false,added:0};
  const skin=normalizeSkinTags(record.appearanceSkin);
  const existingByText=new Map(skin.tags.map(tag=>[normalize(tag.text),tag]));
  const allIds=new Set(skin.tags.map(tag=>tag.id));
  let number=0,added=0,selected=0;
  const used=(slot,id)=>new Set(skin.selections[slot]||[]).has(id);
  for(const [field,part] of found){
    for(const text of splitLegacyBodyTags(record[field])){
      const name=normalize(text);
      let tag=existingByText.get(name);
      if(!tag){
        if(skin.tags.length>=600)throw Error('Невозможно перенести старые отметины: превышен лимит тегов (600).');
        let id='';
        do{id='legacy'+(++number);}while(allIds.has(id));
        allIds.add(id);tag={id,text,section:''};
        skin.tags.push(tag);existingByText.set(name,tag);added++;
      }
      if(!used(part,tag.id)){
        const values=skin.selections[part]||=[];
        // A tag assigned to every open part is already correctly visible.
        if(!(skin.selections.always||[]).includes(tag.id)){
          skin.selections[part]=[...values,tag.id];
          selected++;
        }
      }
    }
  }
  // Everything is now represented in the selected new skin region. Remove
  // legacy sources so director cannot inject them twice.
  for(const [key] of found)delete record[key];
  record.appearanceSkin=normalizeSkinTags(skin);
  return {changed:true,added,selected};
}

/** Recover only identifiable anatomy from the retired body-field migration.
 * Preserve original storage; recovered chips are available in NSFW, unassigned.
 */
export function separateMigratedAnatomy(record){
 const skin=normalizeSkinTags(record?.appearanceSkin);
 const explicit=new Set(Object.keys(NSFW_AREAS).flatMap(k=>splitLegacyBodyTags(record?.[k])).map(normalize));
 const intimate=/\b(?:nipples?|areol(?:a|ae|as)|labia|vulva(?:r)?|clitoris|genitals?|genitalia|pubic hair|pubic area|mons pubis|penis|testicles?|scrotum|anus|anal opening)\b/iu;
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
