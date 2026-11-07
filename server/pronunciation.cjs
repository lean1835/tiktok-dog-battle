'use strict';
// Plain-text pronunciation preparation shared by Windows and Edge. Display
// names, TikTok gift identifiers and game state are never rewritten here.
const fold=s=>String(s).normalize('NFKC').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
const clean=s=>String(s??'').normalize('NFKC').normalize('NFC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,' ').replace(/[\p{Extended_Pictographic}\uFE0F\u20E3]/gu,' ').replace(/\s+/g,' ').trim();
const clip=(s,n)=>{if(s.length<=n)return s;const end=s.lastIndexOf(' ',n);return s.slice(0,end>n*.6?end:n).trim();};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function validatePronunciations(value){
 if(!Array.isArray(value)||value.length>80)throw new Error('Tối đa 80 dòng sửa cách đọc.');
 const seen=new Set();return value.map((r,i)=>{if(!r||typeof r.word!=='string'||typeof r.spoken!=='string')throw new Error(`Dòng cách đọc ${i+1} cần có từ và cách đọc.`);const word=clean(r.word),spoken=clean(r.spoken);if(!word||word.length>64||!spoken||spoken.length>96||!/[\p{L}\p{N}]/u.test(word)||/[<>\r\n]/.test(r.word+r.spoken))throw new Error(`Dòng cách đọc ${i+1} không hợp lệ: từ tối đa 64, cách đọc tối đa 96 ký tự.`);const key=fold(word);if(seen.has(key))throw new Error(`Từ “${word}” bị lặp trong bảng cách đọc.`);seen.add(key);return{word,spoken};});
}
function dictionary(text,rules){
 const map=new Map();for(const r of rules||[])if(r?.word&&!map.has(fold(r.word)))map.set(fold(r.word),r);
 if(!map.size)return text;
 const pattern=[...map.values()].sort((a,b)=>b.word.length-a.word.length).map(r=>r.word.split(/\s+/).map(escape).join('\\s+')).join('|');
 return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`,'giu'),word=>map.get(fold(word)).spoken);
}
const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
const readDigits=s=>String(s).split('').map(d=>digits[Number(d)]).join(' ');
function readInteger(value){
 const s=String(value).replace(/^0+(?=\d)/,'');if(s.length>12)return readDigits(value);if(Number(s)===0)return 'không';
 const scales=['','nghìn','triệu','tỷ'],parts=[];let rest=s,index=0;
 while(rest){parts.unshift({n:Number(rest.slice(-3)),scale:scales[index++]});rest=rest.slice(0,-3);}
 const out=[];for(const {n,scale}of parts){if(!n)continue;const h=Math.floor(n/100),t=Math.floor(n/10)%10,u=n%10,p=[];if(h)p.push(digits[h],'trăm');else if(out.length&&n<100)p.push('không','trăm');if(t>1)p.push(digits[t],'mươi');else if(t===1)p.push('mười');else if(u&&(h||out.length))p.push('lẻ');if(u)p.push(u===1&&t>1?'mốt':u===5&&t>0?'lăm':digits[u]);if(scale)p.push(scale);out.push(p.join(' '));}return out.join(' ');
}
function readNumber(value){
 if(/^\d{1,3}(?:[.,]\d{3})+$/.test(value))return readInteger(value.replace(/[.,]/g,''));
 const p=value.split(/[.,]/);return p.length===1?readInteger(p[0]):readInteger(p[0])+' phẩy '+p.slice(1).map(readDigits).join(' ');
}
const terms=[['TikTok','Tích Tốc'],['livestream','phát trực tiếp'],['LIVE','phát trực tiếp'],['skills','kỹ năng'],['skill','kỹ năng'],['cooldown','hồi chiêu'],['combo','chuỗi quà'],['HP','máu'],['dame','sát thương'],['damage','sát thương'],['buff','tăng sức mạnh'],['team','đội'],['GG','cổ vũ'],['becgie','béc giê'],['bec giê','béc giê'],['5v5','năm đấu năm'],['9:16','chín trên mười sáu']].map(([word,spoken])=>({word,spoken}));
const gifts={rose:'hoa hồng',rosa:'hoa hồng',tiktok:'tích tốc','finger heart':'tim tay','heart me':'trái tim',heart:'trái tim',hearts:'trái tim','hand hearts':'trái tim','hand heart':'trái tim','love you':'yêu thương','lucky pig':'heo may mắn',peach:'quả đào',doughnut:'bánh ngọt',donut:'bánh ngọt',cake:'bánh ngọt','cake slice':'miếng bánh','ice cream cone':'kem','ice cream':'kem',gg:'cổ vũ',perfume:'nước hoa',lotus:'hoa sen','paper crane':'hạc giấy','little crown':'vương miện',crown:'vương miện',cap:'mũ',sunglasses:'kính mát',coffee:'cà phê',tea:'trà',confetti:'pháo giấy',butterfly:'cánh bướm',swan:'thiên nga',galaxy:'dải ngân hà',lion:'sư tử',whale:'cá voi',corgi:'cún nhỏ','money gun':'súng tiền',universe:'vũ trụ','tiktok universe':'vũ trụ',fireworks:'pháo hoa','tiger lift':'nâng hổ','dragon crown':'vương miện rồng','fiery dragon':'rồng lửa','white tiger':'bạch hổ','black tiger':'hắc hổ','dragon flame':'lửa rồng'};
const plainName=s=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
const families='Nguyễn Trần Lê Phạm Hoàng Huỳnh Phan Vũ Võ Đặng Bùi Đỗ Hồ Ngô Dương Lý Đinh Trương Đoàn Trịnh Đào Mai Tô Hà Chu Tạ Thái Lâm Lưu Cao Lương Tăng Quách Tôn Nông Triệu Hứa Kiều Châu Vương La Thân Âu'.split(' ');
const familySet=new Set(families.map(plainName)),nameSyllables=new Map(families.map(n=>[plainName(n),n]));
for(const n of 'Văn Thị Minh Đức Hữu Gia Bảo Anh Thanh Ngọc Quốc Phương Xuân Tuấn Duy Tiến Nam Nhật Trọng Long Phúc Phú Khánh Khang Hùng Hưng Tùng Sơn Linh Trang Vy Vi Thảo Thủy Như Nhi Hân Hàn Ngân Nhung Hương Huyền Yến Tâm Tín Tài Thiên Thiện Thành Thắng Hạnh Hải Hiếu Hậu Hiền Hoa Hòa Hoài Huy Hào Hồng Hằng Hường Hạ Hảo Hiển Hiệp Hoan Khoa Khôi Kiên Lộc Luân Luận Loan Liên Liễu Mỹ My Mạnh Nga Ngà Nhàn Nhân Nhận Nghĩa Nghiêm Ninh Nhất Nhã Oanh Phát Phong Quân Quyên Quỳnh Quang Quyết Quyền Sang San Sinh Sáng Tân Tấn Tú Tuệ Tuyết Thế Thông Thịnh Thọ Thu Thư Thuận Trung Trúc Trọng Triết Thương Thùy Thúy Toàn Trí Trực Trường Vân Vinh Vĩnh Việt Vũ Vỹ Uyên Út Chí Chính Chi Diễm Diệu Dũng Dung Duyên Danh Đại Đạt Đăng Đình Đông Điệp Đoan Đào Đan Bách Bình Bích Bắc Châu Cường Cúc Cẩm Cảnh Chương Lễ Lệ Lĩnh Thắm Thìn Tuyền Uy Vượng Trân Nguyên Bé Na Lu Mực Bông Bắp Ki Vàng Mun Yêu Cam Mẹ Ba'.split(' '))nameSyllables.set(plainName(n),n);
const foreignNames=new Set(['anna','hana','lena','luna','nina','nana','lisa','mina','nami','sana','suna','yuna','momo']);
for(const [key,name]of Object.entries({an:'An',thuy:'Thủy',thanh:'Thanh',hoa:'Hoa',tien:'Tiến',tuat:'Tuất',bo:'Bố'}))nameSyllables.set(key,name);
function restoreVietnameseName(value){
 return value.replace(/(\p{Ll})(\p{Lu})/gu,'$1 $2').replace(/[\p{Script=Latin}]+/gu,(token,at,full)=>{
  const key=plainName(token);if(!/^[a-z]{2,40}$/.test(key)||foreignNames.has(key))return token;
  const original=part=>/[^a-z]/i.test(part)?part[0].toUpperCase()+part.slice(1):null;
  if(nameSyllables.has(key))return original(token)||(key==='van'&&/\p{L}/u.test(full.slice(0,at))&&/\p{L}/u.test(full.slice(at+token.length))?'Văn':familySet.has(key)?families.find(n=>plainName(n)===key):nameSyllables.get(key));
  const memo=new Map();
  const split=at=>{if(at===key.length)return{score:0,parts:[]};if(memo.has(at))return memo.get(at);let best=null;
   for(let end=at+1;end<=Math.min(key.length,at+6);end++){const syllable=key.slice(at,end),known=nameSyllables.get(syllable),initial=!known&&end===key.length&&syllable.length===1;if(!known&&!initial)continue;const tail=split(end);if(!tail||tail.parts.length>=7)continue;const score=tail.score+(syllable.length>=3?3:1)-1+(at===0&&familySet.has(syllable)?3:0)+(syllable==='van'||syllable==='thi'?2:0)-(initial?2:0);if(!best||score>best.score)best={score,parts:[{start:at,end,key:syllable,name:known||syllable.toUpperCase()},...tail.parts]};}
   memo.set(at,best);return best;};
  const result=split(0);if(!result||result.parts.length<2||result.score<2)return token;
  const feminine=result.parts.some(p=>p.key==='thi');return result.parts.map((part,i)=>{const raw=token.slice(part.start,part.end),accented=original(raw);if(accented)return accented;if(i===0&&familySet.has(part.key))return families.find(n=>plainName(n)===part.key);if(part.key==='van'&&i>0&&i<result.parts.length-1)return 'Văn';if(part.key==='tien'&&feminine)return 'Tiên';return part.name;}).join(' ');
 });
}
function sanitizeSpokenName(value,rules=[]){
 const raw=clean(value).replace(/[Øø]/g,'o').replace(/^@/,'').replace(/[_·|]+/g,' ').replace(/[^\p{Script=Latin}\p{N}\s'’-]/gu,' ').replace(/\s+/g,' ').trim();
 const custom=dictionary(raw,[...rules,{word:'rose',spoken:'Rô'},{word:'love',spoken:'Lơ'}]),result=restoreVietnameseName(custom.replace(/([\p{L}])(\d)/gu,'$1 $2').replace(/(\d)([\p{L}])/gu,'$1 $2')).replace(/\d+/g,readDigits);
 return clip(result.replace(/\s+/g,' ').trim(),80)||'Ẩn danh';
}
function spokenGiftName(value,rules=[]){
 const raw=clean(value).replace(/[<>]/g,'').trim(),custom=dictionary(raw,rules);if(custom!==raw)return custom;
 const known=gifts[fold(raw)],label=known||(/[àáạảãâăèéẹẻẽêìíịỉĩòóọỏõôơùúụủũưỳýỵỷỹđ]/i.test(raw)?raw:'món quà');return dictionary(label,rules);
}
function prepareSpeechText(value,{rules=[],protectedTexts=[]}={}){
 const input=clean(value),protectedRules=protectedTexts.filter(Boolean).map(word=>({word,spoken:word})),patterns=protectedRules.sort((a,b)=>b.word.length-a.word.length).map(r=>escape(r.word));
 // Protect already prepared viewer/gift names from game terms (e.g. a viewer
 // called “HP” must not be welcomed as “máu”). Custom rules are applied once.
 const blocks=patterns.length?input.split(new RegExp(`((?<![\\p{L}\\p{N}])(?:${patterns.join('|')})(?![\\p{L}\\p{N}]))`,'giu')):[input],protectedSet=new Set(protectedTexts.map(fold));
 const output=blocks.map(block=>{
  if(protectedSet.has(fold(block))){protectedSet.delete(fold(block));return block;}
  // One substitution pass prevents custom replacements from cascading.
  let s=dictionary(block.replace(/(\d)(?=HP\b)/gi,'$1 '),[...rules,...terms]);
  s=s.replace(/(?<![\p{L}\p{N}])(\d+(?:[.,]\d+)?)\s*(ms|secs?|s|ph|p)(?![\p{L}\p{N}])/giu,(_,n,unit)=>n+' '+(unit.toLowerCase()==='ms'?'mi li giây':/^(p|ph)$/i.test(unit)?'phút':'giây'));
  s=s.replace(/\s*%/g,' phần trăm').replace(/&/g,' và ').replace(/[–—]+/g,', ').replace(/\.{2,}/g,'.');
  return s.replace(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?![\p{L}\p{N}])/gu,readNumber);
 }).join('').replace(/\s+/g,' ').replace(/\s+([,.!?;:])/g,'$1').trim();
 return clip(output,240);
}
module.exports={validatePronunciations,sanitizeSpokenName,spokenGiftName,prepareSpeechText,readInteger,restoreVietnameseName};
