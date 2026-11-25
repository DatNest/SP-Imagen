import test from 'node:test';
import assert from 'node:assert/strict';
import {tagSimilarity,compatibleAssignments,findTagConflicts,duplicateWarningsEnabled,setDuplicateWarnings} from '../appearance-overlap.js';
import {normalizeAppearanceSelections,visibleAppearanceRanges,insertVisibleAppearance} from '../appearance-visibility.js';
import {parseBaseTags,insertSkinAppearance} from '../appearance-board.js';

test('Similarity ignores a generic shared noun but detects complete and meaningful partial matches',()=>{
 assert.equal(tagSimilarity('Shoulder freckles',' shoulder freckles '),'exact');
 assert.equal(tagSimilarity('shoulder freckles','freckles on shoulders'),'partial');
 assert.equal(tagSimilarity('freckles','freckles on shoulders'),'partial');
 assert.equal(tagSimilarity('short hair','black hair'),'');
 assert.equal(tagSimilarity('blue eyes','blue shirt'),'');
});
test('Compatible anatomy across modes warns while alternate front/back or disjoint regions do not',()=>{
 const a=(mode,preset,text='shoulder freckles')=>({mode,preset,text});
 assert.ok(compatibleAssignments(a('base','upper_front'),a('skin','upper_front')));
 assert.ok(compatibleAssignments(a('skin','lower_front'),a('nsfw','nsfwLowerFront')));
 assert.ok(!compatibleAssignments(a('skin','lower_front'),a('nsfw','nsfwLowerBack')));
 assert.ok(!compatibleAssignments(a('base','upper_back'),a('base','upper_front')));
 assert.ok(!compatibleAssignments(a('skin','upper_front'),a('skin','lower_front')));
 assert.ok(!compatibleAssignments(a('base','face'),a('skin','upper_front')));
 assert.equal(findTagConflicts('freckles on shoulders',a('skin','upper_front'),[a('base','upper_front'),a('base','upper_back'),a('nsfw','nsfwChest')]).length,2);
});
test('Warning preferences default on and can be restored',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.equal(duplicateWarningsEnabled(storage),true);
 setDuplicateWarnings(storage,false);assert.equal(duplicateWarningsEnabled(storage),false);
 setDuplicateWarnings(storage,true);assert.equal(duplicateWarningsEnabled(storage),true);
});
test('Inheritance is opt-in, keeps original assignments and honors per-view exclusions',()=>{
 const base='freckles, brown eyes, red hair, pale skin;',tags=parseBaseTags(base);
 const direct={face:[tags[0],tags[1]],head:[tags[2]],always:[tags[3]],upper_front:[]};
 assert.deepEqual(visibleAppearanceRanges([],'upper_front',direct,true).map(x=>x.text),['pale skin']);
 const selections=normalizeAppearanceSelections(base,{...direct,inheritance_v1:[],exclude_upper_front:[tags[1]]});
 assert.deepEqual(visibleAppearanceRanges([],'upper_front',selections,true).map(x=>x.text),['freckles','red hair','pale skin']);
 assert.deepEqual(visibleAppearanceRanges([],'full_back',selections,true).map(x=>x.text),['pale skin']);
 assert.deepEqual(visibleAppearanceRanges([],'full_front',selections,true).map(x=>x.text),tags.map(x=>x.text));
 assert.deepEqual(selections.face,direct.face);
 const duplicate={...selections,upper_front:[tags[0]]};
 assert.deepEqual(visibleAppearanceRanges([],'upper_front',duplicate,true).map(x=>x.text),['freckles','red hair','pale skin']);
});
test('Same exact base and skin tag is injected once, without altering source data',()=>{
 const base='shoulder freckles, black hair;',tags=parseBaseTags(base);
 const records=new Map([['example',{base,ranges:[],selections:{upper_front:[tags[0]]},appearanceFormat:'tags',skinTags:{tags:[{id:'freckles',text:'shoulder freckles'},{id:'scar',text:'small scar'}],selections:{upper_front:['freckles','scar']}}}]]);
 const original='1girl | girl, Example, [[NESS_VIS:example:upper_front]], [[NESS_SKIN:example:upper_front]], shirt';
 const before=JSON.stringify([...records]);
 const result=insertSkinAppearance(insertVisibleAppearance(original,records),records,original);
 assert.equal(result.match(/shoulder freckles/g).length,1);
 assert.match(result,/small scar/);assert.equal(JSON.stringify([...records]),before);
});
