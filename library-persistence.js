// Stable account-scoped SillyTavern user files, independent of extension builds.
export const LIBRARY_FILE='sp-imagen-library-store-v1.json';
export const BACKUP_FILE='sp-imagen-library-backup-v1.json';
const asRaw=value=>typeof value==='string'?value:value?JSON.stringify(value):'';
function validateRaw(raw){
 const data=JSON.parse(raw);
 if(!data||data.version!==1||!data.personas||!data.characters||
  [data.personas,data.characters].some(x=>typeof x!=='object'||Array.isArray(x)))throw Error('Повреждённый формат библиотеки');
 return raw;
}
function decode(text){
 const e=JSON.parse(text);
 if(!e||e.format!=='sp-imagen-library-store-v1'||typeof e.current!=='string'||!Array.isArray(e.history))throw Error('Повреждён файл хранилища библиотеки');
 validateRaw(e.current);for(const raw of e.history)validateRaw(raw);return e;
}
const historyOf=(current,items)=>[...new Set(items.filter(x=>typeof x==='string'&&x&&x!==current))].slice(0,5);
function encodeBase64(text){
 const bytes=new TextEncoder().encode(text);let binary='';
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export function createLibraryFileTransport({fetcher=globalThis.fetch,headers=()=>({})}={}){
 return {
  async read(name){
   const res=await fetcher('/user/files/'+name,{cache:'no-store',credentials:'same-origin'});
   if(res.status===404)return null;
   if(!res.ok)throw Error('Не удалось прочитать библиотеку: HTTP '+res.status);
   return await res.text();
  },
  async write(name,text){
   const res=await fetcher('/api/files/upload',{method:'POST',credentials:'same-origin',headers:{...headers(),'Content-Type':'application/json'},body:JSON.stringify({name,data:encodeBase64(text)})});
   if(!res.ok)throw Error('Не удалось записать библиотеку: HTTP '+res.status);
  }
 };
}
export function createLibraryStore({transport,legacy=()=>({}),locks=globalThis.navigator?.locks}){
 let state=null,queue=Promise.resolve();
 const exclusive=task=>{const job=queue.then(()=>locks?.request?locks.request('sp-imagen-library-store-v1',task):task());queue=job.catch(()=>{});return job;};
 const load=async()=>{const text=await transport.read(LIBRARY_FILE);return text===null?null:decode(text);};
 async function writeVerified(name,text){
  await transport.write(name,text);
  if(await transport.read(name)!==text)throw Error('Запись библиотеки не подтверждена сервером. Открой редактор заново.');
 }
 async function refreshUnlocked(){
  const found=await load();if(found){state=found;return state.current;}
  if(state||await transport.read(BACKUP_FILE)!==null)throw Error('Основной файл библиотеки отсутствует. Резервная копия сохранена; автоматическая перезапись заблокирована.');
  const old=legacy(),raw=asRaw(old.current);if(!raw)return '';
  validateRaw(raw);
  const history=[];try{const prev=asRaw(old.previous);if(prev)history.push(validateRaw(prev));}catch{}
  const initial={format:'sp-imagen-library-store-v1',current:raw,history:historyOf(raw,history)};
  const concurrent=await load();if(concurrent){state=concurrent;return state.current;}
  await writeVerified(LIBRARY_FILE,JSON.stringify(initial));state=initial;return raw;
 }
 return {
  get raw(){return state?.current||'';},
  get history(){return [...(state?.history||[])];},
  refresh:()=>exclusive(refreshUnlocked),
  commit:(raw,expected)=>exclusive(async()=>{
   validateRaw(raw);const current=await refreshUnlocked();
   if(current!==asRaw(expected))throw Error('Библиотека уже изменилась в другом окне. Открой редактор заново.');
   if(raw===current)return current;
   const previous=state;
   if(previous)await writeVerified(BACKUP_FILE,JSON.stringify(previous));
   const latest=await load();
   if((latest?.current||'')!==current)throw Error('Библиотека изменилась во время сохранения. Открой редактор заново.');
   const next={format:'sp-imagen-library-store-v1',current:raw,history:historyOf(raw,[current,...(previous?.history||[])])};
   await writeVerified(LIBRARY_FILE,JSON.stringify(next));state=next;return raw;
  })
 };
}
// flushEditor replaces records: update the live draft as well as the editor closure.
export function applyCommittedIcon(draft,id,icon,saved){
 const record=draft.personas?.[id]||draft.characters?.[id];
 if(record){if(icon)record.libraryIconData=icon;else delete record.libraryIconData;}
 draft.catalogRevision=saved.catalogRevision;draft.savedAt=saved.savedAt;
}
