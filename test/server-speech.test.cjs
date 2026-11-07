const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {Speech,createSpeechProvider}=require('../server/speech.cjs');
test('A failed long sentence retries a short fallback once and does not publish partial audio',async()=>{
 const calls=[],speech=new Speech({synth:async text=>{calls.push(text);if(text==='long sentence')throw new Error('stream truncated');return Buffer.from('complete audio');}});
 const ready=once(speech,'ready');speech.enqueue('long sentence',{fallback:'Thanks'});const [item]=await ready;
 assert.deepEqual(calls,['long sentence','Thanks']);assert.equal(item.spokenText,'Thanks');assert.equal(item.text,'long sentence');assert.equal(speech.get(item.id).toString(),'complete audio');
});
test('Narration queue is bounded, gifts displace welcome lines, and mute cancels queued/in-flight publication',async()=>{
 let finish;const speech=new Speech({synth:()=>new Promise(resolve=>finish=resolve)});let published=0;speech.on('ready',()=>published++);
 speech.enqueue('current');for(let i=0;i<15;i++)speech.enqueue('welcome '+i);assert.equal(speech.info().pending,15);assert.equal(speech.enqueue('extra'),false);
 assert.equal(speech.enqueue('gift',{priority:1}),true);assert.equal(speech.job.item.text,'gift','gift synthesis starts without waiting for the blocked welcome');assert.equal(speech.info().pending,14);
 speech.clear();finish(Buffer.from('stale'));await new Promise(resolve=>setImmediate(resolve));assert.equal(published,0);assert.equal(speech.info().pending,0);
});
test('Gift synthesis preempts a blocked welcome, ignores its late completion and preserves later paid thanks in order',async()=>{
 const pending=new Map(),published=[],speech=new Speech({synth:text=>new Promise(resolve=>pending.set(text,resolve))});speech.on('ready',m=>published.push(m));
 speech.enqueue('slow welcome');speech.enqueue('gift A',{priority:1,presentation:{kind:'gift',event:{personId:'A'}}});speech.enqueue('gift B',{priority:1});assert.equal(speech.job.item.text,'gift A');assert.equal(pending.has('gift B'),false);
 pending.get('slow welcome')(Buffer.from('stale'));await new Promise(r=>setImmediate(r));assert.equal(published.length,0);pending.get('gift A')(Buffer.from('RIFFgift'));await new Promise(r=>setImmediate(r));assert.equal(published[0].presentation.event.personId,'A');assert.equal(speech.job.item.text,'gift B');pending.get('gift B')(Buffer.from('RIFFgift'));await new Promise(r=>setImmediate(r));assert.deepEqual(published.map(m=>m.text),['gift A','gift B']);
});

test('An unavailable speech provider clears busy and reports warning instead of stopping the runtime',async()=>{
 const speech=new Speech({synth:async()=>{throw new Error('provider unavailable');}}),warning=once(speech,'warning');speech.enqueue('hello');await warning;await new Promise(resolve=>setImmediate(resolve));assert.equal(speech.info().busy,false);assert.match(speech.info().error,/unavailable/);
});

test('Windows Vietnamese fallback keeps the full sentence, skips broken Edge for a minute and recovers to the selected Edge voice',async()=>{
 let now=1000,edgeCalls=0,localCalls=0;const calls=[];
 const synth=createSpeechProvider({now:()=>now,edge:async(text,voice)=>{edgeCalls++;calls.push([text,voice]);if(edgeCalls===1)throw new Error('network unavailable');return Buffer.from('complete MP3');},windows:async text=>{localCalls++;assert.equal(text,'Cảm ơn Tuất An tặng hoa hồng.');const b=Buffer.from('RIFFcomplete WAV');b.voice='Microsoft An';b.provider='windows';return b;}});
 const speech=new Speech({synth,now:()=>now});
 let ready=once(speech,'ready');speech.enqueue('Cảm ơn Tuất An tặng hoa hồng.',{voice:'vi-VN-HoaiMyNeural',fallback:'Cảm ơn bạn.'});const [local]=await ready;
 assert.equal(local.spokenText,local.text);assert.match(local.url,/\.wav$/);assert.equal(local.provider,'windows');assert.equal(speech.info().provider,'windows');assert.equal(speech.info().voice,'Microsoft An');assert.equal(speech.info().error,'');assert.match(speech.info().warning,/network/);
 assert.equal(speech.get(local.id,'mp3'),null);assert.ok(speech.get(local.id,'wav'));
 ready=once(speech,'ready');speech.enqueue('Cảm ơn Tuất An tặng hoa hồng.');await ready;assert.equal(edgeCalls,1);assert.equal(localCalls,2);
 now+=60001;ready=once(speech,'ready');speech.enqueue('Edge phục hồi.',{voice:'vi-VN-HoaiMyNeural'});const [edge]=await ready;
 assert.match(edge.url,/\.mp3$/);assert.equal(speech.info().provider,'edge');assert.equal(speech.info().warning,'');assert.equal(calls.at(-1)[1],'vi-VN-HoaiMyNeural');
});

test('A machine without Vietnamese fallback reports the failure and never publishes empty or partial audio',async()=>{
 const synth=createSpeechProvider({edge:async()=>{throw new Error('offline');},windows:async()=>{throw new Error('No installed Vietnamese Windows voice.');}}),speech=new Speech({synth});
 let ready=false;speech.on('ready',()=>ready=true);const warning=once(speech,'warning');speech.enqueue('Chào Tuất An.');await warning;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ready,false);assert.match(speech.info().error,/Vietnamese/);assert.equal(speech.info().busy,false);
});

test('Choosing Windows Vietnamese works without making any network synthesis request',async()=>{
 let network=0;const synth=createSpeechProvider({edge:async()=>network++,windows:async()=>{const b=Buffer.from('RIFFcomplete WAV');b.voice='Microsoft An';return b;}});
 await synth('Chào Tuất An.','windows-vi');assert.equal(network,0);assert.equal(synth.info().provider,'windows');assert.equal(synth.info().fallback,false);assert.equal(synth.info().warning,'');
});

test('Synthesis receives the prepared Vietnamese sentence while keeping the original text and priority for review',async()=>{
 let spoken;const speech=new Speech({synth:async text=>{spoken=text;return Buffer.from('RIFFfixture');}}),ready=once(speech,'ready');speech.enqueue('Hồi 80 HP sau 30s.',{priority:1});const [item]=await ready;assert.equal(spoken,'Hồi tám mươi máu sau ba mươi giây.');assert.equal(item.text,'Hồi 80 HP sau 30s.');assert.equal(item.spokenText,spoken);assert.equal(item.priority,1);
});

test('Honor narration preempts blocked synthesis and ignores its late completion without losing queued gifts',async()=>{
 const pending=new Map(),published=[],speech=new Speech({synth:text=>new Promise(resolve=>pending.set(text,resolve))});speech.on('ready',m=>published.push(m));speech.enqueue('old welcome');speech.enqueue('gift',{priority:1});speech.enqueue('Vinh danh Tuất Vương An!',{priority:3,honorId:'round-1'});assert.ok(pending.has('Vinh danh Tuất Vương An!'));pending.get('old welcome')(Buffer.from('stale'));await new Promise(r=>setImmediate(r));assert.equal(published.length,0);assert.equal(speech.busy,true);pending.get('Vinh danh Tuất Vương An!')(Buffer.from('RIFFhonor'));await new Promise(r=>setImmediate(r));assert.equal(published[0].honorId,'round-1');assert.equal(published[0].priority,3);assert.ok(pending.has('gift'));pending.get('gift')(Buffer.from('RIFFgift'));await new Promise(r=>setImmediate(r));assert.deepEqual(published.map(p=>p.text),['Vinh danh Tuất Vương An!','gift']);
});


test('Prepared phase narration reuses synthesized audio and preempts gifts without losing them',async()=>{
 const calls=[],pending=new Map(),speech=new Speech({synth:text=>{calls.push(text);if(text==='gift')return new Promise(resolve=>pending.set(text,resolve));return Promise.resolve(Buffer.from('RIFFprepared'));}});
 await speech.prepare('Chuẩn bị!');assert.equal(calls.length,1);speech.enqueue('gift',{priority:1});const ready=once(speech,'ready');speech.enqueue('Chuẩn bị!',{priority:2,roundPhase:{round:1,phase:'prepare'}});const [item]=await ready;assert.equal(item.roundPhase.round,1);assert.equal(calls.filter(t=>t==='Chuẩn bị!').length,1);assert.ok(calls.filter(t=>t==='gift').length>=2,'interrupted paid gift resumes after phase narration');pending.get('gift')(Buffer.from('RIFFgift'));speech.clear();
});
