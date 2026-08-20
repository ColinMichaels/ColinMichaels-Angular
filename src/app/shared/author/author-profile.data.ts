import {CREATOR_PROFILE_URLS} from '../seo/site-identity';

export interface AuthorBioSection {
  heading: string;
  paragraphs: readonly string[];
  bullets: readonly string[];
}

export interface AuthorProfile {
  name: string;
  title: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  profileFragment: string;
  shortBio: string;
  homeBioSections: readonly AuthorBioSection[];
  externalProfiles: readonly {
    label: string;
    href: string;
  }[];
  healthDisclaimer: string;
}

export const COLIN_AUTHOR_PROFILE: AuthorProfile = {
  name: 'Colin Michaels',
  title: 'Application developer, recording and mixing engineer, creative problem solver, FPV drone pilot, and photographer',
  location: 'Florida',
  imageUrl: 'https://firebasestorage.googleapis.com/v0/b/colinmichaels.firebasestorage.app/o/cms%2Fblog-media%2Fmedia-library%2Flibrary%2F1781710307542-26de032d-9418-4c44-8953-d5f4efdadeec.webp?alt=media&token=03c80fbe-8339-48cb-a150-0dbcf9cadff6',
  imageAlt: 'Colin Michaels site preview image',
  profileFragment: 'about',
  shortBio: 'Colin Michaels is an application developer, recording and mixing engineer, creative problem solver, FPV drone pilot, photographer, and builder of software, AI workflows, websites, drones, videos, and new ideas.',
  homeBioSections: [
    {
      heading: 'About Me',
      paragraphs: [
        'Hi, I’m Colin Michaels—an application developer, recording and mixing engineer, creative problem solver, FPV drone pilot, photographer, and someone who’s always building something.',
        'Whether it’s software, AI workflows, websites, drones, videos, or entirely new ideas, I enjoy figuring out how things work—and then making them better. I believe the best projects are the ones that solve real problems while teaching you something along the way.',
        'ColinMichaels.com started as a simple portfolio, but over time it became something much more personal. Today it’s a place where I share the projects I’m building, the lessons I’m learning, experiments that succeed (and plenty that don’t), and the occasional life challenge that ends up teaching me something unexpected.',
      ],
      bullets: [],
    },
    {
      heading: 'What I Do',
      paragraphs: [
        'Professionally, I design and build modern web applications, internal business platforms, content management systems, and AI-powered tools. My primary focus is application development using technologies like Angular, TypeScript, Firebase, Node.js, and modern cloud services, but I genuinely enjoy learning new technologies and finding better ways to solve complex problems.',
        'I like taking messy ideas, complicated workflows, or repetitive tasks and turning them into software that’s clean, intuitive, and enjoyable to use. Whether it’s improving user experience, automating a business process, or experimenting with the latest AI tools, I’m always looking for ways to make technology work smarter.',
      ],
      bullets: [],
    },
    {
      heading: 'Beyond the Keyboard',
      paragraphs: [
        'When I’m not writing code, you’ll usually find me flying FPV drones, capturing photos and videos, exploring creative AI projects, working on electronics, or dreaming up another project that probably didn’t need to exist—but sounded like fun.',
        'Creativity has always been a huge part of who I am. I enjoy blending technology with photography, filmmaking, design, music, and storytelling to create projects that are both useful and entertaining.',
        'Before I focused on software, I spent years in recording studios working on albums as an engineer, mixer, assistant, arranger, and production assistant. Those sessions taught me to listen closely, solve problems under pressure, and make room for the people doing the creative work.',
      ],
      bullets: [],
    },
    {
      heading: 'A Journey I Didn’t Expect',
      paragraphs: [
        'In 2026, my life changed unexpectedly when I underwent open-heart surgery after developing infective endocarditis. Recovery became its own project—one measured in small victories instead of feature releases.',
        'That experience reminded me that progress isn’t always measured by how fast you move. Sometimes it’s measured by simply refusing to stop moving forward.',
        'I’ve chosen to share parts of that journey here, not because I’m a medical expert, but because I know someone else will eventually be searching for the same answers, encouragement, or reassurance that I was looking for during recovery. If my experiences help even one person feel a little less alone, then they’re worth sharing.',
      ],
      bullets: [],
    },
    {
      heading: 'What You’ll Find Here',
      paragraphs: [
        'This website is a collection of the things I’m passionate about:',
      ],
      bullets: [
        'Software development and modern web technologies',
        'Artificial Intelligence and practical AI workflows',
        'Angular, Firebase, CMS development, and automation',
        'Technology reviews and project breakdowns',
        'FPV drones, photography, and filmmaking',
        'Creative experiments and side projects',
        'Personal growth, recovery, and lessons learned',
        'Behind-the-scenes looks at what I’m currently building',
      ],
    },
    {
      heading: 'Thanks for Stopping By',
      paragraphs: [
        'Whether you found this site looking for a programming solution, an AI tutorial, a drone video, recovery advice, or simply stumbled across it by accident, I’m glad you’re here.',
        'I don’t claim to have all the answers. I’m just someone who enjoys building things, solving problems, and sharing what I learn along the way.',
        'If that sounds like something you’d enjoy following, welcome—you’ve found the right place.',
      ],
      bullets: [],
    },
  ],
  externalProfiles: [
    {
      label: 'YouTube',
      href: CREATOR_PROFILE_URLS.youtube,
    },
    {
      label: 'Instagram',
      href: CREATOR_PROFILE_URLS.instagram,
    },
    {
      label: 'GitHub',
      href: CREATOR_PROFILE_URLS.github,
    },
    {
      label: 'LinkedIn',
      href: CREATOR_PROFILE_URLS.linkedin,
    },
  ],
  healthDisclaimer: 'Anything health-related on this site is personal experience only and should not be taken as medical advice.',
};
