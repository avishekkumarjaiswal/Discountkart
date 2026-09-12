const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/admin/login');
  
  // We need to login or mock the state.
  // Actually, wait, if we are not logged in, it will redirect to /admin/login.
  // We can inject a fake user into localStorage if the app uses it?
  // The app uses Firebase Auth, which uses IndexedDB. It's hard to mock.
  
  await browser.close();
})();
