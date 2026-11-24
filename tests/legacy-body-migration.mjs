import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEGACY_BODY_FIELDS, splitLegacyBodyTags, migrateLegacyBodyFields, separateMigratedAnatomy, prepareBodyAppearance } from '../legacy-body-migration.js';
import { formatSkinParts, normalizeSkinTags, normalizeAppearanceCatalog } from '../appearance-board.js';
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

test('All seven old body fields migrate into editable catalogues without automatic exposure',()=>{
 const entry={name:'Example',base:'black hair, brown eyes;',...legacy};
 const result=migrateLegacyBodyFields(entry);
 assert.equal(result.changed,true);
 assert.equal(result.selected,0);
 const all=Object.values(entry.appearanceCatalog.modes).flatMap(m=>m.tags.map(t=>t.text));
 for(const [field,value] of Object.entries(legacy)){
  for(const tag of splitLegacyBodyTags(value))assert.ok(all.includes(tag),tag);
  assert.equal(entry.legacyBodyArchive[field],value);
  assert.equal(Object.hasOwn(entry,field),false,field);
 }
 assert.equal(formatSkinParts(entry.appearanceSkin,['arms','legs','upper_front','lower_front']),'');
 assert.ok(entry.appearanceCatalog.modes.nsfw.tags.some(t=>t.text==='small round scars around nipples'));
});
test('Migration preserves existing selections, anatomy fields and avoids duplicate chips',()=>{
 const entry={name:'Existing',base:'golden eyes;',
  appearanceSkin:{tags:[{id:'prior',text:'thin scar on left thigh',section:''}],selections:{legs:['prior'],upper_back:['prior']},sections:[]},
  nsfwChest:'two freckles',nsfwLowerFront:'lower anatomy',thighMarks:'thin scar on left thigh, thigh tattoo'};
 const result=migrateLegacyBodyFields(entry);
 assert.equal(result.added,1);
 assert.deepEqual(text(entry,'legs'),['thin scar on left thigh']);
 assert.deepEqual(text(entry,'upper_back'),['thin scar on left thigh']);
 assert.ok(entry.appearanceCatalog.modes.skin.tags.some(t=>t.text==='thigh tattoo'));
 assert.equal(entry.nsfwChest,'two freckles');
 assert.equal(entry.nsfwLowerFront,'lower anatomy');
 assert.equal(migrateLegacyBodyFields(entry).changed,false);
});
test('Repeated imports are idempotent and archive the old strings without injecting them',()=>{
 const library={version:1,personas:{},characters:{demo:{name:'Demo',base:'green eyes, brown hair;',...legacy}}};
 const {validateMasterLibrary}=createSpImagenLibraryRuntime({}).utilities;
 const first=validateMasterLibrary(library),serialized=JSON.stringify(first);
 const second=validateMasterLibrary(JSON.parse(serialized)),entry=second.characters.demo;
 assert.equal(JSON.stringify(second),serialized);
 assert.deepEqual(entry.legacyBodyArchive,legacy);
 assert.equal(formatSkinParts(entry.appearanceSkin,['upper_front','lower_front','arms','legs']),'');
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

test('Previously migrated anatomy stays available in NSFW without visible skin assignments or rewriting the source',()=>{
 const record={name:'Example',base:'blue eyes, short hair',appearanceSkin:{
  tags:[{id:'legacy1',text:'small bust'},{id:'legacy2',text:'pale pink nipples'},{id:'legacy3',text:'small scar'},{id:'legacy4',text:'natural pubic hair'}],
  selections:{upper_front:['legacy1','legacy2'],lower_front:['legacy3','legacy4']},sections:[]}};
 const before=JSON.stringify(record),repaired=prepareBodyAppearance(record);
 assert.equal(JSON.stringify(record),before);
 assert.equal(formatSkinParts(repaired.appearanceSkin,['upper_front']),'small bust');
 assert.equal(formatSkinParts(repaired.appearanceSkin,['lower_front']),'small scar');
 assert.deepEqual(repaired.appearanceCatalog.modes.nsfw.tags.map(t=>t.text),['pale pink nipples','natural pubic hair']);
 assert.ok(!repaired.nsfwChest&&!repaired.nsfwLowerFront);
 assert.equal(prepareBodyAppearance(repaired),repaired);
});
test('Duplicate skin IDs merge all assignments and do not create hidden injected tags',()=>{
 const raw={tags:[{id:'first',text:'small scar;'},{id:'second',text:'small scar'},{id:'third',text:'freckles'}],
  selections:{arms:['second'],legs:['first'],upper_front:['first','second']},sections:[{id:'head',title:'Marks',before:2}]};
 const clean=normalizeSkinTags(raw);
 assert.deepEqual(clean.tags.map(t=>t.id),['first','third']);
 assert.deepEqual(clean.selections,{arms:['first'],legs:['first'],upper_front:['first']});
 assert.equal(clean.sections[0].before,1);
 assert.equal(formatSkinParts(raw,['arms','legs','upper_front']),'small scar');
 assert.equal(formatSkinParts({...clean,selections:{}},['arms','legs','upper_front']),'');
});
test('Legacy shared catalogue keeps assigned NSFW tags out of ordinary appearance',()=>{
 const record={base:'blue eyes',nsfwChest:'pale pink nipples',appearanceCatalog:{tags:[{id:'old1',text:'pale pink nipples'},{id:'old2',text:'extra ordinary tag'}]}};
 const {modes}=normalizeAppearanceCatalog(record.appearanceCatalog,record.base,{},record);
 assert.deepEqual(modes.base.tags.map(t=>t.text),['blue eyes','extra ordinary tag']);
 assert.deepEqual(modes.nsfw.tags.map(t=>t.text),['pale pink nipples']);
});
