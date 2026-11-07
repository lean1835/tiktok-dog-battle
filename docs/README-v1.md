# Chó Battle — asset integration / OBS rehearsal

Bản game local 5v5 khung dọc 9:16, dùng 7 model GLB có rig/animation và hai bản thu chó thật. Chạy thử, xem model riêng, thử animation, triệu hồi hổ/rồng. Chưa kết nối tài khoản TikTok LIVE.

## Chạy

Yêu cầu Node.js 20+ và trình duyệt hỗ trợ WebGL2.

```sh
npm start
```

Mở [Studio](http://127.0.0.1:4173). Bấm Bắt đầu trận; nút GÂU gây sát thương cho xóm Xanh. Các nút bên trái mô phỏng quà tặng cho hai đội. Chọn nhân vật bên phải để xoay model và thử animation. Mỗi nhân vật 200 HP, mỗi xóm 1000 HP; trận kết thúc khi hết 90 giây hoặc một đội hết HP. Thần thú giữ HP của nhân vật được thay, tăng sát thương từ 28 lên 48.

## OBS / TikTok LIVE Studio

Thêm Browser Source với URL `http://127.0.0.1:4173/?capture=1`, Width **1080**, Height **1920**. Dùng Interact để bấm Bắt đầu ở mép dưới và bật âm thanh. Bật điều khiển âm thanh của Browser Source trong OBS nếu cần đưa vào mixer. Giữ server chạy trong lúc ghi hình.

Khung capture và Studio là **hai phiên độc lập**, chưa đồng bộ điều khiển giữa các cửa sổ. Để thao tác Studio lên cùng hình đang phát, có thể dùng Window Capture cho cửa sổ Studio và crop đúng khung dọc. Không có kết nối mạng TikTok hay quà tặng thật trong bản này.

## Asset và giấy phép

[Nguồn từng model, âm thanh và thay đổi](docs/ASSET-SOURCES.md). SHA256, URL tải, dung lượng: [assets/manifest.json](assets/manifest.json). Bằng chứng giấy phép từng bộ nằm trong `assets/licenses/`. Các model được dùng theo CC0; Three.js theo MIT, bản license kèm trong assets.

Tải lại và xử lý âm thanh (chỉ dành cho bảo trì, cần Python + numpy + soundfile):

```sh
python scripts/fetch-assets.py
python scripts/prepare-audio.py
```

## Kiểm tra và đóng gói

```sh
npm test
npm run check
npm run build
```

`dist/` là bản static tự chứa để đưa lên hosting có HTTPS. Không phụ thuộc CDN, không cần Node.js trên hosting. Khi đã tải trang và asset, rendering/audio chạy cục bộ; chưa có service worker để cài offline lần đầu.

Kiểm tra trình duyệt (server đang chạy; Python Playwright và Chrome có sẵn): `python test/battle-e2e.py`. Ảnh và báo cáo nằm trong `test/output/`. Bản showcase trước được giữ ở `index-3d.html` và `showcase-2d.html`.

## Phạm vi chuẩn bị phát hành

Đã tích hợp asset, chuẩn hóa scale/pivot lúc chạy, skeleton clone riêng, animation chuyển mượt, bóng đổ, vạch đội, HP, timer, kết thúc trận, reset, cooldown, chống trùng ID sự kiện và giới hạn âm thanh chồng. Tiếng gâu là bản thu thật, mono, fade đầu/cuối, peak -3 dBFS và compressor giới hạn tổng.

Còn trước buổi LIVE thật: nối dịch vụ sự kiện TikTok phía server với tài khoản của chủ kênh; xác nhận mapping quà/đội; kiểm tra reconnect, lưu sự kiện và cân bằng trận bằng phiên LIVE thử. Hổ/rồng hiện chưa có bản thu tiếng gầm. Hiệu năng đã được kiểm tra chức năng trên Chrome ở máy này, chưa benchmark trên thiết bị phát sóng của chủ kênh. Phong cách hiện tại là low-poly cách điệu; Pug/Becgie mang phụ kiện từ bộ Zombie Apocalypse. Không có tuyên bố các giống là model chó Việt Nam chính xác về giải phẫu.

Bridge local cho connector sau này:

```js
window.DogBattle.enqueueEvent({id:'unique-event-id', type:'bark', team:'red'});
// type: bark | tiger | dragon; team: red | blue
window.DogBattle.getState();
```

Bridge chỉ nhận dữ liệu đã được chuẩn hóa. Không đặt cookie, access token hoặc thông tin đăng nhập TikTok trong trình duyệt. Hiện bridge chỉ ở cùng trang, không phải HTTP API.
