"""Functional browser QA. Start npm start first; requires Playwright + Chrome."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test/output';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.url))
 page.goto('http://127.0.0.1:4173',wait_until='networkidle')
 page.wait_for_function('window.DogBattle && DogBattle.getState().loaded')
 state=lambda:page.evaluate('DogBattle.getState()')
 assert len(state()['models'])==7 and len(state()['units'])==10
 assert not page.locator('#capture-start').is_visible()
 page.click('#bark');page.wait_for_function('DogBattle.getState().audio.ready')
 assert state()['hp']['blue']==972
 page.click('#sound');assert state()['audio']['muted']
 assert not page.evaluate("DogBattle.enqueueEvent({id:'invalid',team:'other',type:'bark'})")
 page.click('[data-event=tiger]');page.click('[data-event=dragon]')
 assert len([u for u in state()['units'] if u['id'] in ['tiger','dragon']])==2
 page.wait_for_timeout(600);page.screenshot(path=str(OUT/'beasts.png'),full_page=True)
 for id in ['shiba','husky','pug','becgie','corgi','tiger','dragon']:
  page.click('[data-id='+id+']');assert state()['hero']==id
  page.click('[data-clip=walk]');page.wait_for_timeout(150)
  page.click('[data-clip=attack]');page.wait_for_timeout(300)
  if id in ['tiger','dragon']:page.screenshot(path=str(OUT/(id+'-inspect.png')),full_page=True)
 page.click('#back-battle');page.click('#reset');assert state()['hp']=={'red':1000,'blue':1000}
 page.click('#start');page.wait_for_timeout(1800);assert state()['remaining']<89
 page.click('#start');t=state()['remaining'];page.wait_for_timeout(400);assert state()['remaining']==t
 page.click('#reset')
 assert page.evaluate("DogBattle.enqueueEvent({id:'test-evolution',team:'red',type:'tiger'})")
 assert not page.evaluate("DogBattle.enqueueEvent({id:'test-evolution',team:'red',type:'tiger'})")
 # Finish an actual match via accepted player events, then ensure it locks and resets.
 for i in range(90):
  if state()['ended']:break
  page.evaluate("id=>DogBattle.enqueueEvent({id,team:'red',type:'bark'})",str(i))
  page.wait_for_timeout(365)
 assert state()['ended'] and state()['hp']['blue']==0
 assert not page.evaluate("DogBattle.enqueueEvent({id:'after-end',team:'blue',type:'bark'})")
 page.click('#reset');assert not state()['ended'] and state()['hp']['blue']==1000
 page.screenshot(path=str(OUT/'studio.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth')==390
 page.screenshot(path=str(OUT/'mobile-390.png'),full_page=True)
 page.set_viewport_size({'width':1080,'height':1920})
 page.goto('http://127.0.0.1:4173/?capture=1',wait_until='networkidle');page.wait_for_function('DogBattle.getState().loaded')
 bounds=page.locator('.portrait').bounding_box();assert bounds['width']==1080 and bounds['height']==1920
 assert page.locator('#capture-start').is_visible()
 page.click('#capture-start');page.wait_for_timeout(200);assert state()['running']
 page.click('#capture-start');assert not state()['running']
 page.screenshot(path=str(OUT/'capture-1080x1920.png'))
 assert not errors,errors
 assert all(u.startswith(('http://127.0.0.1:4173/','blob:','data:')) for u in requests),requests
 report={'browser':'Chrome / Playwright','pageErrors':errors,'runtimeExternalRequests':0,'models':7,'units':10,'viewports':[[1440,1100],[390,844],[1080,1920]],'checks':['load','bark and audio decode','mute','7 model previews and animations','evolution','timer and pause','deduplicate event','invalid event','win and lock','reset','mobile overflow','capture exact dimensions','capture start and pause'],'status':'PASS','finalState':state()}
 (OUT/'qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:v for k,v in report.items() if k!='finalState'},ensure_ascii=True,indent=2))
 browser.close()
