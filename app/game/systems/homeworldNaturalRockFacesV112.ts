type Point={readonly x:number;readonly y:number};
type Formation={readonly id:string;readonly polygon:readonly Point[]};
type Ground={readonly polygon:readonly Point[]};
export interface HomeworldNaturalRockFaceV112 {
  readonly id:string;readonly formationId:string;readonly edgeIndex:number;
  readonly polygon:readonly Point[];readonly top:readonly [Point,Point];readonly drop:number;
  readonly paintTop:readonly [Point,Point];readonly paintDrop:number;
}

const EPSILON=1e-7;
function verticalIntervals(x:number,polygon:readonly Point[]) {
  const cuts:number[]=[];
  for (let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    if ((a.x>x)===(b.x>x)) continue;
    cuts.push(a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x));
  }
  cuts.sort((a,b)=>a-b);
  const intervals:{top:number;bottom:number}[]=[];
  for (let i=0;i+1<cuts.length;i+=2) intervals.push({top:cuts[i],bottom:cuts[i+1]});
  return intervals;
}

/** Clip each visible front face from its REAL upper edge down to the first
 * paving it encounters. A global floor mask alone can hide the face's top and
 * leave a disconnected lower tile reappearing below the same pavement. This
 * sweep never creates such a second piece and does not alter terrain/props. */
export function homeworldNaturalRockFacesV112(formation:Formation,publicGround:readonly Ground[],depthScale:number,drop=300):readonly HomeworldNaturalRockFaceV112[] {
  const projected=publicGround.map(ground=>{
    const polygon=ground.polygon.map(point=>({x:point.x,y:point.y*depthScale}));
    return {polygon,left:Math.min(...polygon.map(point=>point.x)),right:Math.max(...polygon.map(point=>point.x)),
      top:Math.min(...polygon.map(point=>point.y)),bottom:Math.max(...polygon.map(point=>point.y))};
  });
  const result:HomeworldNaturalRockFaceV112[]=[];
  for (let edgeIndex=0;edgeIndex<formation.polygon.length;edgeIndex++) {
    const from=formation.polygon[edgeIndex],to=formation.polygon[(edgeIndex+1)%formation.polygon.length];
    if (to.x>=from.x) continue; // Same visible front edge as the retained V85 draw.
    const left=to.x,right=from.x;
    if (right-left<EPSILON) continue;
    const topAt=(x:number)=>(to.y+(from.y-to.y)*(x-left)/(right-left))*depthScale;
    const topMin=Math.min(topAt(left),topAt(right)),bottomMax=Math.max(topAt(left),topAt(right))+drop;
    const floors=projected.filter(floor=>floor.right>left&&floor.left<right&&floor.bottom>=topMin&&floor.top<=bottomMax).map(floor=>floor.polygon);
    const xs=[left,right];
    for (const floor of floors) for (let i=0;i<floor.length;i++) {
      const a=floor[i],b=floor[(i+1)%floor.length];
      if (a.x>left&&a.x<right) xs.push(a.x);
      // Break whenever a paving boundary crosses the top or original bottom.
      // Inside an interval, the first encountered boundary is one linear edge.
      for (const shift of [0,drop]) {
        const da=a.y-topAt(a.x)-shift,db=b.y-topAt(b.x)-shift;
        if (da*db<0) {
          const x=a.x+(b.x-a.x)*da/(da-db);
          if (x>left&&x<right) xs.push(x);
        }
      }
    }
    const cuts=xs.sort((a,b)=>a-b).filter((x,i,rows)=>!i||x-rows[i-1]>EPSILON);
    const available=(x:number)=>{
      const top=topAt(x);
      let height=drop;
      for (const floor of floors) for (const interval of verticalIntervals(x,floor)) {
        if (interval.top<=top+EPSILON&&interval.bottom>=top-EPSILON) return 0;
        if (interval.top>top) height=Math.min(height,interval.top-top);
      }
      return Math.max(0,height);
    };
    for (let i=1;i<cuts.length;i++) {
      const a=cuts[i-1],b=cuts[i],width=b-a;
      if (width<.01||available((a+b)/2)<.01) continue;
      const inward=Math.min(width/1000,.00001);
      const h1=available(a+inward),h2=available(b-inward);
      const upperLeft={x:a,y:topAt(a)},upperRight={x:b,y:topAt(b)};
      result.push({id:formation.id+':'+edgeIndex+':'+i,formationId:formation.id,edgeIndex,
        top:[upperLeft,upperRight],drop:Math.max(h1,h2),
        paintTop:[{x:left,y:topAt(left)},{x:right,y:topAt(right)}],paintDrop:drop,
        polygon:[upperLeft,upperRight,{x:b,y:upperRight.y+h2},{x:a,y:upperLeft.y+h1}],
      });
    }
  }
  return result;
}
