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
const ZONE_SHAPES=[];
const applyZones=rows=>{ZONE_SHAPES.length=0;(rows||[]).forEach(z=>{const g=z.feature&&z.feature.geometry;if(!g)return;const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];polys.forEach((p,i)=>ZONE_SHAPES.push({id:z.id+'-'+i,kind:z.kind,name:z.name,km2:z.area_km2,stated:z.stated_km2,ll:p[0].map(c=>[c[1],c[0]])}));});};
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

const GeoMap=({layers=['zones','patrols'],items=[],tracks=[],sel,onSel,points=[],showPts,fit='lmma',locked,compact,height,myPos,myTrack,showLive=true,follow})=>{
 const box=useRef(null);const [size,setSize]=useState({w:0,h:0});const [view,setView]=useState(null);const vref=useRef(null);
 const [base,setBaseS]=useState(()=>{try{return localStorage.getItem('pops-base')||'sat';}catch(e){return 'sat';}});
 const setBase=b=>{setBaseS(b);setTl({ok:0,bad:0});try{localStorage.setItem('pops-base',b);}catch(e){}};
 const [tl,setTl]=useState({ok:0,bad:0});const [hint,setHint]=useState(false);
 const on=id=>layers.includes(id);
 const live=useLive(showLive&&on('boats'));
 const setV=v=>{vref.current=v;setView(v);};
 /* measure */
 useEffect(()=>{const el=box.current;if(!el)return;const m=()=>{const r=el.getBoundingClientRect();setSize(s=>(Math.abs(s.w-r.width)>1||Math.abs(s.h-r.height)>1)?{w:r.width,h:r.height}:s);};m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);ro.observe(el);}window.addEventListener('resize',m);return()=>{if(ro)ro.disconnect();window.removeEventListener('resize',m);};},[]);
 /* first fit */
 const trackLL=tr=>tr.ll||tr.pts.map(p=>unproj(p[0],p[1]));
 useEffect(()=>{if(!size.w||vref.current)return;let bb=LMMA_BB;if(fit==='tracks'&&tracks.length){bb=bbOf(tracks.flatMap(trackLL));}setV(fitView(bb,size.w,size.h,fit==='tracks'?28:40));},[size.w,size.h]);
 /* fly to selection */
 useEffect(()=>{if(!sel||!vref.current)return;const it=items.find(i=>i.id===sel)||(sel.startsWith&&sel.startsWith('pt-')&&points.find(p=>'pt-'+p.n===sel));if(!it)return;const [la,lo]=it.pt?[it.pt.la,it.pt.lo]:unproj(it.x,it.y);setV({lat:la,lon:lo,z:Math.max(vref.current.z,16)});},[sel]);
 useEffect(()=>{if(!follow||!myPos||!vref.current)return;const v=vref.current;setV({...v,lat:myPos.lat,lon:myPos.lon,z:v.z<15.5?16:v.z});},[follow,myPos&&myPos.lat,myPos&&myPos.lon]);
 const refit=()=>setV(fitView(LMMA_BB,size.w,size.h,40));
 const pan=(dx,dy)=>{const v=vref.current;if(!v)return;setV({...v,lon:lonOf(mx(v.lon,v.z)-dx,v.z),lat:latOf(my(v.lat,v.z)-dy,v.z)});};
 const zoomAt=(nz,px,py)=>{const v=vref.current;if(!v)return;nz=clamp(nz,ZMIN,ZMAX);const ox=px-size.w/2,oy=py-size.h/2;const lon=lonOf(mx(v.lon,v.z)+ox,v.z),lat=latOf(my(v.lat,v.z)+oy,v.z);setV({z:nz,lon:lonOf(mx(lon,nz)-ox,nz),lat:latOf(my(lat,nz)-oy,nz)});};
 /* gestures */
 const ptrs=useRef(new Map());
 const rel=e=>{const r=box.current.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
 const down=e=>{if(locked||e.button>0)return;ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});};
 const move=e=>{const p=ptrs.current.get(e.pointerId);if(!p)return;const nx=e.clientX,ny=e.clientY;
  if(ptrs.current.size===1){if(!p.moved&&Math.hypot(nx-p.sx,ny-p.sy)>5){p.moved=true;try{box.current.setPointerCapture(e.pointerId);}catch(x){}}if(p.moved)pan(nx-p.x,ny-p.y);}
  else if(ptrs.current.size===2){const other=[...ptrs.current.entries()].find(k=>k[0]!==e.pointerId)[1];const d0=Math.hypot(p.x-other.x,p.y-other.y),d1=Math.hypot(nx-other.x,ny-other.y);const r=box.current.getBoundingClientRect();const mxp=(nx+other.x)/2-r.left,myp=(ny+other.y)/2-r.top;p.moved=true;if(d0>0&&vref.current)zoomAt(vref.current.z+Math.log2(d1/d0),mxp,myp);pan((nx-p.x)/2,(ny-p.y)/2);}
  p.x=nx;p.y=ny;};
 const up=e=>{ptrs.current.delete(e.pointerId);};
 useEffect(()=>{const el=box.current;if(!el||locked)return;const w=e=>{if(!(e.ctrlKey||e.metaKey)){setHint(true);clearTimeout(w.t);w.t=setTimeout(()=>setHint(false),1400);return;}e.preventDefault();const r=el.getBoundingClientRect();zoomAt((vref.current?vref.current.z:12)-e.deltaY*(e.deltaMode?.05:.01),e.clientX-r.left,e.clientY-r.top);};el.addEventListener('wheel',w,{passive:false});return()=>el.removeEventListener('wheel',w);},[size.w,size.h,locked]);
 const key=e=>{if(locked||!vref.current)return;const s=80;if(e.key==='ArrowLeft')pan(s,0);else if(e.key==='ArrowRight')pan(-s,0);else if(e.key==='ArrowUp')pan(0,s);else if(e.key==='ArrowDown')pan(0,-s);else if(e.key==='+'||e.key==='=')zoomAt(vref.current.z+1,size.w/2,size.h/2);else if(e.key==='-')zoomAt(vref.current.z-1,size.w/2,size.h/2);else return;e.preventDefault();};
 /* draw */
 let body=null;
 if(view&&size.w){
  const z=view.z,cxw=mx(view.lon,z),cyw=my(view.lat,z);
  const S=(la,lo)=>[mx(lo,z)-cxw+size.w/2,my(la,z)-cyw+size.h/2];
  const P=ll=>ll.map(p=>S(p[0],p[1]).map(v=>v.toFixed(1)).join(',')).join(' ');
  const tz=Math.min(Math.round(z),TILES[base].max),sc=Math.pow(2,z-tz),n=Math.pow(2,tz),tcx=mx(view.lon,tz),tcy=my(view.lat,tz);
  const x0=Math.floor((tcx-size.w/2/sc)/256),x1=Math.floor((tcx+size.w/2/sc)/256),y0=Math.floor((tcy-size.h/2/sc)/256),y1=Math.floor((tcy+size.h/2/sc)/256);
  const tl2=[];for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){if(y<0||y>=n)continue;const wx=((x%n)+n)%n;tl2.push(html`<img key=${base+tz+'/'+x+'/'+y} className="gm-tile" alt="" draggable="false" src=${tileUrl(base,tz,wx,y)} style=${{left:(x*256-tcx)*sc+size.w/2,top:(y*256-tcy)*sc+size.h/2,width:256*sc+.6,height:256*sc+.6}} onLoad=${()=>setTl(t=>({...t,ok:t.ok+1}))} onError=${e=>{e.target.style.visibility='hidden';setTl(t=>({...t,bad:t.bad+1}));}}/>`);}
  /* graticule */
  const degPx=WORLD(z)/360;const stepUse=niceDeg.filter(d=>d*degPx>=110).pop()||niceDeg[niceDeg.length-1];
  const west=lonOf(cxw-size.w/2,z),east=lonOf(cxw+size.w/2,z),north=latOf(cyw-size.h/2,z),south=latOf(cyw+size.h/2,z);
  const gl=[];for(let l=Math.ceil(west/stepUse)*stepUse;l<=east;l+=stepUse){const x=S(0,l)[0];gl.push(html`<g key=${'lo'+l.toFixed(5)}><line x1=${x} x2=${x} y1="0" y2=${size.h} className="gm-grat"/><text x=${x+4} y=${size.h-8} className="gm-gl">${toDMS(l,'E','W').replace(/\.\d/,'')}</text></g>`);}
  for(let l=Math.ceil(south/stepUse)*stepUse;l<=north;l+=stepUse){const y=S(l,0)[1];gl.push(html`<g key=${'la'+l.toFixed(5)}><line x1="0" x2=${size.w} y1=${y} y2=${y} className="gm-grat"/><text x="6" y=${y-4} className="gm-gl">${toDMS(l,'N','S').replace(/\.\d/,'')}</text></g>`);}
  const ctr=ll=>{const s=ll.map(p=>S(p[0],p[1]));return [s.reduce((a,p)=>a+p[0],0)/s.length,s.reduce((a,p)=>a+p[1],0)/s.length];};
  const bp=[0,0],bla=0,blo=0;
  const boats=[];
  const tsel=t=>{const f=t.ll?proj(t.ll[0][0],t.ll[0][1]):t.pts[0];return {id:'t-'+t.id,layer:'patrols',title:'GPS track '+t.id,when:t.status,team:'See patrol record',desc:'Recorded GPS track for patrol '+t.id+'.',status:t.status,follow:'Open the patrol record for details',x:f[0],y:f[1]};};
  const mk=(it,layer)=>{const [la,lo]=unproj(it.x,it.y);const [sx,sy]=S(la,lo);if(sx<-30||sy<-30||sx>size.w+30||sy>size.h+30)return null;return html`<${Marker} key=${it.id} layer=${layer} x=${sx} y=${sy} sel=${sel===it.id} label=${it.title} onClick=${()=>onSel&&onSel(it)}/>`;};
  const mpp=40075016.686*Math.cos(view.lat*Math.PI/180)/WORLD(z);const nice=[10,20,50,100,200,500,1000,2000,5000,10000].filter(m=>m/mpp<=130).pop()||10;
  const noTiles=tl.ok===0&&tl.bad>=3;
  body=html`<div className="gm-tiles">${tl2}</div>
  <svg className="gm-svg" width=${size.w} height=${size.h} viewBox=${`0 0 ${size.w} ${size.h}`} role="img" aria-label="Iweni LMMA operations map">
   <defs><pattern id=${'ntz'+(compact?'c':'m')} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="var(--zone-ntz)" strokeWidth="3" opacity=".7"/></pattern></defs>
   ${gl}
   ${on('zones')&&html`<g>${ZONE_SHAPES.filter(z=>z.kind==='lmma').map(z=>html`<polygon key=${z.id} points=${P(z.ll)} className="gm-lmma" strokeLinejoin="round"/>`)}${ZONE_SHAPES.filter(z=>z.kind==='gear').map(z=>html`<polygon key=${z.id} points=${P(z.ll)} className="gm-gear" strokeLinejoin="round"/>`)}${ZONE_SHAPES.filter(z=>z.kind==='ntz').map(z=>html`<polygon key=${z.id} points=${P(z.ll)} fill=${`url(#ntz${compact?'c':'m'})`} className="gm-ntz" strokeLinejoin="round"/>`)}
    ${!compact&&ZONE_SHAPES.filter(z=>z.kind!=='lmma'&&z.kind!=='other').map(z=>html`<text key=${'t'+z.id} x=${ctr(z.ll)[0]-60} y=${ctr(z.ll)[1]+4} className=${'zlabel '+(z.kind==='ntz'?'ntz':'gear')}>${z.kind==='ntz'?'NO TAKE ZONE':'GEAR RESTRICTED ZONE'}</text>`)}
    ${LOOK.bmu&&LOOK.bmu.certificate_point&&(()=>{const c=LOOK.bmu.certificate_point;const p=S(c.lat,c.lon);return html`<g><circle cx=${p[0]} cy=${p[1]} r="7" className="gm-cert"/><text x=${p[0]+11} y=${p[1]+4} className=${'zlabel gear'}>BMU CERTIFICATE POINT</text></g>`;})()}</g>`}
   ${on('patrols')&&tracks.map(t=>html`<polyline key=${t.id} points=${P(trackLL(t))} fill="none" className=${'gm-track '+(t.status==='Active'?'act':t.status==='Completed'?'':'dash')} onClick=${()=>onSel&&onSel(tsel(t))}><title>${t.id} (${t.status})</title></polyline>`)}
   ${myTrack&&myTrack.length>1&&html`<polyline points=${P(myTrack)} fill="none" className="gm-mine"/>`}
   ${showPts&&points.map(p=>{const [sx,sy]=S(p.la,p.lo);return html`<g key=${p.n} transform=${`translate(${sx},${sy})`} onClick=${()=>onSel&&onSel({id:'pt-'+p.n,layer:'zones',pt:p,x:p.x,y:p.y})} style=${{cursor:'pointer'}}><circle r=${sel==='pt-'+p.n?15:11} fill=${p.ref?'var(--good)':'var(--ink)'} stroke="#fff" strokeWidth="3"/><text y="4" textAnchor="middle" className="ptn">${p.n}</text><title>Point ${p.n}: ${p.lat} / ${p.lon}${p.ref?' (verified reference)':''}</title></g>`;})}
   ${['restoration','activity','incidents','boats','rangers'].map(L=>on(L)&&items.filter(i=>i.layer===L).map(i=>mk(i,L)))}
   ${on('boats')&&boats.map(b=>{const [sx,sy]=S(bla,blo);return html`<${Marker} key=${b.id} layer="boats" x=${sx} y=${sy} sel=${sel===b.id} label=${b.title+' (live)'} onClick=${()=>onSel&&onSel({...b,layer:'boats'})}/>`;})}
   ${myPos&&(()=>{const [sx,sy]=S(myPos.lat,myPos.lon);const r=Math.max(8,(myPos.acc||10)/mpp);return html`<g transform=${`translate(${sx},${sy})`}><circle r=${Math.min(r,90)} className="gm-acc"/><circle r="9" fill="#2A78D6" stroke="#fff" strokeWidth="3"/></g>`;})()}
  </svg>
  <div className="gm-attr">${TILES[base].attr}</div>
  <div className="gm-scale"><i style=${{width:nice/mpp}}/><span>${nice>=1000?nice/1000+' km':nice+' m'}</span></div>
  ${noTiles&&html`<div className="gm-note">Basemap tiles not available here. Showing the vector chart, which also works offline.</div>`}
  ${hint&&html`<div className="gm-hint">Hold Ctrl and scroll to zoom the map</div>`}
  ${!locked&&html`<div className="gm-ctl"><button aria-label="Zoom in" onClick=${()=>zoomAt(view.z+1,size.w/2,size.h/2)}>+</button><button aria-label="Zoom out" onClick=${()=>zoomAt(view.z-1,size.w/2,size.h/2)}>−</button><button aria-label="Fit to Iweni LMMA" title="Fit to Iweni LMMA" onClick=${refit}><${Icon} n="lmma" s=${16}/></button></div>`}
  ${!compact&&html`<div className="gm-base" role="group" aria-label="Basemap">${Object.keys(TILES).map(k=>html`<button key=${k} className=${base===k?'on':''} aria-pressed=${base===k} onClick=${()=>setBase(k)}>${TILES[k].label}</button>`)}</div>`}`;
 }
 return html`<div ref=${box} className=${'geomap '+(compact?'compact ':'')+(locked?'locked ':'')+(base==='sat'?'sat':'osm')} style=${height?{height}:null} tabIndex=${locked?-1:0} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onKeyDown=${key} onDoubleClick=${e=>{if(!locked&&vref.current){const [px,py]=rel(e);zoomAt(vref.current.z+1,px,py);}}}>${body}</div>`;
};
const OpsMap=GeoMap;
