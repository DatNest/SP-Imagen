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
 'Direct one expressive illustration from the supplied roleplay. Plan the entire image coherently and return one JSON object. Maximize distinct visual information per token in all descriptive fields. Use compact, precise tags for individual visual traits and short natural-language phrases for composition, spatial relationships and interactions. Group related details and use one precise expression per visual feature, retaining essential panel and speaker anchors. Preserve all relevant visual specifics, supplied library markers and exact printed words.',
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
 'Create one {{PAGE_KIND}} from the last {{POST_COUNT}} RP posts. Return one JSON object matching the SAMPLE. Maximize distinct visual information per token in all descriptive fields. Use compact, precise tags for individual visual traits and short natural-language phrases for composition, spatial relationships and interactions. Group related details and use one precise expression per visual feature, retaining essential panel and speaker anchors. Preserve all relevant visual specifics, supplied library markers and exact printed words.',
 'SOURCE AND CONTINUITY\nUse established RP events, current clothing and its visible state, character identities, and composition requests. Preserve continuity of anatomy, contact, props, and relative positions. Write visual descriptions in English and reproduce selected visible text verbatim in its original language.',
 'PAGE AND PANELS\n{{PAGE_RULE}} Compose expressive panels with purposeful crops, clear reading order, varied framing and scene-appropriate lighting. Use close or medium views for expressions and interaction; widen for spatial clarity or established action.\nopening: page type, panel count and relevant scene tags.\nscene: one string, with Panel 1:, Panel 2:, and subsequent consecutive labels in reading order, separated by semicolons. For each panel, describe its position on the page, camera and crop, visible setting, named participants and their relative positions, and central shared interaction. Keep scene staging spatially coherent across panels. Keep attention directed toward people, objects or events within the scene. Describe visible details appropriate to the crop.',
 'PAGE DESIGN\nborders: a non-empty description of visible panel silhouettes, edge irregularities, line weight, ink color or material, inset edges, gutter width and color, outer margins and scene-appropriate ornaments. Describe the neutral decorative page surface outside and between panels, including its color, material and texture. Match the page design to the composition and mood; preserve clear faces, hands, contact points, balloons and reading order. Keep page graphics distinct from the fictional scenery inside the panels.',
 'CHARACTERS\ncharacters: one entry per distinct visible participant, in order of first appearance. subject: boy, girl, cat or other. name: exact character or library Prompt name. appearance: use the supplied NESS_VIS and NESS_SKIN markers where applicable; otherwise give established visible identifying traits. wardrobe: current visible clothing and its established state. action: panel-specific position, body pose, expression, gestures, gaze target, clothing and hair movement, hand and prop details, and named physical interactions. Reference the panel and position established in scene. Keep each character’s details in their own entry.',
 '{{TEXT_POLICY}}',
 'OUTPUT\nUse all SAMPLE fields with their shown JSON types; use empty arrays for absent entries. Keep text and speech bubble tags, cast counts, Text: and pipe separators out of descriptive fields. Return valid JSON only.'
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
  borders:story?'warm sepia hand-inked frames with gently irregular edges, a neutral, subtly textured cream parchment page background visible outside the frames and in the broad gutter between the two beats, a lower inset outlined with a finer double ink stroke and a softly rounded corner, airy outer margins with tiny hand-drawn sunlight motifs':'warm sepia hand-inked borders with gently irregular strokes, a broad upper frame with slightly rounded corners, a smaller overlapping inset edged like torn cream paper, a neutral, subtly textured ivory paper page background visible beyond the panel edges, in narrow gutters and generous outer margins, delicate hand-drawn window-light flourishes at the page corners',
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
 if(page){
  const textRules=includeText?[
   'DIALOGUE AND LETTERING',
   allowBubbles
    ?'bubbles: select up to '+maxLines+' complete, relevant spoken lines of up to '+maxWords+' words each. Preserve exact words and punctuation. Use one entry per line in reading order; panel: corresponding integer panel number; speaker: exact name from characters; design: enclosed speech balloon near the speaker, with clear shape, outline, position and readable lettering, clear of faces and actions; words: verbatim line without added quotes or speaker labels. Use [] when no suitable speech exists. Describe speaking actions in the relevant character entries.'
    :'bubbles: [].',
   'lettering: visible writing on actual objects; panel: corresponding integer panel number; design: object and placement; words: exact inscription. Use [] when absent. Keep all printed words in bubbles or lettering.'
  ].join('\n'):'TEXT DISABLED\nbubbles and lettering MUST both be empty arrays. Use visual acting and composition instead of readable text, captions or speech balloons.';
  const pageRules=PAGE
   .replace('{{PAGE_KIND}}',kind==='comic'?'comic page':'sequential story page')
   .replace('{{POST_COUNT}}',String(postCount))
   .replace('{{PAGE_RULE}}',kind==='comic'?'Show 2–5 complementary views of one established instant.':'Show 2–5 panels covering 2–4 established beats in chronological reading order.')
   .replace('{{TEXT_POLICY}}',textRules);
  const legacy=experimentalLegacyIntimacy(kind);
  return pageRules+(legacy?'\n\n'+legacy:'')+'\n\nSAMPLE:\n'+pageSample(kind,includeText,maxLines)+'\n\nReturn one valid JSON object.';
 }
 const choice=SNAPSHOT.replaceAll('{{POST_COUNT}}',String(postCount));
 const core=CORE
  .replace('{{OPENING_RULE}}','')
  .replace('{{PANEL_RULE}}','')
  .replace('{{CHARACTER_RULE}}','')
  .replace('{{ASSEMBLY_RULE}}','')
  .replace('{{BUBBLES_EXAMPLE}}','[]')
  .replace('{{LETTERING_EXAMPLE}}',includeText
   ?'[{"panel":1,"design":"visible note, sign or screen location","words":"exact visible inscription"}]':'[]')
  .replace('{{BUBBLE_RULE}}','')
  .replace('{{LETTERING_RULE}}',includeText
   ?'lettering: exact visible words on a physical object. Preserve original wording and punctuation.':'')
  .replace('{{PRINTED_WORD_RULE}}',includeText?'Keep visible written words in their original language.':'')
  .replace(/\n{3,}/gu,'\n\n');
 const legacy=experimentalLegacyIntimacy(kind);
 const intimacy=legacy?'\n\nFor established adult intimacy, use these original scene and character guidelines:\n'+legacy:'';
 return core+'\n\n'+choice+intimacy+'\n\nFINAL: output only one valid JSON object. Silently verify artistic consistency, chronology, identities and syntax.';
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
