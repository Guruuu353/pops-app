const sharp=require('sharp');const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();let bad=0;const ck=(n,v,x)=>{console.log(v?'PASS':'FAIL',n,v?'':x||'');if(!v)bad++;};
const png=await sharp({create:{width:200,height:200,channels:3,background:{r:20,g:90,b:200}}}).png().toBuffer();
const A=await B.open(S.base,{viewport:{width:1440,height:900}});await login(A.page,S.base,'admin@test.org','Admin2026pw');
await A.page.goto(S.base+'/#import');await A.page.waitForSelector('#g-0-0');
// row 1: blanks in challenges + observations, row 2 full
await A.page.fill('#g-0-0','19/5/2025');await A.page.fill('#g-0-1','4:00pm');await A.page.fill('#g-0-2','6:30pm');await A.page.fill('#g-0-3','Inside the closed area');await A.page.fill('#g-0-6','Warning');await A.page.fill('#g-0-7','Ali Shee');
await A.page.click('#imp-addrow');await A.page.fill('#g-1-0','20/5/2025');await A.page.fill('#g-1-1','5:00am');await A.page.fill('#g-1-2','7:00am');await A.page.fill('#g-1-3','Outside the closed area');await A.page.fill('#g-1-4','Quiet');await A.page.fill('#g-1-5','None');await A.page.fill('#g-1-6','Warning');await A.page.fill('#g-1-7','Ali Shee');
await A.page.waitForTimeout(500);
ck('blank cells keep the columns aligned and rows are ready',(await A.page.textContent('body')).includes('2 ready'),(await A.page.textContent('body')).match(/Check \([^)]*\)/));
const ins=await A.page.$$('input[id^="row-"]');await ins[1].setInputFiles({name:'ev.png',mimeType:'image/png',buffer:png});await A.page.waitForTimeout(1200);
await A.page.click('#imp-go');await A.page.waitForTimeout(1500);
const ps=(await S.call('GET','/docs',null,S.adminToken)).docs.patrols.filter(p=>p.imported).sort((a,b)=>a.iso<b.iso?-1:1);
ck('both rows imported, image only on the second',ps.length===2&&ps[0].scans.length===0&&ps[1].scans.length===1,JSON.stringify(ps.map(p=>p.scans&&p.scans.length)));
// paste with a short row, move into the table
await A.page.click('button:has-text("Paste from Excel")');await A.page.fill('#imp-txt','21/5/2025\t4:00pm\t6:00pm\tInside the closed area\tAli Shee');await A.page.click('#imp-togrid');await A.page.waitForSelector('#g-0-7');
ck('a short pasted row can be moved into the table',(await A.page.inputValue('#g-0-0'))==='21/5/2025');
ck('no browser errors',!A.errs.length,JSON.stringify(A.errs));
await B.br.close();S.server.close();process.exit(bad?1:0);})().catch(e=>{console.error(e);process.exit(1);});
