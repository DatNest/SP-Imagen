import test from 'node:test';
import assert from 'node:assert/strict';
import { spImagenOwnedImagePath, isReferencedInCurrentChat, deleteSpImagenOwnedFile } from '../gallery-file-cleanup.js';
import { readFileSync } from 'node:fs';

const origin='https://tavern.example';
const owned='user/images/sp-imagen/image_1795291234567.png';

test('only SP Imagen-owned generated filenames can be erased',()=>{
 assert.equal(spImagenOwnedImagePath(owned,origin),owned);
 assert.equal(spImagenOwnedImagePath('/'+owned,origin),owned);
 assert.equal(spImagenOwnedImagePath(origin+'/'+owned,origin),owned);
 for(const path of [
  'https://evil.example/'+owned,
  '//evil.example/'+owned,
  'https://tavern.example.evil.example/'+owned,
  'user/images/other/image_1795291234567.png',
  'user/images/sp-imagen/other.png',
  'user/images/sp-imagen/image_1795291234567.svg',
  'user/images/sp-imagen/../character.png',
  'user/images/sp-imagen/image_1795291234567.png?x=1',
  'user/images/sp-imagen/image_1795291234567%2epng',
  'data:image/png;base64,AABBCC',
  'blob:https://tavern.example/abc',
  'javascript:alert(1)',
 ])assert.equal(spImagenOwnedImagePath(path,origin),null,path);
});

test('Shared images in another version, legacy entry or RP text must be retained',()=>{
 const old={src:owned};
 const other={src:owned};
 const chat=[{mes:'hello',extra:{ness_media_slots_v2:{snapshot:{versions:[old]}}}},
             {mes:'hello',extra:{ness_media_slots_v2:{comic:{versions:[other]}}}}];
 assert.equal(isReferencedInCurrentChat(chat,owned),true);
 assert.equal(isReferencedInCurrentChat(chat,owned,{index:0,kind:'snapshot',item:old}),true);
 chat[1].extra.ness_media_slots_v2.comic.versions=[];
 assert.equal(isReferencedInCurrentChat(chat,owned,{index:0,kind:'snapshot',item:old}),false);
 chat[1].mes='See '+owned;
 assert.equal(isReferencedInCurrentChat(chat,owned,{index:0,kind:'snapshot',item:old}),true);
 chat[1].mes='hello';chat[1].extra.sp_imagen_embeds=[{src:owned,kind:'snapshot'}];
 assert.equal(isReferencedInCurrentChat(chat,owned,{index:0,kind:'snapshot',item:old}),true);
});

test('Server delete uses only same-origin ST endpoint, CSRF headers, and no redirect',async()=>{
 const calls=[],headers={'Content-Type':'application/json','X-CSRF-Token':'testcsrf'};
 const fetchImpl=async(path,options)=>{calls.push({path,options});return {ok:true,status:200};};
 assert.deepEqual(await deleteSpImagenOwnedFile(owned,{origin,fetchImpl,headers}),{deleted:true});
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/api/images/delete');
 assert.equal(calls[0].options.method,'POST');
 assert.equal(calls[0].options.credentials,'same-origin');
 assert.equal(calls[0].options.redirect,'error');
 assert.deepEqual(calls[0].options.headers,headers);
 assert.deepEqual(JSON.parse(calls[0].options.body),{path:owned});
 assert.deepEqual(await deleteSpImagenOwnedFile('https://other.example/a.png',{origin,fetchImpl,headers}),{deleted:false,reason:'unmanaged'});
 assert.equal(calls.length,1);
});

test('Deletion API 404 is success, server errors preserve uncertainty',async()=>{
 assert.deepEqual(await deleteSpImagenOwnedFile(owned,{origin,fetchImpl:async()=>({status:404,ok:false}),headers:{}}),{deleted:true,missing:true});
 await assert.rejects(deleteSpImagenOwnedFile(owned,{origin,fetchImpl:async()=>({status:403,ok:false}),headers:{}}),/HTTP 403/);
});

test('Gallery does not persist inline generated base64 when saving fails',()=>{
 const src=readFileSync(new URL('../media-slots.js',import.meta.url),'utf8');
 assert.match(src,/if\s*\(!safeUrl\(storedSrc\)\s*\|\|\s*\/\^data:\//);
 assert.match(src,/await current\.saveChat\(\)/);
 assert.match(src,/deleteSpImagenOwnedFile\(selectedImage\.src/);
 assert.match(src,/legacy\.filter\(item =>/);
 assert.match(src,/if\s*\(isReferencedInCurrentChat\(chat, selectedImage\.src\)\)/);
});
