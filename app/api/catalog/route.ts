import {getChatGPTUser} from '../../chatgpt-auth';
import {handle,json} from '../../api-utils';
import {catalogFor} from '../../server-catalog';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>json({games:await catalogFor((await getChatGPTUser())?.userId??null)}));}
