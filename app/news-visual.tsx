'use client';
import {useEffect,useRef,useState} from 'react';
import {BarChart3,Newspaper,MessagesSquare,Vote} from 'lucide-react';
export function NewsVisual({url,title,source}:{url:string;title:string;source:string}){
 const root=useRef<HTMLDivElement>(null),[image,setImage]=useState<string|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let canceled=false;const controller=new AbortController();const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();fetch('/api/article-image?url='+encodeURIComponent(url),{signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(!canceled&&d?.image)setImage(d.image);}).catch(()=>{});},{rootMargin:'100px'});if(root.current)observer.observe(root.current);return()=>{canceled=true;observer.disconnect();controller.abort();};},[url]);
 const topic=/debate|governo|entrevista/i.test(title)?'O debate político':/pesquisa|datafolha|quaest|atlas|poderdata/i.test(title)?'Pesquisas eleitorais':/voto|urna|turno/i.test(title)?'Na disputa presidencial':'No noticiário';const Icon=topic==='Pesquisas eleitorais'?BarChart3:topic==='O debate político'?MessagesSquare:topic==='Na disputa presidencial'?Vote:Newspaper;
 return <div ref={root} className={'news-visual '+(image&&!failed?'has-image':'')} aria-hidden="true">{image&&!failed?<img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<><div className="news-art-lines"/><Icon size={42} strokeWidth={1.25}/><span>{topic}</span><small>{source}</small></>}</div>;
}
