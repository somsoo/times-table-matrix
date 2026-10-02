let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, type = 'sine', duration = 0.12) {
  if (!soundEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// State
let selectedRows = 4;
let selectedCols = 6;
let isRotated = false;
let isDragging = false;

const matrixGrid = document.getElementById('matrixGrid');
const expFormulaBadge = document.getElementById('expFormulaBadge');
const expFormulaDesc = document.getElementById('expFormulaDesc');
const btnRotate = document.getElementById('btnRotate');
const btnResetGrid = document.getElementById('btnResetGrid');
const btnSoundToggle = document.getElementById('btnSoundToggle');

btnSoundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  btnSoundToggle.textContent = soundEnabled ? '소리 켜짐' : '소리 꺼짐';
});

// Render Grid
function renderGrid() {
  matrixGrid.innerHTML = '';
  for (let r = 1; r <= 10; r++) {
    for (let c = 1; c <= 10; c++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      if (r <= selectedRows && c <= selectedCols) {
        cell.classList.add('selected');
      }
      matrixGrid.appendChild(cell);
    }
  }
  updateReadout();
}

function updateReadout() {
  const prod = selectedRows * selectedCols;
  expFormulaBadge.textContent = `${selectedRows}행 × ${selectedCols}열 = ${prod}칸`;
  expFormulaDesc.textContent = `${selectedRows}개씩 ${selectedCols}묶음은 ${prod}와 크기가 같습니다.`;
}

// Pointer Events for Grid
function handlePointerDown(e) {
  isDragging = true;
  updateSelectionFromEvent(e);
}
function handlePointerMove(e) {
  if (!isDragging) return;
  updateSelectionFromEvent(e);
}
function handlePointerUp() {
  isDragging = false;
}

function updateSelectionFromEvent(e) {
  const rect = matrixGrid.getBoundingClientRect();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  if (!clientX || !clientY) return;

  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

  const c = Math.max(1, Math.min(10, Math.ceil((x / rect.width) * 10)));
  const r = Math.max(1, Math.min(10, Math.ceil((y / rect.height) * 10)));

  if (r !== selectedRows || c !== selectedCols) {
    selectedRows = r;
    selectedCols = c;
    playTone(220 + (r * 30) + (c * 20), 'triangle', 0.08);
    highlightCells();
    updateReadout();
  }
}

function highlightCells() {
  const cells = matrixGrid.querySelectorAll('.matrix-cell');
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.r, 10);
    const c = parseInt(cell.dataset.c, 10);
    if (r <= selectedRows && c <= selectedCols) {
      cell.classList.add('selected');
    } else {
      cell.classList.remove('selected');
    }
  });
}

matrixGrid.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);

btnRotate.addEventListener('click', () => {
  const tmp = selectedRows;
  selectedRows = selectedCols;
  selectedCols = tmp;
  playTone(520, 'sine', 0.2);
  highlightCells();
  updateReadout();
});

btnResetGrid.addEventListener('click', () => {
  selectedRows = 1;
  selectedCols = 1;
  playTone(330, 'sine', 0.1);
  highlightCells();
  updateReadout();
});

// Tabs
const tabExplore = document.getElementById('tabExplore');
const tabArcade = document.getElementById('tabArcade');
const tabHeatmap = document.getElementById('tabHeatmap');
const panelExplore = document.getElementById('panelExplore');
const panelArcade = document.getElementById('panelArcade');
const panelHeatmap = document.getElementById('panelHeatmap');

function switchTab(activeTab, activePanel) {
  [tabExplore, tabArcade, tabHeatmap].forEach(t => t.classList.remove('active'));
  [panelExplore, panelArcade, panelHeatmap].forEach(p => p.classList.add('hidden'));
  activeTab.classList.add('active');
  activePanel.classList.remove('hidden');
}

tabExplore.addEventListener('click', () => switchTab(tabExplore, panelExplore));
tabArcade.addEventListener('click', () => switchTab(tabArcade, panelArcade));
tabHeatmap.addEventListener('click', () => {
  switchTab(tabHeatmap, panelHeatmap);
  renderHeatmap();
});

// Arcade Mode
let arcadeRunning = false;
let arcadeSec = 60;
let arcadeScoreVal = 0;
let arcadeComboVal = 0;
let currentQ = null;
let timerId = null;

const arcadeTimer = document.getElementById('arcadeTimer');
const arcadeScore = document.getElementById('arcadeScore');
const arcadeCombo = document.getElementById('arcadeCombo');
const arcadeQuestion = document.getElementById('arcadeQuestion');
const arcadeInput = document.getElementById('arcadeInput');
const btnArcadeSubmit = document.getElementById('btnArcadeSubmit');
const btnArcadeStart = document.getElementById('btnArcadeStart');

function nextArcadeQuestion() {
  const r = Math.floor(Math.random() * 8) + 2; // 2~9
  const c = Math.floor(Math.random() * 8) + 2; // 2~9
  currentQ = { r, c, ans: r * c, start: Date.now() };
  arcadeQuestion.textContent = `${r} × ${c} = ?`;
  arcadeInput.value = '';
  arcadeInput.focus();
}

btnArcadeStart.addEventListener('click', () => {
  initAudio();
  arcadeRunning = true;
  arcadeSec = 60;
  arcadeScoreVal = 0;
  arcadeComboVal = 0;
  arcadeScore.textContent = '0';
  arcadeCombo.textContent = '0x';
  btnArcadeStart.classList.add('hidden');
  arcadeInput.disabled = false;
  btnArcadeSubmit.disabled = false;
  nextArcadeQuestion();

  clearInterval(timerId);
  timerId = setInterval(() => {
    arcadeSec--;
    arcadeTimer.textContent = `${arcadeSec}s`;
    if (arcadeSec <= 0) {
      clearInterval(timerId);
      endArcade();
    }
  }, 1000);
});

function checkArcadeAnswer() {
  if (!arcadeRunning || !currentQ) return;
  const userAns = parseInt(arcadeInput.value.trim(), 10);
  const dur = Date.now() - currentQ.start;
  saveStat(currentQ.r, userAns === currentQ.ans, dur);

  if (userAns === currentQ.ans) {
    arcadeComboVal++;
    arcadeScoreVal += 10 * arcadeComboVal;
    arcadeSec += 2; // bonus
    playTone(660, 'sine', 0.15);
  } else {
    arcadeComboVal = 0;
    playTone(180, 'sawtooth', 0.2);
  }
  arcadeScore.textContent = arcadeScoreVal;
  arcadeCombo.textContent = `${arcadeComboVal}x`;
  nextArcadeQuestion();
}

function endArcade() {
  arcadeRunning = false;
  arcadeInput.disabled = true;
  btnArcadeSubmit.disabled = true;
  btnArcadeStart.classList.remove('hidden');
  btnArcadeStart.textContent = '다시 도전하기';
  arcadeQuestion.textContent = `게임 종료! 최종 점수: ${arcadeScoreVal}점`;
}

btnArcadeSubmit.addEventListener('click', checkArcadeAnswer);
arcadeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkArcadeAnswer();
});

// Numpad
document.querySelectorAll('#arcadeNumpad .num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!arcadeRunning) return;
    const val = btn.dataset.val;
    if (val === 'clear') {
      arcadeInput.value = '';
    } else if (val === 'back') {
      arcadeInput.value = arcadeInput.value.slice(0, -1);
    } else {
      arcadeInput.value += val;
    }
  });
});

// Stats & Heatmap
function getStats() {
  try {
    return JSON.parse(localStorage.getItem('ttm_stats') || '{}');
  } catch (e) {
    return {};
  }
}

function saveStat(table, isCorrect, ms) {
  const data = getStats();
  if (!data[table]) data[table] = { total: 0, wrong: 0, totalMs: 0 };
  data[table].total++;
  if (!isCorrect) data[table].wrong++;
  data[table].totalMs += ms;
  localStorage.setItem('ttm_stats', JSON.stringify(data));
}

function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = '';
  const data = getStats();
  for (let t = 2; t <= 9; t++) {
    const s = data[t] || { total: 0, wrong: 0, totalMs: 0 };
    const errRate = s.total > 0 ? (s.wrong / s.total) : 0;
    const avgSec = s.total > 0 ? (s.totalMs / s.total / 1000).toFixed(1) : '-';
    
    let bg = '#161b22';
    if (s.total > 0) {
      if (errRate > 0.3) bg = 'rgba(239, 68, 68, 0.3)';
      else if (errRate > 0.1) bg = 'rgba(245, 158, 11, 0.25)';
      else bg = 'rgba(16, 185, 129, 0.2)';
    }

    const card = document.createElement('div');
    card.className = 'heat-card';
    card.style.background = bg;
    card.innerHTML = `
      <div class="heat-table">${t}단</div>
      <div class="heat-stat">시도: ${s.total}회</div>
      <div class="heat-stat">오답: ${s.wrong}회</div>
      <div class="heat-stat">평균: ${avgSec}s</div>
    `;
    grid.appendChild(card);
  }
}

document.getElementById('btnResetStats').addEventListener('click', () => {
  localStorage.removeItem('ttm_stats');
  renderHeatmap();
});

renderGrid();
