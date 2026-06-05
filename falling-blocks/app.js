(() => {
  "use strict";

  const W = 10;
  const H = 20;
  const STORE = "mobile-tetris-high-score";
  const STATUS = { INIT: 0, WORK: 1, PAUSE: 2, OVER: 3 };
  const SHAPES = {
    i: [[1, 1, 1, 1]],
    j: [[1, 0, 0], [1, 1, 1]],
    l: [[0, 0, 1], [1, 1, 1]],
    o: [[1, 1], [1, 1]],
    s: [[0, 1, 1], [1, 1, 0]],
    t: [[0, 1, 0], [1, 1, 1]],
    z: [[1, 1, 0], [0, 1, 1]]
  };
  const TYPES = Object.keys(SHAPES);
  const POINTS = { 1: 100, 2: 300, 3: 500, 4: 800 };

  const board = document.getElementById("board");
  const nextGrid = document.getElementById("nextGrid");
  const statusLabel = document.getElementById("statusLabel");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const levelValue = document.getElementById("levelValue");
  const linesValue = document.getElementById("linesValue");
  const message = document.getElementById("message");
  const messageTitle = document.getElementById("messageTitle");
  const messageScore = document.getElementById("messageScore");
  const pauseButton = document.getElementById("pauseButton");

  let cells = [];
  let nextCells = [];
  let grid = [];
  let piece = null;
  let nextPiece = null;
  let timer = 0;
  let state = STATUS.INIT;
  let score = 0;
  let lines = 0;
  let level = 1;
  let best = readBest();
  let gesture = null;

  function copyShape(type) {
    return SHAPES[type].map((row) => row.slice());
  }

  function randomPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return { type, body: copyShape(type), x: 0, y: 0 };
  }

  function readBest() {
    try {
      const value = Number.parseInt(localStorage.getItem(STORE) || "0", 10);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    if (score <= best) return;
    best = score;
    try {
      localStorage.setItem(STORE, String(best));
    } catch {}
  }

  function pad(value) {
    return String(Math.max(0, value)).padStart(5, "0");
  }

  function makeCells() {
    board.innerHTML = "";
    nextGrid.innerHTML = "";
    cells = [];
    nextCells = [];

    for (let i = 0; i < W * H; i += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      board.appendChild(cell);
      cells.push(cell);
    }

    for (let i = 0; i < 25; i += 1) {
      const cell = document.createElement("div");
      cell.className = "next-cell";
      nextGrid.appendChild(cell);
      nextCells.push(cell);
    }
  }

  function resetGrid() {
    grid = Array.from({ length: H }, () => Array(W).fill(""));
  }

  function rotateBody(body) {
    const rows = body.length;
    const cols = body[0].length;
    return Array.from({ length: cols }, (_, y) =>
      Array.from({ length: rows }, (_, x) => body[rows - 1 - x][y])
    );
  }

  function collides(candidate, dx = 0, dy = 0, body = candidate.body) {
    for (let y = 0; y < body.length; y += 1) {
      for (let x = 0; x < body[y].length; x += 1) {
        if (!body[y][x]) continue;
        const px = candidate.x + x + dx;
        const py = candidate.y + y + dy;
        if (px < 0 || px >= W || py >= H) return true;
        if (py >= 0 && grid[py][px]) return true;
      }
    }
    return false;
  }

  function spawn() {
    piece = nextPiece || randomPiece();
    piece.x = Math.floor((W - piece.body[0].length) / 2);
    piece.y = 0;
    nextPiece = randomPiece();
    if (collides(piece)) gameOver();
  }

  function clearLines() {
    let cleared = 0;
    for (let y = H - 1; y >= 0; y -= 1) {
      if (!grid[y].every(Boolean)) continue;
      grid.splice(y, 1);
      grid.unshift(Array(W).fill(""));
      cleared += 1;
      y += 1;
    }
    if (!cleared) return;
    lines += cleared;
    score += (POINTS[cleared] || cleared * 200) * level;
    level = Math.floor(lines / 10) + 1;
  }

  function lockPiece() {
    for (let y = 0; y < piece.body.length; y += 1) {
      for (let x = 0; x < piece.body[y].length; x += 1) {
        if (!piece.body[y][x]) continue;
        const py = piece.y + y;
        const px = piece.x + x;
        if (py >= 0 && py < H && px >= 0 && px < W) grid[py][px] = piece.type;
      }
    }
    clearLines();
    spawn();
  }

  function draw() {
    const active = new Map();
    if (piece) {
      for (let y = 0; y < piece.body.length; y += 1) {
        for (let x = 0; x < piece.body[y].length; x += 1) {
          if (piece.body[y][x]) active.set(`${piece.x + x},${piece.y + y}`, piece.type);
        }
      }
    }

    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const cell = cells[y * W + x];
        const activeType = active.get(`${x},${y}`);
        const heapType = grid[y][x];
        const type = activeType || heapType;
        cell.dataset.kind = activeType ? "active" : heapType ? "heap" : "empty";
        if (type) cell.dataset.piece = type;
        else delete cell.dataset.piece;
      }
    }

    drawNext();
    updateHud();
  }

  function drawNext() {
    nextCells.forEach((cell) => delete cell.dataset.piece);
    if (!nextPiece) return;
    const body = nextPiece.body;
    const ox = Math.floor((5 - body[0].length) / 2);
    const oy = Math.floor((5 - body.length) / 2);
    for (let y = 0; y < body.length; y += 1) {
      for (let x = 0; x < body[y].length; x += 1) {
        if (body[y][x]) nextCells[(y + oy) * 5 + x + ox].dataset.piece = nextPiece.type;
      }
    }
  }

  function updateHud() {
    scoreValue.textContent = pad(score);
    bestValue.textContent = pad(Math.max(best, score));
    levelValue.textContent = String(level);
    linesValue.textContent = String(lines);
    statusLabel.textContent = state === STATUS.WORK ? "PLAY" : state === STATUS.PAUSE ? "PAUSE" : state === STATUS.OVER ? "OVER" : "READY";
    pauseButton.innerHTML = state === STATUS.PAUSE ? '<span aria-hidden="true">&#9658;</span>' : '<span aria-hidden="true">||</span>';
    pauseButton.setAttribute("aria-label", state === STATUS.PAUSE ? "Resume" : "Pause");
    pauseButton.setAttribute("title", state === STATUS.PAUSE ? "Resume" : "Pause");

    if (state === STATUS.PAUSE || state === STATUS.OVER) {
      message.hidden = false;
      messageTitle.textContent = state === STATUS.PAUSE ? "PAUSED" : "GAME OVER";
      messageScore.textContent = state === STATUS.OVER ? `SCORE ${pad(score)}` : pad(score);
    } else {
      message.hidden = true;
    }
  }

  function delay() {
    return Math.max(120, 850 - (level - 1) * 70);
  }

  function schedule() {
    clearTimeout(timer);
    if (state !== STATUS.WORK) return;
    timer = setTimeout(() => {
      softDrop(false);
      schedule();
    }, delay());
  }

  function move(dx) {
    if (state !== STATUS.WORK || collides(piece, dx, 0)) return;
    piece.x += dx;
    draw();
  }

  function rotate() {
    if (state === STATUS.OVER) return reset();
    if (state !== STATUS.WORK) return;
    const rotated = rotateBody(piece.body);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(piece, kick, 0, rotated)) {
        piece.x += kick;
        piece.body = rotated;
        draw();
        return;
      }
    }
  }

  function softDrop(manual = true) {
    if (state !== STATUS.WORK) return;
    if (!collides(piece, 0, 1)) {
      piece.y += 1;
      if (manual) score += 1;
    } else {
      lockPiece();
    }
    draw();
    if (manual) schedule();
  }

  function hardDrop() {
    if (state !== STATUS.WORK) return;
    let steps = 0;
    while (!collides(piece, 0, 1) && steps < H + 4) {
      piece.y += 1;
      steps += 1;
    }
    score += steps * 2;
    lockPiece();
    draw();
    schedule();
  }

  function togglePause() {
    if (state === STATUS.OVER) return reset();
    if (state === STATUS.WORK) {
      state = STATUS.PAUSE;
      clearTimeout(timer);
    } else if (state === STATUS.PAUSE) {
      state = STATUS.WORK;
      schedule();
    }
    draw();
  }

  function gameOver() {
    state = STATUS.OVER;
    clearTimeout(timer);
    saveBest();
  }

  function reset() {
    clearTimeout(timer);
    score = 0;
    lines = 0;
    level = 1;
    state = STATUS.WORK;
    resetGrid();
    nextPiece = randomPiece();
    spawn();
    draw();
    schedule();
  }

  function handleGesture(dx, dy, elapsed) {
    if (state === STATUS.OVER) return reset();
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < 18 && ay < 18 && elapsed < 320) return rotate();
    if (ax > ay && ax > 28) return move(dx > 0 ? 1 : -1);
    if (dy < -28) return rotate();
    if (dy > 76) return hardDrop();
    if (dy > 28) return softDrop(true);
  }

  function bind() {
    document.getElementById("leftButton").addEventListener("click", () => move(-1));
    document.getElementById("rightButton").addEventListener("click", () => move(1));
    document.getElementById("rotateButton").addEventListener("click", rotate);
    document.getElementById("softDropButton").addEventListener("click", () => softDrop(true));
    document.getElementById("hardDropButton").addEventListener("click", hardDrop);
    document.getElementById("pauseButton").addEventListener("click", togglePause);
    document.getElementById("resetButton").addEventListener("click", reset);

    window.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft") move(-1);
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowDown") softDrop(true);
      else if (event.key === "ArrowUp") rotate();
      else if (event.key === " " || event.key === "Spacebar") hardDrop();
      else if (event.key.toLowerCase() === "p") togglePause();
      else if (event.key.toLowerCase() === "r") reset();
    });

    board.addEventListener("pointerdown", (event) => {
      gesture = { x: event.clientX, y: event.clientY, time: performance.now() };
    });
    board.addEventListener("pointerup", (event) => {
      if (!gesture) return;
      const start = gesture;
      gesture = null;
      handleGesture(event.clientX - start.x, event.clientY - start.y, performance.now() - start.time);
    });
    board.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
    document.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".board, .controls")) event.preventDefault();
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  makeCells();
  bind();
  registerServiceWorker();
  reset();
})();
