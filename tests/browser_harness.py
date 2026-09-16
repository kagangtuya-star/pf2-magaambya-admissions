"""DOM/WebGL fixture runner. Does not modify browser or network policy.
Pages run at about:blank; only the local server is forwarded by the runner.
The in-memory Storage substitutes below are test doubles, not persistence tests.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright
import json, os
ORIGIN=os.environ.get('TEST_ORIGIN','http://127.0.0.1:3107')
ROOT=Path(__file__).resolve().parents[1]

def local_route(route):
 req=route.request
 if not req.url.startswith(ORIGIN+'/'):return route.abort()
 if req.method=='OPTIONS':return route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'})
 headers={k:v for k,v in req.headers.items() if k.lower() in ('authorization','content-type')}
 request=Request(req.url,data=req.post_data.encode() if req.post_data is not None else None,headers=headers,method=req.method)
 try:response=urlopen(request)
 except HTTPError as e:response=e
 route.fulfill(status=response.status,body=response.read(),headers={'Content-Type':response.headers.get('Content-Type','text/plain'),'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'})

def open_fixture(browser,width=1440,height=1000,flat=True,admin=False):
 page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
 page.set_default_timeout(6000)
 if os.environ.get('LIVE_BROWSER')=='1':
  page.add_init_script("localStorage.setItem('raincourt:preferences',JSON.stringify({flat:"+str(flat).lower()+",reduced:true}));")
  page.goto(ORIGIN+('/admin' if admin else '/'),wait_until='networkidle')
  return page
 page.route('**/*',local_route)
 page.goto('about:blank')
 page.evaluate('''(flat)=>{class MemoryStorage {constructor(){this.values=new Map()}getItem(k){return this.values.get(String(k))??null}setItem(k,v){this.values.set(String(k),String(v))}removeItem(k){this.values.delete(String(k))}clear(){this.values.clear()}get length(){return this.values.size}key(i){return [...this.values.keys()][i]??null}}Object.defineProperty(window,'localStorage',{value:new MemoryStorage()});Object.defineProperty(window,'sessionStorage',{value:new MemoryStorage()});localStorage.setItem('raincourt:preferences',JSON.stringify({flat,reduced:true}));}''',flat)
 html=(ROOT/'web/index.html').read_text(encoding='utf-8').replace('<head>','<head><base href="'+ORIGIN+'/">')
 if admin:html=html.replace('<script type="module" src="/app.js"></script>', '<script type="module">import {initDialog} from "'+ORIGIN+'/lib/dom.js";import {mount} from "'+ORIGIN+'/admin.js";initDialog();mount();</script>')
 page.set_content(html,wait_until='networkidle')
 page.wait_for_timeout(200)
 return page

if __name__=='__main__':
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None),headless=True,args=['--no-sandbox'])
  page=open_fixture(browser)
  print(page.locator('body').inner_text()[:1000])
  page.screenshot(path=str(ROOT/'previews/home-desktop.png'))
  page=open_fixture(browser,390,844)
  page.screenshot(path=str(ROOT/'previews/home-mobile.png'))
  browser.close()
