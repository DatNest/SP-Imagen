import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {experimentalProfileFor,experimentalDirectorPrompt,parseExperimentalDirector,normalizeExperimentalSceneLabels,experimentalLegacyIntimacy,EXPERIMENTAL_DIRECTOR_IDS} from '../experimental-director.js';
import {generationFormats,baseKindFor} from '../profiles.js';
import {pageTextEnabled} from '../page-text-mode.js';
import {validateImagePromptLayout} from '../image-prompt.js';
import {insertVisibleAppearance} from '../appearance-visibility.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sample=()=>({
 schema:'sp-imagen-slots-v1',aspect_ratio:'2:3',
 opening:'3 panels, expressive comic page',
 scene:'Panel 1: Clark and Ness face each other near an office window. Panel 2: a close-up of their hands. Panel 3: a quiet glance.',
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
 assert.match(experimentalDirectorPrompt('comic'),/NEVER use 1\), 2\), 3\)/);
 assert.match(experimentalDirectorPrompt('story_page'),/natural descriptive phrases WITHOUT numbered lists/);
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
 assert.match(original,/Apply ONLY when the RP explicitly establishes intimate activity among adults/);
});
