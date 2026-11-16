import VesselDashboard from '../vessel-dashboard';
import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function VesselPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const query=new URLSearchParams();for(const [key,value] of Object.entries(params??{}))if(typeof value==='string')query.set(key,value);await requireChatGPTUser('/vessel'+(query.size?'?'+query:''));return <VesselDashboard/>;}
