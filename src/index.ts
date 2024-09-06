import { crawlWebsite } from './crawler';
import yargs from 'yargs';

const argv = yargs
  .command('$0 [urls...]', 'Crawl specified URLs', (yargs) => {
    yargs.positional('urls', {
      describe: 'URLs to crawl',
      type: 'string'
    })
  })
  .option('mode', {
    alias: 'm',
    description: 'Crawling mode',
    choices: ['single', 'multiple', 'full'],
    default: 'multiple'
  })
  .help()
  .alias('help', 'h')
  .argv;

async function main() {
  const urls = (argv.urls as string[])
    .filter(url => url && url.trim() !== '')
    .map(url => url.trim());

  const singlePage = argv.mode !== 'full';

  if (urls.length === 0) {
    console.error('No valid URLs provided');
    process.exit(1);
  }

  for (const url of urls) {
    await crawlWebsite(url, singlePage);
  }
}

main().catch(error => console.error('Crawling error:', error));
