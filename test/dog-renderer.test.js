/**
 * Bộ Unit Test TDD cho DogRenderer (tiktok-dog-battle)
 * Zero-dependency: Sử dụng assert native của Node.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const DogRenderer = require('../src/dog-renderer.js');

console.log('🧪 BẮT ĐẦU CHẠY UNIT TEST CHO DOG RENDERER (CHIBI 2.5D)...\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error('     Chi tiết lỗi:', err.message);
    if (err.stack) {
      console.error('     ' + err.stack.split('\n').slice(1, 3).join('\n     '));
    }
    failCount++;
  }
}

// 1. Kiểm tra 10 giống chó Chibi
runTest('1. getAllBreeds trả về đủ 10 giống chó Chibi 2.5D chuẩn', () => {
  const breeds = DogRenderer.getAllBreeds();
  assert.strictEqual(breeds.length, 10, 'Phải có đúng 10 giống chó');
  const ids = breeds.map(b => b.id);
  const expected = ['corgi', 'shiba', 'husky', 'pitbull', 'pug', 'poodle', 'becgie', 'golden', 'doberman', 'chota'];
  for (const exp of expected) {
    assert.ok(ids.includes(exp), `Thiếu giống chó: ${exp}`);
  }
});

runTest('2. getBreedInfo truy xuất chính xác từng giống chó kèm metadata', () => {
  const corgi = DogRenderer.getBreedInfo('corgi');
  assert.strictEqual(corgi.id, 'corgi');
  assert.strictEqual(corgi.hasHeartButt, true);
  assert.ok(corgi.skill);

  const husky = DogRenderer.getBreedInfo('husky');
  assert.strictEqual(husky.colors.eye, '#00d2d3', 'Husky mắt xanh băng tuyết');

  const pitbull = DogRenderer.getBreedInfo('pitbull');
  assert.strictEqual(pitbull.hasSpikeCollar, true);

  // Fallback khi truyền giống không tồn tại
  const fallback = DogRenderer.getBreedInfo('unknown_dog');
  assert.strictEqual(fallback.id, 'corgi');
});

runTest('3. formatDogName tự động gắn tiền tố "Tuất + [Tên]"', () => {
  assert.strictEqual(DogRenderer.formatDogName('Bé Na'), 'Tuất Bé Na');
  assert.strictEqual(DogRenderer.formatDogName('Minh Tuấn'), 'Tuất Minh Tuấn');
  assert.strictEqual(DogRenderer.formatDogName('Tuất Đại Ca'), 'Tuất Đại Ca', 'Không lặp từ Tuất');
  assert.strictEqual(DogRenderer.formatDogName(''), 'Tuất Cưng');
  assert.strictEqual(DogRenderer.formatDogName(null), 'Tuất Cưng');
});

runTest('4. createCharacter tạo đối tượng DogCharacter đầy đủ trường', () => {
  const dog = DogRenderer.createCharacter({
    breed: 'shiba',
    nickname: 'Bánh Bao',
    team: 'blue',
    hp: 85
  });

  assert.strictEqual(dog.breed, 'shiba');
  assert.strictEqual(dog.name, 'Tuất Bánh Bao');
  assert.strictEqual(dog.team, 'blue');
  assert.strictEqual(dog.hp, 85);
  assert.strictEqual(dog.state, 'idle');
  assert.strictEqual(dog.accessory.bandana, 'blue');
});

runTest('5. normalizeState chuẩn hóa đúng các alias hoạt họa', () => {
  assert.strictEqual(DogRenderer.normalizeState('bark'), 'barking');
  assert.strictEqual(DogRenderer.normalizeState('barking'), 'barking');
  assert.strictEqual(DogRenderer.normalizeState('pant'), 'exhausted');
  assert.strictEqual(DogRenderer.normalizeState('exhausted'), 'exhausted');
  assert.strictEqual(DogRenderer.normalizeState('tiger_evo'), 'evolved_tiger');
  assert.strictEqual(DogRenderer.normalizeState('dragon_evo'), 'evolved_dragon');
  assert.strictEqual(DogRenderer.normalizeState('idle'), 'idle');
  assert.strictEqual(DogRenderer.normalizeState('unknown'), 'idle');
});

runTest('6. Xuất SVG hợp lệ cho toàn bộ 10 giống chó Chibi', () => {
  const all = DogRenderer.getAllBreeds();
  for (const b of all) {
    const dog = DogRenderer.createCharacter({ breed: b.id, name: b.nameVi });
    const svg = DogRenderer.renderToSVG(dog, 160, 0);
    assert.ok(svg.startsWith('<svg'), `Giống ${b.id} phải bắt đầu bằng <svg`);
    assert.ok(svg.endsWith('</svg>'), `Giống ${b.id} phải kết thúc bằng </svg>`);
    assert.ok(svg.includes(b.colors.primary), `SVG của ${b.id} phải chứa màu chủ đạo`);
  }
});

runTest('7. Kiểm tra trạng thái sủa (barking / bark) phát ra sóng âm', () => {
  const dog = DogRenderer.createCharacter({ breed: 'husky', state: 'barking' });
  const svg = DogRenderer.renderToSVG(dog, 160, 0.5);
  assert.ok(svg.includes('stroke-linecap="round"'), 'Phải có sóng âm');
  assert.ok(svg.includes('A 16,16'), 'Phải có cung tròn sóng âm');
});

runTest('8. Kiểm tra trạng thái kiệt sức (exhausted / pant) có mắt xoay và mồ hôi', () => {
  const dog = DogRenderer.createCharacter({ breed: 'pug', state: 'exhausted' });
  const svg = DogRenderer.renderToSVG(dog, 160, 0);
  assert.ok(svg.includes('#00d2d3'), 'Phải có giọt mồ hôi màu ngọc');
  assert.ok(svg.includes('x1="64"'), 'Phải có mắt xoay x_x');
});

runTest('9. Kiểm tra trạng thái tiến hóa Hóa Hổ và Hóa Rồng', () => {
  // Hóa Hổ
  const tiger = DogRenderer.createCharacter({ breed: 'becgie', state: 'evolved_tiger' });
  const svgTiger = DogRenderer.renderToSVG(tiger, 160, 0);
  assert.ok(svgTiger.includes('stroke="#ff9f43"'), 'Phải có hào quang hổ cam');

  // Hóa Rồng
  const dragon = DogRenderer.createCharacter({ breed: 'corgi', state: 'evolved_dragon' });
  const svgDragon = DogRenderer.renderToSVG(dragon, 160, 0);
  assert.ok(svgDragon.includes('stroke="#d35400"'), 'Phải có sừng rồng vàng cam');
  assert.ok(svgDragon.includes('stroke="#00d2d3"'), 'Phải có hào quang rồng xanh');
});

runTest('10. Kiểm tra cờ flip: true lật hướng cho thế trận 5v5', () => {
  const dog = DogRenderer.createCharacter({ breed: 'shiba', team: 'blue' });
  const svgFlipped = DogRenderer.renderToSVG(dog, 160, 0, true);
  assert.ok(svgFlipped.includes('scale(-1, 1)'), 'Phải có thuộc tính scale lật ngang');
  // Nhưng bảng tên vẫn vẽ xuôi chiều
  assert.ok(svgFlipped.includes('Tuất Bé Na'), 'Bảng tên vẫn hiện đủ');
});

runTest('11. renderDog tiện ích hỗ trợ cả đối tượng và tham số tắt', () => {
  const svg1 = DogRenderer.renderDog('corgi', { state: 'bark', team: 'red', flip: false });
  assert.ok(svg1.startsWith('<svg'));
  assert.ok(svg1.includes('A 16,16'), 'Nhận diện state bark -> barking');

  const svg2 = DogRenderer.renderDog('husky', { state: 'dragon_evo', team: 'blue', flip: true, hp: 50 });
  assert.ok(svg2.startsWith('<svg'));
  assert.ok(svg2.includes('scale(-1, 1)'), 'Nhận diện flip true');
});

console.log('\n========================================');
console.log(`🎉 TỔNG KẾT KIỂM THỬ: ${passCount} PASSED, ${failCount} FAILED`);
console.log('========================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
