/*
  AA Master Mind
  - Modes: SOLO, TWO PLAYERS, MATCH CODE
  - Deterministic match generation: FNV-1a + mulberry32
  - Feedback calculation supports duplicates correctly
*/

const TOTAL_ROWS = 6;
const CODE_LENGTH = 4;

const MODES = {
  SOLO: "solo",
  TWO_PLAYERS: "twoPlayers",
  MATCH_CODE: "matchCode",
  DAILY: "daily",
  DAILY_PRACTICE: "dailyPractice"
};

const COLORS = [
  { key: "red", hex: "#c86e68" },
  { key: "blue", hex: "#7697c3" },
  { key: "green", hex: "#7ea97e" },
  { key: "yellow", hex: "#ceb673" },
  { key: "purple", hex: "#9f86ba" },
  { key: "orange", hex: "#c89a6e" }
];

const COLOR_INDEX_BY_KEY = Object.fromEntries(COLORS.map((color, index) => [color.key, index]));
const STORAGE_KEY = "aaMasterMindStatsByMode";
const STATS_UI_KEY = "aaMasterMindStatsExpanded";
const SFX_KEY = "aaMasterMindSfxEnabled";
const DAILY_LOCK_KEY = "aaMasterMindDailyLock";
const DEVICE_ID_KEY = "aaMasterMindDeviceId";
const NICKNAME_KEY = "aaMasterMindNickname";
const LIFETIME_KEY = "aaMasterMindLifetimeStats";

const firebaseConfig = {
  apiKey: "AIzaSyAxVbM7yL0ca2bsSDmhXwe1PB7vT4W5qYg",
  authDomain: "aa-mastermind.firebaseapp.com",
  projectId: "aa-mastermind",
  storageBucket: "aa-mastermind.firebasestorage.app",
  messagingSenderId: "489282566191",
  appId: "1:489282566191:web:b3a1d4745c601ec34baeda",
  measurementId: "G-2FT4Q2PZWK"
};

window.addEventListener("DOMContentLoaded", async () => {
  const [{ initializeApp }, { getFirestore, doc, setDoc, getDocs, collection, query, where, orderBy, limit }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js")
  ]);

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp);

const TIMER_KEYS = {
  runStartMs: "runStartMs",
  elapsedMs: "elapsedMs",
  isRunning: "isRunning",
  currentMode: "currentMode"
};

const EMPTY_STATS = { played: 0, wins: 0, bestScore: null, bestTimeMs: null };

const el = {
  subtitle: document.getElementById("subtitle"),
  timerReadout: document.getElementById("timer-readout"),
  startScreen: document.getElementById("start-screen"),
  howToScreen: document.getElementById("howto-screen"),
  twoPlayerSet: document.getElementById("two-player-set-screen"),
  twoPlayerPass: document.getElementById("two-player-pass-screen"),
  matchChoice: document.getElementById("match-choice-screen"),
  matchCreate: document.getElementById("match-create-screen"),
  matchJoin: document.getElementById("match-join-screen"),
  gameScreen: document.getElementById("game-screen"),
  rows: document.getElementById("rows"),
  secretPanel: document.getElementById("secret-panel"),
  palette: document.getElementById("palette"),
  setupRow: document.getElementById("setup-row"),
  setupPalette: document.getElementById("setup-palette"),
  submitBtn: document.getElementById("submit-btn"),
  undoBtn: document.getElementById("undo-btn"),
  clearBtn: document.getElementById("clear-btn"),
  setupClearBtn: document.getElementById("setup-clear-btn"),
  setupConfirmBtn: document.getElementById("setup-confirm-btn"),
  soloModeBtn: document.getElementById("solo-mode-btn"),
  twoPlayerModeBtn: document.getElementById("two-player-mode-btn"),
  dailyModeBtn: document.getElementById("daily-mode-btn"),
  leaderboardBtn: document.getElementById("leaderboard-btn"),
  matchModeBtn: document.getElementById("match-mode-btn"),
  howToBtn: document.getElementById("how-to-btn"),
  lifetimeBtn: document.getElementById("lifetime-btn"),
  lifetimeScreen: document.getElementById("lifetime-screen"),
  lifetimeResetBtn: document.getElementById("lifetime-reset-btn"),
  lifePlayed: document.getElementById("life-played"),
  lifeWins: document.getElementById("life-wins"),
  lifeRate: document.getElementById("life-rate"),
  lifeBestAttempts: document.getElementById("life-best-attempts"),
  lifeBestTime: document.getElementById("life-best-time"),
  lifeAvgAttempts: document.getElementById("life-avg-attempts"),
  lifeAvgTime: document.getElementById("life-avg-time"),
  dailyScreen: document.getElementById("daily-screen"),
  dailyNicknameInput: document.getElementById("daily-nickname-input"),
  dailyNicknameError: document.getElementById("daily-nickname-error"),
  dailyStartBtn: document.getElementById("daily-start-btn"),
  leaderboardScreen: document.getElementById("leaderboard-screen"),
  leaderboardDate: document.getElementById("leaderboard-date"),
  leaderboardRefreshBtn: document.getElementById("leaderboard-refresh-btn"),
  lbTodayBtn: document.getElementById("lb-today-btn"),
  lbYesterdayBtn: document.getElementById("lb-yesterday-btn"),
  leaderboardUpdated: document.getElementById("leaderboard-updated"),
  leaderboardYourRank: document.getElementById("leaderboard-your-rank"),
  leaderboardPodium: document.getElementById("leaderboard-podium"),
  leaderboardSkeleton: document.getElementById("leaderboard-skeleton"),
  leaderboardStatus: document.getElementById("leaderboard-status"),
  leaderboardList: document.getElementById("leaderboard-list"),
  dailyLockedScreen: document.getElementById("daily-locked-screen"),
  dailyLockedSummary: document.getElementById("daily-locked-summary"),
  dailyPracticeBtn: document.getElementById("daily-practice-btn"),
  dailyLockedPracticeBtn: document.getElementById("daily-locked-practice-btn"),
  startGuessingBtn: document.getElementById("start-guessing-btn"),
  createMatchBtn: document.getElementById("create-match-btn"),
  joinMatchBtn: document.getElementById("join-match-btn"),
  generatedMatchCode: document.getElementById("generated-match-code"),
  copyMatchCodeBtn: document.getElementById("copy-match-code-btn"),
  shareMatchCodeBtn: document.getElementById("share-match-code-btn"),
  startCreatedMatchBtn: document.getElementById("start-created-match-btn"),
  startJoinedMatchBtn: document.getElementById("start-joined-match-btn"),
  joinInput: document.getElementById("join-match-input"),
  joinError: document.getElementById("join-error"),
  sfxToggle: document.getElementById("sfx-toggle"),
  statsToggle: document.getElementById("stats-toggle"),
  statsBody: document.getElementById("stats-body"),
  statsMode: document.getElementById("stats-mode"),
  statsPlayed: document.getElementById("stats-played"),
  statsWins: document.getElementById("stats-wins"),
  statsBest: document.getElementById("stats-best"),
  statsBestTime: document.getElementById("stats-best-time"),
  modal: document.getElementById("result-modal"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  resultTime: document.getElementById("result-time"),
  resultMatchCode: document.getElementById("result-match-code"),
  revealedCode: document.getElementById("revealed-code"),
  copyResultCodeBtn: document.getElementById("copy-result-code-btn"),
  shareBtn: document.getElementById("share-btn"),
  shareFallback: document.getElementById("share-fallback"),
  shareFallbackText: document.getElementById("share-fallback-text"),
  viewLeaderboardBtn: document.getElementById("view-leaderboard-btn"),
  newGameBtn: document.getElementById("new-game-btn"),
  newMatchCodeBtn: document.getElementById("new-match-code-btn"),
  backButtons: document.querySelectorAll("[data-back-home]")
};

const CRITICAL_ELEMENT_KEYS = [
  "subtitle",
  "startScreen",
  "rows",
  "palette",
  "submitBtn",
  "soloModeBtn",
  "dailyModeBtn",
  "twoPlayerModeBtn",
  "matchModeBtn",
  "howToBtn"
];

const missingCritical = CRITICAL_ELEMENT_KEYS.filter((key) => !el[key]);
if (missingCritical.length > 0) {
  const message = `UI init error: missing elements (${missingCritical.join(", ")})`;
  console.error(message);
  if (el.subtitle) {
    el.subtitle.textContent = "UI init error";
  }
  return;
}

let state = {
  mode: null,
  secretCode: [],
  setupCode: [],
  guesses: Array.from({ length: TOTAL_ROWS }, () => []),
  feedback: Array.from({ length: TOTAL_ROWS }, () => []),
  currentRow: 0,
  gameOver: false,
  matchCode: "",
  winnerText: "",
  statsByMode: loadStats(),
  statsExpanded: localStorage.getItem(STATS_UI_KEY) === "true",
  timer: loadTimerState(),
  timerFrame: null,
  sfxEnabled: localStorage.getItem(SFX_KEY) !== "false",
  audioCtx: null,
  audioUnlocked: false,
  userPausedAutoScroll: false,
  autoScrollPauseTimer: null,
  isDailyOfficial: false,
  currentDailyDateUTC: "",
  lastResultTimeMs: 0,
  deviceId: "",
  nickname: "",
  leaderboardDateOffsetDays: 0
};

function getColorIndex(colorKey) {
  const index = COLOR_INDEX_BY_KEY[colorKey];
  return Number.isInteger(index) ? index : null;
}

function modeLabel(mode) {
  if (mode === MODES.SOLO) return "Solo";
  if (mode === MODES.TWO_PLAYERS) return "Two Players";
  if (mode === MODES.MATCH_CODE) return "Match Code";
  if (mode === MODES.DAILY) return "Daily";
  if (mode === MODES.DAILY_PRACTICE) return "Daily Practice";
  return "--";
}

function loadStats() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      [MODES.SOLO]: { ...EMPTY_STATS },
      [MODES.TWO_PLAYERS]: { ...EMPTY_STATS },
      [MODES.MATCH_CODE]: { ...EMPTY_STATS }
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      [MODES.SOLO]: sanitizeStats(parsed[MODES.SOLO]),
      [MODES.TWO_PLAYERS]: sanitizeStats(parsed[MODES.TWO_PLAYERS]),
      [MODES.MATCH_CODE]: sanitizeStats(parsed[MODES.MATCH_CODE])
    };
  } catch {
    return {
      [MODES.SOLO]: { ...EMPTY_STATS },
      [MODES.TWO_PLAYERS]: { ...EMPTY_STATS },
      [MODES.MATCH_CODE]: { ...EMPTY_STATS }
    };
  }
}

function sanitizeStats(value) {
  return {
    played: Number(value?.played) || 0,
    wins: Number(value?.wins) || 0,
    bestScore: Number(value?.bestScore) || null,
    bestTimeMs: Number(value?.bestTimeMs) || null
  };
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.statsByMode));
}

function updateStats(mode, won, attempts, finalTimeMs) {
  const stats = state.statsByMode[mode];
  stats.played += 1;
  if (won) {
    stats.wins += 1;
    if (!stats.bestScore || attempts < stats.bestScore) {
      stats.bestScore = attempts;
    }
    if (Number.isFinite(finalTimeMs) && finalTimeMs > 0 && (!stats.bestTimeMs || finalTimeMs < stats.bestTimeMs)) {
      stats.bestTimeMs = finalTimeMs;
    }
  }
  saveStats();
}

function renderStatsPanel() {
  const mode = state.mode;
  const stats = mode ? (state.statsByMode[mode] || EMPTY_STATS) : EMPTY_STATS;
  el.statsMode.textContent = `Mode: ${modeLabel(mode)}`;
  el.statsPlayed.textContent = `Played: ${stats.played}`;
  el.statsWins.textContent = `Wins: ${stats.wins}`;
  el.statsBest.textContent = `Best Score: ${stats.bestScore ?? "--"}`;
  el.statsBestTime.textContent = `Best Time: ${stats.bestTimeMs ? formatTime(stats.bestTimeMs) : "--"}`;
}

function setStatsExpanded(expanded, persist = false) {
  state.statsExpanded = expanded;
  el.statsBody.classList.toggle("hidden", !expanded);
  el.statsToggle.textContent = expanded ? "Stats ▴" : "Stats ▾";
  if (persist) {
    localStorage.setItem(STATS_UI_KEY, String(expanded));
  }
}

/* ---------- Timer ---------- */

function loadTimerState() {
  return {
    runStartMs: Number(localStorage.getItem(TIMER_KEYS.runStartMs)) || 0,
    elapsedMs: Number(localStorage.getItem(TIMER_KEYS.elapsedMs)) || 0,
    isRunning: localStorage.getItem(TIMER_KEYS.isRunning) === "true",
    currentMode: localStorage.getItem(TIMER_KEYS.currentMode) || ""
  };
}

function persistTimerState() {
  localStorage.setItem(TIMER_KEYS.runStartMs, String(state.timer.runStartMs));
  localStorage.setItem(TIMER_KEYS.elapsedMs, String(state.timer.elapsedMs));
  localStorage.setItem(TIMER_KEYS.isRunning, String(state.timer.isRunning));
  localStorage.setItem(TIMER_KEYS.currentMode, state.timer.currentMode || "");
}

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalTenths = Math.floor(safeMs / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function getElapsedMs() {
  if (!state.timer.isRunning) {
    return state.timer.elapsedMs;
  }
  return state.timer.elapsedMs + (Date.now() - state.timer.runStartMs);
}

function renderTimer() {
  el.timerReadout.textContent = `TIME ${formatTime(getElapsedMs())}`;
}

function tickLoop() {
  renderTimer();
  if (state.timer.isRunning) {
    state.timerFrame = requestAnimationFrame(tickLoop);
  }
}

function startTimer(mode) {
  if (state.timer.isRunning) {
    return;
  }
  state.timer.currentMode = mode || state.mode || "";
  state.timer.runStartMs = Date.now();
  state.timer.isRunning = true;
  persistTimerState();
  cancelAnimationFrame(state.timerFrame);
  state.timerFrame = requestAnimationFrame(tickLoop);
}

function stopTimer() {
  if (!state.timer.isRunning) {
    return state.timer.elapsedMs;
  }
  state.timer.elapsedMs = getElapsedMs();
  state.timer.isRunning = false;
  state.timer.runStartMs = 0;
  persistTimerState();
  cancelAnimationFrame(state.timerFrame);
  state.timerFrame = null;
  renderTimer();
  return state.timer.elapsedMs;
}

function resetTimer(mode = "") {
  state.timer = {
    runStartMs: 0,
    elapsedMs: 0,
    isRunning: false,
    currentMode: mode
  };
  persistTimerState();
  cancelAnimationFrame(state.timerFrame);
  state.timerFrame = null;
  renderTimer();
}

function maybeResumeTimer() {
  if (state.timer.isRunning) {
    cancelAnimationFrame(state.timerFrame);
    state.timerFrame = requestAnimationFrame(tickLoop);
  }
  renderTimer();
}

function confirmAbandonIfNeeded() {
  if (state.timer.isRunning || (!state.gameOver && state.mode)) {
    return window.confirm("Abandon run?");
  }
  return true;
}

/* ---------- SFX + Haptic ---------- */

function updateSfxToggleLabel() {
  if (el.sfxToggle) {
    el.sfxToggle.textContent = `SFX: ${state.sfxEnabled ? "ON" : "OFF"}`;
  }
}

function setSfxEnabled(enabled) {
  state.sfxEnabled = Boolean(enabled);
  localStorage.setItem(SFX_KEY, String(state.sfxEnabled));
  updateSfxToggleLabel();
}

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!state.audioCtx) {
    state.audioCtx = new AudioCtx();
  }
  return state.audioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const finalizeUnlock = () => {
    state.audioUnlocked = true;
    ["touchstart", "mousedown", "keydown"].forEach((evt) =>
      document.removeEventListener(evt, unlockAudio)
    );
  };

  if (ctx.state === "running") {
    finalizeUnlock();
    return;
  }

  ctx.resume().then(finalizeUnlock).catch(() => {
    // will retry on next user gesture
  });
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // no-op for unsupported environments
    }
  }
}

function playTone(freq, duration, type = "sine", gainValue = 0.05, when = 0) {
  if (!state.sfxEnabled || !state.audioUnlocked) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;

  osc.connect(gain);
  gain.connect(ctx.destination);

  const startAt = ctx.currentTime + when;
  osc.start(startAt);
  gain.gain.setValueAtTime(gainValue, startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.stop(startAt + duration);
}

function playSfx(type) {
  if (type === "place") {
    playTone(820, 0.04, "square", 0.035, 0);
  } else if (type === "submit") {
    playTone(640, 0.06, "triangle", 0.04, 0);
  } else if (type === "win") {
    playTone(523, 0.08, "triangle", 0.05, 0.00);
    playTone(659, 0.08, "triangle", 0.05, 0.09);
    playTone(784, 0.1, "triangle", 0.055, 0.18);
  } else if (type === "lose") {
    playTone(180, 0.18, "sawtooth", 0.05, 0);
  }
}

function clearAutoScrollPauseTimer() {
  if (state.autoScrollPauseTimer) {
    clearTimeout(state.autoScrollPauseTimer);
    state.autoScrollPauseTimer = null;
  }
}

function scrollRowsToTop() {
  if (!el.rows) return;
  clearAutoScrollPauseTimer();
  state.userPausedAutoScroll = false;
  el.rows.scrollTop = 0;
}

function scrollCurrentRowIntoView({ force = false } = {}) {
  if (!el.rows) return;
  if (!force && state.userPausedAutoScroll) return;

  const currentRowEl = el.rows.querySelector(".row.current") || el.rows.querySelectorAll(".row")[state.currentRow];
  if (!currentRowEl) return;

  currentRowEl.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest"
  });
}

function pauseAutoScrollTemporarily() {
  state.userPausedAutoScroll = true;
  clearAutoScrollPauseTimer();
  state.autoScrollPauseTimer = setTimeout(() => {
    state.userPausedAutoScroll = false;
    state.autoScrollPauseTimer = null;
  }, 2000);
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 10 && existing.length <= 40) {
    return existing;
  }
  const length = 20;
  let generated = "";
  while (generated.length < length) {
    generated += Math.random().toString(36).slice(2);
  }
  generated = generated.slice(0, length);
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function sanitizeNickname(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ").replace(/[^a-zA-Z0-9 _.-]/g, "").slice(0, 12);
}

function validateNickname(raw) {
  const clean = sanitizeNickname(raw);
  if (clean.length < 2 || clean.length > 12) {
    return { ok: false, clean, message: "Nickname must be 2-12 chars." };
  }
  return { ok: true, clean, message: "" };
}

function updateDailyNicknameUi() {
  const { ok, clean, message } = validateNickname(el.dailyNicknameInput.value);
  el.dailyNicknameError.textContent = message;
  el.dailyStartBtn.disabled = !ok;
  if (ok) {
    state.nickname = clean;
    localStorage.setItem(NICKNAME_KEY, clean);
  }
}

function dailyDocId(dateUTC, mode, deviceId) {
  return `${dateUTC}_${mode}_${deviceId}`;
}

async function uploadDailyScore({ dateUTC, nickname, deviceId, attempts, timeMs }) {
  const mode = "daily";
  const docId = dailyDocId(dateUTC, mode, deviceId);
  await setDoc(doc(db, "leaderboards", docId), {
    dateUTC,
    mode,
    nickname,
    deviceId,
    timeMs: Math.floor(timeMs),
    attempts,
    createdAt: Date.now()
  });
}

function renderLeaderboardRows(rows) {
  el.leaderboardList.innerHTML = "";
  renderPodium(rows);

  const yourIndex = rows.findIndex((row) => row.deviceId === state.deviceId);
  el.leaderboardYourRank.textContent = yourIndex >= 0 ? `Your rank: #${yourIndex + 1}` : "No entry yet today.";

  if (!rows.length) {
    el.leaderboardStatus.textContent = "No scores yet. Be the first today.";
    return;
  }

  el.leaderboardStatus.textContent = "";
  rows.forEach((row, index) => {
    const item = document.createElement("p");
    item.className = `leaderboard-row hint${row.deviceId === state.deviceId ? " you-row" : ""}`;
    item.style.animationDelay = `${Math.min(index, 10) * 22}ms`;
    item.textContent = `${index + 1}. ${row.nickname}${row.deviceId === state.deviceId ? " (YOU)" : ""}  ${row.attempts}/6  ${formatTime(row.timeMs)}`;
    el.leaderboardList.appendChild(item);
  });
}

async function loadLeaderboardForToday() {
  const dateUTC = getUTCDateStampWithOffset(state.leaderboardDateOffsetDays);
  el.leaderboardDate.textContent = `UTC Date: ${dateUTC}`;
  el.leaderboardStatus.textContent = "Loading leaderboard…";
  el.leaderboardSkeleton.classList.remove("hidden");
  el.leaderboardList.innerHTML = "";
  el.leaderboardPodium.innerHTML = "";
  el.leaderboardYourRank.textContent = "";
  try {
    const q = query(
      collection(db, "leaderboards"),
      where("dateUTC", "==", dateUTC),
      where("mode", "==", "daily"),
      orderBy("attempts", "asc"),
      orderBy("timeMs", "asc"),
      orderBy("createdAt", "asc"),
      limit(20)
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => {
      const v = d.data();
      return {
        nickname: v.nickname || "Player",
        deviceId: v.deviceId || "",
        attempts: Math.min(6, Math.max(1, Number(v.attempts) || 6)),
        timeMs: Math.max(0, Number(v.timeMs) || 0),
        createdAt: Math.max(0, Number(v.createdAt) || 0)
      };
    });
    rows.sort((a, b) => (a.attempts - b.attempts) || (a.timeMs - b.timeMs) || (a.createdAt - b.createdAt));
    renderLeaderboardRows(rows);
    el.leaderboardUpdated.textContent = `Updated: ${formatUtcClock()} UTC`;
  } catch {
    el.leaderboardStatus.textContent = "Leaderboard offline. Check connection and try Refresh.";
  } finally {
    el.leaderboardSkeleton.classList.add("hidden");
  }
}

function showLeaderboardScreen() {
  if (!confirmAbandonIfNeeded()) return;
  hideAllScreens();
  state.leaderboardDateOffsetDays = 0;
  el.lbTodayBtn.disabled = true;
  el.lbYesterdayBtn.disabled = false;
  el.leaderboardScreen.classList.remove("hidden");
  el.subtitle.textContent = "Daily leaderboard (UTC).";
  setStatsExpanded(false);
  loadLeaderboardForToday();
}

function showDailyScreen() {
  if (!confirmAbandonIfNeeded()) return;
  hideAllScreens();
  el.dailyScreen.classList.remove("hidden");
  const savedName = localStorage.getItem(NICKNAME_KEY) || "";
  el.dailyNicknameInput.value = savedName;
  el.dailyNicknameError.textContent = "";
  updateDailyNicknameUi();
  el.subtitle.textContent = "Enter nickname for official daily run.";
  setStatsExpanded(false);
}

function getUTCDateStampWithOffset(offsetDays = 0) {
  const now = new Date();
  const utcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
  return new Date(utcMs).toISOString().slice(0, 10);
}

function loadLifetimeStats() {
  try {
    const raw = localStorage.getItem(LIFETIME_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      playedTotal: Number(parsed.playedTotal) || 0,
      winsTotal: Number(parsed.winsTotal) || 0,
      bestTimeMs: Number.isFinite(parsed.bestTimeMs) ? parsed.bestTimeMs : null,
      bestAttempts: Number.isFinite(parsed.bestAttempts) ? parsed.bestAttempts : null,
      sumAttemptsWin: Number(parsed.sumAttemptsWin) || 0,
      sumTimeWinMs: Number(parsed.sumTimeWinMs) || 0
    };
  } catch {
    return { playedTotal: 0, winsTotal: 0, bestTimeMs: null, bestAttempts: null, sumAttemptsWin: 0, sumTimeWinMs: 0 };
  }
}

function saveLifetimeStats(stats) {
  localStorage.setItem(LIFETIME_KEY, JSON.stringify(stats));
}

function computeLifetimeView(stats) {
  const winRate = stats.playedTotal ? Math.round((stats.winsTotal / stats.playedTotal) * 100) : null;
  const avgAttemptsWin = stats.winsTotal ? (stats.sumAttemptsWin / stats.winsTotal) : null;
  const avgTimeWinMs = stats.winsTotal ? (stats.sumTimeWinMs / stats.winsTotal) : null;
  return { winRate, avgAttemptsWin, avgTimeWinMs };
}

function renderLifetimeStatsScreen() {
  const stats = loadLifetimeStats();
  const view = computeLifetimeView(stats);
  el.lifePlayed.textContent = `Played: ${stats.playedTotal}`;
  el.lifeWins.textContent = `Wins: ${stats.winsTotal}`;
  el.lifeRate.textContent = `Win Rate: ${view.winRate === null ? "--" : `${view.winRate}%`}`;
  el.lifeBestAttempts.textContent = `Best Attempts: ${stats.bestAttempts ?? "--"}`;
  el.lifeBestTime.textContent = `Best Time: ${stats.bestTimeMs ? formatTime(stats.bestTimeMs) : "--"}`;
  el.lifeAvgAttempts.textContent = `Avg Attempts (wins): ${view.avgAttemptsWin ? view.avgAttemptsWin.toFixed(2) : "--"}`;
  el.lifeAvgTime.textContent = `Avg Time (wins): ${view.avgTimeWinMs ? formatTime(view.avgTimeWinMs) : "--"}`;
}

function showLifetimeScreen() {
  if (!confirmAbandonIfNeeded()) return;
  hideAllScreens();
  el.lifetimeScreen.classList.remove("hidden");
  el.subtitle.textContent = "Lifetime stats (official modes + Daily official).";
  setStatsExpanded(false);
  renderLifetimeStatsScreen();
}

function updateLifetimeStatsOnFinish({ won, attempts, finalTimeMs }) {
  if (state.mode === MODES.DAILY_PRACTICE) return;
  const stats = loadLifetimeStats();
  stats.playedTotal += 1;
  if (won) {
    stats.winsTotal += 1;
    stats.sumAttemptsWin += attempts;
    stats.sumTimeWinMs += finalTimeMs;
    if (!stats.bestAttempts || attempts < stats.bestAttempts) {
      stats.bestAttempts = attempts;
    }
    if (!stats.bestTimeMs || finalTimeMs < stats.bestTimeMs) {
      stats.bestTimeMs = finalTimeMs;
    }
  }
  saveLifetimeStats(stats);
}

function renderPodium(entries) {
  el.leaderboardPodium.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉"];
  entries.slice(0, 3).forEach((row, idx) => {
    const card = document.createElement("article");
    card.className = "podium-card";
    card.style.animationDelay = `${idx * 40}ms`;
    card.innerHTML = `<p class="podium-rank">${medals[idx]} #${idx + 1}</p><p class="hint">${row.nickname}</p><p class="hint">${row.attempts}/6</p><p class="hint">${formatTime(row.timeMs)}</p>`;
    el.leaderboardPodium.appendChild(card);
  });
}

function formatUtcClock(date = new Date()) {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getUTCDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function getDailySecretCode(dateUTC = getUTCDateStamp()) {
  const seed = fnv1a32(`AA|DAILY|${dateUTC}`);
  const rand = mulberry32(seed);
  return Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(rand() * COLORS.length)].key);
}

function readDailyLock() {
  try {
    const raw = localStorage.getItem(DAILY_LOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getTodayDailyLock(dateUTC = getUTCDateStamp()) {
  const locks = readDailyLock();
  return locks[dateUTC] || null;
}

function saveDailyLock(payload, dateUTC = getUTCDateStamp()) {
  const locks = readDailyLock();
  locks[dateUTC] = payload;
  localStorage.setItem(DAILY_LOCK_KEY, JSON.stringify(locks));
}

function openDailyLockedScreen(lock, dateUTC = getUTCDateStamp()) {
  hideAllScreens();
  el.dailyLockedScreen.classList.remove("hidden");
  const result = lock.won ? `${lock.attempts}/6` : "FAIL";
  const timeLabel = Number.isFinite(lock.timeMs) ? formatTime(lock.timeMs) : "--:--.-";
  el.dailyLockedSummary.textContent = `Result: ${result} | Time: ${timeLabel} | ${dateUTC}`;
  el.subtitle.textContent = "Daily already played today.";
  setStatsExpanded(false);
}

function beginDailyMode({ practice = false } = {}) {
  const dateUTC = getUTCDateStamp();
  const lock = getTodayDailyLock(dateUTC);
  if (!practice && lock?.completed) {
    state.mode = MODES.DAILY;
    state.isDailyOfficial = true;
    state.currentDailyDateUTC = dateUTC;
    openDailyLockedScreen(lock, dateUTC);
    return;
  }

  if (!practice) {
    const { ok, clean, message } = validateNickname(el.dailyNicknameInput.value);
    if (!ok) {
      el.dailyNicknameError.textContent = message;
      el.dailyStartBtn.disabled = true;
      return;
    }
    state.nickname = clean;
    localStorage.setItem(NICKNAME_KEY, clean);
  }

  resetTimer(practice ? MODES.DAILY_PRACTICE : MODES.DAILY);
  state.mode = practice ? MODES.DAILY_PRACTICE : MODES.DAILY;
  state.isDailyOfficial = !practice;
  state.currentDailyDateUTC = dateUTC;
  state.secretCode = getDailySecretCode(dateUTC);
  prepareGuessBoard();
  el.subtitle.textContent = practice ? "Daily Practice: same code, no score lock." : `Daily: one official try (${dateUTC} UTC).`;
  setStatsExpanded(false);
}

function isDailyMode() {
  return state.mode === MODES.DAILY || state.mode === MODES.DAILY_PRACTICE;
}

function buildShareText() {
  const playedRows = state.feedback.filter((row) => row.length > 0);
  const won = state.feedback.some((row) => row.filter((c) => c === "black").length === CODE_LENGTH);
  const resultLine = won ? `${state.currentRow + 1}/6` : "FAIL";
  const lines = [
    "AA Master Mind",
    `Mode: ${modeLabel(state.mode)}`,
    `Result: ${resultLine}`,
    `Time: ${formatTime(state.lastResultTimeMs || getElapsedMs())}`
  ];

  if (isDailyMode() && state.currentDailyDateUTC) {
    lines.push(`Date: ${state.currentDailyDateUTC}`);
  }

  if (state.mode === MODES.MATCH_CODE && state.matchCode) {
    lines.push(`Match Code: ${state.matchCode}`);
  }

  for (const row of playedRows) {
    const blacks = row.filter((c) => c === "black").length;
    const whites = row.filter((c) => c === "white").length;
    const empties = CODE_LENGTH - blacks - whites;
    lines.push(`${"🟥".repeat(blacks)}${"🟨".repeat(whites)}${"⬛".repeat(Math.max(0, empties))}`);
  }

  return lines.join("\n");
}

async function shareResults() {
  const text = buildShareText();
  try {
    await navigator.clipboard.writeText(text);
    el.shareBtn.textContent = "Copied!";
    setTimeout(() => {
      el.shareBtn.textContent = "Share";
    }, 900);
    el.subtitle.textContent = "Results copied to clipboard.";
    el.shareFallback.classList.add("hidden");
  } catch {
    el.shareFallbackText.value = text;
    el.shareFallback.classList.remove("hidden");
    el.shareFallbackText.focus();
    el.shareFallbackText.select();
    el.subtitle.textContent = "Clipboard unavailable. Copy text below.";
  }
}

/* ---------- MATCH CODE HELPERS ---------- */

function normalizeMatchCode(code) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatMatchCodeForInput(code) {
  const compact = normalizeMatchCode(code).slice(0, 8);
  const p1 = compact.slice(0, 2);
  const p2 = compact.slice(2, 6);
  const p3 = compact.slice(6, 8);
  return [p1, p2, p3].filter(Boolean).join("-");
}

function isValidMatchCode(code) {
  return /^[A-Z0-9]{2}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(code);
}

function makeHumanCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(2)}-${pick(4)}-${pick(2)}`;
}

/* FNV-1a 32-bit hash for stable seed derivation from match code text. */
function fnv1a32(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/* mulberry32 seeded PRNG; same seed => same sequence. */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function codeFromMatchCode(code) {
  const normalized = normalizeMatchCode(code);
  const seed = fnv1a32(normalized);
  const rand = mulberry32(seed);
  return Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(rand() * COLORS.length)].key);
}

/* ---------- UI Flow ---------- */

function hideAllScreens() {
  [
    el.startScreen,
    el.howToScreen,
    el.lifetimeScreen,
    el.dailyScreen,
    el.leaderboardScreen,
    el.dailyLockedScreen,
    el.twoPlayerSet,
    el.twoPlayerPass,
    el.matchChoice,
    el.matchCreate,
    el.matchJoin,
    el.gameScreen
  ].forEach((node) => node.classList.add("hidden"));
}

function abandonRunAndReturnHome() {
  stopTimer();
  resetTimer();
  scrollRowsToTop();
  state.mode = null;
  state.gameOver = false;
  state.matchCode = "";
  state.setupCode = [];
  state.isDailyOfficial = false;
  state.currentDailyDateUTC = "";
  state.guesses = Array.from({ length: TOTAL_ROWS }, () => []);
  state.feedback = Array.from({ length: TOTAL_ROWS }, () => []);
  hideAllScreens();
  el.startScreen.classList.remove("hidden");
  el.modal.classList.add("hidden");
  el.subtitle.textContent = "Select a mode to begin.";
  setStatsExpanded(false);
  renderStatsPanel();
}

function goToStartScreen() {
  resetTimer();
  scrollRowsToTop();
  abandonRunAndReturnHome();
}

function beginSoloMode() {
  if (!confirmAbandonIfNeeded()) return;
  resetTimer(MODES.SOLO);
  state.mode = MODES.SOLO;
  state.secretCode = generateRandomCode();
  prepareGuessBoard();
  el.subtitle.textContent = "Solo: crack the hidden code.";
  setStatsExpanded(false);
}

function beginTwoPlayerSetup() {
  if (!confirmAbandonIfNeeded()) return;
  resetTimer(MODES.TWO_PLAYERS);
  state.mode = MODES.TWO_PLAYERS;
  state.setupCode = [];
  hideAllScreens();
  el.twoPlayerSet.classList.remove("hidden");
  el.subtitle.textContent = "Player 1 sets the secret code.";
  buildSetupPalette();
  renderSetupRow();
  renderStatsPanel();
  setStatsExpanded(false);
}

function showTwoPlayerPassScreen() {
  hideAllScreens();
  el.twoPlayerPass.classList.remove("hidden");
  el.subtitle.textContent = "Pass the device to Player 2.";
}

function showMatchChoice() {
  if (!confirmAbandonIfNeeded()) return;
  resetTimer(MODES.MATCH_CODE);
  state.mode = MODES.MATCH_CODE;
  hideAllScreens();
  el.matchChoice.classList.remove("hidden");
  el.subtitle.textContent = "Match Code: one-time codes for each match.";
  renderStatsPanel();
  setStatsExpanded(false);
}

function showHowTo() {
  if (!confirmAbandonIfNeeded()) return;
  hideAllScreens();
  el.howToScreen.classList.remove("hidden");
  el.subtitle.textContent = "How to play AA Master Mind.";
  setStatsExpanded(false);
}

function showMatchCreate() {
  hideAllScreens();
  el.matchCreate.classList.remove("hidden");
  state.matchCode = makeHumanCode();
  el.generatedMatchCode.textContent = state.matchCode;
  el.subtitle.textContent = "Create a code and share it.";
}

function showMatchJoin() {
  hideAllScreens();
  el.matchJoin.classList.remove("hidden");
  el.joinInput.value = "";
  el.joinError.textContent = "";
  el.subtitle.textContent = "Join using the same match code.";
}

function showGameScreen() {
  hideAllScreens();
  el.gameScreen.classList.remove("hidden");
  el.newMatchCodeBtn.classList.toggle("hidden", state.mode !== MODES.MATCH_CODE);
  renderStatsPanel();
  setStatsExpanded(false);
  setupScrollTracking();
  scrollCurrentRowIntoView({ force: true });
}

/* ---------- Board ---------- */

function generateRandomCode() {
  return Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)].key);
}

function setPegColor(pegEl, colorIndex) {
  pegEl.classList.forEach((c) => {
    if (c.startsWith("color-")) {
      pegEl.classList.remove(c);
    }
  });
  if (colorIndex !== null && colorIndex !== undefined) {
    pegEl.classList.add(`color-${colorIndex}`);
  }
}

function animatePegPop(pegEl) {
  pegEl.classList.remove("pop");
  // force reflow for repeat animation
  void pegEl.offsetWidth;
  pegEl.classList.add("pop");
}

function prepareGuessBoard() {
  scrollRowsToTop();
  state.guesses = Array.from({ length: TOTAL_ROWS }, () => []);
  state.feedback = Array.from({ length: TOTAL_ROWS }, () => []);
  state.currentRow = 0;
  state.gameOver = false;
  state.winnerText = "";
  buildSecretPanel();
  buildRows();
  buildPalette(el.palette, addColorToCurrentRow);
  renderBoardState();
  showGameScreen();
  scrollCurrentRowIntoView({ force: true });
}

function buildSecretPanel() {
  el.secretPanel.innerHTML = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const slot = document.createElement("div");
    slot.className = "secret-slot hidden-code";
    const peg = document.createElement("div");
    peg.className = "peg";
    slot.appendChild(peg);
    el.secretPanel.appendChild(slot);
  }
}

function buildRows() {
  el.rows.innerHTML = "";
  for (let rowIndex = 0; rowIndex < TOTAL_ROWS; rowIndex += 1) {
    const row = document.createElement("article");
    row.className = "row";

    const slots = document.createElement("div");
    slots.className = "guess-slots";

    for (let slotIndex = 0; slotIndex < CODE_LENGTH; slotIndex += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "slot";
      slot.dataset.row = String(rowIndex);
      slot.dataset.slot = String(slotIndex);
      slot.setAttribute("aria-label", `Row ${rowIndex + 1} slot ${slotIndex + 1}`);
      const peg = document.createElement("div");
      peg.className = "peg";
      slot.appendChild(peg);
      slot.addEventListener("click", onSlotClick);
      slots.appendChild(slot);
    }

    const feedback = document.createElement("div");
    feedback.className = "feedback-grid";
    for (let pegIndex = 0; pegIndex < CODE_LENGTH; pegIndex += 1) {
      const peg = document.createElement("div");
      peg.className = "feedback-peg";
      feedback.appendChild(peg);
    }

    row.append(slots, feedback);
    el.rows.appendChild(row);
  }
}

function buildPalette(container, clickHandler) {
  container.innerHTML = "";
  COLORS.forEach((color) => {
    const peg = document.createElement("button");
    peg.type = "button";
    peg.className = "palette-color";
    peg.style.backgroundColor = color.hex;
    peg.setAttribute("aria-label", `Color ${color.key}`);
    peg.addEventListener("click", () => clickHandler(color.key));
    container.appendChild(peg);
  });
}

function buildSetupPalette() {
  buildPalette(el.setupPalette, addColorToSetupCode);
}

function renderSetupRow() {
  el.setupRow.innerHTML = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    const color = state.setupCode[i];
    const peg = document.createElement("div");
    peg.className = "peg";
    setPegColor(peg, color ? getColorIndex(color) : null);
    btn.appendChild(peg);
    btn.addEventListener("click", () => {
      if (i < state.setupCode.length) {
        state.setupCode.splice(i, 1);
        renderSetupRow();
      }
    });
    el.setupRow.appendChild(btn);
  }
  el.setupConfirmBtn.disabled = state.setupCode.length !== CODE_LENGTH;
}

function addColorToSetupCode(colorKey) {
  if (state.setupCode.length >= CODE_LENGTH) return;
  state.setupCode.push(colorKey);
  renderSetupRow();
}

function addColorToCurrentRow(colorKey) {
  if (state.gameOver) return;

  const guess = state.guesses[state.currentRow];
  if (guess.length >= CODE_LENGTH) return;

  // SOLO + DAILY timing starts on first peg placement by player action.
  if ((state.mode === MODES.SOLO || isDailyMode()) && !state.timer.isRunning && state.timer.elapsedMs === 0) {
    startTimer(state.mode);
  }

  guess.push(colorKey);
  playSfx("place");
  vibrate(10);
  renderBoardState();
  scrollCurrentRowIntoView();

  const rowEl = el.rows.querySelectorAll(".row")[state.currentRow];
  const pegEls = rowEl?.querySelectorAll(".slot .peg");
  const pegEl = pegEls?.[guess.length - 1];
  if (pegEl) {
    animatePegPop(pegEl);
  }
}

function onSlotClick(event) {
  if (state.gameOver) return;
  const row = Number(event.currentTarget.dataset.row);
  const slot = Number(event.currentTarget.dataset.slot);
  if (row !== state.currentRow) return;
  if (slot < state.guesses[row].length) {
    state.guesses[row].splice(slot, 1);
    renderBoardState();
  }
}

function undoCurrentRow() {
  if (state.gameOver) return;
  state.guesses[state.currentRow].pop();
  renderBoardState();
}

function clearCurrentRow() {
  if (state.gameOver) return;
  state.guesses[state.currentRow] = [];
  renderBoardState();
}

/*
  Feedback with duplicates:
  1) Count exact position matches (black pegs)
  2) Count color-only matches once (white pegs)
*/
function evaluateGuess(guess, secretCode) {
  const secretTemp = [...secretCode];
  const guessTemp = [...guess];
  let blacks = 0;
  let whites = 0;

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    if (guessTemp[i] === secretTemp[i]) {
      blacks += 1;
      guessTemp[i] = null;
      secretTemp[i] = null;
    }
  }

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    if (!guessTemp[i]) continue;
    const hit = secretTemp.indexOf(guessTemp[i]);
    if (hit !== -1) {
      whites += 1;
      secretTemp[hit] = null;
    }
  }

  return { blacks, whites };
}

function submitGuess() {
  if (state.gameOver) return;
  const guess = state.guesses[state.currentRow];
  if (guess.length !== CODE_LENGTH) return;

  playSfx("submit");
  vibrate(15);

  const { blacks, whites } = evaluateGuess(guess, state.secretCode);
  state.feedback[state.currentRow] = [
    ...Array.from({ length: blacks }, () => "black"),
    ...Array.from({ length: whites }, () => "white")
  ];

  if (blacks === CODE_LENGTH) {
    finishGame(true);
    return;
  }

  if (state.currentRow === TOTAL_ROWS - 1) {
    finishGame(false);
    return;
  }

  state.currentRow += 1;
  renderBoardState();
  scrollCurrentRowIntoView();
}

function renderBoardState() {
  const rows = el.rows.querySelectorAll(".row");
  rows.forEach((rowEl, rowIndex) => {
    rowEl.classList.toggle("current", rowIndex === state.currentRow && !state.gameOver);

    const slots = rowEl.querySelectorAll(".slot");
    slots.forEach((slotEl, slotIndex) => {
      const color = state.guesses[rowIndex][slotIndex];
      const peg = slotEl.querySelector(".peg");
      if (peg) {
        setPegColor(peg, color ? getColorIndex(color) : null);
      }
      slotEl.disabled = rowIndex !== state.currentRow || state.gameOver;
    });

    const feedback = rowEl.querySelectorAll(".feedback-peg");
    feedback.forEach((pegEl, pegIndex) => {
      const pegColor = state.feedback[rowIndex][pegIndex];
      pegEl.classList.remove("reveal");
      if (pegColor === "black") {
        pegEl.style.background = "#2f2f2f";
        pegEl.classList.add("reveal");
      } else if (pegColor === "white") {
        pegEl.style.background = "#e9e6dd";
        pegEl.classList.add("reveal");
      } else {
        pegEl.style.background = "radial-gradient(circle at 30% 30%, #b2ab9d, #91897a)";
      }
    });
  });

  const rowGuess = state.guesses[state.currentRow] ?? [];
  el.submitBtn.disabled = state.gameOver || rowGuess.length !== CODE_LENGTH;
  el.undoBtn.disabled = state.gameOver || rowGuess.length === 0;
  el.clearBtn.disabled = state.gameOver || rowGuess.length === 0;
}

function revealSecretCode() {
  const slots = el.secretPanel.querySelectorAll(".secret-slot");
  slots.forEach((slot, index) => {
    slot.classList.remove("hidden-code");
    const peg = slot.querySelector(".peg");
    if (peg) {
      setPegColor(peg, getColorIndex(state.secretCode[index]));
    }
  });
}

function renderRevealedCode() {
  el.revealedCode.innerHTML = "";
  state.secretCode.forEach((key) => {
    const peg = document.createElement("div");
    peg.className = "secret-slot";
    const pegInner = document.createElement("div");
    pegInner.className = "peg";
    setPegColor(pegInner, getColorIndex(key));
    peg.appendChild(pegInner);
    el.revealedCode.appendChild(peg);
  });
}

function finishGame(won) {
  state.gameOver = true;
  const attempts = state.currentRow + 1;
  const finalTimeMs = stopTimer();
  state.lastResultTimeMs = finalTimeMs;
  updateLifetimeStatsOnFinish({ won, attempts, finalTimeMs });

  if (state.mode === MODES.TWO_PLAYERS) {
    state.winnerText = won ? "Player 2 wins" : "Player 1 wins";
    el.resultTitle.textContent = state.winnerText;
  } else {
    el.resultTitle.textContent = won ? "You Win" : "Game Over";
  }

  if (won) {
    el.resultMessage.textContent = `${state.winnerText || "Code cracked"} in ${attempts} attempt${attempts > 1 ? "s" : ""}.`;
    playSfx("win");
    vibrate([20, 30, 20]);
  } else {
    el.resultMessage.textContent = `${state.winnerText || "No guesses left"}. Attempts used: ${attempts}.`;
    playSfx("lose");
    vibrate([40]);
  }

  const bestTime = state.statsByMode[state.mode]?.bestTimeMs;
  el.resultTime.textContent = `Final Time: ${formatTime(finalTimeMs)}${bestTime ? ` | Best Time: ${formatTime(bestTime)}` : ""}`;

  if (state.mode === MODES.MATCH_CODE && state.matchCode) {
    el.resultMatchCode.textContent = `Match Code: ${state.matchCode}`;
    el.resultMatchCode.classList.remove("hidden");
    el.copyResultCodeBtn.classList.remove("hidden");
  } else {
    el.resultMatchCode.classList.add("hidden");
    el.copyResultCodeBtn.classList.add("hidden");
  }

  if (!isDailyMode()) {
    updateStats(state.mode, won, attempts, finalTimeMs);
  } else if (state.mode === MODES.DAILY && state.isDailyOfficial) {
    const dailyDate = state.currentDailyDateUTC || getUTCDateStamp();
    saveDailyLock({
      completed: true,
      won,
      attempts,
      timeMs: finalTimeMs,
      finishedAt: Date.now()
    }, dailyDate);

    uploadDailyScore({
      dateUTC: dailyDate,
      nickname: state.nickname || localStorage.getItem(NICKNAME_KEY) || "Player",
      deviceId: state.deviceId,
      attempts,
      timeMs: finalTimeMs
    }).then(() => {
      el.subtitle.textContent = "Saved!";
    }).catch(() => {
      el.subtitle.textContent = "Score upload failed (offline?)";
    });
  }
  renderStatsPanel();
  if (!isDailyMode()) {
    revealSecretCode();
    renderRevealedCode();
    el.revealedCode.classList.remove("hidden");
  } else {
    el.revealedCode.classList.add("hidden");
  }
  el.shareFallback.classList.add("hidden");
  renderBoardState();
  setStatsExpanded(true);
  el.modal.classList.remove("hidden");
}

/* ---------- Events ---------- */

el.soloModeBtn.addEventListener("click", beginSoloMode);
el.dailyModeBtn.addEventListener("click", showDailyScreen);
el.leaderboardBtn.addEventListener("click", showLeaderboardScreen);
el.twoPlayerModeBtn.addEventListener("click", beginTwoPlayerSetup);
el.matchModeBtn.addEventListener("click", showMatchChoice);
el.howToBtn.addEventListener("click", showHowTo);
el.lifetimeBtn.addEventListener("click", showLifetimeScreen);
el.createMatchBtn.addEventListener("click", showMatchCreate);
el.joinMatchBtn.addEventListener("click", showMatchJoin);

el.statsToggle.addEventListener("click", () => {
  setStatsExpanded(!state.statsExpanded, true);
});

el.sfxToggle.addEventListener("click", () => {
  unlockAudio();
  setSfxEnabled(!state.sfxEnabled);
});

el.backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!confirmAbandonIfNeeded()) return;
    abandonRunAndReturnHome();
  });
});

el.setupClearBtn.addEventListener("click", () => {
  state.setupCode = [];
  renderSetupRow();
});

el.setupConfirmBtn.addEventListener("click", () => {
  if (state.setupCode.length !== CODE_LENGTH) return;
  state.secretCode = [...state.setupCode];
  state.setupCode = [];
  showTwoPlayerPassScreen();
});

el.startGuessingBtn.addEventListener("click", () => {
  prepareGuessBoard();
  startTimer(MODES.TWO_PLAYERS);
  el.subtitle.textContent = "Two Players: Player 2 guesses the hidden code.";
});

el.copyMatchCodeBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(state.matchCode);
    el.subtitle.textContent = "Match code copied. Share it with the other player.";
  } catch {
    el.subtitle.textContent = "Copy unavailable. Please copy the code manually.";
  }
});

el.shareMatchCodeBtn.addEventListener("click", async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: "AA Master Mind Match Code", text: `Join my match with code: ${state.matchCode}` });
      return;
    } catch {
      // fall back to copy
    }
  }
  el.copyMatchCodeBtn.click();
});


el.dailyStartBtn.addEventListener("click", () => {
  beginDailyMode({ practice: false });
});

el.dailyPracticeBtn.addEventListener("click", () => {
  beginDailyMode({ practice: true });
});

el.dailyLockedPracticeBtn.addEventListener("click", () => {
  beginDailyMode({ practice: true });
});

el.dailyNicknameInput.addEventListener("input", () => {
  updateDailyNicknameUi();
});

el.leaderboardRefreshBtn.addEventListener("click", () => {
  loadLeaderboardForToday();
});

el.lbTodayBtn.addEventListener("click", () => {
  state.leaderboardDateOffsetDays = 0;
  el.lbTodayBtn.disabled = true;
  el.lbYesterdayBtn.disabled = false;
  loadLeaderboardForToday();
});

el.lbYesterdayBtn.addEventListener("click", () => {
  state.leaderboardDateOffsetDays = -1;
  el.lbTodayBtn.disabled = false;
  el.lbYesterdayBtn.disabled = true;
  loadLeaderboardForToday();
});

el.viewLeaderboardBtn.addEventListener("click", () => {
  el.modal.classList.add("hidden");
  showLeaderboardScreen();
});

el.lifetimeResetBtn.addEventListener("click", () => {
  if (!window.confirm("Reset lifetime stats?")) return;
  localStorage.removeItem(LIFETIME_KEY);
  renderLifetimeStatsScreen();
});


el.joinInput.addEventListener("input", () => {
  const formatted = formatMatchCodeForInput(el.joinInput.value);
  el.joinInput.value = formatted;
});

el.startCreatedMatchBtn.addEventListener("click", () => {
  state.secretCode = codeFromMatchCode(state.matchCode);
  prepareGuessBoard();
  startTimer(MODES.MATCH_CODE);
  el.subtitle.textContent = "Match started. This code is one-time for this match.";
});

el.startJoinedMatchBtn.addEventListener("click", () => {
  const formatted = formatMatchCodeForInput(el.joinInput.value);
  el.joinInput.value = formatted;

  if (!isValidMatchCode(formatted)) {
    el.joinError.textContent = "Invalid format. Example: KJ-W6TE-FR";
    return;
  }

  state.matchCode = formatted;
  el.joinError.textContent = "";
  state.secretCode = codeFromMatchCode(formatted);
  prepareGuessBoard();
  startTimer(MODES.MATCH_CODE);
  el.subtitle.textContent = "Joined match. Same code gives the same secret.";
});

el.submitBtn.addEventListener("click", submitGuess);
el.undoBtn.addEventListener("click", undoCurrentRow);
el.clearBtn.addEventListener("click", clearCurrentRow);

el.newGameBtn.addEventListener("click", goToStartScreen);
el.newMatchCodeBtn.addEventListener("click", () => {
  el.modal.classList.add("hidden");
  resetTimer(MODES.MATCH_CODE);
  showMatchCreate();
});


el.shareBtn.addEventListener("click", () => {
  shareResults();
});

el.copyResultCodeBtn.addEventListener("click", async () => {
  if (!state.matchCode) return;
  try {
    await navigator.clipboard.writeText(state.matchCode);
    el.copyResultCodeBtn.textContent = "Copied!";
    setTimeout(() => {
      el.copyResultCodeBtn.textContent = "Copy Code";
    }, 900);
    el.subtitle.textContent = "Match code copied from results.";
  } catch {
    el.subtitle.textContent = "Copy unavailable on this browser.";
  }
});

function setupScrollTracking() {
  if (!el.rows) return;
  el.rows.removeEventListener("scroll", pauseAutoScrollTemporarily);
  el.rows.addEventListener("scroll", pauseAutoScrollTemporarily, { passive: true });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // silent fail in unsupported/private contexts
      });
    });
  }
}

function init() {
  maybeResumeTimer();
  hideAllScreens();
  el.startScreen.classList.remove("hidden");
  el.modal.classList.add("hidden");
  el.subtitle.textContent = "Select a mode to begin.";
  renderStatsPanel();
  setStatsExpanded(false);
  state.deviceId = getOrCreateDeviceId();
  state.nickname = sanitizeNickname(localStorage.getItem(NICKNAME_KEY) || "");
  updateSfxToggleLabel();
  setupScrollTracking();
  scrollRowsToTop();
  ["touchstart", "mousedown", "keydown"].forEach((evt) =>
    document.addEventListener(evt, unlockAudio, { passive: true })
  );
  registerServiceWorker();
}

init();
});
