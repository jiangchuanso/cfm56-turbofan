import { animate, createTimeline, stagger } from 'animejs';

/**
 * Toda la UI 2D dirigida con anime.js v4:
 *  - Secuencia de intro (timeline).
 *  - Aparición del HUD al entrar.
 *  - Velocímetro.
 *  - Panel de proyecto que entra/sale al acercarse a un portal.
 *
 * Nota: los elementos centrados con Tailwind (`-translate-x-1/2`) se animan
 * solo en opacidad para no pisar su `transform`.
 */
export default class Interface {
  constructor() {
    this.intro = document.querySelector('#intro');
    this.speedEl = document.querySelector('#speed-val');
    this.panel = document.querySelector('#project');
    this.panelTitle = document.querySelector('#project-title');
    this.panelTag = document.querySelector('#project-tag');
    this.panelDesc = document.querySelector('#project-desc');
    this.panelTags = document.querySelector('#project-tags');

    this.started = false;
    this.onStart = null;
    this._panelVisible = false;

    this._introSequence();
    document.querySelector('#intro-btn').addEventListener('click', () => this._dismiss());
  }

  _introSequence() {
    createTimeline({ defaults: { ease: 'outExpo' } })
      .add('#intro-title', { opacity: [0, 1], translateY: [40, 0], scale: [0.9, 1], duration: 900 }, 100)
      .add('#intro-eyebrow', { opacity: [0, 1], translateY: [-10, 0], duration: 700 }, '-=600')
      .add('#intro-sub', { opacity: [0, 1], translateY: [16, 0], duration: 700 }, '-=400')
      .add('#intro-btn', { opacity: [0, 1], translateY: [16, 0], duration: 700 }, '-=400');
  }

  _dismiss() {
    if (this.started) return;
    this.started = true;

    animate('#intro', {
      opacity: [1, 0],
      duration: 700,
      ease: 'inOutQuad',
      onComplete: () => {
        this.intro.style.display = 'none';
        this.intro.style.pointerEvents = 'none';
      },
    });

    // Aparece el HUD
    animate('#hud-brand', { opacity: [0, 1], translateY: [-12, 0], duration: 700, ease: 'outExpo', delay: 200 });
    animate('#hud-speed', { opacity: [0, 1], translateY: [12, 0], duration: 700, ease: 'outExpo', delay: 350 });
    animate('#hud-controls', { opacity: [0, 1], duration: 700, ease: 'outExpo', delay: 500 });

    if (this.onStart) this.onStart();
  }

  setSpeed(kmh) {
    this.speedEl.textContent = Math.max(0, Math.round(kmh));
  }

  showProject(data) {
    this.panelTag.textContent = data.tag;
    this.panelTitle.textContent = data.title;
    this.panelDesc.textContent = data.desc;
    this.panelTags.innerHTML = data.tags
      .map((t) => `<span class="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">${t}</span>`)
      .join('');

    this._panelVisible = true;
    animate('#project', {
      opacity: [0, 1],
      translateX: [40, 0],
      duration: 600,
      ease: 'outExpo',
    });
    animate('#project-tags span', {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(60, { start: 150 }),
      duration: 500,
      ease: 'outExpo',
    });
  }

  hideProject() {
    if (!this._panelVisible) return;
    this._panelVisible = false;
    animate('#project', {
      opacity: [1, 0],
      translateX: [0, 40],
      duration: 400,
      ease: 'inQuad',
    });
  }
}
