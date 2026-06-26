import './style.css';
import RAPIER from '@dimforge/rapier3d-compat';
import Experience from './experience/Experience.js';

/* ============================================================
   Banner de diagnóstico (temporal) — visible SIEMPRE, incluso
   si algo revienta durante el arranque. Si todo va bien, mostrará
   "BOOT OK". Si falla, mostrará el error en rojo.
   ============================================================ */
const banner = document.createElement('div');
banner.style.cssText =
  'position:fixed;top:0;left:0;right:0;z-index:99999;' +
  'font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,.85);' +
  'padding:6px 10px;white-space:pre-wrap;pointer-events:none';
banner.textContent = 'BOOT… cargando módulos';
document.body.appendChild(banner);

function fail(label, err) {
  banner.style.color = '#ff5a5a';
  banner.textContent = `❌ ${label}: ${err?.message || err}\n${err?.stack || ''}`.slice(0, 600);
}
window.addEventListener('error', (e) => fail('error', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => fail('promise', e.reason));

async function boot() {
  banner.textContent = 'BOOT… inicializando Rapier (WASM)';
  await RAPIER.init();
  banner.textContent = 'BOOT… creando experiencia 3D';
  window.experience = new Experience(document.querySelector('#webgl'));
  banner.style.color = '#0f0';
  banner.textContent = 'BOOT OK — pulsa ENTRAR y conduce con W A S D';
}

boot().catch((err) => fail('boot', err));
