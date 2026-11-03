import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import SoloQaV92 from './client';

export const metadata:Metadata={title:'QA locale jouable solo V92',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';

/** Private server opt-in only, reread before rendering or suspending. Query,
 * cookie, browser storage and campaign flags cannot enable this route. */
export default function LocalSoloQaV92Page(){
 if(process.env.YAUTJA_LOCAL_VISUAL_QA_V90!=='1'||process.env.VERCEL==='1')notFound();
 return <SoloQaV92/>;
}
