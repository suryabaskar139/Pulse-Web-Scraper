# Full-Stack Dynamic Web Scraper

This project is a full-stack application that allows you to dynamically scrape content from websites. It consists of a React frontend and a Node.js backend that uses Puppeteer for web scraping.

## Project Structure

- `/frontend`: Contains the React application for the user interface.
- `/backend`: Contains the Node.js Express server that handles the scraping logic.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [npm](https://www.npmjs.com/)

## Setup and Installation

### 1. Backend Setup

Navigate to the backend directory and install the required dependencies:

```bash
cd backend
npm install
```

### 2. Frontend Setup

In a separate terminal, navigate to the frontend directory and install its dependencies:

```bash
cd frontend
npm install
```

## Running the Application

### 1. Start the Backend Server

In the `backend` directory, run the following command to start the Node.js server. By default, it will run on `http://localhost:5001`.

```bash
npm start
```

You should see the message `Scraper API running at http://localhost:5001` in the console.

### 2. Start the React Frontend

In the `frontend` directory, run the following command to start the React development server. It will automatically open in your default browser at `http://localhost:3000`.

```bash
npm start
```

## How to Use the Scraper

Once both the frontend and backend are running, you can use the application in your browser.

1.  **Open the UI**: Navigate to `http://localhost:3000`.
2.  **Enter URL**: Input the full URL of the website you want to scrape.

### Two Scraping Modes:

#### a) Review Scraping (No Selectors)

- Simply enter the URL and click **"Scrape Website"**.
- The backend will attempt to automatically extract meaningful text blocks from the page. This is useful for articles or simple content pages.

#### b) General Scraping (With CSS Selectors)

- For more precise data extraction (e.g., reviews, product listings), you need to provide CSS selectors.
- Use your browser's developer tools (right-click -> Inspect) to find the selectors for the elements you want to scrape.
- Fill in the selector fields in the UI.

**Example for Review Sites Scraping**

The application also has a specialized endpoint for scraping review sites. You can use this feature by specifying:

1. **Company Name**: The name of the company whose reviews you want to scrape
2. **Date Range**: Start and end dates to filter reviews
3. **Source**: One of the supported review platforms (G2, Capterra, or TrustRadius)

```json
{
  "companyName": "Slack",
  "startDate": "2025-01-01",
  "endDate": "2025-06-30",
  "source": "g2"
}
```

This will return structured data like:

```json
[
  {
    "title": "Great Team Collaboration Tool",
    "description": "Slack has transformed how our team communicates. The channels keep topics organized and the integrations with other tools make it a central hub for notifications.",
    "date": "June 15, 2025",
    "rating": 4.5,
    "reviewer": {
      "name": "John D.",
      "info": "Mid-Market (51-1000 emp.)"
    },
    "source": "G2"
  }
]
```


**Example for General Web Scraping with CSS Selectors**

-   **root**: `.card` (This is the container for each item you want to extract)
-   **title**: `.card-title` (The title element within each card)
-   **description**: `.card-text` (The description text within each card)
-   **price**: `.price-value` (The price element within each card)
-   **image**: `.card-img img` (The image element within each card)


3.  **View Results**: The scraped data will be displayed in a JSON format on the page.

## Notes

-   **Legality and Ethics**: Always be respectful of the websites you are scraping. Check the website's `robots.txt` file and terms of service to ensure you are allowed to scrape their content. Do not overload servers with too many requests in a short period.
-   **Dynamic Websites**: This scraper uses Puppeteer, which can handle JavaScript-rendered content. However, some websites have advanced bot detection that may block scraping attempts.
