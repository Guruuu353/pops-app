/* ============ views part 2: conservation, organisation, income, admin. All data comes from the server. ============ */
const newId=p=>p+'-'+new Date().getFullYear()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
const isoToday=()=>LOOK.today||new Date().toISOString().slice(0,10);
const MONI={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const patrolIso=p=>{if(p.iso)return p.iso;const m=/^(\d{1,2}) (\w{3}) (\d{4})$/.exec(p.date||'');return m&&MONI[m[2]]!==undefined?m[3]+'-'+pad(MONI[m[2]]+1)+'-'+pad(+m[1]):'';};
const inRing=(lat,lon,ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[0]>lat)!==(b[0]>lat)&&lon<(b[1]-a[1])*(lat-a[0])/(b[0]-a[0])+a[1])c=!c;}return c;};
/* a day counts as a visit when a submitted patrol went inside the LMMA (stated by the ranger, or its GPS track crosses the LMMA outline) */
const patrolInLmma=p=>{if(p.inLmma===true||/iweni|lmma/i.test(p.area||''))return true;const z=ZONE_SHAPES.filter(s=>s.kind==='lmma');return !!(p.track&&z.length&&p.track.some(t=>z.some(s=>inRing(t[0],t[1],s.ll))));};
const DONE_P=['Completed','Active','Paused','Submitted','Pending Sync'];
const complianceOf=(patrols,settings,span=30)=>{
 const today=isoToday();const start=settings.lmmaStart||'';const cut=+(settings.lmmaCutoff||20);const req=settings.lmmaDaily!==false;
 const first=patrols.map(patrolIso).filter(Boolean).sort()[0]||today;const from0=start||first;
 const end=Date.parse(today+'T00:00:00Z');const days=[];
 for(let i=span-1;i>=0;i--){const d=new Date(end-i*864e5).toISOString().slice(0,10);days.push({date:d,n:0,rangers:[],visited:false});}
 const byDay={};days.forEach(d=>byDay[d.date]=d);
 patrols.forEach(p=>{const d=byDay[patrolIso(p)];if(!d||!DONE_P.includes(p.status))return;d.n++;(p.rangers||[]).forEach(r=>{if(!d.rangers.includes(r))d.rangers.push(r);});if(patrolInLmma(p))d.visited=true;});
 const nowH=new Date().getHours();
 days.forEach(d=>{d.status=!req?'not required':d.visited?'visited':d.date<from0?'not tracked':(d.date<today||nowH>=cut)?'missed':'pending';});
 const due=days.filter(d=>d.status==='visited'||d.status==='missed').length,done=days.filter(d=>d.status==='visited').length;
 let streak=0;for(let i=days.length-1;i>=0;i--){if(days[i].status==='visited')streak++;else if(days[i].status==='pending')continue;else break;}
 return {days,due,done,rate:due?Math.round(done/due*100):null,streak,missed:days.filter(d=>d.status==='missed').map(d=>d.date),today:days[days.length-1],from0};
};
const CSTAT={visited:'good',missed:'crit',pending:'warn','not tracked':'neutral','not required':'neutral'};
const ComplianceCard=({compact})=>{
 const {patrols,settings,go,role}=useApp();const [span,setSpan]=useState(30);const c=complianceOf(patrols,settings,span);const t=c.today;
 return html`<${Card} title="Daily LMMA visit" sub="Rangers must be inside the Iweni LMMA every day" right=${html`<${Chip} t=${t.status==='visited'?'Visited today':t.status==='pending'?'Visit due today':t.status==='missed'?'Missed today':'Not required'} tone=${CSTAT[t.status]}/>`}>
  <div className="kpis small"><${Kpi} label=${"Visited, last "+span+" days"} value=${c.done+' of '+c.due} note=${c.rate===null?'no days counted yet':c.rate+'% of counted days'} tone=${c.rate===null?'':c.rate>=90?'good':c.rate>=70?'warn':'crit'}/><${Kpi} label="Current streak" value=${c.streak+' day'+(c.streak===1?'':'s')}/><${Kpi} label="Missed days" value=${String(c.missed.length)} tone=${c.missed.length?'crit':'good'}/></div>
  <div className=${"cgrid"+(span>60?" long":"")} role="img" aria-label=${"Last "+span+" days of LMMA visits"}>${c.days.map(d=>html`<span key=${d.date} className=${'cd '+CSTAT[d.status]} title=${d.date+': '+d.status+(d.rangers.length?' ('+d.rangers.join(', ')+')':'')}>${span>60?'':+d.date.slice(8)}</span>`)}</div>
  ${!compact&&html`<div className="seg" style=${{marginBottom:8}}>${[30,90,365,730].map(n=>html`<button key=${n} type="button" className=${'segb '+(span===n?'on':'')} onClick=${()=>setSpan(n)}>${n===30?'30 days':n===90?'3 months':n===365?'1 year':'2 years'}</button>`)}</div>`}
  <p className="muted small">Green: visited. Red: missed. Amber: still possible today. Grey: before tracking began or not required.</p>
  ${!compact&&c.missed.length>0&&html`<p className="small"><b>Missed:</b> ${c.missed.slice(-10).join(', ')}</p>`}
  ${compact&&html`<${Btn} kind="ghost small" onClick=${()=>go('iweni-lmma')}>Open LMMA compliance</${Btn}>`}</${Card}>`;
};

/* ---------- zone files: GeoJSON, KML or a list of longitude,latitude points ---------- */
const ringsFromText=(txt,name)=>{
 const out=[];const t=txt.trim();
 if(t[0]==='{'){const j=JSON.parse(t);const fs=j.type==='FeatureCollection'?j.features:j.type==='Feature'?[j]:[{type:'Feature',properties:{},geometry:j}];
  fs.forEach((f,i)=>{if(f.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type))out.push({name:(f.properties&&(f.properties.name||f.properties.Name))||name+(fs.length>1?' '+(i+1):''),feature:{type:'Feature',properties:f.properties||{},geometry:f.geometry}});});return out;}
 if(t[0]==='<'){const d=new DOMParser().parseFromString(t,'text/xml');[...d.getElementsByTagName('Placemark')].forEach((pm,i)=>{const nm=(pm.getElementsByTagName('name')[0]||{}).textContent||name+' '+(i+1);[...pm.getElementsByTagName('Polygon')].forEach(pg=>{const co=pg.getElementsByTagName('coordinates')[0];if(!co)return;const ring=co.textContent.trim().split(/\s+/).map(s=>s.split(',').map(Number)).filter(c=>c.length>=2&&isFinite(c[0])&&isFinite(c[1])).map(c=>[c[0],c[1]]);if(ring.length>=3)out.push({name:nm.trim(),feature:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}});});});return out;}
 const ring=t.split(/\r?\n/).map(l=>l.split(/[,;\t]/).map(x=>parseFloat(x))).filter(c=>c.length>=2&&isFinite(c[0])&&isFinite(c[1])).map(c=>[c[0],c[1]]);
 if(ring.length>=3)out.push({name,feature:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}}});return out;
};
const downloadText=(name,text,type)=>{try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}catch(e){}};
const ZKIND={lmma:'LMMA boundary',gear:'Gear restricted zone',ntz:'No take zone',other:'Other'};

/* ---------- Iweni LMMA ---------- */
const Lmma=()=>{
 const {can,vl,setVl,log,toast,go,patrols,incidents,settings,setSettings,role}=useApp();
 const [tab,setTab]=useState('map');const [sel,setSel]=useState(null);const [,tick]=useState(0);
 const [imp,setImp]=useState({kind:'ntz',name:'',stated:'',err:''});
 const write=can('iweni-lmma')==='w';const admin=role==='admin';
 const verify=n=>{setVl(v=>v.includes(n)?v.filter(x=>x!==n):[...v,n]);log((vl.includes(n)?'Removed verification of':'Verified')+' boundary point','Iweni LMMA Management','Point '+n);toast('Point '+n+(vl.includes(n)?' set back to awaiting verification':' marked as verified'));};
 const pt=sel&&sel.pt;
 const refresh=async()=>{const z=await api('GET','/zones');ZONES_API.length=0;ZONES_API.push(...z.zones);applyZones(z.zones);tick(n=>n+1);};
 const onFile=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;setImp(o=>({...o,err:''}));
  try{const rings=ringsFromText(await f.text(),imp.name||f.name.replace(/\.\w+$/,''));if(!rings.length)throw new Error('No polygon found in that file. Use GeoJSON, KML, or a list of longitude,latitude points.');
   for(const r of rings){const id=newId('zone').toLowerCase();await api('PUT','/zones/'+id,{name:r.name,kind:imp.kind,stated_km2:imp.stated?+imp.stated:null,feature:r.feature});}
   log('Imported zone file','Iweni LMMA Management',f.name+' ('+rings.length+')');toast(rings.length+' zone'+(rings.length>1?'s':'')+' imported');await refresh();}
  catch(x){setImp(o=>({...o,err:x.message||'Could not import that file'}));}};
 const del=async z=>{try{await api('DELETE','/zones/'+z.id);log('Deleted zone','Iweni LMMA Management',z.name);toast('Zone removed');await refresh();}catch(x){toast(x.message);}};
 const exp=()=>{downloadText('iweni-zones.geojson',JSON.stringify({type:'FeatureCollection',features:ZONES_API.map(z=>({...z.feature,properties:{...(z.feature.properties||{}),name:z.name,kind:z.kind,stated_km2:z.stated_km2}}))},null,1));};
 const setF=(k,v)=>setSettings(s=>({...s,[k]:v}));
 const insideCount=patrols.filter(p=>DONE_P.includes(p.status)&&patrolInLmma(p)).length;
 const bmu=LOOK.bmu;
 return html`<div><${PageHead} title="Iweni LMMA Management" sub=${bmu?'Co-management area: '+bmu.co_management_area:'Boundary mapping, conservation zones and community activities'}/>
 <${Notice} tone="warn" title="Boundary not yet cleared for operational use">${vl.length} of ${LMMA_PTS.length} supplied points are verified. Zones are drawn by joining the supplied points in table order. Mark each point verified after a field check, or import a surveyed shape on the Zones tab.</${Notice}>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['map','Boundary map'],['zones','Zones'],['coords','Coordinates'],['comp','Daily visits'],['activity','Activities']]}/>
 ${tab==='map'&&html`<div className="mapgrid"><div className="mapcol"><div className="mapbox"><${OpsMap} layers=${['zones','patrols']} items=${[]} tracks=${[]} points=${LMMA_PTS} showPts=${true} sel=${sel&&sel.id} onSel=${setSel} zoom=${1}/></div>
  <ul className="mlegend"><li><span className="dotv"/>Verified reference point</li><li><span className="dotd"/>Supplied point, awaiting verification</li><li><span className="sw gear"/>Gear Restricted Zone</li><li><span className="sw ntz"/>No Take Zone</li></ul></div>
  <aside className="mapside"><${Card} title=${pt?'Boundary point '+pt.n:'Boundary points'}>${pt?html`<${KV} rows=${[['Latitude',html`<span className="mono">${pt.lat}</span>`],['Longitude',html`<span className="mono">${pt.lon}</span>`],['Decimal degrees',html`<span className="mono">${pt.la.toFixed(6)}, ${pt.lo.toFixed(6)}</span>`],['Status',html`<${Chip} t=${vl.includes(pt.n)?'Verified':'Awaiting verification'}/>`]]}/>${write&&html`<${Btn} kind=${vl.includes(pt.n)?'':'primary'} onClick=${()=>verify(pt.n)}>${vl.includes(pt.n)?'Remove verification':'Mark as verified'}</${Btn}>`}`:html`<p className="muted">Select a numbered point to see its coordinates and verification status.</p>`}</${Card}>
  ${bmu&&html`<${Card} title="BMU certificate"><${KV} rows=${[['BMU',bmu.name],['Certificate point',html`<span className="mono">${bmu.certificate_point.lat}, ${bmu.certificate_point.lon}</span>`],['Co-management area',bmu.co_management_area]]}/></${Card}>`}</aside></div>`}
 ${tab==='zones'&&html`<div><${Card} title="Zones on the map" sub="Mapped area is measured from the shape. Stated area is what the management plan says."><${Table} empty="No zones yet." cols=${[{h:'Zone',k:'name'},{h:'Type',k:'kind',r:r=>ZKIND[r.kind]||r.kind},{h:'Stated km²',k:'stated_km2',cls:'num',r:r=>r.stated_km2==null?'—':r.stated_km2},{h:'Mapped km²',k:'area_km2',cls:'num'},{h:'Check',k:'c',r:r=>r.stated_km2==null?html`<${Chip} t="No stated area" tone="neutral"/>`:Math.abs(r.area_km2-r.stated_km2)/r.stated_km2<=.15?html`<${Chip} t="Matches" tone="good"/>`:html`<${Chip} t="Differs from stated" tone="warn"/>`},{h:'',k:'a',r:r=>admin?html`<button className="link" onClick=${()=>del(r)}>Remove</button>`:''}]} rows=${ZONES_API}/>
  <div className="btnrow"><${Btn} icon="download" onClick=${exp}>Export zones (GeoJSON)</${Btn}></div></${Card}>
  ${admin&&html`<${Card} title="Import zone shapes" sub="Upload the surveyed shape from GPS or GIS. GeoJSON, KML, or a text list of longitude,latitude points."><div className="form"><${Field} label="Zone type" id="zk"><${Sel} id="zk" value=${imp.kind} onChange=${v=>setImp(o=>({...o,kind:v}))} opts=${Object.entries(ZKIND)}/></${Field}><${Field} label="Name (optional)" id="zn"><${Inp} id="zn" value=${imp.name} onChange=${v=>setImp(o=>({...o,name:v}))}/></${Field}><${Field} label="Stated area km² (optional)" id="za"><${Inp} id="za" type="number" value=${imp.stated} onChange=${v=>setImp(o=>({...o,stated:v}))}/></${Field}>
  <${Field} label="File" id="zf"><input id="zf" type="file" accept=".geojson,.json,.kml,.csv,.txt" onChange=${onFile}/></${Field}></div>${imp.err&&html`<${Notice} tone="crit" title="Could not import">${imp.err}</${Notice}>`}<p className="muted small">Importing a shape adds a zone. Remove the old placeholder afterwards. Every import is recorded in the audit trail.</p></${Card}>`}</div>`}
 ${tab==='coords'&&html`<${Card} title="Boundary points" sub="As supplied by Patte Conservation. Latitude south, longitude east."><${Table} cols=${[{h:'No.',k:'n',cls:'num'},{h:'Latitude',k:'lat',cls:'mono'},{h:'Longitude',k:'lon',cls:'mono'},{h:'Decimal degrees',k:'d',cls:'mono',r:r=>r.la.toFixed(5)+', '+r.lo.toFixed(5)},{h:'Status',k:'s',r:r=>html`<${Chip} t=${vl.includes(r.n)?'Verified':'Awaiting verification'}/>`},{h:'',k:'a',r:r=>write?html`<button className="link" onClick=${()=>verify(r.n)}>${vl.includes(r.n)?'Unverify':'Verify'}</button>`:''}]} rows=${LMMA_PTS.map(p=>({...p,id:'p'+p.n}))}/></${Card}>`}
 ${tab==='comp'&&html`<div><${ComplianceCard}/>
  ${admin&&html`<${Card} title="Compliance settings"><div className="form"><${Field} label="Daily visit is required" id="cr" wide=${true}><${Toggle} id="cr" on=${settings.lmmaDaily!==false} onChange=${v=>{setF('lmmaDaily',v);log('Changed daily LMMA visit rule','Iweni LMMA Management',v?'required':'not required');}} label="Daily visit required"/></${Field}>
  <${Field} label="Counting starts on" id="cs"><${Inp} id="cs" type="date" value=${settings.lmmaStart||''} onChange=${v=>setF('lmmaStart',v)}/></${Field}>
  <${Field} label="A day is missed after (hour, 0 to 23)" id="cc"><${Inp} id="cc" type="number" value=${settings.lmmaCutoff||20} onChange=${v=>setF('lmmaCutoff',Math.max(0,Math.min(23,+v||20)))}/></${Field}></div>
  <p className="muted small">Days before the start date are not counted. Leave it empty to start from the first recorded patrol.</p></${Card}>`}</div>`}
 ${tab==='activity'&&html`<${Card} title="Activity inside the LMMA"><${Table} cols=${[{h:'Activity',k:'a'},{h:'Records',k:'n',cls:'num'}]} rows=${[{id:1,a:'Ranger patrols inside the LMMA',n:insideCount},{id:2,a:'Suspected violations',n:incidents.filter(i=>['Suspected illegal fishing','No Take Zone violations','LMMA violations','Spearguns and restricted fishing gear'].includes(i.cat)).length}]}/><${Btn} onClick=${()=>go('reports')}>Open Reports & Documents</${Btn}></${Card}>`}
 </div>`;
};

/* ---------- Projects ---------- */
const mineOf=(assign,account)=>(assign&&account&&assign[account.id])||[];
const taskDone=t=>t.status==='Done';
const Projects=()=>{
 const {role,assign,setAssign,account,projOpen,setProjOpen,projects,setProjects,work,setWork,people,log,toast,user}=useApp();
 const [tab,setTab]=useState('ov');const [mk,setMk]=useState(null);const [tk,setTk]=useState(null);const [up,setUp]=useState('');
 const officer=role==='officer';const admin=role==='admin';
 const mine=mineOf(assign,account);
 const okP=p=>!officer||mine.includes(p.id);
 const cur=projOpen&&PROJECTS.find(p=>p.id===projOpen);
 const budgetOk=role==='admin'||role==='board'||officer;
 const blank={name:'',code:'',partner:'',loc:'',lead:'',due:'',budget:'',desc:'',obj:''};
 const save=()=>{const f=mk;if(!f.name.trim()){toast('Enter the project name');return;}
  const base=f.id?projects.find(p=>p.id===f.id):{};const id=f.id||newId('prj').toLowerCase();
  const p={...base,id,name:f.name.trim(),code:(f.code||f.name.split(/\s+/).map(w=>w[0]).join('').slice(0,4)).toUpperCase(),partner:f.partner,loc:f.loc,lead:f.lead,due:f.due,budget:+f.budget||0,spent:base.spent||0,desc:f.desc,obj:f.obj.split('\n').map(x=>x.trim()).filter(Boolean),status:base.status||'Active'};
  setProjects(l=>f.id?l.map(x=>x.id===id?p:x):[p,...l]);log(f.id?'Edited project':'Created project','Conservation Projects',p.name);toast(f.id?'Project saved':'Project created. Assign officers from the Team tab.');setMk(null);if(!f.id){setProjOpen(id);setTab('team');}};
 const pw=work.filter(w=>cur&&w.proj===cur.id);
 const tasks=pw.filter(w=>w.kind==='task'),ups=pw.filter(w=>w.kind==='update'),miles=pw.filter(w=>w.kind==='milestone');
 const prog=cur?(tasks.length?Math.round(tasks.filter(taskDone).length/tasks.length*100):0):0;
 const saveTask=()=>{if(!tk.title.trim()){toast('Enter the task');return;}const w={id:newId('wk').toLowerCase(),proj:cur.id,kind:tk.kind,title:tk.title.trim(),who:tk.who,due:tk.due,status:tk.kind==='milestone'?'Planned':'Open',by:user,at:stamp()};setWork(l=>[w,...l]);log('Added '+tk.kind,'Conservation Projects',cur.name);toast('Saved');setTk(null);};
 const setSt=(w,s)=>setWork(l=>l.map(x=>x.id===w.id?{...x,status:s}:x));
 const addUp=()=>{if(!up.trim())return;setWork(l=>[{id:newId('wk').toLowerCase(),proj:cur.id,kind:'update',title:up.trim(),by:user,at:stamp()},...l]);log('Posted project update','Conservation Projects',cur.name);setUp('');};
 const flip=o=>{const has=mine2(o.id).includes(cur.id);setAssign(a=>({...a,[o.id]:has?(a[o.id]||[]).filter(x=>x!==cur.id):[...(a[o.id]||[]),cur.id]}));log(has?'Revoked project access':'Assigned officer to project','Conservation Projects',o.name+' / '+cur.name);toast(has?o.name+' removed from '+cur.name:o.name+' assigned to '+cur.name);};
 const mine2=id=>assign[id]||[];
 const head=html`${admin&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>setMk(blank)}>New project</${Btn}>`}`;
 if(cur&&!okP(cur))return html`<div><${PageHead} title=${cur.name}/><${Denied} mod=${cur.name} role=${role} why="project"/><${Btn} onClick=${()=>setProjOpen(null)}>Back to my projects</${Btn}></div>`;
 const form=html`<${Modal} open=${!!mk} onClose=${()=>setMk(null)} title=${mk&&mk.id?'Edit project':'New project'}>${mk&&html`<div className="form">
  <${Field} label="Project name" id="pn" wide=${true}><${Inp} id="pn" value=${mk.name} onChange=${v=>setMk(o=>({...o,name:v}))}/></${Field}>
  <${Field} label="Short code" id="pc"><${Inp} id="pc" value=${mk.code} onChange=${v=>setMk(o=>({...o,code:v}))} placeholder="e.g. CR"/></${Field}>
  <${Field} label="Funding partner" id="pp"><${Inp} id="pp" value=${mk.partner} onChange=${v=>setMk(o=>({...o,partner:v}))}/></${Field}>
  <${Field} label="Location" id="pl"><${Inp} id="pl" value=${mk.loc} onChange=${v=>setMk(o=>({...o,loc:v}))}/></${Field}>
  <${Field} label="Project lead" id="pld"><${Sel} id="pld" value=${mk.lead} onChange=${v=>setMk(o=>({...o,lead:v}))} opts=${[['','None yet'],...OFFICERS.map(o=>[o.name,o.name])]}/></${Field}>
  <${Field} label="Due date" id="pdd"><${Inp} id="pdd" type="date" value=${mk.due} onChange=${v=>setMk(o=>({...o,due:v}))}/></${Field}>
  <${Field} label="Budget (KES)" id="pb"><${Inp} id="pb" type="number" value=${mk.budget} onChange=${v=>setMk(o=>({...o,budget:v}))}/></${Field}>
  <${Field} label="Description" id="pds" wide=${true}><textarea id="pds" rows="2" value=${mk.desc} onChange=${e=>{const v=e.target.value;setMk(o=>({...o,desc:v}));}}/></${Field}>
  <${Field} label="Objectives (one per line)" id="po" wide=${true}><textarea id="po" rows="3" value=${mk.obj} onChange=${e=>{const v=e.target.value;setMk(o=>({...o,obj:v}));}}/></${Field}>
  <div className="form-foot wide"><${Btn} onClick=${()=>setMk(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Save project</${Btn}></div></div>`}</${Modal}>`;
 if(!cur)return html`<div><${PageHead} title="Conservation Projects" sub=${officer?'Your assigned workspaces. Other projects are locked.':'Every project has its own workspace'}>${head}</${PageHead}>
  ${PROJECTS.length===0&&html`<${Card}><p className="muted">${admin?'No projects yet. Create the first project, then assign officers to it.':'No projects have been created yet.'}</p></${Card}>`}
  <div className="pcards">${PROJECTS.map(p=>okP(p)?html`<button key=${p.id} className="pcard" onClick=${()=>{setProjOpen(p.id);setTab('ov');}}><span className="pcode">${p.code}</span><h3>${p.name}</h3><p>${p.loc||p.partner||''}</p><div className="pmeta"><span>${p.lead?'Lead: '+p.lead:'No lead yet'}</span><span>${p.due?'Due '+p.due:''}</span></div></button>`:
  html`<button key=${p.id} className="pcard locked" onClick=${()=>setProjOpen(p.id)}><span className="pcode"><${Icon} n="lock" s=${12}/> ${p.code}</span><h3>${p.name}</h3><p>Not assigned to you</p></button>`)}</div>${form}</div>`;
 const team=OFFICERS.filter(o=>mine2(o.id).includes(cur.id));
 return html`<div><${PageHead} title=${cur.name} sub=${[cur.loc,cur.partner,cur.due&&'Due '+cur.due].filter(Boolean).join(' · ')}>${admin&&html`<${Btn} onClick=${()=>setMk({id:cur.id,name:cur.name,code:cur.code,partner:cur.partner||'',loc:cur.loc||'',lead:cur.lead||'',due:cur.due||'',budget:String(cur.budget||''),desc:cur.desc||'',obj:(cur.obj||[]).join('\n')})}>Edit</${Btn}>`}<${Btn} onClick=${()=>setProjOpen(null)}>All projects</${Btn}></${PageHead}>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['ov','Overview'],['wp','Workplan & tasks'],['team','Team'],['bud','Budget'],['upd','Updates & history']]}/>
 ${tab==='ov'&&html`<div className="grid2"><${Card} title="Objectives">${(cur.obj||[]).length?html`<ul className="ticks">${cur.obj.map(o=>html`<li key=${o}>${o}</li>`)}</ul>`:html`<p className="muted">${cur.desc||'No objectives recorded yet.'}</p>`}<h3 className="mini-h">Progress</h3><${Progress} v=${prog}/><p className="muted small">${tasks.length?prog+'% of '+tasks.length+' tasks done':'No tasks yet'}</p></${Card}>
  <${Card} title="Milestones" right=${html`<${Btn} kind="ghost small" onClick=${()=>setTk({kind:'milestone',title:'',who:'',due:''})}>Add milestone</${Btn}>`}><${Table} empty="No milestones yet." cols=${[{h:'Milestone',k:'title'},{h:'When',k:'due'},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`},{h:'',k:'a',r:r=>r.status!=='Done'?html`<button className="link" onClick=${()=>setSt(r,'Done')}>Mark done</button>`:''}]} rows=${miles}/></${Card}></div>`}
 ${tab==='wp'&&html`<${Card} title="Activities and tasks" right=${html`<${Btn} kind="small" icon="plus" onClick=${()=>setTk({kind:'task',title:'',who:'',due:''})}>Add task</${Btn}>`}><${Table} empty="No tasks yet." cols=${[{h:'Task',k:'title'},{h:'Assigned to',k:'who'},{h:'Deadline',k:'due'},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`},{h:'',k:'a',r:r=>r.status==='Open'?html`<button className="link" onClick=${()=>setSt(r,'In progress')}>Start</button>`:r.status==='In progress'?html`<button className="link" onClick=${()=>setSt(r,'Done')}>Mark done</button>`:''}]} rows=${tasks}/></${Card}>`}
 ${tab==='team'&&html`<${Card} title="Assigned officers" sub=${admin?'Tick the officers who may open this project. Officers cannot assign themselves.':''}>${admin?(OFFICERS.length?html`<ul className="sharelist">${OFFICERS.map(o=>html`<li key=${o.id}><span>${o.name}</span><${Toggle} on=${mine2(o.id).includes(cur.id)} onChange=${()=>flip(o)} label=${'Assign '+o.name}/></li>`)}</ul>`:html`<p className="muted">There are no Conservation Officer accounts yet. Create one in Staff & Users.</p>`):html`<${Table} empty="No officers assigned." cols=${[{h:'Name',k:'name'}]} rows=${team}/>`}${cur.lead&&html`<p className="muted small">Project lead: ${cur.lead}</p>`}</${Card}>`}
 ${tab==='bud'&&(budgetOk?html`<${Card} title="Authorised budget information"><div className="kpis small"><${Kpi} label="Budget" value=${KES(cur.budget||0)}/><${Kpi} label="Spent" value=${KES(cur.spent||0)}/><${Kpi} label="Remaining" value=${KES((cur.budget||0)-(cur.spent||0))}/></div>${cur.budget>0&&html`<${Progress} v=${Math.round((cur.spent||0)/cur.budget*100)}/>`}${admin&&html`<div className="form"><${Field} label="Spent so far (KES)" id="sp"><${Inp} id="sp" type="number" value=${String(cur.spent||0)} onChange=${v=>setProjects(l=>l.map(x=>x.id===cur.id?{...x,spent:+v||0}:x))}/></${Field}></div>`}</${Card}>`:html`<${Notice} tone="warn" title="Budget hidden">Budget information is shown only to roles permitted to see it.</${Notice}>`)}
 ${tab==='upd'&&html`<${Card} title="Progress updates and history"><div className="form"><${Field} label="Add an update" id="up" wide=${true}><${Inp} id="up" value=${up} onChange=${setUp} placeholder="What happened on this project?"/></${Field}></div><${Btn} kind="small" onClick=${addUp}>Post update</${Btn}><ul className="feed">${ups.map(u=>html`<li key=${u.id}>${u.title}<small>${u.by} · ${u.at}</small></li>`)}${ups.length===0&&html`<li>No updates yet</li>`}</ul></${Card}>`}
 <${Modal} open=${!!tk} onClose=${()=>setTk(null)} title=${tk?(tk.kind==='milestone'?'Add milestone':'Add task'):''}>${tk&&html`<div className="form"><${Field} label=${tk.kind==='milestone'?'Milestone':'Task'} id="tkt" wide=${true}><${Inp} id="tkt" value=${tk.title} onChange=${v=>setTk(o=>({...o,title:v}))}/></${Field}>${tk.kind==='task'&&html`<${Field} label="Assigned to" id="tkw"><${Sel} id="tkw" value=${tk.who} onChange=${v=>setTk(o=>({...o,who:v}))} opts=${[['','Not assigned'],...team.map(o=>[o.name,o.name])]}/></${Field}>`}<${Field} label=${tk.kind==='milestone'?'Target date':'Deadline'} id="tkd"><${Inp} id="tkd" type="date" value=${tk.due} onChange=${v=>setTk(o=>({...o,due:v}))}/></${Field}><div className="form-foot wide"><${Btn} onClick=${()=>setTk(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${saveTask}>Save</${Btn}></div></div>`}</${Modal}>${form}
 </div>`;
};

/* ---------- Coral Restoration: sites and monitoring visits, saved on the server ---------- */
const Coral=()=>{
 const {role,assign,account,can,log,toast,coral,setCoral,user}=useApp();
 const [open,setOpen]=useState(null);const [mk,setMk]=useState(null);const [vs,setVs]=useState(null);
 if(role==='officer'&&!mineOf(assign,account).length)return html`<div><${PageHead} title="Coral Restoration"/><${Denied} mod="Coral Restoration" role=${role} why="project"/></div>`;
 const sites=coral.filter(c=>c.kind==='site'),visits=coral.filter(c=>c.kind==='visit').sort((a,b)=>a.date<b.date?1:-1);
 const write=can('coral')==='w'||can('coral')==='s';
 const lastOf=s=>visits.find(v=>v.site===s.id);
 const withLast=sites.map(s=>{const l=lastOf(s);return {...s,surv:l?l.surv:null,bleach:l?l.bl:null,last:l?l.date:''};});
 const cur=open&&withLast.find(s=>s.id===open);
 const rated=withLast.filter(s=>s.surv!==null);
 const avg=rated.length?Math.round(rated.reduce((a,s)=>a+s.surv,0)/rated.length):null;
 const ble=rated.length?Math.round(rated.reduce((a,s)=>a+s.bleach,0)/rated.length):null;
 const saveSite=()=>{if(!mk.name.trim()){toast('Enter the site name');return;}const s={...mk,id:mk.id||newId('site').toLowerCase(),kind:'site',n:+mk.n||0,lat:mk.lat===''?null:+mk.lat,lon:mk.lon===''?null:+mk.lon};setCoral(l=>mk.id?l.map(x=>x.id===s.id?s:x):[s,...l]);log(mk.id?'Edited restoration site':'Added restoration site','Coral Restoration',s.name);toast('Site saved');setMk(null);};
 const saveVisit=()=>{if(!vs.site){toast('Choose the site');return;}const v={id:newId('visit').toLowerCase(),kind:'visit',site:vs.site,date:vs.date,surv:+vs.surv,bl:+vs.bl,notes:vs.notes,by:user};setCoral(l=>[v,...l]);const s=sites.find(x=>x.id===vs.site);log('Recorded reef monitoring visit','Coral Restoration',s?s.name:'');toast('Monitoring visit saved');setVs(null);};
 const months=[...new Set(visits.map(v=>v.date.slice(0,7)))].sort().slice(-8);
 const series=sites.map((s,i)=>({name:s.name,color:'var(--c'+(i%6+1)+')',v:months.map(m=>{const x=visits.filter(v=>v.site===s.id&&v.date.slice(0,7)===m);return x.length?Math.round(x.reduce((a,v)=>a+v.surv,0)/x.length):null;})})).filter(s=>s.v.some(x=>x!==null)).map(s=>{let last=null;return {...s,v:s.v.map(x=>{if(x!==null)last=x;return last===null?0:last;})};});
 return html`<div><${PageHead} title="Coral Restoration" sub="Restoration sites and reef monitoring">${write&&html`<${Btn} icon="plus" onClick=${()=>setMk({name:'',lat:'',lon:'',desc:'',base:'',sp:'',meth:'',n:'',date:isoToday(),team:'',equip:''})}>Add site</${Btn}>`}${write&&sites.length>0&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>setVs({site:sites[0].id,date:isoToday(),surv:'',bl:'',notes:''})}>Record monitoring visit</${Btn}>`}</${PageHead}>
 <div className="kpis"><${Kpi} label="Fragments placed" value=${sites.reduce((a,s)=>a+(s.n||0),0).toLocaleString('en-US')}/><${Kpi} label="Average survival" value=${avg===null?'—':avg+'%'} note=${avg===null?'no visits yet':'latest visit per site'} tone=${avg===null?'':avg>=85?'good':'warn'}/><${Kpi} label="Bleaching recorded" value=${ble===null?'—':ble+'%'} tone=${ble>5?'warn':''}/><${Kpi} label="Restoration sites" value=${String(sites.length)}/></div>
 ${sites.length===0&&html`<${Card}><p className="muted">No restoration sites yet.${write?' Add the first site, then record monitoring visits against it.':''}</p></${Card}>`}
 ${sites.length>0&&html`<div className="grid2">${series.length>0&&html`<${Card} title="Survival over time" sub="Percent of fragments alive, monthly"><${LineChart} labels=${months.map(m=>m.slice(5)+'/'+m.slice(2,4))} yMin=${0} yMax=${100} unit="%" series=${series}/></${Card}>`}
 <${Card} title="Restoration sites"><${Table} sel=${open} onRow=${r=>setOpen(r.id)} cols=${[{h:'Site',k:'name'},{h:'Fragments',k:'n',cls:'num'},{h:'Survival',k:'surv',cls:'num',r:r=>r.surv===null?'—':r.surv+'%'},{h:'Bleaching',k:'bleach',cls:'num',r:r=>r.bleach===null?'—':r.bleach+'%'}]} rows=${withLast}/></${Card}></div>
 <${Card} title="Monitoring visits"><${Table} empty="No visits recorded yet." cols=${[{h:'Date',k:'date'},{h:'Site',k:'site',r:r=>(sites.find(s=>s.id===r.site)||{}).name||''},{h:'Survival',k:'surv',cls:'num',r:r=>r.surv+'%'},{h:'Bleaching',k:'bl',cls:'num',r:r=>r.bl+'%'},{h:'By',k:'by'}]} rows=${visits}/></${Card}>`}
 <${Drawer} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.name:''} sub=${cur?'Restored '+(cur.date||''):''} foot=${cur&&write?html`<${Btn} onClick=${()=>{setMk({...cur,n:String(cur.n||''),lat:cur.lat==null?'':String(cur.lat),lon:cur.lon==null?'':String(cur.lon)});setOpen(null);}}>Edit site</${Btn}>`:null}>${cur&&html`<${KV} rows=${[['GPS coordinates',cur.lat!=null&&cur.lon!=null?html`<span className="mono">${(+cur.lat).toFixed(6)}, ${(+cur.lon).toFixed(6)}</span>`:'Not recorded'],['Site description',cur.desc||'—'],['Baseline reef condition',cur.base||'—'],['Coral species',cur.sp||'—'],['Restoration method',cur.meth||'—'],['Fragments or colonies',(cur.n||0).toLocaleString('en-US')],['Team',cur.team||'—'],['Equipment',cur.equip||'—'],['Survival',cur.surv===null?'—':cur.surv+'%'],['Bleaching',cur.bleach===null?'—':cur.bleach+'%']]}/>`}</${Drawer}>
 <${Modal} open=${!!mk} onClose=${()=>setMk(null)} title=${mk&&mk.id?'Edit site':'Add restoration site'}>${mk&&html`<div className="form">
  <${Field} label="Site name" id="cn" wide=${true}><${Inp} id="cn" value=${mk.name} onChange=${v=>setMk(o=>({...o,name:v}))}/></${Field}>
  <${Field} label="Latitude (decimal, south is negative)" id="cla"><${Inp} id="cla" type="number" value=${mk.lat} onChange=${v=>setMk(o=>({...o,lat:v}))}/></${Field}>
  <${Field} label="Longitude (decimal)" id="clo"><${Inp} id="clo" type="number" value=${mk.lon} onChange=${v=>setMk(o=>({...o,lon:v}))}/></${Field}>
  <${Field} label="Date restored" id="cdt"><${Inp} id="cdt" type="date" value=${mk.date} onChange=${v=>setMk(o=>({...o,date:v}))}/></${Field}>
  <${Field} label="Fragments or colonies" id="cfn"><${Inp} id="cfn" type="number" value=${mk.n} onChange=${v=>setMk(o=>({...o,n:v}))}/></${Field}>
  <${Field} label="Restoration method" id="cm"><${Inp} id="cm" value=${mk.meth} onChange=${v=>setMk(o=>({...o,meth:v}))}/></${Field}>
  <${Field} label="Coral species" id="csp"><${Inp} id="csp" value=${mk.sp} onChange=${v=>setMk(o=>({...o,sp:v}))}/></${Field}>
  <${Field} label="Baseline reef condition" id="cb"><${Inp} id="cb" value=${mk.base} onChange=${v=>setMk(o=>({...o,base:v}))}/></${Field}>
  <${Field} label="Team" id="ct"><${Inp} id="ct" value=${mk.team} onChange=${v=>setMk(o=>({...o,team:v}))}/></${Field}>
  <${Field} label="Equipment" id="ce"><${Inp} id="ce" value=${mk.equip} onChange=${v=>setMk(o=>({...o,equip:v}))}/></${Field}>
  <${Field} label="Description" id="cd" wide=${true}><${Inp} id="cd" value=${mk.desc} onChange=${v=>setMk(o=>({...o,desc:v}))}/></${Field}>
  <div className="form-foot wide"><${Btn} onClick=${()=>setMk(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${saveSite}>Save site</${Btn}></div></div>`}</${Modal}>
 <${Modal} open=${!!vs} onClose=${()=>setVs(null)} title="Record monitoring visit">${vs&&html`<div className="form"><${Field} label="Site" id="vs"><${Sel} id="vs" value=${vs.site} onChange=${v=>setVs(o=>({...o,site:v}))} opts=${sites.map(s=>[s.id,s.name])}/></${Field}><${Field} label="Date" id="vd"><${Inp} id="vd" type="date" value=${vs.date} onChange=${v=>setVs(o=>({...o,date:v}))}/></${Field}><${Field} label="Fragments alive (%)" id="vv"><${Inp} id="vv" type="number" value=${vs.surv} onChange=${v=>setVs(o=>({...o,surv:v}))}/></${Field}><${Field} label="Bleaching (%)" id="vb"><${Inp} id="vb" type="number" value=${vs.bl} onChange=${v=>setVs(o=>({...o,bl:v}))}/></${Field}><${Field} label="Notes" id="vn" wide=${true}><${Inp} id="vn" value=${vs.notes} onChange=${v=>setVs(o=>({...o,notes:v}))}/></${Field}><div className="form-foot wide"><${Btn} onClick=${()=>setVs(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${saveVisit}>Save visit</${Btn}></div></div>`}</${Modal}></div>`;
};

/* ---------- Staff & Users: real accounts created by the Super Admin ---------- */
const COUNTIES=['Lamu','Kilifi','Mombasa','Kwale','Tana River','Garissa'];
const genPw=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';let s='';const r=new Uint32Array(8);crypto.getRandomValues(r);r.forEach(x=>s+=a[x%a.length]);return s+'7';};
const Staff=()=>{
 const {log,toast,people,setPeople,role,projects,assign,setAssign}=useApp();
 const [open,setOpen]=useState(null);const [mk,setMk]=useState(null);const [rs,setRs]=useState(null);const [shown,setShown]=useState('');
 const admin=role==='admin';
 const cur=open&&people.find(p=>p.id===open);
 const reload=async()=>{try{setPeople((await api('GET','/users')).users);}catch(e){}};
 const roleOpts=Object.keys(ROLES).map(k=>[k,ROLES[k].label]);
 const blank={name:'',email:'',role:'ranger',county:'Lamu',subcounty:'Lamu East',bmu:'',pw:genPw(),projects:[]};
 const add=async()=>{if(!mk.name.trim()){toast('Enter the full name');return;}if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mk.email)){toast('Enter a valid email address');return;}
  try{const r=await api('POST','/users',{name:mk.name,email:mk.email,role:mk.role,county:mk.county,subcounty:mk.subcounty,bmu:mk.role==='bmu'?mk.bmu:'',temp_password:mk.pw,project_ids:[]});
   if(mk.role==='officer'&&mk.projects.length)setAssign(a=>({...a,[r.user.id]:mk.projects}));
   log('Created user account','Staff & Users',mk.name);setShown(mk.email+' / '+mk.pw);toast(mk.name+' added');setMk(null);await reload();}
  catch(e){toast(e.list&&e.list.length?e.list.join('. '):e.message);}};
 const patch=async(body,msg)=>{try{await api('PATCH','/users/'+cur.id,body);log(msg,'Staff & Users',cur.name);toast(msg);await reload();}catch(e){toast(e.message);}};
 const reset=async()=>{const pw=rs||genPw();try{await api('POST','/users/'+cur.id+'/reset',{temp_password:pw});log('Reset password','Staff & Users',cur.name);setShown(cur.email+' / '+pw);toast('Password reset. Share the temporary password with them.');setRs(null);}catch(e){toast(e.list&&e.list.length?e.list.join('. '):e.message);}};
 return html`<div><${PageHead} title="Staff & Users" sub="Accounts, roles, county and sub-county">${admin&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>setMk({...blank,pw:genPw()})}>Add user</${Btn}>`}</${PageHead}>
 ${shown&&html`<${Notice} tone="warn" title="Temporary sign-in. Copy it now, it is not shown again."><span className="mono">${shown}</span> The person must choose a new password the first time they sign in. <button className="link" onClick=${()=>setShown('')}>Hide</button></${Notice}>`}
 <${Card}><${Table} sel=${open} empty="No users yet." onRow=${r=>setOpen(r.id)} cols=${[{h:'Name',k:'name'},{h:'Email',k:'email'},{h:'Role in POps',k:'role_label'},{h:'County',k:'county'},{h:'Sub-county',k:'subcounty'},{h:'BMU',k:'bmu',r:r=>bmuName(r.bmu)||'—'},{h:'Status',k:'active',r:r=>html`<${Chip} t=${r.active?(r.must_change?'Invited':'Active'):'Deactivated'} tone=${r.active?(r.must_change?'warn':'good'):'crit'}/>`}]} rows=${people}/></${Card}>
 <${Drawer} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.name:''} sub=${cur?cur.role_label:''} foot=${cur&&admin?html`<span className="btnrow"><${Btn} onClick=${()=>setRs(genPw())}>Reset password</${Btn}><${Btn} kind=${cur.active?'danger':'primary'} onClick=${()=>patch({active:!cur.active},cur.active?'Account deactivated':'Account reactivated')}>${cur.active?'Deactivate':'Reactivate'}</${Btn}></span>`:null}>${cur&&html`<${KV} rows=${[['Email',cur.email],['Role in POps',cur.role_label],['County',cur.county||'—'],['Sub-county',cur.subcounty||'—'],['BMU',bmuName(cur.bmu)||'—'],['Last sign-in',cur.last_login?cur.last_login.replace('T',' ').slice(0,16):'Never'],['Created',(cur.created_at||'').slice(0,10)]]}/>
  ${admin&&html`<h3 className="mini-h">Change role or area</h3><div className="form"><${Field} label="Role" id="er"><${Sel} id="er" value=${cur.role} onChange=${v=>patch({role:v},'Role changed')} opts=${roleOpts}/></${Field}><${Field} label="County" id="ec"><${Sel} id="ec" value=${cur.county||'Lamu'} onChange=${v=>patch({county:v},'County changed')} opts=${COUNTIES}/></${Field}><${Field} label="Sub-county" id="es"><${Inp} id="es" value=${cur.subcounty||''} onChange=${v=>setPeople(l=>l.map(p=>p.id===cur.id?{...p,subcounty:v}:p))}/></${Field}></div><${Btn} kind="small" onClick=${()=>patch({subcounty:cur.subcounty},'Sub-county saved')}>Save sub-county</${Btn}>`}`}</${Drawer}>
 <${Modal} open=${!!rs} onClose=${()=>setRs(null)} title="Reset password"><p>Set a new temporary password for ${cur?cur.name:''}. They must change it when they next sign in.</p><div className="form"><${Field} label="Temporary password" id="rp" wide=${true}><${Inp} id="rp" value=${rs||''} onChange=${setRs}/></${Field}></div><div className="form-foot"><${Btn} onClick=${()=>setRs(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${reset}>Reset password</${Btn}></div></${Modal}>
 <${Modal} open=${!!mk} onClose=${()=>setMk(null)} title="Add user">${mk&&html`<div className="form">
  <${Field} label="Full name" id="sn" wide=${true}><${Inp} id="sn" value=${mk.name} onChange=${v=>setMk(o=>({...o,name:v}))}/></${Field}>
  <${Field} label="Email" id="se"><${Inp} id="se" type="email" value=${mk.email} onChange=${v=>setMk(o=>({...o,email:v}))}/></${Field}>
  <${Field} label="Role in POps" id="sr"><${Sel} id="sr" value=${mk.role} onChange=${v=>setMk(o=>({...o,role:v}))} opts=${roleOpts}/></${Field}>
  <${Field} label="County" id="sc"><${Sel} id="sc" value=${mk.county} onChange=${v=>setMk(o=>({...o,county:v}))} opts=${COUNTIES}/></${Field}>
  <${Field} label="Sub-county" id="ss"><${Inp} id="ss" value=${mk.subcounty} onChange=${v=>setMk(o=>({...o,subcounty:v}))}/></${Field}>
  ${mk.role==='bmu'&&html`<${Field} label="BMU" id="sb"><${Sel} id="sb" value=${mk.bmu} onChange=${v=>setMk(o=>({...o,bmu:v}))} opts=${[['','Choose'],...BMUS.map(b=>[b.id,b.name])]}/></${Field}>`}
  <${Field} label="Temporary password" id="sp"><${Inp} id="sp" value=${mk.pw} onChange=${v=>setMk(o=>({...o,pw:v}))}/></${Field}>
  ${mk.role==='officer'&&PROJECTS.length>0&&html`<${Field} label="Assign to projects" id="sj" wide=${true}><div className="chips">${PROJECTS.map(p=>html`<button type="button" key=${p.id} className=${'fchip '+(mk.projects.includes(p.id)?'on':'')} onClick=${()=>setMk(o=>({...o,projects:o.projects.includes(p.id)?o.projects.filter(x=>x!==p.id):[...o.projects,p.id]}))}>${p.name}</button>`)}</div></${Field}>`}
  <p className="muted small wide">At least 8 characters with a letter and a number. The person is asked to choose their own password at first sign-in.</p>
  <div className="form-foot wide"><${Btn} onClick=${()=>setMk(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${add}>Create account</${Btn}></div></div>`}</${Modal}></div>`;
};

/* ---------- a small editable list used for board, meetings, partners, equipment, donors ---------- */
const Registry=({title,sub,items,setItems,fields,canEdit,empty,idp,log,toast,extra})=>{
 const [f,setF]=useState(null);
 const blank=()=>Object.fromEntries(fields.map(x=>[x.k,x.def||'']));
 const save=()=>{if(!String(f[fields[0].k]||'').trim()){toast('Enter '+fields[0].label.toLowerCase());return;}const it={...f,id:f.id||newId(idp).toLowerCase()};setItems(l=>f.id?l.map(x=>x.id===it.id?it:x):[it,...l]);log&&log(f.id?'Edited '+title.toLowerCase():'Added to '+title.toLowerCase(),title,it[fields[0].k]);toast('Saved');setF(null);};
 const del=()=>{setItems(l=>l.filter(x=>x.id!==f.id));log&&log('Removed from '+title.toLowerCase(),title,f[fields[0].k]);toast('Removed');setF(null);};
 return html`<${Card} title=${title} sub=${sub} right=${canEdit&&html`<${Btn} kind="small" icon="plus" onClick=${()=>setF(blank())}>Add</${Btn}>`}><${Table} empty=${empty||'Nothing recorded yet.'} onRow=${canEdit?r=>setF({...r}):null} cols=${fields.map(x=>({h:x.label,k:x.k,cls:x.num?'num':'',r:x.fmt?r=>x.fmt(r[x.k],r):undefined}))} rows=${items}/>
 <${Modal} open=${!!f} onClose=${()=>setF(null)} title=${f&&f.id?'Edit '+title:'Add to '+title}>${f&&html`<div className="form">${fields.map(x=>html`<${Field} key=${x.k} label=${x.label} id=${'rg'+x.k} wide=${x.wide}>${x.opts?html`<${Sel} id=${'rg'+x.k} value=${f[x.k]} onChange=${v=>setF(o=>({...o,[x.k]:v}))} opts=${x.opts}/>`:html`<${Inp} id=${'rg'+x.k} type=${x.type||'text'} value=${f[x.k]} onChange=${v=>setF(o=>({...o,[x.k]:v}))}/>`}</${Field}>`)}${extra&&extra(f,setF)}
  <div className="form-foot wide">${f.id&&html`<${Btn} kind="danger" onClick=${del}>Remove</${Btn}>`}<${Btn} onClick=${()=>setF(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Save</${Btn}></div></div>`}</${Modal}></${Card}>`;
};

/* ---------- BMUs & Governance ---------- */
const Bmus=()=>{
 const {patrols,can,role,bmuRows,setBmuRows,log,toast}=useApp();
 const [tab,setTab]=useState('bmu');const [ed,setEd]=useState(null);
 const admin=can('bmus')==='w';
 const info=id=>bmuRows.find(r=>r.id===id)||{id};
 const save=()=>{setBmuRows(l=>l.some(r=>r.id===ed.id)?l.map(r=>r.id===ed.id?ed:r):[...l,ed]);log('Updated BMU profile','BMUs & Governance',bmuName(ed.id));toast('Profile saved');setEd(null);};
 const rows=(k)=>bmuRows.filter(r=>r.kind===k);
 const setK=k=>fn=>setBmuRows(l=>{const mine=l.filter(r=>r.kind===k),rest=l.filter(r=>r.kind!==k);return [...rest,...(typeof fn==='function'?fn(mine):fn)];});
 return html`<div><${PageHead} title="BMUs & Governance" sub="Beach Management Units, plus Board and committee records"/>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['bmu','BMU profiles'],['board','Board & committee']]}/>
 ${tab==='bmu'&&html`<div><${Notice} tone="info" title="Always separate">Shanga Ishakani and Shanga Rubu keep their own records, representatives, activities, reports and permissions. They are never merged.</${Notice}>
 <div className="grid3">${BMUS.map(b=>{const i=info(b.id);return html`<${Card} key=${b.id} title=${b.name} right=${admin&&html`<${Btn} kind="ghost small" onClick=${()=>setEd({id:b.id,rep:i.rep||'',community:i.community||'',members:i.members||'',activities:i.activities||'',meeting:i.meeting||''})}>Edit</${Btn}>`}><${KV} rows=${[['Representative',i.rep||'Not set'],['Community',i.community||'—'],['Members',i.members||'—'],['Conservation activities',i.activities||'—'],['Patrols on record',patrols.filter(p=>p.bmu===b.id).length],['Next meeting',i.meeting||'—']]}/></${Card}>`;})}</div></div>`}
 ${tab==='board'&&html`<div className="grid2"><${Registry} title="Board members" sub="Governance and oversight" idp="bm" items=${rows('member')} setItems=${setK('member')} canEdit=${admin} log=${log} toast=${toast} fields=${[{k:'name',label:'Name'},{k:'position',label:'Position'}]}/>
 <${Registry} title="Meetings and resolutions" idp="mt" items=${rows('meeting')} setItems=${setK('meeting')} canEdit=${admin} log=${log} toast=${toast} fields=${[{k:'title',label:'Meeting'},{k:'date',label:'Date',type:'date'},{k:'resolution',label:'Resolution',wide:true}]}/>
 <${Registry} title="Action points" idp="ac" items=${rows('action')} setItems=${setK('action')} canEdit=${admin} log=${log} toast=${toast} fields=${[{k:'action',label:'Action'},{k:'deadline',label:'Deadline',type:'date'},{k:'status',label:'Status',opts:['Open','In progress','Done'],def:'Open',fmt:v=>html`<${Chip} t=${v}/>`}]}/>
 <${Card} title="Confidential documents"><p className="muted">Board minutes and governance documents stay internal. They are never shared with the public website or with partners automatically.</p></${Card}></div>`}
 <${Modal} open=${!!ed} onClose=${()=>setEd(null)} title=${ed?'Edit '+bmuName(ed.id):''}>${ed&&html`<div className="form"><${Field} label="Representative" id="br"><${Inp} id="br" value=${ed.rep} onChange=${v=>setEd(o=>({...o,rep:v}))}/></${Field}><${Field} label="Community" id="bc"><${Inp} id="bc" value=${ed.community} onChange=${v=>setEd(o=>({...o,community:v}))}/></${Field}><${Field} label="Registered members" id="bm"><${Inp} id="bm" value=${ed.members} onChange=${v=>setEd(o=>({...o,members:v}))}/></${Field}><${Field} label="Next meeting" id="bn"><${Inp} id="bn" type="date" value=${ed.meeting} onChange=${v=>setEd(o=>({...o,meeting:v}))}/></${Field}><${Field} label="Conservation activities" id="ba" wide=${true}><${Inp} id="ba" value=${ed.activities} onChange=${v=>setEd(o=>({...o,activities:v}))}/></${Field}><div className="form-foot wide"><${Btn} onClick=${()=>setEd(null)}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Save</${Btn}></div></div>`}</${Modal}></div>`;
};

/* ---------- Stakeholders & Partners ---------- */
const SHAREABLE=['Incident referrals','Patrol summaries','Coral monitoring summary','Quarterly impact report'];
const Partners=()=>{
 const {can,log,toast,partners,setPartners}=useApp();
 const write=can('partners')==='w';
 return html`<div><${PageHead} title="Stakeholders & Partners" sub="Directory, engagement history and explicitly shared information"/>
 <${Notice} tone="info" title="Nothing is shared by default">External partners only see items the Super Admin has chosen to share with them.</${Notice}>
 <${Registry} title="Partners" idp="pt" items=${partners} setItems=${setPartners} canEdit=${write} log=${log} toast=${toast} empty="No partners recorded yet." fields=${[{k:'name',label:'Organisation'},{k:'type',label:'Type',opts:['Government','NGO','Funder','Community','Business','Research'],def:'NGO'},{k:'contact',label:'Contact'},{k:'eng',label:'Latest engagement'}]}
  extra=${(f,setF)=>html`<div className="field wide"><label>Information shared with this partner</label><ul className="sharelist">${SHAREABLE.map(it=>html`<li key=${it}><span>${it}</span><${Toggle} on=${(f.shared||[]).includes(it)} onChange=${()=>setF(o=>({...o,shared:(o.shared||[]).includes(it)?o.shared.filter(x=>x!==it):[...(o.shared||[]),it]}))} label=${'Share '+it}/></li>`)}</ul></div>`}/></div>`;
};

/* ---------- Tourism and Finance share one entry form. The first choice is what kind of entry it is. ---------- */
const money=(a,c)=>c==='USD'?'USD '+Math.round(a).toLocaleString('en-US'):KES(a);
const FIN_IN=['Donations','Grants','Project funding','Tourism income','Conservation fees'],FIN_EX=['Patrol expenses','Fuel','Boat maintenance','Staff expenses','Conservation activities','Project expenses','Equipment','Administration'];
const VTYPES=[['guest','Guest (tourist)'],['bmu','BMU member'],['other','Other']];
const EntryModal=({open,onClose,start,item})=>{
 const {role,tour,setTour,fin,setFin,log,toast,user,can}=useApp();
 const canT=can('tourism')==='w',canF=can('finance')==='w';
 const fees=LOOK.fees||[];
 const mkT=()=>({id:'',name:'',vtype:'guest',vother:'',cat:'Domestic',nat:'Kenya',n:'1',act:'Snorkelling',dest:'Iweni LMMA',bmu:'pate',arr:isoToday(),guide:'',fee:fees[0]?fees[0].code:'',charge:fees[0]?String(fees[0].amount):'',cur:fees[0]?fees[0].currency:'KES',contact:''});
 const mkF=()=>({id:'',type:'Expense',cat:FIN_EX[0],desc:'',amt:'',ref:'',date:isoToday()});
 const [kind,setKind]=useState('tourism');const [t,setT]=useState(mkT());const [f,setF]=useState(mkF());
 useEffect(()=>{if(!open)return;if(item){setKind(item._k);if(item._k==='tourism')setT({...mkT(),...item,n:String(item.n),charge:String(item.charge)});else setF({...mkF(),...item,amt:String(item.amt)});}else{setKind(start==='finance'&&canF?'finance':canT?'tourism':'finance');setT(mkT());setF(mkF());}},[open,item&&item.id,start]);
 const pickFee=code=>{const x=fees.find(y=>y.code===code);setT(o=>({...o,fee:code,cur:x?x.currency:o.cur,charge:x?String(x.amount*(+o.n||1)):o.charge}));};
 const saveT=sub=>{if(!t.name.trim()){toast('Enter the visitor or group name');return;}if(!(+t.n>0)){toast('Enter the number of guests');return;}if(t.vtype==='other'&&!t.vother.trim()){toast('Say what kind of visitor this is');return;}
  const id=t.id||newId('BK');const old=tour.find(x=>x.id===id);const rec={...(old||{}),...t,id,n:+t.n,charge:+t.charge||0,recv:old?old.recv:0,method:old?old.method:'',tx:old?old.tx:'',receipt:old?old.receipt:'',recon:old?old.recon:'',by:old?old.by:user,status:sub?'Unpaid':'Draft'};
  const d=new Date(t.arr+'T12:00:00');rec.arrLabel=isNaN(d)?t.arr:pad(d.getDate())+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear();
  setTour(l=>old?l.map(x=>x.id===id?rec:x):[rec,...l]);log(sub?'Submitted visitor entry':'Saved visitor entry as draft','Tourism',id);toast(sub?id+' recorded. You can now record payments.':'Draft '+id+' saved. You can edit it and submit later.');onClose();};
 const saveF=sub=>{const a=+f.amt;if(!a||!f.desc.trim()){toast('Enter a description and an amount');return;}const id=f.id||newId('FN');const old=fin.find(x=>x.id===id);
  const rec={...(old||{}),id,date:f.date,type:f.type,cat:f.cat,desc:f.desc,amt:a,ref:f.ref,receipt:old?old.receipt:'',by:old?old.by:user,status:sub?'Submitted':'Draft'};
  setFin(l=>old?l.map(x=>x.id===id?rec:x):[rec,...l]);log(sub?'Submitted finance entry for approval':'Saved finance entry as draft','Finance',id);toast(sub?id+' sent to the approver.':'Draft '+id+' saved. You can edit it and submit later.');onClose();};
 const both=canT&&canF&&!item;
 return html`<${Modal} open=${open} onClose=${onClose} title=${item?'Edit draft':'New entry'}>
 ${both&&html`<div className="seg" role="radiogroup" aria-label="Entry type"><button type="button" role="radio" aria-checked=${kind==='tourism'} className=${'segb '+(kind==='tourism'?'on':'')} onClick=${()=>setKind('tourism')}>Tourist or visitor entry</button><button type="button" role="radio" aria-checked=${kind==='finance'} className=${'segb '+(kind==='finance'?'on':'')} onClick=${()=>setKind('finance')}>Finance entry</button></div>`}
 ${kind==='tourism'?html`<div className="form">
  <${Field} label="Visitor or group name" id="tn" wide=${true}><${Inp} id="tn" value=${t.name} onChange=${v=>setT(o=>({...o,name:v}))}/></${Field}>
  <${Field} label="Visitor type" id="tvt"><${Sel} id="tvt" value=${t.vtype} onChange=${v=>setT(o=>({...o,vtype:v}))} opts=${VTYPES}/></${Field}>
  ${t.vtype==='other'&&html`<${Field} label="Say what kind" id="tvo"><${Inp} id="tvo" value=${t.vother} onChange=${v=>setT(o=>({...o,vother:v}))}/></${Field}>`}
  <${Field} label="Category" id="tc"><${Sel} id="tc" value=${t.cat} onChange=${v=>setT(o=>({...o,cat:v}))} opts=${['Local','Domestic','International']}/></${Field}>
  <${Field} label="Nationality" id="tnat"><${Inp} id="tnat" value=${t.nat} onChange=${v=>setT(o=>({...o,nat:v}))}/></${Field}>
  <${Field} label="Number of guests" id="tg"><${Inp} id="tg" type="number" value=${t.n} onChange=${v=>setT(o=>({...o,n:v,charge:(()=>{const x=fees.find(y=>y.code===o.fee);return x?String(x.amount*(+v||0)):o.charge;})()}))}/></${Field}>
  <${Field} label="Activity" id="ta"><${Sel} id="ta" value=${t.act} onChange=${v=>setT(o=>({...o,act:v}))} opts=${['Snorkelling','Diving','Boat trip','Beach visit','Research','Filming','Other']}/></${Field}>
  <${Field} label="Destination" id="td"><${Inp} id="td" value=${t.dest} onChange=${v=>setT(o=>({...o,dest:v}))}/></${Field}>
  <${Field} label="BMU area" id="tb"><${Sel} id="tb" value=${t.bmu} onChange=${v=>setT(o=>({...o,bmu:v}))} opts=${BMUS.map(b=>[b.id,b.name])}/></${Field}>
  <${Field} label="Arrival date" id="tar"><${Inp} id="tar" type="date" value=${t.arr} onChange=${v=>setT(o=>({...o,arr:v}))}/></${Field}>
  <${Field} label="Guide (optional)" id="tgd"><${Inp} id="tgd" value=${t.guide} onChange=${v=>setT(o=>({...o,guide:v}))} placeholder="Leave empty if no guide is assigned"/></${Field}>
  <${Field} label="Fee" id="tf"><${Sel} id="tf" value=${t.fee} onChange=${pickFee} opts=${[...fees.map(x=>[x.code,x.label+' ('+x.currency+' '+x.amount.toLocaleString('en-US')+')']),['','Other amount']]}/></${Field}>
  <${Field} label=${'Amount to charge ('+t.cur+')'} id="tch"><${Inp} id="tch" type="number" value=${t.charge} onChange=${v=>setT(o=>({...o,charge:v}))}/></${Field}>
  <${Field} label="Contact phone or email" id="tct"><${Inp} id="tct" value=${t.contact} onChange=${v=>setT(o=>({...o,contact:v}))}/></${Field}>
  <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} onClick=${()=>saveT(false)}>Save as draft</${Btn}><${Btn} kind="primary" onClick=${()=>saveT(true)}>Submit</${Btn}></div></div>`
 :html`<div className="form">
  <${Field} label="Type" id="ft"><${Sel} id="ft" value=${f.type} onChange=${v=>setF(o=>({...o,type:v,cat:v==='Income'?FIN_IN[0]:FIN_EX[0]}))} opts=${['Income','Expense']}/></${Field}>
  <${Field} label="Category" id="fc"><${Sel} id="fc" value=${f.cat} onChange=${v=>setF(o=>({...o,cat:v}))} opts=${f.type==='Income'?FIN_IN:FIN_EX}/></${Field}>
  <${Field} label="Date" id="fdt"><${Inp} id="fdt" type="date" value=${f.date} onChange=${v=>setF(o=>({...o,date:v}))}/></${Field}>
  <${Field} label="Amount (KES)" id="fa"><${Inp} id="fa" type="number" value=${f.amt} onChange=${v=>setF(o=>({...o,amt:v}))}/></${Field}>
  <${Field} label="Description" id="fd" wide=${true}><${Inp} id="fd" value=${f.desc} onChange=${v=>setF(o=>({...o,desc:v}))}/></${Field}>
  <${Field} label="Payment reference or receipt no." id="fr" wide=${true}><${Inp} id="fr" value=${f.ref} onChange=${v=>setF(o=>({...o,ref:v}))}/></${Field}>
  <p className="muted small wide">A finance entry is checked and approved by the Board. Entering it never approves it.</p>
  <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} onClick=${()=>saveF(false)}>Save as draft</${Btn}><${Btn} kind="primary" onClick=${()=>saveF(true)}>Submit for approval</${Btn}></div></div>`}</${Modal}>`;
};

const Tourism=()=>{
 const {tour,setTour,log,toast,can}=useApp();
 const [tab,setTab]=useState('book');const [open,setOpen]=useState(null);const [mk,setMk]=useState(false);const [ed,setEd]=useState(null);const [shown,setShown]=useState(false);
 const [pay,setPay]=useState({amt:'',method:'M-Pesa',tx:''});const write=can('tourism')==='w';
 const cur=open&&tour.find(t=>t.id===open);
 const record=()=>{const a=+pay.amt;if(!a){toast('Enter the amount received');return;}const recv=cur.recv+a;const st=recv>=cur.charge?'Paid':'Partially paid';const rc=newId('RC');setTour(t=>t.map(x=>x.id===cur.id?{...x,recv,status:st,method:pay.method,tx:pay.tx,receipt:rc,recon:'Awaiting reconciliation'}:x));log('Recorded payment','Tourism',cur.id+' '+money(a,cur.cur));toast('Payment recorded. Receipt '+rc);setPay({amt:'',method:'M-Pesa',tx:''});};
 const cancel=()=>{setTour(t=>t.map(x=>x.id===cur.id?{...x,status:'Cancelled'}:x));log('Cancelled booking','Tourism',cur.id);toast(cur.id+' cancelled');};
 const del=()=>{setTour(t=>t.filter(x=>x.id!==cur.id));setOpen(null);log('Deleted draft','Tourism',cur.id);toast('Draft deleted');};
 const byCat={};tour.filter(t=>t.status!=='Draft'&&t.status!=='Cancelled').forEach(t=>byCat[t.cat]=(byCat[t.cat]||0)+t.n);const byAct={};tour.forEach(t=>{if(t.cur!=='USD')byAct[t.act]=(byAct[t.act]||0)+t.recv;});
 const months={};tour.filter(t=>t.status!=='Draft'&&t.status!=='Cancelled'&&t.arr).forEach(t=>{const m=String(t.arr).slice(0,7);months[m]=(months[m]||0)+t.n;});
 const mk6=Object.keys(months).sort().slice(-8).map(m=>[m.slice(5)+'/'+m.slice(2,4),months[m]]);
 const outst=tour.filter(t=>['Partially paid','Unpaid'].includes(t.status)&&t.cur!=='USD').reduce((a,t)=>a+t.charge-t.recv,0);
 return html`<div><${PageHead} title="Tourism Management" sub="Visitors, activities, bookings and payments">${write&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>{setEd(null);setMk(true);}}>New entry</${Btn}>`}</${PageHead}>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['book','Bookings'],['rep','Reports']]}/>
 ${tab==='book'&&html`<${Card}><${Table} empty="No visitors recorded yet." sel=${open} onRow=${r=>{setOpen(r.id);setShown(false);}} cols=${[{h:'Booking',k:'id',cls:'mono'},{h:'Visitor or group',k:'name'},{h:'Type',k:'vtype',r:r=>r.vtype==='other'?(r.vother||'Other'):(VTYPES.find(v=>v[0]===r.vtype)||[0,''])[1]},{h:'Guests',k:'n',cls:'num'},{h:'Activity',k:'act'},{h:'Arrival',k:'arr'},{h:'Charged',k:'charge',cls:'num',r:r=>money(r.charge,r.cur)},{h:'Received',k:'recv',cls:'num',r:r=>money(r.recv,r.cur)},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`}]} rows=${tour}/></${Card}>`}
 ${tab==='rep'&&html`<div className="grid2"><${Card} title="Visitors per month">${mk6.length?html`<${BarChart} data=${mk6}/>`:html`<p className="muted">No visits recorded yet.</p>`}</${Card}><${Card} title="Guests by category">${Object.keys(byCat).length?html`<${HBars} data=${Object.entries(byCat)}/>`:html`<p className="muted">Nothing yet.</p>`}</${Card}><${Card} title="Income by activity" sub="Amount received, KES">${Object.values(byAct).some(v=>v>0)?html`<${HBars} data=${Object.entries(byAct).filter(a=>a[1]>0)} fmt=${KES} color="var(--c3)"/>`:html`<p className="muted">No payments yet.</p>`}</${Card}><${Card} title="Outstanding"><div className="kpis small"><${Kpi} label="Outstanding (KES bookings)" value=${KES(outst)}/></div></${Card}></div>`}
 <${Drawer} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.name:''} sub=${cur?cur.id+' · '+cur.act:''} foot=${cur&&cur.status==='Draft'&&write?html`<span className="btnrow"><${Btn} kind="danger" onClick=${del}>Delete draft</${Btn}><${Btn} kind="primary" onClick=${()=>{setEd({...cur,_k:'tourism'});setMk(true);}}>Edit draft</${Btn}></span>`:null}>${cur&&html`<${KV} rows=${[['Visitor type',cur.vtype==='other'?cur.vother||'Other':(VTYPES.find(v=>v[0]===cur.vtype)||[0,''])[1]],['Category',cur.cat+' · '+cur.nat],['Guests',cur.n],['Destination',cur.dest+' · '+bmuName(cur.bmu)],['Arrival',cur.arr],['Assigned guide',cur.guide||'None'],['Contact',cur.contact?(shown?cur.contact:html`<button className="link" onClick=${()=>setShown(true)}>Show contact</button>`):'—'],['Charged',money(cur.charge,cur.cur)],['Received',money(cur.recv,cur.cur)],['Receipt',cur.receipt||'—'],['Entered by',cur.by||'']]}/>
 ${write&&['Unpaid','Partially paid'].includes(cur.status)&&html`<h3 className="mini-h">Record payment</h3><div className="form"><${Field} label=${'Amount received ('+cur.cur+')'} id="pa1"><${Inp} id="pa1" type="number" value=${pay.amt} onChange=${v=>setPay(o=>({...o,amt:v}))}/></${Field}><${Field} label="Method" id="pm1"><${Sel} id="pm1" value=${pay.method} onChange=${v=>setPay(o=>({...o,method:v}))} opts=${['M-Pesa','Cash','Bank','Other']}/></${Field}><${Field} label="Payment reference" id="pt1" wide=${true}><${Inp} id="pt1" value=${pay.tx} onChange=${v=>setPay(o=>({...o,tx:v}))}/></${Field}></div><span className="btnrow"><${Btn} kind="primary" onClick=${record}>Record payment</${Btn}><${Btn} onClick=${cancel}>Cancel booking</${Btn}></span>`}`}</${Drawer}>
 <${EntryModal} open=${mk} onClose=${()=>{setMk(false);setEd(null);}} start="tourism" item=${ed}/></div>`;
};

const Finance=()=>{
 const {role,fin,setFin,tour,setTour,log,toast,can,donors,setDonors,user,account}=useApp();
 const [tab,setTab]=useState('led');const [open,setOpen]=useState(null);const [mk,setMk]=useState(false);const [ed,setEd]=useState(null);
 const write=can('finance')==='w';const approver=ROLES[role].approver||role==='admin';
 const cur=open&&fin.find(x=>x.id===open);
 const setSt=(s,msg)=>{if(s==='Approved'&&cur.by===user){toast('You entered this yourself. A different person must approve it.');return;}setFin(x=>x.map(e=>e.id===cur.id?{...e,status:s}:e));log(msg,'Finance',cur.id);toast(cur.id+': '+s);};
 const del=()=>{setFin(x=>x.filter(e=>e.id!==cur.id));setOpen(null);log('Deleted draft','Finance',cur.id);toast('Draft deleted');};
 const rec=t=>{setTour(x=>x.map(k=>k.id===t.id?{...k,recon:'Reconciled'}:k));log('Reconciled tourism payment','Finance',t.id);toast(t.id+' reconciled');};
 const pend=tour.filter(t=>t.recon==='Awaiting reconciliation');
 const ok=fin.filter(f=>f.status==='Approved'||f.status==='Submitted');
 const byCat={};fin.filter(f=>f.type==='Expense'&&f.status!=='Draft').forEach(f=>byCat[f.cat]=(byCat[f.cat]||0)+f.amt);
 const [dm,setDm]=useState(false);
 return html`<div><${PageHead} title="Finance & Donations" sub="Income, expenditure, budgets and donor records">${write&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>{setEd(null);setMk(true);}}>New entry</${Btn}>`}</${PageHead}>
 <${Notice} tone="info" title="Separation of duties">Entries are made by the Tourism and Finance Officer and approved by the Board. The person who entered a record cannot approve it.</${Notice}>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['led','Ledger'],['rec','Reconciliation ('+pend.length+')'],['don','Donations'],['bud','Budgets']]}/>
 ${tab==='led'&&html`<${Card}><${Table} empty="No finance entries yet." sel=${open} onRow=${r=>setOpen(r.id)} cols=${[{h:'Entry',k:'id',cls:'mono'},{h:'Date',k:'date'},{h:'Type',k:'type',r:r=>html`<${Chip} t=${r.type}/>`},{h:'Category',k:'cat'},{h:'Description',k:'desc'},{h:'Amount',k:'amt',cls:'num',r:r=>KES(r.amt)},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`}]} rows=${fin}/></${Card}>`}
 ${tab==='rec'&&html`<${Card} title="Tourism income waiting for reconciliation" sub="Tourism payments feed Finance. They are not reconciled automatically."><${Table} empty="Nothing waiting. All tourism payments are reconciled." cols=${[{h:'Booking',k:'id',cls:'mono'},{h:'Group',k:'name'},{h:'Received',k:'recv',cls:'num',r:r=>money(r.recv,r.cur)},{h:'Method / ref',k:'m',r:r=>r.method+(r.tx?' · '+r.tx:'')},{h:'Receipt',k:'receipt'},{h:'',k:'a',r:r=>write?html`<${Btn} kind="small" onClick=${()=>rec(r)}>Reconcile</${Btn}>`:''}]} rows=${pend}/></${Card}>`}
 ${tab==='don'&&html`<${Registry} title="Donor records" idp="dn" items=${donors} setItems=${setDonors} canEdit=${write} log=${log} toast=${toast} empty="No donations recorded yet." fields=${[{k:'name',label:'Donor'},{k:'kind',label:'Type',opts:['One-time','Monthly','Grant','In kind'],def:'One-time'},{k:'amt',label:'Amount (KES)',type:'number',num:true,fmt:v=>KES(+v||0)},{k:'status',label:'Status',opts:['Pending','Confirmed'],def:'Pending',fmt:v=>html`<${Chip} t=${v}/>`},{k:'last',label:'Date',type:'date',def:isoToday()}]}/>`}
 ${tab==='bud'&&html`<div className="grid2"><${Card} title="Budget used by project">${PROJECTS.filter(p=>p.budget>0).length?html`<ul className="plist">${PROJECTS.filter(p=>p.budget>0).map(p=>html`<li key=${p.id}><span>${p.name}<small>${KES(p.spent||0)} of ${KES(p.budget)}</small></span><${Progress} v=${Math.round((p.spent||0)/p.budget*100)} tone=${(p.spent||0)/p.budget>.8?'warn':''}/><b>${Math.round((p.spent||0)/p.budget*100)}%</b></li>`)}</ul>`:html`<p className="muted">No project budgets set. The Super Admin sets them in Conservation Projects.</p>`}</${Card}><${Card} title="Expenditure by category">${Object.keys(byCat).length?html`<${HBars} data=${Object.entries(byCat)} fmt=${KES} color="var(--c2)"/>`:html`<p className="muted">No expenditure recorded yet.</p>`}</${Card}></div>`}
 <${Drawer} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.id:''} sub=${cur?cur.desc:''} foot=${cur&&(cur.status==='Draft'&&write?html`<span className="btnrow"><${Btn} kind="danger" onClick=${del}>Delete draft</${Btn}><${Btn} kind="primary" onClick=${()=>{setEd({...cur,_k:'finance'});setMk(true);}}>Edit draft</${Btn}></span>`:cur.status==='Submitted'&&approver?html`<span className="btnrow"><${Btn} onClick=${()=>setSt('Rejected','Rejected finance entry')}>Reject</${Btn}><${Btn} kind="primary" icon="check" onClick=${()=>setSt('Approved','Approved finance entry')}>Approve entry</${Btn}></span>`:null)}>${cur&&html`<${KV} rows=${[['Date',cur.date],['Type',cur.type],['Category',cur.cat],['Amount',KES(cur.amt)],['Reference',cur.ref||'—'],['Entered by',cur.by||''],['Status',html`<${Chip} t=${cur.status}/>`]]}/>`}</${Drawer}>
 <${EntryModal} open=${mk} onClose=${()=>{setMk(false);setEd(null);}} start="finance" item=${ed}/></div>`;
};

/* ---------- Reports & Documents: built from the saved records ---------- */
const monthStart=()=>isoToday().slice(0,8)+'01';
const inRange=(iso,a,b)=>!iso||((!a||iso>=a)&&(!b||iso<=b));
const REPORT_TYPES=[
 {id:'patrol',name:'Patrol report',roles:['admin','board','fisheries','bmu','officer'],build:(c,a,b)=>{const l=(c.role==='bmu'?c.patrols.filter(p=>p.bmu===c.bmuId):c.patrols).filter(p=>p.status!=='Draft'&&inRange(patrolIso(p),a,b));return {kpis:[['Patrols',l.length],['Distance',l.reduce((x,p)=>x+(p.km||0),0).toFixed(1)+' km'],['Fisher checks',l.reduce((x,p)=>x+(p.enc||[]).length,0)]],head:['Reference','Date','Leader','Area','Status','Km'],rows:l.map(p=>[p.id,p.date,p.leader,p.area,p.status,(p.km||0).toFixed?(+p.km||0).toFixed(1):''])};}},
 {id:'incident',name:'Incident report',roles:['admin','board'],build:(c,a,b)=>{const l=c.incidents.filter(i=>inRange(i.iso||'',a,b));return {kpis:[['Incidents',l.length],['Referred',l.filter(i=>i.stage>=2).length],['Closed',l.filter(i=>i.stage===4).length]],head:['Reference','Date','Category','Reported by','Stage'],rows:l.map(i=>[i.id,i.date,i.cat,i.ranger,STAGES[i.stage]||''])};}},
 {id:'lmma',name:'Iweni LMMA daily visit report',roles:['admin','board','fisheries','bmu'],build:(c)=>{const k=complianceOf(c.patrols,c.settings,30);return {kpis:[['Days visited',k.done+' of '+k.due],['Rate',k.rate===null?'—':k.rate+'%'],['Missed',k.missed.length]],head:['Date','Status','Patrols','Rangers'],rows:k.days.map(d=>[d.date,d.status,d.n,d.rangers.join(', ')])};}},
 {id:'coral',name:'Coral restoration monitoring',roles:['admin','board','fisheries','officer'],build:(c,a,b)=>{const l=c.coral.filter(x=>x.kind==='visit'&&inRange(x.date,a,b));const nm=id=>(c.coral.find(s=>s.id===id)||{}).name||'';return {kpis:[['Visits',l.length],['Avg survival',l.length?Math.round(l.reduce((x,v)=>x+v.surv,0)/l.length)+'%':'—']],head:['Date','Site','Survival %','Bleaching %','By'],rows:l.map(v=>[v.date,nm(v.site),v.surv,v.bl,v.by])};}},
 {id:'project',name:'Project progress report',roles:['admin','board','fisheries','officer'],build:(c)=>{const l=PROJECTS.filter(p=>c.role!=='officer'||mineOf(c.assign,c.account).includes(p.id));return {kpis:[['Projects',l.length]],head:['Project','Lead','Tasks done','Budget','Spent'],rows:l.map(p=>{const t=c.work.filter(w=>w.proj===p.id&&w.kind==='task');return [p.name,p.lead||'',t.filter(taskDone).length+' of '+t.length,p.budget||0,p.spent||0];})};}},
 {id:'tourism',name:'Tourism report',roles:['admin','board','tourfin'],build:(c,a,b)=>{const l=c.tour.filter(t=>t.status!=='Draft'&&inRange(t.arr,a,b));return {kpis:[['Bookings',l.length],['Guests',l.reduce((x,t)=>x+t.n,0)],['Received (KES)',KES(l.filter(t=>t.cur!=='USD').reduce((x,t)=>x+t.recv,0))]],head:['Booking','Visitor','Type','Guests','Arrival','Charged','Received','Status'],rows:l.map(t=>[t.id,t.name,t.vtype==='other'?t.vother:t.vtype,t.n,t.arr,money(t.charge,t.cur),money(t.recv,t.cur),t.status])};}},
 {id:'finance',name:'Financial report',roles:['admin','board','tourfin'],build:(c,a,b)=>{const l=c.fin.filter(f=>f.status==='Approved'&&inRange(f.date,a,b));const inc=l.filter(f=>f.type==='Income').reduce((x,f)=>x+f.amt,0),exp=l.filter(f=>f.type==='Expense').reduce((x,f)=>x+f.amt,0);return {kpis:[['Income',KES(inc)],['Expenditure',KES(exp)],['Net',KES(inc-exp)]],head:['Entry','Date','Type','Category','Description','Amount'],rows:l.map(f=>[f.id,f.date,f.type,f.cat,f.desc,f.amt])};}},
 {id:'boat',name:'Boat and equipment report',roles:['admin','cox'],build:(c,a,b)=>{const l=c.vlog.filter(v=>!v.draft&&inRange(v.date||'',a,b));return {kpis:[['Trips',l.length]],head:['Date','Boat','Departed','Arrived','Coxswain'],rows:l.map(v=>[v.date||'',v.boat||'',v.dep||'',v.arr||'',v.cox||v.by||''])};}},
];
const Reports=()=>{
 const ctx=useApp();const {role,settings,bmuId,log,toast,audit,can,patrols}=ctx;
 const [view,setView]=useState(null);const [fv,setFv]=useState(null);const [rng,setRng]=useState({a:monthStart(),b:isoToday()});
 const pii=piiOk(role,settings);
 const fl=can('patrols')?(role==='bmu'?patrols.filter(p=>p.bmu===bmuId):patrols).filter(p=>(p.enc||[]).length||p.status==='Completed'):[];
 const codes=(LOOK.infringements||[]);
 const agg=codes.map(i=>{const es=fl.flatMap(p=>(p.enc||[]).filter(e=>String(e.code)===i.code));return {id:'c'+i.code,code:i.code,name:i.label,cases:es.length,people:new Set(es.map(e=>e.name)).size,seized:es.filter(e=>e.seized).length};}).filter(r=>r.cases);
 const compl=fl.flatMap(p=>p.enc||[]).filter(e=>!e.code).length;
 const list=REPORT_TYPES.filter(r=>r.roles.includes(role));
 const blocked=(role==='fisheries'&&!settings.fishDl)||(role==='bmu'&&!settings.bmuDl);
 const out=view?view.build(ctx,rng.a,rng.b):null;
 const csv=()=>{saveCSV(view.id+'-'+rng.a+'-to-'+rng.b+'.csv',[out.head,...out.rows]);log('Report download',  'Reports',view.name+' CSV');toast('CSV saved');};
 const prt=()=>{const el=document.getElementById('rptprint');if(el)printNode(el);log('Report download','Reports',view.name+' print');};
 const hist=audit.filter(a=>/download|Report/i.test(a[2])).slice(0,8);
 return html`<div><${PageHead} title="Reports & Documents" sub=${role==='bmu'?'Authorised reports for '+bmuName(bmuId):'Generate, view and download authorised reports'}/>
 ${blocked&&html`<${Notice} tone="warn" title="Download is switched off for your role">You can view authorised reports. The Super Admin controls whether ${role==='bmu'?'BMU Representatives':'the Fisheries Officer'} can download them.</${Notice}>`}
 <${Card} title="Reports" sub="Built from the saved records for the dates you choose"><div className="form"><${Field} label="From" id="rf"><${Inp} id="rf" type="date" value=${rng.a} onChange=${v=>setRng(o=>({...o,a:v}))}/></${Field}><${Field} label="To" id="rt"><${Inp} id="rt" type="date" value=${rng.b} onChange=${v=>setRng(o=>({...o,b:v}))}/></${Field}></div>
 <${Table} cols=${[{h:'Report',k:'name'},{h:'',k:'a',cls:'act',r:r=>html`<${Btn} kind="small" icon="eye" onClick=${()=>setView(r)}>Open</${Btn}>`}]} rows=${list}/></${Card}>
 ${fl.length>0&&html`<${Card} title="Patrol forms" sub="Form 1A, the BMU Patrol Reporting Form, the Seizure Form and the MCS Outcome sheet, generated from each patrol record" right=${!blocked&&html`<${Btn} kind="small" icon="download" onClick=${()=>{saveCSV('pops-form-1A-all-patrols.csv',encRows(fl,pii));log('Report download','Reports','Form 1A rows CSV');toast('CSV saved');}}>Export all Form 1A rows (CSV)</${Btn}>`}><${Table} cols=${[{h:'Patrol',k:'id',cls:'mono'},{h:'Date',k:'date'},{h:'Leader',k:'leader'},{h:'Checks',k:'n',cls:'num',r:r=>(r.enc||[]).length},{h:'',k:'a',r:r=>html`<${Btn} kind="small" icon="eye" onClick=${()=>setFv(r.id)}>Open forms</${Btn}>`}]} rows=${fl}/></${Card}>`}
 <${Card} title="Infringements by type" sub="All patrols you can see. This is the summary the MCS outcome form asks for."><${Table} empty="No infringements recorded." cols=${[{h:'Code',k:'code',cls:'mono'},{h:'Infringement',k:'name'},{h:'Cases',k:'cases',cls:'num'},{h:'People',k:'people',cls:'num'},{h:'With seizure',k:'seized',cls:'num'}]} rows=${agg}/><p className="muted small">${compl} compliance checks with no infringement.</p></${Card}>
 ${role==='admin'&&html`<${Card} title="Download history" sub="Every download logs user, date and time, report name"><${Table} empty="No downloads yet." cols=${[{h:'User',k:'1',r:r=>r[1]},{h:'Date and time',k:'0',r:r=>r[0]},{h:'Report',k:'4',r:r=>r[4]}]} rows=${hist.map((h,i)=>Object.assign([...h],{id:i}))}/></${Card}>`}
 <${Modal} wide=${true} open=${!!fv} onClose=${()=>setFv(null)} title=${fv||''}>${fv&&html`<${PatrolForms} key=${fv} p=${patrols.find(p=>p.id===fv)}/>`}</${Modal}>
 <${Modal} wide=${true} open=${!!view} onClose=${()=>setView(null)} title=${view?view.name:''}>${view&&out&&html`<div id="rptprint" className="paper"><div className="pp-head"><img className="pp-logo" src="logo-sm.png" alt="Patte Conservation"/><small>Patte Conservation · Iweni LMMA · POps</small><h3>${view.name}</h3><p>${rng.a} to ${rng.b}</p></div><div className="kpis small">${out.kpis.map(k=>html`<${Kpi} key=${k[0]} label=${k[0]} value=${String(k[1])}/>`)}</div><${Table} empty="No records for these dates." cols=${out.head.map((h,i)=>({h,k:String(i),r:r=>String(r[i])}))} rows=${out.rows.map((r,i)=>Object.assign([...r],{id:i}))}/></div>
  ${!blocked&&html`<div className="btnrow"><${Btn} icon="download" onClick=${csv}>Download CSV</${Btn}>${window.POPS_PWA&&html`<${Btn} icon="download" onClick=${prt}>Print or save as PDF</${Btn}>`}</div>`}`}</${Modal}></div>`;
};

/* ---------- Settings & Permissions ---------- */
const SYM={w:['Create / edit','good'],s:['Own or assigned','info'],r:['Read only','neutral']};
const Permissions=()=>{
 const {settings,setSettings,assign,setAssign,log,toast,projects}=useApp();
 const [tab,setTab]=useState('roles');
 const tg=(k,label)=>v=>{setSettings(s=>({...s,[k]:v}));log('Changed setting: '+label+' = '+(v?'on':'off'),'Settings & Permissions',k);toast(label+': '+(v?'on':'off'));};
 const mine=id=>assign[id]||[];
 const flip=(o,p)=>{const has=mine(o.id).includes(p.id);setAssign(a=>({...a,[o.id]:has?mine(o.id).filter(x=>x!==p.id):[...mine(o.id),p.id]}));log(has?'Revoked project access':'Assigned officer to project','Settings & Permissions',o.name+' / '+p.name);toast(has?o.name+' no longer has access to '+p.name:o.name+' can now open '+p.name);};
 const pub=settings.pub||{a:false,b:false,c:false};
 const rk=Object.keys(ROLES);
 return html`<div><${PageHead} title="Settings & Permissions" sub="Roles, project access, downloads and security"/>
 <${Tabs} value=${tab} onChange=${setTab} tabs=${[['roles','Roles and modules'],['proj','Project access'],['dl','Downloads and sharing'],['sys','Security and system']]}/>
 ${tab==='roles'&&html`<${Card} title="Who can do what" sub="Enforced by the server and database, not by hiding menus"><div className="tscroll"><table className="tbl matrix"><thead><tr><th>Module</th>${rk.map(k=>html`<th key=${k} className="mc">${ROLES[k].label}</th>`)}</tr></thead><tbody>${MODS.map(m=>html`<tr key=${m.id}><td>${m.label}</td>${rk.map(k=>{const v=ROLES[k].mods[m.id];return html`<td key=${k} className="mc">${v?html`<${Chip} t=${SYM[v][0]} tone=${SYM[v][1]} dot=${false}/>`:html`<span className="muted">–</span>`}</td>`;})}</tr>`)}</tbody></table></div><p className="muted small">Create and manage accounts in Staff & Users.</p></${Card}>`}
 ${tab==='proj'&&html`<${Card} title="Conservation Officer project assignments" sub="An officer can only open projects ticked here. Officers cannot assign themselves or each other.">${OFFICERS.length&&PROJECTS.length?html`<div className="tscroll"><table className="tbl matrix"><thead><tr><th>Officer</th>${PROJECTS.map(p=>html`<th key=${p.id} className="mc">${p.code}</th>`)}</tr></thead><tbody>${OFFICERS.map(o=>html`<tr key=${o.id}><td>${o.name}</td>${PROJECTS.map(p=>html`<td key=${p.id} className="mc"><${Toggle} on=${mine(o.id).includes(p.id)} onChange=${()=>flip(o,p)} label=${o.name+' on '+p.name}/></td>`)}</tr>`)}</tbody></table></div><p className="muted small">${PROJECTS.map(p=>p.code+' = '+p.name).join(' · ')}</p>`:html`<p className="muted">Create a project and a Conservation Officer account first.</p>`}</${Card}>`}
 ${tab==='dl'&&html`<div className="grid2"><${Card} title="Field rules" sub="How rangers start patrols on their phones."><ul className="sharelist"><li><span>Alert the office when a running patrol has not updated for (minutes)</span><${Inp} id="al-silent" type="number" value=${settings.alertSilentMin||10} onChange=${v=>setSettings(s=>({...s,alertSilentMin:Math.max(2,+v||10)}))}/></li><li><span>Alert when a patrol has been open longer than (hours)</span><${Inp} id="al-long" type="number" value=${settings.alertLongHrs||8} onChange=${v=>setSettings(s=>({...s,alertLongHrs:Math.max(1,+v||8)}))}/></li><li><span>Alert when a patrol stays paused longer than (minutes)</span><${Inp} id="al-pause" type="number" value=${settings.alertPauseMin||30} onChange=${v=>setSettings(s=>({...s,alertPauseMin:Math.max(5,+v||30)}))}/></li><li><span>Rangers may start a patrol that was not planned for them (recorded as unplanned)</span><${Toggle} id="t-adhoc" on=${settings.adhocPatrol!==false} onChange=${tg('adhocPatrol','Rangers start unplanned patrols')} label="Rangers may start unplanned patrols"/></li></ul></${Card}><${Card} title="Report downloads" sub="Two independent settings. Neither grants editing, approving or administrative rights."><ul className="sharelist"><li><span>Allow BMU Representatives to download reports</span><${Toggle} id="t-bmu" on=${settings.bmuDl} onChange=${tg('bmuDl','BMU Representatives download')} label="Allow BMU Representatives to download reports"/></li><li><span>Allow the Fisheries Officer to download reports</span><${Toggle} id="t-fish" on=${settings.fishDl} onChange=${tg('fishDl','Fisheries Officer download')} label="Allow the Fisheries Officer to download reports"/></li><li><span>Show fisher ID and phone numbers to BMU Representatives</span><${Toggle} id="t-pii" on=${settings.piiBmu} onChange=${tg('piiBmu','BMU sees fisher identity')} label="Show fisher ID and phone to BMU Representatives"/></li></ul></${Card}>
 <${Card} title="Public website" sub="patteconservation.com stays separate. Only approved items are shared."><ul className="sharelist">${[['a','Restoration milestones (approved summaries)'],['b','Tourism packages and visitor code of conduct'],['c','Annual impact summary']].map(r=>html`<li key=${r[0]}><span>${r[1]}</span><${Toggle} on=${!!pub[r[0]]} onChange=${v=>{setSettings(s=>({...s,pub:{...pub,[r[0]]:v}}));log('Changed public website sharing','Settings & Permissions',r[1]);}} label=${r[1]}/></li>`)}</ul></${Card}></div>`}
 ${tab==='sys'&&html`<div className="grid2"><${Card} title="Security"><${KV} rows=${[['Sign-in','Individual accounts. The Super Admin creates them and sets a temporary password.'],['Passwords','Stored as salted hashes. Changed at first sign-in.'],['Sessions','Expire after 12 hours. Deactivating a user ends their session.'],['Failed sign-ins','Temporarily blocked after repeated failures'],['Audit','Every change is recorded with user and time']]}/></${Card}>
 <${Card} title="Left out on purpose"><ul className="ticks x"><li>No Fisheries Monitoring module</li><li>No landing-site activity, fish catch, species, weight or effort forms</li><li>No automatic cross-project access for officers</li><li>No automatic access for external partners</li><li>No automatic public sharing of internal records</li><li>No automatic financial approval</li></ul></${Card}></div>`}
 </div>`;
};

/* ---------- Audit Trail ---------- */
const Audit=()=>{
 const {audit}=useApp();const [q,setQ]=useState('');const [m,setM]=useState('All');
 const mods=['All',...Array.from(new Set(audit.map(a=>a[3])))];
 const rows=audit.map((a,i)=>({id:i,t:a[0],u:a[1],a:a[2],m:a[3],r:a[4]})).filter(r=>(m==='All'||r.m===m)&&(r.u+r.a+r.r).toLowerCase().includes(q.toLowerCase()));
 return html`<div><${PageHead} title="Audit Trail" sub="Who did what, when, and to which record"/>
 <${Notice} tone="info" title="Read-only">Entries cannot be edited or deleted. Changes made on this device in this session appear at the top.</${Notice}>
 <${Card}><div className="toolbar"><div className="search"><${Icon} n="search" s=${16}/><input aria-label="Search audit trail" placeholder="Search user, action or record" value=${q} onChange=${e=>setQ(e.target.value)}/></div><select aria-label="Filter by module" value=${m} onChange=${e=>setM(e.target.value)}>${mods.map(x=>html`<option key=${x}>${x}</option>`)}</select></div>
 <${Table} empty="No activity recorded yet." cols=${[{h:'Date and time',k:'t',cls:'nowrap'},{h:'User',k:'u'},{h:'Action',k:'a'},{h:'Module',k:'m'},{h:'Record',k:'r',cls:'mono'}]} rows=${rows}/></${Card}></div>`;
};
