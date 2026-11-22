/* ============ shared UI components ============ */
const ICONS={
 dashboard:['M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z'],
 map:['M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z','M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
 patrol:['M3 17c3-1 4-5 7-5s4 4 7 4 3-2 4-3','M5 7a2 2 0 1 0 0-.01','M19 7a2 2 0 1 0 0-.01','M7 7h10'],
 incident:['M12 3l10 18H2z','M12 10v5','M12 18v.01'],
 lmma:['M4 8l6-4 8 3 3 8-6 6-8-2z','M9 10l4 1 2 4'],
 projects:['M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
 coral:['M12 21v-7','M12 14c-3 0-5-2-5-5','M12 14c3 0 5-2 5-5','M7 9V5','M17 9V4','M12 14V8'],
 staff:['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z','M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6','M16 4.5a3 3 0 0 1 0 6','M18 14c2.2.6 3.5 2.6 3.5 5'],
 bmus:['M4 20V9l8-5 8 5v11','M9 20v-6h6v6'],
 partners:['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1','M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
 boat:['M3 15l2 5h14l2-5z','M12 4v11','M12 5l6 8h-6','M12 7l-4 6h4'],
 tourism:['M12 3v2','M12 19v2','M3 12h2','M19 12h2','M5.6 5.6L7 7','M17 17l1.4 1.4','M5.6 18.4L7 17','M17 7l1.4-1.4','M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
 finance:['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M14.5 9.5c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.800 0 2.700 5 1.300 5 3.900 0 1.100-1.100 1.900-2.600 1.900-1.200 0-2.100-.5-2.600-1.300','M12 6.800v1.500','M12 15.700v1.500'],
 reports:['M6 3h8l4 4v14H6z','M14 3v4h4','M9 12h6','M9 16h6'],
 settings:['M4 7h9','M17 7h3','M4 17h3','M11 17h9','M15 5v4','M9 15v4'],
 audit:['M12 3l8 3v6c0 4.500-3.400 8-8 9-4.600-1-8-4.500-8-9V6z','M9 12l2 2 4-4'],
 bell:['M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15z','M10 21a2 2 0 0 0 4 0'],
 search:['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M20 20l-4-4'],
 menu:['M4 7h16','M4 12h16','M4 17h16'],
 lock:['M6 11h12v9H6z','M8 11V8a4 4 0 0 1 8 0v3'],
 check:['M5 12.500l4.500 4.500L19 7'],
 x:['M6 6l12 12','M18 6L6 18'],
 wifi:['M2.500 9a14 14 0 0 1 19 0','M5.500 12.500a9.500 9.500 0 0 1 13 0','M8.800 16a5 5 0 0 1 6.400 0','M12 19.500v.01'],
 wifioff:['M3 3l18 18','M2.500 9a14 14 0 0 1 5-3','M16.500 6.500A14 14 0 0 1 21.500 9','M8.800 16a5 5 0 0 1 6.400 0','M12 19.500v.01'],
 plus:['M12 5v14','M5 12h14'],
 download:['M12 4v11','M7 11l5 5 5-5','M5 20h14'],
 camera:['M4 8h3l2-3h6l2 3h3v11H4z','M12 17a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z'],
 play:['M7 4l13 8-13 8z'],
 pause:['M7 4h3.500v16H7z','M13.500 4H17v16h-3.500z'],
 stop:['M6 6h12v12H6z'],
 chev:['M9 6l6 6-6 6'],
 eye:['M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
 sun:['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M12 2v2','M12 20v2','M2 12h2','M20 12h2'],
 moon:['M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z'],
 pin:['M12 21s-6-5-6-10a6 6 0 0 1 12 0c0 5-6 10-6 10z'],
 sync:['M20 11a8 8 0 0 0-14.500-3.500L4 9','M4 4v5h5','M4 13a8 8 0 0 0 14.500 3.500L20 15','M20 20v-5h-5'],
 out:['M10 4H5v16h5','M15 8l4 4-4 4','M19 12H9'],
 shield:['M12 3l8 3v6c0 4.500-3.400 8-8 9-4.600-1-8-4.500-8-9V6z'],
 globe:['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z','M3 12h18','M12 3c2.500 2.500 3.800 5.500 3.800 9s-1.300 6.500-3.800 9c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3z'],
 phone:['M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z','M11 18h2'],
 route:['M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z','M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z','M8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6'],
 target:['M12 15.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7z','M12 2v3','M12 19v3','M2 12h3','M19 12h3'],
 info:['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z','M12 11v5','M12 8v.01'],
 plusc:['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M12 9v6','M9 12h6']
};
const Icon=({n,s=18,sw=1.8})=>html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth=${sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ico">${(ICONS[n]||[]).map((d,i)=>html`<path key=${i} d=${d}/>`)}</svg>`;

const TONE={Planned:'info',Active:'good',Paused:'warn',Completed:'neutral','Pending Sync':'warn',Overdue:'crit',Reviewed:'good','Pending review':'warn',
 Paid:'good','Partially paid':'warn',Unpaid:'crit',Refunded:'neutral',Cancelled:'neutral',Draft:'neutral',Submitted:'info',Approved:'good',Reconciled:'good',
 Income:'good',Expense:'neutral','In progress':'info',Done:'good','On track':'good',Open:'info','Due soon':'warn','In service':'good','Under repair':'crit',Good:'good',Fair:'warn','Needs service':'crit',
 Healthy:'good',Watch:'warn',Resolved:'neutral',Logged:'neutral',Moored:'neutral','On leave':'warn',Pending:'warn','Awaiting reconciliation':'warn','Not applicable':'neutral',
 Verified:'good','Awaiting verification':'warn'};
const Chip=({t,tone,dot=true})=>html`<span className=${'chip '+(tone||TONE[t]||'neutral')}>${dot&&html`<i/>`}${t}</span>`;

const PageHead=({title,sub,children})=>html`<div className="pagehead"><div><h1>${title}</h1>${sub&&html`<p>${sub}</p>`}</div><div className="pagehead-actions">${children}</div></div>`;
const Card=({title,sub,right,children,className=''})=>html`<section className=${'card '+className}>${(title||right)&&html`<header className="card-h"><div><h2>${title}</h2>${sub&&html`<p>${sub}</p>`}</div>${right}</header>`}<div className="card-b">${children}</div></section>`;
const Kpi=({label,value,note,tone,onClick})=>html`<${onClick?'button':'div'} type=${onClick?'button':undefined} onClick=${onClick} className=${'kpi'+(onClick?' kpi-click':'')}><span className="kpi-l">${label}</span><strong className="kpi-v">${value}</strong>${note&&html`<span className=${'kpi-n '+(tone||'')}>${note}</span>`}</${onClick?'button':'div'}>`;
const Btn=({children,onClick,kind='',icon,disabled,title,type='button',id})=>html`<button id=${id} type=${type} className=${'btn '+kind} onClick=${onClick} disabled=${disabled} title=${title}>${icon&&html`<${Icon} n=${icon} s=${16}/>`}${children}</button>`;
const Toggle=({on,onChange,label,id})=>html`<button id=${id} type="button" role="switch" aria-checked=${on} aria-label=${label} className=${'toggle '+(on?'on':'')} onClick=${()=>onChange(!on)}><i/><span>${on?'ON':'OFF'}</span></button>`;
const Notice=({tone='info',title,children})=>html`<div className=${'notice '+tone}><strong>${title}</strong><span>${children}</span></div>`;
const Progress=({v,tone})=>html`<div className="prog" role="progressbar" aria-valuenow=${v} aria-valuemin="0" aria-valuemax="100"><i className=${tone||''} style=${{width:v+'%'}}/></div>`;
const Tabs=({tabs,value,onChange})=>html`<div className="tabs" role="tablist">${tabs.map(t=>html`<button key=${t[0]} role="tab" aria-selected=${value===t[0]} className=${value===t[0]?'on':''} onClick=${()=>onChange(t[0])}>${t[1]}</button>`)}</div>`;
const Field=({label,id,children,wide})=>html`<div className=${'field '+(wide?'wide':'')}><label htmlFor=${id}>${label}</label>${children}</div>`;
const Sel=({id,value,onChange,opts})=>html`<select id=${id} value=${value} onChange=${e=>onChange(e.target.value)}>${opts.map(o=>Array.isArray(o)?html`<option key=${o[0]} value=${o[0]}>${o[1]}</option>`:html`<option key=${o} value=${o}>${o}</option>`)}</select>`;
const Inp=({id,value,onChange,type='text',placeholder,list})=>type==='time'?html`<${Tm12} id=${id} value=${value} onChange=${onChange}/>`:html`<input id=${id} type=${type} value=${value} placeholder=${placeholder} list=${list} onChange=${e=>onChange(e.target.value)}/>`;

const Table=({cols,rows,onRow,empty='No records to show.',sel,find,size,exp})=>{
 const [pg,setPg]=useState(0);const [sz,setSz]=useState(size||25);const [q,setQ]=useState('');
 const all=q.trim()?rows.filter(r=>JSON.stringify(Object.values(r)).toLowerCase().includes(q.trim().toLowerCase())):rows;
 const pages=Math.max(1,Math.ceil(all.length/sz));const cur=Math.min(pg,pages-1);
 useEffect(()=>{setPg(0);},[q,sz]);
 const vis=all.length>sz?all.slice(cur*sz,cur*sz+sz):all;
 const xcols=cols.filter(c=>c.h);const xrows=()=>all.map(r=>xcols.map(c=>plainOf(c.r?c.r(r):r[c.k])));
 return html`<div>${exp&&rows.length>0&&html`<div className="texp"><span className="muted small">${all.length} record${all.length===1?'':'s'}</span><span className="btnrow"><button type="button" className="btn small" onClick=${()=>{if(!previewPdf(exp,{title:exp,sub:'Patte Conservation · Iweni LMMA · POps',head:xcols.map(c=>c.h),rows:xrows()}))alert('Could not make the PDF');}}><${Icon} n="eye" s=${14}/> Preview PDF</button><button type="button" className="btn small" onClick=${()=>saveCSV(exp.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.csv',[xcols.map(c=>c.h),...xrows()])}><${Icon} n="download" s=${14}/> CSV</button></span></div>`}${find&&rows.length>8&&html`<div className="search tsearch"><${Icon} n="search" s=${16}/><input aria-label="Search this list" placeholder="Search this list" value=${q} onChange=${e=>setQ(e.target.value)}/></div>`}<div className="tscroll"><table className="tbl stack"><thead><tr>${cols.map(c=>html`<th key=${c.k} className=${c.cls||''}>${c.h}</th>`)}</tr></thead><tbody>${vis.length?vis.map((r,i)=>html`<tr key=${r.id||r.no||i} className=${(onRow?'click ':'')+(sel&&sel===r.id?'sel':'')} onClick=${onRow?()=>onRow(r):null} tabIndex=${onRow?0:null} onKeyDown=${onRow?e=>{if(e.key==='Enter')onRow(r);}:null}>${cols.map(c=>html`<td key=${c.k} data-label=${c.h} className=${c.cls||''}>${c.r?c.r(r):r[c.k]}</td>`)}</tr>`):html`<tr><td colSpan=${cols.length} className="empty">${q?'Nothing matches your search.':empty}</td></tr>`}</tbody></table></div>
 ${all.length>10&&html`<div className="pager" role="navigation" aria-label="Pages"><span>${cur*sz+1}–${Math.min(all.length,cur*sz+sz)} of ${all.length}</span><span className="pgb"><button type="button" className="btn small" disabled=${cur===0} onClick=${()=>setPg(0)} aria-label="First page">«</button><button type="button" className="btn small" disabled=${cur===0} onClick=${()=>setPg(cur-1)}>Previous</button><b>${cur+1} / ${pages}</b><button type="button" className="btn small" disabled=${cur>=pages-1} onClick=${()=>setPg(cur+1)}>Next</button><button type="button" className="btn small" disabled=${cur>=pages-1} onClick=${()=>setPg(pages-1)} aria-label="Last page">»</button></span><select aria-label="Rows per page" value=${sz} onChange=${e=>setSz(+e.target.value)}>${[10,25,50,100].map(n=>html`<option key=${n} value=${n}>${n} per page</option>`)}</select></div>`}</div>`;};

const Drawer=({open,onClose,title,sub,children,foot,wide})=>{
 useEffect(()=>{if(!open)return;const f=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f);},[open]);
 if(!open)return null;
 return html`<div className="overlay" onClick=${onClose}><aside className=${'drawer '+(wide?'wide':'')} role="dialog" aria-modal="true" aria-label=${title} onClick=${e=>e.stopPropagation()}><header><div><h2>${title}</h2>${sub&&html`<p>${sub}</p>`}</div><button className="iconbtn" onClick=${onClose} aria-label="Close"><${Icon} n="x"/></button></header><div className="drawer-b">${children}</div>${foot&&html`<footer>${foot}</footer>`}</aside></div>`;
};
const Modal=({open,onClose,title,children,foot,wide})=>{
 useEffect(()=>{if(!open)return;const f=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f);},[open]);
 if(!open)return null;
 return html`<div className="overlay center" onClick=${onClose}><div className=${'modal '+(wide?'wide':'')} role="dialog" aria-modal="true" aria-label=${title} onClick=${e=>e.stopPropagation()}><header><h2>${title}</h2><button className="iconbtn" onClick=${onClose} aria-label="Close"><${Icon} n="x"/></button></header><div className="modal-b">${children}</div>${foot&&html`<footer>${foot}</footer>`}</div></div>`;
};
const KV=({rows})=>html`<dl className="kv">${rows.map(r=>html`<div key=${r[0]}><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`)}</dl>`;

const Denied=({mod,role,why})=>{const proj=why==='project';const lines=proj?['Access to this project','→ 403 Forbidden','  rule: project access','  user: '+ROLES[role].user+' · not assigned to this project']:['Access to '+mod,'→ 403 Forbidden','  rule: role permissions','  user: '+ROLES[role].user+' · role: '+ROLES[role].label];
 return html`<div className="denied"><div className="denied-ic"><${Icon} n="lock" s=${28}/></div><h2>${proj?'You are not assigned to '+mod:mod+' is not part of the '+ROLES[role].label+' role'}</h2><p>${proj?'Only the Super Admin can assign officers to projects. Pages, records, photographs, documents and reports of other projects stay closed.':'This view is hidden for this role.'} The request would also be refused by the server. In the real build every record is checked in the API and the database, so changing the page address or calling the API directly returns the same <code>403 Forbidden</code>.</p><pre className="code">${lines.join('\n')}</pre></div>`;};

/* ---------- charts ---------- */
const BarChart=({data,color='var(--c1)',unit='',h=190,hi})=>{
 const [tip,setTip]=useState(null);
 const W=520,H=h,L=34,B=24,T=10,R=8;const max=Math.max(...data.map(d=>d[1]))*1.15||1;const step=Math.pow(10,Math.floor(Math.log10(max)));const ticks=[0,1,2,3,4].map(i=>Math.round(max/4*i/step)*step);
 const bw=(W-L-R)/data.length;
 return html`<div className="chart"><svg viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Bar chart" onMouseLeave=${()=>setTip(null)}>
 ${ticks.map(t=>html`<g key=${t}><line x1=${L} x2=${W-R} y1=${H-B-(H-B-T)*t/max} y2=${H-B-(H-B-T)*t/max} className="grid"/><text x=${L-6} y=${H-B-(H-B-T)*t/max+4} textAnchor="end" className="axis">${t}</text></g>`)}
 ${data.map((d,i)=>{const bh=(H-B-T)*d[1]/max;const x=L+i*bw+bw*.2;const w=bw*.6;return html`<g key=${d[0]} onMouseEnter=${()=>setTip(i)}><rect x=${L+i*bw} y=${T} width=${bw} height=${H-B-T} fill="transparent"/><path d=${`M${x},${H-B} V${H-B-bh+4} a4,4 0 0 1 4,-4 h${w-8} a4,4 0 0 1 4,4 V${H-B} Z`} fill=${hi===i?'var(--c2)':color} opacity=${tip===null||tip===i?1:.55}/><text x=${x+w/2} y=${H-7} textAnchor="middle" className="axis">${d[0]}</text></g>`;})}
 ${tip!==null&&html`<g><rect x=${Math.min(L+tip*bw+bw/2-44,W-96)} y=${6} width="88" height="22" rx="5" className="tipbox"/><text x=${Math.min(L+tip*bw+bw/2-44,W-96)+44} y=${21} textAnchor="middle" className="tiptext">${data[tip][0]}: ${data[tip][1]}${unit}</text></g>`}
 </svg></div>`;
};
const LineChart=({labels,series,unit='',h=210,yMin=0,yMax})=>{
 const [ix,setIx]=useState(null);
 const W=520,H=h,L=36,B=26,T=14,R=64;const mx=yMax||Math.max(...series.flatMap(s=>s.v))*1.1;
 const X=i=>L+(W-L-R)*i/(labels.length-1);const Y=v=>H-B-(H-B-T)*(v-yMin)/(mx-yMin);
 const ticks=[0,1,2,3,4].map(i=>Math.round(yMin+(mx-yMin)*i/4));
 const mv=e=>{const r=e.currentTarget.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*W;const i=Math.round((px-L)/((W-L-R)/(labels.length-1)));setIx(Math.max(0,Math.min(labels.length-1,i)));};
 return html`<div className="chart"><div className="legend">${series.map(s=>html`<span key=${s.name}><i style=${{background:s.color}}/>${s.name}</span>`)}</div>
 <svg viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Line chart" onMouseMove=${mv} onMouseLeave=${()=>setIx(null)}>
 ${ticks.map(t=>html`<g key=${t}><line x1=${L} x2=${W-R} y1=${Y(t)} y2=${Y(t)} className="grid"/><text x=${L-6} y=${Y(t)+4} textAnchor="end" className="axis">${t}${unit}</text></g>`)}
 ${labels.map((l,i)=>html`<text key=${l} x=${X(i)} y=${H-8} textAnchor="middle" className="axis">${l}</text>`)}
 ${ix!==null&&html`<line x1=${X(ix)} x2=${X(ix)} y1=${T} y2=${H-B} className="cross"/>`}
 ${series.map(s=>html`<g key=${s.name}><polyline points=${s.v.map((v,i)=>`${X(i)},${Y(v)}`).join(' ')} fill="none" stroke=${s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
 ${s.v.map((v,i)=>(i===s.v.length-1||ix===i)&&html`<circle key=${i} cx=${X(i)} cy=${Y(v)} r="4.5" fill=${s.color} stroke="var(--surface)" strokeWidth="2"/>`)}
 <text x=${X(s.v.length-1)+9} y=${Y(s.v[s.v.length-1])+4} className="endlabel">${s.name.split(' ')[0]} ${s.v[s.v.length-1]}${unit}</text></g>`)}
 ${ix!==null&&html`<g><rect x=${Math.min(X(ix)+8,W-R-120)} y=${T} width="118" height=${18+series.length*16} rx="5" className="tipbox"/><text x=${Math.min(X(ix)+8,W-R-120)+8} y=${T+14} className="tiptext" fontWeight="600">${labels[ix]}</text>${series.map((s,k)=>html`<text key=${s.name} x=${Math.min(X(ix)+8,W-R-120)+8} y=${T+30+k*16} className="tiptext">${s.name.split(' ')[0]}: ${s.v[ix]}${unit}</text>`)}</g>`}
 </svg></div>`;
};
const HBars=({data,color='var(--c1)',fmt=v=>v})=>{const mx=Math.max(...data.map(d=>d[1]))||1;return html`<ul className="hbars">${data.map(d=>html`<li key=${d[0]}><span className="hb-l">${d[0]}</span><span className="hb-t"><i style=${{width:(d[1]/mx*100)+'%',background:color}}/></span><span className="hb-v">${fmt(d[1])}</span></li>`)}</ul>`;};

/* ---------- Iweni map ---------- */
const poly=pts=>pts.map(p=>p.join(',')).join(' ');
const Marker=({layer,x,y,sel,onClick,label,dim})=>{
 const L=LAYERS.find(l=>l.id===layer);const c=L.color;const s=sel?1.35:1;
 const g=(shape=>{switch(shape){
  case 'tri':return html`<path d="M0,-11 L10,8 L-10,8 Z" fill=${c}/>`;
  case 'dia':return html`<path d="M0,-11 L10,0 L0,11 L-10,0 Z" fill=${c}/>`;
  case 'sq':return html`<rect x="-8" y="-8" width="16" height="16" rx="2" fill=${c}/>`;
  case 'hex':return html`<path d="M-5,-9 L5,-9 L10,0 L5,9 L-5,9 L-10,0 Z" fill=${c}/>`;
  case 'flag':return html`<path d="M-6,10 V-10 L9,-5 L-6,0" fill=${c}/>`;
  default:return html`<circle r="8" fill=${c}/>`;}})(L.shape);
 return html`<g className="mk" transform=${`translate(${x},${y}) scale(${s})`} onClick=${onClick} opacity=${dim?.35:1} tabIndex="0" role="button" aria-label=${label} onKeyDown=${e=>{if(e.key==='Enter')onClick();}}><circle r="17" fill="transparent"/><g stroke="var(--surface)" strokeWidth="2.5" strokeLinejoin="round">${g}</g>${sel&&html`<circle r="19" fill="none" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 3"/>`}<title>${label}</title></g>`;
};
const along=(pts,t)=>{const seg=[];let tot=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);tot+=d;}let r=t*tot;for(let i=0;i<seg.length;i++){if(r<=seg[i]){const f=r/seg[i];return[pts[i][0]+(pts[i+1][0]-pts[i][0])*f,pts[i][1]+(pts[i+1][1]-pts[i][1])*f];}r-=seg[i];}return pts[pts.length-1];};
const useLive=(enabled=true)=>{const [t,setT]=useState(.45);useEffect(()=>{if(!enabled)return;const i=setInterval(()=>setT(v=>v>=.98?.45:v+.012),1100);return()=>clearInterval(i);},[enabled]);return t;};

const MapLegend=({layers})=>html`<ul className="mlegend">${LAYERS.filter(l=>layers.includes(l.id)).map(l=>html`<li key=${l.id}><svg width="16" height="16" viewBox="-12 -12 24 24"><g stroke="var(--surface)" strokeWidth="1.5">${l.shape==='line'?html`<path d="M-10,0 H10" stroke=${l.color} strokeWidth="4"/>`:l.shape==='zone'?html`<rect x="-9" y="-9" width="18" height="18" fill=${l.color} fillOpacity=".4" stroke=${l.color} strokeWidth="2"/>`:l.shape==='tri'?html`<path d="M0,-10 L10,8 L-10,8 Z" fill=${l.color}/>`:l.shape==='dia'?html`<path d="M0,-10 L10,0 L0,10 L-10,0 Z" fill=${l.color}/>`:l.shape==='sq'?html`<rect x="-8" y="-8" width="16" height="16" fill=${l.color}/>`:l.shape==='hex'?html`<path d="M-5,-9 L5,-9 L10,0 L5,9 L-5,9 L-10,0 Z" fill=${l.color}/>`:l.shape==='flag'?html`<path d="M-6,10 V-10 L9,-5 L-6,0" fill=${l.color}/>`:html`<circle r="8" fill=${l.color}/>`}</g></svg>${l.label}</li>`)}</ul>`;

/* ============ Update 5: 12-hour clock, file preview, PDF export, scroll buttons ============ */
/* Times are stored as HH:MM (24 h) so records stay sortable. Everything shown to people is 12 hour. */
const T12=s=>{const m=/^(\d{1,2}):(\d{2})/.exec(s||'');if(!m)return s||'';const h=+m[1];return ((h%12)||12)+':'+m[2]+' '+(h<12?'AM':'PM');};
const Tm12=({id,value,onChange,label})=>{
 const m=/^(\d{1,2}):(\d{2})/.exec(value||'');
 const [loc,setLoc]=useState(()=>m?{h:String((+m[1]%12)||12),m:m[2],a:+m[1]<12?'AM':'PM'}:{h:'',m:'',a:'AM'});
 useEffect(()=>{const q=/^(\d{1,2}):(\d{2})/.exec(value||'');if(q)setLoc({h:String((+q[1]%12)||12),m:q[2],a:+q[1]<12?'AM':'PM'});else if(!value)setLoc(o=>o.h&&o.m?{h:'',m:'',a:o.a}:o);},[value]);
 const up=n=>{setLoc(n);if(n.h&&n.m!==''){let h=(+n.h)%12;if(n.a==='PM')h+=12;onChange(pad(h)+':'+n.m);}else if(!n.h&&n.m==='')onChange('');};
 return html`<span className="tm12" role="group" aria-label=${label||'Time'}>
  <select id=${id} aria-label="Hour" value=${loc.h} onChange=${e=>up({...loc,h:e.target.value,m:loc.m===''?'00':loc.m})}><option value="">--</option>${Array.from({length:12},(_,i)=>html`<option key=${i+1} value=${String(i+1)}>${i+1}</option>`)}</select>
  <select aria-label="Minute" value=${loc.m} onChange=${e=>up({...loc,m:e.target.value})}><option value="">--</option>${Array.from({length:60},(_,i)=>html`<option key=${i} value=${pad(i)}>${pad(i)}</option>`)}</select>
  <select aria-label="AM or PM" value=${loc.a} onChange=${e=>up({...loc,a:e.target.value})}><option>AM</option><option>PM</option></select></span>`;
};

/* ---- preview first, download second ---- */
const PREV={fn:null};
const openPreview=d=>{if(!d||!d.url)return;if(PREV.fn)PREV.fn(d);else window.open(d.url,'_blank','noopener');};
const isPdfF=d=>/pdf/i.test(d.mime||'')||/^data:application\/pdf/.test(d.url||'')||/\.pdf(\?|$)/i.test(d.name||'');
const isImgF=d=>/^image\//.test(d.mime||'')||/^data:image\//.test(d.url||'')||/\.(png|jpe?g|gif|webp)(\?|$)/i.test(d.name||'');
let pdfjsP=null;
const loadPdfjs=()=>pdfjsP||(pdfjsP=new Promise((ok,no)=>{const B='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';if(window.pdfjsLib)return ok(window.pdfjsLib);const s=document.createElement('script');s.src=B+'pdf.min.js';s.crossOrigin='anonymous';s.onload=async()=>{try{const t=await (await fetch(B+'pdf.worker.min.js')).text();window.pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([t],{type:'text/javascript'}));ok(window.pdfjsLib);}catch(e){no(e);}};s.onerror=()=>no(new Error('pdf.js'));document.head.appendChild(s);}));
const PdfPages=({url})=>{
 const host=useRef(null);const [st,setSt]=useState('load');
 useEffect(()=>{let dead=false;setSt('load');if(host.current)host.current.innerHTML='';
  (async()=>{try{const lib=await loadPdfjs();const buf=await (await fetch(url)).arrayBuffer();const doc=await lib.getDocument({data:buf}).promise;const w=Math.max(260,Math.min((host.current&&host.current.clientWidth)||600,1000));
   for(let i=1;i<=doc.numPages&&!dead;i++){const pg=await doc.getPage(i);const v0=pg.getViewport({scale:1});const sc=w/v0.width,dpr=Math.min(window.devicePixelRatio||1,2.5);const v=pg.getViewport({scale:sc*dpr});const c=document.createElement('canvas');c.width=v.width;c.height=v.height;c.style.width=w+'px';c.style.height=(v.height/dpr)+'px';c.className='pv-page';host.current.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:v}).promise;}
   if(!dead)setSt('ok');}catch(e){if(!dead){pdfjsP=null;setSt('fail');}}})();return()=>{dead=true;};},[url]);
 return html`<div>${st==='load'&&html`<p className="muted small pv-msg">Loading the preview…</p>`}<div ref=${host} className="pv-pages"></div>${st==='fail'&&html`<div><object data=${url} type="application/pdf" className="pv-obj"><p className="muted pv-msg">This device cannot show a PDF inside the page. Press Download to open it in your PDF viewer.</p></object></div>`}</div>`;
};
const PreviewHost=()=>{
 const [d,setD]=useState(null);
 useEffect(()=>{PREV.fn=setD;return()=>{PREV.fn=null;};},[]);
 useEffect(()=>{if(!d)return;const f=e=>{if(e.key==='Escape')setD(null);};window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f);},[d]);
 if(!d)return null;
 const dl=()=>{const a=document.createElement('a');a.href=d.url;a.download=d.name||'file';document.body.appendChild(a);a.click();a.remove();if(d.onDownload)d.onDownload();};
 const pdf=isPdfF(d),img=isImgF(d);
 return html`<div className="overlay center pv-ov" onClick=${()=>setD(null)}><div className="modal wide pv" role="dialog" aria-modal="true" aria-label=${'Preview '+(d.name||'')} onClick=${e=>e.stopPropagation()}>
  <header><h2>${d.name||'Preview'}</h2><button className="iconbtn" onClick=${()=>setD(null)} aria-label="Close preview"><${Icon} n="x"/></button></header>
  <div className="modal-b pv-b">${img?html`<img className="pv-img" src=${d.url} alt=${d.name||'Preview'}/>`:pdf?html`<${PdfPages} key=${d.url} url=${d.url}/>`:html`<p className="muted">There is no preview for this kind of file. Press Download to save it.</p>`}</div>
  <footer><span className="btnrow"><${Btn} onClick=${()=>setD(null)}>Close</${Btn}><${Btn} kind="primary" icon="download" onClick=${dl}>Download</${Btn}></span></footer></div></div>`;
};
/* a link that opens the preview instead of leaving the page */
const FileLink=({f,children,className,title})=>html`<a className=${className||''} href=${f.url} title=${title||f.name||''} target="_blank" rel="noopener" onClick=${e=>{e.preventDefault();openPreview({url:f.url,name:f.name||(isPdfF(f)?'document.pdf':'image.jpg'),mime:f.mime});}}>${children}</a>`;

/* ---- a small PDF writer for tables (no library, works offline) ---- */
const HW=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const pdfClean=s=>String(s==null?'':s).replace(/→/g,'->').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...').replace(/[–]/g,'-').replace(/[—]/g,'-').replace(/·/g,'-').replace(/[\r\n\t]+/g,' ').replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
const pdfW=(s,sz,b)=>{let w=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);w+=(c>=32&&c<=126?HW[c-32]:556);}return w*sz/1000*(b?1.06:1);};
const pdfWrap=(s,max,sz,b)=>{s=pdfClean(s);if(pdfW(s,sz,b)<=max)return [s];const out=[];let line='';s.split(' ').forEach(w=>{while(pdfW(w,sz,b)>max){let k=w.length;while(k>1&&pdfW(w.slice(0,k),sz,b)>max)k--;if(line){out.push(line);line='';}out.push(w.slice(0,k));w=w.slice(k);}const t=line?line+' '+w:w;if(pdfW(t,sz,b)<=max)line=t;else{out.push(line);line=w;}});if(line)out.push(line);return out.length?out:[''];};
const pdfEsc=s=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const makePdfBlob=({title,sub,kpis,head,rows,foot})=>{
 const PW=842,PH=595,M=34,AW=PW-2*M;const ncol=head.length;const sz=ncol>11?6.5:ncol>8?7.5:8.5,lh=sz*1.3,pd=3;
 const cells=rows.map(r=>head.map((_,i)=>pdfClean(r[i])));
 const nat=head.map((h,i)=>Math.max(pdfW(pdfClean(h),sz,true),...cells.slice(0,300).map(r=>Math.min(pdfW(r[i],sz),230)))+2*pd+2);
 let tot=nat.reduce((a,b)=>a+b,0);let cw=nat.slice();if(tot>AW){const minw=Math.min(40,AW/ncol);cw=nat.map(w=>Math.max(minw,w*AW/tot));tot=cw.reduce((a,b)=>a+b,0);const k=AW/tot;cw=cw.map(w=>w*k);}
 const pages=[];let ops=[];let y=0;const stamped='Generated by POps on '+pdfClean(stamp());
 const txt=(x,yy,s,size,bold)=>ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x.toFixed(1)+' '+yy.toFixed(1)+' Td ('+pdfEsc(s)+') Tj ET');
 const newPage=first=>{if(ops.length)pages.push(ops);ops=[];y=PH-M;
  if(first){txt(M,y-14,pdfClean(title),16,true);y-=22;if(sub){txt(M,y-8,pdfClean(sub),9,false);y-=14;}
   if(kpis&&kpis.length){const t=kpis.map(k=>pdfClean(k[0])+': '+pdfClean(k[1])).join('   |   ');pdfWrap(t,AW,9,false).forEach(l=>{txt(M,y-8,l,9,true);y-=12;});y-=4;}}
  else{txt(M,y-9,pdfClean(title)+' (continued)',9,true);y-=16;}
  hdrRow();};
 const hdrRow=()=>{const hl=head.map((h,i)=>pdfWrap(h,cw[i]-2*pd,sz,true));const n=Math.max(...hl.map(l=>l.length));const hh=n*lh+2*pd;ops.push('0.04 0.42 0.49 rg '+M+' '+(y-hh).toFixed(1)+' '+AW.toFixed(1)+' '+hh.toFixed(1)+' re f 1 1 1 rg');let x=M;hl.forEach((l,i)=>{l.forEach((t,j)=>txt(x+pd,y-pd-sz-j*lh+1,t,sz,true));x+=cw[i];});ops.push('0 0 0 rg');y-=hh;};
 newPage(true);
 cells.forEach((r,ri)=>{const wl=r.map((c,i)=>pdfWrap(c,cw[i]-2*pd,sz,false));const n=Math.max(1,...wl.map(l=>l.length));const rh=n*lh+2*pd;if(y-rh<M+16)newPage(false);
  if(ri%2)ops.push('0.95 0.97 0.97 rg '+M+' '+(y-rh).toFixed(1)+' '+AW.toFixed(1)+' '+rh.toFixed(1)+' re f 0 0 0 rg');
  let x=M;wl.forEach((l,i)=>{l.forEach((t,j)=>txt(x+pd,y-pd-sz-j*lh+1,t,sz,false));x+=cw[i];});y-=rh;ops.push('0.8 0.84 0.85 RG 0.4 w '+M+' '+y.toFixed(1)+' m '+(M+AW).toFixed(1)+' '+y.toFixed(1)+' l S');});
 if(!rows.length){txt(M+4,y-14,'No records for these dates.',9,false);}
 pages.push(ops);
 const N=pages.length;const objs=[];const add=s=>{objs.push(s);return objs.length;};
 add('<< /Type /Catalog /Pages 2 0 R >>');add('');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const kids=[];pages.forEach((p,i)=>{const fl=pdfClean(foot||stamped)+'  -  Page '+(i+1)+' of '+N;const body=p.join('\n')+'\nBT /F1 7 Tf '+M+' 18 Td ('+pdfEsc(fl)+') Tj ET';const c=add('<< /Length '+body.length+' >>\nstream\n'+body+'\nendstream');const pg=add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+c+' 0 R >>');kids.push(pg+' 0 R');});
 objs[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>';
 let out='%PDF-1.4\n';const offs=[];objs.forEach((o,i)=>{offs.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
 const xr=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';
 const u8=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u8[i]=out.charCodeAt(i)&255;
 return new Blob([u8],{type:'application/pdf'});
};
/* build the PDF, then show it in the preview window. The person decides whether to download. */
const previewPdf=(name,opts)=>{try{const b=makePdfBlob(opts);openPreview({url:URL.createObjectURL(b),name:name.replace(/\.pdf$/i,'')+'.pdf',mime:'application/pdf'});return true;}catch(e){console.error(e);return false;}};
/* plain text of a cell, even when it was drawn as markup */
const plainOf=n=>{if(n==null||n===false||n===true)return '';if(typeof n==='string'||typeof n==='number')return String(n);if(Array.isArray(n))return n.map(plainOf).join('');if(n.props)return plainOf(n.props.children);return '';};

/* ---- scroll buttons: jump to the top or bottom of long pages, lists, forms and pop-up windows ---- */
const ScrollBtns=()=>{
 const [s,setS]=useState({up:false,down:false});const tg=useRef('win');
 useEffect(()=>{
  const geo=()=>{let t=tg.current;if(t!=='win'&&(!t||!document.body.contains(t)))t=tg.current='win';
   if(t==='win'){const e=document.scrollingElement||document.documentElement;return {top:e.scrollTop,max:e.scrollHeight-e.clientHeight};}
   return {top:t.scrollTop,max:t.scrollHeight-t.clientHeight};};
  const calc=()=>{const g=geo();const up=g.max>500&&g.top>300,down=g.max>500&&g.max-g.top>300;setS(o=>o.up===up&&o.down===down?o:{up,down});};
  const on=e=>{const el=e.target;if(el===document||el===document.documentElement||el===document.body||el===window)tg.current='win';else if(el.scrollHeight>el.clientHeight+300&&el.clientHeight>120)tg.current=el;else return;calc();};
  document.addEventListener('scroll',on,true);const iv=setInterval(()=>{/* a pop-up window or drawer on top wins over the page behind it */const top=document.querySelector('.pv .modal-b,.modal-b,.drawer-b,.dr-b');if(top&&top.scrollHeight>top.clientHeight+300&&tg.current==='win'&&document.querySelector('.overlay'))tg.current=top;if(!document.querySelector('.overlay')&&tg.current!=='win'&&!document.body.contains(tg.current))tg.current='win';calc();},700);
  window.addEventListener('resize',calc);calc();
  return()=>{document.removeEventListener('scroll',on,true);clearInterval(iv);window.removeEventListener('resize',calc);};},[]);
 const go=top=>{const t=tg.current;const e=t==='win'?window:t;const max=t==='win'?(document.scrollingElement||document.documentElement).scrollHeight:t.scrollHeight;try{e.scrollTo({top:top?0:max,behavior:'smooth'});}catch(x){e.scrollTo(0,top?0:max);}};
 if(!s.up&&!s.down)return null;
 return html`<div className="scrollbtns" role="group" aria-label="Scroll">${s.up&&html`<button type="button" className="sbtn" aria-label="Go to the top" title="Top" onClick=${()=>go(true)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg></button>`}${s.down&&html`<button type="button" className="sbtn" aria-label="Go to the bottom" title="Bottom" onClick=${()=>go(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>`}</div>`;
};
