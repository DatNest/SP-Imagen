const STORAGE_KEY='sp-imagen-quick-style-position-v1';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
export function presetSwitchBounds(view,size,margin=8){
 const left=view.x+margin,top=view.y+margin;
 return {left,top,right:Math.max(left,view.x+view.width-margin-size.width),bottom:Math.max(top,view.y+view.height-margin-size.height)};
}
export function normalizeSwitchPosition(x,y,b){
 return {x:b.right===b.left?0:clamp((x-b.left)/(b.right-b.left),0,1),y:b.bottom===b.top?0:clamp((y-b.top)/(b.bottom-b.top),0,1)};
}
export function resolveSwitchPosition(p,b){
 const pos=valid(p)?p:{x:1,y:.3};
 return {x:b.left+(b.right-b.left)*pos.x,y:b.top+(b.bottom-b.top)*pos.y};
}
export function mountMovablePresetSwitch(root,trigger,list,{host=window,onClose=()=>{}}={}){
 let saved=null,drag=null,suppressClick=false;
 try{const p=JSON.parse(host.localStorage.getItem(STORAGE_KEY));if(valid(p))saved=p;}catch{}
 const viewport=()=>{
  const v=host.visualViewport;
  return {x:v?.offsetLeft||0,y:v?.offsetTop||0,width:v?.width||host.innerWidth,height:v?.height||host.innerHeight};
 };
 const bounds=()=>{const rect=trigger.getBoundingClientRect();return presetSwitchBounds(viewport(),rect);};
 const place=(x,y)=>{
  const b=bounds(),v=viewport();
  x=clamp(x,b.left,b.right);y=clamp(y,b.top,b.bottom);
  root.style.left=x+'px';root.style.top=y+'px';root.style.right='auto';
  const rect=trigger.getBoundingClientRect();
  const below=v.y+v.height-y-rect.height-12,above=y-v.y-12;
  root.dataset.menuAbove=String(above>below);
  root.dataset.menuLeft=String(x+rect.width/2>v.x+v.width/2);
  // Keep the entire dropdown in the visible viewport, independently of the button width.
  const menuWidth=Math.min(230,Math.max(0,v.width-16));
  const menuX=clamp(root.dataset.menuLeft==='true'?x+rect.width-menuWidth:x,v.x+8,Math.max(v.x+8,v.x+v.width-8-menuWidth));
  list.style.width=menuWidth+'px';list.style.left=(menuX-x)+'px';
  list.style.maxHeight=Math.max(0,Math.min(v.height*.42,Math.max(above,below)))+'px';
  return {x,y};
 };
 const refresh=()=>{
  if(drag)return;
  const p=resolveSwitchPosition(saved,bounds());place(p.x,p.y);
 };
 const down=e=>{
  if(e.isPrimary===false||e.button!==0||drag)return;
  suppressClick=false;
  const rect=trigger.getBoundingClientRect();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,moved:false,last:null};
  try{trigger.setPointerCapture(e.pointerId);}catch{}
 };
 const move=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<7)return;
  if(!drag.moved){drag.moved=true;suppressClick=true;onClose();root.dataset.dragging='true';}
  e.preventDefault();
  drag.last=place(drag.left+dx,drag.top+dy);
 };
 const end=(e,cancel=false)=>{
  if(!drag||drag.id!==e.pointerId)return;
  const current=drag;drag=null;delete root.dataset.dragging;
  if(current.moved&&!cancel&&current.last){
   saved=normalizeSwitchPosition(current.last.x,current.last.y,bounds());
   try{host.localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));}catch{}
  }
  try{if(trigger.hasPointerCapture?.(e.pointerId))trigger.releasePointerCapture(e.pointerId);}catch{}
  refresh();
 };
 const up=e=>end(e),cancel=e=>end(e,true);
 const click=e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}};
 trigger.addEventListener('pointerdown',down);
 trigger.addEventListener('pointermove',move,{passive:false});
 trigger.addEventListener('pointerup',up);
 trigger.addEventListener('pointercancel',cancel);
 trigger.addEventListener('lostpointercapture',cancel);
 trigger.addEventListener('click',click,true);
 host.addEventListener('resize',refresh);
 host.visualViewport?.addEventListener('resize',refresh);
 host.visualViewport?.addEventListener('scroll',refresh);
 refresh();
 return {refresh,dispose(){
  if(drag)cancel({pointerId:drag.id});
  trigger.removeEventListener('pointerdown',down);trigger.removeEventListener('pointermove',move);
  trigger.removeEventListener('pointerup',up);trigger.removeEventListener('pointercancel',cancel);
  trigger.removeEventListener('lostpointercapture',cancel);trigger.removeEventListener('click',click,true);
  host.removeEventListener('resize',refresh);
  host.visualViewport?.removeEventListener('resize',refresh);host.visualViewport?.removeEventListener('scroll',refresh);
 }};
}
