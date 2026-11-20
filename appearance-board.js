/**
 * Two-mode tag board. Display-only headings never enter the image prompt.
 * Existing base strings and appearanceSelections offsets remain authoritative.
 */
import { NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS } from './shared-data.js';
import { normalizeAppearanceRanges, normalizeAppearanceSelections, visibleAppearanceRanges } from './appearance-visibility.js';

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
 const sections=(Array.isArray(data.sections)?data.sections:[]).filter(x=>x&&typeof x.id==='string'&&/^[a-z][a-z0-9_]{0,48}$/.test(x.id)&&validLabel(x.title)).slice(0,60)
 .map(x=>({id:x.id,title:validLabel(x.title)}));
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
 const tags=new Set(parseBaseTags(base).map(x=>x.text));
 const sections=[],ids=new Set();
 for(const x of Array.isArray(raw)?raw:[]){
  if(!x||typeof x.id!=='string'||!/^[a-z][a-z0-9_]{0,48}$/.test(x.id)||ids.has(x.id)||!validLabel(x.title))continue;
  ids.add(x.id);
  sections.push({id:x.id,title:validLabel(x.title),tags:[...new Set((Array.isArray(x.tags)?x.tags:[]).filter(t=>typeof t==='string'&&tags.has(t)))]});
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
 let mode='base',preset='face',layout='board',filter='',checked=new Set(),undo=[],redo=[];
 const frame=el('section',undefined,parent,'ness-tagboard');
 frame.setAttribute('aria-label','Конструктор тегов внешности');
 const header=el('div',undefined,frame,'ness-tagboard-header');
 el('strong','Редактор внешности',header);
 const tools=el('div',undefined,header,'ness-tagboard-actions');
 const boardButton=button('Конструктор',tools,()=>{layout='board';render();},'quiet');
 const textButton=button('Текстовый режим',tools,()=>{layout='text';render();},'quiet');
 const modes=el('div',undefined,frame,'ness-tagboard-modes');
 const basic=button('Основа',modes,()=>{mode='base';preset='face';checked.clear();render();},'quiet');
 const marks=button('Кожа и отметины',modes,()=>{mode='skin';preset='upper_front';checked.clear();render();},'quiet');
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
 function reposition(tag,delta){
  if(readOnly())return;
  const list=items(),from=list.findIndex(t=>mode==='base'?t.start===tag.start:t.id===tag.id),to=from+delta;
  if(from<0||to<0||to>=list.length)return;
  const moved=[...list],item=moved.splice(from,1)[0];moved.splice(to,0,item);
  if(mode==='base')changeTagList(moved);
  else{record();skin.tags=moved;after();}
 }
 function changeTagList(changedItems,oldToNew){
  record();const state=reorderBaseTags(baseState(),changedItems);
  writeBaseState(state);
  if(oldToNew)for(const section of sections)section.tags=section.tags.map(t=>t===oldToNew.old?oldToNew.next:t);
  sections=normalizeAppearanceSections(sections,state.base);after();
 }
 const sectionsForMode=()=>mode==='base'?sections:skin.sections;
 function groups(){
  const list=sectionsForMode(),all=items();
  return [{id:'',title:'Без раздела',tags:all.filter(t=>!list.some(g=>mode==='skin'?t.section===g.id:g.tags.includes(t.text)))},
   ...list.map(g=>({id:g.id,title:g.title,tags:all.filter(t=>mode==='skin'?t.section===g.id:g.tags.includes(t.text))}))];
 }
 function addGroup(){
  if(readOnly())return;
  const inputNode=content.querySelector('[data-group-name]'),title=validLabel(inputNode?.value);
  if(!title)return;record();
  const id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  if(mode==='base')sections.push({id,title,tags:[]});else skin.sections.push({id,title});
  after();
 }
 function renameGroup(id,title){
  if(readOnly()||!title.trim())return;
  record();const group=sectionsForMode().find(x=>x.id===id);
  if(group)group.title=validLabel(title);
  after();
 }
 function deleteGroup(id){
  if(readOnly()||!id)return;record();
  if(mode==='base')sections=sections.filter(x=>x.id!==id);
  else{skin.sections=skin.sections.filter(x=>x.id!==id);skin.tags.forEach(t=>{if(t.section===id)t.section='';});}
  after();
 }
 function moveGroup(tag,id){
  if(readOnly())return;record();
  if(mode==='base'){
   for(const x of sections)x.tags=x.tags.filter(t=>t!==tag.text);
   const target=sections.find(x=>x.id===id);if(target)target.tags.push(tag.text);
  }else{
   const current=skin.tags.find(t=>t.id===tag.id);if(current)current.section=id;
  }
  after();
 }
 function addTag(value){
  const tag=String(value||'').trim().replace(/[,;]+$/,'').trim();
  if(!tag||readOnly())return;
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
  if(items().some(x=>x!==tag&&norm(x.text)===norm(text)))return;
  if(mode==='skin'){record();skin.tags.find(x=>x.id===tag.id).text=text;after();}
  else changeTagList(items().map(x=>x.start===tag.start?{...x,text}:x),{old:tag.text,next:text});
 }
 function preview(){
  if(mode==='skin'){
   if(preset==='always')return skin.tags.filter(t=>(skin.selections.always||[]).includes(t.id)).map(t=>t.text).join(', ')||'(нет тегов)';
   return formatSkinParts(skin,[preset])||'(нет тегов)';
  }
  const state=baseState();
  const picked=visibleAppearanceRanges(state.ranges,preset,state.selections,false);
  return (picked.length?visibleAppearanceRanges(state.ranges,preset,state.selections,preset!=='always').map(x=>x.text.trim().replace(/[,;]+$/,'')).join(', '):state.base.trim())||'(нет тегов)';
 }
 function render(){
  onLayoutChange(layout,mode);
  basic.setAttribute('aria-pressed',String(mode==='base'));
  marks.setAttribute('aria-pressed',String(mode==='skin'));
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
    clear(left);clear(right);
    el('strong','Все теги · доступные',left);
    const groupBar=el('div',undefined,left,'ness-row');
    const groupInput=el('input',undefined,groupBar,'ness-input');groupInput.placeholder='Название раздела';groupInput.setAttribute('data-group-name','');
    button('+ Раздел',groupBar,addGroup,'quiet');
    for(const group of groups()){
     const tags=group.tags.filter(t=>!isChosen(t,preset)&&!(preset!==SKIN_ALWAYS&&isChosen(t,SKIN_ALWAYS))&&norm(t.text).includes(norm(filter)));
     if(!tags.length&&group.id==='')continue;
     const section=el('div',undefined,left,'ness-tagboard-group');
     const head=el('div',undefined,section,'ness-tagboard-grouphead');
     if(group.id){
      const name=el('input',undefined,head,'ness-input');name.value=group.title;name.title='Название раздела только для библиотеки';
      name.onchange=()=>renameGroup(group.id,name.value);
      button('×',head,()=>deleteGroup(group.id),'quiet').title='Удалить заголовок, не теги';
     }else el('span',group.title,head);
     for(const tag of tags){
      const item=el('div',undefined,section,'ness-tagboard-item');
      const use=button('→ '+tag.text,item,()=>toggle(tag,true),'quiet');use.title='Добавить в выбранный ракурс';
      const groupPick=el('select',undefined,item,'ness-input ness-tagboard-groupselect');groupPick.title='Группа (не попадает в промпт)';
      for(const g of [{id:'',title:'Без раздела'},...sectionsForMode()]){const o=el('option',g.title,groupPick);o.value=g.id;}
      groupPick.value=group.id;groupPick.onchange=()=>moveGroup(tag,groupPick.value);
      const edit=button('✎',item,()=>{const next=prompt('Точный текст тега',tag.text);if(next!==null)renameTag(tag,next);},'quiet');edit.title='Изменить текст тега';
      button('×',item,()=>removeTag(tag),'quiet').title='Удалить тег полностью';
     }
    }
    el('strong',headings[preset]+' · выбранные',right);
    const selectedList=items().filter(t=>isChosen(t,preset)&&norm(t.text).includes(norm(filter)));
    const list=el('div',undefined,right,'ness-tagboard-selected');
    for(const tag of selectedList){const item=el('div',undefined,list,'ness-tagboard-item');
     item.draggable=true;
     item.ondragstart=e=>{e.dataTransfer?.setData('text/plain',mode==='base'?String(tag.start):tag.id);e.dataTransfer.effectAllowed='move';};
     item.ondragover=e=>{e.preventDefault();};
     item.ondrop=e=>{
       e.preventDefault();const key=e.dataTransfer?.getData('text/plain'),src=items().find(t=>mode==='base'?String(t.start)===key:t.id===key);
       if(!src)return;const all=items(),from=all.findIndex(t=>mode==='base'?t.start===src.start:t.id===src.id),to=all.findIndex(t=>mode==='base'?t.start===tag.start:t.id===tag.id);
       if(from<0||to<0||from===to)return;
       reposition(src,to-from);
     };
     const remove=button('← '+tag.text,item,()=>toggle(tag,false),'quiet');remove.title='Снять с выбранного ракурса';
     const up=button('↑',item,()=>reposition(tag,-1),'quiet');up.title='Поднять тег в общем порядке';
     const down=button('↓',item,()=>reposition(tag,1),'quiet');down.title='Опустить тег в общем порядке';
     const checkbox=el('input',undefined,item);checkbox.type='checkbox';checkbox.checked=checked.has(mode==='base'?tag.start:tag.id);
     checkbox.setAttribute('aria-label','Выбрать для группового снятия: '+tag.text);
     checkbox.onchange=()=>{const k=mode==='base'?tag.start:tag.id;if(checkbox.checked)checked.add(k);else checked.delete(k);};
    }
    if(preset!==SKIN_ALWAYS){
     const common=items().filter(t=>isChosen(t,SKIN_ALWAYS));
     if(common.length){const band=el('div',undefined,right,'ness-tagboard-always');
      el('span','✦ Показывать всегда',band);
      for(const tag of common)el('span',tag.text,band,'ness-tagboard-always-chip');
     }
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
    for(const [id,label] of Object.entries(headings))if(id!==preset){
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
 return {element:frame,getSkin:()=>normalizeSkinTags(skin),getSections:()=>normalizeAppearanceSections(sections,readBaseState().base),refresh:render,getMode:()=>mode,setAvailableFormat(value){textButton.disabled=false;if(value==='prose'&&mode==='base'){layout='text';render();}}};
}
/** One additional marker in the existing director call; no extra model requests. */
export function skinAppearanceInstruction(records){
 const entries=[...records].filter(([,v])=>hasSkinSelections(v.skinTags));
 if(!entries.length)return '';
 const names=entries.map(([id,v])=>id+': '+Object.keys(SKIN_PRESETS).filter(k=>(v.skinTags?.selections?.[k]||[]).length||(v.skinTags?.selections?.always||[]).length).join(', ')).join('\n');
 return '\n\nVISIBLE SKIN AND MARKS — ONE OPTIONAL MARKER PER CHARACTER\n'
  +'In each character entry whose ID is listed below, immediately after its [[NESS_VIS:id:preset]] marker and BEFORE any clothing, append [[NESS_SKIN:id:part1,part2]] for ONLY the uncovered skin areas actually visible in at least one chosen panel. You may choose multiple parts independently of the main appearance camera preset. '
  +'Allowed skin parts: '+Object.keys(SKIN_PRESETS).join(', ')+'. The lower_front and lower_back parts are DISTINCT; do not include lower_front when only the rear is visible, nor vice versa. Upper-front/back are distinct as well. '
  +'If no configured exposed skin part is visible, use [[NESS_SKIN:id:none]]. Include the marker only once for each listed participant, keep literal [[NESS_SKIN:...]] syntax; never invent anatomy or reveal skin covered by clothing. '
  +'Skin tags are inserted by the library after the base appearance and before clothing, not written by you. The source fields with legacy nudeUpper/nudeLower are independent and remain governed by their existing visibility rules.\n'
  +'Skin-equipped character IDs and available parts:\n'+names;
}
export function insertSkinAppearance(prompt,records){
 const inserted=new Set();
 const result=String(prompt||'').replace(/\[\[NESS_SKIN:([a-z][a-z0-9_]*):([a-z_,]+)\]\][ \t]*(?:[,;][ \t]*)?/g,(whole,id,definition)=>{
  const record=records.get(id);
  if(!record||!hasSkinSelections(record.skinTags)||inserted.has(id))
   throw Error('Некорректная повторная метка открытой кожи персонажа '+id+'. Сохрани исходный ответ режиссёра для проверки.');
  inserted.add(id);
  const chosen=definition.split(',').map(s=>s.trim());
  if(chosen.length===1&&chosen[0]==='none')return '';
  if(!chosen.length||chosen.some(p=>!Object.hasOwn(SKIN_PRESETS,p)))
   throw Error('Режиссёр выбрал неизвестную область кожи персонажа '+id+'.');
  const line=formatSkinParts(record.skinTags,chosen);
  return line?' '+line+'; ':'';
 });
 if(result.includes('[[NESS_SKIN:'))throw Error('Режиссёр вернул незавершённую метку открытой кожи.');
 for(const [id,record] of records)if(hasSkinSelections(record.skinTags)&&!inserted.has(id))
  console.warn('[SP Imagen] Режиссёр не выбрал открытые участки '+id+'; детали кожи не вставлены во избежание невидимой анатомии.');
 return result;
}
