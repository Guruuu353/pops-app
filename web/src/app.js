/* ============ app shell ============ */
const VIEWS={dashboard:Dashboard,'live-map':LiveMap,patrols:Patrols,incidents:Incidents,'iweni-lmma':Lmma,projects:Projects,coral:Coral,staff:Staff,bmus:Bmus,partners:Partners,boats:Boats,tourism:Income,reports:Reports,import:Import,guide:Guide,permissions:Permissions,audit:Audit};
const modFromHash=()=>{const h=(location.hash||'').replace('#','');return MODS.some(m=>m.id===h)?h:'dashboard';};
const useWidth=()=>{const [w,setW]=useState(window.innerWidth);useEffect(()=>{const f=()=>setW(window.innerWidth);window.addEventListener('resize',f);return()=>window.removeEventListener('resize',f);},[]);return w;};

const Logo=({s=34})=>html`<img src="logo-sm.png" width=${s} height=${s} alt="" className="logo-img"/>`;

const Login=({onIn})=>{
 const [em,setEm]=useState('');const [pw,setPw]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
 const go=async e=>{e.preventDefault();setBusy(true);setErr('');try{const r=await api('POST','/login',{email:em,password:pw});tokSet(r.token);onIn(r.user);}catch(x){setErr(x.message);}setBusy(false);};
 return html`<div className="login"><div className="login-brand"><img src="logo.png" alt="Patte Conservation" className="login-logo"/><h1>POps</h1><p className="lead">One platform. All conservation operations.</p><p className="muted2">Patte Conservation CBO · Pate Island, Lamu County, Kenya</p>
 <ul className="ticks light"><li>One login for rangers, officers, finance and the Board</li><li>Each person sees only what their role allows</li><li>Works offline at sea and syncs when signal returns</li></ul></div>
 <form className="login-card" onSubmit=${go}><h2>Sign in</h2><p className="muted small">Use the email and password your administrator gave you.</p>
 <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" value=${em} onChange=${e=>setEm(e.target.value)} autoComplete="username" required autoFocus/></div>
 <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" value=${pw} onChange=${e=>setPw(e.target.value)} autoComplete="current-password" required/></div>
 ${err&&html`<div className="notice crit" role="alert"><div>${err}</div></div>`}
 <button type="submit" className="btn primary full" disabled=${busy}>${busy?'Signing in…':'Sign in'}</button><p className="muted small">Forgot your password? Ask the Super Admin for a new temporary password.</p></form></div>`;
};
const ForcedPw=({onIn,forced=true,done})=>{
 const [cur,setCur]=useState('');const [pw,setPw]=useState('');const [p2,setP2]=useState('');const [err,setErr]=useState('');const [ok,setOk]=useState(false);
 const go=async e=>{e.preventDefault();setErr('');if(pw!==p2)return setErr('The two new passwords do not match');try{const r=await api('POST','/password',{current:cur,password:pw});tokSet(r.token);setOk(true);setCur('');setPw('');setP2('');onIn(r.user);}catch(x){setErr(x.message);}};
 const form=html`<form className=${forced?'login-card':'pwform'} onSubmit=${go}>${forced&&html`<img src="logo.png" alt="" className="login-logo"/>`}<h2>${forced?'Set your own password':'Change password'}</h2>${forced&&html`<p className="muted small">You signed in with a temporary password. Choose your own to continue.</p>`}
 <div className="field"><label htmlFor="cp">${forced?'Temporary password':'Current password'}</label><input id="cp" type="password" value=${cur} onChange=${e=>setCur(e.target.value)} autoComplete="current-password" required/></div>
 <div className="field"><label htmlFor="np">New password</label><input id="np" type="password" value=${pw} onChange=${e=>setPw(e.target.value)} autoComplete="new-password" required/><small className="muted">At least 8 characters with letters and numbers</small></div>
 <div className="field"><label htmlFor="np2">Repeat new password</label><input id="np2" type="password" value=${p2} onChange=${e=>setP2(e.target.value)} autoComplete="new-password" required/></div>
 ${err&&html`<div className="notice crit" role="alert"><div>${err}</div></div>`}${ok&&!forced&&html`<div className="notice good"><div>Password changed.</div></div>`}
 <button type="submit" className="btn primary full">Save password</button></form>`;
 return forced?html`<div className="login single">${form}</div>`:form;
};
const Toasts=({toasts})=>html`<div className="toasts" role="status" aria-live="polite">${toasts.map(t=>html`<div key=${t.id} className="toast"><${Icon} n="check" s=${16}/>${t.msg}</div>`)}</div>`;

const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('');
const normProj=p=>({code:String(p.name||'').split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,4),lead:'',progress:0,budget:0,spent:0,loc:'',due:'',obj:[],tasks:[],miles:[],updates:[],docs:[],...p});

/* Emergency alerts from rangers on patrol. Shown above every screen until someone acknowledges and resolves them. */
const SosBanner=()=>{
 const {sos,setSos,account,openAt,role}=useApp();
 const act=sos.filter(x=>['Active','Acknowledged'].includes(x.status));
 const beeped=useRef({});
 useEffect(()=>{act.filter(x=>x.status==='Active'&&!beeped.current[x.id]).forEach(x=>{beeped.current[x.id]=1;try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();const o=c.createOscillator();o.frequency.value=880;o.connect(c.destination);o.start();setTimeout(()=>{o.stop();c.close();},700);navigator.vibrate&&navigator.vibrate([300,150,300]);}catch(e){}});},[act.map(x=>x.id+x.status).join()]);
 useEffect(()=>{document.body.classList.toggle('has-sos',act.length>0);return()=>document.body.classList.remove('has-sos');},[act.length]);
 if(!act.length)return null;
 const upd=(id,f)=>setSos(l=>l.map(x=>x.id===id?{...x,...f}:x));
 const canAct=['admin','officer'].includes(role);
 return html`<div className="sosbar" role="alert">${act.map(x=>html`<div key=${x.id} className=${'sosrow '+x.status}><div><strong>SOS · ${x.by}</strong><span>${x.kind}${x.note?' · '+x.note:''}</span><small>${new Date(x.at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${x.lat!=null?fmtLL(x.lat,x.lon)+' · '+x.zone:'Position unknown'}${x.phone?' · '+x.phone:''}</small></div>
  <div className="sosact">${x.phone&&html`<a className="btn small" href=${'tel:'+x.phone}>Call</a>`}${x.lat!=null&&html`<button className="btn small" onClick=${()=>openAt('live-map',x.id,{sos:true})}>Show on map</button>`}${canAct&&x.status==='Active'&&html`<button className="btn small primary" onClick=${()=>upd(x.id,{status:'Acknowledged',ackBy:account.name,ackAt:new Date().toISOString()})}>I have seen it</button>`}${canAct&&html`<button className="btn small" onClick=${()=>upd(x.id,{status:'Resolved',resolvedBy:account.name,closedAt:new Date().toISOString()})}>Resolved</button>`}</div></div>`)}</div>`;
};

/* Office staff can share where they are (going for checks, visiting fishers). Only the Super Admin and the Board see it. */
const ShareLoc=()=>{
 const {account,toast}=useApp();
 const [on,setOn]=useState(()=>{try{return localStorage.getItem('pops-share')==='1';}catch(e){return false;}});
 const [doing,setDoing]=useState(()=>{try{return localStorage.getItem('pops-doing')||'In the office';}catch(e){return 'In the office';}});
 const [open,setOpen]=useState(false);
 const doRef=useRef(doing);doRef.current=doing;
 useEffect(()=>{if(!on||!navigator.geolocation)return;let lastT=0;const id=navigator.geolocation.watchPosition(p=>{const n=Date.now();if(n-lastT<45000)return;lastT=n;api('POST','/pos',{lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,doing:doRef.current}).catch(()=>{});},()=>{},{enableHighAccuracy:true,maximumAge:10000,timeout:30000});return()=>navigator.geolocation.clearWatch(id);},[on]);
 const set=v=>{setOn(v);try{localStorage.setItem('pops-share',v?'1':'0');}catch(e){}toast(v?'Sharing your location with the Super Admin':'Location sharing is off');};
 return html`<span className="shareloc"><button className=${'btn small '+(on?'primary':'')} aria-expanded=${open} onClick=${()=>setOpen(o=>!o)}><${Icon} n="map" s=${15}/>${on?'Sharing location':'Share location'}</button>${open&&html`<div className="sharebk" onClick=${()=>setOpen(false)}></div><div className="sharepop" role="dialog" aria-label="Share location"><label className="rowx"><input type="checkbox" checked=${on} onChange=${e=>set(e.target.checked)}/> Share my location while this app is open</label><label htmlFor="shd">What I am doing</label><select id="shd" value=${doing} onChange=${e=>{setDoing(e.target.value);try{localStorage.setItem('pops-doing',e.target.value);}catch(x){}}}>${['In the office','Going for checks','Visiting fishers','Looking up a case','At the LMMA','Meeting a partner','Other field work'].map(o=>html`<option key=${o}>${o}</option>`)}</select><small>Only the Super Admin and the Board can see this. Stops when you switch it off or close the app.</small><button type="button" className="btn primary" onClick=${()=>setOpen(false)}>Done</button></div>`}</span>`;
};

const App=()=>{
 const [user,setUser]=useState(undefined);       // undefined = checking session, null = signed out
 const [ready,setReady]=useState(false);const [loadErr,setLoadErr]=useState('');
 const role=user?user.role:'ranger';const bmuId=(user&&user.bmu)||'pate';
 const [h,setH]=useState(location.hash);
 const mod=(()=>{const x0=h.replace('#','');const x=x0==='finance'?'tourism':x0==='coral'?'projects':x0;return MODS.some(m=>m.id===x)?x:'dashboard';})();
 const [settings,setSettings,loadSettings]=useColl('settings',{bmuDl:true,fishDl:false,piiBmu:false},0,!!user&&user.role==='admin');
 const [assign,setAssign,loadAssign]=useColl('assign',{},0,!!user&&user.role==='admin');
 const wr=c=>!!user&&COLL_W[c]&&COLL_W[c].includes(user.role);
 const [patrols,setPatrols,loadPatrols]=useColl('patrols',[],0,wr('patrols'));
 const [incidents,setIncidents,loadInc]=useColl('incidents',[],0,wr('incidents'));
 const [fin,setFin,loadFin]=useColl('fin',[],0,wr('fin'));
 const [tour,setTour,loadTour]=useColl('tour',[],0,wr('tour'));
 const [fleet,setFleet,loadFleet]=useColl('fleet',{},0,wr('fleet'));
 const [vlog,setVlog,loadVlog]=useColl('vlog',[],0,wr('vlog'));
 const [projects,setProjects,loadProj]=useColl('projects',[],0,wr('projects'));
 const [work,setWork,loadWork]=useColl('projwork',[],0,wr('projwork'));
 const [coral,setCoral,loadCoral]=useColl('coral',[],0,wr('coral'));
 const [bmuRows,setBmuRows,loadBmus]=useColl('bmus',[],0,wr('bmus'));
 const [sos,setSos,loadSos]=useColl('sos',[],0,wr('sos'));
 const focusRef=useRef(null);const [tick2,setTick2]=useState(0);
 useEffect(()=>{applyBmuRows(bmuRows);},[bmuRows]);
 useEffect(()=>{if(settings.jcmaName)JCMA_NAME=settings.jcmaName;},[settings.jcmaName]);
 setFormInc(incidents);
 useEffect(()=>{applyEdge(settings.edge1112);setTick2(n=>n+1);},[JSON.stringify(settings.edge1112||[])]);
 const [partners,setPartners,loadPartners]=useColl('partners',[],0,wr('partners'));
 const [donors,setDonors,loadDonors]=useColl('donors',[],0,wr('donors'));
 const [audit,setAudit]=useState([]);const vl=settings.verified||[];const setVl=fn=>setSettings(s=>({...s,verified:fn(s.verified||[])}));const [people,setPeople]=useState([]);
 const [projOpen,setProjOpen]=useState(null);
 const [toasts,setToasts]=useState([]);const [nav,setNav]=useState(false);const [notif,setNotif]=useState(false);
 const [installEv,setInstallEv]=useState(!!window.__pwaPrompt);const [online,setOnline]=useState(navigator.onLine);const [pend,setPend]=useState(ob.retry().length);const [fails,setFails]=useState(ob.failed().length);
 const vw=useWidth();
 const go0=id=>{id=id==='finance'?'tourism':id==='coral'?'projects':id;try{location.hash=id;}catch(e){}setH('#'+id);setNav(false);setNotif(false);window.scrollTo(0,0);};
 const can=m=>m==='guide'?(user?'r':null):(user&&ROLES[role].mods[m])||null;
 const log=(a,m,r)=>setAudit(x=>[[stamp(),user?user.name:'',a,m,r],...x]);
 const toast=msg=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg}]);setTimeout(()=>setToasts(t=>t.filter(k=>k.id!==id)),4200);};
 const fs=useFieldStore({patrols,setPatrols,setIncidents,log,toast,account:user,settings,sos,setSos});
 const signOut=()=>{tokSet(null);setUser(null);setReady(false);};
 // session check at start
 useEffect(()=>{(async()=>{if(!tokGet())return setUser(null);try{const u=(await api('GET','/me')).user;cacheSave('me',u);setUser(u);}catch(e){if(e.status===0&&tokGet()){const u=await cacheLoad('me');setUser(u||null);}else setUser(null);}})();const so=()=>setUser(null);window.addEventListener('pops-signed-out',so);return()=>window.removeEventListener('pops-signed-out',so);},[]);
 const applyDocs=docs=>{
   if(docs.patrols)loadPatrols(fromDocs(docs.patrols).map(normPatrol));if(docs.incidents)loadInc(fromDocs(docs.incidents).map(normInc));if(docs.fin)loadFin(fromDocs(docs.fin));if(docs.tour)loadTour(fromDocs(docs.tour));
   if(docs.fleet)loadFleet(fromDocs(docs.fleet,true));if(docs.vlog)loadVlog(fromDocs(docs.vlog));if(docs.projects)loadProj(fromDocs(docs.projects));if(docs.projwork)loadWork(fromDocs(docs.projwork));if(docs.coral)loadCoral(fromDocs(docs.coral));if(docs.bmus){const br=fromDocs(docs.bmus);applyBmuRows(br);loadBmus(br);}if(docs.partners)loadPartners(fromDocs(docs.partners));if(docs.donors)loadDonors(fromDocs(docs.donors));if(docs.sos)loadSos(fromDocs(docs.sos));if(docs.assign)loadAssign(fromDocs(docs.assign,true));
   if(docs.settings)loadSettings({bmuDl:true,fishDl:false,piiBmu:false,...fromDocs(docs.settings,true)});
 };
 const [offStart,setOffStart]=useState(false);useEffect(()=>{const f=()=>setSyncOpen(true);window.addEventListener('pops-sync-review',f);return()=>window.removeEventListener('pops-sync-review',f);},[]);const [syncOpen,setSyncOpen]=useState(false);const [synced,setSynced]=useState(null);const busyRef=useRef(false);busyRef.current=!!(fs.cur&&['Active','Paused'].includes(fs.cur.status));
 // keep screens current: pick up what others saved (a patrol planned by the admin, a new user, etc.)
 useEffect(()=>{
  if(!user||user.must_change||!ready)return;
  const pull=async(light)=>{if(busyRef.current||document.hidden||!navigator.onLine)return;try{const r=await ob.flush();if(r.left)return;const {docs}=await api('GET','/docs'+(light===true?'?only=patrols,incidents,vlog,fleet,sos':''));if(busyRef.current)return;applyDocs(docs);setSynced(new Date());if(light!==true)cacheSave('docs-'+user.id,docs);if(light===true)return;try{const lk=await api('GET','/lookups');LOOK.rangers=lk.rangers;LOOK.coxswains=lk.coxswains;}catch(e){}if(['admin','board'].includes(user.role)){try{setPeople((await api('GET','/users')).users);}catch(e){}}}catch(e){}};
  const t=setInterval(pull,60000);const t2=setInterval(()=>pull(true),10000);
  /* emergency alerts are checked every 8 seconds, even while a patrol is being recorded, so a ranger sees the office has answered and the office sees a new SOS quickly */
  const t3=setInterval(async()=>{if(document.hidden||!navigator.onLine)return;try{const r=await ob.flush();if(r.left)return;const {docs}=await api('GET','/docs?only=sos');if(docs.sos)loadSos(fromDocs(docs.sos));}catch(e){}},8000);window.POPS_PULL=()=>pull();const vis=()=>{if(!document.hidden)pull();};document.addEventListener('visibilitychange',vis);window.addEventListener('online',pull);
  return()=>{clearInterval(t);clearInterval(t2);clearInterval(t3);document.removeEventListener('visibilitychange',vis);window.removeEventListener('online',pull);};
 },[user&&user.id,ready]);
 // load everything this person may see, once signed in
 useEffect(()=>{
  if(!user||user.must_change)return;
  ROLES[user.role].user=user.name;ROLES[user.role].ini=initials(user.name);
  (async()=>{try{
   await ob.flush();
   const [{docs},lk]=await Promise.all([api('GET','/docs'),api('GET','/lookups')]);
   LOOK.infringements=lk.infringements;LOOK.fees=lk.fees;LOOK.rangers=lk.rangers;LOOK.coxswains=lk.coxswains||[];LOOK.bmu=lk.bmu;LOOK.today=lk.today;try{const z=await api('GET','/zones');ZONES_API.length=0;ZONES_API.push(...z.zones);applyZones(z.zones);applyPlaces(z.landmarks);LOOK.bmu=z.bmu||lk.bmu;}catch(e){}
   applyDocs(docs);cacheSave('docs-'+user.id,docs);cacheSave('look-'+user.id,{lk,room:LOOK.bmu});
   if(['admin','board'].includes(user.role)){try{setPeople((await api('GET','/users')).users);}catch(e){}}
   if(user.role==='admin'){try{setAudit((await api('GET','/audit?limit=300')).audit.map(a=>[(a.ts||'').replace('T',' ').slice(0,16),a.user_name||'',String(a.action||'').replace(/_/g,' '),a.entity||'',a.entity_id||'']));}catch(e){}}
   setReady(true);
  }catch(e){
   /* no signal: open with the last copy kept on this phone, plus anything still waiting to be sent */
   if(e.status===0){const [cd,cl]=await Promise.all([cacheLoad('docs-'+user.id),cacheLoad('look-'+user.id)]);if(cd){if(cl&&cl.lk){const lk=cl.lk;LOOK.infringements=lk.infringements;LOOK.fees=lk.fees;LOOK.rangers=lk.rangers;LOOK.coxswains=lk.coxswains||[];LOOK.bmu=cl.room||lk.bmu;LOOK.today=lk.today;}applyDocs(overlayOutbox(cd));setOffStart(true);setReady(true);return;}}
   setLoadErr(e.status===0?'No signal, and nothing is saved on this phone yet. Open POps once with a connection first.':e.message);}})();
 },[user&&user.id,user&&user.must_change]);
 useEffect(()=>{const f=()=>setH(location.hash);window.addEventListener('hashchange',f);const p=()=>setInstallEv(!!window.__pwaPrompt);window.addEventListener('pwa-ready',p);const on=()=>{setOnline(true);ob.flush().then(r=>r.sent&&toast(r.sent+' saved record'+(r.sent>1?'s':'')+' sent to the server'));};const off=()=>setOnline(false);const po=()=>{setPend(ob.retry().length);setFails(ob.failed().length);};window.addEventListener('online',on);window.addEventListener('offline',off);window.addEventListener('pops-outbox',po);return()=>{window.removeEventListener('hashchange',f);window.removeEventListener('pwa-ready',p);window.removeEventListener('online',on);window.removeEventListener('offline',off);window.removeEventListener('pops-outbox',po);};},[]);
 useEffect(()=>{if(h==='#field'&&user&&role!=='ranger')go('dashboard');},[h,user]);
 useEffect(()=>{if(window.POPS_PWA&&'serviceWorker' in navigator&&/^https?:/.test(location.protocol)){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!window.__reloaded){window.__reloaded=true;location.reload();}});}},[]);
 // shared reference lists used by the screens
 PROJECTS.splice(0,PROJECTS.length,...projects.map(normProj));
 PEOPLE.splice(0,PEOPLE.length,...people);
 OFFICERS.splice(0,OFFICERS.length,...people.filter(p=>p.role==='officer'&&p.active).map(p=>({id:p.id,name:p.name})));
 BOATS.splice(0,BOATS.length,...Object.keys(fleet).map(n=>({name:n,...(fleet[n].meta||{})})));
 const standalone=!!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||!!navigator.standalone;
 const pwa=window.POPS_PWA?{canInstall:installEv&&!standalone,standalone,ios:/iphone|ipad|ipod/i.test(navigator.userAgent),install:async()=>{const e=window.__pwaPrompt;if(!e)return;e.prompt();try{await e.userChoice;}catch(x){}window.__pwaPrompt=null;setInstallEv(false);}}:null;
 const me=user?user.name:'';
 const go=id=>{go0(id);};
 const openAt=(m,id,extra)=>{focusRef.current={mod:m,id,...(extra||{})};go0(m);};
 const ctx={sos,setSos,openAt,focusRef,synced,role,bmuId,user:me,account:user,go,can,log,toast,settings,setSettings,assign,setAssign,patrols,setPatrols,incidents,setIncidents,fin,setFin,tour,setTour,audit,vl,setVl,projOpen,setProjOpen,projects,setProjects,work,setWork,coral,setCoral,bmuRows,setBmuRows,partners,setPartners,donors,setDonors,people,setPeople,fs,pwa,signOut,fleet,setFleet,vlog,setVlog};
 const myBoats=BOATS.filter(b=>b.cox===me).map(b=>b.name);
 const sosActive=sos.filter(x=>['Active','Acknowledged'].includes(x.status));
 const pendRev=patrols.filter(p=>p.review==='Pending review').length,pendFin=fin.filter(f=>f.status==='Submitted').length;
 const notes=[
  ...(['admin','board','officer','cox','ranger'].includes(role)?sosActive.map(x=>({id:'sos-'+x.id+x.status,tone:'crit',kind:'SOS',text:x.by+': '+x.kind+(x.lat!=null?' · '+fmtLL(x.lat,x.lon):''),act:()=>openAt('live-map',x.id,{sos:true})})):[]),
  ...(['admin','fisheries'].includes(role)?progressAlerts(patrols,settings).map(a=>({id:a.id,tone:a.level==='crit'?'crit':a.level==='info'?'info':'warn',kind:a.kind,text:a.text,act:()=>openAt('patrols',a.patrol.id)})):[]),
  ...(role==='admin'||role==='cox'?svcAlerts(fleet,role==='cox'?myBoats:null).map(a=>({id:'svc-'+a.key,tone:a.s==='over'?'crit':'warn',kind:'Service',text:a.text,act:()=>go('boats')})):[]),
  ...(role==='admin'&&pendRev?[{id:'rev-'+pendRev,tone:'warn',kind:'Review',text:pendRev+' patrol review'+(pendRev>1?'s':'')+' waiting',act:()=>openAt('patrols',null,{status:'Completed'})}]:[]),
  ...(['admin','board'].includes(role)&&pendFin?[{id:'fin-'+pendFin,tone:'info',kind:'Approval',text:pendFin+' finance entr'+(pendFin>1?'ies':'y')+' awaiting approval by the Board Chairperson',act:()=>go('finance')}]:[])];
 const [seen,setSeen]=useState(()=>{try{return JSON.parse(localStorage.getItem('pops-seen')||'[]');}catch(e){return [];}});
 const markSeen=ids=>{setSeen(o=>{const n=[...new Set([...o,...ids])].slice(-200);try{localStorage.setItem('pops-seen',JSON.stringify(n));}catch(e){}return n;});};
 const unseen=notes.filter(n=>!seen.includes(n.id)||n.tone==='crit').length;
 useEffect(()=>{if(!notif)return;const k=e=>{if(e.key==='Escape')setNotif(false);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[notif]);
 const dark=()=>{const a=document.documentElement.getAttribute('data-theme');return a==='dark'||(a!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);};
 const [,force]=useState(0);
 const theme=()=>{document.documentElement.setAttribute('data-theme',dark()?'light':'dark');force(n=>n+1);};
 if(user===undefined)return html`<div className="boot"><${Logo} s=${72}/><p className="boot-name">POps</p><p className="muted">Loading…</p><span className="boot-spin" aria-hidden="true"></span></div>`;
 if(!user)return html`<${Login} onIn=${u=>{setUser(u);}}/>`;
 if(user.must_change)return html`<${ForcedPw} onIn=${u=>setUser(u)}/>`;
 if(loadErr)return html`<div className="boot"><${Logo} s=${72}/><p>Could not load your records: ${loadErr}</p><button className="btn primary" onClick=${()=>location.reload()}>Try again</button></div>`;
 if(!ready)return html`<div className="boot"><${Logo} s=${72}/><p className="boot-name">POps</p><p className="muted">Loading your records…</p><span className="boot-spin" aria-hidden="true"></span></div>`;
 if(role==='ranger')return html`<${Ctx.Provider} value=${ctx}><${FieldShell}/><${Modal} open=${syncOpen} onClose=${()=>setSyncOpen(false)} title="Records the server did not accept"><p className="muted small">These were saved on this phone but the server refused them, so they were not lost. Press Try again after fixing the cause (for example sign in again or reduce photos). Discard removes the saved copy.</p><ul className="synclist">${ob.failed().map(op=>html`<li key=${op.coll+op.id+op.at}><b>${op.coll} · ${op.id}</b><small>${op.error}</small><button type="button" className="btn small" onClick=${()=>ob.discard(op)}>Discard</button></li>`)}${!ob.failed().length&&html`<li className="muted">Nothing needs attention.</li>`}</ul><div className="btnrow"><button type="button" className="btn primary" onClick=${()=>{ob.clearErrors();ob.flush().then(r=>toast(r.failed?r.failed+' still refused':'Sent'));}}>Try again</button></div></${Modal}><${Toasts} toasts=${toasts}/></${Ctx.Provider}>`;
 const View=VIEWS[mod];const m=MODS.find(x=>x.id===mod);
 const groups=[];MODS.forEach(x=>{if(!can(x.id))return;let g=groups.find(k=>k[0]===x.group);if(!g){g=[x.group,[]];groups.push(g);}g[1].push(x);});
 return html`<${Ctx.Provider} value=${ctx}><div className="app">
 ${nav&&html`<div className="scrim" onClick=${()=>setNav(false)}/>`}
 <aside className=${'side '+(nav?'open':'')} aria-label="Main navigation">
  <div className="brand"><${Logo}/><div><strong>POps</strong><small>Patte Operations Platform</small></div></div>
  <nav>${groups.map(g=>html`<div key=${g[0]} className="ngroup"><h3>${g[0]}</h3>${g[1].map(x=>html`<button key=${x.id} title=${x.label} className=${'nitem '+(mod===x.id?'on ':'')} onClick=${()=>{if(x.id==='projects')setProjOpen(null);go(x.id);}} aria-current=${mod===x.id?'page':null}><${Icon} n=${x.icon} s=${18}/><span>${x.label}</span></button>`)}</div>`)}</nav>
  <div className="sidefoot"><div className="me"><span className="av">${ROLES[role].ini}</span><div><strong>${me}</strong><small>${ROLES[role].label}</small></div></div><button className="nitem" title="Sign out" onClick=${signOut}><${Icon} n="out" s=${18}/><span>Sign out</span></button></div>
 </aside>
 <div className="main">
  <header className="top"><button className="iconbtn menu" aria-label="Open menu" onClick=${()=>setNav(true)}><${Icon} n="menu"/></button>
   <div className="topr">${['admin','officer','fisheries','board'].includes(role)&&html`<${ShareLoc}/>`}${!online&&html`<span className="chip warn"><i/>Offline</span>`}${pend>0&&html`<button type="button" className="chip warn chipb" onClick=${()=>{ob.flush().then(r=>toast(r.left?r.left+' still waiting. They send when there is signal.':'All saved records sent.'));}}><i/>${pend} waiting to send</button>`}${fails>0&&html`<button type="button" className="chip bad chipb" onClick=${()=>setSyncOpen(true)}><i/>${fails} not accepted. Review</button>`}${pwa&&pwa.canInstall&&html`<button className="btn small primary" onClick=${pwa.install}><${Icon} n="download" s=${15}/>Install app</button>`}
   <button className="iconbtn bellbtn" aria-label=${'Notifications'+(unseen?', '+unseen+' need attention':'')} aria-expanded=${notif} onClick=${()=>setNotif(o=>!o)}><${Icon} n="bell"/>${unseen>0&&html`<b className="dotn">${unseen}</b>`}</button>
   <button className="iconbtn" aria-label="Switch light or dark theme" onClick=${theme}><${Icon} n=${dark()?'sun':'moon'}/></button></div></header>
  ${notif&&html`<div className="notifscrim" onClick=${()=>setNotif(false)}/><section className="notifpanel" role="dialog" aria-label="Notifications"><header><h4>Notifications</h4><span><button className="link" onClick=${()=>markSeen(notes.map(n=>n.id))}>Mark all read</button><button className="iconbtn" aria-label="Close notifications" onClick=${()=>setNotif(false)}>×</button></span></header>
   <ul>${notes.length?notes.map(n=>html`<li key=${n.id} className=${(seen.includes(n.id)&&n.tone!=='crit'?'read ':'')+n.tone}><button onClick=${()=>{markSeen([n.id]);setNotif(false);n.act();}}><${Chip} t=${n.kind} tone=${n.tone}/><span>${n.text}</span><${Icon} n="chev" s=${14}/></button></li>`):html`<li className="none">Nothing needs your attention.</li>`}</ul><small>Tap an item to open it. Alerts follow your permissions.</small></section>`}
  ${['admin','board','officer','cox'].includes(role)&&html`<${SosBanner}/>`}
  <main id="content">${can(mod)?html`<${View} key=${role+bmuId+mod}/>`:html`<div key=${role+mod}><${PageHead} title=${m.label} sub=${m.fn}/><${Denied} mod=${m.label} role=${role}/></div>`}</main>
  <footer className="foot"><${Logo} s=${28}/><div><b>Patte Conservation CBO</b><small>Iweni Locally Managed Marine Area · Pate Island, Lamu, Kenya</small><small>POps · Patte Operations Platform · version ${'__BUILD__'}</small></div></footer>
 </div>
 <${Modal} open=${syncOpen} onClose=${()=>setSyncOpen(false)} title="Records the server did not accept"><p className="muted small">These were saved on this phone but the server refused them, so they were not lost. Press Try again after fixing the cause (for example sign in again or reduce photos). Discard removes the saved copy.</p><ul className="synclist">${ob.failed().map(op=>html`<li key=${op.coll+op.id+op.at}><b>${op.coll} · ${op.id}</b><small>${op.error}</small><button type="button" className="btn small" onClick=${()=>ob.discard(op)}>Discard</button></li>`)}${!ob.failed().length&&html`<li className="muted">Nothing needs attention.</li>`}</ul><div className="btnrow"><button type="button" className="btn primary" onClick=${()=>{ob.clearErrors();ob.flush().then(r=>toast(r.failed?r.failed+' still refused':'Sent'));}}>Try again</button></div></${Modal}>
 <${Toasts} toasts=${toasts}/>
 </div></${Ctx.Provider}>`;
};
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
