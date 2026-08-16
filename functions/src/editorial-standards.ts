export interface EditorialStandardsLink {
  href: string;
  label: string;
  description?: string;
}

export interface EditorialStandardsSection {
  heading: string;
  paragraphs: readonly string[];
  links?: readonly EditorialStandardsLink[];
}

export const EDITORIAL_STANDARDS_PATH = '/editorial-standards';
export const EDITORIAL_STANDARDS_HEADING = 'Editorial Standards & Corrections';
export const EDITORIAL_STANDARDS_DESCRIPTION = 'How ColinMichaels.com labels hands-on experience, research, sources, synthetic media, relationships, and meaningful corrections.';
export const EDITORIAL_STANDARDS_EFFECTIVE_DATE = 'August 15, 2026';

export const EDITORIAL_STANDARDS_SECTIONS: readonly EditorialStandardsSection[] = [
  {
    heading: 'What this policy covers',
    paragraphs: [
      `Effective ${EDITORIAL_STANDARDS_EFFECTIVE_DATE}. ColinMichaels.com is a personal creator publication, not a newsroom, laboratory, medical practice, or product-testing company. Colin publishes first-person project notes, practical technology guides, gadget research, FPV stories, software work, and patient-perspective recovery writing.`,
      'The standard for new and meaningfully revised work is to make the basis of each important claim clear. Older articles may not yet meet every part of this policy; they are reviewed when they are updated instead of being silently presented as newly verified.',
    ],
  },
  {
    heading: 'What the experience labels mean',
    paragraphs: [
      'Hands-on or tested means Colin personally used the product, process, aircraft, software, or location. The article should name the meaningful conditions, duration, version, and limitations instead of turning one use into a universal verdict.',
      'First-person or field notes means the material comes from Colin\'s own project, flight, recovery experience, photograph, footage, or documented workflow. Personal experience can be useful evidence, but it does not automatically apply to every reader.',
      'Researched or pre-buy analysis means Colin did not test the item for the article. The analysis compares current public evidence and should identify the source date, open questions, and the difference between availability, marketing, and independent proof.',
      'Manufacturer claim or demonstration means a specification, price, release statement, or video came from the company responsible for the product. It is attributed to that company and is not described as an independent result.',
      'Editorial illustration or synthetic media means the image or media helps explain an idea but is not a product photograph, documentary record, test result, or proof that an event occurred. Material synthetic media should be disclosed in its caption or nearby context.',
    ],
  },
  {
    heading: 'Sources, links, and current claims',
    paragraphs: [
      'Verifiable claims should link to the most direct useful source available: official documentation, product or regulatory material, original research, a complete public statement, or clearly identified independent reporting. A media embed can provide context, but its destination does not automatically count as a citation.',
      'Source links should use descriptive labels, not a bare publication name without a destination. Prices, availability, software behavior, regulations, and product specifications can change; current articles should say when the evidence was checked and avoid converting a snapshot into a permanent claim.',
    ],
  },
  {
    heading: 'Independence, access, and compensation',
    paragraphs: [
      'A relevant financial or access relationship should be disclosed close to the article or recommendation. That includes sponsorship, affiliate links, free products, loans, travel, early access, paid consulting, or another relationship that a reasonable reader would want to know about.',
      'Compensation does not buy a favorable conclusion or the removal of a supported criticism. If no relationship is disclosed, readers should not infer that a product was supplied, sponsored, or tested.',
    ],
  },
  {
    heading: 'AI assistance and synthetic media',
    paragraphs: [
      'AI tools may assist with research organization, drafting alternatives, code, transcription, or visual ideation. Colin remains responsible for the published claims, source choices, disclosures, and final editorial judgment. AI output is not treated as a source merely because it sounds confident.',
      'Synthetic editorial images should be labeled and should never be presented as documentary evidence, an official product image, or proof of hands-on testing. Original photographs, screenshots, measurements, and footage should be distinguished from illustrative media.',
    ],
  },
  {
    heading: 'Health, safety, legal, and financial boundaries',
    paragraphs: [
      'Recovery and medical-planning articles describe personal experience and organization help, not medical advice. Aviation rules, product safety, insurance, legal, and financial claims should be checked against current qualified or official sources. Readers should confirm decisions with the appropriate licensed professional or regulator.',
      'Personal experience is labeled as such. It should not be generalized into a diagnosis, treatment plan, legal conclusion, flight authorization, or guarantee of another person\'s outcome.',
    ],
  },
  {
    heading: 'Corrections and substantive updates',
    paragraphs: [
      'Send the article URL, the disputed statement, and the best available supporting source. The evidence and the article\'s original context are reviewed before changing the record.',
      'Clear factual errors are corrected promptly. A substantive revision keeps a visible Updated date. When a correction changes the evidence, recommendation, or conclusion, the article should explain the material change rather than silently rewriting history.',
    ],
    links: [
      {href: '/contact', label: 'Report a correction'},
      {href: 'mailto:colin@colinmichaels.com', label: 'Email Colin'},
    ],
  },
  {
    heading: 'Who is accountable',
    paragraphs: [
      'Colin Michaels is the publisher and is responsible for this policy. Read the public author profile for his background and complete publishing history, or use the contact path for a sourcing, rights, disclosure, or correction question.',
    ],
    links: [
      {href: '/authors/colin-michaels', label: 'About Colin Michaels'},
      {href: '/privacy', label: 'Privacy Policy'},
      {href: '/blog', label: 'Read the blog'},
    ],
  },
];
