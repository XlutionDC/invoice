import {renderLuxora} from './luxora-pdf';
import { PDFDocument,rgb,type PDFPage,type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import assets from './pdf-assets.json';
import { shops,rupiah,lineTotal,status,type Invoice } from './domain';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function makePdf(inv:Invoice){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const [normal,bold]=await Promise.all([pdf.embedFont(bytes(assets.regular),{subset:true}),pdf.embedFont(bytes(assets.bold),{subset:true})]);
 if(inv.shop_id==='luxora')return renderLuxora(inv,pdf,normal,bold,bytes(assets.luxora));
 const shop=shops.find(s=>s.id===inv.shop_id)!;const gold=rgb(.65,.49,.22),ink=rgb(.10,.11,.12),muted=rgb(.42,.44,.47),paper=rgb(.96,.96,.95);const accent=inv.shop_id==='luxora'?gold:ink;
 let head:any=null,logo:any=null;
 if(inv.shop_id==='luxora')logo=await pdf.embedPng(bytes(assets.luxora));else{const src=await PDFDocument.load(bytes(assets[inv.shop_id as 'lancar-jaya'|'cetakyuk']));const p=src.getPage(0);head=await pdf.embedPage(p,{left:0,right:p.getWidth(),bottom:p.getHeight()-190,top:p.getHeight()});}
 const W=595.28,H=841.89,L=42,R=W-42;let page:PDFPage;let y=0;let n=0;
 function text(s:string,x:number,top:number,size=10,font=normal,color=ink){page.drawText(s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''),{x,y:H-top-size,font,size,color});}
 function right(s:string,x:number,top:number,size=10,font=normal,color=ink){text(s,x-font.widthOfTextAtSize(s,size),top,size,font,color);}
 function wrap(s:string,width:number,size=10,font:PDFFont=normal){const lines:string[]=[];for(const para of s.split('\n')){let line='';for(const word of para.split(/\s+/)){if(!word)continue;let chunks=[word];if(font.widthOfTextAtSize(word,size)>width){chunks=[];let ch='';for(const c of word){if(font.widthOfTextAtSize(ch+c,size)>width){chunks.push(ch);ch='';}ch+=c;}if(ch)chunks.push(ch);}for(const chunk of chunks){const next=line?line+' '+chunk:chunk;if(font.widthOfTextAtSize(next,size)>width){if(line)lines.push(line);line=chunk;}else line=next;}}lines.push(line);}return lines;}
 function line(top:number,color=rgb(.86,.86,.84)){page.drawLine({start:{x:L,y:H-top},end:{x:R,y:H-top},color,thickness:.6});}
 function newPage(table=true){page=pdf.addPage([W,H]);n++;
 if(n===1&&head){page.drawPage(head,{x:0,y:H-190,width:W,height:190});y=204;}else if(n===1&&logo){page.drawRectangle({x:0,y:H-138,width:W,height:138,color:ink});page.drawRectangle({x:L-10,y:H-112,width:136,height:82,color:rgb(.83,.70,.44)});page.drawImage(logo,{x:L,y:H-102,width:116,height:62});right(inv.kind==='quotation'?'PENAWARAN':'INVOICE',R,42,23,bold,gold);right(inv.number,R,82,10,normal,rgb(.85,.85,.83));y=168;}else {text(shop.name,L,32,15,bold,accent);right(inv.number,R,36,10);y=75;}
 if(n===1){if(head){text(inv.kind==='quotation'?'PENAWARAN':'INVOICE',L,y,22,bold);right(inv.number,R,y+6,10);y+=43;}text('KEPADA',L,y,8,bold,muted);text('TANGGAL',355,y,8,bold,muted);y+=16;for(const s of wrap(inv.customer_name,280,12,bold)){text(s,L,y,12,bold);y+=16;}const customerY=y;if(inv.customer_contact){for(const s of wrap(inv.customer_contact,280,9)){text(s,L,y,9,normal,muted);y+=13;}}text(inv.date,355,customerY-16,11);if(inv.due_date)text('Jatuh tempo: '+inv.due_date,355,customerY+2,9,normal,muted);y+=24;}
 if(table){page.drawRectangle({x:L,y:H-y-29,width:R-L,height:29,color:paper});text('PRODUK / DESKRIPSI',L+10,y+9,8,bold);right('JUMLAH',365,y+9,8,bold);right('HARGA',443,y+9,8,bold);right('TOTAL',R-8,y+9,8,bold);y+=42;}
 }
 newPage();
 for(const item of inv.items){const names=wrap(item.product,230,10,bold),desc=item.description?wrap(item.description,230,9):[];const quantity=wrap(item.qty.toLocaleString('id-ID')+' '+item.unit,70,8);const h=Math.max(39,names.length*14+desc.length*13+16,quantity.length*12+16);if(y+h>640)newPage();let pos=y;for(const s of names){text(s,L+10,pos,10,bold);pos+=14;}for(const s of desc){text(s,L+10,pos,9,normal,muted);pos+=13;}quantity.forEach((s,k)=>right(s,365,y+k*12,8));const price=rupiah(item.price),cost=rupiah(lineTotal(item));right(price,443,y,Math.min(9,75/normal.widthOfTextAtSize(price,1)));right(cost,R-8,y,Math.min(9,95/bold.widthOfTextAtSize(cost,1)),bold);y+=h;line(y-8);}
 const noteLines=inv.notes?wrap(inv.notes,R-L,9):[];const summaryHeight=(inv.paid>0&&inv.paid<inv.total?160:120)+(inv.discount?20:0)+(inv.shipping?20:0);
 if(y+summaryHeight+noteLines.length*13+105>780)newPage(false);
 y+=10;const row=(label:string,value:string,heavy=false)=>{text(label,310,y,10,heavy?bold:normal);right(value,R-8,y,heavy?12:10,heavy?bold:normal);y+=23;};
 if(inv.discount||inv.shipping){row('Subtotal',rupiah(inv.items.reduce((s,i)=>s+lineTotal(i),0)));if(inv.discount)row('Diskon','− '+rupiah(inv.discount));if(inv.shipping)row('Ongkir',rupiah(inv.shipping));}
 row('TOTAL',rupiah(inv.total),true);
 if(inv.kind==='invoice'){if(inv.paid>=inv.total){text('LUNAS',310,y,14,bold,rgb(.12,.43,.29));y+=28;}else if(inv.paid>0){row('Sudah dibayar',rupiah(inv.paid));row('Sisa tagihan',rupiah(inv.total-inv.paid),true);}else{text('BELUM DIBAYAR',310,y,10,bold,muted);y+=24;}}
 y+=18;line(y);y+=16;text('TRANSFER '+shop.bank,L,y,9,bold,accent);y+=16;text(shop.account+'  •  a.n. '+shop.holder,L,y,10);y+=26;
 if(noteLines.length){text('CATATAN',L,y,8,bold,muted);y+=15;for(const s of noteLines){text(s,L,y,9,normal,muted);y+=13;}}
 for(const [idx,p] of pdf.getPages().entries()){page=p;text(shop.name+' • Terima kasih atas kepercayaan Anda.',L,803,8,normal,muted);right(`${idx+1} / ${pdf.getPageCount()}`,R,803,8,normal,muted);}
 pdf.setTitle(inv.number+' — '+shop.name);pdf.setAuthor(shop.name);return pdf.save();
}
