const fs=require('fs');const { start, browser, login } = require('./harness');
(async()=>{const S=await start();const B=await browser();const a=await B.open(S.base,{viewport:{width:1440,height:900}});a.page.on('pageerror',e=>console.log('STACK',String(e.stack).split('\n').slice(0,4).join(' | ')));await login(a.page,S.base,'admin@test.org','Admin2026pw');
await a.page.goto(S.base+'/#import');await a.page.waitForSelector('button:has-text("Paste from Excel")');await a.page.click('button:has-text("Paste from Excel")');await a.page.waitForSelector('#imp-txt');
for(const [btn,f] of [['Daily Patrol Log','daily-patrol-log_pages-1-5-9'],['Entry Log','entry-log_page-11']]){await a.page.click('button:has-text("'+btn+'")');await a.page.fill('#imp-txt',fs.readFileSync('docs/import-samples/'+f+'.tsv','utf8'));await a.page.waitForTimeout(400);await a.page.click('#imp-go');await a.page.waitForTimeout(1200);}
for(const [h,tabs] of [['patrols',['Summary','Timeline','Forms']],['incidents',[]]]){
 await a.page.goto(S.base+'/#'+h);await a.page.waitForTimeout(1200);await a.page.click('table.tbl tbody tr');await a.page.waitForTimeout(800);
 console.log(h,'opened:',(await a.page.textContent('body')).length,'errs',JSON.stringify(a.errs).slice(0,300));
 for(const t of tabs.slice(1)){await a.page.click('button:has-text("'+t+'")').catch(()=>{});await a.page.waitForTimeout(600);console.log(' tab',t,'body',(await a.page.textContent('body')).length,JSON.stringify(a.errs).slice(0,300));}
 await a.page.screenshot({path:'../shots/imp-'+h+'.png'});
}
await a.page.goto(S.base+'/#patrols');await a.page.waitForTimeout(800);await a.page.click('table.tbl tbody tr');await a.page.click('#p-edit');await a.page.fill('#pe-a','Ras Kiamboni');await a.page.fill('#pe-ac','Edited by admin');await a.page.click('#pe-save');await a.page.waitForTimeout(1200);
const pd=(await S.call('GET','/docs',null,S.adminToken)).docs.patrols;console.log('EDIT saved',pd.some(p=>p.area==='Ras Kiamboni'&&p.action==='Edited by admin'));
const n0=pd.length;await a.page.click('#p-del');await a.page.click('#del-yes');await a.page.waitForTimeout(1200);console.log('DELETE patrol',n0,'->',(await S.call('GET','/docs',null,S.adminToken)).docs.patrols.length);
await a.page.goto(S.base+'/#incidents');await a.page.waitForTimeout(800);await a.page.click('table.tbl tbody tr');await a.page.click('#i-edit');await a.page.fill('#ie-ds','Edited description');await a.page.click('#ie-save');await a.page.waitForTimeout(1200);
const id=(await S.call('GET','/docs',null,S.adminToken)).docs.incidents;console.log('EDIT incident',id.some(i=>i.desc==='Edited description'));
await a.page.click('#i-del');await a.page.click('#del-yes');await a.page.waitForTimeout(1200);console.log('DELETE incident',id.length,'->',(await S.call('GET','/docs',null,S.adminToken)).docs.incidents.length,'errs',JSON.stringify(a.errs));
await B.br.close();S.server.close();})();
