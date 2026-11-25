import { NESS_APPEARANCE_PRESETS } from './shared-data.js';

export const BASE_INHERITANCE=Object.freeze({
 head:['face'],upper_front:['face','head','arms'],
 full_front:['face','head','arms','legs','upper_front'],full_back:['upper_back']
});
export const MODE_LABELS={base:'Ракурсы',skin:'Под одеждой',nsfw:'NSFW'};
const SIDE={
 base:{face:'front',head:'front',upper_front:'front',full_front:'front',upper_back:'back',full_back:'back'},
 skin:{upper_front:'front',lower_front:'front',upper_back:'back',lower_back:'back'},
 nsfw:{nsfwChest:'front',nsfwLowerFront:'front',nsfwLowerBack:'back'}
};
const REGION={
 base:Object.fromEntries(Object.entries(NESS_APPEARANCE_PRESETS).map(([id,p])=>[id,p.regions])),
 skin:{upper_front:['upper','arms','hands'],upper_back:['upper','arms','hands'],lower_front:['lower','legs'],lower_back:['lower','legs'],arms:['arms','hands'],legs:['legs']},
 nsfw:{nsfwChest:['upper'],nsfwLowerFront:['lower'],nsfwLowerBack:['lower']}
};
export function compatibleAssignments(a,b){
 if(a.mode===b.mode&&a.preset===b.preset)return true;
 if(a.preset==='always'||b.preset==='always')return true;
 const sa=SIDE[a.mode]?.[a.preset],sb=SIDE[b.mode]?.[b.preset];
 if(sa&&sb&&sa!==sb)return false;
 const ra=REGION[a.mode]?.[a.preset]||[],rb=REGION[b.mode]?.[b.preset]||[];
 return ra.some(r=>rb.includes(r));
}
const canonical=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f\u2060\ufeff]/g,'').replace(/[,;\s]+$/,'').trim().replace(/\s+/g,' ');
const ignored=new Set(['a','an','the','of','on','in','with','and','at','to','from','на','в','с','и','из','по']);
const stem=s=>s.length>4&&s.endsWith('ies')?s.slice(0,-3)+'y':s.length>3&&s.endsWith('s')&&!s.endsWith('ss')?s.slice(0,-1):s;
function words(text){return new Set((canonical(text).match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>!ignored.has(x)).map(stem));}
export function tagSimilarity(a,b){
 const x=canonical(a),y=canonical(b);
 if(!x||!y)return '';
 if(x===y)return 'exact';
 const aa=words(x),bb=words(y);
 let common=0;for(const word of aa)if(bb.has(word))common++;
 const smaller=Math.min(aa.size,bb.size),larger=Math.max(aa.size,bb.size);
 if(common===1&&smaller===1&&larger<=3)return 'partial';
 if(common<2)return '';
 return common===smaller&&common/larger>=0.5?'partial':common/(aa.size+bb.size-common)>=0.7?'partial':'';
}
export function findTagConflicts(text,target,assignments){
 const hits=[];
 for(const item of assignments){
  if(!compatibleAssignments(target,item))continue;
  const match=tagSimilarity(text,item.text);
  if(!match||(match==='exact'&&item.mode===target.mode&&item.preset===target.preset))continue;
  hits.push({...item,match});
 }
 return hits;
}
export const DUPLICATE_WARNING_KEY='sp-imagen-tag-duplicate-warnings';
export function duplicateWarningsEnabled(storage){
 try{return storage?.getItem(DUPLICATE_WARNING_KEY)!=='off';}catch{return true;}
}
export function setDuplicateWarnings(storage,enabled){
 try{storage?.setItem(DUPLICATE_WARNING_KEY,enabled?'on':'off');}catch{}
}
