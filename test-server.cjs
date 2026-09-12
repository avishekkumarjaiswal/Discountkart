const fs = require('fs');
let code = fs.readFileSync('dist/server.cjs', 'utf8');
code = code.replace('var PORT = 3e3;', 'var PORT = 3001;');
fs.writeFileSync('dist/server-test.cjs', code);
