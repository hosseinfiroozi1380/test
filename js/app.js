(() => {
  const canvas = document.getElementById('designCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  canvas.style.touchAction = 'none';
  const state = {
    width: 1000, height: 1000, count: 1, shape: 'rectangle', zoom: 1, sideFrames: [],
    mullions: [], horizontalMullions: [], openings: [],
    openDirection: 'left', openingType: 'single',
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
    panels: [],
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
      <dialog id="dimensionDialog" class="tool-dialog dimension-dialog">
          <form id="dimensionForm">
            <div class="dialog-header">
              <h2 id="dimensionTitle">ویرایش اندازه</h2>
              <button type="button" class="close-dialog" id="cancelDimension">×</button>
            </div>
            <div class="wd-form-grid">
              <div class="wd-form-line">
                <label class="wd-form-label" for="dimensionValue">مقدار جدید (سانتی‌متر)</label>
                <input id="dimensionValue" class="wd-input-box" type="text"
                  inputmode="none" autocomplete="off" readonly required>
                <div class="numeric-keyboard" id="numericKeyboard">
                  <button type="button" data-num="1">۱</button>
                  <button type="button" data-num="2">۲</button>
                  <button type="button" data-num="3">۳</button>
                  <button type="button" data-num="4">۴</button>
                  <button type="button" data-num="5">۵</button>
                  <button type="button" data-num="6">۶</button>
                  <button type="button" data-num="7">۷</button>
                  <button type="button" data-num="8">۸</button>
                  <button type="button" data-num="9">۹</button>
                  <button type="button" data-action="clear">پاک</button>
                  <button type="button" data-num="0">۰</button>
                  <button type="button" data-action="backspace">⌫</button>
                </div>
              </div>
            </div>
            <div class="dialog-actions">
              <button type="button" id="cancelDimensionBtn">انصراف</button>
              <button type="submit" class="primary">تغییر</button>
            </div>
          </form>
        </dialog>
      `);
      dialog = $('dimensionDialog');
      $('cancelDimension').addEventListener('click', () => {
        $('dimensionDialog').close();
      });
      $('cancelDimensionBtn').addEventListener('click', () => {
        $('dimensionDialog').close();
      });
      $('numericKeyboard').addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const input = $('dimensionValue');
        if (btn.dataset.num !== undefined) {
          input.value += btn.dataset.num;
        } else if (btn.dataset.action === 'clear') {
          input.value = '';
        } else if (btn.dataset.action === 'backspace') {
          input.value = input.value.slice(0, -1);
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      $('dimensionForm').addEventListener('submit', e => {
        e.preventDefault();
        const newValue = Number($('dimensionValue').value);
        const edit = state.editingDimension;
        if (!edit || !Number.isFinite(newValue) || newValue < 1 || newValue > 6000) {
          alert('عدد باید بین ۱ تا ۶۰۰۰ باشد.');
          return;
        }
        saveHistory();
        if (edit.type === 'width') {
          state.width = newValue;
        } else if (edit.type === 'height') {
          state.height = newValue;
        } else if (edit.type === 'column') {
          const items = [...state.mullions].sort((a, b) => a.pos - b.pos);
          const bounds = [0, ...items.map(m => m.pos), 1];
          const i = edit.index;
          const minGap = 0.04;
          const size = newValue / state.width;
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
          const size = newValue / state.height;
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
    }[type] || 'ویرایش اندازه';
    $('dimensionValue').value = Math.round(value);
    activePointers.clear();
    panStart = null;
    pinchStart = null;
    state.drag = null;
    if (!dialog.open) {
      dialog.showModal();
    }
    $('dimensionValue').focus();
  }
  document.addEventListener('click', function (e) {
    const dialog = $('dimensionDialog');
    if (dialog?.open && e.target === dialog) {
      dialog.close();
    }
  });
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
      panels: clone(state.panels),
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
      panels: clone(state.panels),
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
  function updateHistoryButtons() {
    const undoBtn = $('undoBtn');
    const redoBtn = $('redoBtn');
    if (undoBtn) {
      undoBtn.disabled = state.history.length === 0;
    }
    if (redoBtn) {
      redoBtn.disabled = state.future.length === 0;
    }
  }
  function saveHistory() {
    state.history.push(snapshot());
    if (state.history.length > 80) {
      state.history.shift();
    }
    state.future = [];
    updateHistoryButtons();
  }
  function restore(s) {
    Object.assign(state, clone(s));
    state.drag = null;
    renderSettings();
    syncInputs();
    draw();
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    const undoBtn = $('undoBtn');
    const redoBtn = $('redoBtn');
    if (undoBtn) {
      undoBtn.disabled = false;
      undoBtn.classList.toggle(
        'history-disabled',
        state.history.length === 0
      );
    }
    if (redoBtn) {
      redoBtn.disabled = false;
      redoBtn.classList.toggle(
        'history-disabled',
        state.future.length === 0
      );
    }
  }
  function undo() {
    if (state.history.length === 0) {
      showMessage(
        'امکانی برای بازگشت به مرحله قبل وجود ندارد.',
        'warning'
      );
      return;
    }
    state.future.push(snapshot());
    restore(state.history.pop());
    updateHistoryButtons();
  }
  function redo() {
    if (state.future.length === 0) {
      showMessage(
        'مرحله‌ای برای انجام مجدد وجود ندارد.',
        'warning'
      );
      return;
    }
    state.history.push(snapshot());
    restore(state.future.pop());
    updateHistoryButtons();
  }
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  updateHistoryButtons();
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
    const padX = Math.min(160, w * .25);
    const padY = Math.min(130, h * .22);
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
  function ensureNestedChildren(item) {
    if (!item.children) item.children = {};
    item.children.mullions ||= [];
    item.children.horizontalMullions ||= [];
    item.children.openings ||= [];
    item.children.panels ||= [];
    return item.children;
  }
  function nestedCellAt(children, gp) {
    const vertical = [...(children.mullions || [])].sort((a, b) => a.pos - b.pos);
    const horizontal = [...(children.horizontalMullions || [])].sort((a, b) => a.pos - b.pos);
    const col = Math.max(0, vertical.findIndex(m => gp.x < m.pos) < 0
      ? vertical.length : vertical.findIndex(m => gp.x < m.pos));
    const row = Math.max(0, horizontal.findIndex(m => gp.y < m.pos) < 0
      ? horizontal.length : horizontal.findIndex(m => gp.y < m.pos));
    return {
      leftId: col === 0 ? null : vertical[col - 1].id,
      rightId: col === vertical.length ? null : vertical[col].id,
      topId: row === 0 ? null : horizontal[row - 1].id,
      bottomId: row === horizontal.length ? null : horizontal[row].id
    };
  }
  function nestedOpeningArea(o, area, scale) {
    const children = ensureNestedChildren(o);
    const leftM = children.mullions.find(m => m.id === o.leftId);
    const rightM = children.mullions.find(m => m.id === o.rightId);
    const topM = children.horizontalMullions.find(m => m.id === o.topId);
    const bottomM = children.horizontalMullions.find(m => m.id === o.bottomId);
    const left = area.x + (leftM ? leftM.pos : 0) * area.w;
    const right = area.x + (rightM ? rightM.pos : 1) * area.w;
    const top = area.y + (topM ? topM.pos : 0) * area.h;
    const bottom = area.y + (bottomM ? bottomM.pos : 1) * area.h;
    const ft = Math.max(2, state.sashFrame * scale * 0.55);
    const gb = Math.max(2, state.glassBorder * scale * 0.65);
    return {
      x: left + ft + gb,
      y: top + ft + gb,
      w: Math.max(0, right - left - 2 * (ft + gb)),
      h: Math.max(0, bottom - top - 2 * (ft + gb))
    };
  }
  function nestedContextAt(p) {
    const inner = getInner();
    const scale = geom().scale || 1;
    function descend(parent, area, depth) {
      if (depth > 8 || area.w <= 2 || area.h <= 2) return { parent, area };
      const children = ensureNestedChildren(parent);
      for (let i = children.openings.length - 1; i >= 0; i--) {
        const child = children.openings[i];
        const leftM = children.mullions.find(m => m.id === child.leftId);
        const rightM = children.mullions.find(m => m.id === child.rightId);
        const topM = children.horizontalMullions.find(m => m.id === child.topId);
        const bottomM = children.horizontalMullions.find(m => m.id === child.bottomId);
        const x = area.x + (leftM ? leftM.pos : 0) * area.w;
        const y = area.y + (topM ? topM.pos : 0) * area.h;
        const w = Math.max(0, ((rightM ? rightM.pos : 1) - (leftM ? leftM.pos : 0)) * area.w);
        const h = Math.max(0, ((bottomM ? bottomM.pos : 1) - (topM ? topM.pos : 0)) * area.h);
        const ft = Math.max(2, state.sashFrame * scale * 0.55);
        const gb = Math.max(2, state.glassBorder * scale * 0.65);
        const childArea = {
          x: x + ft + gb, y: y + ft + gb,
          w: Math.max(0, w - 2 * (ft + gb)), h: Math.max(0, h - 2 * (ft + gb))
        };
        if (p.x >= childArea.x && p.x <= childArea.x + childArea.w &&
          p.y >= childArea.y && p.y <= childArea.y + childArea.h) {
          return descend(child, childArea, depth + 1);
        }
      }
      return { parent, area };
    }
    for (let i = state.openings.length - 1; i >= 0; i--) {
      const o = state.openings[i];
      const b = getOpeningBounds(o, inner);
      const ft = Math.max(1, state.sashFrame * (o.isDoor ? 1.45 : 1) * scale);
      const gb = Math.max(1, state.glassBorder * scale);
      const overlap = Math.min(3, ft * 0.15);
      const ox = b.x - (!b.leftM ? overlap : 0);
      const oy = b.y - (!b.topM ? overlap : 0);
      const ow = b.w + (!b.leftM ? overlap : 0) + (!b.rightM ? overlap : 0);
      const oh = b.h + (!b.topM ? overlap : 0) + (!b.bottomM ? overlap : 0);
      const area = {
        x: ox + ft + gb, y: oy + ft + gb,
        w: Math.max(0, ow - 2 * (ft + gb)), h: Math.max(0, oh - 2 * (ft + gb))
      };
      if (p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h) {
        return descend(o, area, 0);
      }
    }
    return null;
  }
  function addNestedToolItem(tool, p, context) {
    if (!context) return false;
    const { parent, area } = context;
    if (!area.w || !area.h) return false;
    const children = ensureNestedChildren(parent);
    const gp = { x: (p.x - area.x) / area.w, y: (p.y - area.y) / area.h };
    const cell = nestedCellAt(children, gp);
    const id = state.nextId++;
    if (tool === 'mullion' || tool === 'horizontalMullion') {
      const vertical = tool === 'mullion';
      const list = vertical ? children.mullions : children.horizontalMullions;
      const pos = vertical ? gp.x : gp.y;
      const bounds = vertical
        ? [0, ...children.mullions.map(m => m.pos).sort((a, b) => a - b), 1]
        : [0, ...children.horizontalMullions.map(m => m.pos).sort((a, b) => a - b), 1];
      const sorted = [...list].sort((a, b) => a.pos - b.pos);
      const index = sorted.findIndex(m => pos < m.pos);
      const lo = index < 0 ? bounds[bounds.length - 2] : bounds[index];
      const hi = index < 0 ? 1 : bounds[index + 1];
      const count = Math.max(1, Number(state.toolCount || 1));
      for (let n = 1; n <= count; n++) {
        const item = { id: state.nextId++, pos: Math.max(lo + .025, Math.min(hi - .025, lo + (hi - lo) * n / (count + 1))) };
        if (vertical) { item.topId = cell.topId; item.bottomId = cell.bottomId; children.mullions.push(item); }
        else { item.leftId = cell.leftId; item.rightId = cell.rightId; children.horizontalMullions.push(item); }
      }
    } else if (tool === 'verticalPanel' || tool === 'horizontalPanel') {
      children.panels.push({ ...cell, id, orientation: tool === 'verticalPanel' ? 'vertical' : 'horizontal' });
    } else if (tool === 'opening') {
      if (children.openings.some(o => o.leftId === cell.leftId && o.rightId === cell.rightId && o.topId === cell.topId && o.bottomId === cell.bottomId)) {
        $('status').textContent = 'این قسمت قبلاً بازشو دارد.';
        return true;
      }
      children.openings.push({ ...cell, id, direction: state.openDirection || 'left', openingType: state.openingType || 'single', fixed: state.openDirection === 'fixed', children: { mullions: [], horizontalMullions: [], openings: [], panels: [] } });
    } else {
      return false;
    }
    return true;
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
    const vertical = state.mullions.filter(m => {
      const range = getMullionRange(m, 'vertical');
      return gp.y >= range.first - 0.0001 && gp.y <= range.last + 0.0001;
    }).sort((a, b) => a.pos - b.pos);
    const horizontal = state.horizontalMullions.filter(m => {
      const range = getMullionRange(m, 'horizontal');
      return gp.x >= range.first - 0.0001 && gp.x <= range.last + 0.0001;
    }).sort((a, b) => a.pos - b.pos);
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
  function getMullionRange(m, axis) {
    const vertical = axis === 'vertical';
    const firstKey = vertical ? 'topId' : 'leftId';
    const lastKey = vertical ? 'bottomId' : 'rightId';
    const list = vertical ? state.horizontalMullions : state.mullions;
    const oldFirst = vertical ? 'y1' : 'x1';
    const oldLast = vertical ? 'y2' : 'x2';
    const getPos = (id, fallback) => {
      if (id == null) return fallback;
      const item = list.find(v => v.id === id);
      return item ? item.pos : fallback;
    };
    let first = Object.prototype.hasOwnProperty.call(m, firstKey)
      ? getPos(m[firstKey], 0)
      : Number.isFinite(m[oldFirst]) ? m[oldFirst] : 0;
    let last = Object.prototype.hasOwnProperty.call(m, lastKey)
      ? getPos(m[lastKey], 1)
      : Number.isFinite(m[oldLast]) ? m[oldLast] : 1;
    const inner = getInner();
    const g = geom();
    const half = Math.max(3, state.mullionWidth * g.scale) / 2;
    if (!vertical) {
      if (m[firstKey] != null) {
        const edge = list.find(v => v.id === m[firstKey]);
        if (edge) first += half / inner.w;
      }
      if (m[lastKey] != null) {
        const edge = list.find(v => v.id === m[lastKey]);
        if (edge) last -= half / inner.w;
      }
    } else {
      if (m[firstKey] != null) {
        const edge = list.find(v => v.id === m[firstKey]);
        if (edge) first += half / inner.h;
      }
      if (m[lastKey] != null) {
        const edge = list.find(v => v.id === m[lastKey]);
        if (edge) last -= half / inner.h;
      }
    }
    return {
      first: Math.min(first, last),
      last: Math.max(first, last)
    };
  }
  function verticalMullionCoversRow(m, top, bottom) {
    const range = getMullionRange(m, 'vertical');
    const middle = (top + bottom) / 2;
    return middle >= range.first - 0.0001 && middle <= range.last + 0.0001;
  }
  function horizontalMullionCoversColumn(m, left, right) {
    const range = getMullionRange(m, 'horizontal');
    const middle = (left + right) / 2;
    return middle >= range.first - 0.0001 && middle <= range.last + 0.0001;
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
  function getInsetPointsSelective(points, inset, rect, edges) {
    if (!points || points.length < 3) return [];
    const n = points.length;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = points[i], b = points[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    const orientation = area >= 0 ? 1 : -1;
    const lines = [];
    const tolerance = 0.75;
    for (let i = 0; i < n; i++) {
      const a = points[i], b = points[(i + 1) % n];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      let amount = inset;
      const onLeft = Math.abs(a.x - rect.left) < tolerance && Math.abs(b.x - rect.left) < tolerance;
      const onRight = Math.abs(a.x - rect.right) < tolerance && Math.abs(b.x - rect.right) < tolerance;
      const onTop = Math.abs(a.y - rect.top) < tolerance && Math.abs(b.y - rect.top) < tolerance;
      const onBottom = Math.abs(a.y - rect.bottom) < tolerance && Math.abs(b.y - rect.bottom) < tolerance;
      if ((onLeft && !edges.left) || (onRight && !edges.right) ||
        (onTop && !edges.top) || (onBottom && !edges.bottom)) amount = 0;
      const nx = orientation * -dy / length;
      const ny = orientation * dx / length;
      lines.push({ x: a.x + nx * amount, y: a.y + ny * amount, dx, dy });
    }
    const result = [];
    for (let i = 0; i < n; i++) {
      const prev = lines[(i + n - 1) % n], curr = lines[i];
      const cross = prev.dx * curr.dy - prev.dy * curr.dx;
      if (Math.abs(cross) < 0.000001) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }
      const qx = curr.x - prev.x, qy = curr.y - prev.y;
      const factor = (qx * curr.dy - qy * curr.dx) / cross;
      result.push({ x: prev.x + factor * prev.dx, y: prev.y + factor * prev.dy });
    }
    return result;
  }
  function strokePaneEdges(points, rect, edges) {
    if (!points || points.length < 2) return;
    const tolerance = 0.75;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const onLeft = Math.abs(a.x - rect.left) < tolerance && Math.abs(b.x - rect.left) < tolerance;
      const onRight = Math.abs(a.x - rect.right) < tolerance && Math.abs(b.x - rect.right) < tolerance;
      const onTop = Math.abs(a.y - rect.top) < tolerance && Math.abs(b.y - rect.top) < tolerance;
      const onBottom = Math.abs(a.y - rect.bottom) < tolerance && Math.abs(b.y - rect.bottom) < tolerance;
      if ((onLeft && !edges.left) || (onRight && !edges.right) ||
        (onTop && !edges.top) || (onBottom && !edges.bottom)) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
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
      <dialog id="polygonDialog" class="tool-dialog">
        <form id="polygonForm">
          <div class="dialog-header">
            <h2>ساخت شکل هندسی</h2>
            <button type="button" class="close-dialog" data-close>×</button>
          </div>
          <div class="wd-form-grid">
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonItemNumber">شماره آیتم</label>
              <input id="polygonItemNumber" class="wd-input-box" placeholder="مثال: 101">
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonItemName">نام آیتم</label>
              <input id="polygonItemName" class="wd-input-box" placeholder="مثال: پنجره دو لنگه">
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonInstallationCode">کد نصب</label>
              <input id="polygonInstallationCode" class="wd-input-box" placeholder="مثال: INS-101">
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonSystem">سیستم</label>
              <select id="polygonSystem" class="wd-select-box">
                <option value="UPVC">UPVC</option>
                <option value="Al">AL</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonProfileId">پروفیل</label>
              <select id="polygonProfileId" class="wd-select-box">
                <option value="4" data-system="UPVC" data-width="60">وینتک سری 640 / لولایی</option>
                <option value="112" data-system="UPVC" data-width="60">بوتیا لولایی 2500</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonProfileColor">رنگ</label>
              <select id="polygonProfileColor" class="wd-select-box">
                <option value="1" data-system="UPVC" data-hex="#ffffff">سفید</option>
                <option value="2" data-system="UPVC" data-hex="#fffcd6">داخل رنگ</option>
                <option value="4" data-system="UPVC" data-hex="#b3ff00">بیرون رنگ</option>
                <option value="5" data-system="UPVC" data-hex="#9c590d">داخل لمینت</option>
                <option value="6" data-system="UPVC" data-hex="#ffbb00">بیرون لمینت</option>
                <option value="7" data-system="UPVC" data-hex="#fbdbff">تمام رنگ</option>
                <option value="8" data-system="Al" data-hex="#ffffff">پودری</option>
                <option value="9" data-system="UPVC" data-hex="#b0a100">دو طرف لمینت</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonAccessoryId">یراق</label>
              <select id="polygonAccessoryId" class="wd-select-box">
                <option value="11" data-system="UPVC">آکادو Accado</option>
                <option value="112" data-system="UPVC">GU</option>
                <option value="114" data-system="Al">یراق آلومینیوم</option>
                <option value="120" data-system="UPVC">اندو Endow</option>
                <option value="121" data-system="UPVC">ویناک Winac</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonGlassId">شیشه</label>
              <select id="polygonGlassId" class="wd-select-box">
                <option value="1" data-color="#8acde8">شیشه 4+12+4 ساده ساده</option>
                <option value="9" data-color="#c9c9c9">شیشه 4+12+4 ساده سیلور</option>
                <option value="10" data-color="#f1f1f1">شیشه 4+12+4 آیینه مشجر</option>
                <option value="11" data-color="#fdffeb">شیشه 4+12+4 مشجر مشجر</option>
                <option value="13" data-color="#fffdcc">شیشه 4+12+4 ساده طلایی</option>
                <option value="14" data-color="#777777">شیشه 4+12+4 رفلکس دودی</option>
                <option value="15" data-color="#c98f72">شیشه 4+12+4 ساده برنز لایت</option>
                <option value="16" data-color="#e5ffff">شیشه 6+8+6 ساده ساده</option>
                <option value="17" data-color="#c2f7ff">شیشه 4+10+6 ساده ساده</option>
                <option value="18" data-color="#feffad">شیشه 6+10+4 ساده طلایی</option>
                <option value="19" data-color="#ededed">شیشه 6+10+4 ساده سیلور</option>
                <option value="20" data-color="#ffefc2">شیشه 6+10+4 ساده رفلکس برنز</option>
                <option value="21" data-color="#f2f2f2">شیشه 6+10+4 ساده دودی لایت</option>
                <option value="22" data-color="#e0e0e0">شیشه 6+10+4 ساده رفلکس دودی</option>
                <option value="23" data-color="#fff4d6">شیشه 6+10+4 ساده برنز لایت</option>
                <option value="24" data-color="#f4ebf1">شیشه 6+10+4 سکوریت ساده</option>
                <option value="25" data-color="#f9dbff">شیشه 6+8+6 سکوریت سکوریت</option>
                <option value="26" data-color="#fafafa">شیشه 4+12+4 آیینه آیینه</option>
                <option value="27" data-color="#dbfffb">شیشه 4+12+4 سندبلاست ساده</option>
                <option value="28" data-color="#fcfff0">شیشه 4+10+4 ساده ساده</option>
                <option value="29" data-color="#fef5ff">شیشه 4-8-4 ساده ساده</option>
                <option value="30" data-color="#f5f5f5">شیشه 4+12+4 ساده دودی</option>
                <option value="31" data-color="#f4e0ff">شیشه 4+12+4 آینه ساتینا</option>
                <option value="32" data-color="#e3eef2">شیشه 4+12+4 ساتینا ساتینا</option>
                <option value="33" data-color="#e5e8ff">شیشه 4+12+4 ساده ساتینا</option>
                <option value="34" data-color="#cbfbe2">شیشه 4+10+6 ساده ساده سوپرکلیر</option>
                <option value="35" data-color="#e0ffee">شیشه 4+12+4 ساده مشجر</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonShapeType">نوع شکل</label>
              <select id="polygonShapeType" class="wd-select-box">
                <option value="triangle">مثلث</option>
                <option value="triangle-inverted">مثلث برعکس</option>
                <option value="circle">دایره</option>
                <option value="ellipse">بیضی</option>
                <option value="trapezoid">ذوزنقه</option>
                <option value="trapezoid-inverted">ذوزنقه برعکس</option>
                <option value="parallelogram">متوازی‌الاضلاع</option>
                <option value="parallelogram-inverted">متوازی‌الاضلاع برعکس</option>
                <option value="rhombus">لوزی</option>
                <option value="pentagon">پنج‌ضلعی</option>
                <option value="hexagon">شش‌ضلعی</option>
                <option value="heptagon">هفت‌ضلعی</option>
                <option value="octagon">هشت‌ضلعی</option>
              </select>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonShapeWidth">عرض</label>
              <input id="polygonShapeWidth" class="wd-input-box" type="number" min="30" max="6000" value="200" required>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonShapeHeight">ارتفاع</label>
              <input id="polygonShapeHeight" class="wd-input-box" type="number" min="30" max="6000" value="150" required>
            </div>
            <div class="wd-form-line">
              <label class="wd-form-label" for="polygonShapeCount">تعداد</label>
              <input id="polygonShapeCount" class="wd-input-box" type="number" min="1" max="20" value="1" required>
            </div>
          </div>
          <div class="dialog-actions">
            <button type="button" id="cancelPolygon">انصراف</button>
            <button type="submit" class="primary">ساخت شکل</button>
          </div>
        </form>
      </dialog>`);
    let btn = $('polygonBtn');
    if (!btn && $('newBtn')) {
      $('newBtn').insertAdjacentHTML('afterend', ' <button type="button" id="polygonBtn" class="primary">＋ غیرمستطیل</button>');
      btn = $('polygonBtn');
    }
    const dialog = $('polygonDialog');
    const form = $('polygonForm');
    const $p = id => document.getElementById('polygon' + id);
    if (!btn || btn.dataset.shapeReady) return;
    btn.dataset.shapeReady = '1';
    btn.addEventListener('click', () => {
      const mainFields = {
        ItemNumber: 'itemNumber',
        ItemName: 'itemName',
        InstallationCode: 'installationCode',
        System: 'system',
        ProfileId: 'profile_id',
        ProfileColor: 'profile_color',
        AccessoryId: 'accessory_id',
        GlassId: 'glass_id'
      };
      Object.entries(mainFields).forEach(([target, source]) => {
        const from = $(source);
        const to = $p(target);
        if (from && to) to.value = from.value;
      });
      $p('ShapeWidth').value = state.width;
      $p('ShapeHeight').value = state.height;
      $p('ShapeCount').value = state.count;
      $p('ShapeType').value = state.shape === 'rectangle' ? 'triangle' : state.shape;
      updatePolygonOptions();
      dialog.showModal();
    });
    function updatePolygonOptions() {
      const system = $p('System').value;
      ['ProfileId', 'ProfileColor', 'AccessoryId'].forEach(name => {
        const select = $p(name);
        [...select.options].forEach(option => {
          option.hidden = !!option.dataset.system && option.dataset.system !== system;
        });
        if (select.selectedOptions[0]?.hidden) {
          const option = [...select.options].find(option => !option.hidden);
          if (option) select.value = option.value;
        }
      });
    }
    $p('System').addEventListener('change', updatePolygonOptions);
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    $('cancelPolygon').addEventListener('click', () => dialog.close());
    form.addEventListener('submit', e => {
      e.preventDefault();
      const w = Number($p('ShapeWidth').value);
      const h = Number($p('ShapeHeight').value);
      const c = Number($p('ShapeCount').value);
      if (![w, h, c].every(Number.isFinite) || w < 30 || h < 30 || w > 6000 || h > 6000 || c < 1 || c > 20) {
        alert('عرض و ارتفاع باید بین ۳۰ تا ۶۰۰۰ و تعداد بین ۱ تا ۲۰ باشد.');
        return;
      }
      const mainFields = {
        ItemNumber: 'itemNumber',
        ItemName: 'itemName',
        InstallationCode: 'installationCode',
        System: 'system',
        ProfileId: 'profile_id',
        ProfileColor: 'profile_color',
        AccessoryId: 'accessory_id',
        GlassId: 'glass_id'
      };
      Object.entries(mainFields).forEach(([source, target]) => {
        const from = $p(source);
        const to = $(target);
        if (from && to) to.value = from.value;
      });
      saveHistory();
      state.width = w;
      state.height = h;
      state.count = Math.floor(c);
      state.shape = $p('ShapeType').value;
      state.mullions = [];
      state.horizontalMullions = [];
      state.openings = [];
      state.selected = null;
      state.selectedPart = null;
      state.zoom = 1;
      state.tool = 'select';
      state.drag = null;
      syncInputs();
      renderSettings();
      draw();
      dialog.close();
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
    ctx.clearRect(0, 0, w, h);
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
        const pos = vertical ? (p.x - inner.x) / inner.w : (p.y - inner.y) / inner.h;
        const mw = Math.max(3, state.mullionWidth * g.scale);
        const left = cell.leftId == null ? 0 : state.mullions.find(m => m.id === cell.leftId).pos;
        const right = cell.rightId == null ? 1 : state.mullions.find(m => m.id === cell.rightId).pos;
        const top = cell.topId == null ? 0 : state.horizontalMullions.find(m => m.id === cell.topId).pos;
        const bottom = cell.bottomId == null ? 1 : state.horizontalMullions.find(m => m.id === cell.bottomId).pos;
        ctx.save();
        ctx.strokeStyle = '#1672f9';
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        if (vertical) {
          const mx = inner.x + pos * inner.w;
          const y1 = inner.y + top * inner.h;
          const y2 = inner.y + bottom * inner.h;
          ctx.fillRect(mx - mw / 2, y1, mw, y2 - y1);
          ctx.strokeRect(mx - mw / 2, y1, mw, y2 - y1);
          const my = (y1 + y2) / 2;
          ctx.beginPath();
          ctx.moveTo(x, my);
          ctx.lineTo(x + fw, my);
          ctx.stroke();
          ctx.fillStyle = '#1672f9';
          ctx.font = `${state.dimensionFontWeight} ${Math.max(16, state.dimensionFontSize * g.scale)}px ${state.dimensionFontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(Math.round((pos - left) * state.width)), (inner.x + left * inner.w + mx) / 2, my - 8);
          ctx.fillText(String(Math.round((right - pos) * state.width)), (mx + inner.x + right * inner.w) / 2, my - 8);
        } else {
          const my = inner.y + pos * inner.h;
          const x1 = inner.x + left * inner.w;
          const x2 = inner.x + right * inner.w;
          ctx.fillRect(x1, my - mw / 2, x2 - x1, mw);
          ctx.strokeRect(x1, my - mw / 2, x2 - x1, mw);
          const mx = (x1 + x2) / 2;
          ctx.beginPath();
          ctx.moveTo(mx, y);
          ctx.lineTo(mx, y + fh);
          ctx.stroke();
          ctx.fillStyle = '#1672f9';
          ctx.font = `${state.dimensionFontWeight} ${Math.max(16, state.dimensionFontSize * g.scale)}px ${state.dimensionFontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(String(Math.round((pos - top) * state.height)), mx + 12, (inner.y + top * inner.h + my) / 2);
          ctx.fillText(String(Math.round((bottom - pos) * state.height)), mx + 12, (my + inner.y + bottom * inner.h) / 2);
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
        const range = getMullionRange(state.mullions[d.index], 'vertical');
        const mx = inner.x + d.previewPos * inner.w;
        const y1 = inner.y + range.first * inner.h;
        const y2 = inner.y + range.last * inner.h;
        const mw = Math.max(3, state.mullionWidth * g.scale);
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(mx - mw / 2, y1, mw, y2 - y1);
        ctx.strokeRect(mx - mw / 2, y1, mw, y2 - y1);
        const guideY = (y1 + y2) / 2;
        ctx.beginPath();
        ctx.moveTo(x, guideY);
        ctx.lineTo(x + fw, guideY);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0066ff';
        ctx.fillText(
          String(Math.round((d.previewPos - range.first) * state.width)),
          (inner.x + range.first * inner.w + mx) / 2,
          guideY - 10
        );
        ctx.fillText(
          String(Math.round((range.last - d.previewPos) * state.width)),
          (mx + inner.x + range.last * inner.w) / 2,
          guideY - 10
        );
      } else if (d.type === 'horizontalMullion' && Number.isFinite(d.previewPos)) {
        const range = getMullionRange(
          state.horizontalMullions[d.index],
          'horizontal'
        );
        const my = inner.y + d.previewPos * inner.h;
        const x1 = inner.x + range.first * inner.w;
        const x2 = inner.x + range.last * inner.w;
        const mh = Math.max(3, state.mullionWidth * g.scale);
        ctx.fillStyle = 'rgba(22,114,249,.18)';
        ctx.fillRect(x1, my - mh / 2, x2 - x1, mh);
        ctx.strokeRect(x1, my - mh / 2, x2 - x1, mh);
        const guideX = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.moveTo(guideX, y);
        ctx.lineTo(guideX, y + fh);
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0066ff';
        ctx.font = `${state.dimensionFontWeight} ${fontSize}px ${state.dimensionFontFamily}`;
        ctx.globalAlpha = 1;
        ctx.fillText(
          String(Math.round((d.previewPos - range.first) * state.height)),
          guideX + 12,
          (inner.y + range.first * inner.h + my) / 2
        );
        ctx.fillText(
          String(Math.round((range.last - d.previewPos) * state.height)),
          guideX + 12,
          (my + inner.y + range.last * inner.h) / 2
        );
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
    // خطوط آبی بازشوها در آخرین مرحله رسم می‌شوند تا همیشه روی مولین و پنل دیده شوند.
    drawFrontOpeningGuides(g, inner);
    // $('status').textContent =
    //   `عرض: ${fa(state.width)} | ارتفاع: ${fa(state.height)} | تعداد: ${fa(state.count)} | مولین عمودی: ${fa(state.mullions.length)} | مولین افقی: ${fa(state.horizontalMullions.length)}`;
  }
  function drawMullions(g, inner, mullions = state.mullions, horizontalMullions = state.horizontalMullions, nested = false) {
    const scale = g.scale || 1;
    const mw = Math.max(3, state.mullionWidth * scale);
    if (nested && (mullions.length || horizontalMullions.length)) {
      const glassBorder = Math.max(1, state.glassBorder * scale);
      const vertical = [...mullions].sort((a, b) => a.pos - b.pos);
      const horizontal = [...horizontalMullions].sort((a, b) => a.pos - b.pos);
      const boundsX = [0, ...vertical.map(m => m.pos), 1];
      const boundsY = [0, ...horizontal.map(m => m.pos), 1];
      for (let r = 0; r < boundsY.length - 1; r++) {
        for (let c = 0; c < boundsX.length - 1; c++) {
          const rowTop = boundsY[r];
          const rowBottom = boundsY[r + 1];
          const colLeft = boundsX[c];
          const colRight = boundsX[c + 1];
          const rowMiddle = (rowTop + rowBottom) / 2;
          const colMiddle = (colLeft + colRight) / 2;
          const leftMullion = c > 0 ? vertical[c - 1] : null;
          const rightMullion = c < vertical.length ? vertical[c] : null;
          const topMullion = r > 0 ? horizontal[r - 1] : null;
          const bottomMullion = r < horizontal.length ? horizontal[r] : null;
          const leftTop = leftMullion ? horizontal.find(v => v.id === leftMullion.topId) : null;
          const leftBottom = leftMullion ? horizontal.find(v => v.id === leftMullion.bottomId) : null;
          const rightTop = rightMullion ? horizontal.find(v => v.id === rightMullion.topId) : null;
          const rightBottom = rightMullion ? horizontal.find(v => v.id === rightMullion.bottomId) : null;
          const topLeft = topMullion ? vertical.find(v => v.id === topMullion.leftId) : null;
          const topRight = topMullion ? vertical.find(v => v.id === topMullion.rightId) : null;
          const bottomLeft = bottomMullion ? vertical.find(v => v.id === bottomMullion.leftId) : null;
          const bottomRight = bottomMullion ? vertical.find(v => v.id === bottomMullion.rightId) : null;
          const leftFirst = leftTop ? leftTop.pos : (leftMullion?.y1 ?? 0);
          const leftLast = leftBottom ? leftBottom.pos : (leftMullion?.y2 ?? 1);
          const rightFirst = rightTop ? rightTop.pos : (rightMullion?.y1 ?? 0);
          const rightLast = rightBottom ? rightBottom.pos : (rightMullion?.y2 ?? 1);
          const topFirst = topLeft ? topLeft.pos : (topMullion?.x1 ?? 0);
          const topLast = topRight ? topRight.pos : (topMullion?.x2 ?? 1);
          const bottomFirst = bottomLeft ? bottomLeft.pos : (bottomMullion?.x1 ?? 0);
          const bottomLast = bottomRight ? bottomRight.pos : (bottomMullion?.x2 ?? 1);
          const edges = {
            left: !!leftMullion && rowMiddle >= Math.min(leftFirst, leftLast) - 0.0001 && rowMiddle <= Math.max(leftFirst, leftLast) + 0.0001,
            right: !!rightMullion && rowMiddle >= Math.min(rightFirst, rightLast) - 0.0001 && rowMiddle <= Math.max(rightFirst, rightLast) + 0.0001,
            top: !!topMullion && colMiddle >= Math.min(topFirst, topLast) - 0.0001 && colMiddle <= Math.max(topFirst, topLast) + 0.0001,
            bottom: !!bottomMullion && colMiddle >= Math.min(bottomFirst, bottomLast) - 0.0001 && colMiddle <= Math.max(bottomFirst, bottomLast) + 0.0001
          };
          const left = inner.x + colLeft * inner.w + (c > 0 && edges.left ? mw / 2 : 0);
          const right = inner.x + colRight * inner.w - (c < vertical.length && edges.right ? mw / 2 : 0);
          const top = inner.y + rowTop * inner.h + (r > 0 && edges.top ? mw / 2 : 0);
          const bottom = inner.y + rowBottom * inner.h - (r < horizontal.length && edges.bottom ? mw / 2 : 0);
          if (right <= left || bottom <= top) continue;
          ctx.fillStyle = '#fff';
          ctx.fillRect(left, top, right - left, bottom - top);
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          if (edges.left) { ctx.moveTo(left, top); ctx.lineTo(left, bottom); }
          if (edges.right) { ctx.moveTo(right, top); ctx.lineTo(right, bottom); }
          if (edges.top) { ctx.moveTo(left, top); ctx.lineTo(right, top); }
          if (edges.bottom) { ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); }
          ctx.stroke();
          ctx.beginPath();
          if (edges.left && edges.top) { ctx.moveTo(left, top); ctx.lineTo(left + glassBorder, top + glassBorder); }
          if (edges.right && edges.top) { ctx.moveTo(right, top); ctx.lineTo(right - glassBorder, top + glassBorder); }
          if (edges.left && edges.bottom) { ctx.moveTo(left, bottom); ctx.lineTo(left + glassBorder, bottom - glassBorder); }
          if (edges.right && edges.bottom) { ctx.moveTo(right, bottom); ctx.lineTo(right - glassBorder, bottom - glassBorder); }
          ctx.stroke();
          const gx = left + (edges.left ? glassBorder : 0);
          const gy = top + (edges.top ? glassBorder : 0);
          const gw = right - left - (edges.left ? glassBorder : 0) - (edges.right ? glassBorder : 0);
          const gh = bottom - top - (edges.top ? glassBorder : 0) - (edges.bottom ? glassBorder : 0);
          if (gw <= 0 || gh <= 0) continue;
          ctx.fillStyle = state.glassColor || '#8bd9f7';
          ctx.fillRect(gx, gy, gw, gh);
          ctx.strokeStyle = state.selectedPart === 'glass' ? '#1672f9' : '#111';
          ctx.lineWidth = state.selectedPart === 'glass' ? 2 : 0.7;
          ctx.beginPath();
          if (edges.left) { ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); }
          if (edges.right) { ctx.moveTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh); }
          if (edges.top) { ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); }
          if (edges.bottom) { ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); }
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
    }
    mullions.forEach((m, i) => {
      const mx = inner.x + m.pos * inner.w;
      let first = 0;
      let last = 1;
      if (nested) {
        const topM = horizontalMullions.find(v => v.id === m.topId);
        const bottomM = horizontalMullions.find(v => v.id === m.bottomId);
        first = topM
          ? topM.pos + mw / 2 / Math.max(1, inner.h)
          : (m.y1 ?? 0);
        last = bottomM
          ? bottomM.pos - mw / 2 / Math.max(1, inner.h)
          : (m.y2 ?? 1);
      } else {
        const range = getMullionRange(m, 'vertical');
        first = range.first;
        last = range.last;
      }
      const y1 = inner.y + first * inner.h;
      const y2 = inner.y + last * inner.h;
      if (y2 <= y1) return;
      const bx = mx - mw / 2;
      const selected = nested
        ? state.selected?.nestedId === m.id
        : state.selected?.type === 'mullion' && state.selected.index === i;
      ctx.fillStyle = selected ? 'rgba(22,114,249,.18)' : '#fff';
      ctx.strokeStyle = selected ? '#1672f9' : '#111';
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.setLineDash([]);
      ctx.fillRect(bx, y1, mw, y2 - y1);
      ctx.strokeRect(bx, y1, mw, y2 - y1);
      if (selected) ctx.strokeRect(bx - 2, y1 + 1, mw + 4, Math.max(0, y2 - y1 - 2));
      if (nested && state.drag?.type === 'nestedMullion' && state.drag.nestedId === m.id && Number.isFinite(state.drag.previewPos)) {
        const previewX = inner.x + state.drag.previewPos * inner.w;
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(previewX - mw / 2, y1, mw, Math.max(0, y2 - y1));
      }
    });
    horizontalMullions.forEach((m, i) => {
      const my = inner.y + m.pos * inner.h;
      let first = 0;
      let last = 1;
      if (nested) {
        const leftM = mullions.find(v => v.id === m.leftId);
        const rightM = mullions.find(v => v.id === m.rightId);
        first = leftM
          ? leftM.pos + mw / 2 / Math.max(1, inner.w)
          : (m.x1 ?? 0);
        last = rightM
          ? rightM.pos - mw / 2 / Math.max(1, inner.w)
          : (m.x2 ?? 1);
      } else {
        const range = getMullionRange(m, 'horizontal');
        first = range.first;
        last = range.last;
      }
      const x1 = inner.x + first * inner.w;
      const x2 = inner.x + last * inner.w;
      if (x2 <= x1) return;
      const by = my - mw / 2;
      const selected = nested
        ? state.selected?.nestedId === m.id
        : state.selected?.type === 'horizontalMullion' && state.selected.index === i;
      ctx.fillStyle = selected ? 'rgba(22,114,249,.18)' : '#fff';
      ctx.strokeStyle = selected ? '#1672f9' : '#111';
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.setLineDash([]);
      ctx.fillRect(x1, by, x2 - x1, mw);
      ctx.strokeRect(x1, by, x2 - x1, mw);
      if (selected) ctx.strokeRect(x1 + 1, by - 2, Math.max(0, x2 - x1 - 2), mw + 4);
      if (nested && state.drag?.type === 'nestedHorizontalMullion' && state.drag.nestedId === m.id && Number.isFinite(state.drag.previewPos)) {
        const previewY = inner.y + state.drag.previewPos * inner.h;
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, previewY - mw / 2, Math.max(0, x2 - x1), mw);
      }
    });
    ctx.setLineDash([]);
  }
  function drawPanels(g, inner) {
    const scale = g.scale || 1;
    const glassBorder = Math.max(1, state.glassBorder * scale);
    const mullionWidth = Math.max(3, state.mullionWidth * scale);
    state.panels.forEach(panel => {
      const leftMullion = state.mullions.find(m => m.id === panel.leftId);
      const rightMullion = state.mullions.find(m => m.id === panel.rightId);
      const topMullion = state.horizontalMullions.find(m => m.id === panel.topId);
      const bottomMullion = state.horizontalMullions.find(m => m.id === panel.bottomId);
      const left = inner.x + (leftMullion?.pos || 0) * inner.w
        + (leftMullion ? mullionWidth / 2 : 0);
      const right = inner.x + (rightMullion?.pos ?? 1) * inner.w
        - (rightMullion ? mullionWidth / 2 : 0);
      const top = inner.y + (topMullion?.pos || 0) * inner.h
        + (topMullion ? mullionWidth / 2 : 0);
      const bottom = inner.y + (bottomMullion?.pos ?? 1) * inner.h
        - (bottomMullion ? mullionWidth / 2 : 0);
      const x = left + glassBorder;
      const y = top + glassBorder;
      const w = right - left - glassBorder * 2;
      const h = bottom - top - glassBorder * 2;
      if (w <= 0 || h <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(1, scale);
      for (let i = 1; i <= 6; i++) {
        const ratio = i / 7;
        if (panel.orientation === 'vertical') {
          const px = x + w * ratio;
          ctx.beginPath();
          ctx.moveTo(px, y);
          ctx.lineTo(px, y + h);
          ctx.stroke();
        } else {
          const py = y + h * ratio;
          ctx.beginPath();
          ctx.moveTo(x, py);
          ctx.lineTo(x + w, py);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
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
      ctx.strokeStyle = '#111';
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
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
      const vertical = [...state.mullions].sort((a, b) => a.pos - b.pos);
      const horizontal = [...state.horizontalMullions].sort((a, b) => a.pos - b.pos);
      const boundsX = [0, ...vertical.map(m => m.pos), 1];
      const boundsY = [0, ...horizontal.map(m => m.pos), 1];
      for (let r = 0; r < boundsY.length - 1; r++) {
        for (let c = 0; c < boundsX.length - 1; c++) {
          const rowTop = boundsY[r], rowBottom = boundsY[r + 1];
          const colLeft = boundsX[c], colRight = boundsX[c + 1];
          const edges = {
            left: c === 0 || verticalMullionCoversRow(vertical[c - 1], rowTop, rowBottom),
            right: c === vertical.length || verticalMullionCoversRow(vertical[c], rowTop, rowBottom),
            top: r === 0 || horizontalMullionCoversColumn(horizontal[r - 1], colLeft, colRight),
            bottom: r === horizontal.length || horizontalMullionCoversColumn(horizontal[r], colLeft, colRight)
          };
          const left = inner.x + colLeft * inner.w + (c > 0 && edges.left ? mullionWidth / 2 : 0);
          const right = inner.x + colRight * inner.w - (c < vertical.length && edges.right ? mullionWidth / 2 : 0);
          const top = inner.y + rowTop * inner.h + (r > 0 && edges.top ? mullionWidth / 2 : 0);
          const bottom = inner.y + rowBottom * inner.h - (r < horizontal.length && edges.bottom ? mullionWidth / 2 : 0);
          if (right <= left || bottom <= top) continue;
          ctx.fillStyle = '#fff';
          ctx.fillRect(left, top, right - left, bottom - top);
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          if (edges.left) { ctx.moveTo(left, top); ctx.lineTo(left, bottom); }
          if (edges.right) { ctx.moveTo(right, top); ctx.lineTo(right, bottom); }
          if (edges.top) { ctx.moveTo(left, top); ctx.lineTo(right, top); }
          if (edges.bottom) { ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); }
          ctx.stroke();
          ctx.beginPath();
          if (edges.left && edges.top) { ctx.moveTo(left, top); ctx.lineTo(left + glassBorder, top + glassBorder); }
          if (edges.right && edges.top) { ctx.moveTo(right, top); ctx.lineTo(right - glassBorder, top + glassBorder); }
          if (edges.left && edges.bottom) { ctx.moveTo(left, bottom); ctx.lineTo(left + glassBorder, bottom - glassBorder); }
          if (edges.right && edges.bottom) { ctx.moveTo(right, bottom); ctx.lineTo(right - glassBorder, bottom - glassBorder); }
          ctx.stroke();
          const insetLeft = edges.left ? glassBorder : 0;
          const insetRight = edges.right ? glassBorder : 0;
          const insetTop = edges.top ? glassBorder : 0;
          const insetBottom = edges.bottom ? glassBorder : 0;
          const gx = left + insetLeft;
          const gy = top + insetTop;
          const gw = right - left - insetLeft - insetRight;
          const gh = bottom - top - insetTop - insetBottom;
          if (gw <= 0 || gh <= 0) continue;
          ctx.fillStyle = state.glassColor || '#8bd9f7';
          ctx.fillRect(gx, gy, gw, gh);
          ctx.strokeStyle = state.selectedPart === 'glass' ? '#1672f9' : '#111';
          ctx.lineWidth = state.selectedPart === 'glass' ? 2 : 0.7;
          ctx.beginPath();
          if (edges.left) { ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); }
          if (edges.right) { ctx.moveTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh); }
          if (edges.top) { ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); }
          if (edges.bottom) { ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); }
          ctx.stroke();
          if (state.selectedPart === 'glass') {
            ctx.fillStyle = 'rgba(22,114,249,.22)';
            ctx.fillRect(gx, gy, gw, gh);
            ctx.strokeStyle = '#1672f9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (edges.left) { ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); }
            if (edges.right) { ctx.moveTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh); }
            if (edges.top) { ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); }
            if (edges.bottom) { ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); }
            ctx.stroke();
            ctx.lineWidth = 0.7;
          }
        }
      }
      if (state.selectedPart === 'glass') {
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(inner.x + 2, inner.y + 2,
          Math.max(0, inner.w - 4), Math.max(0, inner.h - 4));
        ctx.setLineDash([]);
      }
      if (state.selectedPart === 'frame') {
        ctx.fillStyle = 'rgba(22,114,249,.12)';
        ctx.fillRect(x + 1, y + 1, fw - 2, fh - 2);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 3;
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
      traceShape(type, x, y, fw, fh);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = state.selectedPart === 'frame' ? '#1672f9' : '#111';
      ctx.lineWidth = state.selectedPart === 'frame' ? 2 : 1;
      ctx.stroke();
      traceShape(type, x, y, fw, fh, t);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawCustomGlass(g, inner, glassBorder, mullionWidth);
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
    drawPanels(g, inner);
    state.openings.forEach((o, i) => {
      const b = getOpeningBounds(o, inner);
      const isDragging = state.drag?.type === 'opening' &&
        state.drag.index === i;
      let ox = b.x;
      let oy = b.y;
      let ow = b.w;
      let oh = b.h;
      const ft = Math.max(1, state.sashFrame * (o.isDoor ? 1.45 : 1) * scale);
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
      if (state.selectedPart === 'openingGlass' &&
        state.selected?.index === i && state.selected.type === 'opening') {
        ctx.fillStyle = 'rgba(22,114,249,.22)';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.lineWidth = 1;
      }
      if (state.selectedPart === 'openingFrame' &&
        state.selected?.index === i && state.selected.type === 'opening') {
        ctx.fillStyle = 'rgba(22,114,249,.22)';
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 3;
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
      if (!o.fixed || o.openingType === 'french-simple') {
        drawOpeningLines(
          gx, gy, gw, gh,
          o.type || 'normal',
          o.direction,
          ox, oy, ow, oh, ft,
          o.openingType === 'french-simple'
            ? 'single'
            : (o.openingType || 'single'),
          !!o.isDoor
        );
      }
      drawOpeningHardware(
        ox, oy, ow, oh, ft, scale,
        o.direction, gy, gh, o.fixed,
        o.openingType || 'single',
        !!o.isDoor
      );
      if (gw > 0 && gh > 0 && o.children) {
        drawNestedContents(o.children, gx, gy, gw, gh, scale, 0);
      }
      ctx.restore();
    });
    if (!isRectangle) ctx.restore();
    ctx.restore();
  }
  function drawNestedContents(children, x, y, w, h, scale, depth = 0) {
    if (!children || depth > 8 || w <= 2 || h <= 2) return;
    const mullions = children.mullions || [];
    const horizontal = children.horizontalMullions || [];
    const panels = children.panels || [];
    const openings = children.openings || [];
    const gb = Math.max(2, state.glassBorder * scale * 0.65);
    drawMullions({ scale }, { x, y, w, h }, mullions, horizontal, true);
    panels.forEach(panel => {
      const leftM = mullions.find(m => m.id === panel.leftId);
      const rightM = mullions.find(m => m.id === panel.rightId);
      const topM = horizontal.find(m => m.id === panel.topId);
      const bottomM = horizontal.find(m => m.id === panel.bottomId);
      const left = x + (leftM ? leftM.pos : 0) * w;
      const right = x + (rightM ? rightM.pos : 1) * w;
      const top = y + (topM ? topM.pos : 0) * h;
      const bottom = y + (bottomM ? bottomM.pos : 1) * h;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(left + 2, top + 2, Math.max(0, right - left - 4), Math.max(0, bottom - top - 4));
      ctx.strokeRect(left + 2, top + 2, Math.max(0, right - left - 4), Math.max(0, bottom - top - 4));
      ctx.beginPath();
      if (panel.orientation === 'vertical') {
        ctx.moveTo((left + right) / 2, top);
        ctx.lineTo((left + right) / 2, bottom);
      } else {
        ctx.moveTo(left, (top + bottom) / 2);
        ctx.lineTo(right, (top + bottom) / 2);
      }
      ctx.stroke();
    });
    openings.forEach(o => {
      const leftM = mullions.find(m => m.id === o.leftId);
      const rightM = mullions.find(m => m.id === o.rightId);
      const topM = horizontal.find(m => m.id === o.topId);
      const bottomM = horizontal.find(m => m.id === o.bottomId);
      const ox = x + (leftM ? leftM.pos : 0) * w;
      const oy = y + (topM ? topM.pos : 0) * h;
      const ow = Math.max(0, ((rightM ? rightM.pos : 1) - (leftM ? leftM.pos : 0)) * w);
      const oh = Math.max(0, ((bottomM ? bottomM.pos : 1) - (topM ? topM.pos : 0)) * h);
      if (ow < 4 || oh < 4) return;
      const ft = Math.max(2, state.sashFrame * scale * 0.55);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeRect(ox, oy, ow, oh);
      const gx = ox + ft + gb;
      const gy = oy + ft + gb;
      const gw = Math.max(0, ow - 2 * (ft + gb));
      const gh = Math.max(0, oh - 2 * (ft + gb));
      ctx.fillStyle = state.glassColor || '#8bd9f7';
      ctx.fillRect(ox + ft, oy + ft, Math.max(0, ow - ft * 2), Math.max(0, oh - ft * 2));
      ctx.strokeRect(ox + ft, oy + ft, Math.max(0, ow - ft * 2), Math.max(0, oh - ft * 2));
      if (gw > 0 && gh > 0) drawNestedContents(o.children, gx, gy, gw, gh, scale * 0.85, depth + 1);
    });
  }
  function drawFrontOpeningGuides(g, inner) {
    const scale = g.scale || 1;
    function drawGuide(ox, oy, ow, oh, direction, ft, localScale, openingType, isDoor = false) {
      drawOpeningLines(
        ox + ft,
        oy + ft,
        Math.max(0, ow - ft * 2),
        Math.max(0, oh - ft * 2),
        'normal',
        direction,
        ox, oy, ow, oh, ft,
        openingType || 'single',
        isDoor
      );
    }
    function drawNestedGuides(children, x, y, w, h, localScale, depth) {
      if (!children || depth > 8 || w <= 2 || h <= 2) return;
      const vertical = children.mullions || [];
      const horizontal = children.horizontalMullions || [];
      for (const o of (children.openings || [])) {
        const leftM = vertical.find(m => m.id === o.leftId);
        const rightM = vertical.find(m => m.id === o.rightId);
        const topM = horizontal.find(m => m.id === o.topId);
        const bottomM = horizontal.find(m => m.id === o.bottomId);
        const leftRatio = leftM ? leftM.pos : 0;
        const rightRatio = rightM ? rightM.pos : 1;
        const topRatio = topM ? topM.pos : 0;
        const bottomRatio = bottomM ? bottomM.pos : 1;
        const ox = x + leftRatio * w;
        const oy = y + topRatio * h;
        const ow = Math.max(0, (rightRatio - leftRatio) * w);
        const oh = Math.max(0, (bottomRatio - topRatio) * h);
        if (ow <= 4 || oh <= 4) continue;
        const ft = Math.max(2, state.sashFrame * localScale * 0.55);
        const gb = Math.max(2, state.glassBorder * localScale * 0.65);
        if (!o.fixed) drawGuide(ox, oy, ow, oh, o.direction, ft, localScale, o.openingType || 'single');
        const gx = ox + ft + gb;
        const gy = oy + ft + gb;
        const gw = Math.max(0, ow - 2 * (ft + gb));
        const gh = Math.max(0, oh - 2 * (ft + gb));
        drawNestedGuides(o.children, gx, gy, gw, gh, localScale * 0.85, depth + 1);
      }
    }
    // ابتدا خطوط بازشوهای اصلی؛ سپس خطوط بازشوهای تو‌در‌تو، همگی در لایهٔ جلو.
    for (const o of state.openings) {
      const b = getOpeningBounds(o, inner);
      const ft = Math.max(1, state.sashFrame * (o.isDoor ? 1.45 : 1) * scale);
      const overlap = Math.min(3, ft * 0.15);
      let ox = b.x, oy = b.y, ow = b.w, oh = b.h;
      if (!b.leftM) { ox -= overlap; ow += overlap; }
      if (!b.rightM) ow += overlap;
      if (!b.topM) { oy -= overlap; oh += overlap; }
      if (!b.bottomM) oh += overlap;
      if (!o.fixed) drawGuide(ox, oy, ow, oh, o.direction, ft, scale, o.openingType || 'single', !!o.isDoor);
      const gx = ox + ft + Math.max(1, state.glassBorder * scale);
      const gy = oy + ft + Math.max(1, state.glassBorder * scale);
      const gw = Math.max(0, ow - 2 * (ft + Math.max(1, state.glassBorder * scale)));
      const gh = Math.max(0, oh - 2 * (ft + Math.max(1, state.glassBorder * scale)));
      drawNestedGuides(o.children, gx, gy, gw, gh, scale * 0.85, 1);
    }
  }
  // خطوط ابی رو شیشه فریم پنجره
  function drawOpeningLines(
    gx, gy, gw, gh, olType, direction,
    ox, oy, ow, oh, ft, openingType = 'single', isDoor = false
  ) {
    const scale = geom().scale || 1;
    const cx = ox + ow / 2;
    const cy = oy + oh / 2;
    const pad = isDoor ? Math.max(1, ft * 0.70) : ft;
    ctx.save();
    ctx.strokeStyle = state.openingLineColor || '#1672f9';
    ctx.lineWidth = Math.max(2, 5 * scale);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    function drawV(dir) {
      ctx.beginPath();
      switch (dir) {
        case 'left':
          ctx.moveTo(ox, oy + pad);
          ctx.lineTo(ox + ow - pad / 1.5, cy);
          ctx.lineTo(ox, oy + oh - pad);
          break;
        case 'right':
          ctx.moveTo(ox + ow, oy + pad);
          ctx.lineTo(ox + pad / 2, cy);
          ctx.lineTo(ox + ow, oy + oh - pad);
          break;
        case 'top':
          ctx.moveTo(ox + pad, oy + oh - scale);
          ctx.lineTo(cx, oy + pad / 2);
          ctx.lineTo(ox + ow - pad, oy + oh - scale);
          break;
        case 'bottom':
          ctx.moveTo(ox + pad, oy + scale);
          ctx.lineTo(cx, oy + oh - pad / 2);
          ctx.lineTo(ox + ow - pad, oy + scale);
          break;
      }
      ctx.stroke();
    }
    // خط‌چین و فلش
    function drawDashedArrow(x1, y1, x2, y2) {
      ctx.save();
      ctx.lineWidth = Math.max(1.5, 3 * scale);
      ctx.setLineDash([6 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const a = Math.atan2(y2 - y1, x2 - x1);
      const size = 8 * scale;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - size * Math.cos(a - Math.PI / 6),
        y2 - size * Math.sin(a - Math.PI / 6)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - size * Math.cos(a + Math.PI / 6),
        y2 - size * Math.sin(a + Math.PI / 6)
      );
      ctx.stroke();
      ctx.restore();
    }
    // محوری: لوزی
    if (openingType === 'radial') {
      const diamondPad = Math.max(2 * scale, pad * 0.50);
      ctx.beginPath();
      ctx.moveTo(cx, oy + diamondPad);
      ctx.lineTo(ox + ow - diamondPad, cy);
      ctx.lineTo(cx, oy + oh - diamondPad);
      ctx.lineTo(ox + diamondPad, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      return;
    }
    // فولکس‌واگنی: علامت حرکت کشویی (جهت معکوس)
    if (openingType === 'volkswagen') {
      const dir = direction === 'left' ? 1 : -1;
      const midX = ox + ow / 2;
      const midY = oy + oh / 2;
      const arrowX = direction === 'left'
        ? ox + pad / 2
        : ox + ow - pad / 2;
      const arrowY = cy;
      const arrowSize = 75 * scale;
      const glassLeft = ox + pad;
      const glassRight = ox + ow - pad;
      const glassBottom = oy + oh - pad;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX + dir * arrowSize, arrowY - arrowSize);
      ctx.lineTo(arrowX + dir * arrowSize, arrowY + arrowSize);
      ctx.closePath();
      const angle = 20 * Math.PI / 180;
      const length = (midY - (oy + pad)) / Math.cos(angle);
      const sideX = midX +
        (direction === 'left' ? -1 : 1) *
        length * Math.sin(angle);
      ctx.moveTo(midX, oy + pad);
      ctx.lineTo(sideX, midY);
      ctx.moveTo(sideX, midY);
      ctx.lineTo(arrowX, arrowY);
      ctx.moveTo(midX, oy + pad);
      ctx.lineTo(
        direction === 'left' ? glassRight : glassLeft,
        glassBottom
      );
      ctx.stroke();
      ctx.restore();
      return;
    }
    // فرانسوی: دو علامت قرینه
    if (openingType === 'french') {
      const half = ow / 2;
      ctx.beginPath();
      ctx.moveTo(ox + half, oy + pad);
      ctx.lineTo(ox + pad, cy);
      ctx.lineTo(ox + half, oy + oh - pad);
      ctx.moveTo(ox + half, oy + pad);
      ctx.lineTo(ox + ow - pad, cy);
      ctx.lineTo(ox + half, oy + oh - pad);
      ctx.stroke();
      ctx.restore();
      return;
    }
    drawV(direction);
    if (openingType === 'dual') {
      ctx.save();
      ctx.setLineDash([100 * scale, 20 * scale]);
      ctx.beginPath();
      ctx.moveTo(ox + pad, oy + oh - pad);
      ctx.lineTo(cx, oy + pad / 2);
      ctx.lineTo(ox + ow - pad, oy + oh - pad);
      ctx.stroke();
      ctx.restore();
    } else {
      drawV(direction);
    }
    ctx.restore();
  }
  // دستگیره و لولا رو فریم پنجره
  function drawOpeningHardware(
    ox, oy, ow, oh, ft, scale,
    direction, gy, gh, fixed = false,
    openingType = 'single', isDoor = false
  ) {
    const vertical = direction === 'top' || direction === 'bottom';
    const cx = ox + ow / 2;
    const cy = oy + oh / 2;
    const handleW = 25 * 1.5 * scale;
    const handleH = 50 * 1.2 * 1.8 * scale;
    ctx.save();
    ctx.fillStyle = '#ddd';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = Math.max(1, scale);
    function hardwareRect(x, y, w, h) {
      ctx.beginPath();
      ctx.roundRect(
        x - w / 2,
        y - h / 2,
        w,
        h,
        6 * scale
      );
      ctx.fill();
      ctx.stroke();
    }
    function drawHandle(x, y, isVertical = false) {
      if (isVertical) {
        hardwareRect(x, y, handleH, handleW);
        hardwareRect(
          x + 55 * scale,
          y,
          handleH,
          16 * 1.3 * scale
        );
      } else {
        hardwareRect(x, y, handleW, handleH);
        hardwareRect(
          x,
          y + handleH - 55 * scale,
          16 * 1.3 * scale,
          handleH
        );
      }
    }
    if (isDoor) {
      if (!fixed) {
        if (vertical) {
          const hingeY = direction === 'top' ? oy + oh : oy;
          [ox + ow * 0.15, ox + ow * 0.85].forEach(x => {
            drawHinge(x, hingeY, true);
          });
        } else {
          const hingeX = direction === 'left' ? ox : ox + ow;
          [
            oy + oh * 0.15,
            oy + oh * 0.50,
            oy + oh * 0.85
          ].forEach(y => {
            drawHinge(hingeX, y);
          });
        }
        const handleX = vertical
          ? cx
          : (direction === 'left' ? ox + ow - ft / 2 : ox + ft / 2);
        const handleY = vertical
          ? (direction === 'top' ? oy + ft / 2 : oy + oh - ft / 2)
          : cy;
        hardwareRect(
          handleX,
          handleY,
          handleW * 1.3,
          handleH * 1.7
        );
        ctx.save();
        ctx.translate(
          handleX + (direction === 'left' ? 8 * scale : -8 * scale),
          handleY
        );
        const angle = direction === 'left'
          ? Math.PI / 2
          : -Math.PI / 2;
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(
          -8 * 1.3 * scale,
          0,
          16 * 1.3 * scale,
          handleH,
          6 * scale
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    function drawHinge(x, y, isVertical = false) {
      if (isVertical) {
        hardwareRect(x - 17.5 * scale, y, 35 * scale, 20 * scale);
        hardwareRect(x + 17.5 * scale, y, 35 * scale, 20 * scale);
      } else {
        hardwareRect(x, y - 17.5 * scale, 20 * scale, 35 * scale);
        hardwareRect(x, y + 17.5 * scale, 20 * scale, 35 * scale);
      }
    }
    // لنگه ثابت، به‌جز پنجره فرانسوی
    if (
      fixed &&
      openingType !== 'french-simple' &&
      openingType !== 'dual'
    ) {
      ctx.restore();
      return;
    }
    // محوری: یراق در مرکز محور
    if (openingType === 'radial') {
      if (direction === 'left') {
        // لولا سمت چپ، دستگیره سمت راست
        drawHandle(ox + ow - ft / 2, cy);
      } else if (direction === 'right') {
        // لولا سمت راست، دستگیره سمت چپ
        drawHandle(ox + ft / 2, cy);
      } else if (direction === 'top') {
        // لولا پایین، دستگیره بالا
        drawHandle(cx, oy + ft / 2, true);
      } else if (direction === 'bottom') {
        // لولا بالا، دستگیره پایین
        drawHandle(cx, oy + oh - ft / 2, true);
      }
      ctx.restore();
      return;
    }
    if (openingType === 'french-simple') {
      const hingeX = direction === 'left' ? ox : ox + ow;
      [oy + oh * 0.15, oy + oh * 0.85].forEach(y => {
        drawHinge(hingeX, y);
      });
      ctx.restore();
      return;
    }
    // فولکس‌واگنی: دستگیره در سمت حرکت
    if (openingType === 'volkswagen') {
      const hx = direction === 'left'
        ? ox + ow - ft / 2
        : ox + ft / 2;
      drawHandle(hx, cy);
      const baseY = cy;
      ctx.restore();
      return;
    }
    // فرانسوی: دو دستگیره و دو مجموعه لولا
    // فرانسوی: دو دستگیره و چهار لولا
    // فرانسوی: دو دستگیره و لولاهای مستقل برای هر لنگه
    if (openingType === 'french') {
      const half = ow / 2;
      // دستگیره‌ها کنار مولین وسط
      drawHandle(ox + half - ft, cy);
      drawHandle(ox + half + ft, cy);
      // لولای سمت چپ، دقیقاً مثل پنجره معمولی
      const leftHingeX = ox;
      [oy + oh * 0.15, oy + oh * 0.85].forEach(y => {
        drawHinge(leftHingeX, y);
      });
      // لولای سمت راست، دقیقاً مثل پنجره معمولی
      const rightHingeX = ox + ow;
      [oy + oh * 0.15, oy + oh * 0.85].forEach(y => {
        drawHinge(rightHingeX, y);
      });
      ctx.restore();
      return;
    }
    // تک‌حالته و دوحالته
    if (vertical) {
      const hingeY = direction === 'top' ? oy + oh : oy;
      [ox + ow * 0.15, ox + ow * 0.85].forEach(x => {
        drawHinge(x, hingeY, true);
      });
      drawHandle(cx, direction === 'top'
        ? oy + ft / 2
        : oy + oh - ft / 2, true);
    } else {
      // جهت چپ/راست نام سمت لولاست؛ دستگیره در سمت مقابل قرار می‌گیرد.
      const hingeX = direction === 'left' ? ox : ox + ow;
      [oy + oh * 0.15, oy + oh * 0.85].forEach(y => {
        drawHinge(hingeX, y);
      });
      const handleX = direction === 'left'
        ? ox + ow - ft / 2
        : ox + ft / 2;
      drawHandle(handleX, cy);
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
        const rowTop = boundsY[r], rowBottom = boundsY[r + 1];
        const colLeft = boundsX[c], colRight = boundsX[c + 1];
        const edges = {
          left: c === 0 || verticalMullionCoversRow(vertical[c - 1], rowTop, rowBottom),
          right: c === vertical.length || verticalMullionCoversRow(vertical[c], rowTop, rowBottom),
          top: r === 0 || horizontalMullionCoversColumn(horizontal[r - 1], colLeft, colRight),
          bottom: r === horizontal.length || horizontalMullionCoversColumn(horizontal[r], colLeft, colRight)
        };
        const left = inner.x + colLeft * inner.w + (c > 0 && edges.left ? mullionWidth / 2 : 0);
        const right = inner.x + colRight * inner.w - (c < vertical.length && edges.right ? mullionWidth / 2 : 0);
        const top = inner.y + rowTop * inner.h + (r > 0 && edges.top ? mullionWidth / 2 : 0);
        const bottom = inner.y + rowBottom * inner.h - (r < horizontal.length && edges.bottom ? mullionWidth / 2 : 0);
        if (right - left <= 0 || bottom - top <= 0) continue;
        const rect = { left, right, top, bottom };
        const pane = clipPolygon(frameInner, left, top, right, bottom);
        if (!polygonPath(pane)) continue;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.7;
        strokePaneEdges(pane, rect, edges);
        const glass = getInsetPointsSelective(pane, glassBorder, rect, edges);
        if (!polygonPath(glass)) continue;
        ctx.fillStyle = state.glassColor || '#8bd9f7';
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 0.7;
        strokePaneEdges(glass, rect, edges);
        ctx.beginPath();
        for (let i = 0; i < pane.length; i++) {
          const a = pane[i], b = pane[(i + 1) % pane.length], q = glass[i];
          if (!q) continue;
          const onLeft = Math.abs(a.x - rect.left) < 0.75 && Math.abs(b.x - rect.left) < 0.75;
          const onRight = Math.abs(a.x - rect.right) < 0.75 && Math.abs(b.x - rect.right) < 0.75;
          const onTop = Math.abs(a.y - rect.top) < 0.75 && Math.abs(b.y - rect.top) < 0.75;
          const onBottom = Math.abs(a.y - rect.bottom) < 0.75 && Math.abs(b.y - rect.bottom) < 0.75;
          if ((onLeft && !edges.left) || (onRight && !edges.right) ||
            (onTop && !edges.top) || (onBottom && !edges.bottom)) continue;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(q.x, q.y);
        }
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
    const widthGap = 22.5;
    const heightGap = 22.5;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
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
    if (side && side.direction === 'bottom') {
      drawWidth(x, x + fw, y - 60, state.width);
    } else {
      drawWidth(x, x + fw, y + fh + 60, state.width);
    }
    drawHeight(y, y + fh, side?.direction === 'right' ? x - 60 : x - 60, state.height);
    // فریم جدید
    if (side) {
      const s = side;
      const sideWidth = state.sideFrames[0].width;
      const sideHeight = state.sideFrames[0].height;
      drawWidth(s.x, s.x + s.fw, s.y + s.fh + 60, sideWidth);
      drawHeight(s.y, s.y + s.fh, s.x + s.fw + 40, sideHeight);
    }
    // موقعیت مولین‌های داخل شیشه لنگه بازشو را به همان اندازه‌گذاری بیرونی اضافه می‌کنیم.
    // خط اندازه‌گیری جدید رسم نمی‌شود؛ همه موقعیت‌ها روی خط موجود ادغام می‌شوند.
    const openingVerticalPositions = [];
    const openingHorizontalPositions = [];
    const scale = geom().scale || 1;
    state.openings.forEach(o => {
      const b = getOpeningBounds(o, inner);
      if (b.w <= 0 || b.h <= 0 || !o.children) return;
      let ox = b.x;
      let oy = b.y;
      let ow = b.w;
      let oh = b.h;
      const ft = Math.max(1, state.sashFrame * scale);
      const overlap = Math.min(3, ft * 0.15);
      if (!b.leftM) { ox -= overlap; ow += overlap; }
      if (!b.rightM) ow += overlap;
      if (!b.topM) { oy -= overlap; oh += overlap; }
      if (!b.bottomM) oh += overlap;
      const glassX = ox + ft;
      const glassY = oy + ft;
      const glassW = Math.max(0, ow - ft * 2);
      const glassH = Math.max(0, oh - ft * 2);
      const gx = glassX + state.glassBorder;
      const gy = glassY + state.glassBorder;
      const gw = Math.max(0, glassW - state.glassBorder * 2);
      const gh = Math.max(0, glassH - state.glassBorder * 2);
      if (gw <= 0 || gh <= 0) return;
      (o.children.mullions || []).forEach(m => {
        const px = gx + Math.max(0, Math.min(1, m.pos)) * gw;
        openingVerticalPositions.push((px - x) / fw);
      });
      (o.children.horizontalMullions || []).forEach(m => {
        const py = gy + Math.max(0, Math.min(1, m.pos)) * gh;
        openingHorizontalPositions.push((py - y) / fh);
      });
    });
    // اندازه ستون‌ها: مولین‌های فریم اصلی و لنگه روی یک خط اندازه‌گیری مشترک
    const verticalBounds = [
      0,
      ...state.mullions.map(m => m.pos),
      ...openingVerticalPositions,
      1
    ].filter(Number.isFinite).map(v => Math.max(0, Math.min(1, v)))
      .sort((a, b) => a - b)
      .filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 0.002);
    if (verticalBounds.length > 2) {
      const columnY = side?.direction === 'bottom' ? y - 30 : y + fh + 30;
      verticalBounds.slice(0, -1).forEach((b, i) => {
        const r = verticalBounds[i + 1];
        const sx = x + b * fw;
        const ex = x + r * fw;
        const value = Math.round(state.width * (r - b));
        drawWidth(sx, ex, columnY, value, 'column', i);
      });
    }
    // اندازه ردیف‌ها: مولین‌های فریم اصلی و لنگه روی یک خط اندازه‌گیری مشترک
    const horizontalBounds = [
      0,
      ...state.horizontalMullions.map(m => m.pos),
      ...openingHorizontalPositions,
      1
    ].filter(Number.isFinite).map(v => Math.max(0, Math.min(1, v)))
      .sort((a, b) => a - b)
      .filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 0.002);
    if (horizontalBounds.length > 2) {
      const rowX = x - (side?.direction === 'bottom' ? 15 : 30);
      horizontalBounds.slice(0, -1).forEach((b, i) => {
        const next = horizontalBounds[i + 1];
        const sy = y + b * fh;
        const ey = y + next * fh;
        const value = Math.round(state.height * (next - b));
        drawHeight(sy, ey, rowX, value, 'row', i);
      });
    }
    ctx.restore();
  }
  function renderSettings() {
    const box = $('partSettings');
    if (!box) return;
    const selectHTML = (title, options, selected, attr, getName = o => typeof o === 'object' ? o.name : o) => {
      const current = options.find(o => getName(o) === selected) || options[0];
      return `
        <div class="setting-field">
          <div class="option-title">${title}</div>
          <div class="custom-select">
            <button type="button" class="option-btn" data-toggle="${attr}">
              <span>${getName(current)}</span>
              <i class="ti ti-chevron-down"></i>
            </button>
            <div class="custom-select-menu">
              ${options.map(o => {
        const value = getName(o);
        return `<button type="button" class="custom-option ${value === selected ? 'active' : ''}" data-value="${value}" data-type="${attr}">${value}</button>`;
      }).join('')}
            </div>
          </div>
        </div>
      `;
    };
    if (state.selectedPart === 'frame') {
      box.innerHTML = `
        <div class="part-heading">تنظیمات فریم</div>
        ${selectHTML('مدل فریم', frameOptions, state.frameType, 'frame')}
      `;
    } else if (state.selectedPart === 'glass') {
      box.innerHTML = `
        <div class="part-heading">تنظیمات شیشه</div>
        ${selectHTML('ترکیب و رنگ شیشه', glassOptions, state.glassType, 'glass')}
        ${selectHTML('توری', meshOptions, state.meshType, 'mesh')}
        ${selectHTML('زهوار', beadOptions, state.beadType, 'bead')}
      `;
    } else {
      box.innerHTML = '<p class="hint">برای تنظیم فریم یا شیشه، روی آن در نقشه کلیک کنید.</p>';
      return;
    }
    box.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const menu = btn.nextElementSibling;
        const open = menu.classList.contains('open');
        box.querySelectorAll('.custom-select-menu').forEach(m => m.classList.remove('open'));
        box.querySelectorAll('.option-btn').forEach(b => b.classList.remove('open'));
        if (!open) {
          menu.classList.add('open');
          btn.classList.add('open');
        }
      });
    });
    box.querySelectorAll('.custom-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        const type = btn.dataset.type;
        saveHistory();
        if (type === 'frame') {
          const option = frameOptions.find(o => o.name === value);
          if (!option) return;
          state.frameType = option.name;
          state.frame = option.size;
        } else if (type === 'glass') {
          const option = glassOptions.find(o => o.name === value);
          if (!option) return;
          state.glassType = option.name;
          state.glassColor = option.color;
        } else if (type === 'mesh') {
          state.meshType = value;
        } else if (type === 'bead') {
          state.beadType = value;
        }
        renderSettings();
        draw();
      });
    });
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function nestedHitAt(p) {
    const context = nestedContextAt(p);
    if (!context) return null;
    const parent = context.parent;
    const area = context.area;
    const children = ensureNestedChildren(parent);
    const scale = geom().scale || 1;
    const vertical = children.mullions || [];
    const horizontal = children.horizontalMullions || [];
    // پنجره‌های داخلی اولویت دارند تا اجزای داخل شیشهٔ آن‌ها قابل انتخاب باشند.
    for (let i = children.openings.length - 1; i >= 0; i--) {
      const o = children.openings[i];
      const lm = vertical.find(m => m.id === o.leftId);
      const rm = vertical.find(m => m.id === o.rightId);
      const tm = horizontal.find(m => m.id === o.topId);
      const bm = horizontal.find(m => m.id === o.bottomId);
      const leftRatio = lm ? lm.pos : 0;
      const rightRatio = rm ? rm.pos : 1;
      const topRatio = tm ? tm.pos : 0;
      const bottomRatio = bm ? bm.pos : 1;
      const ox = area.x + leftRatio * area.w;
      const oy = area.y + topRatio * area.h;
      const ow = Math.max(0, (rightRatio - leftRatio) * area.w);
      const oh = Math.max(0, (bottomRatio - topRatio) * area.h);
      if (p.x < ox || p.x > ox + ow || p.y < oy || p.y > oy + oh) continue;
      const edge = Math.max(5, state.sashFrame * scale * .25);
      if (p.x <= ox + edge || p.x >= ox + ow - edge ||
        p.y <= oy + edge || p.y >= oy + oh - edge) {
        return { type: 'nestedOpening', index: i, nestedParent: parent, nestedArea: area, nestedId: o.id };
      }
    }
    for (let i = vertical.length - 1; i >= 0; i--) {
      const m = vertical[i];
      const mx = area.x + m.pos * area.w;
      // برای مولین عمودی، محدودهٔ واقعی بر اساس مولین‌های افقی است.
      const topM = horizontal.find(v => v.id === m.topId);
      const bottomM = horizontal.find(v => v.id === m.bottomId);
      const y1 = area.y + (topM ? topM.pos : 0) * area.h;
      const y2 = area.y + (bottomM ? bottomM.pos : 1) * area.h;
      if (Math.abs(p.x - mx) <= Math.max(10, state.mullionWidth * scale / 2) &&
        p.y >= y1 - 4 && p.y <= y2 + 4) {
        return { type: 'nestedMullion', index: i, nestedParent: parent, nestedArea: area, nestedId: m.id };
      }
    }
    for (let i = horizontal.length - 1; i >= 0; i--) {
      const m = horizontal[i];
      const my = area.y + m.pos * area.h;
      const leftM = vertical.find(v => v.id === m.leftId);
      const rightM = vertical.find(v => v.id === m.rightId);
      const x1 = area.x + (leftM ? leftM.pos : 0) * area.w;
      const x2 = area.x + (rightM ? rightM.pos : 1) * area.w;
      if (Math.abs(p.y - my) <= Math.max(10, state.mullionWidth * scale / 2) &&
        p.x >= x1 - 4 && p.x <= x2 + 4) {
        return { type: 'nestedHorizontalMullion', index: i, nestedParent: parent, nestedArea: area, nestedId: m.id };
      }
    }
    for (let i = children.panels.length - 1; i >= 0; i--) {
      const panel = children.panels[i];
      const lm = vertical.find(m => m.id === panel.leftId);
      const rm = vertical.find(m => m.id === panel.rightId);
      const tm = horizontal.find(m => m.id === panel.topId);
      const bm = horizontal.find(m => m.id === panel.bottomId);
      const x1 = area.x + (lm ? lm.pos : 0) * area.w;
      const x2 = area.x + (rm ? rm.pos : 1) * area.w;
      const y1 = area.y + (tm ? tm.pos : 0) * area.h;
      const y2 = area.y + (bm ? bm.pos : 1) * area.h;
      if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
        return { type: 'nestedPanel', index: i, nestedParent: parent, nestedArea: area, nestedId: panel.id };
      }
    }
    return null;
  }
  function hit(p) {
    const nestedFound = nestedHitAt(p);
    if (nestedFound) return nestedFound;
    const g = geom();
    const inner = getInner();
    for (let i = state.openings.length - 1; i >= 0; i--) {
      const b = getOpeningBounds(state.openings[i], inner);
      const scale = g.scale || 1;
      const ft = Math.max(1, state.sashFrame * (state.openings[i].isDoor ? 1.45 : 1) * scale);
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
      const m = state.mullions[i];
      const mx = inner.x + m.pos * inner.w;
      const range = getMullionRange(m, 'vertical');
      if (
        Math.abs(p.x - mx) < Math.max(12, state.mullionWidth * g.scale) &&
        p.y >= inner.y + range.first * inner.h - 4 &&
        p.y <= inner.y + range.last * inner.h + 4
      ) return { type: 'mullion', index: i };
    }
    for (let i = state.horizontalMullions.length - 1; i >= 0; i--) {
      const m = state.horizontalMullions[i];
      const my = inner.y + m.pos * inner.h;
      const range = getMullionRange(m, 'horizontal');
      if (
        Math.abs(p.y - my) < 12 &&
        p.x >= inner.x + range.first * inner.w - 4 &&
        p.x <= inner.x + range.last * inner.w + 4
      ) return { type: 'horizontalMullion', index: i };
    }
    if (pointInShape(p, g.x, g.y, g.fw, g.fh, g.t)) return { type: 'glass' };
    if (pointInShape(p, g.x, g.y, g.fw, g.fh)) return { type: 'frame' };
    return null;
  }
  let messageTimer = null;
  let removeTimer = null;
  function showMessage(textMsg, type = "success", timer = 3000) {
    document.querySelector(".wd-system-message")?.remove();
    clearTimeout(messageTimer);
    clearTimeout(removeTimer);
    const icons = {
      success: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      error: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
      warning: `<svg viewBox="0 0 24 24"><path d="M10.3 3.8a2 2 0 0 1 3.4 0l8 14A2 2 0 0 1 20 20.8H4a2 2 0 0 1-1.7-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v4m0 3h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
      info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5m0-8h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
    };
    const message = document.createElement("div");
    message.className = "wd-system-message";
    const box = document.createElement("div");
    box.className = `wd-system-message-box ${type}`;
    const icon = document.createElement("div");
    icon.className = `wd-system-message-icon ${type}`;
    icon.innerHTML = `
  <span>${icons[type] || icons.success}</span>
  <i class="wd-message-ring"></i>
`;
    const text = document.createElement("div");
    text.className = "wd-system-message-text";
    text.textContent = typeof convertNumbersToPersian === "function"
      ? convertNumbersToPersian(String(textMsg))
      : String(textMsg);
    box.append(icon, text);
    message.appendChild(box);
    document.body.appendChild(message);
    requestAnimationFrame(() => message.classList.add("show"));
    messageTimer = setTimeout(() => {
      message.classList.remove("show");
      removeTimer = setTimeout(() => {
        message.remove();
      }, 300);
    }, timer);
  }
  function clearGesture(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchStart = null;
    if (!activePointers.size) panStart = null;
  }
  // جلوگیری از برخورد نوار مولین‌ها با یکدیگر
  function canMoveMullionWithoutCrossing(
    list,
    id,
    nextPos,
    axis = 'vertical',
    clearGap = 40
  ) {
    if (!Array.isArray(list) || list.length <= 1) return true;
    const current = list.find(item => item.id === id);
    if (!current) return false;
    // ضخامت مولین + فاصله خالی موردنیاز
    const totalGap = state.mullionWidth + clearGap;
    // تبدیل فاصله واقعی به موقعیت نرمال‌شده
    const dimension = axis === 'horizontal'
      ? state.height
      : state.width;
    const minGap = totalGap / dimension;
    const others = list
      .filter(item => item.id !== id)
      .sort((a, b) => a.pos - b.pos);
    const previous = others
      .filter(item => item.pos < current.pos)
      .pop();
    const next = others.find(item => item.pos > current.pos);
    const lower = previous
      ? previous.pos + minGap
      : minGap;
    const upper = next
      ? next.pos - minGap
      : 1 - minGap;
    return nextPos >= lower && nextPos <= upper;
  }
  function endDrag(e) {
    pendingOpeningDrag = null;
    if (!state.drag) return;
    const drag = state.drag;
    if (drag.type === 'mullion' && Number.isFinite(drag.previewPos)) {
      const item = state.mullions[drag.index];
      if (
        item &&
        canMoveMullionWithoutCrossing(
          state.mullions,
          item.id,
          drag.previewPos
        )
      ) {
        item.pos = drag.previewPos;
      } else {
        showMessage(
          'آیتم موردنظر معتبر نیست؛ مولین نمی‌تواند از مولین مجاور عبور کند.',
          'error'
        );
        state.history.pop();
      }
    } else if (
      drag.type === 'horizontalMullion' &&
      Number.isFinite(drag.previewPos)
    ) {
      const item = state.horizontalMullions[drag.index];
      if (
        item &&
        canMoveMullionWithoutCrossing(
          state.horizontalMullions,
          item.id,
          drag.previewPos
        )
      ) {
        item.pos = drag.previewPos;
      } else {
        showMessage(
          'آیتم موردنظر معتبر نیست؛ مولین نمی‌تواند از مولین مجاور عبور کند.',
          'error'
        );
        state.history.pop();
      }
    } else if (drag.type === 'opening' && e) {
      const gp = glassAt(point(e));
      if (gp) {
        const cell = getCellAt(gp);
        const occupied = state.openings.some((o, i) =>
          i !== drag.index && sameCell(o, cell)
        );
        if (!occupied) Object.assign(state.openings[drag.index], cell);
      }
    } else if (
      drag.type === 'nestedMullion' &&
      Number.isFinite(drag.previewPos)
    ) {
      const list = ensureNestedChildren(drag.nestedParent).mullions;
      const item = list.find(m => m.id === drag.nestedId);
      if (
        item &&
        canMoveMullionWithoutCrossing(list, item.id, drag.previewPos)
      ) {
        item.pos = drag.previewPos;
      } else {
        showMessage(
          'آیتم موردنظر معتبر نیست؛ مولین نمی‌تواند از مولین مجاور عبور کند.',
          'error'
        );
        state.history.pop();
      }
    } else if (
      drag.type === 'nestedHorizontalMullion' &&
      Number.isFinite(drag.previewPos)
    ) {
      const list = ensureNestedChildren(drag.nestedParent).horizontalMullions;
      const item = list.find(m => m.id === drag.nestedId);
      if (
        item &&
        canMoveMullionWithoutCrossing(list, item.id, drag.previewPos)
      ) {
        item.pos = drag.previewPos;
      } else {
        showMessage(
          'آیتم موردنظر معتبر نیست؛ مولین نمی‌تواند از مولین مجاور عبور کند.',
          'error'
        );
        state.history.pop();
      }
    } else if (drag.type === 'nestedOpening' && e) {
      const children = ensureNestedChildren(drag.nestedParent);
      const item = children.openings.find(o => o.id === drag.nestedId);
      if (item && drag.nestedArea.w > 0 && drag.nestedArea.h > 0) {
        const p = point(e);
        const gp = {
          x: (p.x - drag.nestedArea.x) / drag.nestedArea.w,
          y: (p.y - drag.nestedArea.y) / drag.nestedArea.h
        };
        const cell = nestedCellAt(children, gp);
        const occupied = children.openings.some(o => o.id !== item.id &&
          o.leftId === cell.leftId && o.rightId === cell.rightId &&
          o.topId === cell.topId && o.bottomId === cell.bottomId);
        if (!occupied) Object.assign(item, cell);
      }
    } else if (drag.type === 'nestedPanel' && e) {
      const children = ensureNestedChildren(drag.nestedParent);
      const item = children.panels.find(panel => panel.id === drag.nestedId);
      if (item && drag.nestedArea.w > 0 && drag.nestedArea.h > 0) {
        const p = point(e);
        const gp = {
          x: (p.x - drag.nestedArea.x) / drag.nestedArea.w,
          y: (p.y - drag.nestedArea.y) / drag.nestedArea.h
        };
        Object.assign(item, nestedCellAt(children, gp));
      }
    }
    state.drag = null;
    canvas.style.cursor = 'default';
    state.previewMullion = null;
    draw();
  }
  function syncInputs() {
    if ($('widthInput')) $('widthInput').value = state.width;
    if ($('heightInput')) $('heightInput').value = state.height;
    if ($('countInput')) $('countInput').value = state.count;
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
  function zoom(f) {
    state.zoom = Math.max(.35, Math.min(3, state.zoom * f));
    draw();
  }
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
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  ensureShapeDialog();
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
        item.topId = cell.topId;
        item.bottomId = cell.bottomId;
        delete item.y1;
        delete item.y2;
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
        item.leftId = cell.leftId;
        item.rightId = cell.rightId;
        delete item.x1;
        delete item.x2;
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
    if (state.tool === 'verticalPanel' || state.tool === 'horizontalPanel') {
      const nested = nestedContextAt(p);
      if (nested) { saveHistory(); addNestedToolItem(state.tool, p, nested); state.tool = 'select'; draw(); return; }
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      if (!cell) return;
      saveHistory();
      const panel = {
        ...cell,
        id: state.nextId++,
        orientation: state.tool === 'verticalPanel' ? 'vertical' : 'horizontal'
      };
      state.panels.push(panel);
      state.selected = { type: 'panel', index: state.panels.length - 1 };
      state.tool = 'select';
      draw();
      return;
    }
    if (state.tool === 'mullion') {
      const nested = nestedContextAt(p);
      if (nested) { saveHistory(); addNestedToolItem(state.tool, p, nested); state.tool = 'select'; draw(); return; }
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
      let lastId;
      for (let i = 1; i <= n; i++) {
        lastId = state.nextId++;
        state.mullions.push({
          id: lastId,
          pos: left + (right - left) * i / (n + 1),
          topId: cell.topId,
          bottomId: cell.bottomId
        });
      }
      state.mullions.sort((a, b) => a.pos - b.pos);
      state.selected = null;
      state.selectedPart = null;
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (state.tool === 'horizontalMullion') {
      const nested = nestedContextAt(p);
      if (nested) { saveHistory(); addNestedToolItem(state.tool, p, nested); state.tool = 'select'; draw(); return; }
      const gp = glassAt(p);
      if (!gp) return;
      const cell = getCellAt(gp);
      const left = cell.leftId == null ? 0 : state.mullions.find(m => m.id === cell.leftId).pos;
      const right = cell.rightId == null ? 1 : state.mullions.find(m => m.id === cell.rightId).pos;
      const top = cell.topId == null ? 0 : state.horizontalMullions.find(m => m.id === cell.topId).pos;
      const bottom = cell.bottomId == null ? 1 : state.horizontalMullions.find(m => m.id === cell.bottomId).pos;
      saveHistory();
      const n = Number(state.toolCount || 1);
      let lastId;
      for (let i = 1; i <= n; i++) {
        lastId = state.nextId++;
        state.horizontalMullions.push({
          id: lastId,
          pos: top + (bottom - top) * i / (n + 1),
          leftId: cell.leftId,
          rightId: cell.rightId
        });
      }
      state.horizontalMullions.sort((a, b) => a.pos - b.pos);
      state.selected = null;
      state.selectedPart = null;
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (state.tool === 'frenchWindow' || state.tool === 'frenchDoor') {
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
      // مولین وسط برای تقسیم پنجره فرانسوی
      state.mullions.push({
        id,
        pos: (leftPos + rightPos) / 2,
        topId: cell.topId,
        bottomId: cell.bottomId
      });
      const emptyChildren = () => ({
        mullions: [],
        horizontalMullions: [],
        openings: [],
        panels: []
      });
      const isLeftOpen = state.openDirection === 'left';
      if (state.openingType === 'simple') {
        // پنجره فرانسوی ساده
        const leftWindow = {
          ...cell,
          id: state.nextId++,
          rightId: id,
          direction: 'left',
          openingType: isLeftOpen ? 'single' : 'french-simple',
          french: true,
          isDoor: state.tool === 'frenchDoor',
          fixed: !isLeftOpen,
          children: emptyChildren()
        };
        const rightWindow = {
          ...cell,
          id: state.nextId++,
          leftId: id,
          direction: 'right',
          openingType: isLeftOpen ? 'french-simple' : 'single',
          french: true,
          isDoor: state.tool === 'frenchDoor',
          fixed: isLeftOpen,
          children: emptyChildren()
        };
        // فقط برای لنگه فرانسوی ساده، مشخصات خطوط وسط شیشه و لولا حفظ شود
        const frenchWindow = isLeftOpen ? rightWindow : leftWindow;
        // کپی مشخصات خطوط و لولا از سلول اصلی
        frenchWindow.mullions = [...(cell.mullions || [])];
        frenchWindow.horizontalMullions = [...(cell.horizontalMullions || [])];
        state.openings.push(leftWindow, rightWindow);
      } else {
        // پنجره فرانسوی دوحالته
        const leftWindow = {
          ...cell,
          id: state.nextId++,
          rightId: id,
          direction: 'left',
          openingType: 'dual',
          french: true,
          isDoor: state.tool === 'frenchDoor',
          fixed: !isLeftOpen,
          children: emptyChildren()
        };
        const rightWindow = {
          ...cell,
          id: state.nextId++,
          leftId: id,
          direction: 'right',
          openingType: 'dual',
          french: true,
          isDoor: state.tool === 'frenchDoor',
          fixed: isLeftOpen,
          children: emptyChildren()
        };
        const frenchWindow = isLeftOpen ? rightWindow : leftWindow;
        frenchWindow.mullions = [...(cell.mullions || [])];
        frenchWindow.horizontalMullions = [
          ...(cell.horizontalMullions || [])
        ];
        state.openings.push(leftWindow, rightWindow);
      }
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (state.tool === 'doorOpening') {
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
        id: state.nextId++,
        direction: state.openDirection || 'left',
        openingType: state.openingType || 'single',
        fixed: false,
        isDoor: true,
        children: { mullions: [], horizontalMullions: [], openings: [], panels: [] }
      });
      state.selected = { type: 'opening', index: state.openings.length - 1 };
      state.tool = 'select';
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    if (state.tool === 'opening') {
      const nested = nestedContextAt(p);
      if (nested) { saveHistory(); addNestedToolItem(state.tool, p, nested); state.tool = 'select'; draw(); return; }
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
        id: state.nextId++,
        direction: state.openDirection || 'left',
        openingType: state.openingType || 'single',
        fixed: state.openDirection === 'fixed',
        children: { mullions: [], horizontalMullions: [], openings: [], panels: [] }
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
        ? { type: 'opening', index: found.index }
        : null;
      state.tool = 'select';
      renderSettings();
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    state.selected = found;
    if (found?.type === 'nestedMullion' || found?.type === 'nestedHorizontalMullion' ||
      found?.type === 'nestedOpening' || found?.type === 'nestedPanel') {
      saveHistory();
      state.drag = {
        ...found,
        start: p,
        current: p,
        original: clone(
          found.type === 'nestedMullion' ? found.nestedParent.children.mullions[found.index] :
            found.type === 'nestedHorizontalMullion' ? found.nestedParent.children.horizontalMullions[found.index] :
              found.type === 'nestedOpening' ? found.nestedParent.children.openings[found.index] :
                found.nestedParent.children.panels[found.index]
        )
      };
      state.selectedPart = null;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
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
    } else if (state.drag.type === 'nestedMullion') {
      const a = state.drag.nestedArea;
      state.drag.previewPos = Math.max(.025, Math.min(.975, (p.x - a.x) / Math.max(1, a.w)));
      state.previewMullion = p;
    } else if (state.drag.type === 'nestedHorizontalMullion') {
      const a = state.drag.nestedArea;
      state.drag.previewPos = Math.max(.025, Math.min(.975, (p.y - a.y) / Math.max(1, a.h)));
      state.previewMullion = p;
    } else if (state.drag.type === 'nestedOpening' || state.drag.type === 'nestedPanel') {
      state.drag.current = p;
    }
    draw();
  });
  $('newBtn').addEventListener('click', () => {
    $('newWidth').value = state.width;
    $('newHeight').value = state.height;
    $('newCount').value = state.count;
    $('newWidthClearance').value = state.widthClearance ?? 0;
    $('newHeightClearance').value = state.heightClearance ?? 0;
    $('newDialog').showModal();
  });
  $('createBtn').addEventListener('click', e => {
    e.preventDefault();
    const w = Number($('newWidth').value) - Number($('newWidthClearance').value || 0);
    const h = Number($('newHeight').value) - Number($('newHeightClearance').value || 0);
    if (applyDims(w, h, $('newCount').value)) {
      $('newDialog').close();
    }
  });
  [1, 2, 3].forEach(n => {
    $('mullion' + n).addEventListener('click', () => {
      state.tool = 'mullion';
      state.toolCount = n;
      state.selected = null;
      state.selectedPart = null;
      canvas.style.cursor = 'crosshair';
      $('status').textContent = `مولین عمودی ${fa(n)}: روی شیشه کلیک کنید`;
      draw();
    });
    $('horizontalMullion' + n).addEventListener('click', () => {
      state.tool = 'horizontalMullion';
      state.toolCount = n;
      // حذف انتخاب قبلی و رنگ آبی
      state.selected = null;
      state.selectedPart = null;
      canvas.style.cursor = 'crosshair';
      $('status').textContent = `مولین افقی ${fa(n)}: روی شیشه کلیک کنید`;
      draw();
    });
  });
  // پنجره تک حالته
  $('leftOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openingType = 'single';
    state.openDirection = 'left';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('rightOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openingType = 'single';
    state.openDirection = 'right';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('topOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openingType = 'single';
    state.openDirection = 'top';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره بالا‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('bottomOpenBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openingType = 'single';
    state.openDirection = 'bottom';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره پایین‌بازشو: روی خانه شیشه کلیک کنید';
  });
  // پنجره دو حالته
  $('dualRightBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'left';
    state.openingType = 'dual';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره دوحالته چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('dualLeftBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'right';
    state.openingType = 'dual';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره دوحالته راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('dualSimpleBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'fixed';
    state.openingType = 'simple';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره ساده: روی خانه شیشه کلیک کنید';
  });
  // پنجره محوری
  $('radialLeftBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'left';
    state.openingType = 'radial';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره محوری چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('radialRightBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'right';
    state.openingType = 'radial';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره محوری راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('radialTopBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'top';
    state.openingType = 'radial';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره محوری بالا‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('radialBottomBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'bottom';
    state.openingType = 'radial';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره محوری پایین‌بازشو: روی خانه شیشه کلیک کنید';
  });
  // پنجره فولکس واگنی
  $('volkswagenRightBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'left';
    state.openingType = 'volkswagen';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره فولکس واگنی چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('volkswagenLeftBtn').addEventListener('click', () => {
    state.tool = 'opening';
    state.openDirection = 'right';
    state.openingType = 'volkswagen';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'پنجره فولکس واگنی راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  // پنجره فرانسوی
  $('frenchSimpleLeftBtn').addEventListener('click', () => {
    state.tool = 'frenchWindow';
    state.openDirection = 'left';
    state.openingType = 'simple';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'درب فرانسوی تک‌حالته چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('frenchSimpleRightBtn').addEventListener('click', () => {
    state.tool = 'frenchWindow';
    state.openDirection = 'right';
    state.openingType = 'simple';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'درب فرانسوی تک‌حالته راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('frenchDualLeftBtn').addEventListener('click', () => {
    state.tool = 'frenchWindow';
    state.openDirection = 'left';
    state.openingType = 'dual';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'درب فرانسوی دوحالته چپ‌بازشو: روی خانه شیشه کلیک کنید';
  });
  $('frenchDualRightBtn').addEventListener('click', () => {
    state.tool = 'frenchWindow';
    state.openDirection = 'right';
    state.openingType = 'dual';
    canvas.style.cursor = 'crosshair';
    $('status').textContent = 'درب فرانسوی دوحالته راست‌بازشو: روی خانه شیشه کلیک کنید';
  });
  // درب تک‌حالته و دوحالته
  function selectDoorTool(direction, openingType, label) {
    state.tool = 'doorOpening';
    state.openDirection = direction;
    state.openingType = openingType;
    state.selected = null;
    state.selectedPart = null;
    canvas.style.cursor = 'crosshair';
    $('status').textContent = `${label}: روی خانه شیشه کلیک کنید`;
  }
  $('doorSingleLeftBtn').addEventListener('click', () =>
    selectDoorTool('left', 'single', 'درب تک‌حالته چپ‌بازشو'));
  $('doorSingleRightBtn').addEventListener('click', () =>
    selectDoorTool('right', 'single', 'درب تک‌حالته راست‌بازشو'));
  $('doorDualLeftBtn').addEventListener('click', () =>
    selectDoorTool('left', 'dual', 'درب دوحالته چپ‌بازشو'));
  $('doorDualRightBtn').addEventListener('click', () =>
    selectDoorTool('right', 'dual', 'درب دوحالته راست‌بازشو'));
  // درب فرانسوی؛ دو لنگه و مولین وسط مشابه پنجره فرانسوی
  function selectFrenchDoorTool(direction, openingType, label) {
    state.tool = 'frenchDoor';
    state.openDirection = direction;
    state.openingType = openingType;
    state.selected = null;
    state.selectedPart = null;
    canvas.style.cursor = 'crosshair';
    $('status').textContent = `${label}: روی خانه شیشه کلیک کنید`;
  }
  $('frenchDoorSingleLeftBtn').addEventListener('click', () =>
    selectFrenchDoorTool('left', 'simple', 'درب فرانسوی تک‌حالته چپ‌بازشو'));
  $('frenchDoorSingleRightBtn').addEventListener('click', () =>
    selectFrenchDoorTool('right', 'simple', 'درب فرانسوی تک‌حالته راست‌بازشو'));
  $('frenchDoorDualLeftBtn').addEventListener('click', () =>
    selectFrenchDoorTool('left', 'dual', 'درب فرانسوی دوحالته چپ‌بازشو'));
  $('frenchDoorDualRightBtn').addEventListener('click', () =>
    selectFrenchDoorTool('right', 'dual', 'درب فرانسوی دوحالته راست‌بازشو'));
  $('selectBtn').addEventListener('click', () => {
    state.tool = 'select';
    canvas.style.cursor = 'default';
  });
  // حذف مولین و تمام اجزایی که به مرز آن وابسته هستند
  function removeMullionWithDependents(container, axis, id) {
    const removed = new Set([id]);
    const keys = ['mullions', 'horizontalMullions', 'openings', 'panels'];
    const bounds = ['leftId', 'rightId', 'topId', 'bottomId'];
    let changed = true;
    while (changed) {
      changed = false;
      for (const key of keys) {
        const list = container[key] || [];
        const kept = [];
        for (const item of list) {
          const dependsOnRemoved = bounds.some(
            bound => removed.has(item[bound])
          );
          const isTarget =
            key === (axis === 'vertical' ? 'mullions' : 'horizontalMullions') &&
            item.id === id;
          if (isTarget || dependsOnRemoved) {
            if (!removed.has(item.id)) {
              removed.add(item.id);
              changed = true;
            }
            if (isTarget) changed = true;
          } else {
            kept.push(item);
          }
        }
        container[key] = kept;
      }
    }
  }
  $('deleteBtn').addEventListener('click', () => {
    // حذف مولین، پنجره یا پنل داخل پنجره تو در تو
    if (
      state.selected &&
      [
        'nestedMullion',
        'nestedHorizontalMullion',
        'nestedOpening',
        'nestedPanel'
      ].includes(state.selected.type)
    ) {
      const selected = state.selected;
      const children = ensureNestedChildren(selected.nestedParent);
      saveHistory();
      if (
        selected.type === 'nestedMullion' ||
        selected.type === 'nestedHorizontalMullion'
      ) {
        const axis =
          selected.type === 'nestedMullion' ? 'vertical' : 'horizontal';
        removeMullionWithDependents(
          children,
          axis,
          selected.nestedId
        );
      } else {
        const key =
          selected.type === 'nestedOpening' ? 'openings' : 'panels';
        const at = children[key].findIndex(
          item => item.id === selected.nestedId
        );
        if (at >= 0) children[key].splice(at, 1);
      }
      state.selected = null;
      state.drag = null;
      draw();
      return;
    }
    if (!state.selected) return;
    const s = state.selected;
    // حذف پنل اصلی
    if (s.type === 'panel') {
      saveHistory();
      state.panels.splice(s.index, 1);
      state.selected = null;
      draw();
      return;
    }
    if (
      !['mullion', 'horizontalMullion', 'opening'].includes(s.type)
    ) return;
    saveHistory();
    // حذف مولین عمودی و اجزای وابسته به آن
    if (s.type === 'mullion') {
      const gone = state.mullions[s.index];
      if (gone) {
        removeMullionWithDependents(
          state,
          'vertical',
          gone.id
        );
      }
    } else if (s.type === 'horizontalMullion') {
      const gone = state.horizontalMullions[s.index];
      if (gone) {
        removeMullionWithDependents(
          state,
          'horizontal',
          gone.id
        );
      }
    } else if (s.type === 'opening') {
      state.openings.splice(s.index, 1);
    }
    state.selected = null;
    state.drag = null;
    draw();
  });
  $('reverseOpeningBtn').addEventListener('click', () => {
    const s = state.selected;
    if (!s || s.type !== 'opening') {
      $('status').textContent = 'ابتدا پنجره را انتخاب کنید.';
      return;
    }
    const opening = state.openings[s.index];
    if (!opening || opening.french) {
      $('status').textContent = 'فقط پنجره‌های معمولی قابل برعکس شدن هستند.';
      return;
    }
    saveHistory();
    const reverseDirections = {
      right: 'left',
      left: 'right',
      top: 'bottom',
      bottom: 'top'
    };
    opening.direction = reverseDirections[opening.direction] || 'right';
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
  ['zoomInBtn'].forEach(id =>
    $(id).addEventListener('click', () => zoom(1.15))
  );
  ['zoomOutBtn'].forEach(id =>
    $(id).addEventListener('click', () => zoom(1 / 1.15))
  );
  $('resetBtn').addEventListener('click', reset);
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
  document.querySelectorAll('.tool-dialog .modal-tool:not(:disabled)').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('dialog').close();
    });
  });
  const rightMenu = document.querySelector('.right-panel');
  const leftMenu = document.querySelector('.left-panel');
  const menuBackdrop = document.getElementById('mobileMenuBackdrop');
  function closeMobileMenus() {
    rightMenu.classList.remove('mobile-open');
    leftMenu.classList.remove('mobile-open');
    menuBackdrop.classList.remove('mobile-visible');
  }
  document.getElementById('openRightMenuBtn').addEventListener('click', () => {
    closeMobileMenus();
    rightMenu.classList.add('mobile-open');
    menuBackdrop.classList.add('mobile-visible');
  });
  document.getElementById('openLeftMenuBtn').addEventListener('click', () => {
    closeMobileMenus();
    leftMenu.classList.add('mobile-open');
    menuBackdrop.classList.add('mobile-visible');
  });
  menuBackdrop.addEventListener('click', closeMobileMenus);
  document.querySelectorAll('[data-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const modal = document.getElementById(button.dataset.modal);
      if (modal) {
        modal.showModal();
      } else {
        showMessage('پنجره موردنظر پیدا نشد.', 'error');
      }
    });
  });
  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('dialog')?.close();
      // showMessage('پنجره بسته شد.', 'info');
    });
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });
  const messages = {
    calculationsBtn: ['بخش محاسبات به‌زودی فعال می‌شود.', 'info'],
    saveBtn: ['قابلیت ذخیره طرح هنوز پیاده‌سازی نشده است.', 'warning'],
    settingsBtn: ['بخش تنظیمات به‌زودی فعال می‌شود.', 'info']
  };
  Object.entries(messages).forEach(([id, [message, type]]) => {
    document.getElementById(id)?.addEventListener('click', () => {
      showMessage(message, type);
    });
  });
  $('verticalPanelBtn').addEventListener('click', () => {
    state.tool = 'verticalPanel';
  });
  $('horizontalPanelBtn').addEventListener('click', () => {
    state.tool = 'horizontalPanel';
  });
  // مدیریت باز و بسته شدن مدال سه‌بعدی
  document.addEventListener('DOMContentLoaded', () => {
    const openButton = document.getElementById('view3DButton');
    const modal = document.getElementById('myModal');
    const closeButton = modal?.querySelector('.wd-3d-close-btn');
    if (!openButton || !modal || !closeButton) {
      console.error('دکمه یا مدال سه‌بعدی پیدا نشد.');
      return;
    }
    function open3DModal() {
      modal.style.display = 'flex';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.zIndex = '99999';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        const initialized = init3D('3d');
        if (initialized) {
          resize3D();
        }
      });
    }
    function close3DModal() {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
    openButton.addEventListener('click', open3DModal);
    closeButton.addEventListener('click', close3DModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        close3DModal();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.style.display !== 'none') {
        close3DModal();
      }
    });
  });
})();