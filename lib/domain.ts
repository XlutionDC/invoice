export const shops = [
  {id:'luxora',name:'Luxora',prefix:'LXR',bank:'BCA',holder:'Daniel Christian',account:'5370558606',logo:'/brands/luxora-logo.png'},
  {id:'lancar-jaya',name:'Lancar Jaya Printing',prefix:'LJP',bank:'BCA',holder:'KEZIA',account:'2767037038',logo:'/brands/lancar-jaya-logo.png'},
  {id:'cetakyuk',name:'Cetakyuk',prefix:'CTK',bank:'BCA',holder:'KEZIA',account:'2760244379',logo:'/brands/cetakyuk-logo.jpeg'},
] as const;
export const products = ['Brosur','Kartu nama','Stiker','Spanduk','Flyer','Booklet','Poster','Placemat','Kartu ucapan','Paper belt','Lainnya'];
export type Item = {product:string;description:string;qty:number;unit:string;price:number};
export type Draft = {id:string;shop_id:string;kind:'invoice'|'quotation';date:string;due_date:string;customer_name:string;customer_contact:string;items:Item[];discount:number;shipping:number;notes:string};
export type PaymentProof={file_name:string;content_type:string;size:number;created_at:string;actor_name:string};
export type Payment = {proof?:PaymentProof;id:string;invoice_id:string;date:string;amount:number;method:string;reference:string;actor_name?:string;kind?:'receipt'|'refund'};
export type Invoice = Draft & {file_date?:string;file_seq?:number;number:string;total:number;paid:number;created_at:string;actor_name:string;payments?:Payment[];state?:'active'|'cancelled';version?:number;cancelled_reason?:string;cancelled_at?:string;audit?:AuditEvent[]};
export type AuditEvent={id:string;invoice_id:string|null;shop_id:string|null;action:string;actor_name:string;created_at:string;details:any;number?:string};
export type AccessProfile={isOwner:boolean;shops:string[];configured?:string[]};
export type Member={email:string;name:string;role:string;shops:string[];user_id?:string|null};
export const rupiah = (n:number) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
export function lineTotal(item:Item) {return Math.round(Math.round(item.qty*100)*item.price/100);}
export function totalOf(d:Pick<Draft,'items'|'discount'|'shipping'>){return d.items.reduce((s,i)=>s+lineTotal(i),0)-d.discount+d.shipping;}
export function status(i:Invoice){return i.state==='cancelled'?'Dibatalkan':i.kind==='quotation'?'Penawaran':i.paid>=i.total?'Lunas':i.paid>0?'Sebagian':'Belum dibayar';}
export function today(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});}
export function validDate(s:unknown):s is string {return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;}
export function amount(n:unknown,name:string){if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>1e12)throw new Error(name+' harus berupa rupiah bulat dan tidak negatif.');return n;}
export function cleanText(v:unknown,max:number,name:string,required=false){if(typeof v!=='string')throw new Error(name+' tidak valid.');const s=v.trim();if(s.length>max||required&&!s)throw new Error(name+' wajib diisi (maks. '+max+' karakter).');return s;}
export function uuid(v:unknown){if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))throw new Error('ID transaksi tidak valid.');return v;}
export function validateDraft(v:any):Draft {
  if(!v||!shops.some(s=>s.id===v.shop_id))throw new Error('Pilih toko yang valid.');
  if(!['invoice','quotation'].includes(v.kind))throw new Error('Jenis dokumen tidak valid.');
  if(!validDate(v.date)||v.due_date&&!validDate(v.due_date))throw new Error('Tanggal tidak valid.');
  if(v.due_date&&v.due_date<v.date)throw new Error('Jatuh tempo tidak boleh sebelum tanggal invoice.');
  if(!Array.isArray(v.items)||!v.items.length||v.items.length>50)throw new Error('Isi 1–50 barang.');
  const items=v.items.map((i:any)=>{
    if(typeof i.qty!=='number'||!Number.isFinite(i.qty)||i.qty<=0||i.qty>1e6||Math.abs(i.qty*100-Math.round(i.qty*100))>0.000001)throw new Error('Jumlah harus positif, maksimal 2 angka desimal.');
    const item={product:cleanText(i.product,100,'Produk',true),description:cleanText(i.description,500,'Deskripsi'),unit:cleanText(i.unit,20,'Satuan',true),qty:i.qty,price:amount(i.price,'Harga')};
    if(!Number.isSafeInteger(lineTotal(item)))throw new Error('Nilai barang terlalu besar.');return item;
  });
  const d:Draft={id:uuid(v.id),shop_id:v.shop_id,kind:v.kind,date:v.date,due_date:v.due_date||'',customer_name:cleanText(v.customer_name,150,'Nama customer',true),customer_contact:cleanText(v.customer_contact,200,'Kontak'),items,discount:amount(v.discount,'Diskon'),shipping:amount(v.shipping,'Ongkir'),notes:cleanText(v.notes,1000,'Catatan')};
  const total=totalOf(d);if(!Number.isSafeInteger(total)||total<=0||total>1e12)throw new Error('Total harus lebih dari Rp0 dan maksimal Rp1 triliun.');return d;
}
export function validatePayment(v:any):Payment {if(!v||!validDate(v.date))throw new Error('Tanggal pembayaran tidak valid.');const n=amount(v.amount,'Pembayaran');if(!n)throw new Error('Pembayaran harus lebih dari Rp0.');if(v.kind!==undefined&&!['receipt','refund'].includes(v.kind))throw new Error('Jenis pembayaran tidak valid.');return {kind:v.kind||'receipt',id:uuid(v.id),invoice_id:uuid(v.invoice_id),date:v.date,amount:n,method:cleanText(v.method,60,'Metode',true),reference:cleanText(v.reference,200,'Referensi')};}

export const paymentValue=(p:Payment)=>p.kind==='refund'?-p.amount:p.amount;
export function salesSummary(invoices:Invoice[],payments:Payment[],month:string){const active=invoices.filter(i=>i.kind==='invoice'&&i.state!=='cancelled');return {sales:active.filter(i=>i.date.startsWith(month)).reduce((a,i)=>a+i.total,0),cash:payments.filter(p=>p.date.startsWith(month)).reduce((a,p)=>a+paymentValue(p),0),receivables:active.reduce((a,i)=>a+Math.max(0,i.total-i.paid),0)};}

export function pdfFilename(d:Pick<Draft,'shop_id'> & {file_date?:string;file_seq?:number}){
 const store=d.shop_id==='cetakyuk'?'CetakYuk':shops.find(s=>s.id===d.shop_id)?.name||'Invoice';
 return `${store}-${d.file_date||today()}-${d.file_seq?String(d.file_seq).padStart(3,'0'):'PRATINJAU'}.pdf`;
}
