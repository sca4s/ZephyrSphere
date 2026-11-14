(() => {
  /* =========================================================
   * STATE & STORAGE MANAGEMENT
   * ========================================================= */
  const STORAGE_KEYS = {
    HIGH_SCORE: 'zephyrsphere_high_score',
    HIGH_TIME: 'zephyrsphere_high_time',
    SAVED_SESSION: 'zephyrsphere_saved_session'
  };

  const state = {
    device: 'desktop',      // 'desktop' | 'tablet' | 'mobile'
    bgMode: 'day',          // 'day' | 'night' | 'cycle'
    ballMode: 'bubbles',    // 'bubbles' | 'sports'
    theme: 'light',
    score: 0,
    elapsedSeconds: 0,
    highScore: Number(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || 0),
    highTime: Number(localStorage.getItem(STORAGE_KEYS.HIGH_TIME) || 0),
    cycleSpeed: 1.0,        // W / S keys
    ballSpeedMultiplier: 1.0, // A / D keys
    skyTime: 0.25,          // 0..1 (0.25 = Noon, 0.75 = Midnight)
    isRunning: false,
    isPaused: false,
    obstaclesReady: false,
    aimAngle: 0,            // Horizontal angle in radians
    aimElevation: 0.18,     // Vertical elevation
    currentTypeIndex: 0,
    nextTypeIndex: 1,
    hiddenPanels: new Set()
  };

  const SPHERE_TYPES = [
    { id: 'football',   label: 'Football',    bubbleColor: '#ff7eb3', accent: '#ffffff' },
    { id: 'basketball', label: 'Basketball',  bubbleColor: '#ffa85c', accent: '#2d2d2d' },
    { id: 'cricket',    label: 'Cricket',     bubbleColor: '#ff5e62', accent: '#f8e7c1' },
    { id: 'tennis',     label: 'Tennis',      bubbleColor: '#a8ff78', accent: '#ffffff' },
    { id: 'volleyball', label: 'Volleyball',  bubbleColor: '#70e1f5', accent: '#ffd194' }
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
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),
    countdownSubtext: document.getElementById('countdown-subtext'),
    pauseModal: document.getElementById('pause-modal'),
    deviceDeckTitle: document.getElementById('device-deck-title')
  };

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
   * ADAPTIVE SCREEN RATIO & DEVICE CALIBRATION
   * ========================================================= */
  function calibrateScreenScaling() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let baseScale = Math.min(w / 1280, h / 800);
    baseScale = Math.max(0.76, Math.min(1.08, baseScale));

    if (state.device === 'mobile') {
      baseScale *= 0.88;
      dom.deviceDeckTitle.textContent = 'Mobile Thumb Deck';
    } else if (state.device === 'tablet') {
      baseScale *= 0.94;
      dom.deviceDeckTitle.textContent = 'Tablet Touch Bar';
    } else {
      dom.deviceDeckTitle.textContent = 'Desktop Command Bar';
    }

    document.documentElement.style.setProperty('--ui-scale', baseScale.toFixed(3));
  }

  window.addEventListener('resize', () => {
    calibrateScreenScaling();
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

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
          opacity: 0.78,
          roughness: 0.08,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05
        })
      );

      sphereMaterials.sports.push(
        new THREE.MeshStandardMaterial({
          map: createSportsTexture(t.id),
          roughness: 0.42,
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
   * THREE.JS 3D SCENE, ARENA, BIRD, TRAJECTORY & PHYSICS
   * ========================================================= */
  let scene, camera, renderer, sunLight, ambientLight, starsMesh;
  let arenaGroup, gridBubbles = [], activeProjectile = null;
  let launcherMesh, trajectoryLine;
  let birdGroup, birdLeftWing, birdRightWing;

  const ARENA_BOUNDS = {
    left: -6.6,
    right: 6.6,
    top: 8.5,
    bottom: -6.5,
    radius: 0.58
  };

  const birdState = {
    x: 0,
    y: 1.2,
    z: 0.9,
    vx: 2.6,
    vy: 0,
    baseY: 1.2,
    wingPhase: 0
  };

  function initThreeScene() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, -2.2, 18.5);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfff4d6, 1.15);
    sunLight.position.set(8, 14, 12);
    sunLight.castShadow = true;
    scene.add(sunLight);

    initMaterials();
    createStarfield();
    createArenaFrame();
    createLauncherAndTrajectory();
    createAutonomousBird();
  }

  function createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 70;
      positions[i + 1] = (Math.random() - 0.3) * 50;
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

  function createArenaFrame() {
    arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const railGeo = new THREE.CylinderGeometry(0.12, 0.12, 16, 16);
    const railMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15
    });

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(ARENA_BOUNDS.left - 0.65, 1, 0);
    arenaGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(ARENA_BOUNDS.right + 0.65, 1, 0);
    arenaGroup.add(rightRail);

    const topGeo = new THREE.CylinderGeometry(0.12, 0.12, 14.6, 16);
    const topRail = new THREE.Mesh(topGeo, railMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, ARENA_BOUNDS.top + 0.65, 0);
    arenaGroup.add(topRail);
  }

  function createLauncherAndTrajectory() {
    const baseGeo = new THREE.SphereGeometry(ARENA_BOUNDS.radius, 32, 32);
    launcherMesh = new THREE.Mesh(baseGeo, getMaterialForType(state.currentTypeIndex));
    launcherMesh.position.set(0, ARENA_BOUNDS.bottom, 0);
    scene.add(launcherMesh);

    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.38,
      gapSize: 0.22,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const points = [new THREE.Vector3(0, ARENA_BOUNDS.bottom, 0), new THREE.Vector3(0, 0, 0)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    trajectoryLine = new THREE.Line(lineGeo, lineMat);
    trajectoryLine.computeLineDistances();
    scene.add(trajectoryLine);
  }

  function createAutonomousBird() {
    birdGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.3 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.35 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), bodyMat);
    body.scale.set(1.3, 0.95, 0.9);
    birdGroup.add(body);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 12), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.62, 0.05, 0);
    birdGroup.add(beak);

    const wingGeo = new THREE.BoxGeometry(0.32, 0.06, 0.55);
    birdLeftWing = new THREE.Mesh(wingGeo, wingMat);
    birdLeftWing.position.set(0, 0.1, 0.42);
    birdGroup.add(birdLeftWing);

    birdRightWing = new THREE.Mesh(wingGeo, wingMat);
    birdRightWing.position.set(0, 0.1, -0.42);
    birdGroup.add(birdRightWing);

    birdGroup.position.set(birdState.x, birdState.y, birdState.z);
    scene.add(birdGroup);
  }

  function makeBirdJump() {
    if (!state.isRunning || state.isPaused) return;
    birdState.vy = 6.2;
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
    const spacingX = ARENA_BOUNDS.radius * 2.05;
    const spacingY = ARENA_BOUNDS.radius * 1.82;

    for (let r = 0; r < rows; r++) {
      const rowOffset = (r % 2) * (spacingX * 0.5);
      for (let c = 0; c < cols; c++) {
        const x = ARENA_BOUNDS.left + 0.65 + c * spacingX + rowOffset;
        if (x > ARENA_BOUNDS.right - 0.4) continue;
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
   * TRAJECTORY RAY-BOUNCE PROJECTION
   * ========================================================= */
  function updateTrajectoryProjection() {
    if (!trajectoryLine) return;

    const points = [];
    let px = 0;
    let py = ARENA_BOUNDS.bottom;
    let dx = Math.sin(state.aimAngle);
    let dy = Math.cos(state.aimAngle);

    points.push(new THREE.Vector3(px, py, 0));

    const step = 0.28;
    const maxSteps = 95;

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
   * FIRING, COLLISION & CLUSTER MATCHING
   * ========================================================= */
  function fireSphere() {
    if (!state.isRunning || state.isPaused || !state.obstaclesReady || activeProjectile) return;

    const baseSpeed = 14.5 * state.ballSpeedMultiplier;
    const vx = Math.sin(state.aimAngle) * baseSpeed;
    const vy = Math.cos(state.aimAngle) * baseSpeed;

    const geo = new THREE.SphereGeometry(ARENA_BOUNDS.radius, 28, 28);
    const mesh = new THREE.Mesh(geo, getMaterialForType(state.currentTypeIndex));
    mesh.position.set(0, ARENA_BOUNDS.bottom, 0);
    scene.add(mesh);

    activeProjectile = {
      mesh,
      x: 0,
      y: ARENA_BOUNDS.bottom,
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
      updateRecordsAndHUD();

      if (gridBubbles.length < 12) {
        populateObstacleGrid();
      }
    }
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

    let phaseFactor = (Math.sin(state.skyTime * Math.PI * 2) + 1) / 2; // 0 = Night, 1 = Day
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
      state.ballMode === 'bubbles' ? 'Bubble' : curr.label;
    dom.nextBallDot.style.background = next.bubbleColor;

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
    dom.gameHud.classList.remove('hidden');

    calibrateScreenScaling();
    state.isRunning = true;
    state.obstaclesReady = false;
    clearArenaSpheres();

    if (savedData) {
      state.score = savedData.score || 0;
      state.elapsedSeconds = savedData.elapsedSeconds || 0;
      state.device = savedData.device || state.device;
      state.bgMode = savedData.bgMode || state.bgMode;
      state.ballMode = savedData.ballMode || state.ballMode;
    } else {
      state.score = 0;
      state.elapsedSeconds = 0;
    }

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
   * INPUT CONTROLS (KEYBOARD + POINTER + DEVICE BUTTONS)
   * ========================================================= */
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
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      makeBirdJump();
    } else if (e.key === ' ') {
      fireSphere();
    }
  });

  // Pointer aiming on 3D Canvas
  const canvasContainer = document.getElementById('canvas-container');
  canvasContainer.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    state.aimAngle = Math.max(-1.18, Math.min(1.18, nx * 1.15));
  });

  canvasContainer.addEventListener('pointerdown', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    state.aimAngle = Math.max(-1.18, Math.min(1.18, nx * 1.15));
    fireSphere();
  });

  // On-Screen Device Buttons
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
  document.getElementById('btn-bird-jump').addEventListener('click', makeBirdJump);
  document.getElementById('btn-fire').addEventListener('click', fireSphere);

  /* =========================================================
   * INITIATION SCREENS & PAUSE / SAVE FLOW
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

  // Screen 2: Background & Ball Options
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

    // Autonomous Bird Motion + Jump Physics
    birdState.x += birdState.vx * dt;
    if (birdState.x > ARENA_BOUNDS.right - 1.2) {
      birdState.x = ARENA_BOUNDS.right - 1.2;
      birdState.vx = -Math.abs(birdState.vx);
      birdGroup.rotation.y = Math.PI;
    } else if (birdState.x < ARENA_BOUNDS.left + 1.2) {
      birdState.x = ARENA_BOUNDS.left + 1.2;
      birdState.vx = Math.abs(birdState.vx);
      birdGroup.rotation.y = 0;
    }

    birdState.y += birdState.vy * dt;
    if (birdState.y > birdState.baseY) {
      birdState.vy -= 14.5 * dt;
    } else {
      birdState.y = birdState.baseY;
      birdState.vy = 0;
    }

    birdState.wingPhase += dt * 14;
    const flap = Math.sin(birdState.wingPhase) * 0.55;
    birdLeftWing.rotation.x = flap;
    birdRightWing.rotation.x = -flap;
    birdGroup.position.set(birdState.x, birdState.y + Math.sin(now * 0.004) * 0.15, birdState.z);

    if (state.isRunning && !state.isPaused) {
      state.elapsedSeconds += dt;
      updateRecordsAndHUD();

      if (activeProjectile) {
        activeProjectile.x += activeProjectile.vx * dt;
        activeProjectile.y += activeProjectile.vy * dt;

        // Bounce off left & right walls
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
