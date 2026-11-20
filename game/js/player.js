// player.js — Jules, the driver: a low-poly figure who walks, sprints and
// jumps on foot, orbits a mouse camera, and climbs into any car (stealing
// occupied ones). In an open-top car the figure stays visible, seated;
// in a closed car it rides hidden like everyone else.
(function () {
  "use strict";
  var HT = window.HT;
  var P = (HT.Player = {});
  var fig = null, vy = 0, airY = 0;
  P.camYaw = Math.PI, P.camPitch = 0.32;
  P.fixedCam = null; // {x,y,z,lx,ly,lz} — photo staging locks the camera here

  P.build = function (scene) {
    fig = HT.buildFigure({
      skin: 0xc98d64, shirt: 0xff8f3c, legs: 0x27313d, hair: 0x14100c
    });
    fig.group.position.set(-168, 0, 100);
    scene.add(fig.group);
    P.avatar = fig.group;
    P.fig = fig;
  };
  P.pos = function () {
    if (HT.G.inCar) return HT.G.inCar.group.position;
    return fig.group.position;
  };
  P.teleport = function (x, z) {
    if (HT.G.inCar) P.exitCar();
    fig.group.position.set(x, HT.groundY(x, z), z);
    airY = 0; vy = 0;
  };
  P.setCamYaw = function (yaw) { P.camYaw = yaw; };

  // seat a figure in a car (open-top only) or hide it inside a closed car
  P.seatFigure = function (figure, car, seatX) {
    if (car.type === "convertible") {
      car.group.add(figure.group);
      figure.group.position.set(seatX, 0.32, 0.05);
      figure.group.rotation.set(0, 0, 0);
      figure.group.scale.set(1, 0.78, 1);
      figure.idle();
      figure.group.visible = true;
    } else {
      figure.group.visible = false;
    }
  };
  P.unseatFigure = function (figure, worldX, worldZ) {
    HT.World.scene.add(figure.group);
    figure.group.scale.set(1, 1, 1);
    figure.group.position.set(worldX, HT.groundY(worldX, worldZ), worldZ);
    figure.group.rotation.set(0, 0, 0);
    figure.group.visible = true;
  };

  P.enterCar = function (car) {
    var G = HT.G;
    if (car.traffic) { // carjacking: the driver bails and runs
      var dp = car.group.position;
      var ped = HT.makePed(dp.x + 2, dp.z + 1);
      ped.flee = 4; ped.fleeFrom = { x: dp.x, z: dp.z };
      car.traffic = null;
      if (HT.Police) HT.Police.reportCrime("carjack", dp.x, dp.z, 0.7);
      HT.fleePeds(dp.x, dp.z, 9);
    }
    car.parked = false;
    G.inCar = car;
    P.seatFigure(fig, car, -0.45);
    if (HT.Crew) HT.Crew.onPlayerEnterCar(car);
    if (HT.HUD) HT.HUD.refreshCar();
  };
  P.exitCar = function () {
    var G = HT.G;
    var car = G.inCar;
    if (!car) return;
    var p = car.group.position, h = car.group.rotation.y;
    var sx = p.x - Math.cos(h) * 2.4, sz = p.z + Math.sin(h) * 2.4;
    G.inCar = null;
    car.speed = 0;
    P.unseatFigure(fig, sx, sz);
    HT.Audio.engineUpdate(0, false);
    if (HT.Crew) HT.Crew.onPlayerExitCar();
    if (HT.HUD) HT.HUD.refreshCar();
  };

  P.damage = function (amt) {
    var G = HT.G;
    if (G.state !== "playing" || HT.G.photoMode) return;
    G.health = Math.max(0, G.health - amt);
    G.lastDamage = G.time;
    if (G.health <= 0 && HT.showEnd) HT.showEnd("wasted");
  };

  P.update = function (dt) {
    var G = HT.G;
    // camera input
    if (HT.mouse.locked) {
      P.camYaw -= HT.mouse.dx * 0.0032;
      P.camPitch = HT.clamp(P.camPitch + HT.mouse.dy * 0.0024, 0.05, 1.1);
    }
    HT.mouse.dx = 0; HT.mouse.dy = 0;

    if (HT.pressed("KeyF") && !G.dialogue && !G.garageOpen) {
      if (G.inCar) { if (Math.abs(G.inCar.speed) < 2.5) P.exitCar(); }
      else {
        var near = HT.Vehicles.nearestCar(fig.group.position.x, fig.group.position.z, 3.6,
          function (c) { return !c.isCrew || c === HT.Crew.car; });
        if (near && near !== (HT.Crew && HT.Crew.car)) P.enterCar(near);
        else if (near && HT.Crew && near === HT.Crew.car) P.enterCar(near);
      }
    }

    if (G.inCar) {
      var car = G.inCar;
      // chase camera: settle behind the car, mouse yaw adds an offset.
      // In photo mode the staged angle is held instead — a tracking shot.
      if (!G.photoMode) {
        var targetYaw = car.group.rotation.y + Math.PI;
        P.camYaw = HT.angleLerp(P.camYaw, targetYaw, HT.mouse.locked ? 0.02 : 0.06);
      }
      placeCamera(11, 3.8, car.group.position);
      return;
    }

    // ---- on foot ----
    var pos = fig.group.position;
    var fwd = (HT.key("KeyW") || HT.key("ArrowUp") ? 1 : 0) - (HT.key("KeyS") || HT.key("ArrowDown") ? 1 : 0);
    var strafe = (HT.key("KeyD") || HT.key("ArrowRight") ? 1 : 0) - (HT.key("KeyA") || HT.key("ArrowLeft") ? 1 : 0);
    var moving = fwd !== 0 || strafe !== 0;
    if (moving && !G.dialogue) {
      var speed = HT.key("ShiftLeft") || HT.key("ShiftRight") ? 7.2 : 4.3;
      // camera looks along -(sin,cos) of camYaw; map the input onto that frame
      var mx = -Math.sin(P.camYaw) * fwd + Math.cos(P.camYaw) * strafe;
      var mz = -Math.cos(P.camYaw) * fwd - Math.sin(P.camYaw) * strafe;
      var ml = Math.sqrt(mx * mx + mz * mz) || 1;
      pos.x += (mx / ml) * speed * dt;
      pos.z += (mz / ml) * speed * dt;
      fig.group.rotation.y = HT.angleLerp(fig.group.rotation.y, Math.atan2(mx, mz), 0.25);
      fig.walk(dt, speed);
    } else fig.idle();
    // hop
    if (HT.pressed("Space") && airY <= 0.01 && !G.dialogue) vy = 4.6;
    if (vy !== 0 || airY > 0) {
      airY += vy * dt; vy -= 13 * dt;
      if (airY <= 0) { airY = 0; vy = 0; }
    }
    var fixed = HT.World.collideCircle(pos.x, pos.z, 0.5);
    pos.x = fixed.x; pos.z = fixed.z;
    pos.y = HT.groundY(pos.x, pos.z) + airY;
    placeCamera(7.6, 2.6, pos);
    // health trickle back when the heat is off
    if (G.health > 0 && G.health < 100 && G.time - (G.lastDamage || 0) > 5) {
      G.health = Math.min(100, G.health + dt * 2.2);
    }
  };

  function placeCamera(dist, height, target) {
    var cam = HT.camera;
    if (!cam) return;
    if (P.fixedCam) {
      var f = P.fixedCam;
      cam.position.set(f.x, f.y, f.z);
      cam.lookAt(f.lx, f.ly, f.lz);
      return;
    }
    var cx = target.x + Math.sin(P.camYaw) * Math.cos(P.camPitch) * dist;
    var cz = target.z + Math.cos(P.camYaw) * Math.cos(P.camPitch) * dist;
    var cy = target.y + height + Math.sin(P.camPitch) * dist * 0.7;
    cam.position.set(cx, Math.max(cy, HT.groundY(cx, cz) + 1.4), cz);
    cam.lookAt(target.x, target.y + 1.6, target.z);
  }
})();
