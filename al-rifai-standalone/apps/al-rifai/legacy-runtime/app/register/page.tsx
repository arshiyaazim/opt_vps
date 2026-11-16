import VesselDashboard from '../vessel-dashboard';
import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const query=new URLSearchParams();for(const [k,v] of Object.entries(params??{}))if(typeof v==='string')query.set(k,v);await requireChatGPTUser('/register'+(query.size?'?'+query:''));return <VesselDashboard/>;}
