// Pointer editing uses a quiet border. Keyboard navigation keeps a visible locator.
document.addEventListener('pointerdown', () => {
  document.documentElement.dataset.inputMode = 'pointer';
}, true);
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  document.documentElement.dataset.inputMode = 'keyboard';
}, true);
