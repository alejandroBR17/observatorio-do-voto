export const num = (value: unknown) => Number(String(value ?? 0).replace(',', '.'));
export type Candidate = { number: string; name: string; party: string; votes: number; percent: number; status: string; elected: boolean; photo?: string };
export type Result = { year: number; turn: number; uf: string; source: string; generated: string; id: string; counted: number; electorate: number; remaining: number; turnout: number; abstention: number; blank: number; nullVotes: number; valid: number; candidates: Candidate[]; final: boolean };
export function normalize(raw: any, source: string, year = 2026): Result {
 if(raw.f !== 'o' || String(raw.carg?.[0]?.cd) !== '1' || !['1','2'].includes(String(raw.t))) throw new Error('Arquivo não oficial ou cargo inesperado.');
 for(const value of [raw.e?.te,raw.e?.esnt,raw.v?.vv,raw.s?.pstn??raw.s?.pst])if(value===undefined||!Number.isFinite(num(value))||num(value)<0)throw new Error('Arquivo incompleto ou estatísticas inválidas.');
 if(num(raw.e.esnt)>num(raw.e.te)||num(raw.s.pstn??raw.s.pst)>100)throw new Error('Estatísticas fora dos limites.');
 const candidates: Candidate[] = raw.carg[0].agr.flatMap((a:any)=>a.par.flatMap((p:any)=>(p.cand||[]).map((c:any)=>({ number:String(c.n), name:c.nmu||c.nm, party:p.sg, votes:num(c.vap), percent:num(c.pvapn??c.pvap), status:c.st, elected:c.e==='s' && /eleit/i.test(c.st), photo:`https://resultados.tse.jus.br/oficial/ele${year}/${raw.ele}/fotos/br/${c.sqcand}.jpeg` })))).sort((a:Candidate,b:Candidate)=>b.votes-a.votes);
 if(candidates.some(c=>!Number.isSafeInteger(c.votes)||c.votes<0||c.percent<0||c.percent>100))throw new Error('Votação inválida.');
 return {year,turn:num(raw.t),uf:String(raw.cdabr).toUpperCase(),source,generated:`${raw.dg} ${raw.hg} (Brasília)`,id:String(raw.idg),counted:num(raw.s.pstn??raw.s.pst),electorate:num(raw.e.te),remaining:num(raw.e.esnt),turnout:num(raw.e.c),abstention:num(raw.e.pan??raw.e.pa),blank:num(raw.v.vb),nullVotes:num(raw.v.tvn),valid:num(raw.v.vv),candidates,final:raw.and==='f'};
}
export function victory(result:Result){
 const sorted=[...result.candidates].sort((a,b)=>b.votes-a.votes);
 if(result.turn!==2 || sorted.length!==2)return {kind:'waiting',message:'Definição de vitória disponível apenas no segundo turno.'};
 const elected=sorted.find(c=>c.elected);
 if(elected)return {kind:'official',message:`${elected.name}: eleito conforme o TSE.`};
 if(sorted[0].votes-sorted[1].votes>result.remaining)return {kind:'mathematical',message:`Vantagem numericamente irreversível de ${sorted[0].name}, condicionada aos dados atuais. Aguardando confirmação do TSE.`};
 return {kind:'partial',message:'Resultado em aberto. A ordem de apuração não é uma amostra aleatória.'};
}
export const states=[['11','RO','Rondônia','Norte'],['12','AC','Acre','Norte'],['13','AM','Amazonas','Norte'],['14','RR','Roraima','Norte'],['15','PA','Pará','Norte'],['16','AP','Amapá','Norte'],['17','TO','Tocantins','Norte'],['21','MA','Maranhão','Nordeste'],['22','PI','Piauí','Nordeste'],['23','CE','Ceará','Nordeste'],['24','RN','Rio Grande do Norte','Nordeste'],['25','PB','Paraíba','Nordeste'],['26','PE','Pernambuco','Nordeste'],['27','AL','Alagoas','Nordeste'],['28','SE','Sergipe','Nordeste'],['29','BA','Bahia','Nordeste'],['31','MG','Minas Gerais','Sudeste'],['32','ES','Espírito Santo','Sudeste'],['33','RJ','Rio de Janeiro','Sudeste'],['35','SP','São Paulo','Sudeste'],['41','PR','Paraná','Sul'],['42','SC','Santa Catarina','Sul'],['43','RS','Rio Grande do Sul','Sul'],['50','MS','Mato Grosso do Sul','Centro-Oeste'],['51','MT','Mato Grosso','Centro-Oeste'],['52','GO','Goiás','Centro-Oeste'],['53','DF','Distrito Federal','Centro-Oeste']];
