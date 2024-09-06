import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

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
}

class Logger {
  private results: TestResult[] = [];

  logSuccess(message: string): void {
    console.log(chalk.green('✓') + ' ' + message);
  }

  logError(message: string): void {
    console.log(chalk.red('✗') + ' ' + message);
  }

  logInfo(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
  }

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  printSummary() {
    console.log('\n--- Podsumowanie ---');
    this.results.forEach((result) => {
      console.log(`\nURL: ${result.url}`);
      
      if (result.seoIssues && result.seoIssues.length > 0) {
        console.log('Problemy SEO:');
        result.seoIssues.forEach((issue) => console.log(`- ${issue}`));
      } else {
        console.log('Brak problemów SEO.');
      }
      
      if (result.bestPracticesIssues && result.bestPracticesIssues.length > 0) {
        console.log('Problemy z najlepszymi praktykami:');
        result.bestPracticesIssues.forEach((issue) => console.log(`- ${issue}`));
      } else {
        console.log('Brak problemów z najlepszymi praktykami.');
      }
    });
  }

  generateHTMLReport(): void {
    const templatePath = path.join(__dirname, 'template.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    const resultsJSON = JSON.stringify(this.results);
    
    const totalUrls = this.results.length;
    const urlsWithIssues = this.results.filter(result => 
      result.seoIssues.length + result.bestPracticesIssues.length > 0
    ).length;
    const totalIssues = this.results.reduce((sum, result) => 
      sum + result.seoIssues.length + result.bestPracticesIssues.length, 0
    );

    const html = template
      .replace('{{RESULTS}}', resultsJSON)
      .replace('{{TOTAL_URLS}}', totalUrls.toString())
      .replace('{{URLS_WITH_ISSUES}}', urlsWithIssues.toString())
      .replace('{{TOTAL_ISSUES}}', totalIssues.toString());

    fs.writeFileSync('report.html', html);
    console.log(chalk.green('HTML report generated: report.html'));
  }
}

export const logger = new Logger();

export function generateReport() {
    // Logika generowania raportu
    // Na przykład: zapisz wyniki do pliku raport.html
}