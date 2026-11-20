// hud.js — everything the player reads: money, respect and rank, stars, the
// district name with its STANDING meter, crew portraits with health, the
// round minimap (district-tinted, with crew, cops, rivals and objectives),
// the objective panel, the CKPD dispatch ticker, district banners, race
// position panel and countdown, dialogue, toasts — and the garage till.
(function () {
  "use strict";
  var HT = window.HT;
  var H = (HT.HUD = {});
  var el = {};
  var lastMoney = -1, lastStars = -1, toastT = 0, dispatchT = 0, bannerT = 0, radioT = 0;
  var mapBase = null;

  function $(id) { return document.getElementById(id); }
  H.init = function () {
    ["hud", "hud-money", "hud-respect-fill", "hud-rank", "hud-wanted", "hud-clock",
     "hud-health-fill", "hud-weapon", "hud-ammo", "hud-speed", "hud-car-name",
     "hud-district", "hud-standing-fill", "hud-standing-word", "hud-objective",
     "hud-objective-title", "hud-objective-text", "hud-objective-timer",
     "hud-dispatch", "hud-dispatch-text", "hud-banner", "hud-banner-district",
     "hud-banner-standing", "hud-race", "hud-race-pos", "hud-race-name",
     "hud-race-check", "hud-race-time", "hud-countdown", "hud-prompt", "hud-toast",
     "hud-bust-wrap", "hud-bust-fill", "crosshair", "dialogue", "dialogue-name",
     "dialogue-text", "radio-tag", "minimap", "crew-hp-0", "crew-hp-1",
     "crew-card-0", "crew-card-1", "hud-crew-car", "garage", "garage-money",
     "garage-paints", "garage-engine", "garage-armour", "garage-msg", "pause-standing"
    ].forEach(function (id) { el[id] = $(id); });
    buildMapBase();
    H.refreshWeapon();
    $("garage-close").addEventListener("click", function () { H.closeGarage(); });
  };

  // ---------- minimap base: land, district tints, roads, the volcano ----------
  function buildMapBase() {
    mapBase = document.createElement("canvas");
    mapBase.width = mapBase.height = 190;
    var g = mapBase.getContext("2d");
    g.fillStyle = "#14586e"; g.fillRect(0, 0, 190, 190);
    var S = 190 / 720;
    function px(v) { return (v + 360) * S; }
    for (var x = -340; x < 340; x += 17) {
      for (var z = -340; z < 340; z += 17) {
        g.fillStyle = HT.districtInfo(HT.districtAt(x, z)).color;
        g.fillRect(px(x), px(z), 17 * S + 1, 17 * S + 1);
      }
    }
    g.fillStyle = "#3c414d";
    HT.WORLD.roads.forEach(function (r) {
      g.fillRect(px(r - 9), 8, 18 * S, 174);
      g.fillRect(8, px(r - 9), 174, 18 * S);
    });
    g.fillStyle = "#2e2830"; // Mount Ember
    g.beginPath(); g.arc(px(-252), px(-302), 15, 0, 7); g.fill();
    g.fillStyle = "#ff7a26";
    g.beginPath(); g.arc(px(-252), px(-302), 4, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 2;
    g.beginPath(); g.arc(px(-180), px(84), 9, 0, 7); g.stroke(); // Old Town plaza
  }
  function drawMinimap() {
    var cv = el["minimap"];
    if (!cv || !mapBase) return;
    var g = cv.getContext("2d");
    var pp = HT.Player.pos();
    g.clearRect(0, 0, 190, 190);
    g.drawImage(mapBase, 0, 0);
    var S = 190 / 720;
    function px(v) { return (v + 360) * S; }
    function dot(x, z, color, r) {
      g.fillStyle = color;
      g.beginPath(); g.arc(px(x), px(z), r || 3, 0, 7); g.fill();
    }
    // objective / next job
    var target = null;
    if (HT.Missions) {
      var cur = HT.Missions.current;
      if (cur) {
        var st = cur.stage;
        if (st.type === "goto" || st.type === "steal") target = { x: st.x, z: st.z };
        else if (st.type === "collect") target = { x: st.points[cur.collectIdx][0], z: st.points[cur.collectIdx][1] };
        else if (st.type === "race" && HT.Races) { var rd = HT.Races.DEFS[0]; target = { x: rd.start.x, z: rd.start.z }; }
      } else {
        var nj = HT.Missions.nextJob();
        if (nj) target = { x: nj.at.x, z: nj.at.z };
      }
    }
    if (target) {
      g.strokeStyle = "#ffd23e"; g.lineWidth = 2;
      g.beginPath(); g.arc(px(target.x), px(target.z), 5 + Math.sin(HT.G.time * 5) * 1.2, 0, 7); g.stroke();
    }
    if (HT.Police && HT.Police.copPositions) {
      var flash = Math.sin(HT.G.time * 9) > 0;
      HT.Police.copPositions().forEach(function (p) { dot(p.x, p.z, flash ? "#ff4040" : "#4d8dff", 3); });
    }
    if (HT.Crew) {
      HT.Crew.members.forEach(function (m, i) {
        if (m.state === "shotgun" || m.state === "driver") return;
        var p = m.fig.group.position;
        dot(p.x, p.z, i === 0 ? "#39e6ff" : "#ff5f9e", 3);
      });
      if (HT.Crew.car && HT.G.inCar !== HT.Crew.car) {
        var cp = HT.Crew.car.group.position;
        dot(cp.x, cp.z, "#ff5f9e", 3.6);
      }
    }
    HT.Vehicles.cars.forEach(function (c) {
      if (c.isRival) dot(c.group.position.x, c.group.position.z, "#ffb35c", 3);
    });
    // the player arrow
    var yaw = HT.G.inCar ? HT.G.inCar.group.rotation.y : HT.Player.avatar.rotation.y;
    g.save();
    g.translate(px(pp.x), px(pp.z));
    g.rotate(Math.atan2(Math.sin(yaw), -Math.cos(yaw)) + Math.PI);
    g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4.4, 5); g.lineTo(-4.4, 5); g.closePath(); g.fill();
    g.restore();
  }

  // ---------- small pieces ----------
  H.refreshWeapon = function () {
    var G = HT.G;
    if (!el["hud-weapon"]) return;
    var w = HT.Combat.WEAPONS[G.weapon];
    el["hud-weapon"].textContent = w.name;
    el["hud-ammo"].textContent = G.weapon === 0 ? "" : G.ammo[G.weapon] + " / ∞";
    el["crosshair"].classList.toggle("hidden", !(G.weapon > 0 && G.state === "playing"));
  };
  H.refreshCar = function () {
    var G = HT.G;
    if (!el["hud-car-name"]) return;
    el["hud-car-name"].textContent = G.inCar ? G.inCar.name : "";
    if (!G.inCar) el["hud-speed"].textContent = "";
  };
  H.prompt = function (html) {
    if (!el["hud-prompt"]) return;
    if (html) { el["hud-prompt"].innerHTML = html; el["hud-prompt"].classList.remove("hidden"); }
    else el["hud-prompt"].classList.add("hidden");
  };
  H.toast = function (text) {
    if (!el["hud-toast"]) return;
    el["hud-toast"].textContent = text;
    el["hud-toast"].classList.remove("hidden");
    toastT = 2.8;
  };
  H.setObjective = function (title, text, timerSec) {
    if (!el["hud-objective"]) return;
    el["hud-objective"].classList.remove("hidden");
    el["hud-objective-title"].textContent = "🎯 " + title;
    el["hud-objective-text"].textContent = text;
    el["hud-objective-timer"].textContent = timerSec != null
      ? "⏱ " + Math.floor(timerSec / 60) + ":" + String(Math.floor(timerSec % 60)).padStart(2, "0") : "";
  };
  H.clearObjective = function () {
    if (el["hud-objective"]) el["hud-objective"].classList.add("hidden");
  };
  H.showDialogue = function (name, text) {
    el["dialogue-name"].textContent = name;
    el["dialogue-text"].textContent = text;
    el["dialogue"].classList.remove("hidden");
  };
  H.hideDialogue = function () { el["dialogue"].classList.add("hidden"); };
  H.showDispatch = function () {
    if (dispatchT > 0) return; // the update loop drains the queue
    drainDispatch();
  };
  function drainDispatch() {
    var q = HT.Dispatch.queue;
    if (!q.length) { el["hud-dispatch"].classList.add("hidden"); dispatchT = 0; return; }
    el["hud-dispatch-text"].textContent = q.shift();
    el["hud-dispatch"].classList.remove("hidden");
    dispatchT = 4.4;
  }
  H.standingFx = function (district, amt) {
    if (Math.abs(amt) >= 5 && HT.G.district === district) {
      H.toast((amt > 0 ? "📈" : "📉") + " " + district + " standing " + (amt > 0 ? "+" : "") + amt);
    }
  };
  function showBanner(district) {
    el["hud-banner-district"].textContent = district.toUpperCase();
    el["hud-banner-standing"].textContent =
      "STANDING · " + HT.standingWord(HT.G.standing[district]) + " " + Math.round(HT.G.standing[district]);
    el["hud-banner"].classList.remove("hidden");
    bannerT = 2.6;
  }

  // ---------- race HUD ----------
  H.showRace = function (name) {
    el["hud-race-name"].textContent = name;
    el["hud-race"].classList.remove("hidden");
    H.raceTick(4, 0, 1, 0);
  };
  H.raceTick = function (pos, cp, total, t) {
    el["hud-race-pos"].innerHTML = pos + "<span>/4</span>";
    el["hud-race-check"].textContent = "CHECKPOINT " + cp + "/" + total;
    el["hud-race-time"].textContent =
      Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0") + "." + Math.floor((t % 1) * 10);
  };
  H.hideRace = function () { el["hud-race"].classList.add("hidden"); };
  H.countdown = function (text) {
    if (text == null) el["hud-countdown"].classList.add("hidden");
    else {
      el["hud-countdown"].textContent = text;
      el["hud-countdown"].classList.remove("hidden");
    }
  };

  // ---------- garage ----------
  var ENGINE = [{ name: "Stock", cost: 0 }, { name: "Sport", cost: 500 }, { name: "Turbo", cost: 1100 }, { name: "Tide V8", cost: 2000 }];
  var ARMOUR = [{ name: "None", cost: 0 }, { name: "Light", cost: 400 }, { name: "Reinforced", cost: 900 }, { name: "Full", cost: 1600 }];
  H.openGarage = function () {
    HT.G.garageOpen = true;
    renderGarage();
    el["garage"].classList.remove("hidden");
    if (document.exitPointerLock) document.exitPointerLock();
  };
  H.closeGarage = function () {
    HT.G.garageOpen = false;
    el["garage"].classList.add("hidden");
    HT.saveGame();
  };
  function renderGarage() {
    var G = HT.G;
    el["garage-money"].textContent = "Your money: $" + G.money;
    el["garage-paints"].innerHTML = "";
    HT.Vehicles.PAINT_JOBS.forEach(function (job, i) {
      var b = document.createElement("button");
      b.textContent = job.name + (i === Math.max(0, G.garage.paint) && G.garage.paint >= 0 ? " ✔" : " — $" + job.cost);
      if (G.garage.paint === i) b.classList.add("owned");
      b.disabled = G.money < job.cost && G.garage.paint !== i;
      b.addEventListener("click", function () {
        if (G.money >= job.cost) {
          G.money -= job.cost; G.garage.paint = i;
          HT.Vehicles.applyGarage();
          el["garage-msg"].textContent = "Painted: " + job.name;
          HT.Audio.cash();
        }
        renderGarage();
      });
      el["garage-paints"].appendChild(b);
    });
    function tierRow(elm, tiers, cur, set) {
      elm.innerHTML = "";
      tiers.forEach(function (t, i) {
        var b = document.createElement("button");
        b.textContent = t.name + (i === cur ? " ✔" : i === cur + 1 ? " — $" + t.cost : "");
        if (i === cur) b.classList.add("owned");
        b.disabled = i !== cur + 1 || G.money < t.cost;
        b.addEventListener("click", function () {
          if (G.money >= t.cost) { G.money -= t.cost; set(i); el["garage-msg"].textContent = "Fitted: " + t.name; HT.Audio.cash(); }
          renderGarage();
        });
        elm.appendChild(b);
      });
    }
    tierRow(el["garage-engine"], ENGINE, G.garage.engine, function (i) { G.garage.engine = i; });
    tierRow(el["garage-armour"], ARMOUR, G.garage.armour, function (i) {
      G.garage.armour = i;
      if (HT.G.starterCar) HT.G.starterCar.hp = 100 + i * 60;
    });
  }

  // ---------- per-frame ----------
  H.update = function (dt) {
    var G = HT.G;
    if (!el["hud-money"]) return;
    if (G.money !== lastMoney) { el["hud-money"].textContent = "$" + G.money; lastMoney = G.money; }
    el["hud-respect-fill"].style.width = G.respect + "%";
    el["hud-rank"].textContent = HT.rankName(G.respect);
    var stars = G.wanted;
    if (stars !== lastStars) {
      var html = "";
      for (var i = 0; i < 5; i++) html += i < stars ? "★" : '<span class="off">★</span>';
      el["hud-wanted"].innerHTML = html;
      lastStars = stars;
    }
    G.clockMin += dt * 1.1;
    var hh = Math.floor(G.clockMin / 60) % 24, mm = Math.floor(G.clockMin % 60);
    el["hud-clock"].textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    el["hud-health-fill"].style.width = Math.max(0, G.health) + "%";
    if (G.inCar) {
      el["hud-speed"].textContent = Math.round(Math.abs(G.inCar.speed) * 3.6) + " km/h";
      el["hud-car-name"].textContent = G.inCar.name;
    }
    // crew cards
    if (HT.Crew) {
      HT.Crew.members.forEach(function (m, i) {
        el["crew-hp-" + i].style.width = Math.max(0, m.hp) + "%";
        el["crew-card-" + i].classList.toggle("downed", m.state === "downed");
      });
      el["hud-crew-car"].classList.toggle("hidden", !(HT.Crew.members[0].state === "driver"));
    }
    // district + standing
    var pp = HT.Player.pos();
    var dName = HT.districtAt(pp.x, pp.z);
    if (dName !== G.district) {
      G.district = dName;
      if (G.state === "playing" && !G.photoMode) showBanner(dName);
    }
    el["hud-district"].textContent = dName;
    el["hud-standing-fill"].style.width = G.standing[dName] + "%";
    el["hud-standing-word"].textContent = HT.standingWord(G.standing[dName]) + " " + Math.round(G.standing[dName]);
    // timers for transient panels
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) el["hud-toast"].classList.add("hidden"); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el["hud-banner"].classList.add("hidden"); }
    if (dispatchT > 0) { dispatchT -= dt; if (dispatchT <= 0) drainDispatch(); }
    if (radioT > 0) { radioT -= dt; if (radioT <= 0) el["radio-tag"].classList.add("hidden"); }
    // bust bar
    el["hud-bust-wrap"].classList.toggle("hidden", G.bust <= 0.02);
    el["hud-bust-fill"].style.width = (G.bust * 100) + "%";
    drawMinimap();

    if (G.state !== "playing") return;
    // garage + radio keys live here, next to their UI
    if (HT.pressed("KeyG") && G.inCar && !G.dialogue) {
      if (G.garageOpen) H.closeGarage(); else H.openGarage();
    }
    if (HT.pressed("KeyR") && G.inCar) {
      HT.Audio.init();
      var name = HT.Audio.cycleRadio();
      el["radio-tag"].textContent = "📻 " + name;
      el["radio-tag"].classList.remove("hidden");
      radioT = 2.2;
    }
    // street-race entry
    if (HT.Races && HT.Races.state === "idle" && !G.dialogue && !G.garageOpen) {
      var def = HT.Races.nearStart();
      if (def && G.inCar) {
        H.prompt("<b>E</b> — Enter " + def.name + " · " + def.district);
        if (HT.pressed("KeyE")) HT.Races.startRace(def);
      } else if (def && !G.inCar) {
        H.prompt("Get in a car to race " + def.name);
      }
    }
  };
})();
