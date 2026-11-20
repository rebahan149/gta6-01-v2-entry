// combat.js — fists, pistol and SMG behind a hold-Q weapon wheel. Hitscan
// shots with tracer lines, magazine reloads, real consequences: peds go
// down and flee, cars take damage and die, and every shot is a crime the
// CKPD hears about.
(function () {
  "use strict";
  var HT = window.HT;
  var C = (HT.Combat = {});
  var WEAPONS = [
    { name: "FISTS", range: 2.4, dmg: 34, rate: 0.36, mag: Infinity },
    { name: "PISTOL", range: 65, dmg: 40, rate: 0.3, mag: 12 },
    { name: "SMG", range: 58, dmg: 17, rate: 0.095, mag: 30 }
  ];
  C.WEAPONS = WEAPONS;
  var cool = 0, reloadT = 0, crimeT = 0;
  var tracers = [];

  C.tracer = function (x1, y1, z1, x2, y2, z2) {
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)
    ]);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0.9
    }));
    HT.World.scene.add(line);
    tracers.push({ line: line, life: 0.07 });
  };

  function aimDirection() {
    var cam = HT.camera;
    var dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    return dir;
  }
  // distance from point P to the ray (O, dir); also returns how far along it is
  function rayDist(ox, oz, dx, dz, px, pz) {
    var vx = px - ox, vz = pz - oz;
    var along = vx * dx + vz * dz;
    if (along < 0) return { d: 1e9, along: along };
    var cx = ox + dx * along, cz = oz + dz * along;
    return { d: HT.dist2d(cx, cz, px, pz), along: along };
  }

  function shoot() {
    var G = HT.G;
    var w = WEAPONS[G.weapon];
    var pp = HT.Player.pos();
    var ox = pp.x, oz = pp.z;
    var dir = aimDirection();
    var dx = dir.x, dz = dir.z;
    var dl = Math.sqrt(dx * dx + dz * dz) || 1; dx /= dl; dz /= dl;
    var bestPed = null, bestPedD = w.range, bestCar = null, bestCarD = w.range;

    if (G.weapon === 0) { // fists: whoever is in front of you
      HT.peds.forEach(function (p) {
        if (p.down) return;
        var d = HT.dist2d(ox, oz, p.obj.position.x, p.obj.position.z);
        if (d < w.range) { bestPed = p; bestPedD = d; }
      });
    } else {
      HT.peds.forEach(function (p) {
        if (p.down) return;
        var r = rayDist(ox, oz, dx, dz, p.obj.position.x, p.obj.position.z);
        if (r.d < 1.15 && r.along < bestPedD) { bestPed = p; bestPedD = r.along; }
      });
      if (HT.Police && HT.Police.officersList) {
        HT.Police.officersList().forEach(function (o) {
          var r = rayDist(ox, oz, dx, dz, o.obj.position.x, o.obj.position.z);
          if (r.d < 1.15 && r.along < bestPedD) { bestPed = o; bestPedD = r.along; }
        });
      }
      HT.Vehicles.cars.forEach(function (car) {
        if (car.dead || car === G.inCar) return;
        var r = rayDist(ox, oz, dx, dz, car.group.position.x, car.group.position.z);
        if (r.d < 2.7 && r.along < bestCarD) { bestCar = car; bestCarD = r.along; }
      });
    }

    var endD = w.range;
    if (bestPed && bestPedD <= bestCarD) {
      endD = bestPedD;
      bestPed.hp -= w.dmg;
      if (bestPed.hp <= 0 && !bestPed.down) {
        bestPed.down = true;
        bestPed.downTimer = 26;
        bestPed.obj.rotation.x = -Math.PI / 2;
        bestPed.obj.position.y = HT.groundY(bestPed.obj.position.x, bestPed.obj.position.z) + 0.3;
        HT.Police.reportCrime(bestPed.isCop ? "peddown" : "peddown", ox, oz, bestPed.isCop ? 1.4 : 1);
        HT.addStanding(HT.districtAt(ox, oz), -3);
      } else HT.fleePeds(ox, oz, 16);
    } else if (bestCar) {
      endD = bestCarD;
      bestCar.hp -= w.dmg * (bestCar === HT.G.starterCar ? 0.4 : 1);
      if (bestCar.hp <= 0 && !bestCar.dead) {
        bestCar.dead = true; bestCar.speed = 0;
        if (bestCar.isCop) HT.Police.reportCrime("mayhem", ox, oz, 1.2);
        if (HT.HUD) HT.HUD.toast("Vehicle wrecked! 🚗💥");
      }
      if (bestCar.traffic) { bestCar.traffic = null; bestCar.parked = true; }
    }
    if (G.weapon > 0) {
      var oy = pp.y + 1.5;
      C.tracer(ox + dx * 0.6, oy, oz + dz * 0.6, ox + dx * endD, oy + dir.y * endD * 0.4, oz + dz * endD);
      HT.Audio.shot(G.weapon === 2);
      HT.fleePeds(ox, oz, 15);
      if (crimeT <= 0) { HT.Police.reportCrime("shot", ox, oz, 1); crimeT = 0.6; }
    } else {
      HT.Audio.thud();
    }
  }

  C.update = function (dt) {
    var G = HT.G;
    cool -= dt; crimeT -= dt;
    for (var i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        HT.World.scene.remove(tracers[i].line);
        tracers[i].line.geometry.dispose();
        tracers.splice(i, 1);
      }
    }
    if (G.state !== "playing" || G.dialogue || G.garageOpen) return;

    // weapon switching: 1/2/3 direct, Q hold opens the wheel
    if (HT.pressed("Digit1")) { G.weapon = 0; if (HT.HUD) HT.HUD.refreshWeapon(); }
    if (HT.pressed("Digit2")) { G.weapon = 1; if (HT.HUD) HT.HUD.refreshWeapon(); }
    if (HT.pressed("Digit3")) { G.weapon = 2; if (HT.HUD) HT.HUD.refreshWeapon(); }
    var wheel = document.getElementById("wheel");
    if (HT.key("KeyQ")) {
      wheel.classList.remove("hidden");
      var slots = wheel.querySelectorAll(".wheel-slot");
      slots.forEach(function (s) {
        s.classList.toggle("sel", Number(s.getAttribute("data-w")) === G.weapon);
      });
    } else wheel.classList.add("hidden");

    // reload
    var w = WEAPONS[G.weapon];
    if (HT.pressed("KeyR") && G.weapon > 0 && G.ammo[G.weapon] < w.mag && reloadT <= 0) reloadT = 1.0;
    if (reloadT > 0) {
      reloadT -= dt;
      if (reloadT <= 0) { G.ammo[G.weapon] = w.mag; if (HT.HUD) HT.HUD.refreshWeapon(); }
    }

    // fire
    if (HT.mouse.down && cool <= 0 && reloadT <= 0 && !HT.key("KeyQ")) {
      if (G.weapon > 0 && G.ammo[G.weapon] <= 0) { reloadT = 1.0; cool = 0.3; }
      else {
        shoot();
        if (G.weapon > 0) G.ammo[G.weapon]--;
        cool = w.rate;
        if (HT.HUD) HT.HUD.refreshWeapon();
      }
    }
    if (G.weapon === 0) cool = Math.max(cool, 0); // fists still respect their rate via shoot cooldown
  };
})();
