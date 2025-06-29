const express = require("express");
const cors = require("cors");
const fs = require('fs').promises;
const path = require('path');
const scrapeSite = require("./scraper");
const { scrapeG2Reviews } = require('./scrapers/g2Scraper');
const { scrapeCapterraReviews } = require('./scrapers/capterraScraper');
const { scrapeTrustRadiusReviews } = require('./scrapers/trustRadiusScraper');
const { parseDate, formatDate } = require('./utils/dateUtils');

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url, selectors } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    console.log(`Scraping URL: ${url}`);
    const data = await scrapeSite(url, selectors);
    
    // Check for empty results
    if (!data || (Array.isArray(data) && data.length === 0) || 
        (typeof data === 'object' && Object.keys(data).length === 0)) {
      return res.status(404).json({ 
        success: false, 
        error: "No content found. Please check the URL or try different selectors." 
      });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
fs.mkdir(outputDir, { recursive: true })
  .catch(err => console.error('Error creating output directory:', err));

// Specialized endpoint for scraping reviews with company name, date range, and source
app.post("/scrape-reviews", async (req, res) => {
  const { companyName, startDate, endDate, source } = req.body;

  // Validate inputs
  if (!companyName) {
    return res.status(400).json({ error: "Company name is required" });
  }
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  if (!source) {
    return res.status(400).json({ error: "Source is required (g2, capterra, trustradius)" });
  }

  // Parse dates
  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  try {
    console.log(`Scraping ${source} for company: ${companyName} from ${formatDate(parsedStartDate)} to ${formatDate(parsedEndDate)}`);
    
    let result;
    const sourceLower = source.toLowerCase();
    
    // Choose the appropriate scraper based on source
    if (sourceLower === 'g2') {
      result = await scrapeG2Reviews(companyName, parsedStartDate, parsedEndDate);
    } else if (sourceLower === 'capterra') {
      result = await scrapeCapterraReviews(companyName, parsedStartDate, parsedEndDate);
    } else if (sourceLower === 'trustradius') {
      result = await scrapeTrustRadiusReviews(companyName, parsedStartDate, parsedEndDate);
    } else {
      return res.status(400).json({ error: "Invalid source. Choose g2, capterra, or trustradius" });
    }
    
    // If scraping was successful, check if we have data
    if (result.success) {
      // Check for empty results
      if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
        return res.status(404).json({ 
          success: false, 
          error: `No reviews found for ${companyName} on ${sourceLower}. Please check the company name or try a different date range.` 
        });
      }
      
      // Create a timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${companyName.replace(/\s+/g, '_')}_${sourceLower}_${timestamp}.json`;
      const filePath = path.join(outputDir, filename);
      
      // Save to file
      await fs.writeFile(
        filePath,
        JSON.stringify(result.data, null, 2),
        'utf8'
      );
      
      res.json({
        success: true,
        data: result.data,
        count: result.data.length,
        filePath: filePath
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Scraper API running at http://localhost:${PORT}`);
});
