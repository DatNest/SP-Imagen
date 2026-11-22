// Per-RP-post prompt inspection, independent of disposable generation drafts.
export const POST_PROMPT_FIELD = 'sp_imagen_post_prompts_v1';

export function readPostPrompts(message) {
 const value=message?.extra?.[POST_PROMPT_FIELD];
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const parsedScene=typeof value.parsedScene==='string'?value.parsedScene:'';
 const directorRaw=typeof value.directorRaw==='string'?value.directorRaw:'';
 const finalPrompt=typeof value.finalPrompt==='string'?value.finalPrompt:'';
 if(!parsedScene&&!directorRaw&&!finalPrompt)return null;
 return {kind:typeof value.kind==='string'?value.kind:'',parsedScene,directorRaw,finalPrompt};
}

export function rememberPostPrompts(ctx,index,changes,{reset=false}={}){
 const message=ctx?.chat?.[index];
 if(!message) return null;
 const old=reset?null:readPostPrompts(message);
 const next={...old};
 if(typeof changes?.kind==='string')next.kind=changes.kind;
 for(const key of ['parsedScene','directorRaw','finalPrompt']){
  if(typeof changes?.[key]==='string')next[key]=changes[key];
 }
 message.extra ||= {};
 message.extra[POST_PROMPT_FIELD]=next;
 return next;
}

export function collectPostPrompts(message,draft=null,saved=null) {
 const stored=readPostPrompts(message);
 return {
  parsedScene:stored?.parsedScene||draft?.parser?.parsedScene||'',
  directorRaw:stored?.directorRaw||draft?.directorRaw||'',
  finalPrompt:stored?.finalPrompt||draft?.final?.config?.prompt||saved?.config?.prompt||'',
 };
}
