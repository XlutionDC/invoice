import {checkWrite} from '@/lib/request';
import {getActor,apiFailure} from '@/lib/access';
import {savePayment} from '@/lib/repository';
import {validatePayment} from '@/lib/domain';
export async function POST(req:Request){try{checkWrite(req);const actor=await getActor(req);return Response.json({invoice:await savePayment(validatePayment(await req.json()),actor)});}catch(e){return apiFailure(e);}}
