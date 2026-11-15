// Santini 3D - Motore Three.js con fisica di lancio tipo frisbee e 4 scenari 3D

let scene, camera, renderer;
let currentCardMesh = null;
let flyingCards = [];
let environmentGroup = new THREE.Group();
let currentEnv = 'montagna';

let deck = [];
let currentIndex = 0;

// Variabili per il drag & lancio (frisbee)
let isDragging = false;
let dragStartPos = { x: 0, y: 0, time: 0 };
let dragCurrentPos = { x: 0, y: 0 };
const cardRestPos = new THREE.Vector3(0, -0.5, 3.2);

function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 1.2, 5.5);
  camera.lookAt(0, 0.4, -5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Luci
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e4, 0.9);
  dirLight.position.set(8, 18, 10);
  scene.add(dirLight);

  scene.add(environmentGroup);
  buildEnvironment(currentEnv);

  // Carica santi del giorno
  const datiOggi = getSantiDiOggi();
  document.getElementById('date-title').textContent = `Santi del ${datiOggi.dataFormattata}`;
  deck = datiOggi.santi;
  spawnNextCard();

  setupEvents();
  animate();
}

// Genera dinamicamente la texture ad alta risoluzione del Santino con cornice dorata sempre uguale
function createSantinoTexture(santo) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  // Sfondo pergamena calda
  ctx.fillStyle = '#fdf8eb';
  ctx.fillRect(0, 0, 512, 768);

  // Cornice dorata esterna (uguale per tutti i santini)
  const gradGold = ctx.createLinearGradient(0, 0, 512, 768);
  gradGold.addColorStop(0, '#b45309');
  gradGold.addColorStop(0.25, '#fbbf24');
  gradGold.addColorStop(0.5, '#fef08a');
  gradGold.addColorStop(0.75, '#d97706');
  gradGold.addColorStop(1, '#78350f');

  ctx.lineWidth = 28;
  ctx.strokeStyle = gradGold;
  ctx.strokeRect(14, 14, 484, 740);

  // Filigrana interna
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#92400e';
  ctx.strokeRect(36, 36, 440, 696);

  // Angoli decorativi dorati
  const corners = [[42,42], [470,42], [42,726], [470,726]];
  ctx.fillStyle = '#d97706';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
  });

  // Riquadro centrale immagine random del santo
  const imgX = 64, imgY = 68, imgW = 384, imgH = 380;
  const bgGrad = ctx.createRadialGradient(256, 258, 30, 256, 258, 240);
  bgGrad.addColorStop(0, santo.grafica.coloreSecondario);
  bgGrad.addColorStop(1, santo.grafica.colorePrimario);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(imgX, imgY, imgW, imgH);

  // Aureola luminosa dietro l'icona
  ctx.beginPath();
  ctx.arc(256, 255, 115, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  // Icona centrale
  ctx.font = '150px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(santo.grafica.icona, 256, 262);

  // Cornice interna dell'illustrazione
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#b45309';
  ctx.strokeRect(imgX, imgY, imgW, imgH);

  // Nome del Santo
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 34px Georgia, serif';
  wrapText(ctx, santo.nome, 256, 495, 400, 38);

  // Titolo liturgico
  ctx.fillStyle = '#b45309';
  ctx.font = 'italic 22px Georgia, serif';
  wrapText(ctx, santo.titolo, 256, 575, 400, 26);

  // Linea divisoria
  ctx.beginPath();
  ctx.moveTo(120, 615);
  ctx.lineTo(392, 615);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Breve descrizione
  ctx.fillStyle = '#475569';
  ctx.font = '19px Georgia, serif';
  wrapText(ctx, santo.bio, 256, 650, 390, 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
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

function spawnNextCard() {
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

  const frontTex = createSantinoTexture(santo);
  const geometry = new THREE.BoxGeometry(1.5, 2.25, 0.02);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.35 });
  const backMat = new THREE.MeshStandardMaterial({ map: sharedBackTexture, roughness: 0.4 });

  const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
  const card = new THREE.Mesh(geometry, materials);

  card.position.copy(cardRestPos);
  card.rotation.set(-0.25, 0, 0);
  scene.add(card);
  currentCardMesh = card;
}

function updateUI() {
  const remaining = Math.max(0, deck.length - currentIndex);
  document.getElementById('card-counter').textContent = `${remaining} / ${deck.length}`;
}

// Costruzione dei 4 scenari 3D (Montagna, Grattacielo, Scogliera, Piazza San Pietro)
function buildEnvironment(envType) {
  while (environmentGroup.children.length > 0) {
    environmentGroup.remove(environmentGroup.children[0]);
  }

  if (envType === 'montagna') {
    scene.background = new THREE.Color(0x60a5fa);
    scene.fog = new THREE.FogExp2(0x93c5fd, 0.01);

    // Piattaforma rocciosa in primo piano (cima)
    const peakGeo = new THREE.ConeGeometry(4, 5, 7);
    const peakMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
    const peak = new THREE.Mesh(peakGeo, peakMat);
    peak.position.set(0, -3.5, 3);
    environmentGroup.add(peak);

    // Catena montuosa in lontananza
    for (let i = 0; i < 18; i++) {
      const h = 12 + Math.random() * 22;
      const r = 8 + Math.random() * 10;
      const mGeo = new THREE.ConeGeometry(r, h, 6);
      const mMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x475569 : 0xe2e8f0,
        flatShading: true
      });
      const m = new THREE.Mesh(mGeo, mMat);
      m.position.set((Math.random() - 0.5) * 90, -10 + h / 2 - 8, -25 - Math.random() * 60);
      environmentGroup.add(m);
    }

    // Nuvole basse sotto la cima
    addClouds(-4, 15);
  }
  else if (envType === 'grattacielo') {
    scene.background = new THREE.Color(0xf97316); // Tramonto metropolitano
    scene.fog = new THREE.FogExp2(0xfdba74, 0.012);

    // Parapetto del tetto
    const roofGeo = new THREE.BoxGeometry(8, 2, 5);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, -2.2, 3.5);
    environmentGroup.add(roof);

    // Grattacieli sottostanti
    for (let i = 0; i < 35; i++) {
      const w = 3 + Math.random() * 4;
      const d = 3 + Math.random() * 4;
      const h = 15 + Math.random() * 35;
      const bGeo = new THREE.BoxGeometry(w, h, d);
      const bMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x1e293b : 0x0f172a
      });
      const b = new THREE.Mesh(bGeo, bMat);
      b.position.set((Math.random() - 0.5) * 75, -35 + h / 2, -12 - Math.random() * 65);
      environmentGroup.add(b);
    }
  }
  else if (envType === 'scogliera') {
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.01);

    // Bordo scogliera
    const cliffGeo = new THREE.BoxGeometry(7, 8, 5);
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x78716c, flatShading: true });
    const cliff = new THREE.Mesh(cliffGeo, cliffMat);
    cliff.position.set(0, -5.2, 3.5);
    environmentGroup.add(cliff);

    // Mare infinito sottostante
    const seaGeo = new THREE.PlaneGeometry(300, 300);
    const seaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -14, -50);
    environmentGroup.add(sea);

    // Faraglioni
    for (let i = 0; i < 6; i++) {
      const rockGeo = new THREE.ConeGeometry(2.5, 10, 5);
      const rock = new THREE.Mesh(rockGeo, cliffMat);
      rock.position.set((Math.random() - 0.5) * 50, -11, -25 - Math.random() * 40);
      environmentGroup.add(rock);
    }
  }
  else if (envType === 'sanpietro') {
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.FogExp2(0xe0f2fe, 0.008);

    // Balconata / Terrazzo della Basilica
    const terraceGeo = new THREE.BoxGeometry(9, 2, 4);
    const travertinoMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7 });
    const terrace = new THREE.Mesh(terraceGeo, travertinoMat);
    terrace.position.set(0, -2.2, 3.8);
    environmentGroup.add(terrace);

    // Pavimentazione Piazza San Pietro in basso
    const piazzaGeo = new THREE.CircleGeometry(45, 32);
    const piazzaMat = new THREE.MeshStandardMaterial({ color: 0x57534e });
    const piazza = new THREE.Mesh(piazzaGeo, piazzaMat);
    piazza.rotation.x = -Math.PI / 2;
    piazza.position.set(0, -12, -35);
    environmentGroup.add(piazza);

    // Obelisco Vaticano al centro della piazza
    const obeliskGeo = new THREE.CylinderGeometry(0.4, 0.8, 9, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1 });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.set(0, -7.5, -35);
    environmentGroup.add(obelisk);

    // Colonnato del Bernini (semicerchi di colonne)
    const colGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 8);
    for (let angle = -1.2; angle <= 1.2; angle += 0.15) {
      if (Math.abs(angle) < 0.25) continue; // Apertura centrale
      const x = Math.sin(angle) * 28;
      const z = -35 + Math.cos(angle) * 24;
      const col = new THREE.Mesh(colGeo, travertinoMat);
      col.position.set(x, -9, z);
      environmentGroup.add(col);
    }
  }
}

function addClouds(yLevel, count) {
  const cloudGeo = new THREE.DodecahedronGeometry(3, 1);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < count; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.scale.set(2 + Math.random() * 2, 0.6, 1.5);
    cloud.position.set((Math.random() - 0.5) * 70, yLevel + (Math.random() - 0.5) * 3, -15 - Math.random() * 50);
    environmentGroup.add(cloud);
  }
}

// Gestione Input Touch e Mouse per lancio tipo Frisbee
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
    // Inclinazione frisbee durante il trascinamento
    currentCardMesh.rotation.z = -dx * 1.2;
    currentCardMesh.rotation.x = -0.25 + dy * 1.2;
  };

  const onEnd = () => {
    if (!isDragging || !currentCardMesh) return;
    isDragging = false;

    const dt = Math.max(0.05, (performance.now() - dragStartPos.time) / 1000);
    const dy = dragStartPos.y - dragCurrentPos.y; // Positivo se scorre verso l'alto
    const dx = dragCurrentPos.x - dragStartPos.x;

    // Se lo swipe verso l'alto è sufficiente, lancia il santino!
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
      // Ritorna al centro se il lancio è troppo debole
      currentCardMesh.position.copy(cardRestPos);
      currentCardMesh.rotation.set(-0.25, 0, 0);
    }
  };

  dom.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  dom.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  dom.addEventListener('touchend', onEnd);

  dom.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onEnd);

  // Cambio ambiente
  document.querySelectorAll('.env-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.env-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentEnv = btn.dataset.env;
      buildEnvironment(currentEnv);
    });
  });

  // Reset mazzo
  document.getElementById('reset-btn').addEventListener('click', () => {
    currentIndex = 0;
    // Rimuove eventuali carte rimaste in volo
    flyingCards.forEach(fc => scene.remove(fc.mesh));
    flyingCards = [];
    spawnNextCard();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Fisica di volo e planata tipo Frisbee
function launchCardAsFrisbee(mesh, vx, forwardSpeed) {
  // Orienta il santino piatto come un frisbee
  mesh.rotation.x = -Math.PI / 2.2;

  flyingCards.push({
    mesh,
    velocity: new THREE.Vector3(vx, 3.8 + forwardSpeed * 0.18, -14 - forwardSpeed * 0.9),
    spinSpeed: (vx >= 0 ? -1 : 1) * (12 + Math.random() * 6), // Rotazione rapida sull'asse
    curveForce: -vx * 0.45, // Effetto aerodinamico curva frisbee
    age: 0
  });
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Lieve fluttuazione del santino in attesa
  if (currentCardMesh && !isDragging) {
    currentCardMesh.position.y = cardRestPos.y + Math.sin(now * 0.003) * 0.04;
    currentCardMesh.rotation.y = Math.sin(now * 0.002) * 0.06;
  }

  // Aggiornamento fisica santini lanciati tipo frisbee
  for (let i = flyingCards.length - 1; i >= 0; i--) {
    const fc = flyingCards[i];
    fc.age += dt;

    // Portanza aerodinamica (plana prima di scendere verso il basso)
    const lift = Math.max(-4.5, 2.5 - fc.age * 2.2);
    fc.velocity.y += lift * dt;
    fc.velocity.x += fc.curveForce * dt;

    // Attrito dell'aria
    fc.velocity.z *= (1 - 0.18 * dt);

    fc.mesh.position.addScaledVector(fc.velocity, dt);

    // Rotazione frisbee veloce sull'asse verticale locale + leggero rollio
    fc.mesh.rotation.z += fc.spinSpeed * dt;
    fc.mesh.rotation.y = Math.sin(fc.age * 3) * 0.25;

    // Rimuovi quando è volato molto lontano o caduto nell'abisso
    if (fc.mesh.position.z < -120 || fc.mesh.position.y < -25 || fc.age > 7) {
      scene.remove(fc.mesh);
      flyingCards.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
