# Sửa đồng bộ cửa sổ sân — 07/11/2026

Đã áp dụng lên server và mở lại cửa sổ native. Không đổi luật, điểm, quà, mẫu sủa hoặc chất lượng render.

## Thay đổi

- Không lấy độ trễ của từng snapshot làm độ lệch đồng hồ mới. Giữ mẫu đồng hồ ít trễ nhất trong cửa sổ 30 giây; reconnect làm mới tập mẫu. Kiểm tra một gói đến muộn 5 giây với client lệch đồng hồ 8 giây: đồng hồ trận không bị đẩy lùi 5 giây.
- Nút mở sân ở quản lý gọi API chỉ dành cho manager để mở đúng app native. Không còn đi nhầm vào popup có thể bị trình duyệt giảm nhịp. Overlay vẫn không được điều khiển game hoặc mở ứng dụng; caller không được truyền đường dẫn/chương trình/port tùy ý.
- Profile riêng dùng các cờ chống hạ nhịp timer/renderer và occlusion của Chromium. Cho phép tự phát âm thanh trong riêng phiên app này, giữ một nguồn âm thanh chung qua server. Không sửa cài đặt Edge chính hoặc hạ chất lượng overlay.
- Thêm báo cáo hiển thị tại `/health` → `presentation`, một lần/giây từ sân capture: FPS, tuổi frame, độ trễ nhận gói, tuổi snapshot, trễ timer, trạng thái nguồn âm thanh. Chỉ nhận số hữu hạn có giới hạn; không ghi vào dữ liệu game hoặc broadcast ngược thành vòng lặp.

Tham khảo cấu hình trình duyệt từ [GoogleChrome/chrome-launcher](https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md) và [Microsoft về phát media trong Edge](https://learn.microsoft.com/en-us/troubleshoot/microsoft-edge/development/video-playback-issues).

## Số đo trên cửa sổ native thật

12 mẫu sau khi áp dụng, trước lần mở lại thêm quyền tự phát: 29,7–30 FPS; độ trễ gói nhận 0–29 ms; tuổi frame 3–23 ms; trễ timer 0–10 ms. Đây là đồng bộ nội bộ từ server tới cửa sổ, không phải toàn tuyến TikTok.

Sau lần mở lại cuối, `/health` xác nhận `audioOutput: true`, FPS khoảng 30 và không có lỗi lưu trữ. Windows xác nhận cửa sổ vẫn khóa ở 565 × 1020, bằng chiều cao vùng làm việc của màn hình hiện tại.

TikTok trả trạng thái offline cho kênh đã lưu ở lúc kết nối lại. Các mẫu trên không chứng minh tốc độ dưới tải tim/quà LIVE thật. Không so trực tiếp với mẫu socket trước đó để suy ra hệ số tăng tốc: lưu lượng và trạng thái LIVE khác nhau.

## Kiểm chứng và dữ liệu

Kiểm thử client (20) và WebSocket (14) đã qua, gồm gói trễ, lệch đồng hồ, camera/lời thoại, mở sân chỉ từ manager, giới hạn telemetry và giữ overlay chỉ đọc. Kiểm thử renderer ở lượt trước cũng qua; ba lỗi ở lượt chạy song song đầu được phân biệt: một timeout khi máy tải nặng và hai assertion mới đợi requestId ở phản hồi bị từ chối của overlay (giao thức hiện tại không gắn ID ở nhánh này); assertion được sửa đúng giao thức rồi chạy lại.

Trận 5, 134 hồ sơ và 2 xu tại thời điểm nạp bản mới được giữ lại, trận đã tiếp tục. Bản sao `runtime/before-realtime-*.json`; bằng chứng `test/output/realtime-deploy.json`. Không reset dữ liệu.

Bằng chứng số đo: `test/output/portrait-realtime-native-after.json`, `portrait-realtime-final-health.json`, `portrait-realtime-tests-sequential.txt`, `portrait-realtime-websocket-tests.txt`, `runtime/portrait-window.log`.
