import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POST_PROMPT_FIELD,readPostPrompts,rememberPostPrompts,collectPostPrompts} from '../post-prompt-state.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('RP post stores its own scene, raw director output and final image prompt without API data',()=>{
 const a={name:'Aang',mes:'roleplay',extra:{}},b={name:'Ji',mes:'roleplay',extra:{}};
 const ctx={chat:[a,b]};
 rememberPostPrompts(ctx,0,{kind:'comic',parsedScene:'recent RP posts'},{reset:true});
 assert.deepEqual(readPostPrompts(a),{kind:'comic',parsedScene:'recent RP posts',directorRaw:'',finalPrompt:''});
 assert.equal(readPostPrompts(b),null);
 const exact='{"schema":"sp-imagen-slots-v1","borders":[{"words":"Ну как?","speaker":"Ji"}]}';
 rememberPostPrompts(ctx,0,{directorRaw:exact});
 rememberPostPrompts(ctx,0,{finalPrompt:'comic page; scene | girl, Ji\n\nText: Ну как?'});
 assert.equal(readPostPrompts(a).directorRaw,exact);
 assert.ok(readPostPrompts(a).finalPrompt.endsWith('Ну как?'));
 assert.equal(collectPostPrompts(a).parsedScene,'recent RP posts');
 assert.equal(collectPostPrompts(b).directorRaw,'');
 assert.equal(Object.keys(a.extra).length,1);
 assert.ok(Object.hasOwn(a.extra,POST_PROMPT_FIELD));
});

test('New generation resets post-specific prompt stages without affecting gallery',()=>{
 const post={extra:{ness_media_slots_v2:{comic:{versions:[{src:'/img.png'}]}}}};
 const ctx={chat:[post]};
 rememberPostPrompts(ctx,0,{kind:'comic',parsedScene:'one',directorRaw:'old',finalPrompt:'old'});
 rememberPostPrompts(ctx,0,{kind:'story_page',parsedScene:'two',directorRaw:'',finalPrompt:''},{reset:true});
 assert.deepEqual(readPostPrompts(post),{kind:'story_page',parsedScene:'two',directorRaw:'',finalPrompt:''});
 assert.equal(post.extra.ness_media_slots_v2.comic.versions[0].src,'/img.png');
});

test('Missing extra fields allow recovery from an existing incomplete draft or gallery prompt',()=>{
 const post={name:'Ji',mes:'roleplay'};
 const output=collectPostPrompts(post,{parser:{parsedScene:'RP content'},directorRaw:'director JSON',final:{config:{prompt:'compiled image'}}});
 assert.equal(output.parsedScene,'RP content');
 assert.equal(output.directorRaw,'director JSON');
 assert.equal(output.finalPrompt,'compiled image');
 assert.equal(collectPostPrompts(post,null,{config:{prompt:'saved gallery prompt'}}).finalPrompt,'saved gallery prompt');
});

test('Director raw prompt becomes accessible after one model call, before NovelAI generation',()=>{
 const runtime=read('runtime.js'),gallery=read('media-slots.js'),help=read('onboarding.js');
 assert.match(runtime,/rememberPostPrompts\(st,targetIndex,\{kind,parsedScene:v\.sp_imagen_parsed_scene/);
 assert.match(runtime,/rememberPostPrompts\(st,directorPostIndex,\{kind,directorRaw:raw\}\)/);
 assert.match(runtime,/savePostDraft\(st,directorPostIndex,\{kind,stage:'director',directorRaw:raw\}\)/);
 assert.match(runtime,/rememberPostPrompts\(st,targetIndex,\{kind,finalPrompt:config\.prompt\}\)/);
 assert.match(gallery,/function promptSources\(view,slots\)/);
 assert.match(gallery,/const sources=promptSources\(view,slots\)/);
 assert.match(gallery,/Выбрать этап сохранённого промпта/);
 assert.match(help,/title:'Три этапа промпта под ▤'/);
});
