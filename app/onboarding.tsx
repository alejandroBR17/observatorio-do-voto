'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Bell,Check,ShieldCheck,X} from 'lucide-react';
import {candidates} from '@/lib/content';
import {useReading} from './reading';

export type WelcomeChoices={nickname:string;favorite:string;details:boolean};
export function Onboarding({nickname,favorite,onFinish,onSkip}:{nickname:string;favorite:string;onFinish:(choices:WelcomeChoices,alerts:boolean)=>boolean;onSkip:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),{reading}=useReading();
 const [step,setStep]=useState(0),[name,setName]=useState(nickname),[choice,setChoice]=useState(favorite),[details,setDetails]=useState(reading==='detailed');
 useEffect(()=>{const modal=dialog.current;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';modal?.showModal();return()=>{modal?.close();document.body.style.overflow=overflow;};},[]);
 function finish(alerts=false){onFinish({nickname:name.trim().slice(0,40),favorite:choice,details},alerts);}
 return <dialog ref={dialog} className="welcome-dialog" aria-labelledby="welcome-title" onCancel={e=>{e.preventDefault();onSkip();}}>
 <div className="welcome-top"><img src="/app-icon.svg" width="42" height="42" alt="Observatório do Voto"/><span className="eyebrow">O BRASIL, VOTO A VOTO.</span><button className="icon-button" aria-label="Pular boas-vindas" onClick={onSkip}><X size={19}/></button></div>
 <div className="welcome-progress" aria-label={`Etapa ${step+1} de 2`}><i/><i className={step===1?'complete':''}/></div>
 <div className="welcome-content" key={step}>
 {step===0?<><span className="eyebrow">BEM-VINDO AO OBSERVATÓRIO</span><h2 id="welcome-title">Um país inteiro.<br/>Seu próprio olhar.</h2><p>Acompanhe os votos, compare as pesquisas e descubra como cada região escolhe. Vamos deixar esse espaço com a sua cara?</p><label className="form-label">Como podemos chamar você? <span className="fine">Opcional</span><input autoComplete="nickname" placeholder="Nome ou apelido" maxLength={40} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setStep(1);}}/></label><p className="privacy-label"><ShieldCheck size={15}/>Suas escolhas ficam neste navegador.</p></>:<><span className="eyebrow">DO SEU JEITO</span><h2 id="welcome-title">O que você quer acompanhar?</h2><p>Você pode mudar suas escolhas depois, no Meu perfil.</p><div className="preference-options"><button aria-pressed={!choice} className={!choice?'chosen':''} onClick={()=>setChoice('')}><ShieldCheck size={20}/><span>Os dois candidatos<small>Um olhar sobre toda a eleição</small></span>{!choice&&<Check size={16}/>}</button>{candidates.map(c=><button key={c.number} aria-pressed={choice===c.number} className={choice===c.number?'chosen':''} onClick={()=>setChoice(c.number)}><img src={c.photo} alt=""/><span>{c.name}<small>{c.party}</small></span>{choice===c.number&&<Check size={16}/>}</button>)}</div><label className="alert-option"><input type="checkbox" checked={details} onChange={e=>setDetails(e.target.checked)}/><span><strong>Gosto de olhar os detalhes das pesquisas</strong><small>Mostrar metodologia e contexto ao comparar os institutos.</small></span></label><p className="fine">Os resultados oficiais são apresentados da mesma forma para todos. O tema acompanha seu sistema.</p></>}
 </div><div className="welcome-actions">{step===0?<><button className="text-button" onClick={onSkip}>Explorar agora</button><button className="button primary" onClick={()=>setStep(1)}>Personalizar<ArrowRight size={16}/></button></>:<><button className="text-button" onClick={()=>setStep(0)}>Voltar</button><button className="button primary" onClick={()=>finish()}>Começar<ArrowRight size={16}/></button></>}</div>
 {step===1&&<button className="welcome-alerts" onClick={()=>finish(true)}><Bell size={15}/>Começar e escolher meus alertas<ArrowRight size={14}/></button>}
 </dialog>;
}
