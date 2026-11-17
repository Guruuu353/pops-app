const sharp=require('sharp');const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();let bad=0;const ck=(n,v,x)=>{console.log(v?'PASS':'FAIL',n,v?'':x||'');if(!v)bad++;};
const png=await sharp({create:{width:900,height:1200,channels:3,background:{r:230,g:220,b:190}}}).png().toBuffer();
// server: upload, fetch, signature, inline photos moved to files
const up=await S.call('POST','/files',{name:'page1.png',mime:'image/png',data:'data:image/png;base64,'+png.toString('base64')},S.adminToken);
ck('upload returns a short address',/^\/api\/files\/[a-f0-9]{24}\?k=/.test(up.url),JSON.stringify(up));
const g=await fetch(S.base+up.url);ck('file is served with image type',g.status===200&&g.headers.get('content-type')==='image/png'&&(await g.arrayBuffer()).byteLength===png.length);
const g2=await fetch(S.base+up.url.replace(/k=.*/,'k=wrong'));ck('wrong signature is refused',g2.status===404);
const bad1=await S.call('POST','/files',{name:'x.exe',mime:'application/x-msdownload',data:'AAAA'},S.adminToken);ck('non-image types are refused',!!bad1.error);
await S.call('PUT','/docs/patrols/PT-PH',{data:{id:'PT-PH',iso:'2026-11-17',date:'17 Nov 2026',leader:'User ranger',rangers:['User ranger'],status:'Completed',photos:[{url:'data:image/png;base64,'+png.toString('base64'),at:'10:00'}]}},S.adminToken);
const pd=(await S.call('GET','/docs',null,S.adminToken)).docs.patrols.find(p=>p.id==='PT-PH');ck('photo inside a patrol is moved out of the database',/^\/api\/files\//.test(pd.photos[0].url),JSON.stringify(pd.photos).slice(0,120));
// UI: import with a scan
const A=await B.open(S.base,{viewport:{width:1440,height:500}});await login(A.page,S.base,'admin@test.org','Admin2026pw');
await A.page.goto(S.base+'/#import');await A.page.waitForSelector('#imp-txt');
await A.page.setInputFiles('#imp-scan',{name:'daily-p1.png',mimeType:'image/png',buffer:png});await A.page.waitForSelector('.scanitem img');
await A.page.fill('#imp-txt','19/5/2025\t4:00pm\t6:30pm\tInside the closed area\tNo markers\t-\tWarning\tAli Shee');await A.page.click('#imp-go');await A.page.waitForTimeout(1500);
const ip=(await S.call('GET','/docs',null,S.adminToken)).docs.patrols.find(p=>p.imported);ck('imported patrol carries the scan stored on the server',ip&&ip.scans&&ip.scans.length===1&&/^\/api\/files\//.test(ip.scans[0].url),JSON.stringify(ip&&ip.scans));
// footer sits at the bottom of a tall window on a short page
await A.page.setViewportSize({width:1440,height:1100});await A.page.goto(S.base+'/#audit');await A.page.waitForTimeout(800);
const fb=await A.page.evaluate(()=>{const f=document.querySelector('footer.foot').getBoundingClientRect();return [Math.round(f.bottom),innerHeight];});ck('footer is at the bottom of the window',fb[0]>=fb[1]-30&&fb[0]<=fb[1]+4,JSON.stringify(fb));
// alerts: an active patrol silent for 40 minutes
const old=new Date(Date.now()-40*60000).toISOString();const today=new Date().toISOString().slice(0,10);
await S.call('PUT','/docs/patrols/PT-SILENT',{data:{id:'PT-SILENT',iso:today,date:today,leader:'User ranger',rangers:['User ranger'],status:'Active',start:'05:00',seen:old,track:[[-2.213,41.005]],events:[]}},S.adminToken);
await A.page.goto(S.base+'/#patrols');await A.page.waitForTimeout(1200);await A.page.evaluate(()=>window.POPS_PULL&&window.POPS_PULL());await A.page.waitForTimeout(1200);
const tx=await A.page.textContent('body');ck('office is warned that a patrol went silent',tx.includes('No update from User ranger'),tx.slice(0,100));
// ranger: returns to the open patrol on opening, cannot start a second
const R=await B.open(S.base,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await login(R.page,S.base,'ranger@test.org','Start2026','Ranger2026pw');await R.page.waitForTimeout(1500);
ck('ranger is taken straight back to the running patrol',(await R.page.textContent('body')).includes('Fisher check')&&(await R.page.textContent('body')).includes('Pause'));
await R.page.evaluate(()=>{});
ck('no browser errors',![A,R].some(x=>x.errs.length),JSON.stringify([A.errs,R.errs]));
await B.br.close();S.server.close();process.exit(bad?1:0);})().catch(e=>{console.error(e);process.exit(1);});
