/**
 * Square character icons for the shared library.
 * The cropped data URL belongs to the library record; no remote dependencies,
 * prompt injection, additional settings keys or separate storage are needed.
 */
import { openExplanation } from './onboarding.js';

export function openCharacterIconEditor(D, panel, {createDialog, initial='', onSave}){
 let image=null, imageObjectURL='', offsetX=0, offsetY=0, drag=null;
 const dialog=createDialog(D,panel,{title:'Иконка персонажа',marker:'data-character-icon',onClose:()=>{
  D.removeEventListener('paste',onPaste,true);
  if(imageObjectURL)URL.revokeObjectURL(imageObjectURL);
 }});
 const {el,button,clear,input}=dialog;
 el('p','Выбери изображение. Перетаскивай его, чтобы изменить кадр, и настрой масштаб.',dialog.body,'ness-note');
 const tabs=el('div',undefined,dialog.body,'ness-character-icon-tabs');
 const source=el('div',undefined,dialog.body,'ness-character-icon-source');
 const preview=el('div',undefined,dialog.body,'ness-character-icon-preview');
 const canvas=el('canvas',undefined,preview,'ness-character-icon-canvas');
 canvas.width=272;canvas.height=272;canvas.setAttribute('aria-label','Квадратная область обрезки');
 const zoomLabel=el('label',undefined,preview,'ness-character-icon-zoom');
 el('span','Масштаб',zoomLabel);
 const zoom=input('1','range');zoom.min='1';zoom.max='4';zoom.step='0.02';zoom.value='1';zoomLabel.appendChild(zoom);
 const cropHelp=button('?',preview,()=>openExplanation('Масштаб и обрезка','Перемещай картинку внутри квадрата пальцем или мышью, а масштаб регулируй ползунком. Сохраняется выбранный квадратный кадр. Изображение можно загрузить файлом, вставить из буфера или по прямой ссылке; для внешней ссылки нужен доступ CORS.'),'quiet ness-character-icon-help');
 cropHelp.title='Помощь по обрезке';cropHelp.setAttribute('aria-label','Помощь по обрезке и масштабу');
 const message=el('p','',dialog.body,'ness-note ness-character-icon-status');message.setAttribute('role','status');
 const status=text=>message.textContent=text;
 function paint(canvasTarget=canvas){
  if(!image)return;
  const ctx=canvasTarget.getContext('2d');if(!ctx)return;
  const size=canvasTarget.width;
  const scale=Math.max(size/image.naturalWidth,size/image.naturalHeight)*Number(zoom.value);
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale,k=size/canvas.width;
  const x=Math.max(-(w-size)/2,Math.min((w-size)/2,offsetX*k));
  const y=Math.max(-(h-size)/2,Math.min((h-size)/2,offsetY*k));
  ctx.clearRect(0,0,size,size);
  ctx.drawImage(image,(size-w)/2+x,(size-h)/2+y,w,h);
 }
 function load(url,objectURL=false){
  if(imageObjectURL){URL.revokeObjectURL(imageObjectURL);imageObjectURL='';}
  if(objectURL)imageObjectURL=url;
  image=null;preview.hidden=true;status('Загружаю изображение…');
  const next=new Image();next.crossOrigin='anonymous';
  next.onload=()=>{
   if(dialog.closed)return;
   if(!next.naturalWidth||!next.naturalHeight||next.naturalWidth*next.naturalHeight>48000000){status('Слишком большое или повреждённое изображение.');return;}
   image=next;offsetX=0;offsetY=0;zoom.value='1';preview.hidden=false;paint();status('');
  };
  next.onerror=()=>status('Не удалось загрузить изображение. Для внешних ссылок сервер должен разрешать CORS.');
  next.src=url;
 }
 function useFile(file){
  if(!file)return;
  if(!/^image\/(png|jpeg|webp|gif|avif)$/i.test(file.type)||file.size>12*1024*1024){status('Нужен PNG, JPG, WebP, GIF или AVIF размером до 12 МБ.');return;}
  load(URL.createObjectURL(file),true);
 }
 const shapes={
  file:['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M12 18v-7','m-3 3 3-3 3 3'],
  paste:['M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2','M9 2h6v4H9z','M12 10v8','m-3-3 3 3 3-3'],
  link:['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71','M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71']
 };
 function icon(key,target){
  const svg=D.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');
  for(const d of shapes[key]){const path=D.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.appendChild(path);}
  target.appendChild(svg);
 }
 async function paste(){
  try{
   if(!navigator.clipboard?.read)throw Error('Буфер обмена недоступен в браузере.');
   const items=await navigator.clipboard.read();
   for(const item of items){const type=item.types.find(t=>/^image\/(png|jpeg|webp|gif|avif)$/i.test(t));if(type){useFile(await item.getType(type));return;}}
   status('В буфере обмена нет изображения.');
  }catch(e){status('Не удалось вставить: '+e.message+'. Попробуй Ctrl+V.');}
 }
 const tabButtons={};
 function selectTab(mode){
  clear(source);
  for(const [key,node] of Object.entries(tabButtons))node.setAttribute('aria-pressed',String(key===mode));
  if(mode==='file'){
   const file=input('','file');file.hidden=true;file.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';source.appendChild(file);
   button('Выбрать файл',source,()=>file.click(),'primary');
   file.onchange=()=>useFile(file.files?.[0]);
  }else if(mode==='paste'){
   button('Вставить из буфера обмена',source,paste,'primary');
   el('p','Можно также нажать Ctrl+V в этом окне.',source,'ness-note');
  }else{
   const url=input('','url');url.placeholder='https://example.com/image.png';
   url.setAttribute('aria-label','Прямая ссылка на изображение');source.appendChild(url);
   const apply=()=>{try{const parsed=new URL(url.value);if(!['http:','https:'].includes(parsed.protocol))throw Error('Нужна ссылка http(s).');load(parsed.href);}catch(e){status('Некорректная ссылка: '+e.message);}};
   button('Вставить ссылку',source,apply,'primary');
   url.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();apply();}};
  }
 }
 for(const [key,label] of [['file','Импорт файла'],['paste','Вставить из буфера'],['link','Прямая ссылка']]){
  const tab=button('',tabs,()=>selectTab(key),'quiet ness-character-icon-tab');
  tab.setAttribute('aria-label',label);tab.title=label;tabButtons[key]=tab;icon(key,tab);
 }
 function onPaste(e){
  if(dialog.closed||!dialog.box.contains(D.activeElement))return;
  const file=[...(e.clipboardData?.files||[])].find(item=>item.type.startsWith('image/'));
  if(file){e.preventDefault();useFile(file);}
 }
 D.addEventListener('paste',onPaste,true);
 canvas.onpointerdown=e=>{if(!image)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:offsetX,dy:offsetY};canvas.setPointerCapture?.(e.pointerId);};
 canvas.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const bounds=canvas.getBoundingClientRect(),factor=bounds.width?canvas.width/bounds.width:1;
  offsetX=drag.dx+(e.clientX-drag.x)*factor;offsetY=drag.dy+(e.clientY-drag.y)*factor;
  paint();
 };
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
 zoom.oninput=()=>paint();
 button('Удалить иконку',dialog.actions,()=>{onSave('');dialog.finish();},'quiet');
 button('Сохранить иконку',dialog.actions,()=>{
  if(!image){status('Сначала загрузи изображение.');return;}
  try{
   let data='';
   for(const [size,quality] of [[224,.82],[192,.7],[160,.58]]){
    const target=D.createElement('canvas');target.width=size;target.height=size;paint(target);
    data=target.toDataURL('image/webp',quality);if(data.length<=120000)break;
   }
   if(data.length>120000)throw Error('Слишком большая иконка.');
   onSave(data);dialog.finish();
  }catch(e){status('Не удалось сохранить: '+e.message);}
 },'primary');
 preview.hidden=true;selectTab('file');if(initial)load(initial);
}