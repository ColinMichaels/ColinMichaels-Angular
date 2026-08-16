export interface BuyerVerificationLink {
  href: string;
  label: string;
  description?: string;
}

export interface BuyerVerificationSection {
  heading: string;
  paragraphs: readonly string[];
  links?: readonly BuyerVerificationLink[];
}

export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_PATH = '/resources/personal-aircraft-buyer-verification';
export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DOWNLOAD_PATH = '/downloads/captain-colin-personal-aircraft-buyer-verification.pdf';
export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_HEADING = 'Personal Aircraft Buyer Verification';
export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DESCRIPTION = 'Download a two-page worksheet for checking a personal aircraft offer, deposit terms, legal-category claims, support, and evidence before paying.';
export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_REVIEWED_DATE = 'August 15, 2026';

export const PERSONAL_AIRCRAFT_BUYER_VERIFICATION_SECTIONS: readonly BuyerVerificationSection[] = [
  {
    heading: 'Download the two-page worksheet',
    paragraphs: [
      `Reviewed ${PERSONAL_AIRCRAFT_BUYER_VERIFICATION_REVIEWED_DATE}. This printable field resource organizes the seller, exact aircraft configuration, offer, deposit, legal-category claim, operating reality, training, support, evidence, and unanswered red flags before a buyer sends money.`,
      'It is a research organizer, not financial, legal, aviation, safety, or purchase advice. It does not determine whether any aircraft qualifies for Part 103 or another category. The exact aircraft, intended operation, transaction, and jurisdiction require review with the appropriate qualified professionals and agencies.',
    ],
    links: [
      {
        href: PERSONAL_AIRCRAFT_BUYER_VERIFICATION_DOWNLOAD_PATH,
        label: 'Download Personal Aircraft Buyer Verification',
        description: 'Printable two-page PDF.',
      },
      {
        href: '/topics/drones-fpv',
        label: 'Drones & FPV topic guide',
        description: 'Flight stories, field notes, videos, and practical resources.',
      },
      {
        href: '/blog/they-bought-a-full-size-temu-mega-drone',
        label: 'What the full-size Temu drone video actually proved',
        description: 'The filmed event, visible problems, and evidence that remained missing.',
      },
    ],
  },
  {
    heading: 'A filmed flight proves less than a purchase requires',
    paragraphs: [
      'A video can show one aircraft lifting one person during one filmed test. It does not, by itself, prove repeatable reliability, airworthiness, the legal category of another configuration, the next buyer\'s pilot readiness, insurance availability, safe shipping, parts support, or the seller\'s ability to deliver the next order. A checkout page proves that money can be requested. It does not prove production maturity.',
      'Save the exact listing, configuration, quote, invoice, promised delivery window, refund terms, and the name of the legal entity receiving payment. Ask for current delivered-customer evidence and written answers about training, maintenance, batteries, life-limited parts, warranty exclusions, service, and replacement lead times. If the version in the paperwork is not the version behind the seller\'s legal or performance claim, stop and resolve the mismatch before paying.',
    ],
  },
  {
    heading: 'Part 103 is a narrow category, not a marketing label',
    paragraphs: [
      'The current eCFR says Part 103 applies to a single-occupant vehicle used only for recreation or sport that has no U.S. or foreign airworthiness certificate and meets the applicable weight, fuel, speed, and stall limits. For a powered ultralight, the empty-weight threshold is less than 254 pounds after the rule\'s stated exclusions, fuel capacity cannot exceed five U.S. gallons, full-power level-flight speed cannot exceed 55 knots calibrated airspeed, and power-off stall speed cannot exceed 24 knots.',
      'Part 103 also contains operating restrictions. It generally limits operations to daylight, requires the operator to see and avoid aircraft, bars flight over congested areas and open-air assemblies, and requires prior authorization in specified controlled airspace. Those points do not classify a particular electric multicopter. Ask for the written basis that applies to the exact configuration and intended operation, including the complete weight treatment and the path that applies if the vehicle does not qualify.',
    ],
    links: [
      {
        href: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-103',
        label: '14 CFR Part 103 - Ultralight Vehicles',
        description: 'Current applicability, certification, registration, and operating-rule text from the eCFR.',
      },
      {
        href: 'https://www.faa.gov/aircraft/gen_av/ultralights',
        label: 'FAA Ultralights & Amateur-built Aircraft',
        description: 'FAA starting point for ultralight and amateur-built reference material.',
      },
    ],
  },
  {
    heading: 'Make the deposit terms survive the sales call',
    paragraphs: [
      'Record what is refundable, what becomes non-refundable, the cancellation process, payment milestones, taxes, freight, import or customs costs, assembly, inspection, training, storage, transport, insurance, and the remedy if production or delivery slips. Keep copies of the seller\'s page, written quote, order agreement, receipt, messages, and every promise tied to timing or refunds.',
      'Current Federal Trade Commission guidance explains shipping-delay, refund, recordkeeping, and payment-dispute considerations for many mail, online, and telephone orders. A personal-aircraft deposit, preorder, custom build, or cross-border transaction may raise different questions. Review the current guidance and get transaction-specific advice instead of assuming an ordinary online-shopping remedy will fit later.',
    ],
    links: [
      {
        href: 'https://consumer.ftc.gov/articles/what-do-if-youre-billed-things-you-never-got-or-you-get-unordered-products',
        label: 'FTC guidance for orders that do not arrive',
        description: 'Current consumer guidance on shipment timing, records, refunds, and credit or debit card disputes.',
      },
    ],
  },
  {
    heading: 'Build the evidence file before the problem',
    paragraphs: [
      'Keep dated listing and specification snapshots; the written quote, order agreement, invoice, receipt, and payment milestones; delivery, cancellation, delay, refund, warranty, and support promises; the training syllabus, manuals, maintenance schedule, and emergency procedures; and the classification basis, weight and performance evidence, and intended-operation notes.',
      'For aircraft that follow a registration path, the FAA provides aircraft inquiry and record-request tools. The NTSB aviation database covers U.S. civil aviation accidents and selected incidents from 1962 to the present and supports searches by fields including make, model, registration, FAR part, and narrative. A search result is context, not a guarantee about an aircraft with no result or a conclusion about an unrelated configuration.',
    ],
    links: [
      {
        href: 'https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry',
        label: 'FAA Aircraft Registration',
        description: 'Aircraft inquiry, record requests, registration services, and registration-reference paths.',
      },
      {
        href: 'https://www.ntsb.gov/Pages/AviationQueryV2.aspx',
        label: 'NTSB Aviation Investigation Search',
        description: 'Search civil aviation accidents and selected incidents by aircraft and operation fields.',
      },
    ],
  },
  {
    heading: 'Stop signs that deserve a written answer',
    paragraphs: [
      'Stop when refund status changes during the conversation or exists only verbally; when the legal entity, physical address, payment recipient, or contracting party cannot be confirmed; or when the exact configuration differs between the marketing page, quote, invoice, and legal-category claim.',
      'Pause when urgency or a disappearing slot replaces written delivery, delay, cancellation, and refund terms; when current customer-delivery evidence is unavailable while reservation or prototype numbers are emphasized; or when training, manuals, parts, batteries, service, warranty exclusions, or incident questions stay vague. No deposit until the unanswered red flags that matter to the buyer are resolved in writing.',
    ],
  },
  {
    heading: 'Freshness and corrections',
    paragraphs: [
      'The eCFR page was current through August 13, 2026 when this resource was reviewed. Regulations, agency pages, transaction facts, product configurations, available records, and payment protections can change. Recheck every source before relying on it.',
      'If an official source, worksheet field, or evidence boundary is incomplete or outdated, use the public correction path with the resource URL and the strongest available supporting source. Material updates should be dated rather than silently presented as if they were part of the original review.',
    ],
    links: [
      {href: '/editorial-standards', label: 'Editorial Standards & Corrections'},
      {href: '/contact', label: 'Report a correction'},
    ],
  },
];
