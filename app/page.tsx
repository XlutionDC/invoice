import { requireChatGPTUser } from './chatgpt-auth';
import InvoiceApp from './invoice-app';
export const dynamic='force-dynamic';
export default async function Home(){const user=await requireChatGPTUser('/');return <InvoiceApp userName={user.displayName}/>;}
