import { crawlSinglePage, crawlWebsite, crawlMultiplePages } from "./crawler";
import { logger } from "./utils/logger";
import { URL } from "url";

async function scanWebsite(mode: string, urls: string[]) {
    switch (mode) {
        case 'full':
            logger.setExpectedUrlCount(1); // Ustawiamy na 1, bo nie znamy jeszcze liczby podstron
            await scanFullWebsite(urls[0]);
            break;
        case 'single':
            logger.setExpectedUrlCount(1);
            await scanSinglePage(urls[0]);
            break;
        case 'multiple':
            logger.setExpectedUrlCount(urls.length);
            await scanMultiplePages(urls);
            break;
        default:
            console.error("Invalid mode. Use 'full', 'single', or 'multiple'");
    }

    // Po zakończeniu skanowania, generujemy raport
    await logger.generateFinalReport();
}

async function scanFullWebsite(url: string) {
    console.log(`Scanning full website: ${url}`);
    const visitedUrls = await crawlWebsite(url);
    console.log(`Scanned ${visitedUrls.size} pages for ${url}`);
    logger.printSummary();
    // Usunięto logger.generateHTMLReport();
}

async function scanSinglePage(url: string) {
    console.log(`Scanning single page: ${url}`);
    const visitedUrls = await crawlSinglePage(url);
    console.log(`Scanned ${visitedUrls.size} pages for ${url}`);
    logger.printSummary();
    // Usunięto logger.generateHTMLReport();
}

async function scanMultiplePages(urls: string[]) {
    console.log(`Scanning multiple pages: ${urls.join(", ")}`);
    const visitedUrls = await crawlMultiplePages(urls);
    console.log(`Scanned ${visitedUrls.size} pages for ${urls.join(", ")}`);
    logger.printSummary();
    // Usunięto logger.generateHTMLReport();
}

async function main() {
    const args = process.argv.slice(2);
    const modeIndex = args.indexOf('--mode');
    if (modeIndex !== -1 && args.length > modeIndex + 1) {
        const mode = args[modeIndex + 1];
        const urls = args.slice(modeIndex + 2);
        await scanWebsite(mode, urls);
    } else {
        console.error("Usage: npm start -- --mode <mode> <urls>");
    }
}

main().catch(console.error);
