import assert from 'node:assert/strict';
import {validateDraft,totalOf,status,lineTotal,validatePayment} from '../lib/domain';
const d={id:'11111111-1111-4111-8111-111111111111',shop_id:'luxora',kind:'invoice',date:'2026-10-08',due_date:'',customer_name:'Customer',customer_contact:'',items:[{product:'Kartu nama',description:'2 sisi, doff',qty:1.25,unit:'pak',price:10001}],discount:500,shipping:1000,notes:''};
const valid=validateDraft(d);assert.equal(lineTotal(valid.items[0]),12501);assert.equal(totalOf(valid),13001);
assert.equal(status({...valid,total:13001,paid:0} as any),'Belum dibayar');assert.equal(status({...valid,total:13001,paid:5000} as any),'Sebagian');assert.equal(status({...valid,total:13001,paid:13001} as any),'Lunas');
assert.throws(()=>validateDraft({...d,date:'2026-02-30'}));assert.throws(()=>validateDraft({...d,discount:999999}));assert.throws(()=>validateDraft({...d,items:[{...d.items[0],qty:1.234}]}));assert.throws(()=>validatePayment({id:d.id,invoice_id:d.id,date:d.date,amount:-1,method:'Tunai',reference:''}));console.log('Domain: rupiah rounding, status and validation passed.');
