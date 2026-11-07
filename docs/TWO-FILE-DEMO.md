# Tuất Live — hai file demo

Tài liệu này chỉ mô tả mode offline. Bản server nhận TikTok và đồng bộ OBS xem [LIVE-RUNTIME.md](LIVE-RUNTIME.md).

Gói phát chỉ có `index.html` (quản lý, Setting, lịch sử) và `overlay.html` (khung dọc 1080×1920). **Overlay hiện là một sân 3D duy nhất phủ toàn bộ khung hình**, có chó chờ đứng ngoài hàng rào; không còn các card dashboard quanh sân. Đồng hồ nằm trên mái nhà, bên dưới là thanh đỏ–xanh; hướng dẫn và quà/skill là bảng gỗ dựng trong cảnh. CSS, script, Three.js, model 3D và tiếng gâu đều nhúng sẵn. Không cần thư mục asset hay CDN. Mã nguồn/build/test giữ riêng trong workspace.

## Chạy

Trong workspace: `npm start`, mở [quản lý demo](http://127.0.0.1:4173/?demo=1) rồi [overlay demo](http://127.0.0.1:4173/overlay.html?demo=1) trên cùng trình duyệt/profile.

Với gói ZIP giải nén, phục vụ hai file trên cùng một static server. Nếu có Python: `python -m http.server 4173 --bind 127.0.0.1`. Khi phục vụ bằng static server, thêm `?demo=1` cho cả hai màn. Mở trực tiếp bằng file:// có thể hiển thị từng màn, nhưng chia sẻ bộ nhớ phụ thuộc trình duyệt; dùng HTTP để đồng bộ ổn định.

1. Bấm **Thêm 16 người xem demo** hoặc nhập tên và đội từng người.
2. Ghim người cần ưu tiên, bấm **Mở trận đầu**. Mỗi đội chọn 5, số còn lại vào ghế chờ.
3. Chọn người gửi/đội nhận và thử quà, hoặc gửi bình luận `trái`, `phải`, `gâu`.
4. Sân tự mở tiếng và nhạc nền, không có nút âm thanh trên overlay. Nếu trình duyệt chặn tự phát, chạm một lần bất kỳ vào sân. Bật/tắt tiếng và chỉnh âm lượng ở quản lý. Preview luôn tắt tiếng; server chỉ chọn một nguồn phát, ưu tiên overlay sẵn sàng.
5. Setting có trình xem 3D đủ 7 model (5 giống chó, Hổ, Rồng Trung Hoa): chọn model, kéo xoay, cuộn để zoom và thử đứng/đi/sủa/gục. Chọn model cho từng vị trí của đội trái/phải rồi lưu; đội hình áp dụng khi mở trận mới. Có thanh chỉnh tỷ lệ nhân vật. Các cài đặt tên xóm, thời gian, HP/điểm sủa, hệ số xu, trần hỗ trợ, âm lượng và giá quà demo vẫn giữ.

## Luật

- Mặc định **2 phút đấu → 3 phút nghỉ → tự bốc đội mới**. Không kết thúc sớm mặc định; có tùy chọn kết thúc khi một đội gục hết.
- Ưu tiên **ghim → tặng quà → chờ lâu theo từng phút**. Cùng mức được xáo ngẫu nhiên. Xu ưu tiên được xóa khi đã dùng để lên sàn; xu tổng và chiến tích vẫn giữ.
- Bot có nhãn rõ bù chỗ thiếu, có thể tắt trong Setting để đợi đủ 5 người mỗi đội.
- Chào `Tuất + tên`; chọn đội bằng trái/phải trước khi lên sàn. Tim hoặc gâu kích hoạt sủa, không cooldown cộng điểm. Chó chỉ sủa cộng điểm, không đánh/cắn hay trừ HP địch.
- Hoa → cổ vũ Đỏ, Kem → cổ vũ Xanh, bất kể đội người gửi. Cộng điểm mỗi lượt theo xu × hệ số, có trần và reset mỗi trận; không tăng sát thương.
- Hổ/Rồng có kỹ năng tự động mỗi 30 giây, độc lập spam tim/gâu: vừa cộng điểm vừa trừ HP địch. Tuất đầy HP chịu 7 đòn Hổ hoặc 3 đòn Rồng sẽ gục nếu không được hồi máu. Điểm thưởng mỗi lượt: Hổ +12, Rồng +24.
- Hồi HP cho tuất yếu nhất; hồi sinh theo % HP. Cường hóa tăng điểm kỹ năng kế tiếp, không vượt hồi chiêu hoặc gây thêm đòn. Hóa thú áp dụng đúng người tặng; hóa vĩnh viễn ngay ở hàng chờ và qua mọi trận. Đội hình không thể mở thú miễn phí qua Setting.
- Thanh thắng trên mái = điểm Đỏ / tổng điểm; chưa có điểm thì 50/50. Hết 2 phút so điểm, bằng điểm hòa. Tuất Vương chọn người ghi điểm cao nhất bên thắng, ưu tiên người thật trước bot; không cộng điểm từ giá quà/hồi máu.
- Bảng quà có ảnh TikTok thật theo Gift ID, chia cổ vũ hai bên và nâng cấp/tiếp sức. Chó có sóng vang đồ họa; Rồng có lửa sang đúng mục tiêu; Hổ có vòng gầm và vệt cào. Hiệu ứng tự thu hồi, tiếng giữ nguyên.
- Lưu tối đa 100 trận và thống kê thắng/sát thương/hạ gục/xu trong trình duyệt; tải lại không xóa. Có nút xuất JSON chiến tích/bản sao.

## Đồng bộ và phát demo

Đây là **demo local, chưa nhận người vào hoặc quà tặng TikTok LIVE thật**. Hai file đồng bộ bằng localStorage/BroadcastChannel khi cùng origin và profile. Quản lý ưu tiên chạy đồng hồ; overlay tiếp quản khi quản lý đóng.

OBS Browser Source có bộ nhớ riêng, không tự đọc được Setting từ Chrome/Edge. Trong demo này, dùng **Window Capture cửa sổ overlay**, đặt canvas dọc 1080×1920 trong OBS/TikTok LIVE Studio. Gói hai file chưa có server WebSocket để đồng bộ Chrome → OBS Browser Source. Giới hạn này được ghi ngay trong Setting.

## Rồng và tiếng gâu

Overlay dùng Three.js/WebGL2 với camera góc chéo, phố xóm Tạp Hóa/Hẻm 86/Cà Phê, cây, ghế, bóng đổ thật. Model Shiba/Husky/Pug/Becgie từ Quaternius, Corgi/Hổ từ Gobkit, CC0; mỗi nhân vật clone skeleton riêng và dùng animation gốc để đứng/sủa/gục/hồi sinh. Sân dùng góc máy cố định để đồng hồ và các bảng trong cảnh luôn đọc được. Phần xoay/zoom nằm trong trình xem model của Setting. Tối đa 24 người chờ xuất hiện thành model chó đứng ngoài sân; danh sách đầy đủ và ưu tiên vẫn lưu trong quản lý. Khi nghỉ, các tuất đang đấu rời sân để đứng chờ, tránh xuất hiện trùng hai chỗ. Rồng mini Trung Hoa được dựng riêng bằng geometry 3D: thân dài cuộn, bụng vàng, sừng nhánh, râu, bờm, bốn chân nhỏ và không cánh; không dùng lại rồng phương Tây.

Sáu GLB được gzip/base64 vào overlay rồi giải nén trực tiếp trong trình duyệt; không fetch model ngoài. Dùng Chrome/Edge hiện đại có WebGL2 và DecompressionStream. Three.js MIT license được nhúng đầy đủ trong HTML; nguồn model: [Quaternius Animals](https://quaternius.com/packs/ultimateanimatedanimals.html), [Zombie Apocalypse Kit](https://quaternius.com/packs/zombieapocalypsekit.html), [Gobkit](https://gobkit.com/freebies). Nguồn/hash chi tiết vẫn giữ ở `assets/manifest.json` trong workspace.

Hiện có **6 giọng thật / 15 mẫu gâu** ở playbackRate=1. Mỗi tuất giữ một giọng theo ID, các mẫu trong giọng tự luân phiên, hai phía phát lệch nhịp nhẹ để nghe được cả hai đội. Không dùng lại các mẫu gây tiếng bụp trước đây, không oscillator hay giảm pitch. Trong Setting có sáu nút nghe thử từng giọng. Nguồn CC0, điểm cắt, chuẩn hóa âm lượng và giới hạn chồng tiếng được ghi ở [BARK-VOICES.md](BARK-VOICES.md). Có thêm một bản thu hổ thật, hai hiệu ứng rồng và hai mẫu gầm gừ chó; Setting có nút nghe riêng và khung model phát đúng tiếng đang chọn. Tất cả 20 mẫu âm thanh vẫn nhúng trong đúng hai HTML. Sủa mạnh mở hàm theo hình mõm gốc, rướn thân về phía trước, giữ mặt phẳng đặt chân và không nhảy lên; spam không giữ thân ở frame đầu.

## Bảo trì

`npm run build` sinh hai HTML tại root và `release/two-file-demo/`. `npm test` kiểm tra luật mới và các asset cũ giữ lại; `npm run check` kiểm tra cú pháp. `python test/live-immersive-e2e.py` dùng Chrome/Playwright, server đang chạy. Báo cáo: `test/output/immersive-qa-report.json`.

Bridge demo cùng trang:

```js
DogBattleDemo.send('join', {userId:'viewer-1', name:'Minh', team:'left'});
DogBattleDemo.send('comment', {userId:'viewer-1', text:'gâu'});
DogBattleDemo.send('gift', {userId:'viewer-1', name:'Minh', team:'left', gift:'dragon', count:1});
DogBattleDemo.getState();
```

Team `left/right`; gift `rose/cake/heal/revive/tiger/dragon/execute`. Dùng ID người xem ổn định tránh trùng ghế. Bridge ở trong trang, không phải endpoint public và không chứa thông tin đăng nhập TikTok.

## Khôi phục âm thanh

Tiếng sân và nhạc nền tự phát ở overlay; nếu chỉ mở quản lý, màn quản lý phát thay. Nút ở quản lý bật/tắt tiếng chung. Âm lượng sân, nhạc nền và lựa chọn bật nhạc nằm trong Setting. Chó/Hổ/Rồng phát tiếng theo sự kiện sủa, kỹ năng và biến hình.

Lựa chọn bật/tắt lưu riêng trong localStorage. Một lease chọn cửa sổ phát tiếng để tránh vọng nếu mở nhiều tab. Đóng cửa sổ phát hoặc lease hết hạn thì cửa sổ có AudioContext đang chạy tiếp quản. Tắt tiếng dừng các nguồn đang phát và hủy yêu cầu phát đang chờ giải mã. Trình duyệt cần cho phép phát âm thanh; code không thể tự bỏ qua chính sách autoplay hoặc bật loa/tab đã bị tắt ở hệ điều hành/trình duyệt.

Kiểm tra hồi quy dùng AudioContext giả lập và DOM tối giản chạy engine/client thật: tải lại, chặn autoplay, bấm khôi phục, mute khi đang chờ, nhiều cửa sổ, phát ở màn quản lý, đúng tiếng Hổ/Rồng và preview luôn im lặng. Những kiểm tra này không xác nhận âm thanh tại loa vật lý.

Hết ván hiển thị Bảng vàng 10 giây: Tuất Vương, đội thắng, điểm đóng góp và ba người nổi bật. Chỉ vinh danh, không cộng xu hoặc phát thưởng. Reload chỉ hiển thị thời gian còn lại, không bắt đầu lại 10 giây. Cổ vũ mặc định: Rose 5655 cho Đỏ và Kem ốc quế 5827 cho Xanh, cùng giá cấu hình 1 xu, cùng hệ số/trần; tính theo tổng xu cổ vũ để không lệch khi gửi lẻ hay combo.


Bảng quà trong sân: ba nhóm cổ vũ Đỏ/Xanh, hóa thú vĩnh viễn và hồi phục/tiếp sức. Tên quà TikTok tách riêng khỏi kỹ năng; ảnh và giá của quà đầu tiên trong quy tắc hiển thị cùng nhau, giá trong ô màu tương phản. Các quà khác đã gán vẫn hoạt động. Hai hàng cổ vũ dùng cùng kích thước, chỉ phân biệt màu và tên đội. Chữ giữ tỷ lệ, dùng dấu ba chấm nếu quá dài; không ép ngang chữ. Bảng không chịu tone mapping ánh sáng để giữ tương phản. Giá cấu hình chưa quan sát vẫn có dấu *; kỹ năng chưa gán vẫn ghi rõ, không dùng ảnh/giá giả. Không đổi cơ chế quà hay cân bằng điểm.


Sau ghép đội có danh sách hai bên 15 giây rồi mới bắt đầu đủ 2 phút thi đấu. Trạng thái chuẩn bị giữ khi tạm dừng/reload. Bộ sửa cách đọc tên và giọng Windows thuộc bản chạy server; xem VOICE-GUIDE.md.


Mặc định server tự ghép đội 15 giây, đấu 2 phút, nghỉ 3 phút rồi ghép lại liên tục, không cần bấm mở trận. Tắt Tự sang trận hoặc chủ động tạm dừng trong quản lý nếu muốn dừng vòng tự động. Bảng tên ngoài sân chỉ còn tên, nền người thật trắng sáng/bot vàng nhạt; bảng tên cỡ vừa cố định, không tự thu nhỏ theo mật độ hàng, dùng texture rõ nét và dấu ba chấm cho tên dài.

Giống chó được khóa theo ID ngay lần nhận đầu tiên, giữ nguyên khi vào/ra trận, chuyển model chi tiết/khán giả và quay lại LIVE. Chỉ quà hóa Hổ/Rồng thay dạng thú. Nhạc nền piano gốc 76 BPM, mặc định 30%, vẫn đủ nghe khi có tiếng sủa và hạ nhẹ khi đọc tên.
