import { getIdToken } from '../firebase/auth.js';
const AI_PROXY_URL = 'https://broken-glade-bcb9.sesaycharle.workers.dev';

export function initServices() {}

export async function generateAIResponse(prompt) {
  const token = await getIdToken();
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI proxy error');
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
