// ============================================
// ALLEY RUN - Bull Running Game
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screens & UI
const startScreen = document.getElementById('start-screen');
const levelCompleteScreen = document.getElementById('level-complete-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const levelDisplay = document.getElementById('level-display');
const distanceDisplay = document.getElementById('distance-display');
const livesDisplay = document.getElementById('lives-display');
const levelCompleteText = document.getElementById('level-complete-text');
const levelScore = document.getElementById('level-score');
const gameOverText = document.getElementById('game-over-text');
const finalScore = document.getElementById('final-score');

// Buttons
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('retry-btn').addEventListener('click', retryLevel);
document.getElementById('menu-btn').addEventListener('click', showMenu);

// Game constants
const GRAVITY = 0.65;
const JUMP_FORCE = -13.5;
const GROUND_Y = 380;
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 58;
const BULL_WIDTH = 90;
const BULL_HEIGHT = 55;

// State
let gameState = 'menu';
let currentLevel = 1;
let maxLevels = 6;
let lives = 3;
let distance = 0;
let levelTarget = 1200;
let score = 0;
let totalScore = 0;
let keys = {};
let particles = [];
let obstacles = [];
let bulls = [];
let frame = 0;
let lastBullSpawn = 0;
let lastObstacleSpawn = 0;
let cameraX = 0;
let shake = 0;

// Player
const player = {
  x: 180,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  onGround: true,
  facing: 1,
  runFrame: 0,
  invincible: 0
};

// Level configurations
const levels = [
  { target: 1100, bullSpeed: 7.0, bullSpawnRate: 140, obstacleRate: 140, speed: 4.2, name: "Quiet Alley" },
  { target: 1400, bullSpeed: 8.0, bullSpawnRate: 120, obstacleRate: 120, speed: 4.8, name: "Busy Street" },
  { target: 1700, bullSpeed: 9.0, bullSpawnRate: 120, obstacleRate: 100, speed: 5.4, name: "Festival Path" },
  { target: 2000, bullSpeed: 8.5, bullSpawnRate: 100, obstacleRate: 90,  speed: 6.0, name: "Narrow Passage" },
  { target: 2400, bullSpeed: 9.5, bullSpawnRate: 85,  obstacleRate: 75,  speed: 6.6, name: "Bulls Everywhere" },
  { target: 2800, bullSpeed: 11,  bullSpawnRate: 70,  obstacleRate: 60,  speed: 7.2, name: "Final Charge" }
];

// Input
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  if ((e.code === 'Space' || e.code === 'ArrowUp') && gameState === 'playing' && player.onGround) {
    jump();
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// Touch support
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  if (gameState === 'playing' && player.onGround) jump();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (gameState !== 'playing') return;
  const dx = e.touches[0].clientX - touchStartX;
  if (Math.abs(dx) > 30) {
    player.x += dx > 0 ? 8 : -8;
    touchStartX = e.touches[0].clientX;
  }
}, { passive: false });

function jump() {
  if (player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    spawnDust(player.x + player.width / 2, GROUND_Y + 10, 6);
  }
}

function startGame() {
  currentLevel = 1;
  lives = 3;
  totalScore = 0;
  resetLevel();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  levelCompleteScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  gameState = 'playing';
  requestAnimationFrame(gameLoop);
}

function resetLevel() {
  const lvl = levels[currentLevel - 1];
  levelTarget = lvl.target;
  distance = 0;
  score = 0;
  player.x = 180;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.invincible = 60;
  bulls = [];
  obstacles = [];
  particles = [];
  cameraX = 0;
  lastBullSpawn = 0;
  lastObstacleSpawn = 0;
  frame = 0;
  shake = 0;
  updateHUD();
}

function nextLevel() {
  currentLevel++;
  if (currentLevel > maxLevels) {
    gameOverText.textContent = "You conquered all the alleys!";
    finalScore.textContent = `Total Score: ${totalScore}`;
    levelCompleteScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameState = 'gameOver';
    return;
  }
  levelCompleteScreen.classList.add('hidden');
  resetLevel();
  gameState = 'playing';
  requestAnimationFrame(gameLoop);
}

function retryLevel() {
  lives = 3;
  totalScore = Math.max(0, totalScore - score);
  gameOverScreen.classList.add('hidden');
  resetLevel();
  gameState = 'playing';
  requestAnimationFrame(gameLoop);
}

function showMenu() {
  gameOverScreen.classList.add('hidden');
  levelCompleteScreen.classList.add('hidden');
  hud.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameState = 'menu';
}

function updateHUD() {
  const lvl = levels[currentLevel - 1];
  levelDisplay.textContent = `Alley ${currentLevel}: ${lvl.name}`;
  distanceDisplay.textContent = `${Math.floor(distance)} / ${levelTarget} m`;
  livesDisplay.textContent = '♥ '.repeat(lives).trim() || '—';
}

function spawnBull() {
  const lvl = levels[currentLevel - 1];
  const yOffset = (Math.random() - 0.5) * 40;
  bulls.push({
    x: cameraX - 30 - Math.random() * 40,
    y: GROUND_Y + yOffset,
    width: BULL_WIDTH,
    height: BULL_HEIGHT,
    speed: lvl.bullSpeed + Math.random() * 1.5,
    frame: 0
  });
}

function spawnObstacle() {
  const types = ['barrel', 'crate', 'fence'];
  const type = types[Math.floor(Math.random() * types.length)];
  const h = type === 'fence' ? 38 : type === 'crate' ? 42 : 36;
  obstacles.push({
    x: cameraX + canvas.width + 50,
    y: GROUND_Y - h + 8,
    width: type === 'fence' ? 55 : 40,
    height: h,
    type
  });
}

function spawnDust(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 20 + Math.random() * 15,
      maxLife: 35,
      size: 2 + Math.random() * 3,
      color: `rgba(180, 140, 90, ${0.6 + Math.random() * 0.3})`
    });
  }
}

function spawnHitParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      life: 25 + Math.random() * 20,
      maxLife: 45,
      size: 3 + Math.random() * 4,
      color: Math.random() > 0.5 ? '#c0392b' : '#e74c3c'
    });
  }
}

function rectsCollide(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function update() {
  if (gameState !== 'playing') return;

  frame++;
  const lvl = levels[currentLevel - 1];

  // Player movement
  let move = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) move = -1;
  if (keys['ArrowRight'] || keys['KeyD']) move = 1;

  player.vx = move * 5.5;
  player.x += player.vx;

  const minX = cameraX + 60;
  const maxX = cameraX + canvas.width - 140;
  if (player.x < minX) player.x = minX;
  if (player.x > maxX) player.x = maxX;

  // Jump physics
  player.vy += GRAVITY;
  player.y += player.vy;

  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    if (!player.onGround) {
      spawnDust(player.x + player.width / 2, GROUND_Y + 8, 4);
    }
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  // Auto-run
  const runSpeed = lvl.speed;
  distance += runSpeed * 0.35;
  cameraX += runSpeed;

  if (player.onGround) {
    player.runFrame += 0.35;
  }

  if (player.invincible > 0) player.invincible--;

  // Spawn
  if (frame - lastBullSpawn > lvl.bullSpawnRate) {
    spawnBull();
    lastBullSpawn = frame;
  }
  if (frame - lastObstacleSpawn > lvl.obstacleRate) {
    spawnObstacle();
    lastObstacleSpawn = frame;
  }

  // Update bulls
  for (let i = bulls.length - 1; i >= 0; i--) {
    const b = bulls[i];
    b.x += b.speed;
    b.frame += 0.25;

    if (b.x > cameraX + canvas.width + 100) {
      bulls.splice(i, 1);
      continue;
    }

    if (player.invincible <= 0 && rectsCollide(
      { x: player.x + 6, y: player.y + 10, width: player.width - 12, height: player.height - 14 },
      { x: b.x + 10, y: b.y + 5, width: b.width - 20, height: b.height - 10 }
    )) {
      hitPlayer();
      bulls.splice(i, 1);
    }
  }

  // Update obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];

    if (o.x + o.width < cameraX - 50) {
      obstacles.splice(i, 1);
      continue;
    }

    if (player.invincible <= 0 && player.onGround && rectsCollide(
      { x: player.x + 4, y: player.y + 8, width: player.width - 8, height: player.height - 10 },
      o
    )) {
      hitPlayer();
      obstacles.splice(i, 1);
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (shake > 0) shake *= 0.9;
  if (shake < 0.5) shake = 0;

  if (distance >= levelTarget) {
    levelComplete();
  }

  updateHUD();
}

function hitPlayer() {
  lives--;
  shake = 12;
  spawnHitParticles(player.x + player.width / 2, player.y + player.height / 2);
  player.invincible = 90;

  if (lives <= 0) {
    gameOver();
  }
}

function levelComplete() {
  gameState = 'levelComplete';
  score = Math.floor(distance) + lives * 150 + currentLevel * 100;
  totalScore += score;
  levelCompleteText.textContent = `Alley ${currentLevel} Complete – ${levels[currentLevel - 1].name}`;
  levelScore.textContent = `Score this alley: ${score}  •  Total: ${totalScore}`;
  levelCompleteScreen.classList.remove('hidden');
}

function gameOver() {
  gameState = 'gameOver';
  totalScore += Math.floor(distance);
  gameOverText.textContent = lives <= 0 ? "The bull caught you!" : "Run ended";
  finalScore.textContent = `Distance: ${Math.floor(distance)} m  •  Total Score: ${totalScore}`;
  gameOverScreen.classList.remove('hidden');
}

// Drawing helpers
function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5c3d2e');
  grad.addColorStop(0.55, '#3d2b1f');
  grad.addColorStop(1, '#2a1f14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2a1a10';
  for (let i = 0; i < 12; i++) {
    const bx = ((i * 180) - (cameraX * 0.3) % 180);
    const bh = 80 + (i % 3) * 30;
    ctx.fillRect(bx, GROUND_Y - bh - 40, 140, bh + 40);
  }

  ctx.fillStyle = '#4a3222';
  ctx.fillRect(0, 0, 30, canvas.height);
  ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);

  ctx.fillStyle = '#5c4030';
  ctx.fillRect(0, GROUND_Y + 20, canvas.width, canvas.height - GROUND_Y);

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  const offset = cameraX % 40;
  for (let x = -offset; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 20);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = GROUND_Y + 40; y < canvas.height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#6b4c35';
  ctx.fillRect(0, GROUND_Y + 18, canvas.width, 6);
}

function drawPlayer() {
  const px = player.x - cameraX;
  const py = player.y;

  ctx.save();
  if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + player.width / 2, GROUND_Y + 22, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#2c5aa0';
  drawRoundedRect(px + 8, py + 18, 20, 28, 4);
  ctx.fill();

  // Head
  ctx.fillStyle = '#e8c4a0';
  ctx.beginPath();
  ctx.arc(px + player.width / 2, py + 12, 11, 0, Math.PI * 2);
  ctx.fill();

  // Cap
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(px + player.width / 2, py + 8, 11, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(px + 6, py + 6, 24, 5);

  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(px + 14, py + 11, 2, 0, Math.PI * 2);
  ctx.arc(px + 22, py + 11, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  const legSwing = Math.sin(player.runFrame) * 10;
  ctx.strokeStyle = '#1a3a6e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(px + 14, py + 44);
  ctx.lineTo(px + 10 - legSwing, py + 58);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(px + 22, py + 44);
  ctx.lineTo(px + 26 + legSwing, py + 58);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = '#e8c4a0';
  ctx.lineWidth = 4;
  const armSwing = Math.sin(player.runFrame + Math.PI) * 8;
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 24);
  ctx.lineTo(px + 2 - armSwing, py + 36);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + 26, py + 24);
  ctx.lineTo(px + 34 + armSwing, py + 36);
  ctx.stroke();

  ctx.restore();
}

function drawBull(b) {
  const bx = b.x - cameraX;
  const by = b.y;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bx + b.width / 2, GROUND_Y + 24, 38, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#2c1810';
  ctx.beginPath();
  ctx.ellipse(bx + 45, by + 28, 42, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#1a0f0a';
  ctx.beginPath();
  ctx.ellipse(bx + 78, by + 22, 22, 18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.strokeStyle = '#d4c4a8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + 85, by + 10);
  ctx.quadraticCurveTo(bx + 95, by - 12, bx + 105, by + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 78, by + 8);
  ctx.quadraticCurveTo(bx + 70, by - 14, bx + 58, by + 0);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(bx + 86, by + 18, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(bx + 96, by + 26, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  const legPhase = Math.sin(b.frame) * 8;
  ctx.strokeStyle = '#1a0f0a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(bx + 65, by + 42);
  ctx.lineTo(bx + 70 + legPhase, by + 58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 55, by + 42);
  ctx.lineTo(bx + 50 - legPhase, by + 58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 25, by + 42);
  ctx.lineTo(bx + 20 - legPhase, by + 58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 35, by + 42);
  ctx.lineTo(bx + 40 + legPhase, by + 58);
  ctx.stroke();

  if (Math.random() > 0.6) {
    spawnDust(b.x + 10, GROUND_Y + 15, 1);
  }
}

function drawObstacle(o) {
  const ox = o.x - cameraX;
  const oy = o.y;

  if (o.type === 'barrel') {
    ctx.fillStyle = '#8b5a2b';
    drawRoundedRect(ox, oy, o.width, o.height, 6);
    ctx.fill();
    ctx.strokeStyle = '#5c3a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3d2a14';
    ctx.fillRect(ox + 2, oy + 8, o.width - 4, 4);
    ctx.fillRect(ox + 2, oy + 22, o.width - 4, 4);
  } else if (o.type === 'crate') {
    ctx.fillStyle = '#a67c52';
    ctx.fillRect(ox, oy, o.width, o.height);
    ctx.strokeStyle = '#5c4030';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, o.width, o.height);
    ctx.beginPath();
    ctx.moveTo(ox + 6, oy + 6);
    ctx.lineTo(ox + o.width - 6, oy + o.height - 6);
    ctx.moveTo(ox + o.width - 6, oy + 6);
    ctx.lineTo(ox + 6, oy + o.height - 6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#6b5344';
    ctx.fillRect(ox, oy + 10, o.width, 12);
    ctx.fillRect(ox + 8, oy, 8, o.height);
    ctx.fillRect(ox + 38, oy, 8, o.height);
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(ox, oy + 8, o.width, 4);
  }
}

function drawFinishLine() {
  const remaining = levelTarget - distance;
  if (remaining < 350) {
    const fx = canvas.width - 80 - (remaining * 1.8);
    ctx.fillStyle = 'rgba(232, 197, 71, 0.9)';
    ctx.fillRect(fx, 60, 8, GROUND_Y - 40);
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(fx + 8, 60);
    ctx.lineTo(fx + 50, 80);
    ctx.lineTo(fx + 8, 100);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8c547';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('FINISH', fx + 12, 85);
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  drawBackground();
  drawFinishLine();
  obstacles.forEach(drawObstacle);
  bulls.forEach(drawBull);
  drawPlayer();
  drawParticles();

  // Vignette
  const vig = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 200,
    canvas.width / 2, canvas.height / 2, 500
  );
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.restore();
}

function gameLoop() {
  if (gameState === 'playing') {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  } else if (gameState === 'levelComplete' || gameState === 'gameOver') {
    draw();
  }
}

// Initial background
drawBackground();
ctx.fillStyle = 'rgba(0,0,0,0.4)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
