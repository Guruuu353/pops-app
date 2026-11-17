const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();let bad=0;
for(const w of [1366,900,500,360]){
const A=await B.open(S.base,{viewport:{width:w,height:760}});await login(A.page,S.base,'admin@test.org','Admin2026pw');
await A.page.goto(S.base+'/#import');await A.page.waitForSelector('#g-0-0');await A.page.fill('#g-0-0','19/5/2025');await A.page.waitForTimeout(500);
const m=await A.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));const ok=m.sw<=m.iw+1;if(!ok)bad++;console.log(ok?'PASS':'FAIL','page width '+w,JSON.stringify(m));
if(w===1366)await A.page.screenshot({path:'../shots/wide-import.png'});await A.ctx&&A.ctx.close&&A.ctx.close();}
await B.br.close();S.server.close();process.exit(bad?1:0);})();
