# Sáu giọng chó thật / 15 mẫu gâu

## Âm thanh Bảng vàng

`assets/audio/celebration/tuat-vuong.wav` là đoạn nhạc chúc mừng và vỗ tay tổng hợp gốc cho dự án, dài 3,3 giây, mono PCM 32 kHz/16-bit; không lấy bản thu bên ngoài. SHA256 và nguồn trong manifest cùng thư mục. Đoạn này được nhúng riêng vào hai HTML, không tính vào 20 mẫu chó/Hổ/Rồng. Nhạc phát một lần khi kết thúc ván tại cửa sổ phát tiếng, giảm âm dưới giọng vinh danh và dừng khi tắt tiếng. Nạp lại bảng đang hiện không phát lại nhạc.

Mỗi tuất nhận một giọng cố định theo ID. Trong cùng giọng, game chọn các mẫu khác nhau và tránh lặp ngay mẫu vừa phát. Không dùng oscillator và không thay đổi playbackRate để giả giọng. Hai đòn sủa cùng lượt có thể phát cách nhau 170 ms, pan nhẹ theo đội, tối đa ba nguồn cùng lúc và có compressor bảo vệ tổng âm lượng.

| Giọng trong Setting | Tác giả / bản thu | Mẫu |
|---|---|---|
| Gâu gọn | [kwahmah_02 — Single Dog Bark](https://freesound.org/people/kwahmah_02/sounds/277058/) | Gâu đơn + nhịp đôi từ bản thu thật |
| Chó nhỏ Shih Tzu | [Glitchedtones — Dog Shih Tzu Bark Single 02](https://freesound.org/people/Glitchedtones/sounds/372523/) | Gâu đơn + nhịp đôi từ bản thu thật |
| Chó chăn cừu | [Vrymaa — Dog - Bark 1](https://freesound.org/people/Vrymaa/sounds/737885/) | Ba đoạn khác nhau |
| Gâu nhanh | [16FVolejnikovaA — Dog barks](https://freesound.org/people/16FVolejnikovaA/sounds/498394/) | Ba đoạn khác nhau |
| Gâu cao | [ivolipa — Smal_Dog_Barking.wav](https://freesound.org/people/ivolipa/sounds/332457/) | Ba đoạn khác nhau |
| Gâu dài | [fennelliott — dog bark.wav](https://freesound.org/people/fennelliott/sounds/347364/) | Hai đoạn khác nhau |

Các bản thu đều được trang tác giả ghi **CC0-1.0** khi đối chiếu. Bằng chứng giấy phép lưu trong `assets/licenses/`; nguồn tải, điểm cắt, thời lượng và SHA256 trong `assets/audio/bark-bank/manifest.json` cùng các `*-source.json`.

Xử lý: mono PCM 32 kHz/16-bit, bỏ DC, cân bằng RMS phần có tiếng sủa với trần peak khoảng −3 dBFS, fade 5 ms và khoảng trống ngắn đầu/cuối. Hai mẫu nhịp đôi được ghép từ cùng tiếng gâu thật với khoảng nghỉ 120 ms; không phải bản thu thêm một con chó khác. Giữ tốc độ gốc.

Setting → **Giọng chó sủa** có sáu nút nghe thử. Nút **Nghe giọng kế tiếp** lần lượt thử các giọng. File `six-voices-preview.wav` là bản nghe liên tiếp sáu giọng, chỉ để tham khảo; gói game vẫn đúng hai HTML, các mẫu đã được nhúng sẵn.

`python scripts/prepare-bark-bank.py` dựng lại WAV từ bản thu nguồn đã lưu. `npm run build` nhúng bộ tiếng vào hai HTML. `npm test` kiểm tra định dạng/tín hiệu/hash, giữ giọng theo ID, không lặp mẫu, nhịp phát đôi và giới hạn chồng âm. Các bài kiểm tra điều phối dùng AudioContext giả lập; không thay cho kiểm tra thiết bị loa thật.

## Tiếng Hổ / Rồng

Khi nhận quà hóa Hổ/Rồng, overlay phát ngay tiếng tương ứng; những đòn tiếp theo cũng dùng đúng dạng nhân vật. Model Hổ/Rồng chọn từ đội hình trong Setting có cùng cơ chế. Nút **Sủa / Ra đòn** trong khung model nghe đúng tiếng của model đang chọn. Setting có hai nút nghe riêng cho Hổ/Rồng.

| Loại | Nguồn | Mẫu |
|---|---|---|
| Hổ gầm — bản thu thật tại Louisville Zoo | [lauramellis — Tiger Roar](https://freesound.org/people/lauramellis/sounds/263115/) | Một đoạn tiếng hổ, tốc độ gốc |
| Rồng — hiệu ứng thiết kế | [JoelAudio — DRAGON_ROAR.wav](https://freesound.org/people/JoelAudio/sounds/85568/) | Một tiếng rồng ngắn |
| Rồng — hiệu ứng thiết kế từ giọng người | [qubodup — Dragon roar](https://freesound.org/people/qubodup/sounds/442964/) | Một tiếng rồng dài; giữ nguyên thiết kế âm gốc |

Các trang nguồn hiển thị CC0-1.0; giữ đầy đủ credit tác giả trong manifest và hai HTML. Rồng là sinh vật tưởng tượng nên dùng hiệu ứng thiết kế, không mô tả là bản thu động vật thật. Tệp nguồn, điểm cắt, SHA256: `assets/audio/creature-bank/manifest.json`; bằng chứng giấy phép: `assets/licenses/creature-*.html`.

Chạy `python scripts/prepare-creature-bank.py` để dựng lại ba WAV: mono 32 kHz/16-bit, cân bằng RMS, peak tối đa khoảng −3 dBFS, fade 20 ms. Trong game không đổi playbackRate. Tiếng gầm được giảm gain nhẹ; mỗi nhân vật chờ hết tiếng trước khi gầm tiếp. Nếu đủ ba nguồn, tiếng gầm được ưu tiên thay một nguồn chó. Rồng luân phiên hai mẫu, không lặp ngay. `assets/audio/creature-bank/tiger-dragon-preview.wav` là bản nghe lần lượt Hổ → Rồng ngắn → Rồng dài.

## Gầm gừ chó và chuyển động sủa mạnh

[bonebrah — Dog Growl](https://opengameart.org/content/dog-growl) là bản thu chó thật, trang nguồn ghi CC0. Bằng chứng lưu tại `assets/licenses/dog-growl-bonebrah.html`, nguồn OGG và manifest có SHA256 tại `assets/audio/growl-bank/`. `python scripts/prepare-growls.py` tạo hai mẫu: gầm ngắn và gâu rõ rồi gầm. Chuyển mono PCM 32 kHz/16-bit, bỏ DC, cân RMS với trần peak 0,67, fade 10 ms; giữ tốc độ và cao độ gốc. Tổng hiện tại **15 mẫu gâu + 3 mẫu Hổ/Rồng + 2 mẫu gầm gừ = 20**.

Mỗi bốn lượt sủa chó được bộ phát chấp nhận cho cùng người, có thể thay bằng gâu rồi gầm; hai lần gầm tự động cách nhau ít nhất bốn giây trên toàn bộ sân. Không đổi điểm hoặc sát thương. Giữ giới hạn ba nguồn, mute và giảm âm khi có giọng đọc. Setting có nút **Nghe gầm gừ thật**; nghe thử được ưu tiên một vị trí phát nếu sân đang kín ba nguồn.

Năm giống chó dùng clip quay đầu/cổ/miệng additive ở trọng số 0,35, không dùng track tịnh tiến/co giãn hoặc clip chân tấn công. Thân rướn dọc hướng mõm bằng biến đổi giữ nguyên mặt phẳng đặt chân; không thêm lực nhảy lên. Bốn model không có xương hàm riêng được tách hàm dưới từ mesh gốc, giữ UV/màu, xoay quanh bản lề ở khóe miệng. Lớp lót miệng nằm trong đường viền môi, thay cho các khối cầu che lên mõm cũ. Corgi giữ xương Mouth gốc. Sóng trắng bám điểm giữa hai môi. Spam chỉ khởi động lại animation sau ít nhất 350 ms, nhịp rướn tính từ thời điểm bắt đầu thực.


Bản âm thanh 2026-11-06.4: chỉ bỏ im lặng dài trong các bản thu chó, giữ nguyên mọi mẫu âm nghe được và playbackRate=1; cùng bộ xử lý cho sủa tự động, tim và chat gâu. Dùng một nhịp giữ liên tục cho cả hoạt ảnh và âm thanh, thích ứng gói tim gửi dồn; không sủa tự động chồng/ngắt luồng tim. Khi đông người, các lượt phát nhường nhau tại cuối tiếng gâu. Mọi lệnh dừng đi qua bộ kiểm tra thời gian hữu hạn. Xem test/output/native-bark-continuity-proof.json để kiểm tra PCM offline bằng native Rust Web Audio; đây không phải xác nhận OBS/LIVE. Phiên cũ trong trình duyệt cần được tải lại, cả quản lý lẫn overlay nếu cùng mở.
