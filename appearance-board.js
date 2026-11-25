/**
 * Shared appearance catalogue with three assignment modes. Display-only headings never enter the image prompt.
 * Existing base strings and appearanceSelections offsets remain authoritative.
 */
import { NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS } from './shared-data.js';
import { openExplanation } from './onboarding.js';
import { findTagConflicts, MODE_LABELS, duplicateWarningsEnabled, setDuplicateWarnings } from './appearance-overlap.js';
import { createAppearanceFigure } from './appearance-figure.js';
import { normalizeAppearanceRanges, normalizeAppearanceSelections, visibleAppearanceRanges, hasConfiguredAppearanceViews } from './appearance-visibility.js';
import { normalizeAppearanceModeCatalog, NSFW_AREAS, repositionModeTag, modeTokens, fromModeTokens } from './appearance-mode-state.js';

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
const norm=s=>String(s||'').normalize('NFKC').replace(/[\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
const validLabel=s=>String(s||'').trim().slice(0,50);
const keyOK=id=>id===SKIN_ALWAYS||Object.hasOwn(SKIN_PRESETS,id);
export function normalizeSkinTags(raw){
 const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const items=[],ids=new Set(),byText=new Map(),remap=new Map(),prefix=[0];
 for(const tag of Array.isArray(data.tags)?data.tags:[]){
  const rawText=typeof tag?.text==='string'?tag.text.trim().replace(/[,;\s]+$/,'').trim():'';
  const id=String(tag?.id||'');
  if(rawText&&/^[a-z][a-z0-9_]{0,48}$/.test(id)&&!ids.has(id)){
   ids.add(id);
   const text=rawText.slice(0,1200),identity=norm(text),prior=byText.get(identity);
   if(prior)remap.set(id,prior);
   else if(items.length<600){
    byText.set(identity,id);remap.set(id,id);
    items.push({id,text,section:String(tag.section||'')});
   }
  }
  prefix.push(items.length);
 }
 const sectionIdsSeen=new Set();
 const sections=(Array.isArray(data.sections)?data.sections:[]).filter(x=>{
  if(!x||typeof x.id!=='string'||!/^[a-z][a-z0-9_]{0,48}$/.test(x.id)||!validLabel(x.title)||sectionIdsSeen.has(x.id))return false;
  sectionIdsSeen.add(x.id);return true;
 }).slice(0,60)
 .map(x=>({id:x.id,title:validLabel(x.title),before:Number.isInteger(x.before)?prefix[Math.max(0,Math.min(prefix.length-1,x.before))]:Math.max(0,items.findIndex(t=>t.section===x.id))}));
 const sectionIds=new Set(sections.map(x=>x.id));
 for(const item of items)if(!sectionIds.has(item.section))item.section='';
 const all=new Set(items.map(x=>x.id)),selections={};
 for(const [id,arr] of Object.entries(data.selections||{})){
  if(!keyOK(id)||!Array.isArray(arr))continue;
  selections[id]=[...new Set(arr.map(x=>remap.get(x)).filter(x=>all.has(x)))];
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
 // A modern mode catalogue owns its tags. Never rebuild the retired shared
 // pool from base+skin+NSFW whenever the editor reads or saves a record.
 if(data.modes&&typeof data.modes==='object'){
  return {tags:Array.isArray(data.tags)?copy(data.tags):[],
   sections:Array.isArray(data.sections)?copy(data.sections):[],
   modes:normalizeAppearanceModeCatalog(data,base,skin,nsfw,legacySections).modes};
 }
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
 const filterByMode={base:'',skin:'',nsfw:''};
 const layouts={base:'board',skin:'board',nsfw:'board'};
 let textDraft=null,renderedMode='',renderedPreset='',tagSearchOpen=false,unassignedOnly=false;
 let boardView=null;
 const mobile=()=>Boolean(globalThis.matchMedia?.('(max-width:767px), (pointer:coarse)')?.matches);
 // Scrolling is UI state, not character data. Keep each mode's ribbon and
 // catalogue position across editor rebuilds, with per-preset chosen offsets.
 const viewportByMode={base:{ribbon:0,tags:0},skin:{ribbon:0,tags:0},nsfw:{ribbon:0,tags:0}};
 const chosenScrollByPreset=new Map();
 let followMovedTag=false,helpPinned=Boolean(initialHelpPinned),helpPeek=false;
 const frame=el('section',undefined,parent,'ness-tagboard');
 frame.setAttribute('aria-label','Редактор тегов внешности');
 const header=el('div',undefined,frame,'ness-tagboard-header');
 el('strong','Внешность',header);
 const controls=el('div',undefined,frame,'ness-tagboard-controls');
 frame.insertBefore(controls,header);
 const tools=el('div',undefined,controls,'ness-tagboard-tools');
 const modes=el('div',undefined,controls,'ness-tagboard-modes');
 tools.setAttribute('role','toolbar');tools.setAttribute('aria-label','Инструменты тегов внешности');
 const toolModes=el('div',undefined,tools,'ness-tagboard-tool-modes');
 const toolButtons={};
 for(const [id,icon,label] of [['edit','✎','Переименовывать теги'],['delete','🗑','Удалять теги'],['move','✥','Менять порядок тегов'],['transfer','⇄','Перенести тег в раздел или режим']]){
  const control=button(icon,toolModes,()=>{
   if(readOnly())return;
   const previous=toolMode;toolMode=toolMode===id?'':id;
   focusTagId='';closeTransfer();if(layout==='board'&&previous!=='edit'&&toolMode!=='edit')syncToolMode();else render();
  },'quiet ness-tagboard-tool');
  control.title=label;control.setAttribute('aria-label',label);
  toolButtons[id]=control;
 }
 const toolInfo=button('?',toolModes,()=>openExplanation('Режимы тегов','✎ переименовывает теги. 🗑 удаляет тег нажатием; ↶ вернёт удалённый тег. ✥ — выбери тег и меняй порядок стрелками ← → ↑ ↓. ⇄ — нажми тег и выбери режим, затем раздел, если он есть. Активен только один инструмент. Верхняя панель закреплена при прокрутке.'),'quiet ness-tagboard-help');
 toolInfo.title='Как работают режимы тегов';toolInfo.setAttribute('aria-label','Помощь по режимам тегов');
 const toolHistory=el('div',undefined,tools,'ness-tagboard-tool-history');
 const toolMove=el('div',undefined,toolModes,'ness-tagboard-tool-movement');
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
 function updateToolBar(){
  for(const [id,b] of Object.entries(toolButtons)){
   b.setAttribute('aria-pressed',String(id===toolMode));b.disabled=readOnly();
  }
  const tag=items().find(t=>t.id===focusTagId);
  toolMove.hidden=toolMode!=='move'||layout==='text'||!tag;
  moveName.textContent=tag?'✥ '+tag.text:'';
 }
 const warningStorage=()=>{try{return globalThis.localStorage;}catch{return undefined;}};
 let warningEnabled=duplicateWarningsEnabled(warningStorage());
 const warningSetting=el('label',undefined,header,'ness-tag-warning-setting');
 const warningCheckbox=el('input',undefined,warningSetting);warningCheckbox.type='checkbox';warningCheckbox.checked=warningEnabled;
 el('span','Предупреждать о повторах',warningSetting);
 const setWarningEnabled=value=>{warningEnabled=Boolean(value);warningCheckbox.checked=warningEnabled;setDuplicateWarnings(warningStorage(),warningEnabled);};
 warningCheckbox.onchange=()=>setWarningEnabled(warningCheckbox.checked);
 const notice=el('p',undefined,frame,'ness-note');notice.hidden=true;notice.setAttribute('aria-live','polite');
 const warn=value=>{notice.textContent=value;notice.hidden=!value;};
 const basic=button('Ракурсы',modes,()=>{if(!flushModeText())return;filterByMode[mode]=filter;mode='base';layout=layouts.base;filter=filterByMode[mode];preset='face';checked.clear();closeTransfer();render();},'quiet');
 const marks=button('Под одеждой',modes,()=>{if(!flushModeText())return;filterByMode[mode]=filter;mode='skin';layout=layouts.skin;filter=filterByMode[mode];preset='upper_front';checked.clear();closeTransfer();render();},'quiet');
 const nsfw=button('NSFW',modes,()=>{if(!flushModeText())return;filterByMode[mode]=filter;mode='nsfw';layout=layouts.nsfw;filter=filterByMode[mode];preset='nsfwChest';checked.clear();closeTransfer();render();},'quiet');
 const helpLayout=el('div',undefined,frame,'ness-appearance-main');
 const content=el('div',undefined,helpLayout,'ness-tagboard-body');
 const figure=createAppearanceFigure(ui,helpLayout,()=>setHintPinned(false));
 function activeRibbon(){return controls.querySelector('.ness-tagboard-ribbon');}
 function scrollPositions(){
  const nodes=[frame.closest?.('#sp-imagen-review-panel'),frame.closest?.('.ness-library-editorpane'),frame.closest?.('.ness-tab-viewport'),frame.closest?.('.ness-tab-content'),activeRibbon(),content.querySelector('.ness-unified-tagflow'),content.querySelector('.ness-tagboard-chosen-list')].filter(Boolean);
  const positions=nodes.map(node=>[node,node.scrollTop||0,node.scrollLeft||0]);
  return ()=>{for(const [node,top,left] of positions){node.scrollTop=top;node.scrollLeft=left;}};
 }
 function refreshHelp(){
  const restore=scrollPositions();
  const open=helpPinned||helpPeek;
  figure.element.hidden=!open;
  helpLayout.setAttribute('data-help-open',String(open));
  helpLayout.setAttribute('data-help-state',helpPinned?'pinned':helpPeek?'peek':'closed');
  if(open)figure.update(mode,preset,availablePresets()[preset]||preset);
  onHelpChange(helpPinned,helpPeek);
  restore();
 }
 function setHintPinned(value){
  helpPinned=Boolean(value);
  helpPeek=false;
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
  if(s.editor){filterByMode[mode]=filter;mode=s.editor.mode;filter=filterByMode[mode];preset=s.editor.preset;focusTagId=s.editor.focusTagId||'';layout=layouts[mode]||'board';}
  followMovedTag=!!focusTagId;
  changed();render();historyState();
 }
 function syncToolMode(){
  updateToolBar();
  const hint=content.querySelector('.ness-tagboard-left')?.querySelector('.ness-tagboard-pane-head')?.querySelector('.ness-note');
  if(hint)hint.textContent=toolHint();
  const byId=new Map(items().map(tag=>[tag.id,tag]));
  for(const row of content.querySelectorAll('.ness-unified-tag-row')){
   const chip=row.querySelector('.ness-unified-chip'),tag=byId.get(row.dataset.tagId);if(!chip||!tag)continue;
   row.dataset.moveSelected=String(['move','transfer'].includes(toolMode)&&focusTagId===tag.id);
   chip.title=toolMode==='delete'?'Удалить тег (можно отменить ↶)':toolMode==='move'?'Выбрать для изменения порядка':toolMode==='transfer'?'Перенести в раздел или режим':'Добавить или снять тег в выбранном ракурсе';
   chip.onpointerdown=toolMode==='move'?e=>gripPointerDown(e,tag,row,chip):null;
  }
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
 function assignedTags(){
  const result=[],state=baseState(),baseTags=parseBaseTags(state.base);
  for(const id of [NESS_APPEARANCE_ALWAYS,...Object.keys(NESS_APPEARANCE_PRESETS)]){
   const ranges=visibleAppearanceRanges(state.ranges,id,state.selections,false);
   for(const tag of baseTags)if(ranges.some(r=>r.start<tag.end&&tag.start<r.end))result.push({mode:'base',preset:id,text:tag.text,label:id==='always'?'Всегда':NESS_APPEARANCE_PRESETS[id].label});
  }
  for(const id of [SKIN_ALWAYS,...Object.keys(SKIN_PRESETS)]){
   const chosen=new Set(skin.selections[id]||[]);
   for(const tag of skin.tags)if(chosen.has(tag.id))result.push({mode:'skin',preset:id,text:tag.text,label:id==='always'?'Всегда':SKIN_PRESETS[id]});
  }
  const nsfw=readNsfwState();
  for(const [id,label] of Object.entries(NSFW_PRESETS))for(const tag of parseBaseTags(nsfw[id]||''))result.push({mode:'nsfw',preset:id,text:tag.text,label});
  return result;
 }
 function confirmAssignment(text,proceed){
  if(!warningEnabled){proceed();return true;}
  const matches=findTagConflicts(text,{mode,preset},assignedTags());
  if(!matches.length){proceed();return true;}
  const targetMode=mode,targetPreset=preset;
  const dialog=el('dialog',undefined,frame,'ness-tag-duplicate-dialog');
  dialog.setAttribute('aria-label','Возможное повторение тега');
  el('strong','Возможное повторение тега',dialog);
  el('p',text,dialog,'ness-tag-duplicate-name');
  el('p','Похожие теги уже назначены:',dialog,'ness-note');
  const list=el('div',undefined,dialog,'ness-tag-duplicate-list');
  for(const item of matches){
   const row=el('div',undefined,list,'ness-tag-duplicate-match');
   el('strong',item.text,row);el('small',MODE_LABELS[item.mode]+' → '+item.label,row);
  }
  el('p','Всё равно добавить в выбранный ракурс?',dialog);
  const label=el('label',undefined,dialog,'ness-tag-warning-setting');
  const skip=el('input',undefined,label);skip.type='checkbox';
  el('span','Больше не показывать предупреждения',label);
  const actions=el('div',undefined,dialog,'ness-tag-duplicate-actions');
  const close=()=>{if(dialog.open)dialog.close?.();dialog.remove();};
  button('Отмена',actions,close,'quiet');
  button('Добавить',actions,()=>{if(readOnly()||mode!==targetMode||preset!==targetPreset){close();return;}if(skip.checked)setWarningEnabled(false);close();proceed();},'primary');
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  return false;
 }
 // Derive visibility once for a batch of tags. Parsing the entire base text for
 // every row was the dominant lag on large imported catalogues.
 function selectedKeys(id){
  if(mode==='base'){
   const state=baseState(),ranges=visibleAppearanceRanges(state.ranges,id,state.selections,false),keys=new Set();
   for(const tag of parseBaseTags(state.base))
    if(ranges.some(r=>r.start<tag.end&&tag.start<r.end))keys.add(norm(tag.text));
   return keys;
  }
  if(mode==='skin'){
   const chosen=new Set(skin.selections[id]||[]),seen=new Set(),keys=new Set();
   for(const tag of skin.tags){
    const identity=norm(tag.text);
    if(seen.has(identity))continue;
    seen.add(identity);
    if(chosen.has(tag.id))keys.add(identity);
   }
   return keys;
  }
  return new Set(parseBaseTags(readNsfwState()?.[id]||'').map(tag=>norm(tag.text)));
 }
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
  const offset=ribbon.scrollLeft||0;
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
  ribbon.scrollLeft=offset;
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
  if(ribbon&&(!mobile()||ribbon.clientWidth>0))state.ribbon=ribbon.scrollLeft;
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

 function toggle(tag,assign){if(assign)confirmAssignment(tag.text,()=>changeMany([tag],true));else changeMany([tag],false);}
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
  const all=items(),sectionsAt=new Map(),sequence=[];
  for(const divider of sectionsForMode()){
   if(!sectionsAt.has(divider.before))sectionsAt.set(divider.before,[]);
   sectionsAt.get(divider.before).push(divider);
  }
  for(let i=0;i<=all.length;i++){
   for(const divider of sectionsAt.get(i)||[])sequence.push({kind:'divider',id:divider.id,section:divider});
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
  followMovedTag=['move','transfer'].includes(toolMode)&&!!focusTagId;
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
  if(readOnly()||target===mode||!modeCatalog.modes[target])return false;
  const dest=modeCatalog.modes[target],exists=dest.tags.some(t=>norm(t.text)===norm(tag.text));
  if(exists){warn('Этот тег уже есть в выбранном режиме. Дубликат не создан.');return false;}
  if(dest.tags.length>=700){warn('В выбранном режиме достигнут лимит тегов.');return false;}
  const source=mode==='base'?baseTag(tag):null;
  if(remove&&mode==='base'&&source&&parseBaseTags(baseState().base).length<2){
   warn('Нельзя перенести последний тег постоянной внешности.');return false;
  }
  if(remove&&mode==='base'&&appearanceFormat==='prose'){warn('В текстовом режиме переноси теги через текстовое поле.');return false;}
  if(targetSectionId&&!dest.sections.some(s=>s.id===targetSectionId))return false;
  record();
  const movedId=remove&&!dest.tags.some(t=>t.id===tag.id)?tag.id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const moved={id:movedId,text:tag.text};
  const tokens=modeTokens(dest);
  const index=targetSectionId?tokens.findIndex(x=>x.kind==='divider'&&x.id===targetSectionId)+1:dest.sections.length?0:tokens.length;
  tokens.splice(index,0,{kind:'tag',...moved});
  Object.assign(dest,fromModeTokens(tokens));
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
  closeTransfer();focusTagId=movedId;filterByMode[mode]=filter;mode=target;filter=filterByMode[mode];layout=layouts[mode];preset=target==='base'?'face':target==='skin'?'upper_front':'nsfwChest';checked.clear();toolMode='transfer';
  if(targetSectionId)collapsed.delete(target+':'+targetSectionId);
  followMovedTag=true;
   warn((remove?'Перенесено':'Скопировано')+' в «'+(target==='base'?'Ракурсы':target==='skin'?'Под одеждой':'NSFW')+'». Назначь тег нужной области.');after();return true;
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
  inputNode.value='';inputNode.hidden=true;inputNode.parentElement?.querySelectorAll('button').forEach(node=>{if(node.textContent==='Создать')node.hidden=true;});
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
 function addTag(value,insertAt=items().length,sectionId=null,confirmed=false,onAdded=()=>{}){
  const text=String(value||'').trim().replace(/[;,\s]+$/,'').trim();
  if(readOnly())return false;
  if(!norm(text)){warn('Введи название тега.');return false;}
  if(/[,\r\n]/.test(text)){warn('Добавляй по одному тегу.');return false;}
  const existing=items().find(x=>norm(x.text)===norm(text));
  if(existing){warn('Такой тег уже есть в этом режиме.');return false;}
  if(!confirmed){let added=false;confirmAssignment(text,()=>{added=addTag(text,insertAt,sectionId,true,onAdded);if(added)onAdded();});return added;}
  const tokens=modeTokens(modeCatalog.modes[mode]);
  let position;
  if(sectionId!==null){
   const start=tokens.findIndex(t=>t.kind==='divider'&&t.id===sectionId);
   if(start<0){warn('Раздел не найден.');return false;}
   position=tokens.findIndex((t,i)=>i>start&&t.kind==='divider');
   if(position<0)position=tokens.length;
  }else{
   const index=Math.max(0,Math.min(items().length,insertAt));
   position=index===items().length?tokens.length:tokens.findIndex(t=>t.kind==='tag'&&t.id===items()[index].id);
  }
  warn('');record();
  const id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const tag={id,text};
  tokens.splice(position,0,{kind:'tag',...tag});
  Object.assign(modeCatalog.modes[mode],fromModeTokens(tokens));
  if(sectionId!==null)collapsed.delete(mode+':'+sectionId);
  if(filter&&!norm(text).includes(norm(filter)))filter='';
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
   if(field){field.focus?.({preventScroll:true});return;}
   field=el('input',undefined,slot,'ness-input ness-tagboard-inline-add-input');
   field.type='text';field.placeholder='Новый тег';field.setAttribute('aria-label','Добавить тег в раздел');
   field.setAttribute('enterkeyhint','done');
   let committed=false;
   const closeInput=()=>{field.remove();apply.remove();plus.hidden=false;};
   const commit=()=>{
    if(committed)return;
    const completed=()=>{if(!committed){committed=true;closeInput();}};
    if(!addTag(field.value,indexFor(),sectionId,false,completed)&&!committed)field.focus?.({preventScroll:true});
   };
   const apply=button('✓',slot,commit,'quiet ness-tagboard-add-confirm');
   apply.title='Добавить тег';apply.setAttribute('aria-label','Подтвердить добавление тега');
   field.onkeydown=e=>{
    if(e.isComposing||e.keyCode===229)return;
    if(e.key==='Escape'){e.preventDefault?.();e.stopPropagation?.();closeInput();plus.focus?.({preventScroll:true});return;}
    if(e.key==='Enter'){e.preventDefault?.();e.stopPropagation?.();commit();}
   };
   field.onblur=e=>{if(!field.value.trim()&&e?.relatedTarget!==apply)closeInput();};
   plus.hidden=true;field.focus?.({preventScroll:true});
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
  tag.text=text;changed();
  const row=[...content.querySelectorAll('.ness-unified-tag-row')].find(node=>node.dataset.tagId===tag.id),field=row?.querySelector('.ness-tagboard-rename-input');
  if(field){field.value=text;field.style.width=Math.max(3,Math.min(30,text.length+1))+'ch';field.setAttribute('aria-label','Изменить '+text);}
  refreshSelection();
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
 const popup=el('dialog',undefined,frame,'ness-tagboard-context-menu');popup.hidden=true;
 popup.setAttribute('aria-label','Перенести тег');
 let drag=null,transferTarget=null;
 function closeTransfer(){
  transferTagId='';transferTarget=null;
  if(popup.open&&typeof popup.close==='function')popup.close();
  else popup.removeAttribute?.('open');
  popup.hidden=true;clear(popup);
 }
 popup.addEventListener('cancel',e=>{e.preventDefault();closeTransfer();});
 function showTransfer(tag){
  if(readOnly()||toolMode!=='transfer')return;
  transferTagId=tag.id;transferTarget=null;focusTagId=tag.id;updateToolBar();
  drawTransfer();
  popup.hidden=false;
  if(typeof popup.showModal==='function'&&!popup.open)popup.showModal();
  else popup.setAttribute('open','');
 }
 function drawTransfer(){
  const tag=items().find(t=>t.id===transferTagId);
  if(!tag||readOnly()){closeTransfer();return;}
  clear(popup);
  const head=el('div',undefined,popup,'ness-transfer-head');
  el('strong',transferTarget?'Выбери раздел':'Перенести тег',head);
  button('×',head,closeTransfer,'quiet').setAttribute('aria-label','Закрыть меню');
  el('p',tag.text,popup,'ness-note ness-transfer-active-tag');
  const names={base:'Ракурсы',skin:'Под одеждой',nsfw:'NSFW'};
  el('p',transferTarget===mode?'Назначения ракурсов сохранятся.':'При переносе в другой режим прежние назначения тега снимаются. Их можно вернуть через ↶.',popup,'ness-note ness-transfer-explanation');
  const targets=el('div',undefined,popup,'ness-transfer-targets');
  const group=el('div',undefined,targets,'ness-transfer-section-buttons');
  const error=el('p','',popup,'ness-note ness-transfer-error');error.hidden=true;error.setAttribute('aria-live','polite');
  const finish=(target,sectionId=null)=>{
   if(readOnly())return;
   if(target===mode){moveTagToSection(tag,sectionId);return;}
   if(!transferTag(tag,target,true,sectionId)){error.textContent=notice.textContent;error.hidden=false;}
  };
  if(!transferTarget){
   for(const target of ['base','skin','nsfw']){
    const choose=button(names[target]+(target===mode?' · текущий':''),group,()=>{
     if(modeCatalog.modes[target].sections.length){transferTarget=target;drawTransfer();}
     else if(target===mode)closeTransfer();
     else finish(target);
    },'quiet');
    if(target===mode&&!sectionsForMode().length)choose.disabled=true;
   }
  }else{
   el('p',names[transferTarget],targets,'ness-note ness-transfer-mode-title');
   button('Без раздела',group,()=>finish(transferTarget),'quiet');
   for(const section of modeCatalog.modes[transferTarget].sections)
    button(section.title,group,()=>finish(transferTarget,section.id),'quiet');
  }
  const actions=el('div',undefined,popup,'ness-transfer-actions');
  const back=button('← Назад',actions,()=>{transferTarget=null;drawTransfer();},'quiet');back.disabled=!transferTarget;
  button('Отмена',actions,closeTransfer,'quiet');
 }
 function gripPointerDown(e,tag,row,grip){
  if(readOnly()||e.button!==0||drag)return;
  const d={id:tag.id,pointer:e.pointerId,x:e.clientX,y:e.clientY,row,grip,moved:false,drop:null,ghost:null};
  drag=d;
  const clean=()=>{
   d.ghost?.remove?.();
   row.classList?.remove('ness-drag-source');
   for(const el of content.querySelectorAll('.ness-drag-before,.ness-drag-after,.ness-drag-group'))
    el.classList?.remove('ness-drag-before','ness-drag-after','ness-drag-group');
   drag=null;grip.onpointermove=null;grip.onpointerup=null;grip.onpointercancel=null;
  };
  try{grip.setPointerCapture?.(e.pointerId);}catch(_){}
  grip.onpointermove=event=>{
   if(drag!==d||event.pointerId!==d.pointer)return;
   if(!d.moved&&Math.hypot(event.clientX-d.x,event.clientY-d.y)>9){
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
   const target=d.drop,wasDrag=d.moved;clean();
   if(wasDrag&&target){
    moveSequenceToken({kind:'tag',id:tag.id},{kind:target.kind,id:target.id},target.after);
    warn('Тег перемещён. Назначения сохранены.');
   }
   if(wasDrag){
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
  const restore=scrollPositions();
  const byId=new Map(items().map(tag=>[tag.id,tag]));
  const selected=selectedKeys(preset),shared=preset!=='always'&&mode!=='nsfw'?selectedKeys('always'):null;
  const assignments=assignedTags(),byText=new Map();
  for(const item of assignments){const key=norm(item.text);if(!byText.has(key))byText.set(key,[]);byText.get(key).push(item);}
  for(const row of columns.querySelectorAll('.ness-unified-tag-row')){
   const tag=byId.get(row.dataset.tagId),chip=row.querySelector('.ness-unified-chip');
   if(!tag)continue;
   const identity=norm(tag.text),marked=selected.has(identity),locations=byText.get(identity)||[];
   row.hidden=(!!filter&&!identity.includes(norm(filter)))||(unassignedOnly&&locations.length>0);
   if(!chip)continue;
   const elsewhere=locations.filter(x=>x.mode!==mode||x.preset!==preset);
   chip.dataset.assignedElsewhere=String(elsewhere.length>0);
   if(!toolMode)chip.title=elsewhere.length?elsewhere.map(x=>MODE_LABELS[x.mode]+' → '+x.label).join('\n'):'Добавить или снять тег';
   const inherited=!!shared&&!marked&&shared.has(identity);
   const prefix=marked?'✓ ':inherited?'✦ ':elsewhere.length?'↗ ':'＋ ';
   if(chip.dataset.highlighted!==String(marked)||chip.dataset.inherited!==String(inherited)||chip.textContent!==prefix+tag.text){
    chip.textContent=prefix+tag.text;
    chip.setAttribute('aria-pressed',String(marked||inherited));
    chip.setAttribute('data-highlighted',String(marked));
    chip.setAttribute('data-inherited',String(inherited));
   }
  }
  const chosen=items().filter(tag=>selected.has(norm(tag.text)));
  const inherited=!shared?[]:items().filter(tag=>shared.has(norm(tag.text))&&!selected.has(norm(tag.text)));
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
     if(inheritedFlow)chip.textContent='✦ '+tag.text;else{const label=chip.querySelector('span');if(label&&label.textContent!==tag.text)label.textContent=tag.text;chip.setAttribute('aria-label','Убрать '+tag.text+' из этого ракурса');chip.onclick=()=>toggle(tag,false);}
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
  const hint=right?.querySelector('.ness-tagboard-right-hint');
  if(hint)hint.textContent=preset==='always'?'Эти теги появляются во всех ракурсах данного режима.':'Слева — добавить или убрать. Справа — убрать через ×.';
  const previewText=content.querySelector('.ness-tagboard-preview-text');
  if(previewText)previewText.textContent=preview();
  syncPresetRibbon();
  restore();
 }
 const toolHint=()=>toolMode==='delete'?'🗑 Нажимай на теги для удаления. Можно отменить ↶.':toolMode==='move'?'✥ Выбери тег, стрелки появятся рядом с инструментами.':toolMode==='transfer'?'⇄ Нажми на тег и выбери режим и раздел.':toolMode==='edit'?'✎ Меняй названия в компактных полях.':'Нажми на тег, чтобы добавить или убрать.';
 function render(){
  if(transferTagId)closeTransfer();
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
  const sameBoard=layout==='board'&&boardView?.mode===mode;
  if(!sameBoard){clear(content);textDraft=null;boardView=null;}
  const headings=availablePresets();let ribbon=activeRibbon();
  if(!ribbon||ribbon.dataset.mode!==mode){ribbon?.remove();ribbon=el('div',undefined,controls,'ness-tagboard-ribbon');ribbon.dataset.mode=mode;
   ui.wheelAlongX?.(ribbon);
   for(const [id,label] of Object.entries(headings)){const btn=button(label,ribbon,()=>selectPreset(id),'quiet');btn.dataset.presetId=id;}
  }
  refreshHelp();
  syncPresetRibbon();
  // Restore only after buttons and count badges exist: otherwise scrollWidth
  // is empty and the browser clamps the previous horizontal offset to zero.
  ribbon.scrollLeft=ribbonScroll;
  if(sameBoard){boardView.sync();restore();return;}
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
  el('p',toolHint(),heading,'ness-note');
  const unassigned=el('label',undefined,left,'ness-tag-warning-setting');
  const unassignedCheck=el('input',undefined,unassigned);unassignedCheck.type='checkbox';unassignedCheck.checked=unassignedOnly;
  el('span','Только неназначенные',unassigned);
  unassignedCheck.onchange=()=>{unassignedOnly=unassignedCheck.checked;refreshSelection();};
  const search=el('input',undefined,left,'ness-input ness-tagboard-search');
  search.type='search';search.placeholder='Найти тег...';search.value=filter;
  const searchToggle=button('⌕',header,undefined,'quiet ness-tag-search-toggle');searchToggle.title='Найти тег';searchToggle.setAttribute('aria-label','Найти тег');
  const setTagSearch=(open,focus=false)=>{tagSearchOpen=Boolean(open);search.dataset.open=String(tagSearchOpen);searchToggle.setAttribute('aria-expanded',String(tagSearchOpen));searchToggle.dataset.hasQuery=String(!!filter);if(open&&focus)search.focus?.({preventScroll:true});};
  searchToggle.onclick=()=>setTagSearch(!tagSearchOpen,true);setTagSearch(tagSearchOpen);
  search.onkeydown=e=>{if(e.key==='Escape'&&mobile()){e.preventDefault();e.stopPropagation();setTagSearch(false);searchToggle.focus?.({preventScroll:true});}};
  const scene=el('div',undefined,left,'ness-unified-highlight-list');
  const tagFlow=el('div',undefined,scene,'ness-unified-tagflow');
  search.oninput=()=>{
   filter=search.value;searchToggle.dataset.hasQuery=String(!!filter);
   refreshSelection();
  };
  const rootFlow=el('div',undefined,tagFlow,'ness-unified-section-tags ness-unified-ungrouped');
  const rowsById=new Map(),sectionsById=new Map();
  let topPlus=null,bottomPlus=null,emptyNote=null;
  function place(parent,node,index){if(parent.children[index]!==node)parent.insertBefore(node,parent.children[index]||null);}
  const drawTag=initial=>{
   let tag=initial;
   const row=el('div',undefined,undefined,'ness-unified-tag-row');
   row.dataset.tagId=tag.id;
   let field=null,chip=null;
   const marked=false,inherited=false;
   function syncControl(){
   if(toolMode==='edit'){
    if(field)return;
    chip?.remove();chip=null;
    field=el('input',undefined,row,'ness-input ness-tagboard-rename-input');
    field.value=tag.text;field.setAttribute('aria-label','Изменить '+tag.text);
    field.style.width=Math.max(3,Math.min(30,tag.text.length+1))+'ch';
    field.oninput=()=>{field.style.width=Math.max(3,Math.min(30,field.value.length+1))+'ch';};
    const input=field;
    const commitRename=()=>{if(input.value!==tag.text)renameTag(tag,input.value);if(input.value!==tag.text)input.value=tag.text;};
    field.onchange=commitRename;field.onblur=commitRename;
    field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();field.blur?.();}};
   }else{
    if(chip)return;
    if(field){const old=field;field=null;old.onblur=null;old.onchange=null;old.remove();}
    chip=button((marked?'✓ ':inherited?'✦ ':'＋ ')+tag.text,row,()=>{
     if(toolMode==='delete'){removeTag(tag,false);return;}
     if(toolMode==='transfer'){showTransfer(tag);return;}
     if(toolMode==='move'){
      if(chip.dataset.ignoreClick==='true'){chip.dataset.ignoreClick='false';return;}
      focusTagId=focusTagId===tag.id?'':tag.id;syncToolMode();return;
     }
     toggle(tag,!isChosen(tag,preset));
    },'quiet ness-unified-chip');
    chip.setAttribute('aria-pressed',String(marked||inherited));
    chip.setAttribute('data-highlighted',String(marked));
    chip.setAttribute('data-inherited',String(inherited));
    chip.title=toolMode==='delete'?'Удалить тег (можно отменить ↶)':toolMode==='move'?'Выбрать для изменения порядка':toolMode==='transfer'?'Перенести в раздел или режим':'Добавить или снять тег в выбранном ракурсе';
    if(toolMode==='move')chip.onpointerdown=e=>gripPointerDown(e,tag,row,chip);
   }}
   return {row,sync(next){
    const previous=tag.text;tag=next;syncControl();
    row.hidden=!!filter&&!norm(tag.text).includes(norm(filter));
    if(field&&field.value!==tag.text&&(previous!==tag.text||field!==frame.ownerDocument?.activeElement)){field.value=tag.text;field.style.width=Math.max(3,Math.min(30,tag.text.length+1))+'ch';}
    if(field)field.setAttribute('aria-label','Изменить '+tag.text);
    if(chip){const label=(chip.dataset.highlighted==='true'?'✓ ':chip.dataset.inherited==='true'?'✦ ':chip.dataset.assignedElsewhere==='true'?'↗ ':'＋ ')+tag.text;if(chip.textContent!==label)chip.textContent=label;}
   }};
  };
  const drawSection=initial=>{
   let token=initial,count=0;
   const section=el('section',undefined,undefined,'ness-unified-section');
   section.dataset.dividerId=token.id;
   const bar=el('div',undefined,section,'ness-unified-section-head');
   const key=mode+':'+token.id;
   const suffix=()=>count%100>=11&&count%100<=14?'тегов':count%10===1?'тег':count%10>=2&&count%10<=4?'тега':'тегов';
   const label=()=> (collapsed.has(key)?'▸ ':'▾ ')+token.section.title+' · '+count+' '+suffix();
   let held=false,holdTimer=null,startX=0,startY=0;
   const title=button(label(),bar,()=>{
    if(held){held=false;return;}
    if(collapsed.has(key))collapsed.delete(key);else collapsed.add(key);
    syncHeading();
   },'quiet ness-unified-section-toggle');

   addCompactPlus(bar,()=>{
    const tokens=orderedSequence(),start=tokens.findIndex(t=>t.kind==='divider'&&t.id===token.id);
    const next=tokens.findIndex((t,i)=>i>start&&t.kind==='divider');
    return tokens.slice(0,next<0?tokens.length:next).filter(t=>t.kind==='tag').length;
   },token.id);
   const actions=el('div',undefined,bar,'ness-section-actions');
   const editSection=button('✎',actions,()=>{
    if(readOnly())return;
    const previous=bar.querySelector('.ness-tagboard-section-input');
    if(previous){previous.focus({preventScroll:true});return;}
    const field=el('input',undefined,bar,'ness-input ness-tagboard-section-input');
    field.value=token.section.title;field.setAttribute('aria-label','Название раздела');
    const commit=()=>{if(field.dataset.cancelled==='true')return;field.dataset.cancelled='true';const text=field.value.trim();field.remove();if(text&&text!==token.section.title)renameGroup(token.id,text);};
    field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();field.dataset.cancelled='true';field.remove();}};
    field.onblur=commit;field.focus({preventScroll:true});field.select();
   },'quiet ness-section-action');
   editSection.title='Переименовать раздел';editSection.setAttribute('aria-label','Переименовать раздел '+token.section.title);
   const removeSection=button('🗑',actions,()=>deleteGroup(token.id),'quiet ness-section-action');
   removeSection.title='Удалить только разделитель';removeSection.setAttribute('aria-label','Удалить разделитель '+token.section.title+', оставить теги');
   const cancelHold=()=>{if(holdTimer!==null){clearTimeout(holdTimer);holdTimer=null;}};
   bar.onpointerdown=e=>{
    if(e.pointerType==='mouse'||e.target.closest('.ness-section-actions,.ness-tagboard-section-input,.ness-tagboard-add-slot'))return;
    held=false;startX=e.clientX;startY=e.clientY;cancelHold();
    holdTimer=setTimeout(()=>{holdTimer=null;held=true;bar.dataset.actionsOpen='true';},520);
   };
   bar.onpointermove=e=>{if(holdTimer!==null&&Math.hypot(e.clientX-startX,e.clientY-startY)>10)cancelHold();};
   bar.onpointerup=cancelHold;bar.onpointercancel=cancelHold;
   bar.oncontextmenu=e=>{if(e.pointerType==='mouse')return;e.preventDefault();cancelHold();held=true;bar.dataset.actionsOpen='true';};
   const flow=el('div',undefined,section,'ness-unified-section-tags');
   function syncHeading(){const closed=collapsed.has(key);flow.hidden=closed;if(title.textContent!==label())title.textContent=label();title.setAttribute('aria-expanded',String(!closed));}
   return {section,flow,sync(next,n){token=next;count=n;syncHeading();editSection.setAttribute('aria-label','Переименовать раздел '+token.section.title);removeSection.setAttribute('aria-label','Удалить разделитель '+token.section.title+', оставить теги');}};
  };
  function syncCatalogue(){
   const sequence=orderedSequence(),seenRows=new Set(),seenSections=new Set(),grouped=sectionsForMode().length>0;
   if(grouped){topPlus?.remove();bottomPlus?.remove();topPlus=bottomPlus=null;}
   else if(!topPlus)topPlus=addCompactPlus(rootFlow,()=>0);
   let flow=rootFlow,at=grouped?0:1,sectionAt=1;
   for(let i=0;i<sequence.length;i++){
    const token=sequence[i];
    if(token.kind==='divider'){
     let section=sectionsById.get(token.id);if(!section){section=drawSection(token);sectionsById.set(token.id,section);}
     let end=i+1;while(end<sequence.length&&sequence[end].kind!=='divider')end++;
     section.sync(token,end-i-1);place(tagFlow,section.section,sectionAt++);seenSections.add(token.id);flow=section.flow;at=0;
    }else{
     let entry=rowsById.get(token.id);if(!entry){entry=drawTag(token.tag);rowsById.set(token.id,entry);}
     entry.sync(token.tag);place(flow,entry.row,at++);seenRows.add(token.id);
    }
   }
   for(const [id,entry]of rowsById)if(!seenRows.has(id)){entry.row.remove();rowsById.delete(id);}
   for(const [id,section]of sectionsById)if(!seenSections.has(id)){section.section.remove();sectionsById.delete(id);}
   if(!grouped){if(!bottomPlus)bottomPlus=addCompactPlus(rootFlow,()=>items().length);place(rootFlow,topPlus,0);place(rootFlow,bottomPlus,rootFlow.children.length-1);}
   if(!items().length){if(!emptyNote)emptyNote=el('p','Пока нет тегов — нажми +, чтобы добавить.',tagFlow,'ness-note');}
   else{emptyNote?.remove();emptyNote=null;}
   const total=heading.querySelector('strong');if(total)total.textContent='Все теги · '+items().length;
   if(search.value!==filter)search.value=filter;searchToggle.dataset.hasQuery=String(!!filter);
  }
  syncCatalogue();
  const addSection=el('div',undefined,left,'ness-tagboard-section-add');
  const groupToggle=button('＋ Новый раздел',addSection,()=>{
   groupInput.hidden=!groupInput.hidden;createGroup.hidden=groupInput.hidden;
   if(!groupInput.hidden)groupInput.focus?.({preventScroll:true});
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
  const details=el('details',undefined,content,'ness-tagboard-preview');
  el('summary','Предпросмотр строки',details);el('p',preview(),details,'ness-tagboard-preview-text');
  boardView={mode,sync(){
   syncCatalogue();syncToolMode();refreshSelection();
   tagFlow.scrollTop=viewportByMode[mode].tags;
   right.querySelector('.ness-tagboard-chosen-list').scrollTop=chosenScrollByPreset.get(mode+':'+preset)||0;
   followTag();
  }};
  syncToolMode();
  // Restore after the entire board (including preview and count badges) exists.
  tagFlow.scrollTop=tagScroll;right.querySelector('.ness-tagboard-chosen-list').scrollTop=chosenScroll;ribbon.scrollLeft=ribbonScroll;
  restore();followTag();
  function followTag(){if(followMovedTag&&['move','transfer'].includes(toolMode)&&focusTagId){
   const active=[...content.querySelectorAll('.ness-unified-tag-row')].find(row=>row.dataset.tagId===focusTagId);
   // Follow a deliberately moved tag only inside its own pane, never the whole dialog.
   if(active&&tagFlow.getBoundingClientRect&&active.getBoundingClientRect){const a=active.getBoundingClientRect(),p=tagFlow.getBoundingClientRect();if(a.top<p.top)tagFlow.scrollTop+=a.top-p.top;else if(a.bottom>p.bottom)tagFlow.scrollTop+=a.bottom-p.bottom;}
   followMovedTag=false;
  }}
 }

 frame.addEventListener('click',e=>{
  if(!mobile()||!tagSearchOpen)return;
  const search=content.querySelector('.ness-tagboard-search'),toggle=content.querySelector('.ness-tag-search-toggle');
  if(e.target===search||e.target===toggle||toggle?.contains?.(e.target))return;
  tagSearchOpen=false;if(search)search.dataset.open='false';toggle?.setAttribute('aria-expanded','false');
 });
 frame.tabIndex=-1;
 frame.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||readOnly())return;
  if(e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
  const key=e.key.toLowerCase();
  if(key==='z'&&!e.shiftKey&&undo.length){e.preventDefault();undoAction();}
  else if((key==='y'||key==='z'&&e.shiftKey)&&redo.length){e.preventDefault();redoAction();}
 });
 render();
 return {element:frame,historyHost:toolHistory,flushPending:flushModeText,rememberRibbon:rememberViewport,restoreRibbon:()=>{const ribbon=activeRibbon();if(ribbon)ribbon.scrollLeft=viewportByMode[mode].ribbon;},getHintPinned:()=>helpPinned,isHintPeek:()=>helpPeek,setHintPinned,toggleHintPeek,getToolMode:()=>toolMode,syncTools:updateToolBar,undo:undoAction,redo:redoAction,canUndo:()=>undo.length>0,canRedo:()=>redo.length>0,getSkin:()=>normalizeSkinTags(skin),getSections:()=>normalizeAppearanceSections(modeCatalog.modes.base.sections,readBaseState().base),getCatalog,refresh:()=>{modeCatalog=normalizeAppearanceModeCatalog(getCatalog(),readBaseState().base,skin,readNsfwState(),initialSections);render();},getMode:()=>mode,setModeLayout(value){if(!flushModeText())return false;layouts[mode]=value==='prose'?'text':'board';layout=layouts[mode];render();return true;},setAvailableFormat(value){appearanceFormat=value==='prose'?'prose':'tags';layouts.base=appearanceFormat==='prose'?'text':'board';if(mode==='base')layout=layouts.base;render();}};
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
