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
banner.textContent = '启动中…正在加载模块';
document.body.appendChild(banner);

function fail(label, err) {
  banner.style.color = '#ff5a5a';
  banner.textContent = `❌ ${label}: ${err?.message || err}\n${err?.stack || ''}`.slice(0, 600);
}
window.addEventListener('error', (e) => fail('error', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => fail('promise', e.reason));

async function boot() {
  banner.textContent = '启动中…正在初始化 Rapier (WASM)';
  await RAPIER.init();
  banner.textContent = '启动中…正在创建三维场景';
  window.experience = new Experience(document.querySelector('#webgl'));
  banner.style.color = '#0f0';
  banner.textContent = '启动成功 — 点击「进入」，使用 W A S D 驾驶';
}

boot().catch((err) => fail('boot', err));
