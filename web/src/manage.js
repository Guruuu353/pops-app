/* ============ admin: edit and remove records ============ */
const TA=({id,value,onChange,rows=3})=>html`<textarea id=${id} rows=${rows} style=${{width:'100%'}} value=${value||''} onChange=${e=>onChange(e.target.value)}/>`;
const isoLabel=iso=>{const a=String(iso||'').split('-');return a.length===3?(+a[2])+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+a[1]-1]+' '+a[0]:iso;};
const cleanNames=s=>String(s||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);

const ConfirmDel=({open,onClose,what,onYes})=>html`<${Modal} open=${open} onClose=${onClose} title="Delete this record?"><div className="form">
 <p className="wide">You are about to delete <b>${what}</b>. It is removed for everyone and the action is written to the audit trail. This cannot be undone.</p>
 <div className="form-foot wide"><${Btn} onClick=${onClose}>Keep it</${Btn}><${Btn} kind="primary" id="del-yes" onClick=${onYes}>Yes, delete</${Btn}></div></div></${Modal}>`;

const PatrolEdit=({p,onClose})=>{
 const {setPatrols,log,toast}=useApp();
 const [f,setF]=useState(()=>({iso:p.iso||'',start:p.start||'',end:p.end==='—'?'':p.end,leader:p.leader,rangers:(p.rangers||[]).join(', '),boat:p.boat,cox:p.cox,area:p.area,inLmma:!!p.inLmma,status:p.status,review:p.review,objective:p.objective==='—'?'':p.objective,km:p.km||'',observations:p.observations||'',challenges:p.challenges||'',action:p.action==='—'?'':p.action,bmu:p.bmu||'pate',leaderPhone:p.leaderPhone||'',fuel:p.fuel||'',bmuOther:(p.bmuOther||[]).join(', '),jointWith:(p.jointWith||[]).join(', '),partnersOther:(p.partnersOther||[]).join(', '),prepName:(p.prep&&p.prep.name)||'',prepDesig:(p.prep&&p.prep.desig)||'',chal:{...(p.chal||{})},chalText:(p.chal&&p.chal.otherText)||'',parts:{...(p.parts||{})}}));
 /* Form 1A rows: for an imported patrol this starts with the entry-log rows matched to it, so they can be corrected and kept */
 const [enc,setEnc]=useState(()=>(fillForm(p).enc||[]).map(e=>({...e})));
 const eu=(i,k,v)=>setEnc(a=>a.map((e,j)=>j===i?{...e,[k]:v}:e));
 const u=(k,v)=>setF(o=>({...o,[k]:v}));
 const names=[...(LOOK.rangers||[]),...(LOOK.coxswains||[])].map(x=>x.name);
 const save=()=>{
  if(!f.iso){toast('Enter the date');return;}
  const rg=cleanNames(f.rangers);const leader=f.leader.trim()||rg[0]||'';const all=rg.includes(leader)||!leader?rg:[leader,...rg];
  setPatrols(x=>x.map(q=>q.id===p.id?{...q,iso:f.iso,date:isoLabel(f.iso),start:f.start,end:f.end||'—',leader,rangers:all,boat:f.boat,cox:f.cox,area:f.area,areas:[f.area,...(q.areas||[]).slice(1)].filter(Boolean),inLmma:f.inLmma,status:f.status,review:f.review||'—',objective:f.objective||'—',km:+f.km||0,observations:f.observations,challenges:f.challenges,action:f.action||'—',bmu:f.bmu,leaderPhone:f.leaderPhone,fuel:f.fuel===''?q.fuel:+f.fuel,bmuOther:cleanNames(f.bmuOther),partnersOther:cleanNames(f.partnersOther),prep:{...(q.prep||{}),name:f.prepName,desig:f.prepDesig},chal:{...f.chal,otherText:f.chalText},parts:Object.fromEntries(Object.entries(f.parts).map(([k,v])=>[k,+v||0])),enc:enc.map((e,i)=>({...e,n:i+1,seized:!!e.seized||/confiscat/i.test(e.action||'')})),edited:new Date().toISOString()}:q));
  log('Edited patrol','Patrols',p.id);toast('Patrol '+p.id+' saved');onClose();
 };
 return html`<div className="form">
  <${Field} label="Date" id="pe-d"><${Inp} id="pe-d" type="date" value=${f.iso} onChange=${v=>u('iso',v)}/></${Field}>
  <${Field} label="Status" id="pe-s"><${Sel} id="pe-s" value=${f.status} onChange=${v=>u('status',v)} opts=${['Planned','Active','Paused','Draft','Completed']}/></${Field}>
  <${Field} label="Time out" id="pe-t1"><${Inp} id="pe-t1" type="time" value=${f.start} onChange=${v=>u('start',v)}/></${Field}>
  <${Field} label="Time in" id="pe-t2"><${Inp} id="pe-t2" type="time" value=${f.end} onChange=${v=>u('end',v)}/></${Field}>
  <${Field} label="Patrol leader" id="pe-l"><${Inp} id="pe-l" list="pe-names" value=${f.leader} onChange=${v=>u('leader',v)}/></${Field}>
  <${Field} label="Rangers (separate with commas)" id="pe-r"><${Inp} id="pe-r" list="pe-names" value=${f.rangers} onChange=${v=>u('rangers',v)}/></${Field}>
  <datalist id="pe-names">${names.map(n=>html`<option key=${n} value=${n}/>`)}</datalist>
  <${Field} label="Boat" id="pe-b"><${Sel} id="pe-b" value=${f.boat} onChange=${v=>u('boat',v)} opts=${[['','No boat'],...BOATS.map(b=>b.name),...(f.boat&&!BOATS.some(b=>b.name===f.boat)?[f.boat]:[])]}/></${Field}>
  <${Field} label="Coxswain" id="pe-c"><${Inp} id="pe-c" list="pe-names" value=${f.cox} onChange=${v=>u('cox',v)}/></${Field}>
  <${Field} label="Area patrolled" id="pe-a"><${Inp} id="pe-a" value=${f.area} onChange=${v=>u('area',v)}/></${Field}>
  <${Field} label="Distance (km)" id="pe-k"><${Inp} id="pe-k" type="number" value=${f.km} onChange=${v=>u('km',v)}/></${Field}>
  <${Field} label="Inside the Iweni LMMA" id="pe-i" wide=${true}><label className="chk"><input type="checkbox" checked=${f.inLmma} onChange=${e=>u('inLmma',e.target.checked)}/> Counts as an LMMA visit for the daily check</label></${Field}>
  <${Field} label="Objective" id="pe-o"><${Inp} id="pe-o" value=${f.objective} onChange=${v=>u('objective',v)}/></${Field}>
  <${Field} label="Review" id="pe-v"><${Sel} id="pe-v" value=${f.review} onChange=${v=>u('review',v)} opts=${['—','Pending review','Reviewed','Imported']}/></${Field}>
  <${Field} label="Observations" id="pe-ob" wide=${true}><${TA} id="pe-ob" value=${f.observations} onChange=${v=>u('observations',v)}/></${Field}>
  <${Field} label="Challenges" id="pe-ch" wide=${true}><${TA} id="pe-ch" rows=${2} value=${f.challenges} onChange=${v=>u('challenges',v)}/></${Field}>
  <${Field} label="Action taken" id="pe-ac" wide=${true}><${TA} id="pe-ac" rows=${2} value=${f.action} onChange=${v=>u('action',v)}/></${Field}>
  <${Field} label="Leader phone" id="pe-lp"><${Inp} id="pe-lp" type="tel" value=${f.leaderPhone} onChange=${v=>u('leaderPhone',v)}/></${Field}>
  <${Field} label="Fuel used (litres)" id="pe-fu"><${Inp} id="pe-fu" type="number" value=${f.fuel} onChange=${v=>u('fuel',v)}/></${Field}>
  <${Field} label="Other BMUs (commas)" id="pe-bo"><${Inp} id="pe-bo" value=${f.bmuOther} onChange=${v=>u('bmuOther',v)}/></${Field}>
  <${Field} label="Other agencies (commas)" id="pe-po"><${Inp} id="pe-po" value=${f.partnersOther} onChange=${v=>u('partnersOther',v)}/></${Field}>
  <${Field} label="Report prepared by" id="pe-pn"><${Inp} id="pe-pn" value=${f.prepName} onChange=${v=>u('prepName',v)}/></${Field}>
  <${Field} label="Designation" id="pe-pd"><${Inp} id="pe-pd" value=${f.prepDesig} onChange=${v=>u('prepDesig',v)}/></${Field}>
  <${Field} label="Challenges faced" id="pe-chk" wide=${true}><div className="checks">${Object.keys(CHAL).map(k=>html`<label key=${k} className="chk"><input type="checkbox" checked=${!!f.chal[k]} onChange=${e=>setF(o=>({...o,chal:{...o.chal,[k]:e.target.checked}}))}/> ${CHAL[k][0]}</label>`)}</div>${f.chal.other&&html`<${Inp} id="pe-cht" aria-label="Other challenge" value=${f.chalText} onChange=${v=>u('chalText',v)} placeholder="Describe the other challenge"/>`}</${Field}>
  <${Field} label="People on the patrol, by agency" id="pe-pt" wide=${true}><div className="partsgrid">${AGENCIES.map(a=>html`<label key=${a[0]} className="pg"><span>${a[1]}</span><input type="number" min="0" aria-label=${a[1]} value=${f.parts[a[0]]||''} onChange=${e=>setF(o=>({...o,parts:{...o.parts,[a[0]]:e.target.value}}))}/></label>`)}</div></${Field}>
  <h4 className="mini-h wide">Form 1A rows (fisher checks and infringements, ${enc.length})</h4>
  <div className="wide encedit">${enc.map((e,i)=>html`<fieldset key=${i} className="encrow"><legend>Row ${i+1}${e.fromEntryLog?' (from the entry log)':''}</legend>
   <div className="form">
   <${Field} label="Time" id=${'ee-t'+i}><${Inp} id=${'ee-t'+i} type="time" value=${e.time||''} onChange=${v=>eu(i,'time',v)}/></${Field}>
   <${Field} label="Name" id=${'ee-n'+i}><${Inp} id=${'ee-n'+i} value=${e.name||''} onChange=${v=>eu(i,'name',v)}/></${Field}>
   <${Field} label="ID number" id=${'ee-i'+i}><${Inp} id=${'ee-i'+i} value=${e.id||''} onChange=${v=>eu(i,'id',v)}/></${Field}>
   <${Field} label="Phone" id=${'ee-p'+i}><${Inp} id=${'ee-p'+i} type="tel" value=${e.phone||''} onChange=${v=>eu(i,'phone',v)}/></${Field}>
   <${Field} label="Gear type" id=${'ee-g'+i}><${Inp} id=${'ee-g'+i} value=${e.gear||''} onChange=${v=>eu(i,'gear',v)}/></${Field}>
   <${Field} label="Gear ID" id=${'ee-gi'+i}><${Inp} id=${'ee-gi'+i} value=${e.gearId||''} onChange=${v=>eu(i,'gearId',v)}/></${Field}>
   <${Field} label="Quantity" id=${'ee-q'+i}><${Inp} id=${'ee-q'+i} value=${e.qty||''} onChange=${v=>eu(i,'qty',v)}/></${Field}>
   <${Field} label="Fishing ground" id=${'ee-f'+i}><${Inp} id=${'ee-f'+i} value=${e.ground||''} onChange=${v=>eu(i,'ground',v)}/></${Field}>
   <${Field} label="BMU origin" id=${'ee-o'+i}><${Inp} id=${'ee-o'+i} value=${e.origin||''} onChange=${v=>eu(i,'origin',v)}/></${Field}>
   <${Field} label="Infringement code" id=${'ee-c'+i}><${Sel} id=${'ee-c'+i} value=${e.code||''} onChange=${v=>eu(i,'code',v)} opts=${[['','None'],...(LOOK.infringements||[]).map(x=>[x.code,x.code+'. '+x.label])]}/></${Field}>
   <${Field} label="Action taken" id=${'ee-a'+i}><${Inp} id=${'ee-a'+i} value=${e.action||''} onChange=${v=>eu(i,'action',v)}/></${Field}>
   <${Field} label="Details" id=${'ee-d'+i} wide=${true}><${Inp} id=${'ee-d'+i} value=${e.details||''} onChange=${v=>eu(i,'details',v)}/></${Field}>
   <${Field} label="Seized" id=${'ee-s'+i}><label className="chk"><input type="checkbox" checked=${!!e.seized} onChange=${x=>eu(i,'seized',x.target.checked)}/> Gear seized or confiscated</label></${Field}>
   </div><button type="button" className="btn small" onClick=${()=>setEnc(a=>a.filter((_,j)=>j!==i))}>Remove row</button></fieldset>`)}
   <button type="button" className="btn small" onClick=${()=>setEnc(a=>[...a,{n:a.length+1,time:'',name:'',id:'',phone:'',gear:'',gearId:'',qty:'',ground:'',origin:'',code:'',action:'',details:'',seized:false}])}>Add a row</button></div>
  <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind="primary" id="pe-save" onClick=${save}>Save changes</${Btn}></div></div>`;
};

const IncEdit=({i,onClose})=>{
 const {setIncidents,log,toast}=useApp();
 const [pls,setPls]=useState(()=>(i.personsList&&i.personsList.length?i.personsList:(i.persons&&i.persons!=='Not identified'?cleanNames(i.persons).map(n=>({name:n,id:'',phone:''})):[])).map(x=>({...x})));
 const pu=(k,key,v)=>setPls(a=>a.map((x,j)=>j===k?{...x,[key]:v}:x));
 const [f,setF]=useState(()=>({iso:i.iso||'',time:i.time||'',cat:i.cat,ranger:i.ranger,patrol:i.patrol,desc:i.desc,persons:'',code:i.code||'',action:i.action==='—'?'':i.action,ref:i.ref,stage:i.stage,loc:i.loc}));
 const u=(k,v)=>setF(o=>({...o,[k]:v}));
 const save=()=>{
  const pl=pls.filter(x=>(x.name||'').trim()).map(x=>({...x,name:x.name.trim()}));
  setIncidents(x=>x.map(q=>q.id===i.id?{...q,iso:f.iso||q.iso,date:f.iso?isoLabel(f.iso):q.date,time:f.time,cat:f.cat,ranger:f.ranger,patrol:f.patrol,desc:f.desc,personsList:pl,persons:pl.length?pl.map(p=>p.name).join(', '):'Not identified',personsUnknown:!pl.length,code:f.code,action:f.action||'—',ref:f.ref,stage:+f.stage,loc:f.loc,edited:new Date().toISOString()}:q));
  log('Edited incident','Events & Incidents',i.id);toast('Incident '+i.id+' saved');onClose();
 };
 return html`<div className="form">
  <${Field} label="Date" id="ie-d"><${Inp} id="ie-d" type="date" value=${f.iso} onChange=${v=>u('iso',v)}/></${Field}>
  <${Field} label="Time" id="ie-t"><${Inp} id="ie-t" type="time" value=${f.time} onChange=${v=>u('time',v)}/></${Field}>
  <${Field} label="Category" id="ie-c"><${Sel} id="ie-c" value=${f.cat} onChange=${v=>u('cat',v)} opts=${INC_CATS.includes(f.cat)?INC_CATS:[f.cat,...INC_CATS]}/></${Field}>
  <${Field} label="Infringement code" id="ie-k"><${Sel} id="ie-k" value=${f.code} onChange=${v=>u('code',v)} opts=${[['','None'],...(LOOK.infringements||[]).map(x=>[x.code,x.code+'. '+x.label])]}/></${Field}>
  <${Field} label="Reported by" id="ie-r"><${Inp} id="ie-r" value=${f.ranger} onChange=${v=>u('ranger',v)}/></${Field}>
  <${Field} label="Patrol reference" id="ie-p"><${Inp} id="ie-p" value=${f.patrol} onChange=${v=>u('patrol',v)}/></${Field}>
  <${Field} label="Persons involved" id="ie-n" wide=${true}>${pls.map((x,k)=>html`<div className="addrow" key=${k}><input aria-label=${'Person '+(k+1)+' name'} placeholder="Name" value=${x.name||''} onChange=${e=>pu(k,'name',e.target.value)}/><input aria-label=${'Person '+(k+1)+' ID'} placeholder="ID no." value=${x.id||''} onChange=${e=>pu(k,'id',e.target.value)}/><input aria-label=${'Person '+(k+1)+' phone'} placeholder="Phone" value=${x.phone||''} onChange=${e=>pu(k,'phone',e.target.value)}/><button type="button" className="btn small" onClick=${()=>setPls(a=>a.filter((_,j)=>j!==k))}>Remove</button></div>`)}<button type="button" className="btn small" onClick=${()=>setPls(a=>[...a,{name:'',id:'',phone:''}])}>Add a person</button></${Field}>
  <${Field} label="Description" id="ie-ds" wide=${true}><${TA} id="ie-ds" value=${f.desc} onChange=${v=>u('desc',v)}/></${Field}>
  <${Field} label="Action taken" id="ie-a"><${Inp} id="ie-a" value=${f.action} onChange=${v=>u('action',v)}/></${Field}>
  <${Field} label="Referred to" id="ie-f"><${Sel} id="ie-f" value=${f.ref} onChange=${v=>u('ref',v)} opts=${['None',...REFER]}/></${Field}>
  <${Field} label="Stage" id="ie-s"><${Sel} id="ie-s" value=${String(f.stage)} onChange=${v=>u('stage',v)} opts=${STAGES.map((s,k)=>[String(k),s])}/></${Field}>
  <div className="form-foot wide"><${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind="primary" id="ie-save" onClick=${save}>Save changes</${Btn}></div></div>`;
};

/* ---------- files stored on the server ---------- */
const readDataUrl=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error('Could not read the file'));r.readAsDataURL(f);});
const uploadFile=async f=>{
 const isImg=/^image\//.test(f.type);const data=isImg?await shrink(f,2000,0.82):await readDataUrl(f);
 if(!isImg&&f.type!=='application/pdf')throw new Error('Use an image (JPG, PNG) or a PDF');
 const r=await api('POST','/files',{name:f.name,mime:isImg?'image/jpeg':f.type,data});
 return {id:r.id,url:r.url,name:r.name,mime:r.mime};
};
const ScanList=({scans,onRemove})=>!scans||!scans.length?html`<p className="muted small">No scanned pages attached.</p>`:html`<div className="photos">${scans.map((x,i)=>html`<span key=${x.id||i} className="scanitem"><${FileLink} className="ph" f=${x} title=${x.name}>${x.mime==='application/pdf'?html`<span className="pdfbox">PDF<br/><small>${x.name}</small></span>`:html`<img src=${x.url} alt=${x.name||'Scanned page'}/>`}</${FileLink}>${onRemove&&html`<button type="button" className="x" aria-label=${'Remove '+x.name} onClick=${()=>onRemove(i)}>×</button>`}</span>`)}</div>`;
/* choose files, they are sent to the server and the list is returned through onAdd */
const ScanPicker=({onAdd,label='Add scanned pages or photos',id='scan-in'})=>{
 const {toast}=useApp();const [busy,setBusy]=useState(false);
 const pick=async e=>{const fs=[...e.target.files];e.target.value='';if(!fs.length)return;setBusy(true);const ok=[];
  for(const f of fs){try{ok.push(await uploadFile(f));}catch(er){toast(f.name+': '+(er.message||'upload failed'));}}
  setBusy(false);if(ok.length){onAdd(ok);toast(ok.length+' file'+(ok.length>1?'s':'')+' saved on the server');}};
 return html`<label className=${'btn small'+(busy?' disabled':'')} htmlFor=${id}>${busy?'Uploading…':label}<input id=${id} type="file" multiple accept="image/*,application/pdf" hidden onChange=${pick} disabled=${busy}/></label>`;
};
/* scans attached to one saved record (admin) */
const ScanBox=({rec,set,canEdit})=>html`<div><${ScanList} scans=${rec.scans} onRemove=${canEdit?i=>set(r=>({...r,scans:(r.scans||[]).filter((_,k)=>k!==i)})):null}/>${canEdit&&html`<div style=${{marginTop:8}}><${ScanPicker} id=${'scan-'+rec.id} onAdd=${l=>set(r=>({...r,scans:[...(r.scans||[]),...l]}))}/></div>`}</div>`;
