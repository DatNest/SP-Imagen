import { findCharacter, normalizeCharacterName } from './character-identity.js';
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

/**
 * Insert permanent appearance ONCE for an actor actually named in the image.
 * If a selected preset has nonempty content, use it. Otherwise use the
 * full original base description from the library. No other fallback modes.
 */
export function insertVisibleAppearance(prompt, records = new Map(), directory = records) {
  const all = directory instanceof Map ? directory : new Map();
  const views = records instanceof Map ? records : new Map();
  const source = String(prompt ?? '');
  const textMarker = /\r?\n\s*\r?\nText:\s*/g;
  const finalText = [...source.matchAll(textMarker)].at(-1);
  const visual = finalText ? source.slice(0, finalText.index) : source;
  const tail = finalText ? source.slice(finalText.index) : '';
  const actorMarker = /\s\|\s*(?:girl|boy|cat|other)\s*,/giu;
  const positions = [...visual.matchAll(actorMarker)];
  if (!positions.length) return source;
  const scene = visual.slice(0, positions[0].index);
  const appearanceMarker = /\[\[(?:NESS_VIS:([a-z][a-z0-9_]*)|([a-z][a-z0-9_]*):id):([^\]\r\n]+)\]\]/giu;
  const trimDescription = value => String(value || '').trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
  const appearances = [];
  const used = new Set();

  function appearanceFor(record, configured, spec) {
    const base = trimDescription(record?.base || configured?.base);
    if (spec && configured && Object.hasOwn(NESS_APPEARANCE_PRESETS, spec)) {
      const ranges = configured.ranges || [];
      const selections = configured.selections || {};
      const visible = visibleAppearanceRanges(ranges, spec, selections, false);
      if (visible.length) {
        const composed = visibleAppearanceRanges(ranges, spec, selections, true)
          .map(r => trimDescription(r.text)).filter(Boolean).join(', ');
        if (composed) return composed;
      }
    }
    return base; // empty or unavailable preset: use the entire original appearance
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : visual.length;
    const original = visual.slice(start, end);
    const prefix = positions[i][0].trimEnd() + ' ';
    const body = original.slice(prefix.length);
    const nameMatch = body.match(/^\s*([^,;\r\n]{1,160})([,;]?\s*)/u);
    if (!nameMatch) { appearances.push(original); continue; }
    const name = nameMatch[1].trim();
    const matchedByName = findCharacter(all, { name });
    const foundMarkers = [...body.matchAll(appearanceMarker)];
    // A marker is permitted to identify an unaliased character, but must NOT
    // override a different name already recognized at this section's start.
    const matchedByMarker = foundMarkers.map(m => findCharacter(all, { id: m[1] || m[2] })).find(Boolean) || null;
    const actor = matchedByName || matchedByMarker;
    // Unknown markers are inert. Never borrow traits from a different actor.
    const withoutMarkers = body.replace(appearanceMarker, '').replace(/\s+,/g, ',');
    const remainder = withoutMarkers.slice(0, withoutMarkers.length).replace(/^\s*([^,;\r\n]{1,160})[,;]?\s*/u, '').replace(/^[,;\s]+/, '');
    if (!actor || used.has(actor.id)) {
      appearances.push(prefix + name + (remainder ? ', ' + remainder : ''));
      continue;
    }
    used.add(actor.id);
    const ownedMarker = foundMarkers.find(m => {
      const match = findCharacter(all, { id: m[1] || m[2] });
      return match?.id === actor.id;
    });
    const spec = ownedMarker?.[3] || '';
    const selected = views.get(actor.id) || actor.record;
    const appearance = appearanceFor(actor.record, selected, spec);
    // Never insert permanent appearance twice (e.g. a legacy model echoed it).
    const bodyNormalized = normalizeCharacterName(remainder);
    const appearanceNormalized = normalizeCharacterName(appearance);
    const needsInsertion = appearance && (!appearanceNormalized || !bodyNormalized.includes(appearanceNormalized));
    const description = [needsInsertion ? appearance : '', remainder].filter(Boolean).join(needsInsertion && remainder ? '; ' : '');
    appearances.push(prefix + name + (description ? ', ' + description : ''));
  }
  return scene + appearances.join('') + tail;
}

// Empty selections are metadata, not usable appearance tags.
export function hasConfiguredAppearanceViews(entry){
 return Boolean(entry?.appearanceRanges?.length)||Object.values(entry?.appearanceSelections||{}).some(ranges=>Array.isArray(ranges)&&ranges.length>0);
}
