import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {savePostDraft,readPostDraft,discardPostDraft,subscribePostDraftChanges,DRAFT_FIELD} from '../post-drafts.js';
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

test('Draft changes notify the standalone gallery for exactly one post, without a legacy global',()=>{
 const ctx={chatId:'draft-test',chat:[{name:'A',mes:'first',send_date:'1'},{name:'B',mes:'second',send_date:'2'}]};
 const changes=[],stop=subscribePostDraftChanges(event=>changes.push({...event,draft:readPostDraft(ctx,event.index)}));
 const storage=new Map(),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)}});
 try{
  rememberPostPrompts(ctx,1,{kind:'snapshot',parsedScene:'scene'});
  const first=savePostDraft(ctx,1,{kind:'snapshot',stage:'parsed',parser:{parsedScene:'scene'}});
  assert.equal(changes.length,1);assert.equal(changes[0].index,1);assert.strictEqual(changes[0].message,ctx.chat[1]);assert.strictEqual(changes[0].chat,ctx.chat);assert.equal(changes[0].chatId,ctx.chatId);
  assert.deepEqual(changes[0].draft,first);assert.equal(readPostDraft(ctx,0),null);
  savePostDraft(ctx,1,{kind:'snapshot',stage:'prompt',final:{config:{prompt:'ready'}}});
  assert.equal(changes.length,2);assert.equal(changes[1].draft.final.config.prompt,'ready');
  discardPostDraft(ctx,1);assert.equal(changes.length,3);assert.equal(changes[2].draft,null);assert.equal(ctx.chat[1].extra[DRAFT_FIELD],undefined);
  assert.equal(collectPostPrompts(ctx.chat[1]).parsedScene,'scene');
  stop();savePostDraft(ctx,0,{kind:'comic',stage:'parsed',parser:{parsedScene:'unrelated'}});assert.equal(changes.length,3);
 }finally{stop();if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});

test('Gallery updates the exact live post when a draft changes, ignores stale chats and exposes recovery in the star menu',()=>{
 const gallery=read('media-slots.js'),drafts=read('post-drafts.js');
 assert.doesNotMatch(drafts,/__nessImageSlotsV4/);
 assert.match(gallery,/const unsubscribeDrafts=subscribePostDraftChanges\(onDraftChanged\)/);
 assert.match(gallery,/function dispose\(\) \{\s*unsubscribeDrafts\(\)/);
 const start=gallery.indexOf('  function onDraftChanged('),end=gallery.indexOf('  function paint()',start);
 const first={mes:'one'},second={mes:'two'},chat=[first,second],painted=[];
 const context=()=>({chat,chatId:'active'});
 const callback=new Function('context','paintPost',gallery.slice(start,end)+'\nreturn onDraftChanged;')(context,index=>painted.push(index));
 callback({chat,chatId:'active',index:1,message:second});
 callback({chat:[],chatId:'active',index:1,message:second});
 callback({chat,chatId:'other',index:1,message:second});
 callback({chat,chatId:'active',index:1,message:first});
 assert.deepEqual(painted,[1]);
 const menu=gallery.slice(gallery.indexOf('  function toggleToolsMenu('),gallery.indexOf('  function eligible('));
 assert.match(menu,/updatePostPromptIcon\(view,slotsOf\(view\.message\)\)/);
 assert.match(menu,/updatePostDraftControls\(view\)/);
 assert.match(menu,/↪ Продолжить черновик/);
 assert.match(menu,/executeCommand\('sp_ness_resume_post',view\)/);
 assert.match(menu,/▤ Сохранённые промпты/);
});
