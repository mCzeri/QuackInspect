import { CheerioAPI } from "cheerio";
import { logger } from "../utils/logger"; // Import logger to access stored titles and descriptions

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

export function checkSEO($: CheerioAPI, url: string): SEOResult {
  const issues: string[] = [];
  const headingStructure: HeadingStructure[] = [];

  $("h1, h2, h3, h4, h5, h6").each((index: number, element: Element) => {
    const level = parseInt(element.tagName.substring(1), 10);
    const text = $(element).text().trim();
    const line = $(element).index();
    const previousHeading = headingStructure[headingStructure.length - 1];

    if (previousHeading && level > previousHeading.level + 1) {
      issues.push(`Semantic Issue: Incorrect heading structure: h${level} follows h${previousHeading.level}`);
      headingStructure.push({ level, text, line, isIncorrect: true });
    } else if (!previousHeading && level !== 1) {
      issues.push(`Semantic Issue: Incorrect heading structure: h${level} appears before h1`);
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
      issues.push(`Meta Tags Warning: Title length should be between 50 and 60 characters`);
    } else if (title.length < 50) {
      issues.push(`Meta Tags Warning: Title length should be between 50 and 60 characters`);
    }
    const titleDuplicates = logger.addTitle(title, url);
    if (titleDuplicates.length > 0) {
      issues.push(`Duplicate title: "${title}" found on: ${titleDuplicates.join(', ')}`);
    }
  }

  // Check meta description
  const description = $('meta[name="description"]').attr("content")?.trim();
  if (!description) {
    issues.push(`Meta Tags Warning: Missing meta description tag`);
  } else {
    if (description.length > 160) {
      issues.push(`Meta Tags Warning: Description length should be between 150 and 160 characters`);
    } else if (description.length < 150) {
      issues.push(`Meta Tags Warning: Description length should be between 150 and 160 characters`);
    }
    const descriptionDuplicates = logger.addDescription(description, url);
    if (descriptionDuplicates.length > 0) {
      issues.push(`Duplicate description: "${description}" found on: ${descriptionDuplicates.join(', ')}`);
    }
  }

  return { issues, headingStructure };
}
