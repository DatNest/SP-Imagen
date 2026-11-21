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
  constructor(type,text='',parent=null,name=''){this.type=type;this.textContent=text||'';this.value='';this.className=name||'';this.parentElement=parent;this.children=[];this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.attributes={};this.eventListeners={};}
  appendChild(child){child.parentElement=this;this.children.push(child);return child}
  setAttribute(name,value){this.attributes[name]=String(value)}
  addEventListener(name,fn){this.eventListeners[name]=fn}
  querySelector(selector){const all=this.querySelectorAll(selector);return all[0]||null}
  querySelectorAll(selector){const pool=[];function walk(root){for(const child of root.children){pool.push(child);walk(child)}}walk(this);if(selector.startsWith('.'))return pool.filter(x=>x.className.split(' ').includes(selector.slice(1)));if(selector==='[data-group-name]')return pool.filter(x=>x.attributes['data-group-name']!==undefined);return pool.filter(x=>x.type===selector)}
  focus(){}
  select(){}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  closest(){return null}
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
 const undo=board.element.querySelectorAll('button').find(b=>b.textContent==='↶ Отменить');
 undo.onclick();
 assert.equal(nsfw.nsfwChest,'small areolae');
});
test('The primary character editor mounts the inline board without opening a constructor popup',()=>{
 const src=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 const editor=src.slice(src.indexOf('function editCharacter(id,group)'),src.indexOf('guideOpenFirstRecord =',src.indexOf('function editCharacter(id,group)')));
 assert.match(editor,/const inlineBoard=createAppearanceBoard/);
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
 let heading=buttons().find(b=>/Face · 2 тегов/.test(b.textContent));
 assert.ok(heading, 'The heading should include its count of two tags');
 assert.equal(heading.attributes['aria-expanded'],'true');
 const before=JSON.stringify(state.selections);
 heading.onclick();
 heading=buttons().find(b=>/Face · 2 тегов/.test(b.textContent));
 assert.equal(heading.attributes['aria-expanded'],'false');
 assert.equal(JSON.stringify(state.selections),before);
 const folded=board.element.querySelectorAll('.ness-unified-section-tags');
 assert.equal(folded[0].hidden,true);
 heading.onclick();
 assert.equal(board.element.querySelectorAll('.ness-unified-section-tags')[0].hidden,false);
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
 const edit=button('✎ Редактировать порядок и разделители');
 edit.onclick();
 const group=board.element.querySelector('[data-group-name]');
 group.value='Татуировки';
 button('+ Разделитель').onclick();
 let saved=board.getCatalog();
 assert.equal(saved.modes.skin.sections.at(-1).title,'Татуировки');
 assert.equal(saved.modes.base.sections.length,0);
 assert.equal(saved.modes.nsfw.sections.length,0);
 const create=board.element.querySelectorAll('input').find(i=>i.placeholder==='Новый тег → Enter');
 create.value='flower tattoo on right arm';
 button('+ Тег').onclick();
 assert.ok(board.getSkin().tags.some(t=>t.text==='flower tattoo on right arm'));
 assert.equal(state.base,untouched);
 assert.equal(JSON.stringify(nsfw),beginNsfw);
 saved=board.getCatalog();
 assert.ok(saved.modes.skin.tags.some(t=>t.text==='flower tattoo on right arm'));
 button('NSFW').onclick();
 assert.ok(board.getCatalog().modes.skin.sections.length===1);
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
 assert.equal(ji.nudeUpper,'legacy bust, stomach\n');
 assert.equal(ji.nudeLower,'legacy lower anatomy\n');
 assert.deepEqual([ji.nsfwChest,ji.nsfwLowerFront,ji.nsfwLowerBack],Object.values(initialNsfw));
 assert.equal(ji.appearanceCatalog.modes.base.sections[0].title,'Лицо');
 assert.equal(ji.appearanceCatalog.modes.skin.sections[0].title,'Шрамы');
 assert.equal(ji.appearanceCatalog.modes.nsfw.sections[0].title,'Анатомия');
 assert.ok(ji.appearanceSkin.selections.arms.includes('s1'));
 assert.ok(ji.appearanceSelections.face?.length);
});
