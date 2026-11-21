/**
 * Shared appearance catalogue with three assignment modes. Display-only headings never enter the image prompt.
 * Existing base strings and appearanceSelections offsets remain authoritative.
 */
import { NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS } from './shared-data.js';
import { normalizeAppearanceRanges, normalizeAppearanceSelections, visibleAppearanceRanges, hasConfiguredAppearanceViews } from './appearance-visibility.js';
import { normalizeAppearanceModeCatalog, NSFW_AREAS, repositionModeTag } from './appearance-mode-state.js';

export const SKIN_PRESETS=Object.freeze({
 upper_front:'Открытый верх · спереди',
 upper_back:'Открытый верх · сзади',
 lower_front:'Открытый низ · спереди',
 lower_back:'Открытый низ · сзади',
 arms:'Открытые руки',
 legs:'Открытые ноги'
});
export const SKIN_ALWAYS='always';
export const NSFW_PRESETS=NSFW_AREAS;
const copy=x=>JSON.parse(JSON.stringify(x));
const norm=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const validLabel=s=>String(s||'').trim().slice(0,50);
const keyOK=id=>id===SKIN_ALWAYS||Object.hasOwn(SKIN_PRESETS,id);
export function normalizeSkinTags(raw){
 const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const items=[],ids=new Set();
 for(const tag of Array.isArray(data.tags)?data.tags:[]){
  if(typeof tag?.text!=='string'||!tag.text.trim())continue;
  const id=String(tag.id||'');
  if(!/^[a-z][a-z0-9_]{0,48}$/.test(id)||ids.has(id))continue;
  ids.add(id);items.push({id,text:tag.text.trim().slice(0,1200),section:String(tag.section||'')});
  if(items.length>=600)break;
 }
 const sectionIdsSeen=new Set();
 const sections=(Array.isArray(data.sections)?data.sections:[]).filter(x=>{
  if(!x||typeof x.id!=='string'||!/^[a-z][a-z0-9_]{0,48}$/.test(x.id)||!validLabel(x.title)||sectionIdsSeen.has(x.id))return false;
  sectionIdsSeen.add(x.id);return true;
 }).slice(0,60)
 .map(x=>({id:x.id,title:validLabel(x.title),before:Number.isInteger(x.before)?Math.max(0,Math.min(items.length,x.before)):Math.max(0,items.findIndex(t=>t.section===x.id))}));
 const sectionIds=new Set(sections.map(x=>x.id));
 for(const item of items)if(!sectionIds.has(item.section))item.section='';
 const all=new Set(items.map(x=>x.id)),selections={};
 for(const [id,arr] of Object.entries(data.selections||{})){
  if(!keyOK(id)||!Array.isArray(arr))continue;
  selections[id]=[...new Set(arr.filter(x=>typeof x==='string'&&all.has(x)))];
 }
 const always=new Set(selections.always||[]);
 for(const id of Object.keys(SKIN_PRESETS))if(selections[id])selections[id]=selections[id].filter(x=>!always.has(x));
 return {tags:items,selections,sections};
}
export const hasSkinSelections=skin=>Object.values(normalizeSkinTags(skin).selections).some(xs=>xs.length>0);
export function formatSkinParts(skin,parts){
 const state=normalizeSkinTags(skin),chosen=[...new Set(parts.filter(x=>Object.hasOwn(SKIN_PRESETS,x)))];
 if(!chosen.length)return '';
 const ids=new Set([...chosen.flatMap(p=>state.selections[p]||[]),...(state.selections.always||[])]);
 return state.tags.filter(t=>ids.has(t.id)).map(t=>t.text.replace(/[,;\s]+$/,'').trim()).filter(Boolean).join(', ');
}
export function parseBaseTags(base){
 const items=[];
 for(const m of String(base||'').matchAll(/[^,]+/g)){
  let text=m[0].trim();
  if(m.index+m[0].length===base.length)text=text.replace(/;+$/,'').trim();
  if(!text)continue;
  const start=m.index+m[0].indexOf(text);
  items.push({start,end:start+text.length,text});
 }
 return items;
}
export function normalizeAppearanceSections(raw,base){
 const tagsArray=parseBaseTags(base),tags=new Set(tagsArray.map(x=>x.text));
 const sections=[],ids=new Set();
 for(const x of Array.isArray(raw)?raw:[]){
  if(!x||typeof x.id!=='string'||!/^[a-z][a-z0-9_]{0,48}$/.test(x.id)||ids.has(x.id)||!validLabel(x.title))continue;
  ids.add(x.id);
  const oldFirst=(Array.isArray(x.tags)?x.tags:[]).find(t=>typeof t==='string'&&tags.has(t));
  const fallback=oldFirst?tagsArray.findIndex(t=>t.text===oldFirst):tagsArray.length;
  sections.push({id:x.id,title:validLabel(x.title),before:Number.isInteger(x.before)?Math.max(0,Math.min(tagsArray.length,x.before)):Math.max(0,fallback)});
  if(sections.length>=60)break;
 }
 return sections;
}
/** Shared tag catalogue, with legacy source fields kept as prompt authorities. */
export function normalizeAppearanceCatalog(raw,base,skin,nsfw={},legacySections=[]){
 const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const skinState=normalizeSkinTags(skin),tags=[],names=new Set(),ids=new Set();
 const add=(value,preferredId)=>{
  const valueText=String(value||'').trim().replace(/[,;\s]+$/,'').trim();
  if(!valueText||names.has(norm(valueText))||tags.length>=700)return;
  names.add(norm(valueText));
  let id=String(preferredId||'');
  if(!/^[a-z][a-z0-9_]{0,48}$/.test(id)||ids.has(id)){
   let index=tags.length+1;while(ids.has('tag'+index))index++;id='tag'+index;
  }
  ids.add(id);tags.push({id,text:valueText.slice(0,1200)});
 };
 for(const t of Array.isArray(data.tags)?data.tags:[])if(typeof t?.text==='string')add(t.text,t.id);
 const baseTags=parseBaseTags(base);
 for(const t of baseTags)add(t.text);
 for(const t of skinState.tags)add(t.text,t.id);
 for(const key of [...Object.keys(NSFW_PRESETS),'nudeUpper','nudeLower'])for(const t of parseBaseTags(nsfw?.[key]||''))add(t.text);
 const sectionSource=Array.isArray(data.sections)?data.sections:[
  ...normalizeAppearanceSections(legacySections,base),
  ...skinState.sections.map(x=>({...x,before:baseTags.length+x.before}))
 ];
 const sections=[],sectionIds=new Set();
 for(const x of sectionSource){
  if(!x||!validLabel(x.title)||sections.length>=60)continue;
  let id=String(x.id||'');
  if(!/^[a-z][a-z0-9_]{0,48}$/.test(id)||sectionIds.has(id)){
   let i=sections.length+1;while(sectionIds.has('divider'+i))i++;id='divider'+i;
  }
  sectionIds.add(id);
  sections.push({id,title:validLabel(x.title),before:Number.isInteger(x.before)?Math.max(0,Math.min(tags.length,x.before)):tags.length});
 }
 return {tags,sections,modes:normalizeAppearanceModeCatalog(data,base,skin,nsfw,legacySections).modes};
}
/** Edit legacy NSFW fields without reformatting existing multi-line text. */
export function editNsfwTag(source,needle,replacement=''){
 const text=String(source||''),matches=parseBaseTags(text).filter(tag=>norm(tag.text)===norm(needle));
 let result=text;
 for(const tag of matches.reverse()){
  if(replacement){result=result.slice(0,tag.start)+replacement+result.slice(tag.end);continue;}
  const before=result.slice(0,tag.start),after=result.slice(tag.end);
  if(/^\s*,/.test(after))result=before+after.replace(/^\s*,[ \t]*/,'');
  else if(/,[ \t\r\n]*$/.test(before))result=before.replace(/,[ \t\r\n]*$/,'')+after;
  else result=before+after;
 }
 return result;
}
export function appendNsfwTag(source,tag){
 const value=String(source||''),trimmed=value.trimEnd();
 if(!trimmed)return String(tag||'').trim();
 const trailing=value.slice(trimmed.length),ends=trimmed.endsWith(';');
 const core=ends?trimmed.slice(0,-1):trimmed;
 const separator=/,\s*$/.test(core)?' ':', ';
 return core+separator+String(tag).trim()+(ends?';':'')+trailing;
}
/** Preserve character source ordering, all surviving offsets and selection ownership. */
export function reorderBaseTags(state,reordered){
 const before=parseBaseTags(state.base),oldRanges=state.ranges||[],oldSelections=state.selections||{};
 const text=reordered.map(x=>x.text).join(', ')+(reordered.length?';':'');
 let offset=0;
 const destinations=new Map();
 for(const tag of reordered){
  if(Number.isInteger(tag.start))destinations.set(tag.start,{start:offset,end:offset+tag.text.length,text:tag.text});
  offset+=tag.text.length+2;
 }
 const mapRanges=(ranges,unclassified)=>{
  const moved=[];
  for(const r of ranges)for(const old of before){
   const a=Math.max(old.start,r.start),b=Math.min(old.end,r.end);
   if(a>=b)continue;
   const target=destinations.get(old.start);
   if(!target)continue;
   const full=a===old.start&&b===old.end;
   const start=target.start+a-old.start;
   const end=full?target.end:Math.min(target.end,target.start+b-old.start);
   if(start<end)moved.push({...r,start,end,text:text.slice(start,end)});
  }
  return normalizeAppearanceRanges(text,moved,unclassified);
 };
 return {base:text,ranges:mapRanges(oldRanges,false),selections:normalizeAppearanceSelections(text,Object.fromEntries(Object.entries(oldSelections).map(([k,v])=>[k,mapRanges(v,true)])))};
}

export function createAppearanceBoard({ui,parent,readBaseState,writeBaseState,readNsfwState=()=>({}),writeNsfwState=()=>{},initialSkin,initialSections,initialCatalog,initialMode='base',initialPreset,changed,readOnly,onLayoutChange=()=>{}}){
 const {el,button,clear,input}=ui;
 let skin=normalizeSkinTags(initialSkin),catalog=normalizeAppearanceCatalog(initialCatalog,readBaseState().base,skin,readNsfwState(),initialSections);
  let modeCatalog=normalizeAppearanceModeCatalog(initialCatalog,readBaseState().base,skin,readNsfwState(),initialSections);
  const collapsed=new Set();let focusTagId='',transferTagId='';
 let mode=['base','skin','nsfw'].includes(initialMode)?initialMode:'base';
 let preset=initialPreset||(mode==='skin'?'upper_front':mode==='nsfw'?'nsfwChest':'face');
 let layout='board',appearanceFormat='tags',filter='',checked=new Set(),undo=[],redo=[];
 const frame=el('section',undefined,parent,'ness-tagboard');
 frame.setAttribute('aria-label','Конструктор тегов внешности');
 const header=el('div',undefined,frame,'ness-tagboard-header');
 el('strong','Редактор внешности',header);
 const tools=el('div',undefined,header,'ness-tagboard-actions');tools.hidden=true;
 const boardButton=button('',tools,()=>{},'quiet');boardButton.hidden=true;
 const textButton=button('',tools,()=>{},'quiet');textButton.hidden=true;
 const modes=el('div',undefined,frame,'ness-tagboard-modes');
 const notice=el('p',undefined,frame,'ness-note');notice.hidden=true;notice.setAttribute('aria-live','polite');
 const warn=value=>{notice.textContent=value;notice.hidden=!value;};
 const basic=button('Ракурсы',modes,()=>{mode='base';preset='face';if(appearanceFormat==='prose')layout='text';checked.clear();render();},'quiet');
 const marks=button('Под одеждой',modes,()=>{mode='skin';layout='board';preset='upper_front';checked.clear();render();},'quiet');
 const nsfw=button('NSFW',modes,()=>{mode='nsfw';layout='board';preset='nsfwChest';checked.clear();render();},'quiet');
 const content=el('div',undefined,frame,'ness-tagboard-body');
  function getCatalog(){
   const legacy=normalizeAppearanceCatalog(catalog,readBaseState().base,skin,readNsfwState(),initialSections);
   return {...legacy,modes:copy(modeCatalog.modes)};
  }
 const snapshot=()=>copy({base:readBaseState(),catalog:getCatalog(),skin,nsfw:readNsfwState()});
 function applySnapshot(s){
  writeBaseState(copy(s.base));writeNsfwState(copy(s.nsfw||{}));
  skin=normalizeSkinTags(s.skin);
  catalog=normalizeAppearanceCatalog(s.catalog,s.base.base,skin,s.nsfw);
   modeCatalog=normalizeAppearanceModeCatalog(s.catalog,s.base.base,skin,s.nsfw);
  changed();render();
 }
 function record(){undo.push(snapshot());if(undo.length>50)undo.shift();redo.length=0;}
 function after(){changed();render();}
 const availablePresets=()=>mode==='base'?{always:'✦ Показывать всегда',...Object.fromEntries(Object.entries(NESS_APPEARANCE_PRESETS).map(([id,v])=>[id,v.label]))}:mode==='skin'?{always:'✦ Для всех открытых областей',...SKIN_PRESETS}:NSFW_PRESETS;
 const baseState=()=>readBaseState();
 const baseSelected=id=>visibleAppearanceRanges(baseState().ranges,id,baseState().selections,false);
 const baseTag=tag=>parseBaseTags(baseState().base).find(t=>norm(t.text)===norm(tag.text));
 const isBaseChosen=(tag,id)=>{
  const t=baseTag(tag);return !!t&&baseSelected(id).some(r=>r.start<t.end&&t.start<r.end);
 };
 const skinTag=tag=>skin.tags.find(t=>norm(t.text)===norm(tag.text));
 const isSkinChosen=(tag,id)=>{const t=skinTag(tag);return !!t&&(skin.selections[id]||[]).includes(t.id);};
 const isNsfwChosen=(tag,id)=>parseBaseTags(readNsfwState()?.[id]||'').some(t=>norm(t.text)===norm(tag.text));
 const isChosen=(tag,id)=>mode==='base'?isBaseChosen(tag,id):mode==='skin'?isSkinChosen(tag,id):isNsfwChosen(tag,id);
 const items=()=>modeCatalog.modes[mode].tags;
 function setSkinSelection(id,list){
  skin.selections[id]=[...new Set(list)];
  if(id===SKIN_ALWAYS){
   const excluded=new Set(skin.selections.always);
   for(const key of Object.keys(SKIN_PRESETS))if(skin.selections[key])skin.selections[key]=skin.selections[key].filter(t=>!excluded.has(t));
  }
 }

 function toggle(tag,assign){changeMany([tag],assign);}
 function changeMany(tags,assign,recordHistory=true){
  if(readOnly()||!tags.length)return;
  const relevant=tags.filter(t=>isChosen(t,preset)!==assign);
  if(!relevant.length)return;
  if(recordHistory)record();
  if(mode==='skin'){
   const current=new Set(skin.selections[preset]||[]),ids=new Set();
   for(const tag of relevant){
    let st=skinTag(tag);
    if(!st&&assign){
     let id=tag.id;
     if(skin.tags.some(x=>x.id===id))id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
     st={id,text:tag.text,section:''};skin.tags.push(st);
    }
    if(!st)continue;
    ids.add(st.id);if(assign)current.add(st.id);else current.delete(st.id);
   }
   setSkinSelection(preset,[...current]);
   if(preset!==SKIN_ALWAYS&&assign)skin.selections.always=(skin.selections.always||[]).filter(x=>!ids.has(x));
  }else if(mode==='nsfw'){
   const state={...readNsfwState()};
   for(const tag of relevant)state[preset]=assign?appendNsfwTag(state[preset],tag.text):editNsfwTag(state[preset],tag.text);
   writeNsfwState(state);
  }else{
   let state=baseState();
   if(assign){
    const existing=parseBaseTags(state.base),missing=relevant.filter(t=>!existing.some(x=>norm(x.text)===norm(t.text)));
    if(missing.length){state=reorderBaseTags(state,[...existing,...missing.map(t=>({text:t.text}))]);writeBaseState(state);}
   }
   const updated={...(state.selections||{})};
   const overlap=(r,t)=>r.start<t.end&&t.start<r.end;
   const targets=relevant.map(baseTag).filter(Boolean);
   const current=baseSelected(preset).filter(r=>!targets.some(t=>overlap(r,t)));
   if(assign)for(const t of targets)current.push({start:t.start,end:t.end,text:t.text});
   updated[preset]=normalizeAppearanceRanges(state.base,current,true);
   if(preset===NESS_APPEARANCE_ALWAYS&&assign){
    for(const id of Object.keys(NESS_APPEARANCE_PRESETS))
     updated[id]=normalizeAppearanceRanges(state.base,baseSelected(id).filter(r=>!targets.some(t=>overlap(r,t))),true);
   }else if(preset!==NESS_APPEARANCE_ALWAYS&&assign){
    updated.always=normalizeAppearanceRanges(state.base,baseSelected(NESS_APPEARANCE_ALWAYS).filter(r=>!targets.some(t=>overlap(r,t))),true);
   }
   writeBaseState({...state,selections:normalizeAppearanceSelections(state.base,updated)});
  }
  after();
 }
 
 const sectionsForMode=()=>modeCatalog.modes[mode].sections;
 function orderedSequence(){
  const all=items(),sequence=[];
  for(let i=0;i<=all.length;i++){
   for(const divider of sectionsForMode())if(divider.before===i)sequence.push({kind:'divider',id:divider.id,section:divider});
   if(i<all.length)sequence.push({kind:'tag',id:all[i].id,tag:all[i]});
  }
  return sequence;
 }
 function applySequence(sequence){
  if(readOnly())return;
  record();
  const sorted=sequence.filter(t=>t.kind==='tag').map(t=>t.tag),movedSections=[];
  let index=0;
  for(const token of sequence){
   if(token.kind==='tag')index++;
   else movedSections.push({id:token.id,title:token.section.title,before:index});
  }
  const base=baseState(),existing=parseBaseTags(base.base);
  const reordered=sorted.map(tag=>existing.find(x=>norm(x.text)===norm(tag.text))).filter(Boolean);
  modeCatalog.modes[mode]={tags:sorted.map(x=>({...x})),sections:movedSections};
  if(mode==='base'&&appearanceFormat!=='prose'&&reordered.length===existing.length&&!reordered.every((x,i)=>x.start===existing[i].start))
   writeBaseState(reorderBaseTags(base,reordered));
  if(mode==='skin'){
   const known=sorted.map(t=>skinTag(t)).filter(Boolean);
   skin.tags=[...known,...skin.tags.filter(t=>!known.includes(t))];
   skin.sections=movedSections.map(x=>({...x}));
  }
  if(mode==='nsfw'){
   const fields={...readNsfwState()},current=Object.keys(NSFW_PRESETS);
   for(const field of current){
    const old=parseBaseTags(fields[field]);
    const byText=new Map(old.map(t=>[norm(t.text),t.text]));
    const reordered=sorted.filter(t=>byText.has(norm(t.text))).map(t=>byText.get(norm(t.text)));
    if(reordered.length===old.length && reordered.some((v,i)=>v!==old[i].text))
     fields[field]=reordered.join(', ')+(String(fields[field]||'').trimEnd().endsWith(';')?';':'');
   }
   writeNsfwState(fields);
  }
  after();
 }
 function moveSequenceToken(token,target,afterTarget=false){
  if(readOnly())return;
  const sequence=orderedSequence(),from=sequence.findIndex(t=>t.kind===token.kind&&t.id===token.id),at=sequence.findIndex(t=>t.kind===target.kind&&t.id===target.id);
  if(from<0||at<0||from===at)return;
  const result=[...sequence],item=result.splice(from,1)[0],to=result.findIndex(t=>t.kind===target.kind&&t.id===target.id);
  result.splice(to+(afterTarget?1:0),0,item);
  applySequence(result);
 }
 function moveTokenOne(token,direction){
  const sequence=orderedSequence(),i=sequence.findIndex(t=>t.kind===token.kind&&t.id===token.id),j=i+direction;
  if(i<0||j<0||j>=sequence.length)return;
  moveSequenceToken(token,sequence[j],direction>0);
 }
 function reposition(tag,delta){
  if(readOnly())return;
  const sequence=orderedSequence(),from=sequence.findIndex(t=>t.kind==='tag'&&t.id===tag.id),to=from+delta;
  if(from<0||to<0||to>=sequence.length)return;
  moveSequenceToken(sequence[from],sequence[to],delta>0);
 }
 function jumpSection(tag,direction){
  const next=repositionModeTag({tags:items(),sections:sectionsForMode()},tag.id,direction);
  if(!next){warn('Нет соседнего раздела в этом направлении.');return;}
  const groupMap=new Map(sectionsForMode().map(x=>[x.id,x]));
  const tagMap=new Map(items().map(x=>[x.id,x]));
  const sequence=[];
  for(let i=0;i<=next.tags.length;i++){
   for(const section of next.sections.filter(x=>x.before===i))
    sequence.push({kind:'divider',id:section.id,section:groupMap.get(section.id)});
   if(i<next.tags.length)sequence.push({kind:'tag',id:next.tags[i].id,tag:tagMap.get(next.tags[i].id)});
  }
  applySequence(sequence);
 }
 function transferTag(tag,target,remove){
  if(readOnly()||target===mode)return;
  const dest=modeCatalog.modes[target],exists=dest.tags.some(t=>norm(t.text)===norm(tag.text));
  if(exists&&!remove){warn('Этот тег уже есть в выбранном режиме.');return;}
  const source=mode==='base'?baseTag(tag):null;
  if(remove&&mode==='base'&&source&&parseBaseTags(baseState().base).length<2){
   warn('Нельзя перенести последний тег постоянной внешности.');return;
  }
  if(remove&&mode==='base'&&appearanceFormat==='prose'){warn('В текстовом режиме переноси теги через текстовое поле.');return;}
  if(remove&&!confirm('Перенос удалит тег и его назначения в исходном режиме. Продолжить?'))return;
  record();
  if(!exists)dest.tags.push({id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),text:tag.text});
  if(remove){
   const old=items(),at=old.findIndex(t=>t.id===tag.id);
   modeCatalog.modes[mode].tags=old.filter(t=>t.id!==tag.id);
   modeCatalog.modes[mode].sections=sectionsForMode().map(x=>({...x,before:Math.max(0,x.before-(at>=0&&at<x.before?1:0))}));
   if(mode==='base'&&source)writeBaseState(reorderBaseTags(baseState(),parseBaseTags(baseState().base).filter(t=>t.start!==source.start)));
   else if(mode==='skin'){
    const st=skinTag(tag);
    if(st){
     skin.tags=skin.tags.filter(x=>x.id!==st.id);
     for(const id of Object.keys(skin.selections))skin.selections[id]=skin.selections[id].filter(x=>x!==st.id);
    }
   }else if(mode==='nsfw')writeNsfwState(cleanNsfwTags(readNsfwState(),tag.text));
  }
  transferTagId='';focusTagId='';warn((remove?'Перенесено':'Скопировано')+' в «'+(target==='base'?'Ракурсы':target==='skin'?'Под одеждой':'NSFW')+'». Назначь тег нужной области.');after();
 }
 function cleanNsfwTags(state,changed,rename=''){
  const result={...state};
  for(const key of Object.keys(NSFW_PRESETS))result[key]=editNsfwTag(result[key],changed,rename);
  return result;
 }
 function addGroup(){
  if(readOnly())return;
  const inputNode=content.querySelector('[data-group-name]'),title=validLabel(inputNode?.value);
  if(!title)return;
  record();
  const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),divider={id,title,before:items().length};
  sectionsForMode().push(divider);
  after();
 }
 function renameGroup(id,title){
  if(readOnly()||!title.trim())return;
  record();const group=sectionsForMode().find(x=>x.id===id);
  if(group)group.title=validLabel(title);
  after();
 }
 function deleteGroup(id){
  if(readOnly()||!id||!confirm('Удалить разделитель? Теги внутри него останутся.'))return;
  record();
  modeCatalog.modes[mode].sections=sectionsForMode().filter(x=>x.id!==id);
  after();
 }
 function addTag(value){
  const text=String(value||'').trim().replace(/[;,\s]+$/,'').trim();
  if(!text||readOnly())return;
  if(/[,\r\n]/.test(text)){warn('Добавляй по одному тегу.');return;}
  const existing=items().find(x=>norm(x.text)===norm(text));
  if(existing){toggle(existing,true);return;}
  warn('');
  record();
  const id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const tag={id,text};items().push(tag);
  changeMany([tag],true,false);
 }
 function removeTag(tag){
  if(readOnly())return;
  if(!confirm('Удалить тег из выбранного режима и снять его назначения?'))return;
  const all=items(),at=all.indexOf(tag),source=parseBaseTags(baseState().base);
  const existing=mode==='base'?source.find(x=>norm(x.text)===norm(tag.text)):null;
  if(existing&&appearanceFormat==='prose'){warn('Для обычного текста редактируй описание через текстовый режим. Удаление из каталога изменило бы исходный абзац.');return;}
  if(existing&&source.length===1){warn('Нельзя удалить последний тег основы: постоянная внешность должна быть заполнена.');return;}
  record();
  modeCatalog.modes[mode].tags=items().filter(x=>x.id!==tag.id);
  modeCatalog.modes[mode].sections=sectionsForMode().map(x=>({...x,before:Math.max(0,x.before-(at<x.before?1:0))}));
  if(existing)writeBaseState(reorderBaseTags(baseState(),source.filter(x=>x.start!==existing.start)));
  if(mode==='skin'){
   const st=skinTag(tag);
   if(st){
    skin.tags=skin.tags.filter(x=>x.id!==st.id);
    for(const id of Object.keys(skin.selections))skin.selections[id]=skin.selections[id].filter(x=>x!==st.id);
   }
  }
  if(mode==='nsfw')writeNsfwState(cleanNsfwTags(readNsfwState(),tag.text));
  after();
 }
 function renameTag(tag,next){
  const text=String(next||'').trim().replace(/[,;]+$/,'').trim();
  if(!text||text===tag.text||readOnly())return;
  if(/[,\r\n]/.test(text)){warn('В одном теге нельзя использовать запятую.');return;}
  if(items().some(x=>x!==tag&&norm(x.text)===norm(text)))return;
  if(mode==='base'&&appearanceFormat==='prose'&&parseBaseTags(baseState().base).some(t=>norm(t.text)===norm(tag.text))){warn('Для обычного текста меняй фразу в текстовом режиме, чтобы сохранить абзац.');return;}
  record();
  const previous=tag.text,source=parseBaseTags(baseState().base);
  const existing=mode==='base'?source.find(x=>norm(x.text)===norm(previous)):null;
  if(existing)writeBaseState(reorderBaseTags(baseState(),source.map(x=>x.start===existing.start?{...x,text}:x)));
  if(mode==='skin'){const st=skinTag(tag);if(st)st.text=text;}
  if(mode==='nsfw')writeNsfwState(cleanNsfwTags(readNsfwState(),previous,text));
  tag.text=text;after();
 }
 function preview(){
  if(mode==='skin'){
   if(preset==='always')return skin.tags.filter(t=>(skin.selections.always||[]).includes(t.id)).map(t=>t.text).join(', ')||'(нет тегов)';
   return formatSkinParts(skin,[preset])||'(нет тегов)';
  }
  if(mode==='nsfw')return String(readNsfwState()?.[preset]||'').trim()||'(нет тегов)';
  const state=baseState();
  const configured=hasConfiguredAppearanceViews({appearanceRanges:state.ranges,appearanceSelections:state.selections});
  // Mirror NESS_VIS insertion: an empty preset shows only Always, never the
  // entire source appearance unless no views were configured at all.
  const selected=visibleAppearanceRanges(state.ranges,preset,state.selections,preset!==NESS_APPEARANCE_ALWAYS);
  const tags=selected.map(x=>x.text.trim().replace(/[,;]+$/,'')).filter(Boolean).join(', ');
  return (preset===NESS_APPEARANCE_ALWAYS||configured?tags:state.base.trim())||'(нет тегов)';
 }
 function render(){
  onLayoutChange(layout,mode);
  basic.setAttribute('aria-pressed',String(mode==='base'));
  marks.setAttribute('aria-pressed',String(mode==='skin'));
  nsfw.setAttribute('aria-pressed',String(mode==='nsfw'));
  boardButton.disabled=mode==='base'&&appearanceFormat==='prose';
  boardButton.title=boardButton.disabled?'Для обычного текста используй текстовый редактор; кожа остаётся независимым набором тегов.':'';
  boardButton.setAttribute('aria-pressed',String(layout==='board'));
  textButton.setAttribute('aria-pressed',String(layout==='text'));
  clear(content);
  const headings=availablePresets();
  const ribbon=el('div',undefined,content,'ness-tagboard-ribbon');
  for(const [id,label] of Object.entries(headings)){
   const b=button(label,ribbon,()=>{preset=id;checked.clear();render();},'quiet');
   b.setAttribute('aria-pressed',String(id===preset));
   b.title=label;
  }
  const bar=el('div',undefined,content,'ness-tagboard-tools');
  const pick=el('select',undefined,bar,'ness-input');
  for(const [id,name] of Object.entries(headings)){
   const opt=el('option',name,pick);opt.value=id;
  }
  pick.value=preset;pick.onchange=()=>{preset=pick.value;checked.clear();render();};
  if(layout==='text'){
   const note=el('p',mode==='base'?'Исходное описание сохраняет точный текст и разметку тегов. Для редактирования используй текстовое поле внешности в карточке.':mode==='skin'?'Метки открытой кожи вставляются после базовой внешности перед одеждой. Общие теги доступны во всех разделах.':'NSFW-особенности используются только при видимых открытых участках.',content,'ness-note');
   if(mode==='skin'||mode==='nsfw'){
    const textArea=el('textarea',undefined,content,'ness-input');textArea.value=preview();textArea.readOnly=true;
   }
  }else{
   const act=el('div',undefined,content,'ness-tagboard-history');
   const reorderToggle=button('✎ Редактировать порядок и разделители',act,()=>{frame.dataset.moveMode=frame.dataset.moveMode==='true'?'false':'true';render();},'quiet');
   reorderToggle.setAttribute('aria-pressed',String(frame.dataset.moveMode==='true'));
   const undoBtn=button('↶ Отменить',act,()=>{if(!undo.length)return;redo.push(snapshot());applySnapshot(undo.pop());},'quiet');undoBtn.disabled=!undo.length;
   const redoBtn=button('↷ Повторить',act,()=>{if(!redo.length)return;undo.push(snapshot());applySnapshot(redo.pop());},'quiet');redoBtn.disabled=!redo.length;
   const search=el('input',undefined,bar,'ness-input');search.type='search';search.placeholder='Найти тег';search.value=filter;
   search.oninput=()=>{
    filter=search.value;
    for(const row of tagFlow.querySelectorAll('.ness-unified-tag-row')){
     const label=row.querySelector('.ness-unified-chip')?.textContent||'';
     row.hidden=!!filter&&!norm(label).includes(norm(filter));
    }
   };
   const inputTag=el('input',undefined,bar,'ness-input');inputTag.placeholder='Новый тег, Enter';
   inputTag.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addTag(inputTag.value);}};
   const add=button('+ Добавить тег',bar,()=>addTag(inputTag.value),'quiet');
   const scene=el('div',undefined,content,'ness-unified-highlight-list');
   const help=button('?',act,()=>warn(mode==='base'
    ?'Нажимай на теги для подсветки в выбранном ракурсе. «Всегда» действует во всех ракурсах.'
    :mode==='skin'?'Отмечай особенности открытого участка: закрытые одеждой детали не передаются.'
    :'Грудь, нижняя передняя и нижняя задняя анатомия отмечаются отдельно. Старые описания сохранены.'),'quiet ness-mini-help');
   help.title='Как работает режим';
   const tagFlow=el('div',undefined,scene,'ness-unified-tagflow');
   const sequence=orderedSequence(),editMode=frame.dataset.moveMode==='true';
   const selected=new Set(items().filter(tag=>isChosen(tag,preset)).map(tag=>norm(tag.text)));
   const inherited=mode==='nsfw'?new Set():new Set(items().filter(tag=>isChosen(tag,'always')).map(tag=>norm(tag.text)));
   let flow=tagFlow;
   function drawTag(tag){
    if(filter&&!norm(tag.text).includes(norm(filter)))return;
    const row=el('div',undefined,flow,'ness-unified-tag-row');
    const marked=selected.has(norm(tag.text));
    const chip=button((marked?'✓ ':'')+tag.text,row,()=>{focusTagId=tag.id;toggle(tag,!marked);},'quiet ness-unified-chip');
    chip.setAttribute('aria-pressed',String(marked));
    chip.setAttribute('data-highlighted',String(marked));
    chip.setAttribute('data-inherited',String(preset!=='always'&&!marked&&inherited.has(norm(tag.text))));
    chip.title='Нажми для подсветки; ПКМ — копирование и перенос';
    chip.oncontextmenu=e=>{e.preventDefault();transferTagId=tag.id;focusTagId=tag.id;render();};
    const grip=button('⠿',row,()=>{focusTagId=tag.id;transferTagId=transferTagId===tag.id?'':tag.id;render();},'quiet ness-unified-grip');
    grip.title='Удерживай для переноса между режимами';grip.setAttribute('aria-label','Действия с тегом '+tag.text);
    let hold=null,x=0,y=0;
    grip.onpointerdown=e=>{
     if(e.pointerType==='mouse')return;
     x=e.clientX;y=e.clientY;
     hold=setTimeout(()=>{hold=null;focusTagId=tag.id;transferTagId=tag.id;render();},520);
    };
    grip.onpointermove=e=>{if(hold!==null&&(Math.abs(x-e.clientX)>9||Math.abs(y-e.clientY)>9)){clearTimeout(hold);hold=null;}};
    grip.onpointerup=grip.onpointercancel=()=>{if(hold!==null){clearTimeout(hold);hold=null;}};
    if(focusTagId===tag.id){
     const actions=el('div',undefined,row,'ness-unified-tag-controls');
     for(const [label,direction,title] of [['←','left','На тег раньше'],['→','right','На тег позже'],['↑','up','На раздел выше'],['↓','down','На раздел ниже']]){
      const ctrl=button(label,actions,()=>jumpSection(tag,direction),'quiet');
      ctrl.title=title;ctrl.setAttribute('aria-label',title);
     }
     if(editMode){
      button('✎',actions,()=>{
       const edit=el('input',undefined,row,'ness-input');edit.value=tag.text;
       edit.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();renameTag(tag,edit.value);}else if(e.key==='Escape'){e.preventDefault();edit.remove();}};
       edit.focus();edit.select?.();
      },'quiet').title='Изменить тег';
      button('×',actions,()=>removeTag(tag),'quiet').title='Удалить тег';
     }
    }
    if(transferTagId===tag.id){
     const options=el('div',undefined,row,'ness-unified-transfer');
     el('span','В другой режим',options,'ness-note');
     for(const id of ['base','skin','nsfw']){
      if(id===mode)continue;
      const label=id==='base'?'Ракурсы':id==='skin'?'Под одеждой':'NSFW';
      button('⧉ Копировать · '+label,options,()=>transferTag(tag,id,false),'quiet');
      button('↗ Перенести · '+label,options,()=>transferTag(tag,id,true),'quiet');
     }
     button('× Закрыть',options,()=>{transferTagId='';render();},'quiet');
    }
   }
   for(let i=0;i<sequence.length;i++){
    const token=sequence[i];
    if(token.kind==='tag'){drawTag(token.tag);continue;}
    const section=el('section',undefined,tagFlow,'ness-unified-section');
    const heading=el('div',undefined,section,'ness-unified-section-head');
    let end=i+1;while(end<sequence.length&&sequence[end].kind!=='divider')end++;
    const count=sequence.slice(i+1,end).filter(x=>x.kind==='tag').length;
    const sectionKey=mode+':'+token.id,folded=collapsed.has(sectionKey);
    const headButton=button((folded?'▸ ':'▾ ')+token.section.title+' · '+count+' тегов',heading,()=>{
     if(collapsed.has(sectionKey))collapsed.delete(sectionKey);else collapsed.add(sectionKey);
     render();
    },'quiet ness-unified-section-toggle');
    headButton.setAttribute('aria-expanded',String(!folded));headButton.title='Свернуть или развернуть раздел';
    if(editMode){
     button('↑',heading,()=>moveTokenOne(token,-1),'quiet').title='Переместить разделитель вверх';
     button('↓',heading,()=>moveTokenOne(token,1),'quiet').title='Переместить разделитель вниз';
     button('✎',heading,()=>{
      const edit=el('input',undefined,heading,'ness-input');edit.value=token.section.title;
      edit.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();renameGroup(token.id,edit.value);}else if(e.key==='Escape'){e.preventDefault();edit.remove();}};
      edit.focus();edit.select?.();
     },'quiet').title='Переименовать разделитель';
     button('×',heading,()=>deleteGroup(token.id),'quiet').title='Удалить разделитель без удаления тегов';
    }
    flow=el('div',undefined,section,'ness-unified-section-tags');
    flow.hidden=folded;
   }
   if(!items().length)el('p','Тегов пока нет. Добавь первый ниже.',tagFlow,'ness-note');
   const footer=el('div',undefined,content,'ness-unified-add');
   const tagInput=el('input',undefined,footer,'ness-input');tagInput.placeholder='Новый тег → Enter';
   tagInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addTag(tagInput.value);}};
   button('+ Тег',footer,()=>addTag(tagInput.value),'quiet');
   if(editMode){
    const groupInput=el('input',undefined,footer,'ness-input');groupInput.placeholder='Название разделителя';groupInput.setAttribute('data-group-name','');
    groupInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addGroup();}};
    button('+ Разделитель',footer,addGroup,'quiet');
   }
   const details=el('details',undefined,content,'ness-tagboard-preview');
   el('summary','Предпросмотр строки',details);
   el('p',preview(),details,'ness-tagboard-preview-text');

  }
 }
 frame.tabIndex=-1;
 frame.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||readOnly())return;
  if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
  const key=e.key.toLowerCase();
  if(key==='z'&&!e.shiftKey&&undo.length){e.preventDefault();redo.push(snapshot());applySnapshot(undo.pop());}
  else if((key==='y'||key==='z'&&e.shiftKey)&&redo.length){e.preventDefault();undo.push(snapshot());applySnapshot(redo.pop());}
 });
 render();
 return {element:frame,getSkin:()=>normalizeSkinTags(skin),getSections:()=>normalizeAppearanceSections(modeCatalog.modes.base.sections,readBaseState().base),getCatalog,refresh:render,getMode:()=>mode,setAvailableFormat(value){appearanceFormat=value==='prose'?'prose':'tags';if(appearanceFormat==='prose'&&mode==='base')layout='text';else layout='board';render();}};
}
/** One additional marker in the existing director call; no extra model requests. */
export function skinAppearanceInstruction(records){
 const entries=[...records].filter(([,v])=>hasSkinSelections(v.skinTags));
 if(!entries.length){
  return records.size?'\n\nVISIBLE SKIN MARKERS: No library character has configured exposed-skin tags. Do NOT write [[NESS_SKIN:...]] markers. Legacy nudeUpper and nudeLower fields are independent.':'';
 }
 const names=entries.map(([id,v])=>id+': '+Object.keys(SKIN_PRESETS).filter(k=>(v.skinTags?.selections?.[k]||[]).length||(v.skinTags?.selections?.always||[]).length).join(', ')).join('\n');
 return '\n\nVISIBLE SKIN AND MARKS — ONE OPTIONAL MARKER PER CHARACTER\n'
  +'In each character entry whose ID is listed below, immediately after its [[NESS_VIS:id:preset]] marker and BEFORE any clothing, append [[NESS_SKIN:id:part1,part2]] for ONLY the uncovered skin areas actually visible in at least one chosen panel. You may choose multiple parts independently of the main appearance camera preset. '
  +'Allowed skin parts: '+Object.keys(SKIN_PRESETS).join(', ')+'. The lower_front and lower_back parts are DISTINCT; do not include lower_front when only the rear is visible, nor vice versa. Upper-front/back are distinct as well. '
  +'If no configured exposed skin part is visible, use [[NESS_SKIN:id:none]]. Include the marker only once for each listed participant, keep literal [[NESS_SKIN:...]] syntax; never invent anatomy or reveal skin covered by clothing. '
  +'NEVER emit [[NESS_SKIN:...]] for an ID not listed below, even if bare skin is visible or legacy nudeUpper/nudeLower fields exist. '
  +'Skin tags are inserted by the library after the base appearance and before clothing, not written by you. This is an extension-control marker, not an unresolved placeholder: it overrides any general placeholder prohibition. The source fields with legacy nudeUpper/nudeLower are independent and remain governed by their existing visibility rules.\n'
  +'Skin-equipped character IDs and available parts:\n'+names;
}
export function insertSkinAppearance(prompt,records){
 const source=String(prompt||'');
 const openings=[...source.matchAll(/\[\[NESS_SKIN\b/gi)],seenMarkers=new Set(),ignoredMarkers=new Set();
 if(!openings.length&&/\bNESS_SKIN\s*:/i.test(source))
  throw Error('Метка ОТКРЫТОЙ КОЖИ написана без [[...]]. Это [[NESS_SKIN:ID:ОБЛАСТЬ]], а не [[NESS_VIS]] базовой внешности и не метка одежды.');
 for(const opening of openings){
  const pos=opening.index,close=source.indexOf(']]',pos),newline=source.indexOf('\n',pos);
  if(close<0||newline>=0&&close>newline)
   throw Error('Незавершённая метка ОТКРЫТОЙ КОЖИ [[NESS_SKIN:...]]: нет ]]. Она должна стоять после [[NESS_VIS]] и перед описанием одежды.');
  const exact=source.slice(pos,close+2),m=exact.match(/^\[\[NESS_SKIN:([a-z][a-z0-9_]*):([a-z_, \t]+)\]\]$/);
  if(!m)throw Error('Некорректный формат метки ОТКРЫТОЙ КОЖИ '+JSON.stringify(exact.slice(0,100))+'. Ожидается [[NESS_SKIN:ID:lower_back]] или [[NESS_SKIN:ID:none]].');
  const [,id,definition]=m,record=records.get(id);
  if(!record)throw Error('Метка ОТКРЫТОЙ КОЖИ с неизвестным ID «'+id+'»: персонаж не найден в подготовленной библиотеке.');
  if(!hasSkinSelections(record.skinTags)){
   ignoredMarkers.add(id);
   continue; // No skin tags available: harmless marker is removed below.
  }
  if(seenMarkers.has(id))throw Error('Две метки [[NESS_SKIN]] у персонажа «'+(record.name||id)+'». Требуется ровно одна для всех открытых участков.');
  seenMarkers.add(id);
  const parts=definition.split(',').map(x=>x.trim());
  if(!parts.length||parts.some(p=>p!=='none'&&!Object.hasOwn(SKIN_PRESETS,p))||parts.includes('none')&&parts.length>1){
   throw Error('Неизвестная комбинация открытых участков у «'+(record.name||id)+'»: '+definition.slice(0,110)+'. Допустимы: none, '+Object.keys(SKIN_PRESETS).join(', ')+'.');
  }
 }
 const inserted=new Set();
 const result=String(prompt||'').replace(/\[\[NESS_SKIN:([a-z][a-z0-9_]*):([a-z_, \t]+)\]\][ \t]*(?:[,;][ \t]*)?/g,(whole,id,definition)=>{
  const record=records.get(id);
  if(!record)throw Error('Метка кожи с неизвестным персонажем '+id+'.');
  if(!hasSkinSelections(record.skinTags))return '';
  if(inserted.has(id))throw Error('Некорректная повторная метка открытой кожи персонажа '+id+'. Сохрани исходный ответ режиссёра для проверки.');
  inserted.add(id);
  const chosen=definition.split(',').map(s=>s.trim());
  if(chosen.length===1&&chosen[0]==='none')return '';
  if(!chosen.length||chosen.some(p=>!Object.hasOwn(SKIN_PRESETS,p)))
   throw Error('Режиссёр выбрал неизвестную область кожи персонажа '+id+'.');
  const line=formatSkinParts(record.skinTags,chosen);
  return line?line+'; ':'';
 });
 if(result.includes('[[NESS_SKIN:'))throw Error('Режиссёр оставил неподставленную [[NESS_SKIN]] ОТКРЫТОЙ КОЖИ; проверь ID, названия открытых областей и закрывающие ]]. Это НЕ ракурс базовой внешности.');
 if(ignoredMarkers.size)console.warn('[SP Imagen] Удалены лишние NESS_SKIN для персонажей без настроенных тегов кожи: '+[...ignoredMarkers].join(', '));
 for(const [id,record] of records)if(hasSkinSelections(record.skinTags)&&!inserted.has(id))
  console.warn('[SP Imagen] Режиссёр не выбрал открытые участки '+id+'; детали кожи не вставлены во избежание невидимой анатомии.');
 return result;
}
