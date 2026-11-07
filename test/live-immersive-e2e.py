from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test/output';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 cx=b.new_context(viewport={'width':1500,'height':1100});errors=[];requests=[]
 cx.on('page',lambda pg:pg.on('pageerror',lambda e:errors.append(str(e))))
 cx.on('request',lambda r:requests.append(r.url))
 m=cx.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
 m.goto('http://127.0.0.1:4173/',wait_until='networkidle')
 m.click('#seed-demo');m.wait_for_function('DogBattleDemo.getState().people.length===16')
 assert m.evaluate('DogBattleDemo.getState().config.roundSeconds')==300
 assert m.evaluate('DogBattleDemo.getState().config.breakSeconds')==120
 m.click('#start-round');m.wait_for_function('DogBattleDemo.getState().phase==="battle"')
 o=cx.new_page();o.set_viewport_size({'width':1080,'height':1920})
 o.goto('http://127.0.0.1:4173/overlay.html',wait_until='networkidle');o.wait_for_function('DogBattleDemo.renderInfo()?.ready',timeout=30000)
 o.wait_for_function('DogBattleDemo.renderInfo().units===10&&DogBattleDemo.renderInfo().spectators===6')
 assert o.evaluate('DogBattleDemo.renderInfo().roof.leftRatio')==.5
 assert o.locator('canvas').bounding_box()['width']==1080 and o.locator('canvas').bounding_box()['height']==1920
 assert o.locator('.play-layout,.live-header,.live-score,.bench,.honor,.howto,.gift-menu').count()==0
 o.click('#overlay-audio');o.wait_for_function('DogBattleDemo.audioInfo().decoded');assert o.evaluate('DogBattleDemo.audioInfo().playbackRate')==1
 m.bring_to_front();m.click('[data-gift=execute]');o.wait_for_function('DogBattleDemo.renderInfo().roof.leftRatio>.5')
 m.select_option('#gift-team','right');m.click('[data-gift=revive]');o.wait_for_function('DogBattleDemo.getState().fighters.filter(f=>f.team==="right").every(f=>f.hp>0)')
 left=m.evaluate('DogBattleDemo.getState().fighters.filter(f=>f.team==="left")')
 m.bring_to_front();m.select_option('#event-person',left[0]['id']);m.select_option('#gift-team','left');m.click('[data-gift=tiger]')
 m.select_option('#event-person',left[1]['id']);m.click('[data-gift=dragon]')
 o.wait_for_function('DogBattleDemo.renderInfo().forms.includes("dragon")&&DogBattleDemo.renderInfo().forms.includes("tiger")')
 o.screenshot(path=str(OUT/'immersive-overlay.png'))
 m.click('#pause-round');o.wait_for_function('DogBattleDemo.getState().paused')
 o.wait_for_function('Math.abs(DogBattleDemo.renderInfo().roof.leftRatio-DogBattleDemo.getState().fighters.filter(f=>f.team==="left").reduce((n,f)=>n+f.hp,0)/DogBattleDemo.getState().fighters.reduce((n,f)=>n+f.hp,0))<0.000001')
 before=o.evaluate('DogBattleDemo.renderInfo().roof.clock');o.wait_for_timeout(450);assert o.evaluate('DogBattleDemo.renderInfo().roof.clock')==before
 m.bring_to_front();m.click('[data-tab=settings]')
 iframe=m.frame_locator('#model-viewer');iframe.locator('canvas').wait_for()
 viewer=next(f for f in m.frames if 'model=' in f.url)
 viewer.wait_for_function('DogBattleDemo.renderInfo()?.ready')
 for model in ['shiba','husky','pug','becgie','corgi','tiger','dragon']:
  m.click('[data-model='+model+']');viewer.wait_for_function('id=>DogBattleDemo.renderInfo().inspector===id',arg=model)
  assert viewer.evaluate('DogBattleDemo.renderInfo().units')==1
 m.click('[data-model-clip=attack]');viewer.wait_for_function('DogBattleDemo.renderInfo().previewClip==="attack"')
 m.click('[data-model-clip=dead]');viewer.wait_for_function('DogBattleDemo.renderInfo().previewClip==="dead"')
 m.click('[data-model-clip=idle]');viewer.wait_for_function('DogBattleDemo.renderInfo().previewClip==="idle"')
 m.select_option('[name=model-left-0]','dragon');m.select_option('[name=model-right-0]','tiger')
 m.fill('[name=leftName]','XÓM VÀNG');m.click('#settings-form button[type=submit]')
 o.wait_for_function('DogBattleDemo.getState().config.modelsLeft[0]==="dragon"')
 assert o.evaluate('DogBattleDemo.getState().config.modelsRight[0]')=='tiger'
 m.locator('.model-studio').screenshot(path=str(OUT/'setting-models.png'))
 m.click('[data-tab=live]');m.click('#next-round')
 o.wait_for_function('DogBattleDemo.getState().phase==="break"&&DogBattleDemo.renderInfo().units===0')
 assert o.evaluate('DogBattleDemo.renderInfo().spectators')==16
 assert o.evaluate('DogBattleDemo.getState().history.length')==1
 o.screenshot(path=str(OUT/'immersive-break.png'))
 m.click('#next-round');o.wait_for_function('DogBattleDemo.getState().round===2&&DogBattleDemo.renderInfo().units===10')
 assert o.evaluate('DogBattleDemo.getState().fighters.find(f=>f.team==="left"&&f.slot===0).form')=='dragon'
 assert o.evaluate('DogBattleDemo.getState().fighters.find(f=>f.team==="right"&&f.slot===0).form')=='tiger'
 m.reload(wait_until='networkidle');m.wait_for_function('DogBattleDemo.getState().history.length===1')
 assert m.evaluate('DogBattleDemo.getState().config.modelsLeft[0]')=='dragon'
 o.set_viewport_size({'width':390,'height':844});o.screenshot(path=str(OUT/'immersive-mobile.png'))
 bounds=o.locator('#broadcast').bounding_box();assert abs(bounds['width']-390)<1 and abs(bounds['height']-390*16/9)<1
 m.close(run_before_unload=True);o.bring_to_front();o.wait_for_function('JSON.parse(localStorage.getItem("tuat-live-v3:leader"))?.id===DogBattleDemo.instance',timeout=12500)
 assert not errors,errors
 assert all(u.startswith(('http://127.0.0.1:4173/','data:','blob:')) for u in requests),requests
 report={'status':'PASS','pageErrors':errors,'checks':['full canvas 1080x1920','no dashboard panels on overlay','10 battle dogs + 6 physical spectators','roof clock and half/half bar','bar follows HP and winner criterion','5min/2min defaults','real bark at original rate','execute/revive','tiger and Chinese dragon in arena','pause freezes roof clock','7 live 3D models in Setting','attack/death/idle model preview','save left/right model lineup','apply lineup next round','spectators move outside during break','history and settings survive reload','mobile fit','leader failover','no external runtime requests']}
 (OUT/'immersive-qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=True,indent=2));b.close()
