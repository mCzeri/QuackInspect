import { CheerioAPI } from "cheerio";
import { logger } from "../utils/logger";

interface HeadingStructure {
  level: number;
  text: string;
  line: number;
  isIncorrect: boolean;
}

export function checkSEO(
  $: CheerioAPI,
  url: string
): { issues: string[]; headingStructure: HeadingStructure[] } {
  const issues: string[] = [];
  const headingStructure: HeadingStructure[] = [];

  // Istniejące sprawdzenia SEO...

  // Sprawdzanie struktury nagłówków
  const headings = $("h1, h2, h3, h4, h5, h6");
  let previousLevel = 0;
  headings.each((index, element) => {
    const level = parseInt(element.name.charAt(1));
    const text = $(element).text().trim();
    const isIncorrect = level > previousLevel + 1;

    headingStructure.push({ level, text, line: index + 1, isIncorrect });

    if (isIncorrect) {
      const message = `Incorrect heading structure: ${element.name} follows h${previousLevel} on ${url}`;
      logger.logError(message);
      issues.push(message);
    }
    previousLevel = level;
  });

  return { issues, headingStructure };
}
