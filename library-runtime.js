import { loadNessTheme, applyNessTheme, normalizeNessTheme, activeNessThemeForEditor, themeSettingsLocation, NESS_THEME_MODE_KEY, NESS_CUSTOM_THEME_KEY } from './theme-runtime.js';
import { addFieldHelp } from './onboarding.js';
import { createDialogHeader, createOwnedDialogShell, mountOwnedDialog } from './dialog-shell.js';
import { NESS_FIELD_HELP, NESS_HELP_LABELS, NESS_THEME_LABELS, NESS_APPEARANCE_ALWAYS, NESS_APPEARANCE_PRESETS, NESS_APPEARANCE_RULES, MASTER_LIBRARY_KEY, MASTER_SNAPSHOT_KEY, MASTER_BACKUP_KEY, cloneLibrary, safeLibraryId } from './shared-data.js';
import { normalizeAppearanceRules, normalizeAppearanceRanges, normalizeAppearanceSelections, visibleAppearanceRanges } from './appearance-visibility.js';
import { createAppearanceBoard, normalizeSkinTags, normalizeAppearanceSections, normalizeAppearanceCatalog, SKIN_PRESETS, NSFW_PRESETS } from './appearance-board.js';
// Generated from NESS_GEN2_STUDIO/modules.
export function createSpImagenLibraryRuntime({ getExtension } = {}){
const NESS_RECOVERED_BODY={
  "version": 1,
  "records": {
    "ness": {
      "name": "Несс",
      "aliases": [
        "Ness",
        "Несс",
        "Инес",
        "Анест",
        "Нест"
      ],
      "fields": {
        "nudeUpper": "\n      medium bust, pale pink nipples,\n      old pale thin ring-shaped scars around both areolas; \nsoft fleshy stomach, slight tummy,\nsmall lower belly pouch,\nsoft waist with gentle fullness\n    ",
        "nudeLower": "\nprominent, slightly elongated labia minora,\nsoft inner labia visibly protruding beyond the outer labia,\ninner labia tapering upward into the upper vulvar folds\n"
      }
    },
    "ji": {
      "name": "Джи",
      "aliases": [
        "Джи",
        "Анжеллис Каролайн",
        "Анжеллис",
        "Ji",
        "Angellice"
      ],
      "fields": {
        "nudeUpper": "\nsmall bust, AA cup, natural breast shape,\ndainty pale pink nipples\n  ",
        "nudeLower": "\nsmall dark segmented plates on pubic area,\nsmooth skin surrounding plates,\nplump mons pubis,\nfull rounded labia majora,\nsoft natural contours\n  "
      }
    },
    "yukio": {
      "name": "Юкио Окумура",
      "aliases": [
        "Yukio Okumura",
        "Юкио Окумура",
        "Yukio",
        "Юкио"
      ],
      "fields": {
        "nudeUpper": "\n      lean athletic torso, defined pectorals,\n      broad shoulders, narrow waist, flat stomach,\n      subtle abdominal definition, natural muscular proportions, rare beauty marks all over the body\n    ",
        "nudeLower": "\n      natural adult male anatomy, small-to-average-sized penis,\n      slightly upward curve with a couple of beauty marks\n      on foreskin, compact scrotum with one beauty mark,\n      non-exaggerated proportions\n    "
      }
    },
    "clark": {
      "name": "Кларк Кент",
      "aliases": [
        "Clark Kent",
        "Кларк Кент",
        "Clark",
        "Кларк"
      ],
      "fields": {
        "nudeUpper": "\n      massive beefy muscular upper body,\n      extremely broad shoulders, thick powerful neck,\n      huge full rounded pectorals, broad chest,\n      wide ribcage, thick upper arms, large rounded biceps,\n      thick forearms, solid dense torso, sturdy waist,\n      softly defined abdomen, slight lower belly softness,\n      smooth rounded muscle contours,\n      faint happy trail below navel, light underarm hair\n    ",
        "nudeLower": "\n      natural adult male anatomy,\n      slightly above-average penis size,\n      proportionate scrotum, natural relaxed proportions,\n      heavy beefy lower body, broad hips,\n      thick powerful thighs, large rounded quadriceps,\n      full muscular glutes, thick calves, heavy solid proportions\n    "
      }
    },
    "jimmy": {
      "name": "Джимми Олсен",
      "aliases": [
        "Jimmy Olsen",
        "Джимми Олсен",
        "Jimmy",
        "Джимми",
        "James Olsen",
        "Джеймс Олсен",
        "James Bartholomew Olsen"
      ],
      "fields": {
        "nudeUpper": "\n      slim youthful masculine torso, lean chest,\n      moderately defined shoulders, slender arms,\n      flat abdomen, subtle natural muscle definition\n    "
      }
    },
    "superman": {
      "name": "Супермен",
      "aliases": [
        "Superman",
        "Супермен",
        "Kal-El",
        "Кал-Эл",
        "Кал-Эль"
      ],
      "fields": {
        "nudeUpper": "\n      broad muscular chest, large defined pectorals,\n      thick muscular arms, broad shoulders, defined abdomen,\n      narrow muscular waist, heroic athletic proportions\n    ",
        "nudeLower": "\n      natural adult male anatomy, large athletic thighs,\n      strong legs, natural proportions\n    "
      }
    },
    "perry": {
      "name": "Перри Уайт",
      "aliases": [
        "Perry White",
        "Перри Уайт",
        "Perry",
        "Перри"
      ],
      "fields": {
        "nudeUpper": "\n      older masculine torso, broad chest, soft sturdy build,\n      moderate natural body hair on chest,\n      slightly softened abdomen, mature natural proportions\n    ",
        "nudeLower": "\n      natural adult male anatomy, mature proportions,\n      no exaggerated anatomy\n    "
      }
    },
    "cat": {
      "name": "Кэт Грант",
      "aliases": [
        "Cat Grant",
        "Кэт Грант",
        "Cat",
        "Кэт"
      ],
      "fields": {
        "nudeUpper": "\n      slender adult female upper body,\n      narrow gently sloping shoulders,\n      delicate collarbones, slim neck,\n      slender upper arms, narrow wrists,\n      proportionate feminine bust,\n      gently defined ribcage, narrow waist,\n      smooth natural abdominal contours,\n      subtle waist definition,\n      warm medium brown skin\n    ",
        "nudeLower": "\n      natural adult female anatomy,\n      slender feminine lower body,\n      gently rounded hips, slim pelvis,\n      long lean thighs, subtle natural curves,\n      softly rounded glutes, slender knees,\n      long tapered calves, narrow ankles,\n      elongated graceful leg proportions,\n      warm medium brown skin\n    "
      }
    },
    "denji": {
      "name": "Денджи",
      "aliases": [
        "Denji",
        "Денджи"
      ],
      "fields": {
        "nudeUpper": "\nlean athletic adult male torso,\nmoderately defined pectoral muscles,\nslightly visible ribcage,\nsubtle abdominal muscle definition,\nflat stomach, narrow waist,\nslim muscular arms,\nprominent collarbones,\nnatural masculine proportions,\nchainsaw starter cord protruding from sternum\n    ",
        "nudeLower": "\nnatural adult male anatomy,\nsmall-to-average-sized penis,\nslightly curved shaft,\nsubtle natural asymmetry,\nproportionate scrotum,\nnatural relaxed proportions,\nnarrow hips, slim pelvis,\nlean muscular thighs,\nslender knees, defined calves,\nnatural masculine lower body proportions\n    "
      }
    },
    "chainsaw_man": {
      "name": "Человек-бензопила",
      "aliases": [
        "Chainsaw Man",
        "Chainsawman",
        "Человек-бензопила",
        "Человек Бензопила"
      ],
      "fields": {
        "nudeUpper": "\nlean muscular adult male torso,\ndefined pectoral muscles,\nnarrow muscular abdomen,\nvisible ribcage contours,\nmoderately broad shoulders,\nslim muscular upper arms,\nhuman skin on torso,\nmechanical chainsaw forearms,\nchainsaw starter cord in center of chest\n    ",
        "nudeLower": "\nnatural adult male anatomy,\nsmall-to-average-sized penis,\nslightly curved shaft,\nsubtle natural asymmetry,\nproportionate scrotum,\nnatural relaxed proportions,\nnarrow hips, slim pelvis,\nlong lean muscular thighs,\ndefined knees, lean calves,\nhuman-shaped lower limbs,\nnatural masculine proportions\n    "
      }
    },
    "kishibe": {
      "name": "Кишибе",
      "aliases": [
        "Kishibe",
        "Кишибе",
        "岸辺"
      ],
      "fields": {
        "nudeUpper": "\nmature masculine torso,\nlean muscular chest,\nbroad shoulders, strong upper arms,\ndefined forearms, prominent tendons,\nnatural pectoral muscles,\nfirm abdomen, subtle muscle definition,\nslightly softened lower stomach,\nnatural body hair,\nlight chest hair, faint happy trail,\nweathered skin texture\n  ",
        "nudeLower": "\nnatural mature adult male anatomy,\naverage-sized penis,\nproportionate scrotum,\nnatural relaxed proportions,\nsubtle natural asymmetry,\nnarrow sturdy hips,\nlean muscular thighs,\ndefined quadriceps, strong calves,\nnatural body hair\n  "
      }
    },
    "haruki": {
      "name": "Харуки",
      "aliases": [
        "Харуки",
        "Haruki",
        "Хару"
      ],
      "fields": {
        "nudeUpper": "\nslim masculine torso,\nflat narrow chest,\nslender shoulders,\nlong narrow ribcage,\ndefined collarbones,\nvisible clavicles,\nsoft rib definition,\nslim abdomen,\nnarrow waist,\ngentle lower abdominal definition,\ndelicate elegant build,\n\nextensive black-and-gray tattoos from neck to hips,\ndense tattoo coverage across chest sides, ribs, stomach, and lower abdomen,\nsnake-themed and abstract tattoo motifs,\nornamental black-and-gray tattoo composition\n  ",
        "nudeLower": "\nnatural adult male anatomy,\nslender pelvis,\nnarrow hips,\nlean upper thighs,\nlong slim legs,\nsmall-to-average-sized penis,\nnatural relaxed proportions,\n\nblack-and-gray tattoo work continuing across lower abdomen,\nhips, and upper thighs\n  "
      }
    },
    "astra": {
      "name": "Астра Вайтон",
      "aliases": [
        "Astra",
        "Astra Vayton",
        "Астра",
        "Vayton"
      ],
      "fields": {
        "nudeUpper": "slender torso, pale skin, natural medium breasts, pink nipples, delicate collarbones, smooth skin",
        "nudeLower": "slender legs, natural female anatomy, pale skin, narrow hips, pussy, hairless pussy"
      }
    }
  }
};
async function activateNessProfile(){return true;}
async function routeImages(method,kind){const map={generateAt:'sp_ness_generate_at',prepareRp:'sp_ness_'+kind+'_scene_parser',openSettings:'sp_ness_settings'};return getExtension?.()?.run(map[method],kind);}
// Module: field_help


function nessFieldHelp(title){const key=String(title).replace(/^[^\p{L}\p{N}]+/u,'').trim();return NESS_FIELD_HELP[NESS_HELP_LABELS[key]||key]||'Поле сохраняется вместе с этой записью. Укажи данные по его названию; если оно необязательное, его можно оставить пустым.';}

// Module: ui_popovers
let nessOpenTip=null;
function closeNessTooltip(){if(nessOpenTip){const close=nessOpenTip;nessOpenTip=null;close();}}
function positionNessPopover(node,anchor,below=false){
 const vp=window.visualViewport,left=vp?.offsetLeft||0,top=vp?.offsetTop||0,width=vp?.width||window.innerWidth,height=vp?.height||window.innerHeight;
 const a=anchor.getBoundingClientRect(),margin=12;
 node.style.maxWidth=Math.min(node.className==='ness-tooltip'?290:360,Math.max(0,width-margin*2))+'px';node.style.maxHeight=Math.max(80,height-margin*2)+'px';
 const b=node.getBoundingClientRect();let x=Math.min(Math.max(left+margin,a.right-b.width),left+width-b.width-margin);
 let y=below?a.bottom+8:a.top-b.height-8;
 if(y<top+margin)y=a.bottom+8;if(y+b.height>top+height-margin)y=Math.max(top+margin,a.top-b.height-8);
 node.style.left=x+'px';node.style.top=y+'px';
}
function bindNessTooltip(D,anchor,text,{hover=true,onToggle=()=>{},id=''}={}){
 let popup=null,timer=null;
 function cancelHide(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function hide(){cancelHide();if(!popup)return;popup.remove();popup=null;D.removeEventListener('pointerdown',outside,true);D.removeEventListener('scroll',scroll,true);onToggle(false);if(nessOpenTip===hide)nessOpenTip=null;}
 function outside(e){if(!anchor.contains(e.target)&&!popup?.contains(e.target))hide();}
 function scroll(e){if(e.target!==popup)hide();}
 function later(){cancelHide();timer=setTimeout(hide,100);}
 function show(){
  cancelHide();if(popup?.isConnected)return popup;closeNessTooltip();
  popup=D.createElement('div');popup.className='ness-tooltip';if(id)popup.id=id;popup.setAttribute('role','tooltip');popup.textContent=text.replace(/([.!?])\s+(?=[А-ЯЁ«])/gu,'$1\n');applyNessTheme(popup,loadNessTheme());
  (D.querySelector('#sp-imagen-review-overlay')||D.body).appendChild(popup);positionNessPopover(popup,anchor);
  popup.onmouseenter=cancelHide;popup.onmouseleave=later;D.addEventListener('pointerdown',outside,true);D.addEventListener('scroll',scroll,true);nessOpenTip=hide;onToggle(true);return popup;
 }
 if(hover){anchor.onmouseenter=show;anchor.onmouseleave=later;anchor.onfocus=show;anchor.onblur=later;}
 return {show,hide,later,cancelHide,toggle(){if(popup?.isConnected)hide();else show();},get body(){return popup;}};
}

// Module: ui_theme


let nessCloseTheme=null;
function closeNessTheme(){if(nessCloseTheme){const close=nessCloseTheme;nessCloseTheme=null;close();}}
function openNessTheme(D,panel,anchor){
 if(nessCloseTheme){closeNessTheme();return;}closeNessTooltip();
 const ui=createUiKit(D),original=loadNessTheme(),draft={...(original || activeNessThemeForEditor(D))};let useChatTheme=!original;const popup=ui.el('div',undefined,panel,'ness-theme-popover');popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Палитра интерфейса');
 ui.el('strong','Палитра интерфейса',popup);ui.note(popup,'8 цветов для всех окон. Остальные оттенки связаны с ними.');
 const grid=ui.el('div',undefined,popup,'ness-theme-grid'),inputs={};
 for(const key of Object.keys(draft)){const label=ui.el('label',undefined,grid,'ness-theme-color');ui.el('span',NESS_THEME_LABELS[key],label);const input=ui.input(draft[key],'color');label.appendChild(input);inputs[key]=input;input.oninput=()=>{useChatTheme=false;draft[key]=input.value;applyNessTheme(panel,draft);};}
 const message=ui.note(popup,''),actions=ui.row(popup);let saving=false,finished=false;
 const setSaving=value=>{saving=value;for(const node of [...popup.querySelectorAll('input'),...popup.querySelectorAll('button')])node.disabled=value;};
 function outside(e){if(!popup.contains(e.target)&&!anchor.contains(e.target))finish(false);}
 function finish(saved,force=false){if(finished||saving&&!force)return;finished=true;if(!saved)applyNessTheme(panel,original);D.removeEventListener('pointerdown',outside,true);popup.remove();if(nessCloseTheme===ownClose)nessCloseTheme=null;}
 ui.button('Как в теме чата',actions,()=>{useChatTheme=true;Object.assign(draft,activeNessThemeForEditor(D));for(const key of Object.keys(inputs))inputs[key].value=draft[key];applyNessTheme(panel,null);},'quiet');
 ui.button('Применить',actions,async()=>{if(saving||finished)return;setSaving(true);let global,previous,previousMode;try{({global}=themeSettingsLocation());previous=global[NESS_CUSTOM_THEME_KEY];previousMode=global[NESS_THEME_MODE_KEY];if(useChatTheme){delete global[NESS_CUSTOM_THEME_KEY];global[NESS_THEME_MODE_KEY]='auto';}else{global[NESS_CUSTOM_THEME_KEY]=JSON.stringify(normalizeNessTheme(draft));global[NESS_THEME_MODE_KEY]='custom';}await SillyTavern.getContext().saveSettingsDebounced();saving=false;finish(true);}catch(e){if(global){if(previous===undefined)delete global[NESS_CUSTOM_THEME_KEY];else global[NESS_CUSTOM_THEME_KEY]=previous;if(previousMode===undefined)delete global[NESS_THEME_MODE_KEY];else global[NESS_THEME_MODE_KEY]=previousMode;}if(!finished){message.textContent=e.message;setSaving(false);}}},'primary');
 ui.button('×',actions,()=>finish(false),'icon quiet').setAttribute('aria-label','Закрыть палитру');
 const ownClose=()=>finish(false,true);D.addEventListener('pointerdown',outside,true);nessCloseTheme=ownClose;positionNessPopover(popup,anchor,true);
}
function createNessHeader(D,panel,title,subtitle,badgeText){
 return createDialogHeader(D,panel,title,subtitle,badgeText,createUiKit(D),openNessTheme);
}

// Module: ui_components
// Shared visual primitives. Data and generation logic do not live in this module.
let nessHelpSequence=0;
function createUiKit(D){
 const el=(tag,text,parent,classes='')=>{const e=D.createElement(tag);if(text!==undefined)e.textContent=text;if(classes)e.className=classes;if(parent)parent.appendChild(e);return e;};
 const clear=node=>{while(node.firstChild)node.removeChild(node.firstChild);};
 const input=(value='',type='text')=>{const e=el('input',undefined,undefined,'ness-input');e.type=type;e.value=String(value??'');return e;};
 const area=value=>{const e=el('textarea',undefined,undefined,'ness-input ness-area');e.value=String(value??'');e.spellcheck=false;return e;};
 const help=(parent,title,target)=>{
  const toggle=addFieldHelp(parent,title,nessFieldHelp(title));
  if(target)target.setAttribute('data-spi-help-title',title);
  return {toggle};
 };
 const tip=(target,text)=>bindNessTooltip(D,target,text);
 const field=(parent,title,e,helpTitle=title)=>{const label=el('label',undefined,parent,'ness-field');el('span',title,label,'ness-label');label.appendChild(e);help(label,helpTitle,e);return e;};
 const button=(title,parent,handler,variant='')=>{const classes=variant.split(/\s+/).filter(Boolean).map(v=>v.startsWith('ness-')?v:'ness-'+v).join(' ');const e=el('button',title,parent,'ness-button'+(classes?' '+classes:''));e.type='button';if(handler)e.onclick=handler;return e;};
 const choice=(options,value)=>{const e=el('select',undefined,undefined,'ness-input');for(const [key,title] of options){const o=el('option',title,e);o.value=key;}e.value=value;return e;};
 const checkbox=(parent,title,checked)=>{const label=el('label',undefined,parent,'ness-check-label'),e=input('','checkbox');e.checked=Boolean(checked);label.append(e,el('span',title));help(label,title,e);return e;};
 const section=(parent,title,open=false)=>{const e=el('details',undefined,parent,'ness-section');e.open=open;el('summary',title,e);return e;};
 const row=parent=>el('div',undefined,parent,'ness-row');
 const note=(parent,text)=>el('p',text,parent,'ness-note');
 return {el,clear,input,area,field,button,choice,checkbox,section,row,note,help,tip};
}

function createNessTabs(ui,parent,label){
 const {el,button}=ui,bar=el('div',undefined,parent,'ness-tab-strip'),tabs=[];
 bar.setAttribute('role','tablist');bar.setAttribute('aria-label',label);
 const viewport=el('div',undefined,parent,'ness-tab-viewport');
 function select(index,focus=false){
  for(const [i,{tab,content}] of tabs.entries()){
   const active=i===index;
   tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;content.hidden=!active;
  }
  if(focus)tabs[index].tab.focus();
 }
 return {add(title){
  const index=tabs.length,id='ness-tab-'+(++nessHelpSequence);
  const tab=button(title,bar,()=>select(index),'ness-tab');tab.id=id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',id+'-panel');
  const content=el('div',undefined,viewport,'ness-tab-content');content.id=id+'-panel';content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',id);content.tabIndex=0;
  tabs.push({tab,content});
  tab.setAttribute('aria-selected',String(index===0));tab.tabIndex=index===0?0:-1;content.hidden=index!==0;
  tab.onkeydown=event=>{
   const next={ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
   if(next===undefined)return;
   event.preventDefault();select(next,true);
  };
  return content;
 }};
}

// Module: ui_styles


// Module: ui_child_dialog
// One lifecycle for child dialogs in Settings: focus, inert background, dismissal and cleanup.
function createNessChildDialog(D,panel,{title,marker,onClose=()=>{}}){
 if(panel.querySelector('[data-ness-child-dialog]'))throw Error('Сначала закрой открытое дополнительное окно.');
 const ui=createUiKit(D),{el,button}=ui;closeNessTooltip();closeNessTheme();const previous=D.activeElement;
 const shade=el('div',undefined,panel,'ness-child-shade');shade.setAttribute('data-ness-child-dialog','');if(marker)shade.setAttribute(marker,'');
 const box=el('div',undefined,shade,'ness-child');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
 const siblings=[...panel.children].filter(e=>e!==shade).map(e=>[e,e.inert]);for(const [e]of siblings)e.inert=true;
 const head=el('div',undefined,box,'ness-child-head');el('h4',title,head);const close=button('×',head,undefined,'icon quiet');close.setAttribute('aria-label','Закрыть: '+title);
 const body=el('div',undefined,box,'ness-child-body'),actions=el('div',undefined,box,'ness-child-actions');let closed=false;
 function finish(){if(closed)return;closed=true;closeNessTooltip();D.removeEventListener('keydown',key,true);for(const [e,inert]of siblings)e.inert=inert;shade.remove();previous?.focus?.();onClose();}
 const key=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.key==='Tab'){const nodes=[...box.querySelectorAll('button,input,textarea,select,summary')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects?.().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&D.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first.focus();}}};
 D.addEventListener('keydown',key,true);close.onclick=finish;shade.onclick=e=>{if(e.target===shade)finish();};close.focus();
 return {...ui,shade,box,body,actions,finish,get closed(){return closed;}};
}

// Module: alias_tags
function createAliasTags(D,values,onChange){
 const ui=createUiKit(D),element=ui.el('div',undefined,undefined,'ness-aliases');
 ui.el('span','Другие имена и псевдонимы',element,'ness-label');
 element.setAttribute('role','group');element.setAttribute('aria-label','Другие имена и псевдонимы');
 const chips=ui.el('div',undefined,element,'ness-alias-chips'),input=ui.input('');
 input.placeholder='Введи имя и нажми Enter';input.setAttribute('aria-label','Добавить псевдоним');input.setAttribute('enterkeyhint','done');input.setAttribute('autocomplete','off');element.appendChild(input);
 ui.help(element,'Другие имена и псевдонимы',input);
 let items=[...(values||[])];
 function render(){
  ui.clear(chips);
  items.forEach((name,index)=>{
   const chip=ui.el('span',undefined,chips,'ness-alias-chip');ui.el('span',name,chip);
   const remove=ui.button('×',chip,()=>{items.splice(index,1);render();onChange();},'icon quiet');remove.setAttribute('aria-label','Удалить псевдоним '+name);remove.title='Удалить '+name;
  });
 }
 function add(text){
  const names=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let changed=false;
  for(const name of names)if(!items.includes(name)){items.push(name);changed=true;}
  if(changed){render();onChange();}return changed;
 }
 function commit(){const text=input.value;input.value='';return add(text);}
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();commit();}};
 input.oninput=()=>{if(/[\r\n]/.test(input.value))commit();else onChange();};
 input.onpaste=e=>{const text=e.clipboardData?.getData('text/plain');if(text&&/[\r\n]/.test(text)){e.preventDefault();commit();add(text);}};
 render();return {element,input,commit,get values(){return items.slice();}};
}

// Module: virtual_list
// Keep only the visible rows plus a small scroll buffer in the DOM.
function createVirtualList(D,container,renderRow,{rowHeight=56,overscan=6,emptyText='Ничего не найдено.'}={}){
 const ui=createUiKit(D),top=ui.el('div',undefined,container),rows=ui.el('div',undefined,container),bottom=ui.el('div',undefined,container);
 top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');
 let items=[],start=-1,end=-1,frame=null,disposed=false;
 const request=typeof window.requestAnimationFrame==='function'?fn=>window.requestAnimationFrame(fn):fn=>setTimeout(fn,16);
 const getRowHeight=()=>typeof rowHeight==='function'?rowHeight():rowHeight;
 const cancel=typeof window.cancelAnimationFrame==='function'?id=>window.cancelAnimationFrame(id):id=>clearTimeout(id);
 function paint(force=false){
  if(disposed)return;
  const rowHeight=getRowHeight(),height=container.clientHeight||400,from=Math.max(0,Math.floor((container.scrollTop||0)/rowHeight)-overscan),to=Math.min(items.length,from+Math.ceil(height/rowHeight)+overscan*2);
  if(!force&&from===start&&to===end)return;start=from;end=to;
  top.style.height=(from*rowHeight)+'px';bottom.style.height=(Math.max(0,items.length-to)*rowHeight)+'px';ui.clear(rows);
  if(!items.length){ui.el('p',emptyText,rows,'ness-note');return;}
  for(let i=from;i<to;i++)rows.appendChild(renderRow(items[i]));
 }
 function refresh(){if(disposed||frame!==null)return;frame=request(()=>{frame=null;paint(true);});}
 container.onscroll=()=>{if(disposed||frame!==null)return;frame=request(()=>{frame=null;paint();});};
 const Observer=window.ResizeObserver;const observer=Observer?new Observer(refresh):null;observer?.observe(container);
 return {setItems(value,{reset=false}={}){items=value;const limit=Math.max(0,items.length*getRowHeight()-(container.clientHeight||400));container.scrollTop=reset?0:Math.min(container.scrollTop||0,limit);paint(true);},refresh,dispose(){disposed=true;if(frame!==null)cancel(frame);observer?.disconnect();container.onscroll=null;},get renderedCount(){return rows.children.length;}};
}

// Module: dialogs
function createDialogShell(kind='review'){
 return createOwnedDialogShell(kind,{loadTheme:loadNessTheme,applyTheme:applyNessTheme});
}
function mountDialog(overlay,onChatChanged){
 return mountOwnedDialog(overlay,{onChatChanged,onCleanup:()=>{closeNessTooltip();closeNessTheme();}});
}

async function previewFinalPrompt(config, origin) {
 const {overlay,panel}=createDialogShell('prompt');
 const ui=createUiKit(document);createNessHeader(document,panel,'Итоговый промпт','Последняя проверка перед генерацией','NAI5');
 const scroll=ui.el('div',undefined,panel);scroll.setAttribute('data-review-scroll','');
 const tools=ui.el('div',undefined,scroll,'ness-prompt-toolbar');ui.el('span','✎ Готовое задание · можно редактировать',tools);
 ui.el('span',config.aspect_ratio+' · '+config.image_size,tools,'ness-badge');const counter=ui.el('span','',tools,'ness-badge');
 const field=ui.area('');field.setAttribute('data-final-prompt','');field.setAttribute('aria-label','Итоговый промпт');ui.field(scroll,'Итоговый промпт',field);
 const actions=ui.el('footer',undefined,panel);actions.setAttribute('data-review-actions','');
 const error=ui.el('p','',actions,'ness-error');error.setAttribute('data-error','');error.style.display='none';
 const cancel=ui.button('Отмена',actions),send=ui.button('Отправить в NAI5',actions,undefined,'primary');cancel.setAttribute('data-preview-cancel','');send.setAttribute('data-preview-send','');
 field.value=config.prompt;const updateCount=()=>{counter.textContent=field.value.length.toLocaleString('ru-RU')+' / 45 000 знаков';};field.oninput=updateCount;updateCount();
 const previousFocus=document.activeElement;
 let onChatSwitch=()=>{};
 const cleanupViewport=mountDialog(overlay,()=>onChatSwitch());
 return await new Promise(resolve=>{
  let closed=false;
  const close=result=>{
   if(closed)return;closed=true;
   document.removeEventListener('keydown',onKey,true);
   cleanupViewport();overlay.remove();previousFocus?.focus?.();resolve(result);
  };
  onChatSwitch=()=>close(false);
  const onKey=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);}};
  document.addEventListener('keydown',onKey,true);
  cancel.onclick=()=>close(false);
  panel.querySelector('.ness-close-dialog').onclick=()=>cancel.click();
  overlay.onclick=e=>{if(e.target===overlay)close(false);};
  send.onclick=()=>{
   if(closed)return;
   error.style.display='none';
   const now=SillyTavern.getContext();
   if(now.chat!==origin.chat||now.chatId!==origin.id||now.chat.length!==origin.count){error.textContent='Чат изменился. Отмени отправку и запусти профиль заново.';error.style.display='block';return;}
   const edited=field.value.trim();
   if(!edited||edited.length>45000){error.textContent=!edited?'Промпт не может быть пустым.':'Промпт длиннее 45 000 символов.';error.style.display='block';return;}
   config.prompt=edited;
   close(true);
  };
 });
}


// Module: library_view
function createLibraryView(D){
 const ui=createUiKit(D),{el,input,field,button,note}=ui,{overlay,panel}=createDialogShell('library');panel.setAttribute('data-view','list');
 const {badge:total}=createNessHeader(D,panel,'Библиотека','Персонажи и постоянные образы','SP Imagen');
 const tools=el('div',undefined,panel,'ness-library-tools'),filters=el('div',undefined,tools,'ness-library-filters');
 const search=field(filters,'⌕ Поиск',input('','search'));search.placeholder='Найти персонажа…';search.setAttribute('data-library-search','');search.setAttribute('aria-label','Поиск персонажей');
 const add=button('+ Персонаж',filters,undefined,'primary');
 const tagTools=el('div',undefined,tools,'ness-tag-tools'),addTag=button('+ Тег',tagTools),tagStrip=el('div',undefined,tagTools,'ness-tag-strip');tagStrip.setAttribute('data-tag-filters','');
 const editTag=button('⋯',tagTools,undefined,'icon quiet');editTag.hidden=true;editTag.setAttribute('aria-label','Изменить выбранный тег');ui.tip(editTag,'Имя, цвет и удаление выбранного тега.');
 const tagEditor=el('div',undefined,tagTools,'ness-tag-editor');tagEditor.hidden=true;
 const tagName=field(tagEditor,'Название тега',input(''));tagName.placeholder='Новый тег';tagName.setAttribute('aria-label','Название тега');
 const tagColor=field(tagEditor,'Цвет тега',input('#c4b3db','color'));tagColor.parentNode.className+=' ness-tag-color-field';
 const applyTag=button('✓ Готово',tagEditor),deleteTag=button('Удалить',tagEditor,undefined,'danger'),cancelTag=button('×',tagEditor,undefined,'icon quiet');cancelTag.setAttribute('aria-label','Закрыть редактирование тега');
 const bulk=el('div',undefined,tools,'ness-library-bulk');bulk.hidden=true;const count=note(bulk,''),bulkActions=el('div',undefined,bulk,'ness-row'),bulkTags=el('div',undefined,bulk,'ness-tag-strip');bulkTags.setAttribute('data-bulk-tags','');
 const workspace=el('div',undefined,panel,'ness-library-workspace'),listpane=el('div',undefined,workspace,'ness-library-listpane');
 const resultCount=el('p','',listpane,'ness-library-count'),list=el('div',undefined,listpane);list.setAttribute('data-library-list','');
 const form=el('div',undefined,workspace,'ness-library-editorpane');form.setAttribute('data-library-editor','');
 const constructorHost=el('section',undefined,panel,'ness-library-constructor');constructorHost.hidden=true;constructorHost.setAttribute('aria-label','Полноэкранный конструктор тегов');
 const actions=el('footer',undefined,panel,'ness-footer-library');actions.setAttribute('data-review-actions','');
 const footerLeft=el('div',undefined,actions,'ness-footer-left'),importButton=button('↥',footerLeft,undefined,'icon quiet'),exportButton=button('↧',footerLeft,undefined,'icon quiet');
 importButton.setAttribute('aria-label','Импорт библиотеки');exportButton.setAttribute('aria-label','Экспорт библиотеки');
 ui.tip(importButton,'Импорт библиотеки из JSON: записи, внешность, псевдонимы и теги. Файл загрузится в черновик; действующая библиотека изменится после сохранения.');
 ui.tip(exportButton,'Экспорт всей текущей библиотеки в JSON: записи, внешность, псевдонимы, теги и их цвета.');
 const upload=input('','file');upload.hidden=true;upload.accept='.json,application/json';upload.setAttribute('data-library-import','');footerLeft.appendChild(upload);importButton.onclick=()=>upload.click();
 const message=el('p','',actions,'ness-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const close=button(getExtension?.()?.hubChildOpen?'← Назад':'Закрыть',actions),save=button('✓ Сохранить',actions,undefined,'primary');save.setAttribute('data-library-save','');
 function resetEditor(){constructorHost.hidden=true;ui.clear(constructorHost);ui.clear(form);const empty=el('div',undefined,form,'ness-library-empty');el('div','✧',empty,'ness-empty-symbol');el('h4','Выбери персонажа',empty);note(empty,'Нажми на строку слева, чтобы открыть запись.');panel.setAttribute('data-view','list');}
 function showEditor(){constructorHost.hidden=true;panel.setAttribute('data-view','editor');form.scrollTop=0;}
 function showConstructor(){constructorHost.hidden=false;panel.setAttribute('data-view','constructor');}
 function selection(n){count.textContent='Выбрано: '+n;bulk.hidden=n===0;}
 function counts(all,visible){total.textContent=String(all);resultCount.textContent=visible===all?'Персонажей: '+all:'Найдено: '+visible+' из '+all;}
 resetEditor();return {...ui,overlay,panel,search,tools,tagStrip,bulk,bulkActions,bulkTags,list,form,message,add,save,close,resetEditor,showEditor,showConstructor,constructorHost,selection,counts,addTag,editTag,tagEditor,tagName,tagColor,applyTag,deleteTag,cancelTag,upload,importButton,exportButton};
}

// Module: library_store





function libraryEntries(data){
 return [...Object.entries(data.personas).map(([id,entry])=>({id,group:'personas',entry})),...Object.entries(data.characters).map(([id,entry])=>({id,group:'characters',entry}))];
}
function validateMasterLibrary(input,{copy=true}={}){
 if(!input||input.version!==1||!input.personas||!input.characters||Array.isArray(input.personas)||Array.isArray(input.characters)||typeof input.personas!=='object'||typeof input.characters!=='object')throw Error('Неверный формат библиотеки: нужны version: 1, personas и characters.');
 const data=copy?cloneLibrary(input):input,ids=new Set();
 if(Object.hasOwn(data,'appearanceRules')){
  const rules=normalizeAppearanceRules(data.appearanceRules);
  if(Object.keys(rules).length)data.appearanceRules=rules;else delete data.appearanceRules;
 }
 for(const {id,entry} of libraryEntries(data)){
  if(!safeLibraryId(id)||ids.has(id))throw Error('Некорректный или повторяющийся ключ персонажа: '+id);
  ids.add(id);
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||typeof entry.name!=='string'||!entry.name.trim()||typeof entry.base!=='string'||!entry.base.trim())throw Error('Заполни имя и постоянную внешность: '+id);
  if(entry.aliases!==undefined&&(!Array.isArray(entry.aliases)||entry.aliases.some(a=>typeof a!=='string')))throw Error('Неверный список имён персонажа: '+id);
  if(entry.appearanceFormat!==undefined&&!['tags','prose'].includes(entry.appearanceFormat))throw Error('Неверный формат внешности для '+id+': нужны tags или prose.');
  if(Object.hasOwn(entry,'appearanceRanges')){
   const ranges=normalizeAppearanceRanges(entry.base,entry.appearanceRanges);
   if(ranges.length)entry.appearanceRanges=ranges;else delete entry.appearanceRanges;
  }
  if(Object.hasOwn(entry,'appearanceSelections'))entry.appearanceSelections=normalizeAppearanceSelections(entry.base,entry.appearanceSelections);
  if(Object.hasOwn(entry,'appearanceSections'))entry.appearanceSections=normalizeAppearanceSections(entry.appearanceSections,entry.base);
  if(Object.hasOwn(entry,'appearanceSkin'))entry.appearanceSkin=normalizeSkinTags(entry.appearanceSkin);
   if(Object.hasOwn(entry,'appearanceCatalog'))entry.appearanceCatalog=normalizeAppearanceCatalog(entry.appearanceCatalog,entry.base,entry.appearanceSkin,{nudeUpper:entry.nudeUpper,nudeLower:entry.nudeLower},entry.appearanceSections);
 }
 const source=data.organizer||{},tags=[],tagIds=new Set(),names=new Map(),remap=new Map();
 const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 const legacy=Array.isArray(source.folders)?source.folders:[];
 for(const tag of [...(Array.isArray(source.tags)?source.tags:[]),...legacy]){
  if(!tag||!safeLibraryId(tag.id)||typeof tag.name!=='string'||!tag.name.trim())throw Error('Некорректный тег библиотеки.');
  const key=normalize(tag.name),existing=names.get(key);
  if(existing){remap.set(tag.id,existing);continue;}
  if(tagIds.has(tag.id))throw Error('Повторяющийся ключ тега: '+tag.id);
  tagIds.add(tag.id);names.set(key,tag.id);remap.set(tag.id,tag.id);tags.push({id:tag.id,name:tag.name.trim(),color:/^#[a-f0-9]{6}$/i.test(tag.color||'')?tag.color:'#c4b3db'});
 }
 const characters={};
 for(const id of ids){
  const item=source.characters?.[id]||{};
  const assigned=[...new Set([...(Array.isArray(item.tagIds)?item.tagIds:[]),...(item.folderId?[item.folderId]:[])].map(t=>remap.get(t)).filter(t=>tagIds.has(t)))];
  if(assigned.length)characters[id]={tagIds:assigned};
 }
 const filterTagId=source.filterTagId===''?'':remap.get(source.filterTagId)??'*';
 data.organizer={version:3,tags,characters,filterTagId};
 return data;
}
function masterLibraryRaw(){return SillyTavern.getContext()?.extensionSettings?.variables?.global?.[MASTER_LIBRARY_KEY]??'';}
function loadMasterLibrary(){
 const raw=masterLibraryRaw();
 if(!raw)return validateMasterLibrary({version:1,personas:{},characters:{}});
 try{return typeof raw==='string'?validateMasterLibrary(JSON.parse(raw),{copy:false}):validateMasterLibrary(raw);}catch(e){throw Error('Не удалось прочитать библиотеку: '+String(e?.message||e));}
}

// Module: library_publish
function librarySnapshot(data){
 return 'PERSONAL CHARACTER IDENTITY LIBRARY — fixed appearance data; use only people visible in the scene. Copy retained descriptions verbatim. Optional marks and anatomy apply only when uncovered and visible.\n'+JSON.stringify(libraryEntries(data).map(({id,group,entry:{appearanceRanges,appearanceSelections,appearanceCatalog,...entry}})=>({id,type:group==='personas'?'persona':'character',...entry})),null,1);
}
async function saveMasterLibrary(input,expectedRaw){
 const st=SillyTavern.getContext();
 if(!st?.extensionSettings||typeof st.saveSettingsDebounced!=='function')throw Error('Недоступно сохранение общих настроек SillyTavern.');
 if(masterLibraryRaw()!==expectedRaw)throw Error('Библиотека уже изменилась в другом окне. Закрой редактор и открой заново, чтобы не затереть изменения.');
 const data=validateMasterLibrary(input);
 data.savedAt=new Date().toISOString();data.catalogRevision=(Number(data.catalogRevision)||0)+1;
 // The retired attribute-ID catalogue is not consumed by these profiles.
 delete data.attributeCatalog;
 st.extensionSettings.variables||={};const global=st.extensionSettings.variables.global||={};
 const keys=[MASTER_LIBRARY_KEY,MASTER_SNAPSHOT_KEY,MASTER_BACKUP_KEY],previous=new Map(keys.map(k=>[k,global[k]]));
 const serialized=JSON.stringify(data);
 if(expectedRaw)global[MASTER_BACKUP_KEY]=typeof expectedRaw==='string'?expectedRaw:JSON.stringify(expectedRaw);
 global[MASTER_LIBRARY_KEY]=serialized;global[MASTER_SNAPSHOT_KEY]=librarySnapshot(data);
 try{await st.saveSettingsDebounced();}
 catch(e){if(global[MASTER_LIBRARY_KEY]===serialized)for(const [k,v] of previous){if(v===undefined)delete global[k];else global[k]=v;}throw e;}
 return {data,raw:serialized};
}
function newLibraryId(prefix,existing){
 let id;do{id=prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}while(existing.has(id));return id;
}

// Module: library_recovery
function restoreLibraryBodyFields(input){
 const source=NESS_RECOVERED_BODY;
 if(!Object.keys(source.records).length)return {data:input,changed:false,count:0};
 if(Number(input.bodyRecoveryVersion)>=source.version)return {data:input,changed:false,count:0};
 const data=cloneLibrary(input);
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 let count=0,matched=false;
 for(const {id,entry} of libraryEntries(data)){
  const saved=source.records[id];if(!saved)continue;
  const names=[saved.name,...saved.aliases].map(norm),current=[entry.name,...(entry.aliases||[])].map(norm);
  if(!current.some(n=>n&&names.includes(n)))continue;
  matched=true;
  for(const key of ['nudeUpper','nudeLower']){
   const value=saved.fields[key];
   if(typeof value==='string'&&value.trim()&&(entry[key]===undefined||typeof entry[key]==='string'&&!entry[key].trim())){entry[key]=value;count++;}
  }
 }
 if(matched)data.bodyRecoveryVersion=source.version;
 return {data,changed:matched,count};
}

// Module: appearance_visibility_editor
function createAppearanceVisibilityEditor(ui,form,area,initial,changed,tagColor,save,canEdit,readNsfw=()=>({}),writeNsfw=()=>{},openCategory=()=>{}){
 const {el,clear,button,input}=ui;
 const wrap=el('div',undefined,undefined,'ness-appearance-wrap');
 if(tagColor)wrap.style.setProperty('--ness-appearance-color',tagColor);
 area.parentNode.insertBefore(wrap,area);
 const fragments=el('div',undefined,wrap,'ness-appearance-fragments');
 fragments.setAttribute('aria-label','Фразы внешности для выбранного ракурса');
 wrap.appendChild(area);area.hidden=true;
 const tagInput=input();tagInput.className+=' ness-appearance-tag-input';wrap.appendChild(tagInput);
 tagInput.placeholder='Новый тег → Enter';tagInput.setAttribute('aria-label','Тег внешности');
 const moves=el('div',undefined,wrap,'ness-appearance-moves');
 const moveEarlier=button('← Раньше',moves,()=>moveEditedTag(-1),'quiet');
 const moveLater=button('Позже →',moves,()=>moveEditedTag(1),'quiet');
 const pencil=button('✎',wrap,undefined,'icon quiet ness-appearance-pencil');
 pencil.setAttribute('aria-label','Разметить видимую внешность');
 pencil.setAttribute('aria-pressed','false');
 const box=el('div',undefined,wrap.parentNode,'ness-appearance-tools');
 const editHelp='Enter добавляет тег. Для перестановки потяни за ⠿ или нажми на тег и выбери «Раньше» или «Позже».';
 const message=el('p',editHelp,box,'ness-note');
 message.setAttribute('aria-live','polite');
 const presets=el('div',undefined,box,'ness-appearance-presets');
 presets.setAttribute('role','group');presets.setAttribute('aria-label','Ракурсы внешности');
 const presetButtons=new Map();
 const copyToggle=button('Добавить из ракурса',box,()=>{
  if(!editing||transitioning||!canEdit())return;
  if(copyPanel.hidden)openCopyPanel();else closeCopyPanel();
 },'quiet');
 copyToggle.hidden=true;copyToggle.setAttribute('aria-expanded','false');
 const copyPanel=el('div',undefined,box,'ness-appearance-copy');copyPanel.hidden=true;
 let base=area.value;
 let ranges=normalizeAppearanceRanges(base,initial.appearanceRanges);
 let selections=normalizeAppearanceSelections(base,initial.appearanceSelections);
 let activePreset='face',editing=false,pending=false,transitioning=false,editingTag=null,draggedStart=null;
 let formatMode=initial.appearanceFormat==='prose'?'prose':'tags';

 const labels=new Map([[NESS_APPEARANCE_ALWAYS,'Вставлять всегда'],...Object.entries(NESS_APPEARANCE_PRESETS).map(([id,preset])=>[id,preset.label])]);
 for(const [id,label] of labels){
  const chip=button(undefined,presets,()=>changePreset(id),'ness-appearance-preset');
  chip.setAttribute('data-appearance-preset',id);
  el('span',label,chip);
  const dot=el('span',undefined,chip,'ness-appearance-filled');dot.setAttribute('aria-hidden','true');
  presetButtons.set(id,{chip,dot});
 }
 function selected(id){return visibleAppearanceRanges(ranges,id,selections);}
 function closeCopyPanel(){
  copyPanel.hidden=true;clear(copyPanel);copyToggle.setAttribute('aria-expanded','false');
 }
 function openCopyPanel(){
  const sources=[];
  const choices=el('div',undefined,copyPanel,'ness-row');
  for(const [id,label] of labels){
   if(id===activePreset||!selected(id).length)continue;
   const option=el('label',undefined,choices,'ness-check-label');
   const checkbox=input('','checkbox');option.appendChild(checkbox);el('span',label,option);
   sources.push({id,checkbox});
  }
  copyPanel.hidden=false;copyToggle.setAttribute('aria-expanded','true');
  if(!sources.length){el('p','В других разделах пока нет отметок.',copyPanel,'ness-note');return;}
  button('Добавить отмеченные',copyPanel,()=>{
   if(!editing||transitioning||!canEdit())return;
   const ids=sources.filter(({checkbox})=>checkbox.checked).map(({id})=>id);
   if(!ids.length){message.textContent='Выбери хотя бы один раздел.';return;}
   const current=selected(activePreset);
   const combined=visibleAppearanceRanges([],activePreset,{[activePreset]:[...current,...ids.flatMap(selected)]});
   closeCopyPanel();
   if(JSON.stringify(combined)===JSON.stringify(current)){
    message.textContent='Эти отметки уже есть в текущем разделе.';return;
   }
   selections[activePreset]=normalizeAppearanceRanges(base,combined,true);
   pending=true;changed();updatePresets();drawFragments();
   message.textContent='Отметки добавлены к текущему разделу.';
  },'primary');
 }
 function updatePresets(){
  for(const [id,{chip,dot}] of presetButtons){
   const filled=selected(id).length>0;
   dot.hidden=!filled;
   chip.setAttribute('aria-pressed',String(id===activePreset));
   chip.setAttribute('aria-label',labels.get(id)+(filled?', есть разметка':''));
  }
 }
 function clauses(){
  const items=[];
  for(const match of base.matchAll(/[^,]+/g)){
   let text=match[0].trim();
   if(match.index+match[0].length===base.length)text=text.replace(/;+$/,'').trimEnd();
   if(!text)continue;
   const start=match.index+match[0].indexOf(text);
   items.push({start,end:start+text.length,text});
  }
  return items;
 }
 function drawFragments(focusStart){
  const scroll=fragments.scrollTop,visible=editing?selected(activePreset):[];
  clear(fragments);
  const items=clauses();
  for(const [index,fragment] of items.entries()){
   const {start,end,text}=fragment;
   const marked=visible.some(r=>r.start<end&&start<r.end);
   const chip=el('span',undefined,fragments,'ness-appearance-chip');
   chip.setAttribute('data-selected',String(marked));
   const part=button(text,chip,e=>{
    e?.preventDefault();if(!canEdit())return;
    if(editing)toggleFragment(fragment,e?.detail===0);
    else{editingTag=fragment;tagInput.value=text;updateMoves();tagInput.focus();tagInput.select?.();}
   },'quiet ness-appearance-fragment');
   if(editing)part.setAttribute('aria-pressed',String(marked));
   else{
    if(items.length>1){
     const handle=el('span','⠿',undefined,'ness-appearance-drag');
     handle.draggable=true;handle.title='Перетащить тег';handle.setAttribute('aria-hidden','true');chip.insertBefore(handle,part);
     handle.ondragstart=event=>{
      if(!canEdit()||editing){event.preventDefault();return;}
      draggedStart=start;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-ness-tag','move');
     };
     handle.ondragend=()=>{draggedStart=null;};
     chip.ondragover=event=>{
      if(draggedStart===null||draggedStart===start||!canEdit()||editing)return;
      event.preventDefault();event.dataTransfer.dropEffect='move';
     };
     chip.ondrop=event=>{
      if(draggedStart===null||!canEdit()||editing)return;
      event.preventDefault();const from=draggedStart;draggedStart=null;reorderTags(from,index);
     };
    }
    const remove=button('×',chip,e=>{e?.preventDefault();if(canEdit())removeTag(items,index);},'quiet ness-appearance-remove');
    remove.setAttribute('aria-label','Удалить тег '+text);
   }
   if(start===focusStart)part.focus();
  }
  fragments.scrollTop=scroll;
  updateMoves();
 }
 function updateMoves(){
  const items=clauses(),index=items.findIndex(item=>item.start===editingTag?.start);
  moves.hidden=formatMode==='prose'||editing||index<0||items.length<2;
  moveEarlier.disabled=index<=0;moveLater.disabled=index<0||index===items.length-1;
 }
 function moveEditedTag(direction){
  if(!editingTag)return;
  const index=clauses().findIndex(item=>item.start===editingTag.start);
  if(index>=0)reorderTags(editingTag.start,index+direction);
 }
 function reorderTags(fromStart,to){
  if(editing||transitioning||!canEdit())return;
  const items=clauses(),from=items.findIndex(item=>item.start===fromStart);
  if(from<0||from===to||to<0||to>=items.length)return;
  const original=items.slice(),[moved]=items.splice(from,1);items.splice(to,0,moved);
  const positions=new Map();let cursor=0;
  const next=items.map((item,index)=>{
   const text=index===items.length-1?item.text.replace(/;+$/,'').trimEnd():item.text;
   positions.set(item.start,{start:cursor,end:cursor+text.length,text});
   cursor+=text.length+2;return text;
  }).join(', ')+';';
  function remap(marked,allowUnclassified){
   const pieces=[];
   for(const range of marked)for(const item of original){
    const start=Math.max(range.start,item.start),end=Math.min(range.end,item.end);
    if(start>=end)continue;
    const destination=positions.get(item.start);
    const mappedStart=destination.start+start-item.start;
    const mappedEnd=Math.min(destination.end,destination.start+end-item.start);
    if(mappedStart<mappedEnd)pieces.push({...range,start:mappedStart,end:mappedEnd,text:next.slice(mappedStart,mappedEnd)});
   }
   return normalizeAppearanceRanges(next,pieces,allowUnclassified);
  }
  ranges=remap(ranges,false);
  selections=Object.fromEntries(Object.entries(selections).map(([id,marked])=>[id,remap(marked,true)]));
  if(editingTag)editingTag=positions.get(editingTag.start)||null;
  area.value=base=next;changed();updatePresets();drawFragments();
 }
 function writeTags(next){
  area.value=next.trim()?next.trimEnd().replace(/[;,\s]+$/,'')+';':'';
  sync();changed();drawFragments();
 }
 function removeTag(items,index){
  const item=items[index],next=items[index+1],previous=items[index-1];
  const start=next?item.start:(previous?.end??0),end=next?next.start:base.length;
  editingTag=null;tagInput.value='';writeTags(base.slice(0,start)+base.slice(end));
 }
 tagInput.onkeydown=e=>{
  if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'&&editingTag){e.preventDefault();e.stopPropagation();editingTag=null;tagInput.value='';updateMoves();return;}
  if(e.key!=='Enter'||e.isComposing)return;
  e.preventDefault();if(!canEdit()||editing)return;
  const text=tagInput.value.split(',').map(part=>part.trim().replace(/;+$/,'').trimEnd()).filter(Boolean).join(', ');
  if(!text)return;
  const target=editingTag;editingTag=null;tagInput.value='';
  writeTags(target?base.slice(0,target.start)+text+base.slice(target.end):[base.trimEnd().replace(/[;,\s]+$/,''),text].filter(Boolean).join(', '));
 };
 function toggleFragment(fragment,keyboard=false){
  if(!editing||transitioning||!canEdit())return;
  const current=selections[activePreset]||selected(activePreset);
  const overlap=r=>r.start<fragment.end&&fragment.start<r.end;
  const isMarked=current.some(overlap);
  const currentRanges=current.flatMap(r=>{
   if(!isMarked||!overlap(r))return [r];
   const pieces=[];
   if(r.start<fragment.start)pieces.push({...r,end:fragment.start,text:base.slice(r.start,fragment.start)});
   if(r.end>fragment.end)pieces.push({...r,start:fragment.end,text:base.slice(fragment.end,r.end)});
   return pieces;
  });
  if(!isMarked){
   const known=ranges.find(r=>r.start===fragment.start&&r.end===fragment.end);
   currentRanges.push(known||fragment);
  }
  const previous=selections[activePreset];
  selections[activePreset]=normalizeAppearanceRanges(base,currentRanges,true);
  if(!isMarked&&!selected(activePreset).some(overlap)){
   if(previous)selections[activePreset]=previous;else delete selections[activePreset];
   message.textContent='Такая фраза уже отмечена для этого ракурса.';
   return;
  }
  pending=true;changed();updatePresets();drawFragments(keyboard?fragment.start:undefined);
 }
 async function savePending(){
  if(!pending)return true;
  transitioning=true;
  try{if(!await save())return false;pending=false;return true;}
  finally{transitioning=false;}
 }
 async function changePreset(id){
  if(id===activePreset||transitioning||!canEdit())return;
  if(editing&&!await savePending())return;
  closeCopyPanel();
  activePreset=id;updatePresets();drawFragments();
  if(editing)updateMarkingHelp();
 }
 function updateMarkingHelp(){
  message.textContent=activePreset===NESS_APPEARANCE_ALWAYS
   ?'Отметь теги, которые нужны в любом ракурсе. Они появятся один раз, в порядке основного списка.'
   :'Нажимай на теги, чтобы отметить их для ракурса. В промпт они попадут в порядке списка. Смена ракурса и выход сохраняют разметку.';
 }
 pencil.onclick=async e=>{
  e?.preventDefault();
  if(formatMode==='prose'||transitioning||!canEdit())return;
  if(editing&&!await savePending())return;
  editing=!editing;
  closeCopyPanel();copyToggle.hidden=!editing;
  wrap.setAttribute('data-marking',String(editing));box.setAttribute('data-marking',String(editing));pencil.setAttribute('aria-pressed',String(editing));
  pencil.setAttribute('aria-label',editing?'Закончить разметку и сохранить':'Разметить видимую внешность');
  tagInput.hidden=editing;
  if(editing){
   sync();
   updateMarkingHelp();
  }else{
   message.textContent=editHelp;
  }
  drawFragments();
 };
 function sync(){
  const next=area.value;if(next===base)return;
  let prefix=0,suffix=0;
  while(prefix<Math.min(next.length,base.length)&&next[prefix]===base[prefix])prefix++;
  while(suffix<Math.min(next.length,base.length)-prefix&&next.at(-suffix-1)===base.at(-suffix-1))suffix++;
  const delta=next.length-base.length;
  const move=(items,unclassified)=>normalizeAppearanceRanges(next,items.flatMap(r=>{
   if(r.end<=prefix)return [r];
   if(r.start>=base.length-suffix)return [{...r,start:r.start+delta,end:r.end+delta}];
   return [];
  }),unclassified);
  const previousCount=ranges.length+Object.values(selections).flat().length;
  ranges=move(ranges,false);
  selections=Object.fromEntries(Object.entries(selections).map(([id,items])=>[id,move(items,true)]));
  if(ranges.length+Object.values(selections).flat().length<previousCount)message.textContent='Метки изменённых фраз сняты. При необходимости отметь их заново.';
  base=next;updatePresets();
 }
 area.oninput=()=>{sync();changed();drawFragments();};
 let skin=normalizeSkinTags(initial.appearanceSkin),sections=normalizeAppearanceSections(initial.appearanceSections,base);
  let catalog=normalizeAppearanceCatalog(initial.appearanceCatalog,base,skin,readNsfw(),sections),board=null;
 function openBoard(parent,{mode='base',preset}={}){
  sync();
  closeBoard();
  board=createAppearanceBoard({
   ui,parent,initialSkin:skin,initialSections:sections,initialCatalog:catalog,initialMode:mode,initialPreset:preset,
    readNsfwState:readNsfw,writeNsfwState:writeNsfw,
   readBaseState:()=>({base,ranges,selections}),
   writeBaseState:next=>{
    area.value=base=next.base;
    ranges=normalizeAppearanceRanges(base,next.ranges);
    selections=normalizeAppearanceSelections(base,next.selections);
    changed();updatePresets();drawFragments();
   },
   changed,readOnly:()=>!canEdit()
  });
  board.setAvailableFormat(formatMode);
  return board;
 }
 function closeBoard(){
  if(!board)return;
  skin=board.getSkin();
  sections=board.getSections();catalog=board.getCatalog();
  board.element.remove();
  board=null;
 }
 function updateFormat(){
   const prose=formatMode==='prose';
   wrap.dataset.format=prose?'prose':'tags';
   area.hidden=!prose;
   fragments.hidden=prose;
   tagInput.hidden=prose||editing;
   moves.hidden=prose||editing||!editingTag;
   pencil.hidden=prose;
   if(!prose){drawFragments();updateMoves();}
   if(board)board.setAvailableFormat(formatMode);
 }
 updatePresets();drawFragments();updateFormat();
 return {
   setFormat(mode){
     const next=mode==='prose'?'prose':'tags';
     if(next===formatMode)return true;
     if(editing&&pending){message.textContent='Сначала заверши разметку ракурсов и сохрани изменения.';return false;}
     if(editing){editing=false;wrap.setAttribute('data-marking','false');box.setAttribute('data-marking','false');pencil.setAttribute('aria-pressed','false');}
     formatMode=next;updateFormat();
     return true;
   },
   openBoard,closeBoard,
   get format(){return formatMode;},
   get value(){sync();return {ranges,selections,skin:board?board.getSkin():skin,sections:board?board.getSections():normalizeAppearanceSections(sections,base),catalog:board?board.getCatalog():normalizeAppearanceCatalog(catalog,base,skin,readNsfw())};}
 };
}

// Module: library_editor
let guideOpenFirstRecord = () => false;
async function openLibraryEditor(){
 if(typeof document==='undefined')throw Error('Редактор доступен только внутри SillyTavern.');
 if(document.querySelector('#sp-imagen-review-overlay'))throw Error('Сначала закрой уже открытое окно.');
 let baseline=masterLibraryRaw(),draft=loadMasterLibrary(),dirty=false,busy=false,done=false,editor=null,discardAsked=false,editingTag=null,closeTagPicker=()=>{};
 const restored=restoreLibraryBodyFields(draft);
 if(restored.changed){const saved=await saveMasterLibrary(restored.data,baseline);draft=saved.data;baseline=saved.raw;}
 const origin=SillyTavern.getContext(),originChat=origin.chat,originId=origin.chatId,selected=new Set();
 const view=createLibraryView(document);
 const {overlay,panel,el,clear,input,area,field,button,choice,section,search,bulkActions,list,form,message,save,close}=view;
 const labels={name:'Имя',base:'Постоянная внешность',promptName:'Имя для промпта',subject:'Тип персонажа для промпта',thighMarks:'Отметины на бёдрах',kneeMarks:'Отметины на коленях',shinMarks:'Отметины на голенях',shoulderMarks:'Отметины на плечах',forearmMarks:'Отметины на предплечьях',nudeUpper:'Особенности открытого верха тела',nudeLower:'Особенности открытого низа тела'};
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 const status=text=>{if(message.textContent!==text)message.textContent=text;};
 let revision=0,indexedRevision=-1,searchIndex=[],currentVisibleRecords=[],inBoardMode=false;
 const changed=(indexChanged=false)=>{if(indexChanged===true)revision++;dirty=true;discardAsked=false;status('Не сохранено');};
 const setBusy=value=>{busy=value;for(const tag of ['input','textarea','select','button'])for(const e of panel.querySelectorAll(tag))e.disabled=value;};
 function flushEditor(){
  if(!editor)return;
  const {id,group,fields,aliases,kind,tagIds,visibility,appearanceFormat}=editor,entry=cloneLibrary(draft[group][id]);
  entry.appearanceFormat=appearanceFormat.value;
  for(const [key,e] of Object.entries(fields))if(e.value!==''||Object.hasOwn(entry,key))entry[key]=e.value;
  const {ranges,selections,skin,sections,catalog}=visibility.value;
  if(skin.tags.length||skin.sections.length||entry.appearanceSkin)entry.appearanceSkin=skin;
  if(sections.length||entry.appearanceSections)entry.appearanceSections=sections;
   entry.appearanceCatalog=catalog;
  if(ranges.length)entry.appearanceRanges=ranges;else delete entry.appearanceRanges;
  if(Object.keys(selections).length)entry.appearanceSelections=selections;else delete entry.appearanceSelections;
  aliases.commit();const names=aliases.values;
  if(JSON.stringify(names)!==JSON.stringify(entry.aliases||[]))entry.aliases=[...new Set(names)];
  if(!entry.name.trim()||!entry.base.trim())throw Error('У персонажа должны быть имя и постоянная внешность.');
  const old=draft.organizer.characters[id],retained=[...tagIds].filter(t=>draft.organizer.tags.some(tag=>tag.id===t)),meta=retained.length?{tagIds:retained}:undefined;
  if(meta)draft.organizer.characters[id]=meta;else delete draft.organizer.characters[id];
  if(kind.value!==group){delete draft[group][id];draft[kind.value][id]=entry;editor.group=kind.value;}else draft[group][id]=entry;
  if(JSON.stringify(entry)!==JSON.stringify(editor.original)||JSON.stringify(old)!==JSON.stringify(meta)||kind.value!==group)changed(entry.name!==editor.original.name||JSON.stringify(entry.aliases)!==JSON.stringify(editor.original.aliases)||kind.value!==group);
  editor.original=cloneLibrary(entry);
 }
 function tryFlush(){try{flushEditor();return true;}catch(e){status(e.message);return false;}}
 let rulesDialog=null;
 button('Правила ракурсов',view.addTag.parentNode,()=>{
  if(busy||done||rulesDialog||!tryFlush())return;
  closeTagPicker();
  const dialog=createNessChildDialog(document,panel,{title:'Правила ракурсов',marker:'data-appearance-rules',onClose:()=>{rulesDialog=null;}});
  rulesDialog=dialog;
  el('p','Режиссёр выбирает один ракурс на персонажа. Опиши, когда выбирать каждый вариант. «Вставлять всегда» применяется отдельно.',dialog.body,'ness-note');
  const inputs={};
  for(const [id,[label,standard]] of Object.entries(NESS_APPEARANCE_RULES)){
   const row=el('div',undefined,dialog.body,'ness-appearance-rule');
   const control=field(row,label,area(draft.appearanceRules?.[id]||standard));
   control.maxLength=1200;control.setAttribute('data-appearance-rule',id);inputs[id]=control;
   button('Вернуть стандартное',row,()=>{control.value=standard;},'quiet');
  }
  button('Отмена',dialog.actions,dialog.finish);
  button('Применить',dialog.actions,()=>{
   const rules=normalizeAppearanceRules(Object.fromEntries(Object.entries(inputs).map(([id,control])=>[id,control.value])));
   if(JSON.stringify(rules)!==JSON.stringify(draft.appearanceRules||{})){
    if(Object.keys(rules).length)draft.appearanceRules=rules;else delete draft.appearanceRules;
    changed();status('Правила изменены. Нажми «Сохранить».');
   }
   dialog.finish();
  },'primary');
 },'quiet');
 function renderTags(){
  view.tagStrip.hidden=!view.tagEditor.hidden;
  clear(view.tagStrip);
  const selectedTag=draft.organizer.filterTagId;
  const addFilter=(id,name,color)=>{const chip=el('button',name,view.tagStrip,'ness-tag-filter');chip.type='button';chip.setAttribute('data-tag-filter',id);chip.setAttribute('aria-pressed',String(selectedTag===id));if(color){chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',color);}chip.onclick=()=>{if(busy||draft.organizer.filterTagId===id)return;draft.organizer.filterTagId=id;changed();renderTags();searchNow();};};
  addFilter('*','Все');addFilter('','Без тегов');for(const tag of draft.organizer.tags)addFilter(tag.id,tag.name,tag.color);
  view.editTag.hidden=!view.tagEditor.hidden||!draft.organizer.tags.some(t=>t.id===selectedTag);
 }
 function renderBulkTags(){
  clear(view.bulkTags);if(!selected.size)return;
  for(const tag of draft.organizer.tags){const assigned=[...selected].every(id=>draft.organizer.characters[id]?.tagIds?.includes(tag.id));const chip=el('button',(assigned?'✓ ':'+ ')+tag.name,view.bulkTags,'ness-tag-filter');chip.type='button';chip.setAttribute('aria-pressed',String(assigned));chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',tag.color);chip.onclick=()=>assignSelectedTag(tag.id,!assigned);}
 }
 function renderList(reset=false){
  const q=norm(search.value);
  const selectedTag=draft.organizer.filterTagId;
  if(indexedRevision!==revision){searchIndex=libraryEntries(draft).map(record=>({...record,searchText:norm([record.id,record.entry.name,...(record.entry.aliases||[])].join('\n'))}));indexedRevision=revision;}
  const entries=searchIndex.filter(({id,searchText})=>{
   const tags=draft.organizer.characters[id]?.tagIds||[];
   return (selectedTag==='*'||(selectedTag===''?tags.length===0:tags.includes(selectedTag)))&&(!q||searchText.includes(q));
  });
  view.selection(selected.size);view.counts(searchIndex.length,entries.length);renderBulkTags();
  virtualList.setItems(entries,{reset});
  // The guide follows the first record in the CURRENT filtered list, not the full catalogue.
  currentVisibleRecords = entries;
 }
 function openRecordTags(id,anchor){
  if(busy||!tryFlush())return;closeTagPicker();closeNessTooltip();
  const box=el('div',undefined,panel,'ness-record-tag-popover');box.setAttribute('role','dialog');box.setAttribute('aria-label','Теги записи');applyNessTheme(box,loadNessTheme());
  const heading=el('div',undefined,box,'ness-row');el('strong','Теги записи',heading);const quit=button('×',heading,()=>closeTagPicker(),'icon quiet');quit.setAttribute('aria-label','Закрыть выбор тегов');
  const choices=el('div',undefined,box,'ness-tag-choices');
  function paint(){clear(choices);const ids=new Set(draft.organizer.characters[id]?.tagIds||[]);
   if(!draft.organizer.tags.length)el('p','Сначала создай тег кнопкой «+ Тег» над списком.',choices,'ness-note');
   for(const tag of draft.organizer.tags){const chip=el('button',(ids.has(tag.id)?'✓ ':'+ ')+tag.name,choices,'ness-tag-filter');chip.type='button';chip.setAttribute('data-record-tag',tag.id);chip.setAttribute('aria-pressed',String(ids.has(tag.id)));chip.setAttribute('data-colored','');chip.style.setProperty('--ness-tag-color',tag.color);
    chip.onclick=()=>{if(busy)return;if(ids.has(tag.id))ids.delete(tag.id);else ids.add(tag.id);draft.organizer.characters[id]={...draft.organizer.characters[id],tagIds:[...ids]};if(editor?.id===id)editor.tagIds=new Set(ids);changed();renderList();paint();};
   }
  }
  function outside(e){if(!box.contains(e.target)&&!anchor.contains(e.target))closeTagPicker();}
  function scroll(e){if(!box.contains(e.target))closeTagPicker();}
  closeTagPicker=()=>{box.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('scroll',scroll,true);closeTagPicker=()=>{};};
  paint();positionNessPopover(box,anchor,true);document.addEventListener('pointerdown',outside,true);document.addEventListener('scroll',scroll,true);
 }
 function renderLibraryRow({id,group,entry}){
  const row=el('div',undefined,undefined,'ness-library-item');row.setAttribute('data-active',String(editor?.id===id));
  const cb=el('input',undefined,row);cb.type='checkbox';cb.checked=selected.has(id);cb.disabled=busy;cb.setAttribute('data-library-id',id);cb.setAttribute('aria-label','Выбрать '+entry.name+' для действий');cb.onclick=e=>e?.stopPropagation?.();
  cb.onchange=()=>{if(cb.checked)selected.add(id);else selected.delete(id);view.selection(selected.size);renderBulkTags();};
  const content=el('div',undefined,row,'ness-record-content'),open=el('button',undefined,content,'ness-record-open');open.type='button';open.disabled=busy;open.title='Редактировать '+entry.name;open.setAttribute('aria-label','Открыть '+entry.name);open.setAttribute('data-open-record',id);open.onclick=e=>{e?.stopPropagation?.();editCharacter(id,group);};
  row.onclick=e=>{if(!busy&&e?.target!==cb)editCharacter(id,group);};
  const title=el('span',undefined,open,'ness-record-title');el('span',entry.name,title,'ness-record-name');el('span',group==='personas'?'Персона':'Персонаж',title,'ness-record-type');
  const tags=el('div',undefined,content,'ness-record-tags'),ids=draft.organizer.characters[id]?.tagIds||[];
  const add=el('button','+',tags,'ness-tag-add');add.type='button';add.disabled=busy;add.setAttribute('aria-label','Назначить теги: '+entry.name);add.setAttribute('data-row-tags',id);add.onclick=e=>{e?.stopPropagation?.();openRecordTags(id,add);};
  for(const tag of draft.organizer.tags.filter(t=>ids.includes(t.id))){const chip=el('button',tag.name,tags,'ness-tag-badge');chip.type='button';chip.style.setProperty('--ness-tag-color',tag.color);chip.onclick=e=>{e?.stopPropagation?.();openRecordTags(id,chip);};}
  return row;
 }
 const virtualList=createVirtualList(document,list,renderLibraryRow,{rowHeight:()=>window.matchMedia?.('(max-width:767px), (pointer:coarse)')?.matches?80:68,emptyText:'Нет персонажей с таким тегом или именем.'});
 let searchTimer=null;
 function searchNow(){closeTagPicker();if(searchTimer!==null)clearTimeout(searchTimer);searchTimer=null;if(!done)renderList(true);}

 function exitBoard(){
  if(!inBoardMode)return;
  if(!tryFlush())return;
  editor?.visibility?.closeBoard?.();
  inBoardMode=false;
  clear(view.constructorHost);
  view.showEditor();
  status(dirty?'Изменения в конструкторе ещё не сохранены. Нажми «Сохранить».':'Вернулись в карточку персонажа.');
 }
 function displayBoard(mode='base',preset){
  if(!editor||!inBoardMode)return;
  const host=view.constructorHost;
  clear(host);
  const ui=createUiKit(document),toolbar=el('header',undefined,host,'ness-fullboard-toolbar');
  const left=el('div',undefined,toolbar,'ness-fullboard-actions');
  const back=button('← Выйти из конструктора',left,exitBoard,'quiet');
  back.setAttribute('aria-label','Выйти из конструктора и вернуться к карточке');
  const right=el('div',undefined,toolbar,'ness-fullboard-character');
  const pickerLabel=el('label','Персонаж',right,'ness-label');
  const select=el('select',undefined,right,'ness-input');
  select.setAttribute('aria-label','Выбрать другого персонажа в конструкторе');
  const entries=libraryEntries(draft);
  for(const item of entries){
   const option=el('option',item.entry.name,select);
   option.value=item.id;
  }
  select.value=editor.id;
  pickerLabel.appendChild(select);
  select.onchange=()=>{
   const previous=editor?.id;
   const selected=entries.find(item=>item.id===select.value);
   if(!selected||!tryFlush()){select.value=previous;return;}
   editor?.visibility?.closeBoard?.();
   editCharacter(selected.id,selected.group);
   if(!editor||editor.id!==selected.id){select.value=previous;return;}
   displayBoard();
  };
  const extras=el('div',undefined,host,'ness-fullboard-exposure');
  el('span','Детали открытого тела',extras,'ness-label');
  const exposedHelp=button('?',extras,undefined,'icon quiet ness-mini-help');
  exposedHelp.setAttribute('aria-label','Как работают голый верх и голый низ');
  const exposureTip=view.tip(exposedHelp,'Здесь хранятся постоянные особенности открытого тела. Кнопки только открывают редактор соответствующего поля: они не снимают одежду и не меняют сцены. Данные используются, когда участок действительно открыт и виден.');
  exposedHelp.onclick=e=>{e.preventDefault();exposureTip.toggle();};
  const bodyEdit=el('div',undefined,host,'ness-fullboard-exposure-editor');bodyEdit.hidden=true;
  const controls=[];
  for(const [key,label] of [['nudeUpper','Голый верх'],['nudeLower','Голый низ']]){
   const source=editor.fields[key];
   const toggle=button(label+(source?.value?.trim()?' •':''),extras,undefined,'quiet ness-fullboard-exposure-toggle');
   toggle.setAttribute('aria-expanded','false');
   controls.push({key,label,toggle});
   toggle.onclick=()=>{
    const selected=bodyEdit.dataset.key===key&&!bodyEdit.hidden;
    clear(bodyEdit);bodyEdit.hidden=selected;bodyEdit.dataset.key=selected?'':key;
    controls.forEach(item=>{const open=!selected&&item.key===key;item.toggle.setAttribute('aria-pressed',String(open));item.toggle.setAttribute('aria-expanded',String(open));});
    if(selected)return;
    const prompt=el('label',label+' · особенности открытого тела',bodyEdit,'ness-label');
    const textarea=el('textarea',undefined,bodyEdit,'ness-input ness-fullboard-exposure-text');
    textarea.value=source?.value||'';textarea.spellcheck=false;
    prompt.setAttribute('for','ness-fullboard-'+key);textarea.id='ness-fullboard-'+key;
    textarea.oninput=()=>{
     if(!editor?.fields?.[key])return;
     editor.fields[key].value=textarea.value;
     toggle.textContent=label+(textarea.value.trim()?' •':'');
     changed();
    };
   };
  }
  const boardArea=el('div',undefined,host,'ness-fullboard-area');
  editor.visibility.openBoard(boardArea,{mode,preset});
  view.showConstructor();
 }
 function enterBoard(mode='base',preset){
  if(!editor||busy||done||!tryFlush())return;
  inBoardMode=true;
  displayBoard(mode,preset);
 }
 function editCharacter(id,group){
  if(!tryFlush())return;editor?.visibility?.closeBoard?.();closeTagPicker();clear(form);const entry=draft[group][id],fields={};
  const heading=el('div',undefined,form,'ness-editor-heading');button('← К списку',heading,()=>{if(!tryFlush())return;editor=null;view.resetEditor();renderList();},'quiet ness-editor-back');el('h4',entry.name,heading);
  const tabs=createNessTabs({el,button},form,'Карточка персонажа');
  const appearance=tabs.add('Внешность');
  const identity=el('div',undefined,appearance,'ness-grid');fields.name=field(identity,labels.name,input(entry.name));
  const kind=field(identity,'Тип записи',choice([['personas','Персона'],['characters','Персонаж']],group));kind.onchange=()=>{changed(true);};
  const formatStrip=el('div',undefined,appearance,'ness-format-strip');
  el('span','Формат описания',formatStrip,'ness-label');
  const formatSwitcher=el('div',undefined,formatStrip,'ness-format-switch');
  const appearanceFormat=choice([['tags','Теги'],['prose','Текст']],entry.appearanceFormat||'tags');
  appearanceFormat.className+=' ness-format-native';
  appearanceFormat.tabIndex=-1;appearanceFormat.setAttribute('aria-hidden','true');
  formatStrip.appendChild(appearanceFormat);
  const formatTags=button('Теги',formatSwitcher,undefined,'quiet');
  const formatText=button('Текст',formatSwitcher,undefined,'quiet');
  formatSwitcher.setAttribute('role','group');
  formatSwitcher.setAttribute('aria-label','Формат описания');
  const formatHelp=button('?',formatStrip,undefined,'icon quiet ness-mini-help');
  formatHelp.setAttribute('aria-label','Как работает формат описания');
  const formatTip=view.tip(formatHelp,'Теги: отдельные признаки через запятую, доступна разметка по ракурсам и конструктор. Текст: обычные предложения или абзацы. Переключение не преобразует, не удаляет и не переписывает исходное описание.');
  formatHelp.onclick=e=>{e.preventDefault();formatTip.toggle();};
  function updateFormatButtons(){
   formatTags.setAttribute('aria-pressed',String(appearanceFormat.value==='tags'));
   formatText.setAttribute('aria-pressed',String(appearanceFormat.value==='prose'));
  }
  updateFormatButtons();
  fields.base=field(appearance,labels.base,area(entry.base));fields.base.className+=' ness-appearance';
  const recordTags=draft.organizer.characters[id]?.tagIds||[];
  const highlightTag=draft.organizer.tags.find(t=>t.id===draft.organizer.filterTagId&&recordTags.includes(t.id))||draft.organizer.tags.find(t=>recordTags.includes(t.id));
  const visibility=createAppearanceVisibilityEditor({el,clear,button,input},appearance,fields.base,entry,changed,highlightTag?.color,()=>publishDraft(true),()=>!busy&&!done,
    ()=>({nudeUpper:fields.nudeUpper?.value??entry.nudeUpper??'',nudeLower:fields.nudeLower?.value??entry.nudeLower??''}),
    state=>{for(const key of Object.keys(NSFW_PRESETS))if(fields[key]&&Object.hasOwn(state,key))fields[key].value=state[key];changed();},
    (mode,preset)=>enterBoard(mode,preset));
  visibility.setFormat(appearanceFormat.value);
  const openConstructor=button('◫ Открыть конструктор тегов',appearance,()=>enterBoard(),'quiet ness-open-constructor');
  openConstructor.title='Полноэкранный редактор ракурсов, отдельных тегов кожи и разделителей';
  function selectAppearanceFormat(next){
   if(!visibility.setFormat(next)){appearanceFormat.value=visibility.format;updateFormatButtons();return;}
   if(appearanceFormat.value===next)return;
   appearanceFormat.value=next;updateFormatButtons();changed();
  }
  formatTags.onclick=()=>selectAppearanceFormat('tags');
  formatText.onclick=()=>selectAppearanceFormat('prose');
  const aliasesTab=tabs.add('Другие имена'),aliases=createAliasTags(document,entry.aliases||[],()=>changed(true));aliasesTab.appendChild(aliases.element);
  const promptTab=tabs.add('Данные для промпта'),promptGrid=el('div',undefined,promptTab,'ness-grid');
  fields.promptName=field(promptGrid,labels.promptName,input(entry.promptName||''));fields.promptName.placeholder='Kian';
  fields.subject=field(promptGrid,labels.subject,input(entry.subject||''));fields.subject.placeholder='boy';
  el('p','Например, Kian и boy дают начало записи «| boy, Kian, …» и учитываются в общем теге количества, например 1boy.',promptTab,'ness-note');
  const body=tabs.add('Старые поля отметин');
  el('p','Старые поля сохранены для совместимости. Отдельные наборы «Кожа и отметины» доступны через кнопку «Открыть конструктор тегов» во вкладке «Внешность». Не дублируй признаки в обоих местах.',body,'ness-note');
  const marks=el('section',undefined,body,'ness-body-section');marks.setAttribute('data-library-body-marks','');
  el('h4','Отметины на коже',marks);
  el('p','Шрамы, татуировки, родинки и другие постоянные отметины. Выбери часть тела и впиши короткие английские теги через запятую. Укажи сторону, если это важно.',marks,'ness-note');
  el('p','Например: small scar on left thigh, flower tattoo on right forearm.',marks,'ness-body-example');
  const marksGrid=el('div',undefined,marks,'ness-grid');
  for(const key of ['thighMarks','kneeMarks','shinMarks','shoulderMarks','forearmMarks'])fields[key]=field(marksGrid,labels[key],area(entry[key]||''));
  const details=el('section',undefined,body,'ness-body-section');details.setAttribute('data-library-body-details','');
  el('h4','Особенности открытого тела',details);
  el('p','«Верх» — грудь, живот и торс. «Низ» — бёдра, таз и интимная анатомия. Записывай особенности короткими английскими тегами. Обе графы можно оставить пустыми.',details,'ness-note');
  const bodyGrid=el('div',undefined,details,'ness-grid');
  for(const key of ['nudeUpper','nudeLower'])fields[key]=field(bodyGrid,labels[key],area(entry[key]||''));
  const important=el('aside',undefined,body,'ness-body-important');important.setAttribute('data-library-body-important','');important.setAttribute('role','note');
  el('strong','ВАЖНО!',important);
  el('p','Эти детали нужны только тогда, когда соответствующая часть тела открыта, видна в кадре и не закрыта одеждой. Если описать скрытую анатомию слишком подробно, NovelAI может попытаться показать её, оголив персонажа вопреки сцене. Для повседневной внешности используй вкладку «Внешность», а одежду описывай в ролевой или её отдельном источнике.',important);

  const extra=Object.entries(entry).filter(([key,v])=>!fields[key]&&key!=='aliases'&&key!=='appearanceFormat'&&typeof v==='string');if(extra.length){const box=tabs.add('Дополнительно');for(const [key,value] of extra)fields[key]=field(box,key,area(value));}
  for(const e of Object.values(fields))if(e!==fields.base)e.oninput=changed;fields.name.oninput=()=>changed(true);
  editor={id,group,fields,kind,aliases,visibility,appearanceFormat,tagIds:new Set(draft.organizer.characters[id]?.tagIds||[]),original:cloneLibrary(entry)};
  let asked=false;const remove=button('Удалить персонажа',body,()=>{if(!asked){asked=true;remove.textContent='Точно удалить?';return;}editor?.visibility?.closeBoard?.();inBoardMode=false;delete draft[editor.group][id];delete draft.organizer.characters[id];selected.delete(id);editor=null;view.resetEditor();changed(true);renderList();},'danger');
  view.showEditor();renderList();
 }
 guideOpenFirstRecord = () => {
  if (done || busy) return false;
  if (editor) return true; // A newly created trial card is already open.
  // Respect the user’s search and tag filter. Never silently create a record.
  const first = currentVisibleRecords[0];
  if (!first) return false;
  if (editor?.id !== first.id) editCharacter(first.id, first.group);
  return true;
 };
 function showTagEditor(id=null){
  if(!tryFlush())return;closeTagPicker();editingTag=id;deleteTagAsked=false;view.deleteTag.textContent='Удалить';view.tagEditor.hidden=false;view.tagName.value=draft.organizer.tags.find(t=>t.id===id)?.name||'';view.tagColor.value=draft.organizer.tags.find(t=>t.id===id)?.color||(loadNessTheme()?.accent || activeNessThemeForEditor().accent);view.deleteTag.hidden=!id;renderTags();view.tagName.focus();
 }
 function applyTag(){
  if(busy)return;const name=view.tagName.value.trim();if(!name){status('Введи название тега.');return;}
  const duplicate=draft.organizer.tags.find(t=>norm(t.name)===norm(name));
  if(duplicate&&duplicate.id!==editingTag){status('Тег с таким именем уже есть. Выбери его в списке.');return;}
  if(editingTag){Object.assign(draft.organizer.tags.find(t=>t.id===editingTag),{name,color:view.tagColor.value});}else{editingTag=newLibraryId('tag',new Set(draft.organizer.tags.map(t=>t.id)));draft.organizer.tags.push({id:editingTag,name,color:view.tagColor.value});}
  view.tagEditor.hidden=true;changed();renderTags();renderList();
 }
 view.addTag.onclick=()=>showTagEditor();view.editTag.onclick=()=>showTagEditor(draft.organizer.filterTagId);view.applyTag.onclick=applyTag;view.tagName.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();applyTag();}};view.cancelTag.onclick=()=>{view.tagEditor.hidden=true;editingTag=null;renderTags();};
 let deleteTagAsked=false;view.deleteTag.onclick=()=>{if(!deleteTagAsked){deleteTagAsked=true;view.deleteTag.textContent='Удалить у всех?';return;}draft.organizer.tags=draft.organizer.tags.filter(t=>t.id!==editingTag);for(const meta of Object.values(draft.organizer.characters))meta.tagIds=(meta.tagIds||[]).filter(t=>t!==editingTag);editor?.tagIds.delete(editingTag);if(draft.organizer.filterTagId===editingTag)draft.organizer.filterTagId='*';view.tagEditor.hidden=true;editingTag=null;deleteTagAsked=false;view.deleteTag.textContent='Удалить';changed();renderTags();renderList();};
 function assignSelectedTag(id,add){if(!tryFlush())return;for(const actor of selected){const meta=draft.organizer.characters[actor]||{},tags=new Set(meta.tagIds||[]);if(add)tags.add(id);else tags.delete(id);draft.organizer.characters[actor]={...meta,tagIds:[...tags]};if(editor?.id===actor)editor.tagIds=new Set(tags);}changed();renderList();}
 button('Снять выделение',bulkActions,()=>{selected.clear();renderList();},'quiet');
 button('В этот чат',bulkActions,async()=>{
  if(busy||!tryFlush())return;const st=SillyTavern.getContext();if(st.chat!==originChat||st.chatId!==originId||!st.chatMetadata){status('Чат изменился. Открой библиотеку заново.');return;}
  const ids=[...selected],known=new Set(libraryEntries(loadMasterLibrary()).map(e=>e.id));if(ids.some(id=>!known.has(id))){status('Сначала сохрани новых персонажей.');return;}
  const vars=st.chatMetadata.variables||={},previous=vars.sp_imagen_chat_cast_ids;vars.sp_imagen_chat_cast_ids=[...new Set([...(Array.isArray(previous)?previous:[]),...ids])];setBusy(true);
  try{if(typeof st.saveMetadata!=='function')throw Error('Недоступно сохранение чата.');await st.saveMetadata();status('Добавлено в список чата: '+ids.length);}catch(e){vars.sp_imagen_chat_cast_ids=previous;status('Не удалось сохранить список: '+e.message);}finally{setBusy(false);}
 });
 view.add.onclick=()=>{if(!tryFlush())return;const id=newLibraryId('character',new Set(libraryEntries(draft).map(e=>e.id)));draft.characters[id]={name:'Новый персонаж',aliases:[],base:''};changed(true);editCharacter(id,'characters');};
 const upload=view.upload;
 upload.onchange=async()=>{if(busy||!upload.files?.[0]||!tryFlush())return;setBusy(true);try{const value=validateMasterLibrary(JSON.parse((await upload.files[0].text()).replace(/^\uFEFF/,'')));editor?.visibility?.closeBoard?.();inBoardMode=false;draft=value;editor=null;selected.clear();view.resetEditor();changed(true);renderTags();renderList();status('Импортировано в черновик. Нажми «Сохранить».');}catch(e){status('Импорт не выполнен: '+e.message);}finally{upload.value='';setBusy(false);}};
 view.exportButton.onclick=()=>{if(!tryFlush())return;try{const url=URL.createObjectURL(new Blob([JSON.stringify(validateMasterLibrary(draft),null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='SP_IMAGEN_LIBRARY.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status(e.message);}};
 search.oninput=()=>{if(searchTimer!==null)clearTimeout(searchTimer);searchTimer=setTimeout(searchNow,140);};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchNow();}};renderTags();renderList();
 status(restored.count?'Восстановлено полей из исходников: '+restored.count:libraryEntries(draft).length?'Все изменения сохранены':'Библиотека пуста. Добавь персонажей или импортируй JSON.');
 let onChatSwitch=()=>{};
 const previousFocus=document.activeElement,stopViewport=mountDialog(overlay,()=>onChatSwitch());virtualList.refresh();if(!window.matchMedia?.('(max-width:767px), (pointer:coarse)')?.matches)search.focus();
 async function publishDraft(keepEditor=false){
  if(busy||done||!tryFlush())return false;
  closeTagPicker();setBusy(true);
  try{
   const result=await saveMasterLibrary(draft,baseline);draft=result.data;baseline=result.raw;
   if(!keepEditor){editor?.visibility?.closeBoard?.();inBoardMode=false;editor=null;view.resetEditor();}
   dirty=false;discardAsked=false;revision++;renderTags();
   try{await activateNessProfile('images');status(keepEditor?'Разметка сохранена.':'Библиотека SP Imagen сохранена.');}
   catch(e){status('Библиотека сохранена. Вернуться в Images не удалось: '+e.message);}
   return true;
  }catch(e){status('Не удалось сохранить: '+e.message);return false;}
  finally{setBusy(false);renderList();}
 }
 return await new Promise(resolve=>{
  const finish=()=>{if(done)return;done=true;editor?.visibility?.closeBoard?.();inBoardMode=false;guideOpenFirstRecord=()=>false;rulesDialog?.finish();closeTagPicker();if(searchTimer!==null)clearTimeout(searchTimer);virtualList.dispose();document.removeEventListener('keydown',onKey,true);stopViewport();overlay.remove();previousFocus?.focus?.();resolve('Библиотека закрыта');};
  onChatSwitch=()=>finish(); // Discard stale modal state when the chat changes.
  close.onclick=()=>{if(busy)return;if(dirty&&!discardAsked){discardAsked=true;status('Сохрани изменения или нажми «Закрыть» ещё раз, чтобы отменить их.');return;}finish();};
  panel.querySelector('.ness-close-dialog').onclick=()=>close.click();
  const onKey=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'&&!rulesDialog){e.preventDefault();e.stopPropagation();if(inBoardMode)exitBoard();else if(panel.querySelector('.ness-record-tag-popover'))closeTagPicker();else close.onclick();}};document.addEventListener('keydown',onKey,true);
  save.onclick=()=>publishDraft(inBoardMode);
 });
}

// Module: library_exports
return {bundleVersion:'2.9.11',openLibraryEditor,openFirstVisibleRecordForGuide:()=>guideOpenFirstRecord(),routeImages,utilities:{loadMasterLibrary,saveMasterLibrary,validateMasterLibrary,libraryEntries,masterLibraryRaw,restoreLibraryBodyFields}};

}
