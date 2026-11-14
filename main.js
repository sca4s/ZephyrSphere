(() => {
  /* =========================================================
   * STATE & STORAGE MANAGEMENT
   * ========================================================= */
  const STORAGE_KEYS = {
    HIGH_SCORE: 'zephyrsphere_high_score',
    HIGH_TIME: 'zephyrsphere_high_time',
    SAVED_SESSION: 'zephyrsphere_saved_session'
  };

  const BIOME_LIST = [
    { id: 'royal_sanctum',     name: 'Royal Sanctum' },
    { id: 'cyberpunk_drift',   name: 'Cyberpunk Drift' },
    { id: 'angelic_cloud',     name: 'Angelic Cloud' },
    { id: 'pastel_lagoon',     name: 'Pastel Lagoon' },
    { id: 'lofi_cafe',         name: 'Lo-Fi Cafe' },
    { id: 'gothic_balcony',    name: 'Gothic Balcony' },
    { id: 'gothic_castle',     name: 'Gothic Castle' },
    { id: 'enchanted_forest',  name: 'Enchanted Forest' },
    { id: 'cyberpunk_terrace', name: 'Cyberpunk Terrace' },
    { id: 'sandstone_desert',  name: 'Sandstone Desert' },
    { id: 'abyssal_reef',      name: 'Abyssal Reef' },
    { id: 'alpine_meadows',    name: 'Alpine Meadows' }
  ];

  const state = {
    device: 'desktop',          // 'desktop' | 'mobile'
    biome: 'royal_sanctum',     // 1 of 12 interactive 3D biomes
    bgMode: 'day',              // 'day' | 'night' | 'cycle'
    ballMode: 'bubbles',        // 'bubbles' | 'sports'
    theme: 'light',
    score: 0,
    elapsedSeconds: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || 0),
    highTime: Number(localStorage.getItem(STORAGE_KEYS.HIGH_TIME) || 0),
    cycleSpeed: 1.0,            // W / S keys
    ballSpeedMultiplier: 1.0,   // A / D keys
    skyTime: 0.25,              // 0..1
    isRunning: false,
    isPaused: false,
    obstaclesReady: false,
    aimAngle: 0,                // Horizontal angle in radians
    aimElevation: 0.18,
    currentTypeIndex: 0,
    nextTypeIndex: 1,
    hiddenPanels: new Set()
  };

  const SPHERE_TYPES = [
    { id: 'football',   label: 'Football',   bubbleLabel: 'Rose Bubble',   bubbleColor: '#ff7eb3', accent: '#ffffff' },
    { id: 'basketball', label: 'Basketball', bubbleLabel: 'Amber Bubble',  bubbleColor: '#ffa85c', accent: '#2d2d2d' },
    { id: 'cricket',    label: 'Cricket',    bubbleLabel: 'Ruby Bubble',   bubbleColor: '#ff5e62', accent: '#f8e7c1' },
    { id: 'tennis',     label: 'Tennis',     bubbleLabel: 'Lime Bubble',   bubbleColor: '#a8ff78', accent: '#ffffff' },
    { id: 'volleyball', label: 'Volleyball', bubbleLabel: 'Cyan Bubble',   bubbleColor: '#70e1f5', accent: '#ffd194' }
  ];

  /* =========================================================
   * DOM ELEMENTS
   * ========================================================= */
  const dom = {
    screenDevice: document.getElementById('screen-device'),
    screenCustomize: document.getElementById('screen-customize'),
    savedBanner: document.getElementById('saved-game-banner'),
    savedDetails: document.getElementById('saved-game-details'),
    resumeSavedBtn: document.getElementById('resume-saved-btn'),
    gameHud: document.getElementById('game-hud'),
    unhideAllBtn: document.getElementById('unhide-all-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeLabel: document.getElementById('theme-label'),
    scoreVal: document.getElementById('score-val'),
    timeVal: document.getElementById('time-val'),
    highScoreVal: document.getElementById('high-score-val'),
    highTimeVal: document.getElementById('high-time-val'),
    cycleSpeedVal: document.getElementById('cycle-speed-val'),
    ballSpeedVal: document.getElementById('ball-speed-val'),
    skyPhaseVal: document.getElementById('sky-phase-val'),
    currentBallDot: document.getElementById('current-ball-dot'),
    currentBallName: document.getElementById('current-ball-name'),
    nextBallDot: document.getElementById('next-ball-dot'),
    nextBallName: document.getElementById('next-ball-name'),
    activeBiomeLabel: document.getElementById('active-biome-label'),
    aimSlider: document.getElementById('aim-slider'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),
    countdownSubtext: document.getElementById('countdown-subtext'),
    pauseModal: document.getElementById('pause-modal'),
    gameoverModal: document.getElementById('gameover-modal'),
    gameoverTitle: document.getElementById('gameover-title'),
    gameoverMessage: document.getElementById('gameover-message'),
    finalScoreVal: document.getElementById('final-score-val'),
    finalTimeVal: document.getElementById('final-time-val'),
    deviceDeckTitle: document.getElementById('device-deck-title')
  };

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function triggerHaptic(ms = 10) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  }

  /* =========================================================
   * INDIVIDUAL UPPER-LEFT BLURRED PLAGUE THEME TRANSITION
   * ========================================================= */
  function triggerIndividualThemeTransition() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    const surfaces = document.querySelectorAll('[data-surface]');

    surfaces.forEach((surface, idx) => {
      const overlay = document.createElement('div');
      overlay.className = 'theme-spread-layer';
      overlay.style.background =
        nextTheme === 'dark'
          ? 'linear-gradient(135deg, rgba(24,30,52,0.92), rgba(58,48,92,0.85))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(225,236,255,0.88))';
      overlay.style.animationDelay = `${idx * 35}ms`;
      surface.appendChild(overlay);

      overlay.addEventListener('animationend', () => {
        overlay.remove();
      });
    });

    state.theme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    dom.themeLabel.textContent = nextTheme === 'light' ? 'Dark Mode' : 'Light Mode';
  }

  dom.themeToggleBtn.addEventListener('click', triggerIndividualThemeTransition);

  /* =========================================================
   * ADAPTIVE SCREEN RATIO, UI SCALING & CAMERA FRUSTUM FIT
   * ========================================================= */
  let scene, camera, renderer, sunLight, ambientLight, starsMesh;
  let arenaGroup, biomeGroup, biomeAnimatedItems = [];
  let gridBubbles = [], activeProjectile = null;
  let cannonGroup, cannonBarrel, launcherMesh, trajectoryLine;

  // True Rectangular Arena Bounds (Cannon sits at bottom, clear of UI)
  const ARENA_BOUNDS = {
    left: -5.8,
    right: 5.8,
    top: 7.4,
    bottom: -4.2,
    radius: 0.54
  };

  function calibrateScreenScaling() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;

    // Larger screen = larger UI, smaller screen = smaller UI, while keeping mobile touch UI readable
    let baseScale = Math.min(w / 1360, h / 840);
    if (w <= 820) {
      baseScale = Math.max(0.88, Math.min(1.04, w / 410));
      dom.deviceDeckTitle.textContent = 'Mobile & Tablet Haptic Deck';
    } else {
      baseScale = Math.max(0.82, Math.min(1.22, baseScale));
      dom.deviceDeckTitle.textContent =
        state.device === 'mobile' ? 'Mobile & Tablet Haptic Deck' : 'Desktop Command Bar';
    }

    document.documentElement.style.setProperty('--ui-scale', baseScale.toFixed(3));

    // Fit entire rectangular rink + top HUD + bottom Cannon & Controls inside 3D camera frustum
    if (camera && renderer) {
      camera.aspect = aspect;
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const requiredWidth = (ARENA_BOUNDS.right - ARENA_BOUNDS.left) + 3.4;
      const requiredHeight = (ARENA_BOUNDS.top - ARENA_BOUNDS.bottom) + (aspect < 1 ? 9.2 : 6.4);

      const distForHeight = (requiredHeight / 2) / Math.tan(fovRad / 2);
      const distForWidth = (requiredWidth / 2) / (Math.tan(fovRad / 2) * aspect);
      const camZ = Math.max(distForHeight, distForWidth, 16.5);

      // Perpendicular camera lookAt eliminates trapezoid distortion
      const centerY = aspect < 1 ? 1.15 : 1.35;
      camera.position.set(0, centerY, camZ);
      camera.lookAt(0, centerY, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }

  window.addEventListener('resize', calibrateScreenScaling);

  /* =========================================================
   * INDIVIDUAL UI HIDE / CASCADING SLIDE & RESTORE ALL
   * ========================================================= */
  document.querySelectorAll('.hide-panel-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const panel = document.getElementById(targetId);
      if (panel) {
        panel.classList.add('panel-hidden');
        state.hiddenPanels.add(targetId);
        dom.unhideAllBtn.classList.remove('hidden');
      }
    });
  });

  dom.unhideAllBtn.addEventListener('click', () => {
    state.hiddenPanels.forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) panel.classList.remove('panel-hidden');
    });
    state.hiddenPanels.clear();
    dom.unhideAllBtn.classList.add('hidden');
  });

  /* =========================================================
   * PROCEDURAL 3D TEXTURES FOR SPORTS BALLS & BUBBLES
   * ========================================================= */
  const sphereMaterials = {
    bubbles: [],
    sports: []
  };

  function createSportsTexture(typeId) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (typeId === 'football') {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#1e272e';
      const spots = [
        [64, 64], [192, 64], [128, 128], [64, 192], [192, 192], [128, 32], [32, 128]
      ];
      spots.forEach(([x, y]) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(a) * 26;
          const py = y + Math.sin(a) * 26;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      });
    } else if (typeId === 'basketball') {
      ctx.fillStyle = '#e6672d';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#1e1e1e';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 128);
      ctx.lineTo(256, 128);
      ctx.moveTo(128, 0);
      ctx.lineTo(128, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(40, 128, 85, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(216, 128, 85, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
    } else if (typeId === 'cricket') {
      ctx.fillStyle = '#b31b1b';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#f5deb3';
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 120);
      ctx.lineTo(256, 120);
      ctx.moveTo(0, 136);
      ctx.lineTo(256, 136);
      ctx.stroke();
    } else if (typeId === 'tennis') {
      ctx.fillStyle = '#c9f24b';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(64, 128, 72, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(192, 128, 72, Math.PI / 2, -Math.PI / 2);
      ctx.stroke();
    } else if (typeId === 'volleyball') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#48dbfb';
      ctx.fillRect(0, 0, 256, 85);
      ctx.fillStyle = '#feca57';
      ctx.fillRect(0, 170, 256, 86);
      ctx.strokeStyle = '#2e86de';
      ctx.lineWidth = 6;
      for (let y = 0; y < 256; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function initMaterials() {
    SPHERE_TYPES.forEach((t) => {
      sphereMaterials.bubbles.push(
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(t.bubbleColor),
          transparent: true,
          opacity: 0.84,
          roughness: 0.08,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05
        })
      );

      sphereMaterials.sports.push(
        new THREE.MeshStandardMaterial({
          map: createSportsTexture(t.id),
          roughness: 0.38,
          metalness: 0.08
        })
      );
    });
  }

  function getMaterialForType(typeIndex) {
    return state.ballMode === 'bubbles'
      ? sphereMaterials.bubbles[typeIndex]
      : sphereMaterials.sports[typeIndex];
  }

  /* =========================================================
   * 12 INTERACTIVE 3D BIOMES BUILDER
   * ========================================================= */
  function buildBiome3D(biomeId) {
    if (!biomeGroup) {
      biomeGroup = new THREE.Group();
      scene.add(biomeGroup);
    }
    while (biomeGroup.children.length > 0) {
      biomeGroup.remove(biomeGroup.children[0]);
    }
    biomeAnimatedItems = [];

    const bInfo = BIOME_LIST.find((b) => b.id === biomeId) || BIOME_LIST[0];
    if (dom.activeBiomeLabel) dom.activeBiomeLabel.textContent = bInfo.name;

    const zBack = -6.5;

    if (biomeId === 'royal_sanctum') {
      // Marble rotunda, velvet carpet inlay, golden rings, fluted pillars, and floating crown jewels
      const rotunda = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 15, 1.4, 40),
        new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.25 })
      );
      rotunda.position.set(0, -6.2, zBack);
      biomeGroup.add(rotunda);

      const carpet = new THREE.Mesh(
        new THREE.CylinderGeometry(9.5, 9.5, 1.45, 32),
        new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 })
      );
      carpet.position.set(0, -6.18, zBack);
      biomeGroup.add(carpet);

      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI - Math.PI;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.75, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.3 })
        );
        pillar.position.set(Math.cos(ang) * 12, 1.8, zBack + Math.sin(ang) * 4);
        biomeGroup.add(pillar);
      }

      const ringMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.22, 16, 64), ringMat);
      goldRing.position.set(0, 2.2, zBack - 2);
      biomeGroup.add(goldRing);
      biomeAnimatedItems.push({ mesh: goldRing, rotZ: 0.35, rotY: 0.2 });

      for (let j = 0; j < 6; j++) {
        const jewel = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.65, 0),
          new THREE.MeshPhysicalMaterial({ color: j % 2 ? 0xf43f5e : 0x38bdf8, roughness: 0.1, metalness: 0.2 })
        );
        jewel.position.set((j - 2.5) * 4.2, 5.5 + (j % 2) * 1.5, zBack + 1);
        biomeGroup.add(jewel);
        biomeAnimatedItems.push({ mesh: jewel, rotY: 1.2, floatOffset: j, baseY: jewel.position.y });
      }
    } else if (biomeId === 'cyberpunk_drift') {
      // Synthwave horizon, dual tilted neon drift rings, and holographic drift portals
      const gridPlane = new THREE.GridHelper(44, 28, 0xff007f, 0x00f0ff);
      gridPlane.position.set(0, -6.0, zBack);
      biomeGroup.add(gridPlane);

      const sunDisc = new THREE.Mesh(
        new THREE.CircleGeometry(6.5, 32),
        new THREE.MeshBasicMaterial({ color: 0xff2a85 })
      );
      sunDisc.position.set(0, 3.8, zBack - 6);
      biomeGroup.add(sunDisc);

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(8.5, 0.18, 16, 64),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      ring1.rotation.x = 0.55;
      ring1.rotation.y = 0.35;
      ring1.position.set(0, 1.8, zBack - 1);
      biomeGroup.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(10.2, 0.18, 16, 64),
        new THREE.MeshBasicMaterial({ color: 0xff00a0 })
      );
      ring2.rotation.x = -0.5;
      ring2.rotation.y = -0.35;
      ring2.position.set(0, 1.8, zBack - 1);
      biomeGroup.add(ring2);

      biomeAnimatedItems.push({ mesh: ring1, rotZ: 0.8 });
      biomeAnimatedItems.push({ mesh: ring2, rotZ: -0.65 });

      [-9.5, 9.5].forEach((px, i) => {
        const portal = new THREE.Mesh(
          new THREE.RingGeometry(1.6, 2.2, 24),
          new THREE.MeshBasicMaterial({ color: i === 0 ? 0x38bdf8 : 0xe879f9, side: THREE.DoubleSide })
        );
        portal.position.set(px, 1.5, zBack + 1.5);
        portal.rotation.y = i === 0 ? 0.4 : -0.4;
        biomeGroup.add(portal);
        biomeAnimatedItems.push({ mesh: portal, rotZ: 1.4 });
      });
    } else if (biomeId === 'angelic_cloud') {
      // Celestial cloud pillows, concentric golden halos, and pearl temple spires
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      for (let i = 0; i < 14; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + (i % 3) * 0.6, 20, 20), cloudMat);
        puff.position.set((i - 6.5) * 2.2, -5.5 + Math.sin(i) * 0.6, zBack + (i % 2));
        biomeGroup.add(puff);
      }

      const haloMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.35 });
      [5.5, 8.0, 10.5].forEach((r, idx) => {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(r, 0.14, 16, 64), haloMat);
        halo.position.set(0, 4.2, zBack - 3);
        halo.rotation.x = Math.PI / 2.3;
        biomeGroup.add(halo);
        biomeAnimatedItems.push({ mesh: halo, rotZ: (idx + 1) * 0.25 });
      });

      [-10.5, -7.5, 7.5, 10.5].forEach((sx) => {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 9, 16),
          new THREE.MeshPhysicalMaterial({ color: 0xfef9c3, clearcoat: 1 })
        );
        spire.position.set(sx, 0.5, zBack - 1);
        biomeGroup.add(spire);
      });
    } else if (biomeId === 'pastel_lagoon') {
      // Turquoise ocean lagoon, sandy island atoll, tropical palm trees, and pastel beach parasols
      const ocean = new THREE.Mesh(
        new THREE.CylinderGeometry(24, 24, 0.8, 36),
        new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.2 })
      );
      ocean.position.set(0, -6.3, zBack);
      biomeGroup.add(ocean);

      const sand = new THREE.Mesh(
        new THREE.CylinderGeometry(12, 14, 1.1, 32),
        new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.8 })
      );
      sand.position.set(0, -6.0, zBack);
      biomeGroup.add(sand);

      [-9.2, 9.2].forEach((tx) => {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.45, 6.5, 12),
          new THREE.MeshStandardMaterial({ color: 0x92400e })
        );
        trunk.position.set(tx, -2.5, zBack + 1);
        biomeGroup.add(trunk);

        for (let f = 0; f < 5; f++) {
          const frond = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 2.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x34d399 })
          );
          frond.position.set(tx + Math.cos(f * 1.25) * 1.2, 1.0, zBack + 1 + Math.sin(f * 1.25) * 1.2);
          frond.rotation.z = Math.cos(f * 1.25) * 0.9;
          biomeGroup.add(frond);
        }
      });

      [-6.5, 6.5].forEach((px, i) => {
        const parasol = new THREE.Mesh(
          new THREE.ConeGeometry(1.8, 1.1, 12),
          new THREE.MeshStandardMaterial({ color: i === 0 ? 0xf472b6 : 0xa78bfa })
        );
        parasol.position.set(px, -3.5, zBack + 2);
        biomeGroup.add(parasol);
        biomeAnimatedItems.push({ mesh: parasol, rotY: 0.5 });
      });
    } else if (biomeId === 'lofi_cafe') {
      // Warm walnut tabletop, oversized steaming coffee mug with saucer, vinyl record turntable, overhead string lamps
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(36, 1.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.55 })
      );
      desk.position.set(0, -6.4, zBack);
      biomeGroup.add(desk);

      // Mug & saucer on left
      const saucer = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 1.8, 0.3, 24),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
      );
      saucer.position.set(-9.5, -5.5, zBack + 1);
      biomeGroup.add(saucer);

      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.4, 3.2, 24),
        new THREE.MeshStandardMaterial({ color: 0xd97706 })
      );
      mug.position.set(-9.5, -3.8, zBack + 1);
      biomeGroup.add(mug);

      // Steaming rings
      for (let s = 0; s < 3; s++) {
        const steam = new THREE.Mesh(
          new THREE.TorusGeometry(0.6 + s * 0.2, 0.08, 10, 24),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
        );
        steam.position.set(-9.5, -1.5 + s * 1.1, zBack + 1);
        steam.rotation.x = Math.PI / 2;
        biomeGroup.add(steam);
        biomeAnimatedItems.push({ mesh: steam, floatOffset: s, baseY: steam.position.y });
      }

      // Vinyl record turntable on right
      const platter = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.6, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 })
      );
      platter.position.set(9.5, -5.4, zBack + 1.2);
      biomeGroup.add(platter);
      biomeAnimatedItems.push({ mesh: platter, rotY: 2.0 });

      // Overhead string lamps
      for (let l = -4; l <= 4; l++) {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfde047 })
        );
        bulb.position.set(l * 3.0, 8.6 - Math.cos(l * 0.4) * 0.6, zBack + 1);
        biomeGroup.add(bulb);
      }
    } else if (biomeId === 'gothic_balcony') {
      // Pointed lancet arches, stained-glass rose window, stone balustrade, and distant cathedral spires
      const balustrade = new THREE.Mesh(
        new THREE.BoxGeometry(30, 2.2, 2),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
      );
      balustrade.position.set(0, -5.6, zBack);
      biomeGroup.add(balustrade);

      const roseWindow = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 5.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide })
      );
      roseWindow.position.set(0, 3.2, zBack - 4);
      biomeGroup.add(roseWindow);
      biomeAnimatedItems.push({ mesh: roseWindow, rotZ: 0.25 });

      [-11, -7.5, 7.5, 11].forEach((x) => {
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        spire.position.set(x, 1.5, zBack - 2);
        biomeGroup.add(spire);
      });
    } else if (biomeId === 'gothic_castle') {
      // 4 crenelated corner turrets, curtain walls with battlements, and glowing torch braziers
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(24, 8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.85 })
      );
      wall.position.set(0, -2.5, zBack - 3);
      biomeGroup.add(wall);

      [-11, -7.5, 7.5, 11].forEach((tx, idx) => {
        const turret = new THREE.Mesh(
          new THREE.CylinderGeometry(1.4, 1.6, 13, 12),
          new THREE.MeshStandardMaterial({ color: 0x374151 })
        );
        turret.position.set(tx, 0, zBack - (idx % 2) * 2);
        biomeGroup.add(turret);

        const flame = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55, 1),
          new THREE.MeshBasicMaterial({ color: 0xf97316 })
        );
        flame.position.set(tx, 7.0, zBack - (idx % 2) * 2);
        biomeGroup.add(flame);
        biomeAnimatedItems.push({ mesh: flame, rotY: 2.5, floatOffset: idx, baseY: 7.0 });
      });
    } else if (biomeId === 'enchanted_forest') {
      // Multi-tiered pine trees, winding stream, mossy boulders, and fireflies
      const stream = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.3, 20),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15 })
      );
      stream.position.set(0, -6.1, zBack);
      biomeGroup.add(stream);

      [-10.5, -8, 8, 10.5].forEach((px) => {
        for (let t = 0; t < 3; t++) {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(2.2 - t * 0.45, 3.6, 10),
            new THREE.MeshStandardMaterial({ color: 0x065f46 })
          );
          cone.position.set(px, -3.2 + t * 2.2, zBack - 1);
          biomeGroup.add(cone);
        }
      });

      for (let f = 0; f < 16; f++) {
        const fly = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xbef264 })
        );
        fly.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.2) * 12, zBack + 2);
        biomeGroup.add(fly);
        biomeAnimatedItems.push({ mesh: fly, floatOffset: f, baseY: fly.position.y });
      }
    } else if (biomeId === 'cyberpunk_terrace') {
      // Rooftop terrace deck, neon railings, and surrounding metropolis skyscrapers
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(28, 1.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      deck.position.set(0, -6.2, zBack);
      biomeGroup.add(deck);

      const neonRail = new THREE.Mesh(
        new THREE.BoxGeometry(26, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      neonRail.position.set(0, -4.5, zBack + 2);
      biomeGroup.add(neonRail);

      for (let b = -5; b <= 5; b++) {
        if (Math.abs(b) < 2) continue;
        const h = 10 + Math.abs(b * 1.8);
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, h, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x312e81, emissiveIntensity: 0.35 })
        );
        tower.position.set(b * 2.5, -6 + h / 2, zBack - 4);
        biomeGroup.add(tower);
      }
    } else if (biomeId === 'sandstone_desert') {
      // Ancient pyramid, layered red-rock canyon mesa, natural sandstone arch, oasis pool, and cacti
      const sandFloor = new THREE.Mesh(
        new THREE.CylinderGeometry(24, 24, 1, 32),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.85 })
      );
      sandFloor.position.set(0, -6.3, zBack);
      biomeGroup.add(sandFloor);

      const pyramid = new THREE.Mesh(
        new THREE.ConeGeometry(6.5, 8.5, 4),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 })
      );
      pyramid.position.set(-8.5, -1.8, zBack - 3);
      pyramid.rotation.y = Math.PI / 4;
      biomeGroup.add(pyramid);

      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.85, 12, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xb45309 })
      );
      arch.position.set(8.5, -5.5, zBack - 2);
      biomeGroup.add(arch);

      [-7, 7.5].forEach((cx) => {
        const cactus = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.4, 3.8, 10),
          new THREE.MeshStandardMaterial({ color: 0x15803d })
        );
        cactus.position.set(cx, -4.2, zBack + 2);
        biomeGroup.add(cactus);
      });
    } else if (biomeId === 'abyssal_reef') {
      // Underwater coral clusters, seabed, and rising bubbles
      const seabed = new THREE.Mesh(
        new THREE.CylinderGeometry(24, 24, 1.2, 32),
        new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.7 })
      );
      seabed.position.set(0, -6.3, zBack);
      biomeGroup.add(seabed);

      [-9.5, -7.5, 7.5, 9.5].forEach((cx, i) => {
        const coral = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.6),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf43f5e : 0xa855f7, roughness: 0.5 })
        );
        coral.position.set(cx, -4.8, zBack + 1);
        biomeGroup.add(coral);
      });

      for (let b = 0; b < 14; b++) {
        const bub = new THREE.Mesh(
          new THREE.SphereGeometry(0.28 + (b % 3) * 0.12, 12, 12),
          new THREE.MeshPhysicalMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.55 })
        );
        bub.position.set((b - 6.5) * 1.8, -4 + (b % 5) * 2.2, zBack + 1.5);
        biomeGroup.add(bub);
        biomeAnimatedItems.push({ mesh: bub, floatOffset: b, baseY: bub.position.y });
      }
    } else if (biomeId === 'alpine_meadows') {
      // Rolling green hills and snow-capped mountain range
      [-8, 0, 8].forEach((hx, i) => {
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(8.5, 24, 16),
          new THREE.MeshStandardMaterial({ color: i === 1 ? 0x22c55e : 0x16a34a, roughness: 0.8 })
        );
        hill.position.set(hx, -11.8, zBack + (i === 1 ? 1 : -1));
        biomeGroup.add(hill);
      });

      [-10, -4.5, 4.5, 10].forEach((mx, i) => {
        const mtn = new THREE.Mesh(
          new THREE.ConeGeometry(4.5, 11 + (i % 2) * 2.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
        );
        mtn.position.set(mx, -0.5, zBack - 4);
        biomeGroup.add(mtn);

        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(1.9, 4.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        cap.position.set(mx, 3.4 + (i % 2) * 1.1, zBack - 4);
        biomeGroup.add(cap);
      });
    }
  }

  /* =========================================================
   * THREE.JS 3D SCENE, RECTANGULAR ARENA & VISIBLE 3D CANNON
   * ========================================================= */
  function initThreeScene() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      250
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfff4d6, 1.15);
    sunLight.position.set(8, 14, 12);
    sunLight.castShadow = true;
    scene.add(sunLight);

    initMaterials();
    createStarfield();
    createRectangularArenaFrame();
    createLauncherAndTrajectory();
    buildBiome3D(state.biome);
    calibrateScreenScaling();
  }

  function createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 75;
      positions[i + 1] = (Math.random() - 0.3) * 55;
      positions[i + 2] = -15 - Math.random() * 25;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.22,
      transparent: true,
      opacity: 0
    });
    starsMesh = new THREE.Points(starGeo, starMat);
    scene.add(starsMesh);
  }

  function createRectangularArenaFrame() {
    arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const railWidth = (ARENA_BOUNDS.right - ARENA_BOUNDS.left) + ARENA_BOUNDS.radius * 2;
    const railHeight = (ARENA_BOUNDS.top - ARENA_BOUNDS.bottom) + ARENA_BOUNDS.radius * 2;
    const centerY = (ARENA_BOUNDS.top + ARENA_BOUNDS.bottom) / 2;

    // Subtle frosted glass backplate so the rectangular rink is always clearly defined
    const backplate = new THREE.Mesh(
      new THREE.PlaneGeometry(railWidth, railHeight),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide
      })
    );
    backplate.position.set(0, centerY, -0.45);
    arenaGroup.add(backplate);

    const railMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.2
    });

    // Left & Right Vertical Rails
    const vRailGeo = new THREE.CylinderGeometry(0.14, 0.14, railHeight, 18);
    const leftRail = new THREE.Mesh(vRailGeo, railMat);
    leftRail.position.set(ARENA_BOUNDS.left - ARENA_BOUNDS.radius, centerY, 0);
    arenaGroup.add(leftRail);

    const rightRail = new THREE.Mesh(vRailGeo, railMat);
    rightRail.position.set(ARENA_BOUNDS.right + ARENA_BOUNDS.radius, centerY, 0);
    arenaGroup.add(rightRail);

    // Top Horizontal Rail
    const hRailGeo = new THREE.CylinderGeometry(0.14, 0.14, railWidth + 0.28, 18);
    const topRail = new THREE.Mesh(hRailGeo, railMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, ARENA_BOUNDS.top + ARENA_BOUNDS.radius, 0);
    arenaGroup.add(topRail);

    // Bottom Danger / Loss Line (Completes the rectangular frame right at the cannon level)
    const dangerMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.72
    });
    const bottomRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, railWidth, 16),
      dangerMat
    );
    bottomRail.rotation.z = Math.PI / 2;
    bottomRail.position.set(0, ARENA_BOUNDS.bottom - ARENA_BOUNDS.radius * 0.3, 0);
    arenaGroup.add(bottomRail);
  }

  function createLauncherAndTrajectory() {
    cannonGroup = new THREE.Group();
    cannonGroup.position.set(0, ARENA_BOUNDS.bottom, 0);
    scene.add(cannonGroup);

    // Pedestal Dome Base
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.15, 0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.25 })
    );
    baseMesh.position.set(0, -0.35, 0);
    cannonGroup.add(baseMesh);

    // Rotating Cannon Barrel Group
    cannonBarrel = new THREE.Group();
    cannonGroup.add(cannonBarrel);

    const barrelTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.72, 1.35, 24, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        metalness: 0.45,
        roughness: 0.2,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide
      })
    );
    barrelTube.position.set(0, 0.45, 0);
    cannonBarrel.add(barrelTube);

    const muzzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.63, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.position.set(0, 1.12, 0);
    cannonBarrel.add(muzzleRing);

    // Loaded Sphere clearly visible inside/atop the Cannon
    const baseGeo = new THREE.SphereGeometry(ARENA_BOUNDS.radius, 32, 32);
    launcherMesh = new THREE.Mesh(baseGeo, getMaterialForType(state.currentTypeIndex));
    launcherMesh.position.set(0, 0.35, 0.1);
    cannonBarrel.add(launcherMesh);

    // Dashed Aiming Trajectory Line
    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.36,
      gapSize: 0.2,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    const points = [new THREE.Vector3(0, ARENA_BOUNDS.bottom, 0), new THREE.Vector3(0, 0, 0)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    trajectoryLine = new THREE.Line(lineGeo, lineMat);
    trajectoryLine.computeLineDistances();
    scene.add(trajectoryLine);
  }

  /* =========================================================
   * SWAP ACTIVE & NEXT BALL ONLY
   * ========================================================= */
  function swapCurrentAndNextBall() {
    if (!state.isRunning || state.isPaused) return;
    const temp = state.currentTypeIndex;
    state.currentTypeIndex = state.nextTypeIndex;
    state.nextTypeIndex = temp;
    triggerHaptic(14);
    syncArsenalUI();
  }

  /* =========================================================
   * OBSTACLES / SPHERE GRID POPULATION (WITH 2-SECOND DELAY)
   * ========================================================= */
  function clearArenaSpheres() {
    gridBubbles.forEach((b) => scene.remove(b.mesh));
    gridBubbles = [];
    if (activeProjectile) {
      scene.remove(activeProjectile.mesh);
      activeProjectile = null;
    }
  }

  function populateObstacleGrid(savedGrid = null) {
    clearArenaSpheres();

    if (savedGrid && savedGrid.length > 0) {
      savedGrid.forEach((item) => {
        spawnStaticSphere(item.x, item.y, item.typeIndex);
      });
      state.obstaclesReady = true;
      return;
    }

    const rows = 5;
    const cols = 10;
    const spacingX = ARENA_BOUNDS.radius * 2.02;
    const spacingY = ARENA_BOUNDS.radius * 1.8;

    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2) * (spacingX * 0.5);
      for (let c = 0; c < cols; c++) {
        const x = ARENA_BOUNDS.left + 0.52 + c * spacingX + rowOffset;
        if (x > ARENA_BOUNDS.right - 0.3) continue;
        const y = ARENA_BOUNDS.top - r * spacingY;
        const typeIndex = Math.floor(Math.random() * SPHERE_TYPES.length);
        spawnStaticSphere(x, y, typeIndex);
      }
    }
    state.obstaclesReady = true;
  }

  function spawnStaticSphere(x, y, typeIndex) {
    const geo = new THREE.SphereGeometry(ARENA_BOUNDS.radius, 28, 28);
    const mesh = new THREE.Mesh(geo, getMaterialForType(typeIndex));
    mesh.position.set(x, y, 0);
    scene.add(mesh);
    gridBubbles.push({ mesh, x, y, typeIndex });
  }

  /* =========================================================
   * TRAJECTORY RAY-BOUNCE PROJECTION & CANNON ROTATION
   * ========================================================= */
  function updateTrajectoryProjection() {
    if (!trajectoryLine || !cannonBarrel) return;

    cannonBarrel.rotation.z = -state.aimAngle;

    const points = [];
    let px = Math.sin(state.aimAngle) * 0.5;
    let py = ARENA_BOUNDS.bottom + Math.cos(state.aimAngle) * 0.5;
    let dx = Math.sin(state.aimAngle);
    let dy = Math.cos(state.aimAngle);

    points.push(new THREE.Vector3(px, py, 0));

    const step = 0.25;
    const maxSteps = 100;

    for (let i = 0; i < maxSteps; i++) {
      px += dx * step;
      py += dy * step;

      if (px <= ARENA_BOUNDS.left) {
        px = ARENA_BOUNDS.left;
        dx = -dx;
        points.push(new THREE.Vector3(px, py, 0));
      } else if (px >= ARENA_BOUNDS.right) {
        px = ARENA_BOUNDS.right;
        dx = -dx;
        points.push(new THREE.Vector3(px, py, 0));
      }

      if (py >= ARENA_BOUNDS.top) {
        py = ARENA_BOUNDS.top;
        break;
      }

      let hit = false;
      for (let j = 0; j < gridBubbles.length; j++) {
        const b = gridBubbles[j];
        const dist = Math.hypot(px - b.x, py - b.y);
        if (dist <= ARENA_BOUNDS.radius * 1.95) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }

    points.push(new THREE.Vector3(px, py, 0));
    trajectoryLine.geometry.dispose();
    trajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    trajectoryLine.computeLineDistances();
  }

  /* =========================================================
   * WIN / LOSE DETECTION & GAMEOVER MODAL
   * ========================================================= */
  function triggerGameOver(didWin) {
    state.isRunning = false;
    state.isPaused = true;
    localStorage.removeItem(STORAGE_KEYS.SAVED_SESSION);
    updateRecordsAndHUD();

    dom.gameoverTitle.textContent = didWin ? '🎉 You Won!' : '💥 You Lost!';
    dom.gameoverMessage.textContent = didWin
      ? 'Incredible shot! You cleared every sphere in the arena!'
      : 'The spheres piled up and reached the bottom cannon line!';
    dom.finalScoreVal.textContent = state.score;
    dom.finalTimeVal.textContent = formatTime(state.elapsedSeconds);
    dom.gameoverModal.classList.remove('hidden');
    triggerHaptic(didWin ? [30, 50, 40] : [60, 40, 80]);
  }

  function checkWinOrLoseCondition() {
    if (gridBubbles.length === 0 && state.obstaclesReady) {
      triggerGameOver(true);
      return true;
    }

    const loseThresholdY = ARENA_BOUNDS.bottom + ARENA_BOUNDS.radius * 1.75;
    for (let i = 0; i < gridBubbles.length; i++) {
      if (gridBubbles[i].y <= loseThresholdY) {
        triggerGameOver(false);
        return true;
      }
    }
    return false;
  }

  /* =========================================================
   * FIRING, COLLISION & CLUSTER MATCHING
   * ========================================================= */
  function fireSphere() {
    if (!state.isRunning || state.isPaused || !state.obstaclesReady || activeProjectile) return;

    triggerHaptic(18);
    const baseSpeed = 14.5 * state.ballSpeedMultiplier;
    const vx = Math.sin(state.aimAngle) * baseSpeed;
    const vy = Math.cos(state.aimAngle) * baseSpeed;

    const geo = new THREE.SphereGeometry(ARENA_BOUNDS.radius, 28, 28);
    const mesh = new THREE.Mesh(geo, getMaterialForType(state.currentTypeIndex));
    const startX = Math.sin(state.aimAngle) * 0.45;
    const startY = ARENA_BOUNDS.bottom + Math.cos(state.aimAngle) * 0.45;
    mesh.position.set(startX, startY, 0);
    scene.add(mesh);

    activeProjectile = {
      mesh,
      x: startX,
      y: startY,
      vx,
      vy,
      typeIndex: state.currentTypeIndex
    };

    state.currentTypeIndex = state.nextTypeIndex;
    state.nextTypeIndex = Math.floor(Math.random() * SPHERE_TYPES.length);
    syncArsenalUI();
  }

  function settleProjectile() {
    if (!activeProjectile) return;
    const { mesh, x, y, typeIndex } = activeProjectile;
    const newEntry = { mesh, x, y, typeIndex };
    gridBubbles.push(newEntry);
    activeProjectile = null;

    // BFS cluster matching (pop 3 or more of same type)
    const cluster = [newEntry];
    const visited = new Set([newEntry]);
    const queue = [newEntry];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const other of gridBubbles) {
        if (!visited.has(other) && other.typeIndex === typeIndex) {
          const d = Math.hypot(curr.x - other.x, curr.y - other.y);
          if (d <= ARENA_BOUNDS.radius * 2.35) {
            visited.add(other);
            cluster.push(other);
            queue.push(other);
          }
        }
      }
    }

    if (cluster.length >= 3) {
      cluster.forEach((b) => {
        scene.remove(b.mesh);
      });
      gridBubbles = gridBubbles.filter((b) => !visited.has(b));
      state.score += cluster.length * 25;
      triggerHaptic(25);
      updateRecordsAndHUD();
    }

    checkWinOrLoseCondition();
  }

  /* =========================================================
   * SKY CYCLE (DAY / NIGHT / ACCELERATION WITH W & S)
   * ========================================================= */
  const dayColor = new THREE.Color('#bde0fe');
  const duskColor = new THREE.Color('#fbcfe8');
  const nightColor = new THREE.Color('#0f172a');

  function updateSkyLighting(dt) {
    if (state.bgMode === 'day') {
      state.skyTime += dt * 0.015 * state.cycleSpeed;
    } else if (state.bgMode === 'night') {
      state.skyTime += dt * 0.015 * state.cycleSpeed;
    } else {
      state.skyTime = (state.skyTime + dt * 0.045 * state.cycleSpeed) % 1;
    }

    let phaseFactor = (Math.sin(state.skyTime * Math.PI * 2) + 1) / 2;
    if (state.bgMode === 'day') phaseFactor = 0.75 + 0.25 * phaseFactor;
    if (state.bgMode === 'night') phaseFactor = 0.22 * phaseFactor;

    const currentBg = new THREE.Color();
    if (phaseFactor > 0.5) {
      currentBg.lerpColors(duskColor, dayColor, (phaseFactor - 0.5) * 2);
      dom.skyPhaseVal.textContent = 'Radiant Day';
    } else {
      currentBg.lerpColors(nightColor, duskColor, phaseFactor * 2);
      dom.skyPhaseVal.textContent = 'Starlight Night';
    }

    scene.background = currentBg;
    sunLight.intensity = 0.35 + phaseFactor * 0.95;
    sunLight.position.x = Math.cos(state.skyTime * Math.PI * 2) * 14;
    sunLight.position.y = Math.sin(state.skyTime * Math.PI * 2) * 14 + 4;
    starsMesh.material.opacity = Math.max(0, 1 - phaseFactor * 1.6);
  }

  /* =========================================================
   * HUD & HIGH SCORE / HIGH TIME PERSISTENCE
   * ========================================================= */
  function syncArsenalUI() {
    const curr = SPHERE_TYPES[state.currentTypeIndex];
    const next = SPHERE_TYPES[state.nextTypeIndex];

    dom.currentBallDot.style.background = curr.bubbleColor;
    dom.currentBallName.textContent =
      state.ballMode === 'bubbles' ? curr.bubbleLabel : curr.label;

    dom.nextBallDot.style.background = next.bubbleColor;
    dom.nextBallName.textContent =
      state.ballMode === 'bubbles' ? next.bubbleLabel : next.label;

    if (launcherMesh) {
      launcherMesh.material = getMaterialForType(state.currentTypeIndex);
    }
    gridBubbles.forEach((b) => {
      b.mesh.material = getMaterialForType(b.typeIndex);
    });
  }

  function updateRecordsAndHUD() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(state.highScore));
    }
    if (Math.floor(state.elapsedSeconds) > state.highTime) {
      state.highTime = Math.floor(state.elapsedSeconds);
      localStorage.setItem(STORAGE_KEYS.HIGH_TIME, String(state.highTime));
    }

    dom.scoreVal.textContent = state.score;
    dom.timeVal.textContent = formatTime(state.elapsedSeconds);
    dom.highScoreVal.textContent = state.highScore;
    dom.highTimeVal.textContent = formatTime(state.highTime);
    dom.cycleSpeedVal.textContent = `${state.cycleSpeed.toFixed(1)}x`;
    dom.ballSpeedVal.textContent = `${state.ballSpeedMultiplier.toFixed(1)}x`;
  }

  /* =========================================================
   * 3-SECOND COUNTDOWN & 2-SECOND OBSTACLE DELAY
   * ========================================================= */
  function runThreeSecondCountdown(subtext, onComplete) {
    state.isPaused = true;
    dom.countdownOverlay.classList.remove('hidden');
    let remaining = 3;
    dom.countdownNumber.textContent = remaining;
    dom.countdownSubtext.textContent = subtext;

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        dom.countdownNumber.textContent = remaining;
      } else {
        clearInterval(interval);
        dom.countdownOverlay.classList.add('hidden');
        state.isPaused = false;
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  function startNewOrSavedSession(savedData = null) {
    dom.screenDevice.classList.remove('active');
    dom.screenCustomize.classList.remove('active');
    dom.gameoverModal.classList.add('hidden');
    dom.pauseModal.classList.add('hidden');
    dom.gameHud.classList.remove('hidden');

    calibrateScreenScaling();
    state.isRunning = true;
    state.obstaclesReady = false;
    clearArenaSpheres();

    if (savedData) {
      state.score = savedData.score || 0;
      state.elapsedSeconds = savedData.elapsedSeconds || 0;
      state.device = savedData.device || state.device;
      state.biome = savedData.biome || state.biome;
      state.bgMode = savedData.bgMode || state.bgMode;
      state.ballMode = savedData.ballMode || state.ballMode;
    } else {
      state.score = 0;
      state.elapsedSeconds = 0;
    }

    buildBiome3D(state.biome);
    syncArsenalUI();
    updateRecordsAndHUD();

    // 3-Second Countdown before starting the game
    runThreeSecondCountdown('Arena Starting in 3 Seconds...', () => {
      // 2-Second Delay before obstacles appear on initiation
      setTimeout(() => {
        if (state.isRunning) {
          populateObstacleGrid(savedData ? savedData.grid : null);
        }
      }, 2000);
    });
  }

  /* =========================================================
   * INPUT CONTROLS (KEYBOARD + HAPTIC TOUCH SLIDE + BUTTONS)
   * ========================================================= */
  function setAimAngleFromNormalized(nx) {
    state.aimAngle = Math.max(-1.18, Math.min(1.18, nx * 1.15));
    if (dom.aimSlider) {
      dom.aimSlider.value = String(Math.round(state.aimAngle * 100));
    }
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') {
      state.cycleSpeed = Math.min(5.0, state.cycleSpeed + 0.25);
      updateRecordsAndHUD();
    } else if (key === 's') {
      state.cycleSpeed = Math.max(0.2, state.cycleSpeed - 0.25);
      updateRecordsAndHUD();
    } else if (key === 'a') {
      state.ballSpeedMultiplier = Math.min(3.0, state.ballSpeedMultiplier + 0.2);
      updateRecordsAndHUD();
    } else if (key === 'd') {
      state.ballSpeedMultiplier = Math.max(0.4, state.ballSpeedMultiplier - 0.2);
      updateRecordsAndHUD();
    } else if (key === 'c' || e.key === 'ArrowUp') {
      e.preventDefault();
      swapCurrentAndNextBall();
    } else if (e.key === 'ArrowLeft') {
      setAimAngleFromNormalized((state.aimAngle - 0.08) / 1.15);
    } else if (e.key === 'ArrowRight') {
      setAimAngleFromNormalized((state.aimAngle + 0.08) / 1.15);
    } else if (e.key === ' ') {
      fireSphere();
    }
  });

  // Haptic Touch Slide & Pointer Aiming on 3D Canvas
  const canvasContainer = document.getElementById('canvas-container');
  let isPointerDragging = false;
  let lastHapticTick = 0;

  canvasContainer.addEventListener('pointerdown', (e) => {
    isPointerDragging = true;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    setAimAngleFromNormalized(nx);
    if (e.pointerType === 'mouse') {
      fireSphere();
    } else {
      triggerHaptic(8);
    }
  });

  canvasContainer.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || isPointerDragging) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      setAimAngleFromNormalized(nx);
      const now = performance.now();
      if (isPointerDragging && e.pointerType !== 'mouse' && now - lastHapticTick > 90) {
        triggerHaptic(5);
        lastHapticTick = now;
      }
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (isPointerDragging && e.pointerType !== 'mouse') {
      isPointerDragging = false;
      fireSphere();
    }
    isPointerDragging = false;
  });

  // Dedicated Haptic Touch Range Slider
  if (dom.aimSlider) {
    dom.aimSlider.addEventListener('input', (e) => {
      state.aimAngle = Number(e.target.value) / 100;
      const now = performance.now();
      if (now - lastHapticTick > 80) {
        triggerHaptic(6);
        lastHapticTick = now;
      }
    });
  }

  // On-Screen Device & HUD Buttons
  document.getElementById('btn-cycle-up').addEventListener('click', () => {
    state.cycleSpeed = Math.min(5.0, state.cycleSpeed + 0.25);
    updateRecordsAndHUD();
  });
  document.getElementById('btn-cycle-down').addEventListener('click', () => {
    state.cycleSpeed = Math.max(0.2, state.cycleSpeed - 0.25);
    updateRecordsAndHUD();
  });
  document.getElementById('btn-ball-up').addEventListener('click', () => {
    state.ballSpeedMultiplier = Math.min(3.0, state.ballSpeedMultiplier + 0.2);
    updateRecordsAndHUD();
  });
  document.getElementById('btn-ball-down').addEventListener('click', () => {
    state.ballSpeedMultiplier = Math.max(0.4, state.ballSpeedMultiplier - 0.2);
    updateRecordsAndHUD();
  });
  document.getElementById('btn-bird-jump').addEventListener('click', swapCurrentAndNextBall);
  document.getElementById('swap-ball-btn').addEventListener('click', swapCurrentAndNextBall);
  document.getElementById('btn-fire').addEventListener('click', fireSphere);

  document.getElementById('cycle-biome-btn').addEventListener('click', () => {
    const idx = BIOME_LIST.findIndex((b) => b.id === state.biome);
    const nextBiome = BIOME_LIST[(idx + 1) % BIOME_LIST.length];
    state.biome = nextBiome.id;
    buildBiome3D(state.biome);
  });

  /* =========================================================
   * INITIATION SCREENS, BIOME SELECTION & PAUSE / SAVE / REMATCH
   * ========================================================= */
  function checkSavedSessionBanner() {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SESSION);
    if (!raw) {
      dom.savedBanner.classList.add('hidden');
      return;
    }
    try {
      const data = JSON.parse(raw);
      dom.savedDetails.textContent = `Score: ${data.score} | Time: ${formatTime(data.elapsedSeconds)}`;
      dom.savedBanner.classList.remove('hidden');
    } catch {
      dom.savedBanner.classList.add('hidden');
    }
  }

  // Screen 1: Device Selection
  document.querySelectorAll('.device-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.device = card.getAttribute('data-device');
      calibrateScreenScaling();
      dom.screenDevice.classList.remove('active');
      dom.screenCustomize.classList.add('active');
    });
  });

  dom.resumeSavedBtn.addEventListener('click', () => {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SESSION);
    if (raw) {
      startNewOrSavedSession(JSON.parse(raw));
    }
  });

  // Screen 2: 12 Interactive Biomes, Background & Ball Options
  document.querySelectorAll('#biome-options .biome-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#biome-options .biome-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.biome = btn.getAttribute('data-biome');
      buildBiome3D(state.biome);
    });
  });

  document.querySelectorAll('#bg-options .option-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#bg-options .option-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.bgMode = btn.getAttribute('data-bg');
    });
  });

  document.querySelectorAll('#ball-options .option-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ball-options .option-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.ballMode = btn.getAttribute('data-ball');
      syncArsenalUI();
    });
  });

  document.getElementById('back-to-device-btn').addEventListener('click', () => {
    dom.screenCustomize.classList.remove('active');
    dom.screenDevice.classList.add('active');
  });

  document.getElementById('launch-game-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.SAVED_SESSION);
    startNewOrSavedSession(null);
  });

  // Pause & Save to Home
  document.getElementById('pause-btn').addEventListener('click', () => {
    if (!state.isRunning || state.isPaused) return;
    state.isPaused = true;
    dom.pauseModal.classList.remove('hidden');
  });

  document.getElementById('resume-game-btn').addEventListener('click', () => {
    dom.pauseModal.classList.add('hidden');
    runThreeSecondCountdown('Resuming Session...', null);
  });

  document.getElementById('save-home-btn').addEventListener('click', () => {
    const serializedGrid = gridBubbles.map((b) => ({
      x: b.x,
      y: b.y,
      typeIndex: b.typeIndex
    }));

    const payload = {
      score: state.score,
      elapsedSeconds: state.elapsedSeconds,
      device: state.device,
      biome: state.biome,
      bgMode: state.bgMode,
      ballMode: state.ballMode,
      grid: serializedGrid
    };

    localStorage.setItem(STORAGE_KEYS.SAVED_SESSION, JSON.stringify(payload));
    updateRecordsAndHUD();

    dom.pauseModal.classList.add('hidden');
    dom.gameHud.classList.add('hidden');
    state.isRunning = false;
    state.isPaused = false;
    checkSavedSessionBanner();
    dom.screenDevice.classList.add('active');
  });

  // Rematch & Return to Homescreen from Win/Lose Modal
  document.getElementById('rematch-btn').addEventListener('click', () => {
    dom.gameoverModal.classList.add('hidden');
    startNewOrSavedSession(null);
  });

  document.getElementById('gameover-home-btn').addEventListener('click', () => {
    dom.gameoverModal.classList.add('hidden');
    dom.gameHud.classList.add('hidden');
    clearArenaSpheres();
    state.isRunning = false;
    state.isPaused = false;
    checkSavedSessionBanner();
    dom.screenDevice.classList.add('active');
  });

  /* =========================================================
   * MAIN ANIMATION LOOP
   * ========================================================= */
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    updateSkyLighting(dt);
    updateTrajectoryProjection();

    // Animate Interactive 3D Biome Elements
    for (let i = 0; i < biomeAnimatedItems.length; i++) {
      const item = biomeAnimatedItems[i];
      if (item.rotY) item.mesh.rotation.y += item.rotY * dt;
      if (item.rotZ) item.mesh.rotation.z += item.rotZ * dt;
      if (item.floatOffset !== undefined) {
        item.mesh.position.y = item.baseY + Math.sin(now * 0.0025 + item.floatOffset) * 0.45;
      }
    }

    if (state.isRunning && !state.isPaused) {
      state.elapsedSeconds += dt;
      updateRecordsAndHUD();

      if (activeProjectile) {
        activeProjectile.x += activeProjectile.vx * dt;
        activeProjectile.y += activeProjectile.vy * dt;

        // Bounce off left & right rectangular walls
        if (activeProjectile.x <= ARENA_BOUNDS.left) {
          activeProjectile.x = ARENA_BOUNDS.left;
          activeProjectile.vx = Math.abs(activeProjectile.vx);
        } else if (activeProjectile.x >= ARENA_BOUNDS.right) {
          activeProjectile.x = ARENA_BOUNDS.right;
          activeProjectile.vx = -Math.abs(activeProjectile.vx);
        }

        activeProjectile.mesh.position.set(activeProjectile.x, activeProjectile.y, 0);
        activeProjectile.mesh.rotation.x += 5 * dt;
        activeProjectile.mesh.rotation.y += 5 * dt;

        // Check ceiling or sphere collision
        if (activeProjectile.y >= ARENA_BOUNDS.top) {
          activeProjectile.y = ARENA_BOUNDS.top;
          activeProjectile.mesh.position.y = activeProjectile.y;
          settleProjectile();
        } else {
          for (let i = 0; i < gridBubbles.length; i++) {
            const b = gridBubbles[i];
            const dist = Math.hypot(activeProjectile.x - b.x, activeProjectile.y - b.y);
            if (dist <= ARENA_BOUNDS.radius * 1.95) {
              settleProjectile();
              break;
            }
          }
        }
      }
    }

    renderer.render(scene, camera);
  }

  /* =========================================================
   * BOOTSTRAP
   * ========================================================= */
  initThreeScene();
  calibrateScreenScaling();
  checkSavedSessionBanner();
  updateRecordsAndHUD();
  requestAnimationFrame(animate);
})();
