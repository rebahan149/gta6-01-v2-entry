// world.js — Coral Key at high tide: golden-hour sky and sea, a painted road
// grid, and five districts with their own ground, buildings and landmarks —
// the Neon Strip (deco hotels, neon), Marina Del Sol (piers, yachts,
// lighthouse), Old Town (plaza, church, market stalls), Downtown (glass
// towers) and the Ember Hills (a basalt volcanic rim with Mount Ember, its
// lava cracks, and the observatory). Plus palms, lamps, props, colliders,
// and the ambient pedestrians. A dusk preset flips the light for night work.
(function () {
  "use strict";
  var HT = window.HT;
  var W = (HT.World = {});
  var colliders = (W.colliders = []);
  var peds = (HT.peds = []);
  var bobbers = [], sparkles = null, waterTex = null, beam = null;
  var sunLight = null, hemi = null, skyUniforms = null, smoke = [];
  var scene;

  function addCollider(x, z, hw, hd) {
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  }
  W.collideCircle = function (x, z, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var nx = HT.clamp(x, c.minX, c.maxX), nz = HT.clamp(z, c.minZ, c.maxZ);
      var dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 0.0001) { var d = Math.sqrt(d2); x = nx + (dx / d) * r; z = nz + (dz / d) * r; }
        else {
          var l = x - c.minX, rt = c.maxX - x, tp = z - c.minZ, bt = c.maxZ - z;
          var m = Math.min(l, rt, tp, bt);
          if (m === l) x = c.minX - r; else if (m === rt) x = c.maxX + r;
          else if (m === tp) z = c.minZ - r; else z = c.maxZ + r;
        }
      }
    }
    return { x: HT.clamp(x, -336, 336), z: HT.clamp(z, -336, 336) };
  };

  // ---------- canvas texture helpers ----------
  function canvasTex(w, h, draw, rx, ry) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  }
  function facadeTex(base, trim, floors, cols, litRatio) {
    return canvasTex(128, 256, function (g) {
      g.fillStyle = base; g.fillRect(0, 0, 128, 256);
      g.fillStyle = trim; g.fillRect(0, 0, 128, 10); g.fillRect(0, 246, 128, 10);
      var ww = 128 / cols, hh = 246 / floors;
      for (var y = 0; y < floors; y++) for (var x = 0; x < cols; x++) {
        var lit = HT.rand() < (litRatio || 0.42);
        g.fillStyle = lit ? (HT.rand() < 0.5 ? "#ffd98a" : "#ffb35c") : "#2b3a55";
        g.fillRect(x * ww + 4, 14 + y * hh + 3, ww - 8, hh - 7);
        g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x * ww + 4, 14 + y * hh + 3, ww - 8, 3);
      }
    });
  }
  function neonTex(text, color) {
    return canvasTex(256, 64, function (g) {
      g.fillStyle = "#14102a"; g.fillRect(0, 0, 256, 64);
      g.font = "900 30px 'Trebuchet MS', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowColor = color; g.shadowBlur = 16; g.fillStyle = color;
      g.fillText(text, 128, 34); g.shadowBlur = 6; g.fillStyle = "#ffffff";
      g.globalAlpha = 0.85; g.fillText(text, 128, 34);
    });
  }

  // ---------- the island ground, painted on one big canvas ----------
  function groundTexture() {
    var S = 2048, half = 360;
    function px(v) { return (v + half) / (half * 2) * S; }
    return canvasTex(S, S, function (g) {
      g.fillStyle = "#c9a06b"; g.fillRect(0, 0, S, S);                                   // sand
      g.fillStyle = "#7fae5f"; g.fillRect(px(-338), px(-338), px(338) - px(-338), px(338) - px(-338)); // grass
      g.fillStyle = "#b39b6d"; g.fillRect(px(-338), px(-248), px(-130) - px(-338), px(248) - px(-248)); // Old Town stone
      g.fillStyle = "#8a8f96"; g.fillRect(px(-338), px(-190), px(-248) - px(-338), px(90) - px(-190));  // old port concrete
      g.fillStyle = "#b9c0c4"; g.fillRect(px(248), px(30), px(338) - px(248), px(240) - px(30));        // marina apron
      g.fillStyle = "#4c434a"; g.fillRect(px(-338), px(-338), px(338) - px(-338), px(-248) - px(-338)); // Ember basalt
      g.fillStyle = "#e8cf9e"; g.fillRect(px(-338), px(312), px(338) - px(-338), px(338) - px(312));    // south beach
      // Old Town plaza: a warm stone circle with a ring pattern
      g.fillStyle = "#c7ab7c";
      g.beginPath(); g.arc(px(-180), px(84), px(-148) - px(-180), 0, 7); g.fill();
      g.strokeStyle = "#9a7c50"; g.lineWidth = 5;
      g.beginPath(); g.arc(px(-180), px(84), (px(-148) - px(-180)) * 0.62, 0, 7); g.stroke();
      // lava cracks glowing out of Mount Ember
      g.strokeStyle = "#ff6a26"; g.lineWidth = 4; g.shadowColor = "#ff6a26"; g.shadowBlur = 9;
      var cracks = [[-252, -300, -236, -282], [-252, -300, -272, -284], [-252, -300, -244, -318],
                    [-236, -282, -224, -266], [-272, -284, -286, -270], [-244, -318, -238, -330]];
      cracks.forEach(function (c) {
        g.beginPath(); g.moveTo(px(c[0]), px(c[1])); g.lineTo(px(c[2]), px(c[3])); g.stroke();
      });
      g.shadowBlur = 0;
      // roads: sidewalk aprons, asphalt, dashed gold centrelines
      var roads = HT.WORLD.roads, rh = HT.WORLD.roadHalf;
      roads.forEach(function (r) {
        g.fillStyle = "#d8c49a"; g.fillRect(px(r - rh - 2.5), px(-338), px(r + rh + 2.5) - px(r - rh - 2.5), px(338) - px(-338));
        g.fillStyle = "#3c414d"; g.fillRect(px(r - rh), px(-338), px(r + rh) - px(r - rh), px(338) - px(-338));
        g.fillStyle = "#d8c49a"; g.fillRect(px(-338), px(r - rh - 2.5), px(338) - px(-338), px(r + rh + 2.5) - px(r - rh - 2.5));
        g.fillStyle = "#3c414d"; g.fillRect(px(-338), px(r - rh), px(338) - px(-338), px(r + rh) - px(r - rh));
        g.strokeStyle = "#ffc46b"; g.lineWidth = 3; g.setLineDash([16, 14]);
        g.beginPath(); g.moveTo(px(r), px(-338)); g.lineTo(px(r), px(338)); g.stroke();
        g.beginPath(); g.moveTo(px(-338), px(r)); g.lineTo(px(338), px(r)); g.stroke();
        g.setLineDash([]);
      });
      g.fillStyle = "rgba(255,255,255,.75)";
      roads.forEach(function (rx) { roads.forEach(function (rz) {
        for (var i = -3; i <= 3; i++) {
          g.fillRect(px(rx - 8 + i * 2.6), px(rz - rh - 4), 4, 6);
          g.fillRect(px(rx - rh - 4), px(rz - 8 + i * 2.6), 6, 4);
        }
      }); });
      g.fillStyle = "#e6b8a2"; g.fillRect(px(-338), px(252), px(338) - px(-338), px(284) - px(252)); // promenade
      g.fillStyle = "#caa27e"; g.fillRect(px(252), px(52), px(338) - px(252), 10);                    // boardwalk
    });
  }

  W.build = function (renderer) {
    scene = new THREE.Scene();
    W.scene = scene;
    scene.fog = new THREE.Fog(0xeda06d, 220, 980);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // gradient sky dome with a day/dusk palette the dusk preset can retint
    skyUniforms = {
      sunDir: { value: new THREE.Vector3(-0.55, 0.16, 0.42).normalize() },
      uTop: { value: new THREE.Color(0x21295e) },
      uMid: { value: new THREE.Color(0xd9736b) },
      uHor: { value: new THREE.Color(0xffb86b) }
    };
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: skyUniforms,
      vertexShader: "varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec3 vW; uniform vec3 sunDir; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor;" +
        "void main(){ float h = clamp(vW.y, -0.05, 1.0);" +
        " vec3 col = mix(uHor, mix(uMid, uTop, smoothstep(0.12,0.65,h)), smoothstep(0.0,0.14,h));" +
        " float s = pow(max(dot(normalize(vW), sunDir), 0.0), 42.0);" +
        " col += vec3(1.0,0.62,0.30) * s * 0.5;" +
        " float disc = smoothstep(0.99955,0.99985, dot(normalize(vW), sunDir));" +
        " col += vec3(1.0,0.85,0.6) * disc * 1.6;" +
        " gl_FragColor = vec4(col, 1.0); }"
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), skyMat));

    var sunDir = new THREE.Vector3(-0.55, 0.30, 0.42).normalize();
    sunLight = new THREE.DirectionalLight(0xffb36b, 2.6);
    sunLight.position.copy(sunDir).multiplyScalar(420);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -390; sunLight.shadow.camera.right = 390;
    sunLight.shadow.camera.top = 390; sunLight.shadow.camera.bottom = -390;
    sunLight.shadow.camera.far = 1100; sunLight.shadow.bias = -0.0006;
    scene.add(sunLight); scene.add(sunLight.target);
    hemi = new THREE.HemisphereLight(0xffc9a0, 0x1d4e5e, 0.85);
    scene.add(hemi);
    var bounce = new THREE.DirectionalLight(0x7de8ff, 0.35);
    bounce.position.set(200, 120, -260); scene.add(bounce);

    // sea with a drifting sparkle texture + twinkling shore points
    waterTex = canvasTex(256, 256, function (g) {
      g.fillStyle = "#14586e"; g.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 500; i++) {
        g.fillStyle = "rgba(255," + (190 + (HT.rand() * 60 | 0)) + ",140," + (HT.rand() * 0.5 + 0.1) + ")";
        g.fillRect(HT.rand() * 256, HT.rand() * 256, HT.rand() * 3 + 1, 1.4);
      }
      for (var j = 0; j < 160; j++) {
        g.fillStyle = "rgba(20,40,80,.25)";
        g.fillRect(HT.rand() * 256, HT.rand() * 256, HT.rand() * 22 + 6, 2);
      }
    }, 60, 60);
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000),
      new THREE.MeshPhongMaterial({ map: waterTex, color: 0x9fd4de, shininess: 90, specular: 0xffc98a })
    );
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7;
    scene.add(sea);
    var sg = new THREE.BufferGeometry(), sp = [];
    for (var s = 0; s < 420; s++) {
      var a = HT.rand() * Math.PI * 2, rr = 348 + HT.rand() * 130;
      sp.push(Math.cos(a) * rr, -0.2, Math.sin(a) * rr);
    }
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    sparkles = new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xffd9a0, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(sparkles);

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(720, 720),
      new THREE.MeshLambertMaterial({ map: groundTexture() })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);
    var hill = new THREE.Mesh(
      new THREE.BoxGeometry(680, HT.WORLD.hillH, 160),
      new THREE.MeshLambertMaterial({ color: 0x6a5a58 })
    );
    hill.position.set(0, HT.WORLD.hillH / 2 - 0.05, -322);
    hill.receiveShadow = true;
    scene.add(hill);

    buildDistricts(scene);
    buildPalmsAndLamps(scene);
    buildPeds(scene);
    return scene;
  };

  // Day <-> dusk: retint sky, fog and sun for the night roadblock scene.
  W.setDusk = function (on) {
    HT.G.dusk = on;
    if (!skyUniforms) return;
    if (on) {
      skyUniforms.uTop.value.set(0x0a0f2e); skyUniforms.uMid.value.set(0x2c2350); skyUniforms.uHor.value.set(0x5a3a6e);
      sunLight.intensity = 0.42; sunLight.color.set(0x8fa8ff);
      hemi.intensity = 0.26;
      scene.fog.color.set(0x2a2140);
    } else {
      skyUniforms.uTop.value.set(0x21295e); skyUniforms.uMid.value.set(0xd9736b); skyUniforms.uHor.value.set(0xffb86b);
      sunLight.intensity = 2.6; sunLight.color.set(0xffb36b);
      hemi.intensity = 0.85;
      scene.fog.color.set(0xeda06d);
    }
  };

  // ---------- buildings & districts ----------
  var roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3b47 });
  var darkMat = new THREE.MeshLambertMaterial({ color: 0x2c2733 });
  var terraMat = new THREE.MeshLambertMaterial({ color: 0xb5563c });
  var facadeMats = [], glassMats = [], oldMats = [];
  function makeFacades() {
    var palettes = [
      ["#e8e3d8", "#b8ab90"], ["#f2c9a4", "#c98f5f"], ["#a8d8d0", "#5f9e94"],
      ["#f4b8c1", "#c97f8e"], ["#cfe0f2", "#7d9bbd"], ["#f7e8b0", "#c9a959"]
    ];
    palettes.forEach(function (p, i) {
      facadeMats.push(new THREE.MeshLambertMaterial({ map: facadeTex(p[0], p[1], 6 + (i % 4), 4 + (i % 3)) }));
    });
    for (var gi = 0; gi < 3; gi++) {
      glassMats.push(new THREE.MeshLambertMaterial({
        map: facadeTex(["#9fc4e8", "#7fb2d9", "#b8d4ea"][gi], "#5a7a9e", 12, 6, 0.62)
      }));
    }
    var oldPal = [["#e6cf9e", "#b5563c"], ["#dfc096", "#a34a34"], ["#ecd9ae", "#bb6644"]];
    oldPal.forEach(function (p, i) {
      oldMats.push(new THREE.MeshLambertMaterial({ map: facadeTex(p[0], p[1], 3 + i, 5, 0.3) }));
    });
  }
  function building(x, z, w, d, h, mats, roof) {
    var m = mats[HT.randInt(0, mats.length - 1)];
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [m, m, roof || roofMat, darkMat, m, m]);
    var y = HT.groundY(x, z);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider(x, z, w / 2, d / 2);
    return mesh;
  }
  function box(x, y, z, w, h, d, color, noCollide) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color: color }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    if (!noCollide) addCollider(x, z, w / 2, d / 2);
    return mesh;
  }

  function buildDistricts(sc) {
    makeFacades();
    var roads = HT.WORLD.roads;
    // --- generic blocks between the roads, flavoured by district ---
    var edges = [-338].concat(roads).concat([338]);
    for (var ci = 0; ci < edges.length - 1; ci++) {
      for (var cj = 0; cj < edges.length - 1; cj++) {
        var x0 = edges[ci] + 14, x1 = edges[ci + 1] - 14;
        var z0 = edges[cj] + 14, z1 = edges[cj + 1] - 14;
        var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (cz < -248 || cz > 248) continue;                       // hills / strip
        if (cx > 248 && cz > 30) continue;                         // marina grounds
        if (cx < -130 && HT.dist2d(cx, cz, -180, 84) < 74) continue; // Old Town plaza quarter
        var downtown = Math.abs(cx) < 130 && Math.abs(cz) < 130;
        var old = cx < -130;
        var n = downtown ? 4 : 3;
        for (var k = 0; k < n; k++) {
          var bx = HT.randRange(x0 + 16, x1 - 16), bz = HT.randRange(z0 + 16, z1 - 16);
          var bw = HT.randRange(16, 30), bd = HT.randRange(16, 30);
          if (Math.abs(bx - (-60)) < 26 && Math.abs(bz - 180) < 26) continue; // spawn plaza
          if (downtown) building(bx, bz, bw, bd, HT.randRange(26, 58), glassMats);
          else if (old) building(bx, bz, bw, bd, HT.randRange(8, 15), oldMats, terraMat);
          else building(bx, bz, bw, bd, HT.randRange(9, 24), facadeMats);
        }
      }
    }

    // --- Old Town: church, plaza fountain, market stalls, old port sheds ---
    var church = new THREE.Group();
    var nave = new THREE.Mesh(new THREE.BoxGeometry(15, 11, 26),
      new THREE.MeshLambertMaterial({ map: facadeTex("#e8d3a0", "#b5563c", 2, 4, 0.25) }));
    nave.position.y = 5.5; church.add(nave);
    var roofL = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.5, 27), terraMat);
    roofL.rotation.z = 0.62; roofL.position.set(-4.05, 13.1, 0); church.add(roofL);
    var roofR = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.5, 27), terraMat);
    roofR.rotation.z = -0.62; roofR.position.set(4.05, 13.1, 0); church.add(roofR);
    var tower = new THREE.Mesh(new THREE.BoxGeometry(5.4, 30, 5.4),
      new THREE.MeshLambertMaterial({ map: facadeTex("#e8d3a0", "#b5563c", 6, 2, 0.3) }));
    tower.position.set(0, 15, -15.5); church.add(tower);
    var spire = new THREE.Mesh(new THREE.ConeGeometry(4.4, 7, 4), terraMat);
    spire.position.set(0, 33.5, -15.5); spire.rotation.y = Math.PI / 4; church.add(spire);
    var crossV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    crossV.position.set(0, 38.6, -15.5); church.add(crossV);
    var crossH = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 0.35), crossV.material);
    crossH.position.set(0, 38.9, -15.5); church.add(crossH);
    var rose = new THREE.Mesh(new THREE.CircleGeometry(2.1, 20),
      new THREE.MeshBasicMaterial({ color: 0xff9ecb }));
    rose.position.set(0, 8, 13.05); church.add(rose);
    church.position.set(-186, 0, 30);
    church.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    sc.add(church); addCollider(-186, 30, 9, 17); addCollider(-186, 14.5, 3.4, 3.4);
    // plaza fountain
    var basin = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.8, 1.1, 18),
      new THREE.MeshLambertMaterial({ color: 0xc7ab7c }));
    basin.position.set(-180, 0.55, 84); basin.castShadow = true; sc.add(basin);
    var water = new THREE.Mesh(new THREE.CircleGeometry(5.9, 18),
      new THREE.MeshPhongMaterial({ color: 0x3fa8c9, shininess: 120 }));
    water.rotation.x = -Math.PI / 2; water.position.set(-180, 1.05, 84); sc.add(water);
    box(-180, 1.6, 84, 1.1, 3.2, 1.1, 0xc7ab7c);
    addCollider(-180, 84, 7, 7);
    // market stalls ringing the plaza
    var stallCols = [0xd94f43, 0x3f7fbf, 0xe0a83c, 0x43a06b, 0xff5f9e, 0x8a5fb0];
    for (var si = 0; si < 7; si++) {
      var sa = si / 7 * Math.PI * 2 + 0.4;
      var sx = -180 + Math.cos(sa) * 24, sz = 84 + Math.sin(sa) * 24;
      box(sx, 1, sz, 4.6, 2, 3.4, 0x9a7a52);
      var awn = box(sx, 2.6, sz, 5.4, 0.3, 4.2, stallCols[si], true);
      awn.rotation.z = 0.1;
    }
    // old port sheds along the west quay
    [[-300, -140], [-300, -60], [-300, 150]].forEach(function (p, i) {
      building(p[0], p[1], 46, 38, 11 + i * 2, oldMats, terraMat);
    });
    var contCols = [0xd95f43, 0x3f7fbf, 0x43a06b, 0xe0a83c];
    for (var qi = 0; qi < 14; qi++) {
      var qx = HT.randRange(-328, -268), qz = HT.randRange(-200, 40);
      if (Math.abs(qz - (-100)) < 15 || Math.abs(qz) < 15) continue;
      box(qx, 1.5 + (qi % 2) * 3, qz, 11, 3, 4.6, HT.pick(contCols));
    }
    // ferry pier at the south-west water — the finale's escape point
    box(-322, 0.4, 178, 34, 1.6, 16, 0x8a6f4d);
    var ferry = new THREE.Group();
    var fh = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 9), new THREE.MeshLambertMaterial({ color: 0xf2ede2 }));
    fh.position.y = 1.2; ferry.add(fh);
    var fc = new THREE.Mesh(new THREE.BoxGeometry(16, 3.4, 7), new THREE.MeshLambertMaterial({ color: 0x3f7fbf }));
    fc.position.y = 4.8; ferry.add(fc);
    ferry.position.set(-356, 0, 178);
    ferry.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    sc.add(ferry); bobbers.push({ obj: ferry, baseY: 0, amp: 0.35, sp: 0.7 });

    // --- Neon Strip: pastel deco hotels + neon signs ---
    var decoCols = [0xf7d9c4, 0xbfe3dd, 0xf6c6d8, 0xfdeec2, 0xd6c9ec, 0xc2e2f2, 0xf9dfb8, 0xe5f0d0];
    var neonNames = ["VELVET PALM", "HOTEL CORAL", "CAFÉ ONDA", "TIDE CLUB", "BAR SOLANA", "NEON REEF", "LA COPA", "HOTEL BRISA"];
    var neonCols = ["#ff5f9e", "#39e6ff", "#ffb35c", "#8dffb0", "#ff5f5f", "#c9a7ff", "#39e6ff", "#ffd23e"];
    for (var di = 0; di < 8; di++) {
      var dx = -262 + di * 74, dz = 302;
      var dm = new THREE.MeshLambertMaterial({ map: facadeTex("#" + decoCols[di].toString(16), "#ffffff", 5, 5) });
      var dh = HT.randRange(17, 26);
      var db = new THREE.Mesh(new THREE.BoxGeometry(46, dh, 20), [dm, dm, roofMat, darkMat, dm, dm]);
      db.position.set(dx, dh / 2, dz);
      db.castShadow = true; db.receiveShadow = true; sc.add(db);
      addCollider(dx, dz, 23, 10);
      var sign = new THREE.Mesh(new THREE.PlaneGeometry(32, 8),
        new THREE.MeshBasicMaterial({ map: neonTex(neonNames[di], neonCols[di]) }));
      sign.position.set(dx, dh - 4, dz - 10.4);
      sign.rotation.y = Math.PI; sc.add(sign);
      box(dx, 1.1, dz - 13.5, 40, 2.2, 4, 0xffffff, true);
    }

    // --- Marina Del Sol: clubhouse, piers, yachts, lighthouse ---
    building(292, 66, 30, 22, 10, facadeMats);
    building(292, 210, 26, 20, 8, facadeMats);
    for (var pi = 0; pi < 4; pi++) box(330, 0.35, 92 + pi * 38, 26, 1.4, 5, 0x9a7a52, true);
    var yachtCols = [0xffffff, 0xf2e8d5, 0xd8ecf5, 0xffe3ec];
    for (var yi = 0; yi < 8; yi++) {
      var yacht = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 12), new THREE.MeshLambertMaterial({ color: HT.pick(yachtCols) }));
      hull.position.y = 0.6; yacht.add(hull);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      cab.position.set(0, 2.1, -0.6); yacht.add(cab);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 10), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
      mast.position.set(0, 6, 1.6); yacht.add(mast);
      var sail = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 7.4),
        new THREE.MeshBasicMaterial({ color: 0xfff6e0, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
      sail.position.set(0.4, 5.4, -1.2); sail.rotation.y = 0.5; yacht.add(sail);
      yacht.position.set(352 + (yi % 2) * 16, -0.3, 84 + yi * 20);
      yacht.rotation.y = HT.randRange(-0.2, 0.2);
      yacht.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      sc.add(yacht); bobbers.push({ obj: yacht, baseY: -0.3, amp: 0.22, sp: HT.randRange(0.6, 1.1) });
    }
    var lh = new THREE.Group();
    for (var li = 0; li < 4; li++) {
      var band = new THREE.Mesh(new THREE.CylinderGeometry(2.6 - li * 0.3, 2.9 - li * 0.3, 4.4),
        new THREE.MeshLambertMaterial({ color: li % 2 ? 0xf2ede2 : 0xd94f43 }));
      band.position.y = 2.2 + li * 4.4; lh.add(band);
    }
    var lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.4),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    lampRoom.position.y = 19.4; lh.add(lampRoom);
    beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 34, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.rotation.z = Math.PI / 2; beam.position.set(15, 19.4, 0); lh.add(beam);
    lh.position.set(330, 0, 318);
    lh.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    sc.add(lh); addCollider(330, 318, 3.4, 3.4);

    // --- Ember Hills: Mount Ember, observatory, rim villas, basalt rocks ---
    var rockMat = new THREE.MeshLambertMaterial({ color: 0x39333a });
    var cone = new THREE.Mesh(new THREE.ConeGeometry(58, 48, 24), rockMat);
    cone.position.set(-252, HT.WORLD.hillH + 24 - 2, -302);
    cone.castShadow = true; sc.add(cone);
    addCollider(-252, -302, 46, 46);
    var crater = new THREE.Mesh(new THREE.CircleGeometry(13, 20),
      new THREE.MeshBasicMaterial({ color: 0xff7a26 }));
    crater.rotation.x = -Math.PI / 2;
    crater.position.set(-252, HT.WORLD.hillH + 46.2, -302); sc.add(crater);
    // lava cracks running down the cone: thin emissive wedges
    for (var vi2 = 0; vi2 < 6; vi2++) {
      var va = vi2 / 6 * Math.PI * 2 + 0.3;
      var crack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 26, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff6a26 }));
      var cr = 34;
      crack.position.set(-252 + Math.cos(va) * cr, HT.WORLD.hillH + 28, -302 + Math.sin(va) * cr);
      crack.lookAt(-252, HT.WORLD.hillH + 47, -302);
      crack.rotateX(Math.PI / 2 - 0.88);
      sc.add(crack);
    }
    // smoke puffs drifting off the crater
    var smokeTex = canvasTex(64, 64, function (g) {
      var grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
      grad.addColorStop(0, "rgba(200,190,200,.55)"); grad.addColorStop(1, "rgba(200,190,200,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    });
    for (var sm = 0; sm < 6; sm++) {
      var puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.5, depthWrite: false }));
      puff.scale.set(16 + sm * 3, 12 + sm * 2, 1);
      puff.position.set(-252, HT.WORLD.hillH + 50 + sm * 5, -302);
      sc.add(puff);
      smoke.push({ spr: puff, off: sm / 6 });
    }
    // observatory: drum + dome + slit
    var obs = new THREE.Group();
    var drum = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.6, 10, 18),
      new THREE.MeshLambertMaterial({ color: 0xe8e3d8 }));
    drum.position.y = 5; obs.add(drum);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(9.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xd8dee6 }));
    dome.position.y = 10; obs.add(dome);
    var slit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.6, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x2c3542 }));
    slit.position.set(0, 14.6, 8.2); slit.rotation.x = -0.5; obs.add(slit);
    obs.position.set(185, HT.WORLD.hillH, -300);
    obs.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    sc.add(obs); addCollider(185, -300, 10, 10);
    // rim villas + a lone post cabin (a job destination)
    var villaCols = [0xf7ead8, 0xffffff, 0xf2ddc0, 0xe8f0e2];
    for (var vi3 = 0; vi3 < 5; vi3++) {
      var vx = -140 + vi3 * 62, vz = -312 + (vi3 % 2) * 14;
      if (HT.dist2d(vx, vz, -252, -302) < 90) continue;
      var vm = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 15),
        new THREE.MeshLambertMaterial({ map: facadeTex("#" + HT.pick(villaCols).toString(16), "#c9b18a", 2, 6, 0.4) }));
      vm.position.set(vx, HT.groundY(vx, vz) + 4, vz);
      vm.castShadow = true; vm.receiveShadow = true; sc.add(vm);
      addCollider(vx, vz, 11, 7.5);
      box(vx + 8, HT.groundY(vx, vz) + 0.5, vz + 12, 9, 1, 6, 0x6fd3e0, true);
    }
    box(-108, HT.groundY(-108, -318) + 2, -318, 9, 4, 7, 0x8a6f4d);       // post cabin
    box(-108, HT.groundY(-108, -318) + 4.6, -318, 10.4, 1, 8.4, 0xb5563c, true);
    // scattered basalt boulders
    var rockGeo = new THREE.DodecahedronGeometry(1.6);
    for (var ri = 0; ri < 26; ri++) {
      var rx2 = HT.randRange(-330, 330), rz2 = HT.randRange(-336, -256);
      if (HT.dist2d(rx2, rz2, -252, -302) < 66 || HT.dist2d(rx2, rz2, 185, -300) < 16) continue;
      var rock = new THREE.Mesh(rockGeo, rockMat);
      var rs = HT.randRange(0.7, 2.4);
      rock.scale.set(rs, rs * 0.8, rs);
      rock.position.set(rx2, HT.groundY(rx2, rz2) + 0.5, rz2);
      rock.rotation.y = HT.rand() * 3;
      rock.castShadow = true; sc.add(rock);
    }
  }

  // ---------- palms & lamps ----------
  function buildPalmsAndLamps(sc) {
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
    var crownMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
    var trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 6.4, 6);
    trunkGeo.translate(0, 3.2, 0);
    var crownGeo = new THREE.ConeGeometry(3.1, 1.7, 7);
    crownGeo.translate(0, 6.9, 0);
    function palm(x, z, lean) {
      var g = new THREE.Group();
      var t = new THREE.Mesh(trunkGeo, trunkMat); t.rotation.z = lean; g.add(t);
      var c = new THREE.Mesh(crownGeo, crownMat);
      c.position.set(Math.sin(lean) * -5.4, Math.cos(lean) * 0.4, 0); c.rotation.x = Math.PI; g.add(c);
      g.position.set(x, HT.groundY(x, z), z);
      g.rotation.y = HT.rand() * Math.PI * 2;
      sc.add(g);
    }
    var roads = HT.WORLD.roads;
    roads.forEach(function (r) {
      for (var s = -320; s <= 320; s += 42) {
        if (HT.rand() < 0.72) palm(r + 13.5, s + HT.randRange(-4, 4), HT.randRange(-0.09, 0.09));
        if (HT.rand() < 0.72) palm(s + HT.randRange(-4, 4), r - 13.5, HT.randRange(-0.09, 0.09));
      }
    });
    for (var b = -320; b <= 320; b += 34) palm(b + HT.randRange(-6, 6), 330, HT.randRange(-0.14, 0.14));
    for (var m2 = 0; m2 < 10; m2++) palm(258, 60 + m2 * 19, 0.1);

    var poleMat = new THREE.MeshLambertMaterial({ color: 0x2c3542 });
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    var poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.6, 5); poleGeo.translate(0, 2.8, 0);
    var bulbGeo = new THREE.SphereGeometry(0.42, 8, 6); bulbGeo.translate(0, 5.7, 0);
    roads.forEach(function (r) {
      for (var s2 = -300; s2 <= 300; s2 += 60) {
        [[r + 11.5, s2], [s2, r + 11.5]].forEach(function (p) {
          var g = new THREE.Group();
          g.add(new THREE.Mesh(poleGeo, poleMat)); g.add(new THREE.Mesh(bulbGeo, bulbMat));
          g.position.set(p[0], HT.groundY(p[0], p[1]), p[1]); sc.add(g);
        });
      }
    });
  }

  // ---------- pedestrians ----------
  var skins = [0xf2c49b, 0xc98d64, 0x8a5a3b, 0xffe0bd];
  var shirts = [0xff8f5a, 0x7de8ff, 0xf6c6d8, 0x8dffb0, 0xffd23e, 0xc9a7ff, 0xffffff, 0xff5f5f];
  var legCols = [0x33415e, 0x5e4633, 0xe8e3d8, 0x27313d];
  function makePed(x, z) {
    var fig = HT.buildFigure({
      skin: HT.pick(skins), shirt: HT.pick(shirts), legs: HT.pick(legCols),
      hair: HT.pick([0x2c1c10, 0x55402a, 0x111111, 0xb5894a])
    });
    fig.group.position.set(x, HT.groundY(x, z), z);
    scene.add(fig.group);
    var bcx = 60 + 120 * Math.round((x - 60) / 120);
    var bcz = 60 + 120 * Math.round((z - 60) / 120);
    var off = 46.5, corners = [
      [bcx - off, bcz - off], [bcx + off, bcz - off],
      [bcx + off, bcz + off], [bcx - off, bcz + off]
    ];
    var ped = { obj: fig.group, fig: fig, corners: corners, ci: 0,
      speed: HT.randRange(1.1, 1.9), flee: 0, fleeFrom: null,
      down: false, hp: 30, isCop: false, downTimer: 0 };
    peds.push(ped);
    return ped;
  }
  function buildPeds(sc) {
    var spots = [[-60, 60], [60, -60], [130, 130], [-166, 120], [10, 250], [-190, 130],
      [250, -60], [-60, -190], [190, 60], [60, 190], [-250, -60], [130, -190],
      [-196, 48], [300, 130], [-60, 268], [196, -268]];
    spots.forEach(function (s) {
      makePed(s[0] + HT.randRange(-8, 8), s[1] + HT.randRange(-8, 8));
      makePed(s[0] + HT.randRange(-30, 30), s[1] + HT.randRange(-30, 30));
    });
  }
  HT.makePed = makePed;
  HT.fleePeds = function (x, z, radius) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (!p.down && HT.dist2d(p.obj.position.x, p.obj.position.z, x, z) < radius) {
        p.flee = 3.2; p.fleeFrom = { x: x, z: z };
      }
    }
  };
  function updatePeds(dt) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (p.down) {
        p.downTimer -= dt;
        if (p.downTimer <= 0 && !p.isCop) { // bystanders get up and walk it off
          p.down = false; p.hp = 30;
          p.obj.rotation.x = 0; p.obj.position.y = HT.groundY(p.obj.position.x, p.obj.position.z);
        }
        continue;
      }
      var pos = p.obj.position;
      var tx, tz, sp = p.speed;
      if (p.flee > 0 && p.fleeFrom) {
        p.flee -= dt; sp = 4.6;
        var dx = pos.x - p.fleeFrom.x, dz = pos.z - p.fleeFrom.z;
        var dl = Math.sqrt(dx * dx + dz * dz) || 1;
        tx = pos.x + (dx / dl) * 10; tz = pos.z + (dz / dl) * 10;
      } else {
        var c = p.corners[p.ci];
        tx = c[0]; tz = c[1];
        if (HT.dist2d(pos.x, pos.z, tx, tz) < 1.2) p.ci = (p.ci + 1) % p.corners.length;
      }
      var mx = tx - pos.x, mz = tz - pos.z, ml = Math.sqrt(mx * mx + mz * mz);
      if (ml > 0.05) {
        pos.x += (mx / ml) * sp * dt; pos.z += (mz / ml) * sp * dt;
        p.obj.rotation.y = HT.angleLerp(p.obj.rotation.y, Math.atan2(mx, mz), 0.18);
        p.fig.walk(dt, sp);
      } else p.fig.idle();
      var fixed = W.collideCircle(pos.x, pos.z, 0.5);
      pos.x = fixed.x; pos.z = fixed.z;
      pos.y = HT.groundY(pos.x, pos.z);
    }
  }

  // ---------- per-frame world life ----------
  W.update = function (dt) {
    var t = HT.G.time;
    if (waterTex) { waterTex.offset.x = t * 0.008; waterTex.offset.y = Math.sin(t * 0.11) * 0.02 + t * 0.003; }
    if (sparkles) sparkles.material.opacity = 0.55 + Math.sin(t * 2.3) * 0.3;
    if (beam) beam.parent.rotation.y = t * 0.45;
    for (var i = 0; i < bobbers.length; i++) {
      var b = bobbers[i];
      b.obj.position.y = b.baseY + Math.sin(t * b.sp + i) * b.amp;
      b.obj.rotation.z = Math.sin(t * b.sp * 0.8 + i * 2) * 0.02;
    }
    for (var j = 0; j < smoke.length; j++) {
      var s2 = smoke[j];
      var cyc = (t * 0.07 + s2.off) % 1;
      s2.spr.position.y = HT.WORLD.hillH + 50 + cyc * 26;
      s2.spr.position.x = -252 + cyc * 14;
      s2.spr.material.opacity = 0.5 * (1 - cyc);
    }
    updatePeds(dt);
  };
})();
