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
const splitNames = (s) => (iblank(s) ? [] : String(s).split(/\s*(?:,|&|\band\b|\/|;|\n)\s*/i).map((x) => x.trim()).filter((x) => x && !iblank(x)));

// parse pasted text (tab or comma separated, from Excel/Sheets or typed)
function parsePaste(text) {
  return String(text || '').split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    if (l.includes('\t')) return l.split('\t');
    const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const c = l[i]; if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c; }
    out.push(cur); return out;
  });
}


// Header words used to line up columns when a file has a header row, whatever order the columns are in.
const HEAD_MAP = {
  daily: [[7, /ranger/], [1, /time\s*out|^out\b|depart/], [2, /time\s*in|^in$|return|arriv/], [5, /challeng/], [6, /action/], [4, /observ/], [3, /location|patrolled|area/], [0, /date/]],
  entry: [[9, /ranger/], [3, /vessel/], [4, /boat/], [5, /person|involved/], [6, /infring|type/], [8, /evidence/], [7, /action/], [2, /location/], [1, /^time/], [0, /date/]],
};
const detectSheet = (head) => { const t = head.join(' ').toLowerCase(); if (/vessel|infring|evidence/.test(t)) return 'entry'; if (/observ|patrolled|challeng/.test(t)) return 'daily'; return null; };
function alignRows(sheet, table) {
  if (!table.length || !/^date/i.test(String(table[0][0] || '').trim())) return { rows: table, mapped: false };
  const head = table[0].map((h) => String(h || '').trim().toLowerCase()); const idx = new Array(head.length).fill(-1); const used = new Set();
  for (const [i, re] of HEAD_MAP[sheet]) { const k = head.findIndex((h, j) => idx[j] < 0 && re.test(h)); if (k >= 0 && !used.has(i)) { idx[k] = i; used.add(i); } }
  if (used.size < 3) return { rows: table.slice(1), mapped: false };
  const n = SHEETS[sheet].cols.length;
  return { rows: table.slice(1).map((r) => { const o = new Array(n).fill(''); r.forEach((c, j) => { if (idx[j] >= 0) o[idx[j]] = c; }); return o; }), mapped: true };
}
// A second vessel or person on the same day is written on the next line with the date left blank. Copy the date down.
function fillDates(sheet, rows) {
  if (sheet !== 'entry') return rows; let last = '';
  return rows.map((r) => { const d = String(r[0] ?? '').trim(); if (d) { last = d; return r; } if (last && r.some((c, i) => i > 0 && !iblank(c))) { const o = [...r]; o[0] = last; return o; } return r; });
}
const toCsv = (rows) => rows.map((r) => r.map((c) => /[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\r\n');
const guessScanDate = (name) => { const a = /(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/.exec(name), b = /(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/.exec(name); const m = a ? [a[3], a[2], a[1]] : b ? [b[1], b[2], b[3]] : null; return m ? parseDate(m.join('/')) : null; };
const minsBetween = (a, b) => { if (!a || !b) return null; const f = (t) => +t.slice(0, 2) * 60 + +t.slice(3); return (f(b) - f(a) + 1440) % 1440; };

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Match a name written on paper (often just a first name) to a registered ranger when exactly one fits.
const matchRanger=n=>{const rs=(LOOK.rangers||[]).map(r=>r.name||r);const l=n.toLowerCase();const full=rs.find(r=>r.toLowerCase()===l);if(full)return full;const m=rs.filter(r=>r.toLowerCase().split(/\s+/).includes(l));return m.length===1?m[0]:n;};
const hash=s=>{let h=5381;for(const ch of s)h=((h<<5)+h+ch.charCodeAt(0))>>>0;return h.toString(36);};
const dlabel=iso=>{const [y,m,d]=iso.split('-');return `${d} ${MONTHS[+m-1]} ${y}`;};
const LOCTXT={inside:'Iweni LMMA',outside:'Outside LMMA',both:'Iweni LMMA and outside',beach:'Beach'};
// One raw row -> {skip,issues,note,rec}. rec = {kind:'patrol'|'incident', doc}
function importRow(sheet,raw,{defaultRanger,codeOverride,patrolOn={},batch=''}={}){
 const c=i=>String(raw[i]??'').trim();const issues=[],note=[];
 const date=parseDate(c(0));
 if(!date){if(!c(0))return {skip:true,issues:[],note:[]};return {issues:['Date not understood. Use day/month/year, e.g. 19/5/2025'],note:[]};}
 if(date>isoToday()||date<'2020-01-01')return {issues:['Date '+date+' looks wrong. Check the year on the paper.'],note:[]};
 if(sheet==='daily'){
  const t1=parseTime(c(1)),t2=parseTime(c(2));if(!t1)issues.push('Time out not understood');if(!t2)issues.push('Time in not understood');
  const loc=parseLocation(c(3));if(!loc)issues.push('Location not understood (inside / outside / both / beach)');
  const names=splitNames(c(7)).map(matchRanger);const rg=names.length?names:[defaultRanger||'Not recorded on paper'];
  if(!names.length)note.push(defaultRanger?'Ranger blank on paper, default used':'Ranger blank on paper');
  const cl=s=>iblank(s)?'':String(s).trim();
  const key=`daily|${date}|${t1}|${loc}`;const mins=minsBetween(t1,t2);if(mins!==null&&(mins>14*60||mins<10))note.push('Patrol length '+Math.floor(mins/60)+' h '+mins%60+' min. Check Time Out and Time In against the paper.');const raw3=c(3).replace(/\s+/g,' ');const areaTxt=(LOCTXT[loc]||'')+(raw3&&!iblank(raw3)&&raw3.toLowerCase()!==(LOCTXT[loc]||'').toLowerCase()?': '+raw3:'');
  return {issues,note,rec:{kind:'patrol',key,doc:normPatrol({id:'IMP-'+date.replace(/-/g,'')+'-'+(t1||'').replace(':','')+'-'+(loc||'x'),iso:date,date:dlabel(date),leader:rg[0]||'',rangers:rg,cox:'',bmu:'pate',objective:'Imported from paper Daily Patrol Log',parts:{},vessel:{},areas:[areaTxt],area:areaTxt,locKind:loc||'',secs:mins?mins*60:0,batch,inLmma:loc==='inside'||loc==='both',boat:'',status:'Completed',review:'Imported',start:t1||'',end:t2||'',obs:0,inc:0,enc:[],seiz:[],obsList:[],incList:[],photos:[],track:[],km:0,observations:cl(c(4)),challenges:cl(c(5)),chal:{},action:cl(c(6)),imported:true,source:'Paper: Daily Patrol Log'})}};
 }
 if([1,2,3,4,5,6,7,8].every(i=>iblank(c(i))))return {skip:true,issues:[],note:['Blank row on paper (no infringement)']};
 const time=parseTime(c(1));if(!time)issues.push('Time not understood');
 const loc=parseLocation(c(2));const typeText=c(6);const code=codeOverride||guessCode(typeText);
 if(!code)issues.push('Choose an infringement code');else if(!codeOverride)note.push(`"${typeText}" read as ${code}`);if(patrolOn[date])note.push('Linked to patrol '+patrolOn[date]);
 const persons=splitNames(c(5)).filter(n=>!/^(photo|unknown|not (known|identified))/i.test(n)).map(name=>({name,id:'',phone:''}));
 const key=`entry|${date}|${time}|${(c(3)+c(4)).toLowerCase()}|${typeText.toLowerCase()}`;
 const desc=[iblank(typeText)?'Imported entry':typeText,iblank(c(3))?'':'Vessel: '+c(3)+(iblank(c(4))?'':' ('+c(4)+')'),iblank(c(8))?'':'Evidence: '+c(8)].filter(Boolean).join('. ');
 return {issues,note,rec:{kind:'incident',key,doc:normInc({id:'IMPI-'+date.replace(/-/g,'')+'-'+hash(key),iso:date,date:dlabel(date),time:time||'',cat:'Infringement',ranger:splitNames(c(9)).map(matchRanger).join(', '),patrol:patrolOn[date]||'—',batch,desc,personsList:persons,personsUnknown:!persons.length,persons:persons.length?persons.map(p=>p.name).join(', '):'Not identified',code:code||'',action:iblank(c(7))?'—':c(7),ref:'None',stage:0,loc:LOCTXT[loc]||'',imported:true,source:'Paper: Entry Log'})}};
}

const RowImages=({id,list,pool,set})=>html`<div><${ScanList} scans=${list} onRemove=${i=>set(l=>l.filter((_,k)=>k!==i))}/><${ScanPicker} id=${'row-'+id} label=${list.length?'Add more':'Add image'} onAdd=${l=>set(x=>[...x,...l])}/>${pool.length>0&&html`<span style=${{marginLeft:6}}><${Sel} id=${'pool-'+id} value=${''} onChange=${v=>{const f=pool.find(x=>x.id===v);if(f)set(x=>x.some(y=>y.id===f.id)?x:[...x,f]);}} opts=${[['','Use a batch page…'],...pool.map(x=>[x.id,x.name])]}/></span>`}</div>`;
const PAGE=60;
const Import=()=>{
 const {patrols,setPatrols,incidents,setIncidents,log,toast,role}=useApp();
 const [sheet,setSheet]=useState('daily');const [txt,setTxt]=useState('');const [def,setDef]=useState('');const [ov,setOv]=useState({});const [busy,setBusy]=useState(false);const [scans,setScans]=useState([]);const [rs,setRs]=useState({});const [mode,setMode]=useState('grid');const [grid,setGrid]=useState([[]]);
 const [flt,setFlt]=useState('all');const [lim,setLim]=useState(PAGE);const [fnote,setFnote]=useState('');const [kill,setKill]=useState('');
 const S=SHEETS[sheet];const nc=S.cols.length;
 const rawRows=(mode==='grid'?grid.filter(r=>r.some(c=>(c||'').trim())):parsePaste(txt)).filter(r=>!/^date$/i.test((r[0]||'').trim()));
 const rows=fillDates(sheet,rawRows);
 const setCell=(i,j,v)=>setGrid(g=>g.map((r,k)=>k===i?Array.from({length:nc},(_,c)=>c===j?v:(r[c]||'')):r));
 const toGrid=()=>{const g=parsePaste(txt).map(r=>Array.from({length:nc},(_,c)=>r[c]||''));setGrid(g.length?g:[[]]);setMode('grid');};
 /* patrols already on record, by day, so entries can be linked to the patrol of the same day */
 const patrolOn={};patrols.forEach(p=>{const iso=patrolIso(p);if(!iso)return;const cur=patrols.find(x=>x.id===patrolOn[iso]);if(!cur||(p.inLmma&&!cur.inLmma))patrolOn[iso]=p.id;});
 const [batchId,setBatchId]=useState(()=>'B'+Date.now().toString(36).toUpperCase());
 const res=rows.map((r,i)=>importRow(sheet,r,{defaultRanger:def.trim(),codeOverride:ov[i],patrolOn,batch:batchId}));
 const dupe=r=>r.rec&&(r.rec.kind==='patrol'?patrols:incidents).some(p=>p.id===r.rec.doc.id);
 const seen=new Set();const inb=res.map(r=>{if(!r.rec)return false;const k=r.rec.doc.id;if(seen.has(k))return true;seen.add(k);return false;});
 const ok=res.filter((r,i)=>r.rec&&!r.issues.length&&!dupe(r)&&!inb[i]);const bad=res.filter(r=>!r.skip&&r.issues.length);
 const codes=(LOOK.infringements||[]).map(i=>[i.code,i.code+'. '+i.label]);
 /* scanned pages are matched to rows by date range */
 const scansFor=doc=>{const a=scans.filter(x=>(!x.from&&!x.to)||((!x.from||doc.iso>=x.from)&&(!x.to||doc.iso<=x.to)));const all=[...a,...(rs[doc.id]||[])];const u=[];all.forEach(x=>{if(!u.some(y=>y.id===x.id)){const {from,to,...c}=x;u.push(c);}});return u;};
 const go=()=>{setBusy(true);const ps=ok.filter(r=>r.rec.kind==='patrol').map(r=>({...r.rec.doc,batchAt:stamp(),scans:scansFor(r.rec.doc)})),is=ok.filter(r=>r.rec.kind==='incident').map(r=>({...r.rec.doc,batchAt:stamp(),scans:scansFor(r.rec.doc)}));
  if(ps.length)setPatrols(x=>[...ps,...x]);if(is.length)setIncidents(x=>[...is,...x]);
  log('Imported paper log','Reports',S.label+': '+ok.length+' rows (batch '+batchId+')');toast(ok.length+' rows imported');setTxt('');setGrid([[]]);setOv({});setScans([]);setRs({});setFnote('');setBatchId('B'+Date.now().toString(36).toUpperCase());setBusy(false);};
 const loadFile=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  if(/\.xlsx?$/i.test(f.name)){setFnote('Excel files cannot be read directly. In Excel use Save As, CSV, then choose that file. Or copy the cells and use Paste from Excel.');return;}
  const t=(await f.text()).replace(/^﻿/,'');const table=parsePaste(t);if(!table.length){setFnote('That file is empty.');return;}
  const hasHead=/^date/i.test(String(table[0][0]||'').trim());const det=hasHead?detectSheet(table[0]):null;const sh=det||sheet;
  const al=alignRows(sh,table);setSheet(sh);setOv({});setTxt(al.rows.map(r=>r.join('\t')).join('\n'));setMode('paste');setLim(PAGE);setFlt('all');
  setFnote(al.rows.length+' rows read from '+f.name+(det?' as the '+SHEETS[sh].label:'')+(al.mapped?', columns matched by their headings':'')+'. Check them below, then import.');};
 const tpl=()=>downloadText('pops-'+sheet+'-log-template.csv',toCsv([S.cols,S.example.split('\t')]),'text/csv');
 /* summary of what is about to be imported */
 const okP=ok.filter(r=>r.rec.kind==='patrol').map(r=>r.rec.doc),okI=ok.filter(r=>r.rec.kind==='incident').map(r=>r.rec.doc);
 const dts=ok.map(r=>r.rec.doc.iso).sort();const byMonth={};dts.forEach(d=>{const m=d.slice(0,7);byMonth[m]=(byMonth[m]||0)+1;});
 const kinds={};okP.forEach(p=>{kinds[p.locKind]=(kinds[p.locKind]||0)+1;});
 const shown=res.map((r,i)=>({r,i})).filter(({r,i})=>flt==='all'||(!r.skip&&(r.issues.length||inb[i]||dupe(r))));
 /* batches already imported, with undo */
 const batches={};[...patrols.map(p=>[p,'p']),...incidents.map(p=>[p,'i'])].forEach(([x,k])=>{if(!x.batch)return;const b=batches[x.batch]||(batches[x.batch]={id:x.batch,at:x.batchAt||'',np:0,ni:0,from:'9',to:'0'});if(k==='p')b.np++;else b.ni++;const d=x.iso||'';if(d&&d<b.from)b.from=d;if(d&&d>b.to)b.to=d;if(!b.at&&x.batchAt)b.at=x.batchAt;});
 const blist=Object.values(batches).sort((a,b)=>a.id<b.id?1:-1);
 const undo=b=>{setPatrols(x=>x.filter(p=>p.batch!==b.id));setIncidents(x=>x.filter(p=>p.batch!==b.id));log('Removed imported batch','Reports',b.id+': '+b.np+' patrols, '+b.ni+' incidents');toast('Batch '+b.id+' removed');setKill('');};
 const canRow=r=>r.rec&&!r.issues.length&&!dupe(r);
 return html`<div><${PageHead} title="Import paper logs" sub="Load rows from a file, paste them from Excel, or type them exactly as written on the two paper sheets. Nothing is saved until you press Import."/>
 <${Card} title="1. Choose the sheet">
  <div className="seg">${Object.entries(SHEETS).map(([k,v])=>html`<button key=${k} className=${'segb '+(sheet===k?'on':'')} onClick=${()=>{setSheet(k);setTxt('');setGrid([[]]);setOv({});setFnote('');}}>${v.label}</button>`)}</div>
  <p className="muted" style=${{margin:'10px 0 4px'}}>Columns, in order: <b>${S.cols.join(' | ')}</b></p>
  <p className="muted" style=${{margin:0}}>Example row (tab separated): ${S.example.replace(/\t/g,' | ')}</p>
 </${Card}>
 <${Card} title="2. Enter the rows" sub="Best for two years of records: type them in Excel or Google Sheets, save as CSV, and load the file. Dates are day/month/year. For the Entry Log, leave the date empty on a second vessel of the same day and it takes the date above.">
  <div className="row" style=${{gap:8,flexWrap:'wrap',marginBottom:10}}><label className="btn small" htmlFor="imp-file">Load a CSV or text file<input id="imp-file" type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onChange=${loadFile}/></label><${Btn} kind="small" onClick=${tpl}>Download a blank template</${Btn}></div>
  ${fnote&&html`<p className="small" role="status" style=${{margin:'0 0 10px'}}>${fnote}</p>`}
  <div className="seg" style=${{marginBottom:10}}><button className=${'segb '+(mode==='grid'?'on':'')} onClick=${()=>setMode('grid')}>Type in a table</button><button className=${'segb '+(mode==='paste'?'on':'')} onClick=${()=>setMode('paste')}>Paste from Excel</button></div>
  <div className="grid2"><${Field} label="Default ranger (used when the name is blank on paper)" id="imp-def"><${Inp} id="imp-def" value=${def} onChange=${setDef} placeholder="Optional"/></${Field}></div>
  ${mode==='grid'?html`<div className="tscroll" style=${{marginTop:10}}><table className="tbl stack gridtbl"><thead><tr><th>#</th>${S.cols.map(c=>html`<th key=${c}>${c}</th>`)}<th></th></tr></thead><tbody>${grid.map((r,i)=>html`<tr key=${i}><td data-label="Row">${i+1}</td>${S.cols.map((c,j)=>html`<td key=${j} data-label=${c}><input id=${'g-'+i+'-'+j} aria-label=${c+' row '+(i+1)} style=${{minWidth:j===0?96:j===3||j===4?150:90}} value=${r[j]||''} onChange=${e=>setCell(i,j,e.target.value)} placeholder=${j===0?'d/m/yyyy':''}/></td>`)}<td data-label=""><button type="button" className="x" aria-label=${'Remove row '+(i+1)} onClick=${()=>setGrid(g=>g.length>1?g.filter((_,k)=>k!==i):[[]])}>×</button></td></tr>`)}</tbody></table></div>
   <div className="row" style=${{marginTop:8,gap:8}}><${Btn} kind="small" id="imp-addrow" onClick=${()=>setGrid(g=>[...g,[]])}>Add a row</${Btn}><${Btn} kind="small" onClick=${()=>setGrid(g=>[...g,[...(g[g.length-1]||[])]])}>Copy last row</${Btn}></div>`:html`<textarea id="imp-txt" rows="8" style=${{width:'100%',fontFamily:'monospace',marginTop:10}} value=${txt} onChange=${e=>setTxt(e.target.value)} placeholder=${S.example}/>
   <div className="row" style=${{marginTop:8,gap:8}}><${Btn} kind="small" onClick=${()=>setTxt(S.example)}>Insert example row</${Btn}><${Btn} kind="small" id="imp-togrid" onClick=${toGrid}>Move into the table to fix blanks</${Btn}></div>`}
 </${Card}>
 ${rows.length>0&&html`<${Card} title=${'3. Check ('+ok.length+' ready, '+bad.length+' need attention)'}>
  ${ok.length>0&&html`<div className="impsum"><p style=${{margin:'0 0 6px'}}><b>${okP.length}</b> patrol${okP.length===1?'':'s'} and <b>${okI.length}</b> incident${okI.length===1?'':'s'} ready, from <b>${dlabel(dts[0])}</b> to <b>${dlabel(dts[dts.length-1])}</b>.${okP.length>0&&html` Inside the LMMA: ${(kinds.inside||0)+(kinds.both||0)}, outside: ${kinds.outside||0}, beach: ${kinds.beach||0}.`}</p>
   <p className="muted small" style=${{margin:0}}>By month: ${Object.entries(byMonth).map(([m,n])=>MONTHS[+m.slice(5)-1]+' '+m.slice(0,4)+' ('+n+')').join(', ')}</p></div>`}
  <div className="seg" style=${{margin:'10px 0'}}><button className=${'segb '+(flt==='all'?'on':'')} onClick=${()=>setFlt('all')}>All rows</button><button className=${'segb '+(flt==='bad'?'on':'')} onClick=${()=>{setFlt('bad');setLim(PAGE);}}>Only rows to fix (${bad.length+inb.filter(Boolean).length})</button></div>
  <div className="tscroll"><table className="tbl stack"><thead><tr><th>#</th><th>Date</th><th>Result</th><th>Notes</th><th>Images for this row</th></tr></thead><tbody>${shown.slice(0,lim).map(({r,i})=>html`<tr key=${i}><td data-label="Row">${i+1}</td><td data-label="Date">${rows[i][0]}</td><td data-label="Result">${r.skip?html`<span className="muted">Skipped</span>`:r.issues.length?html`<span style=${{color:'var(--crit,#b3261e)'}}>${r.issues.join('; ')}</span>`:inb[i]?html`<span style=${{color:'var(--crit,#b3261e)'}}>Same as an earlier row in this list</span>`:dupe(r)?'Already imported':html`<b>${r.rec.kind==='patrol'?'Patrol':'Incident'}</b>`}${sheet==='entry'&&!r.skip&&r.issues.some(x=>/code/i.test(x))&&html` <${Sel} id=${'imp-code-'+i} value=${ov[i]||''} onChange=${v=>setOv(o=>({...o,[i]:v}))} opts=${[['','Choose code'],...codes]}/>`}</td><td className="muted" data-label="Notes">${(r.note||[]).join('; ')}</td><td data-label="Images">${canRow(r)?html`<${RowImages} id=${r.rec.doc.id} list=${rs[r.rec.doc.id]||[]} pool=${scans} set=${f=>setRs(o=>({...o,[r.rec.doc.id]:f(o[r.rec.doc.id]||[])}))}/>`:''}</td></tr>`)}</tbody></table></div>
  ${shown.length>lim&&html`<div className="row" style=${{marginTop:8,gap:8}}><${Btn} kind="small" onClick=${()=>setLim(l=>l+PAGE)}>Show ${Math.min(PAGE,shown.length-lim)} more (${shown.length-lim} not shown)</${Btn}></div>`}
  <div className="row" style=${{marginTop:12}}><${Btn} kind="primary" id="imp-go" disabled=${!ok.length||busy} onClick=${go}>Import ${ok.length} row${ok.length===1?'':'s'}</${Btn}></div>
  <p className="muted small">Only the ready rows are imported. Rows that need attention stay here so you can fix them and import again. Every import is a batch you can remove below.</p>
 </${Card}>`}
 <${Card} title="Scanned pages of the paper log" sub="Add a scan or photo of a page and say which dates it covers. It is attached to every imported row in that date range. A page with no dates is attached to every row of the batch. For a photo that belongs to one patrol or incident only, use the Images column in step 3. A file name that contains a date (2025-05-19.jpg) fills the dates in for you.">
  ${scans.length===0?html`<p className="muted small">No scanned pages attached.</p>`:html`<ul className="scanpool">${scans.map((x,i)=>html`<li key=${x.id||i}><a className="ph" href=${x.url} target="_blank" rel="noopener" title=${x.name}>${x.mime==='application/pdf'?html`<span className="pdfbox">PDF</span>`:html`<img src=${x.url} alt=${x.name||'Scanned page'}/>`}</a><span className="sp-n">${x.name}</span><label className="sp-d">From<input type="date" aria-label=${'From date for '+x.name} value=${x.from||''} onChange=${e=>{const v=e.target.value;setScans(l=>l.map((y,k)=>k===i?{...y,from:v,to:y.to||v}:y));}}/></label><label className="sp-d">To<input type="date" aria-label=${'To date for '+x.name} value=${x.to||''} onChange=${e=>{const v=e.target.value;setScans(l=>l.map((y,k)=>k===i?{...y,to:v}:y));}}/></label><span className="sp-m">${!x.from&&!x.to?'every row':res.filter(q=>q.rec&&(!x.from||q.rec.doc.iso>=x.from)&&(!x.to||q.rec.doc.iso<=x.to)).length+' rows'}</span><button type="button" className="x" aria-label=${'Remove '+x.name} onClick=${()=>setScans(l=>l.filter((_,k)=>k!==i))}>×</button></li>`)}</ul>`}
  <div style=${{marginTop:8}}><${ScanPicker} id="imp-scan" onAdd=${l=>setScans(x=>[...x,...l.map(f=>{const d=guessScanDate(f.name||'');return d?{...f,from:d,to:d}:f;})])}/></div></${Card}>
 ${blist.length>0&&html`<${Card} title="Imported batches" sub="Each import is kept as a batch. If something was wrong, remove the whole batch and import it again."><${Table} empty="" cols=${[{h:'Batch',k:'id',cls:'mono'},{h:'Imported',k:'at'},{h:'Dates',k:'d',r:r=>r.from<=r.to?dlabel(r.from)+' to '+dlabel(r.to):'—'},{h:'Patrols',k:'np',cls:'num'},{h:'Incidents',k:'ni',cls:'num'},{h:'',k:'a',r:r=>role==='admin'?(kill===r.id?html`<span><button className="link" onClick=${()=>undo(r)}>Yes, remove ${r.np+r.ni} records</button> · <button className="link" onClick=${()=>setKill('')}>Keep</button></span>`:html`<button className="link" onClick=${()=>setKill(r.id)}>Remove batch</button>`):''}]} rows=${blist}/></${Card}>`}
 </div>`;
};
