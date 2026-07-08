/* =========================================================
   pixelCanvas.js
   도트 아트 캔버스의 핵심 그리기 엔진.
   UI(main.js)와 분리되어 있어, 나중에 레이어/애니메이션 등
   기능을 추가할 때 이 파일만 확장하면 됩니다.
   ========================================================= */
(function (global) {
  "use strict";

  var MAX_HISTORY = 50;

  function PixelCanvas(canvas, cols, rows, cellSize) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.gridEnabled = true;
    this.data = new Array(cols * rows).fill(null);
    this.undoStack = [];
    this.redoStack = [];
    this._resizeCanvasElement();
  }

  PixelCanvas.prototype._resizeCanvasElement = function () {
    var dpr = window.devicePixelRatio || 1;
    var cssW = this.cols * this.cellSize;
    var cssH = this.rows * this.cellSize;
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  PixelCanvas.prototype.index = function (x, y) {
    return y * this.cols + x;
  };

  PixelCanvas.prototype.inBounds = function (x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  };

  PixelCanvas.prototype.getPixel = function (x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.data[this.index(x, y)];
  };

  PixelCanvas.prototype.setPixel = function (x, y, color) {
    if (!this.inBounds(x, y)) return;
    this.data[this.index(x, y)] = color;
  };

  /** 화면 좌표(clientX/Y) -> 캔버스 셀 좌표 변환 */
  PixelCanvas.prototype.screenToCell = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var effW = rect.width / this.cols;
    var effH = rect.height / this.rows;
    var x = Math.floor((clientX - rect.left) / effW);
    var y = Math.floor((clientY - rect.top) / effH);
    return { x: x, y: y };
  };

  /** 두 점 사이를 브레젠험 알고리즘으로 이어서, 빠른 드래그에도 빈 칸이 생기지 않게 함 */
  PixelCanvas.prototype.line = function (x0, y0, x1, y1, callback) {
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    var dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    var x = x0, y = y0;
    while (true) {
      callback(x, y);
      if (x === x1 && y === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  };

  PixelCanvas.prototype.floodFill = function (x, y, newColor) {
    var target = this.getPixel(x, y);
    if (target === newColor) return;
    var stack = [[x, y]];
    var visited = new Set();
    while (stack.length) {
      var p = stack.pop();
      var px = p[0], py = p[1];
      if (!this.inBounds(px, py)) continue;
      var key = px + "," + py;
      if (visited.has(key)) continue;
      if (this.getPixel(px, py) !== target) continue;
      visited.add(key);
      this.setPixel(px, py, newColor);
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  };

  PixelCanvas.prototype.clearAll = function () {
    this.data.fill(null);
  };

  /* ---------------- 실행취소 / 다시실행 ---------------- */

  PixelCanvas.prototype.snapshotForUndo = function () {
    this.undoStack.push(this.data.slice());
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack.length = 0;
  };

  PixelCanvas.prototype.canUndo = function () { return this.undoStack.length > 0; };
  PixelCanvas.prototype.canRedo = function () { return this.redoStack.length > 0; };

  PixelCanvas.prototype.undo = function () {
    if (!this.canUndo()) return false;
    this.redoStack.push(this.data.slice());
    this.data = this.undoStack.pop();
    return true;
  };

  PixelCanvas.prototype.redo = function () {
    if (!this.canRedo()) return false;
    this.undoStack.push(this.data.slice());
    this.data = this.redoStack.pop();
    return true;
  };

  /* ---------------- 크기 / 줌 변경 ---------------- */

  /**
   * 격자 크기가 바뀔 때 기존 데이터를 좌상단 기준으로 옮기는 순수 함수.
   * 프레임이 여러 개인 애니메이션에서, 현재 편집 중이 아닌 다른 프레임의
   * 데이터를 리사이즈할 때도 이 함수를 그대로 재사용합니다.
   */
  PixelCanvas.remapGrid = function (oldData, oldCols, oldRows, newCols, newRows) {
    var next = new Array(newCols * newRows).fill(null);
    var copyW = Math.min(newCols, oldCols), copyH = Math.min(newRows, oldRows);
    for (var y = 0; y < copyH; y++) {
      for (var x = 0; x < copyW; x++) {
        next[y * newCols + x] = oldData[y * oldCols + x];
      }
    }
    return next;
  };

  PixelCanvas.prototype.resizeGrid = function (cols, rows) {
    this.data = PixelCanvas.remapGrid(this.data, this.cols, this.rows, cols, rows);
    this.cols = cols;
    this.rows = rows;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this._resizeCanvasElement();
  };

  /** cols/rows만 갱신하고 data는 건드리지 않음 - 여러 프레임을 다루는 main.js에서 사용 */
  PixelCanvas.prototype.setGridDimensions = function (cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this._resizeCanvasElement();
  };

  PixelCanvas.prototype.setCellSize = function (size) {
    this.cellSize = size;
    this._resizeCanvasElement();
  };

  /* ---------------- 렌더링 ---------------- */

  PixelCanvas.prototype.render = function () {
    var ctx = this.ctx, size = this.cellSize;
    ctx.clearRect(0, 0, this.cols * size, this.rows * size);
    for (var y = 0; y < this.rows; y++) {
      for (var x = 0; x < this.cols; x++) {
        var color = this.data[this.index(x, y)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * size, y * size, size, size);
        }
      }
    }
    if (this.gridEnabled && size >= 6) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= this.cols; gx++) {
        ctx.moveTo(gx * size + 0.5, 0);
        ctx.lineTo(gx * size + 0.5, this.rows * size);
      }
      for (var gy = 0; gy <= this.rows; gy++) {
        ctx.moveTo(0, gy * size + 0.5);
        ctx.lineTo(this.cols * size, gy * size + 0.5);
      }
      ctx.stroke();
    }
  };

  /* ---------------- 내보내기 ---------------- */

  /**
   * @param {"image/jpeg"|"image/png"} mime
   * @param {number} scale 셀 하나당 출력 픽셀 수
   */
  PixelCanvas.prototype.toExportDataURL = function (mime, scale) {
    var out = document.createElement("canvas");
    out.width = this.cols * scale;
    out.height = this.rows * scale;
    var ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }

    for (var y = 0; y < this.rows; y++) {
      for (var x = 0; x < this.cols; x++) {
        var color = this.data[this.index(x, y)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return out.toDataURL(mime, 0.92);
  };

  /**
   * 여러 프레임(각각 cols*rows 크기의 색상 배열)을 가로로 이어붙여
   * 하나의 스프라이트 시트 이미지로 합성합니다.
   * @param {Array<Array<string|null>>} framesData
   */
  PixelCanvas.composeSpriteSheet = function (framesData, cols, rows, scale, mime) {
    var count = framesData.length;
    var out = document.createElement("canvas");
    out.width = cols * scale * count;
    out.height = rows * scale;
    var ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
    }

    framesData.forEach(function (data, frameIdx) {
      var offsetX = frameIdx * cols * scale;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var color = data[y * cols + x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
          }
        }
      }
      // 프레임 구분선 (마지막 프레임 제외)
      if (frameIdx < count - 1) {
        ctx.strokeStyle = "rgba(128,128,128,0.5)";
        ctx.beginPath();
        ctx.moveTo(offsetX + cols * scale + 0.5, 0);
        ctx.lineTo(offsetX + cols * scale + 0.5, out.height);
        ctx.stroke();
      }
    });

    return out.toDataURL(mime, 0.92);
  };

  /** 하나의 프레임 데이터 배열로부터 바로 dataURL을 만드는 정적 버전 (공유 업로드용) */
  PixelCanvas.frameToDataURL = function (data, cols, rows, scale, mime) {
    return PixelCanvas.composeSpriteSheet([data], cols, rows, scale, mime);
  };

  global.PixelCanvas = PixelCanvas;
})(window);
