const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  
  await page.goto('http://localhost:5174/');
  
  // Wait for load
  await page.waitForTimeout(2000);
  
  // Find "Markdown" category (it was c4 in default data)
  const cats = await page.$$('.sidebar-nav-item');
  for (const cat of cats) {
    const text = await cat.textContent();
    if (text.includes('Markdown')) {
      await cat.click();
      console.log('Clicked Markdown category');
      break;
    }
  }
  
  await page.waitForTimeout(2000);
  
  // Find the file "欢迎使用 Quill 轻量笔记"
  const files = await page.$$('.file-item');
  for (const file of files) {
    const text = await file.textContent();
    if (text.includes('Quill 轻量笔记')) {
      await file.click();
      console.log('Clicked Markdown file');
      break;
    }
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();
