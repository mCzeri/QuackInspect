import { CheerioAPI } from "cheerio";
import { logger } from "../utils/logger"; // Import logger to access stored titles and descriptions
import axios from "axios";

export interface HeadingStructure {
  level: number;
  text: string;
  line: number;
  isIncorrect: boolean;
}

export interface SEOResult {
  issues: string[];
  headingStructure: HeadingStructure[];
}

export async function checkSEO($: CheerioAPI, url: string): Promise<SEOResult> {
  const issues: string[] = [];
  const headingStructure: HeadingStructure[] = [];

  // Check for multiple h1 tags
  const h1Elements = $("h1");
  if (h1Elements.length > 1) {
    issues.push(
      `Semantic Issue: Multiple h1 tags found (${h1Elements.length} h1 tags)`
    );
    h1Elements.each((index: number, element: Element) => {
      const text = $(element).text().trim();
      $(element).text(`⚠️ ${text}`);
    });
  }

  $("h1, h2, h3, h4, h5, h6").each((index: number, element: Element) => {
    const level = parseInt(element.tagName.substring(1), 10);
    const text = $(element).text().trim();
    const line = $(element).index();
    const previousHeading = headingStructure[headingStructure.length - 1];

    if (previousHeading && level > previousHeading.level + 1) {
      issues.push(
        `Semantic Issue: Incorrect heading structure: h${level} follows h${previousHeading.level}`
      );
      headingStructure.push({ level, text, line, isIncorrect: true });
    } else if (!previousHeading && level !== 1) {
      issues.push(
        `Semantic Issue: Incorrect heading structure: h${level} appears before h1`
      );
      headingStructure.push({ level, text, line, isIncorrect: true });
    } else {
      headingStructure.push({ level, text, line, isIncorrect: false });
    }
  });

  // Check meta title
  const title = $("title").text().trim();
  if (!title) {
    issues.push(`Meta Tags Warning: Missing title tag`);
  } else {
    if (title.length > 60) {
      issues.push(
        `Meta Tags Warning: Title length should be between 50 and 60 characters`
      );
    } else if (title.length < 50) {
      issues.push(
        `Meta Tags Warning: Title length should be between 50 and 60 characters`
      );
    }
    const titleDuplicates = logger.addTitle(title, url);
    if (titleDuplicates.length > 0) {
      issues.push(
        `Duplicate title: "${title}" found on: ${titleDuplicates.join(", ")}`
      );
    }
  }

  // Check meta description
  const description = $('meta[name="description"]').attr("content")?.trim();
  if (!description) {
    issues.push(`Meta Tags Warning: Missing meta description tag`);
  } else {
    if (description.length > 160) {
      issues.push(
        `Meta Tags Warning: Description length should be between 150 and 160 characters`
      );
    } else if (description.length < 150) {
      issues.push(
        `Meta Tags Warning: Description length should be between 150 and 160 characters`
      );
    }
    const descriptionDuplicates = logger.addDescription(description, url);
    if (descriptionDuplicates.length > 0) {
      issues.push(
        `Duplicate description: "${description}" found on: ${descriptionDuplicates.join(
          ", "
        )}`
      );
    }
  }

  // Check canonical tag
  const canonicalLink = $('link[rel="canonical"]').attr("href");
  if (!canonicalLink) {
    issues.push(`Canonical Issue: Missing canonical tag`);
  } else {
    const normalizedUrl = new URL(canonicalLink, url).toString();
    if (normalizedUrl !== url) {
      issues.push(`Canonical Issue: Canonical URL (${normalizedUrl}) does not match the current URL (${url})`);
    }
  }

  // Check if the page is multilingual
  const isMultilingual = $('link[rel="alternate"][hreflang]').length > 0;

  // Check hreflang tags only if the page is multilingual
  if (isMultilingual) {
    const hreflangTags = $('link[rel="alternate"][hreflang]');
    if (hreflangTags.length === 0) {
      issues.push(`Hreflang Issue: Missing hreflang tags`);
    } else {
      const hreflangUrls = new Set<string>();
      hreflangTags.each((index, element) => {
        const hreflangUrl = $(element).attr('href');
        if (hreflangUrl) {
          hreflangUrls.add(hreflangUrl);
        }
      });
      if (hreflangUrls.size === 0) {
        issues.push(`Hreflang Issue: No valid hreflang URLs found`);
      } else {
        logger.addHreflangUrls(url, Array.from(hreflangUrls));
      }
    }
  }

  // Log the issues for debugging
  logger.logInfo(`SEO issues for ${url}: ${JSON.stringify(issues)}`);

  return { issues, headingStructure };
}
