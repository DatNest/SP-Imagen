// Independent director profiles + globally active extra director rules.
// Built-in Snapshot / Comic / Story Page remain immutable generation choices.
export const PROFILE_KINDS=Object.freeze({snapshot:'Snapshot',comic:'Comic',story_page:'Story Page'});
export const BUILTIN_KINDS=Object.freeze(Object.keys(PROFILE_KINDS));
export const PROFILE_SWITCHES=Object.freeze({
  includeScene:['События из чата','Передать режиссёру подготовленную сцену из RP-постов.'],
  includeCharacters:['Внешность из библиотеки','Передать выбранных персонажей и их видимую внешность.'],
  includeWardrobe:['Текущая одежда','Передать текущий гардероб и состояние одежды.'],
  includeComposition:['Пожелания к композиции','Передать композиционные пожелания из подготовки.'],
  useDialogueSettings:['Лимиты реплик','Для Comic / Story Page использовать лимиты реплик из настроек генерации.'],
  useArtStyle:['Стиль NovelAI','Применять выбранный стиль NovelAI.'],
  useNegativePrompt:['Негативный промпт','Применять текущий негативный промпт.'],
});
const DEFAULT_OPTIONS=Object.freeze(Object.fromEntries(Object.keys(PROFILE_SWITCHES).map(key=>[key,true])));
const safeId=id=>/^custom_[a-z0-9_-]{3,75}$/i.test(String(id||''));
const safeRuleId=id=>/^rule_[a-z0-9_-]{3,75}$/i.test(String(id||''));
export function normalizeProfile(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||!safeId(input.id))return null;
  const name=String(input.name||'').trim();
  const directorPrompt=String(input.directorPrompt||'');
  if(!name||!directorPrompt.trim()||directorPrompt.length>100000)return null;
  const kind=Object.hasOwn(PROFILE_KINDS,input.kind)?input.kind:'snapshot';
  const parser=input.parser&&typeof input.parser==='object'?input.parser:{};
  const posts=parser.posts==null||parser.posts===''?null:Number(parser.posts);
  if(posts!==null&&(!Number.isInteger(posts)||posts<1||posts>20))return null;
  return {
    id:String(input.id),name:name.slice(0,100),kind,
    directorPrompt,
    visible:input.visible!==false,
    parser:{
      posts,
      instructions:String(parser.instructions||'').slice(0,10000),
      options:Object.fromEntries(Object.keys(DEFAULT_OPTIONS).map(k=>[k,parser.options?.[k]!==false&&input.options?.[k]!==false])),
    },
  };
}
export function normalizeExtraRule(input){
  if(!input||typeof input!=='object'||!safeRuleId(input.id))return null;
  const name=String(input.name||'').trim(),prompt=String(input.prompt||'');
  if(!name||!prompt.trim()||prompt.length>20000)return null;
  return {id:String(input.id),name:name.slice(0,100),prompt,enabled:input.enabled!==false};
}
export function normalizeProfileStore(state){
  const seen=new Set(),profiles=[];
  for(const value of Array.isArray(state?.customProfiles)?state.customProfiles:[]){
    const p=normalizeProfile(value);
    if(p&&!seen.has(p.id)){seen.add(p.id);profiles.push(p);}
  }
  const rules=[],ruleSeen=new Set();
  for(const value of Array.isArray(state?.extraPrompts)?state.extraPrompts:[]){
    const r=normalizeExtraRule(value);
    if(r&&!ruleSeen.has(r.id)){ruleSeen.add(r.id);rules.push(r);}
  }
  const builtins=Object.fromEntries(BUILTIN_KINDS.map(k=>[k,state?.visibleBuiltIns?.[k]!==false]));
  return {profiles,rules,builtins};
}
export function profileById(state,id){
  return normalizeProfileStore(state).profiles.find(p=>p.id===id)||null;
}
export function generationFormats(state,{visibleOnly=false}={}){
  const {profiles,builtins}=normalizeProfileStore(state);
  return [
    ...BUILTIN_KINDS.filter(k=>!visibleOnly||builtins[k]).map(k=>({id:k,name:PROFILE_KINDS[k],baseKind:k,builtIn:true,visible:builtins[k]})),
    ...profiles.filter(p=>!visibleOnly||p.visible).map(p=>({id:p.id,name:p.name,baseKind:p.kind,builtIn:false,visible:p.visible})),
  ];
}
export function baseKindFor(state,kind){return BUILTIN_KINDS.includes(kind)?kind:profileById(state,kind)?.kind||null;}
export function filterProfileSources(source,profile){
  if(!profile)return source;
  const options=profile.parser.options;
  return Object.fromEntries(Object.entries(source).map(([key,value])=>{
    const option={'RP POSTS':'includeScene','FIXED CHARACTER APPEARANCE':'includeCharacters','CURRENT WARDROBE':'includeWardrobe','COMPOSITION WISHES':'includeComposition'}[key];
    return [key,option&&!options[option]?'':value];
  }));
}
export function directorProfileGuidance(state,profile=null){
  const rules=normalizeProfileStore(state).rules.filter(r=>r.enabled&&r.prompt.trim());
  const pieces=[];
  if(profile?.parser?.instructions?.trim())
    pieces.push('\n\nCUSTOM PROFILE — SCENE PARSING INSTRUCTIONS\n'+profile.parser.instructions+'\nUse these directions to select and interpret established RP information; never fabricate scene facts, clothing, identity or text.');
  if(rules.length)
    pieces.push('\n\nADDITIONAL DIRECTOR RULES — APPLY TO EVERY GENERATION PROFILE\n'+
      rules.map(r=>r.prompt).join('\n\n')+
      '\nApply these additional instructions while composing the scene and final image prompt. Preserve their wording as supplied here; do not reproduce the instruction text itself inside the NovelAI prompt unless it is explicitly an image tag. The image prompt must still begin with subject-count tags and preserve its required output contract.');
  return pieces.join('');
}
// Migrate v2.9.6 personal "Add Prompt" entries to separate global rules.
// Keep copied directors as independent generation choices without losing drafts.
export function migrateLegacyProfiles(state){
  if(!state||typeof state!=='object')return false;
  state.customProfiles??=[];state.extraPrompts??=[];state.visibleBuiltIns??={};
  if(!Array.isArray(state.customProfiles))state.customProfiles=[];
  if(!Array.isArray(state.extraPrompts))state.extraPrompts=[];
  let changed=false;
  const selected=new Set(Object.values(state.activeProfiles||{}).filter(Boolean));
  const retained=[];
  for(const item of state.customProfiles){
    if(!item||typeof item!=='object'){changed=true;continue;}
    if(!String(item.directorPrompt||'').trim()&&String(item.prompt||'').trim()){
      const id='rule_'+String(item.id||'').replace(/^custom_/,'').replace(/[^a-z0-9_-]/gi,'').slice(0,65);
      if(safeRuleId(id)&&!state.extraPrompts.some(p=>p.id===id)){
        state.extraPrompts.push({id,name:String(item.name||'Правило'),prompt:item.prompt,enabled:selected.has(item.id)});
      }
      changed=true;
      continue;
    }
    if(String(item.directorPrompt||'').trim()){
      const updated={...item};
      if(updated.visible===undefined){updated.visible=true;changed=true;}
      if(!updated.parser){
        updated.parser={posts:null,instructions:String(updated.prompt||'')};
        changed=true;
      }
      retained.push(updated);
    }else{changed=true;}
  }
  if(changed)state.customProfiles=retained;
  return changed;
}
