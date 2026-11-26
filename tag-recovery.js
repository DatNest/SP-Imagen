import {normalizeAppearanceCatalog,parseBaseTags,normalizeSkinTags,NSFW_PRESETS,SKIN_PRESETS} from './appearance-board.js';
import {LEGACY_BODY_FIELDS,splitLegacyBodyTags,prepareBodyAppearance} from './legacy-body-migration.js';
import {normalizeAppearanceRanges,normalizeAppearanceSelections,visibleAppearanceRanges} from './appearance-visibility.js';
import {NESS_APPEARANCE_PRESETS} from './shared-data.js';

export const RECOVERY_MODES={base:'Ракурсы',skin:'Под одеждой',nsfw:'NSFW'};
const modes=Object.keys(RECOVERY_MODES);
const key=s=>String(s||'').normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').trim().replace(/[,;\s]+$/,'').replace(/\s+/g,' ').toLowerCase();
const copy=x=>JSON.parse(JSON.stringify(x));
const records=data=>[...Object.entries(data?.personas||{}),...Object.entries(data?.characters||{})];
const find=(data,id)=>Object.hasOwn(data?.personas||{},id)?data.personas[id]:Object.hasOwn(data?.characters||{},id)?data.characters[id]:null;
const fields={thighMarks:'Отметины на бёдрах',kneeMarks:'Отметины на коленях',shinMarks:'Отметины на голенях',shoulderMarks:'Отметины на плечах',forearmMarks:'Отметины на предплечьях',nudeUpper:'Открытый верх',nudeLower:'Открытый низ'};
const intimate=/\b(?:nipples?|areol(?:a|ae|as)|labia|vulva(?:r)?|clitoris|genitals?|genitalia|pubic hair|pubic area|mons pubis|penis|testicles?|scrotum|anus|anal opening)\b/iu;
const textTags=value=>typeof value==='string'?parseBaseTags(value).map(t=>t.text):[];
const legacyMode=text=>intimate.test(text)?'nsfw':'skin';
function projection(record){
 const view=prepareBodyAppearance(record);
 return {view,catalog:normalizeAppearanceCatalog(view.appearanceCatalog,view.base||'',view.appearanceSkin,view,view.appearanceSections)};
}
function inventory(record){
 const {view,catalog}=projection(record),out=Object.fromEntries(modes.map(m=>[m,new Map()]));
 const mark=(mode,text,assigned=false)=>{
  const k=key(text);if(!k)return;
  out[mode].set(k,Boolean(out[mode].get(k)||assigned));
 };
 for(const mode of modes){
  for(const tag of catalog.modes[mode].tags)mark(mode,tag.text);
  for(const tag of record.appearanceCatalog?.modes?.[mode]?.tags||[])mark(mode,tag?.text);
 }
 const base=String(view.base||''),tags=parseBaseTags(base),ranges=normalizeAppearanceRanges(base,view.appearanceRanges),selections=normalizeAppearanceSelections(base,view.appearanceSelections);
 const configured=Object.values(selections).some(v=>v.length)||ranges.length>0;
 const selected=Object.keys(NESS_APPEARANCE_PRESETS).flatMap(id=>visibleAppearanceRanges(ranges,id,selections,true));
 for(const tag of tags)mark('base',tag.text,!configured||selected.some(r=>r.start<tag.end&&tag.start<r.end));
 const skin=normalizeSkinTags(view.appearanceSkin);
 const used=new Set(Object.values(skin.selections).flat());
 for(const tag of skin.tags)mark('skin',tag.text,used.has(tag.id));
 for(const tag of record.appearanceSkin?.tags||[])mark('skin',tag?.text);
 for(const id of Object.keys(NSFW_PRESETS))for(const text of textTags(view[id]))mark('nsfw',text,true);
 return out;
}
function sources(record,emit,source,backup=false){
 for(const field of Object.keys(LEGACY_BODY_FIELDS)){
  for(const [obj,label] of [[record,'старое поле'],[record.legacyBodyArchive,'архив миграции']]){
   const value=obj?.[field];if(typeof value!=='string')continue;
   for(const text of splitLegacyBodyTags(value))emit(text,legacyMode(text),source+label+' · '+fields[field]);
  }
 }
 for(const tag of record.appearanceCatalog?.tags||[])if(typeof tag?.text==='string')emit(tag.text,'base',source+'старый общий каталог',true);
 if(!backup)return;
 for(const mode of modes)for(const tag of record.appearanceCatalog?.modes?.[mode]?.tags||[])if(typeof tag?.text==='string')emit(tag.text,mode,source+RECOVERY_MODES[mode]);
 for(const text of textTags(record.base))emit(text,'base',source+'постоянная внешность');
 for(const tag of record.appearanceSkin?.tags||[])if(typeof tag?.text==='string')emit(tag.text,'skin',source+'открытая кожа');
 for(const id of Object.keys(NSFW_PRESETS))for(const text of textTags(record[id]))emit(text,'nsfw',source+NSFW_PRESETS[id]);
}
export function auditLostTags(data,backups=[]){
 const parsed=[],seen=new Set();let skipped=0;
 for(const raw of backups){
  try{
   const serialized=typeof raw==='string'?raw:JSON.stringify(raw);
   if(!serialized||seen.has(serialized))continue;seen.add(serialized);
   const item=JSON.parse(serialized);
   if(item?.version!==1||!item.personas||!item.characters||typeof item.personas!=='object'||typeof item.characters!=='object'||Array.isArray(item.personas)||Array.isArray(item.characters))throw Error('backup');
   parsed.push(item);
  }catch{skipped++;}
 }
 const rows=[];
 for(const [id,record] of records(data)){
  if(!record||typeof record!=='object')continue;
  const inv=inventory(record),candidates=new Map();
  const emit=(text,mode,label,ambiguous=false)=>{
   const identity=key(text);if(!identity)return;
   let c=candidates.get(identity);
   if(!c){c={id,name:record.name||id,text,identity,sources:new Set(),suggested:new Set(),ambiguous:false};candidates.set(identity,c);}
   c.sources.add(label);if(!ambiguous)c.suggested.add(mode);else c.ambiguous=true;
  };
  sources(record,emit,'');
  for(const [i,backup] of parsed.entries()){
   const old=find(backup,id);if(!old||typeof old!=='object')continue;
   const date=backup.savedAt?String(backup.savedAt).slice(0,10):'№'+(i+1);
   sources(old,emit,'Копия '+date+' · ',true);
  }
  for(const c of candidates.values()){
   const locations=modes.filter(m=>inv[m].has(c.identity)).map(m=>({mode:m,assigned:inv[m].get(c.identity)}));
   const suggestions=[...c.suggested];
   const mode=suggestions.length===1?suggestions[0]:locations.length===1?locations[0].mode:'base';
   const status=!locations.length?'missing':suggestions.length&&suggestions.every(m=>!locations.some(l=>l.mode===m))?'elsewhere':locations.some(l=>l.assigned)?'assigned':'unassigned';
   rows.push({...c,sources:[...c.sources],suggested:suggestions,mode,locations,status,needsMode:suggestions.length!==1&&!locations.length});
  }
 }
 return {rows,backupCount:parsed.length,skipped};
}
export function recoverLostTags(data,report,choices){
 const next=copy(data),byId=new Map(),seen=new Set();let added=0;
 const approved=new Map(report.rows.map(row=>[JSON.stringify([row.id,row.identity]),row]));
 for(const choice of choices){
  const row=approved.get(JSON.stringify([choice.id,choice.identity])),mode=choice.mode;
  if(!row||!modes.includes(mode)||!['missing','elsewhere'].includes(row.status))continue;
  const record=find(next,row.id);if(!record)continue;
  const k=JSON.stringify([row.id,mode,row.identity]);if(seen.has(k))continue;seen.add(k);
  let current=byId.get(row.id);
  if(!current){current={inventory:inventory(record),catalog:null};byId.set(row.id,current);}
  if(current.inventory[mode].has(row.identity))continue;
  if(row.text.length>1200)throw Error('Слишком длинный тег: '+row.text.slice(0,60));
  if(!current.catalog){
   const raw=record.appearanceCatalog;
   current.catalog=raw?.modes&&modes.every(m=>Array.isArray(raw.modes[m]?.tags)&&Array.isArray(raw.modes[m]?.sections))?copy(raw):projection(record).catalog;
  }
  const target=current.catalog.modes[mode];
  if(target.tags.length>=700)throw Error('Достигнут лимит тегов: '+record.name);
  let section=target.sections.find(s=>s.title==='Восстановленные'&&s.before===target.tags.length);
  if(!section){
   const index=target.sections.findIndex(s=>s.title==='Восстановленные');
   if(index>=0){
    const end=target.sections[index+1]?.before??target.tags.length;
    section=target.sections[index];
    const used=new Set(target.tags.map(t=>t.id));let n=0,id;do{id='recovered'+(++n);}while(used.has(id));
    target.tags.splice(end,0,{id,text:row.text});
    for(let i=index+1;i<target.sections.length;i++)target.sections[i].before++;
    current.inventory[mode].set(row.identity,false);added++;continue;
   }
   if(target.sections.length>=60)throw Error('Достигнут лимит разделов: '+record.name);
   const ids=new Set(target.sections.map(s=>s.id));let n=0,id;do{id='recovery'+(++n);}while(ids.has(id));
   target.sections.push({id,title:'Восстановленные',before:target.tags.length});
  }
  const used=new Set(target.tags.map(t=>t.id));let n=0,id;do{id='recovered'+(++n);}while(used.has(id));
  target.tags.push({id,text:row.text});current.inventory[mode].set(row.identity,false);added++;
 }
 for(const [id,state] of byId)if(state.catalog)find(next,id).appearanceCatalog=state.catalog;
 return {data:next,added};
}
