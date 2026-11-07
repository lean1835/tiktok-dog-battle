# Tối ưu ngày 07/11/2026

Đã giữ luật 5v5, điểm/tim/quà, ưu tiên người thật, giống chó cố định, 3 phút hết tương tác ngoài sân, giữ người đang đấu đến hết trận, Hổ/Rồng hồi kỹ năng 30 giây và vòng tự động 15 giây chuẩn bị / 2 phút đấu / 3 phút nghỉ. Không reset dữ liệu LIVE.

## Thay đổi và ảnh hưởng

| Hạng mục | Trước | Sau | Ảnh hưởng chức năng |
|---|---|---|---|
| Model đổi đội/cận cảnh | Hủy rig nhưng bỏ sót bone texture; dựng lại rig thường xuyên | Hủy skeleton thuộc clone, pool tối đa 20 rig theo model, xóa danh tính/nhịp sủa/effect khi tái sử dụng | Giữ model, tên, màu bảng tên và bóng; không dùng lại trạng thái người cũ |
| Khán giả chi tiết | Người vừa thả tim thay rig nổi bật liên tục | Giữ rig nổi bật khoảng 2 giây; mọi cue còn lại vẫn cập nhật hoạt ảnh đám đông | Không đổi điểm, tiếng, ưu tiên camera chào/quà/skill |
| Preview quản lý | Buffer 1350 × 2400 cho khung khoảng 344 × 620 | Theo viewport thực, DPR tối đa 1; đo bản đang chạy 344 × 612 cho khung 344 × 611,56 | Giảm khoảng 93,5% pixel của preview; overlay đầy đủ giữ độ phân giải và góc máy |
| Mỗi gói tim | Clone cả document, lịch sử, receipt và mọi hồ sơ | Sao chép actor, người hết hạn, fighter và các bộ đếm/mảng có thể thay đổi | Đối chiếu toàn bộ kết quả với đường cũ; quà vẫn lưu đồng bộ, tim vẫn flush 40 ms |
| Tick / broadcast | Clone document lần thứ hai; serialize từng client | Tick thay game đã clone; serialize một lần cho các client | Không đổi protocol, chống trùng, reconnect hoặc audio owner |
| Hàng chờ | Sort mọi hồ sơ rồi lọc hồ sơ ẩn | Lọc trước, sort phần còn hiện | Kiểm tra thứ tự kết quả giống hệt ở mọi pha |
| DOM quản lý | Dựng nhật ký/lịch sử ngay cả khi không xem | Cache nhật ký/leaderboard, bỏ qua tab ẩn, render khi mở tab | Vẫn giữ đủ người và chiến tích |

## Số đo

Máy dùng Intel Iris Xe, WebGL2 thật, overlay đầy đủ vẫn có buffer 1350 × 2400 tại DPR 1,25. Dữ liệu tải là phiên riêng, không bơm vào LIVE thật. Bài đo renderer tắt âm thanh để không phát tiếng thử vào LIVE.

| Phép đo | Trước | Sau |
|---|---:|---:|
| Texture sau 20 lượt đổi đội, 100 người | 808, tăng từ 110 | 128, tăng từ 102 rồi giữ 128 sau 40 lượt |
| Overlay 100 người, mẫu không spam | 19,7 FPS | 29,7–30 FPS |
| CPU xử lý tim P95, paired benchmark 1.000 hồ sơ / 100 hiện | 20,0–20,4 ms | 0,64–1,36 ms |
| Tim được tính trong mỗi lượt paired benchmark | 1.800/1.800 | 1.800/1.800 |

Paired benchmark chạy xen kẽ đường clone đầy đủ và đường mới, 600 gói mỗi lượt, 3 tim/gói, bỏ 100 gói đầu khỏi phân vị để làm nóng. Đây là chi phí ingestion trong bộ nhớ, không phải độ trễ LIVE hoặc chi phí ổ đĩa.

Ở bài thử 100 người spam tim, mẫu ổn định khoảng 24–26 FPS và cue P95 129–209 ms. Tuy nhiên cũng có mẫu tụt 3–6 FPS, cue tới khoảng 1,9 giây khi nhiều cảnh 3D/trình duyệt cùng tải máy. Bài 300 người cũng có mẫu 6 FPS. Chưa thể khẳng định đã mượt ổn định trong mọi mức tải hoặc quy toàn bộ chênh lệch FPS cho mã mới. Không thay chất lượng overlay, bỏ người hay mất điểm để đạt số đẹp.

## Kiểm chứng chức năng

- So sánh giao dịch tim mới với đường clone cũ qua 180 gói và quà xen kẽ; kết quả giống nhau, snapshot cũ không bị sửa, quà vẫn lưu bền.
- Rollback khi giao dịch lỗi; giữ receipt, điểm và người chơi.
- Pool xóa tên, đội, nhịp sủa, trạng thái hit/attack, màu bảng tên và shadow của chủ trước; skeleton dispose một lần, không hủy tài nguyên dùng chung.
- Kiểm tra khung preview nhỏ hơn nhưng camera/framing overlay không đổi.
- Phiên browser riêng xác nhận Hổ và Rồng sau đổi đội, tự ra đòn 30 giây; sát thương lần lượt 29 và 67 trên HP 200, đúng một mục tiêu.
- Bản cuối: 227/227 kiểm thử qua, gồm âm lượng chào/quà, nối sủa, camera đồng bộ, quà, phục hồi và chu kỳ tự động. Kết quả tại `test/output/optimization-final-regression.txt`; check cú pháp 42 module và hai HTML qua; đã đóng gói lại.

Sau cập nhật server đã tiếp tục trận 12 và kết nối lại đúng kênh đã lưu. Đối chiếu trước tiếp tục xác nhận 1.452 hồ sơ, model/biến hình, điểm trận, lịch sử, cài đặt và số xu nhận được giữ nguyên; không có lỗi lưu trữ. Bản sao phục hồi nằm trong `runtime/before-optimization-*.json`; bằng chứng tại `test/output/optimization-deploy.json` và ảnh `optimization-deployed.png`.

## Yêu cầu âm thanh bổ sung

Bản audio `2026-11-07.1` tách bus chó/creature khỏi hiệu ứng ăn mừng. Lời chào, bình luận, lời giới thiệu trận giữ nguyên âm lượng sủa; chỉ clip có `presentation.kind === 'gift'` hạ bus tiếng chó xuống mức cũ 28%. Kết thúc/ngắt đọc quà trả về âm lượng đang cấu hình. Giữ nguyên mẫu giọng, playbackRate 1, nối sủa khi spam tim; nhạc nền và fanfare vẫn hạ dưới lời thoại.

## Phần chưa thay

Vẫn gửi snapshot đầy đủ, vẫn ghi đĩa đồng bộ để giữ cơ chế phục hồi quà. Chưa chuyển delta/WAL hoặc giảm chất lượng đồ họa. Hiệu năng OBS/TikTok LIVE Studio phải đánh giá trên chính nguồn đã Refresh và tải LIVE thực.

Bằng chứng: `test/output/optimization-browser-after.json`, `optimization-spam-final.json`, `optimization-300-final.json`, `optimization-paired-benchmark.json`, `optimization-creatures.json`, `optimization-audio-tests.txt`.
