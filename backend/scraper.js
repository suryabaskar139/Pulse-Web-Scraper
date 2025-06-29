const puppeteer = require("puppeteer");

async function scrapeSite(url, selectors = null) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process']
  });
  
  const page = await browser.newPage();

  // Set a more realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Set viewport to simulate a desktop browser
  await page.setViewport({ width: 1280, height: 800 });

  // Block unnecessary resources to speed up loading
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  
  // Wait additional time for JavaScript to render content
  await page.waitForTimeout(2000);

  let result;

  // Scroll down a few times to load more content for dynamic sites
  console.log("Scrolling to load more content...");
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(1000); // Wait for content to load after scrolling
  }
  
  console.log("Checking for content...");
  
  if (selectors && Object.values(selectors).some(s => s && s.trim() !== '')) {
    // Use provided CSS selectors for structured scraping
    console.log("Using selectors:", selectors);
    
    // First check if the root selector exists
    const rootExists = await page.evaluate((rootSelector) => {
      return document.querySelectorAll(rootSelector).length > 0;
    }, selectors.root || "body");
    
    if (!rootExists) {
      console.log(`Warning: Root selector "${selectors.root}" not found on page.`);
    }
    
    result = await page.evaluate((s) => {
      const items = Array.from(document.querySelectorAll(s.root || "body"));
      console.log(`Found ${items.length} items matching root selector`);
      
      return items.map(item => {
        // More robust selector handling with debug info
        const titleEl = s.title ? item.querySelector(s.title) : null;
        const descEl = s.description ? item.querySelector(s.description) : null;
        const dateEl = s.date ? item.querySelector(s.date) : null;
        const ratingEl = s.rating ? item.querySelector(s.rating) : null;
        
        return {
          title: titleEl?.innerText.trim() || "",
          description: descEl?.innerText.trim() || "",
          date: dateEl?.innerText.trim() || "",
          rating: ratingEl?.innerText.trim() || "",
        };
      }).filter(item => item.title || item.description); // Only return items with a title or description
    }, selectors);
  } else {
    // Auto-extract large text blocks as a fallback
    console.log("No selectors provided, performing auto-extraction.");
    result = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll("p, div, article, h1, h2, h3"));
      return blocks
        .map(el => ({
          text: el.innerText.trim(),
          tag: el.tagName.toLowerCase()
        }))
        .filter(item => item.text.length > 80) // Filter for meaningful content length
        .map(item => {
          // Format based on tag type
          if (item.tag.startsWith('h')) {
            return { title: item.text, description: '' };
          } else {
            return { title: '', description: item.text };
          }
        })
        .filter(item => item.title || item.description); // Only return items with content
    });
  }

  // Take screenshot for debugging if needed
  if (result.length === 0) {
    console.log("No results found. Taking screenshot for debugging...");
    await page.screenshot({ path: './debug-screenshot.png' });
    console.log("Debug screenshot saved to ./debug-screenshot.png");
  }

  await browser.close();
  console.log(`Found ${result.length} items.`);
  return result;
}

module.exports = scrapeSite;
