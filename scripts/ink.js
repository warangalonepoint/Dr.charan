// Handwriting canvas → PNG (and optional OCR hook stub).
// Usage:
//   const ink = mountInkCanvas(canvasEl);
//   const pngBlob = await ink.toPNGBlob();

export function mountInkCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * DPR));
    canvas.height = Math.max(1, Math.floor(height * DPR));
    ctx.scale(DPR, DPR);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e5e7eb';
  }
  resize();
  window.addEventListener('resize', resize);

  let drawing = false, prev = null;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  }
  function down(e){ drawing = true; prev = pos(e); e.preventDefault(); }
  function move(e){
    if(!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    prev = p;
    e.preventDefault();
  }
  function up(){ drawing = false; prev = null; }

  canvas.addEventListener('mousedown', down);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', up);
  canvas.addEventListener('mouseleave', up);
  canvas.addEventListener('touchstart', down, { passive:false });
  canvas.addEventListener('touchmove', move, { passive:false });
  canvas.addEventListener('touchend', up);

  async function toPNGBlob() {
    return await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
  }

  async function ocrStub(/* blob */) {
    // Place for client-side OCR model (optional future).
    return '';
  }

  return { toPNGBlob, ocrStub };
}