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
const Globe=({lat0=-2,lon0=41,onExit,onLamu})=>{
 const wrap=useRef(null),cv=useRef(null),oc=useRef(null);
 const st=useRef({lat:Math.max(-80,Math.min(80,lat0)),lon:lon0,g:1,vx:0,vy:0,drag:null,spin:true,tex:null,T:0,dirty:true,tw:null,moved:false});
 const [size,setSize]=useState(0);const [err,setErr]=useState('');const [ready,setReady]=useState(false);const [info,setInfo]=useState(null);const [spin,setSpin]=useState(true);const [,tick]=useState(0);
 useEffect(()=>{try{wrap.current.focus({preventScroll:true});}catch(e){}},[]);
 useEffect(()=>{const el=wrap.current;const m=()=>{const r=el.getBoundingClientRect();setSize(Math.floor(Math.min(r.width,r.height)));};m();let ro;if(window.ResizeObserver){ro=new ResizeObserver(m);ro.observe(el);}return()=>{if(ro)ro.disconnect();};},[]);
 /* imagery: a coarse picture first, a sharper one after it arrives */
 useEffect(()=>{let dead=false;
  const load=z=>new Promise(res=>{const n=1<<z,T=n*256;const c0=document.createElement('canvas');c0.width=c0.height=T;const c=c0.getContext('2d',{willReadFrequently:true});let left=n*n,ok=0;
   for(let x=0;x<n;x++)for(let y=0;y<n;y++){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{c.drawImage(im,x*256,y*256);ok++;if(--left===0)res({c0,ok,T,c});};im.onerror=()=>{if(--left===0)res({c0,ok,T,c});};im.src=tileUrl('sat',z,x,y);}});
  const use=r=>{try{const d=r.c.getImageData(0,0,r.T,r.T);st.current.tex=new Uint32Array(d.data.buffer);st.current.T=r.T;st.current.dirty=true;setReady(true);return true;}catch(e){return false;}};
  load(2).then(r=>{if(dead)return;if(r.ok<4){setErr('The satellite imagery for the globe could not load. Check the connection and try again.');return;}if(!use(r)){setErr('This browser blocked the imagery needed for the globe.');return;}load(3).then(r3=>{if(!dead&&r3.ok>=40)use(r3);});});
  return()=>{dead=true;};},[]);
 const N=Math.max(200,Math.min(Math.round(size*Math.min(window.devicePixelRatio||1,1.5)),620));
 const Rc=()=>N*.42*st.current.g;
 const draw=()=>{const s=st.current;const cvs=cv.current;if(!cvs||!s.tex||!N)return;if(!oc.current)oc.current=document.createElement('canvas');const o=oc.current;if(o.width!==N){o.width=o.height=N;cvs.width=cvs.height=N;}
  const octx=o.getContext('2d');const img=octx.createImageData(N,N);const px=new Uint32Array(img.data.buffer);const R=Rc(),cx=N/2,cy=N/2;
  const p0=s.lat*Math.PI/180,sp=Math.sin(p0),cp=Math.cos(p0),l0=s.lon;const T=s.T,tex=s.tex;const pole=0xFFF0EAE4;const sea=0xFF452A0B;
  const y0=Math.max(0,Math.floor(cy-R)),y1=Math.min(N-1,Math.ceil(cy+R));
  for(let j=y0;j<=y1;j++){const yy=(cy-j)/R;const hw=Math.sqrt(Math.max(0,1-yy*yy));const xa=Math.max(0,Math.floor(cx-hw*R)),xb=Math.min(N-1,Math.ceil(cx+hw*R));
   for(let i=xa;i<=xb;i++){const xx=(i-cx)/R;const r2=xx*xx+yy*yy;if(r2>1)continue;const zz=Math.sqrt(1-r2);
    const sl=zz*sp+yy*cp;const lat=Math.asin(sl);let lon=l0+Math.atan2(xx,zz*cp-yy*sp)*57.29578;
    let c;if(lat>1.4844||lat<-1.4844)c=pole;else{lon=((lon+540)%360)-180;const u=(lon+180)/360;const v=(1-Math.log(Math.tan(Math.PI/4+lat/2))/Math.PI)/2;const tx=Math.min(T-1,(u*T)|0),ty=Math.min(T-1,Math.max(0,(v*T)|0));c=tex[ty*T+tx];if((c>>>24)<200)c=sea;}
    const f=.5+.5*Math.pow(zz,.55);const rr=(c&255)*f,gg=((c>>8)&255)*f,bb=((c>>16)&255)*f;px[j*N+i]=0xFF000000|((bb<1?0:bb>255?255:bb|0)<<16)|((gg|0)<<8)|(rr|0);}}
  octx.putImageData(img,0,0);const ctx=cvs.getContext('2d');ctx.clearRect(0,0,N,N);
  const gl=ctx.createRadialGradient(cx,cy,R*.98,cx,cy,R*1.16);gl.addColorStop(0,'rgba(110,190,255,.55)');gl.addColorStop(1,'rgba(110,190,255,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(cx,cy,R*1.16,0,7);ctx.fill();
  ctx.drawImage(o,0,0);s.dirty=false;};
 /* animation loop: spin, inertia, glide, redraw only when something changed */
 useEffect(()=>{let raf,last=0;const loop=t=>{raf=requestAnimationFrame(loop);const s=st.current;if(t-last<30)return;last=t;let ch=false;
   if(s.tw){const k=Math.min(1,(t-s.tw.t0)/650),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;s.lat=s.tw.a0+(s.tw.a1-s.tw.a0)*e;let d=((s.tw.o1-s.tw.o0+540)%360)-180;s.lon=s.tw.o0+d*e;if(k>=1)s.tw=null;ch=true;}
   else if(!s.drag){if(Math.abs(s.vx)>.02||Math.abs(s.vy)>.02){s.lon-=s.vx;s.lat=Math.max(-85,Math.min(85,s.lat+s.vy));s.vx*=.93;s.vy*=.93;ch=true;}else if(s.spin){s.lon+=.12;ch=true;}}
   if(s.lon>180)s.lon-=360;if(s.lon<-180)s.lon+=360;
   if(ch||s.dirty){draw();tick(n=>n+1);}};
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);},[N,ready]);
 useEffect(()=>{st.current.dirty=true;},[N,ready]);
 const glide=(la,lo)=>{const s=st.current;s.spin=false;setSpin(false);s.vx=s.vy=0;s.tw={t0:performance.now(),a0:s.lat,a1:Math.max(-75,Math.min(75,la)),o0:s.lon,o1:lo};};
 const pdown=e=>{const s=st.current;s.drag={x:e.clientX,y:e.clientY,t:performance.now()};s.moved=false;s.vx=s.vy=0;s.tw=null;};
 const pmove=e=>{const s=st.current;const d=s.drag;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>3){s.moved=true;s.spin=false;setSpin(false);}if(!s.moved)return;const rcss=Math.max(60,Rc()*(size/N));const k=57.3/rcss;const dl=dx*k,da=dy*k;s.lon-=dl;s.lat=Math.max(-85,Math.min(85,s.lat+da));s.vx=dl*.6;s.vy=da*.6;d.x=e.clientX;d.y=e.clientY;s.dirty=true;};
 const pup=()=>{st.current.drag=null;};
 const zoom=f=>{const s=st.current;const g=s.g*f;if(g>2.6&&f>1){onExit(s.lat,s.lon,3);return;}s.g=Math.max(.6,g);s.dirty=true;};
 const onWheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15);};
 useEffect(()=>{const el=wrap.current;if(!el)return;const f=e=>e.preventDefault();el.addEventListener('wheel',f,{passive:false});return()=>el.removeEventListener('wheel',f);},[]);
 const onKey=e=>{const s=st.current;const k={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];if(k){e.preventDefault();s.spin=false;setSpin(false);s.lon+=k[0];s.lat=Math.max(-85,Math.min(85,s.lat+k[1]));s.dirty=true;}else if(e.key==='+'||e.key==='=')zoom(1.2);else if(e.key==='-')zoom(1/1.2);else if(e.key==='Escape')onExit(s.lat,s.lon,3);};
 /* projection for the labels */
 const s=st.current;const R=Rc(),cx=N/2,cy=N/2,p0=s.lat*Math.PI/180,sp=Math.sin(p0),cp=Math.cos(p0),kk=size?N/size:1;
 const proj=(la,lo)=>{const p=la*Math.PI/180,l=(lo-s.lon)*Math.PI/180;const c=sp*Math.sin(p)+cp*Math.cos(p)*Math.cos(l);return {v:c,x:cx+R*Math.cos(p)*Math.sin(l),y:cy-R*(cp*Math.sin(p)-sp*Math.cos(p)*Math.cos(l))};};
 const line=la=>{const segs=[];let cur=[];for(let lo=-180;lo<=180;lo+=4){const q=proj(la,lo);if(q.v>.02)cur.push(q.x.toFixed(1)+','+q.y.toFixed(1));else if(cur.length){segs.push(cur);cur=[];}}if(cur.length)segs.push(cur);return segs;};
 const pick=it=>{if(s.moved)return;setInfo(it);glide(it.lat,it.lon);};
 const lbl=(arr,cls,sz)=>arr.map((c,i)=>{const q=proj(c[1],c[2]);if(q.v<.12)return null;const a=Math.min(1,(q.v-.12)/.3);return html`<text key=${cls+i} className=${'gl-t '+cls} x=${q.x.toFixed(1)} y=${q.y.toFixed(1)} fontSize=${sz*kk} opacity=${a} textAnchor="middle" onClick=${()=>pick({title:c[3],text:c[4],lat:c[1],lon:c[2]})}>${c[0]}</text>`;});
 const showPl=s.g>=1.25;
 return html`<div ref=${wrap} className="globe" tabIndex="0" role="application" aria-label="Rotating globe. Drag to turn the Earth, tap a name to learn about it, press Escape to return to the flat map." onPointerDown=${pdown} onPointerMove=${pmove} onPointerUp=${pup} onPointerLeave=${pup} onPointerCancel=${pup} onKeyDown=${onKey}>
  <canvas ref=${cv} className="globe-cv" width=${N} height=${N} style=${{width:size,height:size}}/>
  ${ready&&html`<svg className="globe-ov" width=${size} height=${size} viewBox=${`0 0 ${N} ${N}`} aria-hidden="false">
   ${[[0,'Equator'],[23.44,'Tropic of Cancer'],[-23.44,'Tropic of Capricorn']].map(([la,nm])=>line(la).map((sg,i)=>html`<polyline key=${nm+i} points=${sg.join(' ')} fill="none" className=${la===0?'gl-eq':'gl-tr'}/>`))}
   ${lbl(GLOBE_OCEAN,'oc',13)}${lbl(GLOBE_CONT,'ct',16)}
   ${GLOBE_PLACES.map((c,i)=>{if(!c[4]&&!showPl)return null;const q=proj(c[1],c[2]);if(q.v<.15)return null;const key=!!c[4];return html`<g key=${'pl'+i} className=${'gl-pl'+(key?' key':'')} transform=${`translate(${q.x.toFixed(1)},${q.y.toFixed(1)})`} onClick=${()=>pick({title:c[0],text:c[3],lat:c[1],lon:c[2],key})}>${key&&html`<circle r=${14*kk} className="gl-pulse"/>`}<circle r=${(key?5:3.2)*kk} className="gl-dot"/><text x=${8*kk} y=${4*kk} fontSize=${(key?13:11)*kk}>${c[0]}</text></g>`;})}
  </svg>`}
  ${!ready&&!err&&html`<div className="globe-msg">Loading the Earth…</div>`}
  ${err&&html`<div className="globe-msg err">${err}<br/><button type="button" className="btn small" onClick=${()=>onExit(s.lat,s.lon,3)}>Back to the flat map</button></div>`}
  <div className="globe-top"><button type="button" className="gm-pill" onClick=${()=>onExit(s.lat,s.lon,3)}>◀ Flat map</button><button type="button" className="gm-pill" onClick=${()=>glide(-2.2,41.0)}>Go to Pate Island</button><button type="button" className=${'gm-pill'+(spin?' on':'')} aria-pressed=${spin} onClick=${()=>{s.spin=!s.spin;setSpin(s.spin);}}>${spin?'Spinning':'Spin'}</button></div>
  <div className="globe-zoom"><button type="button" aria-label="Zoom in" onClick=${()=>zoom(1.3)}>+</button><button type="button" aria-label="Zoom out" onClick=${()=>zoom(1/1.3)}>−</button></div>
  ${info?html`<div className="globe-card"><button type="button" className="iconbtn" aria-label="Close" onClick=${()=>setInfo(null)}>×</button><h3>${info.title}</h3><p>${info.text}</p>${info.key?html`<button type="button" className="btn small primary" onClick=${onLamu}>Zoom into the Iweni LMMA</button>`:html`<button type="button" className="btn small" onClick=${()=>onExit(info.lat,info.lon,info.title&&/OCEAN/i.test(info.title)?3:5)}>Open the flat map here</button>`}</div>`:html`<div className="globe-hint">Drag to turn the Earth · tap a name to learn about it · + to zoom down to the map</div>`}
 </div>`;
};
