import os
import sys
from playwright.sync_api import sync_playwright

def main():
    target_img = r"C:\Users\lean1\.gemini\antigravity\brain\a849c144-9976-4ee6-82e5-a3bbe5c27825\scratch\dog_characters_showcase.png"
    html_path = os.path.abspath(r"d:\Tiktok_Workspace\tiktok-dog-battle\index.html")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    os.makedirs(os.path.dirname(target_img), exist_ok=True)

    print(f"Opening {file_url} ...")

    with sync_playwright() as p:
        # Sử dụng trình duyệt Chrome hệ thống có sẵn trên máy
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception as e:
            print(f"Chrome launch failed ({e}), trying msedge...")
            browser = p.chromium.launch(channel="msedge", headless=True)

        page = browser.new_page(viewport={"width": 1440, "height": 2200})
        
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: print(f"[Browser Console {msg.type}]: {msg.text}") if msg.type in ['error', 'warn'] else None)

        page.goto(file_url, wait_until="networkidle")
        
        # Chờ các thẻ bài chó hiển thị
        page.wait_for_selector(".dog-card")
        page.wait_for_selector(".fighter-slot")
        
        card_count = page.locator(".dog-card").count()
        fighter_count = page.locator(".fighter-slot").count()
        print(f"Cards found: {card_count} (expected 10)")
        print(f"Fighters found: {fighter_count} (expected 10)")
        assert card_count == 10, f"Expected 10 cards, got {card_count}"
        assert fighter_count == 10, f"Expected 10 fighters, got {fighter_count}"

        # Đợi 1 giây để SVG CSS animation và DOM render ổn định
        page.wait_for_timeout(1000)

        # Chụp ảnh toàn trang
        page.screenshot(path=target_img, full_page=True)
        print(f"Screenshot successfully saved to: {target_img}")

        if os.path.exists(target_img):
            size_kb = os.path.getsize(target_img) / 1024
            print(f"Image size: {size_kb:.2f} KB")
            assert size_kb > 20, "Screenshot file size too small!"
        else:
            raise FileNotFoundError(f"Image not found at {target_img}")

        if errors:
            print("Browser runtime errors detected:", errors)
            sys.exit(1)

        browser.close()

    print("SUCCESS: All visual tests and screenshot capture completed flawlessly!")

if __name__ == "__main__":
    main()
