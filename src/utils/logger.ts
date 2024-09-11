import chalk from "chalk";
import fs from "fs";
import path from "path";

interface HeadingStructure {
  level: number;
  text: string;
  line: number;
  isIncorrect: boolean;
}

interface TestResult {
  url: string;
  brokenLinks: string[];
  seoIssues: string[];
  bestPracticesIssues: string[];
  headingStructure: HeadingStructure[];
  hreflangUrls: string[]; // Dodajemy hreflangUrls do TestResult
}

class Logger {
  private results: TestResult[] = [];
  private titles: Map<string, string[]> = new Map(); // Store titles and their URLs
  private descriptions: Map<string, string[]> = new Map(); // Store descriptions and their URLs
  private hreflangUrls: Map<string, string[]> = new Map(); // Store hreflang URLs
  private expectedUrlCount: number = 0;

  logSuccess(message: string): void {
    console.log(chalk.green("✓") + " " + message);
  }

  logError(message: string): void {
    console.log(chalk.red("✗") + " " + message);
  }

  logInfo(message: string): void {
    console.log(chalk.blue("ℹ") + " " + message);
  }

  addResult(result: TestResult): void {
    // Dodajemy hreflangUrls do wyniku
    result.hreflangUrls = this.hreflangUrls.get(result.url) || [];
    this.results.push(result);
  }

  addTitle(title: string, url: string): string[] {
    if (this.titles.has(title)) {
      const urls = this.titles.get(title)!;
      urls.push(url);
      return urls.filter(u => u !== url);
    } else {
      this.titles.set(title, [url]);
      return [];
    }
  }

  addDescription(description: string, url: string): string[] {
    if (this.descriptions.has(description)) {
      const urls = this.descriptions.get(description)!;
      urls.push(url);
      return urls.filter(u => u !== url);
    } else {
      this.descriptions.set(description, [url]);
      return [];
    }
  }

  addHreflangUrls(url: string, hreflangUrls: string[]): void {
    this.hreflangUrls.set(url, hreflangUrls);
  }

  printSummary() {
    console.log("\n--- Podsumowanie ---");
    this.results.forEach((result) => {
      console.log(`\nURL: ${result.url}`);

      if (result.seoIssues && result.seoIssues.length > 0) {
        console.log("Problemy SEO:");
        result.seoIssues.forEach((issue) => console.log(`- ${issue}`));
      } else {
        console.log("Brak problemów SEO.");
      }

      if (result.bestPracticesIssues && result.bestPracticesIssues.length > 0) {
        console.log("Problemy z najlepszymi praktykami:");
        result.bestPracticesIssues.forEach((issue) =>
          console.log(`- ${issue}`)
        );
      } else {
        console.log("Brak problemów z najlepszymi praktykami.");
      }

      const hreflangUrls = this.hreflangUrls.get(result.url);
      if (hreflangUrls && hreflangUrls.length > 0) {
        console.log("Hreflang URLs:");
        hreflangUrls.forEach((hreflangUrl) => console.log(`- ${hreflangUrl}`));
      } else {
        console.log("Brak hreflang URLs.");
      }
    });
  }

  generateHTMLReport(): void {
    const templatePath = path.join(__dirname, "template.html");
    let template: string;
    try {
      template = fs.readFileSync(templatePath, "utf8");
    } catch (error) {
      this.logError(`Error reading template file: ${error}`);
      return;
    }

    const resultsJSON = JSON.stringify(this.results);

    // Log the results for debugging
    this.logInfo(`Results JSON: ${resultsJSON}`);

    const totalUrls = this.results.length;
    const urlsWithIssues = this.results.filter(
      (result) =>
        (result.seoIssues && result.seoIssues.length > 0) ||
        (result.bestPracticesIssues && result.bestPracticesIssues.length > 0)
    ).length;
    const totalIssues = this.results.reduce(
      (sum, result) =>
        sum + (result.seoIssues ? result.seoIssues.length : 0) + 
              (result.bestPracticesIssues ? result.bestPracticesIssues.length : 0),
      0
    );

    const totalWarnings = this.results.reduce(
      (sum, result) =>
        sum + (result.seoIssues ? result.seoIssues.filter(issue => issue.includes('Warning')).length : 0) +
        (result.bestPracticesIssues ? result.bestPracticesIssues.filter(issue => issue.includes('Warning')).length : 0),
      0
    );

    const totalErrors = totalIssues - totalWarnings;

    const html = template
      .replace("{{RESULTS}}", resultsJSON)
      .replace("{{TOTAL_URLS}}", totalUrls.toString())
      .replace("{{URLS_WITH_ISSUES}}", urlsWithIssues.toString())
      .replace("{{TOTAL_ISSUES}}", totalIssues.toString())
      .replace("{{TOTAL_WARNINGS}}", totalWarnings.toString())
      .replace("{{TOTAL_ERRORS}}", totalErrors.toString());

    try {
      fs.writeFileSync("report.html", html);
      this.logSuccess("HTML report generated: report.html");
    } catch (error) {
      this.logError(`Error writing report file: ${error}`);
    }
  }

  async generateFinalReport(): Promise<void> {
    // Czekamy, aż wszystkie dane zostaną zebrane
    await this.waitForAllData();
    
    // Dodajemy duplikaty do seoIssues dla każdego wyniku
    this.addDuplicatesToResults();
    
    // Teraz generujemy raport
    this.generateHTMLReport();
  }

  private addDuplicatesToResults(): void {
    const duplicateTitles = this.getDuplicateTitles();
    const duplicateDescriptions = this.getDuplicateDescriptions();

    this.results.forEach(result => {
      const titleDuplicates = duplicateTitles.find(d => d.urls.includes(result.url));
      if (titleDuplicates) {
        const duplicateTitleIssue = `Duplicate title: "${titleDuplicates.title}" found on: ${titleDuplicates.urls.join(', ')}`;
        if (result.seoIssues && !result.seoIssues.some(issue => issue.startsWith(`Duplicate title: "${titleDuplicates.title}"`))) {
          result.seoIssues.push(duplicateTitleIssue);
        }
      }

      const descriptionDuplicates = duplicateDescriptions.find(d => d.urls.includes(result.url));
      if (descriptionDuplicates) {
        const duplicateDescriptionIssue = `Duplicate description: "${descriptionDuplicates.description}" found on: ${descriptionDuplicates.urls.join(', ')}`;
        if (result.seoIssues && !result.seoIssues.some(issue => issue.startsWith(`Duplicate description: "${descriptionDuplicates.description}"`))) {
          result.seoIssues.push(duplicateDescriptionIssue);
        }
      }
    });
  }

  private waitForAllData(): Promise<void> {
    return new Promise((resolve) => {
      const checkDataComplete = () => {
        if (this.isDataCollectionComplete()) {
          resolve();
        } else {
          setTimeout(checkDataComplete, 100); // Sprawdzaj co 100ms
        }
      };
      checkDataComplete();
    });
  }

  private isDataCollectionComplete(): boolean {
    // Tutaj dodaj logikę sprawdzającą, czy wszystkie dane zostały zebrane
    // Na przykład, możesz sprawdzić, czy liczba wyników jest równa liczbie skanowanych URL-i
    return this.results.length === this.expectedUrlCount;
  }

  setExpectedUrlCount(count: number): void {
    this.expectedUrlCount = count;
  }

  getDuplicateTitles(): { title: string, urls: string[] }[] {
    return Array.from(this.titles.entries())
      .filter(([_, urls]) => urls.length > 1)
      .map(([title, urls]) => ({ title, urls }));
  }

  getDuplicateDescriptions(): { description: string, urls: string[] }[] {
    return Array.from(this.descriptions.entries())
      .filter(([_, urls]) => urls.length > 1)
      .map(([description, urls]) => ({ description, urls }));
  }
}

export const logger = new Logger();

export function generateReport() {
  // Logika generowania raportu
  // Na przykład: zapisz wyniki do pliku raport.html
}
