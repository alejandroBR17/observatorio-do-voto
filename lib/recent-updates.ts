export type UpdateItem={id:string;title:string;date:string;destination:string;kind:string};
export function updateItems(polls:any,media:any):UpdateItem[]{
 const items:UpdateItem[]=[...(polls?.polls||[]).map((p:any)=>({id:'result:'+p.id,title:p.institute+' · resultado de pesquisa',date:p.publishedAt,destination:'polls',kind:'Pesquisa'})),...(polls?.publications||[]).map((p:any)=>({id:'publication:'+p.url,title:p.title,date:p.publishedAt,destination:'polls',kind:'Publicação'})),...(media?.articles||[]).map((p:any)=>({id:'article:'+(p.url||p.id),title:p.title,date:p.publishedAt,destination:'social',kind:'Notícia'}))];
 const seen=new Set<string>();return items.filter(x=>{if(!x.title||!Number.isFinite(Date.parse(x.date))||seen.has(x.id)||Date.parse(x.date)>Date.now()+300000)return false;seen.add(x.id);return true;}).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
