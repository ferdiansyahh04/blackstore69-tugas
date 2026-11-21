const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const target=path.join(root,'.env');
if(fs.existsSync(target)){console.error('.env sudah ada. Setup tidak menimpa konfigurasi.');process.exit(1);}
const pass=crypto.randomBytes(18).toString('base64url');const salt=crypto.randomBytes(16).toString('hex');
const env=['SITE_ORIGIN=https://blackstore69.web.id','SESSION_SECRET='+crypto.randomBytes(48).toString('hex'),'OWNER_PASSWORD_SALT='+salt,'OWNER_PASSWORD_HASH='+crypto.scryptSync(pass,salt,64).toString('hex'),'DATA_DIR='+path.join(root,'data')].join('\n')+'\n';
fs.writeFileSync(target,env,{mode:0o600,flag:'wx'});fs.mkdirSync(path.join(root,'data'),{recursive:true,mode:0o700});
console.log('Konfigurasi dibuat. Simpan password ini di pengelola password; jangan kirim ke chat.');
console.log('Login pemilik: https://blackstore69.web.id/masuk');
console.log('Password: '+pass);
