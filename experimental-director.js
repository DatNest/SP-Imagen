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
 '{"schema":"sp-imagen-slots-v1","aspect_ratio":"2:3","opening":"page type, number of panels, overall medium","scene":"spatial staging of the panels: layout, camera, visible setting, participants’ relative positions and central shared interaction","borders":"visible panel frames, stroke, shapes, gutters and ornamental details","bubbles":{{BUBBLES_EXAMPLE}},"characters":[{"subject":"boy","name":"character or library Prompt name","appearance":"[[NESS_VIS:actual_id:upper_front]] or exact established visible traits","wardrobe":"current clothes","action":"panel-specific body poses, expressions, gestures, gaze, hand and prop details, clothing/hair movement and individual action"}],"lettering":{{LETTERING_EXAMPLE}}}',
 'Use the supplied schema and standard JSON strings. Include every field and use empty arrays where appropriate.',
 'opening: illustration or page format and panel count. The extension calculates subject counts.{{OPENING_RULE}}',
 'scene: stage the complete visual composition. For each panel, establish its place on the page, camera, visible setting, participants’ relative positions, and the central action or interaction connecting them. Keep clear spatial anchors for the characters and their shared interaction.{{PANEL_RULE}}',
 'borders: design the actual visible frames around panels, including the edges, outline weight, ink or decorative pattern, gutter width and color, inset treatment and page margins. Give the borders a recognizable visual presence.',
 'characters: one entry per physically present participant. subject is boy, girl, cat or other. appearance uses the authoritative library NESS_VIS marker and NESS_SKIN marker when supplied. wardrobe follows the current outfit. action contains each character’s detailed panel-specific body pose, facial expression, hand gesture, eye-line, clothing and hair movement, and handling of props. Reference each panel and the position established in scene to anchor the individual action.{{CHARACTER_RULE}}',
 '{{BUBBLE_RULE}}',
 '{{LETTERING_RULE}}',
 'Follow the RP chronology, current scene and composition wishes. Keep all visual descriptions in English. {{PRINTED_WORD_RULE}}',
 'The extension assembles subject counts, separators and the final image prompt from these fields.{{ASSEMBLY_RULE}} Output the JSON object.'
].join('\n\n');
const PAGE=[
 'Create a {{PAGE_KIND}} from the last {{POST_COUNT}} RP posts with expressive artwork and coherent page layout.',
 'Comic: 2–5 complementary views of one established instant. Story Page: 2–5 panels showing 2–4 established beats in reading order.',
 'Keep the shared interaction and participants’ relative positions spatially coherent across panels, including changes in camera and visible background.',
 'Give the page distinctive visible panel frames through borders, suited to the mood and composition. For every Comic and Story Page, including pages without lettering, borders is a required non-empty artistic description of the actual panel frames: their silhouettes and irregularities, line weight and ink color or material, gutter width and color, inset edges, page margins, and any scene-appropriate ornaments. Explicitly describe the visible page background or substrate behind and between the panels, its color, material, texture and decorative treatment; this is the page itself, not the background inside each scene. Design these together with the panel composition; describe how different panel frames vary when appropriate. Use concrete visual details rather than a generic label such as thin ink frames. Keep this complete frame design in borders, separate from speech balloons and scene staging.',
 '{{TEXT_POLICY}}'
].join('\n\n');
const SNAPSHOT=[
 'Create one cinematic still near the latest established state from the last {{POST_COUNT}} RP posts. Keep the visible setting, camera, lighting and participants’ relative positions clear in scene, with a central shared interaction. Use the character actions for precise poses, expressions, gaze and gestures within that single instant.',
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
// A complete page example uses the same schema and active text policy as the director.
function pageSample(kind,includeText,maxLines) {
 const first=includeText&&maxLines>0, second=first&&kind==='story_page'&&maxLines>1;
 const story=kind==='story_page';
 return JSON.stringify({
  schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
  opening:story?'2 panels, sequential story page':'2 panels, expressive comic page',
  scene:'Panel 1: large upper chest-up two-shot, Alex on the left facing Rita on the right by a sunlit window; Panel 2: small lower close-up of Rita looking toward Alex',
  borders:story?'warm sepia hand-inked frames with gently irregular edges, a textured cream parchment page background visible in the broad gutter between the two beats, a lower inset outlined with a finer double ink stroke and a softly rounded corner, airy outer margins with tiny hand-drawn sunlight motifs':'warm sepia hand-inked borders with gently irregular strokes, a broad upper frame with slightly rounded corners, a smaller overlapping inset edged like torn cream paper, a subtly textured ivory paper page background visible in narrow gutters and generous outer margins, delicate hand-drawn window-light flourishes at the page corners',
  bubbles:first?[
   {panel:1,speaker:'Alex',design:'rounded white balloon in the upper left, thin dark outline, clear dark lettering',words:'Привет!'},
   ...(second?[{panel:2,speaker:'Rita',design:'small oval balloon above Rita, clear dark lettering',words:'Привет.'}]:[])
  ]:[],
  characters:[
   {subject:'boy',name:'Alex',appearance:'adult man, dark hair, brown eyes',wardrobe:'blue sweater',action:'Panel 1: '+(first?'speaking to Rita, ':'')+'gentle smile, eyes on Rita'},
   {subject:'girl',name:'Rita',appearance:'adult woman, short brown hair, round glasses',wardrobe:'cream cardigan',action:'Panel 1: facing Alex, attentive expression; Panel 2: '+(second?'answering Alex, ':'')+'smiling toward Alex'}
  ],
  lettering:[]
 },null,2);
}
export function experimentalDirectorPrompt(kind,{includeText=true,postCount=2,maxLines=2,maxWords=10}={}){
 check(Object.values(EXPERIMENTAL_DIRECTOR_IDS).includes(kind),'Неизвестный тестовый формат');
 const page=kind!=='snapshot', allowBubbles=page&&includeText&&maxLines>0;
 const textPolicy=includeText
  ?'Select up to {{MAX_LINES}} relevant complete spoken lines, each at most {{MAX_WORDS}} words. Limits are ceilings, not quotas. Put each selected line in bubbles for the panel that shows its speaker. If the limit is zero or no suitable spoken line exists, use an empty bubbles array. Use lettering only for visible writing on actual objects in the selected RP beat. Reproduce original speech and lettering verbatim.'
  :'TEXT DISABLED: bubbles and lettering MUST both be empty arrays; no speech bubbles, readable writing or captions in the scene.';
 let choice=kind==='snapshot'?SNAPSHOT:PAGE
  .replaceAll('{{PAGE_KIND}}',kind==='comic'?'comic page':'sequential story page')
  .replaceAll('{{TEXT_POLICY}}',textPolicy)
  .replaceAll('{{MAX_LINES}}',String(maxLines))
  .replaceAll('{{MAX_WORDS}}',String(maxWords));
 choice=choice.replaceAll('{{POST_COUNT}}',String(postCount));
 const core=CORE
  .replace('{{OPENING_RULE}}',page?' Leave text and speech bubble tags to the extension.':'')
  .replace('{{PANEL_RULE}}',page?' Use exactly one numbered Panel N: label for each panel, starting at Panel 1: and continuing in reading order; separate the panel descriptions with semicolon and space. Keep scene a single JSON string. Put all visual staging in these descriptions, without a separate introduction or repeated panel labels.':'')
  .replace('{{CHARACTER_RULE}}',page?' For a speaker, describe the actual speaking action in the correct panel. Keep balloon design and printable words exclusively in the dedicated fields, not in character descriptions.':'')
  .replace('{{ASSEMBLY_RULE}}',page?' The extension inserts each printed item inside its own panel and binds the balloon visually to its speaker; it creates one final Text: block in reading order. Never write Text: or pipe separators in any field.':'')
  .replace('{{BUBBLES_EXAMPLE}}',allowBubbles
   ?'[{"panel":1,"speaker":"Alex","design":"rounded white balloon above Alex, thin ink outline, clear dark lettering","words":"Привет!"}]':'[]')
  .replace('{{LETTERING_EXAMPLE}}',includeText
   ?'[{"panel":1,"design":"visible note, sign or screen location","words":"exact visible inscription"}]':'[]')
  .replace('{{BUBBLE_RULE}}',allowBubbles
   ?'bubbles: one object per selected spoken line, in page reading order. panel is the exact integer N from the corresponding Panel N: in scene. speaker must exactly match the visible character name in characters. design describes a visibly enclosed comic speech balloon, its position near the speaker, shape, outline and readable lettering; the extension adds the tail toward the speaker and the words. Put only the exact spoken line in words, without additional quotation marks or speaker labels. Keep bubbles clear of faces and actions; silent panels have no bubble entry.':'')
  .replace('{{LETTERING_RULE}}',includeText
   ?'lettering: exact visible words on a physical object. Preserve original wording and punctuation.'+ (page?' Match panel to the numbered scene panel; put the visual placement in design and the exact inscription only in words.':''):'')
  .replace('{{PRINTED_WORD_RULE}}',includeText?'Keep visible written words in their original language.':'')
  .replace(/\n{3,}/gu,'\n\n');
 const legacy=experimentalLegacyIntimacy(kind);
 const intimacy=legacy?'\n\nFor established adult intimacy, use these original scene and character guidelines:\n'+legacy:'';
 return core+'\n\n'+choice+(page?'\n\nSAMPLE (format only; use the actual RP, never the example cast or dialogue):\n'+pageSample(kind,includeText,maxLines):'')+intimacy+'\n\nFINAL: output only one valid JSON object. Silently verify artistic consistency, chronology, identities'+(allowBubbles?', bubble tail direction':'')+' and syntax.';
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
// Only explicitly numbered panels have a safe insertion boundary. Keep older
// free-form scenes intact rather than guessing where a panel begins or ends.
function numberedPanels(scene) {
 const marks=[...scene.matchAll(/(?:^|;\s*|\n+)Panel\s+(\d{1,2}):\s*/giu)];
 if(!marks.length||marks[0].index!==0||marks.some((m,i)=>Number(m[1])!==i+1))return null;
 const panels=marks.map((m,i)=>({
  panel:i+1,
  description:boundary(scene.slice(m.index+m[0].length,marks[i+1]?.index??scene.length))
 }));
 return panels.every(p=>p.description)?panels:null;
}
function pagePrintedItems(bubbles,lettering) {
 let bubbleNumber=0,letterNumber=0;
 return [
  ...lettering.map(x=>({...x,type:'lettering'})),
  ...bubbles.map(x=>({...x,type:'bubble'}))
 ].sort((a,b)=>a.panel-b.panel||Number(a.type==='bubble')-Number(b.type==='bubble'))
  .map(x=>({...x,number:x.type==='bubble'?++bubbleNumber:++letterNumber}));
}

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
 // Page framing is part of the director contract, not an optional decoration.
 // Never silently compile a frameless Comic or Story Page, or invent missing artwork.
 check(base==='snapshot'||Boolean(boundary(borders)),'В поле borders отсутствует описание рамок и фона страницы');
 for(const [field,value] of [['opening',opening],['scene',scene],['borders',borders]])noSyntax(value,field);
 check(!/\b\d+\s*(?:boys?|girls?|cats?|others?)\b/iu.test(opening),'Не пиши количество участников в opening: его посчитает расширение');
 check(Array.isArray(data.characters)&&data.characters.length<=16,'characters должен быть массивом до 16 участников');
 const allowBubbles=base!=='snapshot'&&includeText;
 if(allowBubbles)check(Array.isArray(data.bubbles)&&data.bubbles.length<=8,'bubbles должен быть массивом до 8 записей');
 if(includeText)check(Array.isArray(data.lettering)&&data.lettering.length<=16,'lettering должен быть массивом до 16 записей');
 if(allowBubbles&&Number.isInteger(maxLines))check(data.bubbles.length<=maxLines,'Превышен лимит количества реплик');
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
 const bubbles=(allowBubbles?data.bubbles:[]).map((item,i)=>{
  const words=readPrinted(item,i,'bubbles'),speaker=stringField(item,'speaker',{max:140}),design=stringField(item,'design');
  noSyntax(speaker,'speaker');noSyntax(design,'bubble.design');
  return {panel:item.panel,speaker,design,words};
 });
 const lettering=(includeText?data.lettering:[]).map((item,i)=>{
  const words=readPrinted(item,i,'lettering'),design=stringField(item,'design');
  noSyntax(design,'lettering.design');
  return {panel:item.panel,design,words};
 });
 const count=SUBJECTS.map(subject=>[subject,characters.filter(x=>x.subject===subject).length])
  .filter(([,n])=>n).map(([subject,n])=>n+subject).join(', ');
 const printedItems=pagePrintedItems(bubbles,lettering);
 const panels=base==='snapshot'?null:numberedPanels(scene);
 const panelLocal=panels&&printedItems.every(x=>x.panel<=panels.length);
 const prefix=[[count,opening].filter(Boolean).join(', ')];
 if(panelLocal&&printedItems.length) {
  const tags=bubbles.length?['text','speech bubble']:['text'];
  const openingTags=new Set(opening.split(/[,;]/u).map(x=>x.trim().toLowerCase()));
  const missing=tags.filter(tag=>!openingTags.has(tag)&&!(tag==='speech bubble'&&openingTags.has('speech bubbles')));
  if(missing.length)prefix.push(missing.join(', '));
 }
 if(borders)prefix.push('panel borders: '+borders);
 const letterText=(x,i)=>'Lettering '+i+': within panel '+x.panel+', on the actual object, '+boundary(x.design)+', saying '+JSON.stringify(x.words);
 const legacyBubble=(x,i)=>'Speech bubble '+i+': In panel '+x.panel+', a visible, outlined comic speech bubble beside '+boundary(x.speaker)+"'s face containing "+JSON.stringify(x.words)+'; '+boundary(x.design)+"; the attached tail points to "+boundary(x.speaker)+"'s mouth";
 const panelBubble=x=>'Speech bubble '+x.number+': In panel '+x.panel+', '+boundary(x.design)+", tail pointing toward "+boundary(x.speaker)+"'s mouth, saying "+JSON.stringify(x.words);
 const baseText=(panelLocal
  ?[...prefix,...panels.map(p=>[
   'Panel '+p.panel+': '+p.description,
   ...printedItems.filter(x=>x.panel===p.panel).map(x=>x.type==='bubble'?panelBubble(x):letterText(x,x.number))
  ].join('; '))]
  :[...prefix,scene,...lettering.map((x,i)=>letterText(x,i+1)),...bubbles.map((x,i)=>legacyBubble(x,i+1))]
 ).map(boundary).filter(Boolean).join('; ');
 const sameName=(a,b)=>a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase();
 const sections=characters.map(x=>{
  const unique=characters.filter(a=>sameName(a.name,x.name)).length===1;
  const spokenPanels=panelLocal&&unique?[...new Set(printedItems.filter(b=>b.type==='bubble'&&sameName(b.speaker,x.name)).map(b=>b.panel))]:[];
  const cues=spokenPanels.map(n=>'Panel '+n+': visible speech balloon beside '+x.name+", tail pointing toward "+x.name+"'s mouth");
  return '| '+x.subject+', '+x.name
   +(x.appearance?', '+boundary(x.appearance):'')
   +(x.wardrobe?'; '+boundary(x.wardrobe):'')
   +(x.action?'; '+boundary(x.action):'')
   +(cues.length?'; '+cues.join('; '):'');
 });
 // Exact words are copied once, in the same panel reading order as the visual items.
 const printed=printedItems.map(x=>x.words);
 const prompt=[baseText,...sections].filter(Boolean).join(' ')+(printed.length?'\n\nText: '+printed.join('\n\n'):'');
 check(prompt.length<=45000,'Собранный промпт длиннее 45 000 символов');
 return {config:{prompt,aspect_ratio:data.aspect_ratio,image_size:'1K'},repaired:normalized.repaired,experimental:true};
}
