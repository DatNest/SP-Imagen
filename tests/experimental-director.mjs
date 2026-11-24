import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {experimentalProfileFor,experimentalDirectorPrompt,parseExperimentalDirector,normalizeExperimentalDirectorSlots,normalizeExperimentalSceneLabels,experimentalLegacyIntimacy,EXPERIMENTAL_DIRECTOR_IDS} from '../experimental-director.js';
import {generationFormats,baseKindFor} from '../profiles.js';
import {pageTextEnabled} from '../page-text-mode.js';
import {validateImagePromptLayout} from '../image-prompt.js';
import {insertVisibleAppearance} from '../appearance-visibility.js';
import {defaultNovelAISettings,generateNovelAI} from '../novelai.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sample=()=>({
 schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
 opening:'3 panels, expressive comic page',
 scene:'top wide panel: afternoon office window and skyline; narrow middle inset: warm window light; bottom panel: quiet corridor background',
 borders:'irregular sepia ink outlines, delicate flower corners, cream parchment gutters and soft torn-paper inset edges',
 bubbles:[{panel:2,speaker:'Clark Kent',design:'upper-right cream balloon with thin black ink border, tail pointing to Clark',words:'Ты слышишь меня?'}],
 characters:[
  {subject:'boy',name:'Clark Kent',appearance:'[[NESS_VIS:clark:upper_front]]',wardrobe:'blue sweater with rolled sleeves',action:'Panel 1: hand resting on Ness shoulder, concerned eyes fixed on Ness'},
  {subject:'girl',name:'Ness',appearance:'[[NESS_VIS:ness:upper_front]]',wardrobe:'cream cardigan',action:'Panel 1: looking at Clark, both hands curled around his wrist'}
 ],
 lettering:[{panel:1,design:'a visible yellow sticky note on the desk',words:'Hi'}]
});

test('Test profiles are an additive opt-in; OFF hides them without removing original formats',()=>{
 const off=generationFormats({customProfiles:[],visibleBuiltIns:{},experimentalModeEnabled:false},{visibleOnly:true});
 assert.deepEqual(off.map(x=>x.id),['snapshot','comic','story_page']);
 const on=generationFormats({customProfiles:[],visibleBuiltIns:{},experimentalModeEnabled:true},{visibleOnly:true});
 assert.deepEqual(on.slice(0,3).map(x=>x.id),['snapshot','comic','story_page']);
 assert.deepEqual(on.slice(-3).map(x=>x.id),Object.keys(EXPERIMENTAL_DIRECTOR_IDS));
 assert.equal(baseKindFor({},'custom_test_comic'),'comic');
 assert.equal(experimentalProfileFor('custom_test_story_page').kind,'story_page');
 assert.equal(pageTextEnabled('custom_test_comic',false),false);
 assert.equal(pageTextEnabled('custom_test_story_page',true),true);
});

test('Single director prompt requests expressive panels, borders and the JSON contract',()=>{
 for(const kind of ['snapshot','comic','story_page']){
  const p=experimentalDirectorPrompt(kind,{postCount:4,maxLines:3,maxWords:10});
  assert.match(p,/sp-imagen-slots-v1/);
  assert.match(p,/borders/);
  assert.match(p,/last 4 RP posts/);
  assert.match(p,/one JSON object/i);
  assert.doesNotMatch(p,/<image_lite>/);
 }
 const noText=experimentalDirectorPrompt('comic',{includeText:false,maxLines:2});
 assert.match(noText,/MUST both be empty/);
});

test('Valid artistic slots produce stable exact output order without rephrasing or a second request',()=>{
 const slots=sample(),raw=JSON.stringify(slots);
 const result=parseExperimentalDirector(raw,{kind:'custom_test_comic',includeText:true,maxLines:2,maxWords:10});
 const prompt=result.config.prompt;
 assert.deepEqual(result.config.aspect_ratio,'2:3');
 assert.ok(prompt.startsWith('1boy, 1girl, 3 panels, expressive comic page;'));
 assert.ok(prompt.indexOf('cream parchment gutters')<prompt.indexOf('Speech bubble 1:'));
 assert.ok(prompt.indexOf('Speech bubble 1:')<prompt.indexOf('| boy, Clark Kent'));
 assert.ok(prompt.indexOf('| boy, Clark Kent')<prompt.indexOf('| girl, Ness'));
 assert.ok(prompt.indexOf('| girl, Ness')<prompt.indexOf('\n\nText:'));
 assert.ok(prompt.endsWith('Text: Hi\n\nТы слышишь меня?'));
 assert.match(prompt,/\[\[NESS_VIS:clark:upper_front\]\]/);
 assert.match(prompt,/both hands curled around his wrist/);
 assert.equal(validateImagePromptLayout(prompt,'comic'),prompt);
 assert.deepEqual(slots,sample(),'The director JSON must remain unchanged');
 assert.equal(JSON.stringify(slots),raw);
});

test('Library visibility injection remains compatible with test character sections',()=>{
 const prompt=parseExperimentalDirector(JSON.stringify(sample()),{kind:'comic'}).config.prompt;
 const records=new Map([
  ['clark',{name:'Clark Kent',base:'blue eyes, black hair',appearanceFormat:'tags',appearanceRanges:[],appearanceSelections:{}}],
  ['ness',{name:'Ness',base:'round glasses, freckles',appearanceFormat:'tags',appearanceRanges:[],appearanceSelections:{}}]
 ]);
 const result=insertVisibleAppearance(prompt,records);
 assert.match(result,/blue eyes, black hair/);
 assert.match(result,/round glasses, freckles/);
 assert.doesNotMatch(result,/\[\[NESS_VIS:/);
 assert.doesNotMatch(result,/;;/);
 assert.ok(result.endsWith('Text: Hi\n\nТы слышишь меня?'));
});

test('Textless Comic and Story Page request empty printed fields and omit unexpected text',()=>{
 for(const kind of ['comic','story_page']){
  const prompt=experimentalDirectorPrompt(kind,{includeText:false,maxLines:2,maxWords:10});
  assert.match(prompt,/"bubbles":\[\]/);
  assert.match(prompt,/"lettering":\[\]/);
  assert.doesNotMatch(prompt,/Select up to|speaker name|balloon shape, position|bubble tail direction/);
  assert.match(prompt,/TEXT DISABLED/);
  const slots=sample(),raw=JSON.stringify(slots);
  const result=parseExperimentalDirector(raw,{kind,includeText:false,maxLines:0,maxWords:0});
  assert.ok(!result.config.prompt.includes('Speech bubble '));
  assert.ok(!result.config.prompt.includes('Lettering '));
  assert.ok(!result.config.prompt.includes('Text:'));
  assert.ok(result.config.prompt.includes(slots.scene));
  assert.deepEqual(slots,sample(),'Unexpected model text must be excluded without mutating its response');
  assert.equal(validateImagePromptLayout(result.config.prompt,kind),result.config.prompt);
 }
});

test('Corrupted, invalid or incomplete model slot JSON is rejected without fabrication',()=>{
 assert.throws(()=>parseExperimentalDirector('{"schema":"sp-imagen-slots-v1",'),/JSON/);
 let slots=sample();delete slots.characters;
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots)),/characters/);
 slots=sample();slots.opening='1boy, 1girl, 3 panels';
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots)),/opening/);
 slots=sample();slots.bubbles[0].words='Длинная фраза для ограничения слов';
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots),{maxWords:2}),/лимита/);
 slots=sample();slots.scene+=' | boy, Fake';
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots)),/служебные маркеры/);
 slots=sample();slots.characters.push({...slots.characters[0]});
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots)),/продублирован/);
 slots=sample();
 const snapshot=parseExperimentalDirector(JSON.stringify(slots),{kind:'snapshot'});
 assert.ok(!snapshot.config.prompt.includes('Speech bubble 1:'));
 assert.ok(snapshot.config.prompt.endsWith('Text: Hi'));
});

test('Snapshot schema never requests speech and ignores a model-supplied balloon',()=>{
 const rules=experimentalDirectorPrompt('snapshot',{includeText:true,postCount:3});
 assert.match(rules,/"bubbles":\[\]/);
 assert.doesNotMatch(rules,/Select up to|speaker name|bubble tail direction|bubbles: give each spoken line/);
 const data=sample();data.bubbles=[{panel:1,speaker:'Ness',design:'oval',words:'Не нужно показывать'}];
 const result=parseExperimentalDirector(JSON.stringify(data),{kind:'custom_test_snapshot',includeText:true,maxLines:0,maxWords:0});
 assert.ok(!result.config.prompt.includes('Не нужно показывать'));
 assert.ok(!result.config.prompt.includes('Speech bubble'));
 assert.ok(result.config.prompt.endsWith('Text: Hi'),'A genuine written note remains allowed in Snapshot');
 assert.equal(validateImagePromptLayout(result.config.prompt,'snapshot'),result.config.prompt);
});

test('Test mode is controlled in the star menu and leaves the legacy output parser untouched',()=>{
 const index=read('index.js'),menu=read('media-slots.js'),runtime=read('runtime.js');
 assert.match(index,/experimentalModeEnabled \?\?= false/);
 assert.match(index,/setExperimentalMode\(enabled\)/);
 assert.match(menu,/Тест: ON/);
 assert.match(menu,/Тест: OFF/);
 assert.match(menu,/setExperimentalMode/);
 assert.match(runtime,/parseExperimentalDirector\(raw/);
 assert.match(runtime,/experimental\s*\?\s*parseExperimentalDirector/);
 assert.match(runtime,/if\(!experimental\)config.prompt=normalizeImagePrompt/);
 assert.match(runtime,/if\(useDialogueSettings&&!experimental\)/);
 assert.match(runtime,/if\(npcLanguage&&!experimental\)/);
 assert.match(runtime,/:parseImageHtml\(raw\)/);
});


test('Speech balloons are physically enclosed and anchored to their actual panel, not subtitles',()=>{
 const data=sample();data.bubbles=[{panel:3,speaker:'Ness',design:'at upper right, tail to Ness',words:'Ну как? Сойдёт?'}];
 const result=parseExperimentalDirector(JSON.stringify(data),{kind:'story_page'}),prompt=result.config.prompt;
 assert.match(prompt,/Speech bubble 1: In panel 3, a visible, outlined comic speech bubble beside Ness's face containing "Ну как\? Сойдёт\?"/);
 assert.match(prompt,/at upper right, tail to Ness/);
 assert.match(prompt,/the attached tail points to Ness's mouth/);
 assert.match(prompt,/at upper right, tail to Ness/);
 assert.match(prompt,/Text: Hi\n\nНу как\? Сойдёт\?$/);
 assert.equal(validateImagePromptLayout(prompt,'story_page'),prompt);
 assert.equal(prompt.split('Ну как? Сойдёт?').length-1,2,'Dialogue appears once in the visual balloon description and once in terminal Text:');
});

test('Art director asks for expressive natural panel prose without numbered-list syntax',()=>{
 const input='1) Large establishing panel: sunlit courtyard; 2) Quiet inset: hand holding staff; \n3) Wide panel: river';
 const normalized=normalizeExperimentalSceneLabels(input);
 assert.equal(normalized,'first panel: Large establishing panel: sunlit courtyard; second panel: Quiet inset: hand holding staff; \nthird panel: Wide panel: river');
 const slots=sample();slots.scene=input;
 const result=parseExperimentalDirector(JSON.stringify(slots),{kind:'story_page'});
 assert.match(result.config.prompt,/first panel: Large establishing panel/);
 assert.doesNotMatch(result.config.prompt,/(?:^|;\s*)\d+\)\s/u);
 assert.match(experimentalDirectorPrompt('comic'),/spatially coherent across panels/);
 assert.match(experimentalDirectorPrompt('story_page'),/spatially coherent across panels/);
});

test('All original explicit intimacy guidelines are included verbatim in test modes only',()=>{
 const defaults=read('official-prompts.js');
 for(const kind of ['snapshot','comic','story_page']){
  const exact=experimentalLegacyIntimacy(kind);
  assert.ok(exact.length>1400,kind);
  assert.ok(experimentalDirectorPrompt(kind).includes(exact),kind+' exact original block');
  assert.match(exact,/NSFW \/ INTIMACY CONTINUITY:/);
  assert.match(defaults,/SP_IMAGEN_PROMPTS/);
  if(kind!=='snapshot')assert.match(exact,/INTIMATE COMIC COMPOSITION:/);
 }
 const unmodified=read('official-prompts.js');
 assert.equal(unmodified,defaults,'Original prompts remain unchanged');
 const original=experimentalDirectorPrompt('comic');
 assert.ok(original.includes(experimentalLegacyIntimacy('comic')));
});


test('All test formats keep spatial scene staging and fine character details in their dedicated fields',()=>{
 const stagedScene='Top wide panel: a sunny courtyard with laundry and a wooden porch, Ji stands by the railing above Aang, seen from a low angle. She makes a playful twirl toward him while he looks up, caught off guard by her smile. Bottom inset: a close view of their hands as Aang reaches to take her hand.';
 const preciseAction='Panel 1: Aang blushes, his fingers gripping his staff while his gaze stays on Ji; the folds of his robe shift as he leans forward.';
 for(const kind of ['snapshot','comic','story_page']){
  const instructions=experimentalDirectorPrompt(kind,{postCount:4});
  assert.match(instructions,kind==='snapshot'?/scene: stage the complete visual composition/:/scene: one string/);
  assert.match(instructions,/participants[’']? (?:and their )?relative positions/);
  assert.match(instructions,kind==='snapshot'?/central action or interaction connecting them/:/central shared interaction/);
  assert.match(instructions,kind==='snapshot'?/action contains each character’s detailed panel-specific body pose, facial expression, hand gesture, eye-line, clothing and hair movement, and handling of props/:/action: panel-specific position, body pose, expression, gestures, gaze target, clothing and hair movement, hand and prop details/);
  assert.doesNotMatch(instructions,/two focused sentences|roughly two purposeful sentences|a few focused sentences|Keep one short phrase per panel/);
  if(kind==='snapshot')assert.match(instructions,/participants’ relative positions clear in scene/);
  else assert.match(instructions,/spatially coherent across panels/);
   assert.match(instructions,/Reference (?:each|the) panel and (?:the )?position established in scene/);
  const data=sample();
  data.scene=stagedScene;
  if(kind==='snapshot')data.bubbles=[];
  data.characters[0].action=preciseAction;
  const result=parseExperimentalDirector(JSON.stringify(data),{kind});
  const prompt=result.config.prompt;
  assert.equal(prompt.split(stagedScene).length-1,1,kind+' scene preserved exactly');
  assert.equal(prompt.split(preciseAction).length-1,1,kind+' fine detail preserved exactly');
  assert.ok(prompt.indexOf(stagedScene)<prompt.indexOf('| boy, Clark Kent'),kind);
  assert.ok(prompt.indexOf(preciseAction)>prompt.indexOf('| boy, Clark Kent'),kind);
  assert.ok(prompt.includes('panel borders: '+data.borders),kind);
  assert.equal(validateImagePromptLayout(prompt,kind),prompt,kind);
 }
});

test('Panel border design appears visibly near page opening, before scenery, once only',()=>{
 const data=sample();data.scene='upper wide panel: rustic porch; lower inset: distant blue mountains';
 const result=parseExperimentalDirector(JSON.stringify(data),{kind:'comic'});
 const prompt=result.config.prompt;
 const borderText='panel borders: '+data.borders;
 assert.equal(prompt.split(borderText).length-1,1);
 assert.ok(prompt.indexOf(borderText)>prompt.indexOf('3 panels, expressive comic page'));
 assert.ok(prompt.indexOf(borderText)<prompt.indexOf(data.scene));
 assert.ok(prompt.indexOf(data.scene)<prompt.indexOf('Speech bubble 1:'));
 assert.match(experimentalDirectorPrompt('comic'),/borders: a non-empty description of visible panel silhouettes/);
 assert.match(experimentalDirectorPrompt('story_page'),/neutral decorative page surface outside and between panels/);
 assert.equal(validateImagePromptLayout(prompt,'comic'),prompt);
});

test('Snapshot with empty borders keeps a clean scene and legacy modules remain untouched',()=>{
 const data=sample();data.borders='';data.bubbles=[];
 const prompt=parseExperimentalDirector(JSON.stringify(data),{kind:'snapshot'}).config.prompt;
 assert.ok(!prompt.includes('panel borders:'));
 assert.ok(prompt.includes(data.scene));
 for(const name of ['official-prompts.js','no-text-directors.js','code-prompts.js'])
  assert.ok(read(name).length>500,'Original bundled prompt remains available: '+name);
});


test('Real director misplacement: recover bubbles and existing frame artwork verbatim, never invent missing frames',()=>{
 const data={
  schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
  opening:'comic page, 4 panels, expressive warm-weather illustration',
  scene:'Panel 1: sunlit courtyard and laundry; Panel 2: dim stairway; Panel 3: porch; Panel 4: wide yard',
  borders:[
   {panel:1,speaker:'Ji',design:'soft cloud-shaped speech balloon with gently wavy cream border, floating upper-right over the laundry lines, thin curved tail pointing down-left toward the doorway',words:'Не знала, что Аватары такие хозяйственные,'},
   {panel:4,speaker:'Ji',design:'playful tilted oval balloon with a thin double border and sparkle, tail pointing to her smiling mouth',words:'Ну как? Сойдет для свидания?'}
  ],
  characters:[
   {subject:'boy',name:'Aang',appearance:'[[NESS_VIS:character_mw6w536q_4fyywf:full_front]] [[NESS_SKIN:character_mw6w536q_4fyywf:none]]',wardrobe:'air nomad traveler outfit',action:'Panel 1: seated on the step; Panel 4: looks at Ji with a blush'},
   {subject:'girl',name:'Ji',appearance:'[[NESS_VIS:ji:full_front]] [[NESS_SKIN:ji:upper_front,arms]]',wardrobe:'fantasy nomad outfit',action:'Panel 2: brushing her hair; Panel 4: playful mid-twirl'}
  ],
  lettering:[]
 };
 const missingRaw=JSON.stringify(data);
 assert.throws(()=>parseExperimentalDirector(missingRaw,{kind:'custom_test_comic',includeText:true,maxLines:3,maxWords:10}),/borders.*рамок/);
 assert.equal(normalizeExperimentalDirectorSlots(data).data.borders,'');
 data.panel_borders='warm sepia frames, textured parchment page behind panels, cream gutters';
 const raw=JSON.stringify(data);
 const fence=String.fromCharCode(96,96,96);
 const result=parseExperimentalDirector(fence+'json\n'+JSON.stringify(data,null,2)+'\n'+fence,{kind:'custom_test_comic',includeText:true,maxLines:3,maxWords:10});
 assert.equal(result.repaired,true);
 const prompt=result.config.prompt;
 assert.match(prompt,/Speech bubble 1: In panel 1/);
 assert.match(prompt,/Speech bubble 2: In panel 4/);
 assert.ok(prompt.includes(data.borders[0].design));
 assert.ok(prompt.includes(data.borders[1].design));
 assert.ok(prompt.endsWith('Text: Не знала, что Аватары такие хозяйственные,\n\nНу как? Сойдет для свидания?'));
 assert.ok(prompt.includes(data.characters[0].appearance));
 assert.ok(prompt.includes(data.characters[1].appearance));
 assert.equal(data.borders.length,2,'original JSON must not be mutated');
 assert.equal(JSON.stringify(data),raw);
 assert.equal(normalizeExperimentalDirectorSlots(data).data.borders,data.panel_borders);
 assert.ok(prompt.includes('panel borders: '+data.panel_borders));
 assert.equal(validateImagePromptLayout(prompt,'comic'),prompt);
});

test('Compatible alternative slot shapes are repaired without invented dialogue or double rendering',()=>{
 const data=sample();
 data.border_design='thin warm sepia frames';
 data.borders=[{panel:2,speaker:'Clark Kent',design:data.bubbles[0].design,words:data.bubbles[0].words}];
 const recovered=parseExperimentalDirector(JSON.stringify(data),{kind:'comic'});
 assert.equal(recovered.repaired,true);
 assert.ok(recovered.config.prompt.includes('panel borders: thin warm sepia frames'));
 assert.equal(recovered.config.prompt.split('Speech bubble 1:').length-1,1);
 assert.equal(recovered.config.prompt.split('Speech bubble 2:').length-1,0);
 let alt=sample();
 alt.borders=[{panel:1,design:'torn paper outline'},{panel:2,design:'thin sepia line'}];
 delete alt.bubbles;delete alt.lettering;
 const compiled=parseExperimentalDirector(JSON.stringify(alt),{kind:'comic'});
 assert.equal(compiled.repaired,true);
 assert.match(compiled.config.prompt,/panel borders: panel 1: torn paper outline; panel 2: thin sepia line/);
 assert.doesNotMatch(compiled.config.prompt,/Speech bubble 1:/);
 assert.doesNotMatch(compiled.config.prompt,/\n\nText:/);
});

test('Ambiguous mixed slot objects and non-text mode still fail safely',()=>{
 let data=sample();
 data.borders=[{panel:1,speaker:'Ji',design:'balloon',words:'Да'},{panel:2,design:'frame only'}];
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(data)),/смешивает рамки и реплики/);
 data=sample();data.borders=data.bubbles;delete data.bubbles;
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(data),{kind:'comic',includeText:false}),/borders.*рамок/);
 data.border_design='thin warm sepia frames, ivory paper page background';
 const withoutText=parseExperimentalDirector(JSON.stringify(data),{kind:'comic',includeText:false});
 assert.doesNotMatch(withoutText.config.prompt,/Speech bubble|Text:/);
 assert.equal(withoutText.repaired,true);
 data=sample();data.borders=null;
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(data)),/borders/);
});

test('Numbered page scenes interleave each balloon and inscription with its own panel in both test profiles',()=>{
 for(const kind of ['custom_test_comic','custom_test_story_page']){
  const data=sample();
  data.scene='Panel 1: upper two-shot; Panel 2: close-up of Ness; Panel 3: detail of hands';
  data.bubbles=[
   {panel:2,speaker:'Ness',design:'small oval balloon above Ness',words:'Да.'},
   {panel:1,speaker:'Clark Kent',design:'white rounded balloon above Clark',words:'Ты здесь?'}
  ];
  const raw=JSON.stringify(data),prompt=parseExperimentalDirector(raw,{kind}).config.prompt;
  const base=prompt.split(' | ')[0];
  assert.match(base,/text, speech bubble/);
  assert.ok(base.indexOf('Panel 1:')<base.indexOf('Speech bubble 1:'));
  assert.ok(base.indexOf('Speech bubble 1:')<base.indexOf('Panel 2:'));
  assert.ok(base.indexOf('Panel 2:')<base.indexOf('Speech bubble 2:'));
  assert.ok(base.indexOf('Speech bubble 2:')<base.indexOf('Panel 3:'));
  assert.ok(base.indexOf('Lettering 1:')<base.indexOf('Panel 2:'));
  assert.match(base,/Speech bubble 1: In panel 1, white rounded balloon above Clark, tail pointing toward Clark Kent's mouth, saying "Ты здесь\?"/);
  const [clark,ness]=prompt.split(' | ').slice(1).map(x=>x.split('\n\nText:')[0]);
  assert.match(clark,/Panel 1: visible speech balloon beside Clark Kent/);
  assert.doesNotMatch(clark,/balloon beside Ness|Да\.|Ты здесь\?/);
  assert.match(ness,/Panel 2: visible speech balloon beside Ness/);
  assert.doesNotMatch(ness,/balloon beside Clark|Да\.|Ты здесь\?/);
  assert.ok(prompt.endsWith('Text: Hi\n\nТы здесь?\n\nДа.'));
  for(const line of ['Ты здесь?','Да.'])assert.equal(prompt.split(line).length-1,2);
  assert.equal(validateImagePromptLayout(prompt,kind),prompt);
  assert.equal(JSON.stringify(data),raw);
  const noText=parseExperimentalDirector(raw,{kind,includeText:false}).config.prompt;
  assert.doesNotMatch(noText,/Speech bubble|visible speech balloon|Text:|Lettering 1:|text, speech bubble/i);
  assert.ok(noText.includes('Panel 3: detail of hands'));
 }
});

test('Every new page SAMPLE is real valid JSON, obeys active limits and compiles through the same assembler',()=>{
 for(const kind of ['comic','story_page'])for(const [includeText,maxLines] of [[true,2],[true,1],[true,0],[false,0]]){
  const instructions=experimentalDirectorPrompt(kind,{includeText,maxLines,maxWords:1});
  const raw=instructions.match(/SAMPLE:\n([\s\S]*?)\n\n/)?.[1];
  assert.ok(raw);
  const data=JSON.parse(raw);
  const result=parseExperimentalDirector(raw,{kind,includeText,maxLines,maxWords:1});
  assert.ok(data.bubbles.length<=maxLines);
  assert.equal(validateImagePromptLayout(result.config.prompt,kind),result.config.prompt);
  assert.equal(result.config.prompt.includes('Text:'),data.bubbles.length>0);
  if(data.bubbles.length)assert.ok(result.config.prompt.indexOf('Speech bubble 1:')<result.config.prompt.indexOf('Panel 2:'));
 }
});

test('Only test Comic and Story Page put the exact final Text block in the NovelAI base caption',async()=>{
 const oldFetch=globalThis.fetch, calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push(JSON.parse(options.body));
  return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({images:[{image:'iVBORw0KGgo='}]})};
 };
 try {
  const settings={...defaultNovelAISettings(),apiKey:'DUMMY_TEST_ONLY',neverSpendAnlas:false};
  const data=sample();
  data.scene='Panel 1: upper office view; Panel 2: close-up of Clark';
  const prompt=parseExperimentalDirector(JSON.stringify(data),{kind:'comic'}).config.prompt;
  for(const profileId of ['custom_test_comic','custom_test_story_page','comic','story_page','custom_test_snapshot']){
   await generateNovelAI({settings,prompt,profileId,style:'ink drawing',aspectRatio:'2:3'});
   const request=calls.at(-1),caption=request.parameters.v4_prompt.caption;
   assert.equal(request.input,caption.base_caption);
   assert.equal(caption.char_captions.length,2);
   assert.ok(caption.base_caption.startsWith('ink drawing, '));
   if(profileId==='custom_test_comic'||profileId==='custom_test_story_page'){
    assert.ok(caption.base_caption.endsWith('Text: Hi\n\nТы слышишь меня?'));
    assert.ok(caption.char_captions.every(x=>!x.char_caption.includes('Text:')));
    assert.match(caption.char_captions[0].char_caption,/visible speech balloon beside Clark Kent/);
   }else{
    assert.doesNotMatch(caption.base_caption,/\n\nText:/);
    assert.ok(caption.char_captions[1].char_caption.endsWith('Text: Hi\n\nТы слышишь меня?'));
   }
  }
 }finally{globalThis.fetch=oldFetch;}
});

test('Both test page formats retain expressive and independent frame design with or without lettering',()=>{
 for(const kind of ['comic','story_page'])for(const includeText of [true,false]){
  const instructions=experimentalDirectorPrompt(kind,{includeText});
  assert.match(instructions,/borders: a non-empty description/);
  assert.match(instructions,/inset edges, gutter width and color, outer margins/);
  assert.match(instructions,/neutral decorative page surface outside and between panels/);
  assert.match(instructions,/Match the page design to the composition and mood/);
  assert.match(instructions,/Keep page graphics distinct from the fictional scenery inside the panels/);
  const raw=instructions.match(/SAMPLE:\n([\s\S]*?)\n\n/)?.[1];
  const data=JSON.parse(raw);
  assert.match(data.borders,/sepia/);
  assert.match(data.borders,/gutter/);
  assert.match(data.borders,/inset/);
  assert.match(data.borders,/margin/);
  assert.match(data.borders,/neutral,.*page background/);
  const prompt=parseExperimentalDirector(raw,{kind,includeText}).config.prompt;
  const frame='panel borders: '+data.borders;
  assert.equal(prompt.split(frame).length-1,1);
  assert.ok(prompt.indexOf(frame)<prompt.indexOf('Panel 1:'));
  if(includeText)assert.ok(prompt.indexOf(frame)<prompt.indexOf('Speech bubble 1:'));
  else assert.doesNotMatch(prompt,/Speech bubble|\n\nText:/);
 }
 assert.doesNotMatch(experimentalDirectorPrompt('snapshot'),/borders is a required non-empty artistic description/);
});

test('A fresh test Comic or Story Page cannot compile without frame and page background artwork, regardless of text mode',()=>{
 for(const kind of ['custom_test_comic','custom_test_story_page'])for(const includeText of [true,false]){
  for(const missing of [undefined,'','   ',';;;',[],null]){
   const data=sample();
   data.scene='Panel 1: rainy bus stop; Panel 2: close view of a speaker; Panel 3: street lights';
   if(missing===undefined)delete data.borders;
   else data.borders=missing;
   assert.throws(()=>parseExperimentalDirector(JSON.stringify(data),{kind,includeText}),/borders/);
  }
  const data=sample();
  data.scene='Panel 1: rainy bus stop; Panel 2: close view of a speaker; Panel 3: street lights';
  data.borders='irregular graphite outlines, dark blue textured page behind panels, pale gray gutters, raindrop motifs in the outer margins';
  const prompt=parseExperimentalDirector(JSON.stringify(data),{kind,includeText}).config.prompt;
  assert.equal(prompt.split('panel borders: '+data.borders).length-1,1);
  assert.ok(prompt.indexOf('panel borders:')<prompt.indexOf('Panel 1:'));
  if(includeText){
   assert.ok(prompt.indexOf('Panel 2:')<prompt.indexOf('Speech bubble 1:'));
   assert.ok(prompt.indexOf('Speech bubble 1:')<prompt.indexOf('Panel 3:'));
   assert.ok(prompt.endsWith('Text: Hi\n\nТы слышишь меня?'));
  }
 }
 const snapshot=sample();snapshot.borders='';
 assert.doesNotThrow(()=>parseExperimentalDirector(JSON.stringify(snapshot),{kind:'snapshot'}));
});
