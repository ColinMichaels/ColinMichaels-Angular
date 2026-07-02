export interface AuthorProfile {
  name: string;
  title: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  profileFragment: string;
  shortBio: string;
  homeIntro: string;
  homeParagraphs: readonly string[];
  expertiseTopics: readonly string[];
  externalProfiles: readonly {
    label: string;
    href: string;
  }[];
  healthDisclaimer: string;
}

export const COLIN_AUTHOR_PROFILE: AuthorProfile = {
  name: 'Colin Michaels',
  title: 'Applications developer, FPV drone pilot, and creative technologist',
  location: 'Florida',
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fmedia-library%2Flibrary%2F1781710307542-26de032d-9418-4c44-8953-d5f4efdadeec.webp?alt=media&token=03c80fbe-8339-48cb-a150-0dbcf9cadff6',
  imageAlt: 'Colin Michaels site preview image',
  profileFragment: 'about',
  shortBio: 'Colin Michaels is an applications developer, FPV drone pilot, and creative technologist based in Florida. He writes from hands-on work with Angular, Firebase, CMS workflows, media systems, AI-assisted tools, FPV projects, and patient-perspective recovery after open-heart surgery.',
  homeIntro: 'Hi, I\'m Colin Michaels - an applications developer, FPV drone pilot, creative technologist, and recovering overthinker based in Florida.',
  homeParagraphs: [
    'This site started as a place to collect my projects, ideas, videos, experiments, and personal updates. Over time, it has become something more honest: a record of what I\'m building, what I\'m learning, and what I\'m trying to rebuild in myself.',
    'Professionally, I work in application development, mostly around front-end systems, dashboards, internal tools, media workflows, automation, and user-facing web applications. I enjoy turning scattered ideas into working systems, whether that means building a CMS feature, experimenting with AI-assisted content creation, organizing media libraries, or designing tools that make creative work easier.',
    'Creatively, I fly FPV drones, shoot video and photography, make thumbnails and graphics, and experiment with storytelling across different formats. I like projects that combine code, visuals, motion, music, and a little bit of personality.',
    'A major part of this blog also follows my recovery after open-heart surgery and valve replacement. I write about that experience as a patient, not as a medical expert. My goal is to be honest about the fear, frustration, humor, progress, setbacks, and small wins that come with recovery.',
    'ColinMichaels.com is my project journal, recovery notebook, creative archive, and testing ground. Some posts are technical. Some are personal. Some are funny. Some are written because I wish I had found something like them when I needed it.',
    'Thanks for reading.',
  ],
  expertiseTopics: [
    'Angular and Firebase application architecture',
    'CMS publishing workflows and SEO implementation',
    'AI-assisted creative and technical workflows',
    'FPV, media production, and project demos',
    'Open-heart surgery recovery from a patient perspective',
  ],
  externalProfiles: [
    {
      label: 'GitHub',
      href: 'https://github.com/ColinMichaels',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/colinmichaels',
    },
  ],
  healthDisclaimer: 'Anything health-related on this site is personal experience only and should not be taken as medical advice.',
};
