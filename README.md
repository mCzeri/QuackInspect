# Website QA Tool

This tool is designed to scan websites for broken links, SEO issues, and best practices. It can analyze a single page, multiple specific pages, or crawl an entire website.

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/website-qa-tool.git
   cd website-qa-tool
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

The tool can be run in three different modes:

### 1. Full Website Scan

To scan an entire website, use the `full` mode followed by the base URL:

   ```
   npm start -- --mode full https://example.com
   ```

### 2. Single Page Scan

To scan a single page, use the `single` mode followed by the URL:

   ```
   npm start -- --mode single https://example.com
   npm start -- --mode single https://cyber.pl
   ```

### 3. Multiple Pages Scan

To scan multiple pages, use the `multiple` mode followed by the URLs separated by spaces:

   ```
   npm start -- --mode multiple https://example.com https://another-example.com
   ```

# Skanowanie pojedynczego URL

npm start -- --mode single https://example.com

# Skanowanie wielu URL-i oddzielonych spacjami

npm start -- --mode multiple https://example.com https://another-example.com

# Użycie trybu full dla pierwszego URL

npm start -- --mode full https://example.com
