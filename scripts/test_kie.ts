import { getSunoApiKey } from '../src/lib/server/settings-store.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.prod.local' });
dotenv.config();

async function run() {
  const apiKey = await getSunoApiKey();
  console.log('API Key length:', apiKey?.length);
  
  if (!apiKey) {
    console.log('No API key found in DB');
    return;
  }
  
  try {
    const res = await fetch('https://api.kie.ai/api/v1/suno/recovery', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task_id: 'fake-task' })
    });
    console.log('Status:', res.status, res.statusText);
    const data = await res.json().catch(() => null);
    console.log('Response:', data);
  } catch (e) {
    console.error(e);
  }
}
run();
