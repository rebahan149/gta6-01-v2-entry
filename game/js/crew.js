// crew.js — your crew: MICO (mechanic, teal cap) and PALOMA (wheelwoman,
// magenta jacket). They follow on foot, Paloma rides shotgun in your car,
// and Mico drives the crew's own pink Brisa GT in formation behind or
// alongside you (C.formation: "behind" while roaming, "alongside" for the
// golden-hour Strip cruise). Each has a health pool on the HUD; a downed
// crewmate crawls back up after a breather. They are in every screenshot
// that matters.
(function () {
  "use strict";
  var HT = window.HT;
  var C = (HT.Crew = {});
  C.members = [];
  C.car = null;
  C.formation = "behind"; // behind | alongside (photo staging picks)

  C.build = function (scene) {
    var mico = {
      name: "MICO", hp: 100, state: "foot", downTimer: 0,
      fig: HT.buildFigure({
        skin: 0x8a5a3b, shirt: 0x39d0c4, legs: 0x33415e, hair: 0x14100c,
        cap: true, tag: "MICO", tagColor: "#39e6ff"
      })
    };
    mico.fig.group.position.set(-163, 0, 105);
    scene.add(mico.fig.group);
    var paloma = {
      name: "PALOMA", hp: 100, state: "foot", downTimer: 0,
      fig: HT.buildFigure({
        skin: 0xf2c49b, shirt: 0xff5f9e, legs: 0xe8e3d8, hair: 0x2c1c10,
        tag: "PALOMA", tagColor: "#ff9ecb"
      })
    };
    paloma.fig.group.position.set(-175, 0, 107);
    scene.add(paloma.fig.group);
    C.members = [mico, paloma];
    var car = HT.Vehicles.makeCar("convertible", 0xff5f9e, -150, 130, Math.PI / 2);
    car.isCrew = true; car.parked = true; car.name = "Crew Brisa GT";
    C.car = car;
  };
  C.byName = function (name) {
    return name === "MICO" ? C.members[0] : C.members[1];
  };

  // ---------- state changes wired to the player's car use ----------
  C.onPlayerEnterCar = function (car) {
    var mico = C.members[0], paloma = C.members[1];
    if (car === C.car) {
      seatIn(mico, car, 0.45, "shotgun");
      toFoot(paloma, car);
    } else {
      seatIn(paloma, car, 0.45, "shotgun");
      if (mico.state !== "downed") {
        C.car.parked = false;
        seatIn(mico, C.car, -0.45, "driver");
      }
    }
  };
  C.onPlayerExitCar = function () {
    var pp = HT.Player.pos();
    C.members.forEach(function (m) {
      if (m.state === "shotgun" || m.state === "driver") toFoot(m, null, pp.x, pp.z);
    });
    if (C.car) { C.car.parked = true; C.car.speed = 0; }
  };
  function seatIn(member, car, seatX, state) {
    if (member.state === "downed") return;
    HT.Player.seatFigure(member.fig, car, seatX);
    member.state = state;
    member.seatCar = car;
  }
  function toFoot(member, nearCar, wx, wz) {
    var p = member.fig.group;
    var x = wx !== undefined ? wx + (member.name === "MICO" ? -2 : 2) : p.getWorldPosition(new THREE.Vector3()).x + 2;
    var z = wz !== undefined ? wz + 1 : p.getWorldPosition(new THREE.Vector3()).z;
    if (nearCar) { x = nearCar.group.position.x + 2.4; z = nearCar.group.position.z; }
    HT.Player.unseatFigure(member.fig, x, z);
    member.state = "foot";
    member.seatCar = null;
  }
  C.seatIn = seatIn; // photo staging + missions use these
  C.toFoot = toFoot;

  C.damage = function (member, amt) {
    if (member.state === "downed" || HT.G.photoMode) return;
    member.hp -= amt;
    if (member.hp <= 0) {
      member.hp = 0;
      member.state = "downed";
      member.downTimer = 18;
      if (member.seatCar) toFoot(member, member.seatCar);
      member.fig.group.rotation.x = -Math.PI / 2;
      member.fig.group.position.y = HT.groundY(member.fig.group.position.x, member.fig.group.position.z) + 0.3;
      if (HT.HUD) HT.HUD.toast(member.name + " IS DOWN!");
      if (HT.Dispatch) HT.Dispatch.say("A bystander is down — medics rolling, all units hold positions.");
    }
  };

  // ---------- per-frame ----------
  function followFoot(member, slotX, slotZ, dt) {
    var fig = member.fig, pos = fig.group.position;
    var d = HT.dist2d(pos.x, pos.z, slotX, slotZ);
    if (d > 80) { // lost them: catch up out of the player's eyeline
      pos.set(slotX, HT.groundY(slotX, slotZ), slotZ);
      return;
    }
    if (d < 0.7) { fig.idle(); return; }
    var sp = d > 9 ? 6.9 : d > 3 ? 4.4 : 2.2;
    var a = Math.atan2(slotX - pos.x, slotZ - pos.z);
    pos.x += Math.sin(a) * sp * dt;
    pos.z += Math.cos(a) * sp * dt;
    var fixed = HT.World.collideCircle(pos.x, pos.z, 0.5);
    pos.x = fixed.x; pos.z = fixed.z;
    pos.y = HT.groundY(pos.x, pos.z);
    fig.group.rotation.y = HT.angleLerp(fig.group.rotation.y, a, 0.22);
    fig.walk(dt, sp);
  }

  function driveCrewCar(dt) {
    var car = C.car, p = car.group.position;
    var playerCar = HT.G.inCar;
    if (!playerCar || playerCar === car) { car.speed *= 0.9; return; }
    var pp = playerCar.group.position, ph = playerCar.group.rotation.y;
    var fx = Math.sin(ph), fz = Math.cos(ph);
    var rx = Math.cos(ph), rz = -Math.sin(ph);
    var tx, tz;
    if (C.formation === "alongside") { tx = pp.x + rx * 7.4 - fx * 1.2; tz = pp.z + rz * 7.4 - fz * 1.2; }
    else { tx = pp.x - fx * 10.5; tz = pp.z - fz * 10.5; }
    var d = HT.dist2d(p.x, p.z, tx, tz);
    if (d > 130) { // hopelessly behind: rejoin behind the player
      HT.Vehicles.place(car, pp.x - fx * 15, pp.z - fz * 15, ph);
      return;
    }
    var want = HT.angleTo(p.x, p.z, tx, tz);
    car.group.rotation.y = HT.angleLerp(car.group.rotation.y, want, dt * 2.4);
    var target = d > 24 ? 33 : d > 9 ? 20 : Math.abs(playerCar.speed) + HT.clamp((d - 6) * 0.8, -3, 6);
    if (Math.abs(playerCar.speed) < 0.5 && d < 8) target = 0;
    car.speed = HT.lerp(car.speed, HT.clamp(target, 0, 34), dt * 1.8);
    HT.Vehicles.moveCar(car, dt);
  }

  C.update = function (dt) {
    var G = HT.G;
    var pp = HT.Player.pos();
    var pf = HT.Player.avatar ? HT.Player.avatar.rotation.y : 0;
    C.members.forEach(function (m, i) {
      if (m.state === "downed") {
        m.downTimer -= dt;
        if (m.downTimer <= 0) {
          m.state = "foot"; m.hp = 55;
          m.fig.group.rotation.x = 0;
          var p = m.fig.group.position;
          p.y = HT.groundY(p.x, p.z);
          if (HT.HUD) HT.HUD.toast(m.name + " is back up 💪");
        }
        return;
      }
      if (m.hp < 100) m.hp = Math.min(100, m.hp + dt * 1.1);
      if (m.state === "foot") {
        // slots: behind-left and behind-right of the player's facing
        var back = i === 0 ? { x: -1.7, z: -1.4 } : { x: 1.7, z: -1.4 };
        var sx = pp.x + (Math.cos(pf) * back.x + Math.sin(pf) * back.z) * (G.inCar ? 2.2 : 1);
        var sz = pp.z + (-Math.sin(pf) * back.x + Math.cos(pf) * back.z) * (G.inCar ? 2.2 : 1);
        if (G.inCar && G.inCar !== C.car) { /* handled by car states */ }
        else followFoot(m, sx, sz, dt);
      }
    });
    var mico = C.members[0];
    if (mico.state === "driver") driveCrewCar(dt);
    else if (C.car && !C.car.parked && HT.G.inCar !== C.car) {
      C.car.speed *= 0.9;
      HT.Vehicles.moveCar(C.car, dt);
    }
  };
})();
