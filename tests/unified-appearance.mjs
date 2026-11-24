import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeAppearanceCatalog,normalizeSkinTags,createAppearanceBoard,
  parseBaseTags,SKIN_PRESETS,NSFW_PRESETS
} from '../appearance-board.js';
import { normalizeAppearanceModeCatalog,modeTokens,repositionModeTag,sectionTagCount } from '../appearance-mode-state.js';
import { createSpImagenLibraryRuntime } from '../library-runtime.js';

const base='freckles, long blonde hair, blue eyes;';
const skin={tags:[{id:'s1',text:'scar on left arm',section:''}],selections:{arms:['s1']},sections:[]};
const initialNsfw={nsfwChest:'small areolae',nsfwLowerFront:'natural pubic hair',nsfwLowerBack:'lower back scar'};

test('Three mode catalogues survive normalization without merging or moving content',()=>{
 const state=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
 assert.deepEqual(state.modes.base.tags.map(x=>x.text),['freckles','long blonde hair','blue eyes']);
 assert.deepEqual(state.modes.skin.tags.map(x=>x.text),['scar on left arm']);
 assert.deepEqual(state.modes.nsfw.tags.map(x=>x.text),['small areolae','natural pubic hair','lower back scar']);
 const saved=normalizeAppearanceCatalog({...state,tags:[],sections:[]},base,skin,initialNsfw);
 assert.deepEqual(saved.modes.skin.tags.map(x=>x.text),['scar on left arm']);
 assert.deepEqual(saved.modes.nsfw.tags.map(x=>x.text),['small areolae','natural pubic hair','lower back scar']);
 assert.deepEqual(Object.keys(NSFW_PRESETS),['nsfwChest','nsfwLowerFront','nsfwLowerBack']);
 assert.ok(Object.hasOwn(SKIN_PRESETS,'upper_front') && Object.hasOwn(SKIN_PRESETS,'lower_back'));
});

test('Physical ← → movement respects the actual position, even across dividers',()=>{
 const state={tags:[{id:'a',text:'A'},{id:'b',text:'B'},{id:'c',text:'C'}],
 sections:[{id:'first',title:'First',before:0},{id:'second',title:'Second',before:2}]};
 const left=repositionModeTag(state,'c','left');
 assert.deepEqual(left.tags.map(t=>t.id),['a','c','b']);
 assert.equal(left.sections[1].before,2);
 const right=repositionModeTag(state,'b','right');
 assert.deepEqual(right.tags.map(t=>t.id),['a','c','b']);
 assert.equal(right.sections[1].before,2);
 assert.equal(sectionTagCount(state,'first'),2);
 assert.equal(sectionTagCount(state,'second'),1);
});

test('↑ ↓ sends the tag to the adjacent visual divider section',()=>{
 const state={tags:[{id:'a',text:'A'},{id:'b',text:'B'},{id:'c',text:'C'},{id:'d',text:'D'}],
 sections:[{id:'s1',title:'Section 1',before:0},{id:'s2',title:'Section 2',before:2},{id:'s3',title:'Section 3',before:3}]};
 const down=repositionModeTag(state,'a','down');
 assert.deepEqual(down.tags.map(t=>t.id),['b','a','c','d']);
 assert.equal(sectionTagCount(down,'s2'),2);
 const up=repositionModeTag(state,'d','up');
 assert.deepEqual(up.tags.map(t=>t.id),['a','b','c','d']);
 assert.equal(sectionTagCount(up,'s2'),2);
 assert.equal(sectionTagCount(up,'s3'),0);
 assert.equal(repositionModeTag(state,'a','up'),null);
 assert.equal(repositionModeTag(state,'d','down'),null);
});

test('Existing nudeUpper/lower text survives without automatic anatomy guessing',()=>{
 const raw={tags:[{id:'legacy',text:'unused custom tag'}],sections:[]};
 const result=normalizeAppearanceModeCatalog(raw,base,skin,{nudeUpper:'old chest and abdomen',nudeLower:'old genital traits'},[]);
 assert.equal(result.modes.nsfw.tags.length,0);
 assert.ok(result.modes.base.tags.some(x=>x.text==='unused custom tag'));
});

function makeUI(){
 class E{
  constructor(type,text='',parent=null,name=''){this.type=type;this.textContent=text||'';this.value='';this.className=name||'';this.parentElement=parent;this.children=[];this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.attributes={};this.eventListeners={};this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(' ').filter(n=>!names.includes(n)).join(' ');}};}
  appendChild(child){child.parentElement=this;this.children.push(child);return child}
  insertBefore(child,before){if(child.parentElement){const at=child.parentElement.children.indexOf(child);if(at>=0)child.parentElement.children.splice(at,1);}const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,child);child.parentElement=this;return child}
  setAttribute(name,value){this.attributes[name]=String(value)}
  addEventListener(name,fn){this.eventListeners[name]=fn}
  querySelector(selector){const all=this.querySelectorAll(selector);return all[0]||null}
  querySelectorAll(selector){const pool=[];function walk(root){for(const child of root.children){pool.push(child);walk(child)}}walk(this);if(selector.startsWith('.'))return pool.filter(x=>x.className.split(' ').includes(selector.slice(1)));if(selector==='[data-group-name]')return pool.filter(x=>x.attributes['data-group-name']!==undefined);return pool.filter(x=>x.type===selector)}
  focus(){}
  select(){}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  contains(target){for(let p=target;p;p=p.parentElement)if(p===this)return true;return false}
  closest(selector){for(let p=this;p;p=p.parentElement)if(selector.startsWith('.')&&p.className.split(' ').includes(selector.slice(1)))return p;return null}
  getBoundingClientRect(){return {top:0,bottom:200,left:0,right:300,width:100,height:40}}
  setPointerCapture(){}
 }
 const parent=new E('div');
 const el=(type,text,p=undefined,name='')=>{const node=new E(type,text,p||null,name);if(p)p.appendChild(node);return node};
 const button=(text,p,fn,name='')=>{const node=el('button',text,p,'ness-button '+name);node.onclick=fn;return node};
 const input=()=>el('input');
 const clear=node=>{node.children=[]};
 return {parent,el,button,input,clear};
}
test('Inline highlight board folds sections, preserves NSFW/source isolation and supports undo',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:parseBaseTags(base).filter(x=>x.text==='blue eyes')}};
 let nsfw={...initialNsfw};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{
   modes:normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]).modes
  },initialSections:[],
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  readNsfwState:()=>nsfw,writeNsfwState:next=>{nsfw=next;},
  changed:()=>{},readOnly:()=>false
 });
 assert.ok(board.element);
 const switchMode=(label)=>board.element.querySelectorAll('button').find(b=>b.textContent===label);
 assert.ok(switchMode('Ракурсы'));
 assert.ok(switchMode('Под одеждой'));
 assert.ok(switchMode('NSFW'));
 switchMode('NSFW').onclick();
 assert.equal(board.getMode(),'nsfw');
 const tags=board.element.querySelectorAll('.ness-unified-chip');
 assert.equal(tags.length,3);
 const earlierBase=state.base;
 const earlierSkin=JSON.stringify(board.getSkin());
 const active=tags.find(b=>b.textContent.includes('small areolae'));
 active.onclick();
 assert.equal(nsfw.nsfwChest,'');
 assert.equal(state.base,earlierBase);
 assert.equal(JSON.stringify(board.getSkin()),earlierSkin);
 board.undo();
 assert.equal(nsfw.nsfwChest,'small areolae');
});
test('The primary character editor mounts the inline board without opening a constructor popup',()=>{
 const src=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 const editor=src.slice(src.indexOf('function editCharacter(id,group)'),src.indexOf('guideOpenFirstRecord =',src.indexOf('function editCharacter(id,group)')));
 assert.match(editor,/const inlineBoard=createAppearanceBoard/);
 assert.match(editor,/view\.help\(identityCard,'Иконка персонажа',emblem\)/,
  'Opening a card must use the help method returned from createLibraryView');
 assert.doesNotMatch(editor,/\bui\./,
  'The editor cannot reference a UI-kit variable scoped inside createLibraryView');
 assert.match(editor,/wheelAlongX:view\.wheelAlongX/,
  'The tag board must share wheel scrolling with the library UI');
 assert.doesNotMatch(editor,/◫ Открыть конструктор/);
 assert.match(src,/entry\.appearanceCatalog=catalog/);
 assert.match(src,/nsfwChest|Object\.keys\(NSFW_PRESETS\)/);
 const director=readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
 assert.match(director,/nsfwChest.*Chest anatomy/);
 assert.match(director,/nsfwLowerFront.*Lower front anatomy/);
 assert.match(director,/nsfwLowerBack.*Lower rear anatomy/);
});


test('A divider folds without clearing highlighted selections, and shows its tag count',()=>{
 const ui=makeUI();
 const existing=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]).modes;
 existing.base.sections=[{id:'g1',title:'Face',before:0},{id:'g2',title:'Other',before:2}];
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{modes:existing},
  initialSections:[],readBaseState:()=>state,writeBaseState:next=>{state=next;},
  readNsfwState:()=>initialNsfw,writeNsfwState:()=>{},changed:()=>{},readOnly:()=>false
 });
 const buttons=()=>board.element.querySelectorAll('button');
 let heading=buttons().find(b=>/Face · 2 тега/.test(b.textContent));
 assert.ok(heading, 'The heading should include its count of two tags');
 assert.equal(heading.attributes['aria-expanded'],'true');
 const before=JSON.stringify(state.selections);
 heading.onclick();
 heading=buttons().find(b=>/Face · 2 тега/.test(b.textContent));
 assert.equal(heading.attributes['aria-expanded'],'false');
 assert.equal(JSON.stringify(state.selections),before);
 const folded=board.element.querySelectorAll('.ness-unified-section-tags');
 assert.equal(folded[1].hidden,true);
 heading.onclick();
 assert.equal(board.element.querySelectorAll('.ness-unified-section-tags')[1].hidden,false);
});

test('Long-lived mode state tracks independent dividers and tag assignment',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 let nsfw={...initialNsfw};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  readNsfwState:()=>nsfw,writeNsfwState:next=>{nsfw=next;},changed:()=>{},readOnly:()=>false
 });
 const button=label=>board.element.querySelectorAll('button').find(b=>b.textContent===label);
 button('Под одеждой').onclick();
 const untouched=state.base;
 const beginNsfw=JSON.stringify(nsfw);
 const edit=button('✎');
 edit.onclick();
 button('＋ Новый раздел').onclick();
 const group=board.element.querySelector('[data-group-name]');
 group.value='Татуировки';
 button('Создать').onclick();
 let saved=board.getCatalog();
 assert.equal(saved.modes.skin.sections.at(-1).title,'Татуировки');
 assert.equal(saved.modes.base.sections.length,0);
 assert.equal(saved.modes.nsfw.sections.length,0);
 const plus=board.element.querySelector('.ness-tagboard-add-plus');
 plus.onclick();
 const create=board.element.querySelector('.ness-tagboard-inline-add-input');
 create.value='flower tattoo on right arm';
 create.onkeydown({key:'Enter',preventDefault(){}});
 assert.ok(board.getSkin().tags.some(t=>t.text==='flower tattoo on right arm'));
 assert.equal(state.base,untouched);
 assert.equal(JSON.stringify(nsfw),beginNsfw);
 saved=board.getCatalog();
 assert.ok(saved.modes.skin.tags.some(t=>t.text==='flower tattoo on right arm'));
 button('NSFW').onclick();
 assert.ok(board.getCatalog().modes.skin.sections.length===1);
});


test('Selecting an appearance tag retains the same catalogue nodes and scroll position',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const flow=board.element.querySelector('.ness-unified-tagflow');
 const left=board.element.querySelector('.ness-unified-chip');
 flow.scrollTop=130;
 left.onclick();
 assert.strictEqual(board.element.querySelector('.ness-unified-tagflow'),flow,'Tag click must not replace the catalogue DOM');
 assert.equal(flow.scrollTop,130,'Scroll remains on the same tags');
 assert.equal(board.element.querySelectorAll('.ness-tagboard-chosen-chip').length,1);
});

test('Two-column selection toggles from both the left and right, without losing other camera choices',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]],head:[parseBaseTags(base)[2]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const chip=name=>board.element.querySelectorAll('.ness-unified-chip').find(b=>b.textContent.includes(name));
 assert.equal(board.element.querySelectorAll('.ness-tagboard-chosen-chip').length,1);
 chip('freckles').onclick();
 assert.equal(board.element.querySelectorAll('.ness-tagboard-chosen-chip').length,0);
 assert.equal(state.selections.face.length,0);
 chip('freckles').onclick();
 assert.equal(board.element.querySelectorAll('.ness-tagboard-chosen-chip').length,1);
 assert.ok(state.selections.face.some(t=>t.text==='freckles'));
 const rightRemove=board.element.querySelector('.ness-tagboard-chosen-chip');
 rightRemove.onclick();
 assert.equal(board.element.querySelectorAll('.ness-tagboard-chosen-chip').length,0);
 assert.ok(state.selections.head.some(t=>t.text==='blue eyes'),'Other camera assignments survive');
});

test('Pencil renames tag text in-place, retaining the catalog ID and camera selection offsets',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]],head:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const initial=board.getCatalog().modes.base.tags.find(t=>t.text==='freckles').id;
 board.element.querySelectorAll('button').find(b=>b.textContent==='✎').onclick();
 const inputs=board.element.querySelectorAll('.ness-tagboard-rename-input');
 assert.equal(inputs.length,3,'Every visible tag becomes an editable field');
 const field=inputs.find(e=>e.value==='freckles');
 field.value='freckles across nose';field.onchange();
 assert.equal(board.getCatalog().modes.base.tags.find(t=>t.text==='freckles across nose').id,initial);
 assert.ok(state.selections.face.some(t=>t.text==='freckles across nose'));
 assert.ok(state.selections.head.some(t=>t.text==='freckles across nose'));
 assert.ok(state.base.includes('freckles across nose'));
});

test('Text editing of skin/NSFW keeps assignments and cannot change base prose format',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 let nsfw={...initialNsfw};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  readNsfwState:()=>nsfw,writeNsfwState:next=>{nsfw=next;},
  changed:()=>{},readOnly:()=>false
 });
 const click=name=>board.element.querySelectorAll('button').find(b=>b.textContent===name).onclick();
 click('Под одеждой');
 assert.equal(board.setModeLayout('prose'),true);
 let area=board.element.querySelectorAll('textarea')[0];
 assert.ok(area.value.includes('scar on left arm'));
 area.value=area.value.replace('scar on left arm','thin scar across left arm');
 click('Применить к тегам');
 assert.ok(board.getSkin().tags.some(t=>t.id==='s1'&&t.text==='thin scar across left arm'));
 assert.deepEqual(board.getSkin().selections.arms,['s1']);
 click('NSFW');
 assert.equal(board.setModeLayout('prose'),true);
 area=board.element.querySelectorAll('textarea')[0];
 area.value=area.value.replace('small areolae','small rounded areolae');
 click('Применить к тегам');
 assert.ok(nsfw.nsfwChest.includes('small rounded areolae'));
 assert.ok(board.getCatalog().modes.nsfw.tags.some(t=>t.text==='small rounded areolae'));
 assert.equal(state.base,base);
 click('Ракурсы');
 assert.equal(board.element.querySelectorAll('.ness-unified-chip').length,3,'Base is still in Tags mode');
});

test('Move-mode arrows reorder actual base tags and preserve camera selections without a grip',()=>{
 const ui=makeUI(),preset=parseBaseTags(base);
 let state={base,ranges:[],selections:{face:[preset[0]],head:[preset[0]]}};
 const catalog=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
 catalog.modes.base.sections=[{id:'g1',title:'Лицо',before:0},{id:'g2',title:'Остальное',before:2}];
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:skin,initialCatalog:catalog,
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 assert.equal(board.element.querySelectorAll('.ness-tagboard-grip').length,0);
 const move=board.element.querySelectorAll('.ness-tagboard-tool').find(b=>b.textContent==='✥');
 move.onclick();assert.equal(move.attributes['aria-pressed'],'true');
 board.element.querySelectorAll('.ness-unified-chip')[0].onclick();
 const arrows=board.element.querySelectorAll('.ness-tagboard-move-arrow');
 const right=arrows.find(b=>b.textContent==='→');
 right.onclick();
 right.onclick();
 assert.deepEqual(parseBaseTags(state.base).map(x=>x.text),['long blonde hair','blue eyes','freckles']);
 assert.ok(state.selections.face.some(x=>x.text==='freckles'));
 assert.ok(state.selections.head.some(x=>x.text==='freckles'));
 assert.equal(board.element.querySelectorAll('.ness-unified-tag-row').find(row=>row.dataset.moveSelected==='true').dataset.tagId,
  board.getCatalog().modes.base.tags.find(x=>x.text==='freckles').id);
 board.undo();
 assert.deepEqual(parseBaseTags(state.base).map(x=>x.text),['long blonde hair','freckles','blue eyes']);
});

test('Transfer mode opens on click, moves across modes, and Undo reverses the transfer',()=>{
 const ui=makeUI();let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 const id=board.getCatalog().modes.base.tags.find(t=>t.text==='freckles').id;
 const originalWindow=globalThis.window,originalConfirm=globalThis.confirm;
 globalThis.window={innerHeight:900};globalThis.confirm=()=>true;
 try{
  const move=board.element.querySelectorAll('.ness-tagboard-tool').find(b=>b.textContent==='⇄');
  move.onclick();
  const chip=board.element.querySelectorAll('.ness-unified-chip').find(b=>b.textContent.includes('freckles'));
  assert.equal(chip.parentElement.oncontextmenu,undefined);
  chip.onclick();
  const menu=board.element.querySelector('.ness-tagboard-context-menu');
  assert.ok(menu.querySelectorAll('button').some(b=>b.textContent==='Под одеждой'));
  menu.querySelectorAll('button').find(b=>b.textContent==='Под одеждой').onclick();
  assert.equal(board.getMode(),'skin');
  const moved=board.getCatalog().modes.skin.tags.find(t=>t.text==='freckles');
  assert.ok(moved);
  assert.equal(moved.id,id);
  assert.equal(board.getToolMode(),'transfer');
  assert.equal(menu.hidden,true);
  assert.equal(board.element.querySelectorAll('.ness-unified-tag-row').find(r=>r.dataset.tagId===id).dataset.moveSelected,'true');
  assert.ok(!parseBaseTags(state.base).some(t=>t.text==='freckles'));
  board.undo();
  assert.equal(board.getMode(),'base');
  assert.ok(parseBaseTags(state.base).some(t=>t.text==='freckles'));
  assert.ok(state.selections.face.some(t=>t.text==='freckles'));
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalConfirm===undefined)delete globalThis.confirm;else globalThis.confirm=originalConfirm;
 }
});

test('Selecting and unselecting tags does not jump either scrollable column to the top',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 board.element.querySelector('.ness-unified-tagflow').scrollTop=94;
 board.element.querySelector('.ness-tagboard-chosen-list').scrollTop=23;
 board.element.querySelectorAll('.ness-unified-chip').find(b=>b.textContent.includes('long blonde hair')).onclick();
 assert.equal(board.element.querySelector('.ness-unified-tagflow').scrollTop,94);
 assert.equal(board.element.querySelector('.ness-tagboard-chosen-list').scrollTop,23);
});

test('Library import/export validation roundtrips modes, camera marks and original NSFW text',()=>{
 const helpers=createSpImagenLibraryRuntime({}).utilities;
 const modeState=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]).modes;
 modeState.base.sections=[{id:'face',title:'Лицо',before:1}];
 modeState.skin.sections=[{id:'scars',title:'Шрамы',before:0}];
 modeState.nsfw.sections=[{id:'detail',title:'Анатомия',before:0}];
 const record={name:'Джи',base,appearanceFormat:'tags',
  appearanceRanges:[],appearanceSelections:{face:[parseBaseTags(base)[2]]},
  appearanceSkin:skin,appearanceCatalog:{modes:modeState,tags:[],sections:[]},
  nudeUpper:'legacy bust, stomach\n',nudeLower:'legacy lower anatomy\n',
  nsfwChest:initialNsfw.nsfwChest,
  nsfwLowerFront:initialNsfw.nsfwLowerFront,
  nsfwLowerBack:initialNsfw.nsfwLowerBack
 };
 const doc={version:1,personas:{},characters:{ji:record}};
 const stored=helpers.validateMasterLibrary(doc);
 const reimported=helpers.validateMasterLibrary(JSON.parse(JSON.stringify(stored)));
 const ji=reimported.characters.ji;
 assert.equal(ji.nudeUpper,undefined);
 assert.equal(ji.nudeLower,undefined);
 const upper=ji.appearanceSkin.tags.filter(t=>(ji.appearanceSkin.selections.upper_front||[]).includes(t.id)).map(t=>t.text);
 const lower=ji.appearanceSkin.tags.filter(t=>(ji.appearanceSkin.selections.lower_front||[]).includes(t.id)).map(t=>t.text);
 assert.deepEqual(upper,[]);
 assert.deepEqual(lower,[]);
 for(const tag of ['legacy bust','stomach','legacy lower anatomy'])assert.ok(ji.appearanceCatalog.modes.skin.tags.some(t=>t.text===tag));
 assert.deepEqual([ji.nsfwChest,ji.nsfwLowerFront,ji.nsfwLowerBack],Object.values(initialNsfw));
 assert.equal(ji.appearanceCatalog.modes.base.sections[0].title,'Лицо');
 assert.equal(ji.appearanceCatalog.modes.skin.sections[0].title,'Шрамы');
 assert.equal(ji.appearanceCatalog.modes.nsfw.sections[0].title,'Анатомия');
 assert.ok(ji.appearanceSkin.selections.arms.includes('s1'));
 assert.ok(ji.appearanceSelections.face?.length);
});


test('Toolbar modes are mutually exclusive, deleting a tag is undoable, and historic selections survive',()=>{
 const ui=makeUI();let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]],head:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 const buttons=board.element.querySelectorAll('.ness-tagboard-tool');
 const pencil=buttons.find(x=>x.textContent==='✎'),trash=buttons.find(x=>x.textContent==='🗑'),move=buttons.find(x=>x.textContent==='✥');
 assert.equal(buttons.length,4);
 pencil.onclick();
 assert.equal(board.getToolMode(),'edit');
 assert.equal(board.element.querySelectorAll('.ness-tagboard-rename-input').length,3);
 trash.onclick();
 assert.equal(board.getToolMode(),'delete');
 assert.equal(pencil.attributes['aria-pressed'],'false');
 assert.equal(trash.attributes['aria-pressed'],'true');
 assert.equal(board.element.querySelectorAll('.ness-tagboard-rename-input').length,0);
 const chip=board.element.querySelectorAll('.ness-unified-chip').find(x=>x.textContent.includes('freckles'));
 chip.onclick();
 assert.equal(parseBaseTags(state.base).length,2);
 assert.ok(!state.selections.face.some(x=>x.text==='freckles'));
 board.undo();
 assert.equal(parseBaseTags(state.base).length,3);
 assert.ok(state.selections.face.some(x=>x.text==='freckles'));
 assert.ok(state.selections.head.some(x=>x.text==='freckles'));
 move.onclick();
 assert.equal(board.getToolMode(),'move');
 assert.equal(trash.attributes['aria-pressed'],'false');
 assert.equal(move.attributes['aria-pressed'],'true');
 move.onclick();
 assert.equal(board.getToolMode(),'');
 assert.equal(move.attributes['aria-pressed'],'false');
});

test('Local + adds into exact section, preserving source order and camera offsets with undo/redo',()=>{
 const ui=makeUI(),catalog=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
 catalog.modes.base.sections=[{id:'first',title:'Face',before:0},{id:'second',title:'Eyes',before:2}];
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]],head:[parseBaseTags(base)[2]]}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialCatalog:catalog,initialSkin:skin,
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 assert.equal(board.element.querySelectorAll('.ness-tagboard-add-plus').length,2);
 board.element.querySelectorAll('.ness-tagboard-add-plus')[0].onclick();
 const input=board.element.querySelector('.ness-tagboard-inline-add-input');
 input.value='pretty eyelashes';input.onkeydown({key:'Enter',preventDefault(){}});
 assert.deepEqual(parseBaseTags(state.base).map(x=>x.text),
  ['freckles','long blonde hair','pretty eyelashes','blue eyes']);
 assert.equal(sectionTagCount(board.getCatalog().modes.base,'first'),3);
 assert.equal(sectionTagCount(board.getCatalog().modes.base,'second'),1);
 assert.ok(state.selections.face.some(x=>x.text==='freckles'));
 assert.ok(state.selections.head.some(x=>x.text==='blue eyes'));
 board.undo();
 assert.deepEqual(parseBaseTags(state.base).map(x=>x.text),['freckles','long blonde hair','blue eyes']);
 board.redo();
 assert.ok(state.base.includes('pretty eyelashes'));
});

test('No-divider mode exposes a tiny + at both beginning and end, with no large input form',()=>{
 const ui=makeUI();let state={base,ranges:[],selections:{face:[]}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialCatalog:{},initialSkin:skin,
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 assert.equal(board.element.querySelectorAll('.ness-tagboard-add-plus').length,2);
 assert.equal(board.element.querySelectorAll('.ness-unified-add').length,0);
 const add=(index,value)=>{
  board.element.querySelectorAll('.ness-tagboard-add-plus')[index].onclick();
  const field=board.element.querySelector('.ness-tagboard-inline-add-input');
  field.value=value;field.onkeydown({key:'Enter',preventDefault(){}});
 };
 add(0,'soft rosy cheeks');
 add(1,'sunlit eyes');
 assert.equal(parseBaseTags(state.base)[0].text,'soft rosy cheeks');
 assert.equal(parseBaseTags(state.base).at(-1).text,'sunlit eyes');
});

test('Within-mode move-to-section repositions the selected chip without altering its assignments',()=>{
 const ui=makeUI(),catalog=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
 catalog.modes.base.sections=[{id:'first',title:'Face',before:0},{id:'second',title:'Eyes',before:2}];
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]],head:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialCatalog:catalog,initialSkin:skin,
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 const oldWindow=globalThis.window;globalThis.window={innerHeight:900};
 try{
  board.element.querySelectorAll('.ness-tagboard-tool').find(b=>b.textContent==='⇄').onclick();
  const row=board.element.querySelectorAll('.ness-unified-tag-row').find(x=>x.dataset.tagId===board.getCatalog().modes.base.tags[0].id);
  row.querySelector('.ness-unified-chip').onclick();
  const popup=board.element.querySelector('.ness-tagboard-context-menu');
  popup.querySelectorAll('button').find(x=>x.textContent==='Ракурсы · текущий').onclick();
  popup.querySelectorAll('button').find(x=>x.textContent==='Eyes').onclick();
  assert.equal(sectionTagCount(board.getCatalog().modes.base,'first'),1);
  assert.equal(sectionTagCount(board.getCatalog().modes.base,'second'),2);
  assert.ok(state.selections.face.some(x=>x.text==='freckles'));
  assert.ok(state.selections.head.some(x=>x.text==='freckles'));
  assert.equal(board.element.querySelectorAll('.ness-unified-tag-row').find(x=>x.dataset.moveSelected==='true').dataset.tagId,row.dataset.tagId);
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

test('History buttons are docked into a sticky shared appearance toolbar, not duplicated',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const lib=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 assert.match(css,/\.ness-tagboard-controls\{\s*position:sticky;top:0/);
 assert.match(lib,/inlineBoard\.historyHost\.append\(historyUndo,historyRedo\)/);
 const ui=makeUI();let state={base,ranges:[],selections:{}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false});
 assert.ok(board.element.querySelector('.ness-tagboard-tools'));
 assert.ok(board.historyHost);
 assert.equal(board.element.querySelectorAll('.ness-tagboard-grip').length,0);
});


test('Figure pin and peek leave the original selectors in the sticky header without changing tag state',()=>{
 const ui=makeUI(),initial={base,ranges:[],selections:{}};
 let changes=0,last=null;
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>initial,writeBaseState:()=>{throw Error('Pinning attempted to save character appearance');},
  readNsfwState:()=>initialNsfw,writeNsfwState:()=>{throw Error('Pinning attempted to save NSFW descriptions');},
  changed:()=>{changes++;},readOnly:()=>false,
  onHelpChange:(pinned,peek)=>{last=[pinned,peek];}
 });
 const figure=board.element.querySelector('.ness-figure-hint');
 const modes=board.element.querySelector('.ness-tagboard-modes');
 const ribbon=board.element.querySelector('.ness-tagboard-ribbon');
 assert.ok(figure&&modes&&ribbon,'One figure and original mode/preset controls exist');
 const controls=board.element.querySelector('.ness-tagboard-controls');
 assert.ok(controls&&figure.querySelector('.ness-figure-legend'));
 assert.equal(controls.children[0].className,'ness-tagboard-tools');
 assert.equal(modes.parentElement,controls);
 assert.equal(ribbon.parentElement,controls);
 assert.equal(board.getHintPinned(),false);
 assert.equal(figure.hidden,true);
 board.setHintPinned(true);
 assert.equal(board.getHintPinned(),true);
 assert.deepEqual(last,[true,false]);
 assert.equal(figure.hidden,false);
 assert.equal(modes.parentElement,controls);
 assert.equal(ribbon.parentElement,controls);
 board.toggleHintPeek(); // When pinned, clicking the bulb unpins the same card.
 assert.equal(board.getHintPinned(),false);
 assert.equal(modes.parentElement,controls);
 assert.equal(ribbon.parentElement,controls);
 board.toggleHintPeek();
 assert.equal(board.isHintPeek(),true);
 assert.equal(figure.hidden,false);
 assert.equal(modes.parentElement,controls,'Temporary hint keeps original controls outside');
 board.toggleHintPeek();
 assert.deepEqual(last,[false,false]);
 assert.equal(figure.hidden,true);
 assert.equal(changes,0,'Help must not save or change any tag');
 assert.equal(initial.base,base);
});


test('Switching camera presets reuses the same ribbon and keeps horizontal, catalogue and per-preset chosen scroll',()=>{
 const ui=makeUI(),tags=parseBaseTags(base);
 let state={base,ranges:[],selections:{always:[tags[0]],face:[tags[1]],head:[tags[2]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const ribbon=board.element.querySelector('.ness-tagboard-ribbon');
 const buttons=()=>ribbon.querySelectorAll('.ness-button');
 const preset=id=>buttons().find(x=>x.dataset.presetId===id);
 const flow=board.element.querySelector('.ness-unified-tagflow');
 const chosen=board.element.querySelector('.ness-tagboard-chosen-list');
 assert.equal(preset('face').dataset.selectedCount,'2','Face receives its own and Always tags');
 assert.equal(preset('head').dataset.selectedCount,'2','Head receives its own and Always tags');
 assert.equal(preset('full_front').dataset.selectedCount,'1','Shared Always counts toward other presets');
 assert.equal(preset('face').dataset.filled,'true');
 assert.equal(preset('face').attributes['aria-pressed'],'true');
 ribbon.scrollLeft=235;flow.scrollTop=147;chosen.scrollTop=31;
 preset('head').onclick();
 assert.strictEqual(board.element.querySelector('.ness-tagboard-ribbon'),ribbon,'Click must not rebuild the camera ribbon');
 assert.strictEqual(board.element.querySelector('.ness-unified-tagflow'),flow,'Click must not rebuild the tag catalogue');
 assert.equal(ribbon.scrollLeft,235,'Keep the scrolled-to camera in view');
 assert.equal(flow.scrollTop,147,'Keep tag catalogue at its previous location');
 assert.equal(chosen.scrollTop,0,'Unvisited chosen preset starts at the top');
 assert.equal(preset('head').attributes['aria-pressed'],'true');
 assert.equal(preset('face').attributes['aria-pressed'],'false');
 chosen.scrollTop=9;
 preset('face').onclick();
 assert.equal(chosen.scrollTop,31,'Returning to a preset restores its chosen tag scroll');
 assert.equal(ribbon.scrollLeft,235);
 assert.equal(preset('face').attributes['aria-pressed'],'true');
 preset('always').onclick();
 assert.match(board.element.querySelector('.ness-tagboard-right-hint').textContent,/во всех ракурсах/);
 preset('face').onclick();
 assert.match(board.element.querySelector('.ness-tagboard-right-hint').textContent,/Слева — добавить/);
 preset('face').onclick();
 assert.equal(ribbon.scrollLeft,235,'Clicking already active preset is a no-op');
 board.setHintPinned(true);
 assert.strictEqual(board.element.querySelector('.ness-tagboard-ribbon'),ribbon);
 assert.equal(ribbon.scrollLeft,235,'Pinning the hint preserves the camera position');
 board.setHintPinned(false);
 assert.equal(ribbon.scrollLeft,235,'Unpinning keeps the same ribbon position');
});

test('Ribbon keeps independent scroll positions through mode switches, rebuilds, and restores current fill counts',()=>{
 const ui=makeUI(),tags=parseBaseTags(base);
 let state={base,ranges:[],selections:{face:[tags[0]]}};
 let nsfw={...initialNsfw};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  readNsfwState:()=>nsfw,writeNsfwState:next=>{nsfw=next;},
  changed:()=>{},readOnly:()=>false
 });
 const modes=board.element.querySelector('.ness-tagboard-modes');
 const chooseMode=label=>modes.querySelectorAll('.ness-button').find(x=>x.textContent===label).onclick();
 const ribbon=()=>board.element.querySelector('.ness-tagboard-ribbon');
 const count=id=>ribbon().querySelectorAll('.ness-button').find(b=>b.dataset.presetId===id)?.dataset.selectedCount;
 ribbon().scrollLeft=192;
 board.element.querySelector('.ness-unified-tagflow').scrollTop=97;
 chooseMode('Под одеждой');
 assert.equal(count('arms'),'1');
 assert.equal(count('always'),'0');
 ribbon().scrollLeft=73;
 board.element.querySelector('.ness-unified-tagflow').scrollTop=63;
 chooseMode('NSFW');
 assert.equal(count('nsfwChest'),'1');
 assert.equal(count('nsfwLowerFront'),'1');
 assert.equal(count('nsfwLowerBack'),'1');
 const current=ribbon();
 current.scrollLeft=64;
 const chest=board.element.querySelectorAll('.ness-unified-chip').find(x=>x.textContent.includes('small areolae'));
 chest.onclick();
 assert.strictEqual(ribbon(),current,'Selecting/removing NSFW tags does not rebuild the ribbon');
 assert.equal(current.scrollLeft,64);
 assert.equal(count('nsfwChest'),'0','Removing the last NSFW tag clears its count');
 assert.equal(current.querySelectorAll('.ness-button').find(b=>b.dataset.presetId==='nsfwChest').dataset.filled,'false');
 board.undo();
 assert.equal(count('nsfwChest'),'1','Undo updates count from actual restored fields');
 assert.equal(ribbon().scrollLeft,64,'Undo does not reset the ribbon');
 chooseMode('Под одеждой');
 assert.equal(ribbon().scrollLeft,73,'Skin ribbon returns to its previous horizontal position');
 assert.equal(board.element.querySelector('.ness-unified-tagflow').scrollTop,63);
 chooseMode('Ракурсы');
 assert.equal(ribbon().scrollLeft,192,'Base ribbon returns to its previous horizontal position');
 assert.equal(board.element.querySelector('.ness-unified-tagflow').scrollTop,97);
 assert.equal(count('face'),'1');
});

test('Tag assignment refresh updates counts without changing the ribbon or existing tag rows',()=>{
 const ui=makeUI();
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}};
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:skin,initialCatalog:{},
  readBaseState:()=>state,writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const ribbon=board.element.querySelector('.ness-tagboard-ribbon');
 const button=ribbon.querySelectorAll('.ness-button').find(b=>b.dataset.presetId==='face');
 const tag=board.element.querySelectorAll('.ness-unified-chip').find(x=>x.textContent.includes('long blonde hair'));
 assert.equal(button.dataset.selectedCount,'1');
 ribbon.scrollLeft=115;
 tag.onclick();
 assert.equal(button.dataset.selectedCount,'2');
 assert.equal(ribbon.scrollLeft,115);
 assert.strictEqual(board.element.querySelector('.ness-tagboard-ribbon'),ribbon);
 tag.onclick();
 assert.equal(button.dataset.selectedCount,'1');
 assert.equal(button.dataset.filled,'true');
});


test('Imported repeated zero-width/format-control tag variants share one ID without moving dividers or changing source text',()=>{
 const name='skinToTAIL: long thick muscular tail';
 const raw={modes:{
  base:{tags:[{id:'first',text:name},{id:'second',text:'skinTo\u200BTAIL: long thick muscular tail'},{id:'third',text:'blue eyes'}],
   sections:[{id:'tail',title:'Tail features',before:2},{id:'eyes',title:'Eyes',before:3}]},
  skin:{tags:[],sections:[]},nsfw:{tags:[],sections:[]}
 },tags:[{id:'legacy',text:'unassigned archived note'}],sections:[]};
 const before=JSON.stringify(raw);
 const normalized=normalizeAppearanceModeCatalog(raw,'blue eyes',{tags:[],sections:[],selections:{}},{},[]);
 assert.deepEqual(normalized.modes.base.tags,[{id:'first',text:name},{id:'third',text:'blue eyes'}]);
 assert.deepEqual(normalized.modes.base.sections,[{id:'tail',title:'Tail features',before:1},{id:'eyes',title:'Eyes',before:2}]);
 assert.equal(JSON.stringify(raw),before,'Normalizing the view never mutates a saved catalogue');
 const catalogue=normalizeAppearanceCatalog(raw,'blue eyes',{tags:[],sections:[],selections:{}},{},[]);
 assert.deepEqual(catalogue.tags,raw.tags,'Modern shared legacy pool stays untouched for lossless export');
 assert.ok(!catalogue.modes.base.tags.some(t=>t.text==='unassigned archived note'),
  'Retired shared-pool entries must not be silently reimported as new base tags');
});

test('Hundreds of base tags are indexed once per paint and selection, without re-parsing for every visible chip',()=>{
 const ui=makeUI(),values=Array.from({length:250},(_,i)=>'feature '+String(i).padStart(3,'0'));
 const baseText=values.join(', '),parsed=parseBaseTags(baseText);
 let state={base:baseText,ranges:[],selections:{face:parsed.filter((_,i)=>i%12===0)}};
 let reads=0;
 const board=createAppearanceBoard({
  ui,parent:ui.parent,initialSkin:{tags:[],sections:[],selections:{}},initialCatalog:{},
  readBaseState:()=>{reads++;return state;},writeBaseState:next=>{state=next;},
  changed:()=>{},readOnly:()=>false
 });
 const rows=board.element.querySelectorAll('.ness-unified-tag-row');
 assert.equal(rows.length,250);
 assert.ok(reads<120,'Initial paint must read the source in batches, not once for each chip ('+reads+' reads)');
 const first=rows.find(row=>row.querySelector('.ness-unified-chip')?.textContent.includes('feature 100'));
 const flow=board.element.querySelector('.ness-unified-tagflow'),chosen=board.element.querySelector('.ness-tagboard-chosen-list');
 flow.scrollTop=470;chosen.scrollTop=39;
 const prior=reads;
 first.querySelector('.ness-unified-chip').onclick();
 assert.ok(reads-prior<120,'Toggling one tag must not reparse all 250 tags ('+(reads-prior)+' reads)');
 assert.strictEqual(board.element.querySelector('.ness-unified-tagflow'),flow);
 assert.equal(flow.scrollTop,470);
 assert.equal(chosen.scrollTop,39);
 assert.ok(state.selections.face.some(x=>x.text==='feature 100'));
 const search=board.element.querySelector('.ness-tagboard-search');
 search.value='feature 249';search.oninput();
 assert.equal(rows.filter(row=>!row.hidden).length,1);
 assert.equal(rows.find(row=>!row.hidden).dataset.tagId,board.getCatalog().modes.base.tags[249].id);
 assert.equal(board.getCatalog().modes.base.tags.length,250);
});

test('A previously hidden duplicate skin assignment is shown and can be removed through the actual editor',()=>{
 const ui=makeUI(),raw={tags:[{id:'first',text:'tiny scar;'},{id:'second',text:'tiny scar'}],selections:{upper_front:['second'],arms:['first']},sections:[]};
 let state={base,ranges:[],selections:{}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:raw,initialCatalog:{},readBaseState:()=>state,writeBaseState:next=>{state=next;},changed:()=>{},readOnly:()=>false});
 board.element.querySelectorAll('button').find(b=>b.textContent==='Под одеждой').onclick();
 const chip=board.element.querySelectorAll('.ness-unified-chip').find(x=>x.textContent.includes('tiny scar'));
 assert.ok(chip);
 assert.equal(chip.attributes['data-highlighted'],'true');
 chip.onclick();
 const result=board.getSkin();
 assert.deepEqual(result.selections.upper_front,[]);
 assert.deepEqual(result.selections.arms,['first']);
 assert.equal(result.tags.length,1);
 assert.equal(result.tags[0].text,'tiny scar');
 board.undo();
 assert.deepEqual(board.getSkin().selections.upper_front,['first']);
});

test('Transfer wizard back, cancel and close do not edit data; adjacent empty sections receive the correct tag',()=>{
 const ui=makeUI(),catalog=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
 catalog.modes.skin.sections=[{id:'first',title:'First',before:0},{id:'second',title:'Second',before:0}];
 let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}},changes=0;
 const board=createAppearanceBoard({ui,parent:ui.parent,initialCatalog:catalog,initialSkin:skin,readBaseState:()=>state,writeBaseState:x=>{state=x;},changed:()=>changes++,readOnly:()=>false});
 const find=(root,label)=>root.querySelectorAll('button').find(b=>b.textContent===label);
 const popup=board.element.querySelector('.ness-tagboard-context-menu');
 const before=JSON.stringify(board.getCatalog());
 find(board.element,'⇄').onclick();
 const open=()=>board.element.querySelectorAll('.ness-unified-chip').find(b=>b.textContent.includes('freckles')).onclick();
 open();find(popup,'Под одеждой').onclick();find(popup,'← Назад').onclick();find(popup,'Отмена').onclick();
 assert.equal(popup.hidden,true);assert.equal(changes,0);assert.equal(JSON.stringify(board.getCatalog()),before);
 open();find(popup,'×').onclick();assert.equal(changes,0);
 open();find(popup,'Под одеждой').onclick();find(popup,'First').onclick();
 assert.equal(sectionTagCount(board.getCatalog().modes.skin,'first'),1);
 assert.equal(sectionTagCount(board.getCatalog().modes.skin,'second'),1);
 assert.equal(board.getMode(),'skin');
 assert.ok(!Object.values(board.getSkin().selections).flat().includes(board.getCatalog().modes.skin.tags.find(x=>x.text==='freckles').id));
 board.undo();assert.equal(JSON.stringify(board.getCatalog()),before);
});
test('Reorder arrows share the toolbar and do not open transfer modal',()=>{
 const ui=makeUI();let state={base,ranges:[],selections:{}};
 const board=createAppearanceBoard({ui,parent:ui.parent,initialSkin:skin,readBaseState:()=>state,writeBaseState:x=>{state=x;},changed:()=>{},readOnly:()=>false});
 const tools=board.element.querySelector('.ness-tagboard-tool-modes'),movement=tools.querySelector('.ness-tagboard-tool-movement');
 assert.ok(movement);assert.equal(movement.hidden,true);
 tools.querySelectorAll('button').find(b=>b.textContent==='✥').onclick();
 board.element.querySelector('.ness-unified-chip').onclick();
 assert.equal(movement.hidden,false);
 assert.equal(movement.querySelectorAll('.ness-tagboard-move-arrow').length,4);
 assert.equal(board.element.querySelector('.ness-tagboard-context-menu').hidden,true);
});

test('Section plus adds to the exact named section even when neighboring sections are empty',()=>{
 for(const [mode,label] of [['base','Ракурсы'],['skin','Под одеждой'],['nsfw','NSFW']]){
  const ui=makeUI(),catalog=normalizeAppearanceModeCatalog({},base,skin,initialNsfw,[]);
  catalog.modes[mode].sections=[{id:'first',title:'First',before:0},{id:'middle',title:'Middle',before:0},{id:'last',title:'Last',before:0}];
  let state={base,ranges:[],selections:{face:[parseBaseTags(base)[0]]}},nsfw={...initialNsfw};
  const board=createAppearanceBoard({ui,parent:ui.parent,initialCatalog:catalog,initialSkin:skin,readBaseState:()=>state,writeBaseState:x=>{state=x;},readNsfwState:()=>nsfw,writeNsfwState:x=>{nsfw=x;},changed:()=>{},readOnly:()=>false});
  board.element.querySelectorAll('button').find(b=>b.textContent===label).onclick();
  const before=JSON.stringify(board.getCatalog());
  const addField=()=>{board.element.querySelectorAll('.ness-tagboard-add-plus')[1].onclick();return board.element.querySelector('.ness-tagboard-inline-add-input');};
  let field=addField();field.value='new feature';
  field.onkeydown({key:'Enter',isComposing:true,preventDefault(){throw Error('IME must finish first');}});
  assert.equal(JSON.stringify(board.getCatalog()),before);
  let stopped=false;field.onkeydown({key:'Enter',preventDefault(){},stopPropagation(){stopped=true;}});
  assert.ok(stopped);
  const result=board.getCatalog().modes[mode];
  assert.deepEqual(result.sections.map(s=>s.id),['first','middle','last']);
  assert.equal(sectionTagCount(result,'first'),0);
  assert.equal(sectionTagCount(result,'middle'),1);
  assert.equal(result.tags[0].text,'new feature');
  board.undo();assert.equal(JSON.stringify(board.getCatalog()),before);
  field=addField();field.value='new feature';
  board.element.querySelector('.ness-tagboard-add-confirm').onclick();
  assert.equal(sectionTagCount(board.getCatalog().modes[mode],'middle'),1);
  field=addField();field.value='new feature';
  field.onkeydown({key:'Enter',preventDefault(){}});
  assert.equal(sectionTagCount(board.getCatalog().modes[mode],'middle'),1);
 }
});
