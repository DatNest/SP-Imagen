import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SP_IMAGEN_PROMPTS} from '../official-prompts.js';
import {SP_IMAGEN_NO_TEXT_DIRECTORS} from '../no-text-directors.js';
import {normalizeImagePrompt,limitComicDialogue} from '../image-prompt.js';
import {pageTextEnabled,isToggleableTextProfile,verifyTextlessImagePrompt} from '../page-text-mode.js';
import {NPC_LANGUAGE_VISUAL_ONLY,CODE_PROMPT_DEFAULTS} from '../code-prompts.js';

const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Text remains the existing official director for both pages, untouched',()=>{
  for(const kind of ['comic','story_page']){
    const original=SP_IMAGEN_PROMPTS['sp_ness_'+kind+'_director'];
    const noText=SP_IMAGEN_NO_TEXT_DIRECTORS[kind];
    assert.ok(original.length>12000);
    assert.ok(noText.length>9000);
    assert.notEqual(original,noText);
    assert.match(original,/SPEECH BUBBLES AND LETTERING/);
    assert.match(original,/Speech bubble 1:/);
    assert.match(original,/\nText:/);
    assert.equal(pageTextEnabled(kind,true),true);
  }
});

test('Each No text director is a complete self-contained HTML/JSON contract and preserves scene/identity',()=>{
  for(const kind of ['comic','story_page']){
    const prompt=SP_IMAGEN_NO_TEXT_DIRECTORS[kind];
    for(const required of [
      'FINAL PROMPT STRUCTURE','INPUTS AND AUTHORITY','CURRENT WARDROBE',
      'FIXED CHARACTER APPEARANCE','NESS_VIS','PAGE ARCHITECTURE',
      'VISUAL STORYTELLING — WITHOUT LETTERING','OUTPUT CONTRACT',
      '<naicom>','data-iig-instruction=','[IMG:GEN]','INTIMATE COMIC COMPOSITION'
    ]) assert.ok(prompt.includes(required),kind+': '+required);
    assert.doesNotMatch(prompt,/\bSPEECH BUBBLES AND LETTERING\b/i);
    assert.doesNotMatch(prompt,/\bSpeech bubble\s*\d*\s*:/iu);
    assert.doesNotMatch(prompt,/\bText\s*:/iu);
    assert.doesNotMatch(prompt,/\bSelect zero to (?:two|three|\d+) genuinely relevant\b/i);
    assert.doesNotMatch(prompt,/\bSAMPLE:/i);
    assert.doesNotMatch(prompt,/\blettering on objects\b/i);
    assert.doesNotMatch(prompt,/\bterminal printed\b/i);
    assert.doesNotMatch(prompt,/\bPut every printed fragment\b/i);
    if(kind==='story_page')assert.match(prompt,/STORY PAGE BEAT CHECK/);
    else assert.match(prompt,/Choose ONE current instant/);
  }
});

test('Mode is only available on built-in Comic/Story Page; older absent settings default to Text',()=>{
  for(const kind of ['comic','story_page']){
    assert.equal(isToggleableTextProfile(kind),true);
    assert.equal(pageTextEnabled(kind,undefined),true);
    assert.equal(pageTextEnabled(kind,false),false);
    assert.equal(pageTextEnabled(kind,true),true);
  }
  for(const kind of ['snapshot','custom_draft','custom_story']) {
    assert.equal(isToggleableTextProfile(kind),false);
    assert.equal(pageTextEnabled(kind,false),true);
  }
});

test('No text prompt validator rejects stray lettering BEFORE any paid request',()=>{
  const clean='1girl, 3 panels comic page; Panel 1: woman waves; Panel 2: woman smiles | girl, Mia, smiling';
  for(const kind of ['comic','story_page']){
    assert.doesNotThrow(()=>verifyTextlessImagePrompt(clean,kind,false));
    for(const bad of [
      clean+'\n\nText: Привет!',
      clean+'; Speech bubble 1: saying "Привет!"',
      '1girl, text, 3 panels comic page | girl, Mia, waving',
      '1girl, caption boxes; Panel 1: hello | girl, Mia, waving'
    ])assert.throws(()=>verifyTextlessImagePrompt(bad,kind,false),/NovelAI не запускался/);
    assert.doesNotThrow(()=>verifyTextlessImagePrompt(clean+'\n\nText: Привет!',kind,true));
  }
  assert.doesNotThrow(()=>verifyTextlessImagePrompt(clean+'\n\nText: Привет!','snapshot',false));
});

test('No text image normalization never parses a dialogue appendix, while Text retains old behavior',()=>{
  const plain='1girl, tall, 2 panels comic page | girl, Mia, happy';
  assert.equal(normalizeImagePrompt(plain,{parseLettering:false}),plain);
  const lettered=plain+'\n\nText: Привет!'; 
  assert.equal(normalizeImagePrompt(lettered),lettered);
  assert.equal(normalizeImagePrompt(lettered,{parseLettering:false}),lettered);
  assert.equal(limitComicDialogue(plain,'snapshot',{}),plain);
});

test('Visual-only NPC policy has no dialogue/lettering instruction; Text policy remains unchanged',()=>{
  assert.doesNotMatch(NPC_LANGUAGE_VISUAL_ONLY,/\bText\s*:|\bPreserve the original language of in-image dialogue\b/i);
  assert.match(CODE_PROMPT_DEFAULTS.npc_language,/in-image dialogue/);
});

test('Per-click star switch is local UI state; runtime freezes it into the post draft and restores it',()=>{
  const ui=source('media-slots.js'), runtime=source('runtime.js'), index=source('index.js');
  assert.match(ui,/\['comic','story_page'\]\.includes\(item\.baseKind\|\|kind\)/);
  assert.match(ui,/input\.type='checkbox';input\.checked=true/);
  assert.match(ui,/showText=input\.checked/);
  assert.match(ui,/executeCommand\('sp_ness_generate_at', view, kind, showText\)/);
  assert.match(ui,/kind, includeText \}/);
  assert.match(runtime,/await prepareRp\(request\.kind,request\.index,request\.includeText\)/);
  assert.match(runtime,/kind,includeText,stage:'parsed'/);
  assert.match(runtime,/v\.sp_imagen_page_text_enabled=pageTextEnabled\(draft\.kind,draft\.includeText\)/);
  assert.match(runtime,/getNessDirector\(kind,includeText\)/);
  assert.match(index,/SP_IMAGEN_NO_TEXT_DIRECTORS\[kind\]/);
});

test('No text path omits dialogue-limit integration, printed-text parsing and auto-retries',()=>{
  const runtime=source('runtime.js');
  assert.match(runtime,/const useDialogueSettings=includeText && profile\?\.parser\?\.options\?\.useDialogueSettings!==false/);
  assert.match(runtime,/normalizeImagePrompt\(config\.prompt,\{parseLettering:includeText\}\)/);
  assert.match(runtime,/if\(useDialogueSettings&&!experimental\)config\.prompt=limitComicDialogue/);
  assert.match(runtime,/verifyTextlessImagePrompt\(config\.prompt,baseKind,includeText\)/);
  const helper=source('page-text-mode.js');
  assert.doesNotMatch(helper,/\b(?:fetch|setInterval|Worker|setTimeout|requestAnimationFrame)\s*\(/);
  assert.doesNotMatch(runtime,/const includeText=.+\?\s*'text'/);
});
