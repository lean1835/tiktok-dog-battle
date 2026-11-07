/**
 * Unit Test Suite cho Dog3DEngine (Three.js WebGL Procedural 3D)
 * Kiểm định toàn diện 10 giống loài, hoạt họa 4 chân, sóng âm sủa 3D,
 * Bảng tên Billboard 3D chống XSS, Sa bàn xóm phố và Audio Synthesizer.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const Dog3DEngine = require('../src/dog-3d-engine.js');

console.log('🧪 BẮT ĐẦU CHẠY UNIT TEST CHO DOG 3D ENGINE (THREE.JS LOW-POLY)...\n');

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

// 1. Kiểm tra 10 giống/loài sinh vật 3D
runTest('1. getAllBreeds trả về đủ 10 giống loài chuẩn (9 chó + 1 heo bựa)', () => {
  const breeds = Dog3DEngine.getAllBreeds();
  assert.strictEqual(breeds.length, 10, 'Phải có đúng 10 giống/loài 3D');
  const ids = breeds.map(b => b.id);
  const expected = ['vang', 'ven', 'muc', 'dom', 'lu', 'ki', 'becgie', 'pitbull', 'corgi', 'piggy'];
  for (const exp of expected) {
    assert.ok(ids.includes(exp), `Thiếu giống/loài 3D: ${exp}`);
  }
});

runTest('2. getBreedInfo truy xuất chính xác từng giống và hỗ trợ alias phong phú', () => {
  // Mr Vàng & alias
  const vang = Dog3DEngine.getBreedInfo('vang');
  assert.strictEqual(vang.id, 'vang');
  assert.strictEqual(vang.nameVi, 'Chó Ta Vàng Mr Vàng');
  assert.strictEqual(Dog3DEngine.getBreedInfo('chota').id, 'vang');
  assert.strictEqual(Dog3DEngine.getBreedInfo('mr_vang').id, 'vang');
  assert.strictEqual(Dog3DEngine.getBreedInfo('shiba').id, 'vang');

  // Chó Vện
  const ven = Dog3DEngine.getBreedInfo('ven');
  assert.strictEqual(ven.id, 'ven');
  assert.strictEqual(ven.proportions.hasStripes, true);

  // Chó Mực
  const muc = Dog3DEngine.getBreedInfo('muc');
  assert.strictEqual(muc.id, 'muc');
  assert.strictEqual(Dog3DEngine.getBreedInfo('doberman').id, 'muc');

  // Chó Đốm
  const dom = Dog3DEngine.getBreedInfo('dom');
  assert.strictEqual(dom.id, 'dom');
  assert.strictEqual(dom.proportions.hasSpots, true);

  // Chó Lu
  const lu = Dog3DEngine.getBreedInfo('lu');
  assert.strictEqual(lu.id, 'lu');
  assert.strictEqual(lu.proportions.isChubby, true);
  assert.strictEqual(Dog3DEngine.getBreedInfo('pug').id, 'lu');

  // Corgi Mông Tim
  const corgi = Dog3DEngine.getBreedInfo('corgi');
  assert.strictEqual(corgi.id, 'corgi');
  assert.strictEqual(corgi.proportions.hasHeartButt, true);

  // Pitbull
  const pitbull = Dog3DEngine.getBreedInfo('pitbull');
  assert.strictEqual(pitbull.id, 'pitbull');
  assert.strictEqual(pitbull.proportions.hasSpikeCollar, true);

  // Chú Heo Bựa Lạc Bầy
  const piggy = Dog3DEngine.getBreedInfo('piggy');
  assert.strictEqual(piggy.id, 'piggy');
  assert.strictEqual(piggy.proportions.isPiggy, true);
  assert.strictEqual(piggy.proportions.tailType, 'spring_spiral');
  assert.strictEqual(Dog3DEngine.getBreedInfo('heo').id, 'piggy');
  assert.strictEqual(Dog3DEngine.getBreedInfo('tru_bua').id, 'piggy');

  // Fallback an toàn
  const fallback = Dog3DEngine.getBreedInfo('loai_la_chua_biet');
  assert.strictEqual(fallback.id, 'vang');
});

runTest('3. Chống lỗ hổng XSS & Định dạng tên Billboard an toàn', () => {
  // Sanitize chuỗi
  const malicious = '<script>alert("hack")</script>&"\'';
  const sanitized = Dog3DEngine.sanitizeString(malicious);
  assert.ok(!sanitized.includes('<script>'), 'Không được chứa thẻ mở script');
  assert.ok(sanitized.includes('&lt;script&gt;'), 'Thẻ phải được encode HTML entity');
  assert.ok(sanitized.includes('&amp;'), '& phải được encode');

  // Tên chó: Tiền tố "🐾 CHÓ HOANG"
  assert.strictEqual(Dog3DEngine.formatCharacterName('Đại Ca Xóm', 'vang'), '🐾 CHÓ HOANG Đại Ca Xóm');
  assert.strictEqual(Dog3DEngine.formatCharacterName('Tuất Bánh Bao', 'corgi'), '🐾 CHÓ HOANG Bánh Bao');
  assert.strictEqual(Dog3DEngine.formatCharacterName('', 'vang'), '🐾 CHÓ HOANG Vàng');

  // Tên Heo: Tiền tố "🐾 TRƯ BỰA"
  assert.strictEqual(Dog3DEngine.formatCharacterName('Ỉn Đôremon', 'piggy'), '🐾 TRƯ BỰA Ỉn Đôremon');
  assert.strictEqual(Dog3DEngine.formatCharacterName('Trư Bát Giới', 'piggy'), '🐾 TRƯ BỰA Bát Giới');
  assert.strictEqual(Dog3DEngine.formatCharacterName('', 'piggy'), '🐾 TRƯ BỰA Ỉn Ỉn');
});

runTest('4. Khởi tạo đối tượng DogCharacter với đầy đủ cấu trúc khớp xương 3D', () => {
  const dog = Dog3DEngine.createDogModel({
    breed: 'corgi',
    name: 'Bắp Cải',
    team: 'red',
    hp: 95
  });

  assert.ok(dog.model, 'Phải có thuộc tính model (THREE.Group)');
  assert.strictEqual(dog.breedKey, 'corgi');
  assert.strictEqual(dog.team, 'red');
  assert.strictEqual(dog.hp, 95);

  const parts = dog.meshParts;
  assert.ok(parts.bodyPivot, 'Có khớp BodyPivot');
  assert.ok(parts.headPivot, 'Có khớp HeadPivot');
  assert.ok(parts.jawPivot, 'Có khớp JawPivot (mõm há)');
  assert.ok(parts.legFL, 'Có chân trước trái');
  assert.ok(parts.legFR, 'Có chân trước phải');
  assert.ok(parts.legBL, 'Có chân sau trái');
  assert.ok(parts.legBR, 'Có chân sau phải');
  assert.ok(parts.tailPivot, 'Có khớp Đuôi');
  assert.ok(parts.buttHeartMesh, 'Corgi phải có Mông Trái Tim');
  assert.ok(parts.shockwavesGroup, 'Có nhóm sóng âm 3D');
  assert.strictEqual(parts.shockwaveMeshes.length, 3, 'Có 3 vòng sóng âm sẵn sàng');
  assert.ok(dog.billboard, 'Có Bảng tên 3D Billboard');
});

runTest('5. Mô hình Chú Heo Bựa Lạc Bầy (Piggy) có cấu tạo hài hước đặc trưng', () => {
  const heo = Dog3DEngine.createDogModel({
    breed: 'piggy',
    name: 'Ủn Ỉn Lạc Bầy',
    team: 'blue'
  });

  assert.strictEqual(heo.breedKey, 'piggy');
  assert.strictEqual(heo.displayName, '🐾 TRƯ BỰA Ủn Ỉn Lạc Bầy');
  assert.ok(heo.meshParts.jawPivot.children.length >= 2, 'Mõm heo có đĩa mũi và lỗ mũi to');
  assert.ok(heo.meshParts.tailPivot.children.length > 0, 'Heo có đuôi lò xo xoắn');
});

runTest('6. Hoạt họa chuyển động: Sủa (barking) và sóng âm chấn động 3D', () => {
  const dog = Dog3DEngine.createDogModel({ breed: 'vang', team: 'red' });

  // Ban đầu idle
  dog.setState('idle');
  dog.update(0.016);
  assert.strictEqual(dog.meshParts.shockwaveMeshes.filter(s => s.active).length, 0);

  // Kích hoạt sủa
  dog.triggerBark(0.5);
  assert.strictEqual(dog.isBarkingNow, true);
  assert.strictEqual(dog.meshParts.shockwaveMeshes.filter(s => s.active).length, 1, 'Đã bung 1 vòng sóng âm');

  // Update vài frame
  dog.update(0.1);
  const activeSW = dog.meshParts.shockwaveMeshes.find(s => s.active);
  assert.ok(activeSW, 'Sóng âm đang bay và nở');
  assert.ok(activeSW.mesh.scale.x > 1.0, 'Sóng âm đã phóng to theo thời gian');
  assert.ok(activeSW.mesh.material.opacity < 0.85, 'Sóng âm mờ dần');
});

runTest('7. Hoạt họa di chuyển (walk / run) đung đưa chéo 4 chân nhịp nhàng', () => {
  const dog = Dog3DEngine.createDogModel({ breed: 'becgie', team: 'blue' });
  dog.setState('walk');

  const parts = dog.meshParts;
  dog.update(0.05);

  // Chân FL và FR phải ngược pha (dấu trái ngược nhau ở hầu hết thời điểm)
  // và góc quay x khác 0
  const rotFL = parts.legFL.rotation.x;
  const rotFR = parts.legFR.rotation.x;
  assert.ok(Math.abs(rotFL) > 0.001 || Math.abs(rotFR) > 0.001, '4 chân đang vung bước');
  assert.ok(rotFL * rotFR <= 0, 'FL và FR chuyển động chéo ngược chiều nhau');
});

runTest('8. Trạng thái Kiệt sức (exhausted) và Hóa Thần Thú (evolved_tiger & dragon)', () => {
  const dog = Dog3DEngine.createDogModel({ breed: 'pitbull' });

  // Kiệt sức
  dog.setState('exhausted');
  dog.update(0.05);
  assert.strictEqual(dog.state, 'exhausted');
  assert.ok(dog.meshParts.headPivot.rotation.x > 0.3, 'Đầu rũ gục xuống khi kiệt sức');

  // Hóa Hổ
  dog.setState('evolved_tiger');
  dog.update(0.05);
  assert.strictEqual(dog.meshParts.auraGroup.visible, true);
  assert.strictEqual(dog.meshParts.tigerAuraMesh.visible, true);
  assert.strictEqual(dog.meshParts.dragonAuraMesh.visible, false);

  // Hóa Rồng
  dog.setState('evolved_dragon');
  dog.update(0.05);
  assert.strictEqual(dog.meshParts.auraGroup.visible, true);
  assert.strictEqual(dog.meshParts.tigerAuraMesh.visible, false);
  assert.strictEqual(dog.meshParts.dragonAuraMesh.visible, true);
});

runTest('9. Cập nhật HP, Team và Tên nhân vật', () => {
  const dog = Dog3DEngine.createDogModel({ breed: 'lu', hp: 100, team: 'blue' });

  // Giảm HP
  dog.setHp(30);
  assert.strictEqual(dog.hp, 30);

  // Giảm về 0 tự động chuyển sang exhausted
  dog.setHp(0);
  assert.strictEqual(dog.state, 'exhausted');

  // Đổi team sang red
  dog.setTeam('red');
  assert.strictEqual(dog.team, 'red');

  // Đổi tên
  dog.setName('Lu Béo Ú');
  assert.strictEqual(dog.displayName, '🐾 CHÓ HOANG Lu Béo Ú');
});

runTest('10. Sa bàn Xóm Phố Việt Nam (Vietnamese Village Arena Scene)', () => {
  const arena = Dog3DEngine.createVillageArenaScene();
  assert.ok(arena, 'Tạo được sa bàn 3D');
  assert.strictEqual(arena.name, 'VietnameseVillageArena');
  assert.ok(arena.children.length >= 8, 'Sa bàn có đầy đủ sàn gạch, ranh giới sơn, vỉa hè, tường gạch, cột điện, cây chuối, ghế nhựa');
});

runTest('11. Web Audio Synthesizer 100% Offline', () => {
  const synth = new Dog3DEngine.DogAudioSynthesizer();
  assert.ok(synth, 'Khởi tạo thành công DogAudioSynthesizer');
  assert.strictEqual(typeof synth.playBark, 'function');
  assert.strictEqual(typeof synth.playEvolveRoar, 'function');
  assert.strictEqual(typeof synth.toggleMute, 'function');
  assert.strictEqual(typeof synth.setVolume, 'function');

  const muted = synth.toggleMute();
  assert.strictEqual(muted, true);
  assert.strictEqual(synth.toggleMute(), false);
});

runTest('12. Kiểm tra tiếp đất 4 chân tại Y=0 và khoảng cách an toàn Billboard cho cả 10 giống loài', () => {
  const THREE = require('three');
  for (const breed of Dog3DEngine.getAllBreeds()) {
    const d = Dog3DEngine.createDogModel({ breed: breed.id });
    d.model.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(d.meshParts.bodyPivot);
    const pawBox = new THREE.Box3().setFromObject(d.meshParts.legFL.children[1]);
    const bbY = d.billboard.children[0].position.y;

    assert.ok(Math.abs(pawBox.min.y) < 0.05, `Bàn chân ${breed.id} phải tiếp đất sát Y=0, thực tế: ${pawBox.min.y}`);
    assert.ok(bbY > bbox.max.y, `Billboard ${breed.id} phải nằm trên đầu không che tai! bbY=${bbY}, maxY=${bbox.max.y}`);
  }
});

runTest('13. Tọa độ sóng âm 3D trùng khít vị trí mõm chó trong không gian 3D', () => {
  const THREE = require('three');
  const dog = Dog3DEngine.createDogModel({ breed: 'vang' });
  dog.model.position.set(-6, 0, 4.5);
  dog.model.rotation.y = Math.PI / 2;
  dog.model.updateMatrixWorld(true);

  const jawWorld = new THREE.Vector3();
  dog.meshParts.jawPivot.getWorldPosition(jawWorld);
  dog.triggerBark();
  dog.model.updateMatrixWorld(true);

  const sw = dog.meshParts.shockwaveMeshes[0];
  const swWorld = new THREE.Vector3();
  sw.mesh.getWorldPosition(swWorld);
  const dist = swWorld.distanceTo(jawWorld);
  assert.ok(dist < 0.05, `Sóng âm phải xuất phát từ mõm chó! Khoảng cách thực tế: ${dist}`);
});

console.log('\n========================================');
console.log(`🎉 TỔNG KẾT KIỂM THỬ 3D: ${passCount} PASSED, ${failCount} FAILED`);
console.log('========================================\n');

if (failCount > 0) {
  process.exit(1);
}
