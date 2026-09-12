const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Dashboard.tsx', 'utf8');

code = code.replace('console.log("Fetching shops...");\n        ', '');
code = code.replace('console.log("Done fetching!");\n        ', '');

fs.writeFileSync('src/pages/admin/Dashboard.tsx', code);
