/* ============ the real paper forms, generated from one capture ============
   Annex 1  Form 1A  Patrol data capture form (used during patrol)
   Annex 2  BMU Patrol Reporting Form (English / Kiswahili)
   Annex 3  Form DF/SZ  Receipt of notice of seizure of items (Fisheries General Regulations s.18)
   MCS Outcome Data Compilation Form (GOK 2014 MCS SOP manual)                                  */
const INFR=[
 [1,'No fishing licence','No Fishing License'],
 [2,'Unsustainable gear','Possession/use of unsustainable gears (Beach Seine, Spear Gun, Undersize net and Monofilament)'],
 [3,'No-take zone or closed season','Fishing within a no-take zone/closed season'],
 [4,'Restricted gear in exclusion zone','Use of restricted gear within gear exclusion zone'],
 [5,'Immature or undersize fish','Possession of immature/undersize fish'],
 [6,'Fish unfit for consumption','Fish unfit for human consumption'],
 [7,'Unseaworthy craft','Unseaworthy craft'],
 [8,'Causing pollution','Causing pollution'],
 [9,'Craft without valid registration','Craft without valid registration/license no.'],
 [10,'Underage','Underage'],
 [11,'Poor fishing handling','Poor fishing handling',1],
 [12,'Fishing method causing pollution','Illegal fishing method causing pollution',1],
 [13,'Transport of immature fish','Transport of immature fish',1],
 [14,'Transport of illegal gears','Transport of illegal gears',1]
];
const infItem=c=>(LOOK.infringements||[]).find(i=>i.code===String(c));
const infName=c=>{if(c===''||c==null)return 'No infringement';const x=infItem(c);if(x)return x.label;const y=INFR.find(i=>i[0]===+c);return y?y[1]:'No infringement';};
const infShow=c=>{const x=infItem(c);return x?x.code:c;};
const GEARS=['Hand line','Gillnet','Long line hooks','Trap or basket','Spear gun','Beach seine','Monofilament gillnet','Undersize net','Trawl net','Scoop net','Ring net','Trammel net','Trolling net','Harpoon','Hooked stick','Pointed stick','None','Other'];
const ACTIONS=['Advised or warned','Gear confiscated','Catch released','Referred to Fisheries','Handed to Police or Coast Guard','No action needed'];
const OBJECTIVES=['Surveillance','Enforcement','Joint patrol','Monitoring and research','Other'];
const AGENCIES=[['bmu','BMU (including boatmen)'],['cfd','County Fisheries Dept'],['cps','County Police Service'],['kfs','Kenya Fisheries Service'],['kws','Kenya Wildlife Service'],['kcg','Kenya Coast Guard Service'],['kma','Kenya Maritime Authority'],['other','Other (specify)']];
const CHAL={fuel:['Fuel shortage','Uhaba wa mafuta'],weather:['Bad weather','Hali mbaya ya anga'],mech:['Mechanical issues','Boti kuharibika'],resist:['Resistance from fishers','Usumbufu wa wavuvi'],other:['Other','Mengine']};
const ATTACH=[['capture','Patrol data capture form'],['costing','Patrol costing table'],['seizure','Seizure form'],['mcs','MCS outcome data compilation form'],['other','Other']];
const UNITS=['Piece','Kg','Metre','Set','Litre'];

const pad4=n=>String(n).padStart(4,'0');
const ampm=t=>{if(!t||!/^\d+:\d+/.test(t))return '';const a=t.split(':').map(Number);return ((a[0]%12)||12)+':'+pad(a[1])+(a[0]<12?' am':' pm');};
const mask=v=>v?'•••• '+String(v).replace(/\s/g,'').slice(-3):'';
const piiOk=(role,settings)=>['admin','ranger','fisheries'].includes(role)||(role==='bmu'&&!!(settings&&settings.piiBmu));
const sumParts=p=>Object.values(p.parts||{}).reduce((a,b)=>a+(+b||0),0);
const hpOf=b=>{const x=BOATS.find(k=>k.name===b);if(!x)return '';if(x.hp)return String(x.hp);const m=x.engine&&String(x.engine).match(/(\d+)\s*HP/i);return m?m[1]+' HP':'';};
const boatType=b=>{const x=BOATS.find(k=>k.name===b);return (x&&x.type)||'';};
const staffOf=n=>{const pool=[...(typeof PEOPLE!=='undefined'?PEOPLE:[]),...(LOOK.rangers||[]),...(LOOK.coxswains||[])];const u=pool.find(s=>s.name===n&&(s.phone||s.title||s.role))||pool.find(s=>s.name===n)||{};return {title:u.title||(ROLES[u.role]?ROLES[u.role].label:''),no:'',phone:u.phone||''};};
/* Every form is filled from the patrol and the saved details: leader phone and position from the user record, the JCMA name from Settings, BMU names, participants, vessel, times. Nothing a form needs is left to be typed again. */
let JCMA_NAME='Pate–Shanga JCMA';
/* Imported paper logs keep the patrol and the entry log as separate records. When a patrol is opened, the entry-log rows for that day are matched to it (by link, else by date and time) so Form 1A and the report fill themselves. */
let FORM_INC=[];const setFormInc=l=>{FORM_INC=l||[];};
const tmin=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(t||'');return m?+m[1]*60+ +m[2]:null;};
const incFor=p=>{if(!p||(p.enc||[]).length)return [];const a=tmin(p.start),b=tmin(p.end);
 return FORM_INC.filter(i=>{if(i.patrol===p.id)return true;if(!(p.imported||i.imported)||(i.patrol&&i.patrol!=='—'&&i.patrol!==''))return false;if((i.iso||'')!==(p.iso||'x'))return false;const t=tmin(i.time);if(t==null||a==null||b==null)return true;return a<=b?(t>=a-20&&t<=b+20):(t>=a-20||t<=b+20);});};
const incToEnc=(i,n0)=>{const ps=(i.personsList&&i.personsList.length)?i.personsList:[{name:i.persons&&i.persons!=='Not identified'?i.persons:'Not identified',id:'',phone:''}];return ps.map((x,k)=>({n:n0+k+1,time:i.time||'',name:x.name||'',id:x.id||'',phone:x.phone||'',gear:'None',gearId:'',qty:'',ground:i.loc||'',origin:'',code:i.code||'',action:i.action&&i.action!=='—'?i.action:'',details:i.desc||'',seized:false,fromEntryLog:true}));};
const fillForm=p0=>{
 const p={...p0};const st=staffOf(p.leader);
 p.leaderPhone=p.leaderPhone||st.phone||'';
 p.leaderPos=(p.leaderPos&&p.leaderPos!=='Patrol leader'?p.leaderPos:(st.title||p.leaderPos||'Patrol leader'));
 const allB=[bmuName(p.bmu),...(p.jointWith||[]).map(bmuName),...(p.bmuOther||[])].filter(Boolean);const jb=allB.length>1?allB.join(', '):'';
 p.jcma=(p.jcma&&p.jcma!=='Pate-Shanga'?p.jcma:JCMA_NAME);
 p.bmuLine=jb||bmuName(p.bmu);
 p.county=p.county||'Lamu';p.objective=p.objective&&p.objective!=='—'?p.objective:'Surveillance';
 p.boat=p.boat||'';
 if(p.cox&&!p.coxPhone)p.coxPhone=staffOf(p.cox).phone||'';
 p.vessel=p.vessel&&p.vessel.name?p.vessel:{name:p.boat,type:boatType(p.boat),hp:hpOf(p.boat)};
 if(!p.parts||!Object.keys(p.parts).length)p.parts={bmu:(p.rangers||[]).length+(p.cox?1:0)||1};
 if(p.leaderOther&&p.leaderOther.name){p.leaderPhone=p.leaderOther.phone||p.leaderPhone;if(p.leaderOther.title)p.leaderPos=p.leaderOther.title;}
 p.partnerLine=[...(p.agencies||[]).map(k=>(AGENCIES.find(a=>a[0]===k)||[k,k])[1]),...(p.partnersOther||[])].join(', ');
 p.areas=(p.areas&&p.areas.filter(Boolean).length)?p.areas:[p.area].filter(Boolean);
 if(!(p.enc||[]).length){const li=incFor(p);if(li.length){let n=0;p.enc=li.flatMap(i=>{const r=incToEnc(i,n);n+=r.length;return r;});}}
 if(p.imported){const ch={...(p.chal||{})};if(p.challenges&&!/^(none|nil|no|n\/a)\b/i.test(p.challenges)&&!Object.values(ch).some(Boolean)){ch.other=true;ch.otherText=p.challenges;}p.chal=ch;if(!p.prep||!p.prep.name)p.prep={...(p.prep||{}),name:p.leader,desig:'Marine Ranger',date:p.date};}
 return p;
};

/* every patrol record carries the form fields, so every screen can render the forms */
const formDefaults=p=>({objective:'Surveillance',county:'Lamu',jcma:'Pate-Shanga',leaderPos:'Patrol leader',leaderPhone:'',enc:[],seiz:[],parts:{bmu:(p.rangers||[]).length+1},vessel:{name:p.boat,type:boatType(p.boat),hp:hpOf(p.boat)},areas:[p.area],chal:{},attach:{},prep:null,mcsx:{},fuel:''});
const withForm=p=>{const d=formDefaults(p);for(const k in d)if(!(k in p))p[k]=d[k];return p;};
const mkSeizure=(e,items,p,n)=>{const st=staffOf(p.leader);return {no:'SZ-'+p.id.slice(-4)+'-'+n,encNo:e.n,items,person:{name:e.name,nat:'Kenyan',id:e.id,date:p.date,sign:null},officer:{name:p.leader,desig:st.title||'Marine Ranger',pno:st.no||'',station:bmuName(p.bmu),date:p.date,sign:null},loc:{district:p.county,town:e.ground,road:'At sea'},time:e.time};};
const mcsRows=p=>{const g={};(p.enc||[]).filter(e=>e.code).forEach(e=>{(g[e.code]=g[e.code]||[]).push(e);});const ops=sumParts(p);
 return Object.keys(g).map(c=>{const es=g[c],x=(p.mcsx&&p.mcsx[c])||{},conf=es.filter(e=>e.seized||/confiscat/i.test(e.action||''));
  return {code:c,suspects:new Set(es.map(e=>e.name)).size,convicts:x.convicts||0,fines:x.fines||0,items:conf.map(e=>e.gear).join(', '),qty:conf.reduce((a,e)=>a+(+e.qty||0),0)||'',type:infName(c),times:x.times||1,pros:x.pros||'No',fuel:p.fuel||'',ops,remarks:Object.keys(p.chal||{}).filter(k=>p.chal[k]).map(k=>k==='other'&&p.chal.otherText?p.chal.otherText:CHAL[k][0]).join(', ')};});};

/* ---- helpers: print and export (work in the hosted app, not in the preview page) ---- */
const printNode=el=>{if(!el)return;let h=document.getElementById('printroot');if(!h){h=document.createElement('div');h.id='printroot';document.body.appendChild(h);}h.innerHTML=el.outerHTML;document.body.classList.add('printing');const done=()=>{document.body.classList.remove('printing');h.innerHTML='';window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);setTimeout(()=>{try{window.print();}catch(e){done();}},60);};
const csvCell=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
const saveCSV=(name,rows)=>{try{const b=new Blob(['﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove();},500);}catch(e){}};
const encRows=(ps,pii)=>[['Patrol ref','Date','BMU','S/No','Time','Fisher name','ID','Phone','Gear type','Gear ID','Gear qty','Fishing ground','BMU origin','Infringement code','Infringement','Details','Action taken','Seized']].concat(ps.flatMap(p=>(p.enc||[]).map(e=>[p.id,p.date,bmuName(p.bmu),e.n,e.time,e.name,pii?e.id:mask(e.id),pii?e.phone:mask(e.phone),e.gear,e.gearId,e.qty,e.ground,e.origin,e.code,e.code?infName(e.code):'',e.details,e.action,e.seized?'Yes':'No'])));

/* ---- the paper ---- */
const Cb=({on,children})=>html`<span className="cb"><b>${on?'☑':'☐'}</b> ${children}</span>`;
const PapHead=({form,title,sub})=>html`<div className="pp-head"><img className="pp-logo" src="logo-sm.png" alt="Patte Conservation"/><small>${form}</small><h3>${title}</h3>${sub&&html`<p>${sub}</p>`}</div>`;
/* every document made by POps ends with the Patte logo, the POps initials and the source line */
const DocFoot=({text})=>html`<div className="pp-foot"><img className="pp-flogo" src="logo-sm.png" alt="Patte Conservation"/><b className="pp-finit">POps</b><span className="pp-ftxt">${text}</span></div>`;
const PapFoot=({p})=>html`<${DocFoot} text=${'Generated by POps from the patrol record '+p.id+'. Source: GOK, 2014 MCS Standard Operating Procedure Manual.'}/>`;
const Sig=({src})=>src?html`<img className="pp-sig" src=${src} alt="Signature"/>`:html`<i className="pp-nosig">Not captured</i>`;

const FormCapture=({p:p0,pii})=>{const p=fillForm(p0);
 const rows=[...(p.enc||[])];while(rows.length<8)rows.push(null);
 return html`<div className="paper land" data-doc="capture"><${PapHead} form="Annex 1 · Form 1A" title="Patrol data capture form" sub="For use during patrol"/>
 <div className="pp-grid"><div><label>Patrol reference no.</label><b>${p.id}</b></div><div><label>Patrol objective</label><b>${p.objective}</b></div><div><label>Patrol date</label><b>${p.date}</b></div><div><label>Patrol boat name</label><b>${p.boat}</b></div><div><label>Patrol leader name</label><b>${p.leader}</b></div><div><label>Position</label><b>${p.leaderPos}</b></div><div><label>Phone no.</label><b>${p.leaderPhone}</b></div><div><label>County name</label><b>${p.county}</b></div><div><label>JCMA name</label><b>${p.jcma}</b></div><div><label>BMU name</label><b>${p.bmuLine}</b></div><div><label>Start time (12 hrs)</label><b>${ampm(p.start)}</b></div><div><label>End time (12 hrs)</label><b>${ampm(p.end)}</b></div></div>
 <div className="pp-scroll"><table className="pp-t"><thead><tr><th>S/No</th><th>Time</th><th>Fisher's name</th><th>ID</th><th>Phone no.</th><th>Gear type and ID</th><th>Gear quantity</th><th>Fishing location / ground</th><th>BMU origin</th><th>Infringement code</th><th>Items confiscated / encountered, details and action taken</th></tr></thead>
 <tbody>${rows.map((e,i)=>html`<tr key=${i}><td>${i+1}</td>${e?[html`<td key="a">${e.time}</td>`,html`<td key="b">${e.name}</td>`,html`<td key="c">${pii?e.id:mask(e.id)}</td>`,html`<td key="d">${pii?e.phone:mask(e.phone)}</td>`,html`<td key="e">${e.gear==='None'?'—':e.gear+(e.gearId?' '+e.gearId:'')}</td>`,html`<td key="f">${e.qty||'—'}</td>`,html`<td key="g">${e.ground}</td>`,html`<td key="h">${e.origin}</td>`,html`<td key="i">${e.code||'—'}</td>`,html`<td key="j">${e.details}${e.action?' ['+e.action+']':''}</td>`]:Array.from({length:10}).map((_,k)=>html`<td key=${k}/>`)}</tr>`)}</tbody></table></div>
 ${p.imported&&(p.observations||p.action&&p.action!=='—')&&html`<p className="pp-ref"><b>Observations (paper log):</b> ${p.observations||'—'}${p.action&&p.action!=='—'?html` · <b>Action taken:</b> ${p.action}`:''}</p>`}
 <div className="pp-legend"><b>Infringement code:</b> ${(LOOK.infringements||[]).map(i=>html`<span key=${i.code}>${i.code}. ${i.label}</span>`)}</div><${PapFoot} p=${p}/></div>`;
};

const FormReport=({p:p0})=>{const p=fillForm(p0);
 const out=(p.enc||[]).filter(e=>e.code);const rows=[...out];while(rows.length<5)rows.push(null);
 const ch=p.chal||{};const at=p.attach||{};const pr=p.prep||{};
 return html`<div className="paper" data-doc="report"><${PapHead} form="Annex 2" title="BMU Patrol Reporting Form"/>
 <h4>1. Patrol information / Tarifa ya Patrol</h4>
 <dl className="pp-dl"><div><dt>a) BMU name / Jina la BMU</dt><dd>${p.bmuLine}</dd></div><div><dt>b) Patrol leader, name</dt><dd>${p.leader}</dd></div><div><dt>c) Patrol leader, position</dt><dd>${p.leaderPos}</dd></div><div><dt>d) Patrol leader, mobile phone number</dt><dd>${p.leaderPhone}</dd></div><div><dt>e) Date of patrol / Tarehe ya Patrol</dt><dd>${p.date}</dd></div><div><dt>f) Time patrol commenced / Saa ya kuanza</dt><dd>${ampm(p.start)}</dd></div><div><dt>g) Time patrol ended / Saa ya kutamatisha</dt><dd>${ampm(p.end)||'—'}</dd></div></dl>
 <h4>2. Patrol objective(s) / Lengo la Patrol</h4><ol className="pp-ol"><li>${p.objective}</li></ol>
 <h4>3. Patrol participants / Washikadau walioshiriki katika patrol</h4>
 <table className="pp-t narrow"><thead><tr><th>Taasisi / No</th><th>Idadi ya watu</th></tr></thead><tbody>${AGENCIES.map((a,i)=>html`<tr key=${a[0]}><td>${i+1}. ${a[1]}</td><td>${(p.parts&&p.parts[a[0]])||0}</td></tr>`)}</tbody></table>
 <h4>4. Vessel information / Tarifa kuhusu Chombo la Patrol iliyotumika</h4>
 <dl className="pp-dl"><div><dt>Name of patrol vessel / Jina la Chombo</dt><dd>${(p.vessel||{}).name}</dd></div><div><dt>Vessel type / Aina ya Chombo (material and length)</dt><dd>${(p.vessel||{}).type}</dd></div><div><dt>Horsepower (HP) of vessel engine / Nguvu ya Engine</dt><dd>${(p.vessel||{}).hp}</dd></div></dl>
 <h4>5. Patrol area / Eneo la Patrol <small>(names of fishing ground, names of landing sites)</small></h4><ol className="pp-ol">${(p.areas||[]).filter(Boolean).map((a,i)=>html`<li key=${i}>${a}</li>`)}</ol>
 <h4>6. Outcomes / Matokeo ya patrol na hatua iliyochukuliwa <small>(summarised from Annex 1, Patrol data capture form)</small></h4>
 <table className="pp-t"><thead><tr><th>Infringement no.</th><th>Infringement type</th><th>Action taken / Hatua iliyochukuliwa</th></tr></thead><tbody>${rows.map((e,i)=>html`<tr key=${i}>${e?[html`<td key="a">${e.code}</td>`,html`<td key="b">${infName(e.code)}</td>`,html`<td key="c">${e.action}</td>`]:[html`<td key="a"/>`,html`<td key="b"/>`,html`<td key="c"/>`]}</tr>`)}</tbody></table>
 <h4>7. Challenges encountered / Changamoto</h4>
 <div className="pp-cbs">${Object.keys(CHAL).map((k,i)=>html`<${Cb} key=${k} on=${!!ch[k]}>${'abcde'[i]}) ${CHAL[k][0]} / ${CHAL[k][1]}${k==='other'&&ch.otherText?': '+ch.otherText:''}</${Cb}>`)}</div>
 <h4>8. List of attached documents</h4>
 <div className="pp-cbs">${ATTACH.map((a,i)=>html`<${Cb} key=${a[0]} on=${!!at[a[0]]}>${'abcde'[i]}) ${a[1]}</${Cb}>`)}</div>
 <h4>9. Prepared by / Mwandishi wa Repoti</h4>
 <dl className="pp-dl"><div><dt>Name / Jina</dt><dd>${pr.name||'—'}</dd></div><div><dt>Designation / Cheo</dt><dd>${pr.desig||'—'}</dd></div><div><dt>Signature / Sahihi</dt><dd><${Sig} src=${pr.sign}/></dd></div><div><dt>Date / Tarehe ya Kuandika Repoti</dt><dd>${pr.date||'—'}</dd></div></dl><${PapFoot} p=${p}/></div>`;
};

const FormSeizure=({s,p:p0,pii})=>{const p=fillForm(p0);
 const rows=[...s.items];while(rows.length<7)rows.push(null);
 const tot=s.items.reduce((a,i)=>a+(+i.value||0),0);
 return html`<div className="paper" data-doc="seizure"><${PapHead} form="Annex 3 · CAP. 378 · Form DF/SZ" title="The Fisheries (General) Regulations" sub="Receipt of notice of seizure of items · s. 18"/>
 <p className="pp-ref">Seizure no. <b>${s.no}</b> · Patrol <b>${p.id}</b> · Form 1A row <b>${s.encNo}</b></p>
 <h4>1. Particulars of items seized</h4>
 <table className="pp-t"><thead><tr><th>No</th><th>Name of items seized</th><th>Unit of quantity</th><th>Quantity</th><th>Estimated value (KES)</th></tr></thead><tbody>${rows.map((it,i)=>html`<tr key=${i}><td>${i+1}</td>${it?[html`<td key="a">${it.name}</td>`,html`<td key="b">${it.unit}</td>`,html`<td key="c">${it.qty}</td>`,html`<td key="d">${it.value?KES(+it.value):''}</td>`]:[html`<td key="a"/>`,html`<td key="b"/>`,html`<td key="c"/>`,html`<td key="d"/>`]}</tr>`)}</tbody><tfoot><tr><td colSpan="4">Total estimated value</td><td>${tot?KES(tot):''}</td></tr></tfoot></table>
 <h4>2. Particulars of the person from whom the above items have been seized</h4>
 <dl className="pp-dl"><div><dt>Name</dt><dd>${s.person.name}</dd></div><div><dt>Nationality</dt><dd>${s.person.nat}</dd></div><div><dt>ID / Passport no.</dt><dd>${pii?s.person.id:mask(s.person.id)}</dd></div><div><dt>Date</dt><dd>${s.person.date}</dd></div><div><dt>Signature</dt><dd><${Sig} src=${s.person.sign}/></dd></div></dl>
 <h4>3. Name of officer impounding items</h4>
 <dl className="pp-dl"><div><dt>Name</dt><dd>${s.officer.name}</dd></div><div><dt>Designation</dt><dd>${s.officer.desig}</dd></div><div><dt>P/No.</dt><dd>${s.officer.pno}</dd></div><div><dt>Station</dt><dd>${s.officer.station}</dd></div><div><dt>Signature</dt><dd><${Sig} src=${s.officer.sign}/></dd></div><div><dt>Date</dt><dd>${s.officer.date}</dd></div></dl>
 <h4>4. Location where the seizure occurred</h4>
 <dl className="pp-dl"><div><dt>(i) District</dt><dd>${s.loc.district}</dd></div><div><dt>Town / location / sub-location</dt><dd>${s.loc.town}</dd></div><div><dt>Road / street</dt><dd>${s.loc.road}</dd></div><div><dt>(ii) Time of seizure</dt><dd>${ampm(s.time)}</dd></div></dl><${PapFoot} p=${p}/></div>`;
};

const FormMCS=({p:p0})=>{const p=fillForm(p0);
 const rows=mcsRows(p);const pad8=[...rows];while(pad8.length<6)pad8.push(null);
 return html`<div className="paper land" data-doc="mcs"><${PapHead} form="Form 1A · MCS" title="MCS outcome data compilation form"/>
 <div className="pp-grid"><div><label>Patrol reference no.</label><b>${p.id}</b></div><div><label>Name of BMU</label><b>${bmuName(p.bmu)}</b></div><div><label>Sub-county</label><b>Lamu East</b></div><div><label>County</label><b>${p.county}</b></div><div><label>Date</label><b>${p.date}</b></div></div>
 <div className="pp-scroll"><table className="pp-t"><thead><tr><th>No. of suspects</th><th>No. of convicts</th><th>Total fines in KES</th><th>Gears / items type confiscated</th><th>Quantity</th><th>Type of infringement</th><th>No. of times appearing</th><th>Prosecution YES or NO</th><th>Amount of fuel (L)</th><th>No. of operatives</th><th>Challenges / remarks</th></tr></thead>
 <tbody>${pad8.map((r,i)=>html`<tr key=${i}>${r?[r.suspects,r.convicts,r.fines?KES(+r.fines):0,r.items||'—',r.qty,r.code+'. '+r.type,r.times,r.pros,r.fuel,r.ops,r.remarks].map((v,k)=>html`<td key=${k}>${v}</td>`):Array.from({length:11}).map((_,k)=>html`<td key=${k}/>`)}</tr>`)}</tbody></table></div><${PapFoot} p=${p}/></div>`;
};

/* ---- the forms of one patrol: tabs, print, export, follow-up fields ---- */
const PatrolForms=({p,start='capture'})=>{
 const {role,settings,setPatrols,log,toast,can}=useApp();
 const pii=piiOk(role,settings);const write=can('patrols')==='w';
 const [tab,setTab]=useState(start);const [si,setSi]=useState(0);
 const host=useRef(null);const pwa=!!window.POPS_PWA;
 const seiz=p.seiz||[];const s=seiz[Math.min(si,Math.max(0,seiz.length-1))];
 const rows=mcsRows(p);
 const setX=(c,k,v)=>setPatrols(x=>x.map(q=>q.id===p.id?{...q,mcsx:{...q.mcsx,[c]:{...((q.mcsx||{})[c]||{}),[k]:v}}}:q));
 const tabs=[['capture','Form 1A'],['report','Patrol report'],['seizure','Seizure ('+seiz.length+')'],['mcs','MCS outcome']];
 const doc=tab==='capture'?html`<${FormCapture} p=${p} pii=${pii}/>`:tab==='report'?html`<${FormReport} p=${p}/>`:tab==='mcs'?html`<${FormMCS} p=${p}/>`:s?html`<${FormSeizure} s=${s} p=${p} pii=${pii}/>`:html`<${Notice} tone="info" title="No seizure form needed">No items were seized on this patrol, so no Form DF/SZ was generated. POps creates one only when an item is seized.</${Notice}>`;
 const prt=()=>{printNode(host.current&&host.current.querySelector('.paper'));log('Printed form: '+tab,'Patrols',p.id);};
 return html`<div className="pforms">
  <${Notice} tone="info" title="Written once, generated four times">The ranger records the patrol once. POps fills in Form 1A, the BMU Patrol Reporting Form, the Seizure Form and the MCS Outcome sheet in the same layout as the paper forms.</${Notice}>
  <div className="pf-bar"><${Tabs} tabs=${tabs} value=${tab} onChange=${setTab}/>
   <span className="btnrow">${pwa?html`<${Btn} kind="small" icon="download" onClick=${prt}>Print or save as PDF</${Btn}>${tab==='capture'&&html`<${Btn} kind="small" icon="download" onClick=${()=>{saveCSV(p.id+'-form-1A.csv',encRows([p],pii));log('Exported Form 1A CSV','Patrols',p.id);toast('Form 1A exported');}}>CSV</${Btn}>`}`:html`<span className="muted small">Print, PDF and CSV work in the installed app link.</span>`}</span></div>
  ${tab==='seizure'&&seiz.length>1&&html`<div className="chips">${seiz.map((z,i)=>html`<button key=${z.no} className=${'fchip '+(si===i?'on':'')} onClick=${()=>setSi(i)}>${z.no}</button>`)}</div>`}
  ${!pii&&html`<p className="muted small"><${Icon} n="lock" s=${12}/> Fisher ID and phone numbers are masked for your role.</p>`}
  ${tab==='mcs'&&write&&rows.length>0&&html`<div className="follow"><h4>Follow-up outcomes</h4><p className="muted small">Filled in later by the Super Admin or the agency. These columns are not known on the day of the patrol.</p>${rows.map(r=>html`<div key=${r.code} className="follow-r"><b>${r.code}. ${r.type}</b>
    <label>Convicts<input type="number" min="0" value=${r.convicts} onChange=${e=>setX(r.code,'convicts',+e.target.value)}/></label><label>Fines (KES)<input type="number" min="0" value=${r.fines} onChange=${e=>setX(r.code,'fines',+e.target.value)}/></label><label>Times appearing<input type="number" min="1" value=${r.times} onChange=${e=>setX(r.code,'times',+e.target.value)}/></label><label>Prosecution<select value=${r.pros} onChange=${e=>setX(r.code,'pros',e.target.value)}><option>No</option><option>Yes</option></select></label></div>`)}</div>`}
  <div className="pp-wrap" ref=${host}>${doc}</div></div>`;
};

/* ---- signature pad (finger or pen) ---- */
const SigPad=({value,onChange,label})=>{
 const cv=useRef(null);const dn=useRef(false);
 const pt=e=>{const r=cv.current.getBoundingClientRect();return [(e.clientX-r.left)*(cv.current.width/r.width),(e.clientY-r.top)*(cv.current.height/r.height)];};
 const down=e=>{e.preventDefault();dn.current=true;const c=cv.current.getContext('2d');const p=pt(e);c.lineWidth=3;c.lineCap='round';c.strokeStyle='#111';c.beginPath();c.moveTo(p[0],p[1]);try{cv.current.setPointerCapture(e.pointerId);}catch(x){}};
 const move=e=>{if(!dn.current)return;const c=cv.current.getContext('2d');const p=pt(e);c.lineTo(p[0],p[1]);c.stroke();};
 const up=()=>{if(!dn.current)return;dn.current=false;try{onChange(cv.current.toDataURL('image/png'));}catch(x){}};
 const clear=()=>{const c=cv.current.getContext('2d');c.clearRect(0,0,cv.current.width,cv.current.height);onChange(null);};
 return html`<div className="sigpad"><canvas ref=${cv} width="600" height="220" aria-label=${label} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}/><div className="sig-row"><span>${value?'Signature captured':label}</span><button type="button" className="btn small" onClick=${clear}>Clear</button></div></div>`;
};
