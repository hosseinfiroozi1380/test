(() => {
  const canvas = document.getElementById('designCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  canvas.style.touchAction = 'none';
  const state = {
    width: 1000, height: 1000, count: 1, shape: 'rectangle', zoom: 1, sideFrames: [],
    mullions: [], horizontalMullions: [], openings: [],
    selected: null, tool: 'select', nextId: 1,
    history: [], future: [], drag: null,
    frame: 60, sashFrame: 70, mullionWidth: 40, glassBorder: 15,
    frameType: 'فریم معمولی',
    glassType: '۴ + ۱۲ + ۴ ساده',
    glassColor: '#8bd9f7',
    meshType: 'بدون توری',
    beadType: 'زهوار تک‌حالته',
    selectedPart: null,
    dimensionColor: '#000',
    previewMullion: null,
    dimensionFontSize: 60,
    dimensionFontWeight: 'bold',
    dimensionFontFamily: 'Roboto, sans-serif',
    dimensionFontWeight: '500',
    panX: 0, panY: 0,
    openingLineColor: '#1672f9',
  };
  const frameOptions = [
    { name: 'فریم معمولی پنجره', size: 60 },
    { name: 'فریم درب چاق', size: 80 },
    { name: 'سوپر فریم', size: 70 },
    { name: 'فریم بازسازی', size: 90 },
    { name: 'فریم پهن', size: 100 }
  ];
  const glassOptions = [
    { name: '۴ + ۱۲ + ۴ ساده', color: '#8bd9f7' },
    { name: 'شیشه دودی', color: '#65717e' },
    { name: 'شیشه برنز', color: '#a87950' },
    { name: 'شیشه آبی', color: '#429bd2' },
    { name: 'شیشه سبز', color: '#71b99a' },
    { name: 'شیشه رفلکس', color: '#b4d8e7' }
  ];
  const meshOptions = ['بدون توری', 'توری پلیسه', 'توری ثابت'];
  const beadOptions = ['زهوار تک‌حالته', 'زهوار دوحالته', 'زهوار سه‌حالته'];
  const shapeNames = {
    triangle: 'مثلث', 'triangle-inverted': 'مثلث وارونه',
    circle: 'دایره', ellipse: 'بیضی', trapezoid: 'ذوزنقه',
    'trapezoid-inverted': 'ذوزنقه وارونه', parallelogram: 'متوازی‌الاضلاع',
    'parallelogram-inverted': 'متوازی‌الاضلاع وارونه', rhombus: 'لوزی',
    pentagon: 'پنج‌ضلعی', hexagon: 'شش‌ضلعی', heptagon: 'هفت‌ضلعی',
    octagon: 'هشت‌ضلعی'
  };
  const dimensionLabels = [];
  function openDimensionEditor(type, index = null, value = 0) {
    let dialog = $('dimensionDialog');
    if (!dialog) {
      document.body.insertAdjacentHTML('beforeend', `
      <dialog id="dimensionDialog" class="dimension-dialog">
        <form id="dimensionForm">
          <h3 id="dimensionTitle">ویرایش اندازه</h3>
          <label for="dimensionValue">مقدار جدید</label>
          <input id="dimensionValue" type="number" min="1" max="6000" required>
          <div class="dimension-actions">
            <button type="submit" class="primary">تغییر</button>
            <button type="button" id="cancelDimension">لغو</button>
          </div>
        </form>
      </dialog>
    `);
      $('cancelDimension').addEventListener('click', () => {
        $('dimensionDialog').close();
      });
      $('dimensionForm').addEventListener('submit', e => {
        e.preventDefault();
        const value = Number($('dimensionValue').value);
        const edit = state.editingDimension;
        if (!edit || !Number.isFinite(value) || value < 1 || value > 6000) {
          alert('عدد باید بین ۱ تا ۶۰۰۰ باشد.');
          return;
        }
        saveHistory();
        if (edit.type === 'width') {
          state.width = value;
        } else if (edit.type === 'height') {
          state.height = value;
        } else if (edit.type === 'column') {
          const items = [...state.mullions].sort((a, b) => a.pos - b.pos);
          const bounds = [0, ...items.map(m => m.pos), 1];
          const i = edit.index;
          const minGap = 0.04;
          const size = value / state.width;
          if (i < items.length) {
            const min = bounds[i] + minGap;
            const max = bounds[i + 2] - minGap;
            if (min > max) {
              state.history.pop();
              alert('فضای کافی برای تغییر این ستون وجود ندارد.');
              return;
            }
            items[i].pos = Math.max(min, Math.min(max, bounds[i] + size));
          } else {
            const min = bounds[i - 1] + minGap;
            const max = 1 - minGap;
            if (min > max) {
              state.history.pop();
              alert('فضای کافی برای تغییر این ستون وجود ندارد.');
              return;
            }
            items[i - 1].pos = Math.max(min, Math.min(max, 1 - size));
          }
        } else if (edit.type === 'row') {
          const items = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
          const bounds = [0, ...items.map(m => m.pos), 1];
          const i = edit.index;
          const minGap = 0.04;
          const size = value / state.height;
          if (i < items.length) {
            const min = bounds[i] + minGap;
            const max = bounds[i + 2] - minGap;
            if (min > max) {
              state.history.pop();
              alert('فضای کافی برای تغییر این ردیف وجود ندارد.');
              return;
            }
            items[i].pos = Math.max(min, Math.min(max, bounds[i] + size));
          } else {
            const min = bounds[i - 1] + minGap;
            const max = 1 - minGap;
            if (min > max) {
              state.history.pop();
              alert('فضای کافی برای تغییر این ردیف وجود ندارد.');
              return;
            }
            items[i - 1].pos = Math.max(min, Math.min(max, 1 - size));
          }
        }
        state.editingDimension = null;
        $('dimensionDialog').close();
        syncInputs();
        draw();
      });
    }
    state.editingDimension = { type, index };
    $('dimensionTitle').textContent = {
      width: 'ویرایش عرض کل',
      height: 'ویرایش ارتفاع کل',
      column: 'ویرایش عرض ستون',
      row: 'ویرایش ارتفاع ردیف'
    }[type];
    $('dimensionValue').value = Math.round(value);
    activePointers.clear();
    panStart = null;
    pinchStart = null;
    state.drag = null;
    $('dimensionDialog').showModal();
    $('dimensionValue').focus();
  }
  function dimensionText(value, x, y, size, type, index = null) {
    text(en(value), x, y, size);
    dimensionLabels.push({
      x, y, type, index,
      radius: Math.max(16, size)
    });
  }
  function en(value) {
    return String(value)
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }
  const fa = n => String(Math.round(n)).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const clone = value => JSON.parse(JSON.stringify(value));
  function snapshot() {
    return {
      width: state.width,
      height: state.height,
      count: state.count,
      shape: state.shape || 'rectangle',
      mullions: clone(state.mullions),
      horizontalMullions: clone(state.horizontalMullions),
      openings: clone(state.openings),
      selected: clone(state.selected),
      nextId: state.nextId,
      frame: state.frame,
      frameType: state.frameType,
      glassType: state.glassType,
      glassColor: state.glassColor,
      meshType: state.meshType,
      beadType: state.beadType,
      selectedPart: state.selectedPart,
      sideFrames: clone(state.sideFrames),
    };
  }
  function saveHistory() {
    state.history.push(snapshot());
    if (state.history.length > 80) state.history.shift();
    state.future = [];
  }
  function restore(s) {
    Object.assign(state, clone(s));
    state.drag = null;
    renderSettings();
    syncInputs();
    draw();
  }
  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    restore(state.history.pop());
  }
  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    restore(state.future.pop());
  }
  function resizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function geom() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const padX = Math.min(115, w * .2);
    const padY = Math.min(90, h * .16);
    const side = state.sideFrames[0] || null;
    const gap = side ? 70 : 0;
    const totalWidth = side
      ? side.direction === 'right'
        ? state.width + gap + side.width
        : Math.max(state.width, side.width)
      : state.width;
    const totalHeight = side
      ? side.direction === 'bottom'
        ? state.height + gap + side.height
        : Math.max(state.height, side.height)
      : state.height;
    const scale = Math.max(.01, Math.min(
      (w - padX * 2) / (totalWidth + 30),
      (h - padY * 2) / (totalHeight + 30)
    ) * state.zoom);
    const fw = state.width * scale;
    const fh = state.height * scale;
    const groupX = (w - totalWidth * scale) / 2 + (state.panX || 0);
    const groupY = (h - totalHeight * scale) / 2 + (state.panY || 0);
    const x = groupX + (side && side.direction === 'bottom'
      ? (totalWidth - state.width) * scale / 2 : 0);
    const y = groupY + (side && side.direction === 'right'
      ? (totalHeight - state.height) * scale / 2 : 0);
    return {
      w, h, scale, x, y, fw, fh,
      t: Math.max(1, state.frame * scale),
      side: side ? {
        direction: side.direction,
        x: side.direction === 'right'
          ? x + fw + gap * scale
          : groupX + (totalWidth - side.width) * scale / 2,
        y: side.direction === 'bottom'
          ? y + fh + gap * scale
          : groupY + (totalHeight - side.height) * scale / 2,
        fw: side.width * scale,
        fh: side.height * scale,
        t: Math.max(1, state.frame * scale),
        scale,
        connector: {
          x: side.direction === 'right'
            ? x + fw
            : groupX + (totalWidth - side.width) * scale / 2,
          y: side.direction === 'bottom'
            ? y + fh
            : groupY + (totalHeight - side.height) * scale / 2,
          w: side.direction === 'right'
            ? gap * scale
            : side.width * scale,
          h: side.direction === 'bottom'
            ? gap * scale
            : side.height * scale
        }
      } : null
    };
  }
  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function text(s, x, y, size, align = 'center') {
    ctx.font = `${state.dimensionFontWeight} ${size}px ${state.dimensionFontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function getInner() {
    const g = geom();
    return {
      x: g.x + g.t,
      y: g.y + g.t,
      w: Math.max(0, g.fw - 2 * g.t),
      h: Math.max(0, g.fh - 2 * g.t)
    };
  }
  function getOpeningBounds(o, inner) {
    const leftM = o.leftId == null ? null :
      state.mullions.find(m => m.id === o.leftId);
    const rightM = o.rightId == null ? null :
      state.mullions.find(m => m.id === o.rightId);
    const topM = o.topId == null ? null :
      state.horizontalMullions.find(m => m.id === o.topId);
    const bottomM = o.bottomId == null ? null :
      state.horizontalMullions.find(m => m.id === o.bottomId);
    const g = geom();
    const { x, y, fw, fh, t } = g;
    const leftPos = leftM ? leftM.pos : 0;
    const rightPos = rightM ? rightM.pos : 1;
    const topPos = topM ? topM.pos : 0;
    const bottomPos = bottomM ? bottomM.pos : 1;
    const mw = Math.max(3, state.mullionWidth * geom().scale);
    const startX = leftM ? inner.x + leftPos * inner.w + mw * 0.3 : x + t * 0.98;
    const endX = rightM ? inner.x + rightPos * inner.w - mw * 0.3 : x + fw - t * 0.98;
    const startY = topM ? inner.y + topPos * inner.h + mw * 0.3 : y + t * 0.98;
    const endY = bottomM ? inner.y + bottomPos * inner.h - mw * 0.3 : y + fh - t * 0.98;
    return {
      leftM, rightM, topM, bottomM,
      x: startX,
      y: startY,
      w: Math.max(0, endX - startX),
      h: Math.max(0, endY - startY)
    };
  }
  function pointInShape(p, x, y, w, h, inset = 0) {
    const type = state.shape || 'rectangle';
    if (type === 'rectangle') {
      return p.x >= x + inset && p.x <= x + w - inset &&
        p.y >= y + inset && p.y <= y + h - inset;
    }
    if (type === 'circle' || type === 'ellipse') {
      const rx = Math.max(1, w / 2 - inset);
      const ry = Math.max(1, h / 2 - inset);
      return ((p.x - (x + w / 2)) / rx) ** 2 +
        ((p.y - (y + h / 2)) / ry) ** 2 <= 1;
    }
    const pts = shapePoints(type, x, y, w, h, inset);
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (((a.y > p.y) !== (b.y > p.y)) &&
        p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function glassAt(p) {
    const g = geom();
    const inner = getInner();
    if (!inner.w || !inner.h ||
      !pointInShape(p, g.x, g.y, g.fw, g.fh, g.t)) return null;
    return {
      x: (p.x - inner.x) / inner.w,
      y: (p.y - inner.y) / inner.h
    };
  }
  function getCellAt(gp) {
    const vertical = [...state.mullions].sort((a, b) => a.pos - b.pos);
    const horizontal = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
    let col = vertical.findIndex(m => gp.x < m.pos);
    if (col === -1) col = vertical.length;
    let row = horizontal.findIndex(m => gp.y < m.pos);
    if (row === -1) row = horizontal.length;
    return {
      leftId: col === 0 ? null : vertical[col - 1].id,
      rightId: col === vertical.length ? null : vertical[col].id,
      topId: row === 0 ? null : horizontal[row - 1].id,
      bottomId: row === horizontal.length ? null : horizontal[row].id
    };
  }
  function sameCell(a, b) {
    return a.leftId === b.leftId &&
      a.rightId === b.rightId &&
      a.topId === b.topId &&
      a.bottomId === b.bottomId;
  }
  function shapePoints(type, x, y, w, h, inset = 0) {
    const X = x + inset, Y = y + inset, W = Math.max(1, w - inset * 2), H = Math.max(1, h - inset * 2);
    const points = {
      triangle: [[.5, 0], [1, 1], [0, 1]],
      'triangle-inverted': [[0, 0], [1, 0], [.5, 1]],
      trapezoid: [[.25, 0], [.75, 0], [1, 1], [0, 1]],
      'trapezoid-inverted': [[0, 0], [1, 0], [.75, 1], [.25, 1]],
      parallelogram: [[.25, 0], [1, 0], [.75, 1], [0, 1]],
      'parallelogram-inverted': [[0, 0], [.75, 0], [1, 1], [.25, 1]],
      rhombus: [[.5, 0], [1, .5], [.5, 1], [0, .5]]
    };
    if (points[type]) return points[type].map(([a, b]) => ({ x: X + a * W, y: Y + b * H }));
    const n = ({ pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 })[type] || 6;
    return Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / n;
      return { x: X + W / 2 + Math.cos(a) * W * .48, y: Y + H / 2 + Math.sin(a) * H * .48 };
    });
  }
  function getInsetPoints(points, inset) {
    if (!inset) return points.map(p => ({ ...p }));
    const n = points.length;
    if (n < 3) return points.map(p => ({ ...p }));
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    const orientation = area >= 0 ? 1 : -1;
    const edges = [];
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = orientation * -dy / length;
      const ny = orientation * dx / length;
      edges.push({
        x: a.x + nx * inset,
        y: a.y + ny * inset,
        dx,
        dy
      });
    }
    const result = [];
    for (let i = 0; i < n; i++) {
      const prev = edges[(i + n - 1) % n];
      const curr = edges[i];
      const cross = prev.dx * curr.dy - prev.dy * curr.dx;
      if (Math.abs(cross) < 0.000001) {
        result.push({
          x: curr.x,
          y: curr.y
        });
        continue;
      }
      const qx = curr.x - prev.x;
      const qy = curr.y - prev.y;
      const factor = (qx * curr.dy - qy * curr.dx) / cross;
      result.push({
        x: prev.x + factor * prev.dx,
        y: prev.y + factor * prev.dy
      });
    }
    return result;
  }
  function traceShape(type, x, y, w, h, inset = 0) {
    ctx.beginPath();
    if (type === 'circle') {
      ctx.arc(
        x + w / 2,
        y + h / 2,
        Math.max(1, Math.min(w, h) / 2 - inset),
        0,
        Math.PI * 2
      );
      return;
    }
    if (type === 'ellipse') {
      if (!inset) {
        ctx.ellipse(
          x + w / 2,
          y + h / 2,
          w / 2,
          h / 2,
          0,
          0,
          Math.PI * 2
        );
        return;
      }
      const points = [];
      const count = 180;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count;
        points.push({
          x: x + w / 2 + w / 2 * Math.cos(angle),
          y: y + h / 2 + h / 2 * Math.sin(angle)
        });
      }
      const inner = getInsetPoints(points, inset);
      ctx.moveTo(inner[0].x, inner[0].y);
      inner.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      return;
    }
    const points = shapePoints(type, x, y, w, h, 0);
    const inner = getInsetPoints(points, inset);
    if (!inner.length) return;
    ctx.moveTo(inner[0].x, inner[0].y);
    inner.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }
  function ensureShapeDialog() {
    if (!$('polygonDialog')) document.body.insertAdjacentHTML('beforeend', `
      <dialog id="polygonDialog" class="dimension-dialog">
        <form id="polygonForm">
          <h3>ساخت شکل غیرمستطیل</h3>
          <label for="shapeType">نوع شکل</label>
          <select id="shapeType">
            <option value="triangle">مثلث</option><option value="triangle-inverted">مثلث وارونه</option>
            <option value="circle">دایره</option><option value="ellipse">بیضی</option>
            <option value="trapezoid">ذوزنقه</option><option value="trapezoid-inverted">ذوزنقه وارونه</option>
            <option value="parallelogram">متوازی‌الاضلاع</option><option value="parallelogram-inverted">متوازی‌الاضلاع وارونه</option>
            <option value="rhombus">لوزی</option><option value="pentagon">پنج‌ضلعی</option>
            <option value="hexagon">شش‌ضلعی</option><option value="heptagon">هفت‌ضلعی</option><option value="octagon">هشت‌ضلعی</option>
          </select>
          <label for="shapeWidth">عرض</label><input id="shapeWidth" type="number" min="30" max="6000" value="200" required>
          <label for="shapeHeight">ارتفاع</label><input id="shapeHeight" type="number" min="30" max="6000" value="150" required>
          <label for="shapeCount">تعداد</label><input id="shapeCount" type="number" min="1" max="20" value="1" required>
          <div class="dimension-actions"><button type="submit" class="primary">نمایش در کانواس</button><button type="button" id="cancelPolygon">لغو</button></div>
        </form>
      </dialog>`);
    let btn = $('polygonBtn');
    if (!btn && $('newBtn')) {
      $('newBtn').insertAdjacentHTML('afterend', ' <button type="button" id="polygonBtn" class="primary">＋ غیرمستطیل</button>');
      btn = $('polygonBtn');
    }
    if (!btn || btn.dataset.shapeReady) return;
    btn.dataset.shapeReady = '1';
    btn.addEventListener('click', () => {
      $('shapeWidth').value = state.width; $('shapeHeight').value = state.height; $('shapeCount').value = state.count;
      $('shapeType').value = state.shape === 'rectangle' ? 'triangle' : state.shape;
      $('polygonDialog').showModal();
    });
    $('cancelPolygon').addEventListener('click', () => $('polygonDialog').close());
    $('polygonForm').addEventListener('submit', e => {
      e.preventDefault();
      const w = Number($('shapeWidth').value), h = Number($('shapeHeight').value), c = Number($('shapeCount').value);
      if (![w, h, c].every(Number.isFinite) || w < 30 || h < 30 || w > 6000 || h > 6000 || c < 1 || c > 20) {
        alert('عرض و ارتفاع باید بین ۳۰ تا ۶۰۰۰ و تعداد بین ۱ تا ۲۰ باشد.'); return;
      }
      saveHistory();
      state.width = w; state.height = h; state.count = Math.floor(c); state.shape = $('shapeType').value;
      state.mullions = []; state.horizontalMullions = []; state.openings = []; state.selected = null; state.selectedPart = null;
      state.zoom = 1; state.tool = 'select'; state.drag = null;
      syncInputs(); renderSettings(); draw(); $('polygonDialog').close();
    });
  }
  function drawSideFrame() {
    const g = geom();
    const s = g.side;
    if (!s) return;
    const { x, y, fw, fh, t } = s;
    const border = Math.max(1, state.glassBorder * s.scale);
    const inner = {
      x: x + t,
      y: y + t,
      w: Math.max(0, fw - 2 * t),
      h: Math.max(0, fh - 2 * t)
    };
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, fw, fh);
    ctx.strokeRect(x, y, fw, fh);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + t, y + t);
    ctx.moveTo(x + fw, y);
    ctx.lineTo(x + fw - t, y + t);
    ctx.moveTo(x, y + fh);
    ctx.lineTo(x + t, y + fh - t);
    ctx.moveTo(x + fw, y + fh);
    ctx.lineTo(x + fw - t, y + fh - t);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
    ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
    const vertical = [...(s.mullions || [])].sort((a, b) => a.pos - b.pos);
    const horizontal = [...(s.horizontalMullions || [])].sort((a, b) => a.pos - b.pos);
    const mw = Math.max(3, state.mullionWidth * s.scale);
    const xs = [0, ...vertical.map(m => m.pos), 1];
    const ys = [0, ...horizontal.map(m => m.pos), 1];
    for (let r = 0; r < ys.length - 1; r++) {
      for (let c = 0; c < xs.length - 1; c++) {
        const left = inner.x + xs[c] * inner.w + (c ? mw / 2 : 0);
        const right = inner.x + xs[c + 1] * inner.w - (c < vertical.length ? mw / 2 : 0);
        const top = inner.y + ys[r] * inner.h + (r ? mw / 2 : 0);
        const bottom = inner.y + ys[r + 1] * inner.h - (r < horizontal.length ? mw / 2 : 0);
        if (right <= left || bottom <= top) continue;
        ctx.fillStyle = '#fff';
        ctx.fillRect(left, top, right - left, bottom - top);
        ctx.strokeRect(left, top, right - left, bottom - top);
        const gx = left + border;
        const gy = top + border;
        const gw = Math.max(0, right - left - border * 2);
        const gh = Math.max(0, bottom - top - border * 2);
        ctx.fillStyle = state.glassColor || '#8bd9f7';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeRect(gx, gy, gw, gh);
        // چهار نیم‌ساز گوشه‌های نوار شیشه
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(gx, gy);
        ctx.moveTo(right, top);
        ctx.lineTo(gx + gw, gy);
        ctx.moveTo(right, bottom);
        ctx.lineTo(gx + gw, gy + gh);
        ctx.moveTo(left, bottom);
        ctx.lineTo(gx, gy + gh);
        ctx.stroke();
      }
    }
    vertical.forEach(m => {
      const mx = inner.x + m.pos * inner.w;
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx - mw / 2, inner.y, mw, inner.h);
      ctx.strokeRect(mx - mw / 2, inner.y, mw, inner.h);
    });
    horizontal.forEach(m => {
      const my = inner.y + m.pos * inner.h;
      ctx.fillStyle = '#fff';
      ctx.fillRect(inner.x, my - mw / 2, inner.w, mw);
      ctx.strokeRect(inner.x, my - mw / 2, inner.w, mw);
    });
    ctx.restore();
  }
  function draw() {
    if (!canvas.clientWidth) return;
    const g = geom();
    const { w, h, x, y, fw, fh, t } = g;
    dimensionLabels.length = 0;
    const inner = {
      x: x + t,
      y: y + t,
      w: Math.max(0, fw - 2 * t),
      h: Math.max(0, fh - 2 * t)
    };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.lineJoin = 'miter';
    drawWindow(g, inner);
    if (g.side?.connector) {
      const c = g.side.connector;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    drawSideFrame();
    if (state.previewMullion && !state.drag) {
      const p = state.previewMullion;
      const gp = glassAt(p);
      if (gp && (state.tool === 'mullion' || state.tool === 'horizontalMullion')) {
        const cell = getCellAt(gp);
        const vertical = state.tool === 'mullion';
        const pos = vertical
          ? (p.x - inner.x) / inner.w
          : (p.y - inner.y) / inner.h;
        const mw = Math.max(3, state.mullionWidth * g.scale);
        ctx.save();
        ctx.strokeStyle = '#1672f9';
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        if (vertical) {
          const mx = inner.x + pos * inner.w;
          const my = inner.y + inner.h / 2;
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(22,114,249,.18)';
          ctx.strokeStyle = '#1672f9';
          ctx.fillRect(mx - mw / 2, inner.y, mw, inner.h);
          ctx.strokeRect(mx - mw / 2, inner.y, mw, inner.h);
          ctx.beginPath();
          ctx.moveTo(x, my);
          ctx.lineTo(x + fw, my);
          ctx.stroke();
          const left = Math.floor(pos * state.width);
          const right = state.width - left;
          ctx.fillStyle = '#1672f9';
          ctx.font = `${state.dimensionFontWeight} ${Math.max(16, state.dimensionFontSize * g.scale)}px ${state.dimensionFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const leftText = String(left);
          const rightText = String(right);
          ctx.fillText(leftText, (inner.x + mx) / 2, my - 8);
          ctx.fillText(rightText, (mx + inner.x + inner.w) / 2, my - 8);
        } else {
          const my = inner.y + pos * inner.h;
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(22,114,249,.18)';
          ctx.strokeStyle = '#1672f9';
          ctx.fillRect(inner.x, my - mw / 2, inner.w, mw);
          ctx.strokeRect(inner.x, my - mw / 2, inner.w, mw);
          const top = Math.floor(pos * state.height);
          const bottom = state.height - top;
          ctx.beginPath();
          ctx.moveTo(inner.x + inner.w / 2, y);
          ctx.lineTo(inner.x + inner.w / 2, y + fh);
          ctx.stroke();
          ctx.fillStyle = '#1672f9';
          ctx.font = `${state.dimensionFontWeight} ${Math.max(16, state.dimensionFontSize * g.scale)}px ${state.dimensionFontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(String(top), inner.x + inner.w / 2 + 12, (y + my) / 2);
          ctx.fillText(String(bottom), inner.x + inner.w / 2 + 12, (my + y + fh) / 2);
        }
        ctx.restore();
      }
    }
    if (state.drag) {
      const d = state.drag;
      ctx.save();
      if ((state.shape || 'rectangle') !== 'rectangle') {
        traceShape(state.shape, x, y, fw, fh, t);
        ctx.clip();
      }
      ctx.strokeStyle = '#1672f9';
      ctx.fillStyle = 'rgba(22,114,249,.18)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      const fontSize = Math.max(16, state.dimensionFontSize * g.scale);
      ctx.font = `${state.dimensionFontWeight} ${fontSize}px ${state.dimensionFontFamily}`;
      ctx.fillStyle = '#1672f9';
      ctx.textBaseline = 'middle';
      if (d.type === 'mullion' && Number.isFinite(d.previewPos)) {
        const mx = inner.x + d.previewPos * inner.w;
        const my = inner.y + inner.h / 2;
        const mw = Math.max(3, state.mullionWidth * g.scale);
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(mx - mw / 2, inner.y, mw, inner.h);
        ctx.strokeRect(mx - mw / 2, inner.y, mw, inner.h);
        ctx.beginPath();
        ctx.moveTo(x, my);
        ctx.lineTo(x + fw, my);
        ctx.stroke();
        const left = Math.round(d.previewPos * state.width);
        const right = state.width - left;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1672f9';
        ctx.fillText(String(left), (inner.x + mx) / 2, my - 8);
        ctx.fillText(String(right), (mx + inner.x + inner.w) / 2, my - 8);
      } else if (d.type === 'horizontalMullion' && Number.isFinite(d.previewPos)) {
        const my = inner.y + d.previewPos * inner.h;
        const mh = Math.max(3, state.mullionWidth * g.scale);
        const mx = inner.x + inner.w / 2;
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(inner.x, my - mh / 2, inner.w, mh);
        ctx.strokeRect(inner.x, my - mh / 2, inner.w, mh);
        ctx.beginPath();
        ctx.moveTo(mx, y);
        ctx.lineTo(mx, y + fh);
        ctx.stroke();
        const top = Math.round(d.previewPos * state.height);
        const bottom = state.height - top;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1672f9';
        ctx.fillText(String(top), mx + 12, (y + my) / 2);
        ctx.fillText(String(bottom), mx + 12, (my + y + fh) / 2);
      } else if (d.type === 'opening' && d.current) {
        const gp = glassAt(d.current);
        if (gp) {
          const cell = getCellAt(gp);
          const b = getOpeningBounds(cell, inner);
          const t = Math.max(2, g.t * 0.35);
          const bead = Math.max(2, t * 0.35);
          const drawMiterRect = (x, y, w, h, border, fill = true) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            if (fill) ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + border, y + border);
            ctx.moveTo(x + w, y);
            ctx.lineTo(x + w - border, y + border);
            ctx.moveTo(x + w, y + h);
            ctx.lineTo(x + w - border, y + h - border);
            ctx.moveTo(x, y + h);
            ctx.lineTo(x + border, y + h - border);
            ctx.stroke();
          };
          ctx.save();
          ctx.strokeStyle = '#1672f9';
          ctx.lineWidth = 2;
          // فریم اصلی
          ctx.fillStyle = 'rgba(22,114,249,.12)';
          drawMiterRect(b.x, b.y, b.w, b.h, t);
          // نوار شیشه اول
          const glassInset = t * 1.8;
          const sx = b.x + t + glassInset;
          const sy = b.y + t + glassInset;
          const sw = Math.max(0, b.w - 2 * (t + glassInset));
          const sh = Math.max(0, b.h - 2 * (t + glassInset));
          const half = Math.max(t / 2, 1);
          ctx.fillStyle = 'rgba(22,114,249,.08)';
          drawMiterRect(sx, sy, sw, sh, Math.max(half, t * 0.35));
          // نوار شیشه داخلی
          const inset2 = Math.max(half, bead * 2);
          const sx2 = sx + inset2;
          const sy2 = sy + inset2;
          const sw2 = Math.max(0, sw - 2 * inset2);
          const sh2 = Math.max(0, sh - 2 * inset2);
          // چهار نیم‌ساز از گوشه‌های فریم تا مرز نوار داخلی
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(sx2, sy2);
          ctx.moveTo(b.x + b.w, b.y);
          ctx.lineTo(sx2 + sw2, sy2);
          ctx.moveTo(b.x + b.w, b.y + b.h);
          ctx.lineTo(sx2 + sw2, sy2 + sh2);
          ctx.moveTo(b.x, b.y + b.h);
          ctx.lineTo(sx2, sy2 + sh2);
          ctx.stroke();
          // مرز نوار داخلی، بدون پس‌زمینه شیشه وسط
          ctx.fillStyle = 'rgba(22,114,249,.06)';
          drawMiterRect(sx2, sy2, sw2, sh2, half, false);
          ctx.restore();
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.restore();
    drawDimensions(g);
    // $('status').textContent =
    //   `عرض: ${fa(state.width)} | ارتفاع: ${fa(state.height)} | تعداد: ${fa(state.count)} | مولین عمودی: ${fa(state.mullions.length)} | مولین افقی: ${fa(state.horizontalMullions.length)}`;
  }
  function drawMullions(g, inner) {
    const mw = Math.max(3, state.mullionWidth * g.scale);
    state.mullions.forEach((m, i) => {
      const mx = inner.x + m.pos * inner.w;
      const bx = mx - mw / 2;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(bx, inner.y, mw, inner.h);
      ctx.strokeRect(bx, inner.y, mw, inner.h);
      if (state.selected?.type === 'mullion' && state.selected.index === i) {
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(bx - 2, inner.y, mw + 4, inner.h);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(bx - 2, inner.y + 1, mw + 4, inner.h - 2);
      }
    });
    state.horizontalMullions.forEach((m, i) => {
      const my = inner.y + m.pos * inner.h;
      const by = my - mw / 2;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(inner.x, by, inner.w, mw);
      ctx.strokeRect(inner.x, by, inner.w, mw);
      if (state.selected?.type === 'horizontalMullion' && state.selected.index === i) {
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(inner.x, by - 2, inner.w, mw + 4);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(inner.x + 1, by - 2, inner.w - 2, mw + 4);
      }
    });
    ctx.restore();
  }
  function drawWindow(g, inner) {
    const { x, y, fw, fh, t } = g;
    const type = state.shape || 'rectangle';
    const scale = g.scale || 1;
    const glassBorder = Math.max(1, state.glassBorder * scale);
    const mullionWidth = Math.max(3, state.mullionWidth * scale);
    const isRectangle = type === 'rectangle';
    ctx.save();
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    if (isRectangle) {
      // فریم اصلی
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, fw, fh);
      ctx.strokeRect(x, y, fw, fh);
      // نیم‌سازهای فریم
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + t, y + t);
      ctx.moveTo(x + fw, y);
      ctx.lineTo(x + fw - t, y + t);
      ctx.moveTo(x, y + fh);
      ctx.lineTo(x + t, y + fh - t);
      ctx.moveTo(x + fw, y + fh);
      ctx.lineTo(x + fw - t, y + fh - t);
      ctx.stroke();
      // نوار داخلی شیشه
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
      // نیم‌سازهای نوار شیشه
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(inner.x + glassBorder, inner.y + glassBorder);
      ctx.moveTo(inner.x + inner.w, inner.y);
      ctx.lineTo(inner.x + inner.w - glassBorder, inner.y + glassBorder);
      ctx.moveTo(inner.x, inner.y + inner.h);
      ctx.lineTo(inner.x + glassBorder, inner.y + inner.h - glassBorder);
      ctx.moveTo(inner.x + inner.w, inner.y + inner.h);
      ctx.lineTo(inner.x + inner.w - glassBorder, inner.y + inner.h - glassBorder);
      ctx.stroke();
      // شیشه هر قسمت
      const vertical = [...state.mullions].sort((a, b) => a.pos - b.pos);
      const horizontal = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
      for (let r = 0; r <= horizontal.length; r++) {
        for (let c = 0; c <= vertical.length; c++) {
          const left = c === 0
            ? inner.x
            : inner.x + vertical[c - 1].pos * inner.w + mullionWidth / 2;
          const right = c === vertical.length
            ? inner.x + inner.w
            : inner.x + vertical[c].pos * inner.w - mullionWidth / 2;
          const top = r === 0
            ? inner.y
            : inner.y + horizontal[r - 1].pos * inner.h + mullionWidth / 2;
          const bottom = r === horizontal.length
            ? inner.y + inner.h
            : inner.y + horizontal[r].pos * inner.h - mullionWidth / 2;
          if (right - left <= glassBorder * 2 ||
            bottom - top <= glassBorder * 2) continue;
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 0.7;
          ctx.fillRect(left, top, right - left, bottom - top);
          ctx.strokeRect(left, top, right - left, bottom - top);
          ctx.beginPath();
          ctx.moveTo(left, top);
          ctx.lineTo(left + glassBorder, top + glassBorder);
          ctx.moveTo(right, top);
          ctx.lineTo(right - glassBorder, top + glassBorder);
          ctx.moveTo(left, bottom);
          ctx.lineTo(left + glassBorder, bottom - glassBorder);
          ctx.moveTo(right, bottom);
          ctx.lineTo(right - glassBorder, bottom - glassBorder);
          ctx.stroke();
          const gx = left + glassBorder;
          const gy = top + glassBorder;
          const gw = right - left - glassBorder * 2;
          const gh = bottom - top - glassBorder * 2;
          ctx.fillStyle = state.glassColor || '#8bd9f7';
          ctx.fillRect(gx, gy, gw, gh);
          ctx.strokeStyle = state.selectedPart === 'glass' ? '#1672f9' : '#111';
          ctx.lineWidth = state.selectedPart === 'glass' ? 2 : 0.7;
          ctx.strokeRect(gx, gy, gw, gh);
          if (state.selectedPart === 'glass') {
            ctx.fillStyle = 'rgba(22,114,249,.22)';
            ctx.fillRect(gx, gy, gw, gh);
            ctx.strokeStyle = '#1672f9';
            ctx.lineWidth = 2;
            ctx.strokeRect(gx, gy, gw, gh);
            ctx.lineWidth = 0.7;
          }
        }
      }
      // انتخاب شیشه
      if (state.selectedPart === 'glass') {
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(inner.x + 2, inner.y + 2,
          Math.max(0, inner.w - 4), Math.max(0, inner.h - 4));
        ctx.setLineDash([]);
      }
      if (state.selectedPart === 'frame') {
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(22,114,249,.12)';
        ctx.fillRect(x + 1, y + 1, fw - 2, fh - 2);
        ctx.strokeRect(x + 1, y + 1, fw - 2, fh - 2);
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x + t, y + t);
        ctx.moveTo(x + fw - 1, y + 1);
        ctx.lineTo(x + fw - t, y + t);
        ctx.moveTo(x + 1, y + fh - 1);
        ctx.lineTo(x + t, y + fh - t);
        ctx.moveTo(x + fw - 1, y + fh - 1);
        ctx.lineTo(x + fw - t, y + fh - t);
        ctx.stroke();
        ctx.strokeRect(inner.x + 1, inner.y + 1, inner.w - 2, inner.h - 2);
      }
    } else {
      // فریم اصلی شکل هندسی
      traceShape(type, x, y, fw, fh);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = state.selectedPart === 'frame' ? '#1672f9' : '#111';
      ctx.lineWidth = state.selectedPart === 'frame' ? 2 : 1;
      ctx.stroke();
      // مرز داخلی فریم
      traceShape(type, x, y, fw, fh, t);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // شیشه و نوار هر قسمت
      drawCustomGlass(g, inner, glassBorder, mullionWidth);
      // نیم‌سازهای گوشه‌های فریم و شیشه
      if (type !== 'circle' && type !== 'ellipse') {
        const outer = shapePoints(type, x, y, fw, fh, 0);
        const frameInner = getInsetPoints(outer, t);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.beginPath();
        outer.forEach((p, i) => {
          const q = frameInner[i];
          if (!q) return;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        });
        ctx.stroke();
        const glassOuter = getInsetPoints(outer, t);
        const glassInner = getInsetPoints(outer, t + glassBorder);
        ctx.beginPath();
        glassOuter.forEach((p, i) => {
          const q = glassInner[i];
          if (!q) return;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        });
        ctx.stroke();
      }
    }
    if (!isRectangle) {
      ctx.save();
      traceShape(type, x, y, fw, fh, t);
      ctx.clip();
    }
    drawMullions(g, inner);
    // بازشوها
    state.openings.forEach((o, i) => {
      const b = getOpeningBounds(o, inner);
      const isDragging = state.drag?.type === 'opening' &&
        state.drag.index === i;
      let ox = b.x;
      let oy = b.y;
      let ow = b.w;
      let oh = b.h;
      const ft = Math.max(1, state.sashFrame * scale);
      const overlap = Math.min(3, ft * 0.15);
      if (!b.leftM) {
        ox -= overlap;
        ow += overlap;
      }
      if (!b.rightM) ow += overlap;
      if (!b.topM) {
        oy -= overlap;
        oh += overlap;
      }
      if (!b.bottomM) oh += overlap;
      ctx.save();
      if (isDragging) ctx.globalAlpha = 0.85;
      // فریم بازشو
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + ft, oy + ft);
      ctx.moveTo(ox + ow, oy);
      ctx.lineTo(ox + ow - ft, oy + ft);
      ctx.moveTo(ox, oy + oh);
      ctx.lineTo(ox + ft, oy + oh - ft);
      ctx.moveTo(ox + ow, oy + oh);
      ctx.lineTo(ox + ow - ft, oy + oh - ft);
      ctx.stroke();
      // نوار و شیشه بازشو
      const glassX = ox + ft;
      const glassY = oy + ft;
      const glassW = Math.max(0, ow - ft * 2);
      const glassH = Math.max(0, oh - ft * 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(glassX, glassY, glassW, glassH);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(glassX, glassY, glassW, glassH);
      ctx.beginPath();
      ctx.moveTo(glassX, glassY);
      ctx.lineTo(glassX + glassBorder, glassY + glassBorder);
      ctx.moveTo(glassX + glassW, glassY);
      ctx.lineTo(glassX + glassW - glassBorder, glassY + glassBorder);
      ctx.moveTo(glassX, glassY + glassH);
      ctx.lineTo(glassX + glassBorder, glassY + glassH - glassBorder);
      ctx.moveTo(glassX + glassW, glassY + glassH);
      ctx.lineTo(glassX + glassW - glassBorder, glassY + glassH - glassBorder);
      ctx.stroke();
      const gx = glassX + glassBorder;
      const gy = glassY + glassBorder;
      const gw = Math.max(0, glassW - glassBorder * 2);
      const gh = Math.max(0, glassH - glassBorder * 2);
      ctx.fillStyle = state.glassColor || '#8bd9f7';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(gx, gy, gw, gh);
      if (state.selected?.index === i && state.selected.type === 'openingGlass') {
        ctx.fillStyle = 'rgba(22,114,249,.22)';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.lineWidth = 1;
      }
      if (state.selected?.index === i && state.selected.type === 'openingFrame') {
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(22,114,249,.12)';
        ctx.fillRect(ox + 1, oy + 1, ow - 2, oh - 2);
        ctx.strokeRect(ox + 1, oy + 1, ow - 2, oh - 2);
        ctx.strokeRect(glassX + 1, glassY + 1, glassW - 2, glassH - 2);
        ctx.beginPath();
        ctx.moveTo(ox + 1, oy + 1);
        ctx.lineTo(ox + ft, oy + ft);
        ctx.moveTo(ox + ow - 1, oy + 1);
        ctx.lineTo(ox + ow - ft, oy + ft);
        ctx.moveTo(ox + 1, oy + oh - 1);
        ctx.lineTo(ox + ft, oy + oh - ft);
        ctx.moveTo(ox + ow - 1, oy + oh - 1);
        ctx.lineTo(ox + ow - ft, oy + oh - ft);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      drawOpeningLines(gx, gy, gw, gh, o.type || 'normal', o.direction, ox, oy, ow, oh, ft);
      // دستگیره و لولاها
      drawOpeningHardware(ox, oy, ow, oh, ft, scale, o.direction, gy, gh);
      ctx.restore();
    });
    if (!isRectangle) ctx.restore();
    ctx.restore();
  }
  function drawOpeningLines(gx, gy, gw, gh, olType, handlePosition, ox, oy, ow, oh, ft) {
    const scale = geom().scale || 1;
    const moveDistance = 30 * scale;
    const cx = ox + ow / 2;
    const cy = oy + oh / 2;
    ctx.save();
    ctx.strokeStyle = state.openingLineColor || '#1672f9';
    ctx.lineWidth = 5 * scale;
    ctx.lineCap = 'butt';
    ctx.setLineDash([]);
    ctx.beginPath();
    switch (handlePosition) {
      case 'left':
        ctx.moveTo(ox + ow, oy + ft);
        ctx.lineTo(ox + ft / 2, cy);
        ctx.lineTo(ox + ow, oy + oh - ft);
        break;
      case 'right':
        ctx.moveTo(ox, oy + ft);
        ctx.lineTo(ox + ow - ft / 2, cy);
        ctx.lineTo(ox, oy + oh - ft);
        break;
      case 'top':
        ctx.moveTo(ox + ft, oy + moveDistance);
        ctx.lineTo(cx, oy + oh - ft / 2);
        ctx.lineTo(ox + ow - ft, oy + moveDistance);
        break;
      case 'bottom':
        ctx.moveTo(ox + ft, oy + oh - moveDistance);
        ctx.lineTo(cx, oy + ft / 2);
        ctx.lineTo(ox + ow - ft, oy + oh - moveDistance);
        break;
    }
    ctx.stroke();
    ctx.restore();
  }
  function drawOpeningHardware(ox, oy, ow, oh, ft, scale, direction, gy, gh) {
    const vertical = direction === 'top' || direction === 'bottom';
    const handleRight = direction === 'right';
    const handleX = vertical ? ox + ow / 2 : handleRight ? ox + ow - ft / 2 : ox + ft / 2;
    const handleY = vertical
      ? direction === 'top' ? oy + oh - ft / 2 : oy + ft / 2
      : gy + gh / 2;
    const hingeX = direction === 'left' ? ox + ow : ox;
    const hingeY = direction === 'top' ? oy : oy + oh;
    function drawHardwareRect(x, y, w, h, radius = 6) {
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h / 2, w, h, radius);
      ctx.fill();
      ctx.stroke();
    }
    ctx.save();
    ctx.fillStyle = '#ddd';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = Math.max(1, scale);
    if (vertical) {
      [ox + ow * 0.15, ox + ow * 0.85].forEach(x => {
        drawHardwareRect(x - 17.5 * scale, hingeY, 35 * scale, 20 * scale, 6 * scale);
        drawHardwareRect(x + 17.5 * scale, hingeY, 35 * scale, 20 * scale, 6 * scale);
      });
    } else {
      [oy + oh * 0.15, oy + oh * 0.85].forEach(y => {
        drawHardwareRect(hingeX, y - 17.5 * scale, 20 * scale, 35 * scale, 6 * scale);
        drawHardwareRect(hingeX, y + 17.5 * scale, 20 * scale, 35 * scale, 6 * scale);
      });
    }
    const handleW = 25 * 1.5 * scale;
    const handleH = 50 * 1.2 * 1.8 * scale;
    const handleY1 = vertical ? handleY : handleY - 10 * scale;
    drawHardwareRect(
      handleX,
      handleY1,
      vertical ? handleH : handleW,
      vertical ? handleW : handleH,
      10 * scale
    );
    if (vertical) {
      drawHardwareRect(
        handleX + 55 * scale,
        handleY1,
        handleH,
        16 * 1.3 * scale,
        10 * scale
      );
    } else {
      drawHardwareRect(
        handleX,
        handleY1 + handleH - 55 * scale,
        16 * 1.3 * scale,
        handleH,
        10 * scale
      );
    }
    ctx.restore();
  }
  function drawCustomGlass(g, inner, glassBorder, mullionWidth) {
    const { x, y, fw, fh } = g;
    const type = state.shape || 'rectangle';
    const vertical = [...state.mullions].sort((a, b) => a.pos - b.pos);
    const horizontal = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
    const boundsX = [0, ...vertical.map(m => m.pos), 1];
    const boundsY = [0, ...horizontal.map(m => m.pos), 1];
    function clipPolygon(points, left, top, right, bottom) {
      const edges = [
        { inside: p => p.x >= left, intersect: (a, b) => ({ x: left, y: a.y + (b.y - a.y) * (left - a.x) / (b.x - a.x) }) },
        { inside: p => p.x <= right, intersect: (a, b) => ({ x: right, y: a.y + (b.y - a.y) * (right - a.x) / (b.x - a.x) }) },
        { inside: p => p.y >= top, intersect: (a, b) => ({ x: a.x + (b.x - a.x) * (top - a.y) / (b.y - a.y), y: top }) },
        { inside: p => p.y <= bottom, intersect: (a, b) => ({ x: a.x + (b.x - a.x) * (bottom - a.y) / (b.y - a.y), y: bottom }) }
      ];
      let result = points;
      for (const edge of edges) {
        const input = result;
        result = [];
        if (!input.length) break;
        let previous = input[input.length - 1];
        for (const current of input) {
          if (edge.inside(current)) {
            if (!edge.inside(previous)) result.push(edge.intersect(previous, current));
            result.push(current);
          } else if (edge.inside(previous)) {
            result.push(edge.intersect(previous, current));
          }
          previous = current;
        }
      }
      return result;
    }
    function polygonPath(points) {
      if (points.length < 3) return false;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      return true;
    }
    let outline;
    if (type === 'circle' || type === 'ellipse') {
      outline = [];
      for (let i = 0; i < 180; i++) {
        const angle = i * Math.PI * 2 / 180;
        outline.push({
          x: x + fw / 2 + Math.cos(angle) * (type === 'circle' ? Math.min(fw, fh) / 2 : fw / 2),
          y: y + fh / 2 + Math.sin(angle) * (type === 'circle' ? Math.min(fw, fh) / 2 : fh / 2)
        });
      }
    } else {
      outline = shapePoints(type, x, y, fw, fh, 0);
    }
    const frameInner = getInsetPoints(outline, g.t);
    if (!frameInner || frameInner.length < 3) return;
    ctx.save();
    traceShape(type, x, y, fw, fh, g.t);
    ctx.clip();
    for (let r = 0; r < boundsY.length - 1; r++) {
      for (let c = 0; c < boundsX.length - 1; c++) {
        const left = inner.x + boundsX[c] * inner.w + (c ? mullionWidth / 2 : 0);
        const right = inner.x + boundsX[c + 1] * inner.w - (c < vertical.length ? mullionWidth / 2 : 0);
        const top = inner.y + boundsY[r] * inner.h + (r ? mullionWidth / 2 : 0);
        const bottom = inner.y + boundsY[r + 1] * inner.h - (r < horizontal.length ? mullionWidth / 2 : 0);
        if (right - left <= glassBorder * 2 || bottom - top <= glassBorder * 2) continue;
        const pane = clipPolygon(frameInner, left, top, right, bottom);
        if (!polygonPath(pane)) continue;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        const glass = getInsetPoints(pane, glassBorder);
        if (!polygonPath(glass)) continue;
        ctx.fillStyle = state.glassColor || '#8bd9f7';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.beginPath();
        pane.forEach((p, i) => {
          const q = glass[i];
          if (!q) return;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
        });
        ctx.stroke();
      }
    }
    if (state.selectedPart === 'glass') {
      ctx.setLineDash([]);
      ctx.strokeStyle = '#1672f9';
      ctx.lineWidth = 3;
      traceShape(type, x, y, fw, fh, g.t + glassBorder);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function drawDimensions(g) {
    const { x, y, fw, fh, t } = g;
    const side = g.side;
    const inner = {
      x: x + t,
      y: y + t,
      w: Math.max(0, fw - 2 * t),
      h: Math.max(0, fh - 2 * t)
    };
    const color = state.dimensionColor;
    const size = Math.max(10, Math.min(14, inner.w * 0.035));
    const widthGap = 25;
    const heightGap = 25;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    function distributeSizes(bounds, total) {
      const raw = bounds.slice(0, -1).map((b, i) =>
        (bounds[i + 1] - b) * total
      );
      const values = raw.map(Math.floor);
      let remaining = total - values.reduce((sum, v) => sum + v, 0);
      const middle = (values.length - 1) / 2;
      const order = raw.map((v, i) => ({
        i,
        fraction: v - Math.floor(v),
        distance: Math.abs(i - middle)
      })).sort((a, b) =>
        a.distance - b.distance || b.fraction - a.fraction
      );
      for (let i = 0; i < remaining; i++) {
        values[order[i].i]++;
      }
      return values;
    }
    function drawWidth(x1, x2, yy, value, type = 'width', index = null) {
      const mid = (x1 + x2) / 2;
      const gap = Math.min((x2 - x1) / 2, widthGap);
      line(x1, yy, mid - gap, yy);
      line(mid + gap, yy, x2, yy);
      line(x1, yy - 10, x1, yy + 10);
      line(x2, yy - 10, x2, yy + 10);
      dimensionText(String(value), mid, yy, 18, type, index);
    }
    function drawHeight(yy1, yy2, xx, value, type = 'height', index = null) {
      const mid = (yy1 + yy2) / 2;
      const gap = Math.min((yy2 - yy1) / 2, heightGap);
      line(xx, yy1, xx, mid - gap);
      line(xx, mid + gap, xx, yy2);
      line(xx - 10, yy1, xx + 10, yy1);
      line(xx - 10, yy2, xx + 10, yy2);
      ctx.save();
      ctx.translate(xx - 15, mid);
      ctx.rotate(-Math.PI / 2);
      text(String(value), 0, 16, 18);
      ctx.restore();
      dimensionLabels.push({
        x: xx - 15, y: mid, type, index, radius: 20
      });
    }
    // فریم اصلی
    drawWidth(x, x + fw, side?.direction === 'bottom' ? y - 60 : y + fh + 60, state.width);
    drawHeight(y, y + fh, x - 60, state.height);
    // فریم جدید
    if (side) {
      const s = side;
      const sideWidth = state.sideFrames[0].width;
      const sideHeight = state.sideFrames[0].height;
      drawWidth(s.x, s.x + s.fw, s.y + s.fh + 60, sideWidth);
      drawHeight(s.y, s.y + s.fh, s.x + s.fw + 40, sideHeight);
    }
    // اندازه ستون‌ها
    if (state.mullions.length > 0) {
      const sortedV = [...state.mullions].sort((a, b) => a.pos - b.pos);
      const boundsV = [0, ...sortedV.map(m => m.pos), 1];
      const values = distributeSizes(boundsV, state.width);
      const columnY = side?.direction === 'bottom' ? y - 30 : y + fh + 30;
      boundsV.slice(0, -1).forEach((b, i) => {
        drawWidth(
          x + b * fw,
          x + boundsV[i + 1] * fw,
          columnY,
          values[i],
          'column',
          i
        );
      });
    }
    // اندازه ردیف‌ها
    if (state.horizontalMullions.length > 0) {
      const sortedH = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
      const boundsH = [0, ...sortedH.map(m => m.pos), 1];
      const values = distributeSizes(boundsH, state.height);
      const rowX = x - (side?.direction === 'bottom' ? 15 : 30);
      boundsH.slice(0, -1).forEach((b, i) => {
        drawHeight(
          y + b * fh,
          y + boundsH[i + 1] * fh,
          rowX,
          values[i],
          'row',
          i
        );
      });
    }
    ctx.restore();
  }
  function renderSettings() {
    const box = $('partSettings');
    if (!box) return;
    if (state.selectedPart === 'frame') {
      box.innerHTML = `
    <div class="part-heading">تنظیمات فریم</div>
    <div class="option-title">انتخاب مدل فریم</div>
    <div class="option-grid">
      ${frameOptions.map(o => `
        <button class="option-btn ${state.frameType === o.name ? 'active' : ''}"
          data-frame="${o.name}">${o.name}</button>
      `).join('')}
    </div>
    <p class="option-info">با انتخاب مدل، ضخامت فریم متناسب با نوع آن تنظیم می‌شود.</p>
  `;
      box.querySelectorAll('[data-frame]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveHistory();
          const option = frameOptions.find(o => o.name === btn.dataset.frame);
          state.frameType = option.name;
          state.frame = option.size;
          renderSettings();
          draw();
        });
      });
      return;
    }
    if (state.selectedPart === 'glass') {
      box.innerHTML = `
        <div class="part-heading">تنظیمات شیشه</div>
        <div class="option-title">ترکیب و رنگ شیشه</div>
        <div class="option-grid">
          ${glassOptions.map(o => `
            <button class="option-btn ${state.glassType === o.name ? 'active' : ''}"
              data-glass="${o.name}">${o.name}</button>
          `).join('')}
        </div>
        <div class="option-title">انتخاب توری</div>
        <div class="option-grid">
          ${meshOptions.map(o => `
            <button class="option-btn ${state.meshType === o ? 'active' : ''}"
              data-mesh="${o}">${o}</button>
          `).join('')}
        </div>
        <div class="option-title">انتخاب زهوار</div>
        <div class="option-grid">
          ${beadOptions.map(o => `
            <button class="option-btn ${state.beadType === o ? 'active' : ''}"
              data-bead="${o}">${o}</button>
          `).join('')}
        </div>
        <p class="option-info">رنگ انتخابی شیشه در نقشه نمایش داده می‌شود.</p>
      `;
      box.querySelectorAll('[data-glass]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveHistory();
          const option = glassOptions.find(o => o.name === btn.dataset.glass);
          state.glassType = option.name;
          state.glassColor = option.color;
          renderSettings();
          draw();
        });
      });
      box.querySelectorAll('[data-mesh]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveHistory();
          state.meshType = btn.dataset.mesh;
          renderSettings();
          draw();
        });
      });
      box.querySelectorAll('[data-bead]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveHistory();
          state.beadType = btn.dataset.bead;
          renderSettings();
          draw();
        });
      });
      return;
    }
    box.innerHTML = '<p class="hint">برای تنظیم فریم یا شیشه، روی آن در نقشه کلیک کنید.</p>';
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hit(p) {
    const g = geom();
    const inner = getInner();
    for (let i = state.openings.length - 1; i >= 0; i--) {
      const b = getOpeningBounds(state.openings[i], inner);
      const scale = g.scale || 1;
      const ft = Math.max(1, state.sashFrame * scale);
      const gb = Math.max(1, state.glassBorder * scale);
      const overlap = Math.min(3, ft * 0.15);
      const ox = b.x - (!b.leftM ? overlap : 0);
      const oy = b.y - (!b.topM ? overlap : 0);
      const ow = b.w + (!b.leftM ? overlap : 0) + (!b.rightM ? overlap : 0);
      const oh = b.h + (!b.topM ? overlap : 0) + (!b.bottomM ? overlap : 0);
      if (p.x < ox || p.x > ox + ow || p.y < oy || p.y > oy + oh) continue;
      // لبه بیرونی برای جابه‌جایی بازشو حفظ می‌شود
      if (
        p.x <= ox + 5 || p.x >= ox + ow - 5 ||
        p.y <= oy + 5 || p.y >= oy + oh - 5
      ) return { type: 'opening', index: i };
      const gx = ox + ft + gb;
      const gy = oy + ft + gb;
      const gw = Math.max(0, ow - 2 * (ft + gb));
      const gh = Math.max(0, oh - 2 * (ft + gb));
      if (p.x >= gx && p.x <= gx + gw &&
        p.y >= gy && p.y <= gy + gh) {
        return { type: 'openingGlass', index: i };
      }
      return { type: 'openingFrame', index: i };
    }
    for (let i = state.mullions.length - 1; i >= 0; i--) {
      const mx = inner.x + state.mullions[i].pos * inner.w;
      if (
        Math.abs(p.x - mx) < Math.max(12, state.mullionWidth * g.scale) &&
        p.y >= inner.y - 4 &&
        p.y <= inner.y + inner.h + 4
      ) return { type: 'mullion', index: i };
    }
    for (let i = state.horizontalMullions.length - 1; i >= 0; i--) {
      const my = inner.y + state.horizontalMullions[i].pos * inner.h;
      if (
        Math.abs(p.y - my) < 12 &&
        p.x >= inner.x && p.x <= inner.x + inner.w
      ) return { type: 'horizontalMullion', index: i };
    }
    if (pointInShape(p, g.x, g.y, g.fw, g.fh, g.t)) return { type: 'glass' };
    if (pointInShape(p, g.x, g.y, g.fw, g.fh)) return { type: 'frame' };
    return null;
  }
  let panStart = null;
  let pendingOpeningDrag = null;
  let activePointers = new Map();
  let pinchStart = null;
  canvas.addEventListener('pointerdown', e => {
    activePointers.set(e.pointerId, point(e));
    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      pinchStart = {
        distance: Math.hypot(
          pts[1].x - pts[0].x,
          pts[1].y - pts[0].y
        ),
        zoom: state.zoom
      };
      panStart = null;
    } else if (activePointers.size === 1 && e.button === 0) {
      const found = hit(point(e));
      panStart = found?.type === 'frame'
        ? {
          x: e.clientX,
          y: e.clientY,
          panX: state.panX,
          panY: state.panY
        }
        : null;
    }
  }, true);
  canvas.addEventListener('pointermove', e => {
    if (!activePointers.has(e.pointerId)) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      clearGesture(e);
      return;
    }
    activePointers.set(e.pointerId, point(e));
    if (activePointers.size === 2 && pinchStart) {
      const pts = [...activePointers.values()];
      const distance = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y
      );
      state.zoom = Math.max(
        0.35,
        Math.min(3, pinchStart.zoom * distance / pinchStart.distance)
      );
      draw();
    } else if (activePointers.size === 1 && panStart && !state.drag &&
      (Math.abs(e.clientX - panStart.x) > 3 ||
        Math.abs(e.clientY - panStart.y) > 3)) {
      state.panX = panStart.panX + e.clientX - panStart.x;
      state.panY = panStart.panY + e.clientY - panStart.y;
      draw();
    }
  }, true);
  function clearGesture(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchStart = null;
    if (!activePointers.size) panStart = null;
  }
  ['dimensionDialog', 'polygonDialog'].forEach(id => {
    const dialog = $(id);
    if (!dialog) return;
    dialog.addEventListener('close', () => {
      activePointers.clear();
      panStart = null;
      pinchStart = null;
      state.drag = null;
      state.previewMullion = null;
      draw();
    });
  });
  canvas.addEventListener('pointerup', clearGesture, true);
  canvas.addEventListener('pointercancel', clearGesture, true);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  }, { passive: false });
  canvas.addEventListener('pointerdown', e => {
    const p = point(e);
    const label = [...dimensionLabels].reverse().find(d =>
      Math.abs(p.x - d.x) <= d.radius &&
      Math.abs(p.y - d.y) <= d.radius
    );
    if (label) {
      let value = 0;
      if (label.type === 'width') {
        value = state.width;
      } else if (label.type === 'height') {
        value = state.height;
      } else if (label.type === 'column') {
        const items = [...state.mullions].sort((a, b) => a.pos - b.pos);
        const bounds = [0, ...items.map(m => m.pos), 1];
        value = state.width * (bounds[label.index + 1] - bounds[label.index]);
      } else if (label.type === 'row') {
        const items = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
        const bounds = [0, ...items.map(m => m.pos), 1];
        value = state.height * (bounds[label.index + 1] - bounds[label.index]);
      }
      openDimensionEditor(label.type, label.index, value);
      return;
    }
    const found = hit(p);
    if (!found && !glassAt(p)) {
      state.selectedPart = null;
      state.selected = null;
      renderSettings();
      draw();
      return;
    }
    pendingOpeningDrag = (found?.type === 'openingFrame' || found?.type === 'openingGlass')
      ? { index: found.index, start: p, original: clone(state.openings[found.index]), moved: false }
      : null;
    if (copiedItem && glassAt(p)) {
      const gp = glassAt(p);
      const cell = getCellAt(gp);
      if (copiedItem.type === 'opening' &&
        state.openings.some(o => sameCell(o, cell))) {
        $('status').textContent = 'این قسمت قبلاً بازشو دارد.';
        return;
      }
      saveHistory();
      if (copiedItem.type === 'opening') {
        const item = clone(copiedItem.item);
        Object.assign(item, cell);
        item.leftId = cell.leftId;
        item.rightId = cell.rightId;
        item.topId = cell.topId;
        item.bottomId = cell.bottomId;
        item.id = state.nextId++;
        state.openings.push(item);
        state.selected = {
          type: 'opening',
          index: state.openings.length - 1
        };
      } else if (copiedItem.type === 'mullion') {
        const item = clone(copiedItem.item);
        item.id = state.nextId++;
        item.pos = Math.max(.04, Math.min(.96,
          (p.x - getInner().x) / getInner().w
        ));
        state.mullions.push(item);
        state.mullions.sort((a, b) => a.pos - b.pos);
        state.selected = {
          type: 'mullion',
          index: state.mullions.findIndex(m => m.id === item.id)
        };
      } else {
        const item = clone(copiedItem.item);
        item.id = state.nextId++;
        item.pos = Math.max(.04, Math.min(.96,
          (p.y - getInner().y) / getInner().h
        ));
        state.horizontalMullions.push(item);
        state.horizontalMullions.sort((a, b) => a.pos - b.pos);
        state.selected = {
          type: 'horizontalMullion',
          index: state.horizontalMullions.findIndex(m => m.id === item.id)
        };
      }
      copiedItem = null;
      draw();
      $('status').textContent = 'کپی با موفقیت انجام شد.';
      return;
    }
    if (state.tool === 'mullion') {
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      const inner = getInner();
      const left = cell.leftId == null ? 0 : state.mullions.find(m => m.id === cell.leftId).pos;
      const right = cell.rightId == null ? 1 : state.mullions.find(m => m.id === cell.rightId).pos;
      const top = cell.topId == null ? 0 : state.horizontalMullions.find(m => m.id === cell.topId).pos;
      const bottom = cell.bottomId == null ? 1 : state.horizontalMullions.find(m => m.id === cell.bottomId).pos;
      saveHistory();
      const n = Number(state.toolCount || 1);
      for (let i = 1; i <= n; i++) {
        state.mullions.push({
          id: state.nextId++,
          pos: left + (right - left) * i / (n + 1),
          y1: top,
          y2: bottom
        });
      }
      state.mullions.sort((a, b) => a.pos - b.pos);
      state.selected = { type: 'mullion', index: state.mullions.length - 1 };
      state.tool = 'select';
      canvas.style.cursor = 'grab';
      draw();
      return;
    }
    if (state.tool === 'horizontalMullion') {
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      const left = cell.leftId == null ? 0 : state.mullions.find(m => m.id === cell.leftId).pos;
      const right = cell.rightId == null ? 1 : state.mullions.find(m => m.id === cell.rightId).pos;
      const top = cell.topId == null ? 0 : state.horizontalMullions.find(m => m.id === cell.topId).pos;
      const bottom = cell.bottomId == null ? 1 : state.horizontalMullions.find(m => m.id === cell.bottomId).pos;
      saveHistory();
      const n = Number(state.toolCount || 1);
      for (let i = 1; i <= n; i++) {
        state.horizontalMullions.push({
          id: state.nextId++,
          pos: top + (bottom - top) * i / (n + 1),
          x1: left,
          x2: right
        });
      }
      state.horizontalMullions.sort((a, b) => a.pos - b.pos);
      state.selected = {
        type: 'horizontalMullion',
        index: state.horizontalMullions.length - 1
      };
      state.tool = 'select';
      canvas.style.cursor = 'grab';
      draw();
      return;
    }
    if (state.tool === 'frenchWindow') {
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      if (state.openings.some(o => sameCell(o, cell))) {
        $('status').textContent = 'این قسمت قبلاً بازشو دارد.';
        return;
      }
      saveHistory();
      const leftPos = cell.leftId == null
        ? 0
        : state.mullions.find(m => m.id === cell.leftId).pos;
      const rightPos = cell.rightId == null
        ? 1
        : state.mullions.find(m => m.id === cell.rightId).pos;
      const id = state.nextId++;
      state.mullions.push({
        id,
        pos: (leftPos + rightPos) / 2
      });
      state.openings.push(
        { ...cell, rightId: id, direction: 'left', french: true },
        { ...cell, leftId: id, direction: 'right', french: true }
      );
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (state.tool === 'opening') {
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      if (state.openings.some(o => sameCell(o, cell))) {
        $('status').textContent = 'این قسمت قبلاً بازشو دارد.';
        return;
      }
      saveHistory();
      state.openings.push({
        ...cell,
        direction: state.openDirection || 'left'
      });
      state.selected = { type: 'opening', index: state.openings.length - 1 };
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (
      found?.type === 'frame' || found?.type === 'glass' ||
      found?.type === 'openingFrame' || found?.type === 'openingGlass'
    ) {
      state.selectedPart = found.type;
      state.selected = found.type.startsWith('opening')
      ? { type: found.type, index: found.index }
      : null;
      state.tool = 'select';
      renderSettings();
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    state.selected = found;
    if (found?.type === 'mullion' || found?.type === 'horizontalMullion') {
      state.selectedPart = null;
      renderSettings();
      draw();
    }
    if (!found) {
      state.selectedPart = null;
      state.selected = null;
      renderSettings();
      draw();
      return;
    }
    if (found?.type === 'opening') {
      saveHistory();
      state.drag = {
        ...found, start: p, current: p,
        original: clone(state.openings[found.index])
      };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    if (found?.type === 'mullion') {
      saveHistory();
      state.drag = {
        ...found, start: p,
        original: clone(state.mullions[found.index])
      };
      state.previewMullion = p;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    if (found?.type === 'horizontalMullion') {
      saveHistory();
      state.drag = {
        ...found, start: p,
        original: clone(state.horizontalMullions[found.index])
      };
      state.previewMullion = p;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    draw();
  });
  canvas.addEventListener('pointermove', e => {
    const p = point(e);
    if (pendingOpeningDrag && !state.drag &&
      (Math.abs(p.x - pendingOpeningDrag.start.x) > 3 || Math.abs(p.y - pendingOpeningDrag.start.y) > 3)) {
      saveHistory();
      state.drag = {
        type: 'opening', index: pendingOpeningDrag.index,
        start: pendingOpeningDrag.start, current: p,
        original: pendingOpeningDrag.original
      };
      pendingOpeningDrag = null;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    }
    if (!state.drag) {
      state.previewMullion =
        (state.tool === 'mullion' || state.tool === 'horizontalMullion') &&
          Number(state.toolCount || 1) === 1
          ? p
          : null;
      draw();
      return;
    }
    const g = geom();
    if (state.drag.type === 'opening') {
      state.drag.current = p;
    } else if (state.drag.type === 'mullion') {
      state.drag.previewPos = Math.max(.04, Math.min(.96,
        (p.x - (g.x + g.t)) / Math.max(1, g.fw - 2 * g.t)));
      state.previewMullion = p;
    } else if (state.drag.type === 'horizontalMullion') {
      state.drag.previewPos = Math.max(.04, Math.min(.96,
        (p.y - (g.y + g.t)) / Math.max(1, g.fh - 2 * g.t)));
      state.previewMullion = p;
    }
    draw();
  });
  function endDrag(e) {
    pendingOpeningDrag = null;
    if (!state.drag) return;
    const drag = state.drag;
    if (drag.type === 'mullion' && Number.isFinite(drag.previewPos)) {
      state.mullions[drag.index].pos = drag.previewPos;
    } else if (drag.type === 'horizontalMullion' && Number.isFinite(drag.previewPos)) {
      state.horizontalMullions[drag.index].pos = drag.previewPos;
    } else if (drag.type === 'opening' && e) {
      const gp = glassAt(point(e));
      if (gp) {
        const cell = getCellAt(gp);
        const occupied = state.openings.some((o, i) =>
          i !== drag.index && sameCell(o, cell)
        );
        if (!occupied) Object.assign(state.openings[drag.index], cell);
      }
    }
    state.drag = null;
    canvas.style.cursor = 'default';
    state.previewMullion = null;
    draw();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  function syncInputs() {
    $('widthInput').value = state.width;
    $('heightInput').value = state.height;
    $('countInput').value = state.count;
  }
  function applyDims(w, h, c) {
    w = Number(w);
    h = Number(h);
    c = Number(c);
    if (!Number.isFinite(w) || !Number.isFinite(h) ||
      !Number.isFinite(c) || w < 30 || h < 30 || c < 1) {
      alert('لطفاً ابعاد و تعداد معتبر وارد کنید.');
      return false;
    }
    saveHistory();
    state.width = Math.min(6000, w);
    state.height = Math.min(6000, h);
    state.shape = 'rectangle';
    state.count = Math.min(20, Math.floor(c));
    state.mullions = [];
    state.horizontalMullions = [];
    state.openings = [];
    state.selected = null;
    state.selectedPart = null;
    state.zoom = 1;
    state.tool = 'select';
    state.drag = null;
    canvas.style.cursor = 'default';
    renderSettings();
    syncInputs();
    draw();
    return true;
  }
  ensureShapeDialog();
  $('applyBtn').addEventListener('click', () => {
    applyDims(
      $('widthInput').value,
      $('heightInput').value,
      $('countInput').value
    );
  });
  $('newBtn').addEventListener('click', () => {
    $('newWidth').value = state.width;
    $('newHeight').value = state.height;
    $('newCount').value = state.count;
    $('newDialog').showModal();
  });
  $('createBtn').addEventListener('click', e => {
    e.preventDefault();
    if (applyDims(
      $('newWidth').value,
      $('newHeight').value,
      $('newCount').value
    )) {
      $('newDialog').close();
    }
  });
  [1, 2, 3].forEach(n => {
    $('mullion' + n).addEventListener('click', () => {
      state.tool = 'mullion';
      state.toolCount = n;
      canvas.style.cursor = 'crosshair';
      $('status').textContent = `مولین عمودی ${fa(n)}: روی شیشه کلیک کنید`;
    });
    $('horizontalMullion' + n).addEventListener('click', () => {
      state.tool = 'horizontalMullion';
      state.toolCount = n;
      canvas.style.cursor = 'crosshair';
      $('status').textContent = `مولین افقی ${fa(n)}: روی شیشه کلیک کنید`;
    });
  });
  $('leftOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'left';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('rightOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'right';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('topOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'top';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره بالا‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('bottomOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'bottom';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره پایین‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('frenchWindowBtn').addEventListener('click', () => {
    state.tool = 'frenchWindow';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره فرانسوی: روی خانه شیشه کلیک کنید';
  });
  $('selectBtn').addEventListener('click', () => {
    state.tool = 'select';
    canvas.style.cursor = 'default';
  });
  $('deleteBtn').addEventListener('click', () => {
    if (!state.selected) return;
    saveHistory();
    const s = state.selected;
    if (s.type === 'mullion') {
      const gone = state.mullions[s.index];
      state.openings.forEach(o => {
        if (o.leftId === gone.id) o.leftId = null;
        if (o.rightId === gone.id) o.rightId = null;
      });
      state.mullions.splice(s.index, 1);
    } else if (s.type === 'horizontalMullion') {
      const gone = state.horizontalMullions[s.index];
      state.openings.forEach(o => {
        if (o.topId === gone.id) o.topId = null;
        if (o.bottomId === gone.id) o.bottomId = null;
      });
      state.horizontalMullions.splice(s.index, 1);
    } else if (s.type === 'opening' || s.type === 'openingFrame' || s.type === 'openingGlass') {
      state.openings.splice(s.index, 1);
    }
    state.selected = null;
    state.drag = null;
    draw();
  });
  $('reverseOpeningBtn').addEventListener('click', () => {
    const s = state.selected;
    if (!s || !['opening', 'openingFrame', 'openingGlass'].includes(s.type)) {
      $('status').textContent = 'ابتدا پنجره را انتخاب کنید.';
      return;
    }
    const opening = state.openings[s.index];
    if (!opening || opening.french) {
      $('status').textContent = 'فقط پنجره‌های معمولی قابل برعکس شدن هستند.';
      return;
    }
    saveHistory();
    opening.direction = opening.direction === 'right' ? 'left' : 'right';
    draw();
    $('status').textContent = 'جهت بازشوی پنجره برعکس شد.';
  });
  let copiedItem = null;
  $('copyBtn').addEventListener('click', () => {
    const s = state.selected;
    if (!s || !['mullion', 'horizontalMullion', 'opening'].includes(s.type)) {
      $('status').textContent = 'ابتدا مولین یا پنجره را انتخاب کنید.';
      return;
    }
    copiedItem = {
      type: s.type,
      item: clone(
        s.type === 'mullion' ? state.mullions[s.index] :
          s.type === 'horizontalMullion' ? state.horizontalMullions[s.index] :
            state.openings[s.index]
      )
    };
    $('status').textContent = 'کپی شد؛ برای قرار دادن، روی قسمت خالی شیشه کلیک کنید.';
  });
  $('sortVerticalMullionsBtn').addEventListener('click', () => {
    if (!state.mullions.length) return;
    saveHistory();
    const count = state.mullions.length;
    state.mullions.sort((a, b) => a.pos - b.pos);
    state.mullions.forEach((m, i) => {
      m.pos = (i + 1) / (count + 1);
    });
    state.selected = null;
    draw();
  });
  $('sortHorizontalMullionsBtn').addEventListener('click', () => {
    if (!state.horizontalMullions.length) return;
    saveHistory();
    const count = state.horizontalMullions.length;
    state.horizontalMullions.sort((a, b) => a.pos - b.pos);
    state.horizontalMullions.forEach((m, i) => {
      m.pos = (i + 1) / (count + 1);
    });
    state.selected = null;
    draw();
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  function zoom(f) {
    state.zoom = Math.max(.35, Math.min(3, state.zoom * f));
    draw();
  }
  ['zoomInBtn', 'canvasZoomIn'].forEach(id =>
    $(id).addEventListener('click', () => zoom(1.15))
  );
  ['zoomOutBtn', 'canvasZoomOut'].forEach(id =>
    $(id).addEventListener('click', () => zoom(1 / 1.15))
  );
  function reset() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.selected = null;
    state.selectedPart = null;
    state.tool = 'select';
    state.drag = null;
    canvas.style.cursor = 'default';
    renderSettings();
    draw();
  }
  $('resetBtn').addEventListener('click', reset);
  $('canvasReset').addEventListener('click', reset);
  $('addSideFrameBtn').addEventListener('click', () => {
    if (state.sideFrames.length) {
      $('status').textContent = 'فقط یک فریم کناری می‌توانید داشته باشید.';
      return;
    }
    $('sideFrameWidth').value = state.width;
    $('sideFrameHeight').value = state.height;
    $('sideFrameDialog').showModal();
  });
  $('cancelSideFrameBtn').addEventListener('click', () => {
    $('sideFrameDialog').close();
  });
  $('sideFrameForm').addEventListener('submit', e => {
    e.preventDefault();
    if (state.sideFrames.length) {
      $('status').textContent = 'فقط یک فریم کناری می‌توانید داشته باشید.';
      $('sideFrameDialog').close();
      return;
    }
    const width = Number($('sideFrameWidth').value);
    const height = Number($('sideFrameHeight').value);
    const direction = $('sideFrameDirection').value;
    if (![width, height].every(Number.isFinite) ||
      width < 30 || width > 6000 ||
      height < 30 || height > 6000) {
      alert('عرض و ارتفاع باید بین ۳۰ تا ۶۰۰۰ باشند.');
      return;
    }
    saveHistory();
    state.sideFrames = [{
      width,
      height,
      direction,
      mullions: [],
      horizontalMullions: [],
    }];
    $('sideFrameDialog').close();
    draw();
  });
  window.addEventListener('resize', resizeCanvas);
  renderSettings();
  resizeCanvas();
})();