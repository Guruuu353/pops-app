const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();
const A=await B.open(S.base,{viewport:{width:500,height:760}});await login(A.page,S.base,'admin@test.org','Admin2026pw');
await A.page.goto(S.base+'/#import');await A.page.waitForSelector('#g-0-0');await A.page.fill('#g-0-0','19/5/2025');await A.page.fill('#g-0-1','4:00pm');await A.page.fill('#g-0-7','Ali Shee');await A.page.waitForTimeout(600);
const m=await A.page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,inp:document.querySelector('#g-0-0').getBoundingClientRect().width}));
console.log(m.sw<=m.iw+1?'PASS':'FAIL','no sideways scroll',JSON.stringify(m));
await A.page.evaluate(()=>document.querySelector('#g-0-0').scrollIntoView());await A.page.screenshot({path:'../shots/narrow-import.png'});
await B.br.close();S.server.close();})();
