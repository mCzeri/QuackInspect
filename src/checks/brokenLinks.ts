import axios from 'axios';
import { CheerioAPI } from 'cheerio';
import { URL } from 'url';
import { logger } from '../utils/logger';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkBrokenLinks($: CheerioAPI, baseUrl: string): Promise<string[]> {
  const brokenLinks: string[] = [];
  const links = $('a').map((_, element) => $(element).attr('href')).get();

  const ignoredDomains = [
    'twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com',
    'paypal.com', 'designrush.com', 'selecthub.com'
  ];

  for (const href of links) {
    if (href) {
      // Ignoruj linki javascript:, mailto: i tel:
      if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      let fullUrl: string;
      try {
        fullUrl = new URL(href, baseUrl).toString();
      } catch (error) {
        logger.logInfo(`Invalid URL: ${href} (found on ${baseUrl})`);
        continue;
      }
      
      if (ignoredDomains.some(domain => fullUrl.includes(domain))) {
        continue;
      }

      try {
        await delay(500);
        const response = await axios.get(fullUrl, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status < 400 || status === 403;
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebsiteQATool/1.0; +https://example.com/bot)'
          }
        });

        if (response.status >= 400 && response.status !== 403) {
          const message = `Broken link (status ${response.status}): ${fullUrl} (found on ${baseUrl})`;
          logger.logError(message);
          brokenLinks.push(message);
        } else if (response.status === 403) {
          logger.logInfo(`Access forbidden (status 403): ${fullUrl} (found on ${baseUrl})`);
        } else if (response.status >= 300) {
          logger.logInfo(`Redirect (status ${response.status}): ${fullUrl} -> ${response.headers.location}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            logger.logInfo(`Timeout when connecting to: ${fullUrl} (found on ${baseUrl})`);
          } else {
            const message = `Cannot connect to: ${fullUrl} (found on ${baseUrl}). Error: ${error.message}`;
            logger.logError(message);
            brokenLinks.push(message);
          }
        } else {
          const message = `Unexpected error for: ${fullUrl} (found on ${baseUrl}). Error: ${error}`;
          logger.logError(message);
          brokenLinks.push(message);
        }
      }
    }
  }

  return brokenLinks;
}