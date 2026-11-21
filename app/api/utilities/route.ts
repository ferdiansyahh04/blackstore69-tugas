import {database} from '../../../db';
import {handle,json} from '../../api-utils';
import {publicUtilities} from '../../utility-store';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>json({products:publicUtilities(await database())}));}
