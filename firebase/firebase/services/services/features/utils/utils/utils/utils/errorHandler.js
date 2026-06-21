export function handleError(error, context = '') {
  console.error(`[${context}]`, error);
  // Optional: send to monitoring service
}

export function showUserError(error) {
  import('./helpers.js').then(m => m.showToast('⚠️', error.message || 'Unexpected error'));
}
