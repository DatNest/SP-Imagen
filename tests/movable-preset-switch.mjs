import test from 'node:test';
import assert from 'node:assert/strict';
import {presetSwitchBounds,normalizeSwitchPosition,resolveSwitchPosition,mountMovablePresetSwitch} from '../movable-preset-switch.js';

test('Normalized coordinates stay on screen after orientation and button-width changes',()=>{
 const landscape=presetSwitchBounds({x:0,y:0,width:900,height:400},{width:180,height:32});
 const p=normalizeSwitchPosition(9999,-300,landscape);
 assert.deepEqual(p,{x:1,y:0});
 const portrait=presetSwitchBounds({x:0,y:0,width:320,height:650},{width:125,height:32});
 assert.deepEqual(resolveSwitchPosition(p,portrait),{x:187,y:8});
 const shifted=presetSwitchBounds({x:10,y:100,width:300,height:180},{width:125,height:32});
 assert.deepEqual(resolveSwitchPosition(p,shifted),{x:177,y:108});
});

function fixture(){
 const element=()=>Object.assign(new EventTarget(),{style:{},dataset:{}});
 const root=element(),trigger=element(),list=element(),host=element();
 host.innerWidth=320;host.innerHeight=640;
 let stored=null,writes=0,closed=0,clicks=0;
 host.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v;writes++;}};
 trigger.getBoundingClientRect=()=>({left:parseFloat(root.style.left)||0,top:parseFloat(root.style.top)||0,width:120,height:32});
 trigger.setPointerCapture=()=>{};trigger.hasPointerCapture=()=>false;
 const send=(type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,values);trigger.dispatchEvent(e);return e;};
 const drag=()=>mountMovablePresetSwitch(root,trigger,list,{host,onClose:()=>closed++});
 return {root,trigger,list,host,send,drag,get stored(){return stored;},get writes(){return writes;},get closed(){return closed;}};
}
test('Tap is not a drag; touch drag saves once, does not select and survives remount',()=>{
 const f=fixture(),control=f.drag();
 const p={pointerId:1,button:0,isPrimary:true,clientX:200,clientY:200};
 f.send('pointerdown',p);f.send('pointerup',p);
 assert.equal(f.writes,0);assert.equal(f.send('click',{detail:1}).defaultPrevented,false);
 f.send('pointerdown',p);f.send('pointermove',{...p,clientX:20,clientY:500});
 f.send('pointerup',p);assert.equal(f.closed,1);assert.equal(f.writes,1);
 assert.equal(f.send('click',{detail:1}).defaultPrevented,true);
 assert.equal(f.send('click',{detail:0}).defaultPrevented,false);
 const left=f.root.style.left,top=f.root.style.top;
 assert.equal(f.root.dataset.menuAbove,'true');
 control.dispose();const remount=f.drag();
 assert.equal(f.root.style.left,left);assert.equal(f.root.style.top,top);
 f.host.innerWidth=240;f.host.dispatchEvent(new Event('resize'));
 assert.ok(parseFloat(f.root.style.left)<=112);
 remount.dispose();
});
test('Canceled drag restores the previous position without saving',()=>{
 const f=fixture(),control=f.drag(),left=f.root.style.left,top=f.root.style.top;
 const p={pointerId:1,button:0,isPrimary:true,clientX:200,clientY:200};
 f.send('pointerdown',p);f.send('pointermove',{...p,clientX:0,clientY:0});
 f.send('pointercancel',p);
 assert.equal(f.writes,0);assert.equal(f.root.style.left,left);assert.equal(f.root.style.top,top);
 control.dispose();
});
