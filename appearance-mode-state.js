/**
 * Appearance editor presentation data. This module does NOT construct image prompts:
 * the pre-existing base/visibility, skin, and explicit NSFW fields remain sources.
 */
// Standalone parsers prevent a module import cycle with appearance-board.js.
const parseBaseTags = source => String(source||'').split(',').map(t=>t.trim().replace(/;+$/,'').trim()).filter(Boolean).map(text=>({text}));
const normalizeSkinTags = source => ({tags:Array.isArray(source?.tags)?source.tags:[],sections:Array.isArray(source?.sections)?source.sections:[]});
const normalizeAppearanceSections = (sections,base) => (Array.isArray(sections)?sections:[]).map(s=>({id:s.id,title:s.title,before:Number.isInteger(s.before)?s.before:parseBaseTags(base).length}));

export const APPEARANCE_MODES = Object.freeze(['base','skin','nsfw']);
export const NSFW_AREAS = Object.freeze({
  nsfwChest:'Анатомия груди',
  nsfwLowerFront:'Нижняя передняя анатомия',
  nsfwLowerBack:'Нижняя задняя анатомия'
});
// Identity comparisons ignore only non-printing format artifacts. The original
// text and the first valid user ID are kept verbatim for edits and export.
const key = s => String(s||'').normalize('NFKC')
  .replace(/[\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'')
  .replace(/\s+/g,' ').trim().toLowerCase();
const validTitle = s => String(s||'').trim().slice(0,50);
const properId = s => /^[a-z][a-z0-9_]{0,48}$/.test(s);

function modeData(raw, sourceTags, initialSections, prefix) {
  const prior=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const old=Array.isArray(prior.tags)?prior.tags:[];
  const fromSource=Array.isArray(sourceTags)?sourceTags:[];
  const tags=[],ids=new Set(),names=new Set();
  const append=(text,suggested)=>{
    const value=String(text||'').trim().replace(/[,;\s]+$/,'').trim().slice(0,1200);
    const identity=key(value);
    if(!value||!identity||names.has(identity)||tags.length>=700)return;
    names.add(identity);
    let id=String(suggested||'');
    if(!properId(id)||ids.has(id)){
      let n=tags.length+1;
      while(ids.has(prefix+n))n++;
      id=prefix+n;
    }
    ids.add(id);
    tags.push({id,text:value});
  };
  // Prefix lengths record where each ORIGINAL boundary ends after deduplication.
  // Dividers remain attached to their following tags even when a corrupt
  // catalogue contains repeated visually-identical strings.
  const oldPrefix=[0],sourcePrefix=[0];
  for(const tag of old){
    if(typeof tag?.text==='string')append(tag.text,tag.id);
    oldPrefix.push(tags.length);
  }
  for(const tag of fromSource){
    if(typeof tag?.text==='string')append(tag.text,tag.id);
    sourcePrefix.push(tags.length);
  }
  const sections=[],sectionIds=new Set();
  const definitions=Array.isArray(prior.sections)?prior.sections:initialSections||[];
  const indexMap=old.length?oldPrefix:sourcePrefix;
  for(const section of definitions){
    const title=validTitle(section?.title);
    if(!title||sections.length>=60)continue;
    let id=String(section.id||'');
    if(!properId(id)||sectionIds.has(id)){
      let n=sections.length+1;
      while(sectionIds.has('section'+n))n++;
      id='section'+n;
    }
    sectionIds.add(id);
    const original=Number.isInteger(section.before)?Math.max(0,Math.min(indexMap.length-1,section.before)):indexMap.length-1;
    sections.push({id,title,before:indexMap[original]});
  }
  return {tags,sections};
}

/** Safe import for versions before mode-specific tag catalogues were introduced. */
export function normalizeAppearanceModeCatalog(raw,base,skin,nsfw={},legacySections=[]) {
  const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const previous=data.modes&&typeof data.modes==='object'?data.modes:{};
  const baseTags=parseBaseTags(base);
  const skinData=normalizeSkinTags(skin);
  const nsfwTags=Object.keys(NSFW_AREAS).flatMap(id=>parseBaseTags(nsfw[id]||''));
  const legacyBaseSections=normalizeAppearanceSections(legacySections,base);
  const baseSections=legacyBaseSections.length?legacyBaseSections:(data.sections||[]).map(s=>({
    id:s.id,title:s.title,
    before:Math.max(0,Math.min(baseTags.length,s.before))
  }));
  // Never classify legacy 'nudeUpper'/'nudeLower' tags into new anatomy slots:
  // that would silently guess where upper/lower body traits belong.
  const modes={
    base:modeData(previous.base,baseTags,baseSections,'b'),
    skin:modeData(previous.skin,skinData.tags,skinData.sections,'s'),
    nsfw:modeData(previous.nsfw,nsfwTags,[],'n')
  };
  // Preserve unassigned legacy shared-catalogue entries without moving them
  // into a sensitive mode. They remain available in the base catalogue only.
  if(!data.modes && Array.isArray(data.tags)){
    const known=new Set([...baseTags,...skinData.tags,
      ...parseBaseTags(nsfw.nudeUpper||''),...parseBaseTags(nsfw.nudeLower||'')
    ].map(t=>key(t.text)));
    const isAlreadyAssigned = value => {
      const parts=String(value||'').split(/[;\r\n]+/g).map(key).filter(Boolean);
      return !!parts.length&&parts.every(part=>known.has(part));
    };
    // Some older catalogues joined multiple legacy lines inside one chip.
    // Do not re-add those already-migrated skin fragments to the base mode.
    const extras=data.tags.filter(t=>t?.text&&!isAlreadyAssigned(t.text));
    const oldNames=new Set(modes.base.tags.map(t=>key(t.text)));
    for(const t of extras)if(!oldNames.has(key(t.text))){
      let id=String(t.id||'');if(!properId(id)||modes.base.tags.some(x=>x.id===id))id='bextra'+(modes.base.tags.length+1);
      modes.base.tags.push({id,text:String(t.text).trim().slice(0,1200)});
      oldNames.add(key(t.text));
    }
  }
  return {modes};
}

export function modeTokens(data){
  const value=data||{tags:[],sections:[]},out=[];
  for(let i=0;i<=value.tags.length;i++){
    for(const divider of value.sections)if(divider.before===i)out.push({kind:'divider',id:divider.id,title:divider.title});
    if(i<value.tags.length)out.push({kind:'tag',id:value.tags[i].id,text:value.tags[i].text});
  }
  return out;
}

export function fromModeTokens(tokens){
  const tags=[],sections=[];
  for(const item of tokens){
    if(item.kind==='tag')tags.push({id:item.id,text:item.text});
    else if(item.kind==='divider')sections.push({id:item.id,title:item.title,before:tags.length});
  }
  return {tags,sections};
}

/** Move left/right by one physical tag, or up/down into the adjacent section. */
export function repositionModeTag(data,tagId,action){
  const tokens=modeTokens(data),from=tokens.findIndex(t=>t.kind==='tag'&&t.id===tagId);
  if(from<0)return null;
  const source=tokens[from],next=[...tokens];
  if(action==='left'||action==='right'){
    const step=action==='left'?-1:1;
    let target=from+step;
    while(target>=0&&target<tokens.length&&tokens[target].kind!=='tag')target+=step;
    if(target<0||target>=tokens.length)return null;
    [next[from],next[target]]=[next[target],next[from]];
  }else if(action==='up'||action==='down'){
    const dividerIndexes=tokens.map((t,i)=>t.kind==='divider'?i:-1).filter(i=>i>=0);
    const prior=dividerIndexes.filter(i=>i<from),following=dividerIndexes.filter(i=>i>from);
    if(action==='up'){
      // The first heading has no preceding named section.
      if(prior.length<2)return null;
      // End of previous section: immediately before the current heading.
      const target=prior.at(-1);
      next.splice(from,1);next.splice(target,0,source);
    }else{
      if(!following.length)return null;
      // Beginning of next section: immediately after its heading.
      const target=following[0];
      next.splice(from,1);next.splice(target,0,source);
    }
  }else return null;
  return fromModeTokens(next);
}

export function sectionTagCount(data,id){
  const sections=data?.sections||[];
  const i=sections.findIndex(s=>s.id===id);
  if(i<0)return 0;
  const start=sections[i].before,end=i+1<sections.length?sections[i+1].before:data.tags.length;
  return Math.max(0,end-start);
}
