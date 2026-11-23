import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const lib=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
const board=readFileSync(new URL('../appearance-board.js',import.meta.url),'utf8');
const shared=readFileSync(new URL('../shared-ui-css.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');

// Execute the exact existing event handler instead of reimplementing its logic.
const start=lib.indexOf(' const wheelAlongX=node=>{');
const end=lib.indexOf('\n };',start);
assert.ok(start>=0&&end>start,'wheelAlongX is defined once in createUiKit');
const wheelAlongX=new Function(lib.slice(start,end+4)+'\nreturn wheelAlongX;')();

function makeScroll({width=100,scrollWidth=500,height=40,scrollHeight=40,left=0}={}){
 const node={clientWidth:width,scrollWidth,clientHeight:height,scrollHeight,scrollLeft:left,
  addEventListener(type,callback,options){
   assert.equal(type,'wheel');
   assert.equal(options.passive,false);
   this.handler=callback;
  }};
 wheelAlongX(node);
 return node;
}
function wheel(node,deltaY,extra={}){
 let prevented=false;
 node.handler({deltaY,deltaX:0,deltaMode:0,ctrlKey:false,metaKey:false,shiftKey:false,
  defaultPrevented:false,preventDefault(){prevented=true;},...extra});
 return prevented;
}

test('Horizontal tabs and camera ribbons scroll with a mouse wheel or vertical touchpad motion',()=>{
 const el=makeScroll();
 assert.equal(wheel(el,96),true);
 assert.equal(el.scrollLeft,96);
 assert.equal(wheel(el,-30),true);
 assert.equal(el.scrollLeft,66);
 assert.equal(wheel(el,1,{deltaMode:1}),true);
 assert.equal(el.scrollLeft,82);
 assert.equal(wheel(el,1,{deltaMode:2}),true);
 assert.equal(el.scrollLeft,182);
});

test('Wheel scrolling propagates at edges and does not interfere with vertical lists, pinch zoom or native X touchpad gestures',()=>{
 const el=makeScroll({left:400});
 assert.equal(wheel(el,100),false);
 assert.equal(el.scrollLeft,400);
 assert.equal(wheel(el,20,{ctrlKey:true}),false);
 assert.equal(wheel(el,20,{deltaX:50}),false);
 assert.equal(el.scrollLeft,400);
 const vertical=makeScroll({scrollHeight:400});
 assert.equal(wheel(vertical,100),false);
 assert.equal(vertical.scrollLeft,0);
 const noOverflow=makeScroll({scrollWidth:100});
 assert.equal(wheel(noOverflow,100),false);
});

test('Library horizontal strips share one wheel behavior while vertical tag/record panels remain native scroll areas',()=>{
 assert.match(lib,/ui\.wheelAlongX\?\.\(bar\)/);
 assert.match(lib,/view\.wheelAlongX\(tags\)/);
 assert.match(lib,/wheelAlongX:view\.wheelAlongX/);
 assert.match(board,/ui\.wheelAlongX\?\.\(ribbon\)/);
 assert.match(shared,/\.ness-tab-viewport\{[^}]*overflow:auto/);
 assert.match(shared,/\[data-library-list\]\{[^}]*overflow-y:auto/);
 assert.match(css,/\.ness-unified-tagflow\{[^}]*overflow-y:auto/);
 assert.match(css,/\.ness-tagboard-chosen-list\{[^}]*overflow-y:auto/);
});
