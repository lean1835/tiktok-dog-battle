/**
 * TikTok Dog Battle - 2.5D Chibi Dog Renderer Module
 * Module kết xuất 10 giống chó Chibi 2.5D siêu sắc nét, tái sử dụng hoàn toàn.
 * Hỗ trợ SVG Vector độc lập, Canvas 2D, và chuyển động 4 trạng thái:
 * - idle: Đứng thở nhịp nhàng, đuôi vẫy nhẹ.
 * - barking / bark: Há mõm to, phát sóng âm (sound waves) rực rỡ, rung dội lực.
 * - exhausted / pant: Cụp tai, thè lưỡi thở dốc, mắt xoáy ốc, giọt mồ hôi rơi.
 * - evolved (evolved_tiger / evolved_dragon): Hóa Hổ (vằn cọp, răng nanh, hào quang lửa) hoặc Hóa Rồng (sừng rồng, vảy rồng phát sáng).
 * 
 * Phụ kiện động:
 * - Khăn bandana Team Đỏ / Team Xanh / Gold.
 * - Khung tròn Avatar người xem và tên hiển thị "Tuất + [Tên]".
 * - Thanh máu HP trực quan.
 */

(function (global) {
  'use strict';

  // 10 Giống Chó Chibi 2.5D Chuẩn Đặc Trưng
  const BREED_REGISTRY = {
    corgi: {
      id: 'corgi',
      nameVi: 'Corgi Hoàng Gia',
      nameEn: 'Pembroke Welsh Corgi',
      rarity: 'Hiếm',
      role: 'Đỡ Đòn',
      specialTrait: 'Chân ngắn, mông tròn trái tim, tai to vểnh, nụ cười tỏa nắng',
      hasHeartButt: true,
      skill: 'Bật Mông Quyến Rũ',
      colors: {
        primary: '#f97316',      // Cam rực rỡ
        secondary: '#fff7ed',    // Trắng sữa ngực và mặt
        shade: '#c2410c',        // Đổ bóng 2.5D
        snout: '#ea580c',
        earsInner: '#fca5a5',
        accent: '#facc15'
      },
      stats: { hp: 120, barkPower: 75, speed: 60, stamina: 85 }
    },
    shiba: {
      id: 'shiba',
      nameVi: 'Shiba Vàng Lém Lỉnh',
      nameEn: 'Shiba Inu',
      rarity: 'Hiếm',
      role: 'Xạ Thủ',
      specialTrait: 'Má bánh bao phúng phính, mắt cười hí hửng, đuôi xoắn',
      skill: 'Nụ Cười Đốn Tim',
      colors: {
        primary: '#eab308',      // Vàng mật ong
        secondary: '#fefce8',    // Urajiro trắng má & ức
        shade: '#a16207',
        snout: '#ca8a04',
        earsInner: '#fed7aa',
        accent: '#f59e0b'
      },
      stats: { hp: 95, barkPower: 90, speed: 85, stamina: 80 }
    },
    husky: {
      id: 'husky',
      nameVi: 'Husky Ngáo Ngơ',
      nameEn: 'Siberian Husky',
      rarity: 'Sử Thi',
      role: 'Pháp Sư',
      specialTrait: 'Mắt xanh băng tuyết, mặt ngáo hài hước, vệt trán ngọn lửa tam giác',
      skill: 'Hú Tuyết Bắc Cực',
      colors: {
        primary: '#475569',      // Xám than Bắc Cực
        secondary: '#f8fafc',    // Trắng tuyết
        shade: '#1e293b',
        snout: '#334155',
        eye: '#00d2d3',          // Mắt xanh băng tuyết
        eyeColor: '#00d2d3',
        earsInner: '#cbd5e1',
        accent: '#38bdf8'
      },
      stats: { hp: 110, barkPower: 105, speed: 70, stamina: 90 }
    },
    pitbull: {
      id: 'pitbull',
      nameVi: 'Pitbull Chiến Binh',
      nameEn: 'American Pitbull',
      rarity: 'Sử Thi',
      role: 'Đấu Sĩ',
      specialTrait: 'Cơ bắp cuồn cuộn, da than chì, vòng cổ đinh tán hầm hố, hàm thép',
      hasSpikeCollar: true,
      skill: 'Cú Đớp Sắt Đá',
      colors: {
        primary: '#334155',      // Xám tro đậm
        secondary: '#e2e8f0',    // Đốm trắng trước ngực
        shade: '#0f172a',
        snout: '#1e293b',
        earsInner: '#64748b',
        collar: '#991b1b',       // Vòng cổ đinh tán
        accent: '#ef4444'
      },
      stats: { hp: 135, barkPower: 115, speed: 65, stamina: 95 }
    },
    pug: {
      id: 'pug',
      nameVi: 'Pug Mặt Xệ Hóm Hỉnh',
      nameEn: 'Pug Doggo',
      rarity: 'Thường',
      role: 'Trợ Thủ',
      specialTrait: 'Mặt nhăn xệ đáng yêu, mắt lồi tròn xoe, tai cụp đen, lưỡi thè ngộ nghĩnh',
      skill: 'Thở Phì Phò Trợ Lực',
      colors: {
        primary: '#d4a373',      // Vàng be bánh quy
        secondary: '#18181b',    // Mõm đen nhung & nếp nhăn
        shade: '#a67c52',
        snout: '#27272a',
        earsInner: '#18181b',
        accent: '#f97316'
      },
      stats: { hp: 90, barkPower: 70, speed: 50, stamina: 75 }
    },
    poodle: {
      id: 'poodle',
      nameVi: 'Poodle Bông Gòn',
      nameEn: 'Toy Poodle',
      rarity: 'Thường',
      role: 'Hỗ Trợ',
      specialTrait: 'Lông xoăn tròn bồng bềnh như kẹo bông, tai điệu đà, mắt long lanh',
      skill: 'Bão Bông Quyến Rũ',
      colors: {
        primary: '#d97706',      // Nâu hạt dẻ ấm
        secondary: '#fde68a',    // Bông tai sáng
        shade: '#92400e',
        snout: '#b45309',
        earsInner: '#fef3c7',
        accent: '#ec4899'
      },
      stats: { hp: 85, barkPower: 80, speed: 80, stamina: 70 }
    },
    becgie: {
      id: 'becgie',
      nameVi: 'Becgie Cảnh Khuyển',
      nameEn: 'German Shepherd',
      rarity: 'Sử Thi',
      role: 'Sát Thủ',
      specialTrait: 'Tai vểnh nhọn dũng mãnh, mõm đen uy nghi, yên ngựa đen lưng oai phong',
      skill: 'Trấn Áp Tội Phạm',
      colors: {
        primary: '#b45309',      // Nâu vàng sẫm
        secondary: '#1c1917',    // Đen tuyền yên ngựa & mặt nạ
        shade: '#78350f',
        snout: '#0c0a09',
        earsInner: '#f59e0b',
        accent: '#eab308'
      },
      stats: { hp: 115, barkPower: 110, speed: 90, stamina: 90 }
    },
    golden: {
      id: 'golden',
      nameVi: 'Golden Hiền Hòa',
      nameEn: 'Golden Retriever',
      rarity: 'Hiếm',
      role: 'Đỡ Đòn',
      specialTrait: 'Lông vàng mượt óng ả, tai rủ mềm mại, nụ cười hiền lành thiên sứ',
      skill: 'Hào Quang Chữa Lành',
      colors: {
        primary: '#f59e0b',      // Vàng mật óng
        secondary: '#fef08a',    // Lông tơ ngực sáng
        shade: '#b45309',
        snout: '#d97706',
        earsInner: '#fde047',
        accent: '#fbbf24'
      },
      stats: { hp: 125, barkPower: 85, speed: 75, stamina: 90 }
    },
    doberman: {
      id: 'doberman',
      nameVi: 'Doberman Vệ Sĩ',
      nameEn: 'Doberman Pinscher',
      rarity: 'Thần Thoại',
      role: 'Sát Thủ',
      specialTrait: 'Thon thả quý tộc, đen bóng điểm nâu đỏ, tai nhọn dựng cao kiêu hãnh',
      skill: 'Ám Sát Bóng Đêm',
      colors: {
        primary: '#0f172a',      // Đen bóng huyền bí
        secondary: '#c2410c',    // Nâu đồng đốm mắt, ngực & mõm
        shade: '#020617',
        snout: '#9a3412',
        earsInner: '#ea580c',
        accent: '#ef4444'
      },
      stats: { hp: 120, barkPower: 125, speed: 95, stamina: 90 }
    },
    chota: {
      id: 'chota',
      nameVi: 'Chó Ta Vàng Làng Quê',
      nameEn: 'Vietnamese Golden Dog',
      rarity: 'Thần Thoại',
      role: 'Đấu Sĩ',
      specialTrait: 'Chó cỏ Việt Nam tinh ranh, lông vàng cỏ úa, đuôi cong vắt vẻo, mắt sáng',
      skill: 'Phản Công Thần Tốc',
      colors: {
        primary: '#ea580c',      // Vàng rơm đồng quê
        secondary: '#ffedd5',    // Trắng vàng nhạt ức
        shade: '#9a3412',
        snout: '#c2410c',
        earsInner: '#fed7aa',
        accent: '#f97316'
      },
      stats: { hp: 110, barkPower: 120, speed: 90, stamina: 100 }
    }
  };

  /**
   * Tự động định dạng tên nhân vật theo quy ước "Tuất + [Tên]"
   */
  function formatDogName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return 'Tuất Cưng';
    }
    const trimmed = name.trim();
    if (trimmed.startsWith('Tuất ')) {
      return trimmed;
    }
    return `Tuất ${trimmed}`;
  }

  /**
   * Tạo instance nhân vật chó Chibi chuẩn giao ước
   */
  function createCharacter(params = {}) {
    const breedKey = (params.breed || 'corgi').toLowerCase();
    const meta = BREED_REGISTRY[breedKey] || BREED_REGISTRY.corgi;
    const rawNickname = params.nickname || params.rawNickname || params.name || 'Bé Na';
    const formattedName = formatDogName(rawNickname);

    return {
      id: params.id || `dog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      breed: meta.id,
      name: formattedName,
      rawNickname: rawNickname,
      nickname: rawNickname,
      team: params.team || 'none', // 'red', 'blue', 'none'
      avatar: params.avatar || '',
      hp: typeof params.hp === 'number' ? params.hp : 100,
      maxHp: params.maxHp || 100,
      state: params.state ? normalizeState(params.state) : 'idle', // 'idle', 'barking', 'exhausted', 'evolved_tiger', 'evolved_dragon'
      barkPower: params.barkPower || meta.stats.barkPower,
      streak: params.streak || 0,
      buffMultiplier: params.buffMultiplier || 1,
      accessory: {
        bandana: params.team === 'red' ? 'red' : (params.team === 'blue' ? 'blue' : (params.bandana || 'none')),
        hasSpikeCollar: params.hasSpikeCollar || meta.hasSpikeCollar || meta.id === 'pitbull',
        hasCrown: params.hasCrown || false
      }
    };
  }

  function getAllBreeds() {
    return Object.values(BREED_REGISTRY);
  }

  function getBreedInfo(breedKey) {
    if (!breedKey) return BREED_REGISTRY.corgi;
    const key = breedKey.toLowerCase();
    return BREED_REGISTRY[key] || BREED_REGISTRY.corgi;
  }

  // Chuẩn hóa trạng thái đầu vào
  function normalizeState(state) {
    if (!state) return 'idle';
    const s = state.toLowerCase();
    if (s === 'bark' || s === 'barking') return 'barking';
    if (s === 'pant' || s === 'exhausted' || s === 'tired') return 'exhausted';
    if (s === 'evolved_tiger' || s === 'tiger' || s === 'tiger_evo') return 'evolved_tiger';
    if (s === 'evolved_dragon' || s === 'dragon' || s === 'dragon_evo') return 'evolved_dragon';
    if (s === 'evolved') return 'evolved_tiger'; // Mặc định hóa hổ
    if (s === 'idle') return 'idle';
    return 'idle';
  }

  /**
   * Tạo chuỗi SVG vector 2.5D Chibi hoàn chỉnh, sắc nét tuyệt đối, tự chứa CSS Animation
   */
  function renderToSVG(dogOrBreed, sizeOrOptions = 220, animTime = 0, flip = false) {
    let options = {};
    if (typeof sizeOrOptions === 'object' && sizeOrOptions !== null) {
      options = Object.assign({}, sizeOrOptions);
    } else {
      options = {
        size: typeof sizeOrOptions === 'number' ? sizeOrOptions : 220,
        animTime: animTime,
        flip: Boolean(flip),
        mirror: Boolean(flip)
      };
    }

    let dog;
    if (typeof dogOrBreed === 'string') {
      dog = createCharacter(Object.assign({ breed: dogOrBreed }, options));
    } else {
      dog = Object.assign({}, dogOrBreed, options);
      if (!dog.name && dog.rawNickname) {
        dog.name = formatDogName(dog.rawNickname);
      } else if (!dog.name) {
        dog.name = 'Tuất Bé Na';
      }
    }

    const breedMeta = getBreedInfo(dog.breed);
    const state = normalizeState(dog.state || options.state);
    const team = dog.team || options.team || 'none';
    const size = options.size || 220;
    const width = size;
    const height = Math.round(size * 1.15); // Tỉ lệ 200:230
    const uid = 'dog_' + Math.random().toString(36).substring(2, 9);

    const colors = breedMeta.colors;
    const showUi = options.showUi !== false;
    const showHp = options.showHp !== false && showUi;
    const showAvatar = options.showAvatar !== false && showUi;
    const showName = options.showName !== false && showUi;
    const isMirrored = options.flip || options.mirror || (team === 'blue' && options.autoMirror !== false);

    // Bảng màu đội
    const teamColor = team === 'red' ? '#ef4444' : (team === 'blue' ? '#3b82f6' : '#94a3b8');
    const teamBorder = team === 'red' ? '#dc2626' : (team === 'blue' ? '#2563eb' : '#64748b');

    // Xác định chi tiết đặc trưng cho từng giống chó
    const breedSvgParts = generateBreedAnatomy(dog.breed, colors, state, uid);

    // Tính toán thanh máu
    const hp = Math.max(0, Math.min(100, (dog.hp / (dog.maxHp || 100)) * 100));
    const hpColor = hp > 50 ? '#22c55e' : (hp > 25 ? '#eab308' : '#ef4444');

    // Khởi tạo các lớp Animation CSS
    const cssAnimations = `
      .${uid}-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
      
      /* Animation Idle: Nhịp thở bồng bềnh êm ái */
      @keyframes ${uid}-breathe {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        50% { transform: translateY(-3px) scale(1.02, 0.98); }
      }
      .${uid}-anim-idle { animation: ${uid}-breathe 2.4s ease-in-out infinite; transform-origin: 100px 170px; }

      /* Animation Barking: Dội xung lực, rung lắc mạnh khi sủa */
      @keyframes ${uid}-bark-shake {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        15% { transform: translateY(-6px) rotate(-3deg) scale(1.05); }
        35% { transform: translateY(2px) rotate(2deg) scale(0.97); }
        55% { transform: translateY(-4px) rotate(-1deg) scale(1.03); }
        75% { transform: translateY(1px) rotate(1deg); }
      }
      .${uid}-anim-barking { animation: ${uid}-bark-shake 0.7s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite; transform-origin: 100px 170px; }

      /* Sóng âm thanh tỏa tròn rực rỡ */
      @keyframes ${uid}-wave-expand {
        0% { opacity: 0; transform: scale(0.4); stroke-width: 6; }
        30% { opacity: 1; }
        100% { opacity: 0; transform: scale(1.4); stroke-width: 1; }
      }
      .${uid}-wave-1 { animation: ${uid}-wave-expand 1.2s ease-out infinite; transform-origin: 135px 125px; }
      .${uid}-wave-2 { animation: ${uid}-wave-expand 1.2s ease-out infinite 0.4s; transform-origin: 135px 125px; }
      .${uid}-wave-3 { animation: ${uid}-wave-expand 1.2s ease-out infinite 0.8s; transform-origin: 135px 125px; }

      /* Animation Exhausted: Thở dốc, rũ người mệt mỏi */
      @keyframes ${uid}-pant-drop {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        50% { transform: translateY(4px) scale(0.98, 1.02); }
      }
      .${uid}-anim-exhausted { animation: ${uid}-pant-drop 1.4s ease-in-out infinite; transform-origin: 100px 170px; }

      /* Lưỡi thè rung giật */
      @keyframes ${uid}-tongue-pant {
        0%, 100% { transform: translateY(0) scaleY(1); }
        50% { transform: translateY(3px) scaleY(1.15); }
      }
      .${uid}-tongue-shake { animation: ${uid}-tongue-pant 0.35s ease-in-out infinite; transform-origin: 100px 135px; }

      /* Giọt mồ hôi rơi */
      @keyframes ${uid}-sweat-fall {
        0% { opacity: 0; transform: translateY(-4px) scale(0.6); }
        40% { opacity: 1; }
        100% { opacity: 0; transform: translateY(12px) scale(1); }
      }
      .${uid}-sweat-drop { animation: ${uid}-sweat-fall 1.5s ease-in infinite; }

      /* Animation Evolved: Hào quang bùng nổ xoay chuyển */
      @keyframes ${uid}-aura-pulse {
        0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 8px #f59e0b) brightness(1.1); transform: scale(1); }
        50% { opacity: 1; filter: drop-shadow(0 0 16px #ef4444) brightness(1.25); transform: scale(1.03); }
      }
      .${uid}-anim-evolved { animation: ${uid}-aura-pulse 1.6s ease-in-out infinite; transform-origin: 100px 140px; }

      /* Đuôi vẫy vui vẻ */
      @keyframes ${uid}-tail-wag {
        0%, 100% { transform: rotate(-8deg); }
        50% { transform: rotate(12deg); }
      }
      .${uid}-tail-wagging { animation: ${uid}-tail-wag 0.8s ease-in-out infinite; transform-origin: 50px 145px; }
    `;

    // Phần Avatar & Tên & HP
    const headerUI = showUi ? `
      <!-- Header: Avatar, Name, HP Bar -->
      <g class="${uid}-ui-group">
        <!-- Khung tròn Avatar -->
        ${showAvatar ? `
          <g transform="translate(100, 26)">
            <!-- Vòng hào quang Avatar -->
            <circle cx="0" cy="0" r="18" fill="#1e293b" stroke="${teamBorder}" stroke-width="2.5" />
            <circle cx="0" cy="0" r="15" fill="#0f172a" />
            <!-- Biểu tượng Avatar hoặc Chữ cái -->
            <text x="0" y="5" font-size="12" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="-0.5">
              ${escapeXml(dog.name.replace('Tuất ', '').substring(0, 2).toUpperCase() || 'TG')}
            </text>
            <!-- Huy hiệu vương miện nếu có streak -->
            ${dog.streak > 2 || dog.accessory.hasCrown ? `
              <path d="M-8,-14 L-4,-20 L0,-16 L4,-20 L8,-14 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
            ` : ''}
          </g>
        ` : ''}

        <!-- Badge Tên Tuất + [Tên] -->
        ${showName ? `
          <g transform="translate(100, 52)">
            <rect x="-60" y="-9" width="120" height="18" rx="9" fill="#0f172a" stroke="${teamBorder}" stroke-width="1.5" opacity="0.95" />
            <circle cx="-50" cy="0" r="3.5" fill="${teamColor}" />
            <text x="2" y="3.5" font-size="9.5" font-weight="800" fill="#f8fafc" text-anchor="middle">
              ${escapeXml(dog.name.length > 17 ? dog.name.substring(0, 16) + '…' : dog.name)}
            </text>
          </g>
        ` : ''}

        <!-- Thanh máu HP Mini -->
        ${showHp ? `
          <g transform="translate(100, 68)">
            <rect x="-42" y="-3" width="84" height="6" rx="3" fill="#1e293b" stroke="#334155" stroke-width="1" />
            <rect x="-41" y="-2" width="${Math.max(2, Math.round(82 * (hp / 100)))}" height="4" rx="2" fill="${hpColor}" />
          </g>
        ` : ''}
      </g>
    ` : '';

    // Khăn Bandana theo Team
    const bandanaMarkup = generateBandana(team, colors, uid);

    // Hiệu ứng Tiến Hóa (Hổ / Rồng)
    const evolutionMarkup = generateEvolutionEffects(state, uid);

    // Hiệu ứng Sủa Sóng Âm (Bark Waves)
    const barkWavesMarkup = state === 'barking' ? `
      <!-- Sound Waves Sủa Gâu Gâu Rực Rỡ -->
      <g class="${uid}-soundwaves" transform="translate(15, 0)">
        <!-- Cung tròn sóng âm chuẩn A 16,16 -->
        <path class="${uid}-wave-arc" d="M125,120 A 16,16 0 0,1 125,140" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
        <path class="${uid}-wave-1" d="M128,115 A 25,25 0 0,1 128,145" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
        <path class="${uid}-wave-2" d="M138,105 A 40,40 0 0,1 138,155" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round" />
        <path class="${uid}-wave-3" d="M148,95 A 55,55 0 0,1 148,165" fill="none" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" />
        
        <!-- Tia năng lượng tia sét nhỏ -->
        <path d="M138,100 L146,95 L143,103 L150,101" fill="none" stroke="#fbbf24" stroke-width="1.8" />
        <path d="M138,150 L145,155 L142,148 L149,152" fill="none" stroke="#38bdf8" stroke-width="1.8" />
        
        <!-- Text bong bóng biểu cảm WOOF / GÂU -->
        <g transform="translate(142, 85)">
          <rect x="-6" y="-12" width="40" height="16" rx="6" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" />
          <polygon points="2,4 8,4 0,10" fill="#facc15" />
          <text x="14" y="0" font-size="9" font-weight="900" fill="#713f12" text-anchor="middle">GÂU!</text>
        </g>
      </g>
    ` : '';

    // Hiệu ứng Mệt Thở Dốc (Exhausted / Panting)
    const pantingMarkup = state === 'exhausted' ? `
      <!-- Giọt mồ hôi & khí thở -->
      <g class="${uid}-panting-fx">
        <!-- Giọt mồ hôi màu ngọc #00d2d3 -->
        <g class="${uid}-sweat-drop" transform="translate(132, 95)">
          <path d="M0,0 C-3,4 -4,7 -4,9 C-4,11.5 -2,13.5 0,13.5 C2,13.5 4,11.5 4,9 C4,7 3,4 0,0 Z" fill="#00d2d3" opacity="0.9" />
          <circle cx="1" cy="8" r="1" fill="#ffffff" />
        </g>
        <g class="${uid}-sweat-drop" transform="translate(68, 92)" style="animation-delay: 0.7s;">
          <path d="M0,0 C-2.5,3 -3,6 -3,7.5 C-3,9.5 -1.5,11 0,11 C1.5,11 3,9.5 3,7.5 C3,6 2.5,3 0,0 Z" fill="#00d2d3" opacity="0.85" />
        </g>
        <!-- Làn khói thở dài -->
        <g transform="translate(140, 138)" opacity="0.7">
          <ellipse cx="6" cy="0" rx="5" ry="3" fill="#cbd5e1" />
          <ellipse cx="14" cy="-2" rx="7" ry="4" fill="#e2e8f0" />
        </g>
      </g>
    ` : '';

    // Bóng tiếp đất 2.5D
    const groundShadow = `
      <!-- Soft Ground Shadow 2.5D -->
      <ellipse cx="100" cy="204" rx="46" ry="10" fill="#0f172a" opacity="0.28" />
      <ellipse cx="100" cy="204" rx="32" ry="6" fill="#020617" opacity="0.22" />
    `;

    // Gom toàn bộ nhóm hoạt hình của nhân vật
    const animClass = state === 'barking' ? `${uid}-anim-barking` :
                      (state === 'exhausted' ? `${uid}-anim-exhausted` :
                      (state.startsWith('evolved') ? `${uid}-anim-evolved` : `${uid}-anim-idle`));

    // Đảo hướng mặt nếu flip hoặc thuộc phe xanh đối địch
    const mirrorTransform = isMirrored ? 'transform="scale(-1, 1) translate(-200, 0)"' : '';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230" width="${width}" height="${height}" class="${uid}-root" data-breed="${dog.breed}" data-state="${state}" data-team="${team}">
        <defs>
          <style>${cssAnimations}</style>
          
          <!-- Gradient đổ bóng hình cầu 2.5D cho Đầu Chibi -->
          <radialGradient id="${uid}-head-grad" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stop-color="${lighten(colors.primary, 22)}" />
            <stop offset="55%" stop-color="${colors.primary}" />
            <stop offset="100%" stop-color="${colors.shade}" />
          </radialGradient>

          <!-- Gradient Thân Mình -->
          <linearGradient id="${uid}-body-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${lighten(colors.primary, 10)}" />
            <stop offset="60%" stop-color="${colors.primary}" />
            <stop offset="100%" stop-color="${colors.shade}" />
          </linearGradient>

          <!-- Gradient Má Bánh Bao / Mõm Trắng -->
          <radialGradient id="${uid}-muzzle-grad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="70%" stop-color="${colors.secondary}" />
            <stop offset="100%" stop-color="${darken(colors.secondary, 15)}" />
          </radialGradient>

          <!-- Hào quang lửa Hóa Hổ -->
          <radialGradient id="${uid}-fire-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9" />
            <stop offset="45%" stop-color="#f97316" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#dc2626" stop-opacity="0" />
          </radialGradient>

          <!-- Hào quang Rồng Thần -->
          <radialGradient id="${uid}-dragon-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#a5f3fc" stop-opacity="0.95" />
            <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Bóng đổ sàn đấu -->
        ${groundShadow}

        <!-- Phần thân và cử động nhân vật (lật hướng nếu quay mặt sang trái) -->
        <g ${mirrorTransform}>
          <!-- Hào quang thần thú phía sau -->
          ${evolutionMarkup.background}

          <!-- Nhóm cử động nhấp nhô của Chó -->
          <g class="${animClass}">
            <!-- Đuôi -->
            <g class="${uid}-tail-wagging">
              ${breedSvgParts.tail}
            </g>

            <!-- Chân sau -->
            ${breedSvgParts.backPaws}

            <!-- Thân mình 2.5D -->
            ${breedSvgParts.body}

            <!-- Khăn rằn / Vòng cổ -->
            ${bandanaMarkup}

            <!-- Chân trước -->
            ${breedSvgParts.frontPaws}

            <!-- Đầu Chibi 2.5D to tròn đáng yêu -->
            <g id="${uid}-head-group">
              <!-- Tai chó (Trái & Phải) -->
              ${breedSvgParts.ears}

              <!-- Khối sọ đầu chính -->
              ${breedSvgParts.head}

              <!-- Nếp nhăn hoặc vệt trán đặc thù -->
              ${breedSvgParts.headMarkings}

              <!-- Mõm & Má bánh bao phúng phính -->
              ${breedSvgParts.snoutAndCheeks}

              <!-- Mắt Chibi to tròn long lanh -->
              ${breedSvgParts.eyes}

              <!-- Mũi & Miệng (Đóng / Há sủa / Thè lưỡi) -->
              ${breedSvgParts.mouth}

              <!-- Hiệu ứng đặc trưng giống chó (Vòng cổ gai Pitbull, tóc xoăn Poodle,...) -->
              ${breedSvgParts.accessories}

              <!-- Chi tiết hóa Hổ / Hóa Rồng trên mặt -->
              ${evolutionMarkup.foreground}
            </g>
          </g>

          <!-- Sóng âm thanh phát ra khi sủa -->
          ${barkWavesMarkup}

          <!-- Hiệu ứng mệt mỏi -->
          ${pantingMarkup}
        </g>

        <!-- UI Đầu: Khung Avatar, Tên, Máu (Không bị lật ngược) -->
        ${headerUI}
      </svg>
    `.trim();
  }

  /**
   * Tạo cấu trúc giải phẫu SVG đặc trưng cho từng giống chó Chibi
   */
  function generateBreedAnatomy(breedId, colors, state, uid) {
    const isBarking = state === 'barking';
    const isPanting = state === 'exhausted';
    const isEvolved = state.startsWith('evolved');

    // Thân mình dùng chung Chibi 2.5D mũm mĩm
    const defaultBody = `
      <!-- Thân tròn 2.5D -->
      <path d="M68,140 C68,125 132,125 132,140 C134,165 130,195 100,196 C70,195 66,165 68,140 Z" fill="url(#${uid}-body-grad)" />
      <!-- Yếm ức trắng mềm -->
      <path d="M85,142 C92,140 108,140 115,142 C116,164 110,188 100,188 C90,188 84,164 85,142 Z" fill="url(#${uid}-muzzle-grad)" opacity="0.95" />
    `;

    // Chân trước và chân sau mũm mĩm
    const frontPaws = `
      <!-- Chân trước tròn xinh múp míp -->
      <ellipse cx="82" cy="198" rx="10" ry="7" fill="${colors.secondary}" stroke="${colors.shade}" stroke-width="1.5" />
      <line x1="79" y1="197" x2="79" y2="203" stroke="${colors.shade}" stroke-width="1" stroke-linecap="round" />
      <line x1="84" y1="197" x2="84" y2="203" stroke="${colors.shade}" stroke-width="1" stroke-linecap="round" />

      <ellipse cx="118" cy="198" rx="10" ry="7" fill="${colors.secondary}" stroke="${colors.shade}" stroke-width="1.5" />
      <line x1="115" y1="197" x2="115" y2="203" stroke="${colors.shade}" stroke-width="1" stroke-linecap="round" />
      <line x1="120" y1="197" x2="120" y2="203" stroke="${colors.shade}" stroke-width="1" stroke-linecap="round" />
    `;

    const backPaws = `
      <!-- Chân đùi sau ngồi vững chãi -->
      <ellipse cx="63" cy="188" rx="14" ry="12" fill="${colors.shade}" />
      <ellipse cx="61" cy="194" rx="9" ry="6" fill="${colors.secondary}" />
      <ellipse cx="137" cy="188" rx="14" ry="12" fill="${colors.shade}" />
      <ellipse cx="139" cy="194" rx="9" ry="6" fill="${colors.secondary}" />
    `;

    // Cấu trúc mắt Chibi sinh động đa trạng thái
    let eyeContent = '';
    if (isPanting) {
      // Mắt hoa mắt chóng mặt xoáy tròn x_x chuẩn x1="64"
      eyeContent = `
        <g transform="translate(0, 0)">
          <!-- Mắt trái xoay x_x -->
          <line x1="64" y1="108" x2="74" y2="118" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
          <line x1="74" y1="108" x2="64" y2="118" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />

          <!-- Mắt phải xoay x_x -->
          <line x1="126" y1="108" x2="136" y2="118" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
          <line x1="136" y1="108" x2="126" y2="118" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
        </g>
        <g transform="translate(69, 113)">
          <path d="M-4,0 A 4,4 0 0,1 4,0 A 2.5,2.5 0 0,1 -1.5,1.5" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
        </g>
        <g transform="translate(131, 113)">
          <path d="M-4,0 A 4,4 0 0,1 4,0 A 2.5,2.5 0 0,1 -1.5,1.5" fill="none" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
        </g>
      `;
    } else if (isBarking) {
      // Mắt nheo tập trung khí thế cao độ
      eyeContent = `
        <!-- Mắt chiến binh nheo sủa đầy khí thế -->
        <g transform="translate(79, 112) rotate(10)">
          <ellipse cx="0" cy="0" rx="9" ry="7" fill="#0f172a" />
          <circle cx="2" cy="-2" r="3.5" fill="#ffffff" />
          <circle cx="-3" cy="2" r="1.5" fill="#ffffff" />
        </g>
        <g transform="translate(121, 112) rotate(-10)">
          <ellipse cx="0" cy="0" rx="9" ry="7" fill="#0f172a" />
          <circle cx="-2" cy="-2" r="3.5" fill="#ffffff" />
          <circle cx="3" cy="2" r="1.5" fill="#ffffff" />
        </g>
        <!-- Lông mày nhíu chiến binh -->
        <path d="M70,103 L86,108" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
        <path d="M130,103 L114,108" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
      `;
    } else if (breedId === 'shiba') {
      // Shiba mắt cười hí hóp hóm hỉnh
      eyeContent = `
        <path d="M72,114 Q80,106 88,114" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" />
        <path d="M112,114 Q120,106 128,114" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" />
      `;
    } else if (breedId === 'husky') {
      // Husky mắt xanh băng tuyết ngáo ngơ #00d2d3
      eyeContent = `
        <g transform="translate(80, 114)">
          <ellipse cx="0" cy="0" rx="10" ry="11" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="0" cy="0" r="7.5" fill="#00d2d3" />
          <circle cx="0" cy="0" r="4.5" fill="#0369a1" />
          <circle cx="-2" cy="-2" r="2.5" fill="#ffffff" />
        </g>
        <g transform="translate(120, 114)">
          <ellipse cx="0" cy="0" rx="10" ry="11" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="1" cy="0" r="7.5" fill="#00d2d3" />
          <circle cx="1" cy="0" r="4.5" fill="#0369a1" />
          <circle cx="-1" cy="-2" r="2.5" fill="#ffffff" />
        </g>
        <!-- Lông mày ngáo so-le -->
        <path d="M72,100 Q80,98 88,103" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />
        <path d="M112,104 Q120,97 128,101" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />
      `;
    } else {
      // Mắt to tròn Chibi Kawaii tiêu chuẩn với 2 điểm phản quang
      eyeContent = `
        <g transform="translate(80, 114)">
          <ellipse cx="0" cy="0" rx="9" ry="10" fill="#0f172a" />
          <circle cx="2.5" cy="-3" r="3.8" fill="#ffffff" />
          <circle cx="-3" cy="3.5" r="1.8" fill="#ffffff" />
        </g>
        <g transform="translate(120, 114)">
          <ellipse cx="0" cy="0" rx="9" ry="10" fill="#0f172a" />
          <circle cx="2.5" cy="-3" r="3.8" fill="#ffffff" />
          <circle cx="-3" cy="3.5" r="1.8" fill="#ffffff" />
        </g>
      `;
    }

    // Cấu trúc miệng & mõm đa trạng thái
    let mouthContent = '';
    if (isBarking) {
      // Há mõm to hết cỡ sủa GÂU GÂU, lộ răng nanh nhọn & lưỡi hồng
      mouthContent = `
        <!-- Vòm họng mở to phát lực -->
        <g transform="translate(100, 132)">
          <path d="M-18,-4 Q0,-8 18,-4 Q22,24 0,26 Q-22,24 -18,-4 Z" fill="#450a0a" stroke="#7f1d1d" stroke-width="1.5" />
          <!-- Lưỡi đỏ hồng bật lên khi sủa -->
          <path d="M-12,12 Q0,6 12,12 Q10,24 0,25 Q-10,24 -12,12 Z" fill="#f43f5e" />
          <!-- Răng nanh Chibi trắng nhọn -->
          <polygon points="-12,-4 -8,2 -5,-4" fill="#ffffff" />
          <polygon points="12,-4 8,2 5,-4" fill="#ffffff" />
          <polygon points="-8,24 -5,18 -2,24" fill="#ffffff" />
          <polygon points="8,24 5,18 2,24" fill="#ffffff" />
          <!-- Mũi Chibi nhô cao -->
          <ellipse cx="0" cy="-7" rx="8" ry="5.5" fill="#0f172a" />
          <ellipse cx="-2" cy="-9" rx="2.5" ry="1.5" fill="#64748b" />
        </g>
      `;
    } else if (isPanting) {
      // Thở dốc, lưỡi thè dài thườn thượt đung đưa
      mouthContent = `
        <g transform="translate(100, 131)">
          <!-- Mép cười hé mở -->
          <path d="M-14,0 Q0,8 14,0 Q10,12 0,13 Q-10,12 -14,0 Z" fill="#7f1d1d" />
          <!-- Lưỡi hồng thè dài lòng thòng rung rinh -->
          <g class="${uid}-tongue-shake">
            <path d="M-7,6 C-7,18 -5,25 0,26 C5,25 7,18 7,6 Z" fill="#fb7185" stroke="#e11d48" stroke-width="1" />
            <line x1="0" y1="8" x2="0" y2="21" stroke="#e11d48" stroke-width="1" stroke-linecap="round" />
            <!-- Giọt nước dãi bóng bẩy góc lưỡi -->
            <circle cx="4" cy="24" r="1.5" fill="#38bdf8" opacity="0.8" />
          </g>
          <!-- Mũi cún -->
          <ellipse cx="0" cy="-4" rx="7.5" ry="5" fill="#0f172a" />
          <ellipse cx="-2" cy="-6" rx="2" ry="1.2" fill="#64748b" />
        </g>
      `;
    } else {
      // Mặt cười mỉm Chibi hạnh phúc
      mouthContent = `
        <g transform="translate(100, 130)">
          <!-- Mũi đen mọng nước -->
          <ellipse cx="0" cy="-3" rx="8" ry="5.5" fill="#0f172a" />
          <ellipse cx="-2" cy="-5" rx="2.5" ry="1.5" fill="#64748b" />
          <!-- Khóe môi chữ W đáng yêu -->
          <path d="M-10,4 Q-5,10 0,4 Q5,10 10,4" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" />
          <!-- Má hồng e ấp -->
          <circle cx="-28" cy="-1" r="7" fill="#fb7185" opacity="0.4" />
          <circle cx="28" cy="-1" r="7" fill="#fb7185" opacity="0.4" />
        </g>
      `;
    }

    // Xây dựng các bộ phận đặc trưng cho 10 giống
    let head = '';
    let ears = '';
    let tail = '';
    let snoutAndCheeks = '';
    let headMarkings = '';
    let accessories = '';

    switch (breedId) {
      case 'corgi':
        // Corgi: Tai to vểnh foxy, yếm trắng, mông tròn trái tim
        ears = `
          <!-- Tai Corgi to vểnh đứng nhọn đầu bo tròn -->
          <path d="M52,98 C35,60 40,24 60,32 C78,40 76,78 72,96 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M54,90 C42,62 46,38 58,42 C68,46 68,76 66,88 Z" fill="${colors.earsInner}" />

          <path d="M148,98 C165,60 160,24 140,32 C122,40 124,78 128,96 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M146,90 C158,62 154,38 142,42 C132,46 132,76 134,88 Z" fill="${colors.earsInner}" />
        `;
        head = `<circle cx="100" cy="116" r="44" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Vệt trắng hình mũi tên giữa trán Corgi -->
          <path d="M96,72 L104,72 L106,105 L100,110 L94,105 Z" fill="#ffffff" />
        `;
        snoutAndCheeks = `
          <!-- Má và Mõm Corgi trắng phúng phính -->
          <ellipse cx="100" cy="132" rx="28" ry="18" fill="url(#${uid}-muzzle-grad)" />
        `;
        tail = `
          <!-- Mông Corgi tròn & đuôi cụt trái tim hasHeartButt -->
          <circle cx="56" cy="165" r="14" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="1.5" />
          <path d="M52,160 Q56,155 60,160 Q60,166 56,170 Q52,166 52,160 Z" fill="#ffffff" />
        `;
        break;

      case 'shiba':
        // Shiba: Má bánh bao phồng to, tai tam giác nhỏ vểnh, đuôi cuộn tròn
        ears = `
          <polygon points="56,88 64,48 84,78" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <polygon points="60,84 66,56 80,76" fill="${colors.earsInner}" />
          <polygon points="144,88 136,48 116,78" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <polygon points="140,84 134,56 120,76" fill="${colors.earsInner}" />
        `;
        head = `<ellipse cx="100" cy="115" rx="46" ry="42" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Đốm lông mày trắng tròn đặc trưng Shiba -->
          <circle cx="78" cy="102" r="4.5" fill="#ffffff" />
          <circle cx="122" cy="102" r="4.5" fill="#ffffff" />
        `;
        snoutAndCheeks = `
          <!-- Má bánh bao phồng tròn to sang 2 bên -->
          <ellipse cx="74" cy="130" rx="22" ry="18" fill="url(#${uid}-muzzle-grad)" />
          <ellipse cx="126" cy="130" rx="22" ry="18" fill="url(#${uid}-muzzle-grad)" />
          <ellipse cx="100" cy="133" rx="20" ry="16" fill="url(#${uid}-muzzle-grad)" />
        `;
        tail = `
          <!-- Đuôi cuộn xoắn ốc vòng trên lưng -->
          <path d="M56,145 C40,135 34,115 50,110 C62,106 68,120 58,132" fill="none" stroke="${colors.primary}" stroke-width="12" stroke-linecap="round" />
          <path d="M48,114 C54,110 58,118 52,124" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
        `;
        break;

      case 'husky':
        // Husky: Vệt lửa trán, mắt xanh băng tuyết, tai sói tuyết
        ears = `
          <polygon points="54,92 56,42 86,76" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <polygon points="58,86 60,52 82,74" fill="#f8fafc" />
          <polygon points="146,92 144,42 114,76" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <polygon points="142,86 140,52 118,74" fill="#f8fafc" />
        `;
        head = `<circle cx="100" cy="116" r="44" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Mặt nạ trắng ba chỏm ngọn lửa Husky Bắc Cực -->
          <path d="M100,74 L107,98 L118,94 L109,108 L100,105 L91,108 L82,94 L93,98 Z" fill="#ffffff" />
        `;
        snoutAndCheeks = `
          <!-- Mõm trắng và má tuyết -->
          <ellipse cx="100" cy="133" rx="27" ry="18" fill="#ffffff" />
        `;
        tail = `
          <!-- Đuôi bông xù vểnh cao -->
          <path d="M58,155 C36,148 30,125 42,112 C48,124 56,138 66,144" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M38,122 C42,114 48,116 52,126" fill="#ffffff" />
        `;
        break;

      case 'pitbull':
        // Pitbull: Mặt bạnh cơ bắp, tai gập / cắt ngầu, vòng cổ đinh tán
        ears = `
          <!-- Tai gập nhỏ cơ bắp -->
          <path d="M54,92 C46,80 50,65 65,72 C68,84 66,92 62,98 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M146,92 C154,80 150,65 135,72 C132,84 134,92 138,98 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
        `;
        head = `
          <!-- Hộp sọ vuông vức cơ bắp -->
          <rect x="56" y="74" width="88" height="78" rx="36" fill="url(#${uid}-head-grad)" />
        `;
        headMarkings = `
          <!-- Nếp nhăn trán chiến binh -->
          <path d="M90,88 L100,94 L110,88" fill="none" stroke="${colors.shade}" stroke-width="2" stroke-linecap="round" />
          <circle cx="100" cy="100" r="1.5" fill="${colors.shade}" />
        `;
        snoutAndCheeks = `
          <!-- Hàm vuông chắc nịch -->
          <rect x="76" y="120" width="48" height="26" rx="13" fill="${colors.secondary}" stroke="${colors.shade}" stroke-width="1.5" />
        `;
        accessories = `
          <!-- Vòng cổ đinh tán hầm hố của Pitbull hasSpikeCollar -->
          <g transform="translate(100, 155)">
            <rect x="-42" y="-6" width="84" height="12" rx="6" fill="#18181b" stroke="#71717a" stroke-width="1.5" />
            <polygon points="-30,-8 -27,-2 -33,-2" fill="#e4e4e7" stroke="#71717a" stroke-width="0.8" />
            <polygon points="-15,-8 -12,-2 -18,-2" fill="#e4e4e7" stroke="#71717a" stroke-width="0.8" />
            <polygon points="0,-8 3,-2 -3,-2" fill="#e4e4e7" stroke="#71717a" stroke-width="0.8" />
            <polygon points="15,-8 18,-2 12,-2" fill="#e4e4e7" stroke="#71717a" stroke-width="0.8" />
            <polygon points="30,-8 33,-2 27,-2" fill="#e4e4e7" stroke="#71717a" stroke-width="0.8" />
          </g>
        `;
        tail = `
          <!-- Đuôi roi ngắn khỏe -->
          <path d="M58,155 Q35,148 42,136" fill="none" stroke="${colors.primary}" stroke-width="6" stroke-linecap="round" />
        `;
        break;

      case 'pug':
        // Pug: Mặt xệ nhiều nếp gấp, mắt lồi to, mõm đen tuyền
        ears = `
          <!-- Tai cụp đen nhung xếp nếp -->
          <path d="M54,92 C42,86 42,112 56,118 C64,116 66,102 62,94 Z" fill="#18181b" stroke="#09090b" stroke-width="1.5" />
          <path d="M146,92 C158,86 158,112 144,118 C136,116 134,102 138,94 Z" fill="#18181b" stroke="#09090b" stroke-width="1.5" />
        `;
        head = `<circle cx="100" cy="116" r="45" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Nếp nhăn xệ trán Pug cực nhiều tầng -->
          <path d="M84,86 Q100,78 116,86" fill="none" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" />
          <path d="M86,94 Q100,88 114,94" fill="none" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" />
          <path d="M90,102 Q100,98 110,102" fill="none" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" />
        `;
        snoutAndCheeks = `
          <!-- Mõm đen nhung xệ xuống -->
          <ellipse cx="100" cy="132" rx="27" ry="17" fill="#18181b" />
          <ellipse cx="80" cy="133" rx="12" ry="10" fill="#27272a" />
          <ellipse cx="120" cy="133" rx="12" ry="10" fill="#27272a" />
        `;
        tail = `
          <!-- Đuôi xoăn tít như vỏ đỗ -->
          <circle cx="50" cy="150" r="8" fill="none" stroke="${colors.primary}" stroke-width="5" />
        `;
        break;

      case 'poodle':
        // Poodle: Lông xù cục bông tròn trán, tai dài bồng bềnh
        ears = `
          <!-- Tai dài phủ lông xoăn cục bông tròn bồng bềnh -->
          <g transform="translate(48, 86)">
            <circle cx="0" cy="10" r="14" fill="${colors.primary}" />
            <circle cx="-4" cy="24" r="13" fill="${colors.shade}" />
            <circle cx="4" cy="34" r="11" fill="${colors.primary}" />
          </g>
          <g transform="translate(152, 86)">
            <circle cx="0" cy="10" r="14" fill="${colors.primary}" />
            <circle cx="4" cy="24" r="13" fill="${colors.shade}" />
            <circle cx="-4" cy="34" r="11" fill="${colors.primary}" />
          </g>
        `;
        head = `<circle cx="100" cy="116" r="43" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Chùm kẹo bông tròn xoe trên đỉnh đầu Poodle -->
          <g transform="translate(100, 72)">
            <circle cx="-16" cy="4" r="14" fill="${colors.secondary}" />
            <circle cx="16" cy="4" r="14" fill="${colors.secondary}" />
            <circle cx="0" cy="-6" r="17" fill="#ffffff" />
            <circle cx="0" cy="6" r="15" fill="${colors.secondary}" />
          </g>
        `;
        snoutAndCheeks = `
          <!-- Mõm nhỏ thanh tú của chó Poodle quý tộc -->
          <ellipse cx="100" cy="133" rx="20" ry="14" fill="${colors.secondary}" />
        `;
        tail = `
          <!-- Đuôi quả lắc bông tròn xoe -->
          <circle cx="44" cy="142" r="12" fill="${colors.secondary}" stroke="${colors.primary}" stroke-width="1.5" />
        `;
        break;

      case 'becgie':
        // Becgie: Tai to nhọn thẳng đứng, mõm đen mặt nạ uy nghi, yên ngựa đen
        ears = `
          <!-- Tai dựng thẳng tắp dũng mãnh -->
          <polygon points="52,95 48,30 84,68" fill="${colors.secondary}" stroke="#0c0a09" stroke-width="2" />
          <polygon points="56,88 54,42 78,70" fill="${colors.earsInner}" />
          <polygon points="148,95 152,30 116,68" fill="${colors.secondary}" stroke="#0c0a09" stroke-width="2" />
          <polygon points="144,88 146,42 122,70" fill="${colors.earsInner}" />
        `;
        head = `<circle cx="100" cy="116" r="44" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Mặt nạ đen Becgie bao quanh trán và mắt -->
          <path d="M72,100 Q100,88 128,100 L124,120 L100,116 L76,120 Z" fill="#1c1917" opacity="0.88" />
        `;
        snoutAndCheeks = `
          <!-- Mõm đen tuyền cảnh khuyển -->
          <ellipse cx="100" cy="132" rx="24" ry="17" fill="#0c0a09" />
        `;
        tail = `
          <!-- Đuôi kiếm rậm lông thõng xuống tự nhiên -->
          <path d="M58,155 C38,150 28,172 38,190" fill="none" stroke="${colors.primary}" stroke-width="8" stroke-linecap="round" />
          <path d="M52,154 C36,152 30,170 38,185" fill="none" stroke="#1c1917" stroke-width="4" stroke-linecap="round" />
        `;
        break;

      case 'golden':
        // Golden: Tai rủ mềm mại, nụ cười thiên thần, lông tơ vàng
        ears = `
          <!-- Tai rủ dài viền lông lượn sóng hiền từ -->
          <path d="M54,92 C38,98 34,130 52,136 C64,136 68,114 62,94 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M146,92 C162,98 166,130 148,136 C136,136 132,114 138,94 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
        `;
        head = `<circle cx="100" cy="115" r="45" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Vầng trán ấm áp hiền hòa -->
          <ellipse cx="100" cy="85" rx="14" ry="7" fill="${colors.secondary}" opacity="0.6" />
        `;
        snoutAndCheeks = `
          <!-- Mõm rộng hiền hậu phúc hậu -->
          <ellipse cx="100" cy="133" rx="26" ry="18" fill="url(#${uid}-muzzle-grad)" />
        `;
        tail = `
          <!-- Đuôi cờ lông vũ vàng óng vẫy nhiệt tình -->
          <path d="M56,150 C30,138 25,110 44,98 C50,115 56,132 64,142" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="1.5" />
          <path d="M35,116 C32,126 40,132 46,128" fill="${colors.secondary}" />
        `;
        break;

      case 'doberman':
        // Doberman: Tai nhọn vút kiêu hãnh, đen bóng, đốm nâu đồng trên mắt
        ears = `
          <!-- Tai nhọn dựng đứng sắc bén như kiếm -->
          <polygon points="56,92 50,25 76,70" fill="${colors.primary}" stroke="#020617" stroke-width="2" />
          <polygon points="60,86 56,38 72,70" fill="${colors.secondary}" />
          <polygon points="144,92 150,25 124,70" fill="${colors.primary}" stroke="#020617" stroke-width="2" />
          <polygon points="140,86 144,38 128,70" fill="${colors.secondary}" />
        `;
        head = `<ellipse cx="100" cy="116" rx="42" ry="44" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- 2 đốm nâu đồng trên mắt Doberman chuẩn giống -->
          <circle cx="78" cy="100" r="4.5" fill="${colors.secondary}" />
          <circle cx="122" cy="100" r="4.5" fill="${colors.secondary}" />
        `;
        snoutAndCheeks = `
          <!-- Mõm thon dài quý tộc màu nâu đồng sẫm -->
          <path d="M82,122 C82,118 118,118 118,122 C118,138 112,148 100,148 C88,148 82,138 82,122 Z" fill="${colors.secondary}" />
        `;
        tail = `
          <!-- Đuôi ngắn cộc kiêu kỳ -->
          <polygon points="56,150 46,142 54,140" fill="${colors.primary}" stroke="#020617" stroke-width="1.5" />
        `;
        break;

      case 'chota':
      default:
        // Chó Cỏ Vàng Việt Nam: Tai nửa cụp nửa vểnh tinh khôn, đuôi cong vắt vẻo
        ears = `
          <!-- Tai nửa dựng nửa cúp tinh nghịch -->
          <path d="M54,92 C42,70 48,46 68,52 C64,68 76,82 72,94 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M58,84 C52,66 56,54 64,56 C62,68 70,78 68,86 Z" fill="${colors.earsInner}" />
          <!-- Tai phải cụp nhẹ một tí tạo nét láu lỉnh -->
          <path d="M146,92 C158,74 154,54 134,50 C128,65 130,80 128,94 Z" fill="${colors.primary}" stroke="${colors.shade}" stroke-width="2" />
          <path d="M142,84 C148,70 144,58 136,56 C134,68 132,78 132,86 Z" fill="${colors.earsInner}" />
        `;
        head = `<circle cx="100" cy="116" r="44" fill="url(#${uid}-head-grad)" />`;
        headMarkings = `
          <!-- Nét mặt tinh ranh thông minh -->
          <path d="M96,78 Q100,74 104,78" fill="none" stroke="${colors.shade}" stroke-width="2" stroke-linecap="round" />
        `;
        snoutAndCheeks = `
          <!-- Mõm Chó Vàng thon gọn đốm trắng -->
          <ellipse cx="100" cy="133" rx="25" ry="17" fill="url(#${uid}-muzzle-grad)" />
        `;
        tail = `
          <!-- Đuôi cong vắt vẻo hình lưỡi liềm trên lưng -->
          <path d="M58,150 C36,135 32,106 50,96 C56,104 56,118 64,136" fill="none" stroke="${colors.primary}" stroke-width="7" stroke-linecap="round" />
        `;
        break;
    }

    return {
      body: defaultBody,
      frontPaws,
      backPaws,
      head,
      ears,
      tail,
      snoutAndCheeks,
      headMarkings,
      eyes: eyeContent,
      mouth: mouthContent,
      accessories
    };
  }

  /**
   * Tạo Khăn Bandana theo Team Đỏ / Xanh
   */
  function generateBandana(team, colors, uid) {
    if (team === 'none') {
      return `
        <!-- Vòng cổ da đơn giản -->
        <path d="M72,150 Q100,160 128,150" fill="none" stroke="#475569" stroke-width="4" stroke-linecap="round" />
      `;
    }

    const isRed = team === 'red';
    const bg = isRed ? '#dc2626' : '#2563eb';
    const border = isRed ? '#991b1b' : '#1d4ed8';
    const pattern = isRed ? '#fca5a5' : '#93c5fd';

    return `
      <!-- Khăn Bandana Chiến Binh Team ${isRed ? 'Đỏ' : 'Xanh'} -->
      <g id="${uid}-bandana" transform="translate(100, 152)">
        <!-- Thân khăn tam giác che ngực -->
        <path d="M-34,-3 Q0,6 34,-3 L0,22 Z" fill="${bg}" stroke="${border}" stroke-width="1.5" />
        <!-- Họa tiết hoa văn Bandana sấm sét / ngọn lửa -->
        <path d="M-18,2 L-12,7 L-6,2 L0,8 L6,2 L12,7 L18,2" fill="none" stroke="${pattern}" stroke-width="1.5" stroke-linecap="round" opacity="0.85" />
        <circle cx="0" cy="13" r="2.5" fill="${pattern}" />
        <!-- Nút thắt nơ cạnh cổ -->
        <circle cx="28" cy="-1" r="4.5" fill="${border}" />
        <path d="M29,-1 L38,-6 L36,4 Z" fill="${bg}" />
      </g>
    `;
  }

  /**
   * Tạo hiệu ứng Tiến hóa Hóa Hổ (Tiger) hoặc Hóa Rồng (Dragon)
   */
  function generateEvolutionEffects(state, uid) {
    if (state === 'evolved_tiger') {
      return {
        background: `
          <!-- Hào quang lửa rực cháy quanh nhân vật -->
          <circle cx="100" cy="130" r="75" fill="url(#${uid}-fire-aura)" />
          <!-- Đốm lửa bùng nổ stroke="#ff9f43" -->
          <path d="M40,110 Q30,85 50,90 Q40,70 60,80" fill="none" stroke="#ff9f43" stroke-width="3" stroke-linecap="round" />
          <path d="M160,110 Q170,85 150,90 Q160,70 140,80" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
        `,
        foreground: `
          <!-- Vằn Cọp Dũng Mãnh trên trán và má -->
          <g fill="#18181b">
            <!-- Vằn Vương Vương trên trán Hổ -->
            <path d="M92,80 L108,80 L104,83 L96,83 Z" />
            <path d="M90,86 L110,86 L106,89 L94,89 Z" />
            <path d="M98,76 L102,76 L102,94 L98,94 Z" />
            <!-- Vằn má hổ vát 2 bên -->
            <polygon points="62,118 76,122 64,126" />
            <polygon points="60,128 72,131 62,135" />
            <polygon points="138,118 124,122 136,126" />
            <polygon points="140,128 128,131 138,135" />
          </g>
          <!-- Răng nanh Hổ sắc bén lộ ra ngoài mép -->
          <polygon points="86,134 89,144 92,134" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8" />
          <polygon points="114,134 111,144 108,134" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8" />
        `
      };
    } else if (state === 'evolved_dragon') {
      return {
        background: `
          <!-- Hào quang Thần Long Lam Ngọc stroke="#00d2d3" -->
          <circle cx="100" cy="130" r="80" fill="url(#${uid}-dragon-aura)" />
          <circle cx="100" cy="130" r="70" fill="none" stroke="#00d2d3" stroke-width="2" opacity="0.85" />
          <!-- Vòng lân tinh thần thánh -->
          <circle cx="100" cy="130" r="68" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6,8" opacity="0.7" />
        `,
        foreground: `
          <!-- Cặp Sừng Rồng Hoàng Kim Vươn Cao stroke="#d35400" -->
          <g id="${uid}-dragon-horns" stroke="#d35400" stroke-width="1.5">
            <path d="M74,74 Q58,40 44,48 Q56,60 68,76 Z" fill="#fbbf24" stroke="#d35400" />
            <path d="M58,54 Q48,46 44,52" fill="none" stroke="#d35400" stroke-width="2" />
            <path d="M126,74 Q142,40 156,48 Q144,60 132,76 Z" fill="#fbbf24" stroke="#d35400" />
            <path d="M142,54 Q152,46 156,52" fill="none" stroke="#d35400" stroke-width="2" />
          </g>
          <!-- Vảy rồng lấp lánh trên má -->
          <g fill="#38bdf8" opacity="0.85">
            <circle cx="70" cy="116" r="2.5" />
            <circle cx="75" cy="120" r="3" />
            <circle cx="71" cy="125" r="2.5" />
            <circle cx="130" cy="116" r="2.5" />
            <circle cx="125" cy="120" r="3" />
            <circle cx="129" cy="125" r="2.5" />
          </g>
          <!-- Viên ngọc long châu tỏa sáng giữa trán -->
          <circle cx="100" cy="85" r="5" fill="#facc15" stroke="#ffffff" stroke-width="1.5" />
        `
      };
    }

    return { background: '', foreground: '' };
  }

  // Tiện ích làm sáng/tối màu Hex
  function lighten(hex, percent) {
    return adjustColor(hex, percent);
  }

  function darken(hex, percent) {
    return adjustColor(hex, -percent);
  }

  function adjustColor(hex, percent) {
    if (!hex || hex[0] !== '#') return hex || '#f59e0b';
    let num = parseInt(hex.slice(1), 16);
    if (hex.length === 4) {
      num = parseInt(hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3], 16);
    }
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  /**
   * Vẽ trực tiếp lên HTML5 Canvas 2D
   */
  function renderToCanvas(ctx, dog, x, y, size = 150) {
    const svgStr = renderToSVG(dog, { size });
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, x, y, size, size * 1.15);
        URL.revokeObjectURL(url);
        resolve(true);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  // Xuất module
  const DogRenderer = {
    getAllBreeds,
    getBreedInfo,
    createCharacter,
    formatDogName,
    renderToSVG,
    renderDogSvg: renderToSVG, // Alias tương thích hợp đồng P2P
    renderDog: renderToSVG,    // Alias tiện ích
    renderToCanvas,
    normalizeState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DogRenderer;
  } else {
    global.DogRenderer = DogRenderer;
  }

})(typeof window !== 'undefined' ? window : globalThis);
