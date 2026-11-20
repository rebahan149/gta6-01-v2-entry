// missions.js — the story of HIGH TIDE in eight jobs. A small stage machine
// (talk / goto / collect / escape / race / steal) drives gold-marker
// objectives with dialogue, timers and payouts. Every job pays money and
// respect and moves the STANDING of the district it ran in — the island
// remembers where you work.
(function () {
  "use strict";
  var HT = window.HT;
  var M = (HT.Missions = {});

  M.JOBS = [
    {
      id: "first-tide", title: "FIRST TIDE", giver: "MICO", need: 0,
      at: { x: -172, z: 92 }, district: "Old Town",
      intro: [
        ["MICO", "Jules! You actually came back to this rock. And you still owe me a gearbox."],
        ["YOU", "Put it on the tide tab, Mico. Who's the one in pink giving me the look?"],
        ["PALOMA", "Paloma. I drive, I plan, I don't do 'looks'. Get in — the Marina owes us money."],
        ["MICO", "First job's simple: wheels up, all three of us, Marina clubhouse. Try not to scratch the paint."]
      ],
      stages: [
        { type: "goto", x: 284, z: 84, r: 9, text: "Drive the crew to the Marina clubhouse" }
      ],
      reward: { money: 300, respect: 6, standing: [["Old Town", 6], ["Marina Del Sol", 4]] },
      outro: [["PALOMA", "See? The island pays people who show up together. Stick with the crew, Jules."]]
    },
    {
      id: "neon-errand", title: "NEON ERRAND", giver: "MADAME ONDA", need: 4,
      at: { x: -40, z: 282 }, district: "Neon Strip",
      intro: [
        ["MADAME ONDA", "My club singer lost her voice an hour before the show. Her 'medicine' is at La Copa, east end of the Strip."],
        ["YOU", "And the clock?"],
        ["MADAME ONDA", "The clock, darling, is the whole job. Bring it to the Downtown garage door — fast and unopened."]
      ],
      stages: [
        { type: "goto", x: 34, z: 282, r: 8, text: "Pick up the package outside LA COPA" },
        { type: "goto", x: 60, z: -40, r: 9, timer: 150, text: "Deliver it Downtown — before the show starts!" }
      ],
      reward: { money: 450, respect: 6, standing: [["Neon Strip", 7]] },
      outro: [["MADAME ONDA", "Unopened, on time, and the singer hits every note. The Strip remembers that."]]
    },
    {
      id: "ember-run", title: "EMBER RUN", giver: "DR. ASH", need: 12,
      at: { x: 168, z: -284 }, district: "Ember Hills",
      intro: [
        ["DR. ASH", "My seismometer up at the observatory caught the mountain clearing its throat. I need the core sample driven down — carefully."],
        ["YOU", "Carefully. Sure. And the police attention?"],
        ["DR. ASH", "The CKPD think the sample is… evidence. It is not. Probably. Drive, and lose them in the hills."]
      ],
      stages: [
        { type: "goto", x: 172, z: -286, r: 10, text: "Collect the core sample at the observatory" },
        { type: "escape", lock: 2, text: "Lose the CKPD — break their line of sight!" }
      ],
      reward: { money: 550, respect: 7, standing: [["Ember Hills", 8]] },
      outro: [["DR. ASH", "Sample secured, mountain quiet, police confused. A perfect experiment."]]
    },
    {
      id: "harbour-debts", title: "HARBOUR DEBTS", giver: "CAPTAIN REYES", need: 20,
      at: { x: 284, z: 84 }, district: "Marina Del Sol",
      intro: [
        ["CAPTAIN REYES", "Three boat owners owe this marina money, and all three are 'just about to pay'. Visit them."],
        ["YOU", "Politely?"],
        ["CAPTAIN REYES", "Politely is a spectrum, driver. Piers, boardwalk, south dock. They'll know the car."]
      ],
      stages: [
        { type: "collect", text: "Collect the three marina debts", points: [[322, 128], [262, 204], [296, 44]] }
      ],
      reward: { money: 600, respect: 6, standing: [["Marina Del Sol", 8]] },
      outro: [["CAPTAIN REYES", "Every cent. The marina eats because you knocked. Standing earned."]]
    },
    {
      id: "strip-heat", title: "STRIP HEAT", giver: "VEX", need: 28,
      at: { x: -242, z: 252 }, district: "Neon Strip",
      intro: [
        ["VEX", "Heard the crew thinks it can drive. The Strip Sprint is MY race, my flags, my money."],
        ["PALOMA", "Finish top two and we take his crown AND his cash, Jules. Grid's at the flags — get us in a car."],
        ["VEX", "Top two, tourist. Or don't come back to my start line."]
      ],
      stages: [
        { type: "race", race: "strip", top: 2, text: "Enter the STRIP SPRINT at the flags and finish top 2" }
      ],
      reward: { money: 700, respect: 8, standing: [["Neon Strip", 8]] },
      outro: [["VEX", "…Fine. The Strip's got a new problem, and it's you three."]]
    },
    {
      id: "volcano-post", title: "VOLCANO POST", giver: "FATHER BRUNO", need: 38,
      at: { x: -178, z: 46 }, district: "Ember Hills",
      intro: [
        ["FATHER BRUNO", "The rim cabin holds the old parish bell's clapper — thieves have circled it for weeks. Bring it down to the ferry pier for the morning boat."],
        ["YOU", "And if the CKPD circles too?"],
        ["FATHER BRUNO", "Then drive like the mountain is watching, child. Because it is."]
      ],
      stages: [
        { type: "goto", x: -108, z: -308, r: 9, text: "Collect the bell clapper at the rim cabin" },
        { type: "goto", x: -312, z: 178, r: 10, lock: 3, text: "Deliver it to the ferry pier — the CKPD want it too!" }
      ],
      reward: { money: 800, respect: 9, standing: [["Ember Hills", 6], ["Old Town", 6]] },
      outro: [["FATHER BRUNO", "The bell will ring over the bay again. The hills — and I — thank you."]]
    },
    {
      id: "crew-loyalty", title: "CREW LOYALTY", giver: "PALOMA", need: 48,
      at: { x: -172, z: 92 }, district: "Downtown",
      intro: [
        ["PALOMA", "The CKPD impounded my brother's Vela last night — it sits in their Downtown lot like a trophy."],
        ["YOU", "You want me to steal a car from the police. From INSIDE the police lot."],
        ["PALOMA", "I want you to be crew. Mico's already warming up. Get in it, and don't stop for anybody."]
      ],
      stages: [
        { type: "steal", x: 132, z: -104, text: "Steal Paloma's brother's Vela from the CKPD impound lot" },
        { type: "escape", lock: 3, text: "Lose the CKPD — break their line of sight!" }
      ],
      reward: { money: 900, respect: 10, standing: [["Downtown", 8], ["Old Town", 4]] },
      outro: [["PALOMA", "That's what crew means. Nobody takes from us. NOBODY."]]
    },
    {
      id: "high-tide", title: "HIGH TIDE", giver: "MADAME ONDA", need: 58,
      at: { x: -40, z: 282 }, district: "Neon Strip",
      intro: [
        ["MADAME ONDA", "One last tide, darling. A gold Brisa GT waits Downtown — a gift for someone leaving on the morning ferry."],
        ["MICO", "Four stars of 'gift', she means. The whole island will watch this one."],
        ["PALOMA", "Then let's give them a show. Gold car, ferry pier, nobody stops us. Crew forever."]
      ],
      stages: [
        { type: "steal", x: 8, z: -64, gold: true, text: "Take the gold Brisa GT Downtown" },
        { type: "goto", x: -312, z: 178, r: 10, lock: 4, text: "Deliver it to the ferry pier — ROADBLOCKS and AIR ONE expected!" }
      ],
      reward: { money: 2000, respect: 15, standing: [["Neon Strip", 5], ["Downtown", 5], ["Old Town", 5], ["Marina Del Sol", 5], ["Ember Hills", 5]] },
      outro: [["MADAME ONDA", "The tide came in, and it carried your names. The island is yours now — all five districts of it."]]
    }
  ];

  var marker = null, markerRing = null;
  M.current = null; // { job, stageIdx, stage, collectIdx, spawnedCar }
  var stageT = 0;

  M.buildMarker = function (scene) {
    var geo = new THREE.CylinderGeometry(2.6, 2.6, 30, 14, 1, true);
    marker = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xffd23e, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    marker.visible = false;
    scene.add(marker);
    markerRing = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.22, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    markerRing.rotation.x = Math.PI / 2;
    markerRing.visible = false;
    scene.add(markerRing);
  };
  function setMarker(x, z) {
    if (!marker) return;
    marker.visible = markerRing.visible = true;
    marker.position.set(x, HT.groundY(x, z) + 15, z);
    markerRing.position.set(x, HT.groundY(x, z) + 0.4 + Math.sin(HT.G.time * 3) * 0.25, z);
  }
  function hideMarker() {
    if (marker) marker.visible = markerRing.visible = false;
  }

  // ---------- dialogue ----------
  M.say = function (lines, cb) {
    HT.G.dialogue = { lines: lines, i: 0, cb: cb || null };
    if (HT.HUD) HT.HUD.showDialogue(lines[0][0], lines[0][1]);
  };
  function endDialogue() {
    var d = HT.G.dialogue;
    HT.G.dialogue = null;
    if (HT.HUD) HT.HUD.hideDialogue();
    if (d && d.cb) d.cb();
  }

  M.nextJob = function () {
    var G = HT.G;
    if (G.jobIndex >= M.JOBS.length) return null;
    return M.JOBS[G.jobIndex];
  };

  function startStage(idx) {
    var cur = M.current;
    cur.stageIdx = idx;
    cur.stage = cur.job.stages[idx];
    stageT = cur.stage.timer || 0;
    var st = cur.stage;
    if (st.lock && st.type === "goto") HT.Police.setLock(st.lock);
    if (st.type === "escape") {
      HT.Police.setLock(st.lock || 2);
      var pp = HT.Player.pos();
      HT.Police.reportCrime("mayhem", pp.x, pp.z, 1.2);
    }
    if (st.type === "steal" && !cur.spawnedCar) {
      var car = HT.Vehicles.makeCar(st.gold ? "convertible" : "racer",
        st.gold ? 0xffc93c : 0xe8e3d8, st.x, st.z, HT.randRange(0, 3));
      car.parked = true;
      cur.spawnedCar = car;
    }
    if (HT.HUD) HT.HUD.setObjective(cur.job.title, st.text, stageT || null);
  }
  function startJob(job) {
    M.current = { job: job, stageIdx: 0, collectIdx: 0, spawnedCar: null };
    M.say(job.intro, function () { startStage(0); });
  }
  function completeJob() {
    var cur = M.current, job = cur.job, G = HT.G;
    G.money += job.reward.money;
    G.respect = HT.clamp(G.respect + job.reward.respect, 0, 100);
    job.reward.standing.forEach(function (s) { HT.addStanding(s[0], s[1]); });
    G.jobDone[job.id] = true;
    G.jobIndex++;
    if (cur.spawnedCar && job.id !== "crew-loyalty" && job.id !== "high-tide") { /* the gold car stays yours */ }
    M.current = null;
    hideMarker();
    if (HT.HUD) {
      HT.HUD.clearObjective();
      HT.HUD.toast("✔ " + job.title + " — +$" + job.reward.money + " · +" + job.reward.respect + " RESPECT");
    }
    HT.Audio.cash();
    HT.Dispatch.say("Chatter on the street: the crew just ran '" + job.title + "'. Their " + job.district + " standing climbs.");
    M.say(job.outro, null);
    HT.saveGame();
  }
  function nextStage() {
    var cur = M.current;
    if (cur.stage.lock && cur.stage.type === "goto") HT.Police.clearLock();
    if (cur.stageIdx + 1 >= cur.job.stages.length) completeJob();
    else startStage(cur.stageIdx + 1);
  }
  M.onRaceFinish = function (raceId, pos) {
    var cur = M.current;
    if (!cur || cur.stage.type !== "race") return;
    if (cur.stage.race === raceId && pos <= cur.stage.top) nextStage();
    else if (HT.HUD) HT.HUD.toast("Top " + cur.stage.top + " needed for " + cur.job.title + "!");
  };

  M.update = function (dt) {
    var G = HT.G;
    // dialogue advance
    if (G.dialogue) {
      hideMarker();
      if (HT.pressed("KeyE") || HT.pressed("Enter")) {
        var d = G.dialogue;
        d.i++;
        if (d.i >= d.lines.length) endDialogue();
        else if (HT.HUD) HT.HUD.showDialogue(d.lines[d.i][0], d.lines[d.i][1]);
      }
      return;
    }
    var pp = HT.Player.pos();

    if (!M.current) {
      var job = M.nextJob();
      if (!job) { hideMarker(); return; }
      setMarker(job.at.x, job.at.z);
      var near = HT.dist2d(pp.x, pp.z, job.at.x, job.at.z) < 4.2 && !G.inCar;
      if (HT.HUD) HT.HUD.prompt(near
        ? (G.respect >= job.need
          ? "<b>E</b> — Talk to " + job.giver + " · " + job.title
          : job.giver + " — needs RESPECT " + job.need + " (you: " + G.respect + ")")
        : null);
      if (near && G.respect >= job.need && HT.pressed("KeyE")) startJob(job);
      return;
    }

    var cur = M.current, st = cur.stage;
    // the marker for a race stage sits on the race's own start flags
    var raceNear = HT.Races && HT.Races.nearStart();
    if (st.timer) {
      stageT -= dt;
      if (HT.HUD) HT.HUD.setObjective(cur.job.title, st.text, Math.max(0, stageT));
      if (stageT <= 0) {
        if (HT.HUD) { HT.HUD.toast("⏰ Out of time — " + cur.job.title + " is off"); HT.HUD.clearObjective(); }
        if (st.lock) HT.Police.clearLock();
        M.current = null;
        hideMarker();
        return;
      }
    }
    switch (st.type) {
      case "goto":
        setMarker(st.x, st.z);
        if (HT.dist2d(pp.x, pp.z, st.x, st.z) < st.r) nextStage();
        break;
      case "collect": {
        var pt = st.points[cur.collectIdx];
        setMarker(pt[0], pt[1]);
        if (HT.HUD) HT.HUD.setObjective(cur.job.title, st.text + " (" + cur.collectIdx + "/" + st.points.length + ")", null);
        if (HT.dist2d(pp.x, pp.z, pt[0], pt[1]) < 7) {
          cur.collectIdx++;
          HT.Audio.chime();
          G.money += 120;
          if (HT.HUD) HT.HUD.toast("Debt collected 💵 (" + cur.collectIdx + "/" + st.points.length + ")");
          if (cur.collectIdx >= st.points.length) nextStage();
        }
        break;
      }
      case "escape":
        hideMarker();
        if (G.seenTimer > 4) {
          HT.Police.clearLock();
          G.heat = 0;
          nextStage();
        }
        break;
      case "steal":
        setMarker(st.x, st.z);
        if (cur.spawnedCar && G.inCar === cur.spawnedCar) nextStage();
        break;
      case "race":
        if (raceNear) setMarker(raceNear.start.x, raceNear.start.z);
        else hideMarker();
        break;
    }
    void raceNear;
  };
})();
