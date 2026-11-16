import {getChatGPTUser} from '@/app/chatgpt-auth';
import {connectionState} from '@/lib/vessel-source';
export const dynamic='force-dynamic';
export async function GET(){if(!await getChatGPTUser())return Response.json({error:'Sign in to check the connection.'},{status:401});return Response.json(connectionState(),{headers:{'Cache-Control':'private, no-store'}});}
const denied=()=>Response.json({error:'Core integration permits vessel reads only.'},{status:405});
export const POST=denied;export const PUT=denied;export const PATCH=denied;export const DELETE=denied;
