import {HOMEWORLD_WORLD_V77,HOMEWORLD_CONNECTORS_V77,type HomeworldLevelV77} from './homeworldWorldV77';
import {homeworldCivicWalkableV80 as homeworldWalkableV77} from './homeworldCivicWorldV80';
import type {HomeworldVec2} from './homeworldCity';
export interface HomeworldWalkRouteV77 {levelId:HomeworldLevelV77;status:'reachable'|'unavailable';points:HomeworldVec2[];distance:number;}
const step=32,cols=Math.ceil(HOMEWORLD_WORLD_V77.width/step),rows=Math.ceil(HOMEWORLD_WORLD_V77.height/step);
const grid=new Map<string,boolean>();
const edges=new Map<string,boolean>();
const heapPush=(heap:{key:number;cost:number}[],node:{key:number;cost:number})=>{heap.push(node);let i=heap.length-1;while(i>0){const parent=(i-1)>>1;if(heap[parent].cost<=node.cost)break;heap[i]=heap[parent];i=parent;}heap[i]=node;};
const heapPop=(heap:{key:number;cost:number}[])=>{const result=heap[0],last=heap.pop();if(heap.length&&last){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child;}heap[i]=last;}return result;};
const position=(key:number)=>({x:key%cols*step,y:Math.floor(key/cols)*step});
const clear=(level:HomeworldLevelV77,p:HomeworldVec2,margin=12)=>homeworldWalkableV77(level,p)&&homeworldWalkableV77(level,p,{halfWidth:24+margin,halfDepth:14+margin});
export function homeworldRouteSegmentV77(level:HomeworldLevelV77,a:HomeworldVec2,b:HomeworldVec2){
 const count=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/4));
 for(let i=0;i<=count;i++){const p={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count},margin=Math.min(12,Math.hypot(p.x-a.x,p.y-a.y),Math.hypot(p.x-b.x,p.y-b.y));if(!clear(level,p,margin))return false;}return true;
}
const isNode=(level:HomeworldLevelV77,key:number)=>{const id=level+':'+key;if(!grid.has(id))grid.set(id,clear(level,position(key)));return grid.get(id)!;};
const isEdge=(level:HomeworldLevelV77,a:number,b:number)=>{const id=[level,Math.min(a,b),Math.max(a,b)].join(':');if(!edges.has(id))edges.set(id,homeworldRouteSegmentV77(level,position(a),position(b)));return edges.get(id)!;};
const anchor=(level:HomeworldLevelV77,p:HomeworldVec2)=>{
 const x=Math.round(p.x/step),y=Math.round(p.y/step),candidates=[];
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const cx=x+dx,cy=y+dy;if(cx<0||cx>=cols||cy<0||cy>=rows)continue;const key=cy*cols+cx; candidates.push({key,d:Math.hypot(cx*step-p.x,cy*step-p.y)});}
 return candidates.sort((a,b)=>a.d-b.d).find(candidate=>isNode(level,candidate.key)&&homeworldRouteSegmentV77(level,p,position(candidate.key)))?.key??null;
};
const routes=new Map<string,HomeworldWalkRouteV77>();
export function homeworldWalkRouteV77(level:HomeworldLevelV77,a:HomeworldVec2,b:HomeworldVec2):HomeworldWalkRouteV77{
 const key=[level,a.x,a.y,b.x,b.y].join(':');if(routes.has(key))return routes.get(key)!;
 const result=walkRoute(level,a,b);routes.set(key,result);return result;
}
function walkRoute(level:HomeworldLevelV77,a:HomeworldVec2,b:HomeworldVec2):HomeworldWalkRouteV77{
 const refusal={levelId:level,status:'unavailable' as const,points:[],distance:0};
 if(!homeworldWalkableV77(level,a)||!homeworldWalkableV77(level,b))return refusal;
 if(homeworldRouteSegmentV77(level,a,b))return{levelId:level,status:'reachable',points:[a,b],distance:Math.hypot(a.x-b.x,a.y-b.y)};
 const start=anchor(level,a),goal=anchor(level,b);if(start===null||goal===null)return refusal;
 const goalPoint=position(goal),score=new Map([[start,0]]),previous=new Map<number,number>(),open:{key:number;cost:number}[]=[{key:start,cost:0}],closed=new Set<number>();
 while(open.length&&closed.size<cols*rows){const current=heapPop(open).key;if(closed.has(current))continue;
  if(current===goal){const points=[b,position(goal)];let cursor=goal;while(previous.has(cursor)){cursor=previous.get(cursor)!;points.push(position(cursor));}points.push(a);points.reverse();
   return{levelId:level,status:'reachable',points,distance:points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)};}
  closed.add(current);const x=current%cols,y=Math.floor(current/cols);
  for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const cx=x+dx,cy=y+dy,key=cy*cols+cx;
   if(cx<0||cx>=cols||cy<0||cy>=rows||closed.has(key)||!isNode(level,key)||!isEdge(level,current,key))continue;
   const value=score.get(current)!+Math.hypot(dx,dy)*step;if(value>=(score.get(key)??Infinity))continue;score.set(key,value);previous.set(key,current);const next=position(key);heapPush(open,{key,cost:value+Math.hypot(next.x-goalPoint.x,next.y-goalPoint.y)});
  }
 }return refusal;
}
/** Plans a sequence of walking segments and real public connectors. There is
 * no mutation, shortcut flag, teleport, world-action callback or rank grant. */
export function homeworldWorldRouteV77(from:{levelId:HomeworldLevelV77;point:HomeworldVec2},to:{levelId:HomeworldLevelV77;point:HomeworldVec2}){
 const queue=[{...from,segments:[] as (HomeworldWalkRouteV77|{connectorId:string;reverse:boolean})[],used:new Set<string>()}];
 const visited=new Set<string>([from.levelId+':'+from.point.x+':'+from.point.y]);
 for(let i=0;i<queue.length&&i<128;i++){const state=queue[i];
  if(state.levelId===to.levelId){const walk=homeworldWalkRouteV77(state.levelId,state.point,to.point);if(walk.status==='reachable')return{status:'reachable' as const,segments:[...state.segments,walk]};}
  for(const c of HOMEWORLD_CONNECTORS_V77){if(state.used.has(c.id))continue;const reverse=c.to.levelId===state.levelId,a=reverse?c.to:c.from,b=reverse?c.from:c.to;if(a.levelId!==state.levelId)continue;
   const walk=homeworldWalkRouteV77(state.levelId,state.point,a.point);if(walk.status!=='reachable')continue;
   const id=b.levelId+':'+b.point.x+':'+b.point.y;if(visited.has(id))continue;visited.add(id);
   queue.push({levelId:b.levelId,point:b.point,segments:[...state.segments,walk,{connectorId:c.id,reverse}],used:new Set([...state.used,c.id])});
  }
 }return{status:'unavailable' as const,segments:[]};
}
