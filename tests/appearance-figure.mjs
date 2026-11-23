import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeAppearanceFigure} from '../appearance-figure.js';
import {NESS_APPEARANCE_PRESETS} from '../shared-data.js';
import {SKIN_PRESETS,NSFW_PRESETS,createAppearanceBoard} from '../appearance-board.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('One schematic figure covers every actual base, skin and NSFW area, without anatomical labels in ordinary modes',()=>{
 const modes={base:['always',...Object.keys(NESS_APPEARANCE_PRESETS)],
              skin:['always',...Object.keys(SKIN_PRESETS)],
              nsfw:Object.keys(NSFW_PRESETS)};
 let count=0;
 for(const [mode,presets]of Object.entries(modes)){
  for(const preset of presets){
   const figure=describeAppearanceFigure(mode,preset);
   assert.ok(figure.zones.length>0,mode+':'+preset);
   assert.ok(['long','sleeveless','bare'].includes(figure.top));
   assert.ok(['pants','shorts','none'].includes(figure.bottom));
   assert.ok(figure.description);
   assert.equal(figure.rear,preset.endsWith('_back')||preset==='nsfwLowerBack');
   if(mode!=='nsfw')assert.equal(figure.anatomy,'none');
   count++;
  }
 }
 assert.equal(count,19);
 assert.equal(describeAppearanceFigure('skin','arms').top,'sleeveless');
 assert.equal(describeAppearanceFigure('skin','legs').bottom,'shorts');
 assert.equal(describeAppearanceFigure('skin','upper_back').top,'bare');
 assert.equal(describeAppearanceFigure('nsfw','nsfwChest').anatomy,'chest');
 assert.equal(describeAppearanceFigure('nsfw','nsfwLowerBack').anatomy,'rear');
 assert.equal(describeAppearanceFigure('nsfw','nsfwLowerFront').bottom,'none');
});

test('Figure is a single SVG with front-only face, rear-only markers and regions outlined above clothes',()=>{
 const code=read('appearance-figure.js'),css=read('style.css');
 assert.equal(code.match(/'<svg class=/g)?.length,1);
 assert.match(code,/data-anatomy="chest"/);
 assert.match(code,/data-anatomy="rear"/);
 assert.match(code,/data-zone="arm-left"/);
 assert.match(code,/data-zone="leg-right"/);
 assert.match(code,/svg\.classList\.toggle\('is-rear',plan\.rear\)/);
 assert.match(code,/classList\.toggle\('is-lit',plan\.zones\.includes/);
 assert.match(code,/classList\.toggle\('is-off',!clothes/);
 assert.match(css,/\.ness-figure-svg\.is-rear \.figure-front\{display:none!important/);
 assert.match(css,/\.ness-figure-svg \[data-zone\]\.is-lit\{opacity:1\}/);
 assert.match(css,/\.ness-figure-svg \.figure-anatomy\.is-visible\{display:block\}/);
 assert.match(css,/--figure-hot:color-mix\(in srgb,var\(--ness-accent\)/);
});

test('Existing camera and mode controls move to the pinned card and return to the original bar, with no extra model logic',()=>{
 const board=read('appearance-board.js'),library=read('library-runtime.js'),styles=read('style.css');
 assert.match(board,/const figure=createAppearanceFigure\(ui,helpLayout/);
 assert.match(board,/figure\.pickerHost\.appendChild\(modes\)/);
 assert.match(board,/figure\.pickerHost\.appendChild\(ribbon\)/);
 assert.match(board,/frame\.insertBefore\(modes,header\)/);
 assert.match(board,/content\.insertBefore\(ribbon,content\.firstChild/);
 assert.match(board,/getHintPinned:\(\)=>helpPinned,isHintPeek:\(\)=>helpPeek,setHintPinned,toggleHintPeek/);
 assert.match(library,/pinHint=button\('Подсказка',formatStrip/);
 assert.match(library,/bulb=button\('💡',formatStrip/);
 assert.match(library,/initialHelpPinned:appearanceHintPinned/);
 assert.match(library,/inlineBoard\.element\.insertBefore\(proseWrap,editorBody\.parentElement\)/);
 assert.match(styles,/\.ness-appearance-main\[data-help-open=true\]\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(190px,225px\)/);
 assert.match(styles,/\.ness-tagboard-columns\{\s*display:grid;grid-template-columns:minmax\(0,1\.1fr\) minmax\(0,\.9fr\)/);
 assert.match(styles,/@media\(max-width:760px\),\(pointer:coarse\)\{\s*#sp-imagen-review-panel \.ness-appearance-main/);
 assert.match(styles,/\.ness-appearance-main\[data-help-open=true\]>\.ness-figure-hint\{\s*order:0;width:100%/);
});

test('Help cannot change image prompts or saved character catalogue',()=>{
 const board=read('appearance-board.js');
 const figure=read('appearance-figure.js');
 assert.doesNotMatch(figure,/SillyTavern\.getContext|extensionSettings|localStorage|writeBaseState|writeNsfwState|changed\(\)/);
 assert.doesNotMatch(board.slice(board.indexOf('function setHintPinned'),board.indexOf('function getCatalog')),/writeBaseState|writeNsfwState|changed\(\)|record\(\)/);
 assert.ok(read('library-runtime.js').includes("window.localStorage?.setItem('sp-imagen-figure-pinned'"));
});
