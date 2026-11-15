// Santini 3D - Motore Three.js con foto reali dei santi o fallback illustrato

let scene, camera, renderer;
let currentCardMesh = null;
let flyingCards = [];
let environmentGroup = new THREE.Group();
let currentEnv = 'montagna';

let deck = [];
let currentIndex = 0;

let isDragging = false;
let dragStartPos = { x: 0, y: 0, time: 0 };
let dragCurrentPos = { x: 0, y: 0 };
const cardRestPos = new THREE.Vector3(0, 0.22, 3.1);

const textureLoader = new THREE.TextureLoader();

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e4, 0.9);
  dirLight.position.set(8, 18, 10);
  scene.add(dirLight);

  scene.add(environmentGroup);
  buildEnvironment(currentEnv);

  const datiOggi = getSantiDiOggi();
  document.getElementById('date-title').textContent = `Santi del ${datiOggi.dataFormattata}`;
  deck = datiOggi.santi;
  spawnNextCard();

  setupEvents();
  animate();
}

// Crea la texture del santino (supporta foto reale o fallback icona)
async function createSantinoTextureAsync(santo) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // Sfondo pergamena
    ctx.fillStyle = '#fdf8eb';
    ctx.fillRect(0, 0, 512, 768);

    // Cornice dorata esterna
    const gradGold = ctx.createLinearGradient(0, 0, 512, 768);
    gradGold.addColorStop(0, '#b45309');
    gradGold.addColorStop(0.25, '#fbbf24');
    gradGold.addColorStop(0.5, '#fef08a');
    gradGold.addColorStop(0.75, '#d97706');
    gradGold.addColorStop(1, '#78350f');

    ctx.lineWidth = 28;
    ctx.strokeStyle = gradGold;
    ctx.strokeRect(14, 14, 484, 740);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#92400e';
    ctx.strokeRect(36, 36, 440, 696);

    const corners = [[42,42], [470,42], [42,726], [470,726]];
    ctx.fillStyle = '#d97706';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    const imgX = 64, imgY = 68, imgW = 384, imgH = 380;

    const finishCanvas = () => {
      // Cornice interna illustrazione
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#b45309';
      ctx.strokeRect(imgX, imgY, imgW, imgH);

      // Nome del Santo
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 34px Georgia, serif';
      wrapText(ctx, santo.nome, 256, 495, 400, 38);

      // Titolo
      ctx.fillStyle = '#b45309';
      ctx.font = 'italic 22px Georgia, serif';
      wrapText(ctx, santo.titolo, 256, 575, 400, 26);

      // Divisore
      ctx.beginPath();
      ctx.moveTo(120, 615);
      ctx.lineTo(392, 615);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Bio
      ctx.fillStyle = '#475569';
      ctx.font = '19px Georgia, serif';
      wrapText(ctx, santo.bio, 256, 650, 390, 24);

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
        
        // Disegna l'immagine adattandola al riquadro (cover)
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
        // Fallback in caso di errore di caricamento dell'immagine remota
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
  const bgGrad = ctx.createRadialGradient(256, 258, 30, 256, 258, 240);
  bgGrad.addColorStop(0, santo.grafica.coloreSecondario);
  bgGrad.addColorStop(1, santo.grafica.colorePrimario);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(imgX, imgY, imgW, imgH);

  ctx.beginPath();
  ctx.arc(256, 255, 115, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  ctx.font = '150px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(santo.grafica.icona, 256, 262);
}

// Texture retro del santino
function createBackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 512, 768);

  ctx.lineWidth = 24;
  ctx.strokeStyle = '#fbbf24';
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
}

async function spawnNextCard() {
  updateUI();
  if (currentIndex >= deck.length) {
    document.getElementById('reset-btn').style.display = 'inline-block';
    document.getElementById('hint-text').textContent = 'Hai lanciato tutti i santi di oggi!';
    document.getElementById('current-saint-sub').textContent = 'Mazzo completato';
    return;
  }

  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('hint-text').textContent = '👆 Trascina e lancia il santino come un frisbee!';

  const santo = deck[currentIndex];
  document.getElementById('current-saint-sub').textContent = santo.nome;

  const frontTex = await createSantinoTextureAsync(santo);
  const geometry = new THREE.BoxGeometry(1.18, 1.77, 0.02);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.35 });
  const backMat = new THREE.MeshStandardMaterial({ map: sharedBackTexture, roughness: 0.4 });

  const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
  const card = new THREE.Mesh(geometry, materials);

  card.position.copy(cardRestPos);
  card.rotation.set(-0.2, 0, 0);
  scene.add(card);
  currentCardMesh = card;
}

function updateUI() {
  const remaining = Math.max(0, deck.length - currentIndex);
  document.getElementById('card-counter').textContent = `${remaining} / ${deck.length}`;
}

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
    (err) => {
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
    currentCardMesh.rotation.x = -0.2 + dy * 1.2;
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
      currentIndex++;

      setTimeout(() => {
        spawnNextCard();
      }, 350);
    } else {
      currentCardMesh.position.copy(cardRestPos);
      currentCardMesh.rotation.set(-0.2, 0, 0);
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
    currentIndex = 0;
    flyingCards.forEach(fc => scene.remove(fc.mesh));
    flyingCards = [];
    spawnNextCard();
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
