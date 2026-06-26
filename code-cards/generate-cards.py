"""Tarjetas de código (PNG 1080px) para los comentarios del post LinkedIn CFM56.
Estilo: tema oscuro + verde de marca #00ff87. Render: pygments -> HTML -> Playwright."""
import pathlib
from pygments import highlight
from pygments.lexers import JavascriptLexer
from pygments.formatters import HtmlFormatter
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).parent
FORMATTER = HtmlFormatter(style='github-dark', nowrap=True)

CARDS = [
    {
        "slug": "1-orbitcontrols",
        "title": "Gira el motor sin dejar de scrollear",
        "file": "script.js — OrbitControls",
        "code": """/* ---------- OrbitControls (mouse / touch) ---------- */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping  = true;
controls.dampingFactor  = 0.08;
controls.enableZoom     = false;  // la rueda sigue scrolleando la página
controls.enablePan      = false;
controls.rotateSpeed    = 0.55;
controls.autoRotate      = false; // se activa al terminar el acercamiento
controls.autoRotateSpeed = 0.6;   // giro lento y cinematográfico

// No bloquear el scroll mientras el usuario rota el motor
canvas.addEventListener('wheel', e => { /* let it bubble */ },
  { passive: true });""",
    },
    {
        "slug": "2-alabes",
        "title": "24 álabes: 8 vértices y 12 triángulos por pala",
        "file": "script.js — buildFanBlades()",
        "code": """const bladeGeo = new THREE.BufferGeometry();
bladeGeo.setAttribute('position', new THREE.BufferAttribute(
  new Float32Array([
    -rc, 0,  t,   rc, 0,  t,   tc, span,  t,   -tc, span,  t, // dorso
    -rc, 0, -t,   rc, 0, -t,   tc, span, -t,   -tc, span, -t, // intradós
  ]), 3));
bladeGeo.setIndex([ /* 12 triángulos */
  0, 1, 2, 0, 2, 3,   4, 6, 5, 4, 7, 6,   0, 3, 7, 0, 7, 4,
  1, 5, 6, 1, 6, 2,   0, 4, 5, 0, 5, 1,   3, 2, 6, 3, 6, 7,
]);
bladeGeo.computeVertexNormals();

for (let i = 0; i < count; i++) {
  const holder = new THREE.Object3D();
  blade.rotation.y = -0.42;                     // torsión del álabe
  holder.rotation.x = (i / count) * Math.PI * 2; // reparto radial
  group.add(holder);
}""",
    },
    {
        "slug": "3-coreografia",
        "title": "1100vh de scroll → un progreso maestro 0→1",
        "file": "script.js — updateEngineScroll()",
        "code": """/* mt 0.00–0.26  despiece
   mt 0.26–0.32  mantener despiezado
   mt 0.32–0.55  recompactar + recolorear técnico→realista
   mt 0.55–0.62  compacto y realista (motor en marcha)
   mt 0.62–1.00  el motor encoge → aparece el avión volando */
const range = rect.height - vh;
const mt = range > 0 ? clamp01(-stageTop / range) : 0;

let explodeAmount, realism;
if (mt < 0.26)      { explodeAmount = mt / 0.26;  realism = 0; }
else if (mt < 0.32) { explodeAmount = 1;          realism = 0; }
else if (mt < 0.55) { const k = (mt - 0.32) / 0.23;
                      explodeAmount = 1 - k;      realism = k; }
else                { explodeAmount = 0;          realism = 1; }""",
    },
    {
        "slug": "4-tiempo-virtual",
        "title": "El truco del vídeo: tiempo virtual a 30fps exactos",
        "file": "capture-video.py — inyectado en Chromium headless",
        "code": """// El reloj de la página avanza 1/30s por fotograma capturado
let t = 0; let cbs = [];
performance.now = () => t;
Date.now = () => 1750000000000 + t;
window.requestAnimationFrame = (cb) => {
  cbs.push(cb); return cbs.length;
};
window.__tick = (dt) => {
  t += dt;                    // da igual lo que tarde el render:
  const cur = cbs; cbs = [];  // el vídeo sale a 30fps clavados
  for (const cb of cur) if (cb) cb(t);
};""",
    },
]

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>
{pygments_css}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ width: 1080px; background: #07090d; font-family: 'Segoe UI', system-ui, sans-serif; }}
.card {{ padding: 56px 60px; }}
.window {{
  background: #0d1117; border: 1px solid #1d242e; border-radius: 18px;
  box-shadow: 0 0 0 1px rgba(0,255,135,.08), 0 24px 60px rgba(0,0,0,.6),
              0 0 90px rgba(0,255,135,.07); overflow: hidden;
}}
.titlebar {{
  display: flex; align-items: center; gap: 10px;
  padding: 18px 24px; border-bottom: 1px solid #1d242e; background: #0a0e13;
}}
.dot {{ width: 14px; height: 14px; border-radius: 50%; }}
.filename {{ margin-left: 10px; color: #8b949e; font: 17px/1 'Cascadia Code', 'Consolas', monospace; }}
.code {{ padding: 30px 34px; }}
.code pre {{
  font: 21px/1.62 'Cascadia Code', 'Consolas', monospace;
  color: #e6edf3; white-space: pre; overflow: hidden;
}}
.heading {{ display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }}
.bar {{ width: 7px; height: 44px; border-radius: 4px; background: #00ff87; box-shadow: 0 0 18px rgba(0,255,135,.55); }}
h1 {{ color: #f0f6fc; font-size: 33px; font-weight: 650; letter-spacing: -.3px; }}
.footer {{ margin-top: 26px; display: flex; justify-content: space-between; align-items: center; }}
.brand {{ color: #00ff87; font: 600 19px 'Segoe UI', sans-serif; letter-spacing: .4px; }}
.tag {{ color: #8b949e; font: 17px 'Cascadia Code', 'Consolas', monospace; }}
</style></head><body>
<div class="card">
  <div class="heading"><div class="bar"></div><h1>{title}</h1></div>
  <div class="window">
    <div class="titlebar">
      <div class="dot" style="background:#ff5f56"></div>
      <div class="dot" style="background:#ffbd2e"></div>
      <div class="dot" style="background:#27c93f"></div>
      <div class="filename">{file}</div>
    </div>
    <div class="code"><pre>{code_html}</pre></div>
  </div>
  <div class="footer"><div class="brand">gonzalfred.com</div><div class="tag">CFM56-7B · Three.js · 100% procedural</div></div>
</div>
</body></html>"""

pygments_css = HtmlFormatter(style='github-dark').get_style_defs()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=2)
    for card in CARDS:
        code_html = highlight(card["code"], JavascriptLexer(), FORMATTER)
        page.set_content(PAGE.format(pygments_css=pygments_css, title=card["title"],
                                     file=card["file"], code_html=code_html))
        page.wait_for_timeout(150)
        out = OUT / f"card-{card['slug']}.png"
        page.locator(".card").screenshot(path=str(out))
        print(f"OK {out.name}")
    browser.close()
