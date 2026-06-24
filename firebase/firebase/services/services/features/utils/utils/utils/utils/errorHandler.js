export function handleError(error, context='') {
  console.error(`[${context}]`, error);
}
export function showUserError(error) {
  import('./helpers.js').then(m=>m.showToast('⚠️',error.message||'Unexpected error','error'));
}
