# Nguồn LIVE Studio và chẩn đoán giật hình

## Cấu hình sử dụng

1. Chạy `Chay-Tuat-Live.bat`, giữ server trong lúc phát.
2. Trong LIVE Studio, đặt nguồn trình duyệt **1080 × 1920**, URL:
   `http://127.0.0.1:4173/overlay.html?studio=1`
3. Giữ đầu ra **30 FPS**. Cấu hình hiện tại của chủ kênh: H.264, 4.800 kbps. Chưa có số đo để kết luận cần giảm bitrate/độ phân giải.
4. Tại quản lý, bấm **Tắt xem trước để giảm tải**. Nguồn Studio và trận vẫn chạy. Đóng cửa sổ sân dọc riêng nếu đang dùng nguồn URL.
5. Bật thu âm của nguồn trình duyệt trong mixer Studio. Tránh thu lại cùng tiếng sân qua Desktop Audio hoặc một cửa sổ khác. Nguồn Studio sẵn sàng phát tiếng được server ưu tiên làm nguồn âm thanh chung; nguồn khác được chọn lại nếu nguồn Studio đóng.

Nếu trình duyệt chặn autoplay, tương tác một lần với nguồn theo khả năng của Studio. Việc ưu tiên nguồn chỉ có hiệu lực sau khi nguồn đó sẵn sàng phát âm thanh.

## Thay đổi phía game

- Chế độ `studio=1` giữ khung vẽ thiết kế 1080 × 1920, giới hạn hệ số pixel ở 1 để không vẽ thêm pixel do DPI Windows. Ví dụ DPI 125%: từ 1350 × 2400 xuống 1080 × 1920, giảm 36% số pixel đệm. Không thay camera, luật chơi hay mẫu âm thanh.
- Tắt preview sẽ chuyển iframe sang `about:blank`, dừng cảnh WebGL phụ. Bật lại được ngay; tùy chọn được lưu riêng trong trình duyệt quản lý.
- Chỉ một nguồn phát âm thanh. Ưu tiên nguồn Studio giúp hình/tiếng đi qua cùng nguồn thu; không tự thay đổi mixer hay encoder của LIVE Studio.
- `/health` có `presentation` cho nguồn Studio: FPS, tuổi khung hình, độ trễ gói nhận, độ lệch timer và trạng thái nguồn âm thanh. Đây là số đo cục bộ, không đo độ trễ video trên điện thoại.

## Kiểm chứng ngày 07/11/2026

- Trình duyệt thực ở DPI 125%: canvas đúng **1080 × 1920**. Không ghi nhận lỗi/warning console trong lần kiểm tra.
- Sau tương tác mở tiếng: khoảng **29,8 FPS**, tuổi khung hình **18 ms**, độ trễ gói **16 ms**, độ lệch timer **1 ms**, `audioOutput: true` tại thời điểm lấy mẫu. Đây là một mẫu với phiên đang nghỉ và TikTok chưa kết nối, không phải đo tải đông người hay thử phát LIVE.
- Preview tắt: iframe `about:blank`, ẩn canvas phụ, quản lý vẫn nhận trạng thái.
- Lần kiểm tra cuối sau build: các nhóm renderer, client âm thanh và WebSocket **70/70 kiểm thử đạt**, không lỗi; syntax 43 module và script nhúng trong hai HTML đạt.
- Khi triển khai backend đã sao lưu phiên và đối chiếu giữ nguyên hồ sơ, giống/hóa thú, xu, điểm, lịch sử và mã chống lặp quà; khôi phục trạng thái chạy trước đó.

## Nếu điện thoại vẫn đứng hình hoặc lệch tiếng

Chưa thể xác nhận nguyên nhân khi không có phiên phát thật. Trong lần LIVE tiếp theo, so sánh cùng thời điểm: FPS/độ trễ ở `/health`, hình preview Studio, thống kê mã hóa/khung bị bỏ/đường truyền và video trên điện thoại.

| Dấu hiệu | Hướng kiểm tra |
| --- | --- |
| FPS game giảm, tuổi khung hình tăng | Đóng cảnh 3D trùng; xem tải GPU/CPU trong lúc xảy ra lỗi |
| Game ổn nhưng Studio báo mã hóa quá tải | Xác định H.264 đang dùng phần cứng hay phần mềm; nếu máy hỗ trợ, thử Intel Quick Sync hoặc encoder phần cứng tương ứng |
| Game và Studio ổn nhưng khung rớt do mạng | Đo upload ổn định lúc phát; chỉ điều chỉnh bitrate theo số đo thực |
| Hai tiếng lặp/lệch nhau | Kiểm tra chỉ thu tiếng sân một lần trong mixer |
| Điện thoại trễ vài giây nhưng hình mượt, tiếng khớp | Phân biệt độ trễ phân phối LIVE với lỗi giật khung hình |

H.264 là tên codec, chưa xác định được đang mã hóa bằng CPU hay phần cứng. Chưa thay encoder, bitrate hoặc cấu hình mạng của máy người dùng.

Tham khảo chính thức: [OBS — Encoding Performance Troubleshooting](https://obsproject.com/kb/encoding-performance-troubleshooting), [OBS — Hardware Encoding](https://obsproject.com/kb/hardware-encoding). Đây là nguyên tắc về tải dựng hình/mã hóa; vị trí cài đặt trong TikTok LIVE Studio có thể khác.
