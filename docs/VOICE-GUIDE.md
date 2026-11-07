# Đọc tên và lồng tiếng

Mở **Tùy chọn LIVE & giọng đọc** trong quản lý. Máy hiện dùng tiếng Việt Windows, không cần mạng để tạo giọng. Chọn **Tên người xem** ở ô nghe thử để thử đúng cách xử lý tên; chọn **Câu đầy đủ** để thử câu thông báo.

## Tên không dấu và liền chữ

Bộ chuẩn bị lời đọc tự tách họ/tên Việt thông dụng, bổ sung dấu và xử lý chữ cách điệu. Ví dụ: `nguyenvanan` → Nguyễn Văn An; `minhngoc` → Minh Ngọc; `tuanbui` → Tuấn Bùi. Tên đã có dấu như Nguyễn Văn Tuân được giữ đúng dấu. Chữ số trong tên được đọc từng số; số xu và thời gian được đọc thành số tiếng Việt. HP, skill, 30s và tên quà có từ tiếng Việt tương ứng.

Tên không dấu có thể có nhiều cách hiểu: Thuy có thể là Thủy/Thúy/Thùy; Thanh có thể là Thanh/Thành/Thạnh. Đây là bộ quy tắc theo tên thông dụng, không bảo đảm đoán đúng mọi tên riêng. Với trường hợp đó, nhập **Sửa cách đọc tên riêng**, mỗi dòng `từ = cách đọc`, rồi **Lưu tùy chọn LIVE**. Ví dụ `thuy = Thúy`. Nhập lại tên ở ô nghe thử để kiểm tra. Tối đa 80 dòng; từ tối đa 64 ký tự, cách đọc tối đa 96 ký tự. Quy tắc dài hơn được ưu tiên, không dùng biểu thức chính quy và không thay thế dây chuyền.

Quy tắc chỉ tác động âm đọc, không sửa tên hiển thị, User ID, Gift ID, luật quà hoặc xu. Tên nước ngoài/từ chưa nhận ra không tự được gán dấu tùy ý; có thể thêm cách đọc riêng.

## Rà soát phần có tiếng

| Tình huống | Lời đọc / âm thanh |
|---|---|
| Người vào, kể cả tên đã lưu | 12 kiểu chào ngẫu nhiên kèm Tuất + tên đã chuẩn bị; dùng hết lượt rồi xáo lại, tránh lặp liên tiếp; chống lặp 60 giây/người/phòng |
| Quà / combo đã chốt | Cảm ơn tên người gửi, số lượng, tên quà Việt và hiệu quả thực tế |
| Hóa Hổ/Rồng | Nói hóa vĩnh viễn và hồi kỹ năng 30 giây; có tiếng thú |
| Hồi máu / hồi sinh | Đọc hiệu quả; đầy máu hoặc chưa có tuất gục thì nói đúng tình trạng |
| Cổ vũ / cường hóa | Đọc tăng điểm/cường hóa theo kết quả xử lý |
| Theo dõi / chia sẻ | Cảm ơn người gửi; chống lặp 30 giây/người/phòng/loại |
| Ghép đội | Thông báo đã ghép, 15 giây chuẩn bị |
| Mở trận | Thông báo bắt đầu, hướng dẫn tim/gâu |
| Tạm dừng / tiếp tục | Thông báo trạng thái trận |
| Kết thúc theo đồng hồ hoặc nút quản lý | Đọc “Vinh danh Tuất Vương + tên” trước, rồi đội thắng/hòa; chỉ vinh danh |
| Tim / gâu / kỹ năng tự động | Tiếng gâu/gầm/lửa và hoạt ảnh tương ứng, không xếp một câu đọc cho từng lượt spam |

Cảm ơn quà và thông báo trận có ưu tiên hơn lời chào. Tùy chọn đọc chào, quà, trận, vinh danh, theo dõi/chia sẻ có thể bật/tắt riêng. Nút nghe thử tự chọn đầu ra âm thanh; trạng thái Đang đọc/Đã đọc hiển thị câu thực sự gửi tới giọng.

Nếu trình duyệt chặn tự phát tiếng, thao tác **+ Chào tuất** hoặc thử quà sẽ mở lại âm thanh trước khi gửi sự kiện, khi tiếng đang được bật theo cấu hình và chưa có cửa sổ khác được chọn phát. Nút tắt tiếng chủ động vẫn được giữ. Sau khi cập nhật hai HTML, tải lại cả quản lý và nguồn overlay; trang đã mở từ bản cũ vẫn giữ JavaScript cũ dù server đã khởi động lại.

## Khớp hình và giọng

### Cảm ơn quà

Bản sửa ngày 05/11: khi đã bật đọc, tuyệt đối không lấy sự kiện nhận quà/người vào làm mốc quay sớm, kể cả nguồn tiếng cũ chưa báo đồng bộ. Máy chủ tự ưu tiên nguồn phát hỗ trợ đồng bộ mới nhất; nguồn cũ không thể giành lại quyền khi nguồn mới đang sẵn sàng. Nút thử quà/chào tại quản lý có thể mở nguồn mới khi nguồn đang được chọn còn cũ. Người dùng cần bật tiếng tại ít nhất một trang đã tải bản mới.

Camera lấy mốc tiếng bắt đầu có tín hiệu trong AudioBuffer, bỏ qua khoảng lặng đầu file (không cắt hoặc thay giọng). Kiểm thử gồm khoảng lặng 130 ms, hủy trước âm tiết đầu và chống nguồn cũ giành quyền; tổng 144 kiểm thử đạt. Fixture Windows thật thêm 600 ms im lặng và trì hoãn tạo tiếng: tín hiệu bắt đầu gửi khoảng 0,77 giây sau khi file sẵn sàng, gồm khoảng lặng thêm và khoảng lặng Windows gốc; không chạy camera ngay khi mở buffer. Dữ liệu `test/output/simultaneous-real-proof.json`. Thử local không thay cho nghiệm thu LIVE/OBS và độ trễ thiết bị âm thanh.

Quà được cộng xu, áp dụng nâng cấp/hồi HP/cổ vũ ngay sau khi xác nhận như trước. Riêng cảnh cảm ơn và thông báo quà đủ mức đọc sẽ chờ đúng âm thanh tương ứng bắt đầu, bám người gửi và giữ đến hết câu. Không chiếu trước cảnh rồi mới đọc sau. Các đòn Hổ/Rồng tự động vẫn hiện ngay theo đòn thực tế. Quà dưới mức xu đọc hoặc khi tắt đọc quà giữ cảnh không lồng tiếng.

Cảm ơn quà ưu tiên ngắt lời chào cả ở bước tạo tiếng và phát tiếng, bỏ kết quả chào cũ trả về muộn. Các lời cảm ơn quà vẫn tuần tự, không cắt nhau. Vinh danh vẫn có ưu tiên cao nhất và giữ lại lời cảm ơn quà bị ngắt. Nguồn âm thanh phiên bản 2 báo hỗ trợ đồng bộ cảnh quà riêng; nguồn chỉ biết đồng bộ chào không khiến cảnh quà bị chờ vô hạn.

142/142 kiểm thử đạt. Kiểm tra Windows thật với 1,8 giây trì hoãn tạo tiếng có chủ đích trên fixture: camera “CẢM ƠN QUÀ TẶNG / Tuất An / Hóa Rồng” và thông báo cảm ơn theo mốc phát; ảnh `test/output/gift-narration-synced.png`, dữ liệu `gift-sync-real-proof.json`. Đây là kiểm tra local, không thay nghiệm thu LIVE TikTok/OBS.

### Lời chào

Thông báo nổi “Tuất … đến rồi!” cũng dùng đúng lượt âm thanh, không lấy ngay sự kiện người vào khi nguồn tiếng đã hỗ trợ đồng bộ. Trong lúc đang tạo tiếng hoặc chờ câu trước, thông báo chào mới được giữ lại. Khi đọc An dù Bình đã vào sau, bảng vẫn hiện An; đến lượt Bình mới chuyển tên. Thông báo ẩn khi đọc xong/bị ngắt, không hiện lại thông báo vào phòng cũ. Người chơi vẫn được ghi nhận và vào hàng chờ ngay; chỉ phần trình diễn chào đợi tiếng. 19 kiểm thử âm thanh/camera liên quan đạt, gồm đồng hồ lệch năm phút và hai lời chào xếp hàng. Thử nghiệm UI với giọng Windows bị gián đoạn do công cụ trình duyệt hết thời gian, chưa xác nhận trực tiếp phần thông báo mới trong lượt sửa này.

Bản sửa tiếp: nguồn tiếng báo khả năng đồng bộ trong bắt tay kết nối. Overlay luôn chờ tín hiệu phát khi đã bật đọc; nguồn cũ không được làm cảnh chào quay sớm khi đã bật đọc. Khi nhận mốc phát từ server, client đổi sang đồng hồ trình duyệt trước khi tính thời lượng còn lại; callback phát tại máy dùng giờ local trực tiếp. Kiểm thử lệch đồng hồ năm phút xác nhận cả cửa sổ phát tiếng và preview nhận đúng mốc local. Gửi tín hiệu về server trước khi mở góc local, bắt và ghi lỗi camera riêng để không mất tín hiệu đồng bộ. Đã kiểm tra cận cảnh Tuất Nguyễn Ngọc An trên chính server cổng 4173, không console error; ảnh `test/output/welcome-camera-restored-production.png`. Hai tab IAB hiện tại đã nạp lại; nguồn OBS/Studio đang giữ HTML cũ cần Refresh.

Khi bật đọc chào, cảnh chào chờ âm thanh thực sự bắt đầu phát sau khi tạo tiếng, tải, giải mã và đến lượt đọc. Cửa sổ phát tiếng báo đúng ID câu và thời lượng về máy chủ; các overlay, kể cả preview tắt tiếng, nhận cùng mốc và hướng tới người đang được chào. Không dùng độ trễ cố định. Cảnh giữ đến hết câu, chuyển về toàn cảnh trong 850 ms; tắt tiếng, ngắt lời hoặc đổi đầu ra sẽ kết thúc cảnh tương ứng. Những câu bị bỏ khỏi hàng đợi không kéo máy quay tới người chưa được đọc. Câu tiếp theo có thể chuyển ngay sang đúng người; cảnh kỹ năng/sủa không cắt ngang một câu chào đang phát. Tắt đọc chào vẫn cho phép cảnh vào xóm theo sự kiện như trước; tùy chọn tắt zoom, giảm chuyển động và màn chuẩn bị được giữ.

137/137 kiểm thử đạt cho bản đồng bộ, bao gồm thứ tự hai tên khi chờ tạo tiếng, nguồn phát được chọn, chống giả mốc/giả mục tiêu, chống phát lại khi reload và dừng giữa câu. Kiểm tra local bằng giọng Windows và overlay GPU: tên Minh Ngọc, Nguyễn Văn An và Hải Đăng có tín hiệu bắt đầu/kết thúc từ nguồn âm thanh; ảnh `test/output/welcome-camera-synced.png`, dữ liệu `welcome-camera-real-proof.json`. Không thay cho nghiệm thu LIVE/OBS.

## Danh sách ghép trận

Mỗi lần ghép đội chọn cố định năm người mỗi bên theo ưu tiên hiện có. Danh sách hiện 15 giây; người được chọn không đổi đội hoặc rời danh sách trong lúc chuẩn bị. Tim/gâu chưa cộng điểm hoặc gây sát thương. Quà nâng cấp/cổ vũ vẫn được nhận. Sau chuẩn bị mới bắt đầu đủ 300 giây đấu; kỹ năng Hổ/Rồng có 30 giây hồi từ lúc bắt đầu đấu. Tạm dừng, reload và restart giữ thời gian chuẩn bị còn lại. Hết trận vẫn nghỉ 120 giây và Bảng vàng vinh danh 10 giây.

## Bằng chứng kiểm tra

Bảng vàng hiện 10 giây kèm pháo giấy, vòng sáng vàng và vương miện phát sáng. Cả trận hòa vẫn đọc tên Tuất Vương. Lời vinh danh được ưu tiên ngay, ngắt lời chào đang đọc; lời cảm ơn quà đang chờ được giữ lại. Nhạc chúc mừng và tiếng vỗ tay tổng hợp dài 3,3 giây tự hạ nhỏ khi đọc tên, tuân theo nút tắt tiếng và chỉ phát tại đầu ra âm thanh được chọn. Reload trong lúc bảng còn hiện không phát lại nhạc. Không có phần thưởng hoặc cộng xu.

129/129 kiểm thử đạt cho bản lễ vinh danh. Kiểm tra trình duyệt local báo “Đã đọc: Vinh danh Tuất Vương Nguyễn Văn An! XÓM ĐỎ chiến thắng!”, không console error; bảng và hiệu ứng tự ẩn. Giọng Windows thật tạo tiếng sau 1,283 giây, câu dài khoảng 3,68 giây. Bằng chứng: `test/output/honor-actual-voice.json`, `honor-actual-voice.wav`, `honor-celebration.png`. Đây là kiểm tra local, chưa thay cho nghiệm thu LIVE/OBS.

124 kiểm thử đạt; kiểm tra cú pháp 38 module và hai HTML đạt. Fixture đồng hồ thật ghi 15,015 và 15,125 giây chuẩn bị, cùng danh sách, sau đó còn đủ 300 giây và điểm 0–0: `test/output/prepare-15s-real-proof.json`. Giọng Windows thực đã tạo mẫu bốn giây đọc ba tên không dấu: `smart-names-real-proof.json`, `smart-vietnamese-names.wav`. Trình duyệt báo Đã đọc Nguyễn Văn An và Thúy theo quy tắc thử, không console error. Đây là kiểm tra local; các phần nhận quà thật và nghiệm thu OBS/LIVE dài vẫn theo LIVE-READINESS.md.
