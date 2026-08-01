const fs = require('fs');
const file = 'src/lib/server/db/schema.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\.primaryKey\(\)/g, '.primaryKey().notNull()');
fs.writeFileSync(file, content);
