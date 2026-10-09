'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';
import {usePresence,reducedMotion,scrollBehavior} from './motion';
export function Disclosure({title,summary,children,defaultOpen=false}:{title:string;summary?:string;children:React.ReactNode;defaultOpen?:boolean}){
 const [open,setOpen]=useState(defaultOpen),id=useId(),root=useRef<HTMLElement>(null),button=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),present=usePresence(open);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function toggle(){if(timer.current)clearTimeout(timer.current);const closing=open;setOpen(!open);if(closing){button.current?.focus({preventScroll:true});timer.current=setTimeout(()=>{if(root.current&&root.current.getBoundingClientRect().top<85)root.current.scrollIntoView({block:'start',behavior:scrollBehavior()});},reducedMotion()?0:260);}}
 return <section className="panel disclosure-panel" ref={root}><button className="disclosure-heading" ref={button} onClick={toggle} aria-expanded={open} aria-controls={id}><div><h2>{title}</h2>{summary&&<p>{summary}</p>}</div><span>{open?'Ver menos':'Ver mais'}<ChevronDown className="disclosure-chevron" size={17}/></span></button><div id={id} className="motion-grid" data-open={open} inert={!open} aria-hidden={!open}><div className="motion-clip">{present&&<div className="disclosure-body">{children}<button className="collapse-bottom" onClick={toggle}>Ver menos · {title}<ChevronUp size={15}/></button></div>}</div></div></section>;
}
export function ExpandList<T>({items,initial=6,render,moreLabel='Ver mais',lessLabel='Ver menos',className}:{items:T[];initial?:number;render:(item:T,index:number)=>React.ReactNode;moreLabel?:string;lessLabel?:string;className?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),id=useId(),present=usePresence(open),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function toggle(){if(timer.current)clearTimeout(timer.current);const closing=open;setOpen(!open);if(closing)timer.current=setTimeout(()=>{if(root.current&&root.current.getBoundingClientRect().top<85)root.current.scrollIntoView({block:'start',behavior:scrollBehavior()});},reducedMotion()?0:260);}
 return <div className="expand-list" ref={root}><div className={className}>{items.slice(0,initial).map(render)}</div><div id={id} className="motion-grid" data-open={open} inert={!open} aria-hidden={!open}><div className="motion-clip">{present&&<div className={(className||'')+' expand-extra'}>{items.slice(initial).map((item,index)=>render(item,index+initial))}</div>}</div></div>{items.length>initial&&<button className="expand-button" onClick={toggle} aria-expanded={open} aria-controls={id}>{open?lessLabel:`${moreLabel} (${items.length-initial})`}<ChevronDown className="disclosure-chevron" size={16}/></button>}</div>;
}
