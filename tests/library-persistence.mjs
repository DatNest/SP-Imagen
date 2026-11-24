import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryStore,createLibraryFileTransport,applyCommittedIcon,LIBRARY_FILE,BACKUP_FILE} from '../library-persistence.js';
import {createSpImagenLibraryRuntime} from '../library-runtime.js';
import {MASTER_LIBRARY_KEY} from '../shared-data.js';
const sample=(revision=1,icon='data:image/png;base64,iVBORw0KGgo=')=>JSON.stringify({version:1,catalogRevision:revision,personas:{a:{name:'A',base:'blue eyes',libraryIconData:icon,appearanceSelections:{face:[{start:0,end:9}]},appearanceCatalog:{modes:{base:{tags:[{id:'keep',text:'blue eyes'}]}}}}},characters:{},organizer:{version:3,tags:[{id:'tag',name:'keep'}],characters:{a:{tagIds:['tag']}},filterTagId:'tag'},custom:'preserve'});
function harness(){const files=new Map();let writes=0;return {files,get writes(){return writes;},transport:{async read(k){return files.get(k)??null;},async write(k,v){writes++;files.set(k,v);}}};}
test('Seed preserves exact current and previous; reload ignores stale settings after an update',async()=>{
 const h=harness(),old=sample(),prev=sample(99,'data:image/png;base64,AAAA');let legacy={current:old,previous:prev};
 let s=createLibraryStore({transport:h.transport,legacy:()=>legacy});
 assert.equal(await s.refresh(),old);assert.deepEqual(s.history,[prev]);
 const next=sample(2,'data:image/png;base64,BBBB');await s.commit(next,old);
 s=createLibraryStore({transport:h.transport,legacy:()=>legacy});
 const before=h.writes;assert.equal(await s.refresh(),next);assert.equal(h.writes,before);assert.deepEqual(s.history,[old,prev]);
 assert.equal(JSON.parse(h.files.get(BACKUP_FILE)).current,old);
 await assert.rejects(s.commit(sample(3),old),/изменилась/);assert.equal(s.raw,next);
});
test('History is bounded and no-op saves do not write',async()=>{
 const h=harness(),s=createLibraryStore({transport:h.transport,legacy:()=>({current:sample()})});
 let raw=await s.refresh();for(let n=2;n<10;n++){const next=sample(n);await s.commit(next,raw);raw=next;}
 assert.equal(s.history.length,5);const before=h.writes;await s.commit(raw,raw);assert.equal(h.writes,before);
});
test('Missing or corrupt primary never overwrites last backup',async()=>{
 const h=harness(),s=createLibraryStore({transport:h.transport,legacy:()=>({current:sample()})});
 const raw=await s.refresh(),next=sample(2);await s.commit(next,raw);
 const backup=h.files.get(BACKUP_FILE);h.files.delete(LIBRARY_FILE);
 const fresh=createLibraryStore({transport:h.transport,legacy:()=>({current:raw})});
 await assert.rejects(fresh.refresh(),/отсутствует/);assert.equal(h.files.get(BACKUP_FILE),backup);
 h.files.set(LIBRARY_FILE,'corrupt');await assert.rejects(fresh.refresh());assert.equal(h.files.get(LIBRARY_FILE),'corrupt');
});
test('Unconfirmed primary writes fail without claiming save succeeded',async()=>{
 const h=harness(),s=createLibraryStore({transport:h.transport,legacy:()=>({current:sample()})});
 const raw=await s.refresh(),write=h.transport.write;
 h.transport.write=async(k,v)=>{if(k!==LIBRARY_FILE)await write(k,v);};
 await assert.rejects(s.commit(sample(2),raw),/не подтверждена/);assert.equal(s.raw,raw);
 assert.equal(JSON.parse(h.files.get(BACKUP_FILE)).current,raw);
});
test('Icon-only commit updates the live draft even after an editor object was replaced',()=>{
 const draft=JSON.parse(sample());const stale=draft.personas.a;draft.personas.a={...stale,base:'unsaved new text'};
 applyCommittedIcon(draft,'a','new',{catalogRevision:9,savedAt:'now'});
 assert.equal(draft.personas.a.libraryIconData,'new');assert.equal(draft.personas.a.base,'unsaved new text');assert.notEqual(stale.libraryIconData,'new');assert.equal(draft.catalogRevision,9);
 applyCommittedIcon(draft,'a','',{catalogRevision:10,savedAt:'later'});assert.ok(!Object.hasOwn(draft.personas.a,'libraryIconData'));
});
test('Transport writes UTF-8 to same-origin files and bypasses read cache',async()=>{
 let data;const t=createLibraryFileTransport({headers:()=>({'X-Test':'yes'}),fetcher:async(url,options)=>{
  if(url==='/api/files/upload'){assert.equal(options.headers['X-Test'],'yes');const body=JSON.parse(options.body);data=Buffer.from(body.data,'base64').toString('utf8');return {ok:true};}
  assert.equal(url,'/user/files/'+LIBRARY_FILE);assert.equal(options.cache,'no-store');return {ok:true,text:async()=>data};
 }});
 await t.write(LIBRARY_FILE,'Русский текст');assert.equal(await t.read(LIBRARY_FILE),'Русский текст');
});
test('Real library save path: avatar commit, pending draft save, new runtime and stale settings reload',async()=>{
 const h=harness(),raw=sample(10),global={[MASTER_LIBRARY_KEY]:raw};
 const old=globalThis.SillyTavern;
 globalThis.SillyTavern={getContext:()=>({extensionSettings:{variables:{global}},saveSettingsDebounced:()=>{}})};
 try{
  const store=createLibraryStore({transport:h.transport,legacy:()=>({current:global[MASTER_LIBRARY_KEY]})});
  await store.refresh();let helpers=createSpImagenLibraryRuntime({libraryStore:store}).utilities;
  const draft=helpers.loadMasterLibrary(),icon='data:image/png;base64,BBBB',stored=JSON.parse(raw);
  stored.personas.a.libraryIconData=icon;
  const result=await helpers.saveMasterLibrary(stored,raw,{preserveUserFields:true});
  draft.personas.a.aliases=['unsaved alias'];applyCommittedIcon(draft,'a',icon,result.data);
  const committed=await helpers.saveMasterLibrary(draft,result.raw,{preserveUserFields:true});
  global[MASTER_LIBRARY_KEY]=raw;
  const fresh=createLibraryStore({transport:h.transport,legacy:()=>({current:global[MASTER_LIBRARY_KEY]})});await fresh.refresh();
  helpers=createSpImagenLibraryRuntime({libraryStore:fresh}).utilities;
  assert.deepEqual(helpers.loadMasterLibrary(),committed.data);
  assert.equal(committed.data.personas.a.libraryIconData,icon);
  assert.equal(committed.data.catalogRevision,12);
  assert.deepEqual(committed.data.personas.a.aliases,['unsaved alias']);
  assert.deepEqual(committed.data.organizer,JSON.parse(raw).organizer);
 }finally{globalThis.SillyTavern=old;}
});
