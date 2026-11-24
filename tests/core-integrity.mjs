// SP Imagen integrity regressions. No app credentials or SillyTavern runtime needed.
// Run: node --experimental-default-type=module --test tests/core-integrity.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { insertVisibleAppearance } from '../appearance-visibility.js';
import { insertSkinAppearance, normalizeSkinTags, normalizeAppearanceCatalog, appendNsfwTag, editNsfwTag, parseBaseTags, reorderBaseTags } from '../appearance-board.js';
import { parseImageHtml } from '../image-transport.js';
import { normalizeImagePrompt, limitComicDialogue } from '../image-prompt.js';
import { normalizeProfile, generationFormats, filterProfileSources, directorProfileGuidance, migrateLegacyProfiles } from '../profiles.js';

const base = 'brown eyes, long hair, dark tattoo, leather boots;';
const range = value => {
  const start = base.indexOf(value);
  assert.ok(start >= 0, 'Missing source tag: ' + value);
  return { start, end: start + value.length, text: value };
};
const actor = {
  name: 'Example', base, appearanceFormat: 'tags', ranges: [],
  selections: { face: [range('brown eyes')], upper_front: [], always: [range('dark tattoo')] },
  skinTags: {},
};
const records = new Map([['actor_abc123', actor]]);
const render = marker => insertVisibleAppearance('1boy | boy, Example, ' + marker + ', cotton shirt', records);

test('A configured face inserts only its selected tags and the Always tags', () => {
  const result = render('[[NESS_VIS:actor_abc123:face]]');
  assert.match(result, /brown eyes, dark tattoo;/);
  assert.doesNotMatch(result, /leather boots/);
});

test('An intentionally empty preset does not leak the whole base', () => {
  const result = render('[[NESS_VIS:actor_abc123:upper_front]]');
  assert.match(result, /dark tattoo;/);
  assert.doesNotMatch(result, /long hair|leather boots|brown eyes/);
});

test('A valid unused preset also retains only the inherited Always tags', () => {
  const result = render('[[NESS_VIS:actor_abc123:legs]]');
  assert.match(result, /dark tattoo;/);
  assert.doesNotMatch(result, /leather boots/);
});

test('The none view does not force appearance traits into an invisible silhouette', () => {
  const result = render('[[NESS_VIS:actor_abc123:none]]');
  assert.doesNotMatch(result, /brown eyes|dark tattoo|leather boots/);
  assert.match(result, /cotton shirt/);
});

test('A missing preset preserves the right character base without guessing the view', () => {
  const result = render('[[NESS_VIS:actor_abc123]]');
  assert.match(result, /brown eyes, long hair, dark tattoo, leather boots;/);
  assert.match(result, /cotton shirt/);
  assert.doesNotMatch(result, /NESS_VIS/);
});

test('The base is still provided when only skin has been configured', () => {
  const onlySkin = new Map([['actor_abc123', {...actor, ranges: [], selections: {}, skinTags: {tags: [{id:'scar',text:'tiny scar'}],selections:{upper_front:['scar']}}}]]);
  const result = insertVisibleAppearance('1boy | boy, Example, [[NESS_VIS:actor_abc123:face]], shirt', onlySkin);
  assert.match(result, /brown eyes, long hair, dark tattoo, leather boots;/);
});

test('Unknown IDs and explicit invalid presets cannot borrow another actor appearance', () => {
  assert.throws(() => render('[[NESS_VIS:actor_unknown:face]]'), /неизвестн|Неизвестн/i);
  assert.throws(() => render('[[NESS_VIS:actor_abc123:wrong_camera]]'), /ракурс|пресет/i);
});

test('Multiple different actors receive only their own base on missing markers', () => {
  const names = ['alpha', 'beta', 'gamma'];
  const subjects = new Map(names.map((name, i) => [name, {name, base: 'trait_' + i + ';', ranges: [], selections:{}}]));
  const prompt = names.map(name => '| other, ' + name + ', [[NESS_VIS:' + name + ']], outfit').join(' ');
  const result = insertVisibleAppearance('3other ' + prompt, subjects);
  names.forEach((name, i) => assert.equal((result.match(new RegExp('trait_' + i, 'g')) || []).length, 1));
  assert.doesNotMatch(result, /NESS_VIS/);
});

test('Configured skin inserts exact tags; none and unconfigured skin do not leave markers', () => {
  const withSkin = new Map([
    ['actor_abc123', {...actor, skinTags:{tags:[{id:'scar',text:'tiny scar'}],selections:{upper_front:['scar']}}}],
    ['bare_456', {...actor, skinTags:{}}],
  ]);
  assert.equal(insertSkinAppearance('actor, [[NESS_SKIN:actor_abc123:upper_front]], coat', withSkin), 'actor, tiny scar; coat');
  assert.equal(insertSkinAppearance('actor, [[NESS_SKIN:actor_abc123:none]], coat', withSkin), 'actor, coat');
  assert.equal(insertSkinAppearance('actor, [[NESS_SKIN:bare_456:upper_front]], coat', withSkin), 'actor, coat');
  assert.throws(() => insertSkinAppearance('actor, [[NESS_SKIN:ghost:upper_front]], coat', withSkin), /неизвестн|Неизвестн/i);
});

test('Duplicate skin divider IDs are normalized without losing selected tags', () => {
  const state = normalizeSkinTags({tags:[{id:'scar',text:'tiny scar',section:'marks'}],
    sections:[{id:'marks',title:'First',before:0},{id:'marks',title:'Duplicate',before:1}],
    selections:{upper_front:['scar']}});
  assert.equal(state.sections.length, 1);
  assert.equal(state.sections[0].title,'First');
  assert.deepEqual(state.selections.upper_front,['scar']);
});

test('Shared appearance catalogue imports all legacy tags and retains section headings', () => {
 const legacyBase='fair skin, blonde hair, distinct scar;';
 const skin={tags:[{id:'scar',text:'distinct scar'}],sections:[{id:'skin_divider',title:'Отметины',before:0}],selections:{upper_front:['scar']}};
 const nsfw={nudeUpper:'small bust, pale pink nipples,\n old scar;',nudeLower:'rounded hips'};
 const catalog=normalizeAppearanceCatalog(null,legacyBase,skin,nsfw,[{id:'face_divider',title:'Лицо',before:0}]);
 for(const tag of ['fair skin','blonde hair','distinct scar','small bust','pale pink nipples','old scar','rounded hips'])
  assert.ok(catalog.tags.some(t=>t.text===tag),'Missing shared tag '+tag);
 assert.equal(catalog.tags.filter(t=>t.text==='distinct scar').length,1);
 assert.ok(catalog.sections.some(s=>s.title==='Отметины'));
 assert.ok(catalog.sections.some(s=>s.title==='Лицо'));
 assert.deepEqual(normalizeAppearanceCatalog(catalog,legacyBase,skin,nsfw),catalog);
 assert.deepEqual(normalizeSkinTags(skin).selections.upper_front,['scar']);
});

test('NSFW tag assignment preserves byte-for-byte legacy descriptions after unassign', () => {
 const original='small bust, pale pink nipples,\n old scar;';
 const assigned=appendNsfwTag(original,'blonde hair');
 assert.equal(assigned,'small bust, pale pink nipples,\n old scar, blonde hair;');
 assert.equal(editNsfwTag(assigned,'blonde hair'),original);
 assert.equal(editNsfwTag(original,'old scar','old healed scar'),'small bust, pale pink nipples,\n old healed scar;');
});

test('Tag reordering preserves existing selected offsets and ownership', () => {
  const original = {base,ranges:[],selections:{face:[range('brown eyes')],always:[range('dark tattoo')]}};
  const tags = parseBaseTags(base);
  const reordered = reorderBaseTags(original,[tags[3],tags[2],tags[0],tags[1]]);
  assert.equal(reordered.base.slice(reordered.selections.face[0].start,reordered.selections.face[0].end),'brown eyes');
  assert.equal(reordered.base.slice(reordered.selections.always[0].start,reordered.selections.always[0].end),'dark tattoo');
});

test('Image transport, NAI5 text, and view insertion stay compatible', () => {
  const source = '1boy, comic page; Speech bubble 1: round, saying "Привет!" | boy, Example, [[NESS_VIS:actor_abc123:face]], coat\n\nText: Привет!';
  const config = {prompt:source,aspect_ratio:'2:3',image_size:'1K'};
  const raw = '<naicom><img data-iig-instruction=\'' + JSON.stringify(config).replaceAll("'",'&#39;') + '\' src="[IMG:GEN]"/></naicom>';
  const decoded = parseImageHtml(raw).config;
  const picture = insertVisibleAppearance(normalizeImagePrompt(decoded.prompt),records);
  const limited = limitComicDialogue(picture,'comic',{dialogue:{comicLines:1,comicWords:7}});
  assert.match(limited,/brown eyes, dark tattoo;/);
  assert.match(limited,/Text: Привет!/);
});

test('Dialogue limits preserve non-dialogue text on screens and notes', () => {
  const text = '1girl, note saying "Hello"; Speech bubble 1: round, saying "Да!"; Speech bubble 2: round, saying "Нет!" | girl, Example, coat\n\nText: Hello\n\nДа!\n\nНет!';
  const result = limitComicDialogue(text,'comic',{dialogue:{comicLines:1,comicWords:7}});
  assert.match(result,/Text: Hello\n\nДа!/);
  assert.doesNotMatch(result,/Нет!/);
});

test('Independent custom profiles and global director rules preserve their meaning', () => {
  const user = normalizeProfile({id:'custom_abc123',name:'My Comic',kind:'comic',directorPrompt:'Make a comic',
    parser:{posts:4,options:{includeWardrobe:false}}});
  const store = {customProfiles:[user],visibleBuiltIns:{comic:false},
    extraPrompts:[{id:'rule_abc123',name:'Camera',prompt:'Framing: use a close shot.',enabled:true}]};
  assert.ok(generationFormats(store,{visibleOnly:true}).some(x=>x.id===user.id));
  assert.ok(!generationFormats(store,{visibleOnly:true}).some(x=>x.baseKind==='comic'&&x.builtIn));
  const filtered = filterProfileSources({'RP POSTS':'scene','CURRENT WARDROBE':'coat'},user);
  assert.equal(filtered['RP POSTS'],'scene');
  assert.equal(filtered['CURRENT WARDROBE'],'');
  assert.ok(directorProfileGuidance(store,user).includes('Framing: use a close shot.'));
});

test('Legacy additional rules migrate without replacing copied directors', () => {
  const old = {customProfiles:[
    {id:'custom_rule111',name:'Camera',kind:'all',prompt:'Keep the image close-up.'},
    {id:'custom_copy222',name:'Director copy',kind:'comic',directorPrompt:'Draw my comic.'}
  ],activeProfiles:{snapshot:'custom_rule111'}};
  assert.equal(migrateLegacyProfiles(old),true);
  assert.equal(old.extraPrompts.length,1);
  assert.equal(old.extraPrompts[0].enabled,true);
  assert.equal(old.customProfiles.length,1);
  assert.equal(old.customProfiles[0].name,'Director copy');
});
