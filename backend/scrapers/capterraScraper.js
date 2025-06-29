const puppeteer = require('puppeteer');
const { parseDate } = require('../utils/dateUtils');

/**
 * Scrapes reviews from Capterra for a specific company
 * @param {string} companyName - The name of the company to search for
 * @param {Date} startDate - Start date filter for reviews
 * @param {Date} endDate - End date filter for reviews
 * @param {number} maxPages - Maximum number of pages to scrape (default: 10)
 * @returns {Array} - Array of review objects
 */
async function scrapeCapterraReviews(companyName, startDate, endDate, maxPages = 10) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(60000);
    
    // Navigate to Capterra page for the company - using search first
    const searchUrl = `https://www.capterra.com/search/?search=${encodeURIComponent(companyName)}`;
    console.log(`Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Check if we found the product
    const productFound = await page.evaluate((name) => {
      // Look for product cards or links
      const products = Array.from(document.querySelectorAll('.product-card'));
      
      // Find the one that matches our company name most closely
      const matchingProduct = products.find(product => {
        const productName = product.querySelector('.product-card__product-name')?.innerText.trim();
        return productName && productName.toLowerCase().includes(name.toLowerCase());
      });
      
      // If we found a match, click on it
      if (matchingProduct) {
        const reviewsLink = matchingProduct.querySelector('a[href*="reviews"]');
        if (reviewsLink) {
          return reviewsLink.href;
        }
      }
      return null;
    }, companyName);
    
    if (!productFound) {
      console.log(`Company "${companyName}" not found on Capterra`);
      return { success: false, error: `Company "${companyName}" not found on Capterra` };
    }
    
    // Navigate to the reviews page
    console.log(`Navigating to reviews page: ${productFound}`);
    await page.goto(productFound, { waitUntil: 'networkidle2' });
    
    const allReviews = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    // Scrape reviews from each page
    while (hasNextPage && currentPage <= maxPages) {
      console.log(`Scraping Capterra page ${currentPage} for ${companyName}`);
      
      // Wait for reviews to load
      await page.waitForSelector('.review', { timeout: 10000 })
        .catch(() => console.log('Review elements not found on page'));
      
      // Extract reviews from current page
      const pageReviews = await page.evaluate(() => {
        const reviews = [];
        const reviewElements = document.querySelectorAll('.review');
        
        reviewElements.forEach(reviewElement => {
          // Basic review data
          const titleElement = reviewElement.querySelector('.review__title');
          const title = titleElement ? titleElement.innerText.trim() : 'No Title';
          
          // For Capterra, stars are usually in a data attribute or class name
          const ratingElement = reviewElement.querySelector('[data-rating]') || reviewElement.querySelector('.stars-container');
          let rating = 0;
          if (ratingElement) {
            const dataRating = ratingElement.getAttribute('data-rating');
            if (dataRating) {
              rating = parseFloat(dataRating);
            } else {
              // Try to count the number of filled stars
              const filledStars = ratingElement.querySelectorAll('.star-filled').length;
              rating = filledStars;
            }
          }
          
          // Review text
          const prosElement = reviewElement.querySelector('.review-pros');
          const consElement = reviewElement.querySelector('.review-cons');
          const pros = prosElement ? prosElement.innerText.trim() : '';
          const cons = consElement ? consElement.innerText.trim() : '';
          
          const mainReviewElement = reviewElement.querySelector('.review-content') || 
                                  reviewElement.querySelector('.review__text');
          const mainReview = mainReviewElement ? mainReviewElement.innerText.trim() : '';
          
          const reviewText = [
            mainReview,
            pros ? `Pros: ${pros}` : '',
            cons ? `Cons: ${cons}` : ''
          ].filter(Boolean).join('\\n\\n');
          
          // Date and reviewer info
          const dateElement = reviewElement.querySelector('.review-date') || 
                            reviewElement.querySelector('.review__date');
          const dateText = dateElement ? dateElement.innerText.trim() : '';
          
          // Reviewer
          const reviewerElement = reviewElement.querySelector('.reviewer-name') || 
                                reviewElement.querySelector('.review__author');
          const reviewerName = reviewerElement ? reviewerElement.innerText.trim() : 'Anonymous';
          
          // Additional info
          const reviewerInfoElement = reviewElement.querySelector('.reviewer-info') || 
                                    reviewElement.querySelector('.review__author-company');
          const reviewerInfo = reviewerInfoElement ? reviewerInfoElement.innerText.trim() : '';
          
          reviews.push({
            title,
            description: reviewText || 'No review content available',
            date: dateText,
            rating,
            reviewer: {
              name: reviewerName,
              info: reviewerInfo
            },
            source: 'Capterra'
          });
        });
        
        return reviews;
      });
      
      // Add reviews to our collection
      allReviews.push(...pageReviews);
      
      // Check if there's a next page button that's not disabled
      hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.next-page:not(.disabled), a[rel="next"]:not(.disabled)');
        return nextButton !== null;
      });
      
      // Go to next page if available
      if (hasNextPage && currentPage < maxPages) {
        await Promise.all([
          page.click('.next-page:not(.disabled), a[rel="next"]:not(.disabled)'),
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
    
    console.log(`Found ${filteredReviews.length} reviews for ${companyName} on Capterra within the specified date range`);
    return { success: true, data: filteredReviews };
  } catch (error) {
    console.error(`Error scraping Capterra reviews for ${companyName}:`, error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeCapterraReviews };
