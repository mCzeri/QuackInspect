import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export class Crawler {
  private visitedUrls: Set<string> = new Set();

  constructor(private config: CrawlerConfig) {}

  async crawl(): Promise<void> {
    switch (this.config.mode) {
      case 'single':
        await this.crawlSingle(this.config.target);
        break;
      case 'multiple':
        await this.crawlMultiple(this.config.target.split(','));
        break;
      case 'full':
        await this.crawlFull(this.config.target);
        break;
      default:
        throw new Error('Invalid crawl mode');
    }
    console.log(`Total URLs scanned: ${this.visitedUrls.size}`);
  }

  private async crawlSingle(url: string): Promise<void> {
    await this.scanUrl(url);
  }

  private async crawlMultiple(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.scanUrl(url);
    }
  }

  private async crawlFull(startUrl: string): Promise<void> {
    const queue: string[] = [startUrl];
    while (queue.length > 0) {
      const url = queue.shift()!;
      if (!this.visitedUrls.has(url)) {
        await this.scanUrl(url);
        const links = await this.extractLinks(url);
        queue.push(...links.filter(link => !this.visitedUrls.has(link)));
      }
    }
  }

  private async scanUrl(url: string): Promise<void> {
    if (this.visitedUrls.has(url)) return;
    
    try {
      const response = await axios.get(url);
      this.visitedUrls.add(url);
      console.log(`Scanned: ${url}`);
      // Tutaj możesz dodać logikę analizy zawartości strony
    } catch (error) {
      console.error(`Error scanning ${url}: ${error}`);
    }
  }

  private async extractLinks(url: string): Promise<string[]> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const links: string[] = [];
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            const fullUrl = new URL(href, url).href;
            if (new URL(fullUrl).hostname === new URL(url).hostname) {
              links.push(fullUrl);
            }
          } catch (error) {
            // Ignoruj nieprawidłowe URL-e
          }
        }
      });
      return links;
    } catch (error) {
      console.error(`Error extracting links from ${url}: ${error}`);
      return [];
    }
  }
}

interface CrawlerConfig {
  mode: "single" | "multiple" | "full";
  target: string;
}
