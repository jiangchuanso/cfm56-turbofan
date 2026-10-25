"""Captura determinista de la web CFM56 (scroll-driven) a fotogramas PNG.
Tiempo virtual: parchea performance.now/Date.now/rAF para avanzar el reloj
exactamente 1/FPS por fotograma -> video fluido aunque el render sea lento."""
import sys, os, math, pathlib
from playwright.sync_api import sync_playwright

PROBE = '--probe' in sys.argv
FPS = 30
W, H = 1920, 1080
OUT = pathlib.Path('/tmp/cfm56/frames')
# 本地预览/截帧所用的静态服务器地址，默认与 README 的
# `python3 -m http.server 8000` 一致；可用环境变量 CFM56_URL 覆盖。
BASE_URL = os.environ.get('CFM56_URL', 'http://localhost:8000')

VIRTUAL_TIME = """
(() => {
  let t = 0; let cbs = [];
  const realRaf = window.requestAnimationFrame.bind(window);
  window.__vnow = () => t;
  performance.now = () => t;
  Date.now = () => 1750000000000 + t;
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = (id) => { cbs[id-1] = null; };
  window.__tick = (dt) => {
    t += dt;
    const cur = cbs; cbs = [];
    for (const cb of cur) if (cb) { try { cb(t); } catch(e) {} }
    return cur.length;
  };
})();
"""

# guion de scroll: [fracción del tiempo, fracción del scroll] con holds
KEYS = [
    (0.00, 0.000),  # hero
    (0.05, 0.000),  # hold 5%
    (0.92, 1.000),  # recorrido completo del stage (la página ya coreografía)
    (1.00, 1.000),  # hold final
]
def scroll_frac(p):
    for i in range(len(KEYS)-1):
        t0, s0 = KEYS[i]; t1, s1 = KEYS[i+1]
        if t0 <= p <= t1:
            u = 0 if t1 == t0 else (p - t0) / (t1 - t0)
            u = u*u*(3-2*u)  # smoothstep por tramo
            return s0 + (s1 - s0) * u
    return 1.0

DUR = 52  # segundos
TOTAL = DUR * FPS

with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-unsafe-swiftshader', '--hide-scrollbars'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    pg.add_init_script(VIRTUAL_TIME)

    loaded = {'obj': False, 'hdr': False}
    pg.on('response', lambda r: loaded.update(
        obj=loaded['obj'] or 'plane.obj' in r.url,
        hdr=loaded['hdr'] or 'sky.hdr' in r.url))

    pg.goto(f'{BASE_URL}/index.html', wait_until='networkidle', timeout=60000)
    pg.add_style_tag(content='::-webkit-scrollbar{display:none!important} html{scrollbar-width:none}')

    # dejar que cargue todo: tick hasta ver obj+hdr y unos frames de asentamiento
    for _ in range(300):
        pg.evaluate('window.__tick(33.34)')
        if loaded['obj'] and loaded['hdr']:
            break
    for _ in range(60):
        pg.evaluate('window.__tick(33.34)')
    print('assets:', loaded)

    maxscroll = pg.evaluate('document.documentElement.scrollHeight - window.innerHeight')
    print('maxscroll:', maxscroll)

    if PROBE:
        idxs = [int(TOTAL*f) for f in (0, .12, .25, .38, .5, .62, .75, .88, .97)]
    else:
        idxs = range(TOTAL)

    for n, i in enumerate(idxs):
        frac = scroll_frac(i / TOTAL)
        y = int(maxscroll * frac)
        pg.evaluate(f"window.scrollTo({{top:{y}, behavior:'instant'}}); window.__tick(33.34)")
        name = f'probe-{n}.png' if PROBE else f'f{i:05d}.png'
        pg.screenshot(path=str(OUT / name))
        if not PROBE and i % 150 == 0:
            print(f'{i}/{TOTAL}', flush=True)
    b.close()
print('DONE')
