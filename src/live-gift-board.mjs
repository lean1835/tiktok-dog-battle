// The in-world sign must remain legible after the portrait scene is scaled down.
// Keep the gift's searchable name separate from its benefit and coin badge.
export function paintGiftBoard(ctx,width,height,rows,{imageFor,art,config,live}){
 const round=(x,y,w,h,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
 const line=(value,x,y,size,color,weight=700,max=width-64,align='left')=>{
  ctx.font=`${weight} ${size}px Segoe UI, Arial`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';let label=String(value);
  if(ctx.measureText(label).width>max){while(label.length&&ctx.measureText(label+'…').width>max)label=label.slice(0,-1);label+='…';}
  ctx.fillText(label,x,y);
 };
 ctx.fillStyle='#173b31';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#e6c77c';ctx.lineWidth=4;ctx.strokeRect(14,14,width-28,height-28);
 line('QUÀ TẶNG',width/2,60,64,'#fff0bd',850,width-64,'center');
 line('Chạm Quà tặng · tìm tên / ảnh bên dưới',width/2,116,30,'#ffffff',600,width-65,'center');
 const section=(label,y)=>line(label,width/2,y,30,'#f5da93',800,width-65,'center');
 section('CỔ VŨ ĐỘI BẠN CHỌN',163);section('HÓA THÚ VĨNH VIỄN',520);section('HỒI PHỤC & TIẾP SỨC',880);
 const top=[186,344,548,706,908,1052,1196],benefits={rose:'Tăng điểm mỗi lượt sủa bên Đỏ',cake:'Tăng điểm mỗi lượt sủa bên Xanh',tiger:'Tự cào mỗi 30s · 7 đòn hạ tuất',dragon:'Khè lửa mỗi 30s · 3 đòn hạ tuất',heal:`Hồi ${config.healHp} HP cho tuất yếu nhất`,revive:`Gọi lại 1 tuất · ${config.revivePercent}% HP`,execute:''};
 for(const [i,row] of rows.slice(0,7).entries()){
  const y=top[i],h=i<4?146:132,isRed=row.id==='rose',isBlue=row.id==='cake',accent=isRed?'#b53337':isBlue?'#1769a1':'#295643',enabled=row.enabled;
  round(30,y,width-60,h,14,enabled?(isRed?'#fff0ec':isBlue?'#eaf5ff':'#fffdf4'):'#d9ddd5');
  round(30,y,8,h,4,enabled?accent:'#7c8981');
  const iconSize=h-24;round(45,y+12,iconSize,iconSize,13,'#ffffff');
  const img=imageFor(row);if(img){const scale=Math.min((iconSize-6)/img.naturalWidth,(iconSize-6)/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,45+(iconSize-iw)/2,y+(h-ih)/2,iw,ih);}
  // Advertise the first concrete gift, with its matching price/image. Additional
  // configured aliases and gifts continue to work without crowding this sign.
  const gift=art.find(row.imageKey),name=enabled?(gift?.name||row.names.split(' / ')[0]):'Chưa gán quà',rawPrice=String(row.cost).split(' / ')[0],price=enabled?(rawPrice.includes('xu')?rawPrice:rawPrice+' xu'):'—';
  const x=190,pillX=width-198,pillW=166;
  round(pillX,y+10,pillW,47,12,enabled?accent:'#728079');
  line(price,pillX+pillW/2,y+34,36,'#ffffff',800,pillW-16,'center');
  line(row.title,x,y+(i<4?31:28),i<4?50:44,enabled?accent:'#59645e',850,pillX-x-14);
  line(name,x,y+(i<4?76:69),i<4?44:38,'#192b25',750,width-x-48);
  line(enabled?(benefits[row.id]??row.description??''):'Chờ chủ LIVE thiết lập',x,y+(i<4?115:107),i<4?31:29,'#354b40',600,width-x-48);
 }
 line('Đứng ngoài vẫn cổ vũ & hóa thú được',width/2,height-61,25,'#ffffff',650,width-65,'center');
 const note=live?(rows.some(r=>r.cost.includes('*'))?'* Giá cấu hình · xu thực theo TikTok':'Chọn đúng quà để nhận đúng kỹ năng'):'BẢN DEMO · GIÁ THEO CẤU HÌNH';
 line(note,width/2,height-27,23,'#d7e2d5',500,width-65,'center');
}
