#!/usr/bin/env python3
"""Run on the VPS terminal. Never pass the API key as a CLI argument."""
import getpass,json,os,re,shutil,subprocess,sys,time,urllib.request,urllib.error
from pathlib import Path
ROOT=Path('/opt/blackstore-app')
BASE='https://api.kirimdev.com/v1'
NAME='blackstore69_order_update_v1'
BODY='Informasi pesanan black.store69\n\nNomor pesanan: {{1}}\nProduk: {{2}}\nTujuan: {{3}}\nTotal pembayaran: {{4}}\nStatus pesanan: {{5}}\n\nLihat invoice dan detail pesanan: {{6}}\n\nPesan ini dikirim karena Anda memilih menerima pemberitahuan pesanan melalui WhatsApp.'
class APIError(Exception):
 def __init__(self,status,code): self.status=status;super().__init__('Kirimdev HTTP %s (%s)'%(status,code))
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect)
def request(key,path,body=None):
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'blackstore69-integration/1.0'})
 try:
  with opener.open(req,timeout=20) as response:return json.load(response)
 except urllib.error.HTTPError as e:
  try:code=json.load(e).get('error',{}).get('code','request_failed')
  except Exception:code='request_failed'
  if not re.fullmatch(r'[\w.-]{1,100}',str(code)):code='request_failed'
  raise APIError(e.code,code) from None
 except Exception:raise RuntimeError('Koneksi/respons API tidak dapat diverifikasi. Coba kembali.') from None

def resolve_pm2():
 output=subprocess.run(['pm2','jlist'],check=True,capture_output=True,text=True).stdout
 rows=None
 for line in output.splitlines():
  if line.startswith('[{') or line.strip()=='[]':
   try:rows=json.loads(line)
   except Exception:pass
 if rows is None:raise RuntimeError('Daftar proses PM2 tidak dapat dibaca.')
 matches=[row for row in rows if row.get('pm2_env',{}).get('pm_exec_path')==str(ROOT/'app.js')]
 if len(matches)!=1:raise RuntimeError('Proses website di PM2 tidak unik atau tidak ditemukan.')
 return str(matches[0]['pm_id'])

def load_current():
 code="process.loadEnvFile('.env'); console.log(JSON.stringify(Object.fromEntries(['KIRIMDEV_API_KEY','KIRIMDEV_PHONE_NUMBER_ID'].map(k=>[k,process.env[k]||'']))))"
 return json.loads(subprocess.run(['node','-e',code],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
def save(values):
 env=ROOT/'.env';backup=Path('/opt/blackstore-backups')/('kirimdev-'+str(time.time_ns()));backup.mkdir(mode=0o700,parents=True);shutil.copy2(env,backup/'.env');os.chmod(backup/'.env',0o600)
 text=env.read_text();lines=[line for line in text.splitlines() if not any(re.match(r'^\s*(?:export\s+)?'+re.escape(k)+r'\s*=',line) for k in values)]
 lines.extend(k+'='+json.dumps(v) for k,v in values.items());temp=ROOT/'.env.kirimdev.tmp'
 fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n');f.flush();os.fsync(f.fileno())
 os.replace(temp,env)
 # Override any old values retained in the PM2 process environment.
 restart_env=os.environ.copy();restart_env.update(values)
 subprocess.run(['pm2','restart',resolve_pm2(),'--update-env'],env=restart_env,check=True,stdout=subprocess.DEVNULL)
 subprocess.run(['pm2','save'],check=True,stdout=subprocess.DEVNULL)
 print('Konfigurasi tersimpan; proses website sudah dimuat ulang. Cadangan:',backup)

def main():
 if os.geteuid()!=0:raise RuntimeError('Jalankan sebagai root pada VPS.')
 if not sys.stdin.isatty():raise RuntimeError('Jalankan secara interaktif di terminal VPS.')
 print('Aktivasi WhatsApp Kirimdev black.store69. Tidak mengirim pesan tes atau invoice lama.')
 resolve_pm2()
 current=load_current();key=getpass.getpass('API key Kirimdev'+(' [Enter = gunakan yang tersimpan]' if current.get('KIRIMDEV_API_KEY') else '')+': ').strip() or current.get('KIRIMDEV_API_KEY','')
 if not key or any(c.isspace() for c in key):raise RuntimeError('API key tidak boleh kosong atau mengandung spasi.')
 identity=request(key,'/me')
 if not isinstance(identity.get('data'),dict) or not identity['data'].get('organization'):raise RuntimeError('Identitas API belum terverifikasi.')
 accounts=[];cursor=None
 for _ in range(20):
  from urllib.parse import quote
  result=request(key,'/accounts'+('?cursor='+quote(cursor,safe='') if cursor else ''))
  accounts.extend(a for a in result.get('data',[]) if isinstance(a,dict) and str(a.get('status','')).lower()=='connected')
  if not result.get('has_more'):break
  cursor=result.get('next_cursor')
  if not isinstance(cursor,str) or not cursor:raise RuntimeError('Daftar akun tidak lengkap.')
 else:raise RuntimeError('Terlalu banyak akun; batasi akses key ke akun bisnis yang digunakan.')
 if not accounts:raise RuntimeError('Belum ada nomor WhatsApp berstatus connected.')
 for i,a in enumerate(accounts,1):print('%d. %s | %s | Phone Number ID: %s'%(i,a.get('name',''),a.get('phone_number',''),a.get('phone_number_id','')))
 default=next((i for i,a in enumerate(accounts,1) if str(a.get('phone_number_id'))==current.get('KIRIMDEV_PHONE_NUMBER_ID')),1)
 choice=input('Pilih nomor pengirim [%d]: '%default).strip();index=int(choice or default)
 if not 1<=index<=len(accounts):raise RuntimeError('Pilihan nomor tidak valid.')
 phone=str(accounts[index-1]['phone_number_id'])
 if not re.fullmatch(r'\d+',phone):raise RuntimeError('Phone Number ID tidak valid.')
 values={'KIRIMDEV_API_KEY':key,'KIRIMDEV_PHONE_NUMBER_ID':phone,'KIRIMDEV_ENABLED':'false','KIRIMDEV_TEMPLATE_APPROVED':'false','FONNTE_ENABLED':'false'}
 failure=None
 try:
  path='/'+phone+'/templates/'+NAME
  try:template=request(key,path).get('data')
  except APIError as e:
   if e.status!=404:raise
   sample=['BLK-CONTOH123','Telkomsel - Pulsa 20.000','081234567890','Rp 21.000','Menunggu pembayaran','https://blackstore69.web.id/pesanan/BLK-CONTOH123']
   request(key,'/'+phone+'/templates',{'name':NAME,'category':'UTILITY','language':'id','components':[{'type':'BODY','text':BODY,'example':{'body_text':[sample]}}]})
   print('Template invoice telah diajukan untuk persetujuan Meta.')
   template=request(key,path).get('data')
  if isinstance(template,list):template=next((t for t in template if t.get('language')=='id'),None)
  if not isinstance(template,dict):raise RuntimeError('Respons template belum dapat dikenali. Integrasi tetap nonaktif.')
  if template.get('language')!='id' or str(template.get('category','')).upper()!='UTILITY':raise RuntimeError('Bahasa/kategori template berbeda. Periksa dashboard sebelum aktivasi.')
  components=template.get('components',[])
  if len(components)!=1 or str(components[0].get('type','')).upper()!='BODY' or components[0].get('text')!=BODY:raise RuntimeError('Isi template berbeda dari invoice website. Periksa template '+NAME+'.')
  status=str(template.get('status','')).lower();print('Status template:',status if re.fullmatch('[a-z_]+',status) else 'belum diketahui')
  if status=='approved':values.update(KIRIMDEV_TEMPLATE_APPROVED='true',KIRIMDEV_ENABLED='true')
 except Exception as e:failure=e
 save(values)
 if failure:print('Belum aktif:',str(failure))
 if values['KIRIMDEV_ENABLED']=='true':
  print('Kirimdev AKTIF untuk notifikasi pesanan baru yang mengisi WhatsApp. Fonnte NONAKTIF.')
  print('Pantau: https://blackstore69.web.id/admin/whatsapp')
 else:
  print('API key tersimpan aman. Pengiriman belum aktif sampai template disetujui.')
  print('Setelah template approved, jalankan kembali: python3 /root/configure-blackstore-kirimdev.py')
 print('Biaya pesan dari Kirimdev/Meta, jika ada, belum dimasukkan ke margin produk Rp100.')
if __name__=='__main__':
 try:main()
 except (KeyboardInterrupt,EOFError):print('\nDibatalkan.');sys.exit(1)
 except Exception as e:print('Aktivasi belum selesai:',str(e) if isinstance(e,(APIError,RuntimeError,ValueError)) else 'Periksa konfigurasi VPS.');sys.exit(1)
