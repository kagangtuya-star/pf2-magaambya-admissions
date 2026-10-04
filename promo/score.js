// Original procedural score: rain, kalimba, glass chimes of the Song-Wind City,
// hand drums and a warm pad in D minor, resolving to D major on the crest.
import { DURATION, MASK_HITS, BRANCH_HITS, BRANCH_UNITY, CREST_REVEAL } from "./timeline.js";

const SR = 48000;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const N = { D2: 38, F2: 41, G2: 43, A2: 45, Bb2: 46, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, Bb3: 58, C4: 60, Cs4: 61, D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, A4: 69, Bb4: 70, C5: 72, Cs5: 73, D5: 74, E5: 76, F5: 77, Fs5: 78, G5: 79, A5: 81, C6: 84, D6: 86, E6: 88, F6: 89, G6: 91, A6: 93, D7: 98 };

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const random = rng(4711);

  const master = ctx.createGain();
  master.gain.value = 1.15;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  master.gain.setValueAtTime(1.15, DURATION - 1.6);
  master.gain.linearRampToValueAtTime(0, DURATION - 0.05);

  // Generated hall reverb.
  const irLength = Math.floor(SR * 3.8);
  const ir = ctx.createBuffer(2, irLength, SR);
  for (let c = 0; c < 2; c++) {
    const data = ir.getChannelData(c);
    for (let i = 0; i < irLength; i++) {
      const t = i / SR;
      data[i] = (random() * 2 - 1) * Math.exp(-t * 1.6) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  reverb.connect(wet).connect(master);

  const noise = ctx.createBuffer(2, SR * 4, SR);
  for (let c = 0; c < 2; c++) {
    const data = noise.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  }

  function out(node, pan = 0, send = 0.4) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node.connect(p);
    p.connect(master);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      p.connect(s).connect(reverb);
    }
  }

  function env(gain, t, peak, attack, hold, release) {
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  function noiseSource(t, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.start(t, random() * 3);
    src.stop(t + dur);
    return src;
  }

  // ---------- instruments ----------
  function pad(notes, t, dur, level = 0.03, cutoff = 1100) {
    notes.forEach((n, i) => {
      const f = midi(n);
      const g = ctx.createGain();
      env(g, t, level, Math.min(1.8, dur * 0.4), Math.max(0, dur - 1.8), 2.4);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff;
      filter.Q.value = 0.6;
      [-7, 6].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(filter);
        o.start(t);
        o.stop(t + dur + 2.6);
      });
      const sub = ctx.createOscillator();
      sub.type = "triangle";
      sub.frequency.value = f / 2;
      const subGain = ctx.createGain();
      subGain.gain.value = i === 0 ? 0.9 : 0.25;
      sub.connect(subGain).connect(filter);
      sub.start(t);
      sub.stop(t + dur + 2.6);
      filter.connect(g);
      out(g, (i / Math.max(1, notes.length - 1) - 0.5) * 0.6, 0.55);
    });
  }

  function choir(notes, t, dur, level = 0.022) {
    notes.forEach((n, i) => {
      const f = midi(n);
      const g = ctx.createGain();
      env(g, t, level, Math.min(2.2, dur * 0.45), Math.max(0, dur - 2.2), 2.8);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.6 + i * 0.37;
      const depth = ctx.createGain();
      depth.gain.value = 5;
      lfo.connect(depth);
      lfo.start(t);
      lfo.stop(t + dur + 3);
      [1, 2, 3].forEach((h, k) => {
        const o = ctx.createOscillator();
        o.frequency.value = f * h;
        depth.connect(o.detune);
        const hg = ctx.createGain();
        hg.gain.value = [1, 0.28, 0.12][k];
        o.connect(hg).connect(g);
        o.start(t);
        o.stop(t + dur + 3);
      });
      out(g, (i % 2 ? 0.35 : -0.35) * (i / notes.length), 0.8);
    });
  }

  function kalimba(n, t, vel = 1, pan) {
    const f = midi(n);
    const p = pan ?? Math.max(-0.7, Math.min(0.7, (n - 69) / 22));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    [
      [1, 1, 2.2],
      [3.01, 0.16, 0.28],
      [6.27, 0.07, 0.09],
    ].forEach(([ratio, amp, decay]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(amp, t);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + 2.3);
    });
    const click = noiseSource(t, 0.02);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.05 * vel, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    click.connect(bp).connect(cg).connect(g);
    out(g, p, 0.45);
  }

  function chime(n, t, vel = 1, pan = 0) {
    const f = midi(n) * (1 + (random() - 0.5) * 0.003);
    const g = ctx.createGain();
    g.gain.value = 0.06 * vel;
    [
      [1, 1, 4.2],
      [2.756, 0.42, 2.4],
      [5.404, 0.2, 1.3],
      [8.933, 0.1, 0.6],
    ].forEach(([ratio, amp, decay]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * ratio;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(amp, t + 0.003);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + decay + 0.05);
    });
    out(g, pan, 0.7);
  }

  function drum(t, vel = 1, pitch = 72, pan = 0, slap = 0) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(pitch * 2.4, t);
    o.frequency.exponentialRampToValueAtTime(pitch, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.42 * vel, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);
    const s = noiseSource(t, 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = slap ? 1400 : 700;
    bp.Q.value = 0.9;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime((slap ? 0.32 : 0.1) * vel, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + (slap ? 0.12 : 0.07));
    s.connect(bp).connect(sg);
    const mix = ctx.createGain();
    g.connect(mix);
    sg.connect(mix);
    out(mix, pan, 0.22);
  }

  function shaker(t, vel = 1, pan = 0.25) {
    const s = noiseSource(t, 0.1);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    s.connect(hp).connect(g);
    out(g, pan, 0.15);
  }

  function boom(t, vel = 1) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.75 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g);
    o.start(t);
    o.stop(t + 3.3);
    out(g, 0, 0.3);
    const s = noiseSource(t, 1.8);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.32 * vel, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(lp).connect(sg);
    out(sg, 0, 0.6);
  }

  function riser(t0, t1, level = 0.09) {
    const s = noiseSource(t0, t1 - t0 + 0.05);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(350, t0);
    bp.frequency.exponentialRampToValueAtTime(7000, t1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t1 - 0.02);
    g.gain.linearRampToValueAtTime(0, t1 + 0.03);
    s.connect(bp).connect(g);
    out(g, 0, 0.6);
  }

  function rain(points) {
    for (let c = 0; c < 2; c++) {
      const s = noiseSource(0, DURATION);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = c ? 2300 : 2900;
      bp.Q.value = 0.45;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(points[0][1], 0);
      points.slice(1).forEach(([time, level]) => g.gain.linearRampToValueAtTime(level, time));
      s.connect(bp).connect(lp).connect(g);
      out(g, c ? 0.55 : -0.55, 0.25);
    }
    // Individual drops on leaves and stone.
    for (let t = 0.2; t < DURATION; t += 0.03 + random() * 0.12) {
      const density = t < 8 ? 1 : t > 52.2 && t < 58.6 ? 0.8 : t > 24 && t < 35 ? 0.15 : 0.06;
      if (random() > density) continue;
      const o = ctx.createOscillator();
      const f = 1800 + random() * 3200;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.03);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.012 + random() * 0.012, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.05);
      out(g, random() * 1.6 - 0.8, 0.3);
    }
  }

  // ---------- arrangement ----------
  rain([
    [0, 0],
    [1.5, 0.11],
    [6.5, 0.12],
    [9, 0.025],
    [24, 0.02],
    [26, 0.035],
    [34, 0.012],
    [52.2, 0.012],
    [54, 0.09],
    [57.5, 0.07],
    [60, 0],
  ]);

  // I. Prologue — the long night.
  pad([N.D2, N.A2, N.D3, N.F3], 0.4, 7.2, 0.02, 650);
  [
    [1.3, N.A4, 0.7],
    [2.9, N.D5, 0.75],
    [4.3, N.F4, 0.65],
    [5.3, N.E4, 0.6],
    [6.2, N.D4, 0.8],
  ].forEach(([t, n, v]) => kalimba(n, t, v));
  chime(N.D6, 6.9, 0.6, 0.2);

  // II. Rekindling — the ember becomes a flame.
  pad([N.Bb2, N.D3, N.F3, N.A3], 7.2, 4.4, 0.026, 900);
  pad([N.F2, N.C3, N.F3, N.A3], 11.4, 4.2, 0.028, 1100);
  const arpA = [N.Bb3, N.D4, N.F4, N.A4, N.D5, N.A4, N.F4, N.D4];
  const arpB = [N.F3, N.A3, N.C4, N.F4, N.A4, N.C5, N.A4, N.F4];
  for (let i = 0, t = 7.8; t < 15.1; i++, t += 0.375) {
    const arp = t < 11.4 ? arpA : arpB;
    kalimba(arp[i % 8], t, 0.45 + 0.45 * ((t - 7.8) / 7.3));
  }
  for (let t = 11.4; t < 15; t += 0.375) shaker(t + 0.1875, 0.5 + (t - 11.4) / 8);
  riser(13.6, 15.2, 0.05);

  // III. The ten golden masks.
  pad([N.G2, N.D3, N.G3, N.Bb3], 15.0, 4.8, 0.03, 1000);
  pad([N.A2, N.D3, N.F3, N.A3], 19.8, 4.8, 0.03, 1200);
  choir([N.D4, N.A4], 16, 8.2, 0.012);
  const maskNotes = [N.D5, N.F5, N.G5, N.A5, N.C6, N.D6, N.F6, N.G6, N.A6, N.D7];
  MASK_HITS.forEach((t, i) => {
    chime(maskNotes[i], t, 0.9, Math.cos((i / 10) * Math.PI * 2 - Math.PI / 2) * 0.7);
    if (i % 2 === 0) drum(t, 0.55, 64, 0, 0);
  });
  for (let t = 21.8; t < 24.4; t += 0.75) drum(t, 0.4, 60);
  kalimba(N.D5, 22.2, 0.6);
  kalimba(N.A4, 22.95, 0.5);
  kalimba(N.F4, 23.7, 0.5);

  // IV. Nantambu, Song-Wind City.
  const city = [
    [24.2, [N.F2, N.C3, N.F3, N.A3], [N.F4, N.A4, N.C5, N.A4, N.G4, N.A4, N.C5, N.F5]],
    [27.0, [N.C3, N.G3, N.C4, N.E4], [N.E4, N.G4, N.C5, N.G4, N.E4, N.G4, N.D5, N.C5]],
    [29.8, [N.D3, N.A3, N.D4, N.F4], [N.D4, N.F4, N.A4, N.F4, N.D5, N.A4, N.E5, N.D5]],
    [32.6, [N.Bb2, N.F3, N.Bb3, N.D4], [N.D4, N.F4, N.Bb4, N.F4, N.A4, N.F4, N.C5, N.A4]],
  ];
  city.forEach(([t0, chord, line], k) => {
    pad(chord, t0, 2.9, 0.026, 1300);
    kalimba(chord[0] + 12, t0, 0.8, -0.2);
    for (let i = 0; i < 8; i++) kalimba(line[i], t0 + i * 0.35, 0.55 + (i % 4 === 0 ? 0.25 : 0));
    for (let i = 0; i < 8; i++) shaker(t0 + i * 0.35 + 0.175, 0.6, 0.35);
    drum(t0, 0.5, 58);
    drum(t0 + 1.4, 0.35, 66, 0.2, 1);
    if (k === 3) drum(t0 + 2.1, 0.4, 66, -0.2, 1);
  });
  [24.9, 25.8, 26.4, 27.9, 28.6, 29.4, 30.3, 31.4, 31.9, 33.1, 33.8, 34.6].forEach((t, i) =>
    chime([N.A5, N.D6, N.F6, N.G6, N.C6, N.E6][i % 6], t, 0.45 + random() * 0.3, random() * 1.6 - 0.8),
  );

  // V. Five branches, one community.
  const branchChords = [
    [N.D3, N.A3, N.D4, N.F4],
    [N.Bb2, N.F3, N.Bb3, N.D4],
    [N.F3, N.C4, N.F4, N.A4],
    [N.C3, N.G3, N.C4, N.E4],
    [N.G2, N.D3, N.G3, N.Bb3],
  ];
  const branchBells = [N.D6, N.F6, N.A6, N.G6, N.D7];
  BRANCH_HITS.forEach((t, i) => {
    pad(branchChords[i], t - 0.05, 2.0, 0.03 + i * 0.003, 1200 + i * 200);
    chime(branchBells[i], t, 1, (i - 2) * 0.3);
    boom(t, 0.28 + i * 0.05);
    for (let b = 0; b < 8; b++) {
      const bt = t + b * 0.25;
      if (b === 0 || b === 3 || b === 6) drum(bt, 0.55 + i * 0.06, 60);
      if (b === 2 || b === 5 || b === 7) drum(bt, 0.35 + i * 0.05, 74, 0.25, 1);
      shaker(bt + 0.125, 0.45 + i * 0.1, b % 2 ? 0.3 : -0.3);
    }
    const tones = branchChords[i].map((n) => n + 12);
    [0, 1, 2, 3, 2, 1].forEach((k, j) => kalimba(tones[k] + (j > 3 ? 12 : 0), t + 0.5 + j * 0.25, 0.5));
  });
  riser(BRANCH_UNITY - 1.6, BRANCH_UNITY, 0.07);
  pad([N.A2, N.E3, N.A3, N.Cs4, N.E4], BRANCH_UNITY, 1.6, 0.032, 1800);
  boom(BRANCH_UNITY, 0.75);
  [N.A5, N.Cs5 + 12, N.E6, N.A6].forEach((n, i) => chime(n, BRANCH_UNITY + i * 0.06, 0.8, (i - 1.5) * 0.4));
  choir([N.A3, N.E4, N.A4, N.Cs5], BRANCH_UNITY, 1.6, 0.012);

  // VI. The Word and the Way.
  pad([N.Bb2, N.F3, N.A3, N.D4], 46.6, 3.2, 0.022, 800);
  pad([N.F2, N.C3, N.F3, N.A3], 49.8, 3.0, 0.022, 800);
  choir([N.D4, N.F4, N.A4], 46.8, 3.0, 0.014);
  choir([N.C4, N.F4, N.A4], 49.8, 2.8, 0.014);
  [
    [47.2, N.A4],
    [47.95, N.D5],
    [48.7, N.E5],
    [49.45, N.F5],
    [50.2, N.E5],
    [50.95, N.C5],
    [51.7, N.D5],
  ].forEach(([t, n]) => kalimba(n, t, 0.7));

  // VII. Finale — the courtyard letter and the crest.
  pad([N.G2, N.D3, N.G3, N.Bb3], 52.4, 1.9, 0.028, 1000);
  pad([N.A2, N.D3, N.E3, N.A3], 54.2, 1.4, 0.03, 1300);
  for (let i = 0, t = 52.6; t < 55.5; i++, t += 0.25)
    kalimba([N.D4, N.G4, N.Bb4, N.D5, N.A4, N.E5][i % 6], t, 0.35 + (t - 52.6) * 0.15);
  riser(53.9, CREST_REVEAL, 0.09);
  boom(CREST_REVEAL, 1);
  pad([N.D2, N.A2, N.D3, N.Fs4, N.A3, N.D4], CREST_REVEAL, 3.0, 0.03, 1700);
  choir([N.D4, N.Fs4, N.A4, N.D5], CREST_REVEAL, 3.0, 0.016);
  [N.D6, N.Fs5 + 12, N.A6, N.D7].forEach((n, i) => chime(n, CREST_REVEAL + i * 0.09, 0.9, (i - 1.5) * 0.45));
  [
    [56.6, N.Fs5],
    [57.1, N.A5],
    [57.6, N.D6],
  ].forEach(([t, n]) => kalimba(n, t, 0.55));
  kalimba(N.D5, 58.4, 0.6);

  return ctx.startRendering();
}
