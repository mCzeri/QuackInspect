import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { checkSEO, HeadingStructure } from "./checks/seo";
import { checkBestPractices } from "./checks/bestPractices";
import { logger } from "./utils/logger";

// Define SEOResult interface
interface SEOResult {
  issues: string[];
  headingStructure: HeadingStructure[];
}

// Define Result interface with brokenLinks as always present
interface Result {
  url: string;
  seoIssues: string[];
  bestPracticesIssues: string[];
  headingStructure: HeadingStructure[];
  brokenLinks: string[]; // Zawsze obecne, nawet jeśli puste
}

// Helper function to normalize URLs
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export async function crawlWebsite(
  startUrl: string,
  singlePage: boolean = false
): Promise<Set<string>> {
  const visited = new Set<string>();
  const toVisit = [normalizeUrl(startUrl)];
  const pageContents: Map<string, string> = new Map();

  while (toVisit.length > 0) {
    const url = toVisit.pop()!;
    const urlWithoutFragment = normalizeUrl(url.split("#")[0]);

    if (!visited.has(urlWithoutFragment)) {
      visited.add(urlWithoutFragment);
      logger.logInfo(`Testing URL: ${urlWithoutFragment}`);
      try {
        const response = await axios.get(urlWithoutFragment);
        const $ = cheerio.load(response.data);

        // Now result has explicit types defined, including brokenLinks
        const result: Result = {
          url: urlWithoutFragment,
          seoIssues: [],
          bestPracticesIssues: [],
          headingStructure: [],
          brokenLinks: [], // Zawsze pustą tablicą, nawet jeśli pusta
        };

        logger.logInfo(`Checking SEO for: ${urlWithoutFragment}`);
        const seoResult: SEOResult = await checkSEO($, urlWithoutFragment);
        result.seoIssues = seoResult.issues;
        result.headingStructure = seoResult.headingStructure;

        logger.logInfo(`Checking best practices for: ${urlWithoutFragment}`);
        result.bestPracticesIssues = await checkBestPractices(
          $,
          urlWithoutFragment
        );

        // Add result to logger
        logger.addResult(result);

        // Log the result for debugging
        logger.logInfo(`Result for ${urlWithoutFragment}: ${JSON.stringify(result)}`);

        // Store page content for comparison
        pageContents.set(urlWithoutFragment, $.html());

        // Po przetworzeniu każdego URL-a, aktualizujemy oczekiwaną liczbę URL-i
        logger.setExpectedUrlCount(visited.size);

        if (!singlePage) {
          $("a").each((_, element) => {
            const href = $(element).attr("href");
            if (href) {
              const newUrl = normalizeUrl(new URL(href, urlWithoutFragment).toString().split("#")[0]);
              if (
                newUrl.startsWith(normalizeUrl(startUrl.split("#")[0])) &&
                !visited.has(newUrl)
              ) {
                toVisit.push(newUrl);
              }
            }
          });
        }
      } catch (error) {
        logger.logError(`Error crawling ${urlWithoutFragment}: ${error}`);
      }
    }
  }

  // Compare page contents for duplicates
  comparePageContents(pageContents);

  return visited;
}

function comparePageContents(pageContents: Map<string, string>) {
  const urls = Array.from(pageContents.keys());
  for (let i = 0; i < urls.length; i++) {
    for (let j = i + 1; j < urls.length; j++) {
      const url1 = urls[i];
      const url2 = urls[j];
      const content1 = pageContents.get(url1)!;
      const content2 = pageContents.get(url2)!;

      if (areContentsSimilar(content1, content2)) {
        logger.logError(`Duplicate content found between ${url1} and ${url2}`);
      }
    }
  }
}

function areContentsSimilar(content1: string, content2: string): boolean {
  // Simple comparison logic, can be replaced with more sophisticated algorithms
  return content1 === content2;
}

export async function crawlSinglePage(url: string): Promise<Set<string>> {
  const visitedUrls = new Set<string>();
  const normalizedUrl = normalizeUrl(url);
  visitedUrls.add(normalizedUrl);
  logger.logInfo(`Scanning single page: ${normalizedUrl}`);

  try {
    const response = await axios.get(normalizedUrl);
    const $ = cheerio.load(response.data);

    const result: Result = {
      url: normalizedUrl,
      seoIssues: [],
      bestPracticesIssues: [],
      headingStructure: [],
      brokenLinks: [],
    };

    logger.logInfo(`Checking SEO for: ${normalizedUrl}`);
    const seoResult: SEOResult = await checkSEO($, normalizedUrl);
    result.seoIssues = seoResult.issues;
    result.headingStructure = seoResult.headingStructure;

    logger.logInfo(`Checking best practices for: ${normalizedUrl}`);
    result.bestPracticesIssues = await checkBestPractices($, normalizedUrl);

    // Add result to logger
    logger.addResult(result);

    // Log the result for debugging
    logger.logInfo(`Result for ${normalizedUrl}: ${JSON.stringify(result)}`);
  } catch (error) {
    logger.logError(`Error crawling ${normalizedUrl}: ${error}`);
  }

  // Usunięto logger.generateFinalReport();

  return visitedUrls;
}

export async function crawlMultiplePages(urls: string[]): Promise<Set<string>> {
  const visitedUrls = new Set<string>();

  for (const url of urls) {
    const normalizedUrl = normalizeUrl(url);
    visitedUrls.add(normalizedUrl);
    logger.logInfo(`Scanning page: ${normalizedUrl}`);

    try {
      const response = await axios.get(normalizedUrl);
      const $ = cheerio.load(response.data);

      const result: Result = {
        url: normalizedUrl,
        seoIssues: [],
        bestPracticesIssues: [],
        headingStructure: [],
        brokenLinks: [],
      };

      logger.logInfo(`Checking SEO for: ${normalizedUrl}`);
      const seoResult: SEOResult = await checkSEO($, normalizedUrl);
      result.seoIssues = seoResult.issues;
      result.headingStructure = seoResult.headingStructure;

      logger.logInfo(`Checking best practices for: ${normalizedUrl}`);
      result.bestPracticesIssues = await checkBestPractices($, normalizedUrl);

      // Add result to logger
      logger.addResult(result);

      // Log the result for debugging
      logger.logInfo(`Result for ${normalizedUrl}: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.logError(`Error crawling ${normalizedUrl}: ${error}`);
    }
  }

  // Usunięto logger.generateFinalReport();

  return visitedUrls;
}
