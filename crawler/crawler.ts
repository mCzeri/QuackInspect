import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { parse as parseRobotsTxt } from "robots-parser";

export class Crawler {
  private visitedUrls: Set<string> = new Set();
  private robotsTxt: any = null;

  constructor(private config: CrawlerConfig) {}

  async crawl(): Promise<void> {
    this.visitedUrls.clear();
    await this.fetchRobotsTxt(this.config.urls[0]);

    if (this.config.mode === "single") {
      await this.crawlSingle(this.config.urls[0]);
    } else if (this.config.mode === "multiple") {
      await this.crawlMultiple(this.config.urls);
    } else if (this.config.mode === "full") {
      await this.crawlFull(this.config.urls[0]);
    } else {
      throw new Error("Nieprawidłowy tryb crawlera");
    }

    console.log(`Total URLs scanned: ${this.visitedUrls.size}`);
  }

  private async fetchRobotsTxt(baseUrl: string): Promise<void> {
    try {
      const robotsTxtUrl = new URL("/robots.txt", baseUrl).href;
      const response = await axios.get(robotsTxtUrl);
      this.robotsTxt = parseRobotsTxt(response.data, robotsTxtUrl);
    } catch (error) {
      console.error(`Error fetching robots.txt: ${error}`);
    }
  }

  // Crawl a single URL without following internal links
  private async crawlSingle(url: string): Promise<void> {
    console.log(`Crawling single URL: ${url}`);
    if (this.isAllowedByRobotsTxt(url)) {
      await this.processSingleUrl(url);
    }
  }

  // Crawl multiple URLs without following internal links
  private async crawlMultiple(urls: string[]): Promise<void> {
    for (const url of urls) {
      console.log(`Crawling multiple URL: ${url}`);
      if (this.isAllowedByRobotsTxt(url)) {
        await this.processSingleUrl(url);
      }
    }
  }

  // Crawl starting from a single URL and follow all links (full crawl)
  private async crawlFull(startUrl: string): Promise<void> {
    const queue: string[] = [startUrl];

    while (queue.length > 0) {
      const url = queue.shift()!;
      console.log(`Crawling full URL: ${url}`);
      if (!this.visitedUrls.has(url) && this.isAllowedByRobotsTxt(url)) {
        await this.processSingleUrl(url);
        const content = await this.fetchContent(url);
        const links = this.extractLinks(content, url);
        queue.push(
          ...links.filter(
            (link) => this.isValidUrl(link) && !this.visitedUrls.has(link)
          )
        );
      }
    }
  }

  // Process a single URL and do not follow links in single or multiple mode
  private async processSingleUrl(url: string): Promise<void> {
    console.log(`Processing URL: ${url}`);
    if (this.visitedUrls.has(url)) {
      return;
    }

    const content = await this.fetchContent(url);
    this.extractData(content, url);
    this.visitedUrls.add(url);

    // In single and multiple modes, do not follow links
    // Only full mode allows following links
  }

  // Fetch the content of a URL
  private async fetchContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, { maxRedirects: 5 });
      return response.data;
    } catch (error) {
      console.error(`Error fetching content from ${url}: ${error}`);
      return "";
    }
  }

  // Extract data from the content of a page
  private extractData(content: string, url: string): void {
    const $ = cheerio.load(content);
    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content");

    console.log(`URL: ${url}`);
    console.log(`Title: ${title}`);
    console.log(`Meta Description: ${metaDescription}`);
    console.log("---");
  }

  // Extract all valid links from the content of a page
  private extractLinks(content: string, baseUrl: string): string[] {
    const $ = cheerio.load(content);
    const links: string[] = [];

    $("a").each((_, element) => {
      const href = $(element).attr("href");
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          if (
            this.isValidUrl(absoluteUrl) &&
            !this.isWordPressAdminUrl(absoluteUrl)
          ) {
            links.push(absoluteUrl);
          }
        } catch (error) {
          console.error(`Invalid URL: ${href}`);
        }
      }
    });

    return links;
  }

  // Validate if the URL is in the correct format
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith("http://") || url.startsWith("https://");
    } catch (error) {
      return false;
    }
  }

  // Check if the URL is related to WordPress admin or login
  private isWordPressAdminUrl(url: string): boolean {
    return url.includes("/wp-admin") || url.includes("/wp-login.php");
  }

  // Check if the URL is allowed by robots.txt
  private isAllowedByRobotsTxt(url: string): boolean {
    if (!this.robotsTxt) {
      return true;
    }
    return this.robotsTxt.isAllowed(url);
  }
}

// Configuration interface for the crawler
interface CrawlerConfig {
  mode: "single" | "multiple" | "full";
  urls: string[];
}
