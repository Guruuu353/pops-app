/* ============ GPS trail recorder (update 5) ============
   Records the real path of a patrol: every turn, curve, stop and restart, with a time on each point, so the distance and the drawn
   route stay right even with no network. Pure functions, no screen code.
   A trail point is [lat, lon, flag, seconds]. flag 0 = normal; 1 = the line is broken here and NOT counted (a pause or an impossible jump);
   2 = the signal or screen was lost and came back: the straight line over the gap IS counted and is marked as an estimate. */
const TRK={accMax:60,minMove:4,turnDeg:14,turnMinM:3,maxSilent:15,gapSec:40,maxMps:30,moveMps:0.8,stopSec:60,stopR:12,winSec:8,maxStore:3000};
const trkR6=x=>Math.round(x*1e6)/1e6;
const trkBrg=(a,b)=>{const r=Math.PI/180,y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);return (Math.atan2(y,x)/r+360)%360;};
const trkAng=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d;};
const trkDir=b=>['N','NE','E','SE','S','SW','W','NW'][Math.round(((b%360)+360)%360/45)%8];
/* distance of a saved trail: counted metres, and how much of it is a straight-line estimate over gaps */
const trkDist=pts=>{let km=0,est=0,gaps=0;for(let i=1;i<(pts||[]).length;i++){const f=pts[i][2];if(f===1)continue;const d=haversine(pts[i-1],pts[i])/1000;km+=d;if(f===2){est+=d;gaps++;}}return {km,est,gaps};};
const newRec=p=>{
 const pts=((p&&p.track)||[]).map(x=>x.slice());
 return {pts,L:pts.length?pts[pts.length-1]:null,km:+(p&&p.km)||0,kmEst:+(p&&p.kmEst)||0,moveSec:+(p&&p.moveSec)||0,stopSec:+(p&&p.stopSec)||0,maxMps:+(p&&p.maxMps)||0,
  stops:((p&&p.stops)||[]).map(s=>({...s})),lastFix:null,win:[],anchor:null,stop:null,rej:0,brk:false,reopen:!!(p&&p.track&&p.track.length),brg:null,cur:{spd:0,hdg:null,moving:false}};
};
/* call when the patrol was paused and is resumed: the first point after it starts a new, uncounted line */
const recBreak=S=>{S.brk=true;S.rej=0;S.win=[];S.anchor=null;if(S.stop){S.stops.push({...S.stop});S.stop=null;}};
const recStore=(S,ll,ts,flag)=>{const pt=[trkR6(ll[0]),trkR6(ll[1]),flag||0,ts];if(S.L&&haversine(S.L,ll)>=3)S.brg=trkBrg(S.L,ll);S.pts.push(pt);S.L=pt;};
/* one GPS fix. Returns {used, events:[{k,n}]}. ts is in milliseconds, spd in m/s (or null), hdg in degrees (or null). */
const recFix=(S,ll,acc,tsMs,spd,hdg)=>{
 const out={used:false,events:[]};
 if(acc&&acc>TRK.accMax)return out;
 const ts=Math.round(tsMs/1000);
 if(!S.L){recStore(S,ll,ts,0);S.lastFix={ll,ts};S.win=[{ll,ts}];S.reopen=false;out.used=true;return out;}
 if(!S.lastFix){ /* first fix after the app was reopened: bridge from the last saved point */
  const t0=S.L[3];const d=haversine(S.L,ll);
  if(S.brk||!t0||ts<=t0){recStore(S,ll,ts,1);}
  else{const v=d/Math.max(1,ts-t0);if(v<=TRK.maxMps*0.8&&d<60000){recStore(S,ll,ts,2);S.km+=d/1000;S.kmEst+=d/1000;out.events.push({k:'gap',n:'Back after '+Math.max(1,Math.round((ts-t0)/60))+' min without a position. About '+(d<1000?Math.round(d)+' m':(d/1000).toFixed(2)+' km')+' added in a straight line.'});}else recStore(S,ll,ts,1);}
  S.brk=false;S.reopen=false;S.lastFix={ll,ts};S.win=[{ll,ts}];out.used=true;return out;}
 const dtF=ts-S.lastFix.ts,dF=haversine(S.lastFix.ll,ll);
 if(dtF<=0&&dF<1)return out;
 if(S.brk){recStore(S,ll,ts,1);S.brk=false;S.lastFix={ll,ts};S.win=[{ll,ts}];S.anchor=null;out.used=true;return out;}
 /* a long silence (screen off, no GPS): count the straight line if it is believable, and say so */
 if(dtF>=TRK.gapSec&&dF<=Math.max(TRK.stopR*1.5,(acc||0)*1.5)){ /* the phone only reports when it moves: the boat has simply been standing */
  if(!S.anchor)S.anchor={ll:S.lastFix.ll,ts:S.lastFix.ts};S.stopSec+=dtF;
  if(ts-S.anchor.ts>=TRK.stopSec){if(!S.stop){S.stop={ll:[trkR6(S.anchor.ll[0]),trkR6(S.anchor.ll[1])],t0:S.anchor.ts,t1:ts};out.events.push({k:'halt',n:'Stopped'});}else S.stop.t1=ts;}
  S.lastFix={ll,ts};S.win=[{ll,ts}];out.used=true;return out;}
 if(dtF>=TRK.gapSec){const v=dF/dtF;
  if(v<=TRK.maxMps*0.8){recStore(S,ll,ts,2);S.km+=dF/1000;S.kmEst+=dF/1000;out.events.push({k:'gap',n:'Back after '+Math.max(1,Math.round(dtF/60))+' min without a position. About '+(dF<1000?Math.round(dF)+' m':(dF/1000).toFixed(2)+' km')+' added in a straight line.'});}
  else recStore(S,ll,ts,1);
  S.rej=0;S.lastFix={ll,ts};S.win=[{ll,ts}];S.anchor=null;if(S.stop){S.stops.push({...S.stop});S.stop=null;}out.used=true;return out;}
 /* an impossible jump: ignore up to two, then trust the new position as a new line */
 if(dtF>0&&dF/dtF>TRK.maxMps){S.rej++;if(S.rej<3)return out;S.rej=0;recStore(S,ll,ts,1);S.lastFix={ll,ts};S.win=[{ll,ts}];S.anchor=null;out.used=true;return out;}
 S.rej=0;
 S.win.push({ll,ts});while(S.win.length>2&&ts-S.win[0].ts>TRK.winSec)S.win.shift();
 const w0=S.win[0];const span=ts-w0.ts;const vWin=span>=2?haversine(w0.ll,ll)/span:null;
 const known=spd!=null&&isFinite(spd)&&spd>=0;
 const vEff=known?spd:(vWin==null?(dtF>0?dF/dtF:0):vWin);
 const slow=known?spd<TRK.moveMps:(vWin==null?true:vWin<TRK.moveMps*1.7);
 const R=Math.max(TRK.stopR,Math.min((acc||0)*1.5,40));
 S.cur={spd:vEff,hdg:(hdg!=null&&isFinite(hdg)&&vEff>0.8)?hdg:(dF>=3?trkBrg(S.lastFix.ll,ll):S.cur.hdg),moving:!slow};
 const step=Math.min(dtF,TRK.gapSec);
 if(slow&&(!S.anchor||haversine(S.anchor.ll,ll)<=R)){
  if(!S.anchor)S.anchor={ll,ts};
  S.stopSec+=step;
  if(ts-S.anchor.ts>=TRK.stopSec){if(!S.stop){S.stop={ll:[trkR6(S.anchor.ll[0]),trkR6(S.anchor.ll[1])],t0:S.anchor.ts,t1:ts};out.events.push({k:'halt',n:'Stopped'});}else S.stop.t1=ts;}
  S.lastFix={ll,ts};out.used=true;return out;
 }
 /* moving */
 if(S.stop){S.stops.push({...S.stop});out.events.push({k:'go',n:'Moving again after '+Math.max(1,Math.round((S.stop.t1-S.stop.t0)/60))+' min stopped'});S.stop=null;}
 S.anchor=null;S.moveSec+=step;
 if(vEff<TRK.maxMps&&vEff>S.maxMps)S.maxMps=vEff;
 const d=haversine(S.L,ll);const eff=Math.max(TRK.minMove,Math.min((acc||0)*0.5,15));
 const turn=S.brg!=null&&d>=Math.max(TRK.turnMinM,(acc||0)*0.8)&&trkAng(S.brg,trkBrg(S.L,ll))>=TRK.turnDeg;
 if(d>=eff||turn||(ts-S.L[3]>=TRK.maxSilent&&d>=2)){S.km+=d/1000;recStore(S,ll,ts,0);}
 S.lastFix={ll,ts};out.used=true;return out;
};
/* shrink a long trail for saving: keeps every corner and gap, drops points on straight runs (Douglas-Peucker, tolerance in metres) */
const trkSimplify=(pts,tol)=>{
 if(pts.length<=2)return pts.slice();
 const la0=pts[0][0]*Math.PI/180,kx=111320*Math.cos(la0),ky=110540;const X=pts.map(p=>[p[1]*kx,p[0]*ky]);
 const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;
 pts.forEach((p,i)=>{if(p[2]===1||p[2]===2){keep[i]=1;if(i>0)keep[i-1]=1;}});
 const stack=[[0,pts.length-1]];
 while(stack.length){const [a,b]=stack.pop();if(b-a<2)continue;let md=-1,mi=-1;const ax=X[a][0],ay=X[a][1],bx=X[b][0],by=X[b][1],dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
  for(let i=a+1;i<b;i++){if(keep[i]){/* a kept point splits the range */ stack.push([a,i]);stack.push([i,b]);md=-2;break;}
   let t=L2?((X[i][0]-ax)*dx+(X[i][1]-ay)*dy)/L2:0;t=Math.max(0,Math.min(1,t));const px=ax+t*dx-X[i][0],py=ay+t*dy-X[i][1];const dd=Math.sqrt(px*px+py*py);if(dd>md){md=dd;mi=i;}}
  if(md===-2)continue;if(md>tol){keep[mi]=1;stack.push([a,mi]);stack.push([mi,b]);}}
 return pts.filter((_,i)=>keep[i]);
};
const trkPack=pts=>{if(pts.length<=TRK.maxStore)return pts;let tol=1.5,o=pts;while(o.length>TRK.maxStore&&tol<200){o=trkSimplify(pts,tol);tol*=2;}return o;};
/* what the patrol record stores. Called often while recording, and once at the end. */
const recSummary=S=>{const mv=S.moveSec;const stops=S.stops.concat(S.stop?[S.stop]:[]);
 return {track:trkPack(S.pts),km:Math.round(S.km*100)/100,kmEst:Math.round(S.kmEst*100)/100,moveSec:Math.round(S.moveSec),stopSec:Math.round(S.stopSec),maxKmh:Math.round(S.maxMps*3.6*10)/10,avgKmh:mv>30?Math.round((S.km-S.kmEst)/(mv/3600)*10)/10:0,stops:stops.slice(-60)};};
/* the distance of a patrol, also for records saved before this update: use the larger of the saved figure and the one worked out from the trail */
const patrolKm=p=>{const a=+p.km||0;if(!p.track||p.track.length<2)return a;const t=trkDist(p.track).km;return Math.round(Math.max(a,t)*100)/100;};
