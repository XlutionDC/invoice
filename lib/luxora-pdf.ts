import {PDFDocument,rgb,type PDFPage,type PDFFont} from 'pdf-lib';
import {lineTotal,status,type Invoice} from './domain';
// Coordinates and colors from the approved Luxora_Invoice_Desain_Baru reference.
export async function renderLuxora(inv:Invoice,pdf:PDFDocument,regular:PDFFont,bold:PDFFont,logoBytes:Uint8Array){
 const W=595.5,H=842.25,L=42,R=W-42;
 const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
 const BLACK=color('#202320'),GOLD=color('#AC8645'),MUTED=color('#757970'),LINE=color('#E7E6E0'),SOFT=color('#F6F2E8');
 const logo=await pdf.embedPng(logoBytes);let page:PDFPage;let pageNo=0;let y=326;
 const money=(n:number)=>'Rp '+n.toLocaleString('id-ID');
 const date=(s:string)=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(s+'T00:00:00+07:00'));
 function text(x:number,baseline:number,value:string,size=10,strong=false,fill=BLACK,right=false){const font=strong?bold:regular;const clean=value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');page.drawText(clean,{x:right?x-font.widthOfTextAtSize(clean,size):x,y:H-baseline,size,font,color:fill});}
 function rect(x:number,top:number,width:number,height:number,fill=BLACK){page.drawRectangle({x,y:H-top-height,width,height,color:fill});}
 function rounded(x:number,top:number,width:number,height:number,r:number,fill:ReturnType<typeof rgb>){rect(x+r,top,width-2*r,height,fill);rect(x,top+r,width,height-2*r,fill);for(const cx of [x+r,x+width-r])for(const cy of [H-top-r,H-top-height+r])page.drawCircle({x:cx,y:cy,size:r,color:fill});}
 function rule(top:number){page.drawLine({start:{x:L,y:H-top},end:{x:R,y:H-top},color:LINE,thickness:.7});}
 function wrap(s:string,width:number,size=10,strong=false){const font=strong?bold:regular;const out:string[]=[];for(const para of s.split('\n')){let line='';for(const word of para.split(/\s+/)){if(!word)continue;let part='';for(const char of word){if(font.widthOfTextAtSize(part+char,size)>width){if(line){out.push(line);line='';}out.push(part);part='';}part+=char;}const next=line?line+' '+part:part;if(font.widthOfTextAtSize(next,size)>width){if(line)out.push(line);line=part;}else line=next;}out.push(line);}return out;}
 function header(){page=pdf.addPage([W,H]);pageNo++;rect(0,0,W,6);rect(0,6,W,2,GOLD);page.drawImage(logo,{x:42,y:H-125,width:60,height:78});text(122,73,'LUXORA PRINTING',15,true);text(122,93,'RINCIAN PESANAN & PEMBAYARAN',8,false,MUTED);
 const title=inv.kind==='quotation'?'PENAWARAN':'INVOICE';text(R,72,title,title==='PENAWARAN'?19:24,true,BLACK,true);text(R,94,inv.number,9,false,MUTED,true);rule(147);
 }
 function tableHeader(top:number){rounded(42,top,W-84,32,4,BLACK);text(56,top+20,'PRODUK / DESKRIPSI',8,true,color('#F2E1B7'));text(336,top+20,'QTY',8,true,color('#F2E1B7'),true);text(444,top+20,'HARGA SATUAN',8,true,color('#F2E1B7'),true);text(539,top+20,'JUMLAH',8,true,color('#F2E1B7'),true);y=top+54;}
 function nextItems(){header();text(42,178,'RINCIAN PESANAN (LANJUTAN)',8,true,GOLD);tableHeader(199);}
 header();text(42,179,'DITAGIHKAN KEPADA',8,true,GOLD);const names=wrap(inv.customer_name,300,13,true);let customerBottom=204;for(const n of names){text(42,customerBottom,n,13,true);customerBottom+=17;}
 const contacts=inv.customer_contact?wrap(inv.customer_contact,300,9):[];let contactBottom=Math.max(240,customerBottom+10);for(const s of contacts){text(42,contactBottom,s,9,false,MUTED);contactBottom+=13;}
 text(383,179,'TANGGAL',8,true,GOLD);text(383,202,date(inv.date),10);
 if(inv.due_date){text(383,224,'JATUH TEMPO',8,true,GOLD);text(383,242,date(inv.due_date),10);}else{text(383,226,'STATUS',8,true,GOLD);text(383,244,status(inv).toUpperCase(),status(inv).length>12?8:9,true);}
 tableHeader(Math.max(272,contactBottom+22,customerBottom+28));
 for(const item of inv.items){const names=wrap(item.product,235,10,true),description=item.description?wrap(item.description,235,9):[],units=wrap(item.unit,52,7);const rowHeight=Math.max(39,names.length*15+description.length*13+17,units.length*11+28);if(y+rowHeight>650)nextItems();let baseline=y;for(const s of names){text(56,baseline,s,10,true);baseline+=15;}for(const s of description){text(56,baseline,s,9,false,MUTED);baseline+=13;}
 text(337,y,item.qty.toLocaleString('id-ID'),10,false,BLACK,true);units.forEach((s,i)=>text(337,y+14+i*11,s,7,false,MUTED,true));const price=money(item.price),total=money(lineTotal(item));text(444,y,price,Math.min(9,95/regular.widthOfTextAtSize(price,1)),false,BLACK,true);text(539,y,total,Math.min(9,84/bold.widthOfTextAtSize(total,1)),true,BLACK,true);y+=rowHeight;rule(y-17);}
 const notes=inv.notes?wrap(inv.notes,245,9):[];let summaryNotes=notes;
 // Long notes continue on their own pages; the approved summary stays in place.
 if(notes.length>9){for(let i=0;i<notes.length;i+=34){header();text(42,180,'CATATAN'+(i?' (LANJUTAN)':''),8,true,GOLD);let top=205;for(const s of notes.slice(i,i+34)){text(42,top,s,9,false,MUTED);top+=14;}}summaryNotes=['Catatan tercantum di halaman sebelumnya.'];header();y=190;}
 const extras=(inv.discount?18:0)+(inv.shipping?18:0);if(y+5+extras>480){header();y=190;}
 let extraY=Math.max(y+5,435);
 if(inv.discount){text(350,extraY,'Diskon',9,false,MUTED);text(539,extraY,'− '+money(inv.discount),9,false,BLACK,true);extraY+=18;}
 if(inv.shipping){text(350,extraY,'Ongkir',9,false,MUTED);text(539,extraY,money(inv.shipping),9,false,BLACK,true);}
 text(42,509,'CATATAN',8,true,GOLD);summaryNotes.forEach((s,i)=>text(42,531+i*14,s,9,false,MUTED));
 function totalBox(top:number,label:string,value:number){rounded(324,top,229,78,6,SOFT);rect(324,top,3,78,GOLD);text(343,top+24,label,8,true,GOLD);const v=money(value);text(537,top+58,v,Math.min(21,194/bold.widthOfTextAtSize(v,1)),true,BLACK,true);}
 if(inv.kind==='quotation'){totalBox(496,'TOTAL PENAWARAN',inv.total);}else if(inv.paid>=inv.total){totalBox(496,'TOTAL',inv.total);text(537,604,'LUNAS',12,true,BLACK,true);}else if(inv.paid>0){text(350,510,'Total invoice',10,false,MUTED);text(539,510,money(inv.total),11,true,BLACK,true);text(350,538,'Pembayaran / DP',10,false,MUTED);text(539,538,money(inv.paid),11,false,BLACK,true);totalBox(560,'SISA TAGIHAN',inv.total-inv.paid);}else{totalBox(496,'TOTAL TAGIHAN',inv.total);text(537,604,'BELUM DIBAYAR',10,true,MUTED,true);}
 // Fixed lower section matches the approved bank details and thank-you placement.
 rule(678);text(42,704,'INFORMASI PEMBAYARAN',8,true,GOLD);text(42,728,'BCA  /  5370558606',13,true);text(42,749,'a.n. Daniel Christian',10,false,MUTED);text(553,735,'Terima kasih atas',9,false,MUTED,true);text(553,753,'kepercayaan Anda.',9,false,MUTED,true);
 for(const [i,p] of pdf.getPages().entries()){page=p;rule(784);text(42,806,'LUXORA PRINTING',7,false,MUTED);text(553,806,`${i+1} / ${pdf.getPageCount()}`,7,false,MUTED,true);}
 pdf.setTitle(inv.number+' — Luxora');pdf.setAuthor('Luxora Printing');return pdf.save();
}
