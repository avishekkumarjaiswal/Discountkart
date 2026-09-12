const fs = require('fs');

function patchOfferDetails() {
  let file = 'src/pages/customer/OfferDetails.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<button onClick=\{\(\) => window\.history\.state\?\.idx > 0 \? navigate\(-1\) : navigate\('\/'\)\} className="p-2 rounded-full hover:bg-gray-100 mb-6 flex items-center text-sm font-medium text-gray-600">\s*<ArrowLeft size=\{16\} className="mr-2" \/> Back\s*<\/button>/,
    ''
  );
  fs.writeFileSync(file, content);
}

function patchShopDiscovery() {
  let file = 'src/pages/customer/ShopDiscovery.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /<button onClick=\{\(\) => window\.history\.state\?\.idx > 0 \? navigate\(-1\) : navigate\('\/'\)\} className="p-2 rounded-full hover:bg-gray-100">\s*<ArrowLeft size=\{24\} \/>\s*<\/button>/,
    ''
  );
  fs.writeFileSync(file, content);
}

patchOfferDetails();
patchShopDiscovery();
