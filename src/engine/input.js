/**
 * Input.
 *
 * Keyboard, gamepad and touch all resolve into the same analog control set the physics expects.
 * Digital keys are ramped rather than snapped so a keyboard driver still gets progressive steering,
 * which matters a lot once the tyre model is doing real work.
 */

const KEY_MAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "throttle",
  KeyW: "throttle",
  ArrowDown: "brake",
  KeyS: "brake",
  Space: "nitro",
  ShiftLeft: "nitro",
  ShiftRight: "nitro",
  KeyX: "handbrake",
  ControlLeft: "handbrake",
};

export function createInput(target = window) {
  const held = { left: false, right: false, throttle: false, brake: false, nitro: false, handbrake: false };
  const touch = { left: false, right: false, throttle: false, brake: false, nitro: false, handbrake: false };
  const controls = { steer: 0, throttle: 0, brake: 0, nitro: false, handbrake: false, assist: true };
  const listeners = new Map();
  let steerRaw = 0;

  const emit = (name, payload) => {
    for (const handler of listeners.get(name) || []) handler(payload);
  };

  function onKeyDown(event) {
    if (event.repeat) return;
    const action = KEY_MAP[event.code];
    if (action) {
      held[action] = true;
      event.preventDefault();
      return;
    }
    const shortcuts = { KeyP: "pause", Escape: "pause", KeyR: "restart", KeyC: "camera", KeyM: "mute", KeyH: "photo" };
    if (shortcuts[event.code]) emit(shortcuts[event.code]);
  }

  function onKeyUp(event) {
    const action = KEY_MAP[event.code];
    if (action) {
      held[action] = false;
      event.preventDefault();
    }
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", () => {
    for (const key of Object.keys(held)) held[key] = false;
  });

  function bindTouch(root) {
    root.querySelectorAll("[data-control]").forEach((button) => {
      const action = button.dataset.control;
      const press = (event) => {
        touch[action] = true;
        button.classList.add("is-pressed");
        event.preventDefault();
      };
      const release = (event) => {
        touch[action] = false;
        button.classList.remove("is-pressed");
        event.preventDefault();
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });
  }

  function readGamepad() {
    if (!navigator.getGamepads) return null;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return null;
  }

  /** Resolve the frame's controls. Steering ramps toward the demand and springs back when released. */
  function sample(dt) {
    const pad = readGamepad();
    const left = held.left || touch.left;
    const right = held.right || touch.right;
    let demand = (right ? 1 : 0) - (left ? 1 : 0);
    let throttle = held.throttle || touch.throttle ? 1 : 0;
    let brake = held.brake || touch.brake ? 1 : 0;
    let nitro = held.nitro || touch.nitro;
    let handbrake = held.handbrake || touch.handbrake;

    if (pad) {
      const axis = pad.axes[0] || 0;
      if (Math.abs(axis) > 0.08) demand = axis;
      throttle = Math.max(throttle, pad.buttons[7]?.value || 0);
      brake = Math.max(brake, pad.buttons[6]?.value || 0);
      nitro = nitro || Boolean(pad.buttons[0]?.pressed);
      handbrake = handbrake || Boolean(pad.buttons[1]?.pressed);
    }

    // Digital input still gets an analog ramp; the rate falls off with how far we already are.
    const rate = demand === 0 ? 6.2 : 4.4;
    steerRaw += (demand - steerRaw) * Math.min(1, rate * dt);
    if (Math.abs(steerRaw) < 0.002) steerRaw = 0;

    controls.steer = steerRaw;
    controls.throttle = throttle;
    controls.brake = brake;
    controls.nitro = nitro;
    controls.handbrake = handbrake;
    return controls;
  }

  return {
    controls,
    sample,
    bindTouch,
    on(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
    },
    setAssist(value) {
      controls.assist = value;
    },
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
