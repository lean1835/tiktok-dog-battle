const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../server/pronunciation.cjs'),A=require('../server/tiktok-adapter.cjs');
test('Unaccented and joined Vietnamese names are separated and prepared for Vietnamese speech',()=>{
 for(const [raw,spoken]of Object.entries({nguyenvanan:'Nguyễn Văn An','nguyen van an':'Nguyễn Văn An',minhngoc:'Minh Ngọc',tuanbui:'Tuấn Bùi',nguyenthithao:'Nguyễn Thị Thảo',lehoanganh:'Lê Hoàng Anh',tranminhtuan:'Trần Minh Tuấn'}))assert.equal(P.sanitizeSpokenName(raw),spoken,raw);
});
test('Existing Vietnamese tones, stylized letters, unknown foreign names and every identifier digit survive preparation',()=>{
 assert.equal(P.sanitizeSpokenName('NguyễnVănTuân'),'Nguyễn Văn Tuân');assert.equal(P.sanitizeSpokenName('nguyễnvănanh'),'Nguyễn Văn Anh');assert.equal(P.sanitizeSpokenName('𝓜𝓲𝓷𝓱𝓝𝓰𝓸𝓬 💖'),'Minh Ngọc');assert.equal(P.sanitizeSpokenName('be_na2002'),'Bé Na hai không không hai');assert.equal(P.sanitizeSpokenName('Luna'),'Luna');assert.equal(P.sanitizeSpokenName('Alex'),'Alex');
});
test('Custom name pronunciations override ambiguous accents and longest phrases win without regex injection or cascades',()=>{
 const rules=P.validatePronunciations([{word:'thuy',spoken:'Thúy'},{word:'Nguyễn Văn An',spoken:'Anh An'},{word:'Nguyễn',spoken:'Nguyễn'},{word:'a+b',spoken:'a cộng b'}]);assert.equal(P.sanitizeSpokenName('thuy',rules),'Thúy');assert.equal(P.prepareSpeechText('Nguyễn Văn An, a+b.',{rules}),'Anh An, a cộng b.');assert.equal(P.prepareSpeechText('skill',{rules:[{word:'skill',spoken:'HP'},{word:'HP',spoken:'máu'}]}),'HP');assert.equal(P.prepareSpeechText('Thủy',{rules:[{word:'Th',spoken:'Sai'}]}),'Thủy');
});
test('Numbers, health, durations and grouped coins have explicit Vietnamese readings; a viewer named HP stays HP',()=>{
 assert.equal(P.prepareSpeechText('80HP, 30s, 1.200 xu, 70%, 5v5.'),'tám mươi máu, ba mươi giây, một nghìn hai trăm xu, bảy mươi phần trăm, năm đấu năm.');assert.equal(P.prepareSpeechText('Chào Tuất HP. Hồi 80 HP.',{protectedTexts:['HP']}),'Chào Tuất HP. Hồi tám mươi máu.');assert.equal(P.readInteger('1001'),'một nghìn không trăm lẻ một');assert.equal(P.readInteger('25'),'hai mươi lăm');
});
test('Real gift names normalize Unicode/emoji and have Vietnamese words while raw routing payloads are untouched',()=>{
 assert.equal(P.spokenGiftName('🌹 Ｒｏｓｅ'),'hoa hồng');assert.equal(P.spokenGiftName('Paper Crane'),'hạc giấy');assert.equal(P.spokenGiftName('Dragon Crown'),'vương miện rồng');assert.equal(P.spokenGiftName('thuy',[{word:'thuy',spoken:'Thúy'}]),'Thúy');const raw={user:{id:'a',nickname:'nguyenvanan'},common:{msgId:'g'},giftId:5655,gift:{type:0,name:'Rose',diamondCount:1}},before=JSON.stringify(raw);const event=A.normalizeEvent('gift',raw,'r');assert.equal(event.name,'nguyenvanan');assert.equal(event.giftName,'Rose');assert.equal(JSON.stringify(raw),before);
});
test('Pronunciation settings are bounded, literal, persisted in validated config and reject ambiguous duplicate keys',()=>{
 assert.deepEqual(A.validateConfig({pronunciations:[{word:'thuy',spoken:'Thúy'}]}).pronunciations,[{word:'thuy',spoken:'Thúy'}]);for(const rules of [[{word:'',spoken:'x'}],[{word:'a',spoken:'<speak>x</speak>'}],[{word:'Thuy',spoken:'Thúy'},{word:'thuy',spoken:'Thủy'}],Array(81).fill({word:'a',spoken:'a'})])assert.throws(()=>P.validatePronunciations(rules));assert.ok(P.prepareSpeechText('1 '.repeat(200)).length<=240);
});
