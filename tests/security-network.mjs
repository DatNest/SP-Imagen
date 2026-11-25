import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 OFFICIAL_NOVELAI_ORIGIN, officialNovelAIEndpoint, directTextOrigin,
 requireTrustedDirectEndpoint, credentialRequestOptions, isLocalGalleryImage
} from '../security-network.js';
import { checkNovelAISubscription } from '../novelai.js';
import { testTextApi, generateTextCompletion } from '../text-api.js';

test('NovelAI bearer token is pinned to the official HTTPS origin', () => {
 assert.equal(officialNovelAIEndpoint('https://image.novelai.net'),OFFICIAL_NOVELAI_ORIGIN);
 assert.equal(officialNovelAIEndpoint('https://image.novelai.net/ai/generate-image'),OFFICIAL_NOVELAI_ORIGIN);
 for(const url of [
  'https://image.novelai.net.evil.example/',
  'https://image.novelai.net@evil.example/',
  'http://image.novelai.net/',
  'https://evil.example/image.novelai.net/',
  'https://image.novelai.net.evil.example/ai/generate-image',
  'https://image.novelai.net/redirect',
  'https://image.novelai.net/?other=1',
  'https://image.novelai.net/#anchor',
  'https://user:pass@image.novelai.net',
  'javascript:alert(1)',
 ]) assert.throws(()=>officialNovelAIEndpoint(url),/безопасность|NovelAI|адрес/i,url);
});

test('Text API direct key is blocked until exact destination origin is approved', () => {
 assert.equal(directTextOrigin('https://api.openai.com/v1'),'https://api.openai.com');
 assert.equal(directTextOrigin('http://127.0.0.1:8000/v1'),'http://127.0.0.1:8000');
 assert.equal(directTextOrigin('http://localhost:5000/v1'),'http://localhost:5000');
 assert.equal(requireTrustedDirectEndpoint('https://api.openai.com/v1','https://api.openai.com'),'https://api.openai.com');
 assert.throws(()=>requireTrustedDirectEndpoint('https://api.openai.com/v1',''),/не подтверждён/i);
 assert.throws(()=>requireTrustedDirectEndpoint('https://evil.example/v1','https://api.openai.com'),/не подтверждён/i);
 for(const url of [
  'http://api.openai.com/v1','ftp://api.example/v1',
  'https://person:password@api.openai.com/v1',
  'https://api.openai.com/v1?key=secret',
  'https://api.openai.com/v1#fragment',
  'https://api.openai.com.evil.test/v1#fragment',
 ]) assert.throws(()=>directTextOrigin(url),/безопасность|Текстовый API/i,url);
});

test('All credential requests refuse redirect and omit third-party cookies/referrers', () => {
 const options=credentialRequestOptions({headers:{Authorization:'Bearer test'},redirect:'follow',credentials:'include',referrerPolicy:'origin'});
 assert.equal(options.redirect,'error');
 assert.equal(options.credentials,'omit');
 assert.equal(options.referrerPolicy,'no-referrer');
 assert.equal(options.cache,'no-store');
 assert.equal(options.headers.Authorization,'Bearer test');
});

test('Gallery never fetches remote tracking sources from imported chat history', () => {
 const here='https://tavern.example';
 for(const source of [
  'https://tracker.example/pixel.png', '//tracker.example/pixel.png',
  'http://tavern.example/pixel.png',
  'javascript:alert(1)', 'data:text/html,<img src=x>',
  'data:image/svg+xml;base64,PHN2Zy8+',
  'blob:https://tracker.example/abc',
  'https://person:password@tavern.example/file.png',
 ]) assert.equal(isLocalGalleryImage(source,here),false,source);
 for(const source of [
  '/user/images/SP-Imagen/image.png','user/images/picture.webp',
  'https://tavern.example/user/images/image.png',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
 ]) assert.equal(isLocalGalleryImage(source,here),true,source);
});

test('No automatic web lookup of private character names remains',()=>{
 const runtime=readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
 assert.doesNotMatch(runtime,/fetch\(['"]https:\/\/en\.wikipedia\.org/);
 const slots=readFileSync(new URL('../media-slots.js',import.meta.url),'utf8');
 assert.match(slots,/isLocalGalleryImage/);
 assert.doesNotMatch(slots,/slot\.versions\s*=\s*slot\.versions\.filter\(/);
 assert.match(slots,/openLegacyRemote\(item\.src\)/);
});

test('Rejected NovelAI and unapproved text targets cause zero fetch calls',async()=>{
 const previous=globalThis.fetch;const requests=[];
 globalThis.fetch=(...args)=>{requests.push(args);throw Error('Unexpected network request');};
 try {
  await assert.rejects(checkNovelAISubscription({
   endpoint:'https://image.novelai.net.evil.example',apiKey:'pst-NOT-A-REAL-KEY'
  }),/безопасность|NovelAI/i);
  await assert.rejects(testTextApi({
   mode:'direct',endpoint:'https://evil.example/v1',approvedOrigin:'',
   apiKey:'test-not-a-key',model:'test'
  }),/не подтверждён/i);
  assert.equal(requests.length,0);
 } finally { globalThis.fetch=previous; }
});


test('Normal official NovelAI subscription request still succeeds',async()=>{
 const previous=globalThis.fetch, calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({active:true,tier:3,expiresAt:4102444800})};
 };
 try{
  const result=await checkNovelAISubscription({endpoint:OFFICIAL_NOVELAI_ORIGIN,apiKey:'dummy-test-key'});
  assert.equal(result.active,true);
  assert.equal(calls.length,1);
  assert.equal(String(calls[0].url),'https://image.novelai.net/user/subscription');
  assert.equal(calls[0].options.headers.Authorization,'Bearer dummy-test-key');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.credentials,'omit');
 }finally{globalThis.fetch=previous;}
});

test('Approved direct text provider can list models and generate normally',async()=>{
 const previous=globalThis.fetch,calls=[];
 const input={mode:'direct',endpoint:'https://provider.example/v1',approvedOrigin:'https://provider.example',apiKey:'dummy-test-key',model:'example-model'};
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>String(url).endsWith('/models')
   ? {data:[{id:'example-model'}]}
   : {choices:[{message:{content:'ok'}}]}};
 };
 try{
  const models=await testTextApi(input);
  const content=await generateTextCompletion(input,[{role:'user',content:'hi'}],undefined,null);
  assert.deepEqual(models,['example-model']);
  assert.equal(content,'ok');
  assert.equal(calls.length,2);
  assert.equal(String(calls[0].url),'https://provider.example/v1/models');
  assert.equal(String(calls[1].url),'https://provider.example/v1/chat/completions');
  assert.equal(calls[1].options.headers.Authorization,'Bearer dummy-test-key');
  assert.equal(calls[1].options.redirect,'error');
  assert.equal(calls[1].options.credentials,'omit');
  assert.match(calls[1].options.body,/"content":"hi"/);
 }finally{globalThis.fetch=previous;}
});

test('Existing gallery version records survive even when previews are blocked',()=>{
 const source=readFileSync(new URL('../media-slots.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/slot\.versions\s*=\s*slot\.versions\.filter/);
 assert.match(source,/const safe=safeUrl\(source\);/);
 assert.match(source,/media=safe\?element\('img'\):element\('span','external-image-warning'\)/);
 assert.match(source,/if\(safe\)media\.src=source;/);
 assert.match(source,/host\.confirm\('Это изображение хранится на внешнем сайте/);
});

test('Native JSON mode is opt-in and limited to direct structured director calls without retries',async()=>{
 const previous=globalThis.fetch,calls=[];
 const input={mode:'direct',endpoint:'https://provider.example/v1',approvedOrigin:'https://provider.example',apiKey:'dummy-test-key',model:'example-model'};
 const messages=[{role:'system',content:'Return JSON using sp-imagen-slots-v1'},{role:'user',content:'Scene'}];
 let status=200;
 globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:status===200,status,json:async()=>({choices:[{message:{content:'{}'}}]})};};
 try{
  await generateTextCompletion(input,messages,undefined,null);
  assert.equal(calls[0].response_format,undefined);
  await generateTextCompletion({...input,jsonMode:true},messages,undefined,null);
  assert.deepEqual(calls[1].response_format,{type:'json_object'});
  await generateTextCompletion({...input,jsonMode:true},[{role:'user',content:'Translate this'}],undefined,null);
  assert.equal(calls[2].response_format,undefined);
  status=400;
  await assert.rejects(generateTextCompletion({...input,jsonMode:true},messages,undefined,null),/HTTP 400/);
  assert.equal(calls.length,4);
 }finally{globalThis.fetch=previous;}
});
