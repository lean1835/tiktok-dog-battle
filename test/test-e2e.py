import os
import sys
from playwright.sync_api import sync_playwright

def test_interactive_features():
    html_path = os.path.abspath(r"d:\Tiktok_Workspace\tiktok-dog-battle\index.html")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    print(f"🚀 Running E2E Interactive Tests on {file_url}...")

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=True)
        except Exception:
            browser = p.chromium.launch(channel="msedge", headless=True)

        page = browser.new_page(viewport={"width": 1440, "height": 1080})
        
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        page.goto(file_url, wait_until="networkidle")

        # 1. Test "Tất Cả Sủa" button
        print("  Testing [Tất Cả Sủa] button...")
        page.click("button:has-text('Tất Cả Sủa')")
        page.wait_for_timeout(300)
        barking_svgs = page.locator("#showcase-grid svg[data-state='barking']").count()
        assert barking_svgs == 10, f"Expected 10 barking SVGs, got {barking_svgs}"
        print(f"  ✅ [Tất Cả Sủa] verified: 10/10 cards are barking!")

        # 2. Test "Tất Cả Thở Dốc" button
        print("  Testing [Tất Cả Thở Dốc] button...")
        page.click("button:has-text('Tất Cả Thở Dốc')")
        page.wait_for_timeout(300)
        panting_svgs = page.locator("#showcase-grid svg[data-state='exhausted']").count()
        assert panting_svgs == 10, f"Expected 10 exhausted SVGs, got {panting_svgs}"
        print(f"  ✅ [Tất Cả Thở Dốc] verified: 10/10 cards are exhausted!")

        # 3. Test "Hóa Hổ" button
        print("  Testing [Hóa Hổ] button...")
        page.click("button:has-text('Hóa Hổ')")
        page.wait_for_timeout(300)
        tiger_svgs = page.locator("#showcase-grid svg[data-state='evolved_tiger']").count()
        assert tiger_svgs == 10, f"Expected 10 evolved_tiger SVGs, got {tiger_svgs}"
        print(f"  ✅ [Hóa Hổ] verified: 10/10 cards are evolved_tiger!")

        # 4. Test "Hóa Rồng" button
        print("  Testing [Hóa Rồng] button...")
        page.click("button:has-text('Hóa Rồng')")
        page.wait_for_timeout(300)
        dragon_svgs = page.locator("#showcase-grid svg[data-state='evolved_dragon']").count()
        assert dragon_svgs == 10, f"Expected 10 evolved_dragon SVGs, got {dragon_svgs}"
        print(f"  ✅ [Hóa Rồng] verified: 10/10 cards are evolved_dragon!")

        # 5. Test Individual Dog Card Click
        print("  Testing individual card click (Pug)...")
        pug_card = page.locator(".dog-card:has-text('Pug')")
        pug_card.click()
        page.wait_for_timeout(300)
        pug_state = page.locator("#svg-wrap-pug svg").get_attribute("data-state")
        assert pug_state == "barking", f"Expected Pug to be barking, got {pug_state}"
        print("  ✅ Individual dog click verified!")

        # 6. Test Arena 5v5 Controls
        print("  Testing Sa Bàn 5v5 [Toàn Trường Sủa Rực Lửa!]...")
        page.click("button:has-text('Toàn Trường Sủa Rực Lửa!')")
        page.wait_for_timeout(300)
        arena_barking = page.locator(".arena-pitch svg[data-state='barking']").count()
        assert arena_barking == 10, f"Expected 10 arena dogs barking, got {arena_barking}"
        print(f"  ✅ Arena all bark verified: 10/10 fighters barking!")

        # 7. Test Arena 5v5 [Đội Đỏ Áp Đảo]
        print("  Testing Sa Bàn 5v5 [Đội Đỏ Áp Đảo]...")
        page.click("button:has-text('Đội Đỏ Áp Đảo')")
        page.wait_for_timeout(300)
        red_barking = page.locator("#red-team-slot svg[data-state='barking']").count()
        blue_panting = page.locator("#blue-team-slot svg[data-state='exhausted']").count()
        assert red_barking == 5, f"Expected 5 red barking, got {red_barking}"
        assert blue_panting == 5, f"Expected 5 blue panting, got {blue_panting}"
        print("  ✅ Arena Red Attack verified: Red barking & Blue exhausted!")

        # 8. Test Arena 5v5 [Đại Chiến Thần Thú (Evolve!)]
        print("  Testing Sa Bàn 5v5 [Đại Chiến Thần Thú]...")
        page.click("button:has-text('Đại Chiến Thần Thú (Evolve!)')")
        page.wait_for_timeout(300)
        red_tiger = page.locator("#red-team-slot svg[data-state='evolved_tiger']").count()
        blue_dragon = page.locator("#blue-team-slot svg[data-state='evolved_dragon']").count()
        assert red_tiger == 5, f"Expected 5 red tiger, got {red_tiger}"
        assert blue_dragon == 5, f"Expected 5 blue dragon, got {blue_dragon}"
        print("  ✅ Arena Evolve verified: Red Hóa Hổ vs Blue Hóa Rồng!")

        # 9. Test HP Slider Input
        print("  Testing HP Slider interaction...")
        page.fill("#slider-red-hp", "35")
        page.dispatch_event("#slider-red-hp", "input")
        page.wait_for_timeout(200)
        label_text = page.locator("#label-red-hp").text_content()
        assert "35%" in label_text, f"Expected 35%, got {label_text}"
        print("  ✅ HP Slider interaction verified!")

        if errors:
            print("❌ Browser runtime errors detected:", errors)
            sys.exit(1)

        browser.close()

    print("\n🎉 ALL E2E INTERACTIVE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_interactive_features()
