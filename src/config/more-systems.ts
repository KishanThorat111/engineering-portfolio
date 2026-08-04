/**
 * The "more systems" strip — blueprint §4.4, on /experience only.
 *
 * These are compact cards with no case-study pages behind them, which is why
 * they are config rather than entries in the `systems` collection: adding them
 * there would put them on /systems and on Home beside three platforms that
 * carry full case studies, blurring exactly the distinction the strip exists
 * to draw. They are real work, and they are not the same claim.
 *
 * The festival app is framed as a community project because that is what it
 * is. Presenting it as anything else would be the sort of small inflation this
 * site is built to avoid.
 */
export interface MoreSystem {
  title: string;
  summary: string;
  stack: string[];
  /** Set where the work is community rather than commercial. */
  community?: boolean;
}

export const MORE_SYSTEMS: readonly MoreSystem[] = [
  {
    title: 'Court bundle generator',
    summary:
      'Turns scanned legal PDFs into indexed, hyperlinked court bundles with automatic pagination, alongside a chat bot that collects case details from solicitors directly.',
    stack: ['Python', 'OCR', 'Telegram Bot API'],
  },
  {
    title: 'Lead-qualification agents',
    summary:
      'Pipelines that scrape, summarise, and score prospects, then notify the sales side by email without anyone opening a dashboard.',
    stack: ['n8n', 'LangChain'],
  },
  {
    title: 'Festival donations app',
    summary:
      'An offline-capable, multilingual donations app built for my community’s Ganesh Chaturthi festival, with fuzzy matching so a donor recorded slightly differently is still recognised as the same person.',
    stack: ['Progressive web app', 'Vanilla JS'],
    community: true,
  },
] as const;
