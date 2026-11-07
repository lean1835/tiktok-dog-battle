/**
 * TikTok Dog Battle - 3D WebGL Procedural Low-Poly Dog Engine (Three.js)
 * Module kết xuất 10 giống/loại sinh vật 3D Low-Poly phong cách "Một Ngày Làm Chó" (chosimulator):
 * 1. Chó Ta Vàng Mr Vàng (vang / chota / mr_vang / shiba)
 * 2. Chó Vện (ven)
 * 3. Chó Mực (muc / doberman)
 * 4. Chó Đốm (dom)
 * 5. Chó Lu (lu / pug)
 * 6. Chó Ki (ki / husky)
 * 7. Chó Becgie (becgie)
 * 8. Chó Pitbull (pitbull)
 * 9. Corgi Mông Tim (corgi)
 * 10. Chú Heo Bựa Lạc Bầy (piggy / heo)
 *
 * Tính năng chính:
 * - 100% Procedural Geometry (Box, Cylinder, Sphere, Cone, Ring) - Zero external 3D models.
 * - Khớp hoạt họa đầy đủ: 4 chân (pivoted), đầu gật/ngước, mõm há sủa, đuôi vẫy/xoắn, mông tim lắc lư (corgi), mũi heo hếch (piggy).
 * - Sóng âm 3D chấn động (shockwaves) bung tỏa khi sủa.
 * - Bảng tên 3D Billboard tự xoay hướng Camera ("🐾 CHÓ HOANG [Tên]" / "🐾 TRƯ BỰA [Tên]") + Thanh máu HP đổi màu + Chống XSS Sanitization.
 * - Trạng thái: idle, walk, run, barking, exhausted, evolved_tiger, evolved_dragon.
 * - Web Audio API sủa bựa 100% offline không cần file mp3/wav ngoài.
 * - Môi trường sa bàn Isometric xóm phố Việt Nam (vỉa hè, cột điện chằng chịt, cây chuối, ghế nhựa vỉa hè).
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    let THREE;
    try {
      THREE = require('three');
    } catch (e) {
      THREE = require('../lib/three.min.js');
    }
    module.exports = factory(THREE);
  } else if (typeof define === 'function' && define.amd) {
    define(['three'], factory);
  } else {
    root.Dog3DEngine = factory(root.THREE);
  }
})(typeof self !== 'undefined' ? self : this, function (THREE) {
  'use strict';

  if (!THREE) {
    throw new Error('Dog3DEngine requires Three.js. Make sure Three.js is loaded.');
  }

  // ==========================================
  // 1. DANH MỤC 10 GIỐNG / LOÀI 3D PROCEDURAL
  // ==========================================
  const BREED_REGISTRY = {
    vang: {
      id: 'vang',
      aliases: ['chota', 'mr_vang', 'shiba', 'golden'],
      nameVi: 'Chó Ta Vàng Mr Vàng',
      nameEn: 'Vietnamese Golden Dog',
      role: 'Đấu Sĩ',
      rarity: 'Huyền Thoại',
      tagline: 'Đại ca đầu xóm, lanh lợi khôn ngoan, sủa vang một cõi',
      specialTrait: 'Chó cỏ Việt Nam tinh ranh, lông vàng rơm, đuôi cong vắt vẻo, nụ cười tinh quái',
      stats: { hp: 110, barkPower: 115, speed: 85, stamina: 100 },
      colors: {
        body: 0xf59e0b,       // Vàng cam ấm
        belly: 0xfef3c7,      // Trắng kem ức & bụng
        snout: 0xd97706,      // Mõm vàng sẫm
        nose: 0x1c1917,       // Mũi đen bóng
        ears: 0xb45309,       // Tai vàng nâu
        eyes: 0x1e1b4b,
        tail: 0xf59e0b,
        paws: 0xffedd5
      },
      proportions: {
        bodyScale: [1.0, 0.9, 1.4],
        headScale: [0.9, 0.85, 0.9],
        legLength: 0.95,
        legRadius: 0.15,
        tailType: 'curl',
        earType: 'point_up'
      }
    },
    ven: {
      id: 'ven',
      aliases: ['choven', 'tiger_dog'],
      nameVi: 'Chó Vện',
      nameEn: 'Vietnamese Brindle Dog',
      role: 'Sát Thủ',
      rarity: 'Sử Thi',
      tagline: 'Vằn cọp dũng mãnh, chiến thần xóm ngõ',
      specialTrait: 'Bộ lông vằn vện hổ báo, phản xạ thần tốc, gầm sủa uy lực',
      stats: { hp: 115, barkPower: 120, speed: 92, stamina: 90 },
      colors: {
        body: 0x92400e,       // Nâu đồng hổ
        belly: 0xfef3c7,
        snout: 0x78350f,
        nose: 0x18181b,
        ears: 0x451a03,
        eyes: 0xfacc15,       // Mắt hổ vàng rực
        tail: 0x92400e,
        paws: 0xd97706,
        stripes: 0x3f1a07     // Sọc vện hổ
      },
      proportions: {
        bodyScale: [1.05, 0.92, 1.45],
        headScale: [0.92, 0.88, 0.95],
        legLength: 1.0,
        legRadius: 0.16,
        hasStripes: true,
        tailType: 'sickle',
        earType: 'point_forward'
      }
    },
    muc: {
      id: 'muc',
      aliases: ['doberman', 'chomuc', 'black_dog'],
      nameVi: 'Chó Mực',
      nameEn: 'Midnight Black Dog',
      role: 'Vệ Sĩ',
      rarity: 'Hiếm',
      tagline: 'Đen tuyền bóng đêm, đôi mắt sáng như ngọc đuốc',
      specialTrait: 'Lông đen nhánh trừ tà, thân hình vạm vỡ, trung thành tuyệt đối',
      stats: { hp: 125, barkPower: 110, speed: 88, stamina: 95 },
      colors: {
        body: 0x18181b,       // Đen tuyền huyền bí
        belly: 0x27272a,
        snout: 0x1c1917,
        nose: 0x09090b,
        ears: 0x18181b,
        eyes: 0x38bdf8,       // Mắt xanh sáng ngọc
        tail: 0x18181b,
        paws: 0x3f3f46,
        chestTan: 0x9a3412    // Đốm hung ngực
      },
      proportions: {
        bodyScale: [1.02, 0.95, 1.5],
        headScale: [0.9, 0.9, 0.95],
        legLength: 1.05,
        legRadius: 0.16,
        hasChestTan: true,
        tailType: 'long',
        earType: 'point_up'
      }
    },
    dom: {
      id: 'dom',
      aliases: ['dalmatian', 'chodom'],
      nameVi: 'Chó Đốm',
      nameEn: 'Dalmatian Spotty Dog',
      role: 'Xạ Thủ',
      rarity: 'Hiếm',
      tagline: 'Bông đốm lốm đốm, vui vẻ hòa đồng',
      specialTrait: 'Toàn thân trắng muốt phủ đốm đen ngộ nghĩnh, tai cụp tinh nghịch',
      stats: { hp: 100, barkPower: 105, speed: 95, stamina: 85 },
      colors: {
        body: 0xf8fafc,       // Trắng tuyết
        belly: 0xf1f5f9,
        snout: 0xe2e8f0,
        nose: 0x0f172a,
        ears: 0x1e293b,       // Tai có đốm đen
        eyes: 0x0284c7,
        tail: 0xf8fafc,
        paws: 0xffffff,
        spots: 0x0f172a       // Đốm đen
      },
      proportions: {
        bodyScale: [0.98, 0.9, 1.4],
        headScale: [0.88, 0.85, 0.9],
        legLength: 1.0,
        legRadius: 0.15,
        hasSpots: true,
        tailType: 'whip',
        earType: 'floppy'
      }
    },
    lu: {
      id: 'lu',
      aliases: ['pug', 'cholu'],
      nameVi: 'Chó Lu',
      nameEn: 'Vietnamese Lu Dog (Fat Pug)',
      role: 'Đỡ Đòn',
      rarity: 'Đặc Biệt',
      tagline: 'Tròn như cái lu nước, ăn no lăn quay',
      specialTrait: 'Thân hình mập tròn mũm mĩm, 4 chân ngắn ngủn lon ton, mặt xệ siêu hài',
      stats: { hp: 140, barkPower: 70, speed: 45, stamina: 80 },
      colors: {
        body: 0xd4a373,       // Vàng be bánh quy nướng
        belly: 0xfae8b6,
        snout: 0x18181b,      // Mặt nạ đen nhăn xệ
        nose: 0x09090b,
        ears: 0x18181b,       // Tai cụp đen
        eyes: 0x1e1b4b,
        tail: 0xd4a373,
        paws: 0xa67c52
      },
      proportions: {
        bodyScale: [1.38, 1.25, 1.25], // Tròn mập ú như cái lu
        headScale: [1.15, 1.05, 0.85], // Đầu tròn to
        legLength: 0.62,               // Chân siêu ngắn
        legRadius: 0.22,
        isChubby: true,
        tailType: 'corkscrew',
        earType: 'floppy_small'
      }
    },
    ki: {
      id: 'ki',
      aliases: ['choki', 'husky', 'poodle'],
      nameVi: 'Chó Ki',
      nameEn: 'Vietnamese Energetic Ki Dog',
      role: 'Xung Kích',
      rarity: 'Hiếm',
      tagline: 'Tăng động siêu cấp, chân thoăn thoắt không ngừng',
      specialTrait: 'Nhỏ con nhanh nhẹn, đôi mắt long lanh ngáo ngơ, sủa lia lịa',
      stats: { hp: 90, barkPower: 110, speed: 105, stamina: 90 },
      colors: {
        body: 0x64748b,       // Xám khói bạc
        belly: 0xf8fafc,      // Bụng trắng
        snout: 0x475569,
        nose: 0x0f172a,
        ears: 0x334155,
        eyes: 0x00f2fe,       // Mắt xanh băng giá
        tail: 0x64748b,
        paws: 0xffffff,
        flameMark: 0xf8fafc   // Vệt lửa trên trán
      },
      proportions: {
        bodyScale: [0.92, 0.86, 1.3],
        headScale: [0.85, 0.82, 0.88],
        legLength: 0.9,
        legRadius: 0.14,
        tailType: 'plume',
        earType: 'point_up'
      }
    },
    becgie: {
      id: 'becgie',
      aliases: ['germanshepherd', 'bec_gie'],
      nameVi: 'Chó Becgie',
      nameEn: 'German Shepherd Police Dog',
      role: 'Chỉ Huy',
      rarity: 'Sử Thi',
      tagline: 'Cảnh khuyển oai nghiêm, kỷ luật sắt thép',
      specialTrait: 'Đôi tai vểnh cao dũng mãnh, lưng yên ngựa đen bóng, mõm dài uy quyền',
      stats: { hp: 120, barkPower: 125, speed: 90, stamina: 95 },
      colors: {
        body: 0xb45309,       // Nâu sẫm
        belly: 0xfde047,
        snout: 0x1c1917,      // Mõm đen tuyền
        nose: 0x0a0a0a,
        ears: 0x78350f,       // Tai dựng nhọn
        eyes: 0xca8a04,
        tail: 0x78350f,
        paws: 0xd97706,
        saddle: 0x18181b      // Yên ngựa đen trên lưng
      },
      proportions: {
        bodyScale: [1.02, 0.98, 1.55],
        headScale: [0.95, 0.95, 1.05],
        legLength: 1.1,
        legRadius: 0.17,
        hasSaddle: true,
        tailType: 'bushy_down',
        earType: 'tall_erect'
      }
    },
    pitbull: {
      id: 'pitbull',
      aliases: ['pit_bull', 'chobull'],
      nameVi: 'Chó Pitbull',
      nameEn: 'American Pitbull Warrior',
      role: 'Đấu Sĩ',
      rarity: 'Sử Thi',
      tagline: 'Cơ bắp cuồn cuộn, vòng đinh hầm hố',
      specialTrait: 'Đầu vuông cơ bắp, cổ đeo vòng đinh nhọn, hàm thép đớp không buông',
      stats: { hp: 135, barkPower: 130, speed: 75, stamina: 100 },
      colors: {
        body: 0x475569,       // Xám chì cứng cáp
        belly: 0xe2e8f0,      // Mảng trắng ngực
        snout: 0x334155,
        nose: 0x0f172a,
        ears: 0x1e293b,
        eyes: 0xef4444,       // Mắt đỏ lửa chiến binh
        tail: 0x334155,
        paws: 0x64748b,
        collar: 0x991b1b,     // Vòng cổ đỏ đinh tán
        spikes: 0xe2e8f0      // Đinh gai bạc
      },
      proportions: {
        bodyScale: [1.2, 1.05, 1.4],  // Ngực nở vạm vỡ
        headScale: [1.2, 1.1, 0.95],  // Đầu vuông bạnh to
        legLength: 0.88,
        legRadius: 0.22,
        hasSpikeCollar: true,
        tailType: 'straight',
        earType: 'clipped'
      }
    },
    corgi: {
      id: 'corgi',
      aliases: ['corgi_mong_tim'],
      nameVi: 'Corgi Mông Tim',
      nameEn: 'Heart-Butt Corgi',
      role: 'Quyến Rũ',
      rarity: 'Hiếm',
      tagline: 'Chân ngắn kiêu sa, mông hình trái tim lắc lư',
      specialTrait: 'Mông trái tim căng mọng lắc lư theo bước đi, tai to như cánh bướm',
      stats: { hp: 110, barkPower: 85, speed: 70, stamina: 85 },
      colors: {
        body: 0xf97316,       // Cam đào tươi tắn
        belly: 0xfff7ed,      // Trắng ngực & vệt trán
        snout: 0xea580c,
        nose: 0x1c1917,
        ears: 0xfb923c,
        eyes: 0x1e1b4b,
        tail: 0xf97316,
        paws: 0xffffff,
        buttHeart: 0xffedd5   // Mông trái tim nổi bật
      },
      proportions: {
        bodyScale: [1.12, 0.9, 1.45],
        headScale: [0.95, 0.9, 0.9],
        legLength: 0.52,      // Chân siêu ngắn
        legRadius: 0.17,
        hasHeartButt: true,   // Mông trái tim đặc trưng
        tailType: 'tiny_bob',
        earType: 'large_foxy'
      }
    },
    piggy: {
      id: 'piggy',
      aliases: ['heo', 'chu_heo', 'pig', 'tru_bua'],
      nameVi: 'Chú Heo Bựa Lạc Bầy',
      nameEn: 'Funny Lost Piggy In Dog Squad',
      role: 'Troll Chúa',
      rarity: 'Thần Thoại',
      tagline: 'Ủn ỉn éc éc! Chú heo bựa lạc bầy nhưng sủa không kém ai!',
      specialTrait: 'Toàn thân hồng phấn, mũi tròn 2 lỗ to tướng hếch lên, đuôi xoắn lò xo cực bựa',
      stats: { hp: 150, barkPower: 99, speed: 65, stamina: 110 },
      colors: {
        body: 0xf472b6,       // Hồng phấn đáng yêu
        belly: 0xfbcfe8,      // Hồng nhạt bụng
        snout: 0xec4899,      // Mũi đĩa hồng đậm
        nose: 0x831843,       // 2 lỗ mũi to tướng
        ears: 0xdb2777,       // Tai heo vểnh cụp
        eyes: 0x0f172a,
        tail: 0xf472b6,
        paws: 0xdb2777        // Móng guốc hồng đậm
      },
      proportions: {
        bodyScale: [1.32, 1.22, 1.3], // Tròn ủn ỉn
        headScale: [1.1, 1.05, 0.88],
        legLength: 0.6,
        legRadius: 0.2,
        isPiggy: true,
        hasPigSnout: true,
        tailType: 'spring_spiral',
        earType: 'pig_ears'
      }
    }
  };

  // Map alias về ID chính quy
  const ALIAS_MAP = {};
  for (const [key, breed] of Object.entries(BREED_REGISTRY)) {
    ALIAS_MAP[key] = key;
    if (breed.aliases) {
      for (const al of breed.aliases) {
        ALIAS_MAP[al.toLowerCase()] = key;
      }
    }
  }

  function resolveBreedKey(key) {
    if (!key) return 'vang';
    const clean = String(key).trim().toLowerCase();
    return ALIAS_MAP[clean] || 'vang';
  }

  function getBreedInfo(key) {
    const canonical = resolveBreedKey(key);
    return BREED_REGISTRY[canonical] || BREED_REGISTRY.vang;
  }

  function getAllBreeds() {
    return Object.values(BREED_REGISTRY);
  }

  // ==========================================
  // 2. TIỆN ÍCH AN TOÀN & XSS SANITIZATION
  // ==========================================
  function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim();
  }

  function formatCharacterName(rawName, breedKey) {
    const isPig = resolveBreedKey(breedKey) === 'piggy';
    const prefix = isPig ? '🐾 TRƯ BỰA' : '🐾 CHÓ HOANG';
    if (!rawName || typeof rawName !== 'string' || rawName.trim() === '') {
      return isPig ? `${prefix} Ỉn Ỉn` : `${prefix} Vàng`;
    }
    const clean = rawName.trim();
    if (clean.startsWith('🐾 CHÓ HOANG') || clean.startsWith('🐾 TRƯ BỰA')) {
      return clean;
    }
    if (clean.startsWith('Tuất ') || clean.startsWith('Trư ')) {
      return `${prefix} ${clean.replace(/^(Tuất|Trư)\s+/, '')}`;
    }
    return `${prefix} ${clean}`;
  }

  // ==========================================
  // 3. TIỆN ÍCH TẠO VẬT LIỆU & HÌNH HỌC LOW-POLY
  // ==========================================
  function createMaterial(colorHex, options = {}) {
    return new THREE.MeshLambertMaterial({
      color: colorHex,
      flatShading: true,
      ...options
    });
  }

  // ==========================================
  // 4. KHỞI TẠO BẢNG TÊN 3D BILLBOARD CANVAS
  // ==========================================
  function createBillboard(nameText, hpPercent, maxHp, isPig, heightOffset = 3.5) {
    const group = new THREE.Group();
    group.name = 'BillboardGroup';

    let canvas, ctx, texture;
    const isBrowser = typeof document !== 'undefined';

    if (isBrowser) {
      canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 180;
      ctx = canvas.getContext('2d');
      texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
    }

    const material = new THREE.SpriteMaterial({
      map: texture || null,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.4, 1.15, 1.0);
    sprite.position.set(0, heightOffset, 0);
    group.add(sprite);

    function redraw(name, hp, max) {
      if (!ctx || !canvas) return;
      const pct = Math.max(0, Math.min(100, Math.round((hp / (max || 100)) * 100)));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nền bảng tên bo góc
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = isPig ? '#ec4899' : '#f59e0b';
      ctx.lineWidth = 6;
      roundRect(ctx, 12, 10, 488, 156, 26, true, true);

      // Icon & Tên nhân vật (chống XSS)
      const cleanName = sanitizeString(name);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Shadow / Outline cho text sắc nét
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(cleanName, 256, 52);
      ctx.shadowBlur = 0;

      // Khung thanh máu HP
      const barX = 40;
      const barY = 96;
      const barW = 432;
      const barH = 32;

      ctx.fillStyle = '#0f172a';
      roundRect(ctx, barX, barY, barW, barH, 16, true, false);

      // Màu máu thay đổi: Xanh lá -> Vàng -> Đỏ
      let hpColor = '#10b981'; // > 50%
      if (pct <= 25) {
        hpColor = '#ef4444'; // Nguy cấp
      } else if (pct <= 55) {
        hpColor = '#f59e0b'; // Trung bình
      }

      const fillW = Math.max(14, Math.round((barW * pct) / 100));
      ctx.fillStyle = hpColor;
      roundRect(ctx, barX, barY, fillW, barH, 16, true, false);

      // Chữ HP Text với viền đen chống chìm màu
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(`${hp} / ${max || 100} HP (${pct}%)`, 256, barY + barH / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${hp} / ${max || 100} HP (${pct}%)`, 256, barY + barH / 2);

      if (texture) texture.needsUpdate = true;
    }

    redraw(nameText, hpPercent, maxHp);

    group.userData = {
      sprite,
      canvas,
      ctx,
      texture,
      redraw,
      hp: hpPercent,
      maxHp: maxHp || 100,
      name: nameText,
      heightOffset
    };

    return group;
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ==========================================
  // 5. MÔ HÌNH HỌC PROCEDURAL CHO TỪNG GIỐNG
  // ==========================================
  function buildDogMesh(breedInfo, teamColor) {
    const root = new THREE.Group();
    root.name = `DogMesh_${breedInfo.id}`;

    const c = breedInfo.colors;
    const p = breedInfo.proportions;

    // Vật liệu chính
    const matBody = createMaterial(c.body);
    const matBelly = createMaterial(c.belly);
    const matSnout = createMaterial(c.snout);
    const matNose = createMaterial(c.nose);
    const matEars = createMaterial(c.ears);
    const matEyes = createMaterial(c.eyes);
    const matPaws = createMaterial(c.paws);

    // Vật liệu Team (Khăn Bandana)
    let bandanaColor = 0xffffff;
    if (teamColor === 'red') bandanaColor = 0xef4444;
    else if (teamColor === 'blue') bandanaColor = 0x3b82f6;
    else if (teamColor === 'gold') bandanaColor = 0xf59e0b;
    const matBandana = createMaterial(bandanaColor);

    // ------------------------------------------
    // A. Thân mình (Body Pivot)
    // ------------------------------------------
    const bodyPivot = new THREE.Group();
    bodyPivot.name = 'BodyPivot';
    bodyPivot.position.set(0, p.legLength + 0.38 * p.bodyScale[1], 0);

    const bodyGeo = new THREE.BoxGeometry(
      p.bodyScale[0],
      p.bodyScale[1],
      p.bodyScale[2]
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyPivot.add(bodyMesh);

    // Bụng / Ức sáng màu
    const bellyGeo = new THREE.BoxGeometry(
      p.bodyScale[0] * 0.88,
      p.bodyScale[1] * 0.4,
      p.bodyScale[2] * 0.8
    );
    const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
    bellyMesh.position.set(0, -p.bodyScale[1] * 0.32, 0);
    bodyPivot.add(bellyMesh);

    // Corgi: Mông Trái Tim (Heart Butt)
    let buttHeartMesh = null;
    if (p.hasHeartButt) {
      buttHeartMesh = new THREE.Group();
      buttHeartMesh.name = 'HeartButt';
      const heartMat = createMaterial(c.buttHeart || 0xffedd5);
      const lobeGeo = new THREE.SphereGeometry(0.34, 12, 12);
      const leftLobe = new THREE.Mesh(lobeGeo, heartMat);
      leftLobe.position.set(-0.2, 0, -p.bodyScale[2] * 0.48);
      const rightLobe = new THREE.Mesh(lobeGeo, heartMat);
      rightLobe.position.set(0.2, 0, -p.bodyScale[2] * 0.48);
      buttHeartMesh.add(leftLobe, rightLobe);
      bodyPivot.add(buttHeartMesh);
    }

    // Vện: Sọc vằn cọp
    if (p.hasStripes) {
      const stripeMat = createMaterial(c.stripes || 0x3f1a07);
      const stripeGeo = new THREE.BoxGeometry(p.bodyScale[0] * 1.03, 0.12, 0.14);
      for (let z = -0.4; z <= 0.4; z += 0.28) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 0.1, z);
        bodyPivot.add(stripe);
      }
    }

    // Đốm: Đốm đen Dalmatian
    if (p.hasSpots) {
      const spotMat = createMaterial(c.spots || 0x0f172a);
      const spotGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const spotCoords = [
        [0.35, 0.2, 0.2],
        [-0.38, 0.1, -0.3],
        [0.25, -0.1, -0.2],
        [-0.3, 0.25, 0.3]
      ];
      spotCoords.forEach(pos => {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.position.set(...pos);
        spot.scale.set(1.2, 0.6, 1.2);
        bodyPivot.add(spot);
      });
    }

    // Becgie: Yên ngựa đen trên lưng
    if (p.hasSaddle) {
      const saddleMat = createMaterial(c.saddle || 0x18181b);
      const saddleGeo = new THREE.BoxGeometry(
        p.bodyScale[0] * 1.02,
        p.bodyScale[1] * 0.45,
        p.bodyScale[2] * 0.65
      );
      const saddle = new THREE.Mesh(saddleGeo, saddleMat);
      saddle.position.set(0, 0.22, -0.1);
      bodyPivot.add(saddle);
    }

    // ------------------------------------------
    // B. Đầu & Cổ (Head Pivot)
    // ------------------------------------------
    const headPivot = new THREE.Group();
    headPivot.name = 'HeadPivot';
    headPivot.position.set(0, 0.4 * p.bodyScale[1], p.bodyScale[2] * 0.48);

    const headGeo = new THREE.BoxGeometry(
      p.headScale[0],
      p.headScale[1],
      p.headScale[2]
    );
    const headMesh = new THREE.Mesh(headGeo, matBody);
    headMesh.position.set(0, 0.3, 0.15);
    headMesh.castShadow = true;
    headPivot.add(headMesh);

    // Mõm (Snout & Jaw)
    const jawPivot = new THREE.Group();
    jawPivot.name = 'JawPivot';
    jawPivot.position.set(0, 0.18, 0.6);

    let snoutMesh;
    if (p.isPiggy) {
      // Mũi heo bựa: Hình trụ dẹt với 2 lỗ to
      const pigDiscGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
      pigDiscGeo.rotateX(Math.PI / 2);
      snoutMesh = new THREE.Mesh(pigDiscGeo, matSnout);
      jawPivot.add(snoutMesh);

      const nostrilMat = createMaterial(c.nose || 0x831843);
      const nostrilGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8);
      nostrilGeo.rotateX(Math.PI / 2);
      const leftNos = new THREE.Mesh(nostrilGeo, nostrilMat);
      leftNos.position.set(-0.08, 0, 0.05);
      const rightNos = new THREE.Mesh(nostrilGeo, nostrilMat);
      rightNos.position.set(0.08, 0, 0.05);
      jawPivot.add(leftNos, rightNos);
    } else {
      // Mõm chó thông thường
      const snoutGeo = new THREE.BoxGeometry(
        p.headScale[0] * 0.55,
        p.headScale[1] * 0.45,
        0.48
      );
      snoutMesh = new THREE.Mesh(snoutGeo, matSnout);
      jawPivot.add(snoutMesh);

      // Mũi đen
      const noseGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const noseMesh = new THREE.Mesh(noseGeo, matNose);
      noseMesh.position.set(0, 0.12, 0.25);
      jawPivot.add(noseMesh);
    }
    headPivot.add(jawPivot);

    // Mắt (Eyes)
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, matEyes);
    leftEye.position.set(-p.headScale[0] * 0.3, 0.38, 0.58);
    const rightEye = new THREE.Mesh(eyeGeo, matEyes);
    rightEye.position.set(p.headScale[0] * 0.3, 0.38, 0.58);
    headPivot.add(leftEye, rightEye);

    // Tai (Ears)
    const earGroupL = new THREE.Group();
    const earGroupR = new THREE.Group();

    if (p.earType === 'tall_erect' || p.earType === 'point_up') {
      const earGeo = new THREE.ConeGeometry(0.18, 0.48, 4);
      earGeo.rotateY(Math.PI / 4);
      const earL = new THREE.Mesh(earGeo, matEars);
      const earR = new THREE.Mesh(earGeo, matEars);
      earGroupL.add(earL);
      earGroupR.add(earR);
      earGroupL.position.set(-0.35, 0.82, 0.1);
      earGroupR.position.set(0.35, 0.82, 0.1);
      earGroupL.rotation.z = -0.15;
      earGroupR.rotation.z = 0.15;
    } else if (p.earType === 'large_foxy') {
      // Corgi tai to vểnh
      const earGeo = new THREE.BoxGeometry(0.32, 0.5, 0.08);
      const earL = new THREE.Mesh(earGeo, matEars);
      const earR = new THREE.Mesh(earGeo, matEars);
      earGroupL.add(earL);
      earGroupR.add(earR);
      earGroupL.position.set(-0.42, 0.8, 0.12);
      earGroupR.position.set(0.42, 0.8, 0.12);
      earGroupL.rotation.z = -0.35;
      earGroupR.rotation.z = 0.35;
    } else if (p.earType === 'pig_ears' || p.earType === 'floppy' || p.earType === 'floppy_small') {
      // Tai cụp / tai heo
      const earGeo = new THREE.BoxGeometry(0.25, 0.38, 0.08);
      const earL = new THREE.Mesh(earGeo, matEars);
      const earR = new THREE.Mesh(earGeo, matEars);
      earGroupL.add(earL);
      earGroupR.add(earR);
      earGroupL.position.set(-0.46, 0.45, 0.18);
      earGroupR.position.set(0.46, 0.45, 0.18);
      earGroupL.rotation.z = -0.55;
      earGroupR.rotation.z = 0.55;
    } else {
      // Pitbull tai bấm gọn
      const earGeo = new THREE.ConeGeometry(0.14, 0.28, 4);
      const earL = new THREE.Mesh(earGeo, matEars);
      const earR = new THREE.Mesh(earGeo, matEars);
      earGroupL.add(earL);
      earGroupR.add(earR);
      earGroupL.position.set(-0.38, 0.72, 0.1);
      earGroupR.position.set(0.38, 0.72, 0.1);
    }
    headPivot.add(earGroupL, earGroupR);

    // Khăn Bandana / Vòng cổ
    const bandanaGeo = new THREE.TorusGeometry(0.42, 0.08, 6, 12);
    bandanaGeo.rotateX(Math.PI / 2);
    const bandanaMesh = new THREE.Mesh(bandanaGeo, matBandana);
    bandanaMesh.position.set(0, -0.05, 0.1);
    headPivot.add(bandanaMesh);

    // Pitbull: Vòng cổ đinh tán
    if (p.hasSpikeCollar) {
      const spikeMat = createMaterial(c.spikes || 0xe2e8f0);
      const spikeGeo = new THREE.ConeGeometry(0.06, 0.16, 4);
      spikeGeo.rotateX(Math.PI / 2);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(angle) * 0.48, -0.05, Math.sin(angle) * 0.48);
        spike.lookAt(0, -0.05, 0);
        headPivot.add(spike);
      }
    }

    bodyPivot.add(headPivot);

    // ------------------------------------------
    // C. 4 Chân (Leg Pivots with Paws)
    // ------------------------------------------
    function createLeg(x, z, name) {
      const legPivot = new THREE.Group();
      legPivot.name = name;
      legPivot.position.set(x, -p.bodyScale[1] * 0.38, z);

      const legGeo = new THREE.CylinderGeometry(
        p.legRadius * 0.85,
        p.legRadius,
        p.legLength,
        8
      );
      const legMesh = new THREE.Mesh(legGeo, matBody);
      legMesh.position.set(0, -p.legLength / 2, 0);
      legMesh.castShadow = true;
      legPivot.add(legMesh);

      // Móng chân / Bàn chân tiếp đất chuẩn xác
      const pawH = p.legLength * 0.22;
      const pawGeo = new THREE.BoxGeometry(
        p.legRadius * 2.1,
        pawH,
        p.legRadius * 2.4
      );
      const pawMesh = new THREE.Mesh(pawGeo, matPaws);
      pawMesh.position.set(0, -p.legLength + pawH / 2, p.legRadius * 0.5);
      pawMesh.castShadow = true;
      legPivot.add(pawMesh);

      return legPivot;
    }

    const legSpacingX = p.bodyScale[0] * 0.38;
    const legSpacingZ = p.bodyScale[2] * 0.34;

    const legFL = createLeg(-legSpacingX, legSpacingZ, 'LegFL');
    const legFR = createLeg(legSpacingX, legSpacingZ, 'LegFR');
    const legBL = createLeg(-legSpacingX, -legSpacingZ, 'LegBL');
    const legBR = createLeg(legSpacingX, -legSpacingZ, 'LegBR');

    bodyPivot.add(legFL, legFR, legBL, legBR);

    // ------------------------------------------
    // D. Đuôi (Tail Pivot)
    // ------------------------------------------
    const tailPivot = new THREE.Group();
    tailPivot.name = 'TailPivot';
    tailPivot.position.set(0, p.bodyScale[1] * 0.2, -p.bodyScale[2] * 0.48);

    if (p.tailType === 'spring_spiral') {
      // Heo: Đuôi xoắn lò xo
      const spiralGroup = new THREE.Group();
      const coilMat = createMaterial(c.tail);
      for (let i = 0; i < 4; i++) {
        const ringGeo = new THREE.TorusGeometry(0.1 - i * 0.015, 0.03, 6, 8);
        const ring = new THREE.Mesh(ringGeo, coilMat);
        ring.position.set(0, i * 0.06, -i * 0.08);
        spiralGroup.add(ring);
      }
      tailPivot.add(spiralGroup);
    } else if (p.tailType === 'tiny_bob') {
      // Corgi: Đuôi cụt ngắn
      const bobGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const bob = new THREE.Mesh(bobGeo, matBody);
      bob.position.set(0, 0.08, -0.1);
      tailPivot.add(bob);
    } else {
      // Đuôi dài cong vút
      const tailGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.65, 6);
      tailGeo.rotateX(-Math.PI / 3);
      const tailMesh = new THREE.Mesh(tailGeo, matBody);
      tailMesh.position.set(0, 0.2, -0.25);
      tailPivot.add(tailMesh);
    }

    bodyPivot.add(tailPivot);
    root.add(bodyPivot);

    // ------------------------------------------
    // E. Sóng Âm 3D (Shockwaves Rings)
    // ------------------------------------------
    const shockwavesGroup = new THREE.Group();
    shockwavesGroup.name = 'ShockwavesGroup';

    const shockwaveMeshes = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.2, 0.35, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.visible = false;
      shockwavesGroup.add(ring);
      shockwaveMeshes.push({
        mesh: ring,
        active: false,
        timer: 0,
        maxTime: 0.6,
        startPos: new THREE.Vector3()
      });
    }
    root.add(shockwavesGroup);

    // ------------------------------------------
    // F. Hào Quang Tiến Hóa (Evolved Auras)
    // ------------------------------------------
    const auraGroup = new THREE.Group();
    auraGroup.name = 'AuraGroup';
    auraGroup.visible = false;

    // Hào quang Hổ (Lửa vàng cam)
    const tigerAuraGeo = new THREE.TorusGeometry(1.6, 0.12, 8, 24);
    tigerAuraGeo.rotateX(Math.PI / 2);
    const tigerAuraMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const tigerAuraMesh = new THREE.Mesh(tigerAuraGeo, tigerAuraMat);
    tigerAuraMesh.position.set(0, 0.4, 0);

    // Hào quang Rồng (Xanh lam thần thánh)
    const dragonAuraGeo = new THREE.TorusGeometry(1.7, 0.14, 8, 24);
    dragonAuraGeo.rotateX(Math.PI / 2);
    const dragonAuraMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const dragonAuraMesh = new THREE.Mesh(dragonAuraGeo, dragonAuraMat);
    dragonAuraMesh.position.set(0, 0.4, 0);

    auraGroup.add(tigerAuraMesh, dragonAuraMesh);
    root.add(auraGroup);

    return {
      root,
      bodyPivot,
      bodyMesh,
      headPivot,
      headMesh,
      jawPivot,
      legFL,
      legFR,
      legBL,
      legBR,
      tailPivot,
      buttHeartMesh,
      bandanaMesh,
      shockwavesGroup,
      shockwaveMeshes,
      auraGroup,
      tigerAuraMesh,
      dragonAuraMesh,
      leftEye,
      rightEye
    };
  }

  // ==========================================
  // 6. WRAPPER NHÂN VẬT CHÍNH (DOG CHARACTER)
  // ==========================================
  class DogCharacter {
    constructor(options = {}) {
      this.id = options.id || `dog_${Math.random().toString(36).substr(2, 9)}`;
      this.breedKey = resolveBreedKey(options.breed);
      this.breedInfo = getBreedInfo(this.breedKey);
      this.team = options.team || 'none'; // 'red', 'blue', 'none'
      this.state = options.state || 'idle';
      this.hp = options.hp !== undefined ? options.hp : 100;
      this.maxHp = options.maxHp || 100;
      this.rawName = options.name || options.nickname || this.breedInfo.nameVi;
      this.displayName = formatCharacterName(this.rawName, this.breedKey);

      // Xây dựng mô hình 3D
      const parts = buildDogMesh(this.breedInfo, this.team);
      this.meshParts = parts;
      this.model = parts.root;

      // Khởi tạo Billboard với chiều cao tối ưu không che tai/đầu
      const p = this.breedInfo.proportions;
      this.baseBodyY = p.legLength + 0.38 * p.bodyScale[1];
      const earOffset = (p.earType === 'tall_erect' || p.earType === 'point_up') ? 1.45 : (p.earType === 'large_foxy' ? 1.25 : 1.05);
      const billboardHeight = p.legLength + p.bodyScale[1] + earOffset + 0.55;
      const isPig = this.breedKey === 'piggy';
      this.billboard = createBillboard(this.displayName, this.hp, this.maxHp, isPig, billboardHeight);
      this.model.add(this.billboard);

      // Tham số animation
      this.animTime = Math.random() * 10;
      this.barkTimer = 0;
      this.isBarkingNow = false;
      this.walkSpeed = 10.0;
      this.walkAmp = 0.55;

      // Lưu trữ tham chiếu ngược
      this.model.userData = { character: this };
    }

    setName(newName) {
      this.rawName = newName;
      this.displayName = formatCharacterName(newName, this.breedKey);
      if (this.billboard && this.billboard.userData.redraw) {
        this.billboard.userData.redraw(this.displayName, this.hp, this.maxHp);
      }
    }

    setHp(newHp) {
      this.hp = Math.max(0, Math.min(this.maxHp, newHp));
      if (this.billboard && this.billboard.userData.redraw) {
        this.billboard.userData.redraw(this.displayName, this.hp, this.maxHp);
      }
      if (this.hp <= 0 && this.state !== 'exhausted') {
        this.setState('exhausted');
      }
    }

    setTeam(team) {
      this.team = team;
      let col = 0xffffff;
      if (team === 'red') col = 0xef4444;
      else if (team === 'blue') col = 0x3b82f6;
      else if (team === 'gold') col = 0xf59e0b;
      if (this.meshParts.bandanaMesh) {
        this.meshParts.bandanaMesh.material.color.setHex(col);
      }
    }

    setState(newState) {
      const valid = ['idle', 'walk', 'run', 'barking', 'exhausted', 'evolved_tiger', 'evolved_dragon'];
      if (!valid.includes(newState)) newState = 'idle';
      this.state = newState;

      const { auraGroup, tigerAuraMesh, dragonAuraMesh } = this.meshParts;
      if (newState === 'evolved_tiger') {
        auraGroup.visible = true;
        tigerAuraMesh.visible = true;
        dragonAuraMesh.visible = false;
      } else if (newState === 'evolved_dragon') {
        auraGroup.visible = true;
        tigerAuraMesh.visible = false;
        dragonAuraMesh.visible = true;
      } else {
        auraGroup.visible = false;
      }
    }

    triggerBark(soundDuration = 0.5) {
      this.isBarkingNow = true;
      this.barkTimer = soundDuration;

      // Kích hoạt một vòng sóng âm mới
      const available = this.meshParts.shockwaveMeshes.find(s => !s.active);
      if (available) {
        available.active = true;
        available.timer = 0;
        available.mesh.visible = true;

        // Đặt vị trí xuất phát từ mõm trong hệ tọa độ cục bộ của model
        const jawWorldPos = new THREE.Vector3();
        this.meshParts.jawPivot.getWorldPosition(jawWorldPos);
        const localPos = jawWorldPos.clone();
        this.model.worldToLocal(localPos);
        available.mesh.position.copy(localPos);

        // Hướng sóng âm theo trục Z cục bộ (hướng nhìn của mõm chó)
        available.mesh.rotation.set(0, 0, 0);
        available.mesh.scale.set(1, 1, 1);
        available.mesh.material.opacity = 0.85;
      }
    }

    update(delta = 0.016, camera = null) {
      this.animTime += delta;
      const t = this.animTime;
      const {
        bodyPivot,
        headPivot,
        jawPivot,
        legFL,
        legFR,
        legBL,
        legBR,
        tailPivot,
        buttHeartMesh,
        shockwaveMeshes,
        auraGroup
      } = this.meshParts;

      // Xử lý đếm ngược sủa
      if (this.isBarkingNow) {
        this.barkTimer -= delta;
        if (this.barkTimer <= 0) {
          this.isBarkingNow = false;
        }
      }

      // ----------------------------------------
      // 1. Chạy Hoạt Họa Theo Trạng Thái
      // ----------------------------------------
      const effectiveState = this.isBarkingNow ? 'barking' : this.state;
      const baseY = this.baseBodyY || (this.breedInfo.proportions.legLength + 0.38 * this.breedInfo.proportions.bodyScale[1]);

      switch (effectiveState) {
        case 'walk':
        case 'run': {
          const speed = effectiveState === 'run' ? this.walkSpeed * 1.5 : this.walkSpeed;
          const amp = effectiveState === 'run' ? this.walkAmp * 1.4 : this.walkAmp;

          // 4 chân bước chéo nhịp nhàng
          legFL.rotation.x = Math.sin(t * speed) * amp;
          legBR.rotation.x = Math.sin(t * speed) * amp;
          legFR.rotation.x = -Math.sin(t * speed) * amp;
          legBL.rotation.x = -Math.sin(t * speed) * amp;

          // Thân nhấp nhô
          bodyPivot.position.y = baseY + Math.abs(Math.sin(t * speed)) * 0.08;
          bodyPivot.rotation.z = Math.sin(t * speed * 0.5) * 0.05;

          // Đuôi vẫy
          tailPivot.rotation.y = Math.sin(t * speed) * 0.4;

          // Mông Corgi lắc lư
          if (buttHeartMesh) {
            buttHeartMesh.rotation.y = Math.sin(t * speed) * 0.35;
          }

          headPivot.rotation.x = Math.sin(t * speed) * 0.08;
          jawPivot.rotation.x = 0;
          break;
        }

        case 'barking': {
          // Mõm há to, đầu giật về phía trước
          const barkCycle = Math.sin(t * 18);
          jawPivot.rotation.x = Math.max(0, barkCycle * 0.45);
          headPivot.rotation.x = -0.25 - barkCycle * 0.15;
          headPivot.position.z = this.breedInfo.proportions.bodyScale[2] * 0.48 + 0.12;

          // Thân giật mạnh
          bodyPivot.position.y = baseY + Math.abs(barkCycle) * 0.08;
          tailPivot.rotation.y = Math.sin(t * 24) * 0.6; // Đuôi quẫy cực mạnh

          // Chân trước chống vững
          legFL.rotation.x = 0.15;
          legFR.rotation.x = 0.15;
          legBL.rotation.x = -0.1;
          legBR.rotation.x = -0.1;
          break;
        }

        case 'exhausted': {
          // Kiệt sức: Thân gục xuống, đầu rũ, thở dốc
          const pant = Math.sin(t * 12);
          bodyPivot.position.y = baseY * 0.85;
          headPivot.rotation.x = 0.45 + pant * 0.05;
          headPivot.position.y = -0.1;
          jawPivot.rotation.x = 0.35; // Há hốc miệng thở
          tailPivot.rotation.x = 0.5; // Đuôi cụp
          tailPivot.rotation.y = 0;

          legFL.rotation.x = -0.2;
          legFR.rotation.x = -0.2;
          legBL.rotation.x = 0.25;
          legBR.rotation.x = 0.25;
          break;
        }

        case 'evolved_tiger':
        case 'evolved_dragon': {
          // Thần thú: Nhịp thở oai phong + Hào quang xoay rực lửa
          bodyPivot.position.y = baseY + Math.sin(t * 4) * 0.08;
          headPivot.rotation.x = -0.1 + Math.sin(t * 3) * 0.06;
          tailPivot.rotation.y = Math.sin(t * 8) * 0.45;

          if (auraGroup) {
            auraGroup.rotation.y += delta * 2.5;
            const pulse = 1.0 + Math.sin(t * 6) * 0.12;
            auraGroup.scale.set(pulse, pulse, pulse);
          }
          break;
        }

        case 'idle':
        default: {
          // Nghỉ ngơi: Thở nhấp nhô, đuôi vẫy nhẹ
          bodyPivot.position.y = baseY + Math.sin(t * 3) * 0.04;
          headPivot.rotation.x = Math.sin(t * 2) * 0.04;
          headPivot.position.z = this.breedInfo.proportions.bodyScale[2] * 0.48;
          jawPivot.rotation.x = 0;

          tailPivot.rotation.y = Math.sin(t * 5) * 0.35;

          if (buttHeartMesh) {
            buttHeartMesh.rotation.y = Math.sin(t * 4) * 0.18;
          }

          legFL.rotation.x = 0;
          legFR.rotation.x = 0;
          legBL.rotation.x = 0;
          legBR.rotation.x = 0;
          break;
        }
      }

      // ----------------------------------------
      // 2. Cập Nhật Sóng Âm 3D Bung Tỏa
      // ----------------------------------------
      shockwaveMeshes.forEach(sw => {
        if (!sw.active) return;
        sw.timer += delta;
        const progress = sw.timer / sw.maxTime;
        if (progress >= 1.0) {
          sw.active = false;
          sw.mesh.visible = false;
        } else {
          // Bung nở to dần
          const scale = 1.0 + progress * 3.5;
          sw.mesh.scale.set(scale, scale, scale);
          sw.mesh.material.opacity = (1.0 - progress) * 0.85;
          // Bay về phía trước theo hướng nhìn của mõm chó (+Z cục bộ)
          sw.mesh.position.z += delta * 4.5;
        }
      });

      // ----------------------------------------
      // 3. Billboard Luôn Hướng Về Camera
      // ----------------------------------------
      if (camera && this.billboard) {
        this.billboard.quaternion.copy(camera.quaternion);
      }
    }
  }

  // ==========================================
  // 7. WEB AUDIO API SYNTHESIZER SỦA BỰA OFFLINE
  // ==========================================
  class DogAudioSynthesizer {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.masterVolume = 0.8;
    }

    initContext() {
      if (this.ctx) return;
      const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      return this.isMuted;
    }

    setVolume(val) {
      this.masterVolume = Math.max(0, Math.min(1, Number(val)));
    }

    playBark(breedKey, options = {}) {
      if (this.isMuted) return;
      this.initContext();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const key = resolveBreedKey(breedKey);
      const now = this.ctx.currentTime;

      if (key === 'piggy') {
        this._playPigOink(now, options);
      } else if (key === 'lu') {
        this._playPugSnortBark(now, options);
      } else if (key === 'pitbull' || key === 'becgie') {
        this._playDeepBark(now, options);
      } else if (key === 'corgi' || key === 'ki') {
        this._playHighYap(now, options);
      } else {
        this._playStandardBark(now, options);
      }
    }

    playEvolveRoar() {
      if (this.isMuted) return;
      this.initContext();
      if (!this.ctx) return;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;

      // Tiếng gầm thần thú rền vang
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 1.2);

      gain.gain.setValueAtTime(this.masterVolume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    }

    _playStandardBark(now, options) {
      // Tiếng gâu gâu chó ta đanh thép
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(this.masterVolume * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    }

    _playPugSnortBark(now, options) {
      // Chó Lu béo ú sủa khàn khàn ngộ nghĩnh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(5.0, now);

      gain.gain.setValueAtTime(this.masterVolume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    }

    _playDeepBark(now, options) {
      // Pitbull/Becgie sủa gầm trầm uy lực
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);

      gain.gain.setValueAtTime(this.masterVolume * 0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    }

    _playHighYap(now, options) {
      // Corgi / Ki sủa lanh lảnh ắng ẳng
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);

      gain.gain.setValueAtTime(this.masterVolume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    _playPigOink(now, options) {
      // Chú heo bựa kêu éc éc!
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.28);

      gain.gain.setValueAtTime(this.masterVolume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    }
  }

  // ==========================================
  // 8. XÂY DỰNG SA BÀN XÓM PHỐ VIỆT NAM (ARENA)
  // ==========================================
  function createVillageArenaScene() {
    const arenaGroup = new THREE.Group();
    arenaGroup.name = 'VietnameseVillageArena';

    // 1. Mặt sàn xóm hẻm (đường bê tông / nhựa)
    const groundGeo = new THREE.PlaneGeometry(36, 44);
    const groundMat = createMaterial(0x334155);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    arenaGroup.add(ground);

    // 2. Vạch sơn ranh giới phân chia Xóm Đỏ vs Xóm Xanh
    const lineGeo = new THREE.PlaneGeometry(0.5, 40);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.01, 0);
    arenaGroup.add(line);

    // 3. Vỉa hè lát gạch 2 bên hẻm
    const curbMat = createMaterial(0x64748b);
    const curbL = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 44), curbMat);
    curbL.position.set(-16, 0.15, 0);
    const curbR = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 44), curbMat);
    curbR.position.set(16, 0.15, 0);
    arenaGroup.add(curbL, curbR);

    // 4. Bờ tường gạch rêu phong xóm ngõ
    const wallMat = createMaterial(0xb45309);
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.5, 42), wallMat);
    wallL.position.set(-17.8, 1.75, 0);
    wallL.castShadow = true;
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.5, 42), wallMat);
    wallR.position.set(17.8, 1.75, 0);
    wallR.castShadow = true;
    arenaGroup.add(wallL, wallR);

    // 5. Cột điện bê tông Việt Nam chằng chịt dây điện
    const poleMat = createMaterial(0x94a3b8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 10, 8), poleMat);
    pole.position.set(-14.5, 5.0, 10);
    pole.castShadow = true;
    arenaGroup.add(pole);

    // Thanh ngang xà sứ trên cột điện
    const crossBarMat = createMaterial(0x475569);
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), crossBarMat);
    crossBar.position.set(-14.5, 9.2, 10);
    arenaGroup.add(crossBar);

    // Dây điện chằng chịt đặc trưng xóm phố Việt Nam
    function createSaggingWire(p1, p2, sagAmount = 0.8) {
      const wireCurve = new THREE.QuadraticBezierCurve3(
        p1,
        new THREE.Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - sagAmount, (p1.z + p2.z) / 2),
        p2
      );
      const points = wireCurve.getPoints(20);
      const wireGeo = new THREE.BufferGeometry().setFromPoints(points);
      const wireMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
      return new THREE.Line(wireGeo, wireMat);
    }

    // Các đường dây điện giăng chằng chịt qua ngõ phố
    arenaGroup.add(createSaggingWire(new THREE.Vector3(-14.5, 9.2, 10), new THREE.Vector3(-17.8, 4.0, -12), 1.2));
    arenaGroup.add(createSaggingWire(new THREE.Vector3(-14.5, 9.2, 10), new THREE.Vector3(17.8, 4.2, 5), 2.2));
    arenaGroup.add(createSaggingWire(new THREE.Vector3(-13.5, 9.2, 10), new THREE.Vector3(17.8, 3.8, 15), 1.8));
    arenaGroup.add(createSaggingWire(new THREE.Vector3(-15.5, 9.2, 10), new THREE.Vector3(-17.8, 4.2, 20), 0.9));

    // 6. Cây chuối low-poly đặc trưng xóm quê
    function createBananaTree(x, z) {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Thân chuối
      const trunkMat = createMaterial(0x65a30d);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 4.2, 7), trunkMat);
      trunk.position.set(0, 2.1, 0);
      tree.add(trunk);

      // Tàu lá chuối bản rộng
      const leafMat = createMaterial(0x84cc16);
      for (let i = 0; i < 5; i++) {
        const leafGeo = new THREE.BoxGeometry(0.65, 0.04, 2.5);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const angle = (i * Math.PI * 2) / 5;
        leaf.position.set(Math.sin(angle) * 0.8, 4.0, Math.cos(angle) * 0.8);
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.55;
        tree.add(leaf);
      }
      return tree;
    }

    arenaGroup.add(createBananaTree(-15, -12));
    arenaGroup.add(createBananaTree(15, 8));

    // 7. Ghế nhựa xanh đỏ vỉa hè
    function createPlasticStool(x, z, isRed) {
      const stool = new THREE.Group();
      stool.position.set(x, 0, z);
      const mat = createMaterial(isRed ? 0xef4444 : 0x3b82f6);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), mat);
      seat.position.set(0, 0.45, 0);
      stool.add(seat);

      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 4);
      const offsets = [
        [-0.24, -0.24],
        [0.24, -0.24],
        [-0.24, 0.24],
        [0.24, 0.24]
      ];
      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(ox, 0.22, oz);
        stool.add(leg);
      });
      return stool;
    }

    arenaGroup.add(createPlasticStool(-14, 2, true));
    arenaGroup.add(createPlasticStool(-14.8, 2.8, true));
    arenaGroup.add(createPlasticStool(14, -2, false));
    arenaGroup.add(createPlasticStool(14.8, -2.8, false));

    return arenaGroup;
  }

  // ==========================================
  // 9. API XUẤT PUBLIC CỦA ENGINE
  // ==========================================
  return {
    BREED_REGISTRY,
    getAllBreeds,
    getBreedInfo,
    resolveBreedKey,
    formatCharacterName,
    sanitizeString,
    DogCharacter,
    createDogModel: function (options) {
      return new DogCharacter(options);
    },
    createVillageArenaScene,
    DogAudioSynthesizer,
    audioSynth: new DogAudioSynthesizer()
  };
});
