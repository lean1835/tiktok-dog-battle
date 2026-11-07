# Ảnh quà TikTok thật

28 ảnh quà thật được tải từ CDN TikTok theo danh mục công khai https://github.com/antiops/tiktok-trending-data/blob/main/live-gift-details.json, gồm Rose, Rosa, Doughnut, Finger Heart, Paper Crane, Hand Heart, Tiger Lift, Dragon Flame và các quà phổ biến khác. Đã thu nhỏ tối đa 96 px, tổng 143.930 byte trước base64, nhúng trong cả hai HTML; không gọi CDN khi phát.

Trong Setting → Quà TikTok → Skill, chọn quà trong danh sách để điền đúng Gift ID và tên, rồi chọn tác dụng và lưu. Ảnh đi theo Gift ID hoặc alias tên quà thật, không đi theo hình con vật/kỹ năng. Ví dụ đổi Gift ID Rose sang Doughnut sẽ đổi ảnh hoa sang bánh dù tác dụng giữ nguyên. ID chưa có trong bộ ảnh sẽ hiện dấu hỏi, không lấy ảnh quà khác thay thế. Dữ liệu giá trên danh mục không được dùng làm giá LIVE đã xác minh.

Nguồn và SHA-256 từng ảnh được ghi ở assets/tiktok-gifts/manifest.json. Artwork thuộc TikTok/ByteDance, không phải tài nguyên CC0. Các model/tiếng chó có nguồn giấy phép riêng. Có thể tái tạo ảnh nhỏ bằng scripts/prepare-tiktok-gifts.py.
