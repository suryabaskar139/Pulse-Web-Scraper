const puppeteer = require('puppeteer');
const { parseDate } = require('../utils/dateUtils');

/**
 * Scrapes reviews from TrustRadius for a specific company
 * @param {string} companyName - The name of the company to search for
 * @param {Date} startDate - Start date filter for reviews
 * @param {Date} endDate - End date filter for reviews
 * @param {number} maxPages - Maximum number of pages to scrape (default: 10)
 * @returns {Array} - Array of review objects
 */
async function scrapeTrustRadiusReviews(companyName, startDate, endDate, maxPages = 10) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(60000);
    
    // Navigate to TrustRadius for the company
    const searchUrl = `https://www.trustradius.com/products/${companyName.toLowerCase().replace(/\s+/g, '-')}`;
    console.log(`Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Check if we landed on a valid page or need to search
    const notFoundIndicator = await page.evaluate(() => {
      return document.title.includes('Page Not Found') || 
             document.querySelector('.not-found-message') !== null;
    });
    
    if (notFoundIndicator) {
      console.log(`Direct URL not found for ${companyName}, trying search...`);
      // Try searching instead
      const searchPageUrl = `https://www.trustradius.com/search?q=${encodeURIComponent(companyName)}`;
      await page.goto(searchPageUrl, { waitUntil: 'networkidle2' });
      
      // Try to find and click on the product link
      const foundProductUrl = await page.evaluate((name) => {
        // Look for product cards that match our search
        const productLinks = Array.from(document.querySelectorAll('.product-card a, .search-result-item a'));
        const matchingLink = productLinks.find(link => {
          return link.textContent.toLowerCase().includes(name.toLowerCase());
        });
        
        return matchingLink ? matchingLink.href : null;
      }, companyName);
      
      if (!foundProductUrl) {
        console.log(`Company "${companyName}" not found on TrustRadius`);
        return { success: false, error: `Company "${companyName}" not found on TrustRadius` };
      }
      
      console.log(`Found product URL: ${foundProductUrl}`);
      await page.goto(foundProductUrl, { waitUntil: 'networkidle2' });
      
      // Navigate to the reviews section
      const reviewsUrl = `${foundProductUrl}/reviews`;
      await page.goto(reviewsUrl, { waitUntil: 'networkidle2' });
    } else {
      // We're on the product page, go to reviews section
      const currentUrl = page.url();
      const reviewsUrl = `${currentUrl}/reviews`;
      await page.goto(reviewsUrl, { waitUntil: 'networkidle2' });
    }
    
    const allReviews = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    // Scrape reviews from each page
    while (hasNextPage && currentPage <= maxPages) {
      console.log(`Scraping TrustRadius page ${currentPage} for ${companyName}`);
      
      // Wait for reviews to load
      await page.waitForSelector('.review-card, .review-container', { timeout: 10000 })
        .catch(() => console.log('Review elements not found on page'));
      
      // Extract reviews from current page
      const pageReviews = await page.evaluate(() => {
        const reviews = [];
        const reviewElements = document.querySelectorAll('.review-card, .review-container');
        
        reviewElements.forEach(reviewElement => {
          // Review title
          const titleElement = reviewElement.querySelector('.review-title, .review-heading');
          const title = titleElement ? titleElement.innerText.trim() : 'No Title';
          
          // Rating
          const ratingElement = reviewElement.querySelector('[data-rating], .star-rating');
          let rating = 0;
          if (ratingElement) {
            const dataRating = ratingElement.getAttribute('data-rating');
            if (dataRating) {
              rating = parseFloat(dataRating);
            } else {
              // Try to count filled stars
              const filledStars = ratingElement.querySelectorAll('.filled-star').length;
              rating = filledStars || 0;
            }
          }
          
          // Review text - TrustRadius often has pros/cons and main review separated
          const mainReviewElement = reviewElement.querySelector('.review-body, .review-content');
          const mainReview = mainReviewElement ? mainReviewElement.innerText.trim() : '';
          
          const prosElement = reviewElement.querySelector('.pros-text, .review-pros');
          const consElement = reviewElement.querySelector('.cons-text, .review-cons');
          const pros = prosElement ? prosElement.innerText.trim() : '';
          const cons = consElement ? consElement.innerText.trim() : '';
          
          const reviewText = [
            mainReview,
            pros ? `Pros: ${pros}` : '',
            cons ? `Cons: ${cons}` : ''
          ].filter(Boolean).join('\\n\\n');
          
          // Date
          const dateElement = reviewElement.querySelector('.review-date');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          // Reviewer info
          const reviewerElement = reviewElement.querySelector('.reviewer-name, .user-info');
          const reviewerName = reviewerElement ? reviewerElement.innerText.trim() : 'Anonymous';
          
          // Additional details
          const detailsElement = reviewElement.querySelector('.reviewer-details, .reviewer-meta');
          const reviewerInfo = detailsElement ? detailsElement.innerText.trim() : '';
          
          reviews.push({
            title,
            description: reviewText || 'No review content available',
            date: dateText,
            rating,
            reviewer: {
              name: reviewerName,
              info: reviewerInfo
            },
            source: 'TrustRadius'
          });
        });
        
        return reviews;
      });
      
      // Add reviews to our collection
      allReviews.push(...pageReviews);
      
      // Check if there's a next page button and it's not disabled
      hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.pagination-next:not(.disabled), a[rel="next"]:not(.disabled)');
        return nextButton !== null;
      });
      
      // Go to next page if available
      if (hasNextPage && currentPage < maxPages) {
        await Promise.all([
          page.click('.pagination-next:not(.disabled), a[rel="next"]:not(.disabled)'),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]).catch(error => {
          console.error('Navigation error:', error);
          hasNextPage = false;
        });
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }
    
    // Filter reviews by date
    const filteredReviews = allReviews.filter(review => {
      // Parse the review date
      const reviewDate = parseDate(review.date);
      
      // Skip reviews where we couldn't parse the date
      if (!reviewDate) return false;
      
      // Apply date filters
      return reviewDate >= startDate && reviewDate <= endDate;
    });
    
    console.log(`Found ${filteredReviews.length} reviews for ${companyName} on TrustRadius within the specified date range`);
    return { success: true, data: filteredReviews };
  } catch (error) {
    console.error(`Error scraping TrustRadius reviews for ${companyName}:`, error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeTrustRadiusReviews };
