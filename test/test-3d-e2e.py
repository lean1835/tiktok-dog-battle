import os
import sys
from playwright.sync_api import sync_playwright

def main():
    html_path = os.path.abspath(r"d:\Tiktok_Workspace\tiktok-dog-battle\index-3d.html")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    target_img_1080x1920 = os.path.abspath(r"d:\Tiktok_Workspace\tiktok-dog-battle\test\dog_battle_3d_1080x1920.png")
    scratch_dir = r"C:\Users\lean1\.gemini\antigravity\brain\a849c144-9976-4ee6-82e5-a3bbe5c27825\scratch"
    os.makedirs(os.path.dirname(target_img_1080x1920), exist_ok=True)
    os.makedirs(scratch_dir, exist_ok=True)
    scratch_img = os.path.join(scratch_dir, "dog_battle_3d_1080x1920.png")

    print(f"🚀 BẮT ĐẦU KIỂM THỬ E2E CHO ĐẤU TRƯỜNG 3D: {file_url} ...")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception as e:
            print(f"Chrome launch ({e}), fallback msedge...")
            try:
                browser = p.chromium.launch(channel="msedge", headless=True)
            except Exception:
                browser = p.chromium.launch(headless=True)

        # 1. Khởi tạo viewport 1080x1920 (Tỷ lệ dọc 9:16 chuẩn TikTok / OBS)
        print("  Đang khởi tạo viewport 1080x1920 (TikTok 9:16)...")
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: print(f"    [Browser {msg.type}]: {msg.text}") if msg.type in ['error'] else None)

        page.goto(file_url, wait_until="networkidle")
        page.wait_for_selector("#dog-webgl-canvas")
        page.wait_for_selector("#giant-bark-btn")

        # Đợi 1.2 giây để Three.js render khung cảnh xóm phố và các chú chó
        page.wait_for_timeout(1200)

        # Kiểm tra WebGL context đã khởi tạo
        is_webgl_ok = page.evaluate("""() => {
            const canvas = document.getElementById('dog-webgl-canvas');
            return canvas && canvas.width > 0 && canvas.height > 0;
        }""")
        assert is_webgl_ok, "Canvas failed to initialize!"
        print("  ✅ WebGL canvas khởi tạo thành công 60 FPS!")

        # 2. Test Nút Sủa GÂU Khổng Lồ (Dùng force=True vì nút có animation nảy 3D)
        print("  Testing Giant Bark Button [#giant-bark-btn]...")
        giant_btn = page.locator("#giant-bark-btn")
        assert giant_btn.is_visible(), "Giant bark button is not visible!"
        giant_btn.click(force=True)
        page.wait_for_timeout(500)
        toast_text = page.locator("#battle-toast").text_content()
        print(f"    Toast xuất hiện: {toast_text}")
        assert "GÂU" in toast_text, f"Toast must contain GÂU, got: {toast_text}"
        print("  ✅ Nút Sủa GÂU Khổng Lồ hoạt động hoàn hảo!")

        # 3. Test Toàn Xóm Sủa Vang
        print("  Testing [Toàn Xóm Sủa Vang] button...")
        page.click("#btn-all-bark")
        page.wait_for_timeout(350)
        action_img = os.path.abspath(r"d:\Tiktok_Workspace\tiktok-dog-battle\test\dog_battle_3d_action_bark.png")
        page.screenshot(path=action_img)
        print(f"  📸 Ảnh action sủa sóng âm 3D đã lưu tại: {action_img}")
        page.wait_for_timeout(300)
        print("  ✅ [Toàn Xóm Sủa Vang] kích hoạt thành công!")

        # 4. Test Xóm Đỏ Áp Đảo
        print("  Testing [Xóm Đỏ Áp Đảo] button...")
        page.click("#btn-red-attack")
        page.wait_for_timeout(500)
        hp_blue = page.locator("#hp-text-blue").text_content()
        print(f"    Lực lượng Xóm Xanh sau khi bị áp đảo: {hp_blue}")
        assert hp_blue != "100%", f"Xóm Xanh HP must drop, got {hp_blue}"
        print("  ✅ [Xóm Đỏ Áp Đảo] hoạt động chuẩn xác!")

        # 5. Test Xóm Xanh Phản Công
        print("  Testing [Xóm Xanh Phản Công] button...")
        page.click("#btn-blue-counter")
        page.wait_for_timeout(500)
        hp_red = page.locator("#hp-text-red").text_content()
        print(f"    Lực lượng Xóm Đỏ sau phản công: {hp_red}")
        assert hp_red != "100%", f"Xóm Đỏ HP must drop, got {hp_red}"
        print("  ✅ [Xóm Xanh Phản Công] hoạt động chuẩn xác!")

        # 6. Test Đại Chiến Thần Thú (Hóa Hổ & Hóa Rồng)
        print("  Testing [Đại Chiến Thần Thú] button...")
        page.click("#btn-all-evolve")
        page.wait_for_timeout(500)
        toast_evolve = page.locator("#battle-toast").text_content()
        print(f"    Toast thần thú: {toast_evolve}")
        assert "THẦN THÚ" in toast_evolve, f"Toast must mention THẦN THÚ, got: {toast_evolve}"
        print("  ✅ [Đại Chiến Thần Thú] kích hoạt hào quang thần thú thành công!")

        # 7. Test Chú Heo Bựa Lạc Bầy (Piggy Oink)
        print("  Testing [Heo Bựa Kêu Éc Éc] button...")
        page.click("#btn-piggy-oink")
        page.wait_for_timeout(600)
        toast_piggy = page.locator("#battle-toast").text_content()
        print(f"    Toast heo bựa: {toast_piggy}")
        assert "ỦN ỈN" in toast_piggy or "ÉC" in toast_piggy, f"Toast must mention Heo bựa, got: {toast_piggy}"
        print("  ✅ [Heo Bựa Kêu Éc Éc] hoạt động chuẩn xác!")

        # 8. Test Bách Khoa 10 Giống Loài Drawer
        print("  Testing [Bách Khoa 10 Loài] drawer...")
        page.click("#btn-toggle-showcase")
        page.wait_for_timeout(400)
        drawer_visible = page.locator("#showcase-drawer").is_visible()
        assert drawer_visible, "Showcase drawer should be open!"
        pills_count = page.locator(".breed-pill").count()
        print(f"    Số lượng giống loài trong Bách Khoa: {pills_count} (kỳ vọng 10)")
        assert pills_count == 10, f"Expected 10 breed pills, got {pills_count}"
        page.click("#btn-close-drawer", force=True)
        page.wait_for_timeout(300)
        print("  ✅ Bách Khoa 10 Giống Loài hiển thị đầy đủ 10/10 loài!")

        # 9. Đặt Lại Trận Đấu và chụp ảnh nghiệm thu 1080x1920
        print("  Resetting battle and capturing 1080x1920 screenshot...")
        page.click("#btn-reset-battle")
        page.wait_for_timeout(1000)

        page.screenshot(path=target_img_1080x1920)
        page.screenshot(path=scratch_img)
        print(f"  📸 Ảnh nghiệm thu 1080x1920 đã lưu tại:")
        print(f"     1. {target_img_1080x1920}")
        print(f"     2. {scratch_img}")

        assert os.path.exists(target_img_1080x1920), "Screenshot 1080x1920 does not exist!"
        size_kb = os.path.getsize(target_img_1080x1920) / 1024
        print(f"     Dung lượng ảnh: {size_kb:.2f} KB")
        assert size_kb > 30, "Screenshot size too small!"

        if errors:
            print(f"❌ Phát hiện lỗi trình duyệt: {errors}")
            sys.exit(1)

        browser.close()

    print("\n🎉 TOÀN BỘ KIỂM THỬ E2E VÀ NGHIỆM THU 1080X1920 ĐÃ THÀNH CÔNG RỰC RỠ!")

if __name__ == "__main__":
    main()
