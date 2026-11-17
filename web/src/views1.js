/* ============ views part 1: dashboards, map, patrols, incidents, ranger app ============ */
const incItem=i=>({id:i.id,layer:'incidents',x:i.x!=null?i.x:proj(i.lat,i.lon)[0],y:i.y!=null?i.y:proj(i.lat,i.lon)[1],title:i.cat,when:i.date,team:i.ranger+' ('+i.patrol+')',desc:i.desc,status:STAGES[i.stage],follow:i.action+(i.ref!=='None'?'. Referral: '+i.ref:''),loc:i.loc,ref:i.id});
const Photos=({imgs})=>imgs&&imgs.length?html`<div className="photos">${imgs.map((src,i)=>html`<a key=${i} className="ph" href=${src} target="_blank" rel="noopener"><img src=${src} alt=${'Photograph '+(i+1)}/></a>`)}</div>`:html`<p className="muted small">No photographs attached.</p>`;

/* which map content a role may see */
const useMapData=()=>{
 const {role,incidents,assign,bmuId,patrols,account,coral}=useApp();
 const me=account.name;
 const allowed=LAYER_ACCESS[role]||[];
 const vis=p=>role==='admin'||role==='board'||role==='fisheries'||(role==='bmu'&&p.bmu===bmuId)||(role==='ranger'&&(p.rangers||[]).includes(me))||(role==='cox'&&p.cox===me);
 const tracks=patrols.filter(p=>p.track&&p.track.length>1&&p.status!=='Draft'&&vis(p)).map(p=>({id:p.id,status:p.status,bmu:p.bmu,ll:p.track}));
 const inc=((role==='admin'||role==='board')?incidents:role==='ranger'?incidents.filter(i=>i.ranger===me):[]).filter(i=>i.x!=null||i.lat!=null);
 const sites=(coral||[]).filter(c=>c.kind==='site'&&c.lat!=null&&c.lon!=null&&allowed.includes('restoration')).filter(c=>role!=='officer'||(assign[account.id]||[]).length).map(c=>{const [x,y]=proj(c.lat,c.lon);return {id:c.id,layer:'restoration',x,y,title:c.name,when:c.date,team:c.team||'',desc:c.desc||c.meth||'',status:'Logged',follow:''};});
 const act=allowed.includes('activity'),rg=allowed.includes('rangers')||allowed.includes('boats');
 const pItems=patrols.filter(p=>p.status!=='Draft'&&vis(p)).flatMap(p=>patrolItems(p,{activity:act})).filter(i=>(i.layer==='rangers'||i.layer==='boats')?rg:act);
 return {allowed,tracks,items:[...sites,...inc.map(incItem),...pItems]};
};

/* ---------- what happened on a patrol: timeline and map items ---------- */
const EVL={start:'Patrol started',pause:'Paused',resume:'Resumed',stop:'Patrol stopped',submit:'Submitted for review',draft:'Saved as draft',offline:'Network lost',online:'Network back',gps_lost:'GPS lost',gps_ok:'GPS back',obs:'Observation',check:'Fisher check',seizure:'Check with seizure',incident:'Incident',photo:'Photograph'};
const hmOf=iso=>{const d=new Date(iso);return isNaN(d)?'':pad(d.getHours())+':'+pad(d.getMinutes());};
const evList=p=>{const ev=(p.events||[]).slice();if(ev.length)return ev;/* older records: rebuild from the lists */const o=[];if(p.start)o.push({t:'',k:'start',n:'Started '+p.start,ll:p.track&&p.track[0]||null});(p.obsList||[]).forEach(x=>o.push({t:'',k:'obs',n:x.type+(x.time?' '+x.time:''),ll:x.ll||null}));(p.enc||[]).forEach(x=>o.push({t:'',k:x.seized?'seizure':'check',n:x.name||'',ll:x.ll||null}));(p.incList||[]).forEach(x=>o.push({t:'',k:'incident',n:x.cat||'',ll:x.ll||null}));return o;};
const patrolItems=(p,o={})=>{
 const out=[];const evs=evList(p);const lastLL=(p.track&&p.track.length?p.track[p.track.length-1]:null)||evs.slice().reverse().map(e=>e.ll).find(Boolean)||null;
 if(['Active','Paused'].includes(p.status)&&lastLL){const [x,y]=proj(lastLL[0],lastLL[1]);const age=p.seen?(Date.now()-new Date(p.seen))/60000:null;const stale=age!=null&&age>3;
  out.push({id:'rg-'+p.id,layer:'rangers',x,y,title:(p.leader||'Ranger')+(p.status==='Paused'?' (paused)':' (live)'),when:p.seen?'Last update '+hmOf(p.seen):'Started '+p.start,team:(p.rangers||[]).join(', '),desc:p.id+' · '+(p.area||'—')+(p.km?' · '+p.km.toFixed(1)+' km':'')+(stale?' · no update for '+Math.round(age)+' min (out of network?)':''),status:p.status==='Paused'?'Paused':stale?'Overdue':'Active',follow:'Open patrol '+p.id+' for the full timeline'});
  if(p.boat)out.push({id:'bt-'+p.id,layer:'boats',x,y,title:p.boat+' (on patrol)',when:'Left at '+p.start,team:(p.cox?p.cox+' (coxswain), ':'')+(p.rangers||[]).join(', '),desc:'Patrol '+p.id,status:'Active',follow:'The trip is added to the vessel log when the patrol ends.'});}
 if(o.activity)evs.forEach((e,i)=>{if(['pause','resume','stop','offline','online','gps_lost','gps_ok','obs','check','seizure','incident','photo','start'].indexOf(e.k)<0)return;const ll=e.ll||(e.k==='start'&&p.track&&p.track[0]);if(!ll)return;const [x,y]=proj(ll[0],ll[1]);out.push({id:'ev-'+p.id+'-'+i,layer:'activity',x,y,title:EVL[e.k]||e.k,when:(e.t?hmOf(e.t)+', ':'')+p.date,team:p.leader+(p.cox?', coxswain '+p.cox:''),desc:(e.n||'')+' ('+p.id+')',status:p.status,follow:''});});
 return out;
};

const PatrolTimeline=({p})=>{
 const ev=evList(p);
 if(!ev.length)return html`<p className="muted">No events were recorded for this patrol.</p>`;
 const gap=(i)=>{const e=ev[i];const pair={offline:'online',gps_lost:'gps_ok'}[e.k];if(!pair||!e.t)return '';const n=ev.slice(i+1).find(x=>x.k===pair);if(!n||!n.t)return ' (still out)';const m=Math.round((new Date(n.t)-new Date(e.t))/60000);return ' (back after '+(m<1?'under a minute':m+' min')+')';};
 const bad=ev.filter(e=>e.k==='offline'||e.k==='gps_lost').length;
 return html`<div>${bad>0&&html`<${Notice} tone="warn" title=${bad+' interruption'+(bad>1?'s':'')}>The ranger lost network or GPS during this patrol. Records were kept on the phone and sent when the signal returned.</${Notice}>`}
 <ol className="tline">${ev.map((e,i)=>html`<li key=${i} className=${'tl-'+(e.k==='offline'||e.k==='gps_lost'?'bad':e.k==='online'||e.k==='gps_ok'?'ok':'')}><time>${e.t?hmOf(e.t):'—'}</time><b>${EVL[e.k]||e.k}</b><span>${e.n||''}${gap(i)}</span></li>`)}</ol></div>`;
};

/* ---------- progress alerts for patrols in the field ---------- */
const ALERT_DEF={silentMin:10,longHrs:8,pauseMin:30,lateMin:30};
const alertCfg=st=>({silentMin:+(st&&st.alertSilentMin)||ALERT_DEF.silentMin,longHrs:+(st&&st.alertLongHrs)||ALERT_DEF.longHrs,pauseMin:+(st&&st.alertPauseMin)||ALERT_DEF.pauseMin,lateMin:ALERT_DEF.lateMin});
const startMs=p=>{const iso=patrolIso(p);if(!iso)return null;const t=/^(\d{1,2}):(\d{2})/.exec(p.start||'');const d=new Date(iso+'T'+(t?pad(+t[1])+':'+t[2]:'00:00')+':00');return isNaN(d)?null:d.getTime();};
const durTxt=m=>m<60?Math.round(m)+' min':(m/60).toFixed(1).replace(/\.0$/,'')+' h';
const progressAlerts=(patrols,settings,now=Date.now())=>{
 const c=alertCfg(settings);const out=[];
 patrols.forEach(p=>{
  const st=startMs(p);const who=p.leader||'Ranger';
  if(['Active','Paused'].includes(p.status)){
   const open=st?(now-st)/60000:0;
   if(st&&open>c.longHrs*60)out.push({id:'long-'+p.id,level:open>24*60?'crit':'warn',kind:'Open too long',patrol:p,text:p.id+' ('+who+') has been open for '+durTxt(open)+'. Check that the ranger is safe, or close the patrol if it was left open.'});
   if(p.status==='Active'&&p.seen){const q=(now-new Date(p.seen))/60000;if(q>c.silentMin)out.push({id:'silent-'+p.id,level:q>c.silentMin*3?'crit':'warn',kind:'No update',patrol:p,text:'No update from '+who+' for '+durTxt(q)+' on '+p.id+'. The phone may be out of network or switched off.'});}
   if(p.status==='Paused'){const last=(p.events||[]).slice().reverse().find(e=>e.k==='pause');const q=last&&last.t?(now-new Date(last.t))/60000:0;if(q>c.pauseMin)out.push({id:'pause-'+p.id,level:'warn',kind:'Paused',patrol:p,text:p.id+' ('+who+') has been paused for '+durTxt(q)+'.'});}
  }
  if(p.status==='Planned'&&st&&now-st>c.lateMin*60000)out.push({id:'late-'+p.id,level:'info',kind:'Not started',patrol:p,text:p.id+' was planned for '+p.date+(p.start?', '+p.start:'')+' and '+who+' has not started it.'});
 });
 return out.sort((a,b)=>({crit:0,warn:1,info:2}[a.level]-{crit:0,warn:1,info:2}[b.level]));
};

/* ---------- Live Operations Map ---------- */
const LiveMap=()=>{
 const {role,bmuId}=useApp();
 const {allowed,tracks,items}=useMapData();
 const [layers,setLayers]=useState(allowed);
 useEffect(()=>setLayers(allowed),[role]);
 const [sel,setSel]=useState(null);
 const tog=id=>setLayers(l=>l.includes(id)?l.filter(x=>x!==id):[...l,id]);
 const pick=i=>setSel(i.pt?{...i,title:'Boundary point '+i.pt.n,when:'Supplied coordinate',team:'',desc:i.pt.lat+', '+i.pt.lon,status:'Logged',follow:''}:i);
 const loc=i=>{if(i.loc==='sensitive'&&role==='board')return 'Restricted. Exact enforcement coordinates are limited to the Super Admin and the reporting ranger.';const [la,lo]=unproj(i.x,i.y);return toDMS(la,'N','S')+' / '+toDMS(lo,'E','W');};
 return html`<div>
 <${PageHead} title="Live Operations Map" sub="Iweni LMMA and surrounding waters. You only see the layers your role allows."/>
 ${allowed.length===0?html`<${Denied} mod="The Live Operations Map" role=${role}/>`:html`
 <div className="mapgrid">
  <div className="mapcol">
   <div className="mapbar"><div className="chips">${LAYERS.map(l=>html`<button key=${l.id} className=${'fchip '+(layers.includes(l.id)?'on':'')+(allowed.includes(l.id)?'':' locked')} disabled=${!allowed.includes(l.id)} onClick=${()=>tog(l.id)} aria-pressed=${layers.includes(l.id)} title=${allowed.includes(l.id)?'':'Not available for this role'}>${!allowed.includes(l.id)&&html`<${Icon} n="lock" s=${12}/>`}${l.label}</button>`)}</div>
   </div>
   <div className="mapbox big"><${OpsMap} layers=${layers} items=${items} tracks=${tracks} sel=${sel&&sel.id} onSel=${pick} showPts=${layers.includes("zones")} points=${LMMA_PTS}/>
</div>
   <div className="mapfoot"><${MapLegend} layers=${layers}/><${OfflineMapBtn} base="sat"/></div>
  </div>
  <aside className="mapside">
   ${sel?html`<${Card} title=${sel.title} right=${html`<button className="iconbtn" aria-label="Clear selection" onClick=${()=>setSel(null)}><${Icon} n="x" s=${16}/></button>`}>
    <${KV} rows=${[['Date and time',sel.when],['Location',loc(sel)],['Assigned team',sel.team],['Description',sel.desc],['Status',html`<${Chip} t=${sel.status}/>`],['Follow-up actions',sel.follow]]}/>
</${Card}>`:
   html`<${Card} title="Select a map item"><p className="muted">Click a marker or a track to see its date and time, location, assigned team, description, photographs, status and follow-up actions.</p>
   <h3 className="mini-h">Your access</h3><p className="muted small">${({admin:'Full authorized visibility.',board:'Full oversight. Exact enforcement locations are generalised.',ranger:'Assigned operational information only.',cox:'Patrols and boats you support.',officer:'Assigned project information only.',fisheries:'Permitted all-project and patrol visibility. Incidents are not shown.',bmu:'Permitted patrol and LMMA information for '+bmuName(bmuId)+'.'})[role]}</p></${Card}>`}
  </aside>
 </div>`}
 </div>`;
};

/* ---------- Dashboards ---------- */
const Attn=({items})=>items.length?html`<ul className="attn">${items.map((a,i)=>html`<li key=${i}><span><${Chip} t=${a[0]} tone=${a[1]}/> ${a[2]}</span><button className="link" onClick=${a[3]}>${a[4]}<${Icon} n="chev" s=${14}/></button></li>`)}</ul>`:html`<p className="muted">Nothing needs attention right now.</p>`;
const MiniMap=({layers=['zones','patrols','incidents','boats'],h=320})=>{const {go}=useApp();const d=useMapData();return html`<div className="mapbox mini"><${OpsMap} layers=${layers.filter(l=>d.allowed.includes(l))} items=${d.items} tracks=${d.tracks} sel=${null} onSel=${()=>go('live-map')} locked=${true} compact=${true} height=${h}/><button className="btn small floating" onClick=${()=>go('live-map')}>Open full map</button></div>`;};
const weekKey=iso=>{const d=new Date(iso+'T00:00:00Z');const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return 'W'+pad(Math.ceil(((t-y0)/864e5+1)/7));};
const NoteBox=({children})=>html`<p className="muted small">${children}</p>`;

const DashAdmin=()=>{
 const {role,patrols,incidents,fin,tour,go,audit,fleet,settings}=useApp();
 const real=patrols.filter(p=>p.status!=='Draft');
 const open=incidents.filter(i=>i.stage<4).length;
 const pend=patrols.filter(p=>p.review==='Pending review').length;
 const appr=fin.filter(f=>f.status==='Submitted').length;
 const cats={};incidents.forEach(i=>cats[i.cat]=(cats[i.cat]||0)+1);
 const catData=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const tourIn=tour.filter(t=>t.cur!=='USD').reduce((a,t)=>a+t.recv,0);
 const month=isoToday().slice(0,7);const thisM=real.filter(p=>patrolIso(p).slice(0,7)===month).length;
 const wk={};real.forEach(p=>{const i=patrolIso(p);if(i)wk[weekKey(i)]=(wk[weekKey(i)]||0)+1;});const wdata=Object.keys(wk).sort().slice(-8).map(k=>[k,wk[k]]);
 const comp=complianceOf(patrols,settings,30);const al=svcAlerts(fleet);
 const att=role==='board'?[...(appr?[['Approval','warn',appr+' finance entr'+(appr===1?'y':'ies')+' waiting for approval',()=>go('finance'),'Review']]:[]),...(open?[['Open','info',open+' open incident'+(open===1?'':'s'),()=>go('incidents'),'Open']]:[])]:
 [...progressAlerts(patrols,settings).slice(0,5).map(a=>[a.kind,a.level==='crit'?'crit':a.level==='info'?'info':'warn',a.text,()=>go('patrols'),'Open']),...(comp.today.status==='pending'||comp.today.status==='missed'?[[comp.today.status==='missed'?'Missed':'Due','warn','No ranger has been inside the LMMA today',()=>go('iweni-lmma'),'Open']]:[]),...(pend?[['Review','warn',pend+' completed patrol'+(pend===1?'':'s')+' waiting for review',()=>go('patrols'),'Review']]:[]),...incidents.filter(i=>i.stage===0).slice(0,3).map(i=>['Review','crit','Incident '+i.id+' submitted',()=>go('incidents'),'Open']),...al.slice(0,3).map(a=>['Service',a.s==='over'?'crit':'warn',a.text,()=>go('boats'),'Open']),...(appr?[['Approval','info',appr+' finance entr'+(appr===1?'y':'ies')+' with the Board approver',()=>go('finance'),'View']]:[])];
 return html`<div>
 <${PageHead} title=${role==='board'?'Governance overview':'Organisation overview'} sub=${role==='board'?'Oversight view for the Board.':'Patte Conservation CBO · Pate Island, Lamu County'}>${role==='admin'&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>go('patrols')}>New patrol</${Btn}>`}</${PageHead}>
 <div className="kpis">
  <${Kpi} label="Patrols this month" value=${String(thisM)}/>
  <${Kpi} label="Active patrols now" value=${String(patrols.filter(p=>p.status==='Active').length)} note=${patrols.filter(p=>p.status==='Paused').length+' paused'}/>
  <${Kpi} label="LMMA visited today" value=${comp.today.status==='visited'?'Yes':comp.today.status==='not required'?'Not required':'Not yet'} tone=${comp.today.status==='visited'?'good':comp.today.status==='missed'?'crit':'warn'} note=${comp.rate===null?'':comp.rate+'% of days, last 30'}/>
  <${Kpi} label="Open incidents" value=${String(open)} note=${incidents.filter(i=>i.stage===0).length+' awaiting review'} tone=${open?'warn':''}/>
  <${Kpi} label="Tourism received" value=${KESk(tourIn)} note="all time, KES bookings"/>
  <${Kpi} label="Awaiting approval" value=${String(appr)} note="finance entries" tone=${appr?'warn':''}/>
 </div>
 <div className="grid2 lead">
  <${Card} title="Live operations" sub="Zones, patrols, incidents and boats" right=${html`<${Btn} kind="ghost small" onClick=${()=>go('live-map')}>Open map</${Btn}>`}><${MiniMap}/></${Card}>
  <${Card} title=${role==='board'?'Needs Board attention':'Needs your attention'}><${Attn} items=${att}/></${Card}>
 </div>
 <${ComplianceCard}/>
 <div className="grid3">
  <${Card} title="Patrols per week" sub="Last 8 weeks">${wdata.length?html`<${BarChart} data=${wdata}/>`:html`<${NoteBox}>No patrols recorded yet.</${NoteBox}>`}</${Card}>
  <${Card} title="Incidents by category" sub="All recorded incidents">${catData.length?html`<${HBars} data=${catData} color="var(--coral)"/>`:html`<${NoteBox}>No incidents recorded yet.</${NoteBox}>`}</${Card}>
  <${Card} title="Recent activity" sub="From the audit trail"><ul className="feed">${audit.slice(0,5).map((a,i)=>html`<li key=${i}><strong>${a[1]}</strong> ${String(a[2]).toLowerCase()}<small>${a[0]} · ${a[3]}</small></li>`)}${audit.length===0&&html`<li>No activity yet</li>`}</ul></${Card}>
 </div></div>`;
};

const DashRead=()=>{
 const {role,bmuId,go,patrols,work}=useApp();
 const mine=role==='bmu'?patrols.filter(p=>p.bmu===bmuId):patrols;
 const byBmu=BMUS.map(b=>[b.name.replace(' BMU',''),patrols.filter(p=>p.bmu===b.id).length]);
 const prog=p=>{const t=work.filter(w=>w.proj===p.id&&w.kind==='task');return t.length?Math.round(t.filter(taskDone).length/t.length*100):0;};
 return html`<div>
 <${PageHead} title=${role==='bmu'?bmuName(bmuId)+' dashboard':'Conservation overview'} sub=${role==='bmu'?'Read-only view of permitted patrol records and LMMA activity.':'Read-only view across all projects and permitted patrol records.'}/>
 <${Notice} tone="info" title="Read-only access">You can view permitted records. You cannot create, edit, delete or approve anything.${role==='fisheries'?' There is no fisheries monitoring or landing-site module in POps.':''}</${Notice}>
 <div className="kpis"><${Kpi} label="Patrols on record" value=${String(mine.length)}/><${Kpi} label="Completed" value=${String(mine.filter(p=>p.status==='Completed').length)}/><${Kpi} label="LMMA zones" value=${String(ZONE_SHAPES.length)}/>${role==='fisheries'&&html`<${Kpi} label="Projects" value=${String(PROJECTS.length)}/>`}</div>
 <div className="grid2">
  <${Card} title="Iweni LMMA" right=${html`<${Btn} kind="ghost small" onClick=${()=>go('live-map')}>Open map</${Btn}>`}><${MiniMap} layers=${['zones','patrols']} h=${290}/></${Card}>
  ${role==='fisheries'?html`<${Card} title="Project progress">${PROJECTS.length?html`<ul className="plist">${PROJECTS.map(p=>html`<li key=${p.id}><span>${p.name}</span><${Progress} v=${prog(p)}/><b>${prog(p)}%</b></li>`)}</ul>`:html`<${NoteBox}>No projects yet.</${NoteBox}>`}</${Card}>`:
  html`<${Card} title="Patrols by BMU area"><${HBars} data=${byBmu}/><p className="muted small">You see ${bmuName(bmuId)} records only. Shanga Ishakani and Shanga Rubu are always kept separate.</p></${Card}>`}
 </div>${role==='fisheries'&&html`<${ComplianceCard}/>`}</div>`;
};

const DashOfficer=()=>{
 const {assign,go,setProjOpen,account,work,user}=useApp();
 const mine=PROJECTS.filter(p=>mineOf(assign,account).includes(p.id));
 const myTasks=work.filter(w=>w.kind==='task'&&mine.some(p=>p.id===w.proj)&&w.who===user);
 const prog=p=>{const t=work.filter(w=>w.proj===p.id&&w.kind==='task');return t.length?Math.round(t.filter(taskDone).length/t.length*100):0;};
 return html`<div>
 <${PageHead} title="My project workspaces" sub="You only see projects the Super Admin has assigned to you."/>
 ${mine.length===0?html`<${Notice} tone="warn" title="No projects assigned">Ask the Super Admin to assign you to a project.</${Notice}>`:html`<div className="pcards">${mine.map(p=>html`<button key=${p.id} className="pcard" onClick=${()=>{setProjOpen(p.id);go('projects');}}><span className="pcode">${p.code}</span><h3>${p.name}</h3><p>${p.loc||''}</p><${Progress} v=${prog(p)}/><div className="pmeta"><span>${prog(p)}% complete</span><span>${p.due?'Due '+p.due:''}</span></div></button>`)}</div>`}
 <div className="grid2">
  <${Card} title="My tasks"><${Table} empty="No tasks assigned to you." cols=${[{h:'Task',k:'title'},{h:'Due',k:'due'},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`}]} rows=${myTasks}/></${Card}>
  <${Card} title="Outside your assignment"><p className="muted">${PROJECTS.length-mine.length} other project${PROJECTS.length-mine.length===1?'':'s'} exist. Their pages, records, documents and reports are not accessible to you. The database refuses the request even if a page address is typed in by hand.</p></${Card}>
 </div></div>`;
};

const DashTourFin=()=>{
 const {tour,fin,go,can}=useApp();
 const out=tour.filter(t=>['Partially paid','Unpaid'].includes(t.status)&&t.cur!=='USD').reduce((a,t)=>a+t.charge-t.recv,0);
 const inc=fin.filter(f=>f.type==='Income'&&f.status==='Approved').reduce((a,f)=>a+f.amt,0),exp=fin.filter(f=>f.type==='Expense'&&f.status==='Approved').reduce((a,f)=>a+f.amt,0);
 const drafts=[...tour.filter(t=>t.status==='Draft').map(t=>({id:t.id,what:'Visitor entry: '+t.name,go:'tourism'})),...fin.filter(f=>f.status==='Draft').map(f=>({id:f.id,what:'Finance entry: '+f.desc,go:'finance'}))];
 return html`<div><${PageHead} title="Tourism and finance" sub="Visitor bookings, payments and money entries">${can('tourism')==='w'&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>go('tourism')}>New entry</${Btn}>`}</${PageHead}>
 <div className="kpis"><${Kpi} label="Visitors recorded" value=${String(tour.filter(t=>t.status!=='Draft'&&t.status!=='Cancelled').reduce((a,t)=>a+t.n,0))}/><${Kpi} label="Outstanding balances" value=${KES(out)} tone=${out?'warn':''} note="KES bookings"/><${Kpi} label="Income approved" value=${KESk(inc)}/><${Kpi} label="Expenditure approved" value=${KESk(exp)}/><${Kpi} label="Sent to approver" value=${String(fin.filter(f=>f.status==='Submitted').length)} note="finance entries"/><${Kpi} label="To reconcile" value=${String(tour.filter(t=>t.recon==='Awaiting reconciliation').length)}/></div>
 <${Card} title="My drafts" sub="Saved but not yet submitted. Open them to edit."><${Table} empty="No drafts." onRow=${r=>go(r.go)} cols=${[{h:'Entry',k:'id',cls:'mono'},{h:'What',k:'what'}]} rows=${drafts}/></${Card}></div>`;
};

const DashCox=()=>{
 const {go,toast,log,fleet,account}=useApp();
 const me=account.name;
 const myB=BOATS.filter(b=>b.cox===me);const al=svcAlerts(fleet,myB.map(b=>b.name));
 const items=['Life jackets for all crew','Fire extinguisher charged','VHF radio tested','First aid kit present','Engine oil and fuel level checked','Bilge dry'];
 const [ck,setCk]=useState(items.map(()=>false));const [bt,setBt]=useState('');
 const boat=bt||(myB[0]&&myB[0].name)||'';
 return html`<div><${PageHead} title="Boat operations" sub="Assigned boat and patrol support"/>
 <div className="kpis"><${Kpi} label="Assigned boats" value=${String(myB.length)} note=${myB.map(b=>b.name).join(', ')}/><${Kpi} label="Engine service" value=${al.length?al.length+' alert'+(al.length>1?'s':''):'All clear'} note=${al.length?al[0].boat+(al.some(a=>a.s==='over')?' overdue':' due soon'):'no service due'} tone=${al.some(a=>a.s==='over')?'crit':al.length?'warn':'good'}/></div>
 ${myB.length===0&&html`<${Notice} tone="warn" title="No boat assigned">The Super Admin has not assigned a boat to you yet.</${Notice}>`}
 ${al.length>0&&html`<${Notice} tone=${al.some(a=>a.s==='over')?'crit':'warn'} title="Engine service alert">${al.map(a=>a.text).join('. ')}. <button className="link" onClick=${()=>go('boats')}>Open engines and service</button></${Notice}>`}
 ${myB.length>0&&html`<${Card} title="Engine hours and service" sub="Run hours since the last service, from the vessel log"><div className="engmini">${myB.flatMap(b=>(fleet[b.name]?fleet[b.name].engines:[]).map(e=>{const s=engSt(e),c=SVC_CHIP[s.s];return html`<div key=${b.name+e.id} className="engrow"><span><b>${b.name}</b> ${e.label}</span><span className="muted small">${s.since.toFixed(1)} of ${e.intervalH} h · ${e.hrs.toFixed(1)} h total</span><div className=${'eng-bar '+c[1]}><i style=${{width:s.pct+'%'}}/></div><${Chip} t=${c[0]} tone=${c[1]}/></div>`;}))}</div></${Card}>`}
 <div className="grid2">${myB.length>0&&html`<${Card} title="Pre-trip safety check" sub=${boat}>${myB.length>1&&html`<${Sel} id="sb" value=${boat} onChange=${setBt} opts=${myB.map(b=>b.name)}/>`}<ul className="checks">${items.map((t,i)=>html`<li key=${t}><label><input type="checkbox" checked=${ck[i]} onChange=${()=>setCk(c=>c.map((v,k)=>k===i?!v:v))}/> ${t}</label></li>`)}</ul>
  <${Btn} kind="primary" disabled=${!ck.every(Boolean)} onClick=${()=>{toast('Safety check recorded for '+boat);log('Recorded boat safety check','Boats & Equipment',boat);setCk(items.map(()=>false));}}>Save safety check</${Btn}>${!ck.every(Boolean)&&html`<p className="muted small">Tick every item to save.</p>`}</${Card}>`}
 <${Card} title="Trips and fuel" right=${html`<${Btn} kind="ghost small" onClick=${()=>go('boats')}>Record a trip</${Btn}>`}><p className="muted">Add a vessel log entry with times, places, engine hour meters and refuel, and report engine defects. You cannot see finance, enforcement or personnel records.</p></${Card}></div></div>`;
};

const Dashboard=()=>{const {role}=useApp();
 if(role==='ranger')return html`<${RangerHome}/>`;
 if(role==='cox')return html`<${DashCox}/>`;
 if(role==='officer')return html`<${DashOfficer}/>`;
 if(role==='tourfin')return html`<${DashTourFin}/>`;
 if(role==='fisheries'||role==='bmu')return html`<${DashRead}/>`;
 return html`<${DashAdmin}/>`;};

/* ---------- Patrols ---------- */
const PatrolForm=({onClose})=>{
 const {setPatrols,log,toast}=useApp();
 const rg=LOOK.rangers||[];
 const [f,setF]=useState({objective:'Surveillance',area:'Iweni LMMA',date:isoToday(),start:'06:00',leader:rg[0]?rg[0].name:'',boat:BOATS[0]?BOATS[0].name:'',cox:BOATS[0]?BOATS[0].cox||'':'',bmu:'pate',crew:[]});
 const s=k=>v=>setF(o=>({...o,[k]:v}));
 const save=()=>{if(!f.leader){toast('Choose the patrol leader. Create ranger accounts in Staff & Users first.');return;}const id=newId('PT');const d=new Date(f.date+'T12:00:00');const p={id,iso:f.date,objective:f.objective,date:`${pad(d.getDate())} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`,start:f.start,end:'—',leader:f.leader,rangers:[f.leader,...f.crew.filter(n=>n!==f.leader)],boat:f.boat,cox:f.cox,area:f.area,inLmma:/iweni|lmma/i.test(f.area),bmu:f.bmu,status:'Planned',review:'—',obs:0,inc:0,km:0,enc:[],seiz:[],equip:[],action:'—'};setPatrols(x=>[p,...x]);log('Created patrol','Patrols',id);toast(`Patrol ${id} created. It appears on ${f.leader}'s phone.`);onClose();};
 return html`<div className="form"><${Field} label="Patrol objective" id="po"><${Sel} id="po" value=${f.objective} onChange=${s('objective')} opts=${OBJECTIVES}/></${Field}><${Field} label="Patrol area" id="pa"><${Inp} id="pa" value=${f.area} onChange=${s('area')} placeholder="e.g. Iweni LMMA, northern edge"/></${Field}>
 <${Field} label="BMU area" id="pb"><${Sel} id="pb" value=${f.bmu} onChange=${s('bmu')} opts=${BMUS.map(b=>[b.id,b.name])}/></${Field}>
 <${Field} label="Date" id="pd"><${Inp} id="pd" type="date" value=${f.date} onChange=${s('date')}/></${Field}>
 <${Field} label="Start time" id="pt"><${Inp} id="pt" type="time" value=${f.start} onChange=${s('start')}/></${Field}>
 <${Field} label="Patrol leader" id="pl"><${Sel} id="pl" value=${f.leader} onChange=${s('leader')} opts=${[['','Choose'],...rg.map(r=>[r.name,r.name])]}/></${Field}>
 <${Field} label="Boat" id="pbt"><${Sel} id="pbt" value=${f.boat} onChange=${v=>setF(o=>({...o,boat:v,cox:(BOATS.find(b=>b.name===v)||{}).cox||o.cox}))} opts=${[['','No boat'],...BOATS.map(b=>b.name)]}/></${Field}>
 <${Field} label="Other rangers on this patrol" id="pcrew" wide=${true}><div className="checks">${rg.filter(r=>r.name!==f.leader).map(r=>html`<label key=${r.name} className="chk"><input type="checkbox" checked=${f.crew.includes(r.name)} onChange=${e=>setF(o=>({...o,crew:e.target.checked?[...o.crew,r.name]:o.crew.filter(n=>n!==r.name)}))}/> ${r.name}</label>`)}${rg.length<2&&html`<span className="muted small">No other rangers yet</span>`}</div></${Field}>
 <${Field} label="Coxswain" id="pc"><${Sel} id="pc" value=${f.cox} onChange=${s('cox')} opts=${[['','None'],...rg.map(r=>[r.name,r.name])]}/></${Field}>
 <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Create and assign</${Btn}></div></div>`;
};
const Patrols=()=>{
 const {role,patrols,setPatrols,bmuId,log,toast,can,settings}=useApp();
 const me=ROLES[role].user;
 const palerts=['admin','fisheries'].includes(role)?progressAlerts(patrols,settings):[];
 const [q,setQ]=useState('');const [st,setSt]=useState('All');const [open,setOpen]=useState(null);const [mk,setMk]=useState(false);const [dt,setDt]=useState('info');
 let list=patrols;
 if(role==='bmu')list=list.filter(p=>p.bmu===bmuId);
 if(role==='ranger')list=list.filter(p=>(p.rangers||[]).includes(me)||p.leader===me);
 if(role==='cox')list=list.filter(p=>p.cox===me);
 list=list.filter(p=>(st==='All'||p.status===st)&&(p.id+p.leader+p.area).toLowerCase().includes(q.toLowerCase()));
 const cur=open&&patrols.find(p=>p.id===open);
 const write=can('patrols')==='w';
 const [ed,setEd]=useState(false);const [dl,setDl]=useState(false);const adm=role==='admin';
 const delP=()=>{setPatrols(x=>x.filter(p=>p.id!==cur.id));log('Deleted patrol','Patrols',cur.id);toast('Patrol '+cur.id+' deleted');setDl(false);setOpen(null);};
 const review=()=>{setPatrols(x=>x.map(p=>p.id===cur.id?{...p,review:'Reviewed'}:p));log('Reviewed patrol','Patrols',cur.id);toast('Patrol '+cur.id+' marked as reviewed');};
 return html`<div><${PageHead} title="Patrols & Field Activities" sub=${role==='bmu'?'Permitted patrol records for '+bmuName(bmuId):role==='ranger'?'Your assigned patrols. Record new patrols from the mobile app on your Dashboard.':'Planned, active and completed ranger patrols'}>${write&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>setMk(true)}>Create patrol</${Btn}>`}</${PageHead}>
 ${palerts.map(a=>html`<${Notice} key=${a.id} tone=${a.level==='crit'?'crit':a.level==='info'?'info':'warn'} title=${a.kind}>${a.text}</${Notice}>`)}
 ${!write&&html`<${Notice} tone="info" title="Read-only">${role==='ranger'?'Patrol records are created from the field app.':'You can view these records but not change them.'}</${Notice}>`}
 <${Card}><div className="toolbar"><div className="search"><${Icon} n="search" s=${16}/><input aria-label="Search patrols" placeholder="Search reference, leader or area" value=${q} onChange=${e=>setQ(e.target.value)}/></div>
 <div className="chips">${['All','Planned','Active','Paused','Draft','Completed'].map(s=>html`<button key=${s} className=${'fchip '+(st===s?'on':'')} onClick=${()=>setSt(s)}>${s}</button>`)}</div></div>
 <${Table} sel=${open} onRow=${r=>{setOpen(r.id);setDt('info');}} cols=${[{h:'Reference',k:'id',cls:'mono'},{h:'Date',k:'date'},{h:'Patrol leader',k:'leader'},{h:'Area',k:'area'},{h:'Boat',k:'boat'},{h:'Km',k:'km',cls:'num',r:r=>r.km?r.km.toFixed(1):'—'},{h:'Checks',k:'enc',cls:'num',r:r=>(r.enc||[]).length||'—'},{h:'Infringements',k:'inf',cls:'num',r:r=>(r.enc||[]).filter(e=>e.code).length||'—'},{h:'Status',k:'status',r:r=>html`<${Chip} t=${r.status}/>`},{h:'Review',k:'review',r:r=>r.review==='—'?'—':html`<${Chip} t=${r.review}/>`}]} rows=${list}/></${Card}>
 <${Drawer} wide=${true} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.id:''} sub=${cur?cur.area:''} foot=${cur&&(adm||(write&&cur.review==='Pending review'))?html`<span className="btnrow">${adm&&html`<${Btn} kind="small" id="p-edit" onClick=${()=>setEd(true)}>Edit</${Btn}><${Btn} kind="small" id="p-del" onClick=${()=>setDl(true)}>Delete</${Btn}>`}${write&&cur.review==='Pending review'&&html`<${Btn} kind="primary" icon="check" onClick=${review}>Mark as reviewed</${Btn}>`}</span>`:null}>
 ${cur&&html`<${Tabs} tabs=${[['info','Summary and map'],['time','Timeline ('+evList(cur).length+')'],['forms','Forms ('+((cur.enc||[]).length)+' checks)']]} value=${dt} onChange=${setDt}/>`}
 ${cur&&dt==='time'&&html`<${PatrolTimeline} p=${cur}/>`}
 ${cur&&dt==='forms'&&html`<${PatrolForms} key=${cur.id} p=${cur}/>`}
 ${cur&&dt==='info'&&html`<${KV} rows=${[['Status',html`<${Chip} t=${cur.status}/>`],['Patrol date',cur.date],['Start / end time',cur.start+' / '+cur.end],['Patrol leader',cur.leader],['Participating rangers',(cur.rangers||[]).join(', ')],['Boat',cur.boat],['Coxswain',cur.cox],['BMU area',bmuName(cur.bmu)],['Objective',cur.objective],...(cur.imported?[['Observations (paper log)',cur.observations||'—'],['Challenges (paper log)',cur.challenges||'—'],['Action taken (paper log)',cur.action||'—'],['Source',cur.source]]:[]),['Fisher checks / infringements',(cur.enc||[]).length+' / '+(cur.enc||[]).filter(e=>e.code).length],['Items seized (Form DF/SZ)',(cur.seiz||[]).length],['Observations recorded',cur.obs],['Incidents reported',cur.inc],['Distance',cur.km?cur.km.toFixed(1)+' km':'—'],['Equipment used',cur.equip.length?cur.equip.join(', '):'—'],['Action taken',cur.action],['Review status',cur.review]]}/>
 <h3 className="mini-h">GPS track</h3>${(()=>{const t=cur.track&&cur.track.length>1?[{id:cur.id,status:cur.status,ll:cur.track}]:[];return t.length?html`<div className="mapbox"><${OpsMap} key=${cur.id} layers=${['zones','patrols','activity','rangers','boats']} items=${patrolItems(cur,{activity:true})} tracks=${t} sel=${null} fit="tracks" compact=${true} height=${260}/></div>`:html`<p className="muted small">${cur.status==='Planned'||cur.status==='Overdue'?'No track yet. GPS tracking only runs during an assigned and started patrol.':'No GPS track was recorded for this patrol.'}</p>`;})()}
 <h3 className="mini-h">Photographs</h3><${Photos} imgs=${(cur.photos||[]).map(p=>p.url)}/>
 <h3 className="mini-h">Scanned pages</h3><${ScanBox} rec=${cur} canEdit=${adm} set=${fn=>setPatrols(x=>x.map(q=>q.id===cur.id?fn(q):q))}/>`}
 </${Drawer}>
 <${Modal} wide=${true} open=${ed&&!!cur} onClose=${()=>setEd(false)} title=${cur?'Edit patrol '+cur.id:''}>${cur&&ed&&html`<${PatrolEdit} key=${cur.id} p=${cur} onClose=${()=>setEd(false)}/>`}</${Modal}>
 <${ConfirmDel} open=${dl} onClose=${()=>setDl(false)} what=${cur?'patrol '+cur.id:''} onYes=${delP}/>
 <${Modal} open=${mk} onClose=${()=>setMk(false)} title="Create and assign a patrol"><${PatrolForm} onClose=${()=>setMk(false)}/></${Modal}></div>`;
};

/* ---------- Incidents ---------- */
const REFER=['KWS','KFS','Fisheries Department','Police','County government','Other'];
const IncidentForm=({onClose})=>{
 const {setIncidents,log,toast,user}=useApp();
 const [f,setF]=useState({cat:INC_CATS[0],date:isoToday(),time:hhmm(),code:'',desc:'',unknown:false,persons:[{name:'',id:'',phone:''}],lat:'',lon:''});
 const u=k=>v=>setF(o=>({...o,[k]:v}));const sp=(i,k,v)=>setF(o=>({...o,persons:o.persons.map((x,j)=>j===i?{...x,[k]:v}:x)}));
 const save=()=>{if(!f.desc.trim()){toast('Describe what happened');return;}if(!f.unknown&&!f.persons.some(p=>p.name.trim())){toast('Add at least one person, or tick persons not identified');return;}
  const id=newId('INC');const la=f.lat===''?null:+f.lat,lo=f.lon===''?null:+f.lon;const xy=la!=null&&lo!=null?proj(la,lo):[null,null];const d=new Date(f.date+'T12:00:00');
  const pl=f.unknown?[]:f.persons.filter(p=>p.name.trim());
  setIncidents(x=>[{id,iso:f.date,date:`${pad(d.getDate())} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`,time:f.time,cat:f.cat,ranger:user,patrol:'—',desc:f.desc,personsList:pl,personsUnknown:f.unknown,persons:f.unknown?'Not identified':pl.map(p=>p.name).join(', '),code:f.code,action:'Recorded by office',ref:'None',stage:0,x:xy[0],y:xy[1],lat:la,lon:lo,loc:'sensitive'},...x]);log('Reported incident','Events & Incidents',id);toast(id+' recorded');onClose();};
 return html`<div className="form"><${Field} label="Date" id="id1"><${Inp} id="id1" type="date" value=${f.date} onChange=${u('date')}/></${Field}><${Field} label="Time" id="id2"><${Inp} id="id2" type="time" value=${f.time} onChange=${u('time')}/></${Field}>
 <${Field} label="Category" id="id3"><${Sel} id="id3" value=${f.cat} onChange=${u('cat')} opts=${INC_CATS}/></${Field}><${Field} label="Infringement code" id="id4"><${Sel} id="id4" value=${f.code} onChange=${u('code')} opts=${infOpts()}/></${Field}>
 <${Field} label="What happened" id="id5" wide=${true}><textarea id="id5" rows="3" value=${f.desc} onChange=${e=>{const v=e.target.value;setF(o=>({...o,desc:v}));}}/></${Field}>
 <${Field} label="Persons not identified" id="id6" wide=${true}><${Toggle} id="id6" on=${f.unknown} onChange=${u('unknown')} label="Persons not identified"/></${Field}>
 ${!f.unknown&&f.persons.map((p,i)=>html`<${Field} key=${i} label=${'Person '+(i+1)} id=${'ip'+i} wide=${true}><div className="three"><input aria-label=${'Person '+(i+1)+' name'} placeholder="Name" value=${p.name} onChange=${e=>sp(i,'name',e.target.value)}/><input aria-label=${'Person '+(i+1)+' ID'} placeholder="ID number" value=${p.id} onChange=${e=>sp(i,'id',e.target.value)}/><input aria-label=${'Person '+(i+1)+' phone'} placeholder="Phone" value=${p.phone} onChange=${e=>sp(i,'phone',e.target.value)}/></div></${Field}>`)}
 ${!f.unknown&&html`<div className="wide"><${Btn} kind="small" onClick=${()=>setF(o=>({...o,persons:[...o.persons,{name:'',id:'',phone:''}]}))}>Add another person</${Btn}></div>`}
 <${Field} label="Latitude (optional)" id="il1"><${Inp} id="il1" type="number" value=${f.lat} onChange=${u('lat')}/></${Field}><${Field} label="Longitude (optional)" id="il2"><${Inp} id="il2" type="number" value=${f.lon} onChange=${u('lon')}/></${Field}>
 <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>Save incident</${Btn}></div></div>`;
};
const Incidents=()=>{
 const {role,incidents,setIncidents,log,toast,can,account}=useApp();
 const me=account.name;
 const [open,setOpen]=useState(null);const [cat,setCat]=useState('All');const [mk,setMk]=useState(false);const [auth,setAuth]=useState(REFER[0]);
 let list=incidents;if(role==='ranger')list=list.filter(i=>i.ranger===me);
 list=list.filter(i=>cat==='All'||i.cat===cat);
 const cur=open&&incidents.find(i=>i.id===open);
 const write=can('incidents')==='w';
 const [ed,setEd]=useState(false);const [dl,setDl]=useState(false);const adm=role==='admin';
 const delI=()=>{setIncidents(x=>x.filter(i=>i.id!==cur.id));log('Deleted incident','Events & Incidents',cur.id);toast('Incident '+cur.id+' deleted');setDl(false);setOpen(null);};
 const adv=()=>{const n=Math.min(4,cur.stage+1);setIncidents(x=>x.map(i=>i.id===cur.id?{...i,stage:n,ref:n===2?auth:i.ref}:i));log('Moved incident to '+STAGES[n],'Events & Incidents',cur.id);toast(cur.id+' is now: '+STAGES[n]);};
 const hasLoc=cur&&(cur.lat!=null||cur.x!=null);
 const ll=cur&&hasLoc?(cur.lat!=null?[cur.lat,cur.lon]:unproj(cur.x,cur.y)):null;
 return html`<div><${PageHead} title="Events & Incidents" sub="Report, review, refer, monitor and close">${write&&html`<${Btn} kind="primary" icon="plus" onClick=${()=>setMk(true)}>Report incident</${Btn}>`}</${PageHead}>
 <${Notice} tone="info" title="Records only">POps records and tracks incidents. It does not give enforcement powers. Referrals go to KWS, KFS, the Fisheries Department, Police and other authorities.</${Notice}>
 <${Card}><div className="toolbar"><div className="chips"><select aria-label="Filter by category" value=${cat} onChange=${e=>setCat(e.target.value)}><option>All</option>${INC_CATS.map(c=>html`<option key=${c}>${c}</option>`)}</select></div></div>
 <${Table} empty="No incidents recorded." sel=${open} onRow=${r=>setOpen(r.id)} cols=${[{h:'Reference',k:'id',cls:'mono'},{h:'Date and time',k:'date',r:r=>r.date+(r.time?', '+r.time:'')},{h:'Category',k:'cat'},{h:'Reported by',k:'ranger'},{h:'Referral',k:'ref'},{h:'Stage',k:'stage',r:r=>html`<${Chip} t=${STAGES[r.stage]} tone=${r.stage===0?'warn':r.stage===4?'neutral':'info'}/>`}]} rows=${list}/></${Card}>
 <${Drawer} open=${!!cur} onClose=${()=>setOpen(null)} title=${cur?cur.id:''} sub=${cur?cur.cat:''} foot=${cur&&(adm||(write&&cur.stage<4))?html`<span className="btnrow">${adm&&html`<${Btn} kind="small" id="i-edit" onClick=${()=>setEd(true)}>Edit</${Btn}><${Btn} kind="small" id="i-del" onClick=${()=>setDl(true)}>Delete</${Btn}>`}${write&&cur.stage<4&&html`${cur.stage===1&&html`<${Sel} id="refa" value=${auth} onChange=${setAuth} opts=${REFER}/>`}<${Btn} kind="primary" onClick=${adv}>${['Start review','Record referral','Start monitoring','Close case'][cur.stage]}</${Btn}>`}</span>`:null}>
 ${cur&&html`<div className="stepper">${STAGES.map((s,i)=>html`<div key=${s} className=${'step '+(i<cur.stage?'done':i===cur.stage?'now':'')}><i>${i<cur.stage?html`<${Icon} n="check" s=${12} sw=${3}/>`:i+1}</i><span>${s}</span></div>`)}</div>
 <${KV} rows=${[['Date and time',cur.date+(cur.time?', '+cur.time:'')],['Patrol',cur.patrol],['Reporting ranger',cur.ranger],['Infringement',cur.code?infShow(cur.code)+'. '+infName(cur.code):'—'],['Description',cur.desc],['Persons involved',(cur.personsList&&cur.personsList.length)?html`<ul className="plain">${cur.personsList.map((p,i)=>html`<li key=${i}>${p.name}${p.id?' · ID '+p.id:''}${p.phone?' · '+p.phone:''}</li>`)}</ul>`:cur.persons],['Action taken',cur.action],['Referral authority',cur.ref],['GPS location',role==='board'&&cur.loc==='sensitive'?'Restricted':ll?toDMS(ll[0],'N','S')+' / '+toDMS(ll[1],'E','W'):'Not recorded']]}/>
 <h3 className="mini-h">Evidence</h3><${Photos} imgs=${cur.photos||[]}/>
 <h3 className="mini-h">Scanned pages</h3><${ScanBox} rec=${cur} canEdit=${adm} set=${fn=>setIncidents(x=>x.map(q=>q.id===cur.id?fn(q):q))}/>`}</${Drawer}>
 <${Modal} wide=${true} open=${ed&&!!cur} onClose=${()=>setEd(false)} title=${cur?'Edit incident '+cur.id:''}>${cur&&ed&&html`<${IncEdit} key=${cur.id} i=${cur} onClose=${()=>setEd(false)}/>`}</${Modal}>
 <${ConfirmDel} open=${dl} onClose=${()=>setDl(false)} what=${cur?'incident '+cur.id:''} onYes=${delI}/>
 <${Modal} open=${mk} onClose=${()=>setMk(false)} title="Report an incident"><${IncidentForm} onClose=${()=>setMk(false)}/></${Modal}></div>`;
};
