export function saveState(state) {
  try { localStorage.setItem('wp_state', JSON.stringify(state)); } catch {}
}

export function loadState() {
  try {
    const saved = localStorage.getItem('wp_state');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}
