/* ============ app shell ============ */
const VIEWS={dashboard:Dashboard,'live-map':LiveMap,patrols:Patrols,incidents:Incidents,'iweni-lmma':Lmma,projects:Projects,coral:Coral,staff:Staff,bmus:Bmus,partners:Partners,boats:Boats,tourism:Tourism,finance:Finance,reports:Reports,import:Import,permissions:Permissions,audit:Audit};
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

const App=()=>{
 const [user,setUser]=useState(undefined);       // undefined = checking session, null = signed out
 const [ready,setReady]=useState(false);const [loadErr,setLoadErr]=useState('');
 const role=user?user.role:'ranger';const bmuId=(user&&user.bmu)||'pate';
 const [h,setH]=useState(location.hash);
 const mod=(()=>{const x=h.replace('#','');return MODS.some(m=>m.id===x)?x:'dashboard';})();
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
 const [partners,setPartners,loadPartners]=useColl('partners',[],0,wr('partners'));
 const [donors,setDonors,loadDonors]=useColl('donors',[],0,wr('donors'));
 const [audit,setAudit]=useState([]);const vl=settings.verified||[];const setVl=fn=>setSettings(s=>({...s,verified:fn(s.verified||[])}));const [people,setPeople]=useState([]);
 const [projOpen,setProjOpen]=useState(null);
 const [toasts,setToasts]=useState([]);const [nav,setNav]=useState(false);const [notif,setNotif]=useState(false);
 const [installEv,setInstallEv]=useState(!!window.__pwaPrompt);const [online,setOnline]=useState(navigator.onLine);const [pend,setPend]=useState(ob.list().length);
 const vw=useWidth();
 const go=id=>{try{location.hash=id;}catch(e){}setH('#'+id);setNav(false);setNotif(false);window.scrollTo(0,0);};
 const can=m=>(user&&ROLES[role].mods[m])||null;
 const log=(a,m,r)=>setAudit(x=>[[stamp(),user?user.name:'',a,m,r],...x]);
 const toast=msg=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg}]);setTimeout(()=>setToasts(t=>t.filter(k=>k.id!==id)),4200);};
 const fs=useFieldStore({patrols,setPatrols,setIncidents,log,toast,account:user,settings});
 const signOut=()=>{tokSet(null);try{localStorage.removeItem('pops-outbox');}catch(e){}setUser(null);setReady(false);};
 // session check at start
 useEffect(()=>{(async()=>{if(!tokGet())return setUser(null);try{setUser((await api('GET','/me')).user);}catch(e){setUser(e.status===0&&tokGet()?undefined:null);}})();const so=()=>setUser(null);window.addEventListener('pops-signed-out',so);return()=>window.removeEventListener('pops-signed-out',so);},[]);
 const applyDocs=docs=>{
   if(docs.patrols)loadPatrols(fromDocs(docs.patrols).map(normPatrol));if(docs.incidents)loadInc(fromDocs(docs.incidents).map(normInc));if(docs.fin)loadFin(fromDocs(docs.fin));if(docs.tour)loadTour(fromDocs(docs.tour));
   if(docs.fleet)loadFleet(fromDocs(docs.fleet,true));if(docs.vlog)loadVlog(fromDocs(docs.vlog));if(docs.projects)loadProj(fromDocs(docs.projects));if(docs.projwork)loadWork(fromDocs(docs.projwork));if(docs.coral)loadCoral(fromDocs(docs.coral));if(docs.bmus)loadBmus(fromDocs(docs.bmus));if(docs.partners)loadPartners(fromDocs(docs.partners));if(docs.donors)loadDonors(fromDocs(docs.donors));if(docs.assign)loadAssign(fromDocs(docs.assign,true));
   if(docs.settings)loadSettings({bmuDl:true,fishDl:false,piiBmu:false,...fromDocs(docs.settings,true)});
 };
 const [synced,setSynced]=useState(null);const busyRef=useRef(false);busyRef.current=!!(fs.cur&&['Active','Paused'].includes(fs.cur.status));
 // keep screens current: pick up what others saved (a patrol planned by the admin, a new user, etc.)
 useEffect(()=>{
  if(!user||user.must_change||!ready)return;
  const pull=async(light)=>{if(busyRef.current||document.hidden||!navigator.onLine)return;try{const r=await ob.flush();if(r.left)return;const {docs}=await api('GET','/docs'+(light===true?'?only=patrols,incidents,vlog,fleet':''));if(busyRef.current)return;applyDocs(docs);setSynced(new Date());if(light===true)return;try{const lk=await api('GET','/lookups');LOOK.rangers=lk.rangers;LOOK.coxswains=lk.coxswains;}catch(e){}if(['admin','board'].includes(user.role)){try{setPeople((await api('GET','/users')).users);}catch(e){}}}catch(e){}};
  const t=setInterval(pull,60000);const t2=setInterval(()=>pull(true),10000);window.POPS_PULL=()=>pull();const vis=()=>{if(!document.hidden)pull();};document.addEventListener('visibilitychange',vis);window.addEventListener('online',pull);
  return()=>{clearInterval(t);clearInterval(t2);document.removeEventListener('visibilitychange',vis);window.removeEventListener('online',pull);};
 },[user&&user.id,ready]);
 // load everything this person may see, once signed in
 useEffect(()=>{
  if(!user||user.must_change)return;
  ROLES[user.role].user=user.name;ROLES[user.role].ini=initials(user.name);
  (async()=>{try{
   await ob.flush();
   const [{docs},lk]=await Promise.all([api('GET','/docs'),api('GET','/lookups')]);
   LOOK.infringements=lk.infringements;LOOK.fees=lk.fees;LOOK.rangers=lk.rangers;LOOK.coxswains=lk.coxswains||[];LOOK.bmu=lk.bmu;LOOK.today=lk.today;try{const z=await api('GET','/zones');ZONES_API.length=0;ZONES_API.push(...z.zones);applyZones(z.zones);applyPlaces(z.landmarks);LOOK.bmu=z.bmu||lk.bmu;}catch(e){}
   applyDocs(docs);
   if(['admin','board'].includes(user.role)){try{setPeople((await api('GET','/users')).users);}catch(e){}}
   if(user.role==='admin'){try{setAudit((await api('GET','/audit?limit=300')).audit.map(a=>[(a.ts||'').replace('T',' ').slice(0,16),a.user_name||'',String(a.action||'').replace(/_/g,' '),a.entity||'',a.entity_id||'']));}catch(e){}}
   setReady(true);
  }catch(e){setLoadErr(e.message);}})();
 },[user&&user.id,user&&user.must_change]);
 useEffect(()=>{const f=()=>setH(location.hash);window.addEventListener('hashchange',f);const p=()=>setInstallEv(!!window.__pwaPrompt);window.addEventListener('pwa-ready',p);const on=()=>{setOnline(true);ob.flush().then(r=>r.sent&&toast(r.sent+' saved record'+(r.sent>1?'s':'')+' sent to the server'));};const off=()=>setOnline(false);const po=()=>setPend(ob.list().length);window.addEventListener('online',on);window.addEventListener('offline',off);window.addEventListener('pops-outbox',po);return()=>{window.removeEventListener('hashchange',f);window.removeEventListener('pwa-ready',p);window.removeEventListener('online',on);window.removeEventListener('offline',off);window.removeEventListener('pops-outbox',po);};},[]);
 useEffect(()=>{if(h==='#field'&&user&&role!=='ranger')go('dashboard');},[h,user]);
 useEffect(()=>{if(window.POPS_PWA&&'serviceWorker' in navigator&&/^https?:/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(()=>{});}},[]);
 // shared reference lists used by the screens
 PROJECTS.splice(0,PROJECTS.length,...projects.map(normProj));
 PEOPLE.splice(0,PEOPLE.length,...people);
 OFFICERS.splice(0,OFFICERS.length,...people.filter(p=>p.role==='officer'&&p.active).map(p=>({id:p.id,name:p.name})));
 BOATS.splice(0,BOATS.length,...Object.keys(fleet).map(n=>({name:n,...(fleet[n].meta||{})})));
 const standalone=!!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||!!navigator.standalone;
 const pwa=window.POPS_PWA?{canInstall:installEv&&!standalone,standalone,ios:/iphone|ipad|ipod/i.test(navigator.userAgent),install:async()=>{const e=window.__pwaPrompt;if(!e)return;e.prompt();try{await e.userChoice;}catch(x){}window.__pwaPrompt=null;setInstallEv(false);}}:null;
 const me=user?user.name:'';
 const ctx={synced,role,bmuId,user:me,account:user,go,can,log,toast,settings,setSettings,assign,setAssign,patrols,setPatrols,incidents,setIncidents,fin,setFin,tour,setTour,audit,vl,setVl,projOpen,setProjOpen,projects,setProjects,work,setWork,coral,setCoral,bmuRows,setBmuRows,partners,setPartners,donors,setDonors,people,setPeople,fs,pwa,signOut,fleet,setFleet,vlog,setVlog};
 const myBoats=BOATS.filter(b=>b.cox===me).map(b=>b.name);
 const notes=[...(['admin','fisheries'].includes(role)?progressAlerts(patrols,settings).map(a=>a.kind+': '+a.text):[]),...(role==='admin'||role==='cox'?svcAlerts(fleet,role==='cox'?myBoats:null).map(a=>'Service alert: '+a.text):[]),...(role==='admin'?patrols.filter(p=>p.review==='Pending review').length?[patrols.filter(p=>p.review==='Pending review').length+' patrol review(s) waiting']:[]:[]),...(['admin','board'].includes(role)&&fin.filter(f=>f.status==='Submitted').length?[fin.filter(f=>f.status==='Submitted').length+' finance entr'+(fin.filter(f=>f.status==='Submitted').length>1?'ies':'y')+' awaiting approval']:[])];
 const dark=()=>{const a=document.documentElement.getAttribute('data-theme');return a==='dark'||(a!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);};
 const [,force]=useState(0);
 const theme=()=>{document.documentElement.setAttribute('data-theme',dark()?'light':'dark');force(n=>n+1);};
 if(user===undefined)return html`<div className="boot"><${Logo} s=${72}/><p className="boot-name">POps</p><p className="muted">Loading…</p><span className="boot-spin" aria-hidden="true"></span></div>`;
 if(!user)return html`<${Login} onIn=${u=>{setUser(u);}}/>`;
 if(user.must_change)return html`<${ForcedPw} onIn=${u=>setUser(u)}/>`;
 if(loadErr)return html`<div className="boot"><${Logo} s=${72}/><p>Could not load your records: ${loadErr}</p><button className="btn primary" onClick=${()=>location.reload()}>Try again</button></div>`;
 if(!ready)return html`<div className="boot"><${Logo} s=${72}/><p className="boot-name">POps</p><p className="muted">Loading your records…</p><span className="boot-spin" aria-hidden="true"></span></div>`;
 if(role==='ranger')return html`<${Ctx.Provider} value=${ctx}><${FieldShell}/><${Toasts} toasts=${toasts}/></${Ctx.Provider}>`;
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
   <div className="topr">${!online&&html`<span className="chip warn"><i/>Offline</span>`}${pend>0&&html`<span className="chip warn"><i/>${pend} waiting to send</span>`}${pwa&&pwa.canInstall&&html`<button className="btn small primary" onClick=${pwa.install}><${Icon} n="download" s=${15}/>Install app</button>`}
   <div className="notifwrap"><button className="iconbtn" aria-label="Notifications" aria-expanded=${notif} onClick=${()=>setNotif(o=>!o)}><${Icon} n="bell"/>${notes.length>0&&html`<b className="dotn">${notes.length}</b>`}</button>${notif&&html`<div className="pop" role="menu"><h4>Notifications</h4><ul>${notes.length?notes.map(n=>html`<li key=${n}>${n}</li>`):html`<li>Nothing needs your attention.</li>`}</ul><small>Alerts follow your permissions.</small></div>`}</div>
   <button className="iconbtn" aria-label="Switch light or dark theme" onClick=${theme}><${Icon} n=${dark()?'sun':'moon'}/></button></div></header>
  <main id="content">${can(mod)?html`<${View} key=${role+bmuId+mod}/>`:html`<div key=${role+mod}><${PageHead} title=${m.label} sub=${m.fn}/><${Denied} mod=${m.label} role=${role}/></div>`}</main>
  <footer className="foot"><${Logo} s=${32}/><span><b>Patte Conservation</b> · Iweni Locally Managed Marine Area, Pate Island, Lamu, Kenya · POps, Patte Operations Platform</span></footer>
 </div>
 <${Toasts} toasts=${toasts}/>
 </div></${Ctx.Provider}>`;
};
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
