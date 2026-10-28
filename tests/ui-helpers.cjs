const control=(page,event,action,args=[],tag='*')=>page.locator(`${tag}[data-ui-${event}="${action}"][data-ui-${event}-args=${JSON.stringify(JSON.stringify(args))}]`);
async function openBulk(page){
  if(!await page.locator('#settings-toggle-ppl').count())await page.getByRole('button',{name:'Settings',exact:true}).click();
  const section=page.locator('#settings-toggle-ppl');
  if(await section.getAttribute('aria-expanded')==='false')await section.click();
  if(!await page.locator('details.sf-scoring').evaluate(e=>e.open))await page.locator('details.sf-scoring>summary').click();
}
async function socialPage(page){
  if(await page.locator('.settings-back').count())await page.locator('.settings-back').click();
  await page.locator('.nav-btn[data-tab="social"]').click();
}
async function editPerson(page,id){
  await socialPage(page);
  const directory=page.locator('.sf-people-toggle');
  if(await directory.getAttribute('aria-expanded')==='false')await directory.click();
  let button=control(page,'click','socialEdit',[id],'button').filter({visible:true});
  if(!await button.count()){
    const toggle=page.locator('.sf-people-toggle');
    if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  }
  await button.first().click();
}
async function showGroups(page){
  await socialPage(page);
  const toggle=page.locator('.sf-people-toggle');
  if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  if(await page.locator('#social-directory-toggle').getAttribute('aria-pressed')!=='true')await page.locator('#social-directory-toggle').click();
}
module.exports={control,openBulk,socialPage,editPerson,showGroups};
