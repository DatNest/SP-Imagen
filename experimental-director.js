import { SP_IMAGEN_PROMPTS } from './official-prompts.js';
/** Built-in one-call JSON director. JS assembles all final NovelAI section separators. */
export const EXPERIMENTAL_DIRECTOR_IDS=Object.freeze({custom_test_snapshot:'snapshot',custom_test_comic:'comic',custom_test_story_page:'story_page'});
const TITLES={snapshot:'Snapshot',comic:'Comic',story_page:'Story Page'};
const SUBJECTS=['boy','girl','cat','dog','other'];
const RATIOS=new Set(['1:1','2:3','3:2','9:16']);
const fail=reason=>{throw new Error('Режиссёр: '+reason+'. NovelAI не запускался, ответ режиссёра сохранён.');};
const check=(valid,reason)=>{if(!valid)fail(reason);};
export const isExperimentalDirectorId=id=>Object.hasOwn(EXPERIMENTAL_DIRECTOR_IDS,String(id||''));
export function experimentalProfileFor(id){
 if(!isExperimentalDirectorId(id)&&!Object.hasOwn(TITLES,id))return null;
 const kind=EXPERIMENTAL_DIRECTOR_IDS[id]||id;
 return {id,name:TITLES[kind],kind,structured:true,visible:true,parser:{posts:null,instructions:'',options:{
  includeScene:true,includeCharacters:true,includeWardrobe:true,includeComposition:true,useDialogueSettings:true,useArtStyle:true,useNegativePrompt:true
 }}};
}
const VISUAL_DENSITY="Use compact, precise tags and short natural-language phrases. Preserve all relevant visual specifics, supplied library markers and exact printed words.";
const ACTION_TAGS="ACTION TAGS\nEnd each interacting character's action field with applicable NovelAI Action Tags, separated by commas. Use Action Tags exclusively for interactions between living characters. Describe interactions with objects, props and surroundings using regular visual tags or short phrases.\nUse paired source#action and target#action for directional interactions, or mutual#action in both participants' entries for reciprocal interactions.\nExamples: source#hug / target#hug; mutual#hug / mutual#hug.\nMatch tags to established visible interactions, participant roles and physical contact. Specify interaction partners and relevant panels through concise natural-language descriptions. Use each applicable Action Tag once per character. Reserve # exclusively for Action Tag syntax.";
const WARDROBE_FIDELITY="CURRENT WARDROBE contains authoritative, ready-to-use garment descriptions. Copy every visible English clothing fragment verbatim, preserving wording, order, punctuation, weights and emphasis syntax. Translate Russian or other non-English clothing fragments faithfully into English, preserving every visible detail, order and emphasis syntax. Omit only complete fragments outside the visible crop or concealed by other garments. Describe established changes in garment state and movement in action. Source fidelity takes priority over conciseness.";
const JSON_SYNTAX='JSON SYNTAX\nReturn one complete valid JSON object. Use double quotes for keys and string delimiters. Escape internal double quotes, backslashes and control characters according to JSON syntax. Keep printed words on one line and preserve their punctuation after decoding. Use standard arrays, objects and numbers. Verify syntax and completeness before returning.';
const CORE=[
 'Direct one expressive illustration from the supplied roleplay. Plan the entire image coherently and return one JSON object matching the structure and descriptive approach of the SAMPLE. Maximize distinct visual information per token in all descriptive fields. '+VISUAL_DENSITY,
 'JSON schema:',
 '{"schema":"sp-imagen-slots-v1","aspect_ratio":"2:3","opening":"page type, number of panels, overall medium","scene":"spatial staging of the panels: layout, camera, visible setting, participants’ relative positions and central shared interaction","borders":"visible panel frames, stroke, shapes, gutters and ornamental details","bubbles":{{BUBBLES_EXAMPLE}},"characters":[{"subject":"boy","name":"character or library Prompt name","appearance":"[[NESS_VIS:actual_id:upper_front]] or exact established visible traits","wardrobe":"current clothes","action":"panel-specific body poses, expressions, gestures, gaze, hand and prop details, clothing/hair movement and individual action"}],"lettering":{{LETTERING_EXAMPLE}}}',
 'Use the supplied schema and standard JSON strings. Include every field and use empty arrays where appropriate.',
 'opening: illustration or page format and panel count. The extension calculates subject counts.{{OPENING_RULE}}',
 'scene: stage the complete visual composition. For each panel, establish its place on the page, camera, visible setting, participants’ relative positions, and the central action or interaction connecting them. Keep clear spatial anchors for the characters and their shared interaction.{{PANEL_RULE}}',
 'borders: design the actual visible frames around panels, including the edges, outline weight, ink; add decorative pattern or physical decorations to the border if composition welcomes it, gutter width and color, inset treatment and page margins. Give the borders a recognizable visual presence. Use one compact sentence for it.',
 'characters: one entry per physically present participant. subject is boy, girl, cat, dog or other. appearance uses the authoritative library NESS_VIS marker and NESS_SKIN marker when supplied. wardrobe: '+WARDROBE_FIDELITY+' action contains each character’s detailed panel-specific body pose, facial expression, hand gesture, eye-line, clothing and hair movement, and handling of props. Reference each panel and the position established in scene to anchor the individual action. In every character entry, explicitly specify a gaze target within the scene: another participant, an object, an event, or a visible direction of attention. Describe established closed eyes where appropriate. Describe visible details rather than poetic surplus.{{CHARACTER_RULE}}',
 ACTION_TAGS,
 '{{BUBBLE_RULE}}',
 '{{LETTERING_RULE}}',
 'Follow the RP chronology, current scene and composition wishes. Keep all visual descriptions in English. {{PRINTED_WORD_RULE}}',
 'Output only the filled out JSON object.{{ASSEMBLY_RULE}}'
].join('\n\n');
const PAGE=[
 'Create one {{PAGE_KIND}} from the last {{POST_COUNT}} RP posts. Return one JSON object matching the SAMPLE. Use compact, precise tags and short natural-language phrases. Group related details and use one precise expression per visual feature, retaining essential panel and speaker anchors. Preserve all relevant visual specifics, supplied library markers and exact printed words.',
 'SOURCE AND CONTINUITY\nUse established RP events, current clothing and its visible state, character identities, and composition requests. Preserve continuity of anatomy, contact, props, and relative positions. Write visual descriptions in English and reproduce selected visible text verbatim in its original language.',
 'PAGE AND PANELS\n{{PAGE_RULE}} Compose expressive panels with purposeful crops, clear reading order, varied framing and scene-appropriate lighting. Use close or medium views for expressions and interaction; widen for spatial clarity or established action.\nopening: page type, panel count and relevant scene tags. Format opening as: {{PAGE_LABEL}}; 3 panels: splash panel, 2 inset panels. Use established Danbooru tags or professional comic panel types, distinct from camera framing. In scene, write Panel N: panel type, framing, description; in character actions, repeat Panel N: panel type.\nscene: one string, with an overall short informative location, lighting and atmosphere description; then Panel 1:, Panel 2:, and subsequent consecutive labels in reading order, separated by semicolons. For each panel, describe its position on the page, camera angle and crop, visible exterior/interior, named participants and their relative positions to each other, and central shared interaction. Keep scene staging spatially coherent across panels.{{BEAT_RULE}} Vary panel framing, camera angle, crop, focal emphasis, and narrative beat across the page, rather than reusing the same shot from panel to panel. Give each panel a distinct action, reaction, or detail. Describe visible details appropriate to the crop rather than poetic surplus.',
 'PAGE DESIGN\nborders: a mandatory non-empty description of visible panel silhouettes, edge irregularities, line weight, ink color or material, inset edges, gutter width and color, outer margins and scene-appropriate ornaments. Describe the neutral decorative page surface outside and between panels, including its color, material and texture. Match the page design to the composition and mood; preserve clear faces, hands, contact points, balloons and reading order. Keep page graphics distinct from the fictional scenery inside the panels. Use one or two short sentences of compact descriptions for borders and space in between them.',
 'CHARACTERS\ncharacters: one entry per distinct visible participant, in order of first appearance. subject: boy, girl, cat, dog or other. name: exact character or library Prompt name. appearance: use the supplied NESS_VIS and NESS_SKIN markers where applicable; otherwise give established visible identifying traits. wardrobe: '+WARDROBE_FIDELITY+' action: Per visible panel, briefly specify relative position, one action (maximum two compatible simultaneous actions), facial expression and gaze target. Include only visible details. In every character entry, explicitly specify a gaze target within the scene: another participant, an object, an event, or a visible direction of attention. Describe established closed eyes where appropriate. For every panel showing the character’s eyes, specify the in-scene gaze target in that character’s action. Keep each character’s details in their own entry.',
 ACTION_TAGS,
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
 return source.slice(begin,end).trimEnd().replace("\nUse concise, affirmative visual descriptions and applicable NovelAI Action Tags to communicate each character's role.",'');
}
const ORDINALS=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
/** Remove only technical numbered-list prefixes, never artistic scene content. */
export function normalizeExperimentalSceneLabels(text){
 return String(text).replace(/(^|;\s*|\n+)(\d{1,2})[.)]\s+(?=\S)/gu,
  (full,prefix,index)=>prefix+(ORDINALS[Number(index)-1]||'another')+' panel: ');
}
// A complete page example uses the same schema and active text policy as the director.
function snapshotSample(includeText){
 return JSON.stringify({
  schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
  opening:'single cinematic illustration, slice of life, romantic atmosphere',
  scene:'Cozy cafe interior, sunny afternoon, warm natural window light; eye-level medium two-shot, Alex seated on the left facing Rita on the right, small wooden table between them, holding hands beside two ceramic mugs, handwritten chalkboard menu in the background, soft window reflections',
  borders:'',bubbles:[],
  characters:[
   {subject:'boy',name:'Alex',appearance:'adult man, dark hair, brown eyes',wardrobe:'blue cable-knit wool sweater, ribbed cuffs, crew neck',action:'eyes on Rita, leaning forward, relaxed shoulders, gentle smile, right hand clasping her left hand on the table, mutual#holding hands'},
   {subject:'girl',name:'Rita',appearance:'adult woman, short brown hair, round glasses',wardrobe:'cream button-front cardigan, scalloped collar, pearl buttons',action:"looking into Alex's eyes, slightly tilted head, warm smile, rosy cheeks, left hand clasping his right hand, right hand holding a ceramic mug, mutual#holding hands"}
  ],
  lettering:includeText?[{panel:1,design:'small handwritten inscription on the background chalkboard, white chalk lettering',words:'Coffee'}]:[]
 },null,2);
}
function pageSample(kind,includeText,maxLines,maxWords) {
 const first=includeText&&maxLines>0, second=first&&kind==='story_page'&&maxLines>1;
 const story=kind==='story_page';
 return JSON.stringify({
  schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
  opening:story?'story page; 2 panels: splash panel, inset panel':'comic page; 2 panels: splash panel, inset panel',
  scene:story?'Cozy cafe interior, sunny afternoon, warm natural daylight, romantic atmosphere; Panel 1: splash panel, upper panel occupying three quarters of the page, wide three-quarter view, Alex on the left approaching Rita on the right beside a sunlit window, Alex offering her a small bouquet of daisies; Panel 2: inset panel, smaller panel slightly overlapping the splash panel at the lower right corner, tight over-the-shoulder view from behind Alex, Rita hugging Alex with one arm while holding the received bouquet':'Sunny day, natural daylight, romantic atmosphere; Panel 1: splash panel, upper side of the page, 3/4 of the page, large upper chest-up two-shot, Alex on the left facing Rita on the right by a sunlit window, embracing each other; Panel 2: inset panel, small panel slightly overlapping splash panel, lower corner of the page, tight over-the-shoulder close-up of Rita looking toward Alex',
  borders:story?'Warm sepia hand-inked borders, softly irregular splash panel outline, torn-paper inset frame, narrow ivory gutters. Neutral textured cream paper beyond panel edges, generous outer margins decorated with delicate hand-drawn daisy motifs.':'warm sepia hand-inked borders with gently irregular strokes, a broad splash panel frame with slightly rounded corners, an inset panel edged like torn cream paper, a neutral, subtly textured ivory paper page background visible beyond the panel edges, in narrow gutters and generous outer margins, delicate hand-drawn window-light flourishes at the page corners',
  bubbles:first?[
   {panel:1,speaker:'Alex',design:'rounded white balloon above Alex, charcoal-like pastel outline, clear dark lettering',words:story&&maxWords>=2?'Это тебе.':'Привет!'},
   ...(second?[{panel:2,speaker:'Rita',design:'small softly rounded cream balloon beside Rita, delicate sepia outline, clear dark lettering',words:maxWords>=2?'Какая прелесть!':'Спасибо!'}]:[])
  ]:[],
  characters:[
   {subject:'boy',name:'Alex',appearance:'adult man, dark hair, brown eyes',wardrobe:'blue cable-knit wool sweater, ribbed cuffs, crew neck',action:story?'Panel 1: splash panel, left of Rita, offering her daisies, nervous smile, looking at her face; Panel 2: inset panel, facing Rita, receiving her embrace, surprised smile, looking at her, target#hug':'Panel 1: splash panel, left of Rita, embracing her waist, '+(first?'speaking to Rita, ':'')+'gentle smile, looking at her, mutual#hug'},
   {subject:'girl',name:'Rita',appearance:'adult woman, short brown hair, round glasses',wardrobe:'cream button-front cardigan, scalloped collar, pearl buttons',action:story?'Panel 1: splash panel, right of Alex, reaching for the bouquet, surprised smile, looking at it; Panel 2: inset panel, facing Alex, holding daisies and hugging him, delighted smile, looking at him, source#hug':'Panel 1: splash panel, right of Alex, hugging him, attentive expression, looking at him; Panel 2: inset panel, facing Alex, warm smile, looking into his eyes, mutual#hug'}
  ],
  lettering:[]
 },null,2);
}
export function experimentalDirectorPrompt(kind,{includeText=true,postCount=2,maxLines=2,maxWords=10}={}){
 check(Object.values(EXPERIMENTAL_DIRECTOR_IDS).includes(kind),'Неизвестный формат');
 const page=kind!=='snapshot', allowBubbles=page&&includeText&&maxLines>0;
 if(page){
  const textRules=includeText?[
   'DIALOGUE AND LETTERING',
   allowBubbles
    ?'bubbles: select up to '+maxLines+' complete, relevant spoken lines of up to '+maxWords+' words each. Both limits apply to the entire page, across all panels combined. Select only complete lines fitting both limits; fewer lines or an empty array are valid. Preserve exact words and punctuation. Use one entry per line in reading order; panel: corresponding integer panel number; speaker: exact name from characters; design: enclosed speech balloon near the speaker, with clear comic-appropriate shape, outline, position and readable lettering, clear of faces and actions; words: verbatim line without added quotes or speaker labels. Use [] when no suitable speech exists. Describe speaking actions in the relevant character entries.'
    :'bubbles: [].',
   'lettering: visible writing on actual objects; panel: corresponding integer panel number; design: object and placement; words: exact inscription. Use [] when absent. Keep all printed words in bubbles or lettering.'
  ].join('\n'):'TEXT DISABLED\nbubbles and lettering MUST both be empty arrays. Use visual acting and composition instead of readable text, captions or speech balloons.';
  const pageRules=PAGE
   .replace('{{PAGE_KIND}}',kind==='comic'?'comic page':'sequential story page')
   .replace('{{PAGE_LABEL}}',kind==='comic'?'comic page':'story page')
   .replace('{{POST_COUNT}}',String(postCount))
   .replace('{{PAGE_RULE}}',kind==='comic'?'Show 2–5 complementary views of one established instant.':'Show 2–5 panels covering 2–4 established beats in chronological reading order.')
   .replace('{{BEAT_RULE}}',kind==='story_page'?' Reflect established changes in actions, expressions, positions and surroundings as events progress.':'')
   .replace('{{TEXT_POLICY}}',textRules);
  const legacy=experimentalLegacyIntimacy(kind);
  return pageRules+(legacy?'\n\n'+legacy:'')+'\n\n'+JSON_SYNTAX+'\n\nSAMPLE:\n'+pageSample(kind,includeText,maxLines,maxWords)+'\n\nReturn one valid JSON object.';
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
 return core+'\n\n'+choice+intimacy+'\n\n'+JSON_SYNTAX+'\n\nSAMPLE:\n'+snapshotSample(includeText)+'\n\nFINAL: output only one valid JSON object matching the SAMPLE structure. Silently verify artistic consistency, chronology, identities and syntax.';
}
function stringField(obj,key,{empty=false,max=16000}={}){
 const v=obj?.[key];check(typeof v==='string'&&v.length<=max&&(empty||v.trim()),'Поле '+key+' пусто либо слишком длинное');
 return v.trim();
}
function noSyntax(value,field){
 check(!/(\|\s*(?:boy|girl|cat|dog|other)\s*,|\bSpeech bubble\s+\d+\s*:|\bText\s*:)/iu.test(value),'В поле '+field+' попали служебные маркеры промпта');
 check(!value.includes('|'),'В поле '+field+' недопустим разделитель |');
}
function parseJSON(raw){
 let s=String(raw??'').trim();
 if(s.startsWith(String.fromCharCode(96,96,96))){
  s=s.replace(new RegExp('^'+String.fromCharCode(96,96,96)+'(?:json)?\\s*\\r?\\n','iu'),'');
  s=s.replace(new RegExp('\\r?\\n'+String.fromCharCode(96,96,96)+'\\s*$','u'),'').trim();
 }
 try{return {data:JSON.parse(s),repaired:false};}catch(cause){
  // Repair only trailing commas and literal control characters inside strings.
  let out='',quoted=false,escaped=false;
  for(let j=0;j<s.length;j++){
   const ch=s[j];
   if(quoted){
    if(escaped){out+=ch;escaped=false;continue;}
    if(ch==='\\'){out+=ch;escaped=true;continue;}
    if(ch==='"'){out+=ch;quoted=false;continue;}
    out+=ch.charCodeAt(0)<32?JSON.stringify(ch).slice(1,-1):ch;
   }else{
    if(ch==='"'){quoted=true;out+=ch;continue;}
    if(ch===','&&/^\s*[}\]]/u.test(s.slice(j+1))&&/[^\s,\[{:]$/u.test(out.trimEnd()))continue;
    out+=ch;
   }
  }
  if(!quoted&&out!==s)try{return {data:JSON.parse(out),repaired:true};}catch{}
  throw new Error('Режиссёр вернул повреждённый JSON. NovelAI не запускался; исходный ответ сохранён.',{cause});
 }
}
const boundary=s=>String(s).trim().replace(/[;\s]+$/u,'');
// Only explicitly numbered panels have a safe insertion boundary. Keep older
// free-form scenes intact rather than guessing where a panel begins or ends.
function numberedPanels(scene) {
 const marks=[...scene.matchAll(/(?:^|;\s*|\n+)Panel\s+(\d{1,2}):\s*/giu)];
 if(!marks.length||marks.some((m,i)=>Number(m[1])!==i+1))return null;
 const intro=boundary(scene.slice(0,marks[0].index));
 const panels=marks.map((m,i)=>({
  panel:i+1,
  description:boundary(scene.slice(m.index+m[0].length,marks[i+1]?.index??scene.length))
 }));
 return panels.every(p=>p.description)?{intro,panels}:null;
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
 check(['snapshot','comic','story_page'].includes(base),'Неизвестный профиль');
 const parsed=parseJSON(raw);
 const normalized=normalizeExperimentalDirectorSlots(parsed.data);
 normalized.repaired ||= parsed.repaired;
 const {data}=normalized;
 check(data&&typeof data==='object'&&!Array.isArray(data)&&data.schema==='sp-imagen-slots-v1','Требуется JSON со schema sp-imagen-slots-v1');
 check(RATIOS.has(data.aspect_ratio),'Неверный aspect_ratio');
 const opening=stringField(data,'opening'),scene=normalizeExperimentalSceneLabels(stringField(data,'scene')),borders=stringField(data,'borders',{empty:true});
 // Page framing is part of the director contract, not an optional decoration.
 // Never silently compile a frameless Comic or Story Page, or invent missing artwork.
 check(base==='snapshot'||Boolean(boundary(borders)),'В поле borders отсутствует описание рамок и фона страницы');
 for(const [field,value] of [['opening',opening],['scene',scene],['borders',borders]])noSyntax(value,field);
 check(!/\b\d+\s*(?:boys?|girls?|cats?|dogs?|others?)\b/iu.test(opening),'Не пиши количество участников в opening: его посчитает расширение');
 check(Array.isArray(data.characters)&&data.characters.length<=16,'characters должен быть массивом до 16 участников');
 const allowBubbles=base!=='snapshot'&&includeText;
 if(allowBubbles)check(Array.isArray(data.bubbles),'bubbles должен быть массивом');
 if(includeText)check(Array.isArray(data.lettering)&&data.lettering.length<=16,'lettering должен быть массивом до 16 записей');
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
  return words;
 };
 const limit=Number.isInteger(maxLines)?Math.max(0,Math.min(8,maxLines)):8;
 const candidates=(allowBubbles?data.bubbles:[]);
 const eligible=candidates.filter(item=>!Number.isInteger(maxWords)||typeof item?.words!=='string'||(item.words.match(/\S+/gu)||[]).length<=maxWords);
 const selected=eligible.slice(0,limit);
 if(selected.length!==candidates.length)normalized.repaired=true;
 const bubbles=selected.map((item,i)=>{
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
  .filter(([,n])=>n).map(([subject,n])=>n+subject+(n===1?'':'s')).join(', ');
 const printedItems=pagePrintedItems(bubbles,lettering);
 const numbered=base==='snapshot'?null:numberedPanels(scene);
 const panels=numbered?.panels;
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
  ?[...prefix,numbered.intro,...panels.map(p=>[
   'Panel '+p.panel+': '+p.description,
   ...printedItems.filter(x=>x.panel===p.panel).map(x=>x.type==='bubble'?panelBubble(x):letterText(x,x.number))
  ].join('; '))]
  :[...prefix,scene,...lettering.map((x,i)=>letterText(x,i+1)),...bubbles.map((x,i)=>legacyBubble(x,i+1))]
 ).map(boundary).filter(Boolean).join('; ');
 const sameName=(a,b)=>a.trim().toLocaleLowerCase()===b.trim().toLocaleLowerCase();
 const sections=characters.map(x=>{
  const unique=characters.filter(a=>sameName(a.name,x.name)).length===1;
  const spokenPanels=panelLocal&&unique?[...new Set(printedItems.filter(b=>b.type==='bubble'&&sameName(b.speaker,x.name)).map(b=>b.panel))]:[];
  const cues=spokenPanels.map(n=>{const label=panels?.[n-1]?.description.match(/^([a-z -]+ panel),/i)?.[1];return 'Panel '+n+': '+(label?label+', ':'')+'visible speech balloon beside '+x.name+", tail pointing toward "+x.name+"'s mouth";});
  const action=boundary(x.action);
  // Preserve the action description; place generated balloon cues before trailing Action Tags.
  const trailing=action.match(/(?:^|,\s*|;\s*)((?:source|target|mutual)#[^,;\r\n]+(?:,\s*(?:source|target|mutual)#[^,;\r\n]+)*)$/iu);
  const body=trailing?boundary(action.slice(0,trailing.index)):action;
  return '| '+x.subject+', '+x.name
   +(x.appearance?', '+boundary(x.appearance):'')
   +(x.wardrobe?'; '+boundary(x.wardrobe):'')
   +(body?'; '+body:'')
   +(cues.length?'; '+cues.join('; '):'')
   +(trailing?(cues.length?'; ':body?', ':'; ')+trailing[1]:'');
 });
 // Exact words are copied once, in the same panel reading order as the visual items.
 const printed=printedItems.map(x=>x.words);
 const prompt=[baseText,...sections].filter(Boolean).join(' ')+(printed.length?'\n\nText: '+printed.join('\n\n'):'');
 check(prompt.length<=45000,'Собранный промпт длиннее 45 000 символов');
 return {config:{prompt,aspect_ratio:data.aspect_ratio,image_size:'1K'},repaired:normalized.repaired,experimental:true};
}
