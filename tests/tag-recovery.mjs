import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLostTags,recoverLostTags} from '../tag-recovery.js';
import {normalizeAppearanceCatalog} from '../appearance-board.js';
import {createLibraryStore,LIBRARY_FILE,BACKUP_FILE} from '../library-persistence.js';
import {readFileSync} from 'node:fs';

const make=(entry)=>({version:1,personas:{},characters:{a:entry}});
const catalog=()=>({tags:[{id:'old',text:'forgotten catalog tag'}],sections:[],modes:{
 base:{tags:[{id:'b1',text:'blue eyes'},{id:'b2',text:'unassigned hair'}],sections:[{id:'s1',title:'Original',before:0}]},
 skin:{tags:[{id:'s1',text:'small scar'}],sections:[]},nsfw:{tags:[],sections:[]}
}});
test('Audit compares archived fields, historical catalogues and backups by ID without changing current data',()=>{
 const data=make({name:'Current',base:'blue eyes',appearanceCatalog:catalog(),appearanceSkin:{tags:[{id:'s1',text:'small scar'}],selections:{arms:['s1']},sections:[]},
 legacyBodyArchive:{shoulderMarks:'small scar; lost tattoo',nudeUpper:'missing anatomical detail'}});
 const old=make({name:'Former name',base:'blue eyes, unassigned hair, old freckles',appearanceCatalog:{modes:{skin:{tags:[{id:'a',text:'blue eyes'}]},nsfw:{tags:[{id:'a',text:'old anatomy'}]}}}});
 old.characters.b={name:'Current',base:'wrong character tag'};
 const before=JSON.stringify(data),report=auditLostTags(data,[JSON.stringify(old),old,'bad json']);
 assert.equal(JSON.stringify(data),before);
 assert.equal(report.backupCount,1);assert.equal(report.skipped,1);
 const by=text=>report.rows.find(x=>x.text===text);
 assert.equal(by('forgotten catalog tag').status,'missing');assert.equal(by('forgotten catalog tag').needsMode,true);
 assert.equal(by('lost tattoo').mode,'skin');assert.equal(by('lost tattoo').status,'missing');
 assert.equal(by('small scar').status,'assigned');
 assert.equal(by('unassigned hair').status,'unassigned');
 assert.equal(by('old freckles').status,'missing');
 assert.equal(by('old anatomy').mode,'nsfw');
 assert.ok(by('blue eyes').locations.some(l=>l.mode==='base'&&l.assigned));
 assert.equal(by('wrong character tag'),undefined);
});
test('Recovery adds selected chips only and preserves IDs, source text, selections and unrelated metadata',()=>{
 const data=make({name:'Example',base:'blue eyes',appearanceCatalog:catalog(),appearanceSkin:{tags:[{id:'s1',text:'small scar'}],selections:{arms:['s1']},sections:[]},legacyBodyArchive:{shoulderMarks:'lost tattoo; ignored mark'},custom:{x:true}});
 const before=JSON.stringify(data),report=auditLostTags(data),row=report.rows.find(x=>x.text==='lost tattoo');
 const choice={id:row.id,identity:row.identity,mode:'skin'};
 const result=recoverLostTags(data,report,[choice,choice,{id:'a',identity:'unknown',mode:'skin'}]);
 assert.equal(result.added,1);assert.equal(JSON.stringify(data),before);
 const after=result.data.characters.a,original=data.characters.a;
 assert.deepEqual(after.appearanceSkin,original.appearanceSkin);assert.equal(after.base,original.base);assert.deepEqual(after.custom,original.custom);assert.deepEqual(after.legacyBodyArchive,original.legacyBodyArchive);
 assert.deepEqual(after.appearanceCatalog.modes.base,original.appearanceCatalog.modes.base);
 assert.deepEqual(after.appearanceCatalog.modes.skin.tags.slice(0,1),original.appearanceCatalog.modes.skin.tags);
 assert.equal(after.appearanceCatalog.modes.skin.tags[1].text,'lost tattoo');
 assert.equal(after.appearanceCatalog.modes.skin.sections[0].title,'Восстановленные');
 assert.equal(recoverLostTags(result.data,report,[choice]).added,0);
 assert.equal(auditLostTags(result.data).rows.find(x=>x.text==='lost tattoo').status,'unassigned');
});
test('An existing tag in another mode may be recovered deliberately but never duplicated in its existing mode',()=>{
 const data=make({name:'Example',base:'blue eyes',appearanceCatalog:catalog(),legacyBodyArchive:{shoulderMarks:'blue eyes'}});
 const report=auditLostTags(data),row=report.rows.find(x=>x.text==='blue eyes');
 assert.equal(row.status,'elsewhere');
 assert.equal(recoverLostTags(data,report,[{id:'a',identity:row.identity,mode:'base'}]).added,0);
 const result=recoverLostTags(data,report,[{id:'a',identity:row.identity,mode:'skin'}]);
 assert.equal(result.added,1);assert.equal(result.data.characters.a.base,'blue eyes');
});
test('Recovered chips survive normalisation and remain unassigned',()=>{
 const data=make({name:'Example',base:'blue eyes',legacyBodyArchive:{shinMarks:'old mark'}});
 const report=auditLostTags(data),row=report.rows[0];
 const result=recoverLostTags(data,report,[{id:row.id,identity:row.identity,mode:'skin'}]);
 const entry=result.data.characters.a,normalized=normalizeAppearanceCatalog(entry.appearanceCatalog,entry.base,entry.appearanceSkin,entry);
 assert.equal(normalized.modes.skin.tags[0].text,'old mark');assert.equal(entry.appearanceSkin,undefined);
});
test('Manual recovery history reads separate backup without writes and reports unreadable backup',async()=>{
 const raw=n=>JSON.stringify(make({name:'Example',base:n}));
 const envelope=(current,history)=>JSON.stringify({format:'sp-imagen-library-store-v1',current,history});
 const files=new Map([[LIBRARY_FILE,envelope(raw('new'),[raw('old')])],[BACKUP_FILE,envelope(raw('old'),[raw('older')])]]);
 const store=createLibraryStore({transport:{read:async name=>files.get(name)??null,write:async()=>{throw Error('must not write');}},locks:null});
 await store.refresh();
 assert.deepEqual(await store.recoveryHistory(),{history:[raw('old'),raw('older')],skipped:0});
 files.set(BACKUP_FILE,'broken');
 assert.deepEqual(await store.recoveryHistory(),{history:[raw('old')],skipped:1});
});
test('Recovery audit is opt-in in framing settings and restores through the ordinary draft',()=>{
 const src=readFileSync(new URL('../library-runtime.js',import.meta.url),'utf8');
 assert.match(src,/button\('Проверить потерянные теги',dialog.body/);
 assert.match(src,/dialog.finish\(\);void openTagRecovery\(\)/);
 assert.match(src,/draft=result.data;view.resetEditor\(\)/);
 assert.match(src,/const chosen=new Map\(\),modeByRow=new Map\(\)/);
 const open=src.slice(src.indexOf('async function openTagRecovery(){'),src.indexOf('const rulesButton='));
 assert.doesNotMatch(open,/saveMasterLibrary\(/);
});

test('An absent historical mode copy is reported even when the same tag is assigned in another historical mode',()=>{
 const data=make({name:'Example',base:'blue eyes',appearanceCatalog:catalog()});
 const previous=make({name:'Old name',base:'blue eyes',appearanceCatalog:{modes:{skin:{tags:[{id:'s',text:'blue eyes'}]}}}});
 const row=auditLostTags(data,[previous]).rows.find(x=>x.text==='blue eyes');
 assert.equal(row.status,'elsewhere');assert.equal(row.mode,'skin');assert.deepEqual(row.locations,[{mode:'base',assigned:true}]);
});
test('Recovery inserts into the existing empty recovery section before adjacent empty sections',()=>{
 const c=catalog();c.modes.skin.sections=[{id:'r',title:'Восстановленные',before:1},{id:'empty',title:'Empty',before:1}];
 const data=make({name:'Example',base:'blue eyes',appearanceCatalog:c,legacyBodyArchive:{shinMarks:'old mark; another old mark'}});
 const report=auditLostTags(data);
 const result=recoverLostTags(data,report,report.rows.filter(x=>x.mode==='skin'&&x.status==='missing').map(x=>({id:x.id,identity:x.identity,mode:'skin'})));
 assert.equal(result.added,2);
 assert.deepEqual(result.data.characters.a.appearanceCatalog.modes.skin.sections,[{id:'r',title:'Восстановленные',before:1},{id:'empty',title:'Empty',before:3}]);
});
