const h=require('http'),fs=require('fs'),p=require('path');
const mime={'html':'text/html','pdf':'application/pdf','json':'application/json','js':'text/javascript','css':'text/css','png':'image/png','jpg':'image/jpeg','ico':'image/x-icon'};
h.createServer((q,r)=>{
  let f=p.join('C:/Users/perea/agm-seccion',q.url==='/'?'index.html':decodeURIComponent(q.url));
  try{
    const d=fs.readFileSync(f);
    const ext=p.extname(f).slice(1);
    r.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Access-Control-Allow-Origin':'*'});
    r.end(d);
  }catch(e){r.writeHead(404);r.end('Not found');}
}).listen(3000,()=>console.log('OK http://localhost:3000'));
