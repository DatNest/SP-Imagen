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
 'Direct one expressive illustration from the established RP moment. Plan the complete image as a coherent composition, with clear camera framing and emotional storytelling.',
 'Return one JSON object with these fields:',
 '{"schema":"sp-imagen-slots-v1","aspect_ratio":"2:3","opening":"medium and number of panels","scene":"brief panel arrangement, setting, crop and visible backgrounds","borders":"visible panel frames, gutters, corners and ornamental border design","bubbles":[{"panel":1,"speaker":"actual speaker","design":"balloon shape, linework and placement, with a tail to the speaker","words":"exact spoken RP line"}],"characters":[{"subject":"boy","name":"character or library Prompt name","appearance":"[[NESS_VIS:actual_id:upper_front]] or visible fixed appearance","wardrobe":"current clothing","action":"detailed panel-specific poses, gestures, expressions, gaze and interactions"}],"lettering":[{"panel":1,"design":"visible object bearing text and its location","words":"exact text on the object"}]}',
 'opening: image type and page format. The extension adds subject counts. scene: short page-wide setting and panel-by-panel placement, scale, camera crop and visible backgrounds. Reserve specific character movements, facial expressions, hand positions, gaze targets and physical contacts for characters[].action. Give each character a single consistent entry across all panels.',
 'borders: intentional visible design for outer and inner panel frames. Describe stroke weight, color, corner treatment, gutter material, inset edges and decorative flourishes as appropriate. Match the RP mood and composition wishes.',
 'characters: subject is boy, girl, cat or other; one item per visible participant. For library characters, place the supplied [[NESS_VIS:actual_id:preset]] marker once in appearance and the applicable [[NESS_SKIN:id:parts]] marker alongside it. Preserve established visible features and current clothing. Use panel locations in action to keep continuity of pose, expression and interaction.',
 'bubbles: choose meaningful, complete audible RP lines in their original language. The panel number identifies the illustrated moment; design gives the closed balloon, clear outline, text placement and tail to its speaker. lettering contains visible writing on actual objects. The extension places exact words in the terminal Text:.',
 'The RP establishes events, dialogue, character presence and current clothing; the library establishes fixed appearance; composition wishes establish visual framing. Supply valid JSON strings and arrays with every required field. The extension assembles the final image prompt.'
].join('\n\n');
const PAGE=[
 'Create an expressive {{PAGE_KIND}} from the last {{POST_COUNT}} RP posts. Comic presents different views of one established moment; Story Page shows successive established beats.',
 'scene: for each panel give its size, page position, framing and visible setting or background in one or two short phrases. Characters occupy their panel positions; individual actions and expressions are detailed in their own character entries.',
 'borders: use a visible, deliberate panel-frame design, including the outer page border, internal panel edges, gutters and any inset or ornamental corners. Make the graphic framing part of the overall illustration.',
 'Use zero to {{MAX_LINES}} complete relevant spoken lines in bubbles, up to {{MAX_WORDS}} words each. Each bubble belongs to the correct panel and speaker.',
 '{{TEXT_POLICY}}'
].join('\n\n');
const SNAPSHOT=[
 'Create one cinematic still near the latest established state from the last {{POST_COUNT}} RP posts. scene briefly describes the visible setting and camera framing; characters[].action carries expressive poses, gestures and interactions.',
 'Use a decorative borders description when the composition requests a frame. Record any visible text on notes, signs or screens in lettering.'
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
 const intimacy=legacy?'\n\nFor established adult intimacy, apply these original composition and continuity instructions within the JSON fields:\n'+legacy:'';
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
export function parseExperimentalDirector(raw,{kind='comic',includeText=true,maxLines=null,maxWords=null}={}){
 const base=EXPERIMENTAL_DIRECTOR_IDS[kind]||kind;
 check(['snapshot','comic','story_page'].includes(base),'Неизвестный тестовый профиль');
 const data=parseJSON(raw);
 check(data&&typeof data==='object'&&!Array.isArray(data)&&data.schema==='sp-imagen-slots-v1','Требуется JSON со schema sp-imagen-slots-v1');
 check(RATIOS.has(data.aspect_ratio),'Неверный aspect_ratio');
 const opening=stringField(data,'opening'),scene=normalizeExperimentalSceneLabels(stringField(data,'scene')),borders=stringField(data,'borders',{empty:base==='snapshot'});
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
 const frameDesign=borders?(base==='snapshot'?'decorative image frame: ':'comic panel frames and gutters: ')+borders:'';
 const baseText=[[count,opening].filter(Boolean).join(', '),frameDesign,scene,
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
 return {config:{prompt,aspect_ratio:data.aspect_ratio,image_size:'1K'},repaired:false,experimental:true};
}
