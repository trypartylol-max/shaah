const control=(page,event,action,args=[],tag='*')=>page.locator(`${tag}[data-ui-${event}="${action}"][data-ui-${event}-args=${JSON.stringify(JSON.stringify(args))}]`);
async function social(page){
 if(await page.locator('#settings-toggle-ppl').count())await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.locator('.nav-btn[data-tab="social"]').click();
}
async function bulk(page){
 if(!await page.locator('#settings-toggle-ppl').count())await page.getByRole('button',{name:'Settings',exact:true}).click();
 const section=page.locator('#settings-toggle-ppl');if(await section.getAttribute('aria-expanded')==='false')await section.click();
 const details=page.locator('details.sf-scoring');if(!await details.evaluate(n=>n.open))await details.locator('summary').click();
}
async function directory(page){
 await social(page);const toggle=page.locator('.sf-people-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 if(await page.locator('#social-directory-toggle').getAttribute('aria-pressed')==='true')await page.locator('#social-directory-toggle').click();
}
async function edit(page,id){
 await directory(page);await control(page,'click','socialEdit',[id],'button').and(page.locator('#social-directory-results button')).click();
}
const combo=page=>page.locator('.sf-compact-combo');
async function category(page,id){await control(page,'click','socialCategoryToggle',[id,'2026-10-16'],'button').click();}
async function groups(page){await directory(page);await page.locator('#social-directory-toggle').click();}
module.exports={control,social,bulk,directory,edit,combo,category,groups};
