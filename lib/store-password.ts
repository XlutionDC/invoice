import {sqlDb} from '@/db';
const encoder=new TextEncoder();
export const STORE_COOKIE='__Host-luxora-store';
export const SESSION_MS=12*60*60*1000;
const hex=(v:ArrayBuffer)=>[...new Uint8Array(v)].map(b=>b.toString(16).padStart(2,'0')).join('');
export function salt(){return [...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function passwordHash(password:string,saltHex:string){const saltBytes=Uint8Array.from(saltHex.match(/../g)!.map(h=>parseInt(h,16)));const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:100000,hash:'SHA-256'},key,256));}
export async function tokenHash(token:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(token)));}
export function secureEqual(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export function readToken(req?:Request){const token=(req?.headers.get('cookie')||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(STORE_COOKIE+'='))?.slice(STORE_COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null;}
export function sessionCookie(token:string,maxAge=SESSION_MS/1000){return `${STORE_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=None; Partitioned`;}
export async function sessionShops(req:Request|undefined,userId:string){const token=readToken(req);if(!token)return [];const r=await sqlDb().prepare(`SELECT s.shop_id FROM store_sessions s JOIN store_credentials c ON c.shop_id=s.shop_id AND c.version=s.credential_version WHERE s.token_hash=? AND s.user_id=? AND s.expires_at>?`).bind(await tokenHash(token),userId,Date.now()).first<any>();return r?[r.shop_id]:[];}
