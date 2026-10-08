import {getActor,apiFailure} from '@/lib/access';
import {sqlDb} from '@/db';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const a=await getActor(req);const rows=await sqlDb().prepare('SELECT shop_id FROM store_credentials').all<any>();return Response.json({profile:{isOwner:a.isOwner,shops:a.shops,configured:rows.results.map(r=>r.shop_id)}},{headers:{'Cache-Control':'no-store'}});}catch(e){return apiFailure(e);}}
