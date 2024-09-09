import * as cheerio from "cheerio";

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

export function checkSEO($: cheerio.Root, url: string): SEOResult {
  const issues: string[] = [];
  const headingStructure: HeadingStructure[] = [];

  $("h1, h2, h3, h4, h5, h6").each((index, element) => {
    const level = parseInt(element.tagName.substring(1), 10);
    const text = $(element).text().trim();
    const line = $(element).index();
    const previousHeading = headingStructure[headingStructure.length - 1];

    if (previousHeading && level > previousHeading.level + 1) {
      issues.push(`Incorrect heading structure: h${level} follows h${previousHeading.level} on ${url}`);
      headingStructure.push({ level, text, line, isIncorrect: true });
    } else if (!previousHeading && level !== 1) {
      issues.push(`Incorrect heading structure: h${level} appears before h1 on ${url}`);
      headingStructure.push({ level, text, line, isIncorrect: true });
    } else {
      headingStructure.push({ level, text, line, isIncorrect: false });
    }
  });

  return { issues, headingStructure };
}
