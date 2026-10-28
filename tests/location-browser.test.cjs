const {test}=require('node:test');
const assert=require('node:assert/strict');
const {openApp}=require('./browser-helpers.cjs');
const {locationFixture}=require('./location-fixtures.cjs');
const {control,openBulk,editPerson,showGroups,socialPage}=require('./ui-helpers.cjs');
const box=(page,id)=>control(page,'change','bulkPeopleToggle',[id],'input');
const history=page=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(_state).filter(([key])=>key!==todayKey()))));

for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]])test(`${device}: bulk and individual memberships persist without changing history`,async t=>{
  const page=await openApp(t,locationFixture(),viewport),before=await history(page);
  const score=await page.evaluate(()=>calcScore('2026-09-16'));
  await openBulk(page);
  await box(page,'pold01').check();await box(page,'pold02').check();
  assert.equal(await page.locator('details.sf-scoring').evaluate(e=>e.open),true,'Selecting a contact keeps bulk controls open');
  await page.getByRole('button',{name:'+ Panamá',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>personById('pold01').locations),['pa']);
  assert.deepEqual(await page.evaluate(()=>personById('pold02').locations),['il','pa']);
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]:checked').count(),0);
  await editPerson(page,'pold01');
  await control(page,'change','socialDraftLocation',['il'],'input').check();
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await editPerson(page,'pold02');
  await control(page,'change','socialDraftLocation',['il'],'input').uncheck();
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await openBulk(page);await box(page,'pold01').check();
  await page.getByRole('button',{name:'− Panamá',exact:true}).click();
  await page.waitForFunction(()=>!_cfgDraft);
  await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.deepEqual(await page.evaluate(()=>personById('pold01').locations),['il']);
  assert.deepEqual(await page.evaluate(()=>personById('pold02').locations),['pa']);
  assert.equal(await history(page),before);
  assert.deepEqual(await page.evaluate(()=>calcScore('2026-09-16')),score);
});

test('bulk search retains typing focus, clears selection and applies only visible contacts',async t=>{
  const page=await openApp(t,locationFixture());await openBulk(page);
  await box(page,'pold01').check();
  const search=page.getByRole('textbox',{name:'Search contacts for bulk assignment'});
  await search.pressSequentially('lUiS');
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(),1);
  assert.equal(await search.evaluate(e=>e===document.activeElement),true);
  assert.deepEqual(await page.evaluate(()=>bulkPeopleSelection),[]);
  await page.getByRole('button',{name:'Select visible',exact:true}).click();
  await page.getByRole('button',{name:'+ Empty',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>personById('pold02').locations),['il','pa','empty']);
  assert.deepEqual(await page.evaluate(()=>personById('pold01').locations),[]);
});

test('Unassigned and All contacts reset bulk selection; migrated contacts retain IDs and restored frequencies',async t=>{
  const page=await openApp(t,locationFixture());await openBulk(page);
  await box(page,'pold02').check();
  await page.getByRole('button',{name:'Unassigned',exact:true}).click();
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(),2);
  assert.deepEqual(await page.evaluate(()=>bulkPeopleSelection),[]);
  await page.getByRole('button',{name:'All contacts',exact:true}).click();
  assert.equal(await page.locator('input[data-ui-change="bulkPeopleToggle"]').count(),7);
  assert.equal(await page.evaluate(()=>personById('pinactive').every),180);
  assert.equal(await page.evaluate(()=>personById('porphan').every),180);
});

test('location filters Friends suggestions while all categories stay recordable in Combo',async t=>{
  const page=await openApp(t,locationFixture()),before=await history(page);
  assert.deepEqual((await page.locator('.w-name').allTextContents()).sort(),['Ana Existing','Luis Existing','Alex Existing','Legacy Person','Inactive Person','Orphan Person'].sort());
  await page.getByLabel('Current social location').selectOption('pa');
  assert.deepEqual((await page.locator('.w-name').allTextContents()).sort(),['Ana Existing','Luis Existing','Alex Existing','Remote Person','Legacy Person','Inactive Person','Orphan Person'].sort());
  await control(page,'click','socialCategoryToggle',['flirt','2026-10-16'],'button').click();
  assert.equal(await page.getByRole('button',{name:'Alex Existing',exact:true}).count(),1,'Combo has contacts from every location');
  assert.deepEqual(await page.evaluate(()=>getPeople(todayKey())),[]);
  assert.equal(await page.evaluate(()=>calcScore(todayKey()).l3),2);
  await page.getByLabel('Current social location').selectOption('il');
  assert.equal(await page.evaluate(()=>calcScore(todayKey()).l3),2);
  assert.equal(await history(page),before);
});

test('an empty discovery list retains a working location selector',async t=>{
  const data=locationFixture();data.config.people=data.config.people.filter(p=>['pold02','paway'].includes(p.id));data.config.selectedLocation='empty';for(const day of Object.values(data.days))day.people=[];
  const page=await openApp(t,data);
  assert.equal(await page.locator('.w-name').count(),0);
  await page.getByLabel('Current social location').selectOption('il');
  assert.equal(await page.locator('.w-name').count(),1);
});

test('group create/rename and contact editing persist through reload',async t=>{
  const page=await openApp(t,locationFixture()),before=await history(page);
  await showGroups(page);await page.getByRole('button',{name:'+ Añadir grupo',exact:true}).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Madrid');
  await page.getByRole('button',{name:'Guardar grupo',exact:true}).click();
  const id=await page.evaluate(()=>locationGroups().find(g=>g.name==='Madrid').id);
  await control(page,'click','locationRename',[id],'button').click();
  await page.getByRole('dialog').getByRole('textbox').fill('España');
  await page.getByRole('button',{name:'Guardar grupo',exact:true}).click();
  await page.getByLabel('Current social location').selectOption(id);
  await page.getByRole('button',{name:'+ Persona',exact:true}).click();
  await page.locator('#sf-name').fill('New Synthetic Person');await page.locator('#sf-every').fill('21');
  await page.getByRole('button',{name:'Guardar persona',exact:true}).click();
  const person=await page.evaluate(()=>peopleList().find(p=>p.name==='New Synthetic Person'));
  assert.deepEqual(person.locations,[id]);assert.equal(person.every,21);
  await page.waitForFunction(()=>!_cfgDraft);await page.reload();await page.waitForFunction(()=>_cfgReady&&_live);
  assert.equal(await page.evaluate(id=>locationGroups().find(g=>g.id===id).name,id),'España');
  assert.deepEqual(await page.evaluate(id=>personById(id),person.id),person);
  assert.equal(await history(page),before);
});

test('deleted locations remain accessible as unassigned after startup',async t=>{
  const data=locationFixture();data.config.selectedLocation='deleted';data.config.people[0].locations=['deleted'];
  const page=await openApp(t,data);
  assert.equal(await page.getByLabel('Current social location').inputValue(),'all');
  assert.equal(await page.locator('.w-name').count(),7);
  await openBulk(page);await page.getByRole('button',{name:'Unassigned',exact:true}).click();
  assert.equal(await box(page,'pold01').count(),1);
});

test('a contact with a saved orphan category can change locations without losing history or category',async t=>{
  const data=locationFixture();data.days['2026-09-16'].people.push('porphan');data.config.people.find(p=>p.id==='porphan').relationship='family';
  const page=await openApp(t,data,{width:390,height:844}),before=await history(page);
  await editPerson(page,'porphan');
  assert.equal(await page.locator('#sf-sub').inputValue(),'archived');
  await control(page,'change','socialDraftLocation',['pa'],'input').check();
  await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>personById('porphan').locations),['il','pa']);
  assert.equal(await page.evaluate(()=>personById('porphan').sub),'archived');
  assert.equal(await page.evaluate(()=>personById('porphan').relationship),'family');
  assert.equal(await history(page),before);
});
