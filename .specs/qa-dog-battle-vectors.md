# BỘ TIÊU CHUẨN KIỂM ĐỊNH QA & TEST VECTORS CHO DỰ ÁN TIKTOK DOG BATTLE

## 1. Mục tiêu kiểm thử
Xác nhận chất lượng đồ họa, an ninh bảo mật và tính toàn vẹn của Hệ thống Nhân vật Chó Chibi 2.5D và Sa bàn Đấu Chó Siêu Hài (5v5) trên nền tảng TikTok LIVE.

---

## 2. Danh mục Test Vectors Nghiệm Thu (TV-DOG)

### TV-DOG-01: Bộ sưu tập 10 Giống Chó Chibi 2.5D Đặc Trưng
- **Yêu cầu:** Đầy đủ 10 giống chó, mỗi giống có nét vẽ vector đặc thù nhận diện ngay lập tức:
  1. `corgi`: Chân ngắn, mông trái tim lắc lư, tai to vểnh.
  2. `shiba`: Má phúng phính bánh bao, mắt híp cười, 2 chấm mày trắng.
  3. `husky`: Mắt xanh ngơ ngác, vệt lửa trán, biểu cảm ngáo ngơ.
  4. `pitbull`: Cơ bắp cuồn cuộn, vòng cổ đinh tán hầm hố.
  5. `pug`: Mặt xệ nhiều nếp nhăn, mắt lồi tròn đáng yêu.
  6. `poodle`: Lông xoăn xù tròn xoe như cục kẹo bông.
  7. `becgie`: Tai dựng, mõm đen uy dũng, dáng đứng cảnh khuyển.
  8. `golden`: Lông vàng ấm áp, mắt hiền lành, miệng cười thân thiện.
  9. `doberman`: Thân hình thon gọn đen bóng, tai nhọn cơ bắp vệ sĩ.
  10. `chota`: Chó Vàng cỏ Việt Nam, đuôi vắt vẻo lanh lợi, thân thiện.
- **Tiêu chuẩn:** `DogRenderer.getAllBreeds().length === 10`.

### TV-DOG-02: Quy Chuẩn Tên Nhân Vật & Chống Lỗ Hổng XSS
- **Yêu cầu:** Mọi nhân vật đều bắt buộc có tiền tố `Tuất + [Tên]` (hàm `formatDogName`).
- **An ninh:** Toàn bộ nickname người xem, bình luận chat hoặc tên quà donate PHẢI được làm sạch qua hàm `escapeXML` hoặc gán vào DOM bằng `textContent`. Nghiêm cấm hoàn toàn gán `.innerHTML` với dữ liệu chưa được sanitize.

### TV-DOG-03: Đủ 5 Trạng Thái Hoạt Họa & Tiến Hóa Thần Thú
- **Yêu cầu:** Mỗi giống chó phải hỗ trợ chuyển động và biểu cảm theo 5 trạng thái:
  1. `idle`: Nhịp thở phập phồng, vẫy đuôi vui vẻ, chớp mắt long lanh.
  2. `barking`: Há to mồm sủa gâu gâu, phát sóng âm chấn động.
  3. `exhausted`: Mắt xoay tròn `@_@`, lưỡi thè dài, giọt mồ hôi rơi khi hết máu.
  4. `evolved_tiger`: Hào quang lửa vàng rực cháy, vằn hổ oai nghiêm.
  5. `evolved_dragon`: Hào quang rồng xanh lam thần thánh, sừng rồng quyền năng.

### TV-DOG-04: Sa Bàn Đấu 5v5 Cân Bằng & Tỷ Lệ 9:16 OBS
- **Yêu cầu:** Sa bàn chia thành 2 phe Đội Đỏ (bên trái) vs Đội Xanh (bên phải), mỗi bên xếp 5 vị trí chó chiến binh.
- **Thành phần:** Mỗi vị trí hiển thị:
  - Avatar / Hình vẽ Chó Chibi 2.5D.
  - Tên nhân vật (Tuất + Tên người xem).
  - Thanh máu HP (100 -> 0) có đổi màu khi thấp máu.
  - Thanh nộ Năng lượng / Tích lũy tiếng sủa.
  - Khăn quàng cổ phân định màu đội (Khăn đỏ cho Đội Đỏ, Khăn lam cho Đội Xanh).

### TV-DOG-05: 100% Zero-Dependency & Tự Chứa Offline
- **Yêu cầu:** File `index.html` tự chứa toàn bộ mã nguồn SVG, CSS, JavaScript; không gọi bất kỳ thư viện CDN ngoài (0 external scripts, 0 external css). Chạy trực tiếp qua giao thức `file:///` hoặc nhúng Browser Source OBS Studio trơn tru.

---

## 3. Chốt chặn an toàn môi trường
- Bảo vệ tuyệt đối 100% tính nguyên vẹn của 3 dự án lân cận: `tiktok-vocab-game`, `chanh-dien-online` và `tiktok-live-bar`.
