export function downloadJson(value:unknown,name:string){downloadFile(JSON.stringify(value,null,2),'application/json;charset=utf-8',name);}
export function downloadCsv(rows:(string|number|null|undefined)[][],name:string){
 const csv='\ufeff'+rows.map(row=>row.map(value=>{
  const text=value==null?'':String(value),safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(text)?"'"+text:text;
  return '"'+safe.replace(/"/g,'""')+'"';
 }).join(';')).join('\r\n');
 downloadFile(csv,'text/csv;charset=utf-8',name);
}
function downloadFile(value:string,type:string,name:string){
 const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
