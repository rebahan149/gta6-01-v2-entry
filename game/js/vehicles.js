// vehicles.js — the car factory (sedans, cabrios, pickups, vans, racers and
// CKPD interceptors built from boxes and cylinders), the ambient traffic
// that cruises the road grid, arcade player driving with drift, carjacking,
// and the garage upgrades that live on the player's own car.
(function () {
  "use strict";
  var HT = window.HT;
  var V = (HT.Vehicles = {});
  var cars = (V.cars = []);
  var wheelGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  var wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161c });
  var glassMat = new THREE.MeshLambertMaterial({ color: 0x1d2f45 });
  var chromeMat = new THREE.MeshLambertMaterial({ color: 0xd8dee6 });

  var TYPES = {
    sedan:       { name: "Marlin Sedan",    len: 4.4, h: 0.62, top: 33, acc: 13 },
    convertible: { name: "Brisa GT Cabrio", len: 4.5, h: 0.55, top: 38, acc: 15 },
    pickup:      { name: "Duna Pickup",     len: 4.8, h: 0.8,  top: 30, acc: 12 },
    van:         { name: "Cargo Van",       len: 5.0, h: 1.1,  top: 28, acc: 11 },
    racer:       { name: "Vela Racer",      len: 4.4, h: 0.5,  top: 43, acc: 17 },
    cop:         { name: "CKPD Interceptor", len: 4.6, h: 0.6, top: 41, acc: 16 }
  };
  V.TYPES = TYPES;
  var PAINTS = [0x19b8a6, 0xff5f9e, 0xffc93c, 0x8a5fb0, 0x7dd069, 0x23232e, 0xe8e3d8, 0xd94f43];
  V.PAINTS = PAINTS;

  function box(parent, w, h, d, x, y, z, mat) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  V.makeCar = function (type, color, x, z, heading) {
    var spec = TYPES[type] || TYPES.sedan;
    var g = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color });
    var L = spec.len, H = spec.h;
    box(g, 1.9, H, L, 0, 0.45 + H / 2, 0, paint);                              // body
    box(g, 1.94, 0.16, L * 0.96, 0, 0.48, 0, new THREE.MeshLambertMaterial({ color: 0x22242e })); // skirt
    if (type === "convertible") {
      box(g, 1.7, 0.34, 1.7, 0, 0.45 + H + 0.1, -0.2, new THREE.MeshLambertMaterial({ color: 0x8a2d1c })); // folded top
      box(g, 1.66, 0.5, 0.12, 0, 0.45 + H + 0.22, 0.95, glassMat);              // windshield
    } else if (type === "van") {
      box(g, 1.86, 1.15, L * 0.62, 0, 0.45 + H + 0.55, -0.7, paint);
      box(g, 1.7, 0.6, 0.9, 0, 0.45 + H + 0.25, L * 0.32, glassMat);
    } else if (type === "pickup") {
      box(g, 1.8, 0.55, 1.5, 0, 0.45 + H + 0.26, 0.75, glassMat);
      box(g, 1.86, 0.3, 1.9, 0, 0.45 + H + 0.12, -1.25, new THREE.MeshLambertMaterial({ color: 0x3a3f4a })); // bed
    } else {
      box(g, 1.7, 0.52, L * 0.44, 0, 0.45 + H + 0.24, -0.15, glassMat);         // cabin
    }
    var lightMats = null;
    if (type === "cop") {
      box(g, 1.94, 0.34, L * 0.5, 0, 0.72, 0.1, new THREE.MeshLambertMaterial({ color: 0x14161c })); // black band
      var red = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
      var blue = new THREE.MeshBasicMaterial({ color: 0x2a6aff });
      box(g, 0.55, 0.16, 0.5, -0.42, 1.52, -0.15, red);
      box(g, 0.55, 0.16, 0.5, 0.42, 1.52, -0.15, blue);
      box(g, 1.3, 0.1, 0.56, 0, 1.42, -0.15, chromeMat);
      lightMats = [red, blue];
    }
    if (type === "racer") {
      box(g, 1.9, 0.1, 0.5, 0, 1.02, -L / 2 + 0.3, new THREE.MeshLambertMaterial({ color: 0x14161c })); // spoiler
      box(g, 0.12, 0.3, 0.3, -0.7, 0.82, -L / 2 + 0.3, chromeMat);
      box(g, 0.12, 0.3, 0.3, 0.7, 0.82, -L / 2 + 0.3, chromeMat);
    }
    // lights: pale headlights, red tails (bright basic materials read at dusk)
    var hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    var tl = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    box(g, 0.34, 0.14, 0.06, -0.6, 0.78, L / 2 + 0.01, hl);
    box(g, 0.34, 0.14, 0.06, 0.6, 0.78, L / 2 + 0.01, hl);
    box(g, 0.34, 0.12, 0.06, -0.6, 0.82, -L / 2 - 0.01, tl);
    box(g, 0.34, 0.12, 0.06, 0.6, 0.82, -L / 2 - 0.01, tl);
    var wheels = [];
    [[-0.85, L / 2 - 0.85], [0.85, L / 2 - 0.85], [-0.85, -L / 2 + 0.85], [0.85, -L / 2 + 0.85]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(p[0], 0.37, p[1]);
      w.castShadow = true;
      g.add(w); wheels.push(w);
    });
    g.position.set(x, HT.groundY(x, z), z);
    g.rotation.y = heading || 0;
    HT.World.scene.add(g);
    var car = {
      group: g, wheels: wheels, type: type, spec: spec, color: color,
      speed: 0, hp: 100, driver: null, parked: false, isCop: type === "cop",
      isCrew: false, isRival: false, traffic: null, roadblock: false,
      name: spec.name, dead: false, lightbar: lightMats
    };
    cars.push(car);
    return car;
  };

  V.place = function (car, x, z, heading) {
    car.group.position.set(x, HT.groundY(x, z), z);
    car.group.rotation.y = heading;
    car.speed = 0;
  };
  V.removeCar = function (car) {
    HT.World.scene.remove(car.group);
    var i = cars.indexOf(car);
    if (i >= 0) cars.splice(i, 1);
    car.dead = true;
  };
  V.nearestCar = function (x, z, maxDist, filter) {
    var best = null, bd = maxDist;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.dead || (filter && !filter(c))) continue;
      var d = HT.dist2d(x, z, c.group.position.x, c.group.position.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  // ---------- spawning the ambient fleet ----------
  V.spawnWorldCars = function () {
    var trafficTypes = ["sedan", "sedan", "convertible", "pickup", "van", "racer"];
    var roads = HT.WORLD.roads;
    for (var i = 0; i < 14; i++) {
      var vertical = i % 2 === 0;
      var road = HT.pick(roads);
      var along = HT.randRange(-300, 300);
      var dir = HT.rand() < 0.5 ? 1 : -1;
      var lane = 4.3 * dir;
      var x = vertical ? road + lane : along;
      var z = vertical ? along : road + (vertical ? 0 : lane);
      if (!vertical) { x = along; z = road + lane; }
      var heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      var car = V.makeCar(HT.pick(trafficTypes), HT.pick(PAINTS), x, z, heading);
      car.traffic = { speed: HT.randRange(8.5, 12.5), wp: null };
      pickWaypoint(car);
    }
    // parked cars: marina row, strip kerbs, Old Town lanes, downtown
    var parkedSpots = [
      [262, 120, 0], [262, 168, 0], [-148, 268, Math.PI / 2], [-76, 268, Math.PI / 2],
      [-216, -22, Math.PI / 2], [60, -64, 0], [64, 60, 0], [-300, 120, 0], [150, -150, Math.PI / 2]
    ];
    parkedSpots.forEach(function (s) {
      var c = V.makeCar(HT.pick(trafficTypes), HT.pick(PAINTS), s[0], s[1], s[2]);
      c.parked = true;
    });
    // the player's own car: a turquoise Brisa GT waiting by the Old Town plaza
    var mine = V.makeCar("convertible", 0x19b8a6, -158, 122, Math.PI / 2);
    mine.name = "Tropica Cabrio";
    mine.parked = true;
    HT.G.starterCar = mine;
    V.applyGarage();
  };

  // traffic waypoints: next intersection along the heading, lane-offset
  function pickWaypoint(car) {
    var p = car.group.position, h = car.group.rotation.y;
    var dx = Math.sin(h), dz = Math.cos(h);
    var roads = HT.WORLD.roads;
    var best = null, bd = 1e9;
    roads.forEach(function (rx) {
      roads.forEach(function (rz) {
        var vx = rx - p.x, vz = rz - p.z;
        var along = vx * dx + vz * dz;
        if (along < 24) return;
        var perp = Math.abs(vx * dz - vz * dx);
        if (perp < 14 && along < bd) { bd = along; best = { x: rx, z: rz }; }
      });
    });
    if (!best) best = { x: p.x + dx * 120, z: p.z + dz * 120 };
    car.traffic.wp = best;
    car.traffic.turned = false;
  }

  function updateTraffic(car, dt) {
    var t = car.traffic, p = car.group.position;
    if (!t.wp) pickWaypoint(car);
    var wp = t.wp;
    // at the intersection, mostly turn onto the crossing road
    if (!t.turned && HT.dist2d(p.x, p.z, wp.x, wp.z) < 16) {
      t.turned = true;
      if (HT.rand() < 0.62) {
        var turn = HT.rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        car.group.rotation.y += turn;
      }
      pickWaypoint(car);
    }
    if (HT.dist2d(p.x, p.z, wp.x, wp.z) < 8) pickWaypoint(car);
    var want = HT.angleTo(p.x, p.z, wp.x + Math.sin(car.group.rotation.y) * 30, wp.z + Math.cos(car.group.rotation.y) * 30);
    car.group.rotation.y = HT.angleLerp(car.group.rotation.y, want, 0.03);
    // keep a gap to the car ahead
    var ahead = V.nearestCar(p.x + Math.sin(car.group.rotation.y) * 7, p.z + Math.cos(car.group.rotation.y) * 7, 5.5,
      function (c) { return c !== car; });
    var sp = ahead ? Math.min(t.speed, Math.max(0, ahead.speed)) : t.speed;
    car.speed = HT.lerp(car.speed, sp, dt * 2);
    moveCar(car, dt);
  }

  // shared kinematics: advance a car along its heading, settle collisions
  function moveCar(car, dt) {
    var p = car.group.position, h = car.group.rotation.y;
    p.x += Math.sin(h) * car.speed * dt;
    p.z += Math.cos(h) * car.speed * dt;
    var fixed = HT.World.collideCircle(p.x, p.z, 1.7);
    if (Math.abs(fixed.x - p.x) > 0.01 || Math.abs(fixed.z - p.z) > 0.01) {
      if (Math.abs(car.speed) > 6) HT.Audio.thud();
      car.speed *= 0.55;
    }
    p.x = fixed.x; p.z = fixed.z;
    p.y = HT.groundY(p.x, p.z);
    for (var i = 0; i < car.wheels.length; i++) car.wheels[i].rotation.x += car.speed * dt / 0.37;
  }
  V.moveCar = moveCar;

  // ---------- player driving ----------
  V.drivePlayer = function (car, dt) {
    var eng = 1 + (HT.G.garage.engine || 0) * 0.13;
    var top = car.spec.top * (car === HT.G.starterCar ? eng : 1);
    var acc = car.spec.acc * (car === HT.G.starterCar ? eng : 1);
    var fwd = HT.key("KeyW") || HT.key("ArrowUp");
    var back = HT.key("KeyS") || HT.key("ArrowDown");
    var left = HT.key("KeyA") || HT.key("ArrowLeft");
    var right = HT.key("KeyD") || HT.key("ArrowRight");
    if (fwd) car.speed += acc * dt;
    else if (back) car.speed -= (car.speed > 0.5 ? 22 : 8) * dt;
    else car.speed -= car.speed * 0.55 * dt; // engine braking / drag
    car.speed = HT.clamp(car.speed, -10, top);
    var steer = (left ? 1 : 0) - (right ? 1 : 0);
    if (steer !== 0 && Math.abs(car.speed) > 0.4) {
      var grip = HT.key("Space") ? 1.9 : 1.15;
      car.group.rotation.y += steer * grip * dt * HT.clamp(car.speed / 12, -1.4, 1.4) * (car.speed < 0 ? -1 : 1);
      if (HT.key("Space")) car.speed -= car.speed * 0.5 * dt;
    }
    moveCar(car, dt);
    HT.Audio.engineUpdate(Math.abs(car.speed) / top, true);
  };

  // ---------- garage ----------
  V.PAINT_JOBS = [
    { name: "Reef Turquoise", color: 0x19b8a6, cost: 0 },
    { name: "Flamingo Pink", color: 0xff5f9e, cost: 250 },
    { name: "Sunset Gold", color: 0xffc93c, cost: 400 },
    { name: "Violet Haze", color: 0x8a5fb0, cost: 400 },
    { name: "Midnight", color: 0x23232e, cost: 300 }
  ];
  V.applyGarage = function () {
    var car = HT.G.starterCar;
    if (!car) return;
    var job = V.PAINT_JOBS[Math.max(0, HT.G.garage.paint)];
    if (HT.G.garage.paint >= 0 && job) {
      car.group.traverse(function (o) {
        if (o.isMesh && o.material && o.material.color && o.geometry &&
            o.geometry.parameters && o.geometry.parameters.width === 1.9) {
          o.material = new THREE.MeshLambertMaterial({ color: job.color });
        }
      });
      car.color = job.color;
    }
  };

  V.update = function (dt) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.dead || c.parked || c.isCop || c.isCrew || c.isRival) continue;
      if (HT.G.inCar === c) continue;
      if (c.traffic) updateTraffic(c, dt);
    }
  };
})();
