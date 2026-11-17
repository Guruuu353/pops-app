// Parsing of the two paper sheets (Daily Patrol Log and Entry Log) into POps records.
// Columns follow the paper exactly so a typed or pasted row looks like the row on the page.

const SHEETS = {
  daily: {
    label: 'Daily Patrol Log',
    cols: ['Date', 'Time Out', 'Time In', 'Location Patrolled', 'Observations', 'Challenges Encountered', 'Actions Taken', "Ranger's Name"],
    example: '19/5/2025\t4:00pm\t6:30am\tInside the closed area\tFishermen are fishing inside the closed area\tNo boundary markers\tAwareness and warning\tAli Shee',
  },
  entry: {
    label: 'Entry Log',
    cols: ['Date', 'Time', 'Location', 'Vessel Name', 'Boat Number', 'Person(s) Involved', 'Type of Infringement', 'Action Taken', 'Evidence Collected', "Ranger's Name"],
    example: '10/6/2025\t10:22am\tInside the LMMA\tMihreen\tLFB 3817\tPhoto taken\tStone collecting\tAwareness warning\tPhoto taken\tAli Shee',
  },
};

const iblank = (s) => { const t = String(s ?? '').trim(); return t === '' || /^[-–—_.]+$/.test(t); };

function parseDate(s) {
  const m = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2,4})$/.exec(String(s || '').trim());
  if (!m) return null;
  let [, d, mo, y] = m; d = +d; mo = +mo; y = +y; if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) || new Date(iso).getUTCDate() !== d ? null : iso;
}
// "4:00pm", "6:30 Am", "10:48 Am", "12:00 Pm", "1.20pm", "14:30"
function parseTime(s) {
  const m = /^(\d{1,2})\s*[:.]\s*(\d{2})\s*([ap])?\.?\s*m?\.?$/i.exec(String(s || '').trim());
  if (!m) return null;
  let h = +m[1]; const mi = +m[2]; const ap = (m[3] || '').toLowerCase();
  if (mi > 59) return null;
  if (ap) { if (h < 1 || h > 12) return null; if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; } else if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
function parseLocation(s) {
  const t = String(s || '').toLowerCase();
  if (iblank(t)) return null;
  if (/beach/.test(t)) return 'beach';
  const inn = /inside|\bin\b|within/.test(t), out = /outside|\bout\b/.test(t);
  if (inn && out) return 'both';
  if (out) return 'outside';
  if (inn || /lmma|closed area|no.?take|iweni/.test(t)) return 'inside';
  return null;
}
const RULES = [
  [/stone|coral collect|collecting/, 'H1'], [/juya|beach.?seine/, 'G1'], [/mono/, 'G2'], [/mesh|2\.?5|small net/, 'G3'],
  [/spear|scuba|compressor/, 'G4'], [/poison|explos|dynamite/, 'G5'], [/turtle|dugong|shark|\bray\b|endanger/, 'C2'],
  [/mangrove/, 'H3'], [/anchor/, 'H2'], [/pollut|dump|plastic/, 'H4'], [/no.?take|closed (area|zone|season)|inside the closed/, 'Z1'],
  [/licen[cs]e/, 'L1'], [/regist/, 'L2'], [/under.?age|child/, 'L3'], [/snorkel|dive|diving|conservation fee/, 'T1'],
  [/research/, 'T2'], [/film/, 'T3'], [/undersize|immature|juvenile/, 'C1'], [/life jacket/, 'V2'], [/unsea|unsafe/, 'V1'],
  [/gear|net/, 'Z3'], [/fish/, 'Z1'],
];
const guessCode = (s) => { const t = String(s || '').toLowerCase(); if (iblank(t)) return null; const r = RULES.find(([re]) => re.test(t)); return r ? r[1] : null; };
const splitNames = (s) => (iblank(s) ? [] : String(s).split(/\s*(?:,|&|\band\b|\/|;)\s*/i).map((x) => x.trim()).filter((x) => x && !iblank(x)));

// parse pasted text (tab or comma separated, from Excel/Sheets or typed)
function parsePaste(text) {
  return String(text || '').split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    if (l.includes('\t')) return l.split('\t');
    const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c; }
    out.push(cur); return out;
  });
}


const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Match a name written on paper (often just a first name) to a registered ranger when exactly one fits.
const matchRanger=n=>{const rs=(LOOK.rangers||[]).map(r=>r.name||r);const l=n.toLowerCase();const full=rs.find(r=>r.toLowerCase()===l);if(full)return full;const m=rs.filter(r=>r.toLowerCase().split(/\s+/).includes(l));return m.length===1?m[0]:n;};
const hash=s=>{let h=5381;for(const ch of s)h=((h<<5)+h+ch.charCodeAt(0))>>>0;return h.toString(36);};
const dlabel=iso=>{const [y,m,d]=iso.split('-');return `${d} ${MONTHS[+m-1]} ${y}`;};
const LOCTXT={inside:'Iweni LMMA',outside:'Outside LMMA',both:'Iweni LMMA and outside',beach:'Beach'};
// One raw row -> {skip,issues,note,rec}. rec = {kind:'patrol'|'incident', doc}
function importRow(sheet,raw,{defaultRanger,codeOverride}={}){
 const c=i=>String(raw[i]??'').trim();const issues=[],note=[];
 const date=parseDate(c(0));
 if(!date){if(!c(0))return {skip:true,issues:[],note:[]};return {issues:['Date not understood. Use day/month/year, e.g. 19/5/2025'],note:[]};}
 if(sheet==='daily'){
  const t1=parseTime(c(1)),t2=parseTime(c(2));if(!t1)issues.push('Time out not understood');if(!t2)issues.push('Time in not understood');
  const loc=parseLocation(c(3));if(!loc)issues.push('Location not understood (inside / outside / both / beach)');
  const names=splitNames(c(7)).map(matchRanger);const rg=names.length?names:[defaultRanger||'Not recorded on paper'];
  if(!names.length)note.push(defaultRanger?'Ranger blank on paper, default used':'Ranger blank on paper');
  const cl=s=>iblank(s)?'':String(s).trim();
  const key=`daily|${date}|${t1}|${loc}`;
  return {issues,note,rec:{kind:'patrol',key,doc:normPatrol({id:'IMP-'+date.replace(/-/g,'')+'-'+(t1||'').replace(':','')+'-'+(loc||'x'),iso:date,date:dlabel(date),leader:rg[0]||'',rangers:rg,cox:'',bmu:'pate',objective:'Imported from paper Daily Patrol Log',parts:{},vessel:{},areas:[LOCTXT[loc]||''],area:LOCTXT[loc]||'',inLmma:loc==='inside'||loc==='both',boat:'',status:'Completed',review:'Imported',start:t1||'',end:t2||'',obs:0,inc:0,enc:[],seiz:[],obsList:[],incList:[],photos:[],track:[],km:0,secs:0,observations:cl(c(4)),challenges:cl(c(5)),chal:{},action:cl(c(6)),imported:true,source:'Paper: Daily Patrol Log'})}};
 }
 if([1,2,3,4,5,6,7,8].every(i=>iblank(c(i))))return {skip:true,issues:[],note:['Blank row on paper (no infringement)']};
 const time=parseTime(c(1));if(!time)issues.push('Time not understood');
 const loc=parseLocation(c(2));const typeText=c(6);const code=codeOverride||guessCode(typeText);
 if(!code)issues.push('Choose an infringement code');else if(!codeOverride)note.push(`"${typeText}" read as ${code}`);
 const persons=splitNames(c(5)).filter(n=>!/^(photo|unknown|not (known|identified))/i.test(n)).map(name=>({name,id:'',phone:''}));
 const key=`entry|${date}|${time}|${(c(3)+c(4)).toLowerCase()}|${typeText.toLowerCase()}`;
 const desc=[iblank(typeText)?'Imported entry':typeText,iblank(c(3))?'':'Vessel: '+c(3)+(iblank(c(4))?'':' ('+c(4)+')'),iblank(c(8))?'':'Evidence: '+c(8)].filter(Boolean).join('. ');
 return {issues,note,rec:{kind:'incident',key,doc:normInc({id:'IMPI-'+date.replace(/-/g,'')+'-'+hash(key),iso:date,date:dlabel(date),time:time||'',cat:'Infringement',ranger:splitNames(c(9)).map(matchRanger).join(', '),patrol:'—',desc,personsList:persons,personsUnknown:!persons.length,persons:persons.length?persons.map(p=>p.name).join(', '):'Not identified',code:code||'',action:iblank(c(7))?'—':c(7),ref:'None',stage:0,loc:LOCTXT[loc]||'',imported:true,source:'Paper: Entry Log'})}};
}

const Import=()=>{
 const {patrols,setPatrols,incidents,setIncidents,log,toast}=useApp();
 const [sheet,setSheet]=useState('daily');const [txt,setTxt]=useState('');const [def,setDef]=useState('');const [ov,setOv]=useState({});const [busy,setBusy]=useState(false);const [scans,setScans]=useState([]);
 const S=SHEETS[sheet];const rows=parsePaste(txt).filter(r=>!/^date$/i.test((r[0]||'').trim()));
 const res=rows.map((r,i)=>importRow(sheet,r,{defaultRanger:def.trim(),codeOverride:ov[i]}));
 const have=new Set([...patrols.filter(p=>p.imported).map(p=>'daily|'+p.iso+'|'+p.start+'|'+(p.inLmma?'inside':'outside')),...incidents.filter(i=>i.imported).map(i=>'entry|'+i.id)]);
 const dupe=r=>r.rec&&(r.rec.kind==='patrol'?patrols:incidents).some(p=>p.id===r.rec.doc.id);
 const ok=res.filter(r=>r.rec&&!r.issues.length&&!dupe(r));const bad=res.filter(r=>!r.skip&&r.issues.length);
 const codes=(LOOK.infringements||[]).map(i=>[i.code,i.code+'. '+i.label]);
 const go=()=>{setBusy(true);const ps=ok.filter(r=>r.rec.kind==='patrol').map(r=>({...r.rec.doc,scans})),is=ok.filter(r=>r.rec.kind==='incident').map(r=>({...r.rec.doc,scans}));
  if(ps.length)setPatrols(x=>[...ps,...x]);if(is.length)setIncidents(x=>[...is,...x]);
  log('Imported paper log','Reports',S.label+': '+ok.length+' rows');toast(ok.length+' rows imported');setTxt('');setOv({});setScans([]);setBusy(false);};
 return html`<div><${PageHead} title="Import paper logs" sub="Type or paste rows exactly as written on the two paper sheets. Nothing is saved until you press Import."/>
 <${Card} title="1. Choose the sheet">
  <div className="seg">${Object.entries(SHEETS).map(([k,v])=>html`<button key=${k} className=${'segb '+(sheet===k?'on':'')} onClick=${()=>{setSheet(k);setTxt('');setOv({});}}>${v.label}</button>`)}</div>
  <p className="muted" style=${{margin:'10px 0 4px'}}>Columns, in order: <b>${S.cols.join(' | ')}</b></p>
  <p className="muted" style=${{margin:0}}>Example row (tab separated): ${S.example.replace(/\t/g,' | ')}</p>
 </${Card}>
 <${Card} title="2. Paste or type the rows" sub="Copy from Excel or Google Sheets, or type one row per line with Tab between columns. Dates are day/month/year.">
  <div className="grid2"><${Field} label="Default ranger (used when the name is blank on paper)" id="imp-def"><${Inp} id="imp-def" value=${def} onChange=${setDef} placeholder="Optional"/></${Field}></div>
  <textarea id="imp-txt" rows="8" style=${{width:'100%',fontFamily:'monospace',marginTop:10}} value=${txt} onChange=${e=>setTxt(e.target.value)} placeholder=${S.example}/>
  <div className="row" style=${{marginTop:8,gap:8}}><${Btn} kind="small" onClick=${()=>setTxt(S.example)}>Insert example row</${Btn}></div>
 </${Card}>
 ${rows.length>0&&html`<${Card} title=${'3. Check ('+ok.length+' ready, '+bad.length+' need attention)'}>
  <div className="tablewrap"><table className="tbl"><thead><tr><th>#</th><th>Date</th><th>Result</th><th>Notes</th></tr></thead><tbody>${res.map((r,i)=>html`<tr key=${i}><td>${i+1}</td><td>${rows[i][0]}</td><td>${r.skip?html`<span className="muted">Skipped</span>`:r.issues.length?html`<span style=${{color:'var(--crit,#b3261e)'}}>${r.issues.join('; ')}</span>`:dupe(r)?'Already imported':html`<b>${r.rec.kind==='patrol'?'Patrol':'Incident'}</b>`}${sheet==='entry'&&!r.skip&&r.issues.some(x=>/code/i.test(x))&&html` <${Sel} id=${'imp-code-'+i} value=${ov[i]||''} onChange=${v=>setOv(o=>({...o,[i]:v}))} opts=${[['','Choose code'],...codes]}/>`}</td><td className="muted">${(r.note||[]).join('; ')}</td></tr>`)}</tbody></table></div>
  <div className="row" style=${{marginTop:12}}><${Btn} kind="primary" id="imp-go" disabled=${!ok.length||busy} onClick=${go}>Import ${ok.length} row${ok.length===1?'':'s'}</${Btn}></div>
 </${Card}>`}
 <${Card} title="Scanned pages of the paper log" sub="Photograph or scan the pages and add them here. They are stored on the server and attached to every row you import in this batch, as evidence. You can also add or remove scans later on each record."><${ScanList} scans=${scans} onRemove=${i=>setScans(l=>l.filter((_,k)=>k!==i))}/><div style=${{marginTop:8}}><${ScanPicker} id="imp-scan" onAdd=${l=>setScans(x=>[...x,...l])}/></div></${Card}>
 </div>`;
};
