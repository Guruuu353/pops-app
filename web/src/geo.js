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
const ZMIN=11,ZMAX=19;
const bbOf=ll=>({n:Math.max(...ll.map(p=>p[0])),s:Math.min(...ll.map(p=>p[0])),w:Math.min(...ll.map(p=>p[1])),e:Math.max(...ll.map(p=>p[1]))});
const fitView=(bb,w,h,pad=36)=>{const dx=mx(bb.e,0)-mx(bb.w,0)||1e-6,dy=my(bb.s,0)-my(bb.n,0)||1e-6;const z=clamp(Math.min(Math.log2(Math.max(40,w-2*pad)/dx),Math.log2(Math.max(40,h-2*pad)/dy)),ZMIN,17.5);return {z,lon:(bb.w+bb.e)/2,lat:latOf((my(bb.n,z)+my(bb.s,z))/2,z)};};
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
const placeDetail=pl=>{const lm=ZONE_SHAPES.find(z=>z.kind==='lmma');const d=lm?haversine([pl.lat,pl.lon],meanLL(lm.ll))/1000:null;const cp=LOOK.bmu&&LOOK.bmu.certificate_point;const isCert=cp&&haversine([pl.lat,pl.lon],[cp.lat,cp.lon])<40;return {title:pl.name,chip:pl.kind==='village'?'Village':'Place',rows:[['Coordinates',fmtLL(pl.lat,pl.lon)],['Decimal degrees',decLL(pl.lat,pl.lon)],d!=null?['Distance to the LMMA centre',d.toFixed(1)+' km']:null,isCert?['Note','BMU certificate point']:null].filter(Boolean)};};
const spotDetail=(la,lo)=>{const z=zoneAt(la,lo);const n=nearestPlace(la,lo);return {title:'Map point',chip:z?(ZINFO[z.kind]||{label:'In LMMA'}).label:'Outside the LMMA',rows:[['Coordinates',fmtLL(la,lo)],['Decimal degrees',decLL(la,lo)],['Zone',z?z.name:'Outside the Iweni LMMA'],n?['Nearest place',n.p.name+', '+(n.d>=1000?(n.d/1000).toFixed(1)+' km':Math.round(n.d)+' m')]:null].filter(Boolean)};};
const niceDeg=[2,1,.5,.2,.1,.05,.02,.01,.005,.002,.001,.0005,.0002,.0001];

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


const GeoMap=({layers=['zones','patrols'],items=[],tracks=[],sel,onSel,points=[],showPts,fit='lmma',locked,compact,height,myPos,myTrack,showLive=true,follow,verified,actions})=>{
 const app=useApp()||{};const vlist=verified||app.vl||[];const role=app.role;
 const box=useRef(null);const [size,setSize]=useState({w:0,h:0});const [view,setView]=useState(null);const vref=useRef(null);
 const uid=useRef('g'+Math.random().toString(36).slice(2,6)).current;
 const [base,setBaseS]=useState(()=>{try{return localStorage.getItem('pops-base')||'sat';}catch(e){return 'sat';}});
 const setBase=b=>{setBaseS(b);setTl({ok:0,bad:0});try{localStorage.setItem('pops-base',b);}catch(e){}};
 const [tl,setTl]=useState({ok:0,bad:0});const [hint,setHint]=useState(false);
 const [hov,setHov]=useState(null);const [act,setAct]=useState(null);const [info,setInfo]=useState(null);const [leg,setLeg]=useState(null);
 const readout=useRef(null);const dragged=useRef(false);
 const [bearing,setBearingS]=useState(0);const bref=useRef(0);const setBearing=b=>{b=((b%360)+360)%360;bref.current=b;setBearingS(b);};
 const [full,setFull]=useState(false);const [cmp,setCmp]=useState(false);
 const unrot=(dx,dy)=>{const t=bref.current*Math.PI/180,c=Math.cos(t),sn=Math.sin(t);return [dx*c+dy*sn,-dx*sn+dy*c];};
 const on=id=>layers.includes(id);
 const live=useLive(showLive&&on('boats'));
 const setV=v=>{vref.current=v;setView(v);};
 useEffect(()=>{if(sel)setAct(sel);},[sel]);
 /* measure */
 useEffect(()=>{const el=box.current;if(!el)return;const m=()=>{const r=el.getBoundingClientRect();setSize(s=>(Math.abs(s.w-r.width)>1||Math.abs(s.h-r.height)>1)?{w:r.width,h:r.height}:s);};m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);ro.observe(el);}window.addEventListener('resize',m);return()=>{if(ro)ro.disconnect();window.removeEventListener('resize',m);};},[]);
 /* first fit */
 const trackLL=tr=>tr.ll||tr.pts.map(p=>unproj(p[0],p[1]));
 useEffect(()=>{if(!size.w||vref.current)return;let bb=LMMA_BB;if(fit==='tracks'&&tracks.length){bb=bbOf(tracks.flatMap(trackLL));}setV(fitView(bb,size.w,size.h,fit==='tracks'?28:40));},[size.w,size.h]);
 /* fly to selection (points and markers; zones are not zoomed when tapped) */
 useEffect(()=>{if(!sel||!vref.current)return;const it=items.find(i=>i.id===sel)||(sel.startsWith&&sel.startsWith('pt-')&&points.find(p=>'pt-'+p.n===sel));if(!it)return;const [la,lo]=it.pt?[it.pt.la,it.pt.lo]:unproj(it.x,it.y);setV({lat:la,lon:lo,z:Math.max(vref.current.z,16)});},[sel]);
 useEffect(()=>{if(!follow||!myPos||!vref.current)return;const v=vref.current;setV({...v,lat:myPos.lat,lon:myPos.lon,z:v.z<15.5?16:v.z});},[follow,myPos&&myPos.lat,myPos&&myPos.lon]);
 const refit=()=>setV(fitView(LMMA_BB,size.w,size.h,40));
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
  if(ptrs.current.size===1){if(!p.moved&&Math.hypot(nx-p.sx,ny-p.sy)>5){p.moved=true;dragged.current=true;try{box.current.setPointerCapture(e.pointerId);}catch(x){}}if(p.moved)pan(nx-p.x,ny-p.y);}
  else if(ptrs.current.size===2){const other=[...ptrs.current.entries()].find(k=>k[0]!==e.pointerId)[1];const d0=Math.hypot(p.x-other.x,p.y-other.y),d1=Math.hypot(nx-other.x,ny-other.y);const r=box.current.getBoundingClientRect();const mxp=(nx+other.x)/2-r.left,myp=(ny+other.y)/2-r.top;p.moved=true;dragged.current=true;if(d0>0&&vref.current)zoomAt(vref.current.z+Math.log2(d1/d0),mxp,myp);pan((nx-p.x)/2,(ny-p.y)/2);const a0=Math.atan2(p.y-other.y,p.x-other.x),a1=Math.atan2(ny-other.y,nx-other.x);let da=(a1-a0)*180/Math.PI;if(da>180)da-=360;if(da<-180)da+=360;if(Math.abs(da)<40&&!compact)setBearing(bref.current+da);}
  p.x=nx;p.y=ny;};
 const up=e=>{ptrs.current.delete(e.pointerId);};
 /* tap on empty map: coordinates and the zone at that spot */
 const tap=e=>{if(locked)return;if(dragged.current){dragged.current=false;return;}if(e.target.closest&&e.target.closest('[data-f],.mk,button,.gm-info,.gm-leg,.gm-ctl,.gm-base,.gm-here'))return;const [px,py]=rel(e);const l=llAt(px,py);if(l)pickSpot(l[0],l[1]);};
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
  const degPx=WORLD(z)/360;const stepUse=niceDeg.filter(d=>d*degPx>=110).pop()||niceDeg[niceDeg.length-1];
  const west=lonOf(cxw-W/2,z),east=lonOf(cxw+W/2,z),north=latOf(cyw-H/2,z),south=latOf(cyw+H/2,z);
  const gl=[];for(let l=Math.ceil(west/stepUse)*stepUse;l<=east;l+=stepUse){const x=S(0,l)[0];gl.push(html`<g key=${'lo'+l.toFixed(5)}><line x1=${x} x2=${x} y1="0" y2=${H} className="gm-grat"/>${x>150&&x<W-190&&html`<text x=${x+4} y=${H-28} className="gm-gl">${toDMS(l,'E','W').replace(/\.\d/,'')}</text>`}</g>`);}
  for(let l=Math.ceil(south/stepUse)*stepUse;l<=north;l+=stepUse){const y=S(l,0)[1];gl.push(html`<g key=${'la'+l.toFixed(5)}><line x1="0" x2=${W} y1=${y} y2=${y} className="gm-grat"/>${y>70&&y<H-60&&html`<text x="6" y=${y-4} className="gm-gl">${toDMS(l,'N','S').replace(/\.\d/,'')}</text>`}</g>`);}
  const ctr=ll=>{const m=meanLL(ll);return S(m[0],m[1]);};
  const boats=[];
  const tsel=t=>{const f=t.ll?proj(t.ll[0][0],t.ll[0][1]):t.pts[0];return {id:'t-'+t.id,layer:'patrols',title:'GPS track '+t.id,when:t.status,team:'See patrol record',desc:'Recorded GPS track for patrol '+t.id+'.',status:t.status,follow:'Open the patrol record for details',x:f[0],y:f[1]};};
  const mk=(it,layer)=>{const [la,lo]=unproj(it.x,it.y);const [sx,sy]=S(la,lo);if(sx<-30||sy<-30||sx>W+30||sy>H+30)return null;return html`<${Marker} key=${it.id} layer=${layer} x=${sx} y=${sy} sel=${act===it.id||sel===it.id} label=${it.title} onClick=${()=>pickItem(it)}/>`;};
  const mpp=40075016.686*Math.cos(view.lat*Math.PI/180)/WORLD(z);const nice=[10,20,50,100,200,500,1000,2000,5000,10000].filter(m=>m/mpp<=130).pop()||10;
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
    ${PLACES.map(pl=>{const [sx,sy]=S(pl.lat,pl.lon);if(sx<-80||sy<-30||sx>W+80||sy>H+30)return null;return html`<g key=${pl.id} data-f="1" className="gm-place" transform=${`translate(${sx},${sy})`} onClick=${ev=>{ev.stopPropagation();pickPlace(pl);}} style=${{cursor:'pointer'}}><circle r="16" fill="transparent"/><path d="M0,-9 L8,6 L-8,6 Z" fill="#E3262E" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>${act==='pl-'+pl.id&&html`<circle r="17" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3"/>`}<text x="12" y="5" className="gm-pl">${pl.name}</text><title>${pl.name}</title></g>`;})}</g>`}
   ${on('patrols')&&tracks.map(t=>html`<g key=${t.id} data-f="1" onClick=${ev=>{ev.stopPropagation();pickItem(tsel(t));}}><polyline points=${P(trackLL(t))} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" style=${{cursor:'pointer'}}/><polyline points=${P(trackLL(t))} fill="none" className=${'gm-track '+(t.status==='Active'?'act':t.status==='Completed'?'':'dash')+(act==='t-'+t.id?' sel':'')}><title>${t.id} (${t.status})</title></polyline></g>`)}
   ${myTrack&&myTrack.length>1&&html`<polyline points=${P(myTrack)} fill="none" className="gm-mine"/>`}
   ${showPts&&points.map(p=>{const [sx,sy]=S(p.la,p.lo);const v=vlist.includes(p.n);return html`<g key=${p.n} data-f="1" className="gm-pt" transform=${`translate(${sx},${sy})`} onClick=${ev=>{ev.stopPropagation();pickPoint(p);}} style=${{cursor:'pointer'}}><circle r="19" fill="transparent"/><circle className="gm-ptc" r=${act==='pt-'+p.n?15:11} fill=${v?'var(--good)':'var(--ink)'} stroke="#fff" strokeWidth="3"/><text y="4" textAnchor="middle" className="ptn">${p.n}</text><title>Point ${p.n}: ${p.lat} / ${p.lon}${v?' (verified)':' (awaiting verification)'}</title></g>`;})}
   ${['restoration','activity','incidents','boats','rangers','bmus','staff','sos'].map(L=>on(L)&&items.filter(i=>i.layer===L).map(i=>mk(i,L)))}
   ${on('boats')&&boats.map(b=>{const [sx,sy]=S(0,0);return html`<${Marker} key=${b.id} layer="boats" x=${sx} y=${sy} sel=${act===b.id} label=${b.title+' (live)'} onClick=${()=>pickItem({...b,layer:'boats'})}/>`;})}
   ${info&&info.spot&&(()=>{const [sx,sy]=S(info.spot[0],info.spot[1]);return html`<g transform=${`translate(${sx},${sy})`} className="gm-spot"><circle r="9" fill="none" stroke="#fff" strokeWidth="2.5"/><circle r="2.5" fill="#fff"/><circle r="9" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1"/></g>`;})()}
   ${myPos&&(()=>{const [sx,sy]=S(myPos.lat,myPos.lon);const r=Math.max(8,(myPos.acc||10)/mpp);return html`<g transform=${`translate(${sx},${sy})`}><circle r=${Math.min(r,90)} className="gm-acc"/><circle r="9" fill="#2A78D6" stroke="#fff" strokeWidth="3"/></g>`;})()}
  </svg></div>
  <div className="gm-attr">${TILES[base].attr} · WGS 84</div>
  <div className="gm-scale"><i style=${{width:nice/mpp}}/><span>${nice>=1000?nice/1000+' km':nice+' m'}</span></div>
  ${myPos&&here!==undefined&&html`<div className=${'gm-here '+(here?here.kind:'out')}>${here?'You are in: '+here.name:'You are outside the Iweni LMMA'}</div>`}
  ${noTiles&&html`<div className="gm-note">Basemap tiles not available here. Showing the vector chart, which also works offline.</div>`}
  ${hint&&html`<div className="gm-hint">Hold Ctrl and scroll to zoom the map</div>`}
  ${!locked&&html`<div className="gm-ctl"><button aria-label="Zoom in" onClick=${()=>zoomAt(view.z+1,size.w/2,size.h/2)}>+</button><button aria-label="Zoom out" onClick=${()=>zoomAt(view.z-1,size.w/2,size.h/2)}>−</button><button aria-label="Fit to Iweni LMMA" title="Fit to Iweni LMMA" onClick=${refit}><${Icon} n="lmma" s=${16}/></button>${!compact&&html`<button aria-label="Turn map left" title="Turn left (Q)" onClick=${()=>setBearing(bref.current-15)}>⟲</button><button aria-label="Turn map right" title="Turn right (E)" onClick=${()=>setBearing(bref.current+15)}>⟳</button>`}${!compact&&html`<button aria-label=${full?'Exit full screen':'Full screen'} title=${full?'Exit full screen (Esc)':'Full screen (F)'} onClick=${toggleFull}>${full?'✕':'⛶'}</button>`}</div>`}
  ${!compact&&html`<button type="button" className=${'gm-north '+(cmp?'live':'')} aria-label=${'Compass. The map is turned '+Math.round(bearing)+' degrees. Tap to point north up. Press and hold to follow the phone compass.'} title="Tap: north up. Hold: follow phone compass" onClick=${()=>{setCmp(false);setBearing(0);}} onContextMenu=${e=>{e.preventDefault();startCompass();}} onDoubleClick=${e=>{e.stopPropagation();startCompass();}}><svg viewBox="-20 -20 40 40" width="40" height="40" style=${{transform:'rotate('+(-bearing)+'deg)'}}><circle r="18" fill="rgba(7,20,24,.65)" stroke="#fff" strokeOpacity=".7"/><path d="M0,-15 L4.5,0 L0,-3 L-4.5,0 Z" fill="#ff5a4d"/><path d="M0,15 L4.5,0 L0,3 L-4.5,0 Z" fill="#fff" fillOpacity=".55"/></svg><b>${Math.round(bearing)}°${cmp?' ⌖':''}</b></button>`}
  ${!compact&&html`<div className="gm-base" role="group" aria-label="Basemap">${Object.keys(TILES).map(k=>html`<button key=${k} className=${base===k?'on':''} aria-pressed=${base===k} onClick=${()=>setBase(k)}>${TILES[k].label}</button>`)}</div>`}
  ${!compact&&html`<div className=${'gm-leg'+(legOpen?' open':'')}><button className="gm-legt" aria-expanded=${legOpen} onClick=${()=>setLeg(!legOpen)}>Legend ${legOpen?'▾':'▸'}</button>${legOpen&&html`<ul>
    ${PLACES.length>0&&html`<li><svg width="16" height="14" viewBox="-9 -10 18 18"><path d="M0,-9 L8,6 L-8,6 Z" fill="#E3262E" stroke="#fff" strokeWidth="1.5"/></svg>Villages</li>`}
    ${zsh('ntz')&&html`<li><button onClick=${()=>{fitZone(zsh('ntz'));pickZone(zsh('ntz'));}}><i className="lg-reef"/>Reef habitat<small>No-take zone</small></button></li>`}
    ${zsh('gear')&&html`<li><button onClick=${()=>{fitZone(zsh('gear'));pickZone(zsh('gear'));}}><i className="lg-sea"/>Seagrass habitat<small>Gear restricted zone</small></button></li>`}
    ${zsh('lmma')&&html`<li><button onClick=${()=>{fitZone(zsh('lmma'));pickZone(zsh('lmma'));}}><i className="lg-lmma"/>Iweni LMMA boundary</button></li>`}
    ${showPts&&html`<li><i className="lg-pt v"/>Verified point</li><li><i className="lg-pt"/>Awaiting verification</li>`}
    <li className="gm-datum">Datum WGS 84 · degrees</li></ul>`}</div>`}
  ${!locked&&!compact&&html`<div className="gm-read" ref=${readout} aria-hidden="true"></div>`}
  ${cur&&!locked&&html`<div className="gm-info" role="dialog" aria-label=${cur.title}><button className="gm-x" aria-label="Close details" onClick=${()=>{setInfo(null);setAct(null);}}>×</button>
   <div className="gm-info-h"><b>${cur.title}</b>${cur.chip&&html`<span className="gm-chip">${cur.chip}</span>`}</div>
   <dl>${cur.rows.map((r,i)=>html`<div key=${i}><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`)}</dl>
   <div className="gm-acts">${cur.spot&&html`<button className="btn small" onClick=${()=>copy(decLL(cur.spot[0],cur.spot[1]))}>Copy coordinates</button>`}${cur.item&&cur.item.pt&&cur.item.pt.la!=null&&html`<button className="btn small" onClick=${()=>copy(decLL(cur.item.pt.la,cur.item.pt.lo))}>Copy coordinates</button>`}${(actions?actions(cur.item):[]).map((a,i)=>html`<button key=${i} className=${'btn small'+(a.primary?' primary':'')} onClick=${a.onClick}>${a.label}</button>`)}</div></div>`}`;
 }
 return html`<div ref=${box} className=${'geomap '+(full?'gm-full ':'')+(compact?'compact ':'')+(locked?'locked ':'')+(base==='sat'?'sat':'osm')} style=${height?{height}:null} tabIndex=${locked?-1:0} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onClick=${tap} onKeyDown=${key} onDoubleClick=${e=>{if(!locked&&vref.current&&!(e.target.closest&&e.target.closest('[data-f],.gm-info,.gm-leg'))){const [px,py]=rel(e);zoomAt(vref.current.z+1,px,py);}}}>${body}</div>`;
};
const OpsMap=GeoMap;
