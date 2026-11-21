const path=require('node:path');
process.chdir(__dirname);
try{process.loadEnvFile(path.join(__dirname,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
process.env.NODE_ENV='production';
if(!process.env.SESSION_SECRET||!process.env.OWNER_PASSWORD_HASH)throw new Error('Jalankan npm run setup dahulu.');
const http=require('node:http');
const next=require('next');
const port=Number(process.env.PORT||3000);
const app=next({dev:false,dir:__dirname});
app.prepare().then(()=>{const handler=app.getRequestHandler();http.createServer((req,res)=>handler(req,res)).listen(port);}).catch(e=>{console.error(e);process.exit(1)});
