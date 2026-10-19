(() => {
  const canvas = document.getElementById('designCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  canvas.style.touchAction = 'none';
  const state = {
    width: 200, height: 150, count: 1, zoom: 1,sideFrames: [],
    mullions: [], horizontalMullions: [], openings: [],
    selected: null, tool: 'select', nextId: 1,
    history: [], future: [], drag: null,
    frame: 5, mullionWidth: 3,
    frameType: 'فریم معمولی',
    glassType: '۴ + ۱۲ + ۴ ساده',
    glassColor: '#8bd9f7',
    meshType: 'بدون توری',
    beadType: 'زهوار تک‌حالته',
    selectedPart: null
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
    $('dimensionDialog').showModal();
    $('dimensionValue').focus();
  }
  function dimensionText(value, x, y, size, type, index = null) {
    text(fa(value), x, y, size);
    dimensionLabels.push({
      x, y, type, index,
      radius: Math.max(16, size)
    });
  }
  const frameOptions = [
    { name: 'فریم معمولی', size: 5 },
    { name: 'سوپر فریم', size: 7 },
    { name: 'فریم بازسازی', size: 9 },
    { name: 'فریم پهن', size: 11 }
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
  const fa = n => String(Math.round(n))
    .replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const clone = value => JSON.parse(JSON.stringify(value));
  function snapshot() {
    return {
      width: state.width,
      height: state.height,
      count: state.count,
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
      selectedPart: state.selectedPart
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
    const scale = Math.max(.01, Math.min(
      (w - padX * 2) / (state.width + 30),
      (h - padY * 2) / (state.height + 30)
    ) * state.zoom);
    const fw = state.width * scale;
    const fh = state.height * scale;
    return {
      w, h, scale,
      x: (w - fw) / 2,
      y: (h - fh) / 2,
      fw, fh,
      t: Math.max(5, Math.min(20, state.frame * scale))
    };
  }
  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function arrow(x, y, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(0, 0);
    ctx.lineTo(-7, 4);
    ctx.stroke();
    ctx.restore();
  }
  function text(s, x, y, size, align = 'center') {
    ctx.font = `bold ${size}px Tahoma,Arial`;
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
    const leftPos = leftM ? leftM.pos : 0;
    const rightPos = rightM ? rightM.pos : 1;
    const topPos = topM ? topM.pos : 0;
    const bottomPos = bottomM ? bottomM.pos : 1;
    return {
      leftM, rightM, topM, bottomM,
      x: inner.x + leftPos * inner.w,
      y: inner.y + topPos * inner.h,
      w: Math.max(0, (rightPos - leftPos) * inner.w),
      h: Math.max(0, (bottomPos - topPos) * inner.h)
    };
  }
  function glassAt(p) {
    const inner = getInner();
    if (!inner.w || !inner.h) return null;
    if (
      p.x >= inner.x && p.x <= inner.x + inner.w &&
      p.y >= inner.y && p.y <= inner.y + inner.h
    ) {
      return {
        x: (p.x - inner.x) / inner.w,
        y: (p.y - inner.y) / inner.h
      };
    }
    return null;
  }
  function getCellAt(gp) {
    const vertical = [...state.mullions].sort((a, b) => a.pos - b.pos);
    const horizontal = [...state.horizontalMullions]
      .sort((a, b) => a.pos - b.pos);
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
  function drawGlass(x, y, w, h) {
    ctx.fillStyle = state.glassColor;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = '#ffffff50';
    ctx.lineWidth = Math.max(5, w * .025);
    ctx.beginPath();
    ctx.moveTo(x - h * .15, y + h * .8);
    ctx.lineTo(x + w * .7, y - h * .05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * .25, y + h * 1.1);
    ctx.lineTo(x + w * 1.05, y + h * .2);
    ctx.stroke();
    if (state.meshType !== 'بدون توری') {
      ctx.fillStyle = '#27334255';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#26344570';
      ctx.lineWidth = .6;
      const gap = state.meshType === 'توری پلیسه' ? 5 : 8;
      for (let xx = x; xx < x + w; xx += gap) {
        line(xx, y, xx, y + h);
      }
      for (let yy = y; yy < y + h; yy += gap) {
        line(x, yy, x + w, yy);
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
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
    // اندازه کل عرض
    ctx.strokeStyle = '#1672f9';
    ctx.fillStyle = '#1672f9';
    ctx.lineWidth = 1.4;
    const top = y - 30;
    line(x, top, x + fw, top);
    arrow(x, top, 0);
    arrow(x + fw, top, Math.PI);
    line(x, top - 13, x, top + 13);
    line(x + fw, top - 13, x + fw, top + 13);
    dimensionText(state.width, x + fw / 2, top - 10, 18, 'width');
    // اندازه کل ارتفاع
    const left = x - 35;
    line(left, y, left, y + fh);
    arrow(left, y, Math.PI / 2);
    arrow(left, y + fh, -Math.PI / 2);
    line(left - 13, y, left + 13, y);
    line(left - 13, y + fh, left + 13, y + fh);
    ctx.save();
    ctx.translate(left - 15, y + fh / 2);
    ctx.rotate(-Math.PI / 2);
    text(fa(state.height), 0, 0, 18);
    ctx.restore();
    dimensionLabels.push({
      x: left - 15,
      y: y + fh / 2,
      type: 'height',
      radius: 20
    });
    // فریم اصلی با ضخامت قابل تنظیم
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = state.selectedPart === 'frame' ? '#1672f9' : '#111';
    ctx.lineWidth = state.selectedPart === 'frame' ? 3 : 2;
    ctx.fillRect(x, y, fw, fh);
    ctx.strokeRect(x, y, fw, fh);
    // شیشه اصلی
    drawGlass(inner.x, inner.y, inner.w, inner.h);
    if (state.selectedPart === 'glass') {
      ctx.strokeStyle = '#1672f9';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(inner.x + 2, inner.y + 2,
        Math.max(0, inner.w - 4), Math.max(0, inner.h - 4));
      ctx.setLineDash([]);
    }
    // مولین‌های عمودی
    state.mullions.forEach((m, i) => {
      const mx = inner.x + m.pos * inner.w;
      const mw = Math.max(3, state.mullionWidth * g.scale);
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx - mw / 2, inner.y, mw, inner.h);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx - mw / 2, inner.y, mw, inner.h);
      if (state.selected?.type === 'mullion' &&
        state.selected.index === i) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(mx - mw / 2 - 3, inner.y + 1,
          mw + 6, inner.h - 2);
        ctx.setLineDash([]);
      }
    });
    // مولین‌های افقی
    state.horizontalMullions.forEach((m, i) => {
      const my = inner.y + m.pos * inner.h;
      const mh = Math.max(3, state.mullionWidth * g.scale);
      ctx.fillStyle = '#fff';
      ctx.fillRect(inner.x, my - mh / 2, inner.w, mh);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(inner.x, my - mh / 2, inner.w, mh);
      if (state.selected?.type === 'horizontalMullion' &&
        state.selected.index === i) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#1672f9';
        ctx.lineWidth = 2;
        ctx.strokeRect(inner.x, my - mh / 2 - 3,
          inner.w, mh + 6);
        ctx.setLineDash([]);
      }
    });
    // اندازه عرض هر ستون
    const sortedV = [...state.mullions].sort((a, b) => a.pos - b.pos);
    const boundsV = [0, ...sortedV.map(m => m.pos), 1];
    ctx.save();
    ctx.strokeStyle = '#1672f9';
    ctx.fillStyle = '#1672f9';
    ctx.lineWidth = 1;
    boundsV.slice(0, -1).forEach((b, i) => {
      const r = boundsV[i + 1];
      const sx = inner.x + b * inner.w;
      const ex = inner.x + r * inner.w;
      const dy = inner.y + inner.h + 20;
      line(sx, dy, ex, dy);
      arrow(sx, dy, 0);
      arrow(ex, dy, Math.PI);
      line(sx, dy - 5, sx, dy + 5);
      line(ex, dy - 5, ex, dy + 5);
      dimensionText(
        state.width * (r - b),
        (sx + ex) / 2,
        dy + 12,
        Math.max(10, Math.min(14, inner.w * .035)),
        'column',
        i
      );
    });
    // اندازه ارتفاع هر ردیف
    const sortedH = [...state.horizontalMullions]
      .sort((a, b) => a.pos - b.pos);
    const boundsH = [0, ...sortedH.map(m => m.pos), 1];
    boundsH.slice(0, -1).forEach((b, i) => {
      const r = boundsH[i + 1];
      const sy = inner.y + b * inner.h;
      const ey = inner.y + r * inner.h;
      const dx = x - 70;
      line(dx, sy, dx, ey);
      arrow(dx, sy, Math.PI / 2);
      arrow(dx, ey, -Math.PI / 2);
      line(dx - 5, sy, dx + 5, sy);
      line(dx - 5, ey, dx + 5, ey);
      ctx.save();
      ctx.translate(dx - 13, (sy + ey) / 2);
      ctx.rotate(-Math.PI / 2);
      text(fa(state.height * (r - b)), 0, 0,
        Math.max(10, Math.min(14, inner.h * .035)));
      ctx.restore();
      dimensionLabels.push({
        x: dx - 13,
        y: (sy + ey) / 2,
        type: 'row',
        index: i,
        radius: 20
      });
    });
    ctx.restore();
    // بازشوها
    state.openings.forEach((o, i) => {
      const b = getOpeningBounds(o, inner);
      const isDragging = state.drag?.type === 'opening' &&
        state.drag.index === i;
      let ox = b.x;
      let oy = b.y;
      let ow = b.w;
      let oh = b.h;
      if (isDragging && state.drag.current) {
        ox += state.drag.current.x - state.drag.start.x;
        oy += state.drag.current.y - state.drag.start.y;
      }
      const ft = Math.max(3, t * .65);
      const overlap = Math.min(3, ft * .15);
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
      if (isDragging) ctx.globalAlpha = .85;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, ow, oh);
      const glassX = ox + ft;
      const glassY = oy + ft;
      const glassW = Math.max(0, ow - ft * 2);
      const glassH = Math.max(0, oh - ft * 2);
      drawGlass(glassX, glassY, glassW, glassH);
      ctx.strokeStyle = '#1672f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + ow * .06, oy + oh * .06);
      ctx.lineTo(ox + ow * .94, oy + oh * .94);
      ctx.lineTo(ox + ow * .94, oy + oh * .06);
      ctx.stroke();
      const dir = o.direction === 'left' ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ox + ow / 2, oy + oh / 2);
      ctx.lineTo(ox + ow / 2 + dir * ow * .22, oy + oh / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + ow / 2 + dir * ow * .22, oy + oh / 2);
      ctx.lineTo(ox + ow / 2 + dir * ow * .12,
        oy + oh / 2 - oh * .08);
      ctx.moveTo(ox + ow / 2 + dir * ow * .22, oy + oh / 2);
      ctx.lineTo(ox + ow / 2 + dir * ow * .12,
        oy + oh / 2 + oh * .08);
      ctx.stroke();
      if (state.selected?.type === 'opening' &&
        state.selected.index === i) {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#1672f9';
        ctx.strokeRect(ox - 3, oy - 3, ow + 6, oh + 6);
        ctx.setLineDash([]);
      }
      ctx.restore();
    });
    ctx.restore();
    $('status').textContent =
      `عرض: ${fa(state.width)} | ارتفاع: ${fa(state.height)} | تعداد: ${fa(state.count)} | مولین عمودی: ${fa(state.mullions.length)} | مولین افقی: ${fa(state.horizontalMullions.length)}`;
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
        <p class="option-info">با انتخاب مدل، ضخامت نمایشی فریم تغییر می‌کند.</p>
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
    for (let i = state.openings.length - 1; i >= 0; i--) {
      const b = getOpeningBounds(state.openings[i], inner);
      if (
        p.x >= b.x + 5 && p.x <= b.x + b.w - 5 &&
        p.y >= b.y + 5 && p.y <= b.y + b.h - 5
      ) return { type: 'opening', index: i };
    }
    if (
      p.x >= inner.x && p.x <= inner.x + inner.w &&
      p.y >= inner.y && p.y <= inner.y + inner.h
    ) return { type: 'glass' };
    if (
      p.x >= g.x && p.x <= g.x + g.fw &&
      p.y >= g.y && p.y <= g.y + g.fh
    ) return { type: 'frame' };
    return null;
  }
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
    if (state.tool === 'mullion') {
      if (!glassAt(p)) return;
      saveHistory();
      const n = Number(state.toolCount || 1);
      for (let i = 1; i <= n; i++) {
        state.mullions.push({
          id: state.nextId++,
          pos: i / (n + 1)
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
      if (!glassAt(p)) return;
      saveHistory();
      const n = Number(state.toolCount || 1);
      for (let i = 1; i <= n; i++) {
        state.horizontalMullions.push({
          id: state.nextId++,
          pos: i / (n + 1)
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
    if (found?.type === 'frame' || found?.type === 'glass') {
      state.selectedPart = found.type;
      state.selected = null;
      state.tool = 'select';
      renderSettings();
      canvas.style.cursor = 'default';
      draw();
      return;
    }
    state.selected = found;
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
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      draw();
      return;
    }
    draw();
  });
  canvas.addEventListener('pointermove', e => {
    if (!state.drag) return;
    const p = point(e);
    const g = geom();
    const dx = (p.x - state.drag.start.x) /
      Math.max(1, g.fw - 2 * g.t);
    if (state.drag.type === 'opening') {
      state.drag.current = p;
    } else if (state.drag.type === 'mullion') {
      state.mullions[state.drag.index].pos =
        Math.max(.04, Math.min(.96, state.drag.original.pos + dx));
    } else if (state.drag.type === 'horizontalMullion') {
      const dy = (p.y - state.drag.start.y) /
        Math.max(1, g.fh - 2 * g.t);
      state.horizontalMullions[state.drag.index].pos =
        Math.max(.04, Math.min(.96, state.drag.original.pos + dy));
    }
    draw();
  });
  function endDrag(e) {
    if (!state.drag) return;
    const drag = state.drag;
    if (drag.type === 'opening' && e) {
      const gp = glassAt(point(e));
      if (gp) {
        const cell = getCellAt(gp);
        const occupied = state.openings.some((o, i) =>
          i !== drag.index && sameCell(o, cell)
        );
        if (!occupied) {
          Object.assign(state.openings[drag.index], cell);
        }
      }
    }
    state.drag = null;
    canvas.style.cursor = 'default';
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
    } else if (s.type === 'opening') {
      state.openings.splice(s.index, 1);
    }
    state.selected = null;
    state.drag = null;
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
  window.addEventListener('resize', resizeCanvas);
  renderSettings();
  resizeCanvas();
})();