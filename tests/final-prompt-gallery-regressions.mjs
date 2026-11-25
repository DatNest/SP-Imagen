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
 assert.match(gallery,/if\(safeUrl\(currentItem\.src\)\)showImageViewer\(frame,currentItem\.src/);
 assert.doesNotMatch(gallery,/frame\.addEventListener\('click', \(\) => host\.open/);
 assert.match(gallery,/function closeImageViewer\(\)/);
 assert.match(gallery,/event\.key==='Escape'&&imageViewer/);
 assert.match(runtime,/if\(!stored\.savePending\)discardPostDraft\(live,targetIndex\)/);
 assert.match(runtime,/validateImagePromptLayout\(config\.prompt,baseKind\)/);
});

test('Gallery updates preserve existing controls and enforce preview source safety',()=>{
 const source=read('media-slots.js'),start=source.indexOf('  function card(index, kind, slot, locked)'),end=source.indexOf('  function newestSavedPrompt',start);
 const opened=[],external=[],prompts=[];
 class Node{
  constructor(tag,cls,text){this.tagName=tag.toUpperCase();this.className=cls;this.textContent=text||'';this.dataset={};this.children=[];this.classList={add(){}};this.events={};}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
  setAttribute(key,value){this[key]=value;}
  addEventListener(key,fn){this.events[key]=fn;}
 }
 const element=(tag,cls,text)=>new Node(tag,cls,text),button=(label,title,action)=>{const n=element('button','',label);n.events.click=action;return n;};
 const build=new Function('element','galleryButton','safeUrl','remoteImage','KINDS','LABEL','generationProfiles','showImageViewer','openLegacyRemote','showPromptEditor','guideDemo','guideSampleConfig',source.slice(start,end)+'\nreturn card;')(
 element,button,url=>url.startsWith('/user/'),url=>url.startsWith('https:'),['snapshot'],{snapshot:'Snapshot'},()=>[],(frame,url)=>opened.push(url),url=>external.push(url),(anchor,index,kind,config)=>prompts.push(config),null,()=>({}));
 const slot={selected:0,collapsed:true,versions:[{src:'/user/a.png',config:{prompt:'a'}},{src:'/user/b.png',config:{prompt:'b'}},{src:'https://external.example/c.png',config:{prompt:'c'}}]};
 const card=build(0,'snapshot',slot,false),[heading,frame,bar]=card.node.children,image=frame.children[0],nav=bar.children[0],editor=bar.children[1].children[0];
 slot.selected=1;slot.collapsed=false;card.update(slot,false);
 assert.strictEqual(card.node.children[0],heading);assert.strictEqual(card.node.children[1],frame);assert.strictEqual(frame.children[0],image);assert.strictEqual(bar.children[0],nav);
 assert.equal(image.src,'/user/b.png');assert.equal(frame.hidden,false);frame.events.click();editor.events.click();assert.deepEqual(opened,['/user/b.png']);assert.deepEqual(prompts,[{prompt:'b'}]);
 slot.selected=2;card.update(slot,true);assert.equal(frame.children[0].tagName,'SPAN');assert.equal(frame.children[0].src,undefined);frame.events.click();assert.deepEqual(external,['https://external.example/c.png']);assert.equal(editor.disabled,true);assert.equal(slot.versions.length,3);
});
