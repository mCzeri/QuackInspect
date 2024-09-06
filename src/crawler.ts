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

export async function crawlWebsite(
  startUrl: string,
  singlePage: boolean = false
): Promise<Set<string>> {
  const visited = new Set<string>();
  const toVisit = [startUrl];

  while (toVisit.length > 0) {
    const url = toVisit.pop()!;
    const urlWithoutFragment = url.split("#")[0];

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

        if (!singlePage) {
          $("a").each((_, element) => {
            const href = $(element).attr("href");
            if (href) {
              const newUrl = new URL(href, urlWithoutFragment)
                .toString()
                .split("#")[0];
              if (
                newUrl.startsWith(startUrl.split("#")[0]) &&
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

  // Generate report after processing all URLs
  logger.generateHTMLReport();

  return visited;
}
