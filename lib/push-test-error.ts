export function pushTestFailure(error:unknown,phase:'storage'|'delivery'){
 const code=(error as {statusCode?:number})?.statusCode;
 if(phase==='delivery'&&(code===404||code===410))return {status:410,code:'expired',error:'Esta inscrição expirou no provedor. Ative as notificações novamente para renovar.'};
 if(phase==='delivery'&&(code===401||code===403))return {status:409,code:'subscription_mismatch',error:'O provedor rejeitou a identificação desta inscrição. Renove as notificações neste aparelho.'};
 if(phase==='delivery'&&code===429)return {status:503,code:'provider_busy',error:'O provedor está limitando os envios. Aguarde um minuto e tente novamente.'};
 return {status:503,code:phase==='storage'?'storage_unavailable':'delivery_unavailable',error:phase==='storage'?'O serviço de inscrições está temporariamente indisponível. Tente novamente em instantes.':'Não foi possível concluir o envio ao provedor nesta tentativa. Confira a conexão e tente novamente em um minuto.'};
}
