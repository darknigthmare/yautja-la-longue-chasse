export type HomeworldMarshJointPointV113={readonly x:number;readonly y:number};
type Point=HomeworldMarshJointPointV113;
export type HomeworldMarshJointSourceV113={readonly id:string;readonly levelId:string;readonly polygon:readonly Point[]};
type Edge={readonly groundId:string;readonly edgeIndex:number;readonly a:Point;readonly b:Point};
type Boundary={readonly edge:Edge;readonly x:number};
type Interval={left:Boundary;right:Boundary;groundIds:string[]};
type Gap={left:Boundary;right:Boundary};
type Site={readonly id:'rampart-upper'|'rampart-lower'|'dock-road';readonly minY:number;readonly maxY:number;
  readonly sourceGroundIds:readonly string[];readonly mode:'between-rampart-and-causeway'|'east-of-dock-road'};

export interface HomeworldMarshGroundJointV113 {
  readonly id:string;
  readonly label:string;
  readonly levelId:'0';
  readonly kind:'passage';
  readonly accent:string;
  readonly siteId:Site['id'];
  readonly sourceGroundIds:readonly string[];
  /** These exact ground points must feed both the paving and terrain index. */
  readonly polygon:readonly [Point,Point,Point,Point];
  readonly area:number;
  readonly maxGapWidth:number;
  readonly witness:Point;
  readonly bounds:{readonly left:number;readonly top:number;readonly right:number;readonly bottom:number;
    readonly width:number;readonly depth:number};
  readonly sourceWitness:{readonly left:Edge;readonly right:Edge;readonly sample:Point;readonly width:number};
}

export interface HomeworldMarshGroundJointPlanV113 {
  readonly joints:readonly HomeworldMarshGroundJointV113[];
  readonly sites:readonly Site[];
  readonly sourceGeometry:readonly {readonly groundId:string;readonly polygon:readonly Point[]}[];
  readonly limits:{readonly maxGap:number;readonly rampartMaxY:number;readonly dockMinY:number;readonly dockMaxY:number};
}

const EPSILON=1e-7;
export const HOMEWORLD_MARSH_GROUND_JOINT_LIMITS_V113={maxGap:64,rampartMaxY:3460,dockMinY:2450,dockMaxY:3160} as const;
const ids={rampart:'rampart-walk',causeway:'rampart-low-causeway:2',court:'forecourt-v76:rampart-watch',road:'port-marches-road:1'};
const bounds=(polygon:readonly Point[])=>({left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),
  top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y))});
const xAt=(edge:Edge,y:number)=>edge.a.x+(edge.b.x-edge.a.x)*(y-edge.a.y)/(edge.b.y-edge.a.y);
const unique=(values:readonly number[])=>[...values].sort((a,b)=>a-b).filter((value,i,all)=>!i||value-all[i-1]>EPSILON);
function verticalCuts(x:number,polygon:readonly Point[]) {
  return polygon.flatMap((a,i)=>{
    const b=polygon[(i+1)%polygon.length];
    return (a.x>x)===(b.x>x)?[]:[a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x)];
  }).sort((a,b)=>a-b);
}
function jointPolygon(gap:Gap,top:number,bottom:number):[Point,Point,Point,Point] {
  // Stable cross-sections include the repeated corner of a triangular end.
  return [{x:xAt(gap.left.edge,top),y:top},{x:xAt(gap.right.edge,top),y:top},
    {x:xAt(gap.right.edge,bottom),y:bottom},{x:xAt(gap.left.edge,bottom),y:bottom}];
}
function polygonArea(polygon:readonly Point[]):number {
  return Math.abs(polygon.reduce((sum,a,i)=>{
    const b=polygon[(i+1)%polygon.length];
    return sum+a.x*b.y-b.x*a.y;
  },0))/2;
}

/** Pure geometry compilation: the caller supplies the retained ground, pads
 * and urban polygons after their initialization. There is no World/Natural
 * import, hidden support or drawing-only paving. Mount the returned records
 * once in the same public-ground array used by rendering and actor support.
 * Existing source polygons are read without mutation. */
export function planHomeworldMarshGroundJointsV113(input:readonly HomeworldMarshJointSourceV113[]):HomeworldMarshGroundJointPlanV113 {
  const grounds=input.filter(item=>item.levelId==='0');
  if(new Set(grounds.map(item=>item.id)).size!==grounds.length)throw new Error('Duplicate marsh source ground identity');
  if(grounds.some(item=>item.id.startsWith('ground-joint-v113:')))throw new Error('Compile marsh joints once from retained source ground');
  const ground=(id:string)=>{
    const result=grounds.find(item=>item.id===id);
    if(!result)throw new Error('Missing source ground for marsh joint: '+id);
    return result;
  };
  const causewayX=bounds(ground(ids.causeway).polygon).left,roadX=bounds(ground(ids.road).polygon).right;
  const rampartCuts=verticalCuts(causewayX,ground(ids.rampart).polygon),courtCuts=verticalCuts(causewayX,ground(ids.court).polygon);
  if(rampartCuts.length!==2||courtCuts.length!==2)throw new Error('Changed marsh source topology requires a joint review');
  const limits=HOMEWORLD_MARSH_GROUND_JOINT_LIMITS_V113;
  const sites:readonly Site[]=[
    {id:'rampart-upper',minY:Math.max(...rampartCuts),maxY:courtCuts[0],sourceGroundIds:[ids.rampart,ids.causeway,ids.court],mode:'between-rampart-and-causeway'},
    {id:'rampart-lower',minY:courtCuts[1],maxY:limits.rampartMaxY,sourceGroundIds:[ids.rampart,ids.causeway,ids.court],mode:'between-rampart-and-causeway'},
    {id:'dock-road',minY:limits.dockMinY,maxY:limits.dockMaxY,sourceGroundIds:[ids.road],mode:'east-of-dock-road'},
  ];
  const studyBounds={left:causewayX-limits.maxGap,right:roadX+limits.maxGap,
    top:Math.min(...sites.map(site=>site.minY)),bottom:limits.rampartMaxY};
  const localGrounds=grounds.filter(item=>{
    const b=bounds(item.polygon);
    return b.right>=studyBounds.left&&b.left<=studyBounds.right&&b.bottom>=studyBounds.top&&b.top<=studyBounds.bottom;
  });
  const edges:readonly Edge[]=localGrounds.flatMap(item=>item.polygon.map((a,i)=>({groundId:item.id,edgeIndex:i,a,b:item.polygon[(i+1)%item.polygon.length]})));

  function intervalsAt(y:number):Interval[] {
    return localGrounds.flatMap(item=>{
      const cuts=edges.filter(edge=>edge.groundId===item.id&&(edge.a.y>y)!==(edge.b.y>y))
        .map(edge=>({edge,x:xAt(edge,y)})).sort((a,b)=>a.x-b.x);
      const intervals:Interval[]=[];
      for(let i=0;i+1<cuts.length;i+=2)intervals.push({left:cuts[i],right:cuts[i+1],groundIds:[item.id]});
      return intervals;
    }).sort((a,b)=>a.left.x-b.left.x||a.right.x-b.right.x);
  }
  function publicUnionAt(y:number):Interval[] {
    const result:Interval[]=[];
    for(const interval of intervalsAt(y)) {
      const prior=result.at(-1);
      if(!prior||interval.left.x>prior.right.x+EPSILON)result.push({...interval,groundIds:[...interval.groundIds]});
      else {
        if(interval.right.x>prior.right.x)prior.right=interval.right;
        prior.groundIds.push(...interval.groundIds);
      }
    }
    return result;
  }
  function gapsAt(site:Site,y:number):Gap[] {
    const union=publicUnionAt(y);
    if(site.mode==='east-of-dock-road') {
      const index=union.findIndex(interval=>interval.groundIds.includes(ids.road)),current=union[index],next=union[index+1];
      // A crossing route that already extends this road is not a new joint.
      return current&&next&&Math.abs(current.right.x-roadX)<EPSILON?[{left:current.right,right:next.left}]:[];
    }
    const left=union.findIndex(interval=>interval.groundIds.includes(ids.rampart));
    const right=union.findIndex(interval=>interval.groundIds.includes(ids.causeway));
    if(left<0||right<=left)return[];
    return union.slice(left,right).map((interval,i)=>({left:interval.right,right:union[left+i+1].left}));
  }
  function intersectionY(a:Edge,b:Edge):number|null {
    const ax=a.b.x-a.a.x,ay=a.b.y-a.a.y,bx=b.b.x-b.a.x,by=b.b.y-b.a.y,denominator=ax*by-ay*bx;
    if(Math.abs(denominator)<EPSILON)return null;
    const dx=b.a.x-a.a.x,dy=b.a.y-a.a.y,t=(dx*by-dy*bx)/denominator,u=(dx*ay-dy*ax)/denominator;
    if(t<-EPSILON||t>1+EPSILON||u<-EPSILON||u>1+EPSILON)return null;
    const x=a.a.x+t*ax;
    return x>=studyBounds.left-EPSILON&&x<=studyBounds.right+EPSILON?a.a.y+t*ay:null;
  }
  function sliceCuts(site:Site):number[] {
    const cuts=[site.minY,site.maxY,...edges.flatMap(edge=>[edge.a.y,edge.b.y])];
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
      const y=intersectionY(edges[i],edges[j]);
      if(y!==null)cuts.push(y);
    }
    const initial=unique(cuts.filter(y=>y>=site.minY-EPSILON&&y<=site.maxY+EPSILON)),widthCuts:number[]=[];
    for(let i=1;i<initial.length;i++) {
      const top=initial[i-1],bottom=initial[i];
      for(const gap of gapsAt(site,(top+bottom)/2)) {
        const widthAt=(y:number)=>xAt(gap.right.edge,y)-xAt(gap.left.edge,y);
        const first=widthAt(top)-limits.maxGap,last=widthAt(bottom)-limits.maxGap;
        if(first*last<0)widthCuts.push(top+(bottom-top)*first/(first-last));
      }
    }
    return unique([...initial,...widthCuts]);
  }
  const labels={'rampart-upper':'Joint physique · remparts hauts','rampart-lower':'Joint physique · remparts bas','dock-road':'Joint physique · contrôle des quais'};
  const joints=sites.flatMap(site=>{
    const cuts=sliceCuts(site),strips:{gap:Gap;top:number;bottom:number}[]=[];
    const tails=new Map<string,{gap:Gap;top:number;bottom:number}>();
    for(let i=1;i<cuts.length;i++) {
      const top=cuts[i-1],bottom=cuts[i],y=(top+bottom)/2;
      if(bottom-top<EPSILON)continue;
      for(const gap of gapsAt(site,y)) {
        const width=gap.right.x-gap.left.x;
        if(width<EPSILON||width>limits.maxGap+EPSILON)continue;
        const key=[gap.left.edge.groundId,gap.left.edge.edgeIndex,gap.right.edge.groundId,gap.right.edge.edgeIndex].join(':');
        const prior=tails.get(key);
        if(prior&&Math.abs(prior.bottom-top)<EPSILON)prior.bottom=bottom;
        else {const strip={gap,top,bottom};strips.push(strip);tails.set(key,strip);}
      }
    }
    return strips.map(({gap,top,bottom},index):HomeworldMarshGroundJointV113=>{
      const polygon=jointPolygon(gap,top,bottom),box=bounds(polygon),y=(top+bottom)/2;
      const left=xAt(gap.left.edge,y),right=xAt(gap.right.edge,y),witness={x:(left+right)/2,y};
      return {id:'ground-joint-v113:'+site.id+':'+index,label:labels[site.id],levelId:'0',kind:'passage',accent:'#ab8f63',siteId:site.id,
        sourceGroundIds:[...new Set([...site.sourceGroundIds,gap.left.edge.groundId,gap.right.edge.groundId])],polygon,area:polygonArea(polygon),
        maxGapWidth:Math.max(xAt(gap.right.edge,top)-xAt(gap.left.edge,top),xAt(gap.right.edge,bottom)-xAt(gap.left.edge,bottom)),witness,
        bounds:{...box,width:box.right-box.left,depth:box.bottom-box.top},
        sourceWitness:{left:gap.left.edge,right:gap.right.edge,sample:witness,width:right-left}};
    });
  });
  return {joints,sites,sourceGeometry:localGrounds.map(item=>({groundId:item.id,polygon:item.polygon})),limits};
}

/** Explicit small physical joints only: source intersections bound every
 * cell, retained court/routes stop the sweep and gaps wider than 64 units
 * remain untouched. No old polygon, object or native raster is changed. */
export function compileHomeworldMarshGroundJointsV113(grounds:readonly HomeworldMarshJointSourceV113[]):readonly HomeworldMarshGroundJointV113[] {
  return planHomeworldMarshGroundJointsV113(grounds).joints;
}
