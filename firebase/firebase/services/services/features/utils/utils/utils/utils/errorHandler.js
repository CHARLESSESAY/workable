export function handleError(error, context = '') {
  console.error(`[${context}]`, error);
  // Optional: send to Sentry or LogRocket
}

export function showUserError(error) {
  import('./helpers.js').then(m => m.showToast('⚠️', error.message || 'Unexpected error'));
}
