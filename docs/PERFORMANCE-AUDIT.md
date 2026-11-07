# Rà soát hiệu năng Tuất Live

## Kết luận

Chưa tối ưu đủ cho phiên đông người hoặc chạy dài. Game đã có instancing, giới hạn rig chi tiết, atlas bảng tên, hạn FPS và điều phối một nguồn âm; nhưng thử tải tái hiện được tăng texture GPU và trễ hoạt ảnh lớn khi spam tim. Chưa áp dụng các thay đổi tối ưu trong báo cáo này. Lỗi thay người đang đấu bằng “Giữ sân” được sửa riêng theo yêu cầu mới của người dùng.

## Phạm vi và điều kiện đo

- Đọc toàn bộ luồng renderer/crowd/model/effect, client/transport, audio/TTS, engine/matchmaking, server/session/store và đóng gói.
- Máy hiện tại: Intel Core i7-1255U, Intel Iris Xe; trình duyệt ANGLE Direct3D11, DPR 1,25.
- Phiên thử riêng tại cổng 4174, dữ liệu tạm; không gửi tương tác giả vào LIVE thật. Đã đóng phiên sau đo.
- Browser test dùng renderer, engine và server thật của dự án, âm thanh tắt để tách tải dựng hình. Chưa đo đồng thời OBS encoder và TTS phát thật. FPS là mẫu cửa sổ ngắn trên máy đang chạy các ứng dụng khác, không phải bảo đảm dung lượng LIVE.
- Phép thử tim đặt mục tiêu 100 gói/giây bằng timer, mỗi gói 3 tim. Khi event loop chậm, timer cũng chậm: không khẳng định server thực sự nhận đủ 100 gói/giây.

## Phát hiện cần ưu tiên

### P1 — Texture GPU tăng qua các lần đổi đội / đổi nhân vật chi tiết

100 người hiện diện: texture từ 110 lên 808 sau 20 lần đổi đội, số người vẫn 100 và chỉ 18 rig chi tiết tối đa (10 đấu + 8 cổ vũ). Geometry ổn định tương đối nhưng texture tăng mạnh. Khi spam tim, đổi người được ưu tiên dựng chi tiết cũng làm texture tiếp tục tăng.

`src/live-renderer-3d.js:102–106` hủy label, ring, mixer và geometry miệng, nhưng không hủy skeleton/bone texture của model clone. Đây là nghi vấn trực tiếp cần sửa và đo lại. `syncSpectators` dòng 151–157 liên tục đổi rig theo người vừa tương tác; mỗi rig mới còn chạy lại tính mesh/miệng trong `src/model-presentation.mjs:24`.

Hướng sửa: giải phóng skeleton thuộc từng clone; giữ tài nguyên model dùng chung; pool rig theo giống; cache kết quả dựng miệng thay vì cắt lại mesh theo mỗi lần xuất hiện. Tiêu chí đạt: qua ít nhất 100 vòng đổi đội/cận cảnh, số texture/geometry quay về mức ổn định.

### P1 — Spam tim bị nghẽn CPU ở cập nhật cảnh và dữ liệu

Ở 100 người hiện / 1.000 hồ sơ, tim dồn làm FPS xuống 2,5–3; update P95 khoảng 90 ms, độ trễ cue P95 1.346 ms. Điểm/tim trong benchmark server vẫn đủ; điều đó không có nghĩa hoạt ảnh realtime đã mượt.

- `server/runtime.cjs:43` structuredClone toàn bộ document cho mỗi gói tim, bao gồm hồ sơ ẩn, lịch sử và 10.000 mã chống trùng. Hoãn ghi đĩa 40 ms không loại được chi phí clone.
- `server/store.cjs:23` ghi/flush/copy/rename đồng bộ, chặn event loop. Không được đổi sang ghi bất cẩn làm mất quà: cần journal/WAL hoặc hàng ghi tuần tự và cơ chế phục hồi.
- `src/live-renderer-3d.js:151–157` chọn lại rig/đám đông, dựng nhân vật và cập nhật atlas khi snapshot đến.

Hướng sửa: gom cập nhật tim theo actor trong một batch ngắn, vẫn cộng đủ điểm và chống trùng; chỉ clone phần thay đổi; tách hồ sơ lưu trữ khỏi trạng thái trận; cập nhật rig theo cue thay vì dựng lại cả cảnh.

### P1/P2 — Preview đang dựng dư gần 10 lần số pixel cần

Đo trực tiếp iframe quản lý: hiển thị khoảng 344 × 620 CSS px, nhưng canvas buffer 1350 × 2400 px. `resize()` lấy kích thước 1080 × 1920 của sân trước CSS scale rồi nhân DPR. Preview 15 FPS vẫn tốn thêm một cảnh WebGL lớn cùng các rig/model.

Hướng sửa: chọn render buffer theo kích thước thực hiển thị cho preview, giới hạn DPR riêng, tạm ngừng preview khi ngoài viewport/tab không cần xem. Giữ overlay xuất 1080 × 1920 độc lập. Không giảm cỡ bảng tên/model để đổi lấy FPS.

### P2 — Snapshot đầy đủ và serialize lặp cho từng cửa sổ

`server/app.cjs:32–33` JSON.stringify cùng snapshot cho từng client; nhịp coalesce 80 ms tương đương tối đa khoảng 12,5 lần/giây. Snapshot 1.000 hồ sơ khoảng 362 KB; 3.000 khoảng 1 MB, dù đa số đã ẩn. Nút thắt là serialize/parse/copy trên CPU, không chỉ băng thông localhost.

Hướng sửa: serialize một lần/broadcast; gửi dữ liệu cần cho overlay, giữ hồ sơ lưu đầy đủ phía server; dùng delta có sequence và full resync khi reconnect.

### P2 — Màn quản lý làm DOM/JSON dư

`src/live-client.js:253–258` dựng bảng mọi hồ sơ, dựng lại nhật ký 30 dòng mỗi lần render, key lịch sử gồm điểm từng người nên dễ dựng lại lịch sử/leaderboard dù tab chiến tích không được mở. Pump 250 ms cộng thêm snapshot đến.

Hướng sửa: phân trang/virtualize danh sách quản lý, bỏ qua tab đang ẩn, cache theo revision tương ứng, chỉ cập nhật dòng thay đổi. Không bỏ người khỏi sân để giảm DOM.

## Phần đã có tối ưu tốt

- Đám đông dùng InstancedMesh; chỉ 8 khán giả được dựng rig chi tiết ngoài 10 người đấu.
- Bảng tên ghép atlas 128 tên/trang, dispose texture khi đổi tầng kích thước.
- Overlay giới hạn 30 FPS, preview 15 FPS; bóng không cập nhật mọi lần render.
- Âm thanh tối đa 4 luồng chó tương tác, hàng đợi có giới hạn và hạn sử dụng; giữ bản thu ở playbackRate 1. Một nguồn phát giữa các cửa sổ, preview im lặng.
- TTS có timeout, hàng đợi và cache giới hạn; chat bubble/effect có thời hạn; transport reconnect/ack có giới hạn.
- Nhật ký sự kiện 40, lịch sử 100, receipt từng nhóm 10.000; quà có chống trùng và lưu bền. Các giới hạn này cần giữ khi tối ưu.

## Số đo browser

| Kịch bản | FPS | CPU frame P95 | Update P95 | Cue latency P95 |
|---|---:|---:|---:|---:|
| 30 hiện / 30 hồ sơ | 20.2 | 39.4 ms | 3.8 ms | 0 ms |
| 100 hiện / 100 hồ sơ | 19.7 | 31.8 ms | 4.6 ms | 0 ms |
| 300 hiện / 300 hồ sơ | 17.3 | 26.3 ms | 12.2 ms | 0 ms |
| 100 hiện / 1.000 hồ sơ | 18.5 | 20.9 ms | 3.6 ms | 0 ms |
| 100 hiện / 1.000 hồ sơ + spam tim | 2.5 | 36.3 ms | 90.4 ms | 1346 ms |

CPU frame không bao gồm toàn bộ chi phí update/event/GC, nên không dùng nó một mình để suy ra FPS. Số đo sau 20 lượt đổi đội có cả chi phí tạo/hủy rig; không gộp vào các dòng steady-state trên.

## Benchmark server

300 gói/kịch bản, 3 tim/gói; đã xác nhận số người hiện đúng như yêu cầu. Document có 10.000 mã chống trùng. Các lượt chạy dùng cùng máy với trình duyệt nên có biến thiên tải nền; không dùng các số này làm cam kết thông lượng.

| Tổng hồ sơ | Người hiện | Lưu | Ingest P95 | Snapshot | Tim đếm |
|---:|---:|---|---:|---:|---:|
| 30 | 30 | không ghi đĩa | 26.9 ms | 43,605 B | 900/900 |
| 100 | 100 | không ghi đĩa | 33.2 ms | 79,825 B | 900/900 |
| 300 | 300 | không ghi đĩa | 40.0 ms | 184,664 B | 900/900 |
| 1000 | 100 | không ghi đĩa | 67.3 ms | 362,145 B | 900/900 |
| 3000 | 300 | không ghi đĩa | 81.3 ms | 1,035,412 B | 900/900 |
| 1000 | 100 | ổ đĩa thật | 42.8 ms | 362,137 B | 900/900 |

## Thứ tự xử lý đề xuất

1. Dọn tài nguyên skeleton và giảm tạo lại rig/miệng khi đổi cận cảnh.
2. Giảm kích thước render preview, giữ chất lượng overlay.
3. Giảm clone theo gói tim, tách hot-state/archive; bảo toàn quà và số điểm.
4. Delta snapshot + cache cập nhật renderer/DOM.
5. Đo lại 30/100/300 người, 1.000+ hồ sơ lưu, spam nhiều người và đổi trận dài hạn; sau đó kiểm chứng trong OBS/LIVE thật.

## Bằng chứng

- `test/output/performance-audit-browser.json`: mẫu DOM số đo GPU/FPS/cue.
- `test/output/performance-audit-server.json`: benchmark transaction/clone/serialize/store và kiểm tra số tim.
- `test/output/performance-audit.png`: ảnh phiên tải riêng.
- `test/output/performance-audit-regression.txt`: baseline 214/215; một assertion âm thanh phụ thuộc độ dài mẫu ngẫu nhiên không phản ánh hold hiện hành. Assertion đã được chuẩn hóa theo cửa sổ 1,2 giây và tối đa một mẫu nguyên vẹn; không đổi âm thanh game. Kết quả đầy đủ sau sửa nằm ở `test/output/round-seat-full-regression.txt`.
