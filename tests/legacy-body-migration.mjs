import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEGACY_BODY_FIELDS, splitLegacyBodyTags, migrateLegacyBodyFields } from '../legacy-body-migration.js';
import { formatSkinParts, normalizeSkinTags } from '../appearance-board.js';
import { createSpImagenLibraryRuntime } from '../library-runtime.js';

const legacy={
 thighMarks:'thin scar on left thigh, birthmark on right thigh',
 kneeMarks:'tiny scar below left knee',
 shinMarks:'freckles on both shins',
 shoulderMarks:'small flower tattoo on left shoulder',
 forearmMarks:'blue tattoo on right forearm',
 nudeUpper:'natural chest, small round scars around nipples;\nsoft stomach, narrow waist',
 nudeLower:'narrow hips,\nsmall scar on the pelvis;\nnatural anatomy'
};
const text=(record,part)=>record.appearanceSkin.tags
 .filter(tag=>(record.appearanceSkin.selections?.[part]||[]).includes(tag.id))
 .map(tag=>tag.text);

test('All seven old body fields migrate into their actual visible skin regions',()=>{
 const entry={name:'Example',base:'black hair, brown eyes;',...legacy};
 const result=migrateLegacyBodyFields(entry);
 assert.equal(result.changed,true);
 assert.equal(result.added,13);
 assert.deepEqual(text(entry,'arms'),['small flower tattoo on left shoulder','blue tattoo on right forearm']);
 assert.deepEqual(text(entry,'legs'),['thin scar on left thigh','birthmark on right thigh','tiny scar below left knee','freckles on both shins']);
 assert.deepEqual(text(entry,'upper_front'),['natural chest','small round scars around nipples','soft stomach','narrow waist']);
 assert.deepEqual(text(entry,'lower_front'),['narrow hips','small scar on the pelvis','natural anatomy']);
 assert.deepEqual(text(entry,'upper_back'),[]);
 assert.deepEqual(text(entry,'lower_back'),[]);
 for(const field of Object.keys(LEGACY_BODY_FIELDS))assert.equal(Object.hasOwn(entry,field),false,field);
 assert.match(formatSkinParts(entry.appearanceSkin,['arms']),/flower tattoo/);
 assert.match(formatSkinParts(entry.appearanceSkin,['legs']),/thin scar/);
});

test('Migration preserves existing assignments, non-legacy anatomical fields and does not duplicate tags',()=>{
 const entry={name:'Existing',base:'golden eyes;',
   appearanceSkin:{tags:[{id:'prior',text:'thin scar on left thigh',section:''}],
    selections:{legs:['prior'],upper_back:['prior']},sections:[]},
   nsfwChest:'two freckles',nsfwLowerFront:'lower anatomy',
   thighMarks:'thin scar on left thigh, thigh tattoo'
 };
 const result=migrateLegacyBodyFields(entry);
 assert.equal(result.added,1);
 assert.deepEqual(text(entry,'legs'),['thin scar on left thigh','thigh tattoo']);
 assert.deepEqual(text(entry,'upper_back'),['thin scar on left thigh']);
 assert.equal(entry.nsfwChest,'two freckles');
 assert.equal(entry.nsfwLowerFront,'lower anatomy');
 assert.equal(entry.thighMarks,undefined);
 assert.equal(migrateLegacyBodyFields(entry).changed,false);
});

test('Repeated imports are idempotent and all old marks disappear from exported JSON',()=>{
 const library={version:1,personas:{},characters:{demo:{
  name:'Demo',base:'green eyes, brown hair;',...legacy
 }}};
 const {validateMasterLibrary}=createSpImagenLibraryRuntime({}).utilities;
 const first=validateMasterLibrary(library);
 const serialized=JSON.stringify(first);
 const second=validateMasterLibrary(JSON.parse(serialized));
 const entry=second.characters.demo;
 assert.equal(JSON.stringify(second),serialized);
 for(const key of Object.keys(LEGACY_BODY_FIELDS))assert.equal(Object.hasOwn(entry,key),false);
 assert.ok(entry.appearanceCatalog.modes.skin.tags.length>0);
 assert.ok((entry.appearanceSkin.selections.upper_front||[]).length>=2);
 assert.ok((entry.appearanceSkin.selections.lower_front||[]).length>=2);
 assert.equal((entry.appearanceCatalog.modes.nsfw.tags||[]).length,0);
});

test('Empty old fields are removed and token parsing accepts legacy newlines/semicolons',()=>{
 assert.deepEqual(splitLegacyBodyTags(' first,\n second;\rthird  '),['first','second','third']);
 const entry={name:'Blank',base:'eyes;',nudeUpper:' ',nudeLower:'',thighMarks:''};
 assert.equal(migrateLegacyBodyFields(entry).changed,true);
 for(const k of ['nudeUpper','nudeLower','thighMarks'])assert.equal(Object.hasOwn(entry,k),false);
 assert.deepEqual(normalizeSkinTags(entry.appearanceSkin).tags,[]);
});

test('Approved library layout has a single board, no legacy tab or constructor CSS',()=>{
 const library=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 const board=readFileSync(new URL('../appearance-board.js',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
 assert.doesNotMatch(library,/tabs\.add\(['"]Старые поля отметин/);
 assert.doesNotMatch(library,/const body=tabs\.add/);
 assert.match(library,/headingBar\.appendChild\(formatStrip\)/);
 assert.match(library,/inlineBoard\.element\.insertBefore\(proseWrap,editorBody\.parentElement\)/);
 assert.equal((library.match(/const inlineBoard=createAppearanceBoard/g)||[]).length,1);
 assert.doesNotMatch(styles,/ness-fullboard-area|ness-library-constructor/);
 assert.match(styles,/\.ness-tagboard-columns/);
 assert.match(styles,/\.ness-tagboard-chosen-list/);
 assert.match(styles,/\.ness-unified-section-tags\{[\s\S]*?flex-wrap:wrap/);
 assert.match(styles,/ness-unified-chip\[data-highlighted=true\]/);
 assert.match(board,/const basic=button\('Ракурсы'/);
 assert.match(board,/const marks=button\('Под одеждой'/);
 assert.match(board,/const nsfw=button\('NSFW'/);
 assert.match(board,/chip\.onpointerdown=e=>gripPointerDown/);
 assert.doesNotMatch(board,/const grip=button\('⠿'/);
 assert.doesNotMatch(runtime,/\['thighMarks','Thigh marks/);
});


test('Previously combined old skin text never reappears as a base appearance tag',()=>{
 const {validateMasterLibrary}=createSpImagenLibraryRuntime({}).utilities;
 const input={version:1,personas:{},characters:{
  x:{name:'X',base:'blue eyes, short hair;',
    nudeUpper:'old scar; round birthmark',
    appearanceCatalog:{tags:[
      {id:'a1',text:'blue eyes'},{id:'b1',text:'old scar; round birthmark'}
    ],sections:[]}
  }
 }};
 const entry=validateMasterLibrary(input).characters.x;
 assert.deepEqual(entry.appearanceCatalog.modes.base.tags.map(x=>x.text),['blue eyes','short hair']);
 assert.deepEqual(entry.appearanceCatalog.modes.skin.tags.map(x=>x.text),['old scar','round birthmark']);
 assert.equal(entry.nudeUpper,undefined);
});

test('Switching between Tags and Prose updates the visible input immediately',()=>{
 const library=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 assert.match(library,/proseWrap\.hidden=!baseMode\|\|format!=='prose'/);
 assert.match(library,/proseWrap\.hidden=mode!=='base'\|\|layout!=='text'/);
});
