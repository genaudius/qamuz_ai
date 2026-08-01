const fs = require('fs');
const html = fs.readFileSync('temp_error.html', 'utf8');
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
  for (const s of scriptMatch) {
    if (s.includes('"status":500') || s.includes('"error":')) {
      console.log('--- FOUND 500 SCRIPT ---');
      const payloadStart = s.indexOf('{');
      if (payloadStart > -1) {
          const text = s.substring(payloadStart);
          console.log(text.substring(0, 1500));
      }
    }
  }
}
