// police.js — the CKPD escalation theatre. A fractional heat meter drives
// 0-5 stars; patrol interceptors spawn to match, chase and ram; stopped
// cars put officers on foot who arrest (or, at 4 stars, shoot). At 4 stars
// dispatch authorises ROADBLOCKS across your road; at 5 stars AIR ONE, the
// helicopter, joins with a searchlight cone that never loses you. Every
// escalation is announced on the dispatch ticker.
(function () {
  "use strict";
  var HT = window.HT;
  var Po = (HT.Police = {});
  var cops = [], officers = [], roadblocks = [];
  var heli = null, heliCone = null, heliSpot = null, heliRotor = null, heliAngle = 0, heliStrobe = null;
  var spawnTimer = 0, blockTimer = 16, sirenTimer = 0, lastStars = 0;

  // ---------- dispatch ticker (HUD renders the queue) ----------
  var Dispatch = (HT.Dispatch = {
    queue: [],
    say: function (text) {
      Dispatch.queue.push(text);
      if (HT.HUD && HT.HUD.showDispatch) HT.HUD.showDispatch();
    }
  });
  var DISPATCH_LINES = {
    1: "Unit 12, investigate reports of reckless driving. Suspect is a local driver with a crew.",
    2: "All units — suspect vehicle fleeing. Move to intercept and box them in.",
    3: "Suspect is armed and considered dangerous. Ground units, use caution.",
    4: "Roadblocks authorised — repeat, ROADBLOCKS AUTHORISED on the suspect's route.",
    5: "AIR ONE is overhead with the light on them. All ground units converge — do not let them slip away."
  };

  Po.stars = function () {
    var G = HT.G;
    var s = G.heat <= 0.05 ? 0 : Math.min(5, Math.ceil(G.heat - 0.001));
    if (G.lockWanted > 0) s = Math.max(s, G.lockWanted);
    return s;
  };
  Po.setLock = function (n) {
    HT.G.lockWanted = n;
    if (n > 0) HT.G.heat = Math.max(HT.G.heat, n - 0.4);
  };
  Po.clearLock = function () { HT.G.lockWanted = 0; };

  var CRIME_HEAT = { shot: 0.85, carjack: 0.8, crash: 0.4, peddown: 1.5, theft: 0.6, race: 0.35, mayhem: 0.55 };
  Po.reportCrime = function (kind, x, z, scale) {
    var G = HT.G;
    if (G.photoMode) return;
    var witnessed = cops.length > 0 || heli !== null;
    var amt = (CRIME_HEAT[kind] || 0.5) * (scale || 1) * (witnessed ? 1 : 0.45);
    G.heat = Math.min(5.6, G.heat + amt);
    HT.addStanding(HT.districtAt(x, z), -1.5); // chaos costs you the district
  };

  // ---------- cop cars ----------
  function spawnCop(at) {
    var car = HT.Vehicles.makeCar("cop", 0xf2f2f2, at.x, at.z, HT.rand() * Math.PI * 2);
    car.copAI = { ejectT: 0, hasOfficers: false };
    cops.push(car);
    return car;
  }
  Po.spawnCopAt = function (x, z) { return spawnCop({ x: x, z: z }); };
  function removeCop(car) {
    HT.Vehicles.removeCar(car);
    var i = cops.indexOf(car);
    if (i >= 0) cops.splice(i, 1);
  }
  Po.despawnAll = function () {
    while (cops.length) removeCop(cops[0]);
    officers.forEach(function (o) { HT.World.scene.remove(o.fig.group); });
    officers = [];
    clearRoadblocks();
    if (heli) { HT.World.scene.remove(heli); heli = null; heliCone = null; photoOrbit = null; }
  };
  function spawnPosition() {
    var pp = HT.Player.pos();
    var roads = HT.WORLD.roads;
    var side = HT.randInt(0, 3);
    var d = HT.randRange(78, 105);
    var x = pp.x, z = pp.z;
    if (side === 0) { z = pp.z - d; x = nearestRoad(pp.x); }
    if (side === 1) { z = pp.z + d; x = nearestRoad(pp.x); }
    if (side === 2) { x = pp.x - d; z = nearestRoad(pp.z); }
    if (side === 3) { x = pp.x + d; z = nearestRoad(pp.z); }
    return { x: HT.clamp(x, -330, 330), z: HT.clamp(z, -330, 330) };
    function nearestRoad(v) {
      var best = roads[0], bd = 1e9;
      roads.forEach(function (r) { var dd = Math.abs(r - v); if (dd < bd) { bd = dd; best = r; } });
      return best + HT.pick([-4.3, 4.3]);
    }
  }

  // ---------- roadblocks (4 stars and up) ----------
  function buildRoadblockAt(x, z, heading) {
    var rb = { cars: [], barriers: [], colliders: [], x: x, z: z };
    var fx = Math.sin(heading), fz = Math.cos(heading);
    var rx = Math.cos(heading), rz = -Math.sin(heading);
    [-4.6, 4.6].forEach(function (off) {
      var c = spawnCop({ x: x + rx * off, z: z + rz * off });
      c.group.rotation.y = heading + (off < 0 ? 0.6 : -0.6 + Math.PI);
      c.parked = true; c.roadblock = true;
      rb.cars.push(c);
      var col = { minX: c.group.position.x - 2.3, maxX: c.group.position.x + 2.3, minZ: c.group.position.z - 2.3, maxZ: c.group.position.z + 2.3 };
      HT.World.colliders.push(col); rb.colliders.push(col);
    });
    // striped barriers + a spike strip between the cars
    for (var i = -1; i <= 1; i++) {
      var bx = x + rx * i * 3.4, bz = z + rz * i * 3.4;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(3, 1.05, 0.5),
        new THREE.MeshLambertMaterial({ color: i % 2 ? 0xf2f2f2 : 0xd94f43 }));
      bar.position.set(bx, HT.groundY(bx, bz) + 0.55, bz);
      bar.rotation.y = heading;
      bar.castShadow = true;
      HT.World.scene.add(bar);
      rb.barriers.push(bar);
      var bc = { minX: bx - 1.5, maxX: bx + 1.5, minZ: bz - 0.6, maxZ: bz + 0.6 };
      HT.World.colliders.push(bc); rb.colliders.push(bc);
    }
    var spikes = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.14, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x23242e }));
    spikes.position.set(x - fx * 3.4, HT.groundY(x, z) + 0.1, z - fz * 3.4);
    spikes.rotation.y = heading;
    HT.World.scene.add(spikes);
    rb.barriers.push(spikes);
    roadblocks.push(rb);
    return rb;
  }
  function clearRoadblocks() {
    roadblocks.forEach(function (rb) {
      rb.barriers.forEach(function (b) { HT.World.scene.remove(b); });
      rb.colliders.forEach(function (c) {
        var i = HT.World.colliders.indexOf(c);
        if (i >= 0) HT.World.colliders.splice(i, 1);
      });
    });
    roadblocks = [];
  }
  Po.stageRoadblock = function (x, z, heading) { return buildRoadblockAt(x, z, heading); };
  Po.roadblocks = function () { return roadblocks; };

  // ---------- AIR ONE: the helicopter ----------
  function buildHeli() {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x2c3542 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 6.4), bodyMat);
    body.position.y = 0; g.add(body);
    var nose = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x7db8ff }));
    nose.position.set(0, -0.2, 3.6); g.add(nose);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 5.4), bodyMat);
    tail.position.set(0, 0.3, -5.4); g.add(tail);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.9),
      new THREE.MeshLambertMaterial({ color: 0xd94f43 }));
    fin.position.set(0, 0.7, -8); g.add(fin);
    heliRotor = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.08, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x14161c }));
    heliRotor.position.y = 1.5; g.add(heliRotor);
    var skidL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.6), bodyMat);
    skidL.position.set(-1.1, -1.5, 0.4); g.add(skidL);
    var skidR = skidL.clone(); skidR.position.x = 1.1; g.add(skidR);
    var belly = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 4.2),
      new THREE.MeshBasicMaterial({ color: 0xdfe6ee }));
    belly.position.y = -1.1; g.add(belly);
    // navigation lights and a tail strobe so AIR ONE reads at night
    var navGeo = new THREE.SphereGeometry(0.24, 8, 6);
    var navL = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    navL.position.set(-1.35, 0, 0.6); g.add(navL);
    var navR = new THREE.Mesh(navGeo, new THREE.MeshBasicMaterial({ color: 0x2aff5a }));
    navR.position.set(1.35, 0, 0.6); g.add(navR);
    heliStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    heliStrobe.position.set(0, 0.9, -8.1); g.add(heliStrobe);
    // the searchlight: a real spotlight plus a visible cone of light
    heliSpot = new THREE.SpotLight(0xffe9b0, 2.6, 110, 0.4, 0.55);
    g.add(heliSpot); g.add(heliSpot.target);
    var coneGeo = new THREE.CylinderGeometry(1.4, 12, 40, 16, 1, true);
    coneGeo.translate(0, -20, 0);
    heliCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    g.add(heliCone);
    g.traverse(function (o) { if (o.isMesh && o !== heliCone) o.castShadow = true; });
    HT.World.scene.add(g);
    return g;
  }
  Po.stageHeli = function () {
    if (!heli) heli = buildHeli();
    return heli;
  };
  // Photo staging: a wider, lower, slower orbit so AIR ONE and its cone
  // actually share the frame with the car it is hunting.
  var photoOrbit = null;
  Po.stagePhotoHeli = function () {
    if (!heli) heli = buildHeli();
    heli.scale.setScalar(1.6);
    photoOrbit = { angle: -2.26, radius: 30, height: 16, speed: 0.05 };
    heliAngle = photoOrbit.angle;
    return heli;
  };
  function updateHeli(dt) {
    var pp = HT.Player.pos();
    heliAngle += dt * (photoOrbit ? photoOrbit.speed : 0.42);
    var orbitR = photoOrbit ? photoOrbit.radius : 23;
    var hx = pp.x + Math.cos(heliAngle) * orbitR, hz = pp.z + Math.sin(heliAngle) * orbitR;
    heli.position.set(hx, pp.y + (photoOrbit ? photoOrbit.height : 30 + Math.sin(HT.G.time * 0.8) * 1.6), hz);
    heli.rotation.y = HT.angleTo(hx, hz, pp.x, pp.z);
    if (heliRotor) heliRotor.rotation.y += dt * 28;
    if (heliStrobe) heliStrobe.visible = Math.sin(HT.G.time * 7) > 0.2;
    // aim the light and its visible cone at the player: work out the
    // heli-to-player direction in the heli's own (yaw-only) frame
    var dirW = new THREE.Vector3(pp.x - hx, pp.y - heli.position.y, pp.z - hz);
    var dist = dirW.length();
    dirW.normalize();
    var yaw = heli.rotation.y;
    var dirL = new THREE.Vector3(
      dirW.x * Math.cos(yaw) - dirW.z * Math.sin(yaw),
      dirW.y,
      dirW.x * Math.sin(yaw) + dirW.z * Math.cos(yaw)
    ).normalize();
    heliSpot.target.position.copy(dirL.clone().multiplyScalar(dist));
    heliCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirL);
  }

  // ---------- officers on foot ----------
  function ejectOfficers(car) {
    car.copAI.hasOfficers = true;
    car.parked = true;
    for (var i = 0; i < 2; i++) {
      var p = car.group.position;
      var fig = HT.buildFigure({
        skin: HT.pick([0xf2c49b, 0xc98d64, 0x8a5a3b]), shirt: 0x27355e,
        legs: 0x1c2436, hair: 0x111111, cap: true, tag: i === 0 ? "CKPD" : null, tagColor: "#7db8ff"
      });
      fig.group.position.set(p.x + (i ? 2.2 : -2.2), HT.groundY(p.x, p.z), p.z + 1);
      HT.World.scene.add(fig.group);
      officers.push({ fig: fig, obj: fig.group, shootT: HT.randRange(0.4, 1.4), fromCar: car, hp: 60, down: false, isCop: true, downTimer: 0 });
    }
  }
  Po.officersList = function () { return officers; };
  Po.copPositions = function () {
    return cops.map(function (c) { return { x: c.group.position.x, z: c.group.position.z }; });
  };
  function updateOfficers(dt, stars) {
    var pp = HT.Player.pos();
    for (var i = officers.length - 1; i >= 0; i--) {
      var o = officers[i], pos = o.obj.position;
      if (o.down) { // a downed officer stays down and out of the fight
        o.downTimer -= dt;
        if (o.downTimer <= 0) { HT.World.scene.remove(o.obj); officers.splice(i, 1); }
        continue;
      }
      var d = HT.dist2d(pos.x, pos.z, pp.x, pp.z);
      if (d > 240) { HT.World.scene.remove(o.obj); officers.splice(i, 1); continue; }
      var inCar = !!HT.G.inCar;
      if (d > (inCar ? 3.4 : 2.4)) {
        var sp = d > 30 ? 6.4 : 5.1;
        var a = Math.atan2(pp.x - pos.x, pp.z - pos.z);
        pos.x += Math.sin(a) * sp * dt;
        pos.z += Math.cos(a) * sp * dt;
        var fixed = HT.World.collideCircle(pos.x, pos.z, 0.5);
        pos.x = fixed.x; pos.z = fixed.z;
        pos.y = HT.groundY(pos.x, pos.z);
        o.obj.rotation.y = HT.angleLerp(o.obj.rotation.y, a, 0.25);
        o.fig.walk(dt, sp);
      } else o.fig.idle();
      // at 4+ stars officers fire on a fleeing suspect
      if (stars >= 4 && d > 6 && d < 30 && !HT.G.photoMode) {
        o.shootT -= dt;
        if (o.shootT <= 0) {
          o.shootT = HT.randRange(0.7, 1.5);
          if (HT.Combat) HT.Combat.tracer(pos.x, 1.5, pos.z, pp.x, 1.1, pp.z);
          HT.Audio.shot(false);
          if (HT.rand() < 0.55) HT.Player.damage(HT.randRange(2.5, 5));
          else if (HT.Crew && HT.rand() < 0.4) {
            var m = HT.pick(HT.Crew.members);
            HT.Crew.damage(m, HT.randRange(3, 6));
          }
        }
      }
    }
  }

  // ---------- the per-frame escalation ----------
  Po.update = function (dt) {
    var G = HT.G;
    var pp = HT.Player.pos();
    var stars = Po.stars();
    G.wanted = stars;
    if (stars !== lastStars) {
      if (stars > lastStars && DISPATCH_LINES[stars]) Dispatch.say(DISPATCH_LINES[stars]);
      if (stars === 0 && lastStars > 0) Dispatch.say("Suspect lost. All units, resume patrol — they'll slip up again.");
      lastStars = stars;
    }

    // vision: any cop close by (or AIR ONE) keeps the heat on
    var seen = heli !== null;
    if (!seen) for (var i = 0; i < cops.length; i++) {
      if (HT.dist2d(pp.x, pp.z, cops[i].group.position.x, cops[i].group.position.z) < 62) { seen = true; break; }
    }
    if (!seen) for (var j = 0; j < officers.length; j++) {
      if (HT.dist2d(pp.x, pp.z, officers[j].obj.position.x, officers[j].obj.position.z) < 40) { seen = true; break; }
    }
    if (seen) G.seenTimer = 0; else G.seenTimer += dt;
    if (!G.photoMode) {
      if (seen && G.heat > 0) G.heat = Math.min(5.6, G.heat + dt * 0.045);
      else if (G.seenTimer > 4 && G.lockWanted === 0) G.heat = Math.max(0, G.heat - dt * 0.13);
    }

    // fleet size follows the stars
    var wantCops = [0, 1, 2, 3, 4, 5][stars];
    spawnTimer -= dt;
    var active = cops.filter(function (c) { return !c.parked; }).length;
    if (active < wantCops && spawnTimer <= 0 && !G.photoMode) {
      spawnCop(spawnPosition());
      spawnTimer = 2.4;
    }
    // pursuit driving
    for (var k = cops.length - 1; k >= 0; k--) {
      var c = cops[k];
      if (c.dead) { cops.splice(k, 1); continue; }
      var cp = c.group.position;
      var dc = HT.dist2d(cp.x, cp.z, pp.x, pp.z);
      if (dc > 260 && stars === 0 && !c.roadblock) { removeCop(c); continue; }
      if (c.parked) continue;
      var want = HT.angleTo(cp.x, cp.z, pp.x + Math.sin(HT.G.inCar ? HT.G.inCar.group.rotation.y : 0) * 4,
        pp.z + Math.cos(HT.G.inCar ? HT.G.inCar.group.rotation.y : 0) * 4);
      c.group.rotation.y = HT.angleLerp(c.group.rotation.y, want, dt * 1.7);
      var spd = dc > 40 ? 37 : dc > 12 ? 30 : 15;
      if (dc < 5.5) spd = 0;
      c.speed = HT.lerp(c.speed, spd, dt * 1.6);
      HT.Vehicles.moveCar(c, dt);
      // stopped beside the suspect: officers out
      if (Math.abs(c.speed) < 1.2 && dc < 9) {
        c.copAI.ejectT += dt;
        if (c.copAI.ejectT > 1.1 && !c.copAI.hasOfficers) ejectOfficers(c);
      } else c.copAI.ejectT = 0;
      // lightbar strobing
      if (c.lightbar) {
        var ph = (HT.G.time * 6 + k) % 2;
        c.lightbar[0].color.setHex(ph < 1 ? 0xff2a2a : 0x551111);
        c.lightbar[1].color.setHex(ph < 1 ? 0x112255 : 0x2a6aff);
      }
    }
    updateOfficers(dt, stars);

    // roadblocks at 4+ stars, thrown across the road ahead
    blockTimer -= dt;
    if (stars >= 4 && blockTimer <= 0 && !G.photoMode) {
      blockTimer = 24;
      var nearBlock = roadblocks.some(function (rb) { return HT.dist2d(pp.x, pp.z, rb.x, rb.z) < 170; });
      if (!nearBlock) {
        var heading = G.inCar ? G.inCar.group.rotation.y : HT.Player.avatar.rotation.y;
        var bx = pp.x + Math.sin(heading) * 68, bz = pp.z + Math.cos(heading) * 68;
        // snap onto the road the player is travelling
        var roads = HT.WORLD.roads, snapX = bx, snapZ = bz, bd = 1e9;
        roads.forEach(function (r) {
          var ddx = Math.abs(r - bx); if (ddx < bd) { bd = ddx; snapX = r; snapZ = bz; }
        });
        bd = 1e9;
        roads.forEach(function (r) {
          var ddz = Math.abs(r - bz); if (ddz < bd) { bd = ddz; snapZ = r; snapX = bx; }
        });
        if (Math.abs(snapX - bx) < Math.abs(snapZ - bz)) buildRoadblockAt(snapX, bz, Math.PI / 2);
        else buildRoadblockAt(bx, snapZ, 0);
        Dispatch.say("Roadblock is set. Spike strip down — they are NOT getting through.");
      }
    }
    if (stars < 3 && roadblocks.length) {
      var far = roadblocks.every(function (rb) { return HT.dist2d(pp.x, pp.z, rb.x, rb.z) > 140; });
      if (far) {
        roadblocks.forEach(function (rb) { rb.cars.forEach(removeCop); });
        clearRoadblocks();
      }
    }

    // AIR ONE at 5 stars
    if (stars >= 5 && !heli) {
      heli = buildHeli();
      Dispatch.say("AIR ONE has the light on them. Shine bright, suspect.");
    } else if (stars < 5 && heli && !G.photoMode) {
      HT.World.scene.remove(heli); heli = null; heliCone = null;
    }
    if (heli) updateHeli(dt);

    // sirens in the earshot
    sirenTimer -= dt;
    if (sirenTimer <= 0) {
      sirenTimer = 3.8;
      if (cops.length && HT.dist2d(pp.x, pp.z, cops[0].group.position.x, cops[0].group.position.z) < 90) HT.Audio.siren();
    }

    // bust meter: cornered, slow or on foot, with law in reach
    var cornered = false;
    if (!G.inCar || Math.abs(G.inCar.speed) < 2.2) {
      for (var m = 0; m < cops.length; m++) {
        if (HT.dist2d(pp.x, pp.z, cops[m].group.position.x, cops[m].group.position.z) < 8) cornered = true;
      }
      for (var n = 0; n < officers.length; n++) {
        if (HT.dist2d(pp.x, pp.z, officers[n].obj.position.x, officers[n].obj.position.z) < 3) cornered = true;
      }
    }
    if (cornered && stars > 0 && !G.photoMode) {
      G.bust = Math.min(1, G.bust + dt / 2.1);
      if (G.bust >= 1 && HT.showEnd) { HT.showEnd("busted"); }
    } else G.bust = Math.max(0, G.bust - dt * 0.8);
  };
})();
