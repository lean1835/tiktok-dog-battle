'use strict';
const {execFile}=require('node:child_process'),path=require('node:path');
const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT không hợp lệ.');
const url=`http://127.0.0.1:${port}`;
function open(){
 if(process.env.TUAT_OPEN_OVERLAY==='1'&&process.env.TUAT_NO_BROWSER!=='1'){
  try{require('./open-overlay.cjs').openOverlay(port);}catch(error){console.error(error.message);}
  console.log(`Quản lý: ${url}/\nOverlay 9:16: ${url}/overlay.html`);return;
 }
 if(process.platform==='win32'&&process.env.TUAT_NO_BROWSER!=='1'){
  // cmd/start misreads Node's escaped quotes as a path. Use the Windows URL
  // association directly through PowerShell; the URL contains only a validated port.
  execFile('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command',`Start-Process -FilePath '${url}/'`],{windowsHide:true},error=>{if(error)console.error(`Không tự mở được trình duyệt. Mở địa chỉ này: ${url}/`);});
 }
 console.log(`Quản lý: ${url}/\nOverlay 9:16: ${url}/overlay.html`);
}
(async()=>{
 try{const response=await fetch(url+'/health',{signal:AbortSignal.timeout(1000)});const status=await response.json();if(status.app==='tuat-live'&&status.version===2){open();return;}}catch{}
 const {createApp}=require('../server/app.cjs'),app=createApp({autoRun:true,port,directory:process.env.TUAT_DATA_DIR||path.resolve(__dirname,'../runtime')});
 try{await app.listen();open();console.log('Giữ cửa sổ này trong khi LIVE. Ctrl+C để dừng và lưu phiên.');}
 catch(error){await app.close();console.error('Không mở được Tuất Live: '+error.message);process.exitCode=1;return;}
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
