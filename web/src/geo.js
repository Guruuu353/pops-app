/* ============ real-map engine: Web Mercator slippy map with vector overlays ============ */
/* Tile sources are public servers. For heavy use, a licensed provider or your own tile server is better (see README). */
const TILES={
 sat:{label:'Satellite',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',max:18,attr:'Imagery © Esri, Maxar, Earthstar Geographics'},
 osm:{label:'Streets',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',max:19,attr:'© OpenStreetMap contributors'}
};
const TILE_CACHE='pops-tiles-v1';
const tileUrl=(b,z,x,y)=>TILES[b].url.replace('{z}',z).replace('{x}',x).replace('{y}',y);
const WORLD=z=>256*Math.pow(2,z);
const mx=(lon,z)=>(lon+180)/360*WORLD(z);
const my=(lat,z)=>{const s=Math.sin(lat*Math.PI/180);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*WORLD(z);};
const lonOf=(x,z)=>x/WORLD(z)*360-180;
const latOf=(y,z)=>{const n=Math.PI-2*Math.PI*y/WORLD(z);return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ZMIN=0,ZMAX=22;
const bbOf=ll=>({n:Math.max(...ll.map(p=>p[0])),s:Math.min(...ll.map(p=>p[0])),w:Math.min(...ll.map(p=>p[1])),e:Math.max(...ll.map(p=>p[1]))});
const fitView=(bb,w,h,pad=36)=>{const dx=mx(bb.e,0)-mx(bb.w,0)||1e-6,dy=my(bb.s,0)-my(bb.n,0)||1e-6;const z=clamp(Math.min(Math.log2(Math.max(40,w-2*pad)/dx),Math.log2(Math.max(40,h-2*pad)/dy)),ZMIN,17.5);return {z,lon:(bb.w+bb.e)/2,lat:latOf((my(bb.n,z)+my(bb.s,z))/2,z)};};
/* a track is a list of [lat,lon]; a third value of 1 marks the first point after a gap (paused, no signal, phone asleep) so lines and distance are never drawn across the gap */
const splitSegs=ll=>{const out=[];let c=[];(ll||[]).forEach((p,i)=>{if((p[2]===1||p[2]===2)&&c.length){out.push(c);c=[];}c.push(p);});if(c.length)out.push(c);return out;};
const trackKm=ll=>{let d=0;splitSegs(ll).forEach(s=>{for(let i=1;i<s.length;i++)d+=haversine(s[i-1],s[i]);});return d/1000;};
const haversine=(a,b)=>{const R=6371000,r=Math.PI/180,dLa=(b[0]-a[0])*r,dLo=(b[1]-a[1])*r,q=Math.sin(dLa/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(q));};
const LMMA_LL=LMMA_PTS.map(p=>[p.la,p.lo]);
const LMMA_BB=bbOf(LMMA_LL);
/* Zone shapes come from the server (Settings, Iweni LMMA, Zones). Nothing is drawn until the real shapes are loaded. */
const withEdge=ll=>{if(!EDGE_TRACE.length)return ll;const a=LMMA_PTS.find(q=>q.n===11),b=LMMA_PTS.find(q=>q.n===12);if(!a||!b)return ll;const A=[a.la,a.lo],B=[b.la,b.lo];for(let i=0;i<ll.length;i++){const j=(i+1)%ll.length;if(near(ll[i],A)&&near(ll[j],B)){const o=ll.slice();o.splice(i+1,0,...EDGE_TRACE);return o;}if(near(ll[i],B)&&near(ll[j],A)){const o=ll.slice();o.splice(i+1,0,...EDGE_TRACE.slice().reverse());return o;}}return ll;};
const ZONE_SHAPES=[];
/* The south edge (point 11 to point 12) follows the shore and the mangrove/vegetation line, which is a curve. The admin traces it as extra vertices; they are added to every zone that has the 11 to 12 edge. */
let EDGE_TRACE=[],_ZROWS=[];
const near=(a,b)=>Math.abs(a[0]-b[0])<2e-5&&Math.abs(a[1]-b[1])<2e-5;
const applyEdge=list=>{EDGE_TRACE=(list||[]).filter(p=>Array.isArray(p)&&isFinite(p[0])&&isFinite(p[1]));applyZones(_ZROWS);};
const applyZones=rows=>{_ZROWS=rows||[];ZONE_SHAPES.length=0;(rows||[]).forEach(z=>{const g=z.feature&&z.feature.geometry;if(!g)return;const pr=z.feature.properties||{};const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];polys.forEach((p,i)=>ZONE_SHAPES.push({id:z.id+'-'+i,zid:z.id,kind:z.kind,name:z.name,km2:z.area_km2,stated:z.stated_km2,habitat:pr.habitat||'',pts:pr.points||[],ll:withEdge(p[0].map(c=>[c[1],c[0]]))}));});};
/* villages and landmarks (Pate, Shanga Ishakani ...) set in Iweni LMMA > Coordinates */
const PLACES=[];
const applyPlaces=rows=>{PLACES.length=0;(rows||[]).forEach(p=>PLACES.push(p));};
const ZINFO={ntz:{label:'No-take zone',rule:'Fishing and extraction are not allowed here. A breach is recorded as infringement Z1.'},gear:{label:'Gear restricted zone',rule:'Only permitted gear may be used. Restricted gear is recorded as infringement Z3.'},lmma:{label:'LMMA boundary',rule:'Co-management area. Rangers must be inside it every day.'},other:{label:'Other zone',rule:''}};
const ringKm=ll=>{let d=0;for(let i=0;i<ll.length;i++)d+=haversine(ll[i],ll[(i+1)%ll.length]);return d/1000;};
const meanLL=ll=>[ll.reduce((a,p)=>a+p[0],0)/ll.length,ll.reduce((a,p)=>a+p[1],0)/ll.length];
const fmtLL=(la,lo)=>toDMS(la,'N','S')+' / '+toDMS(lo,'E','W');
const decLL=(la,lo)=>la.toFixed(6)+', '+lo.toFixed(6);
/* the most specific zone at a position: no-take, then gear restricted, then plain LMMA */
const zoneAt=(la,lo)=>{const hit=k=>ZONE_SHAPES.find(z=>z.kind===k&&inRing(la,lo,z.ll));return hit('ntz')||hit('gear')||hit('other')||(hit('lmma')?{kind:'lmma',name:'Inside the Iweni LMMA (outside the mapped zones)'}:null);};
const itemLL=i=>i.lat!=null&&i.lon!=null?[i.lat,i.lon]:i.x!=null?unproj(i.x,i.y):null;
const zoneDetail=(z,app)=>{
 const {patrols=[],incidents=[]}=app||{};const inf=ZINFO[z.kind]||ZINFO.other;
 const tr=patrols.filter(p=>p.track&&p.track.some(t=>inRing(t[0],t[1],z.ll))).length;
 const inc=incidents.filter(i=>{const l=itemLL(i);return l&&inRing(l[0],l[1],z.ll);}).length;
 const diff=z.stated!=null&&z.km2?Math.round((z.km2-z.stated)/z.stated*100):null;
 const c=meanLL(z.ll);
 const rows=[['Type',inf.label],z.habitat?['Habitat',z.habitat]:null,inf.rule?['Rule',inf.rule]:null,['Mapped area',z.km2+' km²'],z.stated!=null?['Stated area',z.stated+' km²'+(diff!==null&&Math.abs(diff)>=10?' (map differs by '+(diff>0?'+':'')+diff+'%, to confirm with Patte)':' (matches)')]:null,['Perimeter',ringKm(z.ll).toFixed(2)+' km'],z.pts&&z.pts.length?['Boundary points',z.pts.join(', ')]:null,['Centre',fmtLL(c[0],c[1])],['GPS patrol tracks through it',String(tr)],['Incidents with a GPS fix inside',String(inc)]];
 if(z.kind==='lmma')rows.push(['Patrols recorded inside the LMMA',String(patrols.filter(p=>DONE_P.includes(p.status)&&patrolInLmma(p)).length)]);
 return {title:z.name,chip:inf.label,rows:rows.filter(Boolean)};
};
const pointDetail=(p,verified)=>{const v=verified.includes(p.n);const zs=ZONE_SHAPES.filter(z=>z.kind!=='lmma'&&(z.pts||[]).includes(p.n)).map(z=>z.name);return {title:'Boundary point '+p.n,chip:v?'Verified':'Awaiting verification',rows:[['Latitude',p.lat],['Longitude',p.lon],['Decimal degrees',decLL(p.la,p.lo)],['Status',v?'Verified on the ground':'Supplied, awaiting a field check'],zs.length?['Marks the edge of',zs.join(' and ')]:null].filter(Boolean)};};
const nearestPlace=(la,lo)=>{let b=null;PLACES.forEach(p=>{const d=haversine([la,lo],[p.lat,p.lon]);if(!b||d<b.d)b={p,d};});return b;};
const placeDetail=pl=>{const lm=ZONE_SHAPES.find(z=>z.kind==='lmma');const d=lm?haversine([pl.lat,pl.lon],meanLL(lm.ll))/1000:null;const cp=LOOK.bmu&&LOOK.bmu.certificate_point;const isCert=cp&&haversine([pl.lat,pl.lon],[cp.lat,cp.lon])<40;return {title:pl.name,chip:placeKind(pl.kind).label,rows:[['Coordinates',fmtLL(pl.lat,pl.lon)],pl.village?['Village or area',pl.village]:null,pl.note?['Notes',pl.note]:null,['Decimal degrees',decLL(pl.lat,pl.lon)],d!=null?['Distance to the LMMA centre',d.toFixed(1)+' km']:null,isCert?['Note','BMU certificate point']:null].filter(Boolean)};};
const spotDetail=(la,lo)=>{const z=zoneAt(la,lo);const n=nearestPlace(la,lo);return {title:'Map point',chip:z?(ZINFO[z.kind]||{label:'In LMMA'}).label:'Outside the LMMA',rows:[['Coordinates',fmtLL(la,lo)],['Decimal degrees',decLL(la,lo)],['Zone',z?z.name:'Outside the Iweni LMMA'],n?['Nearest place',n.p.name+', '+(n.d>=1000?(n.d/1000).toFixed(1)+' km':Math.round(n.d)+' m')]:null].filter(Boolean)};};
const niceDeg=[90,60,30,20,10,5,2,1,.5,.2,.1,.05,.02,.01,.005,.002,.001,.0005,.0002,.0001];

/* save the area around the LMMA for offline use (the service worker answers tile requests from this cache) */
const tilesForArea=(base,z0=12,z1=16,margin=.006)=>{const out=[];for(let z=z0;z<=z1;z++){const n=Math.pow(2,z);const xa=Math.floor(mx(LMMA_BB.w-margin,z)/256),xb=Math.floor(mx(LMMA_BB.e+margin,z)/256),ya=Math.floor(my(LMMA_BB.n+margin,z)/256),yb=Math.floor(my(LMMA_BB.s-margin,z)/256);for(let x=xa;x<=xb;x++)for(let y=ya;y<=yb;y++)if(y>=0&&y<n)out.push(tileUrl(base,z,((x%n)+n)%n,y));}return out;};
const OfflineMapBtn=({base,compact})=>{
 const [st,setSt]=useState({n:0,t:0,run:false,done:false,err:''});
 const ok=typeof caches!=='undefined'&&/^https?:/.test(location.protocol);
 const run=async()=>{
  const urls=tilesForArea(base);setSt({n:0,t:urls.length,run:true,done:false,err:''});
  try{const c=await caches.open(TILE_CACHE);let n=0,bad=0,i=0;
   const work=async()=>{while(i<urls.length){const u=urls[i++];try{if(!(await c.match(u))){const r=await fetch(u,{mode:'cors'});if(r.ok)await c.put(u,r);else bad++;}}catch(e){bad++;}n++;setSt(s=>({...s,n}));}};
   await Promise.all([work(),work(),work(),work(),work(),work()]);
   setSt({n:urls.length,t:urls.length,run:false,done:bad<urls.length,err:bad===urls.length?'Could not reach the map server. Check the connection and try again.':bad?bad+' tiles were skipped':''});
  }catch(e){setSt(s=>({...s,run:false,err:'Offline storage is not available here.'}));}
 };
 return html`<div className=${'offmap '+(compact?'compact':'')}><button className="btn small" disabled=${!ok||st.run} onClick=${run} title=${ok?'':'Available when the app is opened from its web address'}><${Icon} n="download" s=${15}/>${st.run?'Saving '+st.n+' / '+st.t:st.done?'Map saved for offline use':'Save map for offline use'}</button>${(st.done||st.err)&&html`<small>${st.done?st.t+' tiles saved. '+st.err:st.err}</small>`}${!ok&&html`<small>Works in the installed app.</small>`}</div>`;
};


/* direction arrows along a route, one about every 70 screen pixels, pointing the way the patrol travelled */
const TrkArrows=({pts,S,multi,gap,mine})=>{
 const segs=multi?pts:[pts];const out=[];
 segs.forEach((sg,si)=>{if(!sg||sg.length<2)return;let acc=gap?0:40;let prev=S(sg[0][0],sg[0][1]);
  for(let i=1;i<sg.length;i++){const cur=S(sg[i][0],sg[i][1]);const dx=cur[0]-prev[0],dy=cur[1]-prev[1];const len=Math.hypot(dx,dy);if(len<0.5){prev=cur;continue;}
   let pos=0;const step=gap?Math.max(30,len/2):70;
   while(acc+(len-pos)>=step&&out.length<400){const need=step-acc;pos+=need;acc=0;const x=prev[0]+dx*pos/len,y=prev[1]+dy*pos/len;out.push([x,y,Math.atan2(dy,dx)*180/Math.PI]);if(gap)break;}
   acc+=len-pos;prev=cur;}});
 return html`<g className=${'gm-arrows'+(mine?' mine':'')+(gap?' gap':'')} pointerEvents="none">${out.map((a,i)=>html`<path key=${i} d="M-6,-5 L5,0 L-6,5 L-3,0 Z" transform=${`translate(${a[0].toFixed(1)},${a[1].toFixed(1)}) rotate(${a[2].toFixed(0)})`}/>`)}</g>`;
};
/* distance label on the route */
const TrkDist=({p,txt,id})=>{const w=14+txt.length*6.2;return html`<g className="gm-dist" pointerEvents="none" transform=${`translate(${p[0].toFixed(1)},${(p[1]-15).toFixed(1)})`}><rect x=${-w/2} y="-9" width=${w} height="17" rx="8.5"/><text y="4" textAnchor="middle">${txt}</text></g>`;};
/* where the route began (green A) and where it ends or the patrol is now (red B, or a pulsing dot while live) */
const TrkEnds=({ll,S,done,id,live})=>{
 if(!ll||ll.length<2)return null;const a=ll[0],b=ll[ll.length-1];const [ax,ay]=S(a[0],a[1]),[bx,by]=S(b[0],b[1]);
 return html`<g className="gm-ends" pointerEvents="none"><g transform=${`translate(${ax.toFixed(1)},${ay.toFixed(1)})`}><circle r="11" className="gm-a"/><text y="4" textAnchor="middle">A</text><title>Start</title></g>
  <g transform=${`translate(${bx.toFixed(1)},${by.toFixed(1)})`}>${live||!done?html`<circle r="13" className="gm-live"/><circle r="6" className="gm-livec"/>`:html`<circle r="11" className="gm-b"/><text y="4" textAnchor="middle">B</text>`}<title>${live||!done?'Now':'End'}</title></g></g>`;
};
/* ===== map places: villages, fishing grounds, poachers' camps and more (admin adds, edits, moves, deletes) ===== */
const PLACE_KINDS={village:{label:'Village',color:'#E3262E',shape:'tri'},fishing:{label:'Fishing ground',color:'#1E88E5',shape:'circle'},poacher:{label:"Poachers' camp",color:'#8E24AA',shape:'diamond'},landing:{label:'Landing site',color:'#00897B',shape:'square'},post:{label:'Ranger post',color:'#F9A825',shape:'square'},other:{label:'Other place',color:'#607D8B',shape:'circle'}};
const placeKind=k=>PLACE_KINDS[k]||PLACE_KINDS.other;
const PlaceShape=({kind,k=1})=>{const c=placeKind(kind);const st={fill:c.color,stroke:'#fff',strokeWidth:1.6,strokeLinejoin:'round'};
 return c.shape==='tri'?html`<path d="M0,-9 L8,6 L-8,6 Z" transform=${'scale('+k+')'} ...${st}/>`:c.shape==='diamond'?html`<path d="M0,-9 L8,0 L0,9 L-8,0 Z" transform=${'scale('+k+')'} ...${st}/>`:c.shape==='square'?html`<rect x="-7" y="-7" width="14" height="14" rx="2" transform=${'scale('+k+')'} ...${st}/>`:html`<circle r=${8*k} ...${st}/>`;};
/* read a coordinate pair from anything a person might copy: decimal degrees, degrees-minutes-seconds, or a Google Maps link */
const parseCoordText=t=>{
 t=String(t||'').trim();if(!t)return null;let la=NaN,lo=NaN;
 let m=t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)||t.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/)||t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
 if(m){la=+m[1];lo=+m[2];}
 else{const dms=[...t.matchAll(/(\d+(?:\.\d+)?)\s*[°d]\s*(?:(\d+(?:\.\d+)?)\s*['′m]\s*)?(?:(\d+(?:\.\d+)?)\s*["″s]\s*)?([NSEW])/gi)];
  if(dms.length>=2){const v=x=>{const r=(+x[1])+(+(x[2]||0))/60+(+(x[3]||0))/3600;return /[SW]/i.test(x[4])?-r:r;};const a=dms[0],b=dms[1];if(/[NS]/i.test(a[4])){la=v(a);lo=v(b);}else{lo=v(a);la=v(b);}}
  else{const n=t.replace(/[NSEW]/gi,x=>' '+x+' ').match(/-?\d+(?:\.\d+)?/g);if(n&&n.length>=2){la=+n[0];lo=+n[1];const hs=t.match(/[NSEW]/gi)||[];if(hs.length>=2){if(/[S]/i.test(hs[0]))la=-Math.abs(la);if(/[W]/i.test(hs[1]))lo=-Math.abs(lo);if(/[EW]/i.test(hs[0])){const x=la;la=lo;lo=x;}}}}}
 if(!isFinite(la)||!isFinite(lo))return null;
 if(Math.abs(la)>90&&Math.abs(lo)<=90){const x=la;la=lo;lo=x;}
 if(la>=39&&la<=42.5&&lo<0&&lo>=-3.5){const x=la;la=lo;lo=x;}   /* typed longitude first */
 if(Math.abs(la)>90||Math.abs(lo)>180)return null;
 return [la,lo];
};
const saveLandmarks=async rows=>{const r=await api('PUT','/landmarks',{landmarks:rows});applyPlaces(r.landmarks);window.dispatchEvent(new Event('pops-places'));return r.landmarks;};
const PlaceEditor=({place,onClose,onSaved})=>{
 const app=useApp()||{};const toast=app.toast||(()=>{}),log=app.log||(()=>{});
 const [f,setF]=useState(()=>({id:place.id||'',name:place.name||'',kind:place.kind||'village',village:place.village||'',note:place.note||'',lat:place.lat!=null?String(place.lat):'',lon:place.lon!=null?String(place.lon):''}));
 const [paste,setPaste]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState(false);
 const readOne=v=>{v=String(v||'').trim();if(!v)return NaN;const c=parseCoordText(v+(/[NSEW]/i.test(v)?'':''));if(/[°'"]/.test(v)&&/[NSEW]/i.test(v)){try{return parseDMS(v.toUpperCase().replace(/\s+/g,' '));}catch(e){return NaN;}}return Number(v);};
 const applyPaste=v=>{setPaste(v);const c=parseCoordText(v);if(c){setF(o=>({...o,lat:c[0].toFixed(6),lon:c[1].toFixed(6)}));setErr('');}};
 const pasteBtn=async()=>{try{const t=await navigator.clipboard.readText();const c=parseCoordText(t);if(c){setPaste(t);setF(o=>({...o,lat:c[0].toFixed(6),lon:c[1].toFixed(6)}));setErr('');}else setErr('No coordinates found in what you copied.');}catch(e){setErr('Your browser did not allow reading the clipboard. Paste into the box above instead.');}};
 const copy=()=>{const la=readOne(f.lat),lo=readOne(f.lon);if(!isFinite(la)||!isFinite(lo))return;try{navigator.clipboard.writeText(la.toFixed(6)+', '+lo.toFixed(6));toast('Coordinates copied');}catch(e){}};
 const save=async()=>{const la=readOne(f.lat),lo=readOne(f.lon);if(!f.name.trim())return setErr('Give the place a name');if(!isFinite(la)||!isFinite(lo))return setErr('Coordinates not understood. Use decimal degrees (-2.2147, 41.0095) or 02°12\'37.94" S.');
  setBusy(true);try{const rec={id:f.id||undefined,name:f.name.trim(),kind:f.kind,village:f.village.trim(),note:f.note.trim(),lat:la,lon:lo};const rows=f.id?PLACES.map(p=>p.id===f.id?{...p,...rec}:p):[...PLACES,rec];await saveLandmarks(rows);log(f.id?'Edited map place':'Added map place','Iweni LMMA Management',rec.name+' ('+placeKind(rec.kind).label+')');toast(f.id?'Place updated':'Place added');if(onSaved)onSaved();onClose();}catch(x){setErr(x.message||'Could not save');}setBusy(false);};
 const del=async()=>{if(!confirm('Delete '+f.name+' from the map?'))return;setBusy(true);try{await saveLandmarks(PLACES.filter(p=>p.id!==f.id));log('Removed map place','Iweni LMMA Management',f.name);toast('Place removed');if(onSaved)onSaved();onClose();}catch(x){setErr(x.message||'Could not delete');}setBusy(false);};
 return html`<${Modal} open=${true} onClose=${onClose} title=${f.id?'Edit map place':'Add a map place'} foot=${html`${f.id&&html`<${Btn} onClick=${del}>Delete</${Btn}>`}<${Btn} onClick=${onClose}>Cancel</${Btn}><${Btn} kind="primary" onClick=${save}>${busy?'Saving…':'Save place'}</${Btn}>`}>
  <div className="form">
   <${Field} label="Name" id="pe-n"><${Inp} id="pe-n" value=${f.name} onChange=${v=>{setF(o=>({...o,name:v}));setErr('');}} placeholder="For example: Shanga Ishakani"/></${Field}>
   <${Field} label="Type" id="pe-k"><${Sel} id="pe-k" value=${f.kind} onChange=${v=>setF(o=>({...o,kind:v}))} opts=${Object.keys(PLACE_KINDS).map(k=>[k,PLACE_KINDS[k].label])}/></${Field}>
   <${Field} label="Village or area" id="pe-v"><${Inp} id="pe-v" value=${f.village} onChange=${v=>setF(o=>({...o,village:v}))} placeholder="The village this place belongs to or is near"/></${Field}>
   <${Field} label="Notes (optional)" id="pe-nt"><${Inp} id="pe-nt" value=${f.note} onChange=${v=>setF(o=>({...o,note:v}))} placeholder="For example: seasonal camp, good catch in March"/></${Field}>
   <div className="field wide"><label htmlFor="pe-paste">Paste coordinates</label><div className="btnrow"><input id="pe-paste" className="grow" value=${paste} onChange=${e=>applyPaste(e.target.value)} placeholder="Paste anything you copied: -2.1428, 41.0095, a Google Maps link, or 02°12'37&quot; S 41°00'34&quot; E"/><${Btn} kind="small" onClick=${pasteBtn}>Paste from clipboard</${Btn}></div></div>
   <${Field} label="Latitude (south is negative)" id="pe-la"><${Inp} id="pe-la" value=${f.lat} onChange=${v=>{setF(o=>({...o,lat:v}));setErr('');}} placeholder="-2.1428"/></${Field}>
   <${Field} label="Longitude" id="pe-lo"><${Inp} id="pe-lo" value=${f.lon} onChange=${v=>{setF(o=>({...o,lon:v}));setErr('');}} placeholder="40.9968"/></${Field}>
   <div className="field wide"><${Btn} kind="small" icon="copy" onClick=${copy}>Copy these coordinates</${Btn}></div>
  </div>${err&&html`<${Notice} tone="crit" title="Check this">${err}</${Notice}>`}</${Modal}>`;
};
/* map settings an admin can change: default basemap, place names, marker size, and which kinds of place are shown */
const MapSettings=({compact})=>{
 const {settings,setSettings,log,toast}=useApp();const ms=(settings&&settings.map)||{};
 const set=(k,v)=>{setSettings(s=>({...s,map:{...(s.map||{}),[k]:v}}));log('Changed map setting','Iweni LMMA Management',k);};
 const hidden=ms.hide||[];
 return html`<div className=${'form mapset'+(compact?' tight':'')}>
  <${Field} label="Default basemap" id="ms-b"><${Sel} id="ms-b" value=${ms.base||'sat'} onChange=${v=>{set('base',v);try{localStorage.setItem('pops-base',v);}catch(e){}}} opts=${Object.keys(TILES).map(k=>[k,TILES[k].label])}/></${Field}>
  <${Field} label="Place marker size" id="ms-s"><${Sel} id="ms-s" value=${ms.size||'m'} onChange=${v=>set('size',v)} opts=${[['s','Small'],['m','Medium'],['l','Large']]}/></${Field}>
  <${Field} label="Show place names on the map" id="ms-l"><${Toggle} id="ms-l" on=${ms.labels!==false} onChange=${v=>set('labels',v)} label="Show place names"/></${Field}>
  <div className="field wide"><label>Show these kinds of place</label><div className="chks">${Object.keys(PLACE_KINDS).map(k=>html`<label key=${k} className="chk"><input type="checkbox" checked=${!hidden.includes(k)} onChange=${()=>set('hide',hidden.includes(k)?hidden.filter(x=>x!==k):[...hidden,k])}/><span>${PLACE_KINDS[k].label}</span></label>`)}</div></div></div>`;
};
const GeoMap=({layers=['zones','patrols'],items=[],tracks=[],sel,onSel,points=[],showPts,fit='lmma',locked,compact,height,myPos,myTrack,showLive=true,follow,verified,actions,fitTo})=>{
 const app=useApp()||{};const vlist=verified||app.vl||[];const role=app.role;
 const box=useRef(null);const [size,setSize]=useState({w:0,h:0});const [view,setView]=useState(null);const vref=useRef(null);
 const uid=useRef('g'+Math.random().toString(36).slice(2,6)).current;
 const ms=(app.settings&&app.settings.map)||{};const isAdmin=role==='admin'&&!compact&&!locked;
 const [editMode,setEditMode]=useState(false);const [addMode,setAddMode]=useState(false);const [moveId,setMoveId]=useState(null);const [tools,setTools]=useState(false);const [pe,setPe]=useState(null);const [pasteTxt,setPasteTxt]=useState('');const [clip,setClip]=useState(null);const [,setPv]=useState(0);
 const [base,setBaseS]=useState(()=>{try{return localStorage.getItem('pops-base')||ms.base||'sat';}catch(e){return ms.base||'sat';}});
 const setBase=b=>{setBaseS(b);setTl({ok:0,bad:0});try{localStorage.setItem('pops-base',b);}catch(e){}};
 const [tl,setTl]=useState({ok:0,bad:0});const [hint,setHint]=useState(false);
 const [hov,setHov]=useState(null);const [act,setAct]=useState(null);const [info,setInfo]=useState(null);const [leg,setLeg]=useState(null);
 const readout=useRef(null);const dragged=useRef(false);
 const [bearing,setBearingS]=useState(0);const bref=useRef(0);const setBearing=b=>{b=((b%360)+360)%360;bref.current=b;setBearingS(b);};
 const [full,setFull]=useState(false);const [cmp,setCmp]=useState(false);
 const [globe,setGlobe]=useState(false);
 const [lockId,setLockId]=useState(null);const [lst,setLst]=useState(false);const wprev=useRef(null);const [isWorld,setIsWorld]=useState(false);
 const unrot=(dx,dy)=>{const t=bref.current*Math.PI/180,c=Math.cos(t),sn=Math.sin(t);return [dx*c+dy*sn,-dx*sn+dy*c];};
 const on=id=>layers.includes(id);
 const live=useLive(showLive&&on('boats'));
 const setV=v=>{vref.current=v;setView(v);};
 useEffect(()=>{if(sel)setAct(sel);},[sel]);
 useEffect(()=>{if(view&&!compact&&!locked&&!globe&&size.w>0&&view.z<Math.log2(Math.max(200,Math.min(size.w,size.h))/256)+1.15)setGlobe(true);},[view&&view.z,size.w]);
 /* measure */
 useEffect(()=>{const el=box.current;if(!el)return;const m=()=>{const r=el.getBoundingClientRect();setSize(s=>(Math.abs(s.w-r.width)>1||Math.abs(s.h-r.height)>1)?{w:r.width,h:r.height}:s);};m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);ro.observe(el);}window.addEventListener('resize',m);return()=>{if(ro)ro.disconnect();window.removeEventListener('resize',m);};},[]);
 /* first fit */
 const trackLL=tr=>tr.ll||tr.pts.map(p=>unproj(p[0],p[1]));
 const fitDone=useRef('');
 useEffect(()=>{if(!fitTo||!size.w||fitDone.current===fitTo)return;const pts=tracks.flatMap(trackLL);if(pts.length<2)return;fitDone.current=fitTo;setLockId(null);setIsWorld(false);setV(fitView(bbOf(pts),size.w,size.h,56));},[fitTo,!!size.w]);
 useEffect(()=>{if(!size.w||vref.current)return;let bb=LMMA_BB;if(fit==='tracks'&&tracks.length){bb=bbOf(tracks.flatMap(trackLL));}setV(fitView(bb,size.w,size.h,fit==='tracks'?28:40));},[size.w,size.h]);
 /* fly to selection (points and markers; zones are not zoomed when tapped) */
 useEffect(()=>{if(!sel||!vref.current)return;const it=items.find(i=>i.id===sel)||(sel.startsWith&&sel.startsWith('pt-')&&points.find(p=>'pt-'+p.n===sel));if(!it||it.noFly)return;const [la,lo]=it.pt?[it.pt.la,it.pt.lo]:unproj(it.x,it.y);const v=vref.current;/* the map stays steady when you tap something that is already in view */const dx=mx(lo,v.z)-mx(v.lon,v.z),dy=my(la,v.z)-my(v.lat,v.z);if(Math.hypot(dx,dy)<Math.min(size.w,size.h)/2-36)return;setV({lat:la,lon:lo,z:Math.max(v.z,14)});},[sel]);
 useEffect(()=>{if(!follow||!myPos||!vref.current)return;const v=vref.current;setV({...v,lat:myPos.lat,lon:myPos.lon,z:v.z<15.5?16:v.z});},[follow,myPos&&myPos.lat,myPos&&myPos.lon]);
 const lockItem=lockId?items.find(i=>i.id===lockId):null;const lockKey=lockItem?lockItem.x+','+lockItem.y:'';
 useEffect(()=>{if(!lockItem||!vref.current)return;const [la,lo]=unproj(lockItem.x,lockItem.y);const v=vref.current;setV({...v,lat:la,lon:lo,z:Math.max(v.z,15)});},[lockKey,lockId]);
 const liveItems=items.filter(i=>['rangers','staff','sos','boats'].includes(i.layer)&&on(i.layer));
 const flyTo=it=>{if(!vref.current||it.x==null)return;const [la,lo]=unproj(it.x,it.y);setV({lat:la,lon:lo,z:Math.max(vref.current.z,16)});setIsWorld(false);};
 const world=()=>{if(!vref.current)return;if(!compact&&!locked){setGlobe(true);return;}if(isWorld&&wprev.current){setV(wprev.current);setIsWorld(false);return;}wprev.current=vref.current;setLockId(null);setV({lat:10,lon:20,z:Math.max(0,Math.log2(Math.min(size.w,size.h)/256))});setIsWorld(true);};
 const refit=()=>setIsWorld(false)||setV(fitView(LMMA_BB,size.w,size.h,40));
 const fitZone=z=>{if(vref.current)setV(fitView(bbOf(z.ll),size.w,size.h,60));};
 const pan=(dx0,dy0)=>{const v=vref.current;if(!v)return;const [dx,dy]=unrot(dx0,dy0);setV({...v,lon:lonOf(mx(v.lon,v.z)-dx,v.z),lat:latOf(my(v.lat,v.z)-dy,v.z)});};
 const zoomAt=(nz,px,py)=>{const v=vref.current;if(!v)return;nz=clamp(nz,ZMIN,ZMAX);const [ox,oy]=unrot(px-size.w/2,py-size.h/2);const lon=lonOf(mx(v.lon,v.z)+ox,v.z),lat=latOf(my(v.lat,v.z)+oy,v.z);setV({z:nz,lon:lonOf(mx(lon,nz)-ox,nz),lat:latOf(my(lat,nz)-oy,nz)});};
 const llAt=(px,py)=>{const v=vref.current;if(!v)return null;const [ox,oy]=unrot(px-size.w/2,py-size.h/2);return [latOf(my(v.lat,v.z)+oy,v.z),lonOf(mx(v.lon,v.z)+ox,v.z)];};
 /* choosing something on the map: highlight it, show the details card, tell the page */
 const choose=(item,detail)=>{setAct(item.id);if(!locked)setInfo({id:item.id,item,...detail});if(onSel)onSel({...item,detail});};
 const pickZone=z=>{const c=meanLL(z.ll);const [x,y]=proj(c[0],c[1]);choose({id:'zn-'+z.zid,layer:'zones',zone:z.zid,x,y},zoneDetail(z,app));};
 const pickPlace=pl=>{const [x,y]=proj(pl.lat,pl.lon);choose({id:'pl-'+pl.id,layer:'zones',place:pl,x,y},placeDetail(pl));};
 const pickPoint=p=>choose({id:'pt-'+p.n,layer:'zones',pt:p,x:p.x,y:p.y},pointDetail(p,vlist));
 const locOf=it=>{if(it.loc==='sensitive'&&role==='board')return 'Restricted. Exact enforcement coordinates are limited to the Super Admin and the reporting ranger.';const l=itemLL(it);return l?fmtLL(l[0],l[1]):'';};
 const pickItem=it=>{if(locked){if(onSel)onSel(it);return;}choose(it,{title:it.title,chip:it.status||'',rows:[['When',it.when],['Location',locOf(it)],['Team',it.team],['Details',it.desc],['Follow-up',it.follow]].filter(r=>r[1])});};
 const pickSpot=(la,lo)=>{const d=spotDetail(la,lo);setAct(null);setInfo({id:'spot',item:null,spot:[la,lo],...d});};
 /* gestures */
 const ptrs=useRef(new Map());
 const rel=e=>{const r=box.current.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
 const down=e=>{if(locked||e.button>0)return;dragged.current=false;ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});};
 const move=e=>{
  if(e.pointerType==='mouse'&&readout.current&&vref.current&&!ptrs.current.size){const [px,py]=rel(e);const l=llAt(px,py);if(l)readout.current.textContent=fmtLL(l[0],l[1]);}
  const p=ptrs.current.get(e.pointerId);if(!p)return;const nx=e.clientX,ny=e.clientY;
  if(ptrs.current.size===1){if(!p.moved&&Math.hypot(nx-p.sx,ny-p.sy)>5){p.moved=true;dragged.current=true;try{box.current.setPointerCapture(e.pointerId);}catch(x){}}if(p.moved){if(lockId)setLockId(null);pan(nx-p.x,ny-p.y);}}
  else if(ptrs.current.size===2){const other=[...ptrs.current.entries()].find(k=>k[0]!==e.pointerId)[1];const d0=Math.hypot(p.x-other.x,p.y-other.y),d1=Math.hypot(nx-other.x,ny-other.y);const r=box.current.getBoundingClientRect();const mxp=(nx+other.x)/2-r.left,myp=(ny+other.y)/2-r.top;p.moved=true;dragged.current=true;if(d0>0&&vref.current)zoomAt(vref.current.z+Math.log2(d1/d0),mxp,myp);pan((nx-p.x)/2,(ny-p.y)/2);const a0=Math.atan2(p.y-other.y,p.x-other.x),a1=Math.atan2(ny-other.y,nx-other.x);let da=(a1-a0)*180/Math.PI;if(da>180)da-=360;if(da<-180)da+=360;if(Math.abs(da)<40&&!compact)setBearing(bref.current+da);}
  p.x=nx;p.y=ny;};
 const up=e=>{ptrs.current.delete(e.pointerId);};
 /* tap on empty map: coordinates and the zone at that spot */
 const tap=e=>{if(locked)return;if(dragged.current){dragged.current=false;return;}if(e.target.closest&&e.target.closest('[data-f],.mk,button,input,.gm-info,.gm-leg,.gm-ctl,.gm-base,.gm-here,.gm-tools,.gm-clip'))return;const [px,py]=rel(e);const l=llAt(px,py);if(!l)return;
  if(isAdmin&&addMode){setAddMode(false);setPe({lat:+l[0].toFixed(6),lon:+l[1].toFixed(6)});return;}
  if(isAdmin&&moveId){const pl=PLACES.find(p=>p.id===moveId);setMoveId(null);if(pl&&confirm('Move '+pl.name+' to '+decLL(l[0],l[1])+'?'))saveLandmarks(PLACES.map(p=>p.id===moveId?{...p,lat:+l[0].toFixed(6),lon:+l[1].toFixed(6)}:p)).then(()=>{app.log&&app.log('Moved map place','Iweni LMMA Management',pl.name);app.toast&&app.toast(pl.name+' moved');setInfo(null);}).catch(x=>app.toast&&app.toast(x.message||'Could not move'));return;}
  pickSpot(l[0],l[1]);};
 /* coordinates pasted or copied from elsewhere: jump there and offer to add a place */
 const goCoords=(txt,quiet)=>{const c=parseCoordText(txt);if(!c){if(!quiet)app.toast&&app.toast('No coordinates found. Try -2.1428, 41.0095 or a Google Maps link.');return false;}const v=vref.current;if(v)setV({lat:c[0],lon:c[1],z:Math.max(v.z,16)});setIsWorld(false);setLockId(null);pickSpot(c[0],c[1]);setClip(null);return true;};
 useEffect(()=>{const f=()=>setPv(n=>n+1);window.addEventListener('pops-places',f);return()=>window.removeEventListener('pops-places',f);},[]);
 useEffect(()=>{if(!isAdmin)return;let last='';const chk=async()=>{try{if(document.hidden||!navigator.clipboard||!navigator.clipboard.readText)return;if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:'clipboard-read'});if(p.state!=='granted')return;}const t=await navigator.clipboard.readText();if(!t||t===last||t.length>400)return;const c=parseCoordText(t);if(c){last=t;setClip({txt:t,c});}}catch(e){}};window.addEventListener('focus',chk);document.addEventListener('visibilitychange',chk);return()=>{window.removeEventListener('focus',chk);document.removeEventListener('visibilitychange',chk);};},[isAdmin]);
 useEffect(()=>{const el=box.current;if(!el||locked)return;const w=e=>{if(!(e.ctrlKey||e.metaKey)){setHint(true);clearTimeout(w.t);w.t=setTimeout(()=>setHint(false),1400);return;}e.preventDefault();const r=el.getBoundingClientRect();zoomAt((vref.current?vref.current.z:12)-e.deltaY*(e.deltaMode?.05:.01),e.clientX-r.left,e.clientY-r.top);};el.addEventListener('wheel',w,{passive:false});return()=>el.removeEventListener('wheel',w);},[size.w,size.h,locked]);
 const key=e=>{if(locked||!vref.current)return;const s=80;if(e.key==='Escape'){setInfo(null);setAct(null);return;}if(e.key==='ArrowLeft')pan(s,0);else if(e.key==='ArrowRight')pan(-s,0);else if(e.key==='ArrowUp')pan(0,s);else if(e.key==='ArrowDown')pan(0,-s);else if(e.key==='q'||e.key==='Q')setBearing(bref.current-15);else if(e.key==='e'||e.key==='E')setBearing(bref.current+15);else if(e.key==='n'||e.key==='N')setBearing(0);else if(e.key==='f'||e.key==='F')toggleFull();else if(e.key==='+'||e.key==='=')zoomAt(vref.current.z+1,size.w/2,size.h/2);else if(e.key==='-')zoomAt(vref.current.z-1,size.w/2,size.h/2);else return;e.preventDefault();};
 const copy=txt=>{try{navigator.clipboard.writeText(txt);app.toast&&app.toast('Coordinates copied');}catch(e){}};
 /* full screen: the browser's full screen where it exists, otherwise a page-wide overlay */
 const toggleFull=()=>{const el=box.current;if(!el)return;if(full){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();setFull(false);return;}setFull(true);try{if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});}catch(e){}};
 useEffect(()=>{const f=()=>{if(!document.fullscreenElement)setFull(false);};document.addEventListener('fullscreenchange',f);return()=>document.removeEventListener('fullscreenchange',f);},[]);
 useEffect(()=>{if(!full)return;const k=e=>{if(e.key==='Escape')setFull(false);};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);},[full]);
 useEffect(()=>{if(!full&&document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});},[full]);
 useEffect(()=>{const el=box.current;if(el)setTimeout(()=>window.dispatchEvent(new Event('resize')),60);},[full]);
 /* compass: turn the map to the way the phone is facing */
 useEffect(()=>{if(!cmp)return;const h=e=>{let a=e.webkitCompassHeading!=null?e.webkitCompassHeading:(e.absolute||e.type==='deviceorientationabsolute')&&e.alpha!=null?360-e.alpha:null;if(a==null)return;setBearing(a);};window.addEventListener('deviceorientationabsolute',h,true);window.addEventListener('deviceorientation',h,true);return()=>{window.removeEventListener('deviceorientationabsolute',h,true);window.removeEventListener('deviceorientation',h,true);};},[cmp]);
 const startCompass=async()=>{if(cmp){setCmp(false);return;}try{if(window.DeviceOrientationEvent&&DeviceOrientationEvent.requestPermission){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted'){app.toast&&app.toast('Compass permission was refused');return;}}}catch(e){}if(!('DeviceOrientationEvent' in window)){app.toast&&app.toast('This device has no compass');return;}setCmp(true);};
 /* draw */
 let body=null;
 if(view&&size.w){
  const rot=bearing!==0;const W=rot?Math.ceil(Math.hypot(size.w,size.h)):size.w,H=rot?W:size.h;
  const z=view.z,cxw=mx(view.lon,z),cyw=my(view.lat,z);
  const S=(la,lo)=>[mx(lo,z)-cxw+W/2,my(la,z)-cyw+H/2];
  const P=ll=>ll.map(p=>S(p[0],p[1]).map(v=>v.toFixed(1)).join(',')).join(' ');
  const tz=Math.min(Math.round(z),TILES[base].max),sc=Math.pow(2,z-tz),n=Math.pow(2,tz),tcx=mx(view.lon,tz),tcy=my(view.lat,tz);
  const x0=Math.floor((tcx-W/2/sc)/256),x1=Math.floor((tcx+W/2/sc)/256),y0=Math.floor((tcy-H/2/sc)/256),y1=Math.floor((tcy+H/2/sc)/256);
  const tl2=[];for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){if(y<0||y>=n)continue;const wx=((x%n)+n)%n;tl2.push(html`<img key=${base+tz+'/'+x+'/'+y} className="gm-tile" alt="" draggable="false" src=${tileUrl(base,tz,wx,y)} style=${{left:(x*256-tcx)*sc+W/2,top:(y*256-tcy)*sc+H/2,width:256*sc+.6,height:256*sc+.6}} onLoad=${()=>setTl(t=>({...t,ok:t.ok+1}))} onError=${e=>{e.target.style.visibility='hidden';setTl(t=>({...t,bad:t.bad+1}));}}/>`);}
  /* graticule, labels kept clear of the controls and the scale bar */
  const degPx=WORLD(z)/360;const stepUse=niceDeg.filter(d=>d*degPx>=110).pop()||(degPx*niceDeg[0]<110?niceDeg[0]:niceDeg[niceDeg.length-1]);
  const west=lonOf(cxw-W/2,z),east=lonOf(cxw+W/2,z),north=latOf(cyw-H/2,z),south=latOf(cyw+H/2,z);
  const gl=[];for(let l=Math.ceil(Math.max(west,-540)/stepUse)*stepUse,gi=0;l<=Math.min(east,540)&&gi<120;l+=stepUse,gi++){const x=S(0,l)[0];gl.push(html`<g key=${'lo'+l.toFixed(5)}><line x1=${x} x2=${x} y1="0" y2=${H} className="gm-grat"/>${x>150&&x<W-190&&html`<text x=${x+4} y=${H-28} className="gm-gl">${toDMS(l,'E','W').replace(/\.\d/,'')}</text>`}</g>`);}
  for(let l=Math.ceil(Math.max(south,-90)/stepUse)*stepUse,gi=0;l<=Math.min(north,90)&&gi<120;l+=stepUse,gi++){const y=S(l,0)[1];gl.push(html`<g key=${'la'+l.toFixed(5)}><line x1="0" x2=${W} y1=${y} y2=${y} className="gm-grat"/>${y>70&&y<H-60&&html`<text x="6" y=${y-4} className="gm-gl">${toDMS(l,'N','S').replace(/\.\d/,'')}</text>`}</g>`);}
  const ctr=ll=>{const m=meanLL(ll);return S(m[0],m[1]);};
  const boats=[];
  const tsel=t=>{const f=t.ll?proj(t.ll[0][0],t.ll[0][1]):t.pts[0];return {noFly:true,id:'t-'+t.id,layer:'patrols',title:'Route of '+t.id,when:(t.dateTxt||'')+(t.dateTxt?' · ':'')+t.status,team:t.leader||'See patrol record',desc:'Route taken'+(t.km?' · '+(+t.km).toFixed(2)+' km':'')+((t.stops||[]).length?' · '+t.stops.length+' stop'+(t.stops.length===1?'':'s'):'')+'. Arrows show the direction, A is the start and B the end.',status:t.status,follow:'Open the patrol record for the timeline',x:f[0],y:f[1]};};
  const mscale=clamp(.5+(z-11)*.11,.5,1);
  const mk=(it,layer)=>{const [la,lo]=unproj(it.x,it.y);const [sx,sy]=S(la,lo);if(sx<-30||sy<-30||sx>W+30||sy>H+30)return null;return html`<${Marker} key=${it.id} layer=${layer} x=${sx} y=${sy} k=${mscale} sel=${act===it.id||sel===it.id} dim=${it.dim} hl=${it.hl} label=${it.title} onClick=${()=>pickItem(it)}/>`;};
  const mpp=40075016.686*Math.cos(view.lat*Math.PI/180)/WORLD(z);const nice=[10,20,50,100,200,500,1000,2000,5000,10000].filter(m=>m/mpp<=130).pop()||10;
  /* crowded icons: when zoomed out, nearby ordinary markers fold into a numbered group (tap to zoom in). SOS, live rangers, boats and the selected item are never grouped. */
  const CLZ=16.4,CELL=46;
  const vis=[];['restoration','activity','incidents','boats','rangers','bmus','staff','sos'].forEach(L=>{if(!on(L))return;items.forEach(it=>{if(it.layer!==L)return;const [la,lo]=unproj(it.x,it.y);const [sx,sy]=S(la,lo);if(sx<-30||sy<-30||sx>W+30||sy>H+30)return;vis.push({it,L,sx,sy,la,lo});});});
  const never=v=>v.L==='sos'||v.L==='rangers'||v.L==='boats'||v.it.hl||act===v.it.id||sel===v.it.id;
  const cells=new Map();const solo=[];
  vis.forEach(v=>{if(z>=CLZ||never(v)){solo.push(v);return;}const k=Math.floor(v.sx/CELL)+':'+Math.floor(v.sy/CELL);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(v);});
  const clusters=[];cells.forEach(g=>{if(g.length<2)solo.push(g[0]);else clusters.push(g);});
  const nGroups=clusters.length;
  const markersOut=[...clusters.map((g,ci)=>{const cx=g.reduce((a,v)=>a+v.sx,0)/g.length,cy=g.reduce((a,v)=>a+v.sy,0)/g.length;const cnt={};g.forEach(v=>{cnt[v.L]=(cnt[v.L]||0)+1;});const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];const col=LAYERS.find(l=>l.id===top).color;const txt=Object.keys(cnt).map(l=>cnt[l]+' '+LAYERS.find(x=>x.id===l).label.toLowerCase()).join(', ');const r=13+Math.min(9,Math.log2(g.length)*3);const gl=g.reduce((a,v)=>a+v.la,0)/g.length,go=g.reduce((a,v)=>a+v.lo,0)/g.length;
    return html`<g key=${'cl'+ci+'-'+g[0].it.id} className="mk gm-cl" transform=${`translate(${cx.toFixed(1)},${cy.toFixed(1)})`} tabIndex="0" role="button" aria-label=${g.length+' items: '+txt+'. Press to zoom in.'} onClick=${()=>{setLockId(null);setV({lat:gl,lon:go,z:Math.min(ZMAX,Math.max(z+2,CLZ+.2))});}} onKeyDown=${e=>{if(e.key==='Enter')setV({lat:gl,lon:go,z:Math.min(ZMAX,Math.max(z+2,CLZ+.2))});}}><title>${txt}</title><circle r=${r+4} fill=${col} opacity=".28"/><circle r=${r} fill=${col} stroke="#fff" strokeWidth="2"/><text y="4.5" textAnchor="middle">${g.length}</text></g>`;}),
   ...['restoration','activity','incidents','bmus','staff','boats','rangers','sos'].flatMap(L=>solo.filter(v=>v.L===L&&!never(v)).map(v=>mk(v.it,L))),
   ...solo.filter(never).map(v=>mk(v.it,v.L))];
  const noTiles=tl.ok===0&&tl.bad>=3;
  const zc=zz=>'gm-z '+zz.kind+(hov===zz.id?' hot':'')+(act==='zn-'+zz.zid?' sel':'');
  const zpoly=(zz,fill)=>html`<polygon key=${zz.id} data-f="1" points=${P(zz.ll)} fill=${fill} className=${zc(zz)} strokeLinejoin="round" onPointerEnter=${()=>setHov(zz.id)} onPointerLeave=${()=>setHov(null)} onClick=${ev=>{ev.stopPropagation();pickZone(zz);}}><title>${zz.name}</title></polygon>`;
  const zlab={ntz:'REEF · NO-TAKE ZONE',gear:'SEAGRASS · GEAR RESTRICTED'};
  const cur=info&&info.item&&info.item.pt?{...info,...pointDetail(info.item.pt,vlist)}:info;
  const here=myPos?zoneAt(myPos.lat,myPos.lon):undefined;
  const legOpen=leg===null?false:leg;
  const zsh=k=>ZONE_SHAPES.find(q=>q.kind===k);
  body=html`<div className="gm-rot" style=${{width:W,height:H,left:(size.w-W)/2,top:(size.h-H)/2,transform:rot?'rotate('+bearing+'deg)':'none'}}><div className="gm-tiles">${tl2}</div>
  <svg className="gm-svg" width=${W} height=${H} viewBox=${`0 0 ${W} ${H}`} role="img" aria-label="Iweni LMMA operations map">
   <defs>
    <pattern id=${'reef'+uid} width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#B9E769" fillOpacity=".4"/><circle cx="1.8" cy="1.8" r="1" fill="#F0FFC4"/><circle cx="5.3" cy="5.3" r="1" fill="#2E6A14"/></pattern>
    <pattern id=${'sea'+uid} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#47C6F5" fillOpacity=".45"/><line x1="0" y1="0" x2="0" y2="8" stroke="#06283D" strokeWidth="1.7" strokeOpacity=".85"/></pattern>
   </defs>
   ${gl}
   ${on('zones')&&html`<g>
    ${ZONE_SHAPES.filter(q=>q.kind==='gear'||q.kind==='other').map(q=>zpoly(q,`url(#sea${uid})`))}
    ${ZONE_SHAPES.filter(q=>q.kind==='ntz').map(q=>zpoly(q,`url(#reef${uid})`))}
    ${ZONE_SHAPES.filter(q=>q.kind==='lmma').map(q=>html`<polygon key=${q.id} points=${P(q.ll)} className="gm-lmma" strokeLinejoin="round"/>`)}
    ${ZONE_SHAPES.filter(q=>act==='zn-'+q.zid).map(q=>html`<polygon key=${'s'+q.id} points=${P(q.ll)} className="gm-zsel" strokeLinejoin="round"/>`)}
    ${!compact&&ZONE_SHAPES.filter(q=>zlab[q.kind]).map(q=>{const c=ctr(q.ll);return html`<text key=${'t'+q.id} x=${c[0]} y=${c[1]+4} textAnchor="middle" className=${'zlabel '+q.kind}>${zlab[q.kind]}</text>`;})}
    ${PLACES.filter(pl=>!(ms.hide||[]).includes(pl.kind||'village')).map(pl=>{const [sx,sy]=S(pl.lat,pl.lon);if(sx<-80||sy<-30||sx>W+80||sy>H+30)return null;const kz=ms.size==='l'?1.45:ms.size==='s'?.8:1;return html`<g key=${pl.id} data-f="1" className="gm-place" transform=${`translate(${sx},${sy})`} onClick=${ev=>{ev.stopPropagation();if(isAdmin&&editMode)setPe(pl);else pickPlace(pl);}} style=${{cursor:'pointer'}}><circle r="16" fill="transparent"/><${PlaceShape} kind=${pl.kind||'village'} k=${kz}/>${(act==='pl-'+pl.id||moveId===pl.id)&&html`<circle r=${17*kz} fill="none" stroke=${moveId===pl.id?'#FFD23F':'#fff'} strokeWidth="2" strokeDasharray="4 3"/>`}${ms.labels!==false&&html`<text x=${12*kz} y="5" className="gm-pl">${pl.name}</text>`}<title>${pl.name} (${placeKind(pl.kind).label})${pl.village?' · '+pl.village:''}</title></g>`;})}</g>`}
   ${on('patrols')&&tracks.map(t=>{const sg=splitSegs(trackLL(t));const all=trackLL(t);const live=t.status==='Active'||t.status==='Paused';const mp=all[Math.floor(all.length/2)];const kmT=t.km?(+t.km).toFixed(t.km<10?2:1)+' km':'';return html`<g key=${t.id} data-f="1" onClick=${ev=>{ev.stopPropagation();pickItem(tsel(t));}}><polyline points=${P(all)} fill="none" stroke="transparent" strokeWidth="16" strokeLinecap="round" style=${{cursor:'pointer'}}/>${sg.map((s,i)=>html`<polyline key=${i} points=${P(s)} fill="none" className=${'gm-track '+(t.status==='Active'?'act':'')+(act==='t-'+t.id?' sel':'')} style=${t.color&&t.status!=='Active'&&act!=='t-'+t.id?{stroke:t.color}:null}><title>${t.id} (${t.status})${kmT?' · '+kmT:''}</title></polyline>`)}${sg.slice(1).map((s,i)=>html`<g key=${'g'+i}><polyline points=${P([sg[i][sg[i].length-1],s[0]])} fill="none" className=${s[0][2]===2?'gm-gap est':'gm-gap'}><title>${s[0][2]===2?'Signal or screen was lost here. The straight line is counted as an estimate.':'Paused or an impossible jump: not counted'}</title></polyline>${s[0][2]===2&&html`<${TrkArrows} pts=${[sg[i][sg[i].length-1],s[0]]} S=${S} gap=${true}/>`}</g>`)}<${TrkArrows} pts=${sg} S=${S} multi=${true}/>${(t.stops||[]).map((st,i)=>{const [sx,sy]=S(st.ll[0],st.ll[1]);const mins=Math.max(1,Math.round((st.t1-st.t0)/60));return html`<g key=${'s'+i} transform=${`translate(${sx},${sy})`} className="gm-stop"><circle r="8"/><text y="3.5" textAnchor="middle">P</text><title>Stopped for ${mins} min</title></g>`;})}<${TrkEnds} ll=${all} S=${S} done=${!live} id=${t.id}/>${kmT&&mp&&html`<${TrkDist} p=${S(mp[0],mp[1])} txt=${kmT} id=${t.id}/>`}</g>`;})}
   ${myTrack&&myTrack.length>1&&html`<g>${splitSegs(myTrack).map((s,i)=>html`<polyline key=${i} points=${P(s)} fill="none" className="gm-mine"/>`)}${splitSegs(myTrack).slice(1).map((sg2,i)=>html`<polyline key=${'g'+i} points=${P([splitSegs(myTrack)[i][splitSegs(myTrack)[i].length-1],sg2[0]])} fill="none" className=${sg2[0][2]===2?'gm-gap est':'gm-gap'}/>`)}<${TrkArrows} pts=${splitSegs(myTrack)} S=${S} multi=${true} mine=${true}/><${TrkEnds} ll=${myTrack} S=${S} done=${false} id="me" live=${true}/></g>`}
   ${showPts&&points.map(p=>{const [sx,sy]=S(p.la,p.lo);const v=vlist.includes(p.n);return html`<g key=${p.n} data-f="1" className="gm-pt" transform=${`translate(${sx},${sy})`} onClick=${ev=>{ev.stopPropagation();pickPoint(p);}} style=${{cursor:'pointer'}}><circle r="19" fill="transparent"/><circle className="gm-ptc" r=${act==='pt-'+p.n?15:11} fill=${v?'var(--good)':'var(--ink)'} stroke="#fff" strokeWidth="3"/><text y="4" textAnchor="middle" className="ptn">${p.n}</text><title>Point ${p.n}: ${p.lat} / ${p.lon}${v?' (verified)':' (awaiting verification)'}</title></g>`;})}
   ${markersOut}
   ${on('boats')&&boats.map(b=>{const [sx,sy]=S(0,0);return html`<${Marker} key=${b.id} layer="boats" x=${sx} y=${sy} sel=${act===b.id} label=${b.title+' (live)'} onClick=${()=>pickItem({...b,layer:'boats'})}/>`;})}
   ${info&&info.spot&&(()=>{const [sx,sy]=S(info.spot[0],info.spot[1]);return html`<g transform=${`translate(${sx},${sy})`} className="gm-spot"><circle r="9" fill="none" stroke="#fff" strokeWidth="2.5"/><circle r="2.5" fill="#fff"/><circle r="9" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1"/></g>`;})()}
   ${myPos&&(()=>{const [sx,sy]=S(myPos.lat,myPos.lon);const r=Math.max(8,(myPos.acc||10)/mpp);return html`<g transform=${`translate(${sx},${sy})`}><circle r=${Math.min(r,90)} className="gm-acc"/><circle r="9" fill="#2A78D6" stroke="#fff" strokeWidth="3"/></g>`;})()}
  </svg></div>
  <div className="gm-attr">${TILES[base].attr} · WGS 84</div>
  <div className="gm-scale"><i style=${{width:nice/mpp}}/><span>${nice>=1000?nice/1000+' km':nice+' m'}</span></div>
  ${myPos&&here!==undefined&&html`<div className=${'gm-here '+(here?here.kind:'out')}>${here?'You are in: '+here.name:'You are outside the Iweni LMMA'}</div>`}
  ${nGroups>0&&!compact&&html`<div className="gm-clnote">${nGroups} group${nGroups===1?'':'s'} of icons. Zoom in or tap a group to separate them.</div>`}
  ${noTiles&&html`<div className="gm-note">Basemap tiles not available here. Showing the vector chart, which also works offline.</div>`}
  ${hint&&html`<div className="gm-hint">Hold Ctrl and scroll to zoom the map</div>`}
  ${isAdmin&&html`<button type="button" className=${'gm-toolbtn'+(tools||editMode||addMode||moveId?' on':'')} aria-expanded=${tools} onClick=${()=>setTools(v=>!v)}><${Icon} n="settings" s=${15}/> Map tools${editMode?' · editing':''}</button>`}
  ${isAdmin&&(addMode||moveId)&&html`<div className="gm-modebar" role="status">${addMode?'Tap the map where the new place is':'Tap the new position'}<button type="button" className="btn small" onClick=${()=>{setAddMode(false);setMoveId(null);}}>Cancel</button></div>`}
  ${isAdmin&&clip&&html`<div className="gm-clip" role="status"><span>Coordinates copied: <b>${decLL(clip.c[0],clip.c[1])}</b></span><button type="button" className="btn small primary" onClick=${()=>{goCoords(clip.txt);setPe({lat:+clip.c[0].toFixed(6),lon:+clip.c[1].toFixed(6)});}}>Add place here</button><button type="button" className="btn small" onClick=${()=>goCoords(clip.txt)}>Show on map</button><button type="button" className="gm-x" aria-label="Dismiss" onClick=${()=>setClip(null)}>×</button></div>`}
  ${isAdmin&&tools&&html`<div className="gm-tools" role="dialog" aria-label="Map tools"><div className="gm-tools-h"><b>Map tools</b><button type="button" className="gm-x" aria-label="Close tools" onClick=${()=>setTools(false)}>×</button></div>
   <div className="gm-tools-b">
    <label className="chk"><input type="checkbox" checked=${editMode} onChange=${e=>{setEditMode(e.target.checked);setAddMode(false);setMoveId(null);}}/><span>Edit mode: tap a place to edit, move or delete it</span></label>
    <div className="btnrow"><button type="button" className="btn small primary" onClick=${()=>{setAddMode(true);setTools(false);}}>+ Add place on map</button><button type="button" className="btn small" onClick=${()=>setPe({lat:view?+view.lat.toFixed(6):'',lon:view?+view.lon.toFixed(6):''})}>+ Add at map centre</button></div>
    <label className="gm-tl" htmlFor="gm-paste">Paste or type coordinates</label>
    <div className="btnrow"><input id="gm-paste" className="grow" value=${pasteTxt} onChange=${e=>setPasteTxt(e.target.value)} onKeyDown=${e=>{if(e.key==='Enter'&&goCoords(pasteTxt))setPasteTxt('');}} placeholder="-2.1428, 41.0095 or a Maps link"/><button type="button" className="btn small" onClick=${()=>{if(goCoords(pasteTxt))setPasteTxt('');}}>Go</button></div>
    <button type="button" className="btn small" onClick=${async()=>{try{const t=await navigator.clipboard.readText();goCoords(t);}catch(e){app.toast&&app.toast('The browser did not allow reading the clipboard. Click the map and press Ctrl+V, or paste into the box above.');}}}>Paste from clipboard</button>
    <p className="muted small">Tip: copy a place from Google Maps (or any message), come back here and the option to add it appears.</p>
    <details><summary>Map settings</summary><${MapSettings} compact=${true}/></details>
   </div></div>`}
  ${pe&&html`<${PlaceEditor} key=${pe.id||'new'+pe.lat+pe.lon} place=${pe} onClose=${()=>{setPe(null);setInfo(null);}} onSaved=${()=>setPv(n=>n+1)}/>`}
  ${globe&&!compact&&!locked&&html`<${Globe} lat0=${view?view.lat:-2} lon0=${view?view.lon:41} onExit=${(la,lo,z)=>{setGlobe(false);setIsWorld(false);setV({lat:la,lon:lo,z:z||3});}} onLamu=${()=>{setGlobe(false);setIsWorld(false);setV(fitView(LMMA_BB,size.w,size.h,40));}}/>`}
  ${!locked&&html`<div className="gm-ctl"><button aria-label="Zoom in" onClick=${()=>zoomAt(view.z+1,size.w/2,size.h/2)}>+</button><button aria-label="Zoom out" onClick=${()=>zoomAt(view.z-1,size.w/2,size.h/2)}>−</button><button aria-label="Fit to Iweni LMMA" title="Fit to Iweni LMMA" onClick=${refit}><${Icon} n="lmma" s=${16}/></button><button aria-label=${isWorld?'Back to the LMMA':'Show the whole earth'} title=${isWorld?'Back to where you were':'Zoom out to the whole earth'} onClick=${world}>${isWorld?'↩':'🌍'}</button>${liveItems.length>0&&html`<button aria-label="List of live patrols and users" title="Live list" aria-pressed=${lst} onClick=${()=>setLst(v=>!v)}>☰</button>`}${!compact&&html`<button aria-label="Turn map left" title="Turn left (Q)" onClick=${()=>setBearing(bref.current-15)}>⟲</button><button aria-label="Turn map right" title="Turn right (E)" onClick=${()=>setBearing(bref.current+15)}>⟳</button>`}${!compact&&html`<button aria-label=${full?'Exit full screen':'Full screen'} title=${full?'Exit full screen (Esc)':'Full screen (F)'} onClick=${toggleFull}>${full?'✕':'⛶'}</button>`}</div>`}
  ${!compact&&html`<button type="button" className=${'gm-north '+(cmp?'live':'')} aria-label=${'Compass. The map is turned '+Math.round(bearing)+' degrees. Tap to point north up. Press and hold to follow the phone compass.'} title="Tap: north up. Hold: follow phone compass" onClick=${()=>{setCmp(false);setBearing(0);}} onContextMenu=${e=>{e.preventDefault();startCompass();}} onDoubleClick=${e=>{e.stopPropagation();startCompass();}}><svg viewBox="-20 -20 40 40" width="40" height="40" style=${{transform:'rotate('+(-bearing)+'deg)'}}><circle r="18" fill="rgba(7,20,24,.65)" stroke="#fff" strokeOpacity=".7"/><path d="M0,-15 L4.5,0 L0,-3 L-4.5,0 Z" fill="#ff5a4d"/><path d="M0,15 L4.5,0 L0,3 L-4.5,0 Z" fill="#fff" fillOpacity=".55"/></svg><b>${Math.round(bearing)}°${cmp?' ⌖':''}</b></button>`}
  ${!compact&&!locked&&html`<button type="button" className=${'gm-livebtn'+(lst?' on':'')} aria-pressed=${lst} onClick=${()=>setLst(v=>!v)}>Live list (${liveItems.length})</button>`}
  ${!compact&&html`<div className="gm-base" role="group" aria-label="Basemap">${Object.keys(TILES).map(k=>html`<button key=${k} className=${base===k?'on':''} aria-pressed=${base===k} onClick=${()=>setBase(k)}>${TILES[k].label}</button>`)}</div>`}
  ${!compact&&html`<div className=${'gm-leg'+(legOpen?' open':'')}><button className="gm-legt" aria-expanded=${legOpen} onClick=${()=>setLeg(!legOpen)}>Legend ${legOpen?'▾':'▸'}</button>${legOpen&&html`<ul>
    ${Object.keys(PLACE_KINDS).filter(k=>PLACES.some(p=>(p.kind||'village')===k)&&!(ms.hide||[]).includes(k)).map(k=>html`<li key=${k}><svg width="16" height="14" viewBox="-10 -10 20 20"><${PlaceShape} kind=${k}/></svg>${PLACE_KINDS[k].label}${k==='village'?'s':''}</li>`)}
    ${zsh('ntz')&&html`<li><button onClick=${()=>{fitZone(zsh('ntz'));pickZone(zsh('ntz'));}}><i className="lg-reef"/>Reef habitat<small>No-take zone</small></button></li>`}
    ${zsh('gear')&&html`<li><button onClick=${()=>{fitZone(zsh('gear'));pickZone(zsh('gear'));}}><i className="lg-sea"/>Seagrass habitat<small>Gear restricted zone</small></button></li>`}
    ${zsh('lmma')&&html`<li><button onClick=${()=>{fitZone(zsh('lmma'));pickZone(zsh('lmma'));}}><i className="lg-lmma"/>Iweni LMMA boundary</button></li>`}
    ${showPts&&html`<li><i className="lg-pt v"/>Verified point</li><li><i className="lg-pt"/>Awaiting verification</li>`}
    <li className="gm-datum">Datum WGS 84 · degrees</li></ul>`}</div>`}
  ${!locked&&!compact&&html`<div className="gm-read" ref=${readout} aria-hidden="true"></div>`}
  ${lockItem&&html`<div className="gm-lock" role="status"><span>Following <b>${lockItem.title}</b><small>${lockItem.when||''}${lockItem.status?' · '+lockItem.status:''}</small></span><button type="button" className="btn small" onClick=${()=>setLockId(null)}>Stop</button></div>`}
  ${lst&&!locked&&html`<div className="gm-list" role="dialog" aria-label="Live patrols and users"><div className="gm-list-h"><b>Live now (${liveItems.length})</b><button type="button" className="gm-x" aria-label="Close list" onClick=${()=>setLst(false)}>×</button></div><ul>${liveItems.map(i=>html`<li key=${i.id} className=${lockId===i.id?'on':''}><button type="button" onClick=${()=>{flyTo(i);choose(i,{title:i.title,chip:i.status||'',rows:[['When',i.when],['Location',locOf(i)],['Team',i.team],['Details',i.desc]].filter(r=>r[1])});if(compact||size.w<520)setLst(false);}}><b>${i.title}</b><small>${i.status||''}${i.when?' · '+i.when:''}</small></button><button type="button" className="btn small" aria-label=${(lockId===i.id?'Stop following ':'Follow ')+i.title} onClick=${()=>{setLockId(lockId===i.id?null:i.id);flyTo(i);}}>${lockId===i.id?'Unlock':'Lock on'}</button></li>`)}${!liveItems.length&&html`<li className="muted small">Nothing live on the layers shown.</li>`}</ul></div>`}
  ${cur&&!locked&&html`<div className=${'gm-info'+(cur.spot||(cur.item&&cur.item.place)?' gm-act':'')} role="dialog" aria-label=${cur.title}><button className="gm-x" aria-label="Close details" onClick=${()=>{setInfo(null);setAct(null);}}>×</button>
   <div className="gm-info-h"><b>${cur.title}</b>${cur.chip&&html`<span className="gm-chip">${cur.chip}</span>`}</div>
   <dl>${cur.rows.map((r,i)=>html`<div key=${i}><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`)}</dl>
   <div className="gm-acts">${cur.spot&&html`<button className="btn small" onClick=${()=>copy(decLL(cur.spot[0],cur.spot[1]))}>Copy coordinates</button>`}${cur.spot&&isAdmin&&html`<button className="btn small primary" onClick=${()=>setPe({lat:+cur.spot[0].toFixed(6),lon:+cur.spot[1].toFixed(6)})}>Add a place here</button>`}${cur.item&&cur.item.place&&html`<button className="btn small" onClick=${()=>copy(decLL(cur.item.place.lat,cur.item.place.lon))}>Copy coordinates</button>`}${cur.item&&cur.item.place&&isAdmin&&html`<button className="btn small" onClick=${()=>setPe(cur.item.place)}>Edit</button><button className="btn small" onClick=${()=>{setMoveId(cur.item.place.id);setInfo(null);app.toast&&app.toast('Tap the new position on the map');}}>Move</button>`}${cur.item&&cur.item.pt&&cur.item.pt.la!=null&&html`<button className="btn small" onClick=${()=>copy(decLL(cur.item.pt.la,cur.item.pt.lo))}>Copy coordinates</button>`}${cur.item&&['rangers','staff','sos','boats'].includes(cur.item.layer)&&html`<button className=${'btn small'+(lockId===cur.item.id?' primary':'')} onClick=${()=>{setLockId(lockId===cur.item.id?null:cur.item.id);flyTo(cur.item);}}>${lockId===cur.item.id?'Stop following':'Lock on and follow'}</button>`}${(actions?actions(cur.item):[]).map((a,i)=>html`<button key=${i} className=${'btn small'+(a.primary?' primary':'')} onClick=${a.onClick}>${a.label}</button>`)}</div></div>`}`;
 }
 return html`<div ref=${box} className=${'geomap '+(full?'gm-full ':'')+(compact?'compact ':'')+(locked?'locked ':'')+(base==='sat'?'sat':'osm')} style=${height?{height}:null} tabIndex=${locked?-1:0} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onClick=${tap} onKeyDown=${key} onPaste=${e=>{if(locked)return;const t=(e.clipboardData&&e.clipboardData.getData('text'))||'';if(t&&!/^(INPUT|TEXTAREA)$/.test((e.target.tagName||''))&&goCoords(t,true)&&isAdmin)setClip(null);}} onDoubleClick=${e=>{if(!locked&&vref.current&&!(e.target.closest&&e.target.closest('[data-f],.gm-info,.gm-leg'))){const [px,py]=rel(e);zoomAt(vref.current.z+1,px,py);}}}>${body}</div>`;
};
const OpsMap=GeoMap;
