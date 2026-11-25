// Mutate the library draft only; all persistence still uses the existing verified save.
export function bulkTagState(draft,selected,tagId){
 const ids=[...selected];const count=ids.filter(id=>draft.organizer.characters[id]?.tagIds?.includes(tagId)).length;
 return count===0?'none':count===ids.length?'all':'partial';
}
export function setBulkTag(draft,selected,tagId,add){
 if(!draft.organizer.tags.some(tag=>tag.id===tagId))return false;
 let changed=false;
 for(const id of selected){
  if(!Object.hasOwn(draft.personas,id)&&!Object.hasOwn(draft.characters,id))continue;
  const meta=draft.organizer.characters[id]||{},tags=new Set(meta.tagIds||[]);
  if(tags.has(tagId)===add)continue;
  if(add)tags.add(tagId);else tags.delete(tagId);
  draft.organizer.characters[id]={...meta,tagIds:[...tags]};changed=true;
 }
 return changed;
}
export function deleteLibraryRecords(draft,selected){
 let count=0;
 for(const id of selected){
  for(const group of ['personas','characters']){
   if(!Object.hasOwn(draft[group],id))continue;
   delete draft[group][id];delete draft.organizer.characters[id];count++;
  }
 }
 return count;
}
