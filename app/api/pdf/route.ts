import {checkWrite} from '@/lib/request';
import {getActor,assertShop,apiFailure,ApiError} from '@/lib/access';
import {findInvoice} from '@/lib/repository';
import {validateDraft,totalOf,uuid,pdfFilename} from '@/lib/domain';
import {makePdf} from '@/lib/pdf';
export const dynamic='force-dynamic';
async function send(invoice:any){const data=await makePdf(invoice),name=pdfFilename(invoice),fallback=name.replace(/[^\x20-\x7e]/g,'_');return new Response(data as unknown as BodyInit,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`,'Cache-Control':'private, no-store'}});}
export async function GET(req:Request){try{const actor=await getActor(req),inv=await findInvoice(uuid(new URL(req.url).searchParams.get('id')),actor);if(inv.state==='cancelled')throw new ApiError('Invoice sudah dibatalkan dan tidak dapat diunduh sebagai tagihan.',409);return send(inv);}catch(e){return apiFailure(e);}}
export async function POST(req:Request){try{checkWrite(req);const actor=await getActor(req),v:any=await req.json(),d=validateDraft(v);assertShop(actor,d.shop_id);if(v.preview_edit){const old=await findInvoice(d.id,actor);if(old.state==='cancelled'||old.shop_id!==d.shop_id||old.kind!==d.kind||totalOf(d)<old.paid)throw new ApiError('Pratinjau perubahan tidak valid.');return send({...d,total:totalOf(d),paid:old.paid,file_date:old.file_date,file_seq:old.file_seq,number:old.number+' — PRATINJAU'});}return send({...d,total:totalOf(d),paid:0,number:'DRAFT — BELUM DISIMPAN'});}catch(e){return apiFailure(e);}}
