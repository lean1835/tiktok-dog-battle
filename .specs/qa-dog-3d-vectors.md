# BỘ TIÊU CHUẨN KIỂM ĐỊNH QA & TEST VECTORS CHO SÀN ĐẤU CHÓ 3D THREE.JS (TIKTOK DOG BATTLE 3D)

## 1. Mục tiêu kiểm thử
Xác nhận chất lượng mô hình hình học 3D, hiệu năng render WebGL (đạt 60 FPS mượt mà cho OBS Studio), an ninh bảo mật và tính toàn vẹn của Sàn Đấu Chó 3D 5v5 (Xóm Đỏ vs Xóm Xanh).

---

## 2. Danh mục Test Vectors Nghiệm Thu (TV-3D)

### TV-3D-01: Bộ sưu tập 10 Mô hình 3D Procedural (9 Giống Chó + 1 Chú Heo Bựa Lạc Bầy)
- **Yêu cầu:** Kết xuất hoàn toàn bằng hình học Three.js (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry...), không phụ thuộc tải file .gltf/.obj ngoài để đảm bảo 100% tự chứa:
  1. `corgi`: Thân hình hộp tròn mập mạp, 4 chân trụ ngắn ngủn, mông trái tim lắc lư.
  2. `shiba`: Mặt vàng má trắng phúng phính, mắt híp cười, đuôi xoắn ốc 3D.
  3. `husky`: Mắt xanh băng giá, vệt lông trán ngọn lửa, biểu cảm ngáo ngơ.
  4. `pitbull`: Đầu vuông cơ bắp, cổ đeo vòng đinh gai nhọn hầm hố.
  5. `pug`: Đầu tròn mặt xệ nếp gấp hình học, tai cụp đen, mắt lồi tròn.
  6. `poodle`: Đầu và 4 chân bọc các khối cầu lông xù xoăn tròn như kẹo bông.
  7. `becgie`: Tai dựng đứng dũng mãnh, mõm vát nhọn đen bóng cảnh khuyển.
  8. `golden`: Lông vàng cam ấm áp, tai rủ mềm mại 2 bên đầu.
  9. `doberman`: Thân hình thon gọn đen bóng quý tộc, tai vát nhọn kiêu hãnh.
  10. `piggy` (Chú Heo Bựa Lạc Bầy): Toàn thân hồng phấn, mũi tròn 2 lỗ to tướng, tai vểnh, đuôi lò xo ngoe nguẩy tạo điểm nhấn hài hước cực mạnh.
- **Tiêu chuẩn:** Hàm khởi tạo nhận diện chính xác 10 loại sinh vật 3D, gán vật liệu MeshLambertMaterial / MeshStandardMaterial tươi sáng.

### TV-3D-02: Bảng Tên 3D Billboard & Chống Lỗ Hổng XSS
- **Yêu cầu:** Mỗi nhân vật có Bảng tên 3D treo trên đầu hiển thị:
  - Tên quy chuẩn: `Tuất + [Tên]` (hoặc `Trư + [Tên]` cho chú Heo bựa).
  - Thanh máu HP 3D đổi màu (Xanh lá -> Vàng -> Đỏ khi thấp máu).
  - Hiệu ứng Billboard: Bảng tên luôn tự động xoay mặt hướng về phía Camera (`billboard.quaternion.copy(camera.quaternion)`), không bị méo mó hay lộn ngược góc nhìn.
- **An ninh:** Toàn bộ chuỗi ký tự hiển thị trên Billboard Canvas được làm sạch qua cơ chế encode / sanitize, 100% không dính XSS hay HTML Injection.

### TV-3D-03: Hoạt Họa Chuyển Động 3D & Sóng Âm Chấn Động
- **Yêu cầu:** Mỗi mô hình 3D phải có khớp xương / pivot point để thực thi hoạt họa:
  1. `idle`: Nhịp thở nhấp nhô của thân mình, đuôi lắc lư hình sin.
  2. `walk/run`: 4 chân chuyển động chéo nhịp nhàng theo chu kỳ bước đi.
  3. `barking`: Mõm há to, đầu giật về phía trước, bung tỏa các vòng sóng âm 3D (`RingGeometry` tỏa rộng và mờ dần).
  4. `hit/exhausted`: Mắt xoay vòng, thân ngã nghiêng, đầu gục xuống.
  5. `evolved`: Vòng hào quang lửa vàng (Hổ) hoặc hào quang lam thần thánh (Rồng) bao quanh nhân vật.

### TV-3D-04: Sa Bàn 5v5 Xóm Đỏ vs Xóm Xanh & Nút "GÂU" Khổng Lồ
- **Yêu cầu:**
  - Sàn đấu 3D: Mặt cỏ xanh hoặc sàn đấu trường có vạch chia đôi sân, ranh giới 2 phe.
  - Phân bổ 5v5: 5 chiến binh Xóm Đỏ (khăn bandana đỏ bên trái) đối đầu 5 chiến binh Xóm Xanh (khăn bandana xanh bên phải).
  - UI Overlay: Tỷ số đối đầu, thanh tổng lực lượng 2 xóm, và đặc biệt là Nút "GÂU" Khổng Lồ ở góc màn hình có hiệu ứng nảy 3D khi bấm để khán giả kích hoạt tiếng sủa.

### TV-3D-05: 100% Tự Chứa Offline & Tối Ưu Hóa 60 FPS Cho OBS
- **Yêu cầu:**
  - File Three.js được nhúng nội bộ hoặc lấy từ package local, 0 script tải từ CDN bên ngoài.
  - Tự động nhận diện WebGL và kích hoạt animation loop `requestAnimationFrame`.
  - Khung hình đạt chuẩn 60 FPS mượt mà trên tỷ lệ dọc 9:16 (1080x1920), không gây lag CPU/GPU cho máy streamer khi phát livestream.

---

## 3. Chốt chặn an toàn vùng cấm
- Bảo vệ tuyệt đối 100% tính nguyên vẹn của 3 dự án lân cận: `tiktok-vocab-game`, `chanh-dien-online` và `tiktok-live-bar`.
