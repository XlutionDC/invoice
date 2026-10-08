import {getActor,scope,apiFailure} from '@/lib/access';
import {listAudit} from '@/lib/repository';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const actor=await getActor(req);return Response.json({events:await listAudit(scope(actor,new URL(req.url).searchParams.get('shop')))},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
