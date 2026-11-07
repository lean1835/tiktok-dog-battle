'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
let opening=false;
function overlayWindow(port,{env=process.env,exists=fs.existsSync}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT không hợp lệ.');
 const candidates=[
  [env['ProgramFiles(x86)'],'Microsoft/Edge/Application/msedge.exe'],
  [env.ProgramFiles,'Microsoft/Edge/Application/msedge.exe'],
  [env.LOCALAPPDATA,'Microsoft/Edge/Application/msedge.exe'],
  [env.ProgramFiles,'Google/Chrome/Application/chrome.exe'],
  [env['ProgramFiles(x86)'],'Google/Chrome/Application/chrome.exe'],
  [env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe']
 ].filter(([base])=>base).map(([base,file])=>path.join(base,file));
 const browser=candidates.find(exists);if(!browser)throw new Error('Cần Microsoft Edge hoặc Google Chrome để mở cửa sổ sân dọc.');
 const profile=path.resolve(__dirname,'../runtime/overlay-browser');
 return{browser,profile,url:`http://127.0.0.1:${port}/overlay.html?capture=1`};
}
function openOverlay(port){
 if(opening)return{opening:true};
 const spec=overlayWindow(port),script=fs.readFileSync(path.join(__dirname,'lock-portrait-window.ps1'),'utf8');
 fs.mkdirSync(path.dirname(spec.profile),{recursive:true});
 opening=true;
 const lock=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command',script],{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,TUAT_CAPTURE_PROFILE_DIR:spec.profile,TUAT_CAPTURE_BROWSER_PATH:spec.browser,TUAT_CAPTURE_URL:spec.url}});let output='';
 lock.stdout.on('data',bytes=>output+=bytes);lock.stderr.on('data',bytes=>output+=bytes);
 lock.once('error',error=>{opening=false;console.error('Không mở được sân dọc: '+error.message);});
 lock.once('close',code=>{opening=false;fs.writeFileSync(path.resolve(__dirname,'../runtime/portrait-window.log'),output+'\nExit: '+code+'\n');if(code!==0)console.error('Không khóa được cửa sổ sân. Xem runtime/portrait-window.log.');});
 console.log('Sân dọc riêng: '+spec.url+'\nChọn cửa sổ “Tuất Live — Sân dọc 9:16” trong phần mềm LIVE.');
 return{opening:true};
}
module.exports={overlayWindow,openOverlay};
