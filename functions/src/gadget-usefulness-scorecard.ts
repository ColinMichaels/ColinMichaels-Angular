export interface GadgetScorecardLink {
  href: string;
  label: string;
  description?: string;
}

export interface GadgetScorecardSection {
  heading: string;
  paragraphs: readonly string[];
  links?: readonly GadgetScorecardLink[];
}

export const GADGET_USEFULNESS_SCORECARD_PATH = '/resources/gadget-usefulness-scorecard';
export const GADGET_USEFULNESS_SCORECARD_DOWNLOAD_PATH = '/downloads/captain-colin-gadget-usefulness-scorecard.pdf';
export const GADGET_USEFULNESS_SCORECARD_HEADING = 'Gadget Usefulness Scorecard';
export const GADGET_USEFULNESS_SCORECARD_DESCRIPTION = 'Score a gadget on problem fit, evidence, true cost, everyday friction, and support with the printable Is It Actually Useful? worksheet.';

export const GADGET_USEFULNESS_SCORECARD_SECTIONS: readonly GadgetScorecardSection[] = [
  {
    heading: 'Download the one-page scorecard',
    paragraphs: [
      'Is It Actually Useful? is the recurring ColinMichaels.com framework for unusual gadgets, clever problem-solvers, marketplace finds, creator tools, robots, flying cameras, and objects that are too interesting to ignore. The printable keeps five practical questions and the evidence behind each answer on one page.',
      'This worksheet organizes research and personal judgment. It is not a scientific rating, product test, safety assessment, financial recommendation, or buying instruction. A score should never erase a safety concern, privacy problem, unclear relationship, missing source, or unsupported claim. The written evidence and limitations matter more than the total.',
    ],
    links: [
      {
        href: GADGET_USEFULNESS_SCORECARD_DOWNLOAD_PATH,
        label: 'Download the Gadget Usefulness Scorecard',
        description: 'Printable one-page PDF for one gadget, find, or product idea.',
      },
      {
        href: '/topics/gadgets-toys',
        label: 'Gadgets & Toys topic guide',
        description: 'Owned, tried, borrowed, wanted, and research-only gadget discoveries.',
      },
    ],
  },
  {
    heading: 'Useful is more interesting than merely new',
    paragraphs: [
      'The internet is excellent at showing the strangest feature, the cleanest demonstration, and the lowest headline price. It is much worse at showing who still uses the object after setup, charging, subscriptions, storage, cleanup, maintenance, and the first failed part. A clever design can be worth sharing without being a good purchase, and a boring object can be unusually useful when it solves a recurring problem with little friction.',
      'The framework begins by naming the relationship to the item and the evidence available. An owned item, a brief hands-on trial, a borrowed sample, manufacturer material, a viral clip, and research-only reporting are different evidence. Keeping those states visible prevents one enthusiastic sentence or polished video from making them sound interchangeable.',
    ],
  },
  {
    heading: 'The five usefulness scores',
    paragraphs: [
      'Real problem fit asks whether the object solves a specific problem often enough to matter. Name the user, the recurring problem, how often it happens, and the current workaround. Fun can be a valid reason, but fun is a different promise from usefulness. Evidence quality asks what proves the claim beyond the product page or one clip. Separate direct use, first-person footage, independent testing, seller or manufacturer claims, and facts that are still missing.',
      'True cost includes shipping, tax, accessories, subscriptions, consumables, replacement parts, maintenance, and the cost of a failed experiment. Everyday friction counts charging, pairing, accounts, compatibility, storage, cleanup, learning, noise, and the attention required after the first day. Support and exit covers returns, warranty, parts, app or cloud dependence, privacy, service history, resale, and what stops working if the company disappears.',
      'Score every area from zero to four and write one supporting fact or unanswered question beside it. A blank note is a warning that the number may be doing more work than the evidence. A useful verdict explains the strongest tradeoff in plain language instead of hiding uncertainty in a badge.',
    ],
  },
  {
    heading: 'How to score without pretending it is science',
    paragraphs: [
      'Zero means no useful evidence: the claim is unclear, unsupported, or unrelated to a real use. One means mostly promise: the idea is visible but the practical case relies mainly on marketing or hope. Two means conditional: the benefit may be real for a narrow user, setup, or price, with important unknowns. Three means solid with tradeoffs. Four means unusually strong evidence, fit, ownership reality, and exit options.',
      'The maximum total is 20. Sixteen to 20 suggests a strong fit with caveats worth stating. Eleven to 15 means interesting but still conditional. Six to 10 usually means the idea is cleverer than the everyday case. Zero to five means the useful case is not established yet. None of those bands tells a reader to buy. The final lines ask who it helps, who should skip it, and whether the next move is test, borrow, buy, wait, skip, or watch list.',
    ],
  },
  {
    heading: 'Label the relationship before the verdict',
    paragraphs: [
      'Owned means the object was used long enough to discuss recurring behavior rather than only first setup. Tried means direct hands-on experience with its duration, conditions, and limits stated. Borrowed means temporary access with ownership, return, and relationship context disclosed. Research-only means no hands-on claim; findings come from dated sources, footage, and documented limitations.',
      'Gifts, review units, sponsorships, affiliate links, company relationships, and synthetic media need their own disclosure. A scorecard does not turn manufacturer claims into independent results or make a generated illustration into product evidence. If the evidence state changes later, update the article and score explanation instead of silently presenting the new knowledge as if it existed in the original review.',
    ],
    links: [
      {
        href: '/editorial-standards',
        label: 'Editorial Standards & Corrections',
        description: 'How ColinMichaels.com labels experience, research, relationships, synthetic media, sources, and updates.',
      },
    ],
  },
  {
    heading: 'One recognizable framework across site and channel',
    paragraphs: [
      'A useful episode opens with the real object or claim, states whether the evidence is owned, tried, borrowed, or research-only, scores the five tradeoffs, and gives the useful answer: who benefits, who should skip it, and why. The article holds dated references, images, updates, and the printable. The video supplies motion, personality, demonstration, and a spoken next-watch cue.',
      'That shared rhythm gives readers and viewers something recognizable to return to: the strange object, the honest evidence label, the practical tradeoffs, the verdict, and one related item worth judging next. It also creates a clearer correction path because the claim, evidence, score, and date are visible rather than blended into one recommendation.',
    ],
    links: [
      {
        href: 'https://www.youtube.com/channel/UCCJMwxuUIb6S4aoZiZeAVeQ',
        label: 'Colin Michaels on YouTube',
        description: 'Useful finds, demonstrations, creator builds, and new experiments.',
      },
      {
        href: '/blog/they-bought-a-full-size-temu-mega-drone',
        label: 'What the full-size Temu mega drone video proved',
        description: 'A current example of separating a filmed event from broader product, legal, reliability, and delivery claims.',
      },
    ],
  },
  {
    heading: 'Save the sheet with the evidence file',
    paragraphs: [
      'Print one sheet per gadget and save the completed scorecard with the article, video, screenshots, quotes, receipts, messages, or research notes that support it. If the price, product, company, evidence, or relationship changes, date the new sheet and explain which score moved and why. That turns an old verdict into a useful update instead of a forgotten recommendation.',
      'If a criterion, disclosure boundary, source path, or scoring explanation is incomplete or misleading, use the public correction path with the resource URL and the strongest supporting evidence. The framework should become more honest as better information arrives, not more certain simply because an episode was already published.',
    ],
    links: [
      {href: '/contact', label: 'Report a correction or missing consideration'},
    ],
  },
];
