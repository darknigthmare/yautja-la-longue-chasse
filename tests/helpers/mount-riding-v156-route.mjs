/** Pilote déterministe de test : suit des points de passage sur l'aire, sans lecture d'horloge. */
export const MOUNT_RIDE_ROUTE_V156=[{x:820,y:490},{x:820,y:130},{x:760,y:212},{x:300,y:212},{x:140,y:130},{x:140,y:490}];
export function mountRideAutopilotV156(course,route=MOUNT_RIDE_ROUTE_V156,state={i:0},sprint=false){
 while(state.i<route.length-1&&Math.hypot(course.x-route[state.i].x,course.y-route[state.i].y)<(state.i===1||state.i===4?30:40))state.i++;
 const t=route[state.i],last=state.i===route.length-1,d=Math.hypot(t.x-course.x,t.y-course.y);
 const want=Math.atan2(t.y-course.y,t.x-course.x);let diff=want-course.heading;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
 const steer=diff>.04?1:diff<-.04?-1:0;
 if(last&&d<30)return{throttle:0,steer:0,brake:true,boost:false,interact:false};
 const slow=Math.abs(diff)>.5&&Math.abs(course.speed)>40||last&&d<90&&Math.abs(course.speed)>40;
 return{throttle:slow?0:1,steer,brake:slow&&Math.abs(course.speed)>60,boost:sprint&&!slow&&Math.abs(diff)<.1,interact:false};
}
