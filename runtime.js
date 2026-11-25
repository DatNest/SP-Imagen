import { loadNessTheme, applyNessTheme, normalizeNessTheme, activeNessThemeForEditor, themeSettingsLocation, NESS_THEME_MODE_KEY, NESS_CUSTOM_THEME_KEY } from './theme-runtime.js';
import { withOperationDeadline } from './operation-timeout.js';
import { DEFAULT_CARD_WARDROBE, DEFAULT_PERSONA_WARDROBE, normalizeCardWardrobeSource, getCardPersonaWardrobe } from './wardrobe-card.js';
import { boundedWardrobe, parseLabeledWardrobeRows, mayMatchWardrobeBoundary, WARDROBE_NAME_PLACEHOLDER } from './wardrobe-literal.js';
import { CODE_PROMPT_DEFAULTS, NPC_LANGUAGE_VISUAL_ONLY } from './code-prompts.js';
import { filterProfileSources, directorProfileGuidance } from './profiles.js';
import { addFieldHelp } from './onboarding.js';
import { createDialogHeader, createOwnedDialogShell, mountOwnedDialog } from './dialog-shell.js';
import { NESS_FIELD_HELP, NESS_HELP_LABELS, NESS_THEME_LABELS, MASTER_LIBRARY_KEY, MASTER_SNAPSHOT_KEY, MASTER_BACKUP_KEY, cloneLibrary, safeLibraryId } from './shared-data.js';
import { parseImageHtml } from './image-transport.js';
import { normalizeImagePrompt, limitComicDialogue, validateImagePromptLayout } from './image-prompt.js';
import { experimentalDirectorPrompt, parseExperimentalDirector } from './experimental-director.js';
import { pageTextEnabled, verifyTextlessImagePrompt } from './page-text-mode.js';
import { createSpImagenProgress } from './progress-ui.js';
import { savePostDraft, readPostDraft, discardPostDraft, clearDraftsForOtherPost, postFingerprint } from './post-drafts.js';
import { rememberPostPrompts } from './post-prompt-state.js';
import { normalizeAppearanceRules, normalizeAppearanceRanges, normalizeAppearanceSelections, appearanceVisibilityInstruction, insertVisibleAppearance, hasConfiguredAppearanceViews } from './appearance-visibility.js';
import { hasSkinSelections, skinAppearanceInstruction, insertSkinAppearance } from './appearance-board.js';
import { prepareBodyAppearance } from './legacy-body-migration.js';
// Single resolver for editable system instructions. Original text lives in code-prompts.js.
export function createSpImagenRuntime({ getExtension, getMediaSlots, libraryStore } = {}){
const codePrompt = key => getExtension?.()?.getCodePrompt?.(key) || CODE_PROMPT_DEFAULTS[key] || '';
async function openLibrary(){return await spImagenExtension().openLibrary();}
// Module: wardrobe
const DEFAULT_CHAT_TAGS=Object.freeze({mode:'default',namePrefix:'[OUTFIT:',nameSuffix:']',outfitEnd:'[/OUTFIT]'});
const WARDROBE_RULE_DEFAULTS={markers:{namePrefix:'',nameSuffix:'',outfitEnd:'',blockStart:'',blockEnd:''},regex:{pattern:'',flags:'gm',nameGroup:'name',outfitGroup:'outfit'},scopedRegex:{blockStart:'',blockEnd:'',pattern:'',flags:'gmiu',nameGroup:'name',outfitGroup:'outfit',outfitLabel:''},html:{rowSelector:'',nameSelector:'',nameAttribute:'',outfitSelector:'',outfitAttribute:'',stripSelector:''}};
function normalizeNessRegexRule(rule){
 let pattern=rule?.pattern,flags=rule?.flags??'';
 if(typeof pattern!=='string'||!pattern||pattern.length>4000)throw Error('Нужно правило поиска длиной от 1 до 4000 символов.');
 if(typeof flags!=='string')throw Error('Укажи флаги буквами g, i, m, s, u без пробелов.');
 if(pattern.startsWith('/')){const slash=pattern.lastIndexOf('/');if(slash>0&&/^[gimsu]*$/.test(pattern.slice(slash+1))){flags=flags||pattern.slice(slash+1);pattern=pattern.slice(1,slash);}}
 if(!/^[gimsu]*$/.test(flags)||new Set(flags).size!==flags.length)throw Error('Допустимы флаги g, i, m, s, u без повторов.');
 new RegExp(pattern,flags);return {...rule,pattern,flags};
}
function validateWardrobeSettings(value){
 if(!value||value.version!==1||typeof value.keepDefault!=='boolean'||!Array.isArray(value.sources)||value.sources.length>8)throw Error('Неверные настройки гардероба');
 const settings=JSON.parse(JSON.stringify(value));
 settings.card=normalizeCardWardrobeSource(settings.card,DEFAULT_CARD_WARDROBE);
 settings.persona=normalizeCardWardrobeSource(settings.persona,DEFAULT_PERSONA_WARDROBE);
 // Older settings only used keepDefault; the new message-tag choice upgrades without rewriting them.
 const tag={...DEFAULT_CHAT_TAGS,...(settings.chatTags||{})};
 if(settings.chatTags===undefined)tag.mode=settings.keepDefault?'default':'off';
 if(!['default','custom','both','off'].includes(tag.mode))throw Error('Выбери способ чтения меток одежды из чата.');
 for(const key of ['namePrefix','nameSuffix','outfitEnd'])if(typeof tag[key]!=='string'||tag[key].length>120)throw Error('Части своей метки должны быть текстом до 120 символов.');
 if(['custom','both'].includes(tag.mode)&&(!tag.namePrefix.trim()||!tag.nameSuffix.trim()||!tag.outfitEnd.trim()))throw Error('Для своей метки укажи текст до имени, после имени и после одежды.');
 settings.chatTags=tag;
 settings.keepDefault=tag.mode==='default'||tag.mode==='both';
 for(const r of settings.sources){
  if(!r||!['markers','regex','scopedRegex','html','bounded'].includes(r.type))throw Error('Неизвестный тип правила гардероба');
  for(const [key,v] of Object.entries(r))if(typeof v!=='string'&&key!=='enabled')throw Error('Параметр '+key+' должен быть текстом');
  if(r.enabled!==undefined&&typeof r.enabled!=='boolean')throw Error('Переключатель источника одежды должен быть true или false.');
  if(r.enabled===false)continue;
  if(r.type==='bounded'){
   if(!r.start||typeof r.end!=='string'||r.start.length>240||r.end.length>240||r.start===r.end)throw Error('Укажи начало записи; конец можно оставить пустым, если есть {{имя}}.');
   const slots=r.start.split(WARDROBE_NAME_PLACEHOLDER).length-1;
   if(slots>1)throw Error('Используй {{имя}} ровно один раз в начале метки.');
   if(!r.end&&!slots)throw Error('Без закрывающей метки укажи в начале {{имя}} — так расширение найдёт нужного персонажа.');
   if(slots&&r.start.replace(WARDROBE_NAME_PLACEHOLDER,'').trim().length<2)throw Error('Кроме {{имя}} укажи узнаваемый текст метки.');
   if(r.where && !['chat','card','persona'].includes(r.where))throw Error('Выбери источник одежды: сообщения, карточка или персона.');
  }
  if(r.type==='markers'){
   if(!r.namePrefix||!r.nameSuffix)throw Error('Укажи начало маркера имени и его окончание');
   if(Boolean(r.blockStart)!==Boolean(r.blockEnd))throw Error('У блока должны быть оба маркера: начало и конец');
  }
  if(r.type==='regex'||r.type==='scopedRegex'){
   Object.assign(r,normalizeNessRegexRule(r));
   if(r.type==='scopedRegex'&&(!r.blockStart||!r.blockEnd))throw Error('Для поиска внутри блока укажи начало и конец блока.');
   if(!r.nameGroup||!r.outfitGroup)throw Error('Укажи группы имени и одежды: например name/outfit или 1/2');
  }
  if(r.type==='html'&&!r.rowSelector)throw Error('Нужен CSS-селектор записи персонажа');
 }
 return settings;
}
function markerWardrobe(text,r){
 const pairs=[],ranges=[];let scopes=[];
 if(r.blockStart){let pos=0;while(pos<text.length){const a=text.indexOf(r.blockStart,pos);if(a<0)break;const b=text.indexOf(r.blockEnd,a+r.blockStart.length);if(b<0)break;scopes.push([a+r.blockStart.length,b]);ranges.push([a,b+r.blockEnd.length]);pos=b+r.blockEnd.length;}}
 if(!r.blockStart||(!scopes.length&&r.nativeFallback))scopes=[[0,text.length]];
 const hasOuter=ranges.length>0;
 for(const [start,stop] of scopes){
  let pos=start;
  while(pos<stop){
   const a=text.indexOf(r.namePrefix,pos);if(a<0||a>=stop)break;
   const n=text.indexOf(r.nameSuffix,a+r.namePrefix.length);if(n<0||n>=stop)break;
   const body=n+r.nameSuffix.length,next=text.indexOf(r.namePrefix,body);
   let end=next>=0&&next<stop?next:stop,after=end;
   if(r.outfitEnd){const close=text.indexOf(r.outfitEnd,body);if(close<0||close>=stop||close>end){pos=Math.max(body,a+1);continue;}end=close;after=close+r.outfitEnd.length;}
   else if(r.nativeFallback){const close=text.indexOf('⟦/ОДЕЖДА⟧',body);if(close>=0&&close<end){end=close;after=close+'⟦/ОДЕЖДА⟧'.length;}else{const lineEnd=text.indexOf('\n',body);if(lineEnd>=0&&lineEnd<end){end=lineEnd;after=lineEnd;}}}
   const name=text.slice(a+r.namePrefix.length,n).trim(),outfit=text.slice(body,end).trim();
   if(name&&outfit)pairs.push([name,outfit]);
   if(!hasOuter)ranges.push([a,after]);
   pos=Math.max(after,body,a+1);if(pairs.length>1000)throw Error('Слишком много совпадений гардероба');
  }
 }
 for(const [a,b] of ranges.sort((x,y)=>y[0]-x[0]))text=text.slice(0,a)+' '+text.slice(b);
 return {text,pairs};
}
// Each request executes its rules in order inside one bounded worker.
async function regexWardrobe(text,rule,operation='wardrobe'){
 const WorkerClass=typeof window!=='undefined'&&window.Worker||globalThis.Worker;
 if(typeof WorkerClass!=='function')throw Error('Этот браузер не поддерживает безопасный поиск по regex в отдельном потоке.');
 let worker,timer;
 try{
  // A same-origin worker works under policies that block blob: workers.
  // Do not run arbitrary imported regex on the main chat thread.
  worker=new WorkerClass(new URL('./regex-worker.js',import.meta.url));
  return await new Promise((resolve,reject)=>{
   timer=setTimeout(()=>reject(Error('Поиск regex выполнялся слишком долго. Упрости выражение.')),1500);
   worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);
   worker.onerror=e=>reject(Error('Не удалось запустить поиск regex. Проверь доступность файла regex-worker.js и настройки безопасности браузера.'));
   worker.postMessage({text,rule,operation});
  });
 }finally{clearTimeout(timer);worker?.terminate();}
}
function htmlWardrobe(text,r){
 const Parser=window?.DOMParser||globalThis.DOMParser;
 if(!Parser)throw Error('HTML-разбор недоступен в этом браузере');
 // Inert parsing: no scripts, frames, resource URLs or event handlers are mounted.
 const inert=text.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(?:img|link|embed|source|video|audio)\b[^>]*>/gi,'');
 const doc=new Parser().parseFromString(inert,'text/html');
 const rows=[...doc.body.querySelectorAll(r.rowSelector)],pairs=[];
 function value(row,selector,attribute){const node=selector?row.querySelector(selector):row;return node?(attribute?node.getAttribute(attribute):node.textContent)||'':'';}
 for(const row of rows){const name=value(row,r.nameSelector,r.nameAttribute),outfit=value(row,r.outfitSelector,r.outfitAttribute);if(name.trim()&&outfit.trim())pairs.push([name,outfit]);}
 if(r.stripSelector)for(const node of doc.body.querySelectorAll(r.stripSelector))node.remove();
 else for(const row of rows)row.remove();
 return {text:doc.body.innerHTML,pairs};
}
// Generated label-based rules are safely parsed as fields, without a blob Worker.
// Arbitrary user-written regex still runs in the bounded Worker.
function labeledRecordPattern(label){
 const escaped=String(label).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return '^[^\\S\\r\\n]*[^\\p{L}\\p{N}\\r\\n]*(?<name>[^|\\r\\n()]+?)(?:\\s*\\([^()\\r\\n]*\\))?\\s*\\|\\s*(?:[^|\\r\\n]*\\|\\s*)*'+escaped+'\\s*[:：]\\s*(?<outfit>[^|\\r\\n]+)';
}
// Apply exactly the same named-field extractor during tests and real generation.
// Block delimiters are user data, never hard-coded to an individual RP extension.
async function scopedRegexWardrobe(text,rule){
 const pairs=[];
 let pos=0;
 let nextText='';
 const left=String(rule.blockStart),right=String(rule.blockEnd);
 if(!left||!right)throw Error('Укажи обе границы общего блока.');
 // Non-HTML delimiters are also supported: [STATE]...[/STATE], etc.
 while(pos<text.length){
  const start=text.indexOf(left,pos);
  if(start<0)break;
  const contentStart=start+left.length;
  const end=text.indexOf(right,contentStart);
  if(end<0)break;
  const inside=text.slice(contentStart,end);
  const pairList=rule.outfitLabel&&rule.pattern===labeledRecordPattern(rule.outfitLabel)
   ?parseLabeledWardrobeRows(inside,rule.outfitLabel)
   :(await regexWardrobe(inside,{rules:[rule]})).pairs;
  if(pairList.length){
   pairs.push(...pairList);
   nextText+=text.slice(pos,start)+' ';
  }else{
   nextText+=text.slice(pos,end+right.length);
  }
  pos=end+right.length;
  if(pairs.length>1000)throw Error('Слишком много записей одежды.');
 }
 return {text:nextText+text.slice(pos),pairs};
}
// A literal start/end rule. The user copies delimiters as they appear in RP;
// no handwritten regex or knowledge of HTML is required.
async function readConfiguredWardrobe(raw,settings,{origin='chat',fallbackName='',requireNames=false}={}){
 let text=String(raw||'');const pairs=[];
 const tag=settings.chatTags||DEFAULT_CHAT_TAGS;
 // Keep both the current and older built-in tags readable. The closed wardrobe
 // container is processed first, then individual tags outside that container.
 // A legacy [OUTFIT:Name] entry must not require a user to rebuild their RP.
 const builtIn = origin==='chat' && settings.keepDefault ? [
  {type:'markers',blockStart:'⟦ГАРДЕРОБ⟧',blockEnd:'⟦/ГАРДЕРОБ⟧',namePrefix:'⟦ОДЕЖДА:',nameSuffix:'⟧',outfitEnd:'',nativeFallback:true},
  {type:'markers',namePrefix:'⟦ОДЕЖДА:',nameSuffix:'⟧',outfitEnd:'',nativeFallback:true},
  {type:'markers',namePrefix:'[OUTFIT:',nameSuffix:']',outfitEnd:'[/OUTFIT]'},
 ] : [];
 const sources=[...builtIn,...(origin==='chat'&&['custom','both'].includes(tag.mode)?[{type:'markers',namePrefix:tag.namePrefix,nameSuffix:tag.nameSuffix,outfitEnd:tag.outfitEnd,blockStart:'',blockEnd:''}]:[]),...settings.sources.filter(r=>r.enabled!==false && (r.type==='bounded' ? (r.where||'chat')===origin : origin==='chat'))];
 for(let i=0;i<sources.length;){
  const r=sources[i++];let found;
  if(r.type==='regex'){const rules=[r];while(i<sources.length&&sources[i].type==='regex')rules.push(sources[i++]);found=await regexWardrobe(text,{rules});}
  else found=r.type==='markers'?markerWardrobe(text,r):r.type==='bounded'?boundedWardrobe(text,r,{fallbackName,requireNames}):r.type==='scopedRegex'?await scopedRegexWardrobe(text,r):htmlWardrobe(text,r);
  for(const [name,outfit] of found.pairs){const who=cleanRpVisualText(name).replace(/\s+/g,' ').trim(),wear=cleanRpVisualText(outfit).replace(/\s+/g,' ').trim();if(who&&wear)pairs.push([who,wear]);}
  text=found.text;
 }
 return {text,pairs};
}
// RP scene length and wardrobe history are independent: a current outfit can
// be established long before the two or five posts used to describe a picture.
function mayContainWardrobe(raw,settings){
 const tag=settings.chatTags||DEFAULT_CHAT_TAGS;
 if(settings.keepDefault && /⟦(?:ОДЕЖДА:|ГАРДЕРОБ⟧)|\[OUTFIT:/i.test(raw))return true;
 if(['custom','both'].includes(tag.mode)&&tag.namePrefix&&raw.includes(tag.namePrefix))return true;
 return settings.sources.some(rule=>rule.enabled!==false&&(
   rule.type==='regex'||rule.type==='html'||rule.type==='bounded'&&mayMatchWardrobeBoundary(raw,rule)||rule.type==='scopedRegex'&&Boolean(rule.blockStart&&raw.includes(rule.blockStart))||
   rule.type==='markers'&&Boolean(rule.namePrefix&&raw.includes(rule.namePrefix)||rule.blockStart&&raw.includes(rule.blockStart))
 ));
}
async function collectConfiguredRp(kind,settings,options=loadGen2Settings(),endIndex=null){
 const st=SillyTavern.getContext(),history=st.chat||[],recent=[],wardrobe=new Map();
 const count=options.posts[kind];let warning='';
 const last=endIndex===null?history.length-1:Math.min(endIndex,history.length-1);
 // Canonical names (including aliases) are resolved before merging the wardrobe history.
 // This prevents an older entry under a different alias from overriding the latest outfit.
 let libraryNames=[];
 try {
  const master=loadMasterLibrary();
  libraryNames=Object.values({...master.personas,...master.characters}).map(e=>({
   canonical:String(e.name||'').trim(),
   variants:[e.name,e.promptName,...(Array.isArray(e.aliases)?e.aliases:[])].map(x=>String(x||'').normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е').trim()).filter(Boolean)
  })).filter(e=>e.canonical);
 }catch{}
 const canonicalWardrobeName=name=>{
  const raw=String(name||'').replace(/\s+/g,' ').trim();
  const key=raw.normalize('NFKC').toLocaleLowerCase().replace(/ё/g,'е');
  const exact=libraryNames.filter(e=>e.variants.includes(key));
  if(exact.length===1)return exact[0].canonical;
  // Partial matches are accepted only if they identify exactly one library character.
  const partial=libraryNames.filter(e=>e.variants.some(v=>key.length>=3&&(v.startsWith(key+' ')||key.startsWith(v+' '))));
  return partial.length===1?partial[0].canonical:raw;
 };
 const insertOutfits=pairs=>{
  // Most recent RP entry wins, including when the same person uses two aliases.
  // Inside one post, its last complete wardrobe record takes priority.
  const byCharacter=new Map();
  for(const [name,wear] of pairs){
   const canonical=canonicalWardrobeName(name);
   if(canonical)byCharacter.set(canonical,wear);
  }
  for(const [canonical,wear] of byCharacter)if(!wardrobe.has(canonical))wardrobe.set(canonical,wear);
 };
 let i=last;
 for(;i>=0&&recent.length<count;i--){
  const m=history[i],raw=getCarrierRpText(m,Boolean(options.cleanup.exceptions?.length));if(!raw)continue;
  let read;
  try{read=await readConfiguredWardrobe(raw,settings);}
  catch(e){warning='Гардероб: '+String(e?.message||e);read={text:stripWardrobeTags(raw),pairs:[]};}
  insertOutfits(read.pairs);
  let text;try{text=await cleanConfiguredRp(read.text,options);}catch(e){warning='Очистка: '+String(e?.message||e);text=cleanRpVisualText(read.text);}
  if(text)recent.unshift({m,raw,text,index:i});
 }
 // Continue scanning backwards exclusively for wardrobe markers. Never append
 // old posts to the scene or send the older narrative to the director.
 const hasHeavyRules=settings.sources.some(r=>r.enabled!==false&&['regex','html'].includes(r.type));
 // With regex/HTML rules, bound the expensive per-post parsing work.
 const budget=hasHeavyRules?24:240;
 let searched=0;
 for(;i>=0&&searched<budget;i--){
  const raw=getCarrierRpText(history[i]);if(!raw)continue;
  searched++;
  if(!mayContainWardrobe(raw,settings))continue;
  try{insertOutfits((await readConfiguredWardrobe(raw,settings)).pairs);}
  catch(e){warning='Гардероб: '+String(e?.message||e);}
 }
 // Facts written in the RP take precedence; card/persona outfit is a fallback.
 insertOutfits(getCardPersonaWardrobe(st,settings));
 // Custom literal boundaries can independently target the current card or persona.
 // Use the exact same wardrobe parser as the chat message rules.
 const hasCardRules=settings.sources.some(r=>r.type==='bounded'&&r.enabled!==false&&['card','persona'].includes(r.where));
 if(hasCardRules){
  const character=st.characters?.[st.characterId],name=String(character?.name||st.name2||'');
  const charText=String(character?.description||character?.data?.description||'');
  let personaText='';
  try{personaText=String(st.substituteParams?.('{{persona}}')||st.personaDescription||'');}catch{}
  if(personaText==='{{persona}}')personaText='';
  const narrator=/^(?:narrator|нарратор|рассказчик)$/iu.test(name);
  for(const [origin,text,fallbackName,requireNames] of [
   ['card',charText,name,narrator],['persona',personaText,String(st.name1||''),false]]){
   if(!text)continue;
   try{
    const parsed=await readConfiguredWardrobe(text,settings,{origin,fallbackName,requireNames});
    insertOutfits(parsed.pairs);
   }catch(e){warning='Гардероб из '+(origin==='card'?'карточки':'персоны')+': '+String(e?.message||e);}
  }
 }

 return {recent,wardrobe,warning};
}

// Module: settings
const GEN2_SETTINGS_DEFAULTS={version:1,wardrobe:{version:1,keepDefault:true,sources:[],card:{...DEFAULT_CARD_WARDROBE},persona:{...DEFAULT_PERSONA_WARDROBE}},posts:{snapshot:2,comic:2,story_page:5},cleanup:{serviceTags:true,comments:true,html:true,mawsFooter:true,customPatterns:[]},dialogue:{comicLines:2,comicWords:7,storyLines:3,storyWords:10},aspectRatio:{snapshot:'auto',comic:'auto',story_page:'auto'},previewEnabled:true};
function validateGen2Settings(value){
 const s=JSON.parse(JSON.stringify(value));
 if(s.version!==1)throw Error('Неизвестная версия настроек');
 s.wardrobe=validateWardrobeSettings(s.wardrobe);
 for(const key of ['snapshot','comic','story_page'])if(!Number.isInteger(s.posts?.[key])||s.posts[key]<1||s.posts[key]>20)throw Error('Количество постов: от 1 до 20');
 for(const key of ['serviceTags','comments','html','mawsFooter'])if(typeof s.cleanup?.[key]!=='boolean')throw Error('Неверный переключатель очистки '+key);
 if(!Array.isArray(s.cleanup.customPatterns)||s.cleanup.customPatterns.length>8)throw Error('Разрешено до 8 дополнительных фильтров очистки');
 s.cleanup.exceptions??=[];
 if(!Array.isArray(s.cleanup.exceptions)||s.cleanup.exceptions.length>8)throw Error('Разрешено до 8 исключений очистки');
 for(const [section,rules]of [['Правило удаления',s.cleanup.customPatterns],['Исключение',s.cleanup.exceptions]])for(const [index,r]of rules.entries()){
  const where=section+' №'+(index+1)+': ';
  if(typeof r.pattern!=='string'||!r.pattern)throw Error(where+'заполни начало и конец метки или удали пустое правило.');
  try{Object.assign(r,normalizeNessRegexRule(r));}catch(e){throw Error(where+String(e.message||e));}
 }
 for(const r of s.cleanup.exceptions){if(typeof (r.label??'')!=='string'||String(r.label||'').length>100)throw Error('Подпись исключения — до 100 символов');if(typeof (r.group??'')!=='string'||(r.group&&!/^\d+$|^[A-Za-z_$][\w$]*$/.test(r.group)))throw Error('Группа исключения — номер или имя');}
 s.aspectRatio={...GEN2_SETTINGS_DEFAULTS.aspectRatio,...(s.aspectRatio&&typeof s.aspectRatio==='object'&&!Array.isArray(s.aspectRatio)?s.aspectRatio:{})};
 for(const kind of ['snapshot','comic','story_page'])if(!['auto','1:1','2:3','3:2','9:16'].includes(s.aspectRatio[kind]))throw Error('Неверный формат картинки для '+kind);
 for(const key of ['comicLines','storyLines'])if(!Number.isInteger(s.dialogue?.[key])||s.dialogue[key]<0||s.dialogue[key]>8)throw Error('Количество реплик: от 0 до 8');
 for(const key of ['comicWords','storyWords'])if(!Number.isInteger(s.dialogue?.[key])||s.dialogue[key]<1||s.dialogue[key]>40)throw Error('Длина реплики: от 1 до 40 слов');
 if(typeof s.previewEnabled!=='boolean')throw Error('Неверная настройка просмотра');
 return s;
}
const gen2SettingsWarnings=new WeakMap();
function loadGen2Settings(){
 const st=SillyTavern.getContext(),v=st.chatMetadata?.variables||{},global=st.extensionSettings?.variables?.global?.sp_ness_user_settings_v1;
 const raw=v.sp_imagen_user_settings??global??GEN2_SETTINGS_DEFAULTS;
 const chat=st.chat;
 try{
  const value=typeof raw==='string'?JSON.parse(raw):raw;
  const valid=validateGen2Settings(value);
  if(chat&&typeof chat==='object')gen2SettingsWarnings.delete(chat);
  return valid;
 }catch(error){
  // Do not make the settings window inaccessible because one stale tag/regex is invalid.
  // No stored values are overwritten; save explicitly in the UI to accept this repair.
  let source={};try{source=typeof raw==='string'?JSON.parse(raw):raw||{};}catch{}
  const cloned=JSON.parse(JSON.stringify(GEN2_SETTINGS_DEFAULTS));
  for(const key of Object.keys(cloned.posts))if(Number.isInteger(source.posts?.[key])&&source.posts[key]>=1&&source.posts[key]<=20)cloned.posts[key]=source.posts[key];
  for(const key of Object.keys(cloned.dialogue)){
   const n=source.dialogue?.[key],min=key.endsWith('Lines')?0:1,max=key.endsWith('Lines')?8:40;
   if(Number.isInteger(n)&&n>=min&&n<=max)cloned.dialogue[key]=n;
  }
  for(const kind of ['snapshot','comic','story_page'])if(['auto','1:1','2:3','3:2','9:16'].includes(source.aspectRatio?.[kind]))cloned.aspectRatio[kind]=source.aspectRatio[kind];
   for(const key of ['serviceTags','comments','html','mawsFooter'])if(typeof source.cleanup?.[key]==='boolean')cloned.cleanup[key]=source.cleanup[key];
  cloned.cleanup.exceptions??=[];
  for(const kind of ['customPatterns','exceptions']){
   const list=Array.isArray(source.cleanup?.[kind])?source.cleanup[kind]:[];
   for(const rule of list.slice(0,8)){
    try{
     const fixed=normalizeNessRegexRule(rule);
     if(kind==='exceptions' && (typeof fixed.label!=='string'&&fixed.label!==undefined || typeof fixed.group!=='string'&&fixed.group!==undefined))continue;
     cloned.cleanup[kind].push(fixed);
    }catch{}
   }
  }
  const w=source.wardrobe;
  if(w&&typeof w==='object'&&!Array.isArray(w)){
   const candidate={...cloned.wardrobe,...w,sources:[]};
   const rules=Array.isArray(w.sources)?w.sources:[];
   for(const rule of rules.slice(0,8)){
    try{
     validateWardrobeSettings({...candidate,sources:[rule]});
     candidate.sources.push(rule);
    }catch{}
   }
   try{cloned.wardrobe=validateWardrobeSettings(candidate);}catch{}
  }
  if(typeof source.previewEnabled==='boolean')cloned.previewEnabled=source.previewEnabled;
  let repaired;
  try{repaired=validateGen2Settings(cloned);}catch{repaired=validateGen2Settings(GEN2_SETTINGS_DEFAULTS);}
  if(chat&&typeof chat==='object')gen2SettingsWarnings.set(chat,'Некоторые старые настройки несовместимы: '+String(error?.message||error)+'. Показаны безопасные рабочие значения. Исходные настройки сохранены, пока ты не нажмёшь «Сохранить».');
  return repaired;
 }
}
async function saveGen2Settings(settings,scope){
 const s=validateGen2Settings(settings),st=SillyTavern.getContext(),v=st.chatMetadata.variables||={};
 const previous=v.sp_imagen_user_settings,previousSkip=v.sp_imagen_skip_prompt_preview;
 st.extensionSettings.variables||={};st.extensionSettings.variables.global||={};
 const global=st.extensionSettings.variables.global,oldGlobal=global.sp_ness_user_settings_v1;
 try{
  if(scope==='global'){if(typeof st.saveSettingsDebounced!=='function')throw Error('Общие настройки недоступны');global.sp_ness_user_settings_v1=JSON.stringify(s);delete v.sp_imagen_user_settings;}
  else v.sp_imagen_user_settings=s;
  v.sp_imagen_skip_prompt_preview=!s.previewEnabled;
  if(typeof st.saveMetadata==='function')await st.saveMetadata();
  if(scope==='global')await st.saveSettingsDebounced();
 }catch(e){
  if(previous===undefined)delete v.sp_imagen_user_settings;else v.sp_imagen_user_settings=previous;
  if(previousSkip===undefined)delete v.sp_imagen_skip_prompt_preview;else v.sp_imagen_skip_prompt_preview=previousSkip;
  if(oldGlobal===undefined)delete global.sp_ness_user_settings_v1;else global.sp_ness_user_settings_v1=oldGlobal;
  throw e;
 }
 return s;
}
function formatNessPreservedText(item){
 const plain=cleanRpVisualText(String(item.content).replace(/<!--[\s\S]*?-->/g,m=>m.slice(4,-3)).replace(/<[^>]*>/g,' ').replace(/⟦[^⟧:]+:([^⟧]*)⟧/g,'$1').replace(/⟦[^⟧]*⟧/g,'').replace(/\[[A-Z][A-Z0-9_]*:([^\]]*)\]/g,'$1').replace(/\[\/?[A-Z][A-Z0-9_]*\]/g,''),{serviceTags:false,comments:false,html:true,mawsFooter:false}).trim();
 return plain?(item.label?item.label+': ':'')+plain:'';
}
async function cleanConfiguredRp(value,settings=loadGen2Settings()){
 let text=String(value||'');
 const exceptions=settings.cleanup.exceptions||[],patterns=settings.cleanup.customPatterns;
 const protectedText=exceptions.length||patterns.length?await regexWardrobe(text,{exceptions,patterns},'process'):null;
 if(protectedText)text=protectedText.text;
 text=cleanRpVisualText(text,settings.cleanup);
 for(const item of protectedText?.items||[]){
  // Exceptions retain readable content, never executable HTML or presentation code.
  const output=formatNessPreservedText(item);
  if(text.includes(item.token))text=text.split(item.token).join(output);else if(output)text+='\n'+output;
 }
 return text.replace(/\n{3,}/g,'\n\n').trim();
}
function formatConfiguredPosts(recent){
 const st=SillyTavern.getContext();
 return recent.map((x,i)=>'ПОСТ '+(i+1)+', '+(x.m.is_user?st.name1:x.m.name||st.name2)+':\n'+x.text).join('\n\n-----\n\n');
}
function configuredDirectorPrompt(prompt,kind,settings,useDialogueSettings=true){
 let p=String(prompt);
 const count=settings.posts[kind];
 // Only substitute the explicit source-reading number. RP history is already cropped by collectConfiguredRp.
 p=p.replace(/last (?:TWO|FIVE|\d+) (?:real )?RP posts/gi,'last '+count+' RP posts');
 if(useDialogueSettings&&(kind==='comic'||kind==='story_page')){
  const lines=kind==='comic'?settings.dialogue.comicLines:settings.dialogue.storyLines;
  const words=kind==='comic'?settings.dialogue.comicWords:settings.dialogue.storyWords;
  const previous=p;
  p=p.replace(/Select zero to (?:two|three|\d+) genuinely relevant Russian lines, each at most (?:seven|ten|\d+) words/i,
   'Select zero to '+lines+' genuinely relevant Russian lines, each at most '+words+' words');
  // If a custom director has no recognized sentence, pass numbers once, never a second long policy.
  if(p===previous) p+='\n\nACTIVE PAGE LIMITS: at most '+lines+' complete Russian spoken lines on the whole page, up to '+words+' words per line. The final Text: block repeats only those same selected lines.';
 }
 return p;
}



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
 const head=el('div',undefined,box,'ness-child-head');el('h4',title,head);
 const minimize=button('−',head,undefined,'icon quiet');minimize.setAttribute('aria-label','Свернуть: '+title);
 const close=button('×',head,undefined,'icon quiet');close.setAttribute('aria-label','Закрыть: '+title);
 const body=el('div',undefined,box,'ness-child-body'),actions=el('div',undefined,box,'ness-child-actions');let closed=false;
 minimize.onclick=()=>{
  if(closed)return;
  const collapsed=shade.dataset.minimized==='true';
  if(collapsed)delete shade.dataset.minimized;else shade.dataset.minimized='true';
  box.setAttribute('aria-modal',collapsed?'true':'false');
  for(const [e,inert]of siblings)e.inert=collapsed?true:inert;
  minimize.textContent=collapsed?'−':'□';
  minimize.setAttribute('aria-label',(collapsed?'Свернуть: ':'Развернуть: ')+title);
  minimize.focus();
 };
 function finish(){if(closed)return;closed=true;closeNessTooltip();D.removeEventListener('keydown',key,true);for(const [e,inert]of siblings)e.inert=inert;shade.remove();previous?.focus?.();onClose();}
 const key=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.key==='Tab'){const nodes=[...box.querySelectorAll('button,input,textarea,select,summary')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects?.().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&D.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first.focus();}}};
 D.addEventListener('keydown',key,true);close.onclick=finish;shade.onclick=e=>{if(e.target===shade)finish();};close.focus();
 return {...ui,shade,box,body,actions,finish,get closed(){return closed;}};
}

// Module: settings_transfer
const NESS_SETTINGS_PROFILE_FORMAT='ness-images-settings';
function makeNessSettingsProfile(value){
 const settings=validateGen2Settings(value);
 return {format:NESS_SETTINGS_PROFILE_FORMAT,version:1,settings};
}
function readNessSettingsProfile(text){
 if(typeof text!=='string'||text.length>512000)throw Error('Файл слишком большой. Нужен JSON настроек, а не весь профиль Images.');
 let value;try{value=JSON.parse(text.replace(/^\uFEFF/,'').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1'));}catch{throw Error('Не получилось прочитать JSON. Вставь весь ответ ИИ, начиная с { и заканчивая }, или выбери файл настроек.');}
 const object=(v,path)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('В настройках не найден раздел «'+path+'». Попроси ИИ вернуть полный профиль.');return v;};
 const keys=(v,allowed,path)=>{object(v,path);const extra=Object.keys(v).find(k=>!allowed.includes(k));if(extra)throw Error('В разделе «'+path+'» найдено незнакомое поле «'+extra+'». Нужен файл настроек, а не профиль расширения.');};
 object(value,'профиль');let settings=value;
 if(Object.hasOwn(value,'format')){if(value.format!==NESS_SETTINGS_PROFILE_FORMAT||value.version!==1)throw Error('Это другой тип или версия профиля. Выбери JSON, выгруженный кнопкой «Экспорт настроек».');keys(value,['format','version','settings'],'профиль');settings=value.settings;}
 keys(settings,['version','wardrobe','posts','cleanup','dialogue','aspectRatio','previewEnabled'],'настройки');
 keys(settings.wardrobe,['version','keepDefault','chatTags','sources','card','persona'],'одежда');if(settings.wardrobe.chatTags)keys(settings.wardrobe.chatTags,['mode','namePrefix','nameSuffix','outfitEnd'],'метки одежды в чате');keys(settings.posts,['snapshot','comic','story_page'],'последние посты');keys(settings.cleanup,['serviceTags','comments','html','mawsFooter','customPatterns','exceptions'],'очистка');keys(settings.dialogue,['comicLines','comicWords','storyLines','storyWords'],'текст на картинке');if(settings.aspectRatio!==undefined)keys(settings.aspectRatio,['snapshot','comic','story_page'],'формат изображения');
 if(Array.isArray(settings.wardrobe.sources))for(const r of settings.wardrobe.sources){object(r,'источник одежды');keys(r,['type','enabled',...(r.type==='bounded'?['start','end','syntax','where']:Object.keys(WARDROBE_RULE_DEFAULTS[r.type]||{}))],'источник одежды');}
 if(Array.isArray(settings.cleanup.customPatterns))for(const r of settings.cleanup.customPatterns)keys(r,['pattern','flags','uiBounds'],'правило удаления');
 if(Array.isArray(settings.cleanup.exceptions))for(const r of settings.cleanup.exceptions)keys(r,['pattern','flags','group','label','uiBounds'],'исключение');
 return validateGen2Settings(settings);
}
function nessSettingsSummary(settings){
 return 'Формат: Snapshot — '+settings.aspectRatio.snapshot+', Comic — '+settings.aspectRatio.comic+', Story Page — '+settings.aspectRatio.story_page+'.\nОдежда: '+settings.wardrobe.sources.length+' своих правил. Удаление вставок: '+settings.cleanup.customPatterns.length+'. Исключения: '+(settings.cleanup.exceptions?.length||0)+'.\nПостов: Snapshot — '+settings.posts.snapshot+', Comic — '+settings.posts.comic+', Story Page — '+settings.posts.story_page+'.\nПроверка задания перед генерацией: '+(settings.previewEnabled?'включена':'выключена')+'.';
}
function makeNessSettingsAiInstruction(profile){
 return codePrompt('settings_export_assistant').replaceAll('{{currentProfile}}',JSON.stringify(profile,null,2));
}
function openNessSettingsTransfer(D,panel,{mode,profile,onApply,isCurrent=()=>true,onClose=()=>{}}){
 const dialog=createNessChildDialog(D,panel,{title:mode==='export'?'Экспорт настроек':'Импорт настроек',marker:'data-settings-transfer',onClose});
 const {el,field,input,area,button,body,actions,finish}=dialog;let revision=0;
 const guide=dialog.section(body,'? Как пользоваться?');el('div',nessFieldHelp('Перенос настроек: инструкция'),guide,'ness-coder-faq');
 const message=el('p','',body,'ness-status');message.setAttribute('role','status');
 if(mode==='export'){
  dialog.note(body,'В файл попадут текущие значения окна, включая несохранённые правки.');
  el('div',nessSettingsSummary(profile.settings),body,'ness-coder-faq');
  const ai=el('div',undefined,body,'ness-transfer-ai');el('h4','Настроить с ИИ — 4 шага',ai);el('div','1. Скопируй инструкцию кнопкой ниже.\n2. Вставь в ИИ + добавь пожелания и 2 полных поста.\n3. Ответ ИИ → «Импорт настроек».\n4. Проверить → Загрузить → Сохранить.',ai,'ness-coder-faq');
  const copy=button('Скопировать инструкцию для ИИ',ai),manual=field(ai,'Инструкция для копирования',area(makeNessSettingsAiInstruction(profile)));manual.readOnly=true;manual.parentNode.hidden=true;
  copy.onclick=async()=>{if(dialog.closed)return;copy.disabled=true;try{if(!window.navigator?.clipboard?.writeText)throw Error('manual');await window.navigator.clipboard.writeText(manual.value);if(!dialog.closed)message.textContent='Инструкция скопирована. Вставь её в ИИ, добавь пожелания и два поста.';}catch{if(!dialog.closed){manual.parentNode.hidden=false;manual.focus();manual.select?.();message.textContent='Автокопирование недоступно. Скопируй инструкцию из открывшегося поля.';}}finally{if(!dialog.closed)copy.disabled=false;}};
  const download=button('Скачать JSON настроек',actions,undefined,'primary');
  download.onclick=()=>{if(dialog.closed)return;try{const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='SP_IMAGEN_settings.json';D.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message.textContent='Файл подготовлен для скачивания. Инструкцию для ИИ можно скопировать отдельно.';}catch(e){message.textContent='Не удалось скачать файл: '+String(e.message||e);}};
 }else{
  dialog.note(body,'Выбери файл настроек или вставь ответ ИИ. Сначала покажем, что загрузится; изменения начнут действовать только после сохранения в основном окне.');
  const upload=input('','file');upload.accept='.json,application/json';upload.hidden=true;upload.setAttribute('data-settings-file','');body.appendChild(upload);const choose=button('Выбрать файл .json',body,()=>upload.click());
  const text=field(body,'Или вставь ответ ИИ целиком',area(''));text.setAttribute('data-settings-import-text','');text.placeholder='Весь JSON: от первой { до последней }';
  const check=button('Проверить настройки',body),summary=el('div','',body,'ness-coder-preview');summary.hidden=true;const apply=button('Загрузить в настройки',actions,undefined,'primary');apply.disabled=true;let checked=null;
  function reset(){revision++;checked=null;summary.hidden=true;apply.disabled=true;message.textContent='';}text.oninput=reset;
  upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;reset();const ownRevision=revision;choose.disabled=true;try{if(file.size>1048576)throw Error('Файл больше 1 МБ. Выбери JSON настроек, а не весь профиль Images.');const content=await file.text();if(dialog.closed||revision!==ownRevision)return;text.value=content;message.textContent='Файл загружен. Нажми «Проверить настройки».';}catch(e){if(!dialog.closed&&revision===ownRevision)message.textContent=String(e.message||e);}finally{if(!dialog.closed){choose.disabled=false;upload.value='';}}};
  check.onclick=()=>{if(dialog.closed)return;reset();try{checked=readNessSettingsProfile(text.value);summary.textContent='Будет загружено:\n'+nessSettingsSummary(checked)+'\nЗаменит значения только в открытом окне. Затем проверь их и нажми «Сохранить настройки».';summary.hidden=false;apply.disabled=false;message.textContent='Формат настроек подходит. Правила поиска будут применяться при генерации.';}catch(e){message.textContent=String(e.message||e);}};
  apply.onclick=()=>{if(dialog.closed||!checked)return;try{if(!isCurrent())throw Error('Чат изменился. Закрой это окно и открой настройки в нужном чате.');onApply(checked);finish();}catch(e){message.textContent=String(e.message||e);}};
 }
 return finish;
}

// Module: rule_coder
// Detect a repeatable record schema from a complete sample, regardless of the
// name of its surrounding tag. An empty <tag></tag> alone is not enough data.
function inferWardrobeRecordRule(sample,{outfitLabel=''}={}){
 const source=String(sample||'').trim();
 const esc=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 let start='',end='',inner=source;
 const wrapped=source.match(/^<([A-Za-z][\w:-]*)\b[^>]*>/);
 if(wrapped){
  const close=new RegExp('<\\/'+esc(wrapped[1])+'\\s*>\\s*$','i');
  const finish=source.match(close);
  if(finish){start=wrapped[0];end=finish[0].trim();inner=source.slice(start.length,finish.index);}
 }
 if(!start){
  const opener=source.match(/^(\[([^\]\r\n]+)\]|⟦([^⟧\r\n]+)⟧)/);
  if(opener){
   const symbol=opener[2]!==undefined?'[':'⟦';
   const name=opener[2]||opener[3];
   const closing=symbol==='['?'[/'+name+']':'⟦/'+name+'⟧';
   if(source.endsWith(closing)){start=opener[0];end=closing;inner=source.slice(start.length,-end.length);}
  }
 }
 const lines=inner.split(/\r?\n/).filter(line=>line.includes('|')&&/[：:]/.test(line));
 const selected=String(outfitLabel||'').trim();
 const defaultLabels=['одежда','clothing','outfit','wearing','наряд','экипировка','костюм','гардероб','облачение'];
 let label=selected;
 if(!label){
  for(const line of lines){
   const labels=[...line.matchAll(/(?:^|\|)\s*([^|\r\n:：]{1,55})\s*[:：]/g)].map(m=>m[1].trim());
   label=labels.find(item=>defaultLabels.some(key=>item.toLocaleLowerCase().includes(key)))||'';
   if(label)break;
  }
 }
 if(!label)return null;
 // The first pipe-delimited value on a record line is the character name;
 // intermediate fields (mood, position, etc.) may be in any order.
 const pattern=labeledRecordPattern(label);
 const check=new RegExp(pattern,'gmiu');
 if(![...inner.matchAll(check)].some(m=>m.groups?.name?.trim()&&m.groups?.outfit?.trim()))return null;
 return {type:start?'scopedRegex':'regex',enabled:true,...(start?{blockStart:start,blockEnd:end,outfitLabel:label}:{}),pattern,flags:'gmiu',nameGroup:'name',outfitGroup:'outfit'};
}
// Convert examples into the same rule objects consumed by settings; never execute pasted code.
function compileNessRule({text,goal='cleanup',format='auto',start='',end='',nameGroup='',outfitGroup='',group='',label='',outfitLabel=''}={}){
 let source=String(text||'').trim().replace(/^```(?:json|regex|html|text)?\s*\n([\s\S]*?)\n```$/i,'$1').trim();
 if(format==='block'&&!source)source=start+end;
 if(!source||source.length>20000)throw Error('Вставь один пример длиной до 20 000 символов.');
 if(goal==='auto')goal=/(?:OUTFIT|ОДЕЖДА|\|\s*[^|\n]*(?:одежда|clothing|outfit|наряд|экипировка)\s*[:：]|data-(?:outfit|clothes|clothing)|_outfit\s*:|\(\?<outfit>|"(?:nameGroup|outfitGroup)"|"type"\s*:\s*"(?:html|markers|regex)")/i.test(source)?'wardrobe':'cleanup';
 const esc=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const checked=(pattern,flags='g')=>{const checked=normalizeNessRegexRule({pattern,flags});return {pattern:checked.pattern,flags:checked.flags};};
 function result(rule,kind){
  if(kind==='wardrobe')rule=validateWardrobeSettings({version:1,keepDefault:false,sources:[rule]}).sources[0];
  else{rule={...checked(rule.pattern,rule.flags||'g'),...(kind==='preserve'?{group:String(group||rule.group||''),label:String(label||rule.label||'').trim()}: {})};if(kind==='preserve'&&rule.label.length>100)throw Error('Подпись — до 100 символов.');if(kind==='preserve'&&rule.group&&!/^\d+$|^[A-Za-z_$][\w$]*$/.test(rule.group))throw Error('Группа — её номер или имя, например 1 или value.');}
  const destination=kind==='wardrobe'?'Откуда брать одежду → Ручная настройка чтения одежды':kind==='preserve'?'Что скрыть от режиссёра → Исключения':'Что скрыть от режиссёра → Ручная настройка удаления';
  return {rule,kind,destination,code:JSON.stringify(rule,null,2)};
 }
 let imported=null;
 if(format==='auto'||format==='regex'){
  try{imported=JSON.parse(source);}catch{}
  if(imported){if(Array.isArray(imported)){if(imported.length!==1)throw Error('Вставь одну запись regex, а не весь список.');imported=imported[0];}if(Array.isArray(imported.regex_scripts)){if(imported.regex_scripts.length!==1)throw Error('В экспорте несколько regex. Вставь одну нужную запись.');imported=imported.regex_scripts[0];}
   if(typeof imported==='string'){source=imported;imported=null;}
   else if(imported.type&&goal==='wardrobe')return result(imported,'wardrobe');
   else if(imported.findRegex)source=String(imported.findRegex);
   else if(imported.pattern)source=String(imported.pattern);
   else throw Error('В JSON не найдено findRegex или pattern. Нужен экспорт одного правила или сам пример.');
  }
 }
 const slash=source.match(/^\/([\s\S]+)\/([a-z]*)$/);
 if(format==='regex'||slash||imported){
  const rule=checked(slash?slash[1]:source,imported?.flags||slash?.[2]||'gm');
  if(goal==='wardrobe'){
   const names=[...rule.pattern.matchAll(/\(\?<([A-Za-z_$][\w$]*)>/g)].map(m=>m[1]),n=nameGroup||imported?.nameGroup||(names.includes('name')?'name':''),o=outfitGroup||imported?.outfitGroup||(names.includes('outfit')?'outfit':'');
   if(!n||!o)throw Error('Укажи группы имени и одежды ниже. Для готового regex их назначение нельзя угадать по номерам.');
   return result({type:'regex',enabled:true,...rule,nameGroup:n,outfitGroup:o},goal);
  }
  if(goal==='preserve'&&!group){const names=[...rule.pattern.matchAll(/\(\?<([A-Za-z_$][\w$]*)>/g)].map(m=>m[1]);group=imported?.group||['value','text','content','body'].find(n=>names.includes(n))||'';}
  return result({...rule,group:imported?.group,label:imported?.label},goal);
 }
 if(format==='block'){
  if(!start||!end)throw Error('Введи обе метки: начало и конец нужного фрагмента.');
  return result({pattern:esc(start)+(goal==='preserve'?'(?<value>[\\s\\S]*?)':'[\\s\\S]*?')+esc(end),flags:'g',group:goal==='preserve'?'value':''},goal);
 }
 if(format==='literal'){
  if(goal==='wardrobe')throw Error('Обычный текст нельзя разделить на имя и одежду. Выбери пример разметки или готовый regex.');
  return result({pattern:esc(source),flags:'g'},goal);
 }
 if(goal==='wardrobe'){
  // Recognize a block with any tag name and repeated named records before
  // considering raw HTML attributes or one-line clothing markers.
  const structured=inferWardrobeRecordRule(source,{outfitLabel});
  if(structured)return result(structured,goal);
  if(/<\w/.test(source)){
   const name=source.match(/\b(data-(?:name|character))\s*=/i)?.[1],outfit=source.match(/\b(data-(?:outfit|clothes|clothing))\s*=/i)?.[1];
   if(name&&outfit)return result({type:'html',enabled:true,rowSelector:'['+name+']['+outfit+']',nameSelector:'',nameAttribute:name,outfitSelector:'',outfitAttribute:outfit,stripSelector:''},goal);
   throw Error('В примере есть HTML, но нет понятных строк с именем и одеждой. Вставь содержимое блока целиком, где видны хотя бы один персонаж и его одежда.');
  }
  const tag=source.match(/([⟦\[])([^\]⟧\n:]+:)([^\]⟧\n]+)([⟧\]])/);
  if(tag){const close=tag[1]+'/'+tag[2].slice(0,-1)+tag[4];return result({type:'markers',enabled:true,namePrefix:tag[1]+tag[2],nameSuffix:tag[4],outfitEnd:source.includes(close)?close:'',blockStart:'',blockEnd:''},goal);}
  if(/^[^\n:]+_outfit\s*:/m.test(source))return result({type:'regex',enabled:true,pattern:'^(?<name>[^\\n:]+?)_outfit:[ \\t]*(?<outfit>[^\\n]+)$',flags:'gm',nameGroup:'name',outfitGroup:'outfit'},goal);
  throw Error('Не удалось определить, где имя и одежда. Вставь полный пример записи с обоими значениями; если поле одежды названо необычно, укажи его название рядом с примером.');
 }
 if(/^<!--[\s\S]*-->$/.test(source)){
  const inner=source.slice(4,-3).trim();
  if(/^[⟦\[][^⟧\]\n:|]+[:|][^⟧\]]*[⟧\]]$/.test(inner)){
   const compiled=compileNessRule({text:inner,goal,format:'sample',group,label});
   return result({...compiled.rule,pattern:'<!--\\s*'+compiled.rule.pattern+'\\s*-->'},goal);
  }
  return result({pattern:'<!--'+(goal==='preserve'?'(?<value>[\\s\\S]*?)':'[\\s\\S]*?')+'-->',flags:'g',group:goal==='preserve'?'value':''},goal);
 }
 const paired=source.match(/^([⟦\[])([\wА-Яа-яЁё:-]+)([⟧\]])([\s\S]*?)\1\/\2\3$/u);
 if(paired)return result({pattern:esc(paired[1]+paired[2]+paired[3])+(goal==='preserve'?'(?<value>[\\s\\S]*?)':'[\\s\\S]*?')+esc(paired[1]+'/'+paired[2]+paired[3]),flags:'g',group:goal==='preserve'?'value':''},goal);
 const single=source.match(/^([⟦\[])([^⟧\]\n:|]+)([:|])([^⟧\]]*)([⟧\]])$/);
 if(single)return result({pattern:esc(single[1]+single[2]+single[3])+(goal==='preserve'?'(?<value>[^'+esc(single[5])+']*)':'[^'+esc(single[5])+']*')+esc(single[5]),flags:'g',group:goal==='preserve'?'value':''},goal);
 const html=source.match(/^<([A-Za-z][\w:-]*)(\s[^>]*|)>([\s\S]*)<\/\1\s*>$/);
 if(html){
  if(new RegExp('<'+esc(html[1])+'(?:\\s|>)','i').test(html[3]))throw Error('Внутри есть вложенный HTML того же типа. Укажи уникальные начальную и конечную метки в режиме «Между двумя метками».');
  const attr=html[2].match(/\b(id|class|data-[\w-]+)\s*=\s*(["'])([^"']+)\2/i);
  if(!attr&&!['think','analysis','note','summary'].includes(html[1].toLowerCase()))throw Error('У HTML нет отличительной метки. Добавь id/class или задай точные границы в режиме «Между двумя метками», чтобы не затронуть все такие элементы.');
  const opening='<'+esc(html[1])+'\\b'+(attr?'(?=[^>]*\\b'+esc(attr[1])+'\\s*=\\s*["\x27]'+esc(attr[3])+'["\x27])':'')+'[^>]*>';
  return result({pattern:opening+(goal==='preserve'?'(?<value>[\\s\\S]*?)':'[\\s\\S]*?')+'<\\/'+esc(html[1])+'\\s*>',flags:'gi',group:goal==='preserve'?'value':''},goal);
 }
 throw Error('Формат неоднозначен. Выбери «Готовый regex», «Обычный текст» или «Между двумя метками». Автоформат ждёт один полный пример метки или HTML-блока.');
}
function createGen2SettingsPanel(D,initial,skipPreview,onDirty=()=>{}){
 const ui=createUiKit(D),{el,input,area,field,checkbox,choice,clear}=ui,root=el('div');root.className='ness-settings-form';root.oninput=onDirty;root.onchange=onDirty;
 const top=el('div',undefined,root,'ness-settings-top'),scope=field(top,'Где сохранить?',choice([['chat','Только этот чат'],['global','Все чаты']],'chat'));
 const intro=el('div',undefined,root,'ness-settings-intro');
 el('h4','Основные настройки',intro);
 el('p','Открывай только то, что хочешь изменить.',intro);
 const grid=el('div',undefined,root,'ness-settings-grid'),left=el('div',undefined,grid,'ness-settings-column'),right=el('div',undefined,grid,'ness-settings-column');
 // Sections start collapsed. Concise descriptions live in their headers; detailed help is on demand.
 const summaries={
  'Количество постов':'Сколько сообщений учитывать для каждого вида картинки',
   'Формат изображения':'Авто или фиксированное соотношение сторон отдельно для Snapshot, Comic и Story Page',
  'Текст на картинке':'Сколько реплик брать в комикс и на страницу истории',
  'Предварительный просмотр промпта':'Посмотреть и при необходимости поправить задание',
  'Источники одежды':'Где искать одежду персонажей',
  'Очистка постов':'Какие служебные записи скрыть от режиссёра',
  'Точные правила поиска':'Свои форматы, правила удаления и исключения',
 };
 const section=(parent,label,help,open=false)=>{
  const box=ui.section(parent,label,open),summary=box.firstElementChild,description=summaries[help];
  if(description){box.classList.add('ness-settings-card');summary.textContent='';el('span',label,summary,'ness-settings-card-title');el('span',description,summary,'ness-settings-card-desc');}
  ui.help(summary,help||label);return box;
 },message=ui.note(root,'');
 const advanced=section(root,'⚙ Свои правила','Точные правила поиска',false);
 el('p','Заполняй только метки, которые видишь в своих постах. Все остальные настройки работают автоматически.',advanced,'ness-settings-mini-note');
 const wardrobe=section(right,'👕 Откуда брать одежду','Источники одежды');
 el('p','Готовые метки можно включить здесь. Свои записи настраиваются ниже: выбери источник и скопируй две границы прямо из текста.',wardrobe,'ness-settings-lead');
 function copySample(sample){try{const action=navigator.clipboard?.writeText?.(sample);if(!action)throw Error('no clipboard');Promise.resolve(action).then(()=>message.textContent='Пример скопирован.').catch(()=>message.textContent='Выдели пример вручную.');}catch{message.textContent='Выдели пример вручную.';}}
 const chatOptions=initial.wardrobe.chatTags||DEFAULT_CHAT_TAGS;
 const chatMode=field(wardrobe,'Готовые метки из сообщений',choice([['default','Да, искать готовые метки'],['custom','Только ранее настроенные метки'],['both','Готовые и ранее настроенные'],['off','Нет, только мои правила ниже']],chatOptions.mode),'Метки одежды в чате');
 chatMode.setAttribute('data-setting','wardrobe.chatTags.mode');
 const chatTagFields={},customChat=el('div',undefined,wardrobe,'ness-source-step');
 for(const [key,label]of [['namePrefix','До имени'],['nameSuffix','После имени'],['outfitEnd','После одежды']])chatTagFields[key]=field(customChat,label,input(chatOptions[key]),'Своя метка одежды: '+label);
 const refreshChat=()=>{customChat.hidden=!['custom','both'].includes(chatMode.value);};chatMode.addEventListener('change',refreshChat);refreshChat();
 const examples=el('div',undefined,wardrobe,'ness-rule-explain');
 el('strong','Примеры готовых записей',examples);
 el('pre','HTML: <infoblock> … </infoblock>\nЗапись с regex-символами: [LOOK:Джи]синяя рубашка[/LOOK]\nДругие метки: ⟦ГАРДЕРОБ⟧ … ⟦/ГАРДЕРОБ⟧',examples,'ness-wardrobe-example');
 el('p','В начале и конце скопируй символы буквально из своего поста. Например, если видишь <infoblock>…</infoblock>, впиши <infoblock> и </infoblock>. Имя и одежда должны быть внутри записи.',examples,'ness-step-desc');
 const cardControls={};
 for(const [key,title,description]of [
  ['card','Карточка персонажа','Из поля «Описание» активной карточки. В карточке-нарраторе пиши имя перед одеждой каждого героя.'],
  ['persona','Описание персоны','Из описания выбранной персоны SillyTavern.']]){
  const wrap=el('div',undefined,wardrobe,'ness-source-step'),opts=initial.wardrobe[key];
  el('strong',title,wrap,'ness-step-title');el('p',description,wrap,'ness-step-desc');
  cardControls[key]={enabled:checkbox(wrap,'Читать одежду отсюда',opts.enabled)};
  const fields=el('div',undefined,wrap,'ness-rule-fields');
  cardControls[key].start=field(fields,'Начало блока',input(opts.start),'Начальная метка');
  cardControls[key].end=field(fields,'Конец блока',input(opts.end),'Конечная метка');
  const ex=el('pre',key==='card'?opts.start+'\nДжи | Одежда: blue sweater\nКишибе | Одежда: grey shirt\n'+opts.end:opts.start+'\nblue sweater\n'+opts.end,wrap,'ness-wardrobe-example');
  const draw=()=>{ex.textContent=key==='card'?cardControls[key].start.value+'\nДжи | Одежда: blue sweater\nКишибе | Одежда: grey shirt\n'+cardControls[key].end.value:cardControls[key].start.value+'\nblue sweater\n'+cardControls[key].end.value;};
  cardControls[key].start.addEventListener('input',draw);cardControls[key].end.addEventListener('input',draw);
  const update=()=>{fields.hidden=!cardControls[key].enabled.checked;ex.hidden=fields.hidden;};cardControls[key].enabled.addEventListener('change',update);update();
 }
 const customSources=section(advanced,'👕 Свои метки одежды','Свои форматы одежды',false),sources=el('div',undefined,customSources),sourceRows=[];
 el('p','Выбери пример, укажи источник и вставь свои метки. {{имя}} обозначает любое имя персонажа. Если закрывающей метки нет, оставь конец пустым — одежда читается до конца строки.',customSources,'ness-settings-lead');
 const exampleTypes=[
  ['line','Одна строка (без закрывающей метки)'],
  ['markers','Метки со скобками'],
  ['html','HTML-запись'],
  ['block','Общий блок с несколькими персонажами']
 ];
 const tagExamples={
  line:['Одежда_{{имя}}:',''],
  markers:['[LOOK:{{имя}}]','[/LOOK]'],
  html:['<look name="{{имя}}">','</look>'],
  block:['<infoblock>','</infoblock>']
 };
 const whereOptions=[['chat','Ролевые сообщения'],['card','Карточка персонажа'],['persona','Описание персоны']];
 function addSource(value={type:'bounded',enabled:true,start:'Одежда_{{имя}}:',end:'',syntax:'line',where:'chat'}){
  if(sourceRows.length>=8){message.textContent='Максимум 8 своих правил одежды.';return;}
  const isLegacy=value.type!=='bounded';
  const row=el('div',undefined,sources,'ness-friendly-rule');el('strong',isLegacy?'Сохранённое правило':'Правило одежды',row,'ness-step-title');
  const enabled=checkbox(row,'Искать по этому правилу',value.enabled!==false);
  const syntax=field(row,'Пример записи',choice(exampleTypes,tagExamples[value.syntax]?value.syntax:'line'),'Примеры меток одежды');
  const where=field(row,'Где искать?',choice(whereOptions,value.where||'chat'),'Источники одежды');
  el('p','Скопируй начало записи и замени в нём только имя на {{имя}}. Расширение само прочитает настоящее имя и найдёт нужного персонажа.',row,'ness-step-desc');
  const startField=field(row,'Начало (вместо имени — {{имя}})',input(value.start||''),'Метка одежды с {{имя}}');
  const endField=field(row,'Конец (если нет — оставить пустым)',input(value.end||''),'Конец одежды');
  startField.placeholder='Одежда_{{имя}}:';endField.placeholder='Пусто = до конца строки';
  const example=el('pre','',row,'ness-wardrobe-example');
  const redraw=()=>{
   const a=startField.value,b=endField.value,hasName=a.includes('{{имя}}');
   example.textContent=hasName
     ? `${a.replace('{{имя}}','Джи')}blue sweater${b||'\n'}\n${a.replace('{{имя}}','Кишибе')}grey shirt${b||'\n'}`
     : `${a}\nДжи | Одежда: blue sweater\nКишибе | Одежда: grey shirt\n${b}`;
  };
  const fillExample=()=>{if(isLegacy)return;const [a,b]=tagExamples[syntax.value]||tagExamples.line;startField.value=a;endField.value=b;redraw();onDirty();};
  syntax.addEventListener('change',fillExample);
  startField.addEventListener('input',redraw);endField.addEventListener('input',redraw);redraw();
  const check=el('details',undefined,row,'ness-rule-check');el('summary','Проверить на своём примере',check);
  const sample=el('textarea','',check,'ness-rule-test');sample.rows=3;sample.placeholder='Вставь запись из поста с именем и одеждой.';
  const result=el('p','',check,'ness-step-desc');
  ui.button('Проверить',check,()=>{
   try{
    const parsed=boundedWardrobe(sample.value,{start:startField.value,end:endField.value},{fallbackName:'',requireNames:true});
    result.textContent=parsed.pairs.length?parsed.pairs.map(([name,wear])=>`${name} → ${wear}`).join(' | '):'Не найдено. Проверь точное начало, конец и {{имя}} в метке.';
   }catch(error){result.textContent=String(error.message||error);}
  },'quiet');
  if(isLegacy){for(const e of [syntax.parentElement,where.parentElement,startField.parentElement,endField.parentElement,example,check])e.hidden=true;el('p','Правило прежней версии сохранено и продолжает работать.',row,'ness-step-desc');}
  const actions=el('div',undefined,row,'ness-settings-actions');
  const entry={row,enabled,getRule:()=>isLegacy?{...value,enabled:enabled.checked}:{type:'bounded',enabled:enabled.checked,start:startField.value,end:endField.value,syntax:syntax.value,where:where.value}};
  ui.button('Удалить',actions,()=>{if(!window.confirm('Удалить правило одежды?'))return;sourceRows.splice(sourceRows.indexOf(entry),1);row.remove();onDirty();},'quiet');
  sourceRows.push(entry);return entry;
 }
 initial.wardrobe.sources.forEach(addSource);
 ui.button('+ Добавить правило',customSources,()=>{const item=addSource();if(item){advanced.open=true;onDirty();}},'quiet');
 const posts=section(left,'📖 История чата','Количество постов'),numbers=el('div',undefined,posts,'ness-numbers'),postFields={};
 for(const [key,title,help]of [['snapshot','Кадр','Snapshot'],['comic','Комикс','Comic'],['story_page','Страница','Story Page']]){
  const control=input(initial.posts[key],'number');control.min='1';control.max='20';control.inputMode='numeric';control.setAttribute('data-setting','posts.'+key);postFields[key]=field(numbers,title,control,help);
 }
 const cleanup=section(right,'🧹 Что скрывать от режиссёра','Очистка постов'),cleanFields={};
 el('p','SP Imagen читает копию сообщений. Эти галочки убирают из неё технические вставки, чтобы режиссёр не пытался нарисовать их. Сами сообщения в чате не меняются.',cleanup,'ness-settings-lead');
 const cleanOptions=[
  ['serviceTags','Метки служебных данных','Например, ⟦SCORE:12⟧ или [MAWS_RESULT:...] — это данные расширения, а не действие персонажа.','«Джи улыбнулась. ⟦SCORE:12⟧»','«Джи улыбнулась.»'],
  ['comments','Скрытые комментарии','Заметки между <!-- и -->. Они могут присутствовать в исходном тексте, хотя не видны в самом сообщении.','«Сцена в парке. <!-- заметка для бота -->»','«Сцена в парке.»'],
  ['html','Скрытое оформление и мысли','HTML — оформление текста с тегами <…>. Эта настройка убирает оформление и скрытые блоки, но оставляет обычный видимый текст.','«<div>Привет!</div><think>служебная мысль</think>»','«Привет!»'],
  ['mawsFooter','Техническая сводка в конце','В некоторых постах после основного текста идёт служебный итог со значениями и метками. Убирается только распознанный формат, не обычный финал сцены.','«Они ушли домой.\n⟦MAWS_MEM⟧... [служебный итог]»','«Они ушли домой.»'],
 ];
 for(const [key,title,description,before,after]of cleanOptions){
  const group=el('div',undefined,cleanup,'ness-clean-row');
  cleanFields[key]=checkbox(group,title,initial.cleanup[key]);cleanFields[key].setAttribute('data-setting','cleanup.'+key);
  el('p',description,group,'ness-step-desc');
  const details=ui.section(group,'Пример: что исчезнет из задания',false),example=el('div',undefined,details,'ness-before-after');
  const first=el('div',undefined,example);el('strong','До',first);el('pre',before,first);
  const second=el('div',undefined,example);el('strong','После',second);el('pre',after,second);
 }
 const customCleanup=section(advanced,'🧹 Убрать свои служебные блоки','Свои правила удаления',false),filters=el('div',undefined,customCleanup),filterRows=[];
 const exceptionScope=section(advanced,'💾 Оставить нужное','Исключения',false),exceptionRules=el('div',undefined,exceptionScope),exceptionRows=[];
 const escapeBoundary=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 // Literal delimiters become regex only when the settings are saved.
 const delimitedPattern=(start,end,preserve=false)=>escapeBoundary(start)+(preserve?'(?<value>[\\s\\S]*?)':'[\\s\\S]*?')+escapeBoundary(end);
 function delimitersFromPattern(rule,preserve=false){
  // Original imported regex rules remain intact; only rules authored in this UI are editable as literal bounds.
  return rule?.uiBounds && typeof rule.uiBounds.start==='string' && typeof rule.uiBounds.end==='string' ? rule.uiBounds : null;
 }
 function addSimpleRule(target,value=null){
  const preserve=target==='preserve',rows=preserve?exceptionRows:filterRows,container=preserve?exceptionRules:filters;
  if(rows.length>=8){message.textContent='Можно сохранить до 8 правил в этом разделе.';return;}
  const initialBounds=delimitersFromPattern(value,preserve);
  const legacy=Boolean(value&&!initialBounds);
  const box=el('div',undefined,container,'ness-friendly-rule');el('strong',preserve?'Сохранить содержимое':'Убрать вставку',box,'ness-step-title');
  const examples=el('div',undefined,box,'ness-rule-explain');
  el('strong','Примеры начала и конца',examples);
  el('pre','HTML: <note> … </note>\nЗапись в скобках: [PRIVATE] … [/PRIVATE]\nДругие метки: ⟦SCORE: … ⟧',examples,'ness-wardrobe-example');
  const syntax=field(box,'Вид метки',choice([['html','HTML <...>'],['regex','Квадратные скобки [...]'],['markers','Другие метки ⟦...⟧']],initialBounds?.syntax||'markers'),'Способ поиска');
  const begin=field(box,'Начало',input(initialBounds?.start||''),'Начальная метка');
  const finish=field(box,'Конец',input(initialBounds?.end||''),'Конечная метка');
  begin.placeholder=preserve?'⟦SCORE:':'[PRIVATE]';finish.placeholder=preserve?'⟧':'[/PRIVATE]';
  const label=preserve?field(box,'Подпись (необязательно)',input(value?.label||''),'Название извлечённых данных'):null;
  if(legacy){for(const control of [syntax,begin,finish,label].filter(Boolean))control.parentNode.hidden=true;el('p','Старое правило сохранено и продолжит работать. Для изменения создай новое с началом и концом.',box,'ness-step-desc');}
  const preview=el('p',preserve?'Например: ⟦SCORE:12⟧ → Шкала отношений: 12':'Запись между границами исчезнет только из задания для картинки. В самом чате она останется.',box,'ness-step-desc');
  const actions=el('div',undefined,box,'ness-settings-actions');
  const entry={box,getRule:()=>{
   if(legacy)return {...value};
   const start=begin.value,end=finish.value;
   if(!start||!end)throw Error('Заполни начало и конец правила или удали пустое правило.');
   return preserve?{pattern:delimitedPattern(start,end,true),flags:'g',group:'value',label:label.value.trim(),uiBounds:{start,end,syntax:syntax.value}}:{pattern:delimitedPattern(start,end),flags:'g',uiBounds:{start,end,syntax:syntax.value}};
  }};
  ui.button('Удалить',actions,()=>{if(!window.confirm('Удалить это правило?'))return;rows.splice(rows.indexOf(entry),1);box.remove();onDirty();},'quiet');
  rows.push(entry);return entry;
 }
 el('p','Удалит любую запись между указанными границами. Просто скопируй начало и конец из поста.',customCleanup,'ness-settings-lead');
 initial.cleanup.customPatterns.forEach(value=>addSimpleRule('cleanup',value));
 ui.button('+ Добавить правило',customCleanup,()=>{const item=addSimpleRule('cleanup');if(item){advanced.open=true;onDirty();}},'quiet');
 el('p','Сохранит текст между границами и уберёт сами метки. При желании добавь короткую подпись.',exceptionScope,'ness-settings-lead');
 (initial.cleanup.exceptions||[]).forEach(value=>addSimpleRule('preserve',value));
 ui.button('+ Добавить правило',exceptionScope,()=>{const item=addSimpleRule('preserve');if(item){advanced.open=true;onDirty();}},'quiet');
 const ratioSection=section(left,'▣ Формат изображения','Формат изображения'),aspectFields={};
 el('p','Авто: режиссёр выбирает соотношение, как раньше. Фиксированный формат применяется к итоговому запросу NovelAI.',ratioSection,'ness-settings-lead');
 for(const [kind,title] of [['snapshot','Snapshot'],['comic','Comic'],['story_page','Story Page']]){
   const row=el('div',undefined,ratioSection,'ness-dialogue-row');
   el('strong',title,row,'ness-dialogue-title');
   const control=choice([['auto','Авто · выбор режиссёра'],['1:1','1:1 · квадрат'],['2:3','2:3 · вертикальный'],['3:2','3:2 · горизонтальный'],['9:16','9:16 · высокий вертикальный']],initial.aspectRatio?.[kind]||'auto');
   control.setAttribute('data-setting','aspectRatio.'+kind);
   aspectFields[kind]=field(row,'Соотношение сторон',control);
 }
 const dialogue=section(left,'💬 Реплики на картинке','Текст на картинке'),dialogueFields={};
 for(const [mode,title]of [['comic','Комикс'],['story','Страница истории']]){
  const row=el('div',undefined,dialogue,'ness-dialogue-row');el('strong',title,row,'ness-dialogue-title');
  for(const [suffix,label,help,max]of [['Lines','Сколько реплик','Реплик',8],['Words','Слов в реплике','Слов',40]]){
   const key=mode+suffix,control=input(initial.dialogue[key],'number');control.min=suffix==='Lines'?'0':'1';control.max=String(max);control.inputMode='numeric';control.setAttribute('data-setting','dialogue.'+key);dialogueFields[key]=field(row,label,control,help);
  }
 }
 const previewSection=el('div',undefined,left,'ness-settings-inline'),previewText=el('div',undefined,previewSection,'ness-settings-inline-text');
 el('strong','👁 Посмотреть итоговый промпт перед отправкой в NovelAI',previewText);
 el('p','Показывать готовое описание картинки, чтобы прочитать и при необходимости поправить его до генерации.',previewText,'ness-step-desc');
 const previewToggle=checkbox(previewSection,'Показывать',skipPreview===undefined?initial.previewEnabled:!skipPreview);previewToggle.setAttribute('data-setting','previewEnabled');ui.help(previewText,'Показывать промпт перед отправкой');
 // The cards follow the same learning order on phone and desktop.
 grid.replaceChildren(posts,ratioSection,wardrobe,dialogue,previewSection,cleanup);
 root.appendChild(advanced);
 const number=e=>e.value.trim()?Number(e.value):NaN;
 function getValue(){return {version:1,wardrobe:{version:1,keepDefault:['default','both'].includes(chatMode.value),chatTags:{mode:chatMode.value,...Object.fromEntries(Object.entries(chatTagFields).map(([k,e])=>[k,e.value]))},sources:sourceRows.map(r=>r.getRule()),card:Object.fromEntries(['enabled','start','end'].map(k=>[k,k==='enabled'?cardControls.card[k].checked:cardControls.card[k].value])),persona:Object.fromEntries(['enabled','start','end'].map(k=>[k,k==='enabled'?cardControls.persona[k].checked:cardControls.persona[k].value]))},posts:Object.fromEntries(Object.entries(postFields).map(([k,e])=>[k,number(e)])),cleanup:{...Object.fromEntries(Object.entries(cleanFields).map(([k,e])=>[k,e.checked])),customPatterns:filterRows.map(r=>r.getRule()),exceptions:exceptionRows.map(r=>r.getRule())},dialogue:Object.fromEntries(Object.entries(dialogueFields).map(([k,e])=>[k,number(e)])),aspectRatio:Object.fromEntries(Object.entries(aspectFields).map(([k,e])=>[k,e.value])),previewEnabled:previewToggle.checked};}
 return {element:root,getValue,scope,dispose:()=>{}};
}

// Module: virtual_list
// Keep only the visible rows plus a small scroll buffer in the DOM.
function createVirtualList(D,container,renderRow,{rowHeight=56,overscan=6,emptyText='Ничего не найдено.',columns=()=>1,mountRow=()=>{},keyOf=item=>item?.id??item,updateRow=()=>{}}={}){
 const ui=createUiKit(D),top=ui.el('div',undefined,container),rows=ui.el('div',undefined,container),bottom=ui.el('div',undefined,container);
 top.setAttribute('aria-hidden','true');bottom.setAttribute('aria-hidden','true');
 let items=[],start=-1,end=-1,frame=null,disposed=false,previousColumns=1,previousHeight=0,pendingReset=false,forceNext=false;
 const mountedRows=new Map();let emptyNode=null;
 const request=typeof window.requestAnimationFrame==='function'?fn=>window.requestAnimationFrame(fn):fn=>setTimeout(fn,16);
 const getRowHeight=()=>typeof rowHeight==='function'?rowHeight():rowHeight;
 const cancel=typeof window.cancelAnimationFrame==='function'?id=>window.cancelAnimationFrame(id):id=>clearTimeout(id);
 function paint(force=false){
  if(disposed||!container.clientHeight)return;
  const cols=Math.max(1,Math.floor(columns())||1),rowHeight=getRowHeight(),height=container.clientHeight;
  const totalRows=Math.ceil(items.length/cols),limit=Math.max(0,totalRows*rowHeight-height);
  const reflow=cols!==previousColumns||(previousHeight>0&&previousHeight!==rowHeight);
  const scroll=container.scrollTop||0,oldHeight=previousHeight||rowHeight;
  const anchor=Math.floor(scroll/oldHeight)*previousColumns;
  const wanted=pendingReset?0:Math.max(0,Math.min(limit,reflow?Math.floor(anchor/cols)*rowHeight:scroll));
  const from=Math.max(0,Math.floor(wanted/rowHeight)-overscan),to=Math.min(totalRows,from+Math.ceil(height/rowHeight)+overscan*2);
  if(!force&&!pendingReset&&!reflow&&from===start&&to===end)return;
  start=from;end=to;previousColumns=cols;previousHeight=rowHeight;pendingReset=false;
  const visible=items.slice(from*cols,Math.min(items.length,to*cols));
  const wantedKeys=new Set(visible.map(keyOf));
  for(const [key,row] of mountedRows)if(!wantedKeys.has(key)){row.remove();mountedRows.delete(key);}
  top.style.height=(from*rowHeight)+'px';bottom.style.height=(Math.max(0,totalRows-to)*rowHeight)+'px';
  rows.style.display=cols>1?'grid':'block';
  rows.style.gridTemplateColumns=cols>1?'repeat('+cols+',minmax(0,1fr))':'';
  if(!items.length){if(!emptyNode)emptyNode=ui.el('p',emptyText,rows,'ness-note');}
  else{
   emptyNode?.remove();emptyNode=null;
   for(const [position,item] of visible.entries()){
    const key=keyOf(item);let row=mountedRows.get(key),fresh=!row;
    if(fresh){row=renderRow(item);mountedRows.set(key,row);}
    if(rows.children[position]!==row)rows.insertBefore(row,rows.children[position]||null);
    updateRow(row,item);if(fresh)mountRow(row,item);
   }
  }
  container.scrollTop=wanted;
 }
 function refresh(force=false){if(disposed)return;forceNext=forceNext||force;if(frame!==null)return;frame=request(()=>{frame=null;const rebuild=forceNext;forceNext=false;paint(rebuild);});}
 container.onscroll=()=>refresh();
 const Observer=window.ResizeObserver;const observer=Observer?new Observer(()=>refresh()):null;observer?.observe(container);
 return {setItems(value,{reset=false}={}){items=value;pendingReset=pendingReset||reset;if(!container.clientHeight){start=-1;end=-1;return;}paint(true);},refresh,dispose(){disposed=true;if(frame!==null)cancel(frame);observer?.disconnect();container.onscroll=null;},get renderedCount(){return rows.children.length;}};
}

// Module: cast_picker
function createChatCastPicker(D,entries,initialIds,selectedIds,persist,organizer={}){
 const ui=createUiKit(D),{el}=ui,norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();
 const library=new Map(entries),valid=values=>[...new Set(values)].filter(id=>library.has(id));
 const index=entries.map(([id,entry])=>({id,entry,search:norm([id,entry.name,...(entry.aliases||[])].join('\n'))}));
 const tags=new Map((organizer.tags||[]).map((tag,i)=>[tag.id,{...tag,order:i}])),colors=new Map();
 for(const [id]of entries){let first;for(const tagId of organizer.characters?.[id]?.tagIds||[]){const tag=tags.get(tagId);if(tag&&(!first||tag.order<first.order))first=tag;}if(first)colors.set(id,first.color);}
 let ids=valid(initialIds),selected=new Set(selectedIds),busy=false,pending=Promise.resolve(),disposed=false,timer=null;
 const checks=[],element=el('fieldset',undefined,undefined,'ness-cast');el('legend','Персонажи этого чата',element);ui.note(element,'Отметь тех, кто присутствует в сцене.');
 const current=el('div',undefined,element,'ness-chips'),addBox=ui.section(element,'+ Добавить из библиотеки'),search=ui.input('','search');search.placeholder='Найти по имени или псевдониму';search.setAttribute('aria-label','Поиск персонажа в библиотеке');addBox.appendChild(search);
 const count=ui.note(addBox,''),results=el('div',undefined,addBox,'ness-results'),error=el('p','',element,'ness-error');
 const list=createVirtualList(D,results,({id,entry})=>{const b=ui.button('+ '+String(entry.name||id),undefined,()=>update([...ids,id],id));b.disabled=busy;if(colors.has(id))b.style.borderLeft='5px solid '+colors.get(id);b.className+=' ness-cast-result';return b;},{rowHeight:44,overscan:4,emptyText:'Нет подходящих персонажей.',updateRow:node=>{node.disabled=busy;}});
 function syncChecks(){for(const {id,cb}of checks){if(cb.checked)selected.add(id);else selected.delete(id);}}
 function renderResults(reset=false){
  if(disposed)return;if(timer!==null){clearTimeout(timer);timer=null;}
  if(!addBox.open)return;
  const roster=new Set(ids),query=norm(search.value),available=index.filter(item=>!roster.has(item.id)&&(!query||item.search.includes(query)));
  count.textContent=available.length?'Найдено: '+available.length:'Нет подходящих персонажей.';list.setItems(available,{reset});
 }
 function render(){
  if(disposed)return;const viewport=element.closest?.('[data-review-scroll]'),top=viewport?.scrollTop;
  const existing=new Map(checks.map(check=>[check.id,check]));checks.length=0;
  if(ids.length)current.querySelector('.ness-note')?.remove();
  else if(!current.querySelector('.ness-note'))ui.note(current,'Список пуст. Добавь нужных персонажей из библиотеки.');
  for(const id of ids){const old=existing.get(id);if(old){old.cb.checked=selected.has(id);old.cb.disabled=busy;old.remove.disabled=busy;if(current.children[checks.length]!==old.row)current.insertBefore(old.row,current.children[checks.length]||null);checks.push(old);existing.delete(id);continue;}
   const entry=library.get(id),row=el('div',undefined,undefined,'ness-chip');if(colors.has(id))row.style.borderLeft='5px solid '+colors.get(id);
   const label=el('label',undefined,row),cb=el('input',undefined,label);cb.type='checkbox';cb.checked=selected.has(id);cb.disabled=busy;el('span',String(entry.name||id),label);label.title='Включить '+String(entry.name||id)+' в текущую иллюстрацию. Внешность передаётся только отмеченным персонажам.';
   const remove=ui.button('×',row,()=>update(ids.filter(x=>x!==id)), 'icon quiet');remove.title='Убрать из списка этого чата';remove.setAttribute('aria-label','Убрать '+String(entry.name||id)+' из списка чата');remove.disabled=busy;current.insertBefore(row,current.children[checks.length]||null);checks.push({id,cb,row,remove});
  }
  for(const old of existing.values())old.row.remove();
  renderResults();if(viewport)viewport.scrollTop=top;
 }
 function update(next,added){
  if(disposed||busy)return pending;syncChecks();const previous=ids.slice(),previousSelected=new Set(selected);ids=valid(next);if(added)selected.add(added);const roster=new Set(ids);selected=new Set([...selected].filter(id=>roster.has(id)));
  busy=true;error.textContent='';render();pending=(async()=>{
   let failed=false;
   try{await persist(ids.slice());}
   catch(e){failed=true;ids=previous;selected=previousSelected;if(!disposed)error.textContent='Список не сохранился: '+String(e?.message||e);}
   finally{
    busy=false;
    if(!disposed){
     if(failed)render();
     else{
      // Successful persistence changes only disabled controls, not the roster DOM.
      for(const {cb} of checks)cb.disabled=false;
      for(const item of current.querySelectorAll('button'))item.disabled=false;
      for(const item of results.querySelectorAll('button'))item.disabled=false;
      list.refresh();
     }
    }
   }
  })();return pending;
 }
 addBox.ontoggle=()=>renderResults();search.oninput=()=>{if(timer!==null)clearTimeout(timer);timer=setTimeout(()=>renderResults(true),140);};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();renderResults(true);}};
 update(ids);
 return {element,checks,flush:()=>pending,dispose(){disposed=true;if(timer!==null)clearTimeout(timer);addBox.ontoggle=null;search.oninput=null;list.dispose();},get rosterIds(){return ids.slice();}};
}

// The previous release offered this in-place save choice at both interruption points.
// Keep it inside the current modal so there is no additional focus trap.
function confirmKeepingDraft(panel, actions, what='черновик') {
 return new Promise(resolve=>{
  actions.hidden=true;
  const box=document.createElement('div');box.className='ness-save-confirm';
  const title=document.createElement('strong');title.textContent='Сохранить '+what+' до возвращения?';
  const note=document.createElement('p');note.textContent='Черновик привязан к этому посту. Новая генерация на другом посте удалит его.';
  const buttons=document.createElement('div');buttons.className='ness-save-confirm-actions';
  let settled=false;
  function choose(label,value) {
   const b=document.createElement('button');b.type='button';b.className='ness-button';b.textContent=label;
   b.onclick=()=>{if(settled)return;settled=true;box.remove();actions.hidden=false;resolve(value);};
   buttons.append(b);
  }
  choose('Сохранить',true);choose('Не сохранять',false);choose('Назад',null);
  box.append(title,note,buttons);panel.append(box);
 });
}
function activePostIndex(ctx) {
 const selected=nessGenerationTargets.get(ctx.chat);
 return selected&&selected.chatId===ctx.chatId&&ctx.chat?.[selected.index]===selected.message?selected.index:-1;
}
function parserDraftFromVariables(v) {
 return {
  parsedScene:String(v.sp_imagen_parsed_scene||''),
  rpOutfits:String(v.sp_imagen_rp_outfits||''),
  parserWarning:String(v.sp_imagen_parser_warning||''),
  npcDraft:String(v.sp_imagen_npc_draft||''),
  npcStatus:String(v.sp_imagen_npc_status||''),
  sourceCount:String(v.sp_imagen_rp_source_count||'')
 };
}
function restoreParserToVariables(v,draft){
 const parsed=draft?.parser||{};
 v.sp_imagen_parsed_scene=String(parsed.parsedScene||'');
 v.sp_imagen_rp_outfits=String(parsed.rpOutfits||'');
 v.sp_imagen_parser_warning=String(parsed.parserWarning||'');
 v.sp_imagen_npc_draft=String(parsed.npcDraft||'');
 v.sp_imagen_npc_status=String(parsed.npcStatus||'');
 v.sp_imagen_rp_source_count=String(parsed.sourceCount||'');
 v.sp_imagen_active_kind=draft.kind;
 v.sp_imagen_page_text_enabled=pageTextEnabled(draft.kind,draft.includeText);
 v.sp_imagen_manual_mode=draft.review?.manualMode===true;
 v.sp_imagen_preview_status='cancelled';
 v.sp_imagen_run_ticket='';
 v.sp_imagen_prepared_ticket='';
 v.sp_imagen_structured_library='';
 v.sp_imagen_resume_review=draft.review||null;
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
 const cancel=ui.button('Отмена',actions),send=ui.button('Отправить в NAI5',actions,undefined,'primary');
 cancel.setAttribute('data-preview-cancel','');send.setAttribute('data-preview-send','');
 field.value=config.prompt;const updateCount=()=>{counter.textContent=field.value.length.toLocaleString('ru-RU')+' / 45 000 знаков';};
 const previousFocus=document.activeElement;
 let onChatSwitch=()=>{},editTimer=null,closed=false,asking=false;
 const saveEdit=()=>{
  if(editTimer!==null){clearTimeout(editTimer);editTimer=null;}
  const now=SillyTavern.getContext(),edited=field.value.trim();
  if(!closed&&edited&&edited.length<=45000&&now.chat===origin.chat&&now.chatId===origin.id&&now.chat[origin.index])
   savePostDraft(now,origin.index,{kind:origin.kind,stage:'prompt',final:{config:JSON.parse(JSON.stringify({...config,prompt:edited}))}});
 };
 field.oninput=()=>{updateCount();if(editTimer!==null)clearTimeout(editTimer);editTimer=setTimeout(saveEdit,650);};
 window.addEventListener('pagehide',saveEdit);
 updateCount();
 const cleanupViewport=mountDialog(overlay,()=>onChatSwitch());
 return await new Promise(resolve=>{
  const close=result=>{
   if(closed)return;closed=true;
   document.removeEventListener('keydown',onKey,true);
   window.removeEventListener('pagehide',saveEdit);
   if(editTimer!==null)clearTimeout(editTimer);
   cleanupViewport();overlay.remove();previousFocus?.focus?.();resolve(result);
  };
  onChatSwitch=()=>close(false);
  const askCancel=async()=>{
   if(closed||asking)return;asking=true;
   try{
    const keep=await confirmKeepingDraft(panel,actions,'готовый промпт');
    if(keep===null)return;
    const now=SillyTavern.getContext();
    if(now.chat===origin.chat&&now.chatId===origin.id&&now.chat[origin.index]){
     if(keep){
      const edited=field.value.trim();
      if(!edited||edited.length>45000){
       error.textContent='Сохраняемый промпт должен содержать от 1 до 45 000 символов.';
       error.style.display='block';return;
      }
      config.prompt=edited;
      savePostDraft(now,origin.index,{kind:origin.kind,stage:'prompt',final:{config:JSON.parse(JSON.stringify(config))}});
     }else discardPostDraft(now,origin.index);
    }
    close(false);
   }finally{asking=false;}
  };
  const onKey=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();void askCancel();}};
  document.addEventListener('keydown',onKey,true);
  cancel.onclick=()=>void askCancel();
  panel.querySelector('.ness-close-dialog').onclick=()=>cancel.click();
  overlay.onclick=e=>{if(e.target===overlay)void askCancel();};
  send.onclick=()=>{
   if(closed||asking)return;
   error.style.display='none';
   const now=SillyTavern.getContext();
   if(now.chat!==origin.chat||now.chatId!==origin.id||now.chat.length!==origin.count||now.chat[origin.index]!==origin.message){error.textContent='Чат или целевой пост изменился. Отмени отправку и запусти профиль заново.';error.style.display='block';return;}
   const edited=field.value.trim();
   if(!edited||edited.length>45000){error.textContent=!edited?'Промпт не может быть пустым.':'Промпт длиннее 45 000 символов.';error.style.display='block';return;}
   try{validateImagePromptLayout(edited,validateKind(origin.kind));}
   catch(layoutError){error.textContent=String(layoutError?.message||layoutError);error.style.display='block';return;}
   config.prompt=edited;
   savePostDraft(now,origin.index,{kind:origin.kind,stage:'prompt',final:{config:JSON.parse(JSON.stringify(config))}});
   close(true);
  };
 });
}

// Module: review_view
function createReviewView({kind,manualMode,postCount}){
 const ui=createUiKit(document),{el,area,button,note}=ui,{overlay,panel}=createDialogShell('review');
 const names={snapshot:'Snapshot · один кадр',comic:'Comic · комикс',story_page:'Story Page · история'},base=validateKind(kind);
 names[kind] ||= getExtension?.()?.getGenerationProfileLabel?.(kind)||kind;
 createNessHeader(document,panel,manualMode?'Своя сцена':'Перед созданием иллюстрации',manualMode?'Опиши сцену и проверь детали.':'Посты → детали сцены → задание для картинки',manualMode?'Ручной ввод':names[kind]||names.snapshot);
 const scroll=el('div',undefined,panel);scroll.setAttribute('data-review-scroll','');
 const warning=el('p','',scroll,'ness-warning');warning.setAttribute('data-warning','');warning.style.display='none';
 const layout=el('div',undefined,scroll,'ness-scene-layout'),main=el('div',undefined,layout,'ness-scene-main'),side=el('aside',undefined,layout,'ness-scene-side');
 function card(parent,title,type){const box=el('details',undefined,parent,'ness-scene-card ness-scene-'+type);box.open=true;el('summary',title,box);return box;}
 const context=card(main,manualMode?'01 · ✎ Описание сцены':'01 · ▤ Посты для режиссёра','context');
 el('p',manualMode?'Ручной ввод':'Постов: '+String(postCount)+' · '+(base==='story_page'?'последовательность событий':'текущая сцена'),context,'ness-scene-meta');
 const sceneEl=area('');sceneEl.setAttribute('data-scene','');sceneEl.setAttribute('aria-label',manualMode?'Описание сцены':'Исходные RP-посты');ui.field(context,manualMode?'Описание сцены':'Исходные RP-посты',sceneEl);
 const wardrobe=card(main,'02 · ◇ Одежда и открытые участки тела','wardrobe'),wardrobeInfo=note(wardrobe,'');wardrobeInfo.setAttribute('data-wardrobe-info','');
 const outfEl=area('');outfEl.setAttribute('data-outfits','');outfEl.setAttribute('aria-label','Гардероб персонажей');outfEl.placeholder='Имя_outfit: одежда, открытые участки тела';ui.field(wardrobe,'Гардероб персонажей',outfEl);
 const composition=card(main,base==='story_page'?'03 · ◈ Ритм и композиция страницы':'03 · ◈ Композиция','composition'),compControls=el('div',undefined,composition),compEl=area('');compEl.setAttribute('data-composition','');compEl.setAttribute('aria-label','Пожелания к композиции');ui.field(composition,'Пожелания к композиции',compEl);
 const castSlot=card(side,'♙ Участники сцены','cast'),npcSlot=card(side,'＋ Дополнительные участники · NPC','npc');
 const actions=el('footer',undefined,panel);actions.setAttribute('data-review-actions','');
 const errEl=el('p','',actions,'ness-error');errEl.setAttribute('data-error','');errEl.style.display='none';
 const cancel=button('Отмена',actions),next=button('Дальше →',actions,undefined,'primary');cancel.setAttribute('data-cancel','');next.setAttribute('data-next','');
 return {...ui,overlay,panel,sceneEl,outfEl,compEl,errEl,cancel,next,castSlot,npcSlot,compControls};
}

// Module: settings_dialog
async function openSettings(){
 if(typeof document==='undefined')throw Error('Настройки доступны только внутри SillyTavern.');
 if(document.querySelector('#sp-imagen-review-overlay'))throw Error('Сначала закрой уже открытое окно.');
 const st=SillyTavern.getContext();
 if(!st?.chatMetadata)throw Error('Открой чат, чтобы настроить генерацию.');
 const startChat=st.chat,startId=st.chatId,ui=createUiKit(document),{overlay,panel}=createDialogShell('settings');
 createNessHeader(document,panel,'Настройки генерации','Как SP Imagen собирает описание картинки','SP Imagen');
 const scroll=ui.el('div',undefined,panel);scroll.setAttribute('data-review-scroll','');
 const transferBar=ui.el('div',undefined,scroll,'ness-settings-transferbar');
 const importSettings=ui.button('↥ Импорт настроек',transferBar),exportSettings=ui.button('↧ Экспорт настроек',transferBar);
 const settingsMount=ui.el('div',undefined,scroll);
 const actions=ui.el('footer',undefined,panel);actions.setAttribute('data-review-actions','');
 const message=ui.el('p','',actions,'ness-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const close=ui.button(spImagenExtension().hubChildOpen?'← Назад':'Закрыть',actions),save=ui.button('Сохранить настройки',actions,undefined,'primary');
 let dirty=false,busy=false,done=false,discardAsked=false,transferClose=null;
 const markDirty=()=>{dirty=true;discardAsked=false;message.textContent='Не сохранено';};
 let form=createGen2SettingsPanel(document,loadGen2Settings(),st.chatMetadata.variables?.sp_imagen_skip_prompt_preview,markDirty);
 settingsMount.appendChild(form.element);message.textContent=gen2SettingsWarnings.get(st.chat)||'Применяются при следующей генерации';
 const isCurrent=()=>{const now=SillyTavern.getContext();return now.chat===startChat&&now.chatId===startId;};
 const openTransfer=mode=>{
  if(busy||done||transferClose)return;
  try{
   if(!isCurrent())throw Error('Чат изменился. Открой настройки заново.');
   const profile=mode==='export'?makeNessSettingsProfile(form.getValue()):null;
   transferClose=openNessSettingsTransfer(document,panel,{mode,profile,isCurrent,onClose:()=>{transferClose=null;},onApply:settings=>{
    const scope=form.scope.value,next=createGen2SettingsPanel(document,settings,undefined,markDirty);next.scope.value=scope;
    const top=scroll.scrollTop,left=scroll.scrollLeft;
    form.dispose();form.element.remove();form=next;settingsMount.appendChild(form.element);markDirty();
    scroll.scrollTop=top;scroll.scrollLeft=left;
    message.textContent='Настройки загружены в окно. Проверь значения и «Сохранить для», затем нажми «Сохранить настройки».';
   }});
  }catch(e){message.textContent='Не удалось открыть '+(mode==='export'?'экспорт':'импорт')+': '+String(e.message||e);}
 };
 importSettings.onclick=()=>openTransfer('import');exportSettings.onclick=()=>openTransfer('export');
 const setBusy=value=>{busy=value;for(const tag of ['input','textarea','select','button'])for(const node of panel.querySelectorAll(tag))node.disabled=value;};
 let onChatSwitch=()=>{};
 const previousFocus=document.activeElement,stopViewport=mountDialog(overlay,()=>onChatSwitch());
 return await new Promise(resolve=>{
  const finish=()=>{if(done)return;done=true;transferClose?.();form.dispose();document.removeEventListener('keydown',onKey,true);stopViewport();overlay.remove();previousFocus?.focus?.();resolve('Настройки закрыты');};
  onChatSwitch=()=>finish(); // Never leave an old settings pane over a different chat.
  close.onclick=()=>{if(busy)return;if(dirty&&!discardAsked){discardAsked=true;message.textContent='Сохрани изменения или нажми «Закрыть» ещё раз, чтобы отменить их.';return;}finish();};
  panel.querySelector('.ness-close-dialog').onclick=()=>close.click();
  const onKey=e=>{if(panel.querySelector('[data-ness-child-dialog]'))return;if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.onclick();}};
  document.addEventListener('keydown',onKey,true);
  save.onclick=async()=>{
   if(busy||done)return;
   const now=SillyTavern.getContext();if(now.chat!==startChat||now.chatId!==startId){message.textContent='Чат изменился. Открой настройки заново.';return;}
   setBusy(true);
   try{await saveGen2Settings(form.getValue(),form.scope.value);dirty=false;discardAsked=false;message.textContent='Настройки сохранены';}
   catch(e){message.textContent='Не удалось сохранить: '+String(e?.message||e);}
   finally{setBusy(false);}
  };
 });
}

// Module: rp_cleanup
const RP_TEXT_ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const RP_VOID_TAGS=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RP_BLOCK_TAGS=new Set(['p','div','section','article','header','footer','aside','li','ul','ol','table','tr','h1','h2','h3','h4','h5','h6','blockquote','pre','br','hr']);
const RP_HIDDEN_TAGS=new Set(['script','style','template','noscript','head','iframe','object','svg','think','thinking','reasoning','analysis','reflection','naicom','image_lite','imagen_structured_test']);
function cleanRpVisualText(value,preferences={serviceTags:true,comments:true,html:true,mawsFooter:true}) {
 let text=String(value??'').replace(/\r\n?/g,'\n');
 // Recognize the MAWS-generated footer only with its metadata trailer and
 // a single plain summary paragraph, never arbitrary trailing RP prose.
 if(preferences.mawsFooter)for(const m of text.matchAll(/^[ \t]*⟦MAWS_(?:THOUGHT|MEM)[^\n]*?⟧/gm)){
  const tail=text.slice(m.index);
  if(!/<!--\s*(?:\[LOVE_SCORE\b|HT\s)/i.test(tail))continue;
  const summary=tail.replace(/<!--[\s\S]*?(?:-->|$)/g,'').replace(/⟦[^⟧]*⟧/g,'').replace(/<[^>]*>/g,'').trim();
  if(summary.length<=3000&&!/\n\s*\n/.test(summary)&&!/(?:^|\n)\s*(?:[*_>#«"]|[—–-]\s)/m.test(summary)){text=text.slice(0,m.index);break;}
 }
 if(preferences.comments)text=text.replace(/<!--[\s\S]*?(?:-->|$)/g,'');
 if(preferences.serviceTags){
 // Paired hidden service tags, followed by self-contained service records.
 text=text.replace(/⟦([A-Z][A-Z0-9_]*)(?::[^⟧]*)?⟧[\s\S]*?⟦\/\1⟧/gi,'');
 text=text.replace(/⟦[^⟧]*⟧/g,'');
 text=text.replace(/\[MAWS_RESULT:(?:(?!\[MAWS_)[^\]])+\]/g,'');
 text=text.replace(/\[[A-Z][A-Z0-9_]{1,50}(?::|\|)[^\]\n]*\]/g,'');
 text=text.replace(/(^|\n|[—–][ \t]*)\[[A-Z][A-Z0-9_]{1,30}\](?=[ \t]|$)/g,'$1');
 }
 if(!preferences.html)return normalizePhoneMessages(text.replace(/\n{3,}/g,'\n\n').trim());
 // Decode inert text first, then strip HTML without mounting DOM or executing it.
 text=text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,key)=>{
  if(key[0]!=='#')return RP_TEXT_ENTITIES[key.toLowerCase()]??all;
  const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
  return n>=0&&n<=0x10ffff?String.fromCodePoint(n):all;
 });
 const stack=[];let result='',offset=0;
 const hidden=()=>stack.length&&stack[stack.length-1].hidden;
 const tagPattern=/<\/?[A-Za-z][A-Za-z0-9_:-]*(?:"[^"]*"|'[^']*'|[^'">])*?>/g;
 for(const match of text.matchAll(tagPattern)){
  if(!hidden())result+=text.slice(offset,match.index);
  const token=match[0],parts=token.match(/^<(\/)?([A-Za-z][A-Za-z0-9_:-]*)([\s\S]*?)>$/),tag=parts[2].toLowerCase();
  if(parts[1]){
   let at=stack.length-1;while(at>=0&&stack[at].tag!==tag)at--;
   if(at>=0)stack.splice(at);
   if(!hidden()&&RP_BLOCK_TAGS.has(tag))result+='\n';
  }else{
   const attrs=Object.create(null);
   const attrPattern=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
   for(const a of parts[3].matchAll(attrPattern))attrs[a[1].toLowerCase()]=a[2]??a[3]??a[4]??'';
   const invisible=Boolean(hidden()||RP_HIDDEN_TAGS.has(tag)||tag.startsWith('maws_')||Object.hasOwn(attrs,'hidden')||attrs['aria-hidden']==='true'||/(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attrs.style||''));
   if(!invisible&&RP_BLOCK_TAGS.has(tag))result+='\n';
   if(!RP_VOID_TAGS.has(tag)&&!token.endsWith('/>'))stack.push({tag,hidden:invisible});
  }
  offset=match.index+token.length;
 }
 if(!hidden())result+=text.slice(offset);
 return normalizePhoneMessages(result.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim());
}

// Module: image_prompt
async function repairNpcPromptLanguage(kind,prompt,signal=null){
 const boundary=prompt.indexOf('\n\nText:');
 const description=boundary<0?prompt:prompt.slice(0,boundary);
 const lettering=boundary<0?'':prompt.slice(boundary);
 const protectedParts=[];
 let prefix='__NESS_KEEP_';
 while(description.includes(prefix))prefix+='_';
 const tokenPattern=new RegExp(prefix+'\\d+__','g');
 const masked=description.replace(/"(?:[^"\\]|\\.)*"|«[^»]*»|“[^”]*”|\[\[NESS_VIS:[^\]\r\n]+\]\]|\|/g,value=>{
  const token=prefix+protectedParts.length+'__';protectedParts.push({token,value});return token;
 });
 const hasCyrillic=text=>/\p{Script=Cyrillic}/u.test(text);
 if(!hasCyrillic(masked))return prompt;
 const translated=(await requestNessText(kind,[
  {role:'system',content:codePrompt('translate_cyrillic')},
  {role:'user',content:masked}
 ],signal)).trim();
 const tokens=translated.match(tokenPattern)||[];
 if(hasCyrillic(translated)||/[\r\n|]/.test(translated)||translated.startsWith('```')||tokens.length!==protectedParts.length||tokens.some((token,i)=>token!==protectedParts[i].token)){
  throw Error('Не удалось перевести описание NPC с сохранением структуры промпта. Запусти генерацию заново.');
 }
 let index=0;
 return translated.replace(tokenPattern,()=>protectedParts[index++].value)+lettering;
}

// Module: phone_text
function normalizePhoneMessages(text) {
 return String(text||'').replace(/^[ \t]*>[ \t]*(?:\*\*)?[ \t]*(\d{1,2}:\d{2})[ \t]*\\?\|[ \t]*(?:__)?([^:\n]+):(?:__)?(?:\*\*)?[ \t]*(.*)$/gm,(_,time,sender,message)=>{
  const name=sender.replace(/[_*]/g,'').trim();
  return 'Текст на экране телефона — '+name+', '+time+': '+message;
 });
}

// Module: npc_cards
function createNpcCards(D) {
 const ui=createUiKit(D);
 const element=D.createElement('div');element.className='ness-npc';
 const cards=[];
 const oneLine=s=>String(s||'').replace(/[\r\n]+/g,' ').trim();
 function add(name='',body='',open=false){
  const details=D.createElement('details');details.open=open;details.className='ness-section';
  const summary=D.createElement('summary');;
  const title=D.createElement('span');title.textContent=oneLine(name)||'Новый NPC';
  const remove=D.createElement('button');remove.type='button';remove.textContent='×';remove.title='Удалить этого NPC';remove.setAttribute('aria-label','Удалить этого NPC');remove.className='ness-button ness-icon ness-quiet';
  summary.append(title,remove);details.appendChild(summary);
  const nameInput=D.createElement('input');nameInput.type='text';nameInput.value=oneLine(name);nameInput.placeholder='Имя или роль NPC';nameInput.className='ness-input';
  const editor=D.createElement('textarea');editor.value=String(body||'').trim();editor.spellcheck=false;editor.placeholder='Appearance: внешность\nClothing: одежда';editor.className='ness-input ness-area';
  ui.field(details,'Имя или роль NPC',nameInput);ui.field(details,'Внешность и одежда NPC',editor);element.appendChild(details);
  const card={details,nameInput,editor};cards.push(card);
  nameInput.oninput=()=>{title.textContent=oneLine(nameInput.value)||'Новый NPC';};
  remove.onclick=e=>{e.preventDefault();e.stopPropagation();const index=cards.indexOf(card);if(index>=0)cards.splice(index,1);details.remove();};
  if(open)nameInput.focus();
  return card;
 }
 return {
  element,add,
  get value(){return cards.filter(c=>c.nameInput.value.trim()||c.editor.value.trim()).map(c=>'NPC: '+(oneLine(c.nameInput.value)||'NPC')+(c.editor.value.trim()?'\n'+c.editor.value.trim():'')).join('\n\n');},
  set value(text){
   for(const c of cards)c.details.remove();cards.length=0;
   const src=String(text||'').trim();if(!src)return;
   const matches=[...src.matchAll(/^NPC:\s*([^\r\n]*)\r?$/gm)];
   if(!matches.length){add('',src,false);return;}
   const prefix=src.slice(0,matches[0].index).trim();if(prefix)add('',prefix,false);
   matches.forEach((m,i)=>add(m[1],src.slice(m.index+m[0].length,i+1<matches.length?matches[i+1].index:src.length).trim(),false));
  }
 };
}

// Module: services
function validateKind(kind){
 const base=getExtension?.()?.getProfileBaseKind?.(kind)||(['snapshot','comic','story_page'].includes(kind)?kind:null);
 if(!['snapshot','comic','story_page'].includes(base))throw Error('Профиль «'+kind+'» не найден или удалён.');
 return base;
}
const NESS_TEXT_TIMEOUT_MS=180000;
const NESS_METADATA_TIMEOUT_MS=30000;
async function waitForNessOperation(run,timeoutMs,timeoutMessage,controller=null){
 return withOperationDeadline(run,timeoutMs,timeoutMessage,{controller,code:'NESS_TIMEOUT'});
}
function saveNessGenerationMetadata(st,stage){
 if(typeof st.saveMetadata!=='function')return;
 return waitForNessOperation(()=>st.saveMetadata(),NESS_METADATA_TIMEOUT_MS,'SillyTavern не подтвердил сохранение данных чата за 30 секунд ('+stage+'). Обнови страницу и повтори подготовку.');
}
function spImagenExtension(){
 const extension=getExtension?.();
 if(extension?.installed)return extension;
 throw Error('SP Imagen не инициализирован. Перезагрузи SillyTavern.');
}
function getNessDirector(kind,includeText=true){
 validateKind(kind);
 const director=spImagenExtension().getDirector?.(kind,{includeText});
 if(!director||typeof director.prompt!=='string'||!director.prompt.trim())throw Error('В SP Imagen не найден промпт '+kind+'.');
 return director;
}
async function requestNessText(kind,messages,externalSignal=null){
 validateKind(kind);
 const extension=spImagenExtension();
 if(typeof extension.generateText!=='function')throw Error('SP Imagen не загрузил текстовый API.');
 const controller=new AbortController();
 const externalAbort=()=>controller.abort(externalSignal?.reason || new Error('Генерация остановлена пользователем.'));
 if(externalSignal?.aborted)externalAbort();
 else externalSignal?.addEventListener('abort',externalAbort,{once:true});
 const origin=SillyTavern.getContext(),chat=origin.chat,chatId=origin.chatId;
 const event=origin.event_types?.CHAT_CHANGED;
 const changed=()=>{
  const now=SillyTavern.getContext();
  if(now.chat!==chat||now.chatId!==chatId)controller.abort(new Error('Чат изменился. Запрос отменён.'));
 };
 if(event)origin.eventSource?.on?.(event,changed);
 try{
  const response=await waitForNessOperation(
   ()=>extension.generateText(kind,messages,controller.signal),
   NESS_TEXT_TIMEOUT_MS,
   'Текстовая модель не ответила за 3 минуты. Проверь подключение в SP Imagen → Текстовая модель.',
   controller
  );
  changed();
  if(controller.signal.aborted)throw new Error('Чат изменился. Запрос отменён.');
  if(typeof response!=='string'||!response.trim())throw Error('Текстовая модель вернула пустой ответ.');
  return response;
 }catch(cause){
  if(cause?.code==='NESS_TIMEOUT')throw cause;
  if(externalSignal?.aborted)throw new Error('Генерация остановлена пользователем.',{cause});
  if(controller.signal.aborted)throw new Error('Запрос SP Imagen отменён из-за тайм-аута или смены чата.',{cause});
  throw new Error('Запрос к текстовой модели завершился ошибкой: '+String(cause?.message||cause),{cause});
 }finally{
  if(event)origin.eventSource?.removeListener?.(event,changed);
  externalSignal?.removeEventListener('abort',externalAbort);
 }
}
async function lastRpIndex(chat){
 if(SillyTavern.getContext().chat!==chat)throw Error('Чат изменился');
 // Find one drawable RP post without doing the complete, historical wardrobe scan again.
 const settings=loadGen2Settings();
 for(let index=chat.length-1;index>=0;index--){
  const raw=getCarrierRpText(chat[index],Boolean(settings.cleanup.exceptions?.length));
  if(!raw)continue;
  let body=raw;
  if(mayContainWardrobe(raw,settings.wardrobe)){
   try{body=(await readConfiguredWardrobe(raw,settings.wardrobe)).text;}
   catch{body=stripWardrobeTags(raw);}
  }else body=stripWardrobeTags(raw);
  let clean='';
  try{clean=await cleanConfiguredRp(body,settings);}
  catch{clean=cleanRpVisualText(body);}
  if(clean)return index;
 }
 return -1;
}
// Locks belong to this extension instance only, never to window or another script.
const generationLocks=new WeakSet();
const preparationLocks=new WeakSet();
const reviewLocks=new WeakSet();
const npcJobs=new WeakMap();

// Module: rp_source
function stripWardrobeTags(text) {
    return String(text || '')
      .replace(/⟦ГАРДЕРОБ⟧[\s\S]*?⟦\/ГАРДЕРОБ⟧/gi, ' ')
      .replace(/⟦ОДЕЖДА:[^⟧]+⟧[^\n\r]*/gi, ' ')
      .replace(/⟦\/ГАРДЕРОБ⟧/gi, ' ')
      .replace(/⟦СЦЕНА⟧/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  function getCarrierRpText(m,preserveHidden=false) {
    if (!m || m.is_system) return '';
    if (m.name === 'GlassPhone' || m.extra?.model === 'GlassPhone' || m.extra?.isSmsSilent === true) return '';
    const raw = String(m.mes ?? '');
    if (!raw.trim()) return '';
    if (/^\s*<!--\s*tel:log\s*-->/i.test(raw)) return '';
    if (/^\s*\[Событие мира\s*[—–-]\s*(?:соцсети|телефон)/i.test(raw)) return '';
    let text = preserveHidden?raw:raw.replace(/<(think|thinking|reasoning|analysis|reflection)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--\s*tel:[\s\S]*?-->/gi, '');
    text=text
      .replace(/<div\b(?=[^>]*\bsp-imagen-inline\b)[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<naicom\b[^>]*>[\s\S]*?<\/naicom>/gi, '')
      .replace(/<image_lite\b[^>]*>[\s\S]*?<\/image_lite>/gi, '')
      .replace(/<imagen_structured_test\b[^>]*>[\s\S]*?<\/imagen_structured_test>/gi, '')
      .trim();
    if (!text || /data-iig-instruction\s*=|\[IMG:GEN\]/i.test(text)) return '';
    if (/^\[(?:СМС|SMS|Голосовое|Voice)\s*(?:→|в\s+чат|to\s+chat)/i.test(text)) return '';
    if (/^\[Событие мира\s*[—–-]\s*(?:соцсети|телефон)/i.test(text)) return '';
    return text;
  }
  function getVisibleRpText(m) {
    return cleanRpVisualText(stripWardrobeTags(getCarrierRpText(m)));
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
  if(entry.appearanceFormat!==undefined&&!['tags','prose'].includes(entry.appearanceFormat))throw Error('Неверный формат описания внешности для '+id);
  if(Object.hasOwn(entry,'appearanceRanges')){
   const ranges=normalizeAppearanceRanges(entry.base,entry.appearanceRanges);
   if(ranges.length)entry.appearanceRanges=ranges;else delete entry.appearanceRanges;
  }
  if(Object.hasOwn(entry,'appearanceSelections'))entry.appearanceSelections=normalizeAppearanceSelections(entry.base,entry.appearanceSelections);
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
function masterLibraryRaw(){return libraryStore?libraryStore.raw:(SillyTavern.getContext()?.extensionSettings?.variables?.global?.[MASTER_LIBRARY_KEY]??'');}
function loadMasterLibrary(){
 const raw=masterLibraryRaw();
 if(!raw)return validateMasterLibrary({version:1,personas:{},characters:{}});
 try{return typeof raw==='string'?validateMasterLibrary(JSON.parse(raw),{copy:false}):validateMasterLibrary(raw);}catch(e){throw Error('Не удалось прочитать библиотеку: '+String(e?.message||e));}
}

// Module: prepare_rp
const nessGenerationTargets=new WeakMap();
async function prepareRp(kind,targetIndex=null,includeText=true){
await libraryStore?.refresh();
validateKind(kind);
includeText=pageTextEnabled(kind,includeText);

  const st = SillyTavern.getContext();
  if (!st?.chatMetadata||!Array.isArray(st.chat)) throw new Error('SillyTavern chat context недоступен');
  const chat=st.chat,id=st.chatId;
  if(targetIndex!==null&&(!Number.isInteger(targetIndex)||!getCarrierRpText(chat[targetIndex])))throw Error("Выбери настоящий RP-пост.");
  if(preparationLocks.has(chat)||generationLocks.has(chat))throw Error('Подготовка или генерация уже выполняется.');
  if(typeof document!=='undefined'&&document.querySelector('#sp-imagen-review-overlay'))throw Error('Сначала закрой открытое окно.');
  preparationLocks.add(chat);try{
  const v = st.chatMetadata.variables ||= {};
  v.sp_imagen_preview_status = 'cancelled';
  v.sp_imagen_run_ticket = '';
  v.sp_imagen_prepared_ticket = '';
  v.sp_imagen_structured_library = '';
  v.sp_imagen_parsed_scene = '';
  v.sp_imagen_composition_proposal = '';
  v.sp_imagen_rp_outfits = '';
  v.sp_imagen_parser_warning = '';
  delete v.sp_imagen_resume_review;

  if(targetIndex===null)nessGenerationTargets.delete(chat);
  else nessGenerationTargets.set(chat,{index:targetIndex,message:chat[targetIndex],text:chat[targetIndex].mes,chatId:id});
  const base=validateKind(kind),profile=getExtension?.()?.getActiveProfile?.(kind)||null;
  const userSettings=loadGen2Settings();
  const options={...userSettings,posts:{...userSettings.posts,[base]:profile?.parser?.posts||userSettings.posts[base]}};
  const collected=await collectConfiguredRp(base,userSettings.wardrobe,options,targetIndex);
  if(SillyTavern.getContext().chat!==chat||SillyTavern.getContext().chatId!==id)throw Error('Чат изменился во время подготовки.');
  const recent=collected.recent;
  if(!recent.length)throw Error('Нет настоящих RP-постов');
  v.sp_imagen_parser_warning=[collected.warning,gen2SettingsWarnings.get(chat)].filter(Boolean).join(' | ');
  v.sp_imagen_rp_outfits=[...collected.wardrobe].map(([name,wear])=>name+'_outfit: '+wear).join('\n');
  v.sp_imagen_parsed_scene=formatConfiguredPosts(recent);
  v.sp_imagen_active_kind=kind;
  v.sp_imagen_page_text_enabled=includeText;
  // NPC-only helper: independent of the unchanged RP/wardrobe preparation.
  v.sp_imagen_npc_request_scene=v.sp_imagen_parsed_scene;
  v.sp_imagen_tracker_npcs='';
  // NPC discovery is an optional, explicitly labeled button in the review window.
  // Do not launch an extra LLM request for every ordinary image generation.
  v.sp_imagen_npc_draft='';
  v.sp_imagen_npc_status='NPC не подбирались автоматически. Можно добавить вручную или нажать «Предложить NPC по постам».';

  if(SillyTavern.getContext().chat!==chat||SillyTavern.getContext().chatId!==id)throw Error('Чат изменился во время подготовки.');
  v.sp_imagen_rp_source_count=String(recent.length);
  // Store the processed scene before opening the review window; no extra LLM call.
  if(targetIndex!==null){
   rememberPostPrompts(st,targetIndex,{kind,parsedScene:v.sp_imagen_parsed_scene,directorRaw:'',finalPrompt:''},{reset:true});
   savePostDraft(st,targetIndex,{
    kind,includeText,stage:'parsed',parser:parserDraftFromVariables(v)
   },{replace:true});
  }
  if(typeof st.saveMetadata==='function')await st.saveMetadata();
  return 'RP-постов подготовлено: '+recent.length;
  }finally{preparationLocks.delete(chat);}

}

// Module: composition_catalog
function loadCompositionSettings(){
// Composition library: 38 categories per profile. Comic/Story Page share one catalogue.
const COMIC_TECHNIQUES={
  "Peace / Serenity": "Horizontal composition, balanced symmetry, panoramic framing; high-key lighting, soft diffused daylight; wide borderless panels, aspect-to-aspect transitions.",
  "Cozy Domesticity / Safety": "Intimate medium shots, triangular composition, foreground framing; warm practical lighting, soft falloff; gentle close-ups, environmental detail panels.",
  "Tenderness / Emotional Intimacy": "Intimate two-shots, eye-level close-ups, shallow depth of field; soft wraparound lighting, subtle bounced light; moment-to-moment transitions, delicate gesture close-ups.",
  "Romance / Attraction": "S-curve composition, visual convergence, selective focus; golden-hour backlighting, luminous rim light; alternating close-ups, lingering reaction panels.",
  "Flirtation / Romantic Tension": "Asymmetrical framing, over-the-shoulder shots, expressive eyelines; soft side lighting, selective highlights; shot/reverse-shot, intimate detail panels, delayed reactions.",
  "Joy / Celebration": "Open composition, radial balance, expressive silhouettes; high-key lighting, luminous highlights; expanded emotional panels, energetic transitions.",
  "Playfulness / Mischief": "Dynamic diagonals, exaggerated perspective, lively asymmetry; bright motivated lighting, dappled light; irregular panels, overlapping compositions, comedic reaction beats.",
  "Awkwardness / Embarrassment": "Deliberate static framing, awkward negative space, off-center subjects; understated natural lighting; repeated panels, silent beats, restrained close-ups.",
  "Hope / Relief": "Opening composition, upward leading lines, expanding spatial framing; emerging sunlight, gentle backlighting; gradual transition toward larger, more spacious panels.",
  "Wonder / Discovery": "Extreme wide shots, monumental scale contrast, worm's-eye perspective; volumetric lighting, radiant focal points; splash panels, panoramic reveals.",
  "Melancholy / Quiet Sadness": "Restrained asymmetry, negative space, distant framing; overcast lighting, subdued tonal contrast; silent panels, environmental storytelling.",
  "Loneliness / Isolation": "Extreme negative space, architectural framing, isolated silhouettes; distant practical lights, cool ambient lighting; wide empty panels, pronounced gutters.",
  "Nostalgia / Longing": "Layered depth, reflections, frame-within-frame; golden-hour haze, soft backlight; visual match cuts, memory-associated details.",
  "Grief / Loss": "Static wide shots, diminished subject scale, restrained close-ups; muted low-key lighting; decompressed pacing, repeated panels, silent environmental details.",
  "Separation / Heartbreak": "Divided compositions, opposing eyelines, spatial barriers; split pools of light, warm-cool contrast; parallel panels, mirrored framing.",
  "Vulnerability / Confession": "Eye-level close-ups, intimate two-shots, delicate framing; soft window light, gentle Rembrandt lighting; moment-to-moment reactions, subtle facial changes.",
  "Shame / Guilt": "High-angle shots, enclosed framing, downward eyelines; subdued top lighting, partial facial shadows; narrow panels, isolated close-ups.",
  "Exhaustion / Emotional Numbness": "Static composition, horizontal body lines, subdued visual hierarchy; flat overcast lighting, faint practical illumination; prolonged repeated frames.",
  "Anxious Anticipation": "Off-center framing, directional negative space, foreground occlusion; low-key lighting, isolated practical sources; narrow panels, suspenseful pacing.",
  "Panic / Loss of Control": "Dutch angle, unstable diagonals, extreme perspective, tight cropping; harsh directional lighting, fragmented chiaroscuro; angular panels, rapid close-ups.",
  "Paranoia / Surveillance": "Voyeuristic framing, obstructed foregrounds, deep staging; silhouettes, narrow pools of light; repeated surveillance-like panels, concealed visual information.",
  "Ominous Stillness / Hidden Threat": "Rigid symmetry, centered composition, unsettling static framing; hard single-source lighting, tenebrism; regular grids, slow visual progression.",
  "Fear / Psychological Horror": "Off-screen space, uncomfortable cropping, obscured silhouettes; tenebrism, motivated underlighting, deep enveloping shadows; empty panels, gradual reveals.",
  "Shock / Sudden Revelation": "Abrupt extreme close-ups, dramatic scale shifts, visual contrast; stark chiaroscuro, sudden hard illumination; oversized impact panels, abrupt pacing changes.",
  "Claustrophobia / Entrapment": "Tight framing, compressed spatial layers, enclosing architecture; narrow overhead lighting, dense shadows; narrow vertical panels, compressed gutters.",
  "Mystery / Noir": "Deep-focus staging, layered silhouettes, asymmetrical framing; film-noir lighting, venetian-blind shadows, split lighting; investigative close-ups, detail inserts.",
  "Anger / Confrontation": "Opposing diagonals, confrontational close-ups, aggressive foreshortening; hard side lighting, high-contrast chiaroscuro; sharp angular panels, alternating reactions.",
  "Dominance / Intimidation": "Low-angle versus high-angle contrast, hierarchical staging, imposing silhouettes; sculptural top lighting, split lighting; unequal panel scales, controlled perspective.",
  "Urgency / Pursuit": "Strong leading lines, dynamic perspective, directional framing; sharp highlights, defined silhouettes; slanted panels, speed lines, rapid action-to-action transitions.",
  "Combat / Physical Impact": "Dynamic triangular composition, strong line of action, extreme foreshortening; directional contrast, form-defining shadows; impact panels, broken borders, motion lines.",
  "Determination / Resolve": "Strong verticals, centered framing, low-angle shots; Rembrandt lighting, sculptural backlight; focused detail panels followed by decisive action.",
  "Triumph / Heroism": "Monumental triangular composition, heroic low angles, radial balance; strong backlighting, volumetric rays; splash panels, full-bleed compositions.",
  "Defeat / Disillusionment": "Collapsed diagonals, high-angle isolation, diminished figure scale; fading directional light, subdued contrast; aftermath panels, extended pauses.",
  "Dreams / Surrealism": "Floating compositions, impossible perspective, ambiguous depth; luminous haze, ethereal glow; borderless imagery, dissolving panel boundaries.",
  "Disorientation / Unreality": "Dutch angles, distorted vanishing points, visual repetition; contradictory directional lighting, extreme contrast; fragmented panels, spatial discontinuity.",
  "Epic Scale / Grandeur": "Extreme wide shots, monumental perspective, layered depth, atmospheric scale; dramatic backlighting, volumetric illumination; panoramic spreads, monumental splash compositions.",
  "Absurdity / Deadpan Humor": "Rigid symmetry, understated framing, unexpected scale relationships; neutral naturalistic lighting; regular grids, silent reactions, delayed punchlines.",
  "Emotional Reversal / Dramatic Turning Point": "Compositional reversal, sudden scale shifts, symmetry-to-asymmetry transitions; warm-cool and soft-hard lighting transitions; contrasting panel rhythms, visual match cuts."
};
const SNAPSHOT_TECHNIQUES={
  "Peace / Serenity": "Horizontal composition, balanced symmetry, panoramic framing; high-key lighting, soft diffused daylight",
  "Cozy Domesticity / Safety": "Intimate medium shots, triangular composition, foreground framing; warm practical lighting, soft falloff",
  "Tenderness / Emotional Intimacy": "Intimate two-shots, eye-level close-ups, shallow depth of field; soft wraparound lighting, subtle bounced light",
  "Romance / Attraction": "S-curve composition, visual convergence, selective focus; golden-hour backlighting, luminous rim light",
  "Flirtation / Romantic Tension": "Asymmetrical framing, over-the-shoulder shots, expressive eyelines; soft side lighting, selective highlights",
  "Joy / Celebration": "Open composition, radial balance, expressive silhouettes; high-key lighting, luminous highlights",
  "Playfulness / Mischief": "Dynamic diagonals, exaggerated perspective, lively asymmetry; bright motivated lighting, dappled light",
  "Awkwardness / Embarrassment": "Deliberate static framing, awkward negative space, off-center subjects; understated natural lighting",
  "Hope / Relief": "Opening composition, upward leading lines, expanding spatial framing; emerging sunlight, gentle backlighting",
  "Wonder / Discovery": "Extreme wide shots, monumental scale contrast, worm's-eye perspective; volumetric lighting, radiant focal points",
  "Melancholy / Quiet Sadness": "Restrained asymmetry, negative space, distant framing; overcast lighting, subdued tonal contrast",
  "Loneliness / Isolation": "Extreme negative space, architectural framing, isolated silhouettes; distant practical lights, cool ambient lighting",
  "Nostalgia / Longing": "Layered depth, reflections, frame-within-frame; golden-hour haze, soft backlight",
  "Grief / Loss": "Static wide shots, diminished subject scale, restrained close-ups; muted low-key lighting",
  "Separation / Heartbreak": "Divided compositions, opposing eyelines, spatial barriers; split pools of light, warm-cool contrast",
  "Vulnerability / Confession": "Eye-level close-ups, intimate two-shots, delicate framing; soft window light, gentle Rembrandt lighting",
  "Shame / Guilt": "High-angle shots, enclosed framing, downward eyelines; subdued top lighting, partial facial shadows",
  "Exhaustion / Emotional Numbness": "Static composition, horizontal body lines, subdued visual hierarchy; flat overcast lighting, faint practical illumination",
  "Anxious Anticipation": "Off-center framing, directional negative space, foreground occlusion; low-key lighting, isolated practical sources",
  "Panic / Loss of Control": "Dutch angle, unstable diagonals, extreme perspective, tight cropping; harsh directional lighting, fragmented chiaroscuro",
  "Paranoia / Surveillance": "Voyeuristic framing, obstructed foregrounds, deep staging; silhouettes, narrow pools of light",
  "Ominous Stillness / Hidden Threat": "Rigid symmetry, centered composition, unsettling static framing; hard single-source lighting, tenebrism",
  "Fear / Psychological Horror": "Off-screen space, uncomfortable cropping, obscured silhouettes; tenebrism, motivated underlighting, deep enveloping shadows",
  "Shock / Sudden Revelation": "Abrupt extreme close-ups, dramatic scale shifts, visual contrast; stark chiaroscuro, sudden hard illumination",
  "Claustrophobia / Entrapment": "Tight framing, compressed spatial layers, enclosing architecture; narrow overhead lighting, dense shadows",
  "Mystery / Noir": "Deep-focus staging, layered silhouettes, asymmetrical framing; film-noir lighting, venetian-blind shadows, split lighting",
  "Anger / Confrontation": "Opposing diagonals, confrontational close-ups, aggressive foreshortening; hard side lighting, high-contrast chiaroscuro",
  "Dominance / Intimidation": "Low-angle versus high-angle contrast, hierarchical staging, imposing silhouettes; sculptural top lighting, split lighting",
  "Urgency / Pursuit": "Strong leading lines, dynamic perspective, directional framing; sharp highlights, defined silhouettes",
  "Combat / Physical Impact": "Dynamic triangular composition, strong line of action, extreme foreshortening; directional contrast, form-defining shadows",
  "Determination / Resolve": "Strong verticals, centered framing, low-angle shots; Rembrandt lighting, sculptural backlight",
  "Triumph / Heroism": "Monumental triangular composition, heroic low angles, radial balance; strong backlighting, volumetric rays",
  "Defeat / Disillusionment": "Collapsed diagonals, high-angle isolation, diminished figure scale; fading directional light, subdued contrast",
  "Dreams / Surrealism": "Floating compositions, impossible perspective, ambiguous depth; luminous haze, ethereal glow",
  "Disorientation / Unreality": "Dutch angles, distorted vanishing points, visual repetition; contradictory directional lighting, extreme contrast",
  "Epic Scale / Grandeur": "Extreme wide shots, monumental perspective, layered depth, atmospheric scale; dramatic backlighting, volumetric illumination",
  "Absurdity / Deadpan Humor": "Rigid symmetry, understated framing, unexpected scale relationships; neutral naturalistic lighting",
  "Emotional Reversal / Dramatic Turning Point": "Compositional reversal, sudden scale shifts, symmetry-to-asymmetry transitions; warm-cool and soft-hard lighting transitions"
};
return {common:"",snapshot:"",comic:"",story_page:"",catalogs:{snapshot:SNAPSHOT_TECHNIQUES,comic:COMIC_TECHNIQUES,story_page:COMIC_TECHNIQUES}};
}

// Module: review_scene
async function reviewScene(providedProgress=null){
 const chat=SillyTavern.getContext()?.chat;
 if(!Array.isArray(chat))throw Error('Нет контекста чата');
 if(reviewLocks.has(chat)||typeof document!=='undefined'&&document.querySelector('#sp-imagen-review-overlay'))throw Error('Окно подготовки уже открыто.');
 reviewLocks.add(chat);try{return await reviewSceneDialog(providedProgress);}finally{reviewLocks.delete(chat);}
}
async function reviewSceneDialog(providedProgress=null){
 await libraryStore?.refresh();

  const st = SillyTavern.getContext();
  if (!st?.chatMetadata || typeof document === 'undefined')
    throw new Error('Окно доступно только внутри SillyTavern');
  const v = st.chatMetadata.variables ||= {};
  // Ручной режим используется только ОДИН раз и не влияет на обычную кнопку.
  const manualMode = v.sp_imagen_manual_mode === true;
  v.sp_imagen_manual_mode = false;
  v.sp_imagen_preview_status = 'cancelled';
  if (typeof st.saveMetadata === 'function') await st.saveMetadata();
  const startChat = st.chat, startId = st.chatId;
  const scene = String(v.sp_imagen_parsed_scene || '');
  const resumeReview=v.sp_imagen_resume_review&&typeof v.sp_imagen_resume_review==='object'?v.sp_imagen_resume_review:null;
  if(!masterLibraryRaw())throw Error('Открой «Библиотека» и сохрани записи персонажей.');
  const master=loadMasterLibrary();let done=false,committing=false;
  let defaultComposition='', compositionExtra='', compositionCatalog={}, compositionMood='', compositionWarning='';
  if(!manualMode){
      const settings=loadCompositionSettings();
      if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error('Блок композиции должен возвращать объект common/snapshot/comic/story_page');
      const kind=validateKind(String(v.sp_imagen_active_kind||'snapshot'));
      for(const key of ['common','snapshot','comic','story_page'])if(settings[key]!==undefined&&typeof settings[key]!=='string')throw Error('Пожелания '+key+' должны быть текстом');

      compositionExtra=[settings.common||'',settings[kind]||''].map(x=>x.trim()).filter(Boolean).join('\n\n');
      compositionCatalog=settings.catalogs?.[kind]||{};
      if(!compositionCatalog||typeof compositionCatalog!=='object'||Array.isArray(compositionCatalog)||Object.values(compositionCatalog).some(x=>typeof x!=='string'))throw Error('Неверный каталог композиций '+kind);
      // Restore automatic composition selection; keep the manual fallback unchanged.
      if(!resumeReview&&Object.keys(compositionCatalog).length){
        providedProgress?.set('Подбор композиции', 'Подбираю композиционные приёмы к сцене; это отдельный запрос к текстовой модели.',{stoppable:false});
        const result=await selectComposition(compositionCatalog,kind,scene);
        if(SillyTavern.getContext().chat!==startChat||SillyTavern.getContext().chatId!==startId)throw Error('Чат изменился при подборе композиции.');
        if(result?.mood&&Object.hasOwn(compositionCatalog,result.mood))compositionMood=result.mood;
        compositionWarning=String(result?.warning||'');
      }
      defaultComposition=[compositionMood?'Mood: '+compositionMood+'\n'+compositionCatalog[compositionMood]:'',compositionExtra].filter(Boolean).join('\n\n');
      providedProgress?.set('Проверка сцены', 'Проверь композицию, сцену, одежду и персонажей.',{stoppable:false});
  }
  const suggestion=manualMode?'':String(v.sp_imagen_composition_proposal||defaultComposition);
  const normalize = x => String(x || '').normalize('NFKC').toLowerCase().replace(/ё/g,'е').trim();

  function loadSharedLibraryAliases() {
    const parsed = master;
    const out = [];
    for (const group of [parsed?.personas || {}, parsed?.characters || {}]) {
      for (const [, entry] of Object.entries(group)) {
        const canonical = String(entry?.name || '').trim();
        if (!canonical) continue;
        const names = [canonical, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])]
          .map(v => normalize(v)).filter(Boolean);
        out.push({canonical, names:[...new Set(names)]});
      }
    }
    return out;
  }
  const aliasDirectory = loadSharedLibraryAliases();
  function canonicalActorName(name) {
    const raw = String(name || '').trim();
    const norm = normalize(raw);
    if (!norm) return raw;
    for (const entry of aliasDirectory) {
      if (entry.names.some(n => n === norm)) return entry.canonical;
    }
    for (const entry of aliasDirectory) {
      if (entry.names.some(n => n.length >= 2 && (norm.startsWith(n + ' ') || n.startsWith(norm + ' ')))) return entry.canonical;
    }
    return raw;
  }
  const skipEmpty = x => /^(?:|null|undefined|unknown|none|not set|не установлено|нет|—|-)$/i.test(String(x ?? '').trim());
  const assignments = new Map();
  const MAX = 60;
  const assign = (who, value, source) => {
    const text = String(value ?? '').trim();
    if (!text || skipEmpty(text) || text.length > 2500) return;
    // Явные "имя: одежда" и списки NPC могут содержать несколько участников.
    const chunks = text.split(/\n|;/).map(s=>s.trim()).filter(Boolean);
    if (!who && chunks.some(c=>/^[^:：]{1,55}[:：]/.test(c))) {
      for (const part of chunks) {
        const m = part.match(/^([^:：]{1,55})[:：]\s*(.+)$/);
        if (m) assign(m[1],m[2],source);
      }
      return;
    }
    const subject = normalize(who || 'не указан');
    const currentUser = normalize(st.name1), currentChar = normalize(st.name2);
    const actual = subject==='user' || subject==='persona' ? (currentUser||subject)
      : subject==='char' || subject==='character' ? (currentChar||subject) : String(who || 'не указан').trim();
    const canonicalActual = canonicalActorName(actual);
    if (assignments.size < MAX || assignments.has(normalize(canonicalActual))) assignments.set(normalize(canonicalActual),{name:canonicalActual, text:chunks.join('; '),source});
  };
// OUTFIT SOURCE — explicit wardrobe tags written directly in RP posts.
let wardrobeStatus = 'Одежда не найдена в прочитанных метках или включённых карточках';
let wardrobeCount = 0;
if (!manualMode) {
  const fallback = String(v.sp_imagen_rp_outfits || '');
  const canon = s => normalize(s).replace(/[_\s-]+outfit$/i,'').trim();
  const matchesPerson = (a,b) => {
    const x=canon(a), y=canon(b);
    return x===y || (x.length>2 && y.startsWith(x+' ')) ||
      (y.length>2 && x.startsWith(y+' '));
  };
  const candidates=fallback.split(/\n|;\s*(?=[^:;\n]{1,80}[_\s-]outfit\s*[:：])/i);
  for (const item of candidates) {
    const match=item.trim().match(/^([^:：\n]{1,80})\s*[:：]\s*(.{1,1800})$/);
    if (!match || !/[_\s-]outfit\s*$/i.test(match[1])) continue;
    const name=match[1].replace(/[_\s-]+outfit\s*$/i,'').trim();
    const value=match[2].trim();
    if (!name || skipEmpty(value)) continue;
    if ([...assignments.values()].some(a=>matchesPerson(a.name,name))) continue;
    assign(name,value,'RP wardrobe tags');
    wardrobeCount++;
  }
  wardrobeStatus = wardrobeCount
    ? 'Найдены описания одежды: ' + wardrobeCount + ' персонаж(ей)'
    : wardrobeStatus;
}
v.sp_imagen_wardrobe_status = wardrobeStatus;
v.sp_imagen_wardrobe_count = String(wardrobeCount);
  const outfits=(manualMode ? [] : [...assignments.values()].filter(x=>x.name && normalize(x.name)!=='не указан')).map(x=>
    `${x.name}_outfit: ${x.text}`
  ).join('\n');
  const reviewKind=v.sp_imagen_active_kind||'snapshot';
  const view=createReviewView({kind:reviewKind,manualMode,postCount:v.sp_imagen_rp_source_count||loadGen2Settings().posts[validateKind(reviewKind)]});
  const {overlay,panel,sceneEl,outfEl,compEl,errEl,cancel,next}=view;
  const ui=createUiKit(document);
  sceneEl.value=resumeReview?.scene??scene;outfEl.value=resumeReview?.outfits??outfits;compEl.value=resumeReview?.composition??suggestion;
  panel.querySelector('[data-wardrobe-info]').textContent = manualMode ? 'Ручной режим' : wardrobeStatus;
  if (v.sp_imagen_parser_warning) {const w=panel.querySelector('[data-warning]');w.textContent=v.sp_imagen_parser_warning;w.style.display='block';}


  const castEntries=Object.entries({...master.personas,...master.characters});
  const sourceText=normalize(scene);
  const mentioned=castEntries.filter(([,e])=>!manualMode&&[e.name,...(e.aliases||[])].some(name=>{
    const token=normalize(name);if(!token)return false;
    let at=sourceText.indexOf(token);
    while(at>=0){if(!/[\p{L}\p{N}_]/u.test(sourceText[at-1]||'')&&!/[\p{L}\p{N}_]/u.test(sourceText[at+token.length]||''))return true;at=sourceText.indexOf(token,at+1);}return false;
  })).map(([id])=>id);
  const initialRoster=Array.isArray(resumeReview?.castIds)?resumeReview.castIds:Array.isArray(v.sp_imagen_chat_cast_ids)?v.sp_imagen_chat_cast_ids:[...new Set([...(Array.isArray(v.sp_imagen_present_ids)?v.sp_imagen_present_ids:[]),...mentioned])];
  const persistRoster=async ids=>{
    const now=SillyTavern.getContext();if(now.chat!==startChat||now.chatId!==startId)throw Error('Чат изменился');
    const vars=now.chatMetadata.variables||={},previous=vars.sp_imagen_chat_cast_ids;
    vars.sp_imagen_chat_cast_ids=ids;
    try{if(typeof now.saveMetadata==='function')await now.saveMetadata();}
    catch(e){vars.sp_imagen_chat_cast_ids=previous;throw e;}
  };
  const castManager=createChatCastPicker(document,castEntries,initialRoster,mentioned,persistRoster,master.organizer);
  const castChecks=castManager.checks;
  view.castSlot.appendChild(castManager.element);

  const npcInfo=ui.note(view.npcSlot,manualMode?'Впиши NPC вручную или предложи по постам.':String(v.sp_imagen_npc_status||'Проверь предложения NPC.'));
  const npcEl=createNpcCards(document);npcEl.value=resumeReview?.npc??(manualMode?'':String(v.sp_imagen_npc_draft||''));view.npcSlot.appendChild(npcEl.element);
  const npcActions=ui.row(view.npcSlot);
  const npcAdd=ui.button('+ NPC',npcActions,()=>npcEl.add('','',true));
  const npcSuggest=ui.button('Предложить NPC по постам',npcActions);
  let npcPending=false;
  npcSuggest.onclick=async()=>{
    if(done||npcPending)return;
    const now=SillyTavern.getContext();if(now.chat!==startChat||now.chatId!==startId){npcInfo.textContent='Чат изменился. Открой окно заново.';return;}
    const previousText=npcEl.value;
    npcPending=true;npcSuggest.disabled=true;next.disabled=true;npcInfo.textContent='Подбираю NPC и проверяю интернет-справки…';
    try{
      v.sp_imagen_npc_request_scene=sceneEl.value.trim();
      if(done)return;await prepareNpc({isActive:()=>!done});
      if(done)return;
      if(SillyTavern.getContext().chat!==startChat||SillyTavern.getContext().chatId!==startId){npcInfo.textContent='Чат изменился; результат не подставлен.';return;}
      if(npcEl.value!==previousText){npcInfo.textContent='Текст NPC изменён вручную во время запроса — оставлен без замены.';return;}
      if(typeof v.sp_imagen_npc_draft==='string')npcEl.value=v.sp_imagen_npc_draft;
      npcInfo.textContent=String(v.sp_imagen_npc_status||'Проверь NPC.');
    }catch(e){if(!done)npcInfo.textContent='NPC: '+String(e?.message||e)+'. Можно заполнить вручную.';}
    finally{npcPending=false;if(!done){npcSuggest.disabled=false;next.disabled=false;}}
  };

  // The original catalogue stays available even if automatic selection fails.
  if(!manualMode&&Object.keys(compositionCatalog).length){
    const compositionSelect=document.createElement('select');compositionSelect.className='ness-input';
    const empty=document.createElement('option');empty.value='';empty.textContent='Композиция: выбери категорию из исходной библиотеки';compositionSelect.appendChild(empty);
    for(const mood of Object.keys(compositionCatalog)){const option=document.createElement('option');option.value=mood;option.textContent=mood;compositionSelect.appendChild(option);}
    compositionSelect.value=compositionMood;
    ui.field(view.compControls,'Категория композиции',compositionSelect);
    const compositionInfo=document.createElement('p');compositionInfo.className='ness-note';compositionInfo.textContent=compositionWarning||'Приёмы из исходной библиотеки. Выбор категории заменит текст ниже; его можно отредактировать.';
    view.compControls.appendChild(compositionInfo);
    compositionSelect.onchange=()=>{const mood=compositionSelect.value;compEl.value=[mood?'Mood: '+mood+'\n'+compositionCatalog[mood]:'',compositionExtra].filter(Boolean).join('\n\n');};
    const chooseMood = ui.button('◈ Подобрать композицию по сцене',view.compControls,undefined,'quiet');
    chooseMood.onclick=async()=>{
      if(done||chooseMood.disabled)return;
      chooseMood.disabled=true;compositionInfo.textContent='Подбираю композицию по сцене…';
      try{
        const current=SillyTavern.getContext();
        if(current.chat!==startChat||current.chatId!==startId)throw Error('Чат изменился.');
        const result=await selectComposition(compositionCatalog,validateKind(String(v.sp_imagen_active_kind||'snapshot')),sceneEl.value.trim());
        if(done||SillyTavern.getContext().chat!==startChat||SillyTavern.getContext().chatId!==startId)return;
        if(result?.mood && Object.hasOwn(compositionCatalog,result.mood)){
          compositionSelect.value=result.mood;
          compositionSelect.onchange();
          compositionInfo.textContent='Композиция предложена. Текст ниже можно изменить вручную.';
        }else compositionInfo.textContent=result?.warning||'Категория не выбрана. Можно выбрать вручную.';
      }catch(e){if(!done)compositionInfo.textContent='Подбор не удался: '+String(e?.message||e);}
      finally{if(!done)chooseMood.disabled=false;}
    };
  }



  const previousFocus=document.activeElement;
  let onChatSwitch=()=>{};
  const stopViewportTracking=mountDialog(overlay,()=>onChatSwitch());

  // Не вызывать клавиатуру и скачок прокрутки сразу при открытии на телефоне.
  if (!(window.matchMedia && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches)) sceneEl.focus();
  return await new Promise(resolve=>{
    let asking=false;
    const onKey=e=>{if(document.querySelector('.spi-guide-explain-overlay'))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();void askCancel();}};
    const close=(status,force=false)=>{
      if(done||(committing&&!force))return;done=true;castManager.dispose();
      document.removeEventListener('keydown',onKey,true);
      stopViewportTracking();overlay.remove();previousFocus?.focus?.();resolve(status);
    };
    const reviewSnapshot=()=>({
      scene:sceneEl.value,outfits:outfEl.value,composition:compEl.value,
      npc:npcEl.value,castIds:castChecks.filter(x=>x.cb.checked).map(x=>x.id),
      manualMode
    });
    const askCancel=async()=>{
      if(done||committing||asking)return;
      const live=SillyTavern.getContext(),index=activePostIndex(live);
      if(index<0||live.chat!==startChat||live.chatId!==startId){close('cancelled');return;}
      asking=true;
      try{
        const keep=await confirmKeepingDraft(panel,panel.querySelector('[data-review-actions]'),'данные подготовки');
        if(keep===null)return;
        if(SillyTavern.getContext().chat===startChat&&SillyTavern.getContext().chatId===startId){
          if(keep)savePostDraft(live,index,{
            kind:v.sp_imagen_active_kind||'snapshot',stage:'reviewed',
            parser:parserDraftFromVariables(v),review:reviewSnapshot()
          });
          else discardPostDraft(live,index);
        }
        delete v.sp_imagen_resume_review;
        close('cancelled');
      }finally{asking=false;}
    };
    onChatSwitch=()=>close('cancelled',true);
    document.addEventListener('keydown',onKey,true);
    cancel.onclick=()=>void askCancel();
    panel.querySelector('.ness-close-dialog').onclick=()=>cancel.click();
    overlay.onclick=e=>{if(e.target===overlay)void askCancel();};
    next.onclick=async()=>{
      if(done||next.disabled)return;
      errEl.style.display='none';
      const hasScene = Boolean(sceneEl.value.trim());
      if (!hasScene) {
        errEl.textContent=manualMode ? 'Напиши описание своей сцены.' : 'Добавь хотя бы краткое описание сцены.';
        errEl.style.display='block';return;
      }
      const now=SillyTavern.getContext();
      if(now.chatId!==startId || now.chat!==startChat){
        errEl.textContent='Чат изменился. Закрой окно и запусти кнопку заново.';errEl.style.display='block';return;
      }
      next.disabled=true;cancel.disabled=true;committing=true;
      try {
        const vars=now.chatMetadata.variables ||= {};
        await castManager.flush();
        if (done || SillyTavern.getContext().chat !== startChat || SillyTavern.getContext().chatId !== startId)
          throw Error('Чат изменился. Подготовка отменена.');
        // Scene, wardrobe and the edited composition field are sent explicitly to Director.
        vars.sp_imagen_present_ids=castChecks.filter(x=>x.cb.checked).map(x=>x.id);
        vars.sp_imagen_tracker_npcs=npcEl.value.trim();
        vars.sp_imagen_tracker_scene=sceneEl.value.trim();
        vars.sp_imagen_tracker_outfits=outfEl.value.trim(); // может быть пустым!
        vars.sp_imagen_composition_wishes=compEl.value.trim();
        vars.sp_imagen_run_ticket='imagen_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
        vars.sp_imagen_prepared_ticket='';
        vars.sp_imagen_structured_library='';
        vars.sp_imagen_preview_status='approved';
        const index=activePostIndex(now);
        if(index>=0)savePostDraft(now,index,{
          kind:vars.sp_imagen_active_kind||'snapshot',stage:'reviewed',
          parser:parserDraftFromVariables(vars),review:reviewSnapshot()
        });
        delete vars.sp_imagen_resume_review;
        if (typeof now.saveMetadata==='function') await now.saveMetadata();
        committing=false;close('approved');
      }catch(e){
        now.chatMetadata.variables.sp_imagen_preview_status='cancelled';
        errEl.textContent='Ошибка сохранения: '+String(e?.message||e);errEl.style.display='block';
        committing=false;next.disabled=false;cancel.disabled=false;
      }
    };
  });

}

// Module: prepare_library
const nessPreparedVisibility=new WeakMap();
async function prepareLibrary(){
await libraryStore?.refresh();

const st=SillyTavern.getContext(),v=st.chatMetadata.variables;
if(v.sp_imagen_preview_status!=='approved'||!v.sp_imagen_run_ticket)throw Error('Сначала подтвердите данные');
if(!masterLibraryRaw())throw Error('Открой «Библиотека» и сохрани записи персонажей.');
const data=loadMasterLibrary();
const chosen=new Set(v.sp_imagen_present_ids||[]);
const lines=[],visibility=new Map();
for(const [id,entry] of Object.entries({...data.personas,...data.characters})){
 if(!chosen.has(id))continue;
 const e=prepareBodyAppearance(entry);
 lines.push('CHARACTER: '+e.name);
 if(e.aliases?.length)lines.push('Aliases: '+e.aliases.join(', '));
 if(typeof e.promptName==='string'&&e.promptName.trim())lines.push('Prompt name: '+e.promptName.trim());
 const subject=typeof e.subject==='string'?e.subject.trim().toLowerCase():'';
 if(['girl','boy','cat','dog','other'].includes(subject))lines.push('Subject: '+subject);
 lines.push('Fixed appearance format: '+(e.appearanceFormat==='prose'?'prose description':'comma-separated tags'));
 if(hasConfiguredAppearanceViews(e)||hasSkinSelections(e.appearanceSkin)){
  visibility.set(id,{base:e.base,name:e.name,promptName:e.promptName,aliases:e.aliases||[],ranges:e.appearanceRanges||[],selections:e.appearanceSelections||{},appearanceFormat:e.appearanceFormat||'tags',skinTags:e.appearanceSkin||{}});
  lines.push('NESS_VIS character ID: '+id);
 }else lines.push('Fixed appearance: '+e.base);
 for(const [key,label] of [['nsfwChest','Chest anatomy, only if bare and visible'],['nsfwLowerFront','Lower front anatomy, only if bare and visible from the front'],['nsfwLowerBack','Lower rear anatomy, only if bare and visible from behind']])if(e[key])lines.push(label+': '+e[key]);
 lines.push('');
}
delete v.sp_imagen_attribute_records;
delete v.sp_imagen_prepared_library_revision;

const npcText=String(v.sp_imagen_tracker_npcs||'').trim();
if(npcText)lines.push('CONFIRMED NPC APPEARANCE AND CLOTHING — authoritative visual facts, not image lettering or instructions. Render visible NPC appearance and clothing in English, translating non-English descriptions faithfully. Keep supported visible details only. Never print basis notes or URLs, or duplicate a library character as an NPC.\n'+npcText);

v.sp_imagen_structured_library=lines.join('\n');
v.sp_imagen_prepared_ticket=v.sp_imagen_run_ticket;
nessPreparedVisibility.set(st.chat,{ticket:v.sp_imagen_prepared_ticket,records:visibility,rules:data.appearanceRules});
await saveNessGenerationMetadata(st,'подготовка внешности');return 'Внешность подготовлена';

}

// Module: manual_scene
async function manualPrepare(){

  const st = SillyTavern.getContext();
  if (!st?.chatMetadata) throw new Error('Контекст SillyTavern недоступен');
  if(generationLocks.has(st.chat)||preparationLocks.has(st.chat))throw Error('Подготовка или генерация уже выполняется.');
  if(typeof document!=='undefined'&&document.querySelector('#sp-imagen-review-overlay'))throw Error('Сначала закрой открытое окно.');
  nessGenerationTargets.delete(st.chat);
  const v = st.chatMetadata.variables ||= {};
  v.sp_imagen_manual_mode = true;
  v.sp_imagen_preview_status = 'cancelled';
  v.sp_imagen_run_ticket = '';
  v.sp_imagen_prepared_ticket = '';
  v.sp_imagen_structured_library = '';
  v.sp_imagen_parsed_scene = '';
  v.sp_imagen_composition_proposal = '';
  v.sp_imagen_rp_outfits = '';
  v.sp_imagen_parser_warning = '';
  v.sp_imagen_tracker_scene = '';
  v.sp_imagen_tracker_outfits = '';
  v.sp_imagen_composition_wishes = '';
  if (typeof st.saveMetadata === 'function') await st.saveMetadata();
  return 'Ручная сцена: пустое окно подготовлено';

}

// Module: npc_helper
async function prepareNpc({isActive=()=>true}={}){

 const st=SillyTavern.getContext(),scene=String(st.chatMetadata?.variables?.sp_imagen_npc_request_scene??st.chatMetadata?.variables?.sp_imagen_parsed_scene??'');
 if(!isActive())return '';const prior=npcJobs.get(st.chat);if(prior&&prior.scene===scene&&prior.isActive())return await prior.promise;
 const job={scene,isActive};npcJobs.set(st.chat,job);
 job.promise=runNpcRequest(st,scene,()=>isActive()&&npcJobs.get(st.chat)===job);
 try{return await job.promise;}finally{if(npcJobs.get(st.chat)===job)npcJobs.delete(st.chat);}
}
async function runNpcRequest(st,scene,isActive){
 await libraryStore?.refresh();
 const v=st.chatMetadata.variables||={},chat=st.chat,chatId=st.chatId;
 v.sp_imagen_npc_draft=null;v.sp_imagen_npc_status='';
 const current=()=>SillyTavern.getContext().chat===chat&&SillyTavern.getContext().chatId===chatId&&isActive();
 try{
  const master=loadMasterLibrary();
  const known=Object.values({...master.personas,...master.characters}).map(e=>({name:e.name,aliases:e.aliases||[]}));
  const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
  const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const inText=(text,name)=>Boolean(name)&&new RegExp('(?:^|[^\\p{L}\\p{N}_])'+escapeRegex(name)+'(?=$|[^\\p{L}\\p{N}_])','iu').test(text);
  const knownMatches=known.filter(e=>[e.name,...e.aliases].some(n=>inText(normalize(scene),normalize(n))));
  const kind=v.sp_imagen_active_kind||'snapshot';
  const instruction=codePrompt('npc_presence');
  async function generate(system,data){
   const answer=await requestNessText(kind,[{role:'system',content:system},{role:'user',content:JSON.stringify(data)}]);
   const raw=answer.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
   let rows;
   try{rows=JSON.parse(raw);}
   catch(cause){throw new Error('Модель вернула ответ NPC в неверном формате',{cause});}
   if(!Array.isArray(rows)||rows.length>8)throw Error('Модель вернула некорректный список NPC');
   const norm=normalize;
   const names=new Set(known.flatMap(e=>[e.name,...e.aliases]).map(norm));
   const seen=new Set();
   return rows.filter(r=>{
    if(!r||['name','english_name','fandom','appearance','clothing','basis','source_name','presence_quote','kind','presence'].some(k=>typeof r[k]!=='string'||r[k].length>3000)||!r.name.trim())return false;
    // No person can pass based on the model's assertion alone: require text evidence.
    if(r.presence!=='physical'||!['named','unnamed'].includes(r.kind)||!r.source_name.trim()||!r.presence_quote.trim())return false;
    if(!scene.includes(r.presence_quote)||!inText(r.presence_quote,r.source_name)||!inText(scene,r.source_name))return false;
    if(r.presence_quote.trim()===r.source_name.trim())return false;
    const source=norm(r.source_name),name=norm(r.name);
    if(r.kind==='unnamed'){
      if(name!==source)return false;
      r.fandom='';r.english_name='';
    }else if(!inText(name,source)&&!inText(source,name))return false;
    if(names.has(name)||names.has(source)||names.has(norm(r.english_name))||seen.has(source))return false;
    // A short source name may also be part of a known full name.
    if(known.some(e=>[e.name,...e.aliases].some(n=>{const k=norm(n);return source.length>=3&&(inText(k,source)||inText(source,k));})))return false;
    seen.add(source);return true;
   });
  }
  let rows=await generate(instruction,{posts:scene,known_characters:known,regex_matched_library_characters:knownMatches});
  if(!current())return '';
  // Privacy: do not send NPC names, fandoms or story context to Wikipedia.
  // NPC recognition uses only the user's selected text-model connection.
  if(!current())throw Error('Чат изменился');
  const draft=rows.map(r=>[
   'NPC: '+r.name+(r.english_name&&r.english_name!==r.name?' ('+r.english_name+')':''),
   'Appearance: '+r.appearance,
   r.clothing?'Clothing: '+r.clothing:''
  ].filter(Boolean).join('\n')).join('\n\n');
  v.sp_imagen_npc_draft=draft;
  v.sp_imagen_npc_status=rows.length?'NPC: '+rows.length+'. Внешность и одежду можно отредактировать.':'NPC не найдены. Можно добавить вручную.';

 }catch(e){if(current())v.sp_imagen_npc_status='Авторазбор NPC недоступен: '+String(e?.message||e).replace(/\.$/,'')+'. Впиши NPC вручную.';}
 if(current()&&typeof st.saveMetadata==='function')await st.saveMetadata();
 return v.sp_imagen_npc_status;

}

// Module: composition
async function selectComposition(catalog,kind,scene){
validateKind(kind);scene=String(scene||'');

 const names=Object.keys(catalog);
 if(!names.length||!String(scene||'').trim())return {mood:'',warning:''};
 try{
  const answer=await requestNessText(kind,[
   {role:'system',content:codePrompt('mood_choice')},
   {role:'user',content:'PROFILE: '+kind+'\nCATEGORIES:\n'+names.join('\n')+'\n\nRP POSTS:\n'+String(scene)}
  ]);
  const text=answer.trim();
  if(text==='NONE')return {mood:'',warning:'Настроение не определено — выбери категорию вручную.'};
  if(!Object.hasOwn(catalog,text))throw Error('Ответ не совпадает с категорией каталога');
  return {mood:text,warning:''};
 }catch(e){return {mood:'',warning:'Автоподбор композиции недоступен: '+String(e?.message||e)+'. Выбери категорию вручную.'};}

}

// Module: render_image
async function renderImage(kind,providedProgress=null){
validateKind(kind);

const st=SillyTavern.getContext();
if(!st?.chatMetadata||!Array.isArray(st.chat))throw Error('Нет контекста чата');
const v=st.chatMetadata.variables||={};
  const slotManager=getMediaSlots?.();
  if(!slotManager?.installed || !slotManager.supportedKinds?.includes(kind)
     || typeof slotManager.publish!=='function' || typeof slotManager.focus!=='function') {
    throw new Error('SP Imagen: собственная галерея не загрузилась. Перезагрузи SillyTavern.');
  }

const ticket=String(v.sp_imagen_run_ticket||'');
if(v.sp_imagen_preview_status!=='approved'||!ticket||v.sp_imagen_prepared_ticket!==ticket)throw Error('Подтвердите данные и подготовьте библиотеку');
const lockedChat=st.chat;
if(!spImagenExtension().directGenerationEnabled?.())throw Error('Укажи API-токен в SP Imagen → NovelAI.');
if(generationLocks.has(lockedChat))throw Error('Генерация уже выполняется');
const progress=providedProgress||createSpImagenProgress();
generationLocks.add(lockedChat);
progress.set('Подготовка режиссёра', 'Собираю параметры и внешность для текстовой модели.');
const originEvent=st.event_types?.CHAT_CHANGED;
let onOriginChanged=null;
let userAbort=()=>{};
let finished=false;
try{
const beforeChat=st.chat,beforeId=st.chatId,beforeCount=st.chat.length;
const imageController=new AbortController();
userAbort=()=>imageController.abort(progress.signal.reason || new Error('Остановлено пользователем.'));
if(progress.signal.aborted)userAbort();else progress.signal.addEventListener('abort',userAbort,{once:true});
onOriginChanged=()=>{
 const now=SillyTavern.getContext();
 if(now.chat!==beforeChat||now.chatId!==beforeId)imageController.abort(new Error('Чат изменился.'));
};
if(originEvent)st.eventSource?.on?.(originEvent,onOriginChanged);
const requireOrigin=()=>{
 if(imageController.signal.aborted)throw Error('Генерация остановлена или чат изменился.');
 const now=SillyTavern.getContext();
 if(now.chat!==beforeChat||now.chatId!==beforeId||now.chat.length!==beforeCount)
  throw Error('Чат изменился во время подготовки итогового промпта. Запусти генерацию заново.');
};
v.sp_imagen_preview_status='cancelled';
await saveNessGenerationMetadata(st,'запуск режиссёра');
requireOrigin();
const baseKind=validateKind(kind);
const includeText=pageTextEnabled(kind,v.sp_imagen_page_text_enabled);
const director=getNessDirector(kind,includeText);
const profile=getExtension?.()?.getActiveProfile?.(kind)||null;
const runtimeSettings=loadGen2Settings();
const directorSettings={...runtimeSettings,posts:{...runtimeSettings.posts,[baseKind]:profile?.parser?.posts||runtimeSettings.posts[baseKind]}};
const source={
'RP POSTS':String(v.sp_imagen_tracker_scene||''),
'FIXED CHARACTER APPEARANCE':String(v.sp_imagen_structured_library||''),
'CURRENT WARDROBE':String(v.sp_imagen_tracker_outfits||''),
'COMPOSITION WISHES':String(v.sp_imagen_composition_wishes||'')};
const prepared=nessPreparedVisibility.get(lockedChat);
const visibility=prepared?.ticket===ticket && profile?.parser?.options?.includeCharacters!==false ? prepared.records : new Map();
if(!visibility.size&&profile?.parser?.options?.includeCharacters!==false&&/^NESS_VIS character ID:/m.test(source['FIXED CHARACTER APPEARANCE']))throw Error('Разметка внешности устарела. Запусти подготовку заново.');
const filteredSource=filterProfileSources(source,profile);
const identityInstruction=/^(?:Prompt name|Subject):/m.test(filteredSource['FIXED CHARACTER APPEARANCE']) ? codePrompt('identity_fields') : '';
const appearancePunctuation=codePrompt('appearance_punctuation');
const npcLanguage=String(v.sp_imagen_tracker_npcs||'').trim()?(includeText?codePrompt('npc_language'):NPC_LANGUAGE_VISUAL_ONLY):'';
const useDialogueSettings=includeText && profile?.parser?.options?.useDialogueSettings!==false;
const ratioOverride=runtimeSettings.aspectRatio?.[baseKind]||'auto';
const ratioInstruction=ratioOverride==='auto'?'':'\n\nIMAGE RATIO: Set aspect_ratio to '+ratioOverride+' in the required JSON. Keep the original output contract unchanged.';
const sharedRules=getExtension?.()?.getGlobalDirectorRules?.()||[];
const experimental=director.structured===true;
const maxLines=baseKind==='comic'?runtimeSettings.dialogue.comicLines:runtimeSettings.dialogue.storyLines;
const maxWords=baseKind==='comic'?runtimeSettings.dialogue.comicWords:runtimeSettings.dialogue.storyWords;
const experimentalRules=sharedRules.filter(rule=>rule?.enabled!==false&&String(rule?.prompt||'').trim())
 .map(rule=>String(rule.prompt)).join('\n\n');
const systemPrompt=experimental
 ? (director.source==='custom'?director.prompt+'\n\nCURRENT GENERATION SETTINGS (override any example/default limits): Use the last '+directorSettings.posts[baseKind]+' RP posts. '+(includeText?'Maximum '+(useDialogueSettings?maxLines:8)+' speech lines, '+(useDialogueSettings?maxWords:40)+' words per line.':'bubbles and lettering must both be empty arrays.')+(profile?.parser?.instructions?.trim()?'\n\nCUSTOM PROFILE — SCENE PARSING INSTRUCTIONS\n'+profile.parser.instructions:''):experimentalDirectorPrompt(baseKind,{includeText,postCount:directorSettings.posts[baseKind],maxLines:useDialogueSettings?maxLines:8,maxWords:useDialogueSettings?maxWords:40}))
   +appearanceVisibilityInstruction(visibility,prepared?.rules,codePrompt('visibility_markers'))
   +skinAppearanceInstruction(visibility)
   +(npcLanguage?'\n\nNPC DESCRIPTIONS: keep names, bodies, and outfits in descriptive JSON fields in English.'+(includeText?' Keep in-image words in the source language.':''):'')
   +(experimentalRules?'\n\nADDITIONAL ARTISTIC DIRECTIONS: apply these while filling the JSON slots, but never alter JSON field names/schema or append extra output.\n'+experimentalRules:'')
   +(ratioOverride!=='auto'?'\n\nSet the aspect_ratio JSON property to '+ratioOverride+'.':'')
 : configuredDirectorPrompt(director.prompt,baseKind,directorSettings,useDialogueSettings)+identityInstruction+appearancePunctuation+appearanceVisibilityInstruction(visibility,prepared?.rules,codePrompt('visibility_markers'))+skinAppearanceInstruction(visibility)+npcLanguage+directorProfileGuidance({extraPrompts:sharedRules},profile)+ratioInstruction;
const directorMessages=[{role:'system',content:systemPrompt},{role:'user',content:Object.entries(filteredSource).map(([k,x])=>k+':\n'+x).join('\n\n====\n\n')}];
// A fresh director request already includes the complete required format. Never
// submit the exact same costly request twice blindly after a format mismatch.
progress.set('Режиссёр · ожидание ответа', 'Один запрос к текстовой модели. Время зависит от сервера и модели.');
const raw=await requestNessText(kind,directorMessages,imageController.signal);
requireOrigin();
v.sp_imagen_last_director_raw=raw;
const directorPostIndex=activePostIndex(st);
if(directorPostIndex>=0){
 rememberPostPrompts(st,directorPostIndex,{kind,directorRaw:raw});
 savePostDraft(st,directorPostIndex,{kind,stage:'director',directorRaw:raw});
}
let parsedTransport;
try{
 parsedTransport=experimental
  ?parseExperimentalDirector(raw,{kind:baseKind,includeText,maxLines:useDialogueSettings?maxLines:null,maxWords:useDialogueSettings?maxWords:null})
  :parseImageHtml(raw);
 delete v.sp_imagen_last_director_error;
}catch(error){
 v.sp_imagen_last_director_error=String(error?.message||error);
 await saveNessGenerationMetadata(st,'ошибка формата режиссёра');
 const reasoningOnly=!experimental&&/(?:final one.line prompt|deliver HTML|JSON escaping|reasoning|write final prompt)/i.test(raw)
    && !/<(?:naicom|image_lite)\b/i.test(raw);
 if(reasoningOnly)throw new Error('Текстовая модель вернула рассуждения/черновик вместо готового HTML/JSON. NovelAI не запускался. Проверь режим reasoning и профиль подключения модели; исходный ответ сохранён в sp_imagen_last_director_raw.',{cause:error});
 throw new Error((experimental?'Режиссёр вернул неверную структуру JSON-слотов.':'Режиссёр вернул неподходящий формат.')+' NovelAI не запускался. Исходный ответ сохранён в sp_imagen_last_director_raw: '+v.sp_imagen_last_director_error,{cause:error});
}
progress.set('Проверка промпта', 'Проверяю формат, подставляю внешность и применяю настройки.');
await saveNessGenerationMetadata(st,'получен ответ режиссёра');
requireOrigin();
const config=parsedTransport.config;
if(ratioOverride!=='auto')config.aspect_ratio=ratioOverride;
v.sp_imagen_last_transport_repaired=parsedTransport.repaired;
verifyTextlessImagePrompt(config.prompt,baseKind,includeText);
// Pure structural check: prevent the legacy normalizer from interpreting
// misplaced character sections as terminal printed Text.
validateImagePromptLayout(config.prompt,baseKind);
if(!experimental)config.prompt=normalizeImagePrompt(config.prompt,{parseLettering:includeText});
if(npcLanguage&&!experimental){
 progress.set('Перевод NPC', 'Перевожу только нужные описания из подготовленного NPC-блока.');
 config.prompt=await repairNpcPromptLanguage(kind,config.prompt,imageController.signal);
 requireOrigin();
}
if(visibility.size && profile?.parser?.options?.includeCharacters!==false){
 config.prompt=insertVisibleAppearance(config.prompt,visibility);
 config.prompt=insertSkinAppearance(config.prompt,visibility);
}
// Personal composition rules are already included in the director's instructions.
// Never prepend their raw text to the NAI5 image prompt.
if(useDialogueSettings&&!experimental)config.prompt=limitComicDialogue(config.prompt,baseKind,runtimeSettings);
validateImagePromptLayout(config.prompt,baseKind);
verifyTextlessImagePrompt(config.prompt,baseKind,includeText);
config.kind=kind;
if(experimental)config.structuredDirector=true;
config.profileName=getExtension?.()?.getGenerationProfileLabel?.(kind)||kind;
const snapshot=spImagenExtension().snapshotGenerationConfig?.(config,kind);
if(snapshot?.spImagenDirect)config.spImagenDirect=snapshot.spImagenDirect;
requireOrigin();
const selected=nessGenerationTargets.get(beforeChat);
if(selected&&(selected.chatId!==beforeId||beforeChat[selected.index]!==selected.message||selected.message.mes!==selected.text))throw Error('Выбранный пост изменился. Подготовь картинку заново.');
const targetIndex=selected?selected.index:await lastRpIndex(beforeChat);
if(targetIndex<0)throw Error('Imagen: настоящий RP-пост не найден');
const target=beforeChat[targetIndex];
// Save before preview or paid request; an aborted preparation is recoverable
// without spending a second director call.
rememberPostPrompts(st,targetIndex,{kind,finalPrompt:config.prompt});
savePostDraft(st,targetIndex,{kind,stage:'prompt',final:{config:JSON.parse(JSON.stringify(config))}});
if(v.sp_imagen_skip_prompt_preview===undefined?runtimeSettings.previewEnabled:v.sp_imagen_skip_prompt_preview!==true){
 progress.set('Проверка перед NovelAI', 'Подтверди готовый промпт. Пока запрос NovelAI не отправлен.');
 const accepted=await previewFinalPrompt(config,{chat:beforeChat,id:beforeId,count:beforeCount,index:targetIndex,kind,message:target});
 if(!accepted){finished=true;progress.close();return 'Отправка в NAI5 отменена';}
}
validateImagePromptLayout(config.prompt,baseKind);
const imagePrompt=config.prompt,cast=Array.isArray(v.sp_imagen_present_ids)?v.sp_imagen_present_ids:[];
savePostDraft(st,targetIndex,{kind,stage:'prompt',final:{config:JSON.parse(JSON.stringify(config))}});
const live = SillyTavern.getContext();
  if (live.chatId !== beforeId || live.chat !== beforeChat || live.chat.length !== beforeCount)
    throw new Error('Imagen: чат изменился во время подготовки');
  live.chatMetadata.variables.sp_imagen_last_final_image_prompt = imagePrompt;
  live.chatMetadata.variables.sp_imagen_last_rendered_ids = cast.join(', ');
  await saveNessGenerationMetadata(live, 'сохранение итогового промпта');
  requireOrigin();
  // The last REAL roleplay message may be either authored by the user or the character.
  // Never attach imagery to hidden GlassPhone entries, meta or a prior IIG-only post.
  if(live.chat[targetIndex]!==target)throw Error('Выбранный RP-пост изменился.');
  // SP Imagen owns the complete image request and publishes to its own gallery.
  const directExtension=spImagenExtension();
  if(!directExtension.directGenerationEnabled?.()){
    throw new Error('SP Imagen генерирует самостоятельно. Проверь подключение NovelAI.');
  }
  requireOrigin();
  progress.submitted(); // The paid request might have reached NovelAI; never promise cancellation.
  const generated=await directExtension.generateImage(config,{signal:imageController.signal});
  requireOrigin();
  if(live.chat[targetIndex]!==target)throw new Error('Целевой RP-пост изменился за время генерации.');
  progress.set('Сохранение изображения', 'Добавляю результат в галерею и жду подтверждения сохранения.', {stoppable:false});
  const stored=await slotManager.publish(targetIndex,kind,generated);
  requireOrigin();
  const persisted=live.chat[targetIndex]?.extra?.ness_media_slots_v2?.[kind]?.versions;
  if(!Array.isArray(persisted)||!persisted.some(item=>item?.src===stored?.src)){
    throw new Error('SP Imagen: сохранение картинки в собственной галерее не подтвердилось.');
  }
  // A fully saved image no longer needs its draft. Keep recovery if chat save is pending.
  if(!stored.savePending)discardPostDraft(live,targetIndex);
  finished=true;
  try{await slotManager.focus(targetIndex,kind,true);}catch(error){console.warn('SP Imagen: gallery focus skipped',error);}
  finished=true;
  if(stored.savePending){
    globalThis.toastr?.warning?.('Картинка добавлена в галерею, но SillyTavern ещё не подтвердил сохранение чата. Не перезагружай страницу, пока не убедишься, что чат сохранился.', 'SP Imagen');
    progress.complete('Изображение добавлено', 'Чат ещё сохраняется. Не обновляй страницу до подтверждения.');
    return 'SP Imagen: изображение добавлено; сохранение чата пока не подтверждено.';
  }
  progress.complete('Изображение готово', 'Сохранено в галерее выбранного RP-поста.');
  return 'SP Imagen: '+kind+' сохранён в слоте RP-поста #'+targetIndex;

}catch(error){
 progress.fail(error);
 throw error;
}finally{
 progress.signal.removeEventListener('abort',userAbort);
 if(originEvent&&onOriginChanged)st.eventSource?.removeListener?.(originEvent,onOriginChanged);
 if(!finished && SillyTavern.getContext().chat===lockedChat && v.sp_imagen_run_ticket===ticket && v.sp_imagen_preview_status==='cancelled'){
   v.sp_imagen_preview_status='approved';
   void saveNessGenerationMetadata(st,'восстановление после ошибки').catch(error=>console.warn('SP Imagen: failed to restore preview',error));
 }
 generationLocks.delete(lockedChat);
}

}

// Module: resume_post
// Resume exactly the stored post. A saved final prompt goes directly to the NAI
// preview; never make another director or composition model request.
async function resumePost(request=null) {
 const st=SillyTavern.getContext();
 if(!request||request.chat!==st.chat||request.chatId!==st.chatId||st.chat?.[request.index]!==request.message)
   throw Error('Чат или RP-пост изменился. Нажми «Продолжить» у сохранённого поста заново.');
 const draft=readPostDraft(st,request.index);
 if(!draft)throw Error('У этого RP-поста нет сохранённого черновика.');
 const kind=draft.kind;
 // A completed draft already holds the final prompt and safe NovelAI snapshot.
 // Deleting its authoring profile must not invalidate a paid-ready draft.
 // Unfinished drafts still require their original profile to parse RP safely.
 if(!draft.final?.config?.prompt?.trim())validateKind(kind);
 const originalChat=st.chat,originalId=st.chatId,post=st.chat[request.index];
 const ensureOrigin=()=>{
  const now=SillyTavern.getContext();
  if(now.chat!==originalChat||now.chatId!==originalId||now.chat?.[request.index]!==post)
    throw Error('Чат или исходный пост изменился; черновик сохранён, отправка отменена.');
 };
 const progress=createSpImagenProgress();
 try{
  const finalConfig=draft.final?.config;
  if(finalConfig?.prompt?.trim()){
   if(generationLocks.has(originalChat)||preparationLocks.has(originalChat))throw Error('Генерация или подготовка уже выполняется.');
   if(!getMediaSlots?.()?.installed)throw Error('Галерея SP Imagen не готова. Обнови страницу.');
   generationLocks.add(originalChat);
   try{
    const config=JSON.parse(JSON.stringify(finalConfig));
    if(config.spImagenDirect?.settings?.apiKey || config.spImagenDirect?.settings?.endpoint)
      throw Error('Черновик содержит параметры подключения, которые нельзя хранить в чате. Сохрани новый черновик без API-ключа.');
    if(!spImagenExtension().directGenerationEnabled?.())throw Error('Проверь подключение NovelAI в SP Imagen.');
    progress.set('Сохранённый промпт', 'Проверь сохранённый текст; режиссёр не вызывается.',{stoppable:false});
    const accepted=await previewFinalPrompt(config,{
     chat:originalChat,id:originalId,count:originalChat.length,index:request.index,kind,message:post
    });
    if(!accepted){progress.close();return 'Черновик оставлен на посте без отправки в NovelAI.';}
    ensureOrigin();
    if(progress.signal.aborted)throw Error('Отменено пользователем. Черновик сохранён.');
    st.chatMetadata.variables ||= {};
    st.chatMetadata.variables.sp_imagen_last_final_image_prompt=config.prompt;
    await saveNessGenerationMetadata(st,'восстановленный финальный промпт');
    ensureOrigin();
    validateImagePromptLayout(config.prompt,kind);
    progress.submitted();
    const output=await spImagenExtension().generateImage(config,{reuseSnapshot:true,signal:progress.signal});
    ensureOrigin();
    progress.set('Сохранение изображения','Добавляю новую версию к исходному RP-посту.',{stoppable:false});
    const manager=getMediaSlots();
    const stored=await manager.publish(request.index,kind,output);
    ensureOrigin();
    const versions=post.extra?.ness_media_slots_v2?.[kind]?.versions;
    if(!Array.isArray(versions)||!versions.some(x=>x.src===stored?.src))
      throw Error('Изображение не подтверждено галереей. Черновик сохранён.');
    discardPostDraft(st,request.index);
    try{await manager.focus(request.index,kind,true);}catch(error){console.warn('[SP Imagen] Could not focus saved image',error);}
    progress.complete('Изображение готово','Сохранено без повторного запроса режиссёру.');
    return 'SP Imagen: восстановленная генерация сохранена в RP-посте #'+request.index;
   }finally{generationLocks.delete(originalChat);}
  }
  if(!draft.parser?.parsedScene)throw Error('Сохранённый черновик не содержит данных сцены. Не удаляй его до проверки.');
  if(preparationLocks.has(originalChat)||generationLocks.has(originalChat))throw Error('Подготовка или генерация уже выполняется.');
  nessGenerationTargets.set(originalChat,{index:request.index,message:post,text:post.mes,chatId:originalId});
  st.chatMetadata.variables ||= {};
  restoreParserToVariables(st.chatMetadata.variables,draft);
  progress.set('Сохранённая сцена','Проверь сохранённые детали и персонажей — повторного сбора постов нет.',{stoppable:false});
  await reviewScene(progress);
  ensureOrigin();
  if(st.chatMetadata.variables.sp_imagen_preview_status!=='approved'){
   progress.close();
   return 'Подготовка остановлена; черновик сохранён.';
  }
  progress.set('Подготовка библиотеки','Подставляю актуальные описания из библиотеки.');
  await prepareLibrary();
  ensureOrigin();
  return await renderImage(kind,progress);
 }catch(error){progress.fail(error);throw error;}
}

// Module: generate_at
// One entry point for post buttons. The request is ephemeral, never stored in chat metadata.
async function generateAt(request=null){
 const st=SillyTavern.getContext();
 if(!request||request.chat!==st.chat||request.chatId!==st.chatId||st.chat[request.index]!==request.message)throw Error('Выбранный пост или чат изменился. Нажми кнопку на посте заново.');
 validateKind(request.kind);
 const existing=readPostDraft(st,request.index);
 if(existing){
   if(!window.confirm('У этого поста есть сохранённый черновик. Начать новую генерацию и заменить его? Чтобы продолжить старую, нажми «Продолжить» под постом.'))return 'Черновик сохранён без изменений.';
   discardPostDraft(st,request.index);
 }
 const progress=createSpImagenProgress();
 const checkStopped=()=>{if(progress.signal.aborted)throw Error('Генерация остановлена пользователем.');};
 try{
  progress.set('Сбор сцены и одежды', 'Читаю настроенное количество RP-постов и актуальный гардероб.');
  await prepareRp(request.kind,request.index,request.includeText);
  checkStopped();
  progress.set('Проверка сцены', 'Проверь подготовленную сцену, одежду и состав персонажей.',{stoppable:false});
  await reviewScene(progress);
  const live=SillyTavern.getContext();
  if(live.chat!==request.chat||live.chatId!==request.chatId)throw Error('Чат изменился.');
  checkStopped();
  if(live.chatMetadata.variables.sp_imagen_preview_status!=='approved'){
   progress.close();
   return 'Генерация отменена';
  }
  progress.set('Подготовка библиотеки', 'Подставляю внешность выбранных персонажей.');
  await prepareLibrary();
  checkStopped();
  return await renderImage(request.kind,progress);
 }catch(error){
  progress.fail(error);
  throw error;
 }
}

// Module: runtime_exports
return {generateAt,resumePost,prepareRp,reviewScene,prepareLibrary,manualPrepare,prepareNpc,selectComposition,renderImage,openLibrary,openSettings,utilities:{inferWardrobeRecordRule,compileNessRule,cleanRpVisualText,normalizeImagePrompt,parseImageHtml,getVisibleRpText,loadGen2Settings,validateGen2Settings,readConfiguredWardrobe,collectConfiguredRp,cleanConfiguredRp,saveGen2Settings,configuredDirectorPrompt,createGen2SettingsPanel,loadMasterLibrary,validateMasterLibrary,libraryEntries,masterLibraryRaw}};

}
