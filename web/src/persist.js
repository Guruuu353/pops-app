/* ============ server connection: session, saved records, offline queue ============ */
const TKEY='pops-token',OKEY='pops-outbox';
const tokGet=()=>{try{return localStorage.getItem(TKEY);}catch(e){return null;}};
const tokSet=t=>{try{t?localStorage.setItem(TKEY,t):localStorage.removeItem(TKEY);}catch(e){}};
class ApiErr extends Error{constructor(s,m,l){super(m);this.status=s;this.list=l;}}
const api=async(method,path,body)=>{
 let r;try{r=await fetch('/api'+path,{method,headers:{'content-type':'application/json',...(tokGet()?{authorization:'Bearer '+tokGet()}:{})},body:body?JSON.stringify(body):undefined});}catch(e){throw new ApiErr(0,'No connection to the server');}
 const j=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===401&&path!=='/login'){tokSet(null);window.dispatchEvent(new Event('pops-signed-out'));}throw new ApiErr(r.status,j.error||'Request failed',j.errors);}
 return j;
};
/* Dates inside records (engine service dates) are saved as {"$d":"2026-11-02T..."} and restored on load */
const encJ=v=>JSON.stringify(v,function(k,x){const raw=this[k];return raw instanceof Date?{$d:raw.toISOString()}:x;});
const decJ=v=>{if(Array.isArray(v))return v.map(decJ);if(v&&typeof v==='object'){if(v.$d)return new Date(v.$d);const o={};for(const k in v)o[k]=decJ(v[k]);return o;}return v;};

/* queue of writes that could not be sent yet (no signal at sea). Sent in order when the connection returns. */
const ob={
 list(){try{return JSON.parse(localStorage.getItem(OKEY)||'[]');}catch(e){return [];}},
 save(a){try{localStorage.setItem(OKEY,JSON.stringify(a));}catch(e){}window.dispatchEvent(new Event('pops-outbox'));},
 push(op){const a=this.list().filter(x=>!(x.coll===op.coll&&x.id===op.id));a.push(op);this.save(a);},
 async flush(){
  const a=this.list();if(!a.length)return {sent:0,left:0};const left=[];let stop=false;
  for(const op of a){
   if(stop){left.push(op);continue;}
   try{if(op.del)await api('DELETE','/docs/'+op.coll+'/'+encodeURIComponent(op.id));else await api('PUT','/docs/'+op.coll+'/'+encodeURIComponent(op.id),{data:op.data});}
   catch(e){if(e.status===0||e.status>=500){left.push(op);stop=true;}else left.push({...op,error:e.message});}
  }
  this.save(left);return {sent:a.length-left.length,left:left.length};
 }
};

/* a collection kept in React state and saved to the server whenever it changes.
   Arrays are matched by item.id. Objects (for example the fleet, keyed by boat name) are matched by key. */
const wrapV=x=>(x&&typeof x==='object'&&!Array.isArray(x)&&!(x instanceof Date))?x:{__v:x};
const unwrapV=x=>(x&&x.__v!==undefined&&Object.keys(x).length===1)?x.__v:x;
const asItems=v=>Array.isArray(v)?v.filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]):Object.keys(v||{}).map(k=>[k,wrapV(v[k])]);
/* turn the rows the server returns back into the shape the screens use */
const fromDocs=(rows,asMap)=>{rows=(rows||[]).map(r=>{const o={...r};delete o._v;return decJ(o);});if(!asMap)return rows;const m={};rows.forEach(r=>{const id=r.id;const o={...r};delete o.id;m[id]=unwrapV(o);});return m;};
const useColl=(name,init,ready,canWrite)=>{
 const [v,setV]=useState(init);
 const synced=useRef(null);          // Map id -> json last known on the server
 const loaded=useRef(false);
 const load=useCallback(val=>{loaded.current=true;synced.current=new Map(asItems(val).map(([i,x])=>[i,encJ(x)]));setV(val);},[]);
 useEffect(()=>{
  if(!loaded.current||!canWrite)return;
  const cur=new Map(asItems(v).map(([i,x])=>[i,encJ(x)]));const prev=synced.current;
  cur.forEach((j,i)=>{if(prev.get(i)!==j){ob.push({coll:name,id:i,data:JSON.parse(j)});}});
  prev.forEach((j,i)=>{if(!cur.has(i))ob.push({coll:name,id:i,del:true});});
  synced.current=cur;
  if(ob.list().length)ob.flush();
 },[v]);
 return [v,setV,load];
};

/* records from paper imports and older versions lack many fields. Fill them so every screen can open them. */
const _arr=v=>Array.isArray(v)?v:[];const _obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const normPatrol=p=>({...p,rangers:_arr(p.rangers),areas:_arr(p.areas),enc:_arr(p.enc),seiz:_arr(p.seiz),obsList:_arr(p.obsList),incList:_arr(p.incList),photos:_arr(p.photos),equip:_arr(p.equip),track:_arr(p.track),events:_arr(p.events),parts:_obj(p.parts),vessel:_obj(p.vessel),chal:_obj(p.chal),attach:_obj(p.attach),mcsx:_obj(p.mcsx),prep:_obj(p.prep),leader:p.leader||'',area:p.area||'',boat:p.boat||'',cox:p.cox||'',start:p.start||'',end:p.end||'—',action:p.action||'—',review:p.review||'—',objective:p.objective||'—',km:+p.km||0,obs:+p.obs||0,inc:+p.inc||0,status:p.status||'Completed',date:p.date||p.iso||''});
const normInc=i=>({...i,personsList:_arr(i.personsList),photos:_arr(i.photos),persons:i.persons||'Not identified',stage:Math.max(0,Math.min(4,+i.stage||0)),ref:i.ref||'None',action:i.action||'—',code:i.code||'',desc:i.desc||'',cat:i.cat||'Infringement',ranger:i.ranger||'',patrol:i.patrol||'—',time:i.time||'',loc:i.loc||'',date:i.date||i.iso||''});
