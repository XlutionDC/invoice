// The previous email-based store-grant API is retired; it cannot unlock a store.
export async function GET(){return Response.json({error:'Akses toko sekarang menggunakan password.'},{status:410});}
export async function POST(){return GET();}
