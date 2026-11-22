import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {experimentalProfileFor,experimentalDirectorPrompt,parseExperimentalDirector,normalizeExperimentalDirectorSlots,normalizeExperimentalSceneLabels,experimentalLegacyIntimacy,EXPERIMENTAL_DIRECTOR_IDS} from '../experimental-director.js';
import {generationFormats,baseKindFor} from '../profiles.js';
import {pageTextEnabled} from '../page-text-mode.js';
import {validateImagePromptLayout} from '../image-prompt.js';
import {insertVisibleAppearance} from '../appearance-visibility.js';

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

test('Textless test profiles reject lettering and bubbles before NovelAI',()=>{
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(sample()),{kind:'custom_test_comic',includeText:false}),/без текста/);
 const slots=sample();slots.bubbles=[];slots.lettering=[];
 const result=parseExperimentalDirector(JSON.stringify(slots),{kind:'custom_test_comic',includeText:false});
 assert.ok(!result.config.prompt.includes('Text:'));
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
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(slots),{kind:'snapshot'}),/Snapshot/);
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
 assert.match(prompt,/Speech bubble 1: within panel 3, fully enclosed comic speech balloon/);
 assert.match(prompt,/unbroken outline surrounding the printed dialogue, text INSIDE the balloon/);
 assert.match(prompt,/tail ending at Ness's mouth/);
 assert.match(prompt,/at upper right, tail to Ness/);
 assert.match(prompt,/Text: Hi\n\nНу как\? Сойдёт\?$/);
 assert.equal(validateImagePromptLayout(prompt,'story_page'),prompt);
});

test('Art director asks for expressive natural panel prose without numbered-list syntax',()=>{
 const input='1) Large establishing panel: sunlit courtyard; 2) Quiet inset: hand holding staff; \n3) Wide panel: river';
 const normalized=normalizeExperimentalSceneLabels(input);
 assert.equal(normalized,'first panel: Large establishing panel: sunlit courtyard; second panel: Quiet inset: hand holding staff; \nthird panel: Wide panel: river');
 const slots=sample();slots.scene=input;
 const result=parseExperimentalDirector(JSON.stringify(slots),{kind:'story_page'});
 assert.match(result.config.prompt,/first panel: Large establishing panel/);
 assert.doesNotMatch(result.config.prompt,/(?:^|;\s*)\d+\)\s/u);
 assert.match(experimentalDirectorPrompt('comic'),/positions of the participants, and central action or interaction/);
 assert.match(experimentalDirectorPrompt('story_page'),/visually readable and coherent across the page/);
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
 assert.match(original,/For established adult intimacy, use these original scene and character guidelines/);
});


test('All test formats keep spatial scene staging and fine character details in their dedicated fields',()=>{
 const stagedScene='Top wide panel: a sunny courtyard with laundry and a wooden porch, Ji stands by the railing above Aang, seen from a low angle. She makes a playful twirl toward him while he looks up, caught off guard by her smile. Bottom inset: a close view of their hands as Aang reaches to take her hand.';
 const preciseAction='Panel 1: Aang blushes, his fingers gripping his staff while his gaze stays on Ji; the folds of his robe shift as he leans forward.';
 for(const kind of ['snapshot','comic','story_page']){
  const instructions=experimentalDirectorPrompt(kind,{postCount:4});
  assert.match(instructions,/scene: stage the complete visual composition/);
  assert.match(instructions,/where the participants are in relation to one another/);
  assert.match(instructions,/central action or interaction connecting them/);
  assert.match(instructions,/action contains each character’s detailed panel-specific body pose, facial expression, hand gesture, eye-line, clothing and hair movement, and handling of props/);
  assert.doesNotMatch(instructions,/two focused sentences|roughly two purposeful sentences|a few focused sentences|Keep one short phrase per panel/);
  if(kind==='snapshot')assert.match(instructions,/relative positions of the participants, and the central action or interaction/);
  else assert.match(instructions,/positions of the participants, and central action or interaction/);
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
 assert.match(experimentalDirectorPrompt('comic'),/Give the page distinctive visible panel frames through borders/);
 assert.match(experimentalDirectorPrompt('story_page'),/Give the borders a recognizable visual presence/);
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


test('Real director misplacement: borders bubble array and missing bubbles are recovered verbatim',()=>{
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
 const raw=JSON.stringify(data);
 const fence=String.fromCharCode(96,96,96);
 const result=parseExperimentalDirector(fence+'json\n'+JSON.stringify(data,null,2)+'\n'+fence,{kind:'custom_test_comic',includeText:true,maxLines:3,maxWords:10});
 assert.equal(result.repaired,true);
 const prompt=result.config.prompt;
 assert.match(prompt,/Speech bubble 1: within panel 1/);
 assert.match(prompt,/Speech bubble 2: within panel 4/);
 assert.ok(prompt.includes(data.borders[0].design));
 assert.ok(prompt.includes(data.borders[1].design));
 assert.ok(prompt.endsWith('Text: Не знала, что Аватары такие хозяйственные,\n\nНу как? Сойдет для свидания?'));
 assert.ok(prompt.includes(data.characters[0].appearance));
 assert.ok(prompt.includes(data.characters[1].appearance));
 assert.equal(data.borders.length,2,'original JSON must not be mutated');
 assert.equal(JSON.stringify(data),raw);
 assert.equal(normalizeExperimentalDirectorSlots(data).data.borders,'');
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
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(data),{kind:'comic',includeText:false}),/режиме без текста/);
 data=sample();data.borders=null;
 assert.throws(()=>parseExperimentalDirector(JSON.stringify(data)),/borders/);
});
