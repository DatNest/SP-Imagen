import test from 'node:test';
import assert from 'node:assert/strict';
import {bulkTagState,setBulkTag,deleteLibraryRecords} from '../library-bulk-actions.js';
import {normalizeNovelAISettings} from '../novelai.js';
const library=()=>({version:1,personas:{a:{name:'A',libraryIconData:'icon-a',appearanceCatalog:{base:{tags:['original']}}}},characters:{b:{name:'B',libraryIconData:'icon-b'},c:{name:'C',libraryIconData:'icon-c'}},organizer:{tags:[{id:'x',name:'X'},{id:'y',name:'Y'}],characters:{a:{tagIds:['x','y'],custom:'keep'},b:{tagIds:['y']},c:{tagIds:['x']}},filterTagId:'x'}});
test('Bulk assignment operates on one shared tag, preserves unrelated tags and character fields',()=>{
 const d=library(),selection=new Set(['a','b']),original=structuredClone(d);
 assert.equal(bulkTagState(d,selection,'x'),'partial');
 assert.equal(setBulkTag(d,selection,'x',true),true);
 assert.equal(bulkTagState(d,selection,'x'),'all');
 assert.equal(setBulkTag(d,selection,'x',true),false);
 assert.equal(setBulkTag(d,selection,'x',false),true);
 assert.equal(bulkTagState(d,selection,'x'),'none');
 assert.deepEqual(d.organizer.characters.a,{tagIds:['y'],custom:'keep'});
 assert.deepEqual(d.organizer.characters.b.tagIds,['y']);
 assert.deepEqual(d.organizer.characters.c,original.organizer.characters.c);
 assert.deepEqual(d.personas,original.personas);assert.deepEqual(d.characters,original.characters);
 assert.equal(d.organizer.filterTagId,'x');
 assert.equal(setBulkTag(d,new Set(['missing']),'x',true),false);
 assert.equal(setBulkTag(d,selection,'missing',true),false);
});
test('Deleting one or many records affects only the selected library entries and their organizer metadata',()=>{
 const d=library(),original=structuredClone(d);
 assert.equal(deleteLibraryRecords(d,new Set(['a','b','missing'])),2);
 assert.deepEqual(d.personas,{});assert.deepEqual(d.characters,{c:original.characters.c});
 assert.deepEqual(d.organizer.characters,{c:original.organizer.characters.c});
 assert.deepEqual(d.organizer.tags,original.organizer.tags);
 assert.equal(d.organizer.filterTagId,'x');
 assert.equal(deleteLibraryRecords(d,new Set(['c'])),1);
 assert.deepEqual(d.characters,{});
});
test('An old disabled NovelAI setting cannot disable direct generation after updating',()=>{
 const normalized=normalizeNovelAISettings({enabled:false,apiKey:'test-key',steps:24,styles:[{id:'a',name:'a',value:'style'}]});
 assert.equal(normalized.enabled,true);assert.equal(normalized.apiKey,'test-key');assert.equal(normalized.steps,24);
 assert.equal(normalized.styles[0].value,'style');
});
