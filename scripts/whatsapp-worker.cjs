const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
process.chdir(path.resolve(__dirname,'..'));
process.loadEnvFile('.env');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
(async()=>{const {kirimdevReady}=require('../app/kirimdev.ts');if(!kirimdevReady())return;const {database}=require('../db/index.ts');const {flushWhatsApp,refreshWhatsApp}=require('../app/whatsapp.ts');const db=await database();await flushWhatsApp(db,{limit:5});await refreshWhatsApp(db,10);})().catch(()=>{console.error('WhatsApp worker gagal; periksa panel admin.');process.exitCode=1;});
