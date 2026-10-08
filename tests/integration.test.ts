import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setUser,type ChatGPTUser} from './test-auth';
import {sqlite,storedProofs,setProofStorageFailure} from './test-db';
import * as invoices from '../app/api/invoices/route';
import * as payments from '../app/api/payments/route';
import * as pdf from '../app/api/pdf/route';
import * as members from '../app/api/members/route';
import * as audit from '../app/api/audit/route';
import * as profile from '../app/api/profile/route';
import * as passwords from '../app/api/store-password/route';
import * as sessions from '../app/api/store-session/route';
import * as proofs from '../app/api/payment-proof/route';
import {salesSummary,pdfFilename,today,type Invoice} from '../lib/domain';
const owner={userId:'owner-site-id',email:'daniel.cjohan@gmail.com',displayName:'Owner',fullName:null};const employee={userId:'staff-site-id',email:'staff@example.test',displayName:'Staff',fullName:null};
const cookies=new Map<string,string>();let current:ChatGPTUser|null=null;function act(u:ChatGPTUser|null){current=u;setUser(u);}
const req=(path:string,method='GET',data?:any,cookie?:string)=>new Request('https://app.test'+path,{method,headers:{...(data||method==='DELETE'?{'Content-Type':'application/json','Origin':'https://app.test'}:{}),Cookie:cookie??cookies.get(current?.userId||'')??''},body:data?JSON.stringify(data):undefined});
async function json(r:Response,code=200){const v:any=await r.json();assert.equal(r.status,code,JSON.stringify(v));const cookie=r.headers.get('set-cookie');if(cookie&&current)cookies.set(current.userId,cookie.split(';')[0]);return v;}
const draft=(shop:string,total=100000)=>({id:randomUUID(),shop_id:shop,kind:'invoice',date:'2026-10-08',due_date:'',customer_name:'Customer',customer_contact:'0812',items:[{product:'Kartu nama',description:'2 sisi',qty:1,unit:'pak',price:total}],discount:0,shipping:0,notes:''});
const pwd:Record<string,string>={luxora:'Test-Luxora-2026!', 'lancar-jaya':'Test-LJP-2026!',cetakyuk:'Test-Cetakyuk-2026!'};
async function login(shop:string,password=pwd[shop]){return json(await sessions.POST(req('/api/store-session','POST',{shop_id:shop,password})));}
async function run(){console.error=()=>{};act(null);await json(await invoices.GET(req('/api/invoices?shop=luxora')),401);act(owner);assert.equal((await json(await profile.GET(req('/api/profile')))).profile.isOwner,true);await json(await invoices.GET(req('/api/invoices?shop=luxora')),403);
 for(const [shop_id,password]of Object.entries(pwd))await json(await passwords.POST(req('/api/store-password','POST',{shop_id,password,confirm:password})));
 await json(await passwords.POST(req('/api/store-password','POST',{shop_id:'luxora',password:pwd['lancar-jaya'],confirm:pwd['lancar-jaya']})),400);
 assert.equal((await json(await passwords.GET(req('/api/store-password')))).stores.length,3);const stored=sqlite.prepare("SELECT * FROM store_credentials WHERE shop_id='luxora'").get()!;assert.notEqual(stored.password_hash,pwd.luxora);assert.ok(!JSON.stringify(stored).includes(pwd.luxora));
 await login('luxora');const ownerCookie=cookies.get(owner.userId)!;const a=(await json(await invoices.POST(req('/api/invoices','POST',draft('luxora'))),201)).invoice as Invoice;
 await login('lancar-jaya');await json(await invoices.GET(req('/api/invoices?shop=luxora')),403);const b=(await json(await invoices.POST(req('/api/invoices','POST',draft('lancar-jaya',50000))),201)).invoice as Invoice;
 await json(await sessions.DELETE(req('/api/store-session','DELETE')));assert.deepEqual((await json(await profile.GET(req('/api/profile')))).profile.shops,[]);await json(await invoices.GET(req('/api/invoices?shop=all')),400);
 act(employee);await json(await passwords.POST(req('/api/store-password','POST',{shop_id:'luxora',password:'Not-Owner-Secret!',confirm:'Not-Owner-Secret!'})),403);await json(await members.GET(),410);await json(await sessions.POST(req('/api/store-session','POST',{shop_id:'luxora',password:'wrong'})),403);await login('lancar-jaya');assert.deepEqual((await json(await profile.GET(req('/api/profile')))).profile.shops,['lancar-jaya']);const staffList=await json(await invoices.GET(req('/api/invoices?shop=lancar-jaya')));assert.deepEqual(staffList.invoices.map((i:Invoice)=>i.id),[b.id]);
 await json(await invoices.GET(req('/api/invoices?shop=luxora')),403);await json(await invoices.GET(req('/api/invoices?shop=all')),400);await json(await invoices.GET(req('/api/invoices')),400);await json(await invoices.GET(req('/api/invoices?id='+a.id)),404);await json(await invoices.POST(req('/api/invoices','POST',draft('luxora'))),403);
 await json(await invoices.PATCH(req('/api/invoices','PATCH',{action:'cancel',id:a.id,version:1,operation_id:randomUUID(),reason:'Tidak berhak'})),404);await json(await invoices.PATCH(req('/api/invoices','PATCH',{action:'edit',id:a.id,draft:a,version:1,operation_id:randomUUID(),reason:'Tidak berhak'})),404);await json(await payments.POST(req('/api/payments','POST',{id:randomUUID(),invoice_id:a.id,date:'2026-10-08',amount:1,method:'Tunai',reference:''})),404);
 await json(await pdf.GET(req('/api/pdf?id='+a.id)),404);await json(await pdf.POST(req('/api/pdf','POST',draft('luxora'))),403);await json(await audit.GET(req('/api/audit?shop=luxora')),403);await json(await audit.GET(req('/api/audit?shop=all')),400);assert.deepEqual((await json(await profile.GET(req('/api/profile','GET',undefined,ownerCookie)))).profile.shops,[]);
 act(owner);await login('luxora');const pay={id:randomUUID(),invoice_id:a.id,date:'2026-10-08',amount:60000,method:'Tunai',reference:'DP'};let inv=(await json(await payments.POST(req('/api/payments','POST',pay)))).invoice;await json(await payments.POST(req('/api/payments','POST',pay)));assert.equal(sqlite.prepare('SELECT COUNT(*) c FROM payments WHERE invoice_id=?').get(a.id)!.c,1);
 const op=randomUUID(),edit={...a,items:[{...a.items[0],price:80000}]};await json(await invoices.PATCH(req('/api/invoices','PATCH',{id:a.id,action:'edit',draft:{...edit,items:[{...a.items[0],price:50000}]},version:1,operation_id:randomUUID(),reason:'Terlalu kecil'})),409);
 const editRequest={id:a.id,action:'edit',draft:edit,version:1,operation_id:op,reason:'Jumlah berkurang'};inv=(await json(await invoices.PATCH(req('/api/invoices','PATCH',editRequest)))).invoice;assert.equal(inv.total,80000);assert.equal(inv.version,2);assert.equal(inv.number,a.number);await json(await invoices.PATCH(req('/api/invoices','PATCH',editRequest)));await json(await invoices.PATCH(req('/api/invoices','PATCH',{...editRequest,operation_id:randomUUID()})),409);await json(await invoices.PATCH(req('/api/invoices','PATCH',{...editRequest,draft:{...edit,customer_name:'Isi berbeda'}})),409);const event=inv.audit.find((e:any)=>e.action==='edited');assert.equal(event.details.before.total,100000);assert.equal(event.details.after.total,80000);
 await json(await payments.POST(req('/api/payments','POST',{...pay,id:randomUUID(),amount:30000})),409);inv=(await json(await payments.POST(req('/api/payments','POST',{...pay,id:randomUUID(),amount:20000})))).invoice;
 const cancel={action:'cancel',id:a.id,version:2,operation_id:randomUUID(),reason:'Customer batal'};inv=(await json(await invoices.PATCH(req('/api/invoices','PATCH',cancel)))).invoice;assert.equal(inv.state,'cancelled');assert.equal(inv.paid,80000);await json(await invoices.PATCH(req('/api/invoices','PATCH',cancel)));await json(await payments.POST(req('/api/payments','POST',{...pay,id:randomUUID(),amount:1})),409);await json(await pdf.GET(req('/api/pdf?id='+a.id)),409);
 let data=await json(await invoices.GET(req('/api/invoices?shop=luxora')));assert.deepEqual(salesSummary(data.invoices,data.payments,'2026-10'),{sales:0,cash:80000,receivables:0});const refund={...pay,id:randomUUID(),amount:40000,kind:'refund',reference:'Refund'};await json(await payments.POST(req('/api/payments','POST',{...refund,amount:90000})),409);await json(await payments.POST(req('/api/payments','POST',refund)));await json(await payments.POST(req('/api/payments','POST',refund)));await json(await payments.POST(req('/api/payments','POST',{...refund,id:randomUUID(),date:'2026-11-02'})));data=await json(await invoices.GET(req('/api/invoices?shop=luxora')));assert.equal(salesSummary(data.invoices,data.payments,'2026-10').cash,40000);assert.equal(salesSummary(data.invoices,data.payments,'2026-11').cash,-40000);

 // Deletion excludes test invoices from lists/reports without reusing numbers or losing history.
 const testDraft=draft('luxora');const sample=(await json(await invoices.POST(req('/api/invoices','POST',testDraft)),201)).invoice;
 const removal={id:sample.id,version:sample.version,operation_id:randomUUID(),confirm:true};
 await json(await invoices.DELETE(req('/api/invoices','DELETE',{...removal,confirm:false})),400);
 await json(await invoices.DELETE(req('/api/invoices','DELETE',{...removal,version:99})),409);
 act(employee);await login('luxora');await json(await invoices.DELETE(req('/api/invoices','DELETE',removal)),403);await json(await sessions.DELETE(req('/api/store-session','DELETE')));act(owner);
 await json(await invoices.DELETE(req('/api/invoices','DELETE',{...removal,id:b.id})),404);
 await json(await invoices.DELETE(req('/api/invoices','DELETE',{...removal,id:a.id,version:3})),409); // Fully refunded history is still protected.
 await json(await invoices.DELETE(req('/api/invoices','DELETE',removal)));
 await json(await invoices.GET(req('/api/invoices?id='+sample.id)),404);await json(await pdf.GET(req('/api/pdf?id='+sample.id)),404);
 await json(await payments.POST(req('/api/payments','POST',{...pay,id:randomUUID(),invoice_id:sample.id,amount:1})),404);
 await json(await invoices.POST(req('/api/invoices','POST',testDraft)),404);
 assert.ok(!(await json(await invoices.GET(req('/api/invoices?shop=luxora')))).invoices.some((i:Invoice)=>i.id===sample.id));
 assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM audit_events WHERE invoice_id=? AND action='deleted'").get(sample.id)!.c,1);
 const following=(await json(await invoices.POST(req('/api/invoices','POST',draft('luxora'))),201)).invoice;assert.notEqual(following.number,sample.number);
 const namedPdf=await pdf.GET(req('/api/pdf?id='+following.id));assert.equal(namedPdf.status,200);assert.ok(namedPdf.headers.get('Content-Disposition')?.includes(pdfFilename(following)));assert.ok((await namedPdf.arrayBuffer()).byteLength>100);
 const previewPdf=await pdf.POST(req('/api/pdf','POST',{...draft('luxora'),customer_name:'José'}));assert.equal(previewPdf.status,200);assert.ok(previewPdf.headers.get('Content-Disposition')?.includes('-PRATINJAU.pdf'));
 assert.equal(pdfFilename({shop_id:'luxora',file_date:'2026-10-08',file_seq:1}),'Luxora-2026-10-08-001.pdf');
 assert.equal(pdfFilename({shop_id:'cetakyuk',file_date:'2026-10-08',file_seq:12}),'CetakYuk-2026-10-08-012.pdf');
 assert.equal(pdfFilename({shop_id:'lancar-jaya',file_date:'2026-10-08',file_seq:1000}),'Lancar Jaya Printing-2026-10-08-1000.pdf');
 assert.equal(following.file_date,today());assert.ok(following.file_seq>sample.file_seq);assert.equal(a.file_seq,1);assert.equal(b.file_seq,1);
 const backdated=(await json(await invoices.POST(req('/api/invoices','POST',{...draft('luxora'),date:'2025-01-01'})),201)).invoice;assert.equal(backdated.file_date,today());assert.ok(backdated.file_seq>following.file_seq);
 // Existing invoice filenames use creation day, remain stable after editing, and never reset on deletion.
 sqlite.prepare('UPDATE invoices SET file_date=NULL,file_seq=NULL WHERE id=?').run(sample.id);const legacy=sqlite.prepare("SELECT COUNT(*) c FROM invoices WHERE shop_id='luxora' AND date(created_at,'+7 hours')=?").get(today())!;const next=(await json(await invoices.POST(req('/api/invoices','POST',draft('luxora'))),201)).invoice;assert.ok(next.file_seq>Number(legacy.c));
 const upload=(id:string,bytes:Uint8Array,name='transfer.png',origin='https://app.test')=>{const data=new FormData();data.append('payment_id',id);data.append('file',new Blob([bytes as any]),name);return new Request('https://app.test/api/payment-proof',{method:'POST',headers:{Origin:origin,Cookie:cookies.get(current?.userId||'')||''},body:data});};
 const png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
 await json(await proofs.POST(upload(pay.id,png,'transfer.png','https://evil.test')),403);
 await json(await proofs.POST(upload(pay.id,new Uint8Array([60,104,116,109,108]),'fake.png')),400);
 await json(await proofs.POST(upload(pay.id,new Uint8Array(5*1024*1024+1),'huge.pdf')),413);
 setProofStorageFailure(true);await json(await proofs.POST(upload(pay.id,png)),400);setProofStorageFailure(false);assert.equal(sqlite.prepare('SELECT COUNT(*) c FROM payment_proofs').get()!.c,0);
 let proven=(await json(await proofs.POST(upload(pay.id,png)))).invoice;assert.equal(proven.payments.find((p:any)=>p.id===pay.id).proof.file_name,'transfer.png');assert.equal(storedProofs.size,1);
 await json(await proofs.POST(upload(pay.id,png)));assert.equal(storedProofs.size,1);await json(await proofs.POST(upload(pay.id,new Uint8Array([255,216,255,1]),'changed.jpg')),409);
 const proofResponse=await proofs.GET(req('/api/payment-proof?payment_id='+pay.id));assert.equal(proofResponse.status,200);assert.equal(proofResponse.headers.get('Content-Type'),'image/png');assert.equal((await proofResponse.arrayBuffer()).byteLength,png.length);assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM audit_events WHERE action='proof_attached' AND invoice_id=?").get(a.id)!.c,1);
 act(employee);await login('lancar-jaya');await json(await proofs.GET(req('/api/payment-proof?payment_id='+pay.id)),404);await json(await proofs.POST(upload(pay.id,png)),404);act(owner);
 console.log('PASS: proof uploads, signature/size/origin validation, failed storage recovery, immutable/idempotent evidence, private access, audit and daily PDF sequences.');
 console.log('PASS: deletion confirmation, owner/shop permissions, stale versions, refund history, hidden deleted documents, preserved numbering/audit, and safe PDF filenames.');
 // Rotation immediately invalidates another user's existing store session.
 await json(await passwords.POST(req('/api/store-password','POST',{shop_id:'lancar-jaya',password:'New-LJP-Password!',confirm:'New-LJP-Password!'})));act(employee);assert.deepEqual((await json(await profile.GET(req('/api/profile')))).profile.shops,[]);await json(await invoices.GET(req('/api/invoices?id='+b.id)),404);await json(await sessions.POST(req('/api/store-session','POST',{shop_id:'lancar-jaya',password:pwd['lancar-jaya']})),403);await login('lancar-jaya','New-LJP-Password!');sqlite.prepare('UPDATE store_sessions SET expires_at=0 WHERE user_id=?').run(employee.userId);await json(await invoices.GET(req('/api/invoices?shop=lancar-jaya')),403);
 const limiter={...employee,userId:'limiter-site-id'};act(limiter);for(let i=0;i<5;i++)await json(await sessions.POST(req('/api/store-session','POST',{shop_id:'luxora',password:'wrong'})),403);await json(await sessions.POST(req('/api/store-session','POST',{shop_id:'luxora',password:pwd.luxora})),429);
 act(owner);const beforeCookie=cookies.get(owner.userId)!;await json(await sessions.DELETE(req('/api/store-session','DELETE')));await json(await invoices.GET(req('/api/invoices?shop=luxora','GET',undefined,beforeCookie)),403);assert.equal(sqlite.prepare("SELECT COUNT(*) c FROM audit_events WHERE invoice_id=? AND action='edited'").get(a.id)!.c,1);console.log('PASS: password store access, owner setup, hashed secrets, single-store sessions, cross-user binding, throttling, rotation, expiry/logout, every data endpoint, edit conflicts, payments/refunds and audit history.');}
run();
