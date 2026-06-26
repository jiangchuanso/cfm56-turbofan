/**
 * Lectura de teclado normalizada a un estado simple.
 * Soporta WASD + flechas, Shift (turbo) y R (reset, vía callback).
 */
export default class Input {
  constructor() {
    this.state = {
      forward: 0, // -1 .. 1
      steer: 0, // -1 .. 1 (izquierda negativo)
      boost: false,
    };
    this._keys = new Set();
    this._onReset = null;

    this._handleDown = this._handleDown.bind(this);
    this._handleUp = this._handleUp.bind(this);
    window.addEventListener('keydown', this._handleDown);
    window.addEventListener('keyup', this._handleUp);
  }

  onReset(cb) {
    this._onReset = cb;
  }

  _handleDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'r' && this._onReset) this._onReset();
    this._keys.add(k);
    this._recompute();
  }

  _handleUp(e) {
    this._keys.delete(e.key.toLowerCase());
    this._recompute();
  }

  _recompute() {
    const k = this._keys;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const steer = (k.has('a') || k.has('arrowleft') ? 1 : 0) - (k.has('d') || k.has('arrowright') ? 1 : 0);
    this.state.forward = fwd;
    this.state.steer = steer;
    this.state.boost = k.has('shift');
  }

  dispose() {
    window.removeEventListener('keydown', this._handleDown);
    window.removeEventListener('keyup', this._handleUp);
  }
}
