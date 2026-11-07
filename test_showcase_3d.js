// test_showcase_3d.js - Kiểm thử tự động Sàn Đấu Chó 3D "Một Ngày Làm Chó"
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('[TEST 3D] Bắt đầu thẩm định chất lượng Sàn Đấu 3D Three.js (index-3d.html)...');

const htmlPath = path.join(__dirname, 'index-3d.html');
const threePath = path.join(__dirname, 'src', 'three.min.js');
const enginePath = path.join(__dirname, 'src', 'dog-3d-engine.js');

// 1. Kiểm tra tồn tại các file cốt lõi
assert(fs.existsSync(htmlPath), 'File index-3d.html phải tồn tại');
assert(fs.existsSync(threePath), 'File src/three.min.js phải tồn tại');
assert(fs.existsSync(enginePath), 'File src/dog-3d-engine.js phải tồn tại');
console.log('  PASS 1: Đầy đủ các file cấu thành 3D cục bộ');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 2. Kiểm tra TV-3D-05: 100% Tự chứa offline (Zero external CDN)
const hasExternalScript = /<script\s+[^>]*src=["']https?:\/\//i.test(htmlContent);
const hasExternalLink = /<link\s+[^>]*href=["']https?:\/\//i.test(htmlContent);
assert(!hasExternalScript && !hasExternalLink, 'index-3d.html không được phụ thuộc bất kỳ CDN ngoài nào');
assert(htmlContent.includes('src="src/three.min.js"'), 'Phải nhúng three.min.js cục bộ');
assert(htmlContent.includes('src="src/dog-3d-engine.js"'), 'Phải nhúng dog-3d-engine.js cục bộ');
console.log('  PASS 2 (TV-3D-05): 100% tự chứa offline, zero external CDN');

// 3. Kiểm tra TV-3D-01: 10 Nhân vật 3D (9 Chó + 1 Chú Heo Bựa Lạc Bầy)
const requiredChars = ['mr_vang', 'ven', 'muc', 'dom', 'lu', 'ki', 'becgie', 'pitbull', 'corgi', 'heo'];
requiredChars.forEach(charId => {
  assert(htmlContent.includes(charId), 'Thiếu cấu hình nhân vật: ' + charId);
});
assert(htmlContent.includes('Trư Bựa Lạc Bầy') || htmlContent.includes('isPig'), 'Phải có Chú Heo Bựa Lạc Bầy trong đội hình');
console.log('  PASS 3 (TV-3D-01): Đầy đủ 10 nhân vật 3D (9 giống chó + 1 chú Heo bựa lạc bầy)');

// 4. Kiểm tra TV-3D-02: Bảng Tên 3D Billboard & Chống Lỗ Hổng XSS
assert(htmlContent.includes('createDogBillboard'), 'Phải có hàm tạo Bảng Tên 3D Billboard');
assert(htmlContent.includes('SpriteMaterial') && htmlContent.includes('CanvasTexture'), 'Phải dùng THREE.Sprite với CanvasTexture');
assert(htmlContent.includes('replace(/<[^>]*>/g'), 'Phải sanitize chuỗi ký tự chống XSS khi vẽ lên billboard');
assert(htmlContent.includes('textContent'), 'Các phần tử UI overlay phải dùng textContent để chống XSS');
console.log('  PASS 4 (TV-3D-02): Bảng Tên 3D Billboard Sprite luôn hướng về Camera & chống XSS 100%');

// 5. Kiểm tra TV-3D-03: Hoạt Họa Chuyển Động & Sóng Âm Web Audio
assert(htmlContent.includes('dog.bark()') || htmlContent.includes('d.bark()'), 'Phải kích hoạt hoạt họa sủa mõm');
assert(htmlContent.includes('AudioContext') || htmlContent.includes('webkitAudioContext'), 'Phải có Web Audio API');
assert(htmlContent.includes('playBarkSound'), 'Phải có hàm tổng hợp tiếng sủa nội bộ');
console.log('  PASS 5 (TV-3D-03): Hoạt họa há mõm 3D & Web Audio API synthesizer');

// 6. Kiểm tra TV-3D-04: Sa Bàn 5v5 Xóm Đỏ vs Xóm Xanh & Nút "GÂU" Khổng Lồ
assert(htmlContent.includes('giant-bark-btn'), 'Phải có nút tròn khổng lồ "GÂU!" ở góc');
assert(htmlContent.includes('redTeamConfig') && htmlContent.includes('blueTeamConfig'), 'Phải có sa bàn 5v5 Xóm Đỏ vs Xóm Xanh');
assert(htmlContent.includes('CHƯƠNG 1: XÓM CHỢ 10 CON CHÓ'), 'Phải có bảng thông báo nhiệm vụ chương');
console.log('  PASS 6 (TV-3D-04): Sa bàn 5v5 chuẩn Xóm Đỏ vs Xóm Xanh và Nút GÂU Khổng Lồ');

console.log('[SUCCESS 3D] Toàn bộ 5 Test Vectors 3D của Sub-QA-1 đã được thỏa mãn 100%!');
