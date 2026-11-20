/**
 * Two-mode tag board. Display-only headings never enter the image prompt.
 * Existing base strings and appearanceSelections offsets remain authoritative.
 */
import { NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS } from './shared-data.js';
import { normalizeAppearanceRanges, normalizeAppearanceSelections, visibleAppearanceRanges, hasConfiguredAppearanceViews } from './appearance-visibility.js';

export const SKIN_PRESETS=Object.freeze({
 upper_front:'Открытый верх · спереди',
 upper_back:'Открытый верх · сзади',
 lower_front:'Открытый низ · спереди',
 lower_back:'Открытый низ · сзади',
 arms:'Открытые руки',
 legs:'Открытые ноги'
});
export const SKIN_ALWAYS='always';
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

export function createAppearanceBoard({ui,parent,readBaseState,writeBaseState,initialSkin,initialSections,changed,readOnly,onLayoutChange=()=>{}}){
 const {el,button,clear,input}=ui;
 let skin=normalizeSkinTags(initialSkin),sections=normalizeAppearanceSections(initialSections,readBaseState().base);
 let mode='base',preset='face',layout='board',appearanceFormat='tags',filter='',checked=new Set(),undo=[],redo=[];
 const frame=el('section',undefined,parent,'ness-tagboard');
 frame.setAttribute('aria-label','Конструктор тегов внешности');
 const header=el('div',undefined,frame,'ness-tagboard-header');
 el('strong','Редактор внешности',header);
 const tools=el('div',undefined,header,'ness-tagboard-actions');
 const boardButton=button('Конструктор',tools,()=>{if(mode==='base'&&appearanceFormat==='prose')return;layout='board';render();},'quiet');
 const textButton=button('Текстовый режим',tools,()=>{layout='text';render();},'quiet');
 const modes=el('div',undefined,frame,'ness-tagboard-modes');
 const notice=el('p',undefined,frame,'ness-note');notice.hidden=true;notice.setAttribute('aria-live','polite');
 const warn=value=>{notice.textContent=value;notice.hidden=!value;};
 const basic=button('Основа',modes,()=>{mode='base';preset='face';if(appearanceFormat==='prose')layout='text';checked.clear();render();},'quiet');
 const marks=button('Кожа и отметины',modes,()=>{mode='skin';layout='board';preset='upper_front';checked.clear();render();},'quiet');
 const content=el('div',undefined,frame,'ness-tagboard-body');
 const snapshot=()=>copy({base:readBaseState(),sections,skin});
 function applySnapshot(s){
  writeBaseState(copy(s.base));
  sections=normalizeAppearanceSections(s.sections,s.base.base);skin=normalizeSkinTags(s.skin);
  changed();render();
 }
 function record(){undo.push(snapshot());if(undo.length>50)undo.shift();redo.length=0;}
 function after(){changed();render();}
 const availablePresets=()=>mode==='base'?{always:'✦ Показывать всегда',...Object.fromEntries(Object.entries(NESS_APPEARANCE_PRESETS).map(([id,v])=>[id,v.label]))}:{always:'✦ Для всех открытых областей',...SKIN_PRESETS};
 const baseState=()=>readBaseState();
 const baseSelected=(id)=>visibleAppearanceRanges(baseState().ranges,id,baseState().selections,false);
 const isBaseChosen=(tag,id)=>baseSelected(id).some(r=>r.start<tag.end&&tag.start<r.end);
 const isSkinChosen=(tag,id)=>(skin.selections[id]||[]).includes(tag.id);
 const isChosen=(tag,id)=>mode==='base'?isBaseChosen(tag,id):isSkinChosen(tag,id);
 const items=()=>mode==='base'?parseBaseTags(baseState().base):skin.tags;
 function setSkinSelection(id,list){
  skin.selections[id]=[...new Set(list)];
  if(id===SKIN_ALWAYS){
   const excluded=new Set(skin.selections.always);
   for(const key of Object.keys(SKIN_PRESETS))if(skin.selections[key])skin.selections[key]=skin.selections[key].filter(t=>!excluded.has(t));
  }
 }

 function toggle(tag,assign){changeMany([tag],assign);}
 function changeMany(tags,assign){
  if(readOnly()||!tags.length)return;
  const relevant=tags.filter(t=>isChosen(t,preset)!==assign);
  if(!relevant.length)return;
  record();
  if(mode==='skin'){
   const ids=new Set(relevant.map(t=>t.id));
   const current=new Set(skin.selections[preset]||[]);
   for(const id of ids)if(assign)current.add(id);else current.delete(id);
   setSkinSelection(preset,[...current]);
   if(preset!==SKIN_ALWAYS&&assign)skin.selections.always=(skin.selections.always||[]).filter(x=>!ids.has(x));
  }else{
   const state=baseState(),updated={...(state.selections||{})};
   const overlap=(r,t)=>r.start<t.end&&t.start<r.end;
   const current=baseSelected(preset).filter(r=>!relevant.some(t=>overlap(r,t)));
   if(assign)for(const t of relevant)current.push({start:t.start,end:t.end,text:t.text});
   updated[preset]=normalizeAppearanceRanges(state.base,current,true);
   if(preset===NESS_APPEARANCE_ALWAYS&&assign){
    for(const id of Object.keys(NESS_APPEARANCE_PRESETS)){
     updated[id]=normalizeAppearanceRanges(state.base,baseSelected(id).filter(r=>!relevant.some(t=>overlap(r,t))),true);
    }
   }else if(preset!==NESS_APPEARANCE_ALWAYS&&assign){
    updated.always=normalizeAppearanceRanges(state.base,baseSelected(NESS_APPEARANCE_ALWAYS).filter(r=>!relevant.some(t=>overlap(r,t))),true);
   }
   writeBaseState({...state,selections:normalizeAppearanceSelections(state.base,updated)});
  }
  after();
 }

 const sectionsForMode=()=>mode==='base'?sections:skin.sections;
 function orderedSequence(){
  const all=items(),headings=sectionsForMode(),sequence=[];
  for(let i=0;i<=all.length;i++){
   for(const divider of headings)if(divider.before===i)sequence.push({kind:'divider',id:divider.id,section:divider});
   if(i<all.length)sequence.push({kind:'tag',id:mode==='base'?'base:'+all[i].start:all[i].id,tag:all[i]});
  }
  return sequence;
 }
 function applySequence(sequence){
  if(readOnly())return;
  record();
  const sorted=sequence.filter(t=>t.kind==='tag').map(t=>t.tag),beforeState=mode==='base'?baseState():null;
  const movedSections=[];
  let index=0;
  for(const token of sequence){
   if(token.kind==='tag')index++;
   else movedSections.push({id:token.id,title:token.section.title,before:index});
  }
  if(mode==='base'){
   sections=movedSections;
   const existing=parseBaseTags(beforeState.base);
   const same=existing.length===sorted.length&&existing.every((t,i)=>t.start===sorted[i].start&&t.text===sorted[i].text);
   if(!same)writeBaseState(reorderBaseTags(beforeState,sorted));
  }else{
   skin.tags=sorted.map(t=>({...t}));
   skin.sections=movedSections;
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
  const sequence=orderedSequence(),from=sequence.findIndex(t=>t.kind==='tag'&&t.id===(mode==='base'?'base:'+tag.start:tag.id)),to=from+delta;
  if(from<0||to<0||to>=sequence.length)return;
  moveSequenceToken(sequence[from],sequence[to],delta>0);
 }
 function changeTagList(changedItems){
  if(readOnly())return;
  const old=items(),survivors=new Set(changedItems.filter(t=>Number.isInteger(t.start)).map(t=>t.start));
  const anchored=sections.map(d=>({...d,before:old.slice(0,d.before).filter(t=>survivors.has(t.start)).length}));
  record();
  const state=reorderBaseTags(baseState(),changedItems);
  writeBaseState(state);
  sections=normalizeAppearanceSections(anchored,state.base);
  after();
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
  if(readOnly()||!id)return;
  record();
  if(mode==='base')sections=sections.filter(x=>x.id!==id);
  else skin.sections=skin.sections.filter(x=>x.id!==id);
  after();
 }
 function addTag(value){
  const tag=String(value||'').trim().replace(/[;,\s]+$/,'').trim();
  if(!tag||readOnly())return;
  if(/[,\r\n]/.test(tag)){warn('Добавляй по одному тегу. Запятая используется только как разделитель при сборке промпта.');return;}
  warn('');
  if(mode==='skin'){
   if(skin.tags.some(x=>norm(x.text)===norm(tag)))return;
   record();const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
   skin.tags.push({id,text:tag,section:''});
   setSkinSelection(preset,[...(skin.selections[preset]||[]),id]);after();
  }else{
   if(items().some(x=>norm(x.text)===norm(tag)))return;
   const list=items();changeTagList([...list,{text:tag}]);
   const added=items().find(x=>x.text===tag);
   if(added)toggle(added,true);
  }
 }
 function removeTag(tag){
  if(readOnly())return;
  if(!confirm('Удалить тег из библиотеки целиком? Это снимет его со всех ракурсов.'))return;
  if(mode==='skin'){
   record();skin.tags=skin.tags.filter(x=>x.id!==tag.id);
   for(const id of Object.keys(skin.selections))skin.selections[id]=skin.selections[id].filter(x=>x!==tag.id);
   after();
  }else changeTagList(items().filter(x=>x.start!==tag.start));
 }
 function renameTag(tag,next){
  const text=String(next||'').trim().replace(/[,;]+$/,'').trim();
  if(!text||text===tag.text||readOnly())return;
  if(/[,\r\n]/.test(text)){warn('В одном теге нельзя использовать запятую: она разделяет разные теги.');return;}
  warn('');
  if(items().some(x=>x!==tag&&norm(x.text)===norm(text)))return;
  if(mode==='skin'){record();skin.tags.find(x=>x.id===tag.id).text=text;after();}
  else changeTagList(items().map(x=>x.start===tag.start?{...x,text}:x));
 }
 function preview(){
  if(mode==='skin'){
   if(preset==='always')return skin.tags.filter(t=>(skin.selections.always||[]).includes(t.id)).map(t=>t.text).join(', ')||'(нет тегов)';
   return formatSkinParts(skin,[preset])||'(нет тегов)';
  }
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
   const note=el('p',mode==='base'?'Исходное описание сохраняет точный текст и разметку тегов. Для редактирования используй текстовое поле внешности в карточке.':'Отдельный набор открытых участков: видимые теги собираются после базовой внешности перед одеждой.',content,'ness-note');
   if(mode==='skin'){
    const textArea=el('textarea',undefined,content,'ness-input');textArea.value=skin.tags.map(t=>t.text).join(', ');textArea.readOnly=true;
   }
  }else{
   const act=el('div',undefined,content,'ness-tagboard-history');
   const reorderToggle=button('✎ Редактировать порядок и разделители',act,()=>{frame.dataset.moveMode=frame.dataset.moveMode==='true'?'false':'true';render();},'quiet');
   reorderToggle.setAttribute('aria-pressed',String(frame.dataset.moveMode==='true'));
   const undoBtn=button('↶ Отменить',act,()=>{if(!undo.length)return;redo.push(snapshot());applySnapshot(undo.pop());},'quiet');undoBtn.disabled=!undo.length;
   const redoBtn=button('↷ Повторить',act,()=>{if(!redo.length)return;undo.push(snapshot());applySnapshot(redo.pop());},'quiet');redoBtn.disabled=!redo.length;
   const search=el('input',undefined,bar,'ness-input');search.type='search';search.placeholder='Найти тег';search.value=filter;
   search.oninput=()=>{filter=search.value;drawColumns();};
   const inputTag=el('input',undefined,bar,'ness-input');inputTag.placeholder='Новый тег, Enter';
   inputTag.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addTag(inputTag.value);}};
   const add=button('+ Добавить тег',bar,()=>addTag(inputTag.value),'quiet');
   const blocks=el('div',undefined,content,'ness-tagboard-columns');
   const left=el('section',undefined,blocks,'ness-tagboard-column'),right=el('section',undefined,blocks,'ness-tagboard-column');
   function drawColumns(){
    const baseCurrent=mode==='base'?baseSelected(preset):[];
    const baseAlways=mode==='base'?baseSelected(NESS_APPEARANCE_ALWAYS):[];
    const skinCurrent=mode==='skin'?new Set(skin.selections[preset]||[]):null;
    const skinAlways=mode==='skin'?new Set(skin.selections.always||[]):null;
    const chosenNow=t=>mode==='skin'?skinCurrent.has(t.id):baseCurrent.some(r=>r.start<t.end&&t.start<r.end);
    const inAlways=t=>mode==='skin'?skinAlways.has(t.id):baseAlways.some(r=>r.start<t.end&&t.start<r.end);
    clear(left);clear(right);
    el('strong','Все теги',left);
    const groupBar=el('div',undefined,left,'ness-row ness-board-group-create');
    const groupInput=el('input',undefined,groupBar,'ness-input');groupInput.placeholder='Название раздела';groupInput.setAttribute('data-group-name','');
    groupInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addGroup();}};
    button('+ Разделитель',groupBar,addGroup,'quiet');

    const sequence=orderedSequence();
    let dragToken=null,editMode=frame.dataset.moveMode==='true';
    groupBar.hidden=!editMode;
    const tokenMatches=token=>token.kind==='divider'||norm(token.tag.text).includes(norm(filter));
    function sortable(node,token){
     node.setAttribute('data-board-token',token.id);
     node.ondragover=e=>{if(!dragToken||readOnly())return;e.preventDefault();e.dataTransfer.dropEffect='move';};
     node.ondrop=e=>{if(!dragToken||readOnly())return;e.preventDefault();const rect=node.getBoundingClientRect();moveSequenceToken(dragToken,token,e.clientY>rect.top+rect.height/2);dragToken=null;};
     node.dataset.boardKind=token.kind;
     const handle=button('⠿',node,undefined,'quiet ness-tagboard-grip');
     handle.setAttribute('aria-label',token.kind==='divider'?'Переместить разделитель '+token.section.title:'Переместить тег '+token.tag.text);
     handle.title='Перетащить, не назначая тег ракурсу';
     handle.draggable=true;
     handle.onclick=e=>{e.preventDefault();e.stopPropagation();};
     handle.ondragstart=e=>{
      if(readOnly()){e.preventDefault();return;}
      dragToken=token;
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',token.id);
      node.classList.add('ness-tagboard-dragging');
     };
     handle.ondragend=()=>{dragToken=null;node.classList.remove('ness-tagboard-dragging');};
     // Native drag supports mouse; Pointer Events support touch and stylus.
     let pointer=null,hover=null;
     handle.onpointerdown=e=>{
      if(readOnly()||e.pointerType==='mouse'||e.button!==0)return;
      e.preventDefault();e.stopPropagation();pointer=e.pointerId;dragToken=token;
      handle.setPointerCapture?.(pointer);node.classList.add('ness-tagboard-dragging');
     };
     handle.onpointermove=e=>{
      if(pointer!==e.pointerId)return;
      e.preventDefault();
      hover=document.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-board-token]')||null;
      if(hover===node)hover=null;
     };
     handle.onpointerup=e=>{
      if(pointer!==e.pointerId)return;
      e.preventDefault();e.stopPropagation();
      const target=hover;pointer=null;hover=null;
      handle.releasePointerCapture?.(e.pointerId);node.classList.remove('ness-tagboard-dragging');
      if(target){
       const found=orderedSequence().find(t=>t.kind===target.dataset.boardKind&&t.id===target.dataset.boardToken);
       if(found){const rect=target.getBoundingClientRect();moveSequenceToken(token,found,e.clientY>rect.top+rect.height/2);}
      }
      dragToken=null;
     };
     handle.onpointercancel=()=>{pointer=null;hover=null;dragToken=null;node.classList.remove('ness-tagboard-dragging');};
     if(editMode){
      button('↑',node,()=>moveTokenOne(token,-1),'quiet ness-tagboard-reorder').title='Передвинуть выше';
      button('↓',node,()=>moveTokenOne(token,1),'quiet ness-tagboard-reorder').title='Передвинуть ниже';
     }
    }
    function renderDivider(parent,token){
     const divider=el('div',undefined,parent,'ness-tagboard-divider');
     sortable(divider,token);
     const band=el('div',undefined,divider,'ness-divider-line');
     const title=el('span',token.section.title,band,'ness-tagboard-divider-title');
     title.setAttribute('aria-label','Раздел: '+token.section.title);
     title.title='Название только для редактора; не входит в промпт';
     if(editMode){
      button('✎',divider,()=>{
       const edit=el('textarea',undefined,divider,'ness-input ness-divider-edit');
       edit.value=token.section.title;edit.rows=2;
       edit.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();renameGroup(token.id,edit.value);}else if(e.key==='Escape'){e.preventDefault();edit.remove();}};
       edit.focus();edit.select?.();
      },'quiet').title='Переименовать разделитель';
      button('×',divider,()=>deleteGroup(token.id),'quiet').title='Удалить разделитель без удаления тегов';
     }
    }
    function renderSourceTag(parent,token){
     const tag=token.tag,item=el('div',undefined,parent,'ness-tagboard-item');
     const use=button('→ '+tag.text,item,()=>toggle(tag,true),'quiet');
     use.title='Назначить выбранному ракурсу';
     sortable(item,token);
     if(editMode){
      const edit=button('✎',item,()=>{
       if(readOnly())return;
       const editField=el('input',undefined,item,'ness-input');editField.value=tag.text;
       editField.setAttribute('aria-label','Изменить текст тега');
       const done=ok=>{const next=editField.value;editField.onblur=null;editField.remove();use.hidden=false;edit.hidden=false;if(ok)renameTag(tag,next);};
       editField.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(true);}else if(e.key==='Escape'){e.preventDefault();done(false);}};
       editField.onblur=()=>{if(editField.isConnected)done(true);};
       use.hidden=true;edit.hidden=true;editField.focus();editField.select?.();
      },'quiet');
      edit.title='Изменить тег';
      button('×',item,()=>removeTag(tag),'quiet').title='Удалить тег целиком';
     }
    }
    const sourceFlow=el('div',undefined,left,'ness-tagboard-flow');
    for(const token of sequence){
     if(token.kind==='divider'){renderDivider(sourceFlow,token);continue;}
     if(chosenNow(token.tag)||(preset!==SKIN_ALWAYS&&inAlways(token.tag)))continue;
     if(tokenMatches(token))renderSourceTag(sourceFlow,token);
    }
    el('strong',headings[preset]+' · выбранные',right);

    // Always-on tags apply to this view without being selected again.
    // Present them as a subtle inline summary, not a separate bulky card.
    if(preset!==SKIN_ALWAYS){
     const common=items().filter(inAlways);
     if(common.length){
      const band=el('div',undefined,right,'ness-tagboard-always');
      const label=el('span','✦ Всегда',band,'ness-tagboard-always-label');
      label.title='Теги действуют для всех ракурсов. Меняются в «Показывать всегда».';
      for(const tag of common){
       const chip=el('span',tag.text,band,'ness-tagboard-always-chip');
       chip.title='Тег действует для всех ракурсов';
      }
     }
    }
    const list=el('div',undefined,right,'ness-tagboard-selected');
    for(const token of sequence){
     if(token.kind==='divider'){
      renderDivider(list,token);
      continue;
     }
     const tag=token.tag;
     if(!chosenNow(tag)||!tokenMatches(token))continue;
     const item=el('div',undefined,list,'ness-tagboard-item');
     const remove=button('← '+tag.text,item,()=>toggle(tag,false),'quiet');
     remove.title='Снять с выбранного ракурса';
     sortable(item,token);
     const checkbox=el('input',undefined,item);checkbox.type='checkbox';checkbox.checked=checked.has(mode==='base'?tag.start:tag.id);
     checkbox.setAttribute('aria-label','Отметить для группового снятия: '+tag.text);
     checkbox.onchange=()=>{const k=mode==='base'?tag.start:tag.id;if(checkbox.checked)checked.add(k);else checked.delete(k);};
    }
    const actions=el('div',undefined,right,'ness-tagboard-bottom');
    button('+ Все видимые',actions,()=>{
     const candidates=items().filter(t=>!isChosen(t,preset)&&!isChosen(t,SKIN_ALWAYS)&&norm(t.text).includes(norm(filter)));
     if(candidates.length>12&&!confirm('Добавить '+candidates.length+' тегов в выбранный набор?'))return;
     changeMany(candidates,true);
    },'quiet');
    button('− Выбранные',actions,()=>{
     const chosen=items().filter(t=>checked.has(mode==='base'?t.start:t.id)&&isChosen(t,preset));
     changeMany(chosen,false);checked.clear();
    },'quiet');
    const copyFrom=el('select',undefined,actions,'ness-input');
    const empty=el('option','Копировать из…',copyFrom);empty.value='';
    for(const [id,label] of Object.entries(headings))if(id!==preset&&id!==SKIN_ALWAYS){
     const o=el('option',label,copyFrom);o.value=id;
    }
    button('Копировать',actions,()=>{
     const id=copyFrom.value;
     if(!id)return;
     const list=items().filter(t=>isChosen(t,id)&&!isChosen(t,preset));
     changeMany(list,true);
    },'quiet');
    const details=el('details',undefined,right,'ness-tagboard-preview');
    el('summary','Предпросмотр итоговой строки',details);
    const pre=el('p',preview(),details,'ness-tagboard-preview-text');pre.setAttribute('aria-label','Точный текст для промпта');
   }
   drawColumns();
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
 return {element:frame,getSkin:()=>normalizeSkinTags(skin),getSections:()=>normalizeAppearanceSections(sections,readBaseState().base),refresh:render,getMode:()=>mode,setAvailableFormat(value){appearanceFormat=value==='prose'?'prose':'tags';if(appearanceFormat==='prose'&&mode==='base')layout='text';render();}};
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
