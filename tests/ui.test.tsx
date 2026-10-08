import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ShopChooser,Customers,AuditList} from '../app/features';
const staff=renderToStaticMarkup(<ShopChooser profile={{isOwner:false,shops:['lancar-jaya']}} userName="Staff" onChoose={()=>{}} onAccess={()=>{}}/>);
assert.ok(staff.includes('Lancar Jaya Printing'));assert.ok(!staff.includes('Semua toko'));assert.ok(staff.includes('Cetakyuk'));assert.ok(!staff.includes('Atur password toko'));assert.ok(staff.includes('Password belum diatur'));
const owner=renderToStaticMarkup(<ShopChooser profile={{isOwner:true,shops:['luxora','lancar-jaya','cetakyuk']}} userName="Owner" onChoose={()=>{}} onAccess={()=>{}}/>);assert.ok(!owner.includes('Semua toko'));assert.ok(owner.includes('Atur password toko'));
const event={id:'e',invoice_id:'i',shop_id:'luxora',action:'edited',actor_name:'Admin',created_at:'2026-10-08T00:00:00Z',details:{reason:'Customer menambah order',before:{total:100000},after:{total:200000}}};const html=renderToStaticMarkup(<AuditList events={[event]}/>);assert.ok(html.includes('Customer menambah order'));assert.ok(html.includes('100.000')&&html.includes('200.000'));console.log('UI: shop chooser privileges and readable before/after audit passed.');
