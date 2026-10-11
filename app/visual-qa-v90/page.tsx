import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import VisualQaV90 from './client';

export const metadata:Metadata={title:'QA visuelle synthétique V90',robots:{index:false,follow:false}};
// Cache Components is not enabled here. Recheck the private server flag on
// every request without suspending before the rejected route's 404 decision.
export const dynamic='force-dynamic';

/** This server-only opt-in never accepts a browser, query or campaign flag. */
export default function LocalVisualQaV90Page(){
 if(process.env.YAUTJA_LOCAL_VISUAL_QA_V90!=='1'||process.env.VERCEL==='1')notFound();
 return <VisualQaV90/>;
}
