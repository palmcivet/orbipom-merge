// The official portrait layout rotates body 90° clockwise. Guide marks and
// the canvas still read viewport coordinates, which no longer match that box.

export function stageRotated() {
  return document.body?.dataset.rotate === '1';
}

export function stageMetrics(scale) {
  const rotated = stageRotated();
  return {
    width: rotated ? document.body.offsetWidth : window.innerWidth,
    height: rotated ? document.body.offsetHeight : window.innerHeight,
    scale
  };
}

// Box of an axis-aligned element in the body's pre-rotation coordinate space.
export function stageBounds(element) {
  const rect = element.getBoundingClientRect();
  if (!stageRotated()) {
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }
  return {
    x: rect.top,
    y: document.body.offsetHeight - rect.right,
    width: rect.height,
    height: rect.width
  };
}

export function stageLayoutHeight(element) {
  return stageRotated() ? element.offsetHeight : element.getBoundingClientRect().height;
}

// Pointer position in the canvas border box, before the body rotation.
export function canvasLocal(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!stageRotated()) return { x: clientX - rect.left, y: clientY - rect.top };
  return { x: clientY - rect.top, y: rect.right - clientX };
}
