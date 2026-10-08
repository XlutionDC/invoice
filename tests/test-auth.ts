export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
let current:ChatGPTUser|null=null;
export function setUser(user:ChatGPTUser|null){current=user;}
export async function getChatGPTUser(){return current;}
