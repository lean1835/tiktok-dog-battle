# Tuất Live — chạy tương tác TikTok

## Bản chạy thật và bản demo

`npm start` dùng server tại 127.0.0.1:4173. Server là nơi duy nhất chạy luật và đồng hồ; browser chỉ gửi lệnh/nhận snapshot. Khi mất WebSocket, browser báo mất kết nối và không tự mở một trận riêng. Khi kết nối lại, các lệnh chưa nhận ACK được gửi lại cùng ID; server chống xử lý lặp. Không dùng localStorage để đồng bộ giữa Chrome, Edge và OBS nữa.

Mở hai HTML bằng file hoặc thêm `?demo=1` giữ cơ chế demo offline cũ. Mode đó không nhận TikTok. Khung preview trong quản lý nhận trạng thái nhưng luôn tắt tiếng và không điều khiển trận.

Gói chạy: `release/live-app/`, mở Start-Tuat.cmd. Node.js >=22; môi trường phát triển đã dùng 22.22.2. Các phụ thuộc chính được ghim: tiktok-live-connector 2.5.0, msedge-tts 2.1.1, ws 8.22.1. Chỉ lắng nghe loopback; không mở cổng LAN/Internet.

## Nối kênh

1. Mở TikTok LIVE Studio và bắt đầu phiên thử của chính chủ kênh.
2. Nhập @username hoặc link tiktok.com/@username/live ở màn quản lý.
3. Bấm Kết nối TikTok. Chỉ khi nhận trạng thái connected mới ghi Đang nhận LIVE.
4. Kiểm tra lời chào, comment chọn đội và gâu, tim, follow/share và một quà thử.

Bộ đọc dùng thư viện cộng đồng, không phải API TikTok chính thức. Theo [tài liệu signing của dự án](https://ttlc.docs.isaackogan.com/configuration/signing/), dịch vụ ký mặc định là Euler Stream. Tắt extended gift info không có nghĩa là loại bỏ dịch vụ ký hoặc cam kết miễn phí. Nếu cần khóa, đặt SIGN_API_KEY hoặc TIKTOK_SIGN_API_KEY trong môi trường tiến trình server; không đưa khóa vào HTML, query string hoặc bản sao dữ liệu. Không hỏi mật khẩu/session TikTok và không gửi chat thay người dùng.

Mất kết nối tạm thời: backoff từ khoảng 2 giây tới 60 giây, có jitter và deadline 25 giây mỗi lần nối. Lỗi 401/403/dịch vụ khóa không hợp lệ dừng retry để người dùng xử lý. LIVE kết thúc là trạng thái ended, không giả thành connected. Mỗi lần nối có generation guard để sự kiện từ kết nối cũ không đi vào trận mới.

Nếu TikTok xác nhận kênh chưa phát LIVE (UserOfflineError), phần mềm hiện **Kênh chưa phát LIVE** và dừng thử lại. Bắt đầu LIVE trong TikTok rồi bấm Kết nối TikTok; không đánh đồng kênh offline với lỗi mạng cần backoff.

## Tương tác và quà

- User ID lấy từ mã số ổn định trước handle; tên hiển thị được cắt và làm sạch.
- Member/chat/gift vào đội còn ít người hơn; comment trái/đỏ/1 hoặc phải/xanh/2 chọn đội, nhưng đang đánh không đổi phe.
- Thả tim hoặc comment gâu/gau kích hoạt đúng tuất sủa và cộng điểm khi còn sống trong trận. Chó không gây sát thương hay đánh/cắn. Kỹ năng Hổ/Rồng tự động mỗi 30 giây, cộng điểm và gây sát thương bằng 1/7 hoặc 1/3 HP tối đa mục tiêu (làm tròn lên): hạ tuất đầy máu sau đúng 7/3 đòn nếu không được hồi HP. Tuất chờ chỉ sủa cổ vũ, không cộng điểm trận; tuất gục hoặc trận tạm dừng không ra lượt.
- Tim và gâu dùng chung không cooldown lấy điểm; một gói tim chỉ tạo một lượt, toàn bộ tim vẫn được đếm. Sự kiện TikTok trùng mã không phát lại. Điểm mỗi lượt = điểm cơ bản + điểm cổ vũ của đội + 12 (Hổ) hoặc 24 (Rồng). Hỗ trợ không đổi lượng HP mỗi đòn. Hết 2 phút so tổng điểm; bằng điểm thì hòa, không dùng HP để phân thắng.
- Comment đúng tên năm giống chó đổi giống, không mở Hổ/Rồng miễn phí. Người ở sâu trong hàng chờ được hiện tạm khi sủa, không thay thứ tự chọn đội.
- Combo giftType=1 chỉ tính khi repeatEnd=true/1. Dedupe theo phòng + groupId + sender + giftId nếu có combo ID, nếu không dùng message ID. Theo [hướng dẫn quà/streak](https://ttlc.docs.isaackogan.com/guides/gifts/), repeatCount là tổng lũy kế, không cộng lại mỗi lần cập nhật.
- Gán Gift ID thật ở Setting → Quà TikTok → Skill. Hoa/Rose mặc định cổ vũ Đỏ; Kem mặc định cổ vũ Xanh, bất kể đội người gửi. Hai vai trò phải dùng quà khác ID/tên; cấu hình trùng bị từ chối. Skill Hổ/Rồng cần gán chủ động. Hình trên bảng là minh họa tác dụng; tên quà và giá xu theo quy tắc/metadata nhận thật, không dùng giá demo để quảng cáo LIVE.
- Bảng quà 3D hiển thị các quy tắc thật và giá đã quan sát. Skill chưa gán ghi Chưa gán quà, giá chưa có metadata ghi ? xu. Mái sân hiện đúng kênh LIVE hoặc trạng thái chờ kết nối. Toàn bộ gift catalog của SDK đã thử và bị dịch vụ ký yêu cầu Business plan; chức năng nhận quà cơ bản không gọi endpoint đó.
- Giá dùng diamondCount/coin metadata của sự kiện; giá dự phòng trong quy tắc chỉ dùng khi metadata thiếu. Xu này là đơn vị tương tác, không phải doanh thu hay tiền người phát nhận.
- Quà chưa gán tiếp sức điểm mỗi lượt sủa cho đội người gửi và tăng xu ưu tiên. Quà thiếu mã/combo không cộng; thiếu giá thì hiện để cấu hình và đối chiếu. Hóa Hổ/Rồng lưu permanentForm ngay cho người gửi, kể cả hàng chờ; giữ qua các trận, reload và restart. Quà Cường hóa tăng điểm kỹ năng kế tiếp, không tăng số lần gây sát thương hay bỏ qua hồi chiêu 30 giây.
- Giữ 10.000 receipt quà và 10.000 receipt khác gần nhất trên đĩa; đây là cửa sổ chống replay, không cam kết truy hồi quà ngoài khoảng mất mạng.

Giới hạn người chơi đang quản lý là 500, history 100 trận, event hiển thị 40 sự kiện. Quà từ người mới khi hàng chờ đầy nằm trong pendingGifts và xử lý khi có chỗ; quà đến khi tạm dừng xử lý sau Tiếp tục. Bộ đếm quà nhận vẫn tăng ngay. Cần giám sát dòng quà chờ ở đầu quản lý.

## Độ bền dữ liệu

`runtime/session.json` chứa người chơi, setting, lịch sử, receipt và quà chờ. Ghi file tạm, fsync rồi đổi tên; giữ session.json.bak. Không ACK lệnh trước khi lưu thành công. Nếu mất quyền ghi/hết đĩa, báo lỗi và tạm dừng, không nhận là đã xử lý. Bản dự phòng có thể cũ hơn bản chính một giao dịch; nếu phải phục hồi backup thì cần đối chiếu quà ngoài game.

Khóa server.lock ngăn hai tiến trình dùng một thư mục. Bản chạy chính tự tiếp tục trận trước đó đang chạy sau restart, giữ nguyên thời gian tại lần lưu; nếu quản lý chủ động pause thì giữ pause; không chạy bù các đòn trong lúc phần mềm ngừng. Mặc định không tự nối một kênh khi vừa khởi động; bấm Kết nối để xác nhận kênh đang dùng.

Sao lưu: dừng server bằng Ctrl+C rồi copy nguyên thư mục runtime. Nút Xuất bản sao trong quản lý vẫn xuất game JSON. Nút Nhập demo cũ chỉ dùng khi phiên server trống; nhập setting, người chơi và lịch sử từ localStorage của đúng browser đó, không mang theo trận đang dở hoặc receipt giả.

## Hình và tiếng khi phát

OBS Browser Source: http://127.0.0.1:4173/overlay.html, 1080×1920. Sân tự mở tiếng và nhạc nền; nếu bị chặn tự phát, dùng Interact chạm một lần vào sân. Cấu hình thu âm của nguồn trong OBS. Chọn nguồn cửa sổ overlay trong LIVE Studio nếu bản cài không có browser source. Giữ tab quản lý mở để điều khiển, server vẫn chạy trận nếu tab đóng.

Máy quay tự xoay cận quanh sân mỗi 15 giây, cảnh dài 8 giây rồi trở về góc bao quát. Các cảnh quà/lời chào giữ nguyên góc, tốc độ và đồng bộ theo giọng đọc, được ưu tiên trước vòng quay. Sủa và kỹ năng tự động không còn kéo máy quay. Không hiện khung chữ điện ảnh. Chuẩn bị, vinh danh, pause và reduced motion không kích hoạt vòng quay; trở lại tab không phát bù các vòng đã bỏ lỡ.

Setting → **Máy quay LIVE**: bật/tắt tự zoom, chọn mức Nhẹ / Vừa / Gần, rồi Lưu cài đặt. Nút xem thử vòng quay chỉ điều khiển khung preview bên phải; không tạo quà, đổi đội hoặc mở kỹ năng trong trận. Khi hệ điều hành yêu cầu giảm chuyển động, auto zoom được tắt. Hiệu ứng kỹ năng bám đúng người hồi HP/hồi sinh, người hóa Hổ/Rồng hoặc người tích Liên kích. Người mới được đưa vào khung hình trong lúc chào mà không đổi thứ tự ưu tiên chọn đội.

Ngày 04/11 đã kiểm tra bốn loại cảnh bằng sự kiện game qua server/WebSocket trên trận riêng tại port 4174. Ảnh đối chiếu ở `test/output/camera-{dragon,gift,bark,welcome}-auto.png`. Chưa coi bài thử riêng này là nghiệm thu quà TikTok thật.

Chỉ một WebSocket client có quyền phát tiếng tự động. Overlay sẵn sàng được ưu tiên tự phát cả tiếng sân và nhạc nền; đóng cửa sổ thì nguồn sẵn sàng khác tiếp quản. Nút ở quản lý bật/tắt tiếng chung qua máy chủ, kể cả OBS ở profile khác. Preview iframe không xin quyền phát tiếng. Bản offline dùng lease localStorage như trước. Mute dừng cả âm đang phát lẫn yêu cầu đang chờ.

Giọng đọc có hàng đợi 15 mục phía server và 6 mục phía browser, ưu tiên quà/vinh danh, bỏ câu đã quá hạn. Khi nói thì giảm nền gâu để nghe rõ. Tạo MP3 qua Edge có timeout, cache giới hạn 40 tệp/5 phút; không chặn bộ máy trận. Nếu Edge lỗi, tự dùng giọng tiếng Việt đã cài sẵn trên Windows để đọc đầy đủ câu, rồi chờ một phút trước khi thử Edge lại. Không cài thêm giọng hay sửa registry. Nếu máy không có giọng Việt dự phòng, thử lời ngắn một lần rồi báo lỗi; gâu/gầm vẫn hoạt động.

Có thể chọn **Tiếng Việt Windows (không cần mạng)** trong Tùy chọn LIVE & giọng đọc để dùng thẳng giọng trên máy. Đã kiểm tra máy phát này có Microsoft An - Vietnamese (Vietnam). Server dùng SAPI xuất PCM vào bộ nhớ, đóng gói WAV mono 22050 Hz / 16 bit và chuyển qua `/audio/<id>.wav`; không phát tiếng trực tiếp từ tiến trình Windows. WAV và MP3 đều đi qua nguồn âm duy nhất của overlay, cùng điều khiển mute/ducking; hết hạn sau 5 phút. PowerShell chạy ẩn, có timeout, lời đọc đi qua JSON stdin và được xử lý như văn bản thuần.

Góc toàn cảnh mặc định trong khung 9:16 hiển thị nhân vật lớn hơn khoảng 18% so với góc ban đầu. Hạ nhẹ độ nghiêng, căn lại trọng tâm và đưa hai bảng cùng các chậu cây vào trong để giữ trọn đồng hồ, 10 tuất, ba hàng chờ và đủ sáu chậu cây. Sau mỗi cảnh zoom, máy quay trở về cùng góc này. Thay đổi góc nhìn áp dụng khi refresh overlay.

Bình luận bất kỳ hiện dưới dạng bóng chat chữ nhật nhỏ, nền trắng chữ đen, trên đầu đúng người gửi. Tuất đang đấu, đã gục hoặc chờ ngoài sân đều có thể hiện chat. Lưu tối đa 120 ký tự của tin mới nhất/người, hiển thị tối đa hai dòng trong 4,5 giây và tối đa sáu bóng cùng lúc. Tin mới thay tin cũ; cập nhật vị trí theo model và camera, tự hết hạn cả khi trận tạm dừng. Người ở sâu trong hàng chờ được hiện tạm để thấy chat, không đổi ưu tiên chọn đội. Dùng textContent để hiển thị bình luận như văn bản. Chat không tự mở skill hoặc bỏ qua cooldown sủa.

Ngày 2026-11-04: Edge có lúc lỗi cả lời chào ngắn, có lúc tạo được tiếng. Hai câu đầy đủ khi Edge lỗi đã chuyển sang Windows thành công: tạo tiếng trong khoảng 2–5 giây, WAV khoảng 3,7–3,9 giây, có tín hiệu PCM hợp lệ. Màn quản lý đã nhận và hiển thị đúng giọng Windows. Việc chọn Windows không gọi dịch vụ Edge; nếu chọn Nam Minh/Hoài My, vẫn ưu tiên giọng đó khi dịch vụ hoạt động.

## Nguồn kế thừa

Kế thừa định dạng payload v2/v3, generation guard, xử lý combo, TTS stream/queue, escape XML, WebSocket phân vai, kiểm tra Host/Origin và static allowlist từ dự án Chánh Điện Tịnh Tâm. Giấy phép MIT của Kent Juno lưu nguyên văn. Tự bổ sung lưu dữ liệu/receipt, reconnect/backoff, xử lý quà chờ, server điều phối game và quyền xuất âm qua các profile.

Không bê hình Phật, nhạc, câu kinh hay luật Công Đức sang game. Đồ họa chó/hổ/rồng và âm gâu/gầm giữ nguồn riêng. `research/chanh-dien-source-inventory.json` ghi hash nguồn đọc, dùng kiểm tra dự án gốc không bị sửa.

Hiệu ứng chiến đấu là đồ họa: ba vòng sóng trước miệng chó; Rồng có luồng lửa và đốm lửa từ miệng đến đúng target của sự kiện; Hổ có vòng gầm và ba vệt cào trên target. Không đổi bộ tiếng. Hiệu ứng chỉ nhận sự kiện mới, không replay khi reload, tự hết hạn dưới một giây và dispose geometry/material. Có giới hạn số hiệu ứng đồng thời. Bảng quà nhúng 28 ảnh TikTok thật theo Gift ID, không tải ảnh Internet khi LIVE. Xem TIKTOK-GIFT-ART.md để biết nguồn và các ảnh đã nhúng.

Sủa dùng clip additive chỉ có track đầu/cổ/miệng, không kéo chân/thân chạy đánh. Sóng âm là vòng tròn trắng, tâm theo một anchor gắn xương đầu ở mõm, đo từ các đỉnh mesh phía trước của từng model. Khi spam chỉ khởi động lại clip tối đa khoảng ba lần/giây để động tác không bị kẹt ở frame đầu; mọi sự kiện vẫn cộng điểm. Kỹ năng dùng đồng hồ server 30 giây, pause giữ thời gian còn lại, restart khôi phục paused; không đánh bù hàng loạt theo thời gian đã tắt máy.

Hết ván hiển thị Bảng vàng 10 giây: Tuất Vương, đội thắng, điểm đóng góp và ba người nổi bật. Chỉ vinh danh, không cộng xu hoặc phát thưởng. Reload chỉ hiển thị thời gian còn lại, không bắt đầu lại 10 giây. Cổ vũ mặc định: Rose 5655 cho Đỏ và Kem ốc quế 5827 cho Xanh, cùng giá cấu hình 1 xu, cùng hệ số/trần; tính theo tổng xu cổ vũ để không lệch khi gửi lẻ hay combo.


Cập nhật sủa mạnh ngày 04/11: cả năm GLB có clip chân trước/sau additive tách khỏi đầu/cổ/miệng, không lấy track tịnh tiến thân/gốc. Tăng nhún thân, hất đầu và giữ nhịp từ barkStartedAt để spam không đóng băng frame đầu. Giảm clip chân khi Hổ/Rồng dùng kỹ năng. Thêm bản thu Dog Growl của bonebrah (OpenGameArt, CC0): gầm ngắn và gâu rồi gầm, tổng 20 mẫu nhúng trong hai HTML, giữ tốc độ gốc. Gầm tự động xen kẽ mỗi bốn lượt âm thanh được chấp nhận/người, cách toàn sân ít nhất bốn giây; có nút nghe thử ưu tiên. Không đổi luật điểm/HP. Toàn bộ 106/106 kiểm thử đã đạt; sau chỉnh ưu tiên nghe thử, 14/14 kiểm thử âm thanh tích hợp đạt. Kiểm tra trình duyệt fixture: nút báo “Đang nghe: gầm gừ thật”, model há miệng và nhún chân, không console error; ảnh forceful-bark-paws-growl.png. Các kiểm tra này không xác nhận loa vật lý, OBS hoặc phiên LIVE mới. Thay đổi chỉ ở HTML, không cần restart server chính.


Sửa mõm và tư thế ngày 04/11: bỏ các khối cầu miệng phụ và clip chân Attack làm chó bật lên. Bốn giống thiếu xương hàm riêng dùng hàm dưới tách từ mesh gốc, giữ vật liệu/UV và chiều ngang; giới hạn vùng cắt quanh cằm để không chạm vào bàn chân. Corgi giữ xương Mouth gốc. Clip sủa chỉ quay đầu/cổ/hàm, trọng số 0,35; thân rướn về +Z của model bằng phép shear theo độ cao, mặt phẳng bàn chân giữ nguyên, không tịnh tiến root lên trên. Sóng trắng xuất phát giữa hai môi thật. 107/107 kiểm thử đạt, syntax 36 module + hai HTML đạt. Kiểm tra GPU Studio thật không có console error; bảng so sánh pose cố định dùng để quan sát đủ năm giống, không phải bằng chứng LIVE/OBS. Ảnh bark-forward-jaw-comparison.png. Chỉ cập nhật HTML, không restart server hoặc thay phiên LIVE.


Rà soát ổn định ngày 04/11: tái hiện lỗi kết nối TikTok hoàn tất sau deadline 25 giây vẫn mở socket ngầm dù đã đổi kênh. Sửa đóng chính kết nối trả về muộn, không chạm kết nối thay thế; kiểm thử buộc tình huống handshake chậm rồi đổi kênh từ lỗi đỏ sang đạt. 108/108 kiểm thử đạt. Đối chiếu SHA256 đủ 34 tệp trong research/chanh-dien-source-inventory.json: không có tệp gốc Chánh Điện bị đổi. Đây là kiểm thử lỗi mô phỏng trên phiên bản connector đang cài, không thay cho thử rớt mạng và nhận quà thật trên LIVE.


Bảng quà trong sân: ba nhóm cổ vũ Đỏ/Xanh, hóa thú vĩnh viễn và hồi phục/tiếp sức. Tên quà TikTok tách riêng khỏi kỹ năng; ảnh và giá của quà đầu tiên trong quy tắc hiển thị cùng nhau, giá trong ô màu tương phản. Các quà khác đã gán vẫn hoạt động. Hai hàng cổ vũ dùng cùng kích thước, chỉ phân biệt màu và tên đội. Chữ giữ tỷ lệ, dùng dấu ba chấm nếu quá dài; không ép ngang chữ. Bảng không chịu tone mapping ánh sáng để giữ tương phản. Giá cấu hình chưa quan sát vẫn có dấu *; kỹ năng chưa gán vẫn ghi rõ, không dùng ảnh/giá giả. Không đổi cơ chế quà hay cân bằng điểm.


Sửa tự đọc ngày 04/11: mặc định bật đọc lời chào; người đã lưu từ trước vẫn được chào khi vào phòng, chống đọc lặp trong 60 giây/người/phòng thay cho bỏ lượt theo giới hạn chung 2 giây. Nút thêm người và thử quà trong quản lý gửi announce=true, đọc sau khi lệnh áp dụng thành công và không đọc lại lệnh bị replay. Câu cảm ơn quà/vinh danh được ưu tiên ở cả hàng đợi tạo tiếng lẫn hàng đợi phát sáu câu; quà mới thay một lời chào nếu hàng đợi phát đã đầy. Nút Nghe giọng đọc mở AudioContext và chọn đầu ra trước khi thử, có trạng thái Đang đọc/Đã đọc. Tại máy phát đã bật voiceEnabled/readJoins/readGifts, minSpeakCoins=1 và chọn windows-vi để không chờ Edge đang lỗi. 112/112 kiểm thử và syntax 37 module + hai HTML đạt. Restart giữ đúng trận 40, 168 người và 40 lịch sử rồi tiếp tục; bằng chứng restart-session-proof.json. Kiểm tra luồng TikTok dùng payload giả lập; không coi đây là nghiệm thu LIVE mới.


Cập nhật tên và ghép đội ngày 04/11: thêm pha prepare mặc định 15 giây, bảng danh sách 5v5 trước khi tính đủ 2 phút, giữ đội hình khi pause/reload. Thêm đọc tên Việt không dấu/liền chữ, bảng sửa cách đọc lưu trên server và nghe thử theo tên/câu. Bổ sung giọng ghép/mở trận, pause/resume, kết quả qua nút quản lý, tác dụng quà và cảm ơn theo dõi/chia sẻ. Xem [VOICE-GUIDE.md](VOICE-GUIDE.md).


Mặc định server tự ghép đội 15 giây, đấu 2 phút, nghỉ 3 phút rồi ghép lại liên tục, không cần bấm mở trận. Tắt Tự sang trận hoặc chủ động tạm dừng trong quản lý nếu muốn dừng vòng tự động. Bảng tên ngoài sân chỉ còn tên, nền người thật trắng sáng/bot vàng nhạt; bảng tên cỡ vừa cố định, không tự thu nhỏ theo mật độ hàng, dùng texture rõ nét và dấu ba chấm cho tên dài.

Giống chó được khóa theo ID ngay lần nhận đầu tiên, giữ nguyên khi vào/ra trận, chuyển model chi tiết/khán giả và quay lại LIVE. Chỉ quà hóa Hổ/Rồng thay dạng thú. Nhạc nền piano gốc 76 BPM, mặc định 30%, vẫn đủ nghe khi có tiếng sủa và hạ nhẹ khi đọc tên.

Trong pha nghỉ, nhạc nền tự lên 60% (mặc định đang đấu 30% → nghỉ 60%), chuyển âm lượng nhẹ nhàng; khi ghép đội/đấu trở về mức cấu hình. Vẫn hạ nhạc khi đọc tên và tôn trọng tắt nhạc/âm lượng 0.

Khi có hơn 24 tuất chờ, khán giả tự chia ra cả hai lối đi bên sân và hàng phía trước; hai bên có số chỗ bằng nhau (tối đa 32 mỗi bên), phần còn lại vẫn hiện đầy đủ ở hàng trước. Chừa sân 5v5, cây và bảng hướng dẫn/quà; không thay giống chó hoặc đội thi đấu khi dàn chỗ.

Cập nhật 06/11 — chào theo mật độ: chỉ đếm người thật chưa ẩn ở sân đấu + hội cổ vũ, không đếm bot hoặc lặp người đang đấu. Chọn tại lúc phát giọng: ≤30 người quay chào; >30 người dùng bảng xanh dưới đồng hồ + giọng, không quay bù. Quà giữ cảnh quay; skill Hổ/Rồng định kỳ có khung chứa cả người đánh và mục tiêu; nhiều đòn chung khung, mở rộng mượt khi trùng cảnh quà. Mốc không tương tác hiện hành là 3 phút (180.000 ms); tương tác/vào lại khôi phục và chào, giữ model/hóa thú/chiến tích.
