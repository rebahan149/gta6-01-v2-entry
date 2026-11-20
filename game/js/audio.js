// audio.js — every sound is synthesised with WebAudio: three radio stations
// (a chilled soul loop, a synthwave arp, a latin-tinged ember groove), the
// engine hum, two-tone sirens, gunshots, chimes and UI clicks. Nothing loads.
(function () {
  "use strict";
  var HT = window.HT;
  var A = (HT.Audio = {});
  var ctx = null, master = null, engineOsc = null, engineGain = null;
  var radioTimer = null, noteIdx = 0;
  A.station = 0; // 0 off, 1 SOL FM, 2 NEON WAVE, 3 RADIO EMBER
  A.STATIONS = ["RADIO OFF", "SOL FM", "NEON WAVE", "RADIO EMBER"];

  A.init = function () {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = "sawtooth"; engineOsc.frequency.value = 55;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
    } catch (e) { ctx = null; }
  };
  function tone(freq, t, dur, type, vol, dest) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, freq) {
    if (!ctx) return;
    var len = Math.max(1, (dur * ctx.sampleRate) | 0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 900;
    var g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  A.click = function () { if (ctx) tone(660, ctx.currentTime, 0.07, "square", 0.08); };
  A.chime = function () {
    if (!ctx) return; var t = ctx.currentTime;
    tone(880, t, 0.16, "sine", 0.16); tone(1318, t + 0.09, 0.24, "sine", 0.14);
  };
  A.cash = function () {
    if (!ctx) return; var t = ctx.currentTime;
    tone(1046, t, 0.1, "triangle", 0.16); tone(1568, t + 0.07, 0.2, "triangle", 0.16);
  };
  A.beep = function (final) {
    if (!ctx) return;
    tone(final ? 1180 : 590, ctx.currentTime, final ? 0.4 : 0.16, "square", 0.14);
  };
  A.shot = function (smg) {
    if (!ctx) return;
    noise(ctx.currentTime, smg ? 0.07 : 0.12, 0.24, smg ? 1600 : 800);
  };
  A.thud = function () { if (ctx) noise(ctx.currentTime, 0.16, 0.3, 220); };
  A.siren = function () {
    if (!ctx) return; var t = ctx.currentTime;
    tone(660, t, 0.22, "triangle", 0.05); tone(880, t + 0.22, 0.22, "triangle", 0.05);
  };
  A.engineUpdate = function (rpm, on) {
    if (!ctx || !engineOsc) return;
    var target = on ? 0.05 + rpm * 0.05 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.09);
    engineOsc.frequency.setTargetAtTime(50 + rpm * 130, ctx.currentTime, 0.09);
  };

  // ---------- radio: tiny step-sequenced synth loops per station ----------
  var LOOPS = {
    1: { tempo: 0.42, wave: "triangle", bass: [110, 0, 87.3, 0, 98, 0, 87.3, 0],
         lead: [440, 523, 659, 523, 587, 659, 784, 659] },
    2: { tempo: 0.24, wave: "sawtooth", bass: [55, 55, 82.4, 55, 55, 55, 98, 82.4],
         lead: [220, 261, 329, 392, 329, 261, 220, 196] },
    3: { tempo: 0.3, wave: "square", bass: [98, 98, 0, 98, 146.8, 0, 98, 130.8],
         lead: [392, 392, 440, 587, 523, 440, 392, 329] }
  };
  function scheduleNote() {
    if (!ctx || A.station === 0) { radioTimer = null; return; }
    var loop = LOOPS[A.station];
    var t = ctx.currentTime + 0.03;
    var i = noteIdx % 8;
    if (loop.bass[i]) tone(loop.bass[i], t, loop.tempo * 0.95, "triangle", 0.20);
    if (loop.lead[i] && (A.station !== 2 || i % 2 === 0)) tone(loop.lead[i], t, loop.tempo * 0.8, loop.wave, 0.055);
    noteIdx++;
    radioTimer = setTimeout(scheduleNote, loop.tempo * 1000);
  }
  A.cycleRadio = function () {
    A.station = (A.station + 1) % 4;
    if (radioTimer) { clearTimeout(radioTimer); radioTimer = null; }
    if (A.station !== 0) { A.init(); noteIdx = 0; scheduleNote(); }
    return A.STATIONS[A.station];
  };
})();
