/* SP Imagen: isolated, same-origin regex worker. */
(function wardrobeRegexWorker(){
 const regex=rule=>new RegExp(rule.pattern,[...new Set((rule.flags||'')+'g')].join(''));
 const group=(m,key)=>/^\d+$/.test(key)?m[Number(key)]:m.groups?.[key];
 function preserve(text,rules){
  const items=[];let tokenCode=0xe000;const occupied=text+rules.map(r=>r.label||'').join('');
  for(const r of rules)for(const m of text.matchAll(regex(r))){
   if(!m[0].length)continue;const content=r.group?group(m,r.group):m[0];if(content===undefined)throw Error('Не найдена группа исключения: '+r.group);
   const a=m.index,b=a+m[0].length;
   if(a===b||items.some(x=>a<x.b&&b>x.a))continue;
   while(tokenCode<=0xf8ff&&occupied.includes(String.fromCharCode(tokenCode)))tokenCode++;
   if(tokenCode>0xf8ff)throw Error('Не удалось зарезервировать маркер сохранения');
   items.push({a,b,content:String(content),label:r.label||'',token:String.fromCharCode(tokenCode++)});if(items.length>1000)throw Error('Слишком много извлечённых фрагментов');
  }
  items.sort((a,b)=>a.a-b.a);for(let i=items.length-1;i>=0;i--){const m=items[i];text=text.slice(0,m.a)+m.token+text.slice(m.b);}return {text,items};
 }
 function cleanup(text,rules){for(const r of rules)text=text.replace(regex(r),'');return text;}
 function wardrobe(text,rules){
  const pairs=[];
  for(const r of rules){const ranges=[];
   for(const m of text.matchAll(regex(r))){const name=group(m,r.nameGroup),outfit=group(m,r.outfitGroup);
    if(name===undefined||outfit===undefined)throw Error('В выражении нет указанных групп имени/одежды');
    if(String(name).trim()&&String(outfit).trim()){pairs.push([String(name),String(outfit)]);ranges.push([m.index,m.index+m[0].length]);}
    if(pairs.length>1000)throw Error('Слишком много совпадений');
   }
   for(let i=ranges.length-1;i>=0;i--){const [a,b]=ranges[i];text=text.slice(0,a)+' '+text.slice(b);}
  }
  return {text,pairs};
 }
 self.onmessage=event=>{try{
  const {text,rule,operation}=event.data;let result;
  if(operation==='preserve')result=preserve(text,rule.rules);
  else if(operation==='process'){result=preserve(text,rule.exceptions||[]);result.text=cleanup(result.text,rule.patterns||[]);}
  else if(operation==='cleanup')result={text:cleanup(text,rule.rules||[rule]),pairs:[]};
  else result=wardrobe(text,rule.rules||[rule]);
  self.postMessage(result);
 }catch(e){self.postMessage({error:String(e?.message||e)});}};
})();
