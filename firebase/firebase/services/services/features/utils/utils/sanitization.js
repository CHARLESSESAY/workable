export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input);
}
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html);
}
