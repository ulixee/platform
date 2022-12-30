import { string } from '@ulixee/schema';

export const CrawlerOutputSchema = {
  crawler: string({ description: 'The type of crawler output that has been produced.' }),
  version: string({ description: 'The semantic version of the crawler output.' }),
  sessionId: string({
    description: 'A session id providing context for how to look up the assets',
  }),
};

export default interface ICrawlerOutputSchema {
  crawler: string;
  version: string;
  sessionId: string;
}
