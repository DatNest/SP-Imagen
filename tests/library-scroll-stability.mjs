import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lib=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
const board=readFileSync(new URL('../appearance-board.js',import.meta.url),'utf8');
const shared=readFileSync(new URL('../shared-ui-css.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');

function virtualListHarness(columns=()=>1){
 const tasks=[];
 let resize;
 const browser={
  requestAnimationFrame:callback=>{tasks.push(callback);return tasks.length;},
  cancelAnimationFrame:()=>{},
  ResizeObserver:class {
   constructor(callback){resize=callback;}
   observe(){}
   disconnect(){}
  }
 };
 const createElement=()=>({
  style:{},children:[],
  appendChild(node){this.children.push(node);return node;},
  setAttribute(){}
 });
 const createUiKit=()=>({
  el:(tag,content,parent)=>{const node=createElement();parent.appendChild(node);return node;},
  clear:node=>{node.children.length=0;}
 });
 const start=lib.indexOf('function createVirtualList(');
 const end=lib.indexOf('\n\n// Module: dialogs',start);
 assert.ok(start>=0&&end>start,'Use the actual virtual list implementation');
 const createVirtualList=new Function('createUiKit','window',lib.slice(start,end)+'\nreturn createVirtualList;')(createUiKit,browser);
 const container=createElement();
 container.scrollTop=0;
 container.clientHeight=340;
 const list=createVirtualList(null,container,item=>({id:item}),{rowHeight:68,overscan:2,columns});
 return {container,list,get rows(){return container.children[1].children;},get top(){return container.children[0];},
  scrollTo(top){container.scrollTop=top;container.onscroll();this.tick();},
  resize(){resize();this.tick();},
  tick(){while(tasks.length)tasks.shift()();}
 };
}

test('Long virtualized character list keeps the requested position as rows enter/leave the viewport',()=>{
 const ui=virtualListHarness();
 ui.list.setItems(Array.from({length:500},(_,i)=>i));
 ui.scrollTo(68*211);
 assert.equal(ui.container.scrollTop,68*211);
 assert.equal(ui.top.style.height,(211-2)*68+'px');
 assert.ok(ui.rows.length>0&&ui.rows.length<50,'Virtualization remains enabled for long libraries');
 ui.scrollTo(68*258);
 assert.equal(ui.container.scrollTop,68*258);
 assert.equal(ui.top.style.height,(258-2)*68+'px');
 ui.list.setItems(Array.from({length:500},(_,i)=>i));
 assert.equal(ui.container.scrollTop,68*258,'Refreshing rows must not jump to the middle or start');
 const visible=ui.rows[0];
 ui.resize();
 assert.strictEqual(ui.rows[0],visible,'ResizeObserver with unchanged visible range must not destroy focused/visible rows');
 assert.equal(ui.container.scrollTop,68*258,'ResizeObserver must preserve scrollTop');
 ui.list.setItems(Array.from({length:3},(_,i)=>i),{reset:true});
 assert.equal(ui.container.scrollTop,0,'Only an intentional filter reset moves to the first row');
 ui.list.dispose();
});

test('Virtual row geometry agrees with CSS on desktop and phone, with no margin-induced drift',()=>{
 assert.match(shared,/#sp-imagen-review-panel \.ness-library-item\{[^}]*box-sizing:border-box;height:68px;min-height:68px;[^}]*margin:0;/);
 assert.match(shared,/#sp-imagen-review-panel \.ness-library-item\{height:80px;min-height:80px;/);
 const styledRow=css.match(/#sp-imagen-review-panel\[data-dialog=library\] \.ness-library-item\{([^}]+)\}/)?.[1];
 assert.ok(styledRow,'The original theme-specific row style exists');
 assert.match(styledRow,/\bmargin:0;/);
 assert.doesNotMatch(styledRow,/margin:\s*[1-9]\d*px/, 'Vertical margins must not accumulate across hundreds of rows');
 assert.match(lib,/rowHeight:\(\)=>window\.matchMedia\?\.\('\(max-width:767px\), \(pointer:coarse\)'\)\?\.matches\?80:68/);
 assert.match(shared,/#sp-imagen-review-panel \[data-library-list\]\{[^}]*overflow-anchor:none/);
});

test('Camera ribbon restores its position after buttons and selection count badges exist',()=>{
 const position=board.indexOf('const headings=availablePresets(),ribbon=el(');
 const render=board.slice(position,board.indexOf("if(layout==='text')",position));
 assert.ok(render.includes('for(const [id,label] of Object.entries(headings))'));
 const buttons=render.indexOf('for(const [id,label] of Object.entries(headings))');
 const counts=render.indexOf('syncPresetRibbon();');
 const scroll=render.indexOf('ribbon.scrollLeft=ribbonScroll;');
 assert.ok(buttons>=0&&counts>buttons&&scroll>counts,
  'Restore scroll only after creating the physical buttons and rendering count badges');
 assert.match(css,/#sp-imagen-review-panel \.ness-tagboard-ribbon\{[^}]*overflow-anchor:none/);
 assert.match(board,/function selectPreset\(id\)\{[\s\S]{0,750}if\(layout==='board'\)refreshSelection\(\);/);
 assert.match(board,/btn\.dataset\.selectedCount=String\(count\);/);
 assert.match(board,/btn\.dataset\.filled=String\(count>0\);/);
});

test('ResizeObserver changes only calculated visible window, not user library data',()=>{
 const start=lib.indexOf('function createVirtualList('),end=lib.indexOf('\n\n// Module: dialogs',start);
 const virtual=lib.slice(start,end);
 assert.match(virtual,/function refresh\(\)\{[^}]*paint\(\);/);
 assert.doesNotMatch(virtual,/function refresh\(\)\{[^}]*paint\(true\)/);
 assert.doesNotMatch(virtual,/saveMasterLibrary|extensionSettings|writeBaseState|writeNsfwState/);
 assert.match(lib,/virtualList\.setItems\(entries,\{reset\}\)/);
});

test('Virtual card grid remains bounded and keeps position when the list is hidden',()=>{
 let cols=3;const ui=virtualListHarness(()=>cols),items=Array.from({length:500},(_,i)=>i);
 ui.list.setItems(items);ui.scrollTo(68*60);
 assert.equal(ui.top.style.height,58*68+'px');
 assert.ok(ui.rows.length<50);
 assert.equal(ui.rows[0].id,174);
 ui.container.clientHeight=0;
 const first=ui.rows[0];ui.list.setItems(items);ui.resize();
 assert.equal(ui.container.scrollTop,68*60);assert.equal(ui.rows[0],first);
 ui.container.clientHeight=340;ui.list.setItems(items);
 assert.equal(ui.rows[0].id,174);
 cols=1;ui.resize();
 assert.equal(ui.container.scrollTop,68*180);
 assert.equal(ui.rows[0].id,178);
 ui.list.dispose();
});
test('Desktop and mobile use one view, avatar data and the original editor draft',()=>{
 const last=css.slice(css.indexOf('/* Library navigation:'));
 assert.match(last,/\[data-view=list\] \.ness-library-editorpane,[\s\S]*?\[data-view=editor\] \.ness-library-listpane\{display:none\}/);
 assert.match(last,/\[data-view=editor\] \.ness-library-editorpane\{display:flex\}/);
 assert.match(lib,/if\(entry\.libraryIconData\)\{const img=el\('img',undefined,portrait\);img\.src=entry\.libraryIconData/);
 assert.match(lib,/function showEditor\(\)\{if\(panel\.getAttribute\('data-view'\)!=='editor'\)listScroll=list\.scrollTop/);
 assert.match(lib,/function resetEditor\(\)\{[^}]*list\.scrollTop=listScroll/);
 assert.match(lib,/const back=button\('←',heading,\(\)=>\{if\(!tryFlush\(\)\)return;[^}]*view\.resetEditor\(\);renderList\(\);/);
 assert.match(lib,/toolBar\.insertBefore\(formatStrip,inlineBoard\.historyHost\)/);
 assert.match(lib,/headingBar\.hidden=true/);
});
