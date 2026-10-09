'use client';
import {useEffect,useState} from 'react';
import {flushSync} from 'react-dom';

export const reducedMotion=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scrollBehavior():ScrollBehavior{return reducedMotion()?'auto':'smooth';}
// Keep exiting surfaces mounted until their CSS animation finishes.
export function usePresence(open:boolean,duration=260){
 const [mounted,setMounted]=useState(open);
 useEffect(()=>{if(open){setMounted(true);return;}const timer=setTimeout(()=>setMounted(false),reducedMotion()?0:duration);return()=>clearTimeout(timer);},[open,duration]);
 return open||mounted;
}
let active:ViewTransition|undefined;
let revision=0;
export function transitionPage(update:()=>void){
 const current=++revision;
 active?.skipTransition();
 if(reducedMotion()||typeof document.startViewTransition!=='function'){update();return;}
 active=document.startViewTransition(()=>{if(current===revision)flushSync(update);});
 // A superseded transition is expected when someone navigates quickly.
 void active.ready.catch(()=>{});
 void active.finished.catch(()=>{});
}
