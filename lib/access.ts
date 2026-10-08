import {getChatGPTUser,type ChatGPTUser} from '@/app/chatgpt-auth';
import {sessionShops} from './store-password';
import {sqlDb} from '@/db';
import {shops,type AccessProfile} from './domain';
// Owner email verified against this Site's owner access policy. Never supplied by a client.
const OWNER_EMAIL='daniel.cjohan@gmail.com';
export class ApiError extends Error{constructor(message:string,public status=400){super(message);}}
export type Actor=ChatGPTUser & AccessProfile;
export function assertShop(actor:AccessProfile,shop:string){if(!shops.some(s=>s.id===shop)||!actor.shops.includes(shop))throw new ApiError('Toko tidak dapat diakses.',403);}
export function requireOwner(actor:AccessProfile){if(!actor.isOwner)throw new ApiError('Hanya owner yang boleh mengatur akses.',403);}
export async function getActor(req?:Request):Promise<Actor>{const user=await getChatGPTUser();if(!user)throw new ApiError('Silakan masuk kembali.',401);return actorFor(user,req);}
export async function actorFor(user:ChatGPTUser,req?:Request):Promise<Actor>{
 const db=sqlDb(),email=user.email.trim().toLowerCase();
 if(email===OWNER_EMAIL){await db.prepare(`INSERT INTO members (email,name,user_id,role,shops,updated_at) VALUES (?,?,?,'owner',?,?) ON CONFLICT(email) DO NOTHING`).bind(email,user.displayName,user.userId,JSON.stringify(shops.map(s=>s.id)),new Date().toISOString()).run();}
 let member=await db.prepare('SELECT * FROM members WHERE user_id=?').bind(user.userId).first<any>();
 if(!member){await db.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL').bind(user.userId,email).run();member=await db.prepare('SELECT * FROM members WHERE user_id=?').bind(user.userId).first<any>();}
 const unlocked=await sessionShops(req,user.userId);return {...user,isOwner:member?.role==='owner',shops:unlocked};
}
export function scope(actor:AccessProfile,requested:string|null){if(!requested)throw new ApiError('Pilih toko terlebih dahulu.',400);if(requested==='all')throw new ApiError('Pilih satu toko. Rekap gabungan tidak tersedia.',400);assertShop(actor,requested);return [requested];}
export function apiFailure(e:unknown){console.error('Invoice request failed:',e instanceof Error?e.message:'unknown');return Response.json({error:e instanceof ApiError?e.message:e instanceof Error&&!/SQLITE|D1|binding|database/i.test(e.message)?e.message:'Penyimpanan belum tersedia. Coba lagi.'},{status:e instanceof ApiError?e.status:400,headers:{'Cache-Control':'no-store'}});}
