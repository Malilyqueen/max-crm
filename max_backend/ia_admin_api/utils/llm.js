import { fetchWithTimeout } from './fetch.js';

export async function askOpenAI_task(prompt) {
  const response = await fetchWithTimeout('http://127.0.0.1:3005/api/ask-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();
  return data.response || '';
}
