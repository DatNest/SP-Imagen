import test from 'node:test';
import assert from 'node:assert/strict';
import {SP_IMAGEN_PROMPTS} from '../official-prompts.js';
import {SP_IMAGEN_NO_TEXT_DIRECTORS} from '../no-text-directors.js';
import {experimentalDirectorPrompt,experimentalLegacyIntimacy} from '../experimental-director.js';
import {validateImagePromptLayout} from '../image-prompt.js';

test('Official Comic and Story Page samples conform to the actual BASE, character and terminal Text contract',()=>{
 for(const kind of ['comic','story_page']){
  const prompt=SP_IMAGEN_PROMPTS['sp_ness_'+kind+'_director'];
  const example=prompt.match(/\nSAMPLE:\n([\s\S]*?)\n\nSAMPLE AND LIBRARY MARKERS/)?.[1];
  assert.ok(example,'Sample exists: '+kind);
  assert.equal(validateImagePromptLayout(example,kind),example,'The sample itself must pass the real final-prompt validator: '+kind);
  const firstActor=example.indexOf(' | boy, Clark Kent');
  const nextActor=example.indexOf(' | girl, Ness');
  const balloon=example.indexOf('Speech bubble 1:');
  const text=example.indexOf('\n\nText: ');
  assert.ok(balloon>=0 && balloon<firstActor && firstActor<nextActor && nextActor<text,
   'Balloon stays in BASE; two cast entries precede terminal Text: '+kind);
  assert.equal((example.match(/\|\s*(?:boy|girl|cat|other)\s*,/gu)||[]).length,2);
  assert.match(example.slice(0,firstActor),/Speech bubble 1:.*?tail pointing to Clark, Clark saying "Привет!"/s);
  assert.equal(example.split('\n\nText: ').length-1,1);
  assert.ok(example.includes('Panel 1:')&&example.includes('Panel 2:')&&example.includes('Panel 3:'));
  assert.doesNotMatch(example,/(\[[^\]]*(?:continue|outfit|duplicate|text content)[^\]]*\]|Speech bubble 2\.\.\.)/iu);
  assert.doesNotMatch(prompt,/legacy bubble-after-cast example|despite their legacy placement|even though the legacy sample places them afterward/i);
  assert.match(prompt,/Each panel establishes the camera, visible background, participants' relative positions and central shared interaction/);
  assert.match(prompt,/Refer to the panel and established position, then detail that character's body pose/);
  if(kind==='comic')assert.match(example,/Text: Привет!\n\nI love you$/);
  else assert.match(example,/Text: I love you\n\nПривет!$/);
 }
});

test('Original textless Comic and Story Page preserve their output contract and separate scene/action responsibilities',()=>{
 for(const kind of ['comic','story_page']){
  const p=SP_IMAGEN_NO_TEXT_DIRECTORS[kind];
  assert.match(p,/Each panel anchors its camera, visible background, participants' relative positions and central shared interaction/);
  assert.match(p,/Refer to the panel and established position, then detail that character's body pose/);
  assert.doesNotMatch(p,/SAMPLE:\n/,'No new example was added to textless modes');
  assert.match(p,/VISUAL STORYTELLING — WITHOUT LETTERING/);
 }
});

test('Experimental JSON-samples teach scene spatial anchors and character-specific action without changing slot structure',()=>{
 for(const kind of ['snapshot','comic','story_page']){
  const p=experimentalDirectorPrompt(kind,{postCount:3});
  assert.match(p,/spatial staging of the panels: layout, camera, visible setting, participants' relative positions and central shared interaction/);
  assert.match(p,/panel-specific body poses, expressions, gestures, gaze, hand and prop details/);
  assert.match(p,/scene: stage the complete visual composition/);
  assert.match(p,/Reference each panel and the position established in scene/);
  assert.match(p,/NSFW \/ INTIMACY CONTINUITY:/);
  assert.ok(p.includes(experimentalLegacyIntimacy(kind)),'NSFW material remains the original from shipped templates');
  assert.match(p,/"borders":/);
  assert.match(p,/"bubbles":/);
  assert.match(p,/"characters":/);
 }
 assert.match(SP_IMAGEN_PROMPTS.sp_ness_snapshot_director,/participants' relative positions and the central visible interaction/);
 assert.match(SP_IMAGEN_PROMPTS.sp_ness_snapshot_director,/describe each person's body pose, expression, gaze, hands, prop handling/);
});
