const fs=require('fs');const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();const a=await B.open(S.base);await login(a.page,S.base,'admin@test.org','Admin2026pw');
await a.page.goto(S.base+'/#import');await a.page.waitForSelector('button:has-text("Paste from Excel")');await a.page.click('button:has-text("Paste from Excel")');await a.page.waitForSelector('#imp-txt');
for(const [btn,f] of [['Daily Patrol Log','daily-patrol-log_pages-1-5-9'],['Entry Log','entry-log_page-11']]){
 await a.page.click('button:has-text("'+btn+'")');await a.page.fill('#imp-txt',fs.readFileSync('docs/import-samples/'+f+'.tsv','utf8'));await a.page.waitForTimeout(500);
 console.log(btn,await a.page.textContent('.card:has(table) h3, .card:has(table) .card-t').catch(()=>''));
 const rows=await a.page.$$eval('table.tbl tbody tr',t=>t.map(r=>r.innerText.replace(/\s+/g,' ').slice(0,150)));console.log(rows.join('\n'));
}
await B.br.close();S.server.close();})();
