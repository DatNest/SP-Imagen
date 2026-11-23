/**
 * Shared appearance catalogue with three assignment modes. Display-only headings never enter the image prompt.
 * Existing base strings and appearanceSelections offsets remain authoritative.
 */
import { NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS } from './shared-data.js';
import { openExplanation } from './onboarding.js';
import { createAppearanceFigure } from './appearance-figure.js';
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

export function createAppearanceBoard({ui,parent,readBaseState,writeBaseState,readNsfwState=()=>({}),writeNsfwState=()=>{},initialSkin,initialSections,initialCatalog,initialMode='base',initialPreset,initialHelpPinned=false,changed,readOnly,onLayoutChange=()=>{},onHistoryChange=()=>{},onHelpChange=()=>{}}){
 const {el,button,clear,input}=ui;
 let skin=normalizeSkinTags(initialSkin),catalog=normalizeAppearanceCatalog(initialCatalog,readBaseState().base,skin,readNsfwState(),initialSections);
  let modeCatalog=normalizeAppearanceModeCatalog(initialCatalog,readBaseState().base,skin,readNsfwState(),initialSections);
  const collapsed=new Set();let focusTagId='',transferTagId='',toolMode='';
 let mode=['base','skin','nsfw'].includes(initialMode)?initialMode:'base';
 let preset=initialPreset||(mode==='skin'?'upper_front':mode==='nsfw'?'nsfwChest':'face');
 let layout='board',appearanceFormat='tags',filter='',checked=new Set(),undo=[],redo=[];
 const layouts={base:'board',skin:'board',nsfw:'board'};
 let textDraft=null,renderedMode='',renderedPreset='';
 // Scrolling is UI state, not character data. Keep each mode's ribbon and
 // catalogue position across editor rebuilds, with per-preset chosen offsets.
 const viewportByMode={base:{ribbon:0,tags:0},skin:{ribbon:0,tags:0},nsfw:{ribbon:0,tags:0}};
 const chosenScrollByPreset=new Map();
 let followMovedTag=false,helpPinned=Boolean(initialHelpPinned),helpPeek=false;
 const frame=el('section',undefined,parent,'ness-tagboard');
 frame.setAttribute('aria-label','Редактор тегов внешности');
 const header=el('div',undefined,frame,'ness-tagboard-header');
 el('strong','Внешность',header);
 const modes=el('div',undefined,frame,'ness-tagboard-modes');
 frame.insertBefore(modes,header); // The three appearance modes sit directly under the editor tabs.
 const tools=el('div',undefined,frame,'ness-tagboard-tools');
 frame.insertBefore(tools,modes);
 tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Инструменты тегов внешности');
 const toolModes=el('div',undefined,tools,'ness-tagboard-tool-modes');
 const toolButtons={};
 for(const [id,icon,label] of [['edit','✎','Переименовывать теги'],['delete','🗑','Удалять теги'],['move','✥','Перемещать теги']]){
  const control=button(icon,toolModes,()=>{
   if(readOnly())return;
   toolMode=toolMode===id?'':id;
   focusTagId='';closeTransfer();render();
  },'quiet ness-tagboard-tool');
  control.title=label;control.setAttribute('aria-label',label);
  toolButtons[id]=control;
 }
 const toolInfo=button('?',toolModes,()=>openExplanation('Режимы тегов','✎ переименовывает теги. 🗑 удаляет тег нажатием; ↶ вернёт удалённый тег. ✥ выбирает тег для перемещения стрелками ← → ↑ ↓. Удерживание тега открывает список разделов и режимов. Активен только один инструмент. Верхняя панель закреплена при прокрутке.'),'quiet ness-tagboard-help');
 toolInfo.title='Как работают режимы тегов';toolInfo.setAttribute('aria-label','Помощь по режимам тегов');
 const toolHistory=el('div',undefined,tools,'ness-tagboard-tool-history');
 const toolMove=el('div',undefined,tools,'ness-tagboard-tool-movement');
 toolMove.hidden=true;
 const moveName=el('span','',toolMove,'ness-tagboard-move-name');
 const moveArrows=el('div',undefined,toolMove,'ness-tagboard-move-arrows');
 for(const [sign,direction,label] of [['←','left','На тег раньше'],['→','right','На тег позже'],['↑','up','В предыдущий раздел'],['↓','down','В следующий раздел']]){
  const arrow=button(sign,moveArrows,()=>{
   const tag=items().find(t=>t.id===focusTagId);
   if(tag)jumpSection(tag,direction);
  },'quiet ness-tagboard-move-arrow');
  arrow.title=label;arrow.setAttribute('aria-label',label);
 }
 const moveGroup=button('↗',toolMove,()=>{
  const tag=items().find(t=>t.id===focusTagId);
  if(tag)showTransfer(tag,moveGroup);
 },'quiet ness-tagboard-move-arrow');
 moveGroup.title='Переместить в раздел или другой режим';moveGroup.setAttribute('aria-label',moveGroup.title);
 function updateToolBar(){
  for(const [id,b] of Object.entries(toolButtons)){
   b.setAttribute('aria-pressed',String(id===toolMode));b.disabled=readOnly();
  }
  const tag=items().find(t=>t.id===focusTagId);
  toolMove.hidden=toolMode!=='move'||layout==='text'||!tag;
  moveName.textContent=tag?'✥ '+tag.text:'';
 }
 const notice=el('p',undefined,frame,'ness-note');notice.hidden=true;notice.setAttribute('aria-live','polite');
 const warn=value=>{notice.textContent=value;notice.hidden=!value;};
 const basic=button('Ракурсы',modes,()=>{if(!flushModeText())return;mode='base';layout=layouts.base;preset='face';checked.clear();closeTransfer();render();},'quiet');
 const marks=button('Под одеждой',modes,()=>{if(!flushModeText())return;mode='skin';layout=layouts.skin;preset='upper_front';checked.clear();closeTransfer();render();},'quiet');
 const nsfw=button('NSFW',modes,()=>{if(!flushModeText())return;mode='nsfw';layout=layouts.nsfw;preset='nsfwChest';checked.clear();closeTransfer();render();},'quiet');
 const helpLayout=el('div',undefined,frame,'ness-appearance-main');
 const content=el('div',undefined,helpLayout,'ness-tagboard-body');
 const figure=createAppearanceFigure(ui,helpLayout,()=>setHintPinned(false));
 function activeRibbon(){
  return figure.pickerHost.querySelector?.('.ness-tagboard-ribbon')||content.querySelector?.('.ness-tagboard-ribbon');
 }
 function positionAppearancePickers(ribbon=activeRibbon()){
  // Moving the real ribbon between the normal toolbar and the help card can
  // also reset its scroll in browsers. Keep its scroll position during reparent.
  const ribbonLeft=ribbon?.scrollLeft??0;
  if(helpPinned){
   figure.pickerHost.appendChild(modes);
   if(ribbon)figure.pickerHost.appendChild(ribbon);
  }else{
   frame.insertBefore(modes,header);
   if(ribbon)content.insertBefore(ribbon,content.firstChild||null);
  }
  if(ribbon)ribbon.scrollLeft=ribbonLeft;
 }
 function refreshHelp(){
  const open=helpPinned||helpPeek;
  figure.element.hidden=!open;
  helpLayout.setAttribute('data-help-open',String(open));
  helpLayout.setAttribute('data-help-state',helpPinned?'pinned':helpPeek?'peek':'closed');
  if(open)figure.update(mode,preset,availablePresets()[preset]||preset);
  onHelpChange(helpPinned,helpPeek);
 }
 function setHintPinned(value){
  helpPinned=Boolean(value);
  helpPeek=false;
  positionAppearancePickers();
  refreshHelp();
 }
 function toggleHintPeek(){
  if(helpPinned){setHintPinned(false);return;}
  helpPeek=!helpPeek;
  refreshHelp();
 }
  function getCatalog(){
   const legacy=normalizeAppearanceCatalog(catalog,readBaseState().base,skin,readNsfwState(),initialSections);
   return {...legacy,modes:copy(modeCatalog.modes)};
  }
 const snapshot=()=>copy({base:readBaseState(),catalog:getCatalog(),skin,nsfw:readNsfwState(),editor:{mode,preset,focusTagId}});
 function applySnapshot(s){
  writeBaseState(copy(s.base));writeNsfwState(copy(s.nsfw||{}));
  skin=normalizeSkinTags(s.skin);
  catalog=normalizeAppearanceCatalog(s.catalog,s.base.base,skin,s.nsfw);
   modeCatalog=normalizeAppearanceModeCatalog(s.catalog,s.base.base,skin,s.nsfw);
  if(s.editor){mode=s.editor.mode;preset=s.editor.preset;focusTagId=s.editor.focusTagId||'';layout=layouts[mode]||'board';}
  followMovedTag=!!focusTagId;
  changed();render();historyState();
 }
 function historyState(){updateToolBar();onHistoryChange(undo.length>0,redo.length>0);}
 function record(){undo.push(snapshot());if(undo.length>50)undo.shift();redo.length=0;historyState();}
 function undoAction(){if(readOnly()||!undo.length)return;redo.push(snapshot());applySnapshot(undo.pop());}
 function redoAction(){if(readOnly()||!redo.length)return;undo.push(snapshot());applySnapshot(redo.pop());}
 function after(rebuild=true){changed();if(rebuild)render();else refreshSelection();}
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
 // Count real configured assignments, including shared "Всегда" tags. This
 // reads the same source as the chosen-tag pane; no saved counters or migrations.
 function presetTagCounts(){
  const counts=new Map(),headings=availablePresets(),tags=items();
  if(mode==='base'){
   const state=baseState(),byText=new Map(parseBaseTags(state.base).map(t=>[norm(t.text),t]));
   for(const id of Object.keys(headings)){
    const ranges=visibleAppearanceRanges(state.ranges,id,state.selections,id!=='always');
    counts.set(id,tags.filter(tag=>{
     const match=byText.get(norm(tag.text));
     return match&&ranges.some(r=>r.start<match.end&&match.start<r.end);
    }).length);
   }
  }else if(mode==='skin'){
   const byText=new Map(skin.tags.map(t=>[norm(t.text),t.id]));
   for(const id of Object.keys(headings)){
    const selected=new Set([...(skin.selections[id]||[]),...(id==='always'?[]:skin.selections.always||[])]);
    counts.set(id,tags.filter(tag=>selected.has(byText.get(norm(tag.text)))).length);
   }
  }else{
   const state=readNsfwState();
   for(const id of Object.keys(headings))counts.set(id,parseBaseTags(state[id]||'').length);
  }
  return counts;
 }
 function syncPresetRibbon(){
  const ribbon=activeRibbon();
  if(!ribbon)return;
  const counts=presetTagCounts(),headings=availablePresets();
  for(const btn of ribbon.querySelectorAll('.ness-button')){
   const id=btn.dataset.presetId;
   if(!id)continue;
   const count=counts.get(id)||0,label=headings[id]||id;
   btn.setAttribute('aria-pressed',String(id===preset));
   btn.dataset.filled=String(count>0);
   btn.dataset.selectedCount=String(count);
   btn.setAttribute('aria-label',count?label+', выбрано тегов: '+count:label+', пока без тегов');
   btn.title=count?label+' · '+count+' тегов':'Пока нет выбранных тегов';
  }
 }
 function selectPreset(id){
  if(id===preset)return;
  if(!flushModeText())return;
  const chosen=content.querySelector('.ness-tagboard-chosen-list');
  if(chosen)chosenScrollByPreset.set(mode+':'+preset,chosen.scrollTop);
  closeTransfer();preset=id;checked.clear();
  // The preset changes selections, not the list structure. Never rebuild the
  // clicked ribbon (and lose its scroll/focus) for this ordinary interaction.
  if(layout==='board')refreshSelection();
  else syncPresetRibbon();
  const nextChosen=content.querySelector('.ness-tagboard-chosen-list');
  if(nextChosen)nextChosen.scrollTop=chosenScrollByPreset.get(mode+':'+preset)||0;
  if(helpPinned||helpPeek)figure.update(mode,preset,availablePresets()[preset]||preset);
 }
 function rememberViewport(){
  if(!renderedMode)return;
  const state=viewportByMode[renderedMode];
  const ribbon=activeRibbon(),tagFlow=content.querySelector('.ness-unified-tagflow');
  const chosen=content.querySelector('.ness-tagboard-chosen-list');
  if(ribbon)state.ribbon=ribbon.scrollLeft;
  if(tagFlow)state.tags=tagFlow.scrollTop;
  if(chosen)chosenScrollByPreset.set(renderedMode+':'+renderedPreset,chosen.scrollTop);
 }
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
  after(false);
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
  followMovedTag=toolMode==='move'&&!!focusTagId;
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
  followMovedTag=true;
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
 function moveTagToSection(tag,sectionId){
  if(readOnly())return;
  const seq=orderedSequence(),from=seq.findIndex(t=>t.kind==='tag'&&t.id===tag.id);
  if(from<0)return;
  const token=seq[from],next=seq.filter((_,i)=>i!==from);
  let at=0;
  if(sectionId){
   const anchor=next.findIndex(t=>t.kind==='divider'&&t.id===sectionId);
   if(anchor<0)return;
   at=anchor+1;
  }
  next.splice(at,0,token);
  closeTransfer();focusTagId=tag.id;followMovedTag=true;
  if(sectionId)collapsed.delete(mode+':'+sectionId);
  applySequence(next);
  warn('Тег перемещён в раздел, назначения сохранены.');
 }
 function transferTag(tag,target,remove,targetSectionId=null){
  if(readOnly()||target===mode)return;
  const dest=modeCatalog.modes[target],exists=dest.tags.some(t=>norm(t.text)===norm(tag.text));
  if(exists){warn('Этот тег уже есть в выбранном режиме. Дубликат не создан.');return;}
  const source=mode==='base'?baseTag(tag):null;
  if(remove&&mode==='base'&&source&&parseBaseTags(baseState().base).length<2){
   warn('Нельзя перенести последний тег постоянной внешности.');return;
  }
  if(remove&&mode==='base'&&appearanceFormat==='prose'){warn('В текстовом режиме переноси теги через текстовое поле.');return;}
  if(remove&&!confirm('Перенос удалит тег и его назначения в исходном режиме. Продолжить?'))return;
  record();
  const movedId=remove&&!dest.tags.some(t=>t.id===tag.id)?tag.id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const moved={id:movedId,text:tag.text};
  const targetSection=dest.sections.find(x=>x.id===targetSectionId);
  const at=targetSection?targetSection.before:dest.tags.length;
  const index=targetSection?Math.max(0,Math.min(dest.tags.length,at)):dest.tags.length;
  dest.tags.splice(index,0,moved);
  dest.sections=dest.sections.map(x=>({...x,before:x.id===targetSectionId?x.before:x.before>=index?x.before+1:x.before}));
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
  transferTagId='';focusTagId=movedId;mode=target;layout=layouts[mode];preset=target==='base'?'face':target==='skin'?'upper_front':'nsfwChest';checked.clear();toolMode='move';
  if(targetSectionId)collapsed.delete(target+':'+targetSectionId);
  followMovedTag=true;
   warn((remove?'Перенесено':'Скопировано')+' в «'+(target==='base'?'Ракурсы':target==='skin'?'Под одеждой':'NSFW')+'». Назначь тег нужной области.');after();
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
 function addTag(value,insertAt=items().length,sectionId=null){
  const text=String(value||'').trim().replace(/[;,\s]+$/,'').trim();
  if(!text||readOnly())return false;
  if(/[,\r\n]/.test(text)){warn('Добавляй по одному тегу.');return false;}
  const existing=items().find(x=>norm(x.text)===norm(text));
  if(existing){warn('Такой тег уже есть в этом режиме.');return false;}
  warn('');record();
  const id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const tag={id,text},tags=items(),index=Math.max(0,Math.min(tags.length,insertAt));
  tags.splice(index,0,tag);
  modeCatalog.modes[mode].sections=sectionsForMode().map(section=>({
   ...section,before:section.id===sectionId?section.before:section.before>=index?section.before+1:section.before
  }));
  // Keep the physical source text in the same order as the visible board.
  // Offset-backed camera selections are remapped by reorderBaseTags.
  if(mode==='base'&&appearanceFormat!=='prose'){
   const state=baseState(),source=parseBaseTags(state.base);
   const lookup=new Map(source.map(t=>[norm(t.text),t]));
   lookup.set(norm(text),{text});
   const ordered=items().map(t=>lookup.get(norm(t.text))).filter(Boolean);
   const used=new Set(ordered.map(t=>norm(t.text)));
   ordered.push(...source.filter(t=>!used.has(norm(t.text))));
   writeBaseState(reorderBaseTags(state,ordered));
  }
  changeMany([tag],true,false);
  after();return true;
 }
 function addCompactPlus(parent,indexFor,sectionId=null){
  const slot=el('span',undefined,parent,'ness-tagboard-add-slot');
  const plus=button('＋',slot,()=>{
   if(readOnly())return;
   let field=slot.querySelector('.ness-tagboard-inline-add-input');
   if(field){field.focus?.();return;}
   field=el('input',undefined,slot,'ness-input ness-tagboard-inline-add-input');
   field.type='text';field.placeholder='Новый тег';field.setAttribute('aria-label','Добавить тег в раздел');
   field.onkeydown=e=>{
    if(e.key==='Escape'){e.preventDefault?.();field.remove();plus.hidden=false;plus.focus?.();return;}
    if(e.key==='Enter'){e.preventDefault?.();if(addTag(field.value,indexFor(),sectionId)){field.remove();}}
   };
   field.onblur=()=>{if(!field.value.trim()){field.remove();plus.hidden=false;}};
   plus.hidden=true;field.focus?.();
  },'quiet ness-tagboard-add-plus');
  plus.title='Добавить тег здесь';plus.setAttribute('aria-label','Добавить тег здесь');
  return slot;
 }
 function removeTag(tag,ask=true){
  if(readOnly())return;
  if(ask&&!confirm('Удалить тег из выбранного режима и снять его назначения?'))return;
  const all=items(),at=all.indexOf(tag),source=parseBaseTags(baseState().base);
  const existing=mode==='base'?source.find(x=>norm(x.text)===norm(tag.text)):null;
  if(existing&&appearanceFormat==='prose'){warn('Для обычного текста редактируй описание через текстовый режим. Удаление из каталога изменило бы исходный абзац.');return;}
  if(existing&&source.length===1){warn('Нельзя удалить последний тег основы: постоянная внешность должна быть заполнена.');return;}
  if(focusTagId===tag.id)focusTagId='';
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

 function flushModeText(){
  if(!textDraft||layout!=='text'||mode==='base')return true;
  const source=textDraft.value,previous=items().slice();
  if(source===previous.map(t=>t.text).join(', '))return true;
  const values=source.split(/[,;\r\n]+/).map(t=>t.trim()).filter(Boolean);
  const unique=[],seen=new Set();
  for(const value of values)if(!seen.has(norm(value))){seen.add(norm(value));unique.push(value);}
  if(unique.some(t=>t.length>1200)||unique.length>700){warn('Слишком длинное описание или много тегов.');return false;}
  if(readOnly())return false;
  const result=new Array(unique.length),used=new Set(),renames=[];
  for(let i=0;i<unique.length;i++){
   const exact=previous.find(t=>!used.has(t.id)&&norm(t.text)===norm(unique[i]));
   if(exact){result[i]={...exact};used.add(exact.id);}
  }
  const left=previous.filter(t=>!used.has(t.id));let cursor=0;
  for(let i=0;i<unique.length;i++){
   if(result[i])continue;
   const prior=left[cursor++];
   if(prior){used.add(prior.id);renames.push({prior,value:unique[i]});result[i]={...prior,text:unique[i]};}
   else result[i]={id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),text:unique[i]};
  }
  const removed=previous.filter(t=>!used.has(t.id));
  record();
  if(mode==='skin'){
   for(const {prior,value} of renames){
    const tag=skin.tags.find(t=>norm(t.text)===norm(prior.text));
    if(tag)tag.text=value;
   }
   for(const entry of removed){
    const tag=skin.tags.find(t=>norm(t.text)===norm(entry.text));
    if(!tag)continue;
    skin.tags=skin.tags.filter(t=>t.id!==tag.id);
    for(const key of Object.keys(skin.selections))skin.selections[key]=skin.selections[key].filter(id=>id!==tag.id);
   }
  }else if(mode==='nsfw'){
   let state=readNsfwState();
   for(const {prior,value} of renames)state=cleanNsfwTags(state,prior.text,value);
   for(const tag of removed)state=cleanNsfwTags(state,tag.text);
   writeNsfwState(state);
  }
  const sections=sectionsForMode().map(section=>{
   const preceding=new Set(previous.slice(0,section.before).map(t=>t.id));
   return {...section,before:result.filter(t=>preceding.has(t.id)).length};
  });
  modeCatalog.modes[mode]={tags:result,sections};
  textDraft=null;
  after();
  return true;
 }
 const popup=el('div',undefined,frame,'ness-tagboard-context-menu');popup.hidden=true;
 let drag=null;
 function closeTransfer(){transferTagId='';popup.hidden=true;clear(popup);}
 function showTransfer(tag,anchor){
  if(readOnly()||toolMode!=='move')return;
  transferTagId=tag.id;focusTagId=tag.id;updateToolBar();
  drawTransfer(anchor);
 }
 function drawTransfer(anchor){
  const tag=items().find(t=>t.id===transferTagId);
  if(!tag){closeTransfer();return;}
  clear(popup);popup.hidden=false;
  const head=el('div',undefined,popup,'ness-transfer-head');
  el('strong','✥ Переместить в раздел',head);
  button('×',head,closeTransfer,'quiet').setAttribute('aria-label','Закрыть меню');
  el('p',tag.text,popup,'ness-note ness-transfer-active-tag');
  const targets=el('div',undefined,popup,'ness-transfer-targets');
  const names={base:'Ракурсы',skin:'Под одеждой',nsfw:'NSFW'};
  for(const target of ['base','skin','nsfw']){
   const title=el('p',names[target]+(target===mode?' · текущий режим':' · другой режим'),targets,'ness-note ness-transfer-mode-title');
   const group=el('div',undefined,targets,'ness-transfer-section-buttons');
   if(target===mode){
    button('Без раздела',group,()=>moveTagToSection(tag,null),'quiet');
    for(const section of sectionsForMode())
     button('↳ '+section.title,group,()=>moveTagToSection(tag,section.id),'quiet');
   }else{
    button('↗ '+names[target],group,()=>transferTag(tag,target,true),'quiet');
    for(const section of modeCatalog.modes[target].sections)
     button('↳ '+section.title,group,()=>transferTag(tag,target,true,section.id),'quiet');
   }
  }
  if(anchor?.getBoundingClientRect&&frame.getBoundingClientRect){
   const a=anchor.getBoundingClientRect(),f=frame.getBoundingClientRect();
   const maxX=Math.max(4,frame.clientWidth-(popup.offsetWidth||260)-4);
   popup.style.left=Math.max(4,Math.min(maxX,a.left-f.left))+'px';
   const below=a.bottom-f.top+6,above=a.top-f.top-(popup.offsetHeight||240)-6;
   popup.style.top=Math.max(3,a.bottom+(popup.offsetHeight||240)>window.innerHeight&&above>0?above:below)+'px';
  }
 }
 function gripPointerDown(e,tag,row,grip){
  if(readOnly()||e.button!==0||drag)return;
  const d={id:tag.id,pointer:e.pointerId,x:e.clientX,y:e.clientY,row,grip,moved:false,held:false,drop:null,ghost:null,timer:null};
  drag=d;
  const clean=()=>{
   if(d.timer!==null){clearTimeout(d.timer);d.timer=null;}
   d.ghost?.remove?.();
   row.classList?.remove('ness-drag-source');
   for(const el of content.querySelectorAll('.ness-drag-before,.ness-drag-after,.ness-drag-group'))
    el.classList?.remove('ness-drag-before','ness-drag-after','ness-drag-group');
   drag=null;grip.onpointermove=null;grip.onpointerup=null;grip.onpointercancel=null;
  };
  d.timer=setTimeout(()=>{d.timer=null;if(drag===d&&!d.moved){d.held=true;grip.dataset.ignoreClick='true';showTransfer(tag,row);}},560);
  try{grip.setPointerCapture?.(e.pointerId);}catch(_){}
  grip.onpointermove=event=>{
   if(drag!==d||event.pointerId!==d.pointer||d.held)return;
   if(!d.moved&&Math.hypot(event.clientX-d.x,event.clientY-d.y)>9){
    if(d.timer!==null){clearTimeout(d.timer);d.timer=null;}
    d.moved=true;grip.dataset.ignoreClick='true';
    d.ghost=el('span','⠿ '+tag.text,frame,'ness-tagboard-drag-ghost');
    row.classList?.add('ness-drag-source');
   }
   if(!d.moved)return;
   event.preventDefault?.();
   d.ghost.style.left=event.clientX+13+'px';d.ghost.style.top=event.clientY+13+'px';
   for(const node of content.querySelectorAll('.ness-drag-before,.ness-drag-after,.ness-drag-group'))
    node.classList?.remove('ness-drag-before','ness-drag-after','ness-drag-group');
   d.drop=null;
   const hit=document.elementFromPoint?.(event.clientX,event.clientY);
   const target=hit?.closest?.('.ness-unified-tag-row');
   if(target&&content.contains?.(target)&&target.dataset.tagId!==tag.id){
    const rect=target.getBoundingClientRect(),after=event.clientX>rect.left+rect.width/2;
    target.classList.add(after?'ness-drag-after':'ness-drag-before');
    d.drop={kind:'tag',id:target.dataset.tagId,after};
   }else{
    const group=hit?.closest?.('.ness-unified-section');
    if(group&&content.contains?.(group)){
     group.classList.add('ness-drag-group');
     d.drop={kind:'divider',id:group.dataset.dividerId,after:true};
    }
   }
   const scroll=content.querySelector('.ness-unified-tagflow');
   if(scroll?.getBoundingClientRect){
    const rect=scroll.getBoundingClientRect();
    if(event.clientY<rect.top+28)scroll.scrollTop-=11;
    else if(event.clientY>rect.bottom-28)scroll.scrollTop+=11;
   }
  };
  grip.onpointerup=event=>{
   if(drag!==d||event.pointerId!==d.pointer)return;
   const target=d.drop,wasDrag=d.moved,held=d.held;clean();
   if(wasDrag&&target){
    moveSequenceToken({kind:'tag',id:tag.id},{kind:target.kind,id:target.id},target.after);
    warn('Тег перемещён. Назначения сохранены.');
   }
   if(wasDrag||held){
    grip.dataset.ignoreClick='true';
    setTimeout(()=>{grip.dataset.ignoreClick='false';},450);
   }
  };
  grip.onpointercancel=clean;
 }
 // Assignment clicks update the existing tag nodes instead of rebuilding
 // the entire catalogue, which preserves scroll, focus, and search state.
 function refreshSelection(){
  const columns=content.querySelector('.ness-tagboard-columns');
  if(!columns){render();return;}
  const byId=new Map(items().map(tag=>[tag.id,tag]));
  for(const row of columns.querySelectorAll('.ness-unified-tag-row')){
   const tag=byId.get(row.dataset.tagId),chip=row.querySelector('.ness-unified-chip');
   if(!tag||!chip)continue;
   const marked=isChosen(tag,preset);
   const inherited=preset!=='always'&&mode!=='nsfw'&&!marked&&isChosen(tag,'always');
   if(chip.dataset.highlighted!==String(marked)||chip.dataset.inherited!==String(inherited)){
    chip.textContent=(marked?'✓ ':inherited?'✦ ':'＋ ')+tag.text;
    chip.setAttribute('aria-pressed',String(marked||inherited));
    chip.setAttribute('data-highlighted',String(marked));
    chip.setAttribute('data-inherited',String(inherited));
   }
  }
  const chosen=items().filter(tag=>isChosen(tag,preset));
  const inherited=mode==='nsfw'||preset==='always'?[]:items().filter(tag=>isChosen(tag,'always')&&!isChosen(tag,preset));
  const right=columns.querySelector('.ness-tagboard-right');
  const heading=right?.querySelector('.ness-tagboard-pane-head strong');
  if(heading)heading.textContent='Выбранные теги · '+(chosen.length+inherited.length);
  const chosenList=right?.querySelector('.ness-tagboard-chosen-list');
  if(chosenList){
   const scroll=chosenList.scrollTop;
   const focused=chosenList.contains(frame.ownerDocument?.activeElement)?frame.ownerDocument.activeElement:null;
   // Keep existing buttons mounted: destroying the focused chip on every click
   // causes browsers to scroll the whole dialog to the beginning.
   const direct=className=>[...chosenList.children].find(node=>node.className?.split(' ').includes(className));
   let title=direct('ness-tagboard-overline');
   if(!title)title=el('p',undefined,chosenList,'ness-tagboard-overline');
   title.textContent=preset==='always'?'✦ ДЛЯ ВСЕХ РАКУРСОВ':'В ЭТОМ РАКУРСЕ / УЧАСТКЕ';
   let flow=direct('ness-tagboard-chosen-flow');
   if(!flow)flow=el('div',undefined,chosenList,'ness-tagboard-chosen-flow');
   function reconcile(flow,tags,inheritedFlow=false){
    const previous=new Map([...flow.children].filter(node=>node.dataset?.selectedTagId).map(node=>[node.dataset.selectedTagId,node]));
    const empty=flow.querySelector('.ness-note');
    if(tags.length)empty?.remove();
    for(let i=0;i<tags.length;i++){
     const tag=tags[i];let chip=previous.get(tag.id);
     if(!chip){
      if(inheritedFlow)chip=el('span','✦ '+tag.text,undefined,'ness-tagboard-inherited');
      else{
       chip=button('',undefined,()=>toggle(tag,false),'quiet ness-tagboard-chosen-chip');
       el('span',tag.text,chip);el('span','×',chip,'ness-chosen-remove-mark');
       chip.title='Нажми, чтобы убрать из текущего ракурса';
       chip.setAttribute('aria-label','Убрать '+tag.text+' из этого ракурса');
       chip.setAttribute('aria-pressed','true');
      }
      chip.dataset.selectedTagId=tag.id;
     }
     if(flow.children[i]!==chip)flow.insertBefore(chip,flow.children[i]||null);
     previous.delete(tag.id);
    }
    for(const chip of previous.values())chip.remove();
    if(!tags.length&&!flow.querySelector('.ness-note'))el('p','Пока ничего не выбрано.',flow,'ness-note');
   }
   reconcile(flow,chosen);
   let inheritedTitle=chosenList.querySelector('.ness-tagboard-inherited-title');
   let inheritedContainer=chosenList.querySelector('.ness-tagboard-inherited-flow');
   if(inherited.length){
    if(!inheritedTitle)inheritedTitle=el('p','✦ ДОБАВЛЯЕТСЯ ВСЕГДА',chosenList,'ness-tagboard-overline ness-tagboard-inherited-title');
    if(!inheritedContainer)inheritedContainer=el('div',undefined,chosenList,'ness-tagboard-chosen-flow ness-tagboard-inherited-flow');
    reconcile(inheritedContainer,inherited,true);
   }else{inheritedTitle?.remove();inheritedContainer?.remove();}
   if(focused&&!focused.isConnected){
    const next=flow.querySelector('.ness-tagboard-chosen-chip');
    if(next)next.focus({preventScroll:true});
    else{chosenList.tabIndex=-1;chosenList.focus({preventScroll:true});}
   }
   chosenList.scrollTop=scroll;
  }
  const subtitle=right?.querySelector('.ness-tagboard-pane-head .ness-note');
  if(subtitle)subtitle.textContent=availablePresets()[preset]||preset;
  const previewText=content.querySelector('.ness-tagboard-preview-text');
  if(previewText)previewText.textContent=preview();
  syncPresetRibbon();
 }
 function render(){
  // Structural changes rebuild the board; preserve every parent viewport
  // and the scroll of all replaced ribbons, even when switching modes.
  const ancestors=[frame.closest?.('.ness-library-editorpane'),frame.closest?.('.ness-tab-viewport'),frame.closest?.('.ness-tab-content'),frame.closest?.('#sp-imagen-review-panel')].filter(Boolean);
  const positions=ancestors.map(node=>[node,node.scrollTop,node.scrollLeft]);
  const restore=()=>{for(const [node,top,left] of positions){node.scrollTop=top;node.scrollLeft=left;}};
  rememberViewport();
  const tagScroll=viewportByMode[mode].tags;
  const chosenScroll=chosenScrollByPreset.get(mode+':'+preset)||0;
  const ribbonScroll=viewportByMode[mode].ribbon;
  renderedMode=mode;renderedPreset=preset;
  historyState();
  updateToolBar();
  onLayoutChange(layout,mode);
  basic.setAttribute('aria-pressed',String(mode==='base'));
  marks.setAttribute('aria-pressed',String(mode==='skin'));
  nsfw.setAttribute('aria-pressed',String(mode==='nsfw'));
  figure.pickerHost.querySelector?.('.ness-tagboard-ribbon')?.remove?.();
  clear(content);textDraft=null;
  const headings=availablePresets(),ribbon=el('div',undefined,content,'ness-tagboard-ribbon');
  positionAppearancePickers(ribbon);
  refreshHelp();
  ui.wheelAlongX?.(ribbon);
  for(const [id,label] of Object.entries(headings)){
   const btn=button(label,ribbon,()=>selectPreset(id),'quiet');
   btn.dataset.presetId=id;
  }
  ribbon.scrollLeft=ribbonScroll;
  syncPresetRibbon();
  if(layout==='text'){
   el('p',mode==='base'?'Текст внешности редактируется в поле выше.':'Выбранные особенности этого участка:',content,'ness-note');
   if(mode!=='base'){
    textDraft=el('textarea',undefined,content,'ness-input ness-tagboard-textarea');
    textDraft.value=items().map(t=>t.text).join(', ');
    textDraft.setAttribute('aria-label','Текст тегов режима');
    button('Применить к тегам',content,()=>flushModeText(),'quiet').title='Применить текст к тегам режима';
   }
   restore();return;
  }
  const columns=el('div',undefined,content,'ness-tagboard-columns');
  const left=el('section',undefined,columns,'ness-tagboard-left');
  const right=el('section',undefined,columns,'ness-tagboard-right');
  const header=el('div',undefined,left,'ness-tagboard-pane-head');
  const heading=el('div',undefined,header);
  el('span','БИБЛИОТЕКА ТЕГОВ',heading,'ness-tagboard-overline');
  el('strong','Все теги · '+items().length,heading);
  el('p',toolMode==='delete'?'🗑 Нажимай на теги для удаления. Можно отменить ↶.':toolMode==='move'?'✥ Выбери тег, стрелки появятся сверху. Удерживай для выбора раздела.':toolMode==='edit'?'✎ Меняй названия в компактных полях.':'Нажми на тег, чтобы добавить или убрать.',heading,'ness-note');
  const renameMode=toolMode==='edit';
  const search=el('input',undefined,left,'ness-input ness-tagboard-search');
  search.type='search';search.placeholder='Найти тег...';search.value=filter;
  const scene=el('div',undefined,left,'ness-unified-highlight-list');
  const tagFlow=el('div',undefined,scene,'ness-unified-tagflow');
  search.oninput=()=>{
   filter=search.value;
   for(const row of tagFlow.querySelectorAll('.ness-unified-tag-row')){
    const tag=items().find(t=>t.id===row.dataset.tagId);
    row.hidden=!!filter&&!norm(tag?.text).includes(norm(filter));
   }
  };
  let flow=el('div',undefined,tagFlow,'ness-unified-section-tags ness-unified-ungrouped');
  if(!sectionsForMode().length)addCompactPlus(flow,()=>0);
  const sequence=orderedSequence();
  const chosen=items().filter(tag=>isChosen(tag,preset));
  const inherited=mode==='nsfw'||preset==='always'?[]:items().filter(tag=>isChosen(tag,'always')&&!isChosen(tag,preset));
  const drawTag=tag=>{
   const row=el('div',undefined,flow,'ness-unified-tag-row');
   row.dataset.tagId=tag.id;row.hidden=!!filter&&!norm(tag.text).includes(norm(filter));
   const marked=isChosen(tag,preset),shared=preset!=='always'&&mode!=='nsfw'&&!marked&&isChosen(tag,'always');
   if(renameMode){
    const field=el('input',undefined,row,'ness-input ness-tagboard-rename-input');
    field.value=tag.text;field.setAttribute('aria-label','Изменить '+tag.text);
    field.style.width=Math.max(3,Math.min(30,tag.text.length+1))+'ch';
    field.oninput=()=>{field.style.width=Math.max(3,Math.min(30,field.value.length+1))+'ch';};
    field.onchange=()=>renameTag(tag,field.value);
    field.onblur=()=>{if(field.value!==tag.text)renameTag(tag,field.value);};
    field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();field.blur?.();}};
   }else{
    const chip=button((marked?'✓ ':shared?'✦ ':'＋ ')+tag.text,row,()=>{
     if(toolMode==='delete'){removeTag(tag,false);return;}
     if(toolMode==='move'){
      if(chip.dataset.ignoreClick==='true'){chip.dataset.ignoreClick='false';return;}
      focusTagId=focusTagId===tag.id?'':tag.id;render();return;
     }
     if(shared){warn('Этот тег берётся из «Всегда». Измени его там.');return;}
     toggle(tag,!isChosen(tag,preset));
    },'quiet ness-unified-chip');
    chip.setAttribute('aria-pressed',String(marked||shared));
    chip.setAttribute('data-highlighted',String(marked));
    chip.setAttribute('data-inherited',String(shared));
    chip.title=toolMode==='delete'?'Удалить тег (можно отменить ↶)':toolMode==='move'?'Выбрать для перемещения · удерживать для выбора раздела':'Добавить или снять тег в выбранном ракурсе';
    if(toolMode==='move')chip.onpointerdown=e=>gripPointerDown(e,tag,row,chip);
   }
   row.dataset.moveSelected=String(toolMode==='move'&&focusTagId===tag.id);
   if(toolMode==='move')row.oncontextmenu=e=>{
    if(e.target?.closest?.('input'))return;
    e.preventDefault();focusTagId=tag.id;showTransfer(tag,row);
   };
  };
  for(let i=0;i<sequence.length;i++){
   const token=sequence[i];
   if(token.kind==='tag'){drawTag(token.tag);continue;}
   const section=el('section',undefined,tagFlow,'ness-unified-section');
   section.dataset.dividerId=token.id;
   const bar=el('div',undefined,section,'ness-unified-section-head');
   let end=i+1;while(end<sequence.length&&sequence[end].kind!=='divider')end++;
   const count=sequence.slice(i+1,end).filter(t=>t.kind==='tag').length;
   const key=mode+':'+token.id,folded=collapsed.has(key);
   const suffix=count%100>=11&&count%100<=14?'тегов':count%10===1?'тег':count%10>=2&&count%10<=4?'тега':'тегов';
   let held=false,holdTimer=null,startX=0,startY=0;
   const title=button((folded?'▸ ':'▾ ')+token.section.title+' · '+count+' '+suffix,bar,()=>{
    if(held){held=false;return;}
    if(collapsed.has(key))collapsed.delete(key);else collapsed.add(key);render();
   },'quiet ness-unified-section-toggle');
   title.setAttribute('aria-expanded',String(!folded));
   addCompactPlus(bar,()=>{
    const tokens=orderedSequence(),start=tokens.findIndex(t=>t.kind==='divider'&&t.id===token.id);
    const next=tokens.findIndex((t,i)=>i>start&&t.kind==='divider');
    return tokens.slice(0,next<0?tokens.length:next).filter(t=>t.kind==='tag').length;
   },token.id);
   const actions=el('div',undefined,bar,'ness-section-actions');
   const editSection=button('✎',actions,()=>{
    if(readOnly())return;
    const previous=bar.querySelector('.ness-tagboard-section-input');
    if(previous){previous.focus();return;}
    const field=el('input',undefined,bar,'ness-input ness-tagboard-section-input');
    field.value=token.section.title;field.setAttribute('aria-label','Название раздела');
    const commit=()=>{if(field.dataset.cancelled==='true')return;const text=field.value.trim();if(text&&text!==token.section.title)renameGroup(token.id,text);else field.remove();};
    field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();field.dataset.cancelled='true';field.remove();}};
    field.onblur=commit;field.focus();field.select();
   },'quiet ness-section-action');
   editSection.title='Переименовать раздел';editSection.setAttribute('aria-label','Переименовать раздел '+token.section.title);
   const removeSection=button('🗑',actions,()=>deleteGroup(token.id),'quiet ness-section-action');
   removeSection.title='Удалить только разделитель';removeSection.setAttribute('aria-label','Удалить разделитель '+token.section.title+', оставить теги');
   const cancelHold=()=>{if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null;}};
   bar.onpointerdown=e=>{
    if(e.pointerType==='mouse'||e.target.closest('.ness-section-actions,.ness-tagboard-section-input'))return;
    held=false;startX=e.clientX;startY=e.clientY;cancelHold();
    holdTimer=setTimeout(()=>{holdTimer=null;held=true;bar.dataset.actionsOpen='true';},520);
   };
   bar.onpointermove=e=>{if(holdTimer!==null&&Math.hypot(e.clientX-startX,e.clientY-startY)>10)cancelHold();};
   bar.onpointerup=cancelHold;bar.onpointercancel=cancelHold;
   bar.oncontextmenu=e=>{if(e.pointerType==='mouse')return;e.preventDefault();cancelHold();held=true;bar.dataset.actionsOpen='true';};
   flow=el('div',undefined,section,'ness-unified-section-tags');flow.hidden=folded;
  }
  if(!sectionsForMode().length)addCompactPlus(flow,()=>items().length);
  if(!items().length)el('p','Пока нет тегов — нажми +, чтобы добавить.',tagFlow,'ness-note');
  const addSection=el('div',undefined,left,'ness-tagboard-section-add');
  const groupToggle=button('＋ Новый раздел',addSection,()=>{
   groupInput.hidden=!groupInput.hidden;createGroup.hidden=groupInput.hidden;
   if(!groupInput.hidden)groupInput.focus?.();
  },'quiet');
  const sectionHelp=button('?',addSection,()=>openExplanation('Добавление тегов','Маленький ＋ рядом с заголовком добавляет тег внутрь этого раздела. В списке без разделов два плюса стоят в начале и в конце. «＋ Новый раздел» создаёт ещё одну группу. Нажми Enter, чтобы сохранить новый тег.'),'quiet ness-tagboard-help');
  sectionHelp.title='Как добавлять теги и разделы';sectionHelp.setAttribute('aria-label','Помощь по добавлению тегов');
  const groupInput=el('input',undefined,addSection,'ness-input');groupInput.placeholder='Название нового раздела';
  groupInput.setAttribute('data-group-name','');groupInput.hidden=true;
  groupInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addGroup();}};
  const createGroup=button('Создать',addSection,addGroup,'quiet');createGroup.hidden=true;
  const chosenHeader=el('div',undefined,right,'ness-tagboard-pane-head');
  const chosenHeading=el('div',undefined,chosenHeader);
  el('span','ТЕКУЩИЙ РАКУРС / УЧАСТОК',chosenHeading,'ness-tagboard-overline');
  el('strong','',chosenHeading);
  el('p',headings[preset]||preset,chosenHeading,'ness-note');
  el('span','✓',chosenHeader,'ness-tagboard-check');
  el('div',undefined,right,'ness-tagboard-chosen-list');
  refreshSelection();
  el('p',preset==='always'?'Эти теги появляются во всех ракурсах данного режима.':'Слева — добавить или убрать. Справа — убрать через ×.',right,'ness-tagboard-right-hint');
  tagFlow.scrollTop=tagScroll;right.querySelector('.ness-tagboard-chosen-list').scrollTop=chosenScroll;
  const details=el('details',undefined,content,'ness-tagboard-preview');
  el('summary','Предпросмотр строки',details);el('p',preview(),details,'ness-tagboard-preview-text');
  restore();
  if(followMovedTag&&toolMode==='move'&&focusTagId){
   const active=[...content.querySelectorAll('.ness-unified-tag-row')].find(row=>row.dataset.tagId===focusTagId);
   active?.scrollIntoView?.({block:'nearest',inline:'nearest'});
   followMovedTag=false;
  }
 }

 frame.tabIndex=-1;
 frame.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||readOnly())return;
  if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
  const key=e.key.toLowerCase();
  if(key==='z'&&!e.shiftKey&&undo.length){e.preventDefault();undoAction();}
  else if((key==='y'||key==='z'&&e.shiftKey)&&redo.length){e.preventDefault();redoAction();}
 });
 render();
 return {element:frame,historyHost:toolHistory,getHintPinned:()=>helpPinned,isHintPeek:()=>helpPeek,setHintPinned,toggleHintPeek,getToolMode:()=>toolMode,syncTools:updateToolBar,undo:undoAction,redo:redoAction,canUndo:()=>undo.length>0,canRedo:()=>redo.length>0,getSkin:()=>normalizeSkinTags(skin),getSections:()=>normalizeAppearanceSections(modeCatalog.modes.base.sections,readBaseState().base),getCatalog,refresh:()=>{modeCatalog=normalizeAppearanceModeCatalog(getCatalog(),readBaseState().base,skin,readNsfwState(),initialSections);render();},getMode:()=>mode,setModeLayout(value){if(!flushModeText())return false;layouts[mode]=value==='prose'?'text':'board';layout=layouts[mode];render();return true;},setAvailableFormat(value){appearanceFormat=value==='prose'?'prose':'tags';layouts.base=appearanceFormat==='prose'?'text':'board';if(mode==='base')layout=layouts.base;render();}};
}
/** One additional marker in the existing director call; no extra model requests. */
export function skinAppearanceInstruction(records){
 const entries=[...records].filter(([,v])=>hasSkinSelections(v.skinTags));
 if(!entries.length){
  return records.size?'\n\nVISIBLE SKIN MARKERS: No library character has configured exposed-skin tags. Do NOT write [[NESS_SKIN:...]] markers.':'';
 }
 const names=entries.map(([id,v])=>id+': '+Object.keys(SKIN_PRESETS).filter(k=>(v.skinTags?.selections?.[k]||[]).length||(v.skinTags?.selections?.always||[]).length).join(', ')).join('\n');
 return '\n\nVISIBLE SKIN AND MARKS — ONE OPTIONAL MARKER PER CHARACTER\n'
  +'In each character entry whose ID is listed below, immediately after its [[NESS_VIS:id:preset]] marker and BEFORE any clothing, append [[NESS_SKIN:id:part1,part2]] for ONLY the uncovered skin areas actually visible in at least one chosen panel. You may choose multiple parts independently of the main appearance camera preset. '
  +'Allowed skin parts: '+Object.keys(SKIN_PRESETS).join(', ')+'. The lower_front and lower_back parts are DISTINCT; do not include lower_front when only the rear is visible, nor vice versa. Upper-front/back are distinct as well. '
  +'If no configured exposed skin part is visible, use [[NESS_SKIN:id:none]]. Include the marker only once for each listed participant, keep literal [[NESS_SKIN:...]] syntax; never invent anatomy or reveal skin covered by clothing. '
  +'NEVER emit [[NESS_SKIN:...]] for an ID not listed below, even if bare skin is visible. '
  +'Skin tags are inserted by the library after the base appearance and before clothing, not written by you. This is an extension-control marker, not an unresolved placeholder: it overrides any general placeholder prohibition. All body marks are now in the region-specific skin catalogue; do not duplicate them as unscoped appearance.\n'
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
