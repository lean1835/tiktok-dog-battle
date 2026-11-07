# Tuất Live — TikTok chó battle 3D

Bản lưu kỷ niệm của **lean1835** · [Một sân chó nhỏ — một kỷ niệm](KY-NIEM.md).

Bản phần mềm local gồm **quản lý + overlay 9:16**, server Node.js đọc tương tác TikTok và điều phối trận 5v5. Đồ họa, model và 20 mẫu gâu/gầm vẫn nhúng trong đúng hai HTML. Server bổ sung để quản lý và OBS cùng một trận dù không dùng chung localStorage.

Đây là **bản ứng viên đang kiểm định**, chưa nghiệm thu một buổi LIVE TikTok thật. Phần kết nối dùng `tiktok-live-connector`, một thư viện cộng đồng.

## Mở phần mềm

Cài Node.js 22 trở lên. Trên Windows, bấm đúp **Chay-Tuat-Live.bat** để khởi động và mở bảng quản lý. Nếu server đã chạy, file chỉ mở màn quản lý, không tạo server trùng. Lần đầu sẽ tự cài thư viện còn thiếu từ package-lock.json; cần mạng khi cài. **Start-Tuat.cmd** vẫn dùng được. Giữ cửa sổ server trong khi LIVE; Ctrl+C để dừng có lưu phiên. Nếu muốn đặt ngoài Desktop, tạo shortcut tới file BAT; giữ file gốc cùng thư mục dự án.

Hoặc chạy trong thư mục dự án:

```sh
npm ci
npm run build
npm start
```

- Quản lý: http://127.0.0.1:4173/
- Overlay: http://127.0.0.1:4173/overlay.html
- Tình trạng máy chủ: http://127.0.0.1:4173/health

Bật LIVE trong TikTok LIVE Studio, nhập @username ở đầu màn quản lý rồi bấm **Kết nối TikTok**. Không cần mật khẩu/cookie TikTok. Trình duyệt cần được cho phép phát âm thanh; bấm nút tiếng một lần ở cửa sổ muốn lấy tiếng. Chỉ một cửa sổ phát tiếng tự động, kể cả OBS dùng profile khác.

## Phát 9:16

**Đang dùng nguồn trình duyệt trong TikTok LIVE Studio:** lấy URL `http://127.0.0.1:4173/overlay.html?studio=1`, đặt nguồn **1080 × 1920**, đầu ra **30 FPS**. Chế độ này giữ Full HD và tránh vẽ thêm pixel do DPI Windows; nguồn Studio sẵn sàng được ưu tiên giữ âm thanh. Bấm **Tắt xem trước để giảm tải** ở quản lý và đóng cửa sổ sân dọc riêng khi dùng nguồn URL. Thu tiếng sân một lần từ chính nguồn trình duyệt. Xem [hướng dẫn giảm tải và chẩn đoán LIVE](docs/LIVE-STUDIO-PERFORMANCE.md).

Muốn lấy riêng cửa sổ sân dọc như bản chùa online: mở **Mo-San-Doc.bat**. File tự dùng server đang chạy hoặc khởi động server, rồi mở Edge/Chrome ở chế độ ứng dụng, cửa sổ dọc không có thanh tab, thanh địa chỉ và thanh dấu trang. Chọn cửa sổ **Tuất Live — Sân dọc 9:16** khi dùng Window Capture. Khi đang chạy server, nút **Mở sân dọc 9:16 ↗** trong quản lý mở đúng cửa sổ native này, dùng lại cửa sổ đã mở; popup trình duyệt chỉ còn là đường dự phòng của demo offline.

**Mo-San-Doc.bat** dùng profile trình duyệt riêng trong `runtime/overlay-browser`, tự lấy hết chiều cao vùng màn hình khả dụng và giữ tỷ lệ sân 9:16. Khóa kéo đổi kích thước cùng nút thu/phóng cửa sổ; chặn Ctrl +/−, Ctrl + cuộn chuột, pinch và F11. Có thể di chuyển/đóng cửa sổ. Mở lại BAT sẽ dùng lại cửa sổ sân của profile này. Chế độ khóa chỉ áp dụng cho sân dọc, không ảnh hưởng trình duyệt thông thường hoặc camera chào/quà/skill trong game. Nhật ký xác nhận kích thước: `runtime/portrait-window.log`.

Cửa sổ native được cấu hình tiếp tục render khi bị cửa sổ khác che và cho phép tự phát âm thanh riêng của sân. Không đổi thiết lập trình duyệt chính. Số đo cục bộ tại `/health` → `presentation`: FPS, tuổi khung hình, độ trễ gói nhận và nguồn âm thanh; dữ liệu tạm thời, không thay đổi điểm/quà. Xem [kiểm tra đồng bộ cửa sổ](docs/REALTIME-WINDOW-FIX.md).

Đồ họa vẫn dựng ở thiết kế 1080 × 1920. Window Capture thu theo số pixel cửa sổ đang hiển thị trên màn hình; muốn xuất đủ nét 1080 × 1920, dùng nguồn trình duyệt trực tiếp với kích thước đó thay vì phóng lớn một cửa sổ nhỏ.

Trong OBS, thêm Browser Source tới `/overlay.html` với kích thước **1080 × 1920**. Sân tự mở tiếng và nhạc nền; bật thu âm nguồn trong mixer OBS. Nếu trình duyệt chặn tự phát, dùng Interact chạm một lần vào sân. Bật/tắt tiếng chung và chỉnh âm lượng tại quản lý. Với TikTok LIVE Studio có thể dùng nguồn trình duyệt nếu bản cài hỗ trợ, hoặc Window Capture cửa sổ overlay cùng âm thanh ứng dụng. Phần mềm không tự bấm bắt đầu phát sóng thay chủ kênh.

## Những phần đã tích hợp

- Vào phòng/bình luận → chào Tuất + tên, tự cân đội, hàng chờ; bình luận trái/phải để chọn đội; gâu để sủa cộng điểm; shiba/husky/pug/becgie/corgi để chọn giống chó.
- Thả tim hoặc bình luận “gâu”/“gau” → đúng tuất sủa. Chó trong trận chỉ cộng điểm, không trừ HP và không đánh/cắn; Hổ/Rồng vừa cộng điểm vừa gây sát thương. Tuất đầy HP gục sau 7 đòn Hổ hoặc 3 đòn Rồng. Hết 2 phút đội nhiều điểm hơn thắng; Tuất Vương tính điểm sủa. Tim/gâu được spam để cộng điểm; mọi tim trong một gói đều tính điểm. Kỹ năng Hổ/Rồng chạy tự động 30 giây/lần, độc lập lượt sủa.
- Bình luận hiện trong bóng chat chữ nhật nhỏ nền trắng, chữ đen trên đầu đúng tuất, kể cả hàng chờ. Tự ẩn sau 4,5 giây, tối đa hai dòng và sáu người cùng lúc. Toàn cảnh giữ đủ sáu chậu cây quanh sân. Sóng vang đồ họa trước miệng chó; Rồng phun lửa đúng mục tiêu; Hổ có vòng gầm và ba vệt cào. Hiệu ứng tự hết hạn và thu hồi tài nguyên.
- Bảng quà có 28 ảnh quà TikTok thật nhúng theo Gift ID: Hoa cổ vũ Đỏ, Kem cổ vũ Xanh (độc lập đội người gửi), Hóa Hổ/Rồng, hồi HP, hồi sinh và Cường hóa. Quà cổ vũ tăng điểm mỗi lượt sủa, không tăng sát thương. Hóa Hổ/Rồng là vĩnh viễn, hiện ngay ở hàng chờ và giữ qua các trận; quà chưa gán hỗ trợ điểm đội người gửi.
- Chỉ tính combo quà khi kết thúc; chống nhận lại cùng mã/combo sau reconnect và khởi động lại, trong cửa sổ lưu 10.000 mã quà gần nhất.
- Server giữ đồng hồ 2 phút đấu / 3 phút nghỉ, chọn 10 người theo hạng LIVE; thiếu hoặc đồng hạng xét xu đóng góp rồi thời gian chờ, chia 5–5 cân người thật và người tặng quà; vinh danh Tuất Vương và lưu chiến tích.
- Máy quay xoay cận quanh sân mỗi 15 giây, kéo dài 8 giây rồi về toàn cảnh. Quà và lời chào giữ góc, tốc độ và đồng bộ giọng đọc cũ, được ưu tiên trước vòng quay. Bỏ zoom theo sủa/kỹ năng tự động và khung chữ điện ảnh. Setting có bật/tắt, mức cận và nút xem thử vòng quay.
- Lưu setting/người chơi/lịch sử xuống `runtime/`; sao lưu nguyên tử; khôi phục và tự tiếp tục trận đang chạy; giữ nguyên nếu quản lý đã chủ động tạm dừng. Quà đến lúc tạm dừng hoặc hàng chờ đầy được giữ lại.
- Giọng đọc Edge Nam Minh/Hoài My, tự dự phòng bằng giọng tiếng Việt Windows khi mạng/dịch vụ lỗi; có thể chọn giọng Windows để không cần mạng. Hàng đợi giới hạn, ưu tiên quà/vinh danh; tiếng gâu/gầm chạy độc lập.
- Tự nối lại WebSocket và TikTok với backoff, heartbeat; báo rõ LIVE kết thúc hoặc lỗi dịch vụ ký.

Bản chạy server **luôn bù bot để đủ 5v5** khi thiếu người. Mỗi bot tự chọn nhịp sủa riêng 2–3 giây/lần; hai bên chọn giống độc lập. Ưu tiên người thật đang hiển thị và chưa đủ 3 phút không tương tác; số view và mã phòng TikTok không giới hạn số người được chọn. Chỉ thiếu 10 người thật mới bù bot. Để diễn tập, có thể thêm người demo rồi mở trận. Có nút nhập setting/người chơi/lịch sử của demo cũ trong cùng trình duyệt khi server còn trống.

## Hướng dẫn, nguồn và kiểm định

- [Cấu hình LIVE, Gift ID, lưu dữ liệu và giới hạn](docs/LIVE-RUNTIME.md)
- [Đọc tên không dấu, sửa cách đọc và danh sách 15 giây](docs/VOICE-GUIDE.md)
- [Nguồn model](docs/ASSET-SOURCES.md), [nguồn tiếng gâu/gầm](docs/BARK-VOICES.md)
- [Các mục cần nghiệm thu để hoàn thành mục tiêu](docs/LIVE-READINESS.md)
- [Mô tả bản hai file offline](docs/TWO-FILE-DEMO.md); [README bản cũ](docs/LEGACY-README.md)

Kế thừa kỹ thuật từ Chánh Điện Tịnh Tâm, Copyright (c) 2026 Kent Juno, MIT; giữ nguyên giấy phép trong `assets/licenses/chanh-dien-MIT.txt`. Không chỉnh sửa dự án gốc.

Bảo trì:

```sh
npm test
npm run build
npm run check
npm run package
```

`release/live-app/` là gói chạy server; `release/two-file-demo/` là đúng hai HTML demo, mở bằng file hoặc `?demo=1` để dùng offline. Không đưa `runtime/`, `.env` hoặc khóa dịch vụ vào gói phân phối.

Bản cập nhật kỹ năng: Hổ/Rồng tự đánh mỗi 30 giây; sủa thường chỉ cộng điểm. Có animation đầu–cổ–miệng và chân trước/sau riêng, nhún mạnh tại chỗ, vòng tròn trắng bám vị trí mõm đo từ mesh của từng giống chó. Lửa hạt có nhiễu chuyển động, lõi sáng, khói và tàn lửa. Tham khảo [ảnh quà thật](docs/TIKTOK-GIFT-ART.md).

Hết ván hiển thị Bảng vàng 10 giây: Tuất Vương, đội thắng, điểm đóng góp và ba người nổi bật. Chỉ vinh danh, không cộng xu hoặc phát thưởng. Reload chỉ hiển thị thời gian còn lại, không bắt đầu lại 10 giây. Cổ vũ mặc định: Rose 5655 cho Đỏ và Kem ốc quế 5827 cho Xanh, cùng giá cấu hình 1 xu, cùng hệ số/trần; tính theo tổng xu cổ vũ để không lệch khi gửi lẻ hay combo.


Cập nhật sủa mạnh ngày 04/11: cả năm GLB có clip chân trước/sau additive tách khỏi đầu/cổ/miệng, không lấy track tịnh tiến thân/gốc. Tăng nhún thân, hất đầu và giữ nhịp từ barkStartedAt để spam không đóng băng frame đầu. Giảm clip chân khi Hổ/Rồng dùng kỹ năng. Thêm bản thu Dog Growl của bonebrah (OpenGameArt, CC0): gầm ngắn và gâu rồi gầm, tổng 20 mẫu nhúng trong hai HTML, giữ tốc độ gốc. Gầm tự động xen kẽ mỗi bốn lượt âm thanh được chấp nhận/người, cách toàn sân ít nhất bốn giây; có nút nghe thử ưu tiên. Không đổi luật điểm/HP. Toàn bộ 106/106 kiểm thử đã đạt; sau chỉnh ưu tiên nghe thử, 14/14 kiểm thử âm thanh tích hợp đạt. Kiểm tra trình duyệt fixture: nút báo “Đang nghe: gầm gừ thật”, model há miệng và nhún chân, không console error; ảnh forceful-bark-paws-growl.png. Các kiểm tra này không xác nhận loa vật lý, OBS hoặc phiên LIVE mới. Thay đổi chỉ ở HTML, không cần restart server chính.


Sửa mõm và tư thế ngày 04/11: bỏ các khối cầu miệng phụ và clip chân Attack làm chó bật lên. Bốn giống thiếu xương hàm riêng dùng hàm dưới tách từ mesh gốc, giữ vật liệu/UV và chiều ngang; giới hạn vùng cắt quanh cằm để không chạm vào bàn chân. Corgi giữ xương Mouth gốc. Clip sủa chỉ quay đầu/cổ/hàm, trọng số 0,35; thân rướn về +Z của model bằng phép shear theo độ cao, mặt phẳng bàn chân giữ nguyên, không tịnh tiến root lên trên. Sóng trắng xuất phát giữa hai môi thật. 107/107 kiểm thử đạt, syntax 36 module + hai HTML đạt. Kiểm tra GPU Studio thật không có console error; bảng so sánh pose cố định dùng để quan sát đủ năm giống, không phải bằng chứng LIVE/OBS. Ảnh bark-forward-jaw-comparison.png. Chỉ cập nhật HTML, không restart server hoặc thay phiên LIVE.

Người mới vào đứng chờ, chưa thuộc xóm nào. Chỉ khi ghép trận mới xếp Đỏ/Xanh; hết trận trở về hàng chờ. Giống chó gắn cố định với ID người xem qua các trận và khi khởi động lại; bình luận tên giống hoặc đổi vị trí không đổi model. Hổ/Rồng vẫn hóa vĩnh viễn qua quà. Setting mẫu giống chỉ áp dụng cho bot chọn ngẫu nhiên; không thay giống người thật. Lượt chuẩn bị giữ đủ 15 giây từ khi giọng đọc thực sự bắt đầu.

Sân cổ vũ giữ mọi tuất đang hiện diện, không thay người cũ ở mốc 24 hay chặn nhận người mới ở mốc 500. Model ở xa được vẽ theo lô từ chính model gốc; khi vào cảnh chào/quà/chat/sủa sẽ dùng model có hoạt ảnh. Tiếng sân mặc định bật mỗi lần mở; trình duyệt có thể yêu cầu chạm để cho phép âm thanh, bản preview vẫn tắt tiếng.

Tuất đứng cổ vũ tự ẩn sau **3 phút không tương tác**; người đã ghép đội được giữ nguyên người, tên và model đến hết trận rồi mới xét ẩn. Tim, bình luận bất kỳ, tặng quà, theo dõi, chia sẻ hoặc vào lại LIVE sẽ khôi phục tuất và đọc lời chào; lần vào lại có mã sự kiện mới được chào ngay, không phải chờ 60 giây. Bảng hạng, số người xem, sủa tự động và phát lại sự kiện cũ không làm mới mốc thời gian. Ẩn khỏi sân vẫn giữ giống chó, hóa thú và chiến tích; không thay người đang đấu bằng “Giữ sân”.

Sân luôn có 10 bot mồi: khi đủ người thật, bot đứng ngoài cổ vũ; khi thiếu người, bot vào bù ô để trận vẫn đúng 5v5. Sau bảng vàng, trong giờ nghỉ và lúc chờ mở trận, cả 10 bot và người thật cùng về hội cổ vũ, để trống sân đấu; chỉ đội hình ghép trận mới vào sân. Bot không có hạn hết hiện diện. Bảng vàng không xóa người hay hồ sơ. Người bị ẩn theo mốc 10 phút cũ nhưng chưa quá 3 phút được hiện lại khi nâng cấp, giữ nguyên mốc tương tác thực tế.

Vinh danh số trận thắng: Top 3 luôn có dưới hướng dẫn; bỏ bảng Top 5 lớn giữa màn hình; Top 10 và tỷ lệ thắng ở màn Chiến tích. Cùng số trận thắng cùng hạng; trong cùng hạng sắp tỷ lệ thắng rồi điểm đóng góp, không xét xu donate.

Hổ tự cào đúng một mục tiêu địch mỗi 30 giây: ba vết cào sáng, phản ứng trúng đòn và số HP mất rõ trên mục tiêu. Tim/gâu phát sủa ưu tiên ngay, gộp spam thành chuỗi tiếng thật liên tiếp; giữ mọi điểm, không tạo hàng đợi âm thanh dài. Quà cổ vũ/hồi phục/hồi sinh/hóa thú/cường hóa có âm báo và đồ họa theo công dụng; hóa thú dùng hiệu ứng biến hình, kỹ năng tấn công vẫn theo hồi chiêu.

Nhạc nền sân xóm được sáng tác bằng mã và nhúng trong hai HTML, bật mặc định ở mức nhẹ; chỉnh bật/tắt và âm lượng trong Setting. Nhạc tự hạ dưới giọng đọc và tiếng tuất, chỉ phát ở nguồn âm thanh được chọn; iframe preview luôn im lặng.

Nút **Reset dữ liệu** ở đầu trang quản lý: mở để xem số hồ sơ/lịch sử sẽ xóa, nhập đúng **RESET** rồi xác nhận. Reset người chơi, hóa thú, điểm, quà đang chờ, trận và chiến tích; giữ Setting, kênh và quy tắc quà. Server tự lưu bản sao đầy đủ thành runtime/before-reset-*.json trước khi xóa; nếu lưu bản sao lỗi thì không reset. Mã chống lặp quà thật được giữ để tránh cộng lại sự kiện cũ. Demo offline tải bản sao trước khi reset.


Tim tốc độ cao: điểm tính đủ mọi tim trong gói; tín hiệu sủa cộng dồn theo từng người, độc lập nhật ký 40 dòng. Một đợt tim được gộp thành nhịp sủa liên tục, không ép một hoạt ảnh/âm thanh riêng cho từng tim. Trộn tối đa 4 tiếng, ưu tiên tuất đang đấu, không cắt vụn tiếng sủa tương tác đang phát. Đám đông xa dùng model batch có phản ứng tiến người nhẹ, tối đa 8 khán giả có rig chi tiết và 10 tuất thi đấu giữ rig đầy đủ. Việc lưu tim miễn phí được gộp trong cửa sổ 40 ms; quà trả phí/lệnh quản lý vẫn ghi ngay và bao gồm mọi tim đang chờ lưu. Thoát server bình thường lưu hết dữ liệu; mất điện đột ngột có thể mất phần tim miễn phí chưa tới lượt ghi trong cửa sổ ngắn đó.


Mặc định server tự ghép đội 15 giây, đấu 2 phút, nghỉ 3 phút rồi ghép lại liên tục, không cần bấm mở trận. Tắt Tự sang trận hoặc chủ động tạm dừng trong quản lý nếu muốn dừng vòng tự động. Bảng tên ngoài sân chỉ còn tên, nền người thật trắng sáng/bot vàng nhạt; bảng tên cỡ vừa cố định, không tự thu nhỏ theo mật độ hàng, dùng texture rõ nét và dấu ba chấm cho tên dài.

Giống chó được khóa theo ID ngay lần nhận đầu tiên, giữ nguyên khi vào/ra trận, chuyển model chi tiết/khán giả và quay lại LIVE. Chỉ quà hóa Hổ/Rồng thay dạng thú. Nhạc nền piano gốc 76 BPM, mặc định 30%, vẫn đủ nghe khi có tiếng sủa và hạ nhẹ khi đọc tên.

Chào mừng: đếm người thật chưa ẩn ở cả sân đấu và hội cổ vũ (không tính bot, không đếm hai lần). Tại lúc giọng chào bắt đầu: tối đa 30 người giữ cảnh cận, từ 31 người dùng bảng xanh dưới đồng hồ + giọng đọc, không quay bù. Quà vẫn quay; kỹ năng Hổ/Rồng định kỳ có cảnh chứa cả người đánh và mục tiêu, nhiều đòn đồng thời dùng chung khung hình.
