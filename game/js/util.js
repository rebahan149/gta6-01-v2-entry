// util.js — Coral Key: High Tide core. The shared HT namespace, a seeded RNG,
// math helpers, keyboard/mouse input, the island layout with its five
// districts, the per-district STANDING system, and the central game state.
(function () {
  "use strict";
  var HT = (window.HT = window.HT || {});

  // ---- seeded RNG (mulberry32): the island is the same on every visit ----
  var seed = 20261124;
  HT.rand = function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  HT.randRange = function (a, b) { return a + HT.rand() * (b - a); };
  HT.randInt = function (a, b) { return Math.floor(HT.randRange(a, b + 1)); };
  HT.pick = function (arr) { return arr[Math.floor(HT.rand() * arr.length)]; };

  // ---- math helpers ----
  HT.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  HT.lerp = function (a, b, t) { return a + (b - a) * t; };
  HT.dist2d = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  HT.angleLerp = function (a, b, t) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };
  HT.angleTo = function (ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); };

  // ---- island layout ----
  HT.WORLD = {
    size: 340,                 // playable half-extent (metres)
    roads: [-240, -120, 0, 120, 240],
    roadHalf: 9,
    hillZ: -268,               // north of this the Ember Hills rise
    hillH: 9                   // plateau height
  };
  HT.groundY = function (x, z) {
    if (z > HT.WORLD.hillZ + 26) return 0;
    if (z < HT.WORLD.hillZ - 26) return HT.WORLD.hillH;
    var t = (HT.WORLD.hillZ + 26 - z) / 52;
    return HT.WORLD.hillH * (t * t * (3 - 2 * t));
  };

  // ---- the five districts: bounds, minimap tint, flavour ----
  HT.DISTRICTS = [
    { name: "Ember Hills",    color: "#5a3b47", glow: "#ff7a3c" },
    { name: "Old Town",       color: "#a97d4f", glow: "#ffc46b" },
    { name: "Marina Del Sol", color: "#3f7fbf", glow: "#7de8ff" },
    { name: "Neon Strip",     color: "#b04f8e", glow: "#ff5f9e" },
    { name: "Downtown",       color: "#4f6a8a", glow: "#ffd23e" },
    { name: "Coral Key",      color: "#6f9e5f", glow: "#ffffff" }
  ];
  HT.districtAt = function (x, z) {
    if (z < -228) return "Ember Hills";
    if (z > 228) return "Neon Strip";
    if (x > 228 && z > -60) return "Marina Del Sol";
    if (x < -115) return "Old Town";
    if (Math.abs(x) <= 150 && Math.abs(z) <= 150) return "Downtown";
    return "Coral Key";
  };
  HT.districtInfo = function (name) {
    for (var i = 0; i < HT.DISTRICTS.length; i++) if (HT.DISTRICTS[i].name === name) return HT.DISTRICTS[i];
    return HT.DISTRICTS[5];
  };
  // Standing words for a 0..100 meter.
  HT.standingWord = function (v) {
    if (v < 15) return "HATED";
    if (v < 32) return "DISLIKED";
    if (v < 48) return "KNOWN";
    if (v < 65) return "LIKED";
    if (v < 82) return "RESPECTED";
    return "LOVED";
  };
  HT.addStanding = function (district, amt) {
    var G = HT.G;
    if (!(district in G.standing)) return;
    var before = G.standing[district];
    G.standing[district] = HT.clamp(before + amt, 0, 100);
    if (HT.HUD && HT.HUD.standingFx) HT.HUD.standingFx(district, amt, G.standing[district]);
  };
  HT.rankName = function (respect) {
    if (respect >= 90) return "ISLAND LEGEND";
    if (respect >= 75) return "KINGPIN";
    if (respect >= 60) return "SHOT CALLER";
    if (respect >= 45) return "FIXER";
    if (respect >= 30) return "WHEELMAN";
    if (respect >= 15) return "RUNNER";
    return "NOBODY";
  };

  // ---- input ----
  var keys = {}, pressed = {};
  window.addEventListener("keydown", function (e) {
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "Tab"].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; });
  HT.key = function (code) { return !!keys[code]; };
  HT.pressed = function (code) { return !!pressed[code]; };
  HT.clearPressed = function () { for (var k in pressed) delete pressed[k]; };
  HT.mouse = { dx: 0, dy: 0, down: false, locked: false };
  window.addEventListener("mousemove", function (e) {
    if (HT.mouse.locked) { HT.mouse.dx += e.movementX || 0; HT.mouse.dy += e.movementY || 0; }
  });
  window.addEventListener("mousedown", function (e) { if (e.button === 0) HT.mouse.down = true; });
  window.addEventListener("mouseup", function (e) { if (e.button === 0) HT.mouse.down = false; });
  document.addEventListener("pointerlockchange", function () {
    HT.mouse.locked = document.pointerLockElement != null;
  });

  // ---- central game state ----
  HT.G = {
    state: "menu",           // menu | playing | paused | help | busted | wasted
    photoMode: null,         // cover | roadblock | race | crew when staged
    time: 0,
    clockMin: 17 * 60 + 36,  // golden hour, creeping toward dusk
    money: 140,
    respect: 0,              // 0..100
    health: 100,
    wanted: 0,               // visible stars 0..5
    heat: 0,                 // fractional heat behind the stars
    lockWanted: 0,           // missions/shots can pin a floor under the stars
    seenTimer: 0,            // time since a cop last had eyes on the player
    bust: 0,                 // 0..1 bust meter
    inCar: null,             // the car the player drives, or null on foot
    weapon: 0,               // 0 fists, 1 pistol, 2 SMG
    ammo: [Infinity, 12, 30],
    district: "Old Town",
    standing: {              // per-district standing, 0..100
      "Ember Hills": 22, "Old Town": 46, "Marina Del Sol": 38,
      "Neon Strip": 34, "Downtown": 28, "Coral Key": 40
    },
    jobDone: {},             // story job ids finished
    jobIndex: 0,             // next story job
    racesWon: 0,
    garage: { paint: -1, engine: 0, armour: 0 },
    garageOpen: false,
    dialogue: null,
    dusk: false              // roadblock photo scene flips the light to night
  };

  // ---- saves (localStorage) ----
  var SAVE_KEY = "coral-key-high-tide-save-v1";
  HT.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  HT.saveGame = function () {
    try {
      var p = HT.Player && HT.Player.pos ? HT.Player.pos() : { x: -180, z: 96 };
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: HT.G.money, respect: HT.G.respect, standing: HT.G.standing,
        jobDone: HT.G.jobDone, jobIndex: HT.G.jobIndex, racesWon: HT.G.racesWon,
        garage: HT.G.garage, x: p.x, z: p.z
      }));
    } catch (e) { /* private mode: play on unsaved */ }
  };
  HT.loadSave = function () {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!s) return false;
      var G = HT.G;
      G.money = s.money | 0; G.respect = s.respect | 0;
      for (var d in s.standing) if (d in G.standing) G.standing[d] = s.standing[d];
      G.jobDone = s.jobDone || {}; G.jobIndex = s.jobIndex | 0;
      G.racesWon = s.racesWon | 0; G.garage = s.garage || G.garage;
      if (HT.Player && HT.Player.teleport) HT.Player.teleport(s.x || -180, s.z || 96);
      if (HT.Vehicles && HT.Vehicles.applyGarage) HT.Vehicles.applyGarage();
      return true;
    } catch (e) { return false; }
  };

  // ---- a low-poly person, shared by the player, the crew and pedestrians ----
  // opts: skin, shirt, legs, hair (colors), cap (bool), tag (name sprite text)
  HT.buildFigure = function (opts) {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: opts.skin });
    var shirt = new THREE.MeshLambertMaterial({ color: opts.shirt });
    var legsM = new THREE.MeshLambertMaterial({ color: opts.legs });
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), shirt);
    torso.position.y = 1.06; g.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 9, 7), skin);
    head.position.y = 1.68; g.add(head);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 9, 6),
      new THREE.MeshLambertMaterial({ color: opts.hair }));
    hair.position.y = 1.73; hair.scale.y = 0.62; g.add(hair);
    if (opts.cap) {
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.1, 9), shirt);
      cap.position.y = 1.82; g.add(cap);
    }
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.2), shirt);
    armL.position.set(-0.42, 1.08, 0); g.add(armL);
    var armR = armL.clone(); armR.position.x = 0.42; g.add(armR);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.68, 0.24), legsM);
    legL.position.set(-0.16, 0.34, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.16; g.add(legR);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    var fig = { group: g, legL: legL, legR: legR, armL: armL, armR: armR, head: head, phase: 0 };
    if (opts.tag) {
      var c = document.createElement("canvas"); c.width = 256; c.height = 64;
      var ctx = c.getContext("2d");
      ctx.font = "900 40px 'Trebuchet MS', sans-serif"; ctx.textAlign = "center";
      ctx.lineWidth = 8; ctx.strokeStyle = "rgba(10,6,24,.85)";
      ctx.strokeText(opts.tag, 128, 44);
      ctx.fillStyle = opts.tagColor || "#ffffff"; ctx.fillText(opts.tag, 128, 44);
      var tex = new THREE.CanvasTexture(c);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      spr.scale.set(2.6, 0.65, 1); spr.position.y = 2.25;
      g.add(spr); fig.tagSprite = spr;
    }
    fig.walk = function (dt, speed) {
      fig.phase += dt * speed * 3.2;
      var s = Math.sin(fig.phase) * 0.55;
      legL.rotation.x = s; legR.rotation.x = -s;
      armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
    };
    fig.idle = function () {
      legL.rotation.x = 0; legR.rotation.x = 0;
      armL.rotation.x = 0; armR.rotation.x = 0;
    };
    return fig;
  };
})();
