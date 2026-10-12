export const handler=async event=>{
 const reply=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(data)});
 if(event.httpMethod!=='POST')return reply(405,{message:'지원하지 않는 요청입니다.'});
 if((event.body||'').length>4096)return reply(413,{message:'입력 내용이 너무 깁니다.'});
 let data;try{data=JSON.parse(event.body||'{}');}catch{return reply(400,{message:'입력 내용을 확인해 주세요.'});}
 const email=String(data.email||'').trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return reply(400,{message:'올바른 이메일 주소를 입력해 주세요.'});
 if(!process.env.BUYER_EMAILS_JSON)return reply(503,{message:'구매자 명단 설정이 아직 연결되지 않았습니다.'});
 let emails;try{emails=JSON.parse(process.env.BUYER_EMAILS_JSON);if(!Array.isArray(emails)||emails.some(value=>typeof value!=='string'))throw Error();}catch{return reply(503,{message:'구매자 명단 설정을 확인해 주세요.'});}
 return reply(200,{eligible:emails.some(value=>value.trim().toLowerCase()===email)});
};
