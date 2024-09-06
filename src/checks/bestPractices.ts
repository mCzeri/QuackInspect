import { CheerioAPI } from 'cheerio';
import { logger } from '../utils/logger';
import axios from 'axios';

const MAX_REDIRECTS = 5;

export async function checkBestPractices($: CheerioAPI, url: string): Promise<string[]> {
  const issues: string[] = [];

  // Check alt attributes for images
  $('img').each((_, element) => {
    if (!$(element).attr('alt')) {
      const message = `Missing alt attribute for image: ${$(element).attr('src')} on ${url}`;
      logger.logError(message);
      issues.push(message);
    }
  });

  // Check responsiveness
  if ($('meta[name="viewport"]').length === 0) {
    const message = `Missing viewport meta tag on ${url}`;
    logger.logError(message);
    issues.push(message);
  }

  // Check number of redirects
  try {
    const response = await axios.get(url, {
      maxRedirects: MAX_REDIRECTS,
      validateStatus: function (status) {
        return status < 400; // Reject only if the status code is greater than or equal to 400
      },
    });
    
    if (response.request.res.responseUrl !== url) {
      const redirectCount = response.request.res.req._redirectable._redirectCount;
      if (redirectCount > 0) {
        const message = `URL has ${redirectCount} redirect(s). Final destination: ${response.request.res.responseUrl}`;
        logger.logInfo(message);
        issues.push(message);
        
        if (redirectCount >= MAX_REDIRECTS) {
          const maxRedirectMessage = `URL has reached or exceeded the maximum number of allowed redirects (${MAX_REDIRECTS})`;
          logger.logError(maxRedirectMessage);
          issues.push(maxRedirectMessage);
        }
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      const message = `Too many redirects (more than ${MAX_REDIRECTS}) for ${url}`;
      logger.logError(message);
      issues.push(message);
    } else {
      const message = `Error checking redirects for ${url}: ${error}`;
      logger.logError(message);
      issues.push(message);
    }
  }

  return issues;
}