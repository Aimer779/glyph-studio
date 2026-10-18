const tuningPanel = document.querySelector('#tuning');
const panelHeader = document.querySelector('#panel-drag');
const positionKey = 'xiaoyaoyou-panel-position';
function placePanel(x, y) {
  const rect = tuningPanel.getBoundingClientRect();
  const left = Math.max(12, Math.min(x, innerWidth - rect.width - 12));
  const top = Math.max(12, Math.min(y, innerHeight - rect.height - 12));
  tuningPanel.style.left = `${left}px`;
  tuningPanel.style.top = `${top}px`;
  tuningPanel.style.right = 'auto';
}
function savePanelPosition() {
  const rect = tuningPanel.getBoundingClientRect();
  try { localStorage.setItem(positionKey, JSON.stringify({ x: rect.x, y: rect.y })); } catch {}
}
function homePanel() {
  placePanel(innerWidth - tuningPanel.offsetWidth - 18, 18);
  savePanelPosition();
}
let panelDrag = null;
panelHeader.addEventListener('pointerdown', event => {
  if (event.button !== 0 || (event.target.closest('button') && !event.target.closest('#drag-handle'))) return;
  const rect = tuningPanel.getBoundingClientRect();
  panelDrag = { id: event.pointerId, x: event.clientX - rect.x, y: event.clientY - rect.y };
  panelHeader.setPointerCapture(event.pointerId);
  tuningPanel.classList.add('dragging');
  event.preventDefault();
});
panelHeader.addEventListener('pointermove', event => {
  if (!panelDrag || event.pointerId !== panelDrag.id) return;
  placePanel(event.clientX - panelDrag.x, event.clientY - panelDrag.y);
});
function endPanelDrag() {
  panelDrag = null; tuningPanel.classList.remove('dragging'); savePanelPosition();
}
panelHeader.addEventListener('pointerup', endPanelDrag);
panelHeader.addEventListener('pointercancel', endPanelDrag);
panelHeader.addEventListener('lostpointercapture', () => { if (panelDrag) endPanelDrag(); });
document.querySelector('#drag-handle').addEventListener('keydown', event => {
  const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
  if (!delta) return;
  event.preventDefault();
  const rect = tuningPanel.getBoundingClientRect();
  placePanel(rect.x + delta[0], rect.y + delta[1]); savePanelPosition();
});
document.querySelector('#panel-home').addEventListener('click', homePanel);
document.querySelector('#panel-collapse').addEventListener('click', event => {
  const body = document.querySelector('#panel-body'); body.hidden = !body.hidden;
  event.currentTarget.textContent = body.hidden ? '+' : '−';
  event.currentTarget.setAttribute('aria-expanded', String(!body.hidden));
  event.currentTarget.setAttribute('aria-label', body.hidden ? '展开面板' : '收起面板');
  const rect = tuningPanel.getBoundingClientRect(); placePanel(rect.x, rect.y);
});
addEventListener('resize', () => {
  const rect = tuningPanel.getBoundingClientRect(); placePanel(rect.x, rect.y);
});
try {
  const saved = JSON.parse(localStorage.getItem(positionKey));
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) placePanel(saved.x, saved.y);
} catch {}
