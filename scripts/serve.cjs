'use strict';
const path=require('node:path'),{createApp}=require('../server/app.cjs');
const app=createApp({autoRun:true,port:Number(process.env.PORT||4173),directory:process.env.TUAT_DATA_DIR||path.resolve(__dirname,'../runtime')});
app.listen().then(({url})=>console.log(`Tuất Live — quản lý: ${url}/  ·  overlay: ${url}/overlay.html`)).catch(async error=>{console.error('Không khởi động được: '+error.message);await app.close();process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)).catch(error=>{console.error(error.message);process.exit(1);}));
