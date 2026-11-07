# Nguồn asset đã tích hợp

Đối chiếu ngày 03/11/2026. Mỗi file trong manifest có URL và SHA256. Chỉ lấy các model có bằng chứng CC0 riêng; không suy ra giấy phép cho toàn bộ kho tài nguyên từ một README.

| File | Tác giả / nguồn gốc | Nguồn tải | Giấy phép / animation |
|---|---|---|---|
| `shiba.glb` | Quaternius — [Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) | [FreeModels / GitHub](https://github.com/agentkaerf/FreeModels/tree/main/Ultimate%20Animated%20Animals%20-%20July%202021/glTF) | CC0; 12 clip, Attack/Idle/Walk/Death |
| `husky.glb` | Quaternius — cùng bộ trên | GitHub cùng thư mục | CC0; 12 clip |
| `pug.glb` | Quaternius — [Zombie Apocalypse Kit](https://quaternius.com/packs/zombieapocalypsekit.html) | [FreeModels / GitHub](https://github.com/agentkaerf/FreeModels/tree/main/Zombie%20Apocalypse%20Kit%20-%20March%202024/Characters/glTF) | CC0; 11 clip, có phụ kiện đeo |
| `becgie.glb` | Quaternius — cùng bộ trên | GitHub cùng thư mục | CC0; 11 clip, có phụ kiện đeo |
| `corgi.glb` | Gobkit — [Freebies](https://gobkit.com/freebies) | URL chính xác trong [manifest của nhà cung cấp](https://gobkit.com/api/free) | CC0; idle/attack/dead/walk |
| `tiger.glb` | Gobkit — cùng nguồn | Manifest trên, model `tiger`, Animal Pack Vol.4 | CC0; idle/attack/dead/walk |
| `dragon.glb` | Quaternius — [Dragon Evolved](https://poly.pizza/m/LlwD0QNUPj), [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html) | GLB do Poly Pizza cung cấp, URL trong manifest local | CC0; 8 clip: bay, đứng bay, headbutt, death, hit react, punch, yes/no |
| `bark-small.mp3` → `.wav` | kyles — [bark yelp dog small int.flac](https://freesound.org/people/kyles/sounds/452180/) | Bản HQ MP3 preview do Freesound công bố | CC0, chó thật; cắt 0,85 giây |
| `bark-medium.mp3` → `.wav` | wateenfotos — [Barking Inez 2](https://freesound.org/people/wateenfotos/sounds/749351/) | Bản HQ MP3 preview do Freesound công bố | CC0, chó thật; cắt 0,85 giây. “medium” là nhãn dùng trong game, không xác nhận giống/kích thước chó |

CC0 cho phép sử dụng, sửa và phân phối thương mại; [văn bản CC0](https://creativecommons.org/publicdomain/zero/1.0/). Credit tác giả vẫn được giữ trong tài liệu này. Three.js 0.187.0 và các loader/utils dùng MIT; xem `assets/licenses/three-LICENSE.txt`.

## Chỉnh sửa đã thực hiện

- Model glTF từ GitHub được đóng gói lại thành GLB, giữ nguyên mesh, skin, animation và texture nhúng. Model từ Gobkit/Poly Pizza giữ nguyên GLB.
- Scale, tâm X/Z, vị trí chân, hướng đội, ánh sáng và shadow được chuẩn hóa trong runtime. Không tự nhận đã remodel anatomy hay retopology.
- Các tên animation rồng có prefix `CharacterArmature|` được ánh xạ theo suffix; clone bằng SkeletonUtils để animation độc lập giữa 10 nhân vật.
- Âm thanh chuyển mono, bỏ DC offset, chọn đoạn đầu có năng lượng, fade 12 ms đầu/cuối, normalize peak -3 dBFS. Điểm cắt, hash file sau xử lý nằm trong `assets/audio/processing.json`. Runtime giới hạn tối đa 3 tiếng chồng, khoảng cách 100 ms và có compressor.
- Sàn đấu, bảng hiệu, cây, chậu, ghế, dây đèn và toàn bộ UI được viết trực tiếp trong dự án.

## Tham chiếu và lựa chọn

[Một Ngày Làm Chó](https://goldenseastudios.com/chosimulator) chỉ dùng tham khảo không khí phố Việt, hình khối và cảm giác chơi trên trình duyệt. Không lấy mã nguồn, texture, model hay âm thanh từ game đó.

Đã xem thêm [Cethiel's Dragon 3D / Drummyfish](https://opengameart.org/content/cethiels-dragon-3d) và model hổ static của Innerscene. Chọn model đang tích hợp vì có rig/animation sẵn và dung lượng nhỏ. Rồng YellowDragon dạng tròn từ Cute Monsters đã được thay trước khi đóng gói, không phải model đang dùng.

Chất lượng hướng tới dễ nhận diện khi chiếu dọc và ổn định trong cảnh 10 nhân vật. Đây là art direction cách điệu; chưa phải bộ chó hiện thực/giống thuần chủng. Bản hiện tại dùng rồng mini Trung Hoa dựng bằng geometry riêng; GLB rồng phương Tây trong bảng là nguồn thử cũ, không nhúng vào overlay. Bộ âm hiện có 15 mẫu gâu, một bản thu hổ, hai hiệu ứng rồng và hai mẫu gầm gừ chó; xem BARK-VOICES.md để biết nguồn đang dùng.
