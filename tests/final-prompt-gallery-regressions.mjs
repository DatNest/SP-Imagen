import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateImagePromptLayout} from '../image-prompt.js';
import {readPostDraft,postFingerprint,DRAFT_FIELD} from '../post-drafts.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const good='1boy, 1girl, 2-panel comic; Panel 1: standing; Speech bubble 1: oval balloon, saying "Привет!" | boy, Ivan, black hair, coat | girl, Rita, freckles, scarf\n\nText: Привет!';

test('Final image prompt validation never edits or rearranges its input',()=>{
 const original=good.replace('black hair','{{{black hair}}}');
 assert.equal(validateImagePromptLayout(original,'comic'),original);
 assert.equal(validateImagePromptLayout(original,'custom_comic'),original);
 assert.equal(validateImagePromptLayout('1boy, seated at window | boy, Ivan, blue eyes','snapshot'),
              '1boy, seated at window | boy, Ivan, blue eyes');
});

test('Text preceding a character is blocked without swallowing that character',()=>{
 const invalid='1boy, comic; Text: Привет! | boy, Ivan, white shirt';
 assert.throws(()=>validateImagePromptLayout(invalid,'comic'),/ДО описаний персонажей/);
 assert.match(invalid,/\| boy, Ivan, white shirt$/);
});

test('Speech bubble N must precede character sections',()=>{
 assert.throws(()=>validateImagePromptLayout(
  '1boy, comic | boy, Ivan; Speech bubble 1: oval balloon, saying "Привет!"\n\nText: Привет!'
 ),/ПОСЛЕ секции персонажа/);
});

test('Repeated or empty terminal Text blocks are rejected without mutation',()=>{
 assert.throws(()=>validateImagePromptLayout(
  '1boy | boy, Ivan\n\nText: Hello\n\nText: Bye'
 ),/несколько блоков/);
 assert.throws(()=>validateImagePromptLayout('1boy | boy, Ivan\n\nText: '),/пуст/);
});

test('Quoted literal Text: does not count as the terminal block',()=>{
 const text='1boy, sign saying "Text: hello"; | boy, Ivan, brown hair';
 assert.equal(validateImagePromptLayout(text,'comic'),text);
});

test('A finished draft from an earlier release is removed only for a matching saved image',()=>{
 const post={name:'Ivan',send_date:'2026-11-22',mes:'RP',extra:{}};
 const draft={version:1,index:0,fingerprint:postFingerprint(post),kind:'comic',
   updatedAt:2000,final:{config:{prompt:'1boy | boy, Ivan'}}};
 post.extra[DRAFT_FIELD]=draft;
 post.extra.ness_media_slots_v2={comic:{versions:[
   {at:2010,config:{prompt:'1boy | boy, Ivan'},src:'/user/images/ivan.png'}
 ]}};
 const ctx={chatId:'test',chat:[post],saveChat:async()=>{}};
 assert.equal(readPostDraft(ctx,0),null);
 assert.equal(Object.hasOwn(post.extra,DRAFT_FIELD),false);
});

test('A pending later draft is preserved when existing image predates the draft',()=>{
 const post={name:'Ivan',send_date:'2026-11-22',mes:'RP',extra:{}};
 const draft={version:1,index:0,fingerprint:postFingerprint(post),kind:'comic',
   updatedAt:3010,final:{config:{prompt:'1boy | boy, Ivan'}}};
 post.extra[DRAFT_FIELD]=draft;
 post.extra.ness_media_slots_v2={comic:{versions:[
   {at:3000,config:{prompt:'1boy | boy, Ivan'},src:'/user/images/ivan.png'}
 ]}};
 assert.equal(readPostDraft({chatId:'test',chat:[post]},0),draft);
});

test('Gallery image opens in in-page viewer, and success clears the post draft',()=>{
 const gallery=read('media-slots.js'),runtime=read('runtime.js');
 assert.match(gallery,/frame\.addEventListener\('click', \(\) => showImageViewer\(/);
 assert.doesNotMatch(gallery,/frame\.addEventListener\('click', \(\) => host\.open/);
 assert.match(gallery,/function closeImageViewer\(\)/);
 assert.match(gallery,/event\.key==='Escape'&&imageViewer/);
 assert.match(runtime,/if\(!stored\.savePending\)discardPostDraft\(live,targetIndex\)/);
 assert.match(runtime,/validateImagePromptLayout\(config\.prompt,baseKind\)/);
});
