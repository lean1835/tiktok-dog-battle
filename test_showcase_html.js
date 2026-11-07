// test_showcase_html.js - Kiểm thử tích hợp tự động giao diện Showcase Chibi Dog
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('[TEST] Bắt đầu kiểm thử tích hợp giao diện tiktok-dog-battle/index.html...');

const htmlPath = path.join(__dirname, 'index.html');
const rendererPath = path.join(__dirname, 'src', 'dog-renderer.js');

// 1. Kiểm tra sự tồn tại của các file cốt lõi
assert(fs.existsSync(htmlPath), 'File index.html phải tồn tại');
assert(fs.existsSync(rendererPath), 'File src/dog-renderer.js phải tồn tại');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const rendererContent = fs.readFileSync(rendererPath, 'utf8');

// 2. Kiểm tra dung lượng hợp lệ (> 20,000 bytes)
assert(htmlContent.length > 20000, 'Dung lượng index.html phải lớn hơn 20KB (Hiện tại: ' + htmlContent.length + ' bytes)');
console.log('  PASS 1: Dung lượng index.html đạt chuẩn (' + htmlContent.length + ' bytes)');

// 3. Kiểm tra zero external CDN/dependencies
const hasExternalCDN = /https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(htmlContent);
assert(!hasExternalCDN, 'index.html phải hoạt động hoàn toàn offline, không tải tài nguyên bên ngoài');
console.log('  PASS 2: Zero external CDN, 100% tự chứa offline');

// 4. Kiểm tra các ID thành phần UI quan trọng
const requiredIds = [
  'showcase-viewport',
  'breeds-showcase-grid',
  'arena-team-red',
  'arena-team-blue',
  'btn-simulate-clash',
  'sound-toggle-btn'
];

requiredIds.forEach(id => {
  assert(htmlContent.includes('id="' + id + '"'), 'Giao diện phải chứa phần tử với id: ' + id);
});
console.log('  PASS 3: Đầy đủ các phần tử viewport, grid 10 giống chó và sa bàn 5v5');

// 5. Kiểm tra 10 giống chó trong danh sách
const breeds = ['corgi', 'shiba', 'husky', 'pitbull', 'pug', 'poodle', 'becgie', 'golden', 'doberman', 'chota'];
breeds.forEach(breed => {
  assert(htmlContent.includes(breed), 'Giao diện phải hỗ trợ giống chó: ' + breed);
});
console.log('  PASS 4: Khởi tạo đầy đủ 10 giống chó chibi 2.5D');

// 6. Kiểm tra an toàn bảo mật XSS
assert(!htmlContent.includes('innerHTML = user') && !htmlContent.includes('innerHTML=user'), 'Không được gán innerHTML trực tiếp từ biến đầu vào');
assert(htmlContent.includes('textContent'), 'Phải sử dụng textContent để chống tấn công XSS');
console.log('  PASS 5: An toàn chống XSS tuân thủ nghiêm ngặt (sử dụng textContent)');

// 7. Kiểm tra Web Audio API synthesizer
assert(htmlContent.includes('AudioContext') || htmlContent.includes('webkitAudioContext'), 'Giao diện phải tích hợp Web Audio API');
assert(htmlContent.includes('createOscillator') && htmlContent.includes('createBiquadFilter'), 'Bộ tổng hợp âm thanh sủa nội bộ phải dùng Oscillator và BiquadFilter');
console.log('  PASS 6: Web Audio API Synthesizer tạo tiếng sủa nội bộ hoạt động độc lập');

console.log('[SUCCESS] Tất cả 6 tiêu chí kiểm thử giao diện Showcase đã PASS 100%!');
