import { crawlWebsite } from "./crawler";
import { logger } from "./utils/logger";
import { URL } from "url";

async function scanUrls(urls: string[]): Promise<void> {
  const scannedUrls = new Set<string>();

  for (const url of urls) {
    const urlWithoutFragment = url.split("#")[0];
    if (!scannedUrls.has(urlWithoutFragment)) {
      logger.logInfo(`Starting scan for: ${urlWithoutFragment}`);
      const visitedUrls = await crawlWebsite(urlWithoutFragment);
      console.log(
        `Scanned ${visitedUrls.size} pages for ${urlWithoutFragment}`
      );
      scannedUrls.add(urlWithoutFragment);
    } else {
      logger.logInfo(`Skipping already scanned URL: ${urlWithoutFragment}`);
    }
  }
  logger.printSummary();
  logger.generateHTMLReport();
}

async function main() {
  const args = process.argv.slice(2);
  let urlsToScan: string[] = [];

  if (args.length === 0) {
    console.log("Usage: npm start -- [full|single|multiple] [url1] [url2] ...");
    process.exit(1);
  }

  const mode = args[0];
  const baseUrl = args[1];

  switch (mode) {
    case "full":
      if (!baseUrl) {
        console.log("Please provide a base URL for full scan");
        process.exit(1);
      }
      urlsToScan = [baseUrl];
      break;
    case "single":
      if (!baseUrl) {
        console.log("Please provide a URL for single page scan");
        process.exit(1);
      }
      urlsToScan = [baseUrl];
      break;
    case "multiple":
      urlsToScan = args.slice(1);
      if (urlsToScan.length === 0) {
        console.log("Please provide at least one URL for multiple page scan");
        process.exit(1);
      }
      break;
    default:
      console.log("Invalid mode. Use 'full', 'single', or 'multiple'");
      process.exit(1);
  }

  // Validate URLs
  urlsToScan = urlsToScan.map((url) => {
    try {
      return new URL(url).toString();
    } catch (error) {
      console.log(`Invalid URL: ${url}`);
      process.exit(1);
    }
  });

  await scanUrls(urlsToScan);
}

main().catch(console.error);
