/**
 * Audio engine.
 *
 * Everything is synthesised with Web Audio - there are no sample files to download. The engine is a
 * stack of harmonics tied to live RPM, coloured per car (a flat-plane V8 growls where a V10 wails),
 * with turbo spool, blow-off, tyre squeal, wind, sirens, impacts and UI blips layered on top.
 */

const NOISE_SECONDS = 2;

function noiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Short synthetic impulse response - enough to put the exhaust in a street rather than a void. */
function impulseBuffer(ctx, seconds = 0.7, decay = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

/** Cylinder count inferred from the roster's engine description, for the firing frequency. */
function cylinderCount(engineText = "") {
  const text = engineText.toLowerCase();
  if (text.includes("v10")) return 10;
  if (text.includes("v8")) return 8;
  if (text.includes("v6")) return 6;
  if (text.includes("flat-six") || text.includes("inline-six")) return 6;
  if (text.includes("v12")) return 12;
  return 6;
}

export function createAudioEngine() {
  let ctx = null;
  let ready = false;
  let muted = false;
  let profile = null;
  let cylinders = 6;

  const nodes = {};

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();

    nodes.master = ctx.createGain();
    nodes.master.gain.value = muted ? 0 : 0.9;
    nodes.limiter = ctx.createDynamicsCompressor();
    nodes.limiter.threshold.value = -8;
    nodes.limiter.knee.value = 6;
    nodes.limiter.ratio.value = 8;
    nodes.limiter.connect(nodes.master);
    nodes.master.connect(ctx.destination);

    nodes.reverb = ctx.createConvolver();
    nodes.reverb.buffer = impulseBuffer(ctx);
    nodes.reverbGain = ctx.createGain();
    nodes.reverbGain.gain.value = 0.16;
    nodes.reverb.connect(nodes.reverbGain);
    nodes.reverbGain.connect(nodes.limiter);

    nodes.noise = noiseBuffer(ctx);

    // --- engine stack -------------------------------------------------------
    nodes.engineGain = ctx.createGain();
    nodes.engineGain.gain.value = 0.0001;
    nodes.engineFilter = ctx.createBiquadFilter();
    nodes.engineFilter.type = "lowpass";
    nodes.engineFilter.frequency.value = 900;
    nodes.engineFilter.Q.value = 3.2;
    nodes.engineFilter.connect(nodes.engineGain);
    nodes.engineGain.connect(nodes.limiter);
    nodes.engineGain.connect(nodes.reverb);
    nodes.oscillators = [];

    // Induction/exhaust growl: filtered noise that tracks the same firing frequency.
    nodes.growl = ctx.createBufferSource();
    nodes.growl.buffer = nodes.noise;
    nodes.growl.loop = true;
    nodes.growlFilter = ctx.createBiquadFilter();
    nodes.growlFilter.type = "bandpass";
    nodes.growlFilter.Q.value = 2.4;
    nodes.growlGain = ctx.createGain();
    nodes.growlGain.gain.value = 0.0001;
    nodes.growl.connect(nodes.growlFilter);
    nodes.growlFilter.connect(nodes.growlGain);
    nodes.growlGain.connect(nodes.limiter);
    nodes.growl.start();

    // --- turbo --------------------------------------------------------------
    nodes.turbo = ctx.createOscillator();
    nodes.turbo.type = "sine";
    nodes.turboGain = ctx.createGain();
    nodes.turboGain.gain.value = 0.0001;
    nodes.turbo.connect(nodes.turboGain);
    nodes.turboGain.connect(nodes.limiter);
    nodes.turbo.start();

    // --- tyres --------------------------------------------------------------
    nodes.tyre = ctx.createBufferSource();
    nodes.tyre.buffer = nodes.noise;
    nodes.tyre.loop = true;
    nodes.tyreFilter = ctx.createBiquadFilter();
    nodes.tyreFilter.type = "bandpass";
    nodes.tyreFilter.frequency.value = 1250;
    nodes.tyreFilter.Q.value = 7;
    nodes.tyreGain = ctx.createGain();
    nodes.tyreGain.gain.value = 0.0001;
    nodes.tyre.connect(nodes.tyreFilter);
    nodes.tyreFilter.connect(nodes.tyreGain);
    nodes.tyreGain.connect(nodes.limiter);
    nodes.tyre.start();

    // --- wind ---------------------------------------------------------------
    nodes.wind = ctx.createBufferSource();
    nodes.wind.buffer = nodes.noise;
    nodes.wind.loop = true;
    nodes.windFilter = ctx.createBiquadFilter();
    nodes.windFilter.type = "highpass";
    nodes.windFilter.frequency.value = 900;
    nodes.windGain = ctx.createGain();
    nodes.windGain.gain.value = 0.0001;
    nodes.wind.connect(nodes.windFilter);
    nodes.windFilter.connect(nodes.windGain);
    nodes.windGain.connect(nodes.limiter);
    nodes.wind.start();

    // --- siren --------------------------------------------------------------
    nodes.sirenA = ctx.createOscillator();
    nodes.sirenA.type = "square";
    nodes.sirenA.frequency.value = 620;
    nodes.sirenGain = ctx.createGain();
    nodes.sirenGain.gain.value = 0.0001;
    nodes.sirenA.connect(nodes.sirenGain);
    nodes.sirenGain.connect(nodes.reverb);
    nodes.sirenGain.connect(nodes.limiter);
    nodes.sirenA.start();

    ready = true;
    if (profile) buildOscillators();
    return ctx;
  }

  function buildOscillators() {
    if (!ctx) return;
    for (const osc of nodes.oscillators) {
      try {
        osc.node.stop();
      } catch {
        // Already stopped - nothing to clean up.
      }
      osc.node.disconnect();
      osc.gain.disconnect();
    }
    nodes.oscillators = [];
    const harmonics = profile?.harmonics || [1, 0.5, 0.3];
    harmonics.forEach((weight, index) => {
      const node = ctx.createOscillator();
      node.type = index === 0 ? profile?.type || "sawtooth" : index % 2 ? "square" : "sawtooth";
      const gain = ctx.createGain();
      gain.gain.value = weight * 0.24;
      node.connect(gain);
      gain.connect(nodes.engineFilter);
      node.start();
      nodes.oscillators.push({ node, gain, ratio: index + 1, weight });
    });
  }

  function setCar(car) {
    profile = car?.audio || null;
    cylinders = cylinderCount(car?.engine);
    if (ready) buildOscillators();
  }

  function ramp(param, value, time = 0.06) {
    if (!ctx) return;
    param.setTargetAtTime(Math.max(0.0001, value), ctx.currentTime, time);
  }

  /**
   * Per-frame mix. `load` is throttle demand, `slip` is how far past the tyre's peak the car is,
   * `pursuit` fades the siren in with the chase.
   */
  function update(telemetry) {
    if (!ready || muted || !ctx) return;
    const {
      rpm = 900,
      redline = 7500,
      load = 0,
      speed = 0,
      slip = 0,
      nitro = 0,
      pursuit = 0,
      paused = false,
    } = telemetry;

    if (paused) {
      ramp(nodes.engineGain.gain, 0.0001, 0.08);
      ramp(nodes.windGain.gain, 0.0001, 0.08);
      ramp(nodes.tyreGain.gain, 0.0001, 0.08);
      ramp(nodes.sirenGain.gain, 0.0001, 0.08);
      ramp(nodes.growlGain.gain, 0.0001, 0.08);
      ramp(nodes.turboGain.gain, 0.0001, 0.08);
      return;
    }

    const firing = (rpm / 60) * (cylinders / 2);
    const rev = Math.min(1.05, rpm / redline);
    for (const osc of nodes.oscillators) {
      ramp(osc.node.frequency, Math.min(9000, firing * osc.ratio), 0.03);
    }
    ramp(nodes.engineFilter.frequency, (profile?.cutoff || 1200) * (0.35 + rev * 1.5) + speed * 4, 0.05);
    ramp(nodes.engineGain.gain, 0.035 + load * 0.055 + rev * 0.05 + nitro * 0.03, 0.05);

    ramp(nodes.growlFilter.frequency, 90 + firing * 1.6, 0.05);
    ramp(nodes.growlGain.gain, (profile?.growl || 0.4) * (0.012 + load * 0.05 + rev * 0.03), 0.06);

    const turbo = profile?.turbo || 0;
    ramp(nodes.turbo.frequency, 1800 + rev * 6200, 0.08);
    ramp(nodes.turboGain.gain, turbo * (0.004 + load * rev * 0.026), 0.08);

    ramp(nodes.tyreFilter.frequency, 900 + slip * 900, 0.06);
    ramp(nodes.tyreGain.gain, Math.min(0.14, slip * 0.16), 0.05);

    ramp(nodes.windFilter.frequency, 500 + speed * 16, 0.1);
    ramp(nodes.windGain.gain, Math.min(0.09, (speed / 90) ** 2 * 0.1), 0.1);

    if (pursuit > 0.02) {
      const wail = Math.sin(ctx.currentTime * 5.2) * 0.5 + 0.5;
      ramp(nodes.sirenA.frequency, 560 + wail * 380, 0.04);
      ramp(nodes.sirenGain.gain, Math.min(0.05, pursuit * 0.06), 0.12);
    } else {
      ramp(nodes.sirenGain.gain, 0.0001, 0.2);
    }
  }

  /** One-shot helper: a filtered noise burst with an exponential tail. */
  function burst({ gain = 0.3, duration = 0.25, type = "lowpass", frequency = 900, Q = 1 }) {
    if (!ready || muted || !ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = nodes.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(nodes.limiter);
    envelope.connect(nodes.reverb);
    source.start();
    source.stop(ctx.currentTime + duration + 0.05);
  }

  function tone({ frequency = 440, to = null, gain = 0.16, duration = 0.16, type = "sine" }) {
    if (!ready || muted || !ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(envelope);
    envelope.connect(nodes.limiter);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }

  return {
    ensure,
    setCar,
    update,
    get context() {
      return ctx;
    },
    get running() {
      return ready && !muted;
    },
    setMuted(value) {
      muted = value;
      if (nodes.master) ramp(nodes.master.gain, value ? 0.0001 : 0.9, 0.08);
    },
    shift() {
      burst({ gain: 0.22, duration: 0.12, type: "bandpass", frequency: 2600, Q: 1.4 });
    },
    blowOff() {
      burst({ gain: 0.3, duration: 0.28, type: "highpass", frequency: 2400 });
    },
    impact(strength = 0.5) {
      burst({ gain: 0.25 + strength * 0.4, duration: 0.34, type: "lowpass", frequency: 320 + strength * 500 });
      tone({ frequency: 190, to: 48, gain: 0.3 * strength + 0.12, duration: 0.34, type: "triangle" });
    },
    nitro() {
      burst({ gain: 0.28, duration: 0.5, type: "highpass", frequency: 1800 });
    },
    nearMiss() {
      tone({ frequency: 880, to: 1560, gain: 0.1, duration: 0.16, type: "triangle" });
    },
    countdown(final = false) {
      tone({ frequency: final ? 880 : 440, gain: 0.2, duration: final ? 0.5 : 0.22, type: "square" });
    },
    ui(kind = "click") {
      const map = { click: 620, back: 320, buy: 980, error: 180 };
      tone({ frequency: map[kind] || 620, gain: 0.09, duration: 0.09, type: "triangle" });
    },
    dispose() {
      if (!ctx) return;
      ctx.close();
      ctx = null;
      ready = false;
    },
  };
}
