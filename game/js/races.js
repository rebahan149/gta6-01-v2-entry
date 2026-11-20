// races.js — street races: chequered-flag start points in three districts.
// Line up against three rival Vela Racers, sit through the 3-2-1 countdown,
// then chase glowing checkpoint pillars around a road course. Position is
// scored live from checkpoint progress; winning pays cash, respect and —
// most importantly — standing in that district.
(function () {
  "use strict";
  var HT = window.HT;
  var R = (HT.Races = {});

  R.DEFS = [
    {
      id: "strip", name: "STRIP SPRINT", district: "Neon Strip",
      start: { x: -230, z: 235.5, heading: Math.PI / 2 },
      checkpoints: [[-120, 240], [0, 240], [120, 240], [232, 232], [240, 120], [240, 0],
                    [232, -112], [120, -120], [0, -120], [-112, -112], [-120, 0], [-120, 120]]
    },
    {
      id: "marina", name: "MARINA LOOP", district: "Marina Del Sol",
      start: { x: 235.5, z: 190, heading: Math.PI },
      checkpoints: [[240, 120], [240, 0], [232, -112], [120, -120], [0, -120], [-8, -8],
                    [0, 120], [120, 120], [232, 128], [240, 200]]
    },
    {
      id: "ember", name: "EMBER DESCENT", district: "Ember Hills",
      start: { x: -124.5, z: -232, heading: 0 },
      checkpoints: [[-120, -120], [-120, 0], [-128, 112], [-240, 120], [-240, 232],
                    [-120, 240], [0, 240], [112, 232], [120, 120]]
    }
  ];
  var RIVAL_COLORS = [0xd94f43, 0x8a5fb0, 0x7dd069];
  var RIVAL_NAMES = ["VEX", "DOMINO", "SABLE"];

  var markers = [];      // start-point visuals
  var pillars = [];      // active checkpoint pillars
  var rivals = [];
  R.state = "idle";      // idle | countdown | racing | done
  R.def = null;
  R.cpIndex = 0;
  R.time = 0;
  var countdownT = 0, abortT = 0;

  function checkerTexture() {
    var c = document.createElement("canvas"); c.width = 128; c.height = 32;
    var g = c.getContext("2d");
    for (var y = 0; y < 4; y++) for (var x = 0; x < 16; x++) {
      g.fillStyle = (x + y) % 2 ? "#111111" : "#ffffff";
      g.fillRect(x * 8, y * 8, 8, 8);
    }
    return new THREE.CanvasTexture(c);
  }
  var checkerTex = null;

  R.buildMarkers = function (scene) {
    if (!checkerTex) checkerTex = checkerTexture();
    R.DEFS.forEach(function (def) {
      var grp = new THREE.Group();
      var poleMat = new THREE.MeshLambertMaterial({ color: 0x2c3542 });
      [-5, 5].forEach(function (off) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6.4, 6), poleMat);
        pole.position.set(off, 3.2, 0);
        pole.castShadow = true;
        grp.add(pole);
      });
      var banner = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 2.2),
        new THREE.MeshBasicMaterial({ map: checkerTex, side: THREE.DoubleSide }));
      banner.position.y = 5.6;
      grp.add(banner);
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.16, 20),
        new THREE.MeshBasicMaterial({ map: checkerTex }));
      disc.position.y = 0.1;
      grp.add(disc);
      grp.position.set(def.start.x, HT.groundY(def.start.x, def.start.z), def.start.z);
      grp.rotation.y = def.start.heading;
      scene.add(grp);
      markers.push({ def: def, group: grp });
    });
  };

  function makePillar(x, z, bright) {
    var geo = new THREE.CylinderGeometry(3.4, 3.4, 26, 14, 1, true);
    var mat = new THREE.MeshBasicMaterial({
      color: bright ? 0xffd23e : 0xff9a3c, transparent: true,
      opacity: bright ? 0.34 : 0.13, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    });
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, HT.groundY(x, z) + 13, z);
    HT.World.scene.add(m);
    return m;
  }
  function clearPillars() {
    pillars.forEach(function (p) { HT.World.scene.remove(p); });
    pillars = [];
  }
  function refreshPillars() {
    clearPillars();
    if (!R.def) return;
    for (var i = R.cpIndex; i < R.def.checkpoints.length; i++) {
      var cp = R.def.checkpoints[i];
      pillars.push(makePillar(cp[0], cp[1], i === R.cpIndex));
    }
  }

  R.nearStart = function () {
    var pp = HT.Player.pos();
    for (var i = 0; i < R.DEFS.length; i++) {
      var s = R.DEFS[i].start;
      if (HT.dist2d(pp.x, pp.z, s.x, s.z) < 13) return R.DEFS[i];
    }
    return null;
  };

  R.startRace = function (def, frozen) {
    var G = HT.G;
    if (!G.inCar) return false;
    R.def = def;
    R.cpIndex = 0;
    R.time = 0;
    R.state = "countdown";
    countdownT = frozen ? 9999 : 3.4;
    abortT = 0;
    // grid: player takes the back slot; rivals fill the other three
    var s = def.start;
    var fx = Math.sin(s.heading), fz = Math.cos(s.heading);
    var rx = Math.cos(s.heading), rz = -Math.sin(s.heading);
    var slots = [
      { x: s.x + rx * 0 - fx * 8, z: s.z + rz * 0 - fz * 8 },        // player, back centre-left
      { x: s.x + rx * 4.6 - fx * 8, z: s.z + rz * 4.6 - fz * 8 },    // rival, back right
      { x: s.x + rx * 0, z: s.z + rz * 0 },                            // rival, front left
      { x: s.x + rx * 4.6, z: s.z + rz * 4.6 }                         // rival, front right
    ];
    HT.Vehicles.place(G.inCar, slots[0].x, slots[0].z, s.heading);
    // if the player arrived in the crew car, Mico keeps his shotgun seat;
    // in any other car Paloma stays aboard — the crew rolls to races too.
    rivals.forEach(function (r) { HT.Vehicles.removeCar(r.car); });
    rivals = [];
    for (var i = 0; i < 3; i++) {
      var rc = HT.Vehicles.makeCar("racer", RIVAL_COLORS[i], slots[i + 1].x, slots[i + 1].z, s.heading);
      rc.isRival = true;
      rivals.push({ car: rc, name: RIVAL_NAMES[i], cp: 0, stuckT: 0, speedBias: HT.randRange(0.96, 1.03) });
    }
    refreshPillars();
    if (HT.HUD) {
      HT.HUD.showRace(def.name);
      HT.HUD.raceTick(4, 0, def.checkpoints.length, 0);
      HT.HUD.countdown("3");
    }
    HT.Dispatch.say("Street race forming up — " + def.name + " in " + def.district + ". Units are… otherwise engaged.");
    HT.Police.reportCrime("race", s.x, s.z, 0.6);
    return true;
  };

  function progressOf(cpIndex, x, z) {
    if (!R.def || cpIndex >= R.def.checkpoints.length) return 1e9;
    var cp = R.def.checkpoints[cpIndex];
    return cpIndex * 10000 - HT.dist2d(x, z, cp[0], cp[1]);
  }
  R.playerPosition = function () {
    var pp = HT.Player.pos();
    var mine = progressOf(R.cpIndex, pp.x, pp.z);
    var pos = 1;
    rivals.forEach(function (r) {
      var rp = r.car.group.position;
      if (progressOf(r.cp, rp.x, rp.z) > mine) pos++;
    });
    return pos;
  };

  function finishRace() {
    var pos = R.playerPosition();
    var G = HT.G;
    R.state = "done";
    var pay = [650, 250, 120, 40][pos - 1];
    var rep = [9, 4, 2, 0][pos - 1];
    G.money += pay;
    G.respect = HT.clamp(G.respect + rep, 0, 100);
    HT.addStanding(R.def.district, [9, 4, 1, -2][pos - 1]);
    if (pos === 1) {
      G.racesWon++;
      if (HT.HUD) HT.HUD.toast("🏆 RACE WON — " + R.def.name + "! +$" + pay);
      HT.Audio.cash();
    } else if (HT.HUD) HT.HUD.toast("Finished " + pos + (pos === 2 ? "nd" : pos === 3 ? "rd" : "th") + " — +$" + pay);
    if (HT.Missions) HT.Missions.onRaceFinish(R.def.id, pos);
    HT.saveGame();
    clearPillars();
    rivals.forEach(function (r) { r.car.isRival = false; r.car.traffic = { speed: 10, wp: null }; });
    rivals = [];
    if (HT.HUD) HT.HUD.hideRace();
    R.state = "idle";
    R.def = null;
  }
  R.abortRace = function (why) {
    if (HT.HUD) { HT.HUD.toast("Race off — " + why); HT.HUD.hideRace(); HT.HUD.countdown(null); }
    clearPillars();
    rivals.forEach(function (r) { HT.Vehicles.removeCar(r.car); });
    rivals = [];
    R.state = "idle";
    R.def = null;
  };

  // photo staging: grid + held countdown, exactly what the camera sees
  R.stagePhotoRace = function () {
    var car = HT.G.inCar || HT.G.starterCar;
    if (!HT.G.inCar) HT.Player.enterCar(car);
    R.startRace(R.DEFS[0], true);
    R.playerPosition(); // settle HUD numbers
  };

  R.update = function (dt) {
    if (R.state === "countdown") {
      if (countdownT < 9000) {
        var before = Math.ceil(countdownT);
        countdownT -= dt;
        var now = Math.ceil(countdownT);
        if (now !== before && now > 0 && HT.HUD) { HT.HUD.countdown(String(now)); HT.Audio.beep(false); }
        if (countdownT <= 0) {
          R.state = "racing";
          if (HT.HUD) { HT.HUD.countdown("GO!"); HT.Audio.beep(true); }
          setTimeout(function () { if (HT.HUD) HT.HUD.countdown(null); }, 700);
        }
      }
      // hold the grid: nobody moves during the countdown
      rivals.forEach(function (r) { r.car.speed = 0; });
      if (HT.G.inCar) HT.G.inCar.speed = 0;
      return;
    }
    if (R.state !== "racing") return;
    R.time += dt;
    var pp = HT.Player.pos();
    // player checkpoint progress
    var cp = R.def.checkpoints[R.cpIndex];
    if (cp && HT.dist2d(pp.x, pp.z, cp[0], cp[1]) < 13) {
      R.cpIndex++;
      HT.Audio.chime();
      refreshPillars();
      if (R.cpIndex >= R.def.checkpoints.length) { finishRace(); return; }
    }
    // rivals chase their own next checkpoint with a rubber band
    var myProg = progressOf(R.cpIndex, pp.x, pp.z);
    rivals.forEach(function (r) {
      var rp = r.car.group.position;
      var target = R.def.checkpoints[Math.min(r.cp, R.def.checkpoints.length - 1)];
      if (HT.dist2d(rp.x, rp.z, target[0], target[1]) < 13 && r.cp < R.def.checkpoints.length) {
        r.cp++;
        target = R.def.checkpoints[Math.min(r.cp, R.def.checkpoints.length - 1)];
      }
      var want = HT.angleTo(rp.x, rp.z, target[0], target[1]);
      r.car.group.rotation.y = HT.angleLerp(r.car.group.rotation.y, want, dt * 1.9);
      var rivalProg = progressOf(r.cp, rp.x, rp.z);
      var band = rivalProg > myProg ? 0.93 : rivalProg < myProg - 400 ? 1.07 : 1;
      var target2 = 27.5 * r.speedBias * band;
      r.car.speed = HT.lerp(r.car.speed, target2, dt * 1.4);
      HT.Vehicles.moveCar(r.car, dt);
      if (Math.abs(r.car.speed) < 1.5) {
        r.stuckT += dt;
        if (r.stuckT > 2) { // wedged on a corner: hop forward along the nose
          rp.x += Math.sin(r.car.group.rotation.y) * 6;
          rp.z += Math.cos(r.car.group.rotation.y) * 6;
          r.stuckT = 0;
        }
      } else r.stuckT = 0;
    });
    // bail conditions
    if (!HT.G.inCar) {
      abortT += dt;
      if (abortT > 6) { R.abortRace("you left the car"); return; }
    } else abortT = 0;
    if (HT.HUD) HT.HUD.raceTick(R.playerPosition(), R.cpIndex, R.def.checkpoints.length, R.time);
  };
})();
