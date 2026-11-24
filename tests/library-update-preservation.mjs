import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpImagenLibraryRuntime} from '../library-runtime.js';
import {MASTER_LIBRARY_KEY,MASTER_BACKUP_KEY,MASTER_SNAPSHOT_KEY} from '../shared-data.js';

const helpers=createSpImagenLibraryRuntime({}).utilities;
const clone=value=>JSON.parse(JSON.stringify(value));
const iconA='data:image/webp;base64,UklGRg==';
const iconB='data:image/png;base64,iVBORw0KGgo=';
const sample=()=>({
 version:1,
 savedAt:'2026-10-01T08:30:00.000Z',catalogRevision:8,
 characters:{
  a:{
   name:'Пример',base:'freckles, left scar, blue eyes;',
   libraryIconData:iconA,
   aliases:['Alias'],
   appearanceFormat:'tags',
   appearanceRanges:[{start:0,end:8}],
   appearanceSelections:{face:[{start:0,end:8}]},
   appearanceSkin:{
    tags:[{id:'skin1',text:'little mole',section:'smark'}],
    sections:[{id:'smark',title:'ШРАМЫ',before:0}],
    selections:{upper_front:['skin1'],arms:['skin1']}
   },
   appearanceSections:[{id:'base1',title:'ЛИЦО',before:1}],
   appearanceCatalog:{
    modes:{
     base:{tags:[{id:'b2',text:'left scar'},{id:'b1',text:'freckles'},{id:'b3',text:'blue eyes'}],sections:[{id:'bd1',title:'Мои отметины',before:1}]},
     skin:{tags:[{id:'s1',text:'skin scar'}],sections:[{id:'sd1',title:'Кожа',before:0}]},
     nsfw:{tags:[{id:'n1',text:'unique adult mark'}],sections:[{id:'nd1',title:'Личное',before:0}]}
    },
    tags:[{id:'old1',text:'archive'}],
    sections:[{id:'oldhead',title:'Старое',before:1}]
   }
  }
 },
 personas:{},
 organizer:{
  version:3,tags:[
   {id:'tagb',name:'Важное',color:'#ddbbaa'},
   {id:'taga',name:'Семья',color:'#aabbcc'}
  ],
  characters:{a:{tagIds:['taga','tagb']}},
  filterTagId:'taga',
  customUserChoice:'persist me'
 },
 attributeCatalog:{legacyUserTags:['keep this too']},
 appearanceRules:{face:'Лицо только крупным планом, не менять'},
 customExtensionField:{user:true}
});

test('Current library normalization leaves every user-owned field, chip order, divider and icon untouched',()=>{
 const original=sample();
 const result=helpers.validateMasterLibrary(original,{preserveCurrent:true});
 assert.deepEqual(result,original);
 assert.equal(JSON.stringify(result),JSON.stringify(original));
 assert.equal(original.characters.a.libraryIconData,iconA);
 const second=helpers.validateMasterLibrary(JSON.parse(JSON.stringify(result)),{preserveCurrent:true});
 assert.deepEqual(second,original);
});

test('Merely opening/loading an updated library does not write settings or migrate hardcoded data',()=>{
 const source=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 const open=source.slice(source.indexOf('async function openLibraryEditor(){'),source.indexOf('const origin=SillyTavern.getContext()',source.indexOf('async function openLibraryEditor(){')));
 assert.doesNotMatch(open,/await saveMasterLibrary/);
 assert.doesNotMatch(open,/restoreLibraryBodyFields\(draft\)/);
 assert.match(source,/if\(editor\.appearanceEdited\(\)\)/);
 assert.match(source,/clearAppearanceEdited:\(\)=>\{appearanceEdited=false;\}/);
 assert.match(source,/if\(typeof expectedRaw==='string'&&expectedRaw===JSON\.stringify\(data\)\)\{if\(libraryStore\)await libraryStore\.commit\(expectedRaw,expectedRaw\);return/);
});

test('No-op Save is byte-for-byte identical and performs no backend write',async()=>{
 const original=sample(),serialized=JSON.stringify(original);
 const storage={[MASTER_LIBRARY_KEY]:serialized},context={
  extensionSettings:{variables:{global:storage}},
  saveSettingsDebounced:async()=>{throw Error('Unchanged user data must not be written.');}
 };
 const previous=globalThis.SillyTavern;
 globalThis.SillyTavern={getContext:()=>context};
 try{
  assert.deepEqual(helpers.loadMasterLibrary(),original);
  assert.equal(storage[MASTER_LIBRARY_KEY],serialized);
  const saved=await helpers.saveMasterLibrary(clone(original),serialized);
  assert.equal(saved.raw,serialized);
  assert.equal(storage[MASTER_LIBRARY_KEY],serialized);
  assert.equal(storage[MASTER_BACKUP_KEY],undefined);
 }finally{globalThis.SillyTavern=previous;}
});

test('Saving only the avatar preserves every other field and keeps the exact prior library as a backup',async()=>{
 const original=sample(),old=JSON.stringify(original);
 const storage={[MASTER_LIBRARY_KEY]:old};
 let saves=0;
 const context={
  extensionSettings:{variables:{global:storage}},
  saveSettingsDebounced:async()=>{saves++;}
 };
 const previous=globalThis.SillyTavern;
 globalThis.SillyTavern={getContext:()=>context};
 try{
  const draft=clone(original);
  draft.characters.a.libraryIconData=iconB;
  const saved=await helpers.saveMasterLibrary(draft,old,{preserveUserFields:true});
  assert.equal(saves,1);
  assert.equal(storage[MASTER_BACKUP_KEY],old);
  assert.equal(storage[MASTER_LIBRARY_KEY],saved.raw);
  assert.equal(JSON.parse(saved.raw).characters.a.libraryIconData,iconB);
  const after=JSON.parse(saved.raw);
  const before=clone(original);
  delete after.savedAt;delete after.catalogRevision;
  delete before.savedAt;delete before.catalogRevision;
  delete after.characters.a.libraryIconData;delete before.characters.a.libraryIconData;
  assert.deepEqual(after,before,'Only explicitly saved icon and library timestamp/revision may change');
  assert.ok(storage[MASTER_SNAPSHOT_KEY].includes('PERSONAL CHARACTER IDENTITY LIBRARY'));
  assert.ok(!storage[MASTER_SNAPSHOT_KEY].includes(iconB));
  // A former icon can still be recovered by explicitly choosing the previous copy.
  assert.equal(JSON.parse(storage[MASTER_BACKUP_KEY]).characters.a.libraryIconData,iconA);
 }finally{globalThis.SillyTavern=previous;}
});


test('Import and export use the preserving validator instead of rearranging previously saved records',()=>{
 const source=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 assert.match(source,/const value=validateMasterLibrary\(JSON\.parse\(\(await upload\.files\[0\]\.text\(\)\)/);
 assert.match(source,/\{preserveCurrent:true\}\);editor\?\.visibility\?\.closeBoard/);
 assert.match(source,/JSON\.stringify\(validateMasterLibrary\(draft,\{preserveCurrent:true\}\),null,2\)/);
 const old=sample();
 assert.equal(JSON.stringify(helpers.validateMasterLibrary(old,{preserveCurrent:true})),JSON.stringify(old));
});

test('Explicit save migrates remaining old fields once, preserves raw backup and excludes archive from the prompt snapshot',async()=>{
 const original=sample();
 original.characters.a.shoulderMarks='hidden shoulder scar; another mark';
 original.characters.a.nudeUpper='small body trait';
 const raw=JSON.stringify(original),storage={[MASTER_LIBRARY_KEY]:raw};
 let writes=0;const old=globalThis.SillyTavern;
 globalThis.SillyTavern={getContext:()=>({extensionSettings:{variables:{global:storage}},saveSettingsDebounced:async()=>{writes++;}})};
 try{
  const loaded=helpers.loadMasterLibrary();assert.equal(JSON.stringify(loaded),raw);assert.equal(writes,0);
  const result=await helpers.saveMasterLibrary(loaded,raw);
  const entry=result.data.characters.a;
  assert.equal(entry.shoulderMarks,undefined);assert.equal(entry.nudeUpper,undefined);
  assert.equal(entry.legacyBodyArchive.shoulderMarks,original.characters.a.shoulderMarks);
  assert.ok(entry.appearanceCatalog.modes.skin.tags.some(t=>t.text==='hidden shoulder scar'));
  assert.ok(entry.appearanceSkin.selections.arms.includes('skin1'));
  assert.equal(storage[MASTER_BACKUP_KEY],raw);
  assert.doesNotMatch(storage[MASTER_SNAPSHOT_KEY],/legacyBodyArchive|hidden shoulder scar/);
  const again=await helpers.saveMasterLibrary(result.data,result.raw);
  assert.equal(again.raw,result.raw);assert.equal(writes,1);
 }finally{globalThis.SillyTavern=old;}
});
