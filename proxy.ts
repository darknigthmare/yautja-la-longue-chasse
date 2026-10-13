import {NextResponse} from 'next/server';

/** Local QA responses are decided before the streamed app/layout tree. */
export function proxy(){
 if(process.env.YAUTJA_LOCAL_VISUAL_QA_V90==='1'&&process.env.VERCEL!=='1')return NextResponse.next();
 return new NextResponse('Not found',{status:404,headers:{
  'Cache-Control':'private, no-store',
  'Content-Type':'text/plain; charset=utf-8',
  'X-Robots-Tag':'noindex, nofollow',
 }});
}

// Literal, statically analysed scope: game, API and asset routes are untouched.
export const config={matcher:['/visual-qa-v90/:path*','/solo-qa-v92/:path*','/clan-war-qa-v92/:path*']};
