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
const Inp=({id,value,onChange,type='text',placeholder,list})=>html`<input id=${id} type=${type} value=${value} placeholder=${placeholder} list=${list} onChange=${e=>onChange(e.target.value)}/>`;

const Table=({cols,rows,onRow,empty='No records to show.',sel})=>html`<div className="tscroll"><table className="tbl stack"><thead><tr>${cols.map(c=>html`<th key=${c.k} className=${c.cls||''}>${c.h}</th>`)}</tr></thead><tbody>${rows.length?rows.map((r,i)=>html`<tr key=${r.id||r.no||i} className=${(onRow?'click ':'')+(sel&&sel===r.id?'sel':'')} onClick=${onRow?()=>onRow(r):null} tabIndex=${onRow?0:null} onKeyDown=${onRow?e=>{if(e.key==='Enter')onRow(r);}:null}>${cols.map(c=>html`<td key=${c.k} data-label=${c.h} className=${c.cls||''}>${c.r?c.r(r):r[c.k]}</td>`)}</tr>`):html`<tr><td colSpan=${cols.length} className="empty">${empty}</td></tr>`}</tbody></table></div>`;

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
