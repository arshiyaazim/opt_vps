import {requireChatGPTUser} from '../chatgpt-auth';
import ConversationInspector from './inspector';
export const dynamic='force-dynamic';
export default async function Conversations(){await requireChatGPTUser('/conversations');return <ConversationInspector/>;}
