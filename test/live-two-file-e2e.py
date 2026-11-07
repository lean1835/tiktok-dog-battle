from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test/output';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 context=browser.new_context(viewport={'width':1500,'height':1150})
 manager=context.new_page();errors=[];requests=[]
 context.on('page',lambda page:page.on('pageerror',lambda e:errors.append(str(e))))
 manager.on('pageerror',lambda e:errors.append(str(e)));context.on('request',lambda r:requests.append(r.url))
 manager.goto('http://127.0.0.1:4173/',wait_until='networkidle')
 manager.click('#seed-demo');manager.wait_for_function('DogBattleDemo.getState().people.length===16')
 manager.click('#start-round');manager.wait_for_function('DogBattleDemo.getState().phase==="battle"')
 assert manager.evaluate('DogBattleDemo.getState().config.roundSeconds')==300
 assert manager.evaluate('DogBattleDemo.getState().config.breakSeconds')==120
 assert manager.evaluate('DogBattleDemo.getState().fighters.length')==10
 overlay=context.new_page();overlay.set_viewport_size({'width':1080,'height':1920})
 overlay.goto('http://127.0.0.1:4173/overlay.html',wait_until='networkidle')
 overlay.wait_for_function('DogBattleDemo.getState().phase==="battle"')
 overlay.wait_for_function('DogBattleDemo.renderInfo()?.ready',timeout=30000)
 assert overlay.evaluate('DogBattleDemo.renderInfo().models')==6
 assert overlay.evaluate('DogBattleDemo.renderInfo().units')==10
 assert overlay.evaluate('DogBattleDemo.renderInfo().triangles')>30000
 assert overlay.locator('#broadcast').bounding_box()['width']==1080
 assert overlay.locator('#broadcast').bounding_box()['height']==1920
 overlay.click('#overlay-audio');overlay.wait_for_function('DogBattleDemo.audioInfo().decoded')
 assert .45<overlay.evaluate('DogBattleDemo.audioInfo().duration')<.65
 assert overlay.evaluate('DogBattleDemo.audioInfo().playbackRate')==1
 overlay.click('[data-support=right][data-gift=cake]')
 manager.wait_for_function('DogBattleDemo.getState().boost.right===3')
 manager.click('[data-gift=tiger]');overlay.wait_for_function('DogBattleDemo.getState().fighters.some(f=>f.form==="tiger")')
 # Choose another sender to retain BOTH Chinese dragon and tiger in the screenshot.
 fighters=manager.evaluate('DogBattleDemo.getState().fighters.filter(f=>f.team==="left")')
 chosen=next(f for f in fighters if f['form']!='tiger')
 manager.select_option('#event-person',chosen['id']);manager.select_option('#gift-team','left')
 manager.click('[data-gift=dragon]');overlay.wait_for_function('DogBattleDemo.getState().fighters.some(f=>f.form==="dragon")')
 overlay.wait_for_function('DogBattleDemo.renderInfo().forms.includes("dragon")&&DogBattleDemo.renderInfo().forms.includes("tiger")')
 manager.click('#pause-round');overlay.wait_for_function('DogBattleDemo.getState().paused')
 manager.click('#pause-round');overlay.wait_for_function('!DogBattleDemo.getState().paused')
 # Save config in the actual form and verify same state in the second document.
 manager.click('[data-tab=settings]');manager.fill('[name=leftName]','XÓM VÀNG');manager.fill('[name=damagePerCoin]','0.5');manager.click('button[type=submit]:visible')
 overlay.wait_for_function('DogBattleDemo.getState().config.leftName==="XÓM VÀNG"')
 assert overlay.locator('#overlay-left-name').inner_text()=='XÓM VÀNG'
 manager.screenshot(path=str(OUT/'live-settings.png'),full_page=True)
 manager.click('[data-tab=live]')
 # Test one kill and a genuine resurrection via opposite team.
 manager.select_option('#event-person',chosen['id']);manager.select_option('#gift-team','left');manager.click('[data-gift=execute]')
 overlay.wait_for_function('DogBattleDemo.getState().fighters.some(f=>f.team==="right"&&f.hp===0)')
 manager.select_option('#gift-team','right');manager.click('[data-gift=revive]')
 overlay.wait_for_function('DogBattleDemo.getState().fighters.filter(f=>f.team==="right").every(f=>f.hp>0)')
 # Check HTML/script safety in participant data.
 manager.fill('#join-name','<img onerror=alert(1)>');manager.select_option('#join-team','left');manager.click('#join-form button[type=submit]')
 manager.wait_for_function('DogBattleDemo.getState().people.some(p=>p.name.includes("onerror"))')
 assert manager.locator('#people-table img').count()==0
 overlay.screenshot(path=str(OUT/'live-overlay.png'))
 manager.screenshot(path=str(OUT/'live-manager.png'),full_page=True)
 manager.click('#next-round');overlay.wait_for_function('DogBattleDemo.getState().phase==="break"')
 assert overlay.evaluate('DogBattleDemo.getState().history.length')==1
 assert overlay.locator('#king-name').inner_text().startswith('Tuất ')
 overlay.screenshot(path=str(OUT/'live-honor.png'))
 manager.click('[data-tab=history]');assert manager.locator('.history-card').count()==1
 manager.reload(wait_until='networkidle');manager.wait_for_function('DogBattleDemo.getState().history.length===1')
 assert manager.evaluate('DogBattleDemo.getState().config.leftName')=='XÓM VÀNG'
 manager.click('[data-tab=live]');manager.click('#next-round');overlay.wait_for_function('DogBattleDemo.getState().round===2')
 assert overlay.evaluate('DogBattleDemo.getState().boost.right')==0
 # Manager closes: the overlay can continue as sole authority and keep history.
 manager.close();overlay.wait_for_timeout(3400)
 assert overlay.evaluate('JSON.parse(localStorage.getItem("tuat-live-v3:leader")).id===DogBattleDemo.instance')
 assert overlay.evaluate('DogBattleDemo.getState().history.length')==1
 overlay.set_viewport_size({'width':390,'height':844});overlay.screenshot(path=str(OUT/'live-overlay-mobile.png'))
 bounds=overlay.locator('#broadcast').bounding_box();assert abs(bounds['width']-390)<1 and abs(bounds['height']-390*16/9)<1
 # Test the packed manager at phone width, same two files and no external resources.
 mobile=context.new_page();mobile.set_viewport_size({'width':390,'height':844});mobile.goto('http://127.0.0.1:4173/release/two-file-demo/index.html',wait_until='networkidle');assert mobile.evaluate('document.documentElement.scrollWidth')==390
 mobile.screenshot(path=str(OUT/'live-manager-mobile.png'),full_page=True)
 assert not errors,errors
 assert all(url.startswith(('http://127.0.0.1:4173/','data:','blob:')) for url in requests),requests
 report={'status':'PASS','pageErrors':errors,'screens':['manager','setting','overlay 1080x1920','mobile 390x844','honor'],'checks':['two-tab shared state','16 viewers -> 5v5 + queue','5min/2min defaults','real bark decode + fixed rate','support cards affect team damage','tiger and Chinese dragon','pause/resume','save settings -> overlay','execution and resurrection','untrusted names treated as text','honor and history','reload persistence','round reset','leader failover','mobile overflow','packed two-file pages','zero external runtime requests']}
 (OUT/'live-qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=True,indent=2))
 browser.close()
