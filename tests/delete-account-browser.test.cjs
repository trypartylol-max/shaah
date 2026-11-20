const {test}=require('node:test');const assert=require('node:assert/strict');const {openApp}=require('./browser-helpers.cjs');
async function stub(p,{answer,result}){
 await p.evaluate(({answer,result})=>{
  window.__calls=[];window.prompt=()=>answer;
  sb.functions={invoke:async(name,o)=>{window.__calls.push({name,body:o&&o.body});sessionStorage.setItem('__call',JSON.stringify({name,body:o&&o.body}));return result}};
  openSettings();secOpen={data:true};render();
 },{answer,result});
}
test('Delete account asks for the word, calls the server and signs out with a notice',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await stub(p,{answer:'delete',result:{data:{deleted:true},error:null}});
 await Promise.all([p.waitForEvent('load'),p.locator('[data-delete-account]').click()]);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__call'))),{name:'delete-account',body:{confirm:'DELETE'}});
});
test('a wrong word or a cancelled prompt deletes nothing',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await stub(p,{answer:'nope',result:{data:{deleted:true},error:null}});
 await p.locator('[data-delete-account]').click();
 await p.locator('#signout-status').filter({hasText:'did not match'}).waitFor();
 await p.evaluate(()=>{window.prompt=()=>null});await p.locator('[data-delete-account]').click();
 assert.equal(await p.evaluate(()=>window.__calls.length),0);
 assert.ok(await p.evaluate(()=>!!USER));
});
test('a server error keeps the account signed in and says so',async t=>{
 const p=await openApp(t,undefined,{width:390,height:844},{stayOnToday:true});
 await stub(p,{answer:'DELETE',result:{data:null,error:{message:'boom'}}});
 await p.locator('[data-delete-account]').click();
 await p.locator('#signout-status').filter({hasText:'could not be deleted'}).waitFor();
 assert.ok(await p.evaluate(()=>!!USER));
});
