const fs = require('fs');

function fixImports(file) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const imports = [];
  const rest = [];
  let inPageLoader = false;
  let pageLoaderLines = [];

  for (let line of lines) {
    if (line.startsWith('import ')) {
      imports.push(line);
    } else if (line.startsWith('const PageLoader =')) {
      inPageLoader = true;
      pageLoaderLines.push(line);
    } else if (inPageLoader) {
      pageLoaderLines.push(line);
      if (line.includes(');')) {
        inPageLoader = false;
        rest.push(...pageLoaderLines);
      }
    } else {
      rest.push(line);
    }
  }

  fs.writeFileSync(file, [...imports, ...rest].join('\n'));
}

fixImports('src/components/layout/AdminLayout.tsx');
fixImports('src/components/layout/CustomerLayout.tsx');
if (fs.existsSync('src/components/layout/ShopLayout.tsx')) {
  fixImports('src/components/layout/ShopLayout.tsx');
}
