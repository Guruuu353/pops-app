const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();let bad=0;
for(const [w,h] of [[1200,700],[390,800]]){
const A=await B.open(S.base,{viewport:{width:w,height:h}});await login(A.page,S.base,'admin@test.org','Admin2026pw');
await A.page.route('**/api/**',r=>setTimeout(()=>r.continue(),2500));
await A.page.reload();await A.page.waitForSelector('.boot');await A.page.waitForTimeout(300);
const r=await A.page.evaluate(()=>{const b=document.querySelector('.boot img').getBoundingClientRect(),t=document.querySelector('.boot').getBoundingClientRect();return {cx:Math.round(b.x+b.width/2),iw:innerWidth,cy:Math.round(t.y+t.height/2),ih:innerHeight};});
const ok=Math.abs(r.cx-r.iw/2)<2;if(!ok)bad++;console.log(ok?'PASS':'FAIL','loading screen centred '+w,JSON.stringify(r));if(w===390)await A.page.screenshot({path:'../shots/boot.png'});}
await B.br.close();S.server.close();process.exit(bad?1:0);})().catch(e=>{console.error(e.message);process.exit(1);});
