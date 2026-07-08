/* =========================================================
   main.js
   index.html 전용 UI 로직. 실제 그리기 연산은 pixelCanvas.js의
   PixelCanvas 클래스가 담당하고, 이 파일은 화면의 버튼/입력과
   그 클래스를 연결하는 역할만 합니다.

   새 도구를 추가하려면:
   1) index.html의 .tool-grid 안에 data-tool="이름" 버튼 추가
   2) applyToolAt() 함수에 분기 추가
   ========================================================= */
(function () {
  "use strict";

  var DEFAULT_PALETTE = [
    "#0b0c14", "#ffffff", "#9297b4", "#4ff0d7", "#2ba98f", "#ff3ec8",
    "#ffcb47", "#ff5c72", "#3fa9f5", "#7c5cff", "#2ecc71", "#ff8c42",
    "#8b5a2b", "#c94f4f", "#4d4d6d", "#e6e6e6", "#1abc9c", "#f1c40f",
    "#e74c3c", "#9b59b6", "#34495e", "#16a085", "#d35400", "#2c3e50"
  ];
  var BASE_CELL_SIZE = 16; // zoom 100% 기준
  var RECENT_KEY = "dotpress:recentColors";
  var MAX_RECENT = 8;

  var canvasEl = document.getElementById("pixelCanvas");
  if (!canvasEl) return; // index.html이 아니면 아무 것도 하지 않음

  var pc = new PixelCanvas(canvasEl, 32, 32, BASE_CELL_SIZE);

  var state = {
    tool: "pencil",
    lastDrawTool: "pencil",
    color: "#4ff0d7",
    isDrawing: false,
    lastCell: null,
    recent: loadRecent()
  };

  /* ---------------- 요소 참조 ---------------- */
  var el = {
    toolBtns: document.querySelectorAll(".tool-btn"),
    colorPicker: document.getElementById("colorPicker"),
    palette: document.getElementById("palette"),
    recentColors: document.getElementById("recentColors"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    clearBtn: document.getElementById("clearBtn"),
    hudCoords: document.getElementById("hudCoords"),
    hudSize: document.getElementById("hudSize"),
    hudZoom: document.getElementById("hudZoom"),
    zoomRange: document.getElementById("zoomRange"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    gridToggle: document.getElementById("gridToggle"),
    sizeBtns: document.querySelectorAll(".size-btn"),
    customW: document.getElementById("customW"),
    customH: document.getElementById("customH"),
    applySize: document.getElementById("applySize"),
    exportScale: document.getElementById("exportScale"),
    downloadJpg: document.getElementById("downloadJpg"),
    downloadPng: document.getElementById("downloadPng")
  };

  /* ---------------- 초기화 ---------------- */
  buildPalette();
  renderRecent();
  updateHistoryButtons();
  updateHudSize();
  updateHudZoom();
  pc.render();

  /* ---------------- 도구 선택 ---------------- */
  el.toolBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectTool(btn.dataset.tool);
    });
  });

  function selectTool(tool) {
    state.tool = tool;
    if (tool !== "eyedropper") state.lastDrawTool = tool;
    el.toolBtns.forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.tool === tool);
    });
  }

  /* ---------------- 색상 ---------------- */
  function buildPalette() {
    DEFAULT_PALETTE.forEach(function (hex) {
      var b = document.createElement("button");
      b.className = "swatch";
      b.style.background = hex;
      b.dataset.hex = hex.toLowerCase();
      b.type = "button";
      b.setAttribute("aria-label", "색상 " + hex + " 선택");
      b.addEventListener("click", function () { setCurrentColor(hex); });
      el.palette.appendChild(b);
    });
  }

  function setCurrentColor(hex) {
    state.color = hex;
    el.colorPicker.value = hex;
    highlightActiveSwatch();
    addToRecent(hex);
  }

  function highlightActiveSwatch() {
    el.palette.querySelectorAll(".swatch").forEach(function (s) {
      s.classList.toggle("is-active", s.dataset.hex === state.color.toLowerCase());
    });
  }

  el.colorPicker.addEventListener("input", function (e) {
    setCurrentColor(e.target.value);
  });

  function loadRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveRecent() {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent)); } catch (err) { /* noop */ }
  }

  function addToRecent(hex) {
    state.recent = state.recent.filter(function (c) { return c.toLowerCase() !== hex.toLowerCase(); });
    state.recent.unshift(hex);
    if (state.recent.length > MAX_RECENT) state.recent.length = MAX_RECENT;
    saveRecent();
    renderRecent();
  }

  function renderRecent() {
    el.recentColors.innerHTML = "";
    state.recent.forEach(function (hex) {
      var b = document.createElement("button");
      b.className = "swatch";
      b.style.background = hex;
      b.type = "button";
      b.setAttribute("aria-label", "최근 색상 " + hex + " 선택");
      b.addEventListener("click", function () { setCurrentColor(hex); });
      el.recentColors.appendChild(b);
    });
  }

  /* ---------------- 그리기 상호작용 ---------------- */
  function applyToolAt(x, y) {
    if (state.tool === "pencil") pc.setPixel(x, y, state.color);
    else if (state.tool === "eraser") pc.setPixel(x, y, null);
  }

  function updateHud(cell) {
    if (cell && pc.inBounds(cell.x, cell.y)) {
      el.hudCoords.textContent = "X:" + cell.x + " Y:" + cell.y;
    } else {
      el.hudCoords.textContent = "X:-- Y:--";
    }
  }

  function updateHudSize() {
    el.hudSize.textContent = pc.cols + "×" + pc.rows;
  }

  function updateHudZoom() {
    var pct = Math.round((pc.cellSize / BASE_CELL_SIZE) * 100);
    el.hudZoom.textContent = "ZOOM " + pct + "%";
  }

  canvasEl.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    canvasEl.setPointerCapture(e.pointerId);
    var cell = pc.screenToCell(e.clientX, e.clientY);
    if (!pc.inBounds(cell.x, cell.y)) return;

    if (state.tool === "eyedropper") {
      var picked = pc.getPixel(cell.x, cell.y);
      if (picked) setCurrentColor(picked);
      selectTool(state.lastDrawTool);
      return;
    }

    pc.snapshotForUndo();

    if (state.tool === "bucket") {
      pc.floodFill(cell.x, cell.y, state.color);
      pc.render();
      updateHistoryButtons();
      return;
    }

    state.isDrawing = true;
    state.lastCell = cell;
    applyToolAt(cell.x, cell.y);
    pc.render();
    updateHistoryButtons();
  });

  canvasEl.addEventListener("pointermove", function (e) {
    var cell = pc.screenToCell(e.clientX, e.clientY);
    updateHud(cell);
    if (!state.isDrawing || !pc.inBounds(cell.x, cell.y)) return;
    if (state.lastCell) {
      pc.line(state.lastCell.x, state.lastCell.y, cell.x, cell.y, applyToolAt);
    } else {
      applyToolAt(cell.x, cell.y);
    }
    state.lastCell = cell;
    pc.render();
  });

  function endStroke() {
    state.isDrawing = false;
    state.lastCell = null;
  }
  canvasEl.addEventListener("pointerup", endStroke);
  canvasEl.addEventListener("pointercancel", endStroke);
  canvasEl.addEventListener("pointerleave", function () {
    el.hudCoords.textContent = "X:-- Y:--";
  });

  /* ---------------- 실행취소 / 다시실행 / 지우기 ---------------- */
  function updateHistoryButtons() {
    el.undoBtn.disabled = !pc.canUndo();
    el.redoBtn.disabled = !pc.canRedo();
  }

  el.undoBtn.addEventListener("click", function () {
    if (pc.undo()) { pc.render(); updateHistoryButtons(); }
  });
  el.redoBtn.addEventListener("click", function () {
    if (pc.redo()) { pc.render(); updateHistoryButtons(); }
  });
  el.clearBtn.addEventListener("click", function () {
    if (!window.confirm("캔버스 전체를 지울까요? 이 작업은 실행취소로 되돌릴 수 있습니다.")) return;
    pc.snapshotForUndo();
    pc.clearAll();
    pc.render();
    updateHistoryButtons();
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;

    var mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (pc.undo()) { pc.render(); updateHistoryButtons(); }
    } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
      e.preventDefault();
      if (pc.redo()) { pc.render(); updateHistoryButtons(); }
    } else if (e.key.toLowerCase() === "p") selectTool("pencil");
    else if (e.key.toLowerCase() === "e") selectTool("eraser");
    else if (e.key.toLowerCase() === "b") selectTool("bucket");
    else if (e.key.toLowerCase() === "i") selectTool("eyedropper");
  });

  /* ---------------- 줌 / 격자 ---------------- */
  el.zoomRange.addEventListener("input", function () {
    pc.setCellSize(parseInt(el.zoomRange.value, 10));
    pc.render();
    updateHudZoom();
  });
  el.zoomIn.addEventListener("click", function () {
    el.zoomRange.value = Math.min(40, parseInt(el.zoomRange.value, 10) + 2);
    el.zoomRange.dispatchEvent(new Event("input"));
  });
  el.zoomOut.addEventListener("click", function () {
    el.zoomRange.value = Math.max(4, parseInt(el.zoomRange.value, 10) - 2);
    el.zoomRange.dispatchEvent(new Event("input"));
  });
  el.gridToggle.addEventListener("change", function () {
    pc.gridEnabled = el.gridToggle.checked;
    pc.render();
  });

  /* ---------------- 캔버스 크기 ---------------- */
  function hasArtwork() {
    return pc.data.some(function (c) { return c; });
  }

  function doResize(w, h) {
    if (hasArtwork() && !window.confirm("캔버스 크기를 바꾸면 새 캔버스로 초기화됩니다. 계속할까요?")) {
      return false;
    }
    pc.resizeGrid(w, h);
    pc.render();
    updateHudSize();
    updateHistoryButtons();
    return true;
  }

  el.sizeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var w = parseInt(btn.dataset.w, 10), h = parseInt(btn.dataset.h, 10);
      if (doResize(w, h)) {
        el.sizeBtns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        el.customW.value = w;
        el.customH.value = h;
      }
    });
  });

  el.applySize.addEventListener("click", function () {
    var w = clamp(parseInt(el.customW.value, 10) || 32, 4, 128);
    var h = clamp(parseInt(el.customH.value, 10) || 32, 4, 128);
    el.customW.value = w;
    el.customH.value = h;
    if (doResize(w, h)) {
      el.sizeBtns.forEach(function (b) {
        b.classList.toggle("is-active", parseInt(b.dataset.w, 10) === w && parseInt(b.dataset.h, 10) === h);
      });
    }
  });

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ---------------- 내보내기 ---------------- */
  function download(dataUrl, filename) {
    var a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  el.downloadJpg.addEventListener("click", function () {
    var scale = parseInt(el.exportScale.value, 10);
    download(pc.toExportDataURL("image/jpeg", scale), "dotpress-artwork.jpg");
  });
  el.downloadPng.addEventListener("click", function () {
    var scale = parseInt(el.exportScale.value, 10);
    download(pc.toExportDataURL("image/png", scale), "dotpress-artwork.png");
  });
})();
