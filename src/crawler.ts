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

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export async function crawlWebsite(
  startUrl: string,
  singlePage: boolean = false
): Promise<Set<string>> {
  if (!isValidUrl(startUrl)) {
    logger.logError(`Invalid URL: ${startUrl}`);
    return new Set();
  }

  const visited = new Set<string>();
  const toVisit = [startUrl];
  const baseUrl = new URL(startUrl).origin;

  while (toVisit.length > 0) {
    const url = toVisit.pop()!;
    const urlWithoutFragment = url.split("#")[0];

    if (!visited.has(urlWithoutFragment)) {
      visited.add(urlWithoutFragment);
      logger.logInfo(`Testing URL: ${urlWithoutFragment}`);
      try {
        const response = await axios.get(urlWithoutFragment, { timeout: 10000 });
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
        const seoResult: SEOResult = checkSEO($, urlWithoutFragment);
        result.seoIssues = seoResult.issues;
        result.headingStructure = seoResult.headingStructure;

        logger.logInfo(`Checking best practices for: ${urlWithoutFragment}`);
        result.bestPracticesIssues = await checkBestPractices(
          $,
          urlWithoutFragment
        );

        // Add result to logger
        logger.addResult(result);

        // Zmodyfikowana logika ekstrakcji linków
        if (!singlePage) {
          $("a").each((_, element) => {
            const href = $(element).attr("href");
            if (href) {
              try {
                const newUrl = new URL(href, urlWithoutFragment).toString().split("#")[0];
                if (newUrl.startsWith(baseUrl) && !visited.has(newUrl) && !toVisit.includes(newUrl)) {
                  toVisit.push(newUrl);
                }
              } catch (error) {
                // Ignoruj nieprawidłowe URL-e
              }
            }
          });
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          logger.logError(`Error crawling ${urlWithoutFragment}: HTTP ${error.response.status}`);
          const result: Result = {
            url: urlWithoutFragment,
            seoIssues: [`HTTP Error ${error.response.status}`],
            bestPracticesIssues: [],
            headingStructure: [],
            brokenLinks: [],
          };
          logger.addResult(result);
        } else {
          logger.logError(`Error crawling ${urlWithoutFragment}: ${error}`);
        }
      }
    }
  }

  // Generate report after processing all URLs
  logger.generateHTMLReport();

  return visited;
}
