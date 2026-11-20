// main.js — boot and the game loop for CORAL KEY: HIGH TIDE. Builds the
// renderer, world, player, crew, traffic and HUD; owns the top-level flow
// (start / pause / respawn / busted / wasted); and implements PHOTO MODE:
// opening the game with ?shot=cover|roadblock|race|crew (or the same in the
// hash) autostarts into a staged, living scene for taking pictures — each
// one picked to prove a headline system of this entry.
(function () {
  "use strict";
  var HT = window.HT;
  var G = HT.G;

  window.addEventListener("error", function (e) {
    var box = document.getElementById("errbox");
    if (box) { box.classList.remove("hidden"); box.textContent += (e.message || e.type) + "\n"; }
  });

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("canvas-holder").appendChild(renderer.domElement);
  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3200);
  HT.camera = camera;
  var scene = HT.World.build(renderer);
  HT.Player.build(scene);
  HT.Crew.build(scene);
  HT.Vehicles.spawnWorldCars();
  HT.Missions.buildMarker(scene);
  HT.Races.buildMarkers(scene);
  HT.HUD.init();
  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  renderer.domElement.addEventListener("click", function () {
    HT.Audio.init();
    if (G.state === "playing" && !G.garageOpen && !G.photoMode && !HT.mouse.locked) {
      renderer.domElement.requestPointerLock();
    }
  });

  // ---------- top-level flow ----------
  HT.startGame = function (fromSave) {
    HT.Audio.init();
    if (fromSave) HT.loadSave();
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    G.state = "playing";
    if (G.photoMode) setupPhoto();
    else HT.HUD.toast("Welcome back to Coral Key 🌴 — your crew is waiting");
  };
  HT.resumeGame = function () {
    if (G.state !== "paused") return;
    document.getElementById("pause-screen").classList.add("hidden");
    G.state = "playing";
  };
  HT.showEnd = function (kind) {
    if (G.state !== "playing") return;
    G.state = kind;
    var title = document.getElementById("end-title");
    var text = document.getElementById("end-text");
    if (kind === "busted") {
      title.textContent = "BUSTED";
      var fine = Math.min(G.money, 150);
      G.money -= fine;
      text.textContent = "The CKPD finally boxed you in. $" + fine + " in fines, your heat is gone, and the crew is already planning the next run.";
    } else {
      title.textContent = "WASTED";
      text.textContent = "You wake up outside the marina clinic with a headache, an empty magazine and a story Mico will never let you forget.";
    }
    document.getElementById("end-screen").classList.remove("hidden");
    if (document.exitPointerLock) document.exitPointerLock();
  };
  HT.respawn = function () {
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("pause-screen").classList.add("hidden");
    G.health = 100; G.heat = 0; G.bust = 0; G.seenTimer = 0;
    HT.Police.clearLock();
    HT.Police.despawnAll();
    if (G.inCar) HT.Player.exitCar();
    HT.Player.teleport(-168, 100);
    G.state = "playing";
  };
  function toggleHelp(force) {
    var help = document.getElementById("help-screen");
    var show = force !== undefined ? force : help.classList.contains("hidden");
    help.classList.toggle("hidden", !show);
    if (show) { G.prevState = G.state; G.state = "help"; }
    else G.state = G.prevState === "help" ? "playing" : G.prevState;
  }
  document.getElementById("btn-start").addEventListener("click", function () { HT.startGame(false); });
  document.getElementById("btn-continue").addEventListener("click", function () { HT.startGame(true); });
  document.getElementById("btn-resume").addEventListener("click", HT.resumeGame);
  document.getElementById("btn-restart").addEventListener("click", HT.respawn);
  document.getElementById("btn-again").addEventListener("click", HT.respawn);
  document.getElementById("btn-help2").addEventListener("click", function () { toggleHelp(true); });
  document.getElementById("btn-help-close").addEventListener("click", function () { toggleHelp(false); });
  if (HT.hasSave()) document.getElementById("btn-continue").classList.remove("hidden");

  // ---------- photo mode ----------
  function photoName() {
    var m = /[?&#]shot=(cover|roadblock|race|crew)/.exec(window.location.search + window.location.hash);
    return m ? m[1] : null;
  }
  function setupPhoto() {
    var name = G.photoMode;
    G.money = 2450; G.respect = 64;
    if (name === "cover") {
      HT.Crew.formation = "alongside";
      var car = G.starterCar;
      HT.Vehicles.place(car, -150, 244.3, Math.PI / 2);
      HT.Player.enterCar(car);
      HT.Vehicles.place(HT.Crew.car, -158, 236.9, Math.PI / 2);
      HT.G.standing["Neon Strip"] = 78;
      HT.Player.setCamYaw(2.29);
      HT.Player.camPitch = 0.16;
      HT.HUD.setObjective("HIGH TIDE", "Cruise the Neon Strip with your crew — Mico alongside, Paloma riding shotgun", null);
      HT.HUD.toast("🌅 GOLDEN HOUR ON THE STRIP");
    } else if (name === "roadblock") {
      HT.World.setDusk(true);
      var car2 = G.starterCar;
      HT.Vehicles.place(car2, 124.3, 2, Math.PI);
      HT.Player.enterCar(car2);
      // headlight beam for the night run
      var beam = new THREE.SpotLight(0xfff2b0, 2.2, 60, 0.42, 0.5);
      beam.position.set(0, 1, 2);
      car2.group.add(beam); car2.group.add(beam.target);
      beam.target.position.set(0, 0, 26);
      HT.Police.stageRoadblock(120, -30, Math.PI);
      HT.Police.spawnCopAt(117, 26);
      HT.Police.spawnCopAt(130, 34);
      HT.Police.stagePhotoHeli();
      HT.Police.setLock(5);
      G.heat = 5.2;
      HT.G.standing["Downtown"] = 63;
      HT.Player.setCamYaw(0.5);
      HT.Player.camPitch = 0.12;
      HT.HUD.setObjective("BREAK THE BLOCKADE", "AIR ONE has the light on you — roadblock ahead, punch through!", null);
      HT.Dispatch.say("AIR ONE is overhead with the light on them. Roadblock set on the avenue — do NOT let them through.");
    } else if (name === "race") {
      HT.Vehicles.place(G.starterCar, -246, 235.5, Math.PI / 2);
      HT.Player.enterCar(G.starterCar);
      HT.Races.stagePhotoRace();
      // Mico spectates from the kerb with the crew car; Paloma rides along
      HT.Vehicles.place(HT.Crew.car, -256, 254, Math.PI / 2);
      HT.Crew.toFoot(HT.Crew.members[0], HT.Crew.car);
      HT.Player.setCamYaw(Math.PI / 2 + Math.PI - 0.45);
      HT.Player.camPitch = 0.17;
      HT.HUD.toast("🏁 STRIP SPRINT — GRID IS SET");
    } else if (name === "crew") {
      G.respect = 52;
      HT.G.standing["Old Town"] = 71;
      HT.Player.teleport(-180, 99);
      HT.Player.avatar.rotation.y = 0;
      var mico = HT.Crew.members[0], paloma = HT.Crew.members[1];
      // stand them exactly on their follow slots so nobody shuffles mid-shot
      mico.fig.group.position.set(-181.7, HT.groundY(-181.7, 97.6), 97.6);
      paloma.fig.group.position.set(-178.3, HT.groundY(-178.3, 97.6), 97.6);
      mico.fig.group.rotation.y = 0.12;
      paloma.fig.group.rotation.y = -0.12;
      HT.Player.fixedCam = { x: -180, y: 3.4, z: 109.5, lx: -180, ly: 2, lz: 92 };
      HT.HUD.setObjective("CREW LOYALTY", "Meet the crew in Old Town — Mico and Paloma roll with you now", null);
      HT.Missions.say([
        ["PALOMA", "This is the crew, Jules. Mico keeps the cars alive — I keep us alive."],
        ["MICO", "Old Town already loves us. Rest of the island? Give it a week."]
      ], null);
    }
  }
  function photoDrive(dt) {
    var car = G.inCar;
    if (!car) return;
    if (G.photoMode === "cover") {
      car.speed = 15;
      var p = car.group.position;
      p.x += Math.sin(car.group.rotation.y) * car.speed * dt;
      p.z += Math.cos(car.group.rotation.y) * car.speed * dt;
      p.y = HT.groundY(p.x, p.z);
      car.wheels.forEach(function (w) { w.rotation.x += car.speed * dt / 0.37; });
      if (p.x > 250) p.x = -250;
    } else if (G.photoMode === "roadblock") {
      car.speed = 9;
      var p2 = car.group.position;
      p2.x += Math.sin(car.group.rotation.y) * car.speed * dt;
      p2.z += Math.cos(car.group.rotation.y) * car.speed * dt;
      p2.y = HT.groundY(p2.x, p2.z);
      car.wheels.forEach(function (w) { w.rotation.x += car.speed * dt / 0.37; });
      if (p2.z < -14) { p2.z = 2; p2.x = 124.3; }
    }
  }

  // ---------- menu backdrop camera ----------
  function menuCamera() {
    var t = G.time * 0.045;
    camera.position.set(Math.sin(t) * 150, 30 + Math.sin(G.time * 0.13) * 5, 235 + Math.cos(t) * 60);
    camera.lookAt(0, 6, 190);
  }

  // ---------- the loop ----------
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (G.state === "playing" || G.state === "menu") {
      G.time += dt;
      HT.World.update(dt);
      HT.Vehicles.update(dt);
    }
    if (G.state === "playing") {
      if (G.photoMode === "cover" || G.photoMode === "roadblock") photoDrive(dt);
      else if (!G.photoMode && G.inCar && !G.garageOpen && !G.dialogue) HT.Vehicles.drivePlayer(G.inCar, dt);
      HT.Player.update(dt);
      HT.Crew.update(dt);
      HT.Police.update(dt);
      HT.Combat.update(dt);
      HT.Races.update(dt);
      HT.Missions.update(dt);
      if (HT.pressed("KeyP") && !G.photoMode) {
        G.state = "paused";
        document.getElementById("pause-standing").textContent =
          "District standing — " + HT.DISTRICTS.map(function (d) {
            return d.name + " " + Math.round(G.standing[d.name]);
          }).join(" · ");
        document.getElementById("pause-screen").classList.remove("hidden");
        if (document.exitPointerLock) document.exitPointerLock();
      }
      if (HT.pressed("KeyH")) toggleHelp(true);
    } else if (G.state === "menu") menuCamera();
    else if (G.state === "help" && HT.pressed("KeyH")) toggleHelp(false);
    HT.HUD.update(dt);
    renderer.render(scene, camera);
    HT.clearPressed();
  }

  G.photoMode = photoName();
  if (G.photoMode) HT.startGame(false);
  requestAnimationFrame(frame);
})();
