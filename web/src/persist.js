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

/* small key-value store in IndexedDB. It holds what does not fit in localStorage (big records with photos) and the last copy of the data, so the app can open with no signal. */
const idb={
 db:null,
 open(){if(this.db)return this.db;this.db=new Promise((ok,no)=>{try{const r=indexedDB.open('pops-kv',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}});return this.db;},
 async get(k){try{const d=await this.open();return await new Promise((ok,no)=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});}catch(e){return undefined;}},
 async set(k,v){try{const d=await this.open();return await new Promise((ok,no)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>ok(true);t.onerror=()=>no(t.error);});}catch(e){return false;}}
};
/* queue of writes that could not be sent yet (no signal at sea). Sent in order when the connection returns.
   - kept in memory, mirrored to localStorage and, if that is full, to IndexedDB, so a big record is never silently lost
   - one send at a time; records saved while a send is running are kept
   - a record the server refuses (too large, not allowed) is kept in a separate "needs attention" list instead of blocking the rest */
const ob={
 mem:null,busy:null,full:false,
 _read(){try{return JSON.parse(localStorage.getItem(OKEY)||'[]');}catch(e){return [];}},
 list(){if(!this.mem)this.mem=this._read();return this.mem;},
 retry(){return this.list().filter(x=>!x.error);},
 failed(){return this.list().filter(x=>x.error);},
 save(a){this.mem=a;let ok=true;try{localStorage.setItem(OKEY,JSON.stringify(a));this.full=false;}catch(e){ok=false;}
  if(!ok){this.full=true;try{localStorage.setItem(OKEY,JSON.stringify(a.map(x=>x.del?x:{coll:x.coll,id:x.id,big:1})));}catch(e){}}
  idb.set('outbox',a);window.dispatchEvent(new Event('pops-outbox'));},
 /* on start: add anything the IndexedDB copy holds that localStorage lost */
 async recover(){const s=await idb.get('outbox');if(!Array.isArray(s)||!s.length)return;const cur=this.list();const have=new Map(cur.map(x=>[x.coll+'/'+x.id,x]));let ch=false;s.forEach(x=>{const k=x.coll+'/'+x.id;const h=have.get(k);if(!h||(h.big&&x.data)){have.set(k,x);ch=true;}});if(ch)this.save([...have.values()]);},
 push(op){const a=this.list().filter(x=>!(x.coll===op.coll&&x.id===op.id));a.push({...op,at:Date.now()});this.save(a);},
 discard(op){this.save(this.list().filter(x=>!(x.coll===op.coll&&x.id===op.id&&x.at===op.at)));},
 clearErrors(){this.save(this.list().map(x=>{const {error,...r}=x;return r;}));},
 async flush(){
  if(this.busy){this.again=true;return this.busy;}
  this.busy=(async()=>{
   let sent=0;const tried=new Set();
   try{
    for(;;){
     this.again=false;let stop=false;
     const todo=this.retry().filter(op=>!tried.has(op.coll+'/'+op.id+'/'+op.at)&&!(op.big&&!op.data));
     if(!todo.length)break;
     for(const op of todo){
      tried.add(op.coll+'/'+op.id+'/'+op.at);
      try{
       if(op.del)await api('DELETE','/docs/'+op.coll+'/'+encodeURIComponent(op.id));else await api('PUT','/docs/'+op.coll+'/'+encodeURIComponent(op.id),{data:op.data});
       /* remove exactly the record that was sent; a newer save of the same record stays queued */
       this.save(this.list().filter(x=>!(x.coll===op.coll&&x.id===op.id&&x.at===op.at)));sent++;
      }catch(e){
       if(e.status===0||e.status>=500||e.status===401||e.status===408||e.status===429){stop=true;break;}
       this.save(this.list().map(x=>(x.coll===op.coll&&x.id===op.id&&x.at===op.at)?{...x,error:e.message||'Refused by the server'}:x));
      }
     }
     if(stop)break;
    }
    return {sent,left:this.retry().length,failed:this.failed().length};
   }finally{}
  })();
  const pr=this.busy;pr.then(()=>{if(this.busy===pr)this.busy=null;},()=>{if(this.busy===pr)this.busy=null;});
  return pr;
 }
};
ob.recover();
/* the last data received, kept on the phone so the app opens and works without signal */
const cacheSave=(k,v)=>idb.set('cache-'+k,v);const cacheLoad=k=>idb.get('cache-'+k);
/* put records that are still waiting to be sent on top of a saved copy, so the screens show the newest version */
const overlayOutbox=docs=>{const o={...docs};ob.list().forEach(op=>{if(!o[op.coll]||op.big&&!op.data)return;const rows=o[op.coll].filter(r=>String(r.id)!==String(op.id));if(!op.del&&op.data)rows.push({...op.data,id:op.id});o[op.coll]=rows;});return o;};

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
  if(ob.retry().length)ob.flush().catch(()=>{});
 },[v]);
 return [v,setV,load];
};

/* records from paper imports and older versions lack many fields. Fill them so every screen can open them. */
const _arr=v=>Array.isArray(v)?v:[];const _obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const normPatrol=p=>({...p,rangers:_arr(p.rangers),areas:_arr(p.areas),enc:_arr(p.enc),seiz:_arr(p.seiz),obsList:_arr(p.obsList),incList:_arr(p.incList),photos:_arr(p.photos),equip:_arr(p.equip),track:_arr(p.track),events:_arr(p.events),parts:_obj(p.parts),vessel:_obj(p.vessel),chal:_obj(p.chal),attach:_obj(p.attach),mcsx:_obj(p.mcsx),prep:_obj(p.prep),leader:p.leader||'',area:p.area||'',boat:p.boat||'',cox:p.cox||'',start:p.start||'',end:p.end||'—',action:p.action||'—',review:p.review||'—',objective:p.objective||'—',km:+p.km||0,obs:+p.obs||0,inc:+p.inc||0,status:p.status||'Completed',date:p.date||p.iso||''});
const normInc=i=>({...i,personsList:_arr(i.personsList),photos:_arr(i.photos),persons:i.persons||'Not identified',stage:Math.max(0,Math.min(4,+i.stage||0)),ref:i.ref||'None',action:i.action||'—',code:i.code||'',desc:i.desc||'',cat:i.cat||'Infringement',ranger:i.ranger||'',patrol:i.patrol||'—',time:i.time||'',loc:i.loc||'',date:i.date||i.iso||''});
