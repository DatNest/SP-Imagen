import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveImageStyle,NO_IMAGE_STYLE} from '../image-style-selection.js';
import {defaultNovelAISettings,generateNovelAI,normalizeNovelAISettings,NOVELAI_MODEL_CHOICES,V5_FULL_MODEL,MEDIUM_MODEL,NOVELAI_SAMPLERS,novelAIModelControls,novelAIModelFromControls,cfgValidationErrors} from '../novelai.js';
import {NAISTERA_MODELS,normalizeNaisteraSettings} from '../naistera.js';
import {normalizeStylePresets,presetFromSettings} from '../generation-presets.js';
import {makeGuideSteps} from '../onboarding.js';
import {readableNessColor} from '../theme-runtime.js';

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
 assert.ok(!a.some(step=>step.view==='post-test-mode'));
 assert.ok(a.some(step=>/промпт/i.test(step.title)&&/режиссёра/.test(step.text)));
 assert.ok(!a.some(step=>/ness-tagboard-grip|ness-unified-add|ness-edit-toggle/.test(step.selector||'')));
 assert.match(read('media-slots.js'),/collectPostPrompts\(view\.message,draft,saved\)/);
 assert.ok(!a.some(step=>/Старые отметины|старых полей|архиве JSON|восстановленные отметины/i.test(step.title+' '+step.text)));
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
 assert.match(body,/summary\.onclick = \(\) => \{ if \(selectedId === id\) return; selectedId = id; syncListState\(\); syncEditor\(\); \}/);
 assert.match(body,/selectedId = id; persist\(\); syncListState\(\); syncEditor\(\)/);
 assert.match(body,/rows\.scrollTop = scrollTop/);
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
 assert.match(runtime,/filterScroll=view\.tagStrip\.scrollTop;/);
 assert.match(runtime,/view\.tagStrip\.scrollTop=stripScroll;/);
});


test('Library adapts to its own panel width and keeps filter and bulk tag chips readable',()=>{
 const css=read('style.css'),shared=read('shared-ui-css.js'),runtime=read('library-runtime.js');
 assert.match(css,/container-type:inline-size;\s*container-name:spi-library/);
 assert.match(css,/@container spi-library \(max-width:760px\)/);
 assert.match(css,/@container spi-library \(max-width:760px\)\{[\s\S]*?\.ness-library-workspace\{\s*display:flex;flex-direction:column/);
 assert.match(css,/@container spi-library \(max-width:760px\)\{[\s\S]*?\[data-view=editor\] \.ness-library-listpane\{\s*display:none/);
 assert.match(css,/@container spi-library \(max-width:760px\)\{[\s\S]*?\[data-view=editor\] \.ness-library-editorpane\{\s*display:flex/);
 assert.match(css,/\.ness-tag-tools>\.ness-tag-strip\{\s*display:flex!important;order:2;flex:1 1 100%;width:100%/);
 assert.match(css,/\.ness-library-bulk>\.ness-row\{display:flex;flex-wrap:nowrap/);
 assert.match(runtime,/const bulk=el\('div',undefined,tagTools,'ness-library-bulk'\)/);
 assert.doesNotMatch(runtime,/bulkTags=el/);
 assert.match(shared,/\.ness-library-editorpane\{display:flex;flex-direction:column/);
});


test('Mobile selected-tag pane follows the catalogue instead of covering tappable chips',()=>{
 const css=read('style.css');
 const baseMobile=css.slice(css.indexOf('@media(max-width:670px),(pointer:coarse){'),css.indexOf('/* v2.9.6:',css.indexOf('@media(max-width:670px),(pointer:coarse){')));
 assert.match(baseMobile,/\.ness-tagboard-columns\{display:flex;flex-direction:column\}/);
 assert.match(baseMobile,/\.ness-tagboard-right\{\s*position:static;bottom:auto;z-index:auto;flex:none;\s*height:auto;min-height:0;max-height:none/);
 assert.match(baseMobile,/\.ness-tagboard-chosen-list\{\s*height:auto;min-height:0;max-height:min\(28dvh,230px\);flex:none/);
 const libMobile=css.slice(css.indexOf('@media(max-width:670px),(pointer:coarse){',css.indexOf('/* SP Imagen library editorial refresh')));
 assert.match(libMobile,/\.ness-tagboard-right\{\s*position:static;bottom:auto;z-index:auto;\s*flex:none;height:auto;min-height:0;max-height:none;/);
 assert.match(libMobile,/\.ness-tagboard-chosen-list\{\s*height:auto;min-height:0;max-height:min\(28dvh,230px\);flex:none;overflow-y:auto/);
 assert.match(libMobile,/\.ness-unified-tagflow\{height:245px;max-height:38dvh\}/);
});

test('Theme foreground follows each light or dark background, including inputs and selected chips',()=>{
 assert.equal(readableNessColor('#ffffff','#fdfdfd'),'#212026');
 assert.equal(readableNessColor('#111111','#161616'),'#f8f6f2');
 assert.equal(readableNessColor('#fff','#222222'),'#222222');
 assert.equal(readableNessColor('rgb(20 21 22)','rgb(248 246 242)'),'rgb(248 246 242)');
 assert.equal(readableNessColor('color(srgb 1 1 1)','#ffffff'),'#212026');
 assert.equal(readableNessColor('#777777','#777777'),'#000000');
 const code=read('theme-runtime.js'),shared=read('shared-ui-css.js'),style=read('style.css');
 assert.match(code,/applyReadableNessColors\(target\)/);
 for(const token of ['input','surface','accent','library-card','library-pane','library-chosen','library-cream']){
  assert.ok(code.includes("'"+token+"'")||code.includes(token+":"),'Color surface '+token+' must be computed');
 }
 assert.match(shared,/color:var\(--ness-contrast-input,var\(--ness-text\)\)!important/);
 assert.match(shared,/color:var\(--ness-contrast-surface,var\(--ness-text\)\)!important/);
 assert.match(shared,/color:var\(--ness-contrast-accent,var\(--ness-input\)\)!important/);
 assert.match(style,/color:var\(--ness-contrast-library-chosen,var\(--ness-library-cream\)\)!important/);
 assert.match(style,/color:var\(--ness-contrast-library-pane,var\(--ness-text\)\)!important/);
});


test('Touch-screen library uses one-panel layout even when phone requests desktop viewport width',()=>{
 const css=read('style.css');
 const media='@media(max-width:670px),(pointer:coarse){';
 assert.equal(css.split(media).length-1,3,'All three tag/library mobile layouts must cover coarse touch without viewport cap');
 assert.ok(!css.includes('(pointer:coarse) and (max-width:930px)'),'Desktop-site mode on phone must not disable the mobile layout');
 const mobile=css.slice(css.indexOf(media,css.indexOf('/* SP Imagen library editorial refresh')));
 assert.match(mobile,/\.ness-library-workspace\{display:flex;flex-direction:column\}/);
 assert.match(mobile,/\[data-view=editor\] \.ness-library-listpane\{\s*display:none;/);
 assert.match(mobile,/\[data-view=editor\] \.ness-library-editorpane\{\s*display:flex;/);
 const fallback=css.slice(css.lastIndexOf(media));
 assert.match(fallback,/\.ness-library-editorpane\{\s*display:none;/);
 assert.match(fallback,/\[data-view=editor\] \.ness-library-editorpane\{\s*display:flex;/);
 const ui=read('library-runtime.js');
 assert.match(ui,/panel\.setAttribute\('data-view','list'\)/);
 assert.match(ui,/function showEditor\(drawers\)\{[^\n]*panel\.setAttribute\('data-view','editor'\)/);
});

test('Guide follows the current two-screen library, and the footer steps do not force invalid drafts to close',()=>{
 const steps=makeGuideSteps(true),index=read('index.js'),library=read('library-runtime.js');
 assert.ok(steps.some(s=>s.view==='library'&&s.selector.includes('.ness-library-layout')));
 assert.ok(steps.some(s=>s.view==='library-prompt'&&s.selector.includes('.ness-editor-back')));
 assert.ok(steps.some(s=>s.selector?.includes('.ness-figure-bulb')));
 assert.ok(steps.some(s=>s.view==='library-footer'&&s.selector.includes('data-library-save')));
 assert.match(index,/if \(view === 'library'\) \{[\s\S]*?querySelector\('\.ness-editor-back'\)\?\.click\(\)/);
 assert.match(index,/else if \(view !== 'library-footer'\)/);
 assert.match(index,/if\(button\?\.getAttribute\('aria-pressed'\)!=='true'\)button\?\.click/);
 assert.match(library,/ness-library-layout/);
 assert.match(library,/ness-figure-bulb/);
 assert.ok(steps.some(s=>s.text.includes('Неназначенные теги остаются в каталоге')));
});
test('Guide teaches actual JSON pipeline, exact clothing and real stage selector without requests',()=>{
 const steps=makeGuideSteps(true),gallery=read('media-slots.js'),onboarding=read('onboarding.js');
 assert.ok(steps.some(s=>s.text.includes('дословно копировать')&&s.text.includes('русский переводить')));
 assert.ok(steps.some(s=>s.text.includes('Action Tags')));
 assert.ok(!steps.some(s=>s.title.includes('Тест:')));
 assert.match(gallery,/function guidePromptSources\(\)/);
 for(const id of ['final','director','parsed'])assert.ok(gallery.includes("id:'"+id+"'"));
 assert.match(gallery,/showPromptPopup\(guideDemo.marker, guidePromptSources\(\)\[0\]\.text, 'Учебный промпт · Snapshot', guidePromptSources\(\)\)/);
 assert.match(onboarding,/if\(!target\?\.isConnected\|\|!target\.getClientRects\(\)\.length\)target=null/);
});

test('Beginner guide groups repeated library explanations and distinguishes official NovelAI subjects from extension categories',()=>{
 const steps=makeGuideSteps(true),lib=steps.filter(s=>s.view.startsWith('library'));
 assert.equal(lib.filter(s=>s.view==='library-appearance'&&s.selector.includes('.ness-format-strip')).length,1);
 assert.equal(lib.filter(s=>s.view==='library-appearance'&&s.selector.includes('.ness-tagboard-ribbon')).length,1);
 assert.equal(lib.filter(s=>s.view==='library-skin').length,1);
 assert.ok(!lib.some(s=>/старых полей|старые отметины|архиве JSON|миграци/i.test(s.title+' '+s.text)));
 const subject=lib.find(s=>s.title==='Данные для промпта');
 for(const tag of ['girl','boy','other','cat','dog'])assert.ok(subject.text.includes(tag));
 assert.match(subject.text,/дополнительные категории расширения, не документированные NovelAI как счётчики/);
 assert.match(read('shared-data.js'),/не являются официально документированными счётчиками NovelAI/);
 assert.match(read('library-runtime.js'),/https:\/\/docs\.novelai\.net\/en\/image\/multiplecharacters\//);
 assert.doesNotMatch(read('library-runtime.js'),/Старые отметины восстановлены в каталогах/);
});

test('Guide step navigation alone scrolls to its target; the scroll listener only fits the spotlight',()=>{
 const guide=read('onboarding.js'),gallery=read('media-slots.js');
 const go=guide.slice(guide.indexOf('async function go(i)'),guide.indexOf("next.addEventListener('click'"));
 assert.match(go,/if\(!abort&&mine===requestId&&target\?\.isConnected\)\{[\s\S]*?target\.scrollIntoView\?\.\(\{block:'center',inline:'nearest',behavior:'instant'\}\)/);
 assert.match(go,/if\(abort\|\|mine!==requestId\)return;\s*\}\s*fit\(\)/);
 assert.match(guide,/const onPosition=\(\)=>\{[^\n]*fit\(\)/);
 assert.equal((guide.match(/scrollIntoView/g)||[]).length,1);
 const tour=gallery.slice(gallery.indexOf('function guideStep(section)'),gallery.indexOf('async function publish('));
 assert.doesNotMatch(tour,/scrollIntoView/);
});
test('Resume is a distinct arrow left of the star, and the tour shows a non-generating demo',()=>{
 const gallery=read('media-slots.js'),steps=makeGuideSteps(true);
 assert.ok(steps.some(s=>s.view==='post-resume'&&s.title==='Если генерация прервалась'));
 const controls=gallery.slice(gallery.indexOf('function updatePostDraftControls'),gallery.indexOf('function updatePost(view'));
 assert.match(controls,/if\(!draft\)\{[\s\S]*?view\.draftButton\?\.remove/);
 assert.match(controls,/element\('button','tool draft-resume','↪'\)/);
 assert.match(controls,/executeCommand\('sp_ness_resume_post',view\)/);
 assert.match(controls,/view\.tools\.insertBefore\(button,view\.toggle\)/);
 const demo=gallery.slice(gallery.indexOf("if(section==='post-resume')"),gallery.indexOf("if (section === 'post-edit')"));
 assert.match(demo,/element\('button','tool draft-resume guide-resume','↪'\)/);
 assert.match(demo,/view\.tools\.insertBefore\(button,view\.toggle\)/);
 assert.match(demo,/return guideDemo\.resume/);
 assert.doesNotMatch(demo,/executeCommand|savePostDraft|discardPostDraft|generateImage/);
 assert.match(gallery,/demo\.resume\?\.remove\(\)/);
 assert.match(gallery,/if \(guideDemo && \['sp_ness_generate_at','sp_ness_resume_post'\]\.includes\(command\)\) return/);
});

test('Mobile library uses one compact action bar, collapsible search and shared bulk tags',()=>{
 const lib=read('library-runtime.js'),css=read('style.css'),index=read('index.js'),guide=makeGuideSteps(true);
 assert.match(lib,/function saveState\(state\)/);
 assert.match(lib,/view\.saveState\(saving\?'busy':dirty\|\|saveFailed\?'dirty':'saved'\)/);
 assert.match(lib,/if\(actions.parentNode!==target\)target.appendChild\(actions\)/);
 assert.match(lib,/deleteLibraryRecords\(draft,chosen\)/);
 assert.match(lib,/chip\.dataset\.assignment=all\?'all':partial\?'partial':'none'/);
 assert.match(lib,/assignSelectedTag\(id,!all\)/);
 assert.match(lib,/function confirmDeleteRecords\(ids\)/);
 assert.match(lib,/dialog\.finish\(\);if\(!editor\)view\.resetEditor\(\);changed\(true\);renderList\(\)/);
 assert.doesNotMatch(lib,/button\('Удалить персонажа',promptTab/);
 assert.match(css,/\.ness-library-layout\{display:none!important\}/);
 assert.match(css,/\.ness-footer-library\{display:flex;flex:0 0 auto/);
 assert.match(css,/\.ness-library-workspace\{order:2/);
 assert.match(css,/overscroll-behavior:auto!important/);
 assert.doesNotMatch(index,/formField\(grid, 'Генерировать напрямую через NovelAI'/);
 assert.match(index,/function directGenerationEnabled\(config, reuseSnapshot = false, useActiveStyle = false\)/);
 assert.match(index,/resolveGenerationPreset\(settings\(\),config,\{reuseSnapshot,useActiveStyle\}\)/);
 assert.match(index,/Boolean\(resolved.apiKey\)/);
 assert.ok(guide.some(s=>s.text.includes('SillyImages не используется')));
});

test('Mobile drawers reuse controls and the guide reveals their targets',()=>{
 const lib=read('library-runtime.js'),board=read('appearance-board.js'),guide=read('onboarding.js');
 assert.match(lib,/searchField\.hidden=Boolean\(mobile\?\.matches&&!searchOpen\)/);
 assert.match(lib,/navDrawer\.append\(tabs\.bar,controls\);toolsDrawer\.prepend\(toolBar\)/);
 assert.match(lib,/navDrawer\.hidden=drawer!=='nav';toolsDrawer\.hidden=drawer!=='tools'/);
 assert.match(lib,/else\{form\.insertBefore\(tabs\.bar,tabs\.viewport\)/);
 assert.match(board,/search\.dataset\.open=String\(tagSearchOpen\)/);
 assert.match(guide,/new CustomEvent\('spi-guide-reveal'/);
 assert.match(lib,/if\(dirty&&!document\.querySelector\('\[data-spi-tour\]'\)\)return await publishDraft\(false\)/);
 assert.match(lib,/if\(dirty&&!\(await publishDraft\(true\)\)\)return;\s*finish\(\)/);
 assert.match(lib,/if\(editor\.visibility\.flushPending\?\.\(\)===false\)throw Error/);
});

test('Exit handlers preserve the draft on a failed or invalid save, and skip writes in the guide',async()=>{
 const lib=read('library-runtime.js');
 const backSource=lib.slice(lib.indexOf('async function leaveEditor(){'),lib.indexOf('async function publishDraft('));
 const closeSource=lib.slice(lib.indexOf('async function closeLibrary(){'),lib.indexOf('close.onclick=()=>void closeLibrary()'));
 function harness({valid=true,success=true,dirty=true,guide=false}={}){
  const events=[];
  const create=new Function('events','valid','success','dirty','guide',
   'let busy=false,done=false,discardAsked=false,editor={visibility:{closeBoard(){}}};'+
   'const document={querySelector:()=>guide?{}:null},view={revealActions(){events.push("error")},resetEditor(){events.push("list")}},status=()=>{};'+
   backSource+'\n'+closeSource+
   '\nfunction tryFlush(){events.push("flush");return valid;}'+
   'async function publishDraft(keep){events.push(keep?"save-close":"save-back");if(success&&!keep)events.push("list");return success;}'+
   'function finish(){events.push("closed");}'+
   'function closeTagPicker(){}function closeNessTooltip(){}function renderList(){}'+
   'return {leaveEditor,closeLibrary};');
  return {events,...create(events,valid,success,dirty,guide)};
 }
 let h=harness();await h.leaveEditor();assert.deepEqual(h.events,['flush','save-back','list']);
 h=harness();await h.closeLibrary();assert.deepEqual(h.events,['flush','save-close','closed']);
 h=harness({success:false});await h.leaveEditor();assert.deepEqual(h.events,['flush','save-back']);
 h=harness({success:false});await h.closeLibrary();assert.deepEqual(h.events,['flush','save-close']);
 h=harness({valid:false});await h.leaveEditor();assert.deepEqual(h.events,['flush','error']);
 h=harness({valid:false});await h.closeLibrary();assert.deepEqual(h.events,['flush','error']);
 h=harness({dirty:false});await h.closeLibrary();assert.deepEqual(h.events,['flush','closed']);
 h=harness({guide:true});await h.leaveEditor();assert.deepEqual(h.events,['flush','list']);
});

test('Mobile disclosures fold after click dispatch rather than moving the tapped target on pointerdown',()=>{
 const lib=read('library-runtime.js'),board=read('appearance-board.js');
 assert.match(lib,/panel\.addEventListener\('click',outside\)/);
 assert.match(lib,/panel\.removeEventListener\('click',outside\)/);
 assert.match(lib,/panel\.addEventListener\('click',e=>\{if\(!searchToggle\.contains/);
 assert.match(board,/frame\.addEventListener\('click',e=>\{\s*if\(!mobile\(\)\|\|!tagSearchOpen\)return/);
});

test('Style library keeps its compact toolbar, existing rows and current style data',()=>{
 const source=read('index.js'),body=source.slice(source.indexOf('function openStyleLibrary('),source.indexOf('async function openLibrary()'));
 assert.doesNotMatch(body,/Inline Images|inline_image_gen/);
 assert.match(body,/iconButton\('\+', 'Новый стиль', controls/);
 assert.match(body,/iconButton\('⊘', 'Без стиля', controls/);
 assert.match(body,/noneStyleButton\.setAttribute\('aria-pressed', String\(!novelai\.activeStyleId\)\)/);
 assert.match(body,/let row = previous\.get\(id\)/);
 assert.match(body,/const source = novelai\.styles\.find\(item => item\.id === id\)/);
 assert.match(body,/rows\.scrollTop = scrollTop/);
 assert.match(read('style.css'),/\.spi-style-header \{ display:flex/);
 assert.match(read('style.css'),/\.spi-style-rows \{[^}]*overflow:auto/);
 const css=read('style.css');
 assert.match(body,/summary\.className = 'menu_button spi-style-summary'/);
 assert.match(css,/\.spi-style-row > :nth-child\(2\) \{ grid-column:2; grid-row:1; \}/);
 assert.match(css,/\.menu_button\.spi-style-summary \{[^}]*display:flex !important[^}]*width:100% !important[^}]*color:var\(--SmartThemeBodyColor/);
 assert.match(css,/\.spi-style-summary > :is\(strong,small\) \{[^}]*display:block !important[^}]*text-overflow:ellipsis/);
 assert.ok(makeGuideSteps(true).some(step=>step.text.includes('кружок ⊘')));
});

test('Compact style actions retain rows, preserve input, duplicate current content and leave saved styles intact',()=>{
 const src=read('index.js'),body=src.slice(src.indexOf('function openStyleLibrary('),src.indexOf('async function openLibrary()'));
 class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.scrollTop=0;this.textContent='';this.value='';this.className='';this.classList={add:name=>{this.className+=' '+name;},toggle:(name,on)=>{const names=new Set(this.className.split(' ').filter(Boolean));on?names.add(name):names.delete(name);this.className=[...names].join(' ');}};}
  append(...nodes){for(const node of nodes)this.insertBefore(node,null);}
  prepend(node){this.insertBefore(node,this.children[0]||null);}
  insertBefore(node,before){if(node===before)return;node.remove();const pos=this.children.indexOf(before);this.children.splice(pos<0?this.children.length:pos,0,node);node.parentElement=this;}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1);this.parentElement=null;}}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  focus(){}select(){}
  getBoundingClientRect(){return {top:0,bottom:10};}
  matches(s){return s[0]==='.'?this.className.split(' ').includes(s.slice(1)):s==='[data-style-activate]'?Object.hasOwn(this.dataset,'styleActivate'):this.tagName===s;}
  querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  click(){(this.events.click||this.onclick)?.({stopPropagation(){}});}
 }
 const create=tag=>new Node(tag),root=normalizeStylePresets({imageProvider:'novelai',novelai:normalizeNovelAISettings({styles:[{id:'a',name:'A',value:'old'},{id:'b',name:'B',value:'second'}],activeStyleId:'a',apiKey:'unchanged'}),naistera:normalizeNaisteraSettings()}),dialog=create('div');
 const doc={createElement:create,createElementNS:(ns,tag)=>create(tag)};
 const btn=(label,parent,action)=>{const n=create('button');n.textContent=label;n.className='menu_button';n.addEventListener('click',action);parent.append(n);return n;};
 const field=(parent,label,node)=>{const wrap=create('label');wrap.append(node);parent.append(wrap);return node;};
 const select=(options,value)=>{const n=create('select');n.value=value;return n;};
 const activeStyle=nai=>nai.styles.find(x=>x.id===nai.activeStyleId);
 const open=new Function('document','settings','shell','input','formField','button','normalizeNovelAISettings','saveSettings','clone','confirm','select','NOVELAI_MODEL_CHOICES','V5_FULL_MODEL','MEDIUM_MODEL','NOVELAI_SAMPLERS','NAISTERA_MODELS','novelAIModelControls','novelAIModelFromControls','presetFromSettings','cfgValidationErrors','activeStyle',body+'\nreturn openStyleLibrary;')(doc,()=>root,()=>({dialog,closed:Promise.resolve()}),()=>create('input'),field,btn,normalizeNovelAISettings,()=>{},structuredClone,()=>true,select,NOVELAI_MODEL_CHOICES,V5_FULL_MODEL,MEDIUM_MODEL,NOVELAI_SAMPLERS,NAISTERA_MODELS,novelAIModelControls,novelAIModelFromControls,presetFromSettings,cfgValidationErrors,activeStyle);
 open();
 const rows=dialog.querySelector('.spi-style-rows'),header=dialog.querySelector('.spi-style-controls'),first=rows.children[0],second=rows.children[1],name=dialog.querySelector('input'),value=dialog.querySelector('textarea');
 assert.equal(first.querySelector('strong').textContent,'A');
 assert.equal(first.querySelector('small').textContent,'old');
 assert.equal(second.querySelector('strong').textContent,'B');
 assert.equal(first.querySelector('.spi-style-summary').attrs['aria-label'],'A');
 name.value='Edited';name.events.input();value.value='new content ';value.events.input();
 assert.equal(first.querySelector('strong').textContent,'Edited');
 assert.equal(first.querySelector('small').textContent,'new content');
 assert.equal(first.querySelector('.spi-style-summary').attrs['aria-label'],'Edited');
 header.children[1].click();assert.equal(root.novelai.activeStyleId,'');assert.equal(value.value,'');assert.equal(root.novelai.styles[0].value,'new content');assert.strictEqual(rows.children[0],first);
 first.children[2].click();assert.equal(root.novelai.styles[2].name,'Edited — копия');assert.equal(root.novelai.styles[2].value,'new content ' .trim());assert.deepEqual(root.novelai.styles[2].preset,root.novelai.styles[0].preset);
 assert.strictEqual(rows.children[0],first);assert.strictEqual(rows.children[1],second);
 header.children[0].click();assert.equal(root.novelai.styles.length,4);assert.strictEqual(rows.children[0],first);
 first.children[0].click();assert.equal(root.novelai.activeStyleId,'a');
 first.children[3].click();assert.equal(root.novelai.activeStyleId,'');assert.strictEqual(rows.children[0],second);assert.equal(root.novelai.apiKey,'unchanged');
});
