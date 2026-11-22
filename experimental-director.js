import { SP_IMAGEN_PROMPTS } from './official-prompts.js';
/** Experimental one-call director. JS assembles all final NovelAI section separators. */
export const EXPERIMENTAL_DIRECTOR_IDS=Object.freeze({custom_test_snapshot:'snapshot',custom_test_comic:'comic',custom_test_story_page:'story_page'});
const TITLES={snapshot:'Snapshot',comic:'Comic',story_page:'Story Page'};
const SUBJECTS=['boy','girl','cat','other'];
const RATIOS=new Set(['1:1','2:3','3:2','9:16']);
const fail=reason=>{throw new Error('Тестовый режиссёр: '+reason+'. NovelAI не запускался, ответ режиссёра сохранён.');};
const check=(valid,reason)=>{if(!valid)fail(reason);};
export const isExperimentalDirectorId=id=>Object.hasOwn(EXPERIMENTAL_DIRECTOR_IDS,String(id||''));
export function experimentalProfileFor(id){
 if(!isExperimentalDirectorId(id))return null;
 const kind=EXPERIMENTAL_DIRECTOR_IDS[id];
 return {id,name:'🧪 '+TITLES[kind],kind,experimental:true,visible:true,parser:{posts:null,instructions:'',options:{
  includeScene:true,includeCharacters:true,includeWardrobe:true,includeComposition:true,useDialogueSettings:true,useArtStyle:true,useNegativePrompt:true
 }}};
}
const CORE=[
 'Direct one expressive illustration from the supplied roleplay. Plan the entire image coherently and return one JSON object.',
 'JSON schema:',
 '{"schema":"sp-imagen-slots-v1","aspect_ratio":"2:3","opening":"page type, number of panels, overall medium","scene":"brief setting, position and size of each panel, visible background in each panel","borders":"visible panel frames, stroke, shapes, gutters and ornamental details","bubbles":[{"panel":1,"speaker":"speaker name","design":"balloon shape, position, border and tail","words":"exact spoken line"}],"characters":[{"subject":"boy","name":"character or library Prompt name","appearance":"[[NESS_VIS:actual_id:upper_front]] or exact established visible traits","wardrobe":"current clothes","action":"detailed positions, poses, gestures, expressions, gaze and interaction by panel"}],"lettering":[{"panel":1,"design":"visible note, sign or screen location","words":"exact visible inscription"}]}',
 'Use the supplied schema and standard JSON strings. Include every field and use empty arrays where appropriate.',
 'opening: illustration or page format and panel count. The extension calculates subject counts.',
 'scene: concise overall scene and page architecture. Give each panel a short phrase for its position, framing, setting and visible background. Use natural descriptions such as top-left wide panel, narrow inset, bottom full-width panel. Keep one short phrase per panel.',
 'borders: design the actual visible frames around panels, including the edges, outline weight, ink or decorative pattern, gutter width and color, inset treatment and page margins. Give the borders a recognizable visual presence.',
 'characters: one entry per physically present participant. subject is boy, girl, cat or other. appearance uses the authoritative library NESS_VIS marker and NESS_SKIN marker when supplied. wardrobe follows the current outfit. action gives each character’s panel-specific position, movement, posture, hands, eye-lines, expressions, contact, and props in precise visual detail.',
 'bubbles: exact established spoken words with the speaker, panel number and a clearly outlined balloon placed inside that panel, with its tail pointing to the speaker. lettering: exact visible words on a physical object. Preserve original wording and punctuation.',
 'Follow the RP chronology, current scene and composition wishes. Keep all descriptions in English and printed words in their original language.',
 'The extension assembles the subject counts, separators, speech balloon entries and final Text: from these fields. Output the JSON object.'
].join('\n\n');
const PAGE=[
 'Create a {{PAGE_KIND}} from the last {{POST_COUNT}} RP posts with expressive artwork and coherent page layout.',
 'Comic: 2–5 complementary views of one established instant. Story Page: 2–5 panels showing 2–4 established beats in reading order.',
 'Describe each panel’s layout and visible background briefly in scene. Develop expressive gestures and interactions in each character’s action.',
 'Give the page distinctive visible panel frames through borders, suited to the mood and composition.',
 'Select up to {{MAX_LINES}} relevant complete spoken lines, each at most {{MAX_WORDS}} words. Place each balloon in the appropriate panel.',
 '{{TEXT_POLICY}}'
].join('\n\n');
const SNAPSHOT=[
 'Create one cinematic still near the latest established state from the last {{POST_COUNT}} RP posts. One pose/action per person, no montage, panel sequence, speech bubbles or unsupported insets.',
 'Set borders to an empty string unless the scene explicitly requests an illustrated frame. If an actual note/sign/screen is visually important, put its exact words in lettering.'
].join('\n\n');
/**
 * Preserve the shipped NSFW/INTIMACY paragraphs verbatim for experimental
 * profiles. They are extracted from the original official prompts, not copied
 * into a new editable duplicate or rewritten by the experimental director.
 */
export function experimentalLegacyIntimacy(kind){
 const source=SP_IMAGEN_PROMPTS['sp_ness_'+kind+'_director'];
 if(typeof source!=='string')return '';
 const begin=source.indexOf('NSFW / INTIMACY CONTINUITY:');
 if(begin<0)return '';
 const end=kind==='snapshot'
  ?source.indexOf('\nAPPEARANCE AND WARDROBE — SOURCE FIDELITY',begin)
  :source.indexOf('\nOUTPUT CONTRACT',begin);
 if(end<=begin)return '';
 return source.slice(begin,end).trimEnd();
}
const ORDINALS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
/** Remove only technical numbered-list prefixes, never artistic scene content. */
export function normalizeExperimentalSceneLabels(text){
 return String(text).replace(/(^|;\s*|\n+)(\d{1,2})[.)]\s+(?=\S)/gu,
  (full,prefix,index)=>prefix+(ORDINALS[Number(index)-1]||'another')+' panel: ');
}
export function experimentalDirectorPrompt(kind,{includeText=true,postCount=2,maxLines=2,maxWords=10}={}){
 check(Object.values(EXPERIMENTAL_DIRECTOR_IDS).includes(kind),'Неизвестный тестовый формат');
 let choice=kind==='snapshot'?SNAPSHOT:PAGE
  .replaceAll('{{PAGE_KIND}}',kind==='comic'?'comic page':'sequential story page')
  .replaceAll('{{MAX_LINES}}',String(includeText?maxLines:0))
  .replaceAll('{{MAX_WORDS}}',String(maxWords))
  .replaceAll('{{TEXT_POLICY}}',includeText?
   'Use lettering only if spoken or visibly written in the selected RP beat. Reproduce original speech and lettering verbatim.' :
   'TEXT DISABLED: bubbles and lettering MUST both be empty arrays; no speech bubbles, readable writing or captions in the scene.');
 choice=choice.replaceAll('{{POST_COUNT}}',String(postCount));
 const legacy=experimentalLegacyIntimacy(kind);
 const intimacy=legacy?'\n\nFor established adult intimacy, use these original scene and character guidelines:\n'+legacy:'';
 return CORE+'\n\n'+choice+intimacy+'\n\nFINAL: output only one valid JSON object. Silently verify artistic consistency, chronology, identities, bubble tail direction and syntax.';
}
function stringField(obj,key,{empty=false,max=16000}={}){
 const v=obj?.[key];check(typeof v==='string'&&v.length<=max&&(empty||v.trim()),'Поле '+key+' пусто либо слишком длинное');
 return v.trim();
}
function noSyntax(value,field){
 check(!/(\|\s*(?:boy|girl|cat|other)\s*,|\bSpeech bubble\s+\d+\s*:|\bText\s*:)/iu.test(value),'В поле '+field+' попали служебные маркеры промпта');
 check(!value.includes('|'),'В поле '+field+' недопустим разделитель |');
}
function parseJSON(raw){
 let s=String(raw??'').trim();
 if(s.startsWith(String.fromCharCode(96,96,96))){
  s=s.replace(new RegExp('^'+String.fromCharCode(96,96,96)+'(?:json)?\\s*\\r?\\n','iu'),'');
  s=s.replace(new RegExp('\\r?\\n'+String.fromCharCode(96,96,96)+'\\s*$','u'),'').trim();
 }
 try{return JSON.parse(s);}catch(cause){throw new Error('Тестовый режиссёр вернул повреждённый JSON. NovelAI не запускался; исходный ответ сохранён.',{cause});}
}
const boundary=s=>String(s).trim().replace(/[;\s]+$/u,'');

/**
 * Deterministic recovery for unambiguous slot-schema mistakes.
 * Never invent dialogue, border artwork, appearance or model text.
 */
export function normalizeExperimentalDirectorSlots(source){
 check(source&&typeof source==='object'&&!Array.isArray(source),'Ожидается объект JSON');
 const data={...source};
 let repaired=false;
 const note=()=>{repaired=true;};
 const bubbleShape=item=>item&&typeof item==='object'&&!Array.isArray(item)
  &&typeof item.words==='string'&&typeof item.speaker==='string'&&typeof item.design==='string'
  &&item.panel!==undefined;
 const frameShape=item=>typeof item==='string'||item&&typeof item==='object'
  &&!Array.isArray(item)&&typeof item.design==='string'
  &&item.words===undefined&&item.speaker===undefined;
 const frameText=items=>items.map(item=>typeof item==='string'?item.trim():
  (item.panel!==undefined?'panel '+item.panel+': ':'')+item.design.trim()).filter(Boolean).join('; ');
 if(Array.isArray(data.borders)){
  if(data.borders.length===0){data.borders='';note();}
  else if(data.borders.every(bubbleShape)){
   check(data.bubbles===undefined||Array.isArray(data.bubbles),'В поле bubbles некорректный тип');
   const existing=data.bubbles||[];
   const keys=new Set(existing.map(item=>JSON.stringify([item?.panel,item?.speaker,item?.design,item?.words])));
   data.bubbles=[...existing];
   for(const item of data.borders){
    const key=JSON.stringify([item.panel,item.speaker,item.design,item.words]);
    if(!keys.has(key)){data.bubbles.push(item);keys.add(key);}
   }
   data.borders=typeof data.panel_borders==='string'?data.panel_borders:
    typeof data.border_design==='string'?data.border_design:'';
   note();
  }else if(data.borders.every(frameShape)){data.borders=frameText(data.borders);note();}
  else fail('Массив borders смешивает рамки и реплики. Укажи однозначные поля');
 }
 if(data.borders===undefined){
  data.borders=typeof data.panel_borders==='string'?data.panel_borders:
   typeof data.border_design==='string'?data.border_design:'';
  note();
 }
 if(data.bubbles===undefined){
  data.bubbles=Array.isArray(data.speech_bubbles)?data.speech_bubbles:[];
  note();
 }
 if(data.lettering===undefined){
  data.lettering=Array.isArray(data.signs)?data.signs:[];
  note();
 }
 return {data,repaired};
}

export function parseExperimentalDirector(raw,{kind='comic',includeText=true,maxLines=null,maxWords=null}={}){
 const base=EXPERIMENTAL_DIRECTOR_IDS[kind]||kind;
 check(['snapshot','comic','story_page'].includes(base),'Неизвестный тестовый профиль');
 const normalized=normalizeExperimentalDirectorSlots(parseJSON(raw));
 const {data}=normalized;
 check(data&&typeof data==='object'&&!Array.isArray(data)&&data.schema==='sp-imagen-slots-v1','Требуется JSON со schema sp-imagen-slots-v1');
 check(RATIOS.has(data.aspect_ratio),'Неверный aspect_ratio');
 const opening=stringField(data,'opening'),scene=normalizeExperimentalSceneLabels(stringField(data,'scene')),borders=stringField(data,'borders',{empty:true});
 for(const [field,value] of [['opening',opening],['scene',scene],['borders',borders]])noSyntax(value,field);
 check(!/\b\d+\s*(?:boys?|girls?|cats?|others?)\b/iu.test(opening),'Не пиши количество участников в opening: его посчитает расширение');
 check(Array.isArray(data.characters)&&data.characters.length<=16,'characters должен быть массивом до 16 участников');
 check(Array.isArray(data.bubbles)&&data.bubbles.length<=8,'bubbles должен быть массивом до 8 записей');
 check(Array.isArray(data.lettering)&&data.lettering.length<=16,'lettering должен быть массивом до 16 записей');
 if(base==='snapshot')check(data.bubbles.length===0,'У Snapshot не бывает Speech bubbles');
 if(!includeText)check(!data.bubbles.length&&!data.lettering.length,'В режиме без текста поля bubbles и lettering должны быть пустыми');
 if(Number.isInteger(maxLines))check(data.bubbles.length<=maxLines,'Превышен лимит количества реплик');
 const characters=data.characters.map((actor,i)=>{
  check(actor&&typeof actor==='object'&&!Array.isArray(actor),'Некорректный персонаж #'+(i+1));
  check(SUBJECTS.includes(actor.subject),'Неизвестный subject у персонажа #'+(i+1));
  const name=stringField(actor,'name',{max:140}),appearance=stringField(actor,'appearance',{empty:true});
  const wardrobe=stringField(actor,'wardrobe',{empty:true}),action=stringField(actor,'action',{empty:true});
  for(const [field,value] of [['name',name],['appearance',appearance],['wardrobe',wardrobe],['action',action]])noSyntax(value,field);
  check(!/[,;]/u.test(name),'Имя персонажа содержит разделитель');
  return {subject:actor.subject,name,appearance,wardrobe,action};
 });
 check(new Set(characters.map(x=>x.subject+':'+x.name.toLocaleLowerCase())).size===characters.length,'Один персонаж продублирован');
 const readPrinted=(item,i,field)=>{
  check(item&&typeof item==='object'&&!Array.isArray(item),'Некорректный '+field+' #'+(i+1));
  check(Number.isInteger(item.panel)&&item.panel>=1&&item.panel<=10,'Некорректный номер панели '+field+' #'+(i+1));
  const words=stringField(item,'words',{max:1800});
  check(!/[\r\n|]/u.test(words),'words должен содержать одну строку без структурных символов');
  if(field==='bubbles'&&Number.isInteger(maxWords))check((words.match(/\S+/gu)||[]).length<=maxWords,'Реплика длиннее лимита '+maxWords+' слов');
  return words;
 };
 const bubbles=data.bubbles.map((item,i)=>{
  const words=readPrinted(item,i,'bubbles'),speaker=stringField(item,'speaker',{max:140}),design=stringField(item,'design');
  noSyntax(speaker,'speaker');noSyntax(design,'bubble.design');
  return {panel:item.panel,speaker,design,words};
 });
 const lettering=data.lettering.map((item,i)=>{
  const words=readPrinted(item,i,'lettering'),design=stringField(item,'design');
  noSyntax(design,'lettering.design');
  return {panel:item.panel,design,words};
 });
 const count=SUBJECTS.map(subject=>[subject,characters.filter(x=>x.subject===subject).length])
  .filter(([,n])=>n).map(([subject,n])=>n+subject).join(', ');
 const baseText=[[count,opening].filter(Boolean).join(', '),borders?'panel borders: '+borders:'',scene,
  ...lettering.map((x,i)=>'Lettering '+(i+1)+': within panel '+x.panel+', on the actual object, '+boundary(x.design)+', saying '+JSON.stringify(x.words)),
  ...bubbles.map((x,i)=>'Speech bubble '+(i+1)+': within panel '+x.panel+', fully enclosed comic speech balloon with a clearly drawn unbroken outline surrounding the printed dialogue, text INSIDE the balloon, pointed attached tail ending at '+boundary(x.speaker)+'\'s mouth; '+boundary(x.design)+', '+boundary(x.speaker)+' saying '+JSON.stringify(x.words))
 ].map(boundary).filter(Boolean).join('; ');
 const sections=characters.map(x=>'| '+x.subject+', '+x.name
  +(x.appearance?', '+boundary(x.appearance):'')
  +(x.wardrobe?'; '+boundary(x.wardrobe):'')
  +(x.action?'; '+boundary(x.action):''));
 // Preserve exact words. Only order copied Text: fragments by panel reading order.
 const printed=[...lettering.map(x=>({...x,sourceOrder:0})),...bubbles.map(x=>({...x,sourceOrder:1}))]
  .sort((a,b)=>a.panel-b.panel||a.sourceOrder-b.sourceOrder).map(x=>x.words);
 const prompt=[baseText,...sections].filter(Boolean).join(' ')+(printed.length?'\n\nText: '+printed.join('\n\n'):'');
 check(prompt.length<=45000,'Собранный промпт длиннее 45 000 символов');
 return {config:{prompt,aspect_ratio:data.aspect_ratio,image_size:'1K'},repaired:normalized.repaired,experimental:true};
}
