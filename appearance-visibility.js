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
 const template=typeof customTemplate==='string' && customTemplate.trim() ? customTemplate : `\n\nFRAMING OVERRIDE FOR MARKED LIBRARY CHARACTERS\nFor each marked character shown, choose exactly ONE preset for their whole entry, even across multiple panels. Put exactly one literal marker in their own entry where fixed base appearance belongs. Use the supplied character ID. Example: [[NESS_VIS:id:upper_back]]. Use one preset ID only, with no combined views or suffixes. Do not write fixed base appearance yourself. Keep their usual identity, pose, clothing and scene details. The library inserts the chosen preset and always-insert tags once, in library order. If no appearance detail is visible, use [[NESS_VIS:id:none]]. Never include markers for absent characters. These markers override any placeholder ban. The following editable rules guide the single choice within this format:\n{{rules}}`;
 const expanded=template.includes('{{rules}}')?template.replaceAll('{{rules}}',descriptions):template+'\n'+descriptions;
 // Always reinforce syntax, even when an older user-customized template is used.
 return expanded+'\nCRITICAL MARKER SYNTAX: Use exactly [[NESS_VIS:ACTUAL_ID:PRESET]] with TWO colons. Never output [[NESS_VIS:ACTUAL_ID]] without a preset. Allowed PRESET values: '+['none',...Object.keys(NESS_APPEARANCE_PRESETS)].join(', ')+'. Choose a preset from the actual scene framing; do not output placeholder names.';
}

function visibilityMarkerLocation(prompt,index){
 const before=prompt.slice(0,index);
 const sections=[...before.matchAll(/\|\s*(girl|boy|cat|other)\s*,\s*([^,;|\r\n]+)/gi)];
 const latest=sections.at(-1);
 if(!latest||before.slice(latest.index+latest[0].length).includes('|'))return 'в общей части промпта, вне секции персонажа';
 const name=latest[2].trim().slice(0,70);
 const text=before.slice(latest.index+latest[0].length);
 return 'в секции персонажа «'+name+'»'+(text.includes(';')?', после первого разделителя «;» (возможно уже среди инструкций одежды)':', до первого разделителя «;»');
}
function validateVisibilityMarkers(prompt,records){
 const seen=new Set();
 const openings=[...prompt.matchAll(/\[\[NESS_VIS\b/gi)];
 if(!openings.length&&/\bNESS_VIS\s*:/i.test(prompt)){
  throw Error('В ответе есть NESS_VIS, но нет правильной открывающей конструкции [[NESS_VIS:...]]. Это служебная метка базовой внешности, не метка одежды.');
 }
 for(const opening of openings){
  const pos=opening.index,close=prompt.indexOf(']]',pos);
  const nextNewline=prompt.indexOf('\n',pos);
  const location=visibilityMarkerLocation(prompt,pos);
  if(close<0||nextNewline>=0&&close>nextNewline){
   throw Error('Незаконченная метка БАЗОВОГО РАКУРСА [[NESS_VIS:...]]: отсутствует закрытие ]]. Место: '+location+'. Ожидается [[NESS_VIS:id:full_front]] (id и ракурс выбирает режиссёр).');
  }
  const marker=prompt.slice(pos,close+2),m=marker.match(/^\[\[NESS_VIS:([a-z][a-z0-9_]*):([^\]\r\n]+)\]\]$/);
  if(!m){
   throw Error('Неверный синтаксис метки БАЗОВОГО РАКУРСА: '+JSON.stringify(marker.slice(0,120))+'. Место: '+location+'. Правильная форма [[NESS_VIS:ID:РАКУРС]] до одежды.');
  }
  const [,id,spec]=m,actor=records.get(id);
  if(!actor)throw Error('Неизвестный ID «'+id+'» в [[NESS_VIS]]. Место: '+location+'. Режиссёр использовал несуществующий ключ персонажа из библиотеки.');
  if(seen.has(id))throw Error('Повторная [[NESS_VIS]] персонажа «'+(actor.name||id)+'» (ID '+id+'). Метка должна быть ровно одна на персонажа, даже на странице из нескольких панелей.');
  seen.add(id);
  if(spec!=='none'&&!Object.hasOwn(NESS_APPEARANCE_PRESETS,spec)){
   throw Error('Неизвестный ракурс «'+spec.slice(0,60)+'» у персонажа «'+(actor.name||id)+'». Место: '+location+'. Допустимые: '+['none',...Object.keys(NESS_APPEARANCE_PRESETS)].join(', ')+'.');
  }
 }
}

export function insertVisibleAppearance(prompt,records){
 const missingPreset=new Set();
 // The director sometimes emits [[NESS_VIS:known_id]] without its view.
 // Recover only this unambiguous omission. Never guess that a full-body,
 // front, back, or face-specific view was actually visible.
 const repaired=String(prompt||'').replace(/\[\[NESS_VIS:([a-z][a-z0-9_]*):?[ \t]*\]\]/g,(marker,id)=>{
  if(!records.has(id))throw Error('Метка БАЗОВОЙ внешности с неизвестным ID «'+id+'»: персонаж не найден в подготовленной библиотеке.');
  missingPreset.add(id);
  return '[[NESS_VIS:'+id+':full_front]]'; // Canonical syntax for validation only.
 });
 validateVisibilityMarkers(repaired,records);
 const seen=new Set();
 const result=repaired.replace(/([ \t]*,[ \t]*)?\[\[NESS_VIS:([a-z][a-z0-9_]*):([^\]\r\n]+)\]\]([ \t]*[,;])?/g,(_,before,id,spec,after)=>{
  if(!records.has(id)||seen.has(id))throw Error('Некорректная метка ракурса для «'+id+'». Запусти режиссёра заново.');
  seen.add(id);
  if(spec!=='none'&&!Object.hasOwn(NESS_APPEARANCE_PRESETS,spec))throw Error('Режиссёр должен выбрать один ракурс для «'+id+'». Запусти генерацию заново.');
  const {base,ranges=[],selections={},appearanceFormat='tags'}=records.get(id);
  if(spec==='none')return after||'';
  const prose=appearanceFormat==='prose';
  const useBase=missingPreset.has(id);
  const view=useBase?[]:visibleAppearanceRanges(ranges,spec,selections,false);
  const configured=hasConfiguredAppearanceViews({appearanceRanges:ranges,appearanceSelections:selections});
  // Even when this particular preset has no selected tags, globally enabled
  // "Always" tags still apply. A deliberately empty preset must NEVER cause
  // the entire base description to leak into a close-up or detail view.
  const fragments=!useBase&&(view.length||configured)
   ? visibleAppearanceRanges(ranges,spec,selections,true).map(r=>r.text.trim()).filter(Boolean)
   : [];
  // Missing view: there is no safe way to infer framing, so retain the exact
  // original base. Skin-only characters without view tags also need the base.
  const text=(useBase||!configured
   ? String(base||'').trim()
   : prose?fragments.join(' '):fragments.map(x=>x.replace(/[,;]+$/,'')).join(', '))
    .replace(prose?/[.,;!?\s]+$/:/[;,\s]+$/,'');
  return text?(before||'')+text+';':after||'';
 });
 if(result.includes('[[NESS_VIS:'))throw Error('В промпте осталась неподставленная [[NESS_VIS]] базовой внешности. Проверь ID, выбранный ракурс и закрывающие скобки; это НЕ маркер одежды. NovelAI не запускался.');
 if(missingPreset.size)console.warn('[SP Imagen] Отсутствует ракурс в NESS_VIS. Безопасно использована исходная внешность из библиотеки для: '+[...missingPreset].map(id=>records.get(id)?.name||id).join(', '));
 // A director can accidentally omit a visibility marker. If a known library character
 // is explicitly named at the start of its own section, use the base as a safe fallback
 // rather than silently generating a generic look-alike. Never create a new character.
 const ids=[...records].filter(([id,record])=>!seen.has(id)&&String(record.base||'').trim());
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
  const base=String(record.base).trim().replace(record.appearanceFormat==='prose'?/[.,;!?\s]+$/:/[;,\s]+$/,'');
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
