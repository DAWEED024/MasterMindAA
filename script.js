/*
  AA Master Mind
  - Mode flow: SOLO, TWO PLAYERS, MATCH CODE
  - Hash + PRNG: FNV-1a (32-bit) + mulberry32 for deterministic Match Code secrets
  - Feedback logic: black/white peg calculation supports duplicates correctly
*/

const TOTAL_ROWS = 6;
const CODE_LENGTH = 4;

const MODES = {
  SOLO: "solo",
  TWO_PLAYERS: "twoPlayers",
  MATCH_CODE: "matchCode"
};

const COLORS = [
  { key: "red", hex: "#c86e68" },
  { key: "blue", hex: "#7697c3" },
  { key: "green", hex: "#7ea97e" },
  { key: "yellow", hex: "#ceb673" },
  { key: "purple", hex: "#9f86ba" },
  { key: "orange", hex: "#c89a6e" }
];

const STORAGE_KEY = "aaMasterMindStatsByMode";
const EMPTY_STATS = { played: 0, wins: 0, bestScore: null };

const el = {
  subtitle: document.getElementById("subtitle"),
  startScreen: document.getElementById("start-screen"),
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
  matchModeBtn: document.getElementById("match-mode-btn"),
  startGuessingBtn: document.getElementById("start-guessing-btn"),
  createMatchBtn: document.getElementById("create-match-btn"),
  joinMatchBtn: document.getElementById("join-match-btn"),
  generatedMatchCode: document.getElementById("generated-match-code"),
  copyMatchCodeBtn: document.getElementById("copy-match-code-btn"),
  startCreatedMatchBtn: document.getElementById("start-created-match-btn"),
  startJoinedMatchBtn: document.getElementById("start-joined-match-btn"),
  joinInput: document.getElementById("join-match-input"),
  joinError: document.getElementById("join-error"),
  statsMode: document.getElementById("stats-mode"),
  statsPlayed: document.getElementById("stats-played"),
  statsWins: document.getElementById("stats-wins"),
  statsBest: document.getElementById("stats-best"),
  modal: document.getElementById("result-modal"),
  resultTitle: document.getElementById("result-title"),
  resultMessage: document.getElementById("result-message"),
  revealedCode: document.getElementById("revealed-code"),
  newGameBtn: document.getElementById("new-game-btn"),
  newMatchCodeBtn: document.getElementById("new-match-code-btn")
};

let state = {
  mode: null,
  secretCode: [],
  setupCode: [],
  guesses: Array.from({ length: TOTAL_ROWS }, () => []),
  feedback: Array.from({ length: TOTAL_ROWS }, () => []),
  currentRow: 0,
  gameOver: false,
  matchCode: "",
  statsByMode: loadStats(),
  winnerText: ""
};

function getColorHex(colorKey) {
  return COLORS.find((c) => c.key === colorKey)?.hex ?? "#888";
}

function modeLabel(mode) {
  if (mode === MODES.SOLO) return "Solo";
  if (mode === MODES.TWO_PLAYERS) return "Two Players";
  if (mode === MODES.MATCH_CODE) return "Match Code";
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
    bestScore: Number(value?.bestScore) || null
  };
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.statsByMode));
}

function updateStats(mode, won, attempts) {
  const stats = state.statsByMode[mode];
  stats.played += 1;
  if (won) {
    stats.wins += 1;
    if (!stats.bestScore || attempts < stats.bestScore) {
      stats.bestScore = attempts;
    }
  }
  saveStats();
}

function renderStatsPanel() {
  const mode = state.mode;
  const stats = mode ? state.statsByMode[mode] : EMPTY_STATS;
  el.statsMode.textContent = `Mode: ${modeLabel(mode)}`;
  el.statsPlayed.textContent = `Played: ${stats.played}`;
  el.statsWins.textContent = `Wins: ${stats.wins}`;
  el.statsBest.textContent = `Best: ${stats.bestScore ?? "--"}`;
}

/* ---------- MATCH CODE HELPERS ---------- */

function normalizeMatchCode(code) {
  return code.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

function isValidMatchCode(code) {
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(code) && code.length >= 8;
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

/* ---------- MODE FLOW UI ---------- */

function hideAllScreens() {
  [
    el.startScreen,
    el.twoPlayerSet,
    el.twoPlayerPass,
    el.matchChoice,
    el.matchCreate,
    el.matchJoin,
    el.gameScreen
  ].forEach((node) => node.classList.add("hidden"));
}

function goToStartScreen() {
  state.mode = null;
  state.matchCode = "";
  state.gameOver = false;
  hideAllScreens();
  el.startScreen.classList.remove("hidden");
  el.modal.classList.add("hidden");
  el.subtitle.textContent = "Select a mode to begin.";
  renderStatsPanel();
}

function beginSoloMode() {
  state.mode = MODES.SOLO;
  state.secretCode = generateRandomCode();
  prepareGuessBoard();
  el.subtitle.textContent = "Solo: crack the hidden code.";
  showGameScreen();
}

function beginTwoPlayerSetup() {
  state.mode = MODES.TWO_PLAYERS;
  state.setupCode = [];
  hideAllScreens();
  el.twoPlayerSet.classList.remove("hidden");
  el.subtitle.textContent = "Player 1 sets the secret code.";
  buildSetupPalette();
  renderSetupRow();
  renderStatsPanel();
}

function showTwoPlayerPassScreen() {
  hideAllScreens();
  el.twoPlayerPass.classList.remove("hidden");
  el.subtitle.textContent = "Pass the device to Player 2.";
}

function showMatchChoice() {
  state.mode = MODES.MATCH_CODE;
  hideAllScreens();
  el.matchChoice.classList.remove("hidden");
  el.subtitle.textContent = "Match Code: one-time codes for each match.";
  renderStatsPanel();
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
}

/* ---------- BOARD + GAME RENDER ---------- */

function generateRandomCode() {
  return Array.from({ length: CODE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)].key);
}

function prepareGuessBoard() {
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
}

function buildSecretPanel() {
  el.secretPanel.innerHTML = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const slot = document.createElement("div");
    slot.className = "secret-slot hidden-code";
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
    btn.style.backgroundColor = color ? getColorHex(color) : "";
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
  guess.push(colorKey);
  renderBoardState();
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
  Feedback calculation with duplicates:
  1) First pass counts black pegs (exact matches) and nulls used positions.
  2) Second pass counts white pegs by matching remaining colors only once.
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
}

function renderBoardState() {
  const rows = el.rows.querySelectorAll(".row");
  rows.forEach((rowEl, rowIndex) => {
    rowEl.classList.toggle("current", rowIndex === state.currentRow && !state.gameOver);

    const slots = rowEl.querySelectorAll(".slot");
    slots.forEach((slotEl, slotIndex) => {
      const color = state.guesses[rowIndex][slotIndex];
      slotEl.style.backgroundColor = color ? getColorHex(color) : "";
      slotEl.disabled = rowIndex !== state.currentRow || state.gameOver;
    });

    const feedback = rowEl.querySelectorAll(".feedback-peg");
    feedback.forEach((peg, pegIndex) => {
      const pegColor = state.feedback[rowIndex][pegIndex];
      if (pegColor === "black") peg.style.background = "#2f2f2f";
      else if (pegColor === "white") peg.style.background = "#e9e6dd";
      else peg.style.background = "radial-gradient(circle at 30% 30%, #b2ab9d, #91897a)";
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
    slot.style.backgroundColor = getColorHex(state.secretCode[index]);
  });
}

function renderRevealedCode() {
  el.revealedCode.innerHTML = "";
  state.secretCode.forEach((key) => {
    const peg = document.createElement("div");
    peg.className = "secret-slot";
    peg.style.backgroundColor = getColorHex(key);
    el.revealedCode.appendChild(peg);
  });
}

function finishGame(won) {
  state.gameOver = true;
  const attempts = state.currentRow + 1;

  if (state.mode === MODES.TWO_PLAYERS) {
    state.winnerText = won ? "Player 2 wins" : "Player 1 wins";
    el.resultTitle.textContent = state.winnerText;
  } else {
    el.resultTitle.textContent = won ? "You Win" : "Game Over";
  }

  if (won) {
    el.resultMessage.textContent = `${state.winnerText || "Code cracked"} in ${attempts} attempt${attempts > 1 ? "s" : ""}.`;
  } else {
    el.resultMessage.textContent = `${state.winnerText || "No guesses left"}. Attempts used: ${attempts}.`;
  }

  updateStats(state.mode, won, attempts);
  renderStatsPanel();
  revealSecretCode();
  renderRevealedCode();
  renderBoardState();
  el.modal.classList.remove("hidden");
}

/* ---------- EVENT WIRING ---------- */

el.soloModeBtn.addEventListener("click", beginSoloMode);
el.twoPlayerModeBtn.addEventListener("click", beginTwoPlayerSetup);
el.matchModeBtn.addEventListener("click", showMatchChoice);
el.createMatchBtn.addEventListener("click", showMatchCreate);
el.joinMatchBtn.addEventListener("click", showMatchJoin);

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

el.startCreatedMatchBtn.addEventListener("click", () => {
  state.secretCode = codeFromMatchCode(state.matchCode);
  prepareGuessBoard();
  el.subtitle.textContent = "Match started. This code is one-time for this match.";
});

el.startJoinedMatchBtn.addEventListener("click", () => {
  const normalized = normalizeMatchCode(el.joinInput.value);
  if (!isValidMatchCode(normalized)) {
    el.joinError.textContent = "Invalid code format. Example: AA-7K2P-91";
    return;
  }

  state.matchCode = normalized;
  el.joinError.textContent = "";
  state.secretCode = codeFromMatchCode(normalized);
  prepareGuessBoard();
  el.subtitle.textContent = "Joined match. Same code gives the same secret.";
});

el.submitBtn.addEventListener("click", submitGuess);
el.undoBtn.addEventListener("click", undoCurrentRow);
el.clearBtn.addEventListener("click", clearCurrentRow);

el.newGameBtn.addEventListener("click", goToStartScreen);
el.newMatchCodeBtn.addEventListener("click", () => {
  el.modal.classList.add("hidden");
  showMatchCreate();
});

goToStartScreen();
