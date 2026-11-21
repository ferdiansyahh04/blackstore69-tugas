'use client';
import {useEffect,useRef,useState} from 'react';

export default function ArenaBackground(){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const phaseRef=useRef(0);
 const [paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(false);

 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(preference.matches);
  update();
  preference.addEventListener('change',update);
  return ()=>preference.removeEventListener('change',update);
 },[]);

 useEffect(()=>{
  const canvas=canvasRef.current;
  const context=canvas?.getContext('2d',{alpha:true});
  if(!canvas||!context)return;
  let width=0,height=0,frame=0,last=0;
  let hidden=document.hidden;
  const draw=()=>{
   context.clearRect(0,0,width,height);
   const phase=phaseRef.current;
   const focal=Math.min(width,height*1.7)*.85;
   const horizon=height*.36;
   const yaw=Math.sin(phase*.06)*.025;
   const project=(x:number,y:number,z:number)=>{
    const depth=z*Math.cos(yaw)+x*Math.sin(yaw);
    return {x:width*.5+(x*Math.cos(yaw)-z*Math.sin(yaw))*focal/depth,y:horizon+y*focal/depth};
   };
   const segment=(a:{x:number;y:number},b:{x:number;y:number},alpha:number)=>{
    context.strokeStyle=`rgba(198,242,99,${alpha})`;
    context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
   };
   const columns=width<600?8:12;
   const rows=14;
   const spacing=1400/columns;
   const offset=(phase*18)%110;
   const vertex=(column:number,row:number)=>{
    const x=-700+column*spacing;
    const z=220+row*110-offset;
    const y=145+Math.sin(column*.85+z*.004)*18;
    return project(x,y,z);
   };
   context.lineWidth=.8;
   for(let row=0;row<rows;row++){
    for(let column=0;column<=columns;column++){
     const point=vertex(column,row);
     const edge=Math.abs(column/columns-.5)*2;
     const alpha=(.035+edge*.1)*(1-row/(rows+3));
     segment(point,vertex(column,row+1),alpha);
     if(column<columns){
      segment(point,vertex(column+1,row),alpha);
      if(column%2===0)segment(point,vertex(column+1,row+1),alpha*.65);
     }
    }
   }
   const particles=width<600?15:30;
   for(let index=0;index<particles;index++){
    const seed=(index*137.508)%360;
    const x=(Math.sin(seed)*.48+.5)*width;
    const y=((index*73.31+phase*(1+index%3))%(height+30))-15;
    const edge=Math.abs(x/width-.5)*2;
    context.fillStyle=`rgba(198,242,99,${.08+edge*.15})`;
    context.beginPath();context.arc(x,y,index%4===0?1.6:.8,0,Math.PI*2);context.fill();
   }
  };
  const resize=()=>{
   const bounds=canvas.getBoundingClientRect();
   width=bounds.width;height=bounds.height;
   const ratio=Math.min(window.devicePixelRatio||1,width<600?1:1.5);
   canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
   context.setTransform(ratio,0,0,ratio,0,0);
   draw();
  };
  const animate=(time:number)=>{
   frame=0;
   if(hidden||paused||reduced)return;
   const interval=width<600?1000/15:1000/24;
   if(!last||time-last>=interval){
    phaseRef.current+=last?Math.min((time-last)/1000,.1):0;
    last=time;draw();
   }
   frame=requestAnimationFrame(animate);
  };
  const visibility=()=>{
   hidden=document.hidden;
   if(frame)cancelAnimationFrame(frame);
   frame=0;last=0;
   if(!hidden&&!paused&&!reduced)frame=requestAnimationFrame(animate);
  };
  const observer=new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener('visibilitychange',visibility);
  resize();
  if(!hidden&&!paused&&!reduced&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)frame=requestAnimationFrame(animate);
  return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);if(frame)cancelAnimationFrame(frame);};
 },[paused,reduced]);

 return <>
  <div className="front-atmosphere" aria-hidden="true"><canvas ref={canvasRef}/></div>
  {reduced?<span className="front-motion-static">Latar statis</span>:<button className="front-motion-control" type="button" aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Gerakkan latar':'Jeda latar'}</button>}
 </>;
}
