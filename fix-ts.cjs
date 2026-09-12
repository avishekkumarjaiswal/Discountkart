const fs = require('fs');
let file = 'src/pages/admin/Shops.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /let loadedShops = snapshot\.docs\.map\(\(d\) => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);/,
  'let loadedShops: any[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));'
);

fs.writeFileSync(file, content);
