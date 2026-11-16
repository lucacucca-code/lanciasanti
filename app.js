// Santini 3D - Motore Three.js con foto reali, testo centrato, streak 3 giorni e santi bonus infiniti

let scene, camera, renderer;
let currentCardMesh = null;
let flyingCards = [];
let environmentGroup = new THREE.Group();
let currentEnv = 'montagna';

let deck = [];
let currentIndex = 0;
let datiOggiCache = null;

// Gestione modalità bonus e progressione
let isBonusMode = false;
let selectedBonusIndex = 0;
const STORAGE_KEY = 'santini_3d_progress_v1';

let isDragging = false;
let dragStartPos = { x: 0, y: 0, time: 0 };
let dragCurrentPos = { x: 0, y: 0 };
const cardRestPos = new THREE.Vector3(0, 0.25, 3.1);

const textureLoader = new THREE.TextureLoader();

// --- GESTIONE PROGRESSIONE E STREAK (localStorage) ---

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayDateString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        streak: parsed.streak || 0,
        lastCompletedDate: parsed.lastCompletedDate || null,
        unlockedBonusCount: parsed.unlockedBonusCount || 0
      };
    }
  } catch (e) {
    console.warn('Errore lettura progressi:', e);
  }
  return { streak: 0, lastCompletedDate: null, unlockedBonusCount: 0 };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Errore salvataggio progressi:', e);
  }
}

function getAvailableBonusList() {
  if (typeof SANTI_BONUS === 'undefined' || !Array.isArray(SANTI_BONUS)) {
    return [];
  }
  const progress = loadProgress();
  return SANTI_BONUS.slice(0, progress.unlockedBonusCount);
}

// Registra il completamento del mazzo giornaliero (max 1 volta al giorno)
function registerDailyDeckCompletion() {
  const progress = loadProgress();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  // Se l'utente ha già completato il mazzo oggi (es. ha cliccato "Ricarica mazzo santi"), non incrementare
  if (progress.lastCompletedDate === today) {
    return { newlyUnlocked: false, progress };
  }

  if (progress.lastCompletedDate === yesterday) {
    progress.streak += 1;
  } else {
    // Ha saltato uno o più giorni (o è la prima volta): la serie riparte da 1
    progress.streak = 1;
  }

  progress.lastCompletedDate = today;

  let newlyUnlocked = false;
  const maxBonusDisponibili = (typeof SANTI_BONUS !== 'undefined' && Array.isArray(SANTI_BONUS)) ? SANTI_BONUS.length : 0;

  // Ogni 3 giorni consecutivi sblocca un nuovo santino bonus in modo permanente
  if (progress.streak % 3 === 0 && progress.unlockedBonusCount < maxBonusDisponibili) {
    progress.unlockedBonusCount += 1;
    newlyUnlocked = true;
  }

  saveProgress(progress);
  updateStreakBadge();
  return { newlyUnlocked, progress };
}

function updateStreakBadge() {
  const progress = loadProgress();
  const badge = document.getElementById('streak-badge');
  const unlocked = getAvailableBonusList().length;
  const bonusLabel = unlocked > 0 ? ` • ✨ ${unlocked} bonus` : '';
  badge.textContent = `🔥 Serie: ${progress.streak} gg${bonusLabel}`;
}

// --- INIZIALIZZAZIONE SCENA 3D ---

function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 1.2, 5.5);
  camera.lookAt(0, 0.4, -5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff1d6, 0.42);
  dirLight.position.set(5, 14, 8);
  scene.add(dirLight);

  scene.add(environmentGroup);
  buildEnvironment(currentEnv);

  datiOggiCache = getSantiDiOggi();
  document.getElementById('date-title').textContent = `Santi del ${datiOggiCache.dataFormattata}`;
  deck = datiOggiCache.santi;

  updateStreakBadge();
  spawnNextCard();

  setupEvents();
  animate();
}

// Crea la texture del santino con testo perfettamente centrato e contrasto elevato
async function createSantinoTextureAsync(santo, isBonusCard = false) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // Sfondo pergamena (leggermente più luminoso/prezioso per i santini bonus)
    const bgPergamena = ctx.createLinearGradient(0, 0, 0, 768);
    if (isBonusCard) {
      bgPergamena.addColorStop(0, '#fef9c3');
      bgPergamena.addColorStop(0.5, '#fde68a');
      bgPergamena.addColorStop(1, '#f59e0b');
    } else {
      bgPergamena.addColorStop(0, '#f3e5c8');
      bgPergamena.addColorStop(0.5, '#ead5ad');
      bgPergamena.addColorStop(1, '#dfc28d');
    }
    ctx.fillStyle = bgPergamena;
    ctx.fillRect(0, 0, 512, 768);

    // Cornice dorata esterna
    const gradGold = ctx.createLinearGradient(0, 0, 512, 768);
    gradGold.addColorStop(0, '#78350f');
    gradGold.addColorStop(0.25, '#d97706');
    gradGold.addColorStop(0.5, '#f59e0b');
    gradGold.addColorStop(0.75, '#b45309');
    gradGold.addColorStop(1, '#451a03');

    ctx.lineWidth = 28;
    ctx.strokeStyle = gradGold;
    ctx.strokeRect(14, 14, 484, 740);

    // Filigrana interna scura
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5c2808';
    ctx.strokeRect(36, 36, 440, 696);

    // Angoli decorativi
    const corners = [[42,42], [470,42], [42,726], [470,726]];
    ctx.fillStyle = '#78350f';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    const imgX = 76, imgY = 64, imgW = 360, imgH = 360;

    const finishCanvas = () => {
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#78350f';
      ctx.strokeRect(imgX, imgY, imgW, imgH);

      // Riquadro testo inferiore
      ctx.fillStyle = 'rgba(255, 251, 235, 0.82)';
      ctx.fillRect(52, 442, 408, 272);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
      ctx.strokeRect(52, 442, 408, 272);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Nome del Santo
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 32px Georgia, serif';
      const afterNameY = wrapText(ctx, santo.nome, 256, 485, 380, 36);

      // Titolo liturgico
      ctx.fillStyle = '#92400e';
      ctx.font = 'italic bold 21px Georgia, serif';
      const afterTitleY = wrapText(ctx, santo.titolo, 256, afterNameY + 14, 380, 26);

      // Linea divisoria centrata
      const lineY = afterTitleY + 10;
      ctx.beginPath();
      ctx.moveTo(136, lineY);
      ctx.lineTo(376, lineY);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Breve descrizione
      ctx.fillStyle = '#292524';
      ctx.font = '19px Georgia, serif';
      wrapText(ctx, santo.bio, 256, lineY + 30, 370, 24);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      resolve(texture);
    };

    if (santo.fotoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgX, imgY, imgW, imgH);
        ctx.clip();

        const hRatio = imgW / img.width;
        const vRatio = imgH / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (imgW - img.width * ratio) / 2;
        const centerShiftY = (imgH - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, imgX + centerShiftX, imgY + centerShiftY, img.width * ratio, img.height * ratio);
        ctx.restore();

        finishCanvas();
      };
      img.onerror = () => {
        drawFallbackIcon(ctx, santo, imgX, imgY, imgW, imgH);
        finishCanvas();
      };
      img.src = santo.fotoUrl;
    } else {
      drawFallbackIcon(ctx, santo, imgX, imgY, imgW, imgH);
      finishCanvas();
    }
  });
}

function drawFallbackIcon(ctx, santo, imgX, imgY, imgW, imgH) {
  const bgGrad = ctx.createRadialGradient(256, 244, 30, 256, 244, 220);
  bgGrad.addColorStop(0, santo.grafica.coloreSecondario);
  bgGrad.addColorStop(1, santo.grafica.colorePrimario);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(imgX, imgY, imgW, imgH);

  ctx.beginPath();
  ctx.arc(256, 244, 108, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  ctx.font = '140px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(santo.grafica.icona, 256, 250);
}

function createBackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5c2808';
  ctx.fillRect(0, 0, 512, 768);

  ctx.lineWidth = 24;
  ctx.strokeStyle = '#d97706';
  ctx.strokeRect(16, 16, 480, 736);

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('✝', 256, 340);
  ctx.font = 'italic 26px Georgia, serif';
  ctx.fillText('Santi del Giorno', 256, 400);

  return new THREE.CanvasTexture(canvas);
}

const sharedBackTexture = createBackTexture();

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  ctx.textAlign = 'center';
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight * 0.5;
}

// --- GESTIONE CARTE E MODALITÀ BONUS ---

async function spawnCardMesh(santo, isBonusCard = false) {
  if (currentCardMesh) {
    scene.remove(currentCardMesh);
    currentCardMesh = null;
  }

  const frontTex = await createSantinoTextureAsync(santo, isBonusCard);
  const geometry = new THREE.BoxGeometry(1.18, 1.77, 0.02);

  const sideMat = new THREE.MeshStandardMaterial({ color: isBonusCard ? 0xd97706 : 0x92400e, roughness: 0.6 });
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.78, metalness: 0.05 });
  const backMat = new THREE.MeshStandardMaterial({ map: sharedBackTexture, roughness: 0.78, metalness: 0.05 });

  const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
  const card = new THREE.Mesh(geometry, materials);

  card.position.copy(cardRestPos);
  card.rotation.set(-0.16, 0, 0);
  scene.add(card);
  currentCardMesh = card;
}

async function spawnNextCard() {
  updateUI();

  const endActions = document.getElementById('end-actions');
  const bonusModeBtn = document.getElementById('bonus-mode-btn');
  const bonusPickerContainer = document.getElementById('bonus-picker-container');
  const exitBonusBtn = document.getElementById('exit-bonus-btn');

  // MODALITÀ BONUS INFINITA
  if (isBonusMode) {
    const bonusList = getAvailableBonusList();
    if (bonusList.length === 0) {
      exitBonusMode();
      return;
    }

    if (selectedBonusIndex >= bonusList.length) {
      selectedBonusIndex = 0;
    }

    endActions.style.display = 'none';
    bonusPickerContainer.style.display = 'flex';
    exitBonusBtn.style.display = 'inline-block';

    const santoBonus = bonusList[selectedBonusIndex];
    document.getElementById('date-title').textContent = '✨ Santi Bonus Infiniti';
    document.getElementById('current-saint-sub').textContent = santoBonus.nome;
    document.getElementById('hint-text').textContent = '✨ Lancia questo santino bonus quante volte vuoi!';

    await spawnCardMesh(santoBonus, true);
    return;
  }

  // MODALITÀ NORMALE (SANTI DEL GIORNO)
  bonusPickerContainer.style.display = 'none';
  exitBonusBtn.style.display = 'none';
  document.getElementById('date-title').textContent = `Santi del ${datiOggiCache.dataFormattata}`;

  if (currentIndex >= deck.length) {
    // Mazzo giornaliero completato! Aggiorna streak e controlla eventuali sblocchi
    const result = registerDailyDeckCompletion();
    const availableBonus = getAvailableBonusList();

    endActions.style.display = 'flex';
    bonusModeBtn.style.display = availableBonus.length > 0 ? 'inline-block' : 'none';

    if (result.newlyUnlocked) {
      document.getElementById('hint-text').textContent = '🎉 3 giorni consecutivi! Nuovo Santino Bonus sbloccato!';
    } else {
      document.getElementById('hint-text').textContent = 'Hai lanciato tutti i santi di oggi!';
    }
    document.getElementById('current-saint-sub').textContent = 'Mazzo completato';
    return;
  }

  endActions.style.display = 'none';
  document.getElementById('hint-text').textContent = '👆 Trascina e lancia il santino come un frisbee!';

  const santo = deck[currentIndex];
  document.getElementById('current-saint-sub').textContent = santo.nome;
  await spawnCardMesh(santo, false);
}

function enterBonusMode() {
  const bonusList = getAvailableBonusList();
  if (bonusList.length === 0) return;

  isBonusMode = true;
  selectedBonusIndex = 0;
  renderBonusSelector();
  spawnNextCard();
}

function exitBonusMode() {
  isBonusMode = false;
  if (currentCardMesh) {
    scene.remove(currentCardMesh);
    currentCardMesh = null;
  }
  spawnNextCard();
}

function renderBonusSelector() {
  const container = document.getElementById('bonus-selector');
  container.innerHTML = '';

  const bonusList = getAvailableBonusList();
  bonusList.forEach((santo, idx) => {
    const btn = document.createElement('button');
    btn.className = 'bonus-select-btn' + (idx === selectedBonusIndex ? ' active' : '');
    const icon = (santo.grafica && santo.grafica.icona) ? santo.grafica.icona : '✨';
    btn.textContent = `${icon} ${santo.nome}`;
    btn.addEventListener('click', () => {
      if (selectedBonusIndex === idx) return;
      selectedBonusIndex = idx;
      renderBonusSelector();
      spawnNextCard();
    });
    container.appendChild(btn);
  });
}

function updateUI() {
  if (isBonusMode) {
    document.getElementById('card-counter').textContent = '∞ Bonus';
    return;
  }
  const remaining = Math.max(0, deck.length - currentIndex);
  document.getElementById('card-counter').textContent = `${remaining} / ${deck.length}`;
}

// --- AMBIENTI 3D ---

function updateBackgroundAspect(texture) {
  if (!texture || !texture.image) return;
  const targetAspect = window.innerWidth / window.innerHeight;
  const imageAspect = texture.image.width / texture.image.height;
  const factor = imageAspect / targetAspect;

  texture.offset.x = factor > 1 ? (1 - 1 / factor) / 2 : 0;
  texture.repeat.x = factor > 1 ? 1 / factor : 1;
  texture.offset.y = factor > 1 ? 0 : (1 - factor) / 2;
  texture.repeat.y = factor > 1 ? 1 : factor;
  texture.needsUpdate = true;
}

function buildEnvironment(envType) {
  while (environmentGroup.children.length > 0) {
    environmentGroup.remove(environmentGroup.children[0]);
  }

  const bgFiles = {
    'montagna': 'montagna.jpg',
    'grattacielo': 'grattacielo.jpg',
    'scogliera': 'scogliera.jpg',
    'sanpietro': 'sanpietro.jpg'
  };

  const fallbackColors = {
    'montagna': 0x60a5fa,
    'grattacielo': 0xf97316,
    'scogliera': 0x0284c7,
    'sanpietro': 0x7dd3fc
  };

  const fileName = bgFiles[envType];

  textureLoader.load(
    fileName,
    (texture) => {
      updateBackgroundAspect(texture);
      scene.background = texture;
      scene.fog = null;
    },
    undefined,
    () => {
      scene.background = new THREE.Color(fallbackColors[envType] || 0x1e293b);
    }
  );

  const ledgeConfigs = {
    'montagna': { color: 0x64748b, opacity: 0.85 },
    'grattacielo': { color: 0x334155, opacity: 0.75 },
    'scogliera': { color: 0x78716c, opacity: 0.85 },
    'sanpietro': { color: 0xfef3c7, opacity: 0.9 }
  };

  const cfg = ledgeConfigs[envType] || { color: 0x334155, opacity: 0.8 };
  const ledgeGeo = new THREE.BoxGeometry(8, 1.0, 3.5);
  const ledgeMat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    roughness: 0.85,
    transparent: true,
    opacity: cfg.opacity
  });
  const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
  ledge.position.set(0, -2.7, 3.6);
  environmentGroup.add(ledge);
}

// --- EVENTI E FISICA LANCIO ---

function setupEvents() {
  const dom = renderer.domElement;

  const onStart = (x, y) => {
    if (!currentCardMesh) return;
    isDragging = true;
    dragStartPos = { x, y, time: performance.now() };
    dragCurrentPos = { x, y };
  };

  const onMove = (x, y) => {
    if (!isDragging || !currentCardMesh) return;
    dragCurrentPos = { x, y };

    const dx = (x - dragStartPos.x) / window.innerWidth;
    const dy = (y - dragStartPos.y) / window.innerHeight;

    currentCardMesh.position.x = cardRestPos.x + dx * 3.5;
    currentCardMesh.position.y = cardRestPos.y - dy * 3.5;
    currentCardMesh.rotation.z = -dx * 1.2;
    currentCardMesh.rotation.x = -0.16 + dy * 1.2;
  };

  const onEnd = () => {
    if (!isDragging || !currentCardMesh) return;
    isDragging = false;

    const dt = Math.max(0.05, (performance.now() - dragStartPos.time) / 1000);
    const dy = dragStartPos.y - dragCurrentPos.y;
    const dx = dragCurrentPos.x - dragStartPos.x;

    if (dy > 45) {
      const speedY = Math.min(25, (dy / window.innerHeight) / dt * 4.5);
      const speedX = (dx / window.innerWidth) / dt * 2.5;

      launchCardAsFrisbee(currentCardMesh, speedX, speedY);
      currentCardMesh = null;

      // In modalità normale avanza nel mazzo; in modalità bonus il mazzo è infinito
      if (!isBonusMode) {
        currentIndex++;
      }

      setTimeout(() => {
        spawnNextCard();
      }, 350);
    } else {
      currentCardMesh.position.copy(cardRestPos);
      currentCardMesh.rotation.set(-0.16, 0, 0);
    }
  };

  dom.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  dom.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  dom.addEventListener('touchend', onEnd);

  dom.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onEnd);

  document.querySelectorAll('.env-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentEnv = btn.dataset.env;
      buildEnvironment(currentEnv);
    });
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    isBonusMode = false;
    currentIndex = 0;
    flyingCards.forEach(fc => scene.remove(fc.mesh));
    flyingCards = [];
    spawnNextCard();
  });

  document.getElementById('bonus-mode-btn').addEventListener('click', () => {
    enterBonusMode();
  });

  document.getElementById('exit-bonus-btn').addEventListener('click', () => {
    exitBonusMode();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (scene.background && scene.background.isTexture) {
      updateBackgroundAspect(scene.background);
    }
  });
}

function launchCardAsFrisbee(mesh, vx, forwardSpeed) {
  mesh.rotation.x = -Math.PI / 2.2;

  flyingCards.push({
    mesh,
    velocity: new THREE.Vector3(vx, 3.8 + forwardSpeed * 0.18, -14 - forwardSpeed * 0.9),
    spinSpeed: (vx >= 0 ? -1 : 1) * (12 + Math.random() * 6),
    curveForce: -vx * 0.45,
    age: 0
  });
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (currentCardMesh && !isDragging) {
    currentCardMesh.position.y = cardRestPos.y + Math.sin(now * 0.003) * 0.04;
    currentCardMesh.rotation.y = Math.sin(now * 0.002) * 0.06;
  }

  for (let i = flyingCards.length - 1; i >= 0; i--) {
    const fc = flyingCards[i];
    fc.age += dt;

    const lift = Math.max(-4.5, 2.5 - fc.age * 2.2);
    fc.velocity.y += lift * dt;
    fc.velocity.x += fc.curveForce * dt;
    fc.velocity.z *= (1 - 0.18 * dt);

    fc.mesh.position.addScaledVector(fc.velocity, dt);

    fc.mesh.rotation.z += fc.spinSpeed * dt;
    fc.mesh.rotation.y = Math.sin(fc.age * 3) * 0.25;

    if (fc.mesh.position.z < -120 || fc.mesh.position.y < -25 || fc.age > 7) {
      scene.remove(fc.mesh);
      flyingCards.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
