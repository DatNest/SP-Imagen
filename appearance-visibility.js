import { NESS_APPEARANCE_REGIONS, NESS_APPEARANCE_VIEWS, NESS_APPEARANCE_ALWAYS, NESS_UPPER_REGIONS, NESS_APPEARANCE_PRESETS, NESS_APPEARANCE_RULES } from './shared-data.js';
// One appearance implementation for both the library editor and image generation.
// The director's existing instruction text is carried over unchanged.

export function normalizeAppearanceRules(rules){
 return Object.fromEntries(Object.keys(NESS_APPEARANCE_RULES).flatMap(id=>{
  const text=typeof rules?.[id]==='string'?rules[id].trim().slice(0,1200):'';
  return text&&text!==NESS_APPEARANCE_RULES[id][1]?[[id,text]]:[];
 }));
}

export function normalizeAppearanceRanges(base,ranges,allowUnclassified=false){
 if(!Array.isArray(ranges))return [];
 const valid=ranges.filter(r=>r&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end>r.start&&r.end<=base.length&&typeof r.text==='string'&&r.text.trim()&&base.slice(r.start,r.end)===r.text&&((allowUnclassified&&r.region==null)||(Object.hasOwn(NESS_APPEARANCE_REGIONS,r.region)&&(r.view==='any'||Object.hasOwn(NESS_APPEARANCE_VIEWS,r.view))))).sort((a,b)=>a.start-b.start);
 const result=[];
 for(const {start,end,text,region,view} of valid){
  if(start<(result.at(-1)?.end??0))continue;
  result.push(region==null?{start,end,text}:{start,end,text,region,view});
 }
 return result;
}

export function normalizeAppearanceSelections(base,selections){
 if(!selections||typeof selections!=='object')return {};
 const result=Object.fromEntries(Object.entries(selections).filter(([id,ranges])=>(id===NESS_APPEARANCE_ALWAYS||Object.hasOwn(NESS_APPEARANCE_PRESETS,id))&&Array.isArray(ranges)).map(([id,ranges])=>[id,normalizeAppearanceRanges(base,ranges,true)]));
 if(Array.isArray(selections.upper_no_face)){
  const rear=result.upper_back||[];
  const legacy=normalizeAppearanceRanges(base,selections.upper_no_face,true).filter(r=>isRearUpperAppearanceRange(r)&&!rear.some(s=>s.start<r.end&&r.start<s.end));
  result.upper_back=normalizeAppearanceRanges(base,[...rear,...legacy],true);
 }
 return result;
}

function isRearUpperAppearanceRange(range){
 return (!range.region||NESS_UPPER_REGIONS.includes(range.region))&&(!range.view||range.view==='any'||range.view==='back');
}

export function visibleAppearanceRanges(ranges,id,selections={},includeAlways=false){
 const preset=NESS_APPEARANCE_PRESETS[id];
 const selected=selections[id]??(preset?ranges.filter(r=>preset.regions.includes(r.region)&&(r.view==='any'||r.view===preset.view)):[]);
 const visible=[...selected];
 if(includeAlways&&id!==NESS_APPEARANCE_ALWAYS)visible.push(...(selections[NESS_APPEARANCE_ALWAYS]||[]));
 visible.sort((a,b)=>a.start-b.start||b.end-a.end);
 const result=[],seen=new Set();
 for(const r of visible){
  const previous=result.at(-1);
  if(previous&&r.start<previous.end){
   if(r.end>previous.end){previous.text+=r.text.slice(previous.end-r.start);previous.end=r.end;}
   continue;
  }
  const key=r.text.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  if(seen.has(key))continue;
  seen.add(key);result.push({...r});
 }
 return result;
}

export function appearanceVisibilityInstruction(records,rules={},customTemplate){
 if(!records.size)return '';
 const descriptions=Object.entries(NESS_APPEARANCE_RULES).map(([id,[,text]])=>id+': '+(rules[id]||text)).join('\n');
 const template=typeof customTemplate==='string' && customTemplate.trim() ? customTemplate : `\n\nFRAMING OVERRIDE FOR MARKED LIBRARY CHARACTERS\nFor each marked character shown, choose exactly ONE preset for their whole entry, even across multiple panels. Put exactly one literal marker in their own entry where fixed base appearance belongs. Use the supplied character ID. Example: [[NESS_VIS:sorabella:upper_back]]. Replace sorabella with the actual supplied character ID. Use one preset ID only, with no combined views or suffixes. Do not write fixed base appearance yourself. Keep their usual identity, pose, clothing and scene details. The library inserts the chosen preset and always-insert tags once, in library order. If no appearance detail is visible, use [[NESS_VIS:sorabella:none]] with that same character ID. Never include markers for absent characters. These markers override any placeholder ban. The following editable rules guide the single choice within this format:\n{{rules}}`;
 return template.includes('{{rules}}') ? template.replaceAll('{{rules}}',descriptions) : template+'\n'+descriptions;
}

export function insertVisibleAppearance(prompt,records,directory=records){
 const seen=new Set();
 const marker=/([ \t]*,[ \t]*)?\[\[(?:NESS_VIS:([a-z][a-z0-9_]*)|([a-z][a-z0-9_]*):id):([^\]\r\n]+)\]\]([ \t]*[,;])?/g;
 const result=prompt.replace(marker,(_,before,nessId,legacyId,spec,after)=>{
  const id=nessId||legacyId;
  if(!records.has(id)||seen.has(id))throw Error('Некорректная метка ракурса для «'+id+'». Запусти режиссёра заново.');
  seen.add(id);
  if(spec!=='none'&&!Object.hasOwn(NESS_APPEARANCE_PRESETS,spec))throw Error('Режиссёр должен выбрать один ракурс для «'+id+'». Запусти генерацию заново.');
  const {base,ranges=[],selections={}}=records.get(id);
  if(spec==='none')return after||'';
  const view=visibleAppearanceRanges(ranges,spec,selections,false);
  const text=view.length
   ?visibleAppearanceRanges(ranges,spec,selections,true).map(r=>r.text.trimEnd().replace(/[,;]+$/,'')).filter(Boolean).join(', ')
   :String(base||'').trim().replace(/[;,\s]+$/,'');
  return text?(before||'')+text+';':after||'';
 });
 if(/\[\[(?:NESS_VIS:[^\]\r\n]+|[a-z][a-z0-9_]*:id:[^\]\r\n]+)\]\]/i.test(result))throw Error('Режиссёр вернул незавершённую метку ракурса. Запусти генерацию заново.');
 // A director can accidentally omit a visibility marker. If a known library character
 // is explicitly named at the start of its own section, use the base as a safe fallback
 // rather than silently generating a generic look-alike. Never create a new character.
 const ids=[...(directory?.entries?.() || records?.entries?.() || [])].filter(([id,record])=>!seen.has(id)&&String(record?.base||'').trim());
 if(!ids.length)return result;
 const escapeRegex=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const identityMatch=(body,record)=>{
  const names=[record.promptName,record.name,...(record.aliases||[])]
   .map(name=>String(name||'').trim()).filter(name=>name.length>=2).sort((a,b)=>b.length-a.length);
  for(const name of names){
   const matched=body.match(new RegExp('^[ \t]*'+escapeRegex(name)+'(?=[ \t]*[,;]|$)','iu'));
   if(matched)return matched[0];
  }
  return '';
 };
 return result.replace(/(\|[ \t]*(?:girl|boy|cat|other)[ \t]*,)([^|\n]*)/gi,(whole,prefix,body)=>{
  const candidates=ids.filter(([id,r])=>!seen.has(id)&&identityMatch(body,r));
  if(candidates.length!==1)return whole;
  const [id,record]=candidates[0];
  const base=String(record.base).trim().replace(/[;,\s]+$/,'');
  if(!base||body.includes(base))return whole;
  const matched=identityMatch(body,record);
  if(!matched)return whole;
  seen.add(id);
  // Keep the identity immediately after subject; appearance follows once.
  return prefix+body.slice(0,matched.length)+', '+base+'; '+body.slice(matched.length).replace(/^[ \t]*[,;]?[ \t]*/,'');
 });
}


// Empty selections are metadata, not usable appearance tags.
export function hasConfiguredAppearanceViews(entry){
 return Boolean(entry?.appearanceRanges?.length)||Object.values(entry?.appearanceSelections||{}).some(ranges=>Array.isArray(ranges)&&ranges.length>0);
}
