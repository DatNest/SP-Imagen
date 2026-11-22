import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveImageStyle,NO_IMAGE_STYLE} from '../image-style-selection.js';
import {defaultNovelAISettings,generateNovelAI} from '../novelai.js';
import {makeGuideSteps} from '../onboarding.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const oldStyle={id:'old',name:'Старый',value:'old ink drawing'};
const latestStyle={id:'new',name:'Акварель',value:'warm watercolor, textured paper'};

test('An ordinary ↻ repeat takes the current active global style, not the saved snapshot style',()=>{
 const selected=resolveImageStyle({activeStyle:latestStyle,snapshotStyle:oldStyle,useActiveStyle:true});
 assert.deepEqual(selected,latestStyle);
 assert.notEqual(selected,latestStyle);
 assert.deepEqual(resolveImageStyle({activeStyle:null,snapshotStyle:oldStyle,useActiveStyle:true}),NO_IMAGE_STYLE);
});

test('Image editor 📝 uses its explicit saved or edited style, including Без стиля',()=>{
 assert.deepEqual(resolveImageStyle({activeStyle:latestStyle,snapshotStyle:oldStyle}),oldStyle);
 assert.deepEqual(resolveImageStyle({activeStyle:latestStyle,snapshotStyle:NO_IMAGE_STYLE}),NO_IMAGE_STYLE);
 assert.deepEqual(resolveImageStyle({activeStyle:latestStyle}),latestStyle);
 assert.deepEqual(resolveImageStyle({activeStyle:latestStyle,useActiveStyle:true,allowArtStyle:false}),NO_IMAGE_STYLE);
 // Older custom profiles allow explicit snapshot style even if auto-art-style was disabled.
 assert.deepEqual(resolveImageStyle({activeStyle:latestStyle,snapshotStyle:oldStyle,allowArtStyle:false}),oldStyle);
});

test('NovelAI receives the intended visual style AND exact edited prompt in the paid request',async()=>{
 const oldFetch=globalThis.fetch, calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options,request:JSON.parse(options.body)});
  return {
    ok:true,
    headers:{get:()=> 'application/json'},
    json:async()=>({images:[{image:'iVBORw0KGgo='}]}),
  };
 };
 try{
  const imagePrompt='1girl, blue eyes, reading at a table | girl, Mia, sitting, smile';
  const settings={...defaultNovelAISettings(),enabled:true,apiKey:'DUMMY_TEST_ONLY',neverSpendAnlas:false};
  const chosen=resolveImageStyle({activeStyle:latestStyle,snapshotStyle:oldStyle,useActiveStyle:true});
  const generated=await generateNovelAI({settings,prompt:imagePrompt,style:chosen.value,aspectRatio:'2:3'});
  assert.equal(calls.length,1);
  assert.equal(String(calls[0].url),'https://image.novelai.net/ai/generate-image');
  assert.equal(calls[0].request.input,'warm watercolor, textured paper, 1girl, blue eyes, reading at a table');
  assert.equal(calls[0].request.parameters.v4_prompt.caption.char_captions[0].char_caption,'girl, Mia, sitting, smile');
  assert.match(generated.src,/^data:image\/png;base64,/);
  assert.equal(calls[0].options.headers.Authorization,'Bearer DUMMY_TEST_ONLY');
  assert.equal(calls[0].options.redirect,'error');
 }finally{globalThis.fetch=oldFetch;}
});

test('No hidden chat save or old style overrides the image request',()=>{
 const gallery=read('media-slots.js'),client=read('index.js');
 const start=gallery.indexOf('async function regenerate(index, kind, overrideConfig = null)'),
   end=gallery.indexOf('async function runAction(action)',start);
 assert.ok(start>=0&&end>start);
 const body=gallery.slice(start,end);
 const request=body.indexOf('const generated = await extension.generateImage(');
 const publish=body.indexOf('await publish(index, kind, generated)');
 const save=body.indexOf('current.saveMetadata?.()');
 assert.ok(request>=0&&publish>request&&save>publish,'Request must precede gallery save and metadata save.');
 assert.match(body,/useActiveStyle:\s*overrideConfig === null/);
 assert.doesNotMatch(body,/await current\.saveMetadata/);
 assert.match(client,/resolveImageStyle\(\{/);
 assert.match(client,/useActiveStyle,/);
 assert.match(client,/style: style\.value,/);
 assert.match(client,/spImagenDirect: \{ version: 1, provider: 'novelai', style: clone\(style\),/);
 assert.match(gallery,/next\.spImagenDirect\.style = \{\.\.\.clone\(chosenStyle\), value:styleInput\.value\.trim\(\)\}/);
 assert.match(gallery,/Повторить с текущим активным стилем/);
});

test('Novice guide uses existing controls, explains new modes, textless comics and fixed style behavior',()=>{
 const a=makeGuideSteps(true),b=makeGuideSteps(false),src=read('onboarding.js');
 assert.ok(a.length>=35,'The updated guide should cover current features, not only legacy ones.');
 assert.equal(b.length,a.length+1,'Empty library includes the create-character invitation.');
 assert.ok(!a.some(step=>step.view==='library-body'));
 for(const css of ['.ness-tagboard-modes','.ness-tagboard-ribbon','.ness-unified-tagflow',
   '.ness-tagboard-tools','.ness-tagboard-tool-modes','.ness-tagboard-section-add','.ness-format-strip','.ness-tagboard-right','.text-mode-toggle']){
   assert.ok(a.some(step=>step.selector?.includes(css)),css);
 }
 for(const mode of ['library-appearance','library-skin','library-nsfw']){
   assert.ok(a.some(step=>step.view===mode),mode);
 }
 assert.ok(a.some(step=>step.view==='post-formats-text'));
 assert.ok(a.some(step=>step.view==='post-test-mode'));
 assert.ok(a.some(step=>/промпт/i.test(step.title)&&/режиссёра/.test(step.text)));
 assert.ok(!a.some(step=>/ness-tagboard-grip|ness-unified-add|ness-edit-toggle/.test(step.selector||'')));
 assert.match(read('media-slots.js'),/collectPostPrompts\(view\.message,draft,saved\)/);
 assert.ok(a.some(step=>/Старые отметины|старых полей|Старую вкладку|Отметины из старых/.test(step.text)));
 assert.ok(a.some(step=>/спис|стил/.test(step.text)&&/↻/.test(step.text)));
 assert.ok(a.some(step=>/Anlas/.test(step.text)));
 assert.ok(!a.some(step=>/ness-appearance-(?:presets|pencil|copy)|data-library-body-/.test(step.selector||'')));
 assert.doesNotMatch(src,/view:'library-body'/);
});

test('Guide navigates real three-mode library and targets the actual floating switch',()=>{
 const index=read('index.js'),gallery=read('media-slots.js');
 assert.match(index,/'library-skin':'Внешность'/);
 assert.match(index,/'library-nsfw':'Внешность'/);
 assert.match(index,/view==='library-skin'\?'Под одеждой'/);
 assert.match(index,/view==='library-nsfw'\?'NSFW'/);
 assert.match(gallery,/section === 'post-formats' \|\| section === 'post-formats-text'/);
 assert.match(gallery,/root\?\.querySelector\('\.text-mode-toggle'\)/);
 assert.doesNotMatch(index,/'library-body': 'Отметины и тело'/);
});

test('Style selection and activation update existing list nodes rather than recreating the list',()=>{
 const index=read('index.js');
 const start=index.indexOf('function openStyleLibrary(');
 const end=index.indexOf('async function openLibrary()',start);
 assert.ok(start>=0&&end>start);
 const body=index.slice(start,end);
 assert.match(body,/const syncListState = \(\) =>/);
 assert.match(body,/summary\.onclick = \(\) => \{ selectedId = style\.id; syncListState\(\); syncEditor\(\); \}/);
 assert.match(body,/selectedId = style\.id; persist\(\); syncListState\(\); syncEditor\(\)/);
 assert.match(body,/library\.scrollTop = scrollTop/);
});
test('Cast picker avoids resetting the list when an asynchronous save succeeds',()=>{
 const runtime=read('runtime.js');
 const start=runtime.indexOf('function createChatCastPicker(');
 const end=runtime.indexOf('function confirmKeepingDraft(',start);
 const body=runtime.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(body,/if\(failed\)render\(\)/);
 assert.match(body,/list\.refresh\(\)/);
});


test('Library selection updates preserve existing buttons, viewport, and sidebar compactness',()=>{
 const board=read('appearance-board.js'),css=read('style.css'),library=read('library-runtime.js');
 const start=board.indexOf('function refreshSelection()'),end=board.indexOf('function render()',start);
 assert.ok(start>=0&&end>start);
 const update=board.slice(start,end);
 assert.match(board,/after\(false\);/);
 assert.doesNotMatch(update,/clear\(chosenList\)/);
 assert.match(update,/previous=new Map/);
 assert.match(update,/insertBefore\(chip/);
 assert.match(update,/focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.ness-tagboard-chosen-list\{\s*flex:1 1 auto;height:0;min-height:0;max-height:none;/);
 assert.match(css,/\.ness-tagboard-columns\{\s*display:grid;grid-template-columns:[^\n]+\n align-items:stretch/);
 assert.match(library,/rulesButton\.setAttribute\('aria-label','Правила ракурсов'\)/);
});


test('Library filter scrolls vertically through two rows without a visible horizontal thumb',()=>{
 const css=read('style.css'),runtime=read('library-runtime.js');
 assert.match(css,/\.ness-tag-tools>\.ness-tag-strip\{[\s\S]*?height:59px;min-height:59px;max-height:59px!important/);
 assert.match(css,/overflow-x:hidden!important;overflow-y:auto!important/);
 assert.match(css,/touch-action:pan-y;-webkit-overflow-scrolling:touch/);
 assert.match(css,/\.ness-tag-tools>\.ness-tag-strip::-webkit-scrollbar\{[\s\S]*?display:none/);
 assert.match(runtime,/const stripScroll=view\.tagStrip\.scrollTop;/);
 assert.match(runtime,/view\.tagStrip\.scrollTop=stripScroll;/);
});
