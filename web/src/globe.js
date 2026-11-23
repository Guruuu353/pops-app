/* ============ Update 9: the Earth as a turning globe ============
   When the map is zoomed right out it becomes a sphere made from the same satellite imagery.
   Drag to turn it, tap a name to learn about it, and zoom back down to the Iweni LMMA. */
const GLOBE_CONT=[
 ['AFRICA',3,20,'Africa','About 30.4 million km², 54 countries and around 1.5 billion people. Home to the Sahara, the Nile, the Great Rift Valley and the Serengeti. Pate Island and the Iweni LMMA are on its east coast, in Kenya.'],
 ['ASIA',45,88,'Asia','The largest continent: about 44.6 million km² and roughly 4.7 billion people. Holds the Himalayas, Mount Everest and most of the world\'s population.'],
 ['EUROPE',52,15,'Europe','About 10.2 million km² and around 750 million people. Its long coastline meets the Atlantic, the Mediterranean and the Arctic.'],
 ['NORTH AMERICA',46,-102,'North America','About 24.7 million km² and around 600 million people, from Arctic Canada to the tropics of Central America and the Caribbean.'],
 ['SOUTH AMERICA',-15,-60,'South America','About 17.8 million km², 12 countries and around 440 million people. It holds the Amazon rainforest and the Andes.'],
 ['OCEANIA',-24,134,'Oceania','Australia, New Zealand and the Pacific islands: about 8.5 million km² of land. The Great Barrier Reef lies off north-east Australia.'],
 ['ANTARCTICA',-80,10,'Antarctica','About 14.2 million km² of ice with no permanent residents, only research stations. It holds most of the world\'s fresh water as ice.']];
const GLOBE_OCEAN=[
 ['PACIFIC OCEAN',5,-150,'Pacific Ocean','The largest and deepest ocean, about 165 million km².'],
 ['ATLANTIC OCEAN',12,-38,'Atlantic Ocean','About 106 million km². It separates the Americas from Europe and Africa.'],
 ['INDIAN OCEAN',-18,78,'Indian Ocean','About 70 million km². The Pate and Lamu coast, the Iweni LMMA and its reefs, seagrass and mangroves are on its western edge.'],
 ['SOUTHERN OCEAN',-62,110,'Southern Ocean','The cold ocean around Antarctica, about 20 million km².'],
 ['ARCTIC OCEAN',86,-20,'Arctic Ocean','The smallest ocean, about 14 million km², mostly covered by sea ice.']];
const GLOBE_PLACES=[
 ['Patte Conservation',-2.2,41.0,'Pate Island, Lamu, Kenya. Home of the Iweni LMMA, the locally managed marine area that Patte Conservation and the BMUs protect: reefs, seagrass, mangroves and fishing grounds.',true],
 ['Nairobi',-1.29,36.82,'Capital of Kenya.'],['Mombasa',-4.04,39.67,'Kenya\'s main port, on the coast south of Lamu.'],
 ['Zanzibar',-6.16,39.19,'Island archipelago in Tanzania, a neighbour across the western Indian Ocean.'],
 ['Mt Kilimanjaro',-3.07,37.35,'Africa\'s highest mountain, 5,895 m, in Tanzania.'],
 ['Great Rift Valley',0.5,36.0,'A long chain of rift valleys and lakes running through Kenya.'],
 ['Sahara',23,12,'The world\'s largest hot desert.'],['Cairo',30.04,31.24,'Capital of Egypt, on the Nile.'],['Cape Town',-33.92,18.42,'South Africa, near the southern tip of Africa.'],
 ['Madagascar',-19,46.7,'The world\'s fourth largest island, off Africa\'s east coast.'],['Amazon',-4,-62,'The largest tropical rainforest on Earth.'],
 ['Himalayas',28,85,'The highest mountain range, with Mount Everest at 8,849 m.'],['Great Barrier Reef',-18.3,147.7,'The largest coral reef system in the world.'],
 ['Coral Triangle',-3,125,'The centre of marine biodiversity on Earth.'],['Greenland',72,-40,'The world\'s largest island, mostly covered by an ice sheet.']];
const globeInfo={};[...GLOBE_CONT,...GLOBE_OCEAN].forEach(c=>{globeInfo[c[3]]={title:c[3],text:c[4],lat:c[1],lon:c[2]};});
const GLOBE_FACT=Object.assign({},globeInfo);
/* where the Sun is right now (so the day and night sides are real) */
const sunNow=()=>{const d=new Date();const doy=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/864e5);const h=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;const B=2*Math.PI*(doy-81)/364;const E=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B);const dec=-23.44*Math.cos(2*Math.PI/365*(doy+10))*Math.PI/180;const lon=-15*(h-12+E/60);return {dec,lon};};
const Globe=({lat0=-2,lon0=41,onExit,onLamu})=>{
 const wrap=useRef(null),cv=useRef(null),oc=useRef(null);
 const st=useRef({lat:Math.max(-80,Math.min(80,lat0)),lon:lon0,g:.8,vx:0,vy:0,drag:null,spin:true,night:true,names:true,tex:null,T:0,dirty:true,tw:null,moved:false,hits:[],ptr:new Map(),pd:0});
 const [size,setSize]=useState(0);const [err,setErr]=useState('');const [ready,setReady]=useState(false);const [info,setInfo]=useState(null);const [ui,setUi]=useState({spin:true,night:true,names:true});
 useEffect(()=>{try{wrap.current.focus({preventScroll:true});}catch(e){}},[]);
 useEffect(()=>{const el=wrap.current;const m=()=>{const r=el.getBoundingClientRect();setSize(Math.floor(Math.min(r.width,r.height)));};m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);ro.observe(el);}return()=>{if(ro)ro.disconnect();};},[]);
 useEffect(()=>{let dead=false;
  const load=z=>new Promise(res=>{const n=1<<z,T=n*256;const c0=document.createElement('canvas');c0.width=c0.height=T;const c=c0.getContext('2d',{willReadFrequently:true});let left=n*n,ok=0;
   for(let x=0;x<n;x++)for(let y=0;y<n;y++){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{c.drawImage(im,x*256,y*256);ok++;if(--left===0)res({ok,T,c});};im.onerror=()=>{if(--left===0)res({ok,T,c});};im.src=tileUrl('sat',z,x,y);}});
  const use=r=>{try{const d=r.c.getImageData(0,0,r.T,r.T);st.current.tex=new Uint32Array(d.data.buffer);st.current.T=r.T;st.current.dirty=true;setReady(true);return true;}catch(e){return false;}};
  load(2).then(r=>{if(dead)return;if(r.ok<4){setErr('The satellite imagery for the globe could not load. Check the connection and try again.');return;}if(!use(r)){setErr('This browser blocked the imagery needed for the globe.');return;}load(3).then(r3=>{if(!dead&&r3.ok>=40)use(r3);});});
  return()=>{dead=true;};},[]);
 const N=Math.max(200,Math.min(Math.round(size*Math.min(window.devicePixelRatio||1,1.5)),620));
 const kk=size?N/size:1;
 /* everything, the sphere and its names, is painted in one go so that nothing can lag behind the surface while turning or zooming */
 const draw=()=>{const s=st.current;const cvs=cv.current;if(!cvs||!s.tex||!N)return;if(!oc.current)oc.current=document.createElement('canvas');const o=oc.current;if(o.width!==N){o.width=o.height=N;cvs.width=cvs.height=N;}
  const octx=o.getContext('2d');const img=octx.createImageData(N,N);const px=new Uint32Array(img.data.buffer);const R=N*.42*s.g,cx=N/2,cy=N/2;
  const p0=s.lat*Math.PI/180,sp=Math.sin(p0),cp=Math.cos(p0),l0=s.lon;const T=s.T,tex=s.tex;const pole=0xFFD8D2CC,sea=0xFF452A0B;
  const sun=sunNow();const sx=Math.cos(sun.dec)*Math.cos(sun.lon*Math.PI/180),sy=Math.cos(sun.dec)*Math.sin(sun.lon*Math.PI/180),sz=Math.sin(sun.dec);const night=s.night;
  const y0=Math.max(0,Math.floor(cy-R)),y1=Math.min(N-1,Math.ceil(cy+R));
  for(let j=y0;j<=y1;j++){const yy=(cy-j)/R;const hw=Math.sqrt(Math.max(0,1-yy*yy));const xa=Math.max(0,Math.floor(cx-hw*R)),xb=Math.min(N-1,Math.ceil(cx+hw*R));
   for(let i=xa;i<=xb;i++){const xx=(i-cx)/R;const r2=xx*xx+yy*yy;if(r2>1)continue;const zz=Math.sqrt(1-r2);
    const sl=zz*sp+yy*cp;const lat=Math.asin(sl);const lonD=l0+Math.atan2(xx,zz*cp-yy*sp)*57.29578;
    let c;if(lat>1.4844||lat<-1.4844)c=pole;else{const lw=((lonD+540)%360)-180;const u=(lw+180)/360;const v=(1-Math.log(Math.tan(Math.PI/4+lat/2))/Math.PI)/2;const tx=Math.min(T-1,(u*T)|0),ty=Math.min(T-1,Math.max(0,(v*T)|0));c=tex[ty*T+tx];if((c>>>24)<200)c=sea;}
    let f=.7+.3*Math.pow(zz,.5),bl=0;
    if(night){const lr=lonD*.017453293;const cl=Math.sqrt(1-sl*sl);const d=cl*(Math.cos(lr)*sx+Math.sin(lr)*sy)+sl*sz;const t=d<-.12?0:d>.2?1:(d+.12)/.32;const k=t*t*(3-2*t);f*=.09+.91*k;bl=(1-k)*16;
     if(k>0&&k<1){f*=1+.12*Math.sin(k*3.1416);}}
    let rr=(c&255)*f,gg=((c>>8)&255)*f,bb=((c>>16)&255)*f+bl;
    px[j*N+i]=0xFF000000|((bb>255?255:bb|0)<<16)|((gg>255?255:gg|0)<<8)|(rr>255?255:rr|0);}}
  octx.putImageData(img,0,0);const ctx=cvs.getContext('2d');ctx.clearRect(0,0,N,N);
  /* a thin blue sky edge, not a white ring */
  const gl=ctx.createRadialGradient(cx,cy,R*.995,cx,cy,R*1.07);gl.addColorStop(0,'rgba(70,140,255,.30)');gl.addColorStop(1,'rgba(70,140,255,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(cx,cy,R*1.07,0,7);ctx.fill();
  ctx.drawImage(o,0,0);
  const proj=(la,lo)=>{const p=la*Math.PI/180,l=(lo-s.lon)*Math.PI/180;return {v:sp*Math.sin(p)+cp*Math.cos(p)*Math.cos(l),x:cx+R*Math.cos(p)*Math.sin(l),y:cy-R*(cp*Math.sin(p)-sp*Math.cos(p)*Math.cos(l))};};
  const lineAt=(la,dash,col,w)=>{ctx.save();ctx.setLineDash(dash.map(d=>d*kk));ctx.strokeStyle=col;ctx.lineWidth=w*kk;ctx.beginPath();let pen=false;for(let lo=-180;lo<=180;lo+=3){const q=proj(la,lo);if(q.v>.02){if(!pen){ctx.moveTo(q.x,q.y);pen=true;}else ctx.lineTo(q.x,q.y);}else pen=false;}ctx.stroke();ctx.restore();};
  lineAt(0,[6,5],'rgba(255,255,255,.5)',1.2);lineAt(23.44,[2,6],'rgba(255,255,255,.25)',1);lineAt(-23.44,[2,6],'rgba(255,255,255,.25)',1);
  s.hits=[];
  if(s.names){ctx.textAlign='center';ctx.lineJoin='round';
   const put=(txt,q,font,fill,ls,item,min)=>{if(q.v<min)return;const a=Math.min(1,(q.v-min)/.3);ctx.globalAlpha=a;ctx.font=font;try{ctx.letterSpacing=(ls*kk)+'px';}catch(e){}const w=ctx.measureText(txt).width;ctx.lineWidth=3*kk;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(txt,q.x,q.y);ctx.fillStyle=fill;ctx.fillText(txt,q.x,q.y);ctx.globalAlpha=1;try{ctx.letterSpacing='0px';}catch(e){}s.hits.push({x:q.x,y:q.y,w:w+12*kk,h:20*kk,item});};
   GLOBE_OCEAN.forEach(c=>put(c[0],proj(c[1],c[2]),`italic 600 ${13*kk}px sans-serif`,'#bfe6ff',3,{title:c[3],text:c[4],lat:c[1],lon:c[2]},.12));
   GLOBE_CONT.forEach(c=>put(c[0],proj(c[1],c[2]),`800 ${16*kk}px sans-serif`,'#fff',2,{title:c[3],text:c[4],lat:c[1],lon:c[2]},.12));
   ctx.textAlign='left';
   GLOBE_PLACES.forEach(c=>{const key=!!c[4];if(!key&&s.g<1.2)return;const q=proj(c[1],c[2]);if(q.v<.15)return;ctx.globalAlpha=Math.min(1,(q.v-.15)/.3);
    if(key){ctx.beginPath();ctx.arc(q.x,q.y,13*kk,0,7);ctx.fillStyle='rgba(255,84,112,.25)';ctx.fill();ctx.lineWidth=2*kk;ctx.strokeStyle='#ff5470';ctx.stroke();}
    ctx.beginPath();ctx.arc(q.x,q.y,(key?5:3.2)*kk,0,7);ctx.fillStyle=key?'#ff5470':'#ffd23f';ctx.fill();ctx.lineWidth=1.2*kk;ctx.strokeStyle='#000';ctx.stroke();
    ctx.font=`700 ${(key?13:11)*kk}px sans-serif`;const w=ctx.measureText(c[0]).width;ctx.lineWidth=3*kk;ctx.strokeStyle='rgba(0,0,0,.7)';ctx.strokeText(c[0],q.x+8*kk,q.y+4*kk);ctx.fillStyle=key?'#ffd23f':'#fff';ctx.fillText(c[0],q.x+8*kk,q.y+4*kk);ctx.globalAlpha=1;
    s.hits.push({x:q.x+w/2+4*kk,y:q.y,w:w+24*kk,h:22*kk,item:{title:c[0],text:c[3],lat:c[1],lon:c[2],key}});});}
  cvs.dataset.hits=String(s.hits.length);const kh=s.hits.find(h=>h.item.key);cvs.dataset.keyx=kh?String((kh.x-kh.w/2+14*kk)/kk):'';cvs.dataset.keyy=kh?String(kh.y/kk):'';cvs.dataset.sun=String(night);
  s.dirty=false;};
 useEffect(()=>{let raf,last=0;const loop=t=>{raf=requestAnimationFrame(loop);const s=st.current;if(t-last<28)return;last=t;let ch=false;
   if(s.tw){const k=Math.min(1,(t-s.tw.t0)/650),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;s.lat=s.tw.a0+(s.tw.a1-s.tw.a0)*e;const d=((s.tw.o1-s.tw.o0+540)%360)-180;s.lon=s.tw.o0+d*e;if(k>=1)s.tw=null;ch=true;}
   else if(!s.drag){if(Math.abs(s.vx)>.02||Math.abs(s.vy)>.02){s.lon-=s.vx;s.lat=Math.max(-85,Math.min(85,s.lat+s.vy));s.vx*=.92;s.vy*=.92;ch=true;}else if(s.spin){s.lon+=.1;ch=true;}}
   if(s.lon>180)s.lon-=360;if(s.lon<-180)s.lon+=360;
   if(ch||s.dirty)draw();};
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);},[N,ready]);
 useEffect(()=>{st.current.dirty=true;},[N,ready]);
 const set=(k,v)=>{st.current[k]=v;st.current.dirty=true;setUi(u=>({...u,[k]:v}));};
 const glide=(la,lo)=>{const s=st.current;set('spin',false);s.vx=s.vy=0;s.tw={t0:performance.now(),a0:s.lat,a1:Math.max(-75,Math.min(75,la)),o0:s.lon,o1:lo};};
 const zoomBy=f=>{const s=st.current;const g=s.g*f;if(g>2.6&&f>1){onExit(s.lat,s.lon,3);return;}s.g=Math.max(.3,Math.min(2.6,g));s.dirty=true;};
 const turn=(dl,da)=>{const s=st.current;set('spin',false);s.tw=null;s.lon+=dl;s.lat=Math.max(-85,Math.min(85,s.lat+da));s.dirty=true;};
 const rel=e=>{const r=cv.current.getBoundingClientRect();return [(e.clientX-r.left)*N/r.width,(e.clientY-r.top)*N/r.height];};
 const pdown=e=>{const s=st.current;s.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});s.drag={x:e.clientX,y:e.clientY};s.moved=false;s.vx=s.vy=0;s.tw=null;if(s.ptr.size===2){const [a,b]=[...s.ptr.values()];s.pd=Math.hypot(a.x-b.x,a.y-b.y);}};
 const pmove=e=>{const s=st.current;if(!s.ptr.has(e.pointerId))return;s.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(s.ptr.size>=2){const [a,b]=[...s.ptr.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(s.pd>0&&d>0){s.moved=true;set('spin',false);zoomBy(d/s.pd);}s.pd=d;return;}
  const dr=s.drag;if(!dr)return;const dx=e.clientX-dr.x,dy=e.clientY-dr.y;if(Math.abs(dx)+Math.abs(dy)>3){s.moved=true;set('spin',false);}if(!s.moved)return;
  const rcss=Math.max(40,N*.42*s.g/kk);const k=57.3/rcss;const dl=dx*k,da=dy*k;s.lon-=dl;s.lat=Math.max(-85,Math.min(85,s.lat+da));s.vx=dl*.6;s.vy=da*.6;dr.x=e.clientX;dr.y=e.clientY;s.dirty=true;};
 const pup=e=>{const s=st.current;const was=s.moved;s.ptr.delete(e.pointerId);if(s.ptr.size<2)s.pd=0;if(s.ptr.size===0){s.drag=null;
   if(!was&&e.type==='pointerup'){const [x,y]=rel(e);let best=null,bd=1e9;s.hits.forEach(h=>{if(Math.abs(x-h.x)<=h.w/2&&Math.abs(y-h.y)<=h.h){const d=Math.hypot(x-h.x,y-h.y);if(d<bd){bd=d;best=h;}}});if(best){setInfo(best.item);glide(best.item.lat,best.item.lon);}}}
  else if(s.ptr.size===1){const [p]=[...s.ptr.values()];s.drag={x:p.x,y:p.y};}};
 useEffect(()=>{const el=wrap.current;if(!el)return;const f=e=>{e.preventDefault();zoomBy(e.deltaY<0?1.12:1/1.12);};el.addEventListener('wheel',f,{passive:false});return()=>el.removeEventListener('wheel',f);},[]);
 const onKey=e=>{const s=st.current;const k={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];if(k){e.preventDefault();turn(k[0],k[1]);}else if(e.key==='+'||e.key==='=')zoomBy(1.2);else if(e.key==='-')zoomBy(1/1.2);else if(e.key==='Escape')onExit(s.lat,s.lon,3);};
 const s=st.current;
 return html`<div ref=${wrap} className="globe" tabIndex="0" role="application" aria-label="Rotating globe. Drag to turn the Earth, pinch or scroll to zoom, tap a name to learn about it, press Escape to return to the flat map." onPointerDown=${pdown} onPointerMove=${pmove} onPointerUp=${pup} onPointerLeave=${pup} onPointerCancel=${pup} onKeyDown=${onKey}>
  <canvas ref=${cv} className="globe-cv" width=${N} height=${N} style=${{width:size,height:size}}/>
  ${!ready&&!err&&html`<div className="globe-msg">Loading the Earth…</div>`}
  ${err&&html`<div className="globe-msg err">${err}<br/><button type="button" className="btn small" onClick=${()=>onExit(s.lat,s.lon,3)}>Back to the flat map</button></div>`}
  <div className="globe-top"><button type="button" className="gm-pill" onClick=${()=>onExit(s.lat,s.lon,3)}>◀ Flat map</button><button type="button" className="gm-pill" onClick=${()=>glide(-2.2,41.0)}>Go to Pate Island</button><button type="button" className=${'gm-pill'+(ui.spin?' on':'')} aria-pressed=${ui.spin} onClick=${()=>set('spin',!s.spin)}>${ui.spin?'Spinning':'Spin'}</button><button type="button" className=${'gm-pill'+(ui.night?' on':'')} aria-pressed=${ui.night} title="Show where it is night right now" onClick=${()=>set('night',!s.night)}>Day and night</button><button type="button" className=${'gm-pill'+(ui.names?' on':'')} aria-pressed=${ui.names} onClick=${()=>set('names',!s.names)}>Names</button></div>
  <div className="globe-zoom"><button type="button" aria-label="Zoom in" onClick=${()=>zoomBy(1.25)}>+</button><button type="button" aria-label="Zoom out" onClick=${()=>zoomBy(1/1.25)}>−</button></div>
  <div className="globe-pad" role="group" aria-label="Turn the globe"><button type="button" aria-label="Turn north" onClick=${()=>turn(0,12)}>▲</button><span><button type="button" aria-label="Turn west" onClick=${()=>turn(-12,0)}>◀</button><button type="button" aria-label="Reset the view" title="Reset" onClick=${()=>{const s=st.current;s.g=.8;glide(10,s.lon);}}>⟲</button><button type="button" aria-label="Turn east" onClick=${()=>turn(12,0)}>▶</button></span><button type="button" aria-label="Turn south" onClick=${()=>turn(0,-12)}>▼</button></div>
  ${info?html`<div className="globe-card"><button type="button" className="iconbtn" aria-label="Close" onClick=${()=>setInfo(null)}>×</button><h3>${info.title}</h3><p>${info.text}</p>${info.key?html`<button type="button" className="btn small primary" onClick=${onLamu}>Zoom into the Iweni LMMA</button>`:html`<button type="button" className="btn small" onClick=${()=>onExit(info.lat,info.lon,info.title&&/OCEAN/i.test(info.title)?3:5)}>Open the flat map here</button>`}</div>`:html`<div className="globe-hint">Drag to turn · pinch or scroll to zoom · tap a name to learn about it · the dark side is where it is night now</div>`}
 </div>`;
};
