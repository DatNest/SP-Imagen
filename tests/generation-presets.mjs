import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultNovelAISettings,normalizeNovelAISettings,novelAIModelControls,novelAIModelFromControls,generateNovelAI,applyNovelAIMode,MEDIUM_MODEL,V5_FULL_MODEL} from '../novelai.js';
import {normalizeNaisteraSettings} from '../naistera.js';
import {normalizeStylePresets,presetFromSettings,resolveGenerationPreset,publicGenerationSettings} from '../generation-presets.js';
import {readFileSync} from 'node:fs';

const make=()=>normalizeStylePresets({imageProvider:'novelai',novelai:normalizeNovelAISettings({...defaultNovelAISettings(),apiKey:'TEST',negativePrompt:'old negative',model:MEDIUM_MODEL,styles:[{id:'one',name:'One',value:'watercolor'},{id:'two',name:'Two',value:'ink'}],activeStyleId:'one'}),naistera:normalizeNaisteraSettings({apiKey:'PROXY'})});
test('Legacy styles inherit old generation settings once and preserve independently edited negatives',()=>{
 const s=make(),one=s.novelai.styles[0],two=s.novelai.styles[1];
 assert.equal(one.preset.settings.negativePrompt,'old negative');assert.equal(two.preset.settings.model,MEDIUM_MODEL);
 one.preset=presetFromSettings(s,'novelai',{model:V5_FULL_MODEL,negativePrompt:'custom',mode:'furry',cfgScale:4});
 s.novelai.negativePrompt='new default';s.novelai=normalizeNovelAISettings(s.novelai);normalizeStylePresets(s);
 assert.equal(s.novelai.styles[0].preset.settings.negativePrompt,'custom');
 assert.equal(s.novelai.styles[1].preset.settings.negativePrompt,'old negative');
 assert.equal(s.novelai.styles[0].preset.settings.mode,'furry');
 assert.equal(s.novelai.styles[0].preset.settings.apiKey,undefined);
 assert.equal(s.quickStyleSwitch,true);
});
test('Effort maps only V5 Full to the real medium model',()=>{
 assert.deepEqual(novelAIModelControls(MEDIUM_MODEL),{model:V5_FULL_MODEL,effort:'medium'});
 assert.equal(novelAIModelFromControls(V5_FULL_MODEL,'medium'),MEDIUM_MODEL);
 assert.equal(novelAIModelFromControls(V5_FULL_MODEL,'high'),V5_FULL_MODEL);
 assert.equal(novelAIModelFromControls('nai-diffusion-5-curated','medium'),'nai-diffusion-5-curated');
});
test('Preset activation changes the entire effective request while current credentials and spending protection remain authoritative',()=>{
 const s=make();s.novelai.styles[0].preset=presetFromSettings(s,'novelai',{model:V5_FULL_MODEL,mode:'furry',negativePrompt:'no blur',cfgScale:5,steps:18,neverSpendAnlas:false,apiKey:'WRONG'});
 s.novelai.styles[1].preset=presetFromSettings(s,'naistera',{model:'novelai-v4.5',negativePrompt:'no noise',cfgScale:8});
 let next=resolveGenerationPreset(s);assert.equal(next.settings.model,V5_FULL_MODEL);assert.equal(next.settings.mode,'furry');assert.equal(next.settings.steps,18);assert.equal(next.settings.cfgScale,5);assert.equal(next.settings.negativePrompt,'no blur');assert.equal(next.settings.apiKey,'TEST');assert.equal(next.settings.neverSpendAnlas,true);
 s.novelai.activeStyleId='two';next=resolveGenerationPreset(s);assert.equal(next.provider,'naistera');assert.equal(next.settings.model,'novelai-v4.5');assert.equal(next.settings.negativePrompt,'no noise');assert.equal(next.settings.apiKey,'PROXY');
 s.novelai.activeStyleId='';next=resolveGenerationPreset(s);assert.equal(next.settings.model,MEDIUM_MODEL);assert.equal(next.settings.negativePrompt,'old negative');
});
test('Historical editor regeneration preserves its saved model and mode; ordinary repeat uses active preset',()=>{
 const s=make();s.novelai.styles[0].preset=presetFromSettings(s,'naistera',{negativePrompt:'new'});
 const cfg={spImagenDirect:{provider:'novelai',settings:{model:'nai-diffusion-5-curated',negativePrompt:'historical',cfgScale:4,neverSpendAnlas:false,apiKey:'WRONG'}}};
 let got=resolveGenerationPreset(s,cfg,{reuseSnapshot:true});assert.equal(got.provider,'novelai');assert.equal(got.settings.mode,'anime');assert.equal(got.settings.model,'nai-diffusion-5-curated');assert.equal(got.settings.negativePrompt,'historical');assert.equal(got.settings.apiKey,'TEST');assert.equal(got.settings.neverSpendAnlas,true);
 got=resolveGenerationPreset(s,cfg,{reuseSnapshot:true,useActiveStyle:true});assert.equal(got.provider,'naistera');assert.equal(got.settings.negativePrompt,'new');
 assert.equal(publicGenerationSettings('naistera',got.settings).apiKey,undefined);
});
test('Actual NovelAI payload adds the furry prefix once and keeps Medium negatives out without deleting saved text',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({images:[{image:'iVBORw0KGgo='}]})}};
 try{
  const s=make();s.novelai.neverSpendAnlas=false;
  s.novelai.styles[0].preset=presetFromSettings(s,'novelai',{model:MEDIUM_MODEL,mode:'furry',negativePrompt:'no noise',steps:25});
  const m=await generateNovelAI({settings:resolveGenerationPreset(s).settings,prompt:'blue eyes, reading',style:'watercolor'});
  assert.equal(calls[0].model,MEDIUM_MODEL);assert.equal(calls[0].input,'fur dataset, watercolor, blue eyes, reading');assert.equal(calls[0].parameters.steps,14);assert.equal(calls[0].parameters.negative_prompt,'');
  assert.equal(m.settings.negativePrompt,'no noise');assert.equal(s.novelai.styles[0].preset.settings.negativePrompt,'no noise');
  s.novelai.styles[0].preset.settings.model=V5_FULL_MODEL;
  await generateNovelAI({settings:resolveGenerationPreset(s).settings,prompt:'reading',style:'fur dataset, watercolor'});
  assert.equal(calls[1].input,'fur dataset, watercolor, reading');assert.equal(calls[1].parameters.negative_prompt,'no noise');
  assert.equal(applyNovelAIMode('watercolor','anime'),'watercolor');
 }finally{globalThis.fetch=original;}
});
test('Quick style selector only changes the selected id, with a persistent visibility preference',()=>{
 const src=readFileSync(new URL('../index.js',import.meta.url),'utf8');
 assert.match(src,/current\.novelai\.activeStyleId=style\.id/);assert.match(src,/rootSettings\.quickStyleSwitch=quick\.checked/);
 assert.match(src,/formField\(editor,'Негативный промпт',negative\)/);
 assert.match(src,/resolveGenerationPreset\(state,config,\{reuseSnapshot,useActiveStyle\}\)/);
 const connection=src.slice(src.indexOf('function openNovelAISettings'),src.indexOf('function openStyleLibrary'));
 assert.doesNotMatch(connection,/formField\(grid,\s*'Негативный промпт'/);
});

test('Unified settings has two real tabs, one menu entry and matching guide targets',()=>{
 const src=readFileSync(new URL('../index.js',import.meta.url),'utf8'),guide=readFileSync(new URL('../onboarding.js',import.meta.url),'utf8');
 assert.match(src,/\['connection','Подключение'\],\['styles','Стили'\]/);
 assert.match(src,/button\('Настройки NovelAI', body/);
 assert.doesNotMatch(src,/button\('Стили', body/);
 assert.match(src,/openStyleLibrary\(\{host:\{dialog:body,closed:window.closed\}\}\)/);
 assert.match(src,/style\.preset=presetFromSettings\(root,'novelai',\{\.\.\.next,negativePrompt:style\.preset\.settings\.negativePrompt\}\)/);
 assert.doesNotMatch(guide,/data-spi-action="styles"/);
 assert.match(guide,/selector:'\.spi-novelai-tabbar'/);
 assert.match(guide,/selector:'\.spi-quick-style-setting'/);
 assert.match(src,/classList\.add\('spi-quick-style-setting'\)/);
});
