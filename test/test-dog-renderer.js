/**
 * Unit Test Suite for DogRenderer
 * Kiểm tra toàn diện 10 giống chó, 5 trạng thái, hợp đồng P2P, và tính hợp lệ XML của SVG.
 */

const assert = require('assert');
const DogRenderer = require('../src/dog-renderer.js');

console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ ĐƠN VỊ CHO DOG-RENDERER...\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

// 1. Kiểm tra danh sách 10 giống chó
it('getAllBreeds trả về đúng 10 giống chó Chibi chuẩn', () => {
  const breeds = DogRenderer.getAllBreeds();
  assert.strictEqual(breeds.length, 10, 'Phải có đúng 10 giống chó');
  
  const expectedBreeds = [
    'corgi', 'shiba', 'husky', 'pitbull', 'pug',
    'poodle', 'becgie', 'golden', 'doberman', 'chota'
  ];
  const ids = breeds.map(b => b.id);
  expectedBreeds.forEach(expectedId => {
    assert(ids.includes(expectedId), `Thiếu giống chó: ${expectedId}`);
  });
});

// 2. Kiểm tra Metadata từng giống chó
it('Mỗi giống chó có đầy đủ trường thông tin theo hợp đồng P2P', () => {
  const breeds = DogRenderer.getAllBreeds();
  breeds.forEach(b => {
    assert(b.id, 'Phải có id');
    assert(b.nameVi, 'Phải có nameVi');
    assert(b.rarity, 'Phải có rarity');
    assert(b.role, 'Phải có role');
    assert(b.colors, 'Phải có colors');
    assert(b.colors.primary, 'Phải có colors.primary');
    assert(b.colors.secondary, 'Phải có colors.secondary');
    assert(b.stats, 'Phải có stats');
    assert(typeof b.stats.hp === 'number', 'hp phải là number');
    assert(typeof b.stats.barkPower === 'number', 'barkPower phải là number');
  });
});

// 3. Kiểm tra getBreedInfo
it('getBreedInfo tìm kiếm chính xác theo key và fallback an toàn', () => {
  const corgi = DogRenderer.getBreedInfo('corgi');
  assert.strictEqual(corgi.id, 'corgi');
  assert.strictEqual(corgi.nameVi, 'Corgi Hoàng Gia');

  const husky = DogRenderer.getBreedInfo('HUSKY'); // Case-insensitive
  assert.strictEqual(husky.id, 'husky');

  const unknown = DogRenderer.getBreedInfo('chupacabra'); // Unknown fallback
  assert.strictEqual(unknown.id, 'corgi');
});

// 4. Kiểm tra createCharacter
it('createCharacter khởi tạo đối tượng chuẩn Tuất + [Tên] và thuộc tính', () => {
  const dog1 = DogRenderer.createCharacter({
    breed: 'shiba',
    rawNickname: 'Lão Đại',
    team: 'red'
  });

  assert.strictEqual(dog1.breed, 'shiba');
  assert.strictEqual(dog1.name, 'Tuất Lão Đại');
  assert.strictEqual(dog1.team, 'red');
  assert.strictEqual(dog1.hp, 100);
  assert.strictEqual(dog1.state, 'idle');
  assert.strictEqual(dog1.accessory.bandana, 'red');

  // Đã có tiền tố Tuất sẵn
  const dog2 = DogRenderer.createCharacter({
    breed: 'corgi',
    name: 'Tuất Béo Mầm'
  });
  assert.strictEqual(dog2.name, 'Tuất Béo Mầm');
});

// 5. Kiểm tra renderToSVG và renderDogSvg
it('renderToSVG xuất chuỗi SVG hợp lệ với <svg> và </svg>', () => {
  const svg = DogRenderer.renderToSVG('corgi', { size: 200, state: 'idle' });
  assert(typeof svg === 'string', 'SVG phải là string');
  assert(svg.startsWith('<svg'), 'SVG phải bắt đầu bằng thẻ <svg');
  assert(svg.endsWith('</svg>'), 'SVG phải kết thúc bằng thẻ </svg>');
  assert(svg.includes('viewBox="0 0 200 230"'), 'SVG phải chứa viewBox chuẩn');
});

it('renderDogSvg là alias chuẩn tương thích hợp đồng P2P', () => {
  const svg = DogRenderer.renderDogSvg('husky', { state: 'bark' });
  assert(svg.includes('husky'), 'Phải chứa metadata/class husky');
  assert(svg.includes('GÂU!'), 'Trạng thái bark phải có bong bóng sủa');
});

// 6. Kiểm tra toàn bộ 10 giống trong cả 5 trạng thái
it('Tất cả 10 giống chó kết xuất thành công trong 5 trạng thái không phát sinh lỗi', () => {
  const breeds = [
    'corgi', 'shiba', 'husky', 'pitbull', 'pug',
    'poodle', 'becgie', 'golden', 'doberman', 'chota'
  ];
  const states = ['idle', 'barking', 'exhausted', 'evolved_tiger', 'evolved_dragon'];

  breeds.forEach(breedId => {
    states.forEach(state => {
      const svg = DogRenderer.renderToSVG(breedId, {
        state: state,
        team: 'red',
        showUi: true
      });
      assert(svg.length > 500, `SVG của ${breedId} ở trạng thái ${state} quá ngắn`);
      assert(svg.includes('</svg>'), `SVG của ${breedId} ở trạng thái ${state} thiếu thẻ đóng`);
      
      // Kiểm tra đặc thù từng trạng thái
      if (state === 'barking') {
        assert(svg.includes('soundwaves') || svg.includes('GÂU!'), 'Barking phải có soundwaves');
      } else if (state === 'exhausted') {
        assert(svg.includes('panting') || svg.includes('tongue-shake'), 'Exhausted phải có panting effect');
      } else if (state === 'evolved_tiger') {
        assert(svg.includes('fire-aura') || svg.includes('Vằn Cọp'), 'Tiger evolved phải có aura/vằn');
      } else if (state === 'evolved_dragon') {
        assert(svg.includes('dragon-aura') || svg.includes('dragon-horns'), 'Dragon evolved phải có sừng/aura');
      }
    });
  });
});

// 7. Kiểm tra cấu trúc thẻ XML đóng mở hợp lệ cơ bản
it('Kiểm tra cân bằng thẻ mở/đóng cơ bản trong SVG xuất ra', () => {
  const breeds = ['corgi', 'pitbull', 'husky', 'pug', 'chota'];
  breeds.forEach(breed => {
    const svg = DogRenderer.renderToSVG(breed, { state: 'idle' });
    const openTags = (svg.match(/<svg/g) || []).length;
    const closeTags = (svg.match(/<\/svg>/g) || []).length;
    assert.strictEqual(openTags, closeTags, 'Thẻ svg phải cân bằng');
  });
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ TEST: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 TOÀN BỘ UNIT TESTS ĐỀU VƯỢT QUA XUẤT SẮC!\n');
}
