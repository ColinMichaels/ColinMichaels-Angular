# Link Building Outreach Operating Doc

Updated: August 15, 2026.

This document starts Month 3 execution for the 90-day SEO plan. It defines the linkable assets, prospect criteria, tracker format, outreach guardrails, and the first researched prospect seed list. Contact paths and final fit should be rechecked after deployment verifies the target URLs.

## Active Creator-Growth Campaign

The outreach focus now follows the public creator promise: unusual gadgets, useful technology, internet finds, and Captain Colin drone/FPV stories. The one-page **Drone Flight Field Notes** worksheet supports flight-practice audiences. The two-page **Personal Aircraft Buyer Verification** guide turns the strongest full-size-drone search opportunity into a practical offer, deposit, legal-category, support, and evidence organizer. The one-page **Gadget Usefulness Scorecard** gives **Is It Actually Useful?** a broader evidence-led resource for gadget, product-research, creator-tech, and practical-curiosity audiences. All are local release candidates with crawler-visible context; none is approved for outreach until its exact public landing and download URLs are verified.

Do not send a pitch until the exact release is deployed and the relevant landing page plus supporting PDF return `200` publicly. Recommend `/topics/drones-fpv` for general flight practice, `/resources/personal-aircraft-buyer-verification` for the buyer-verification use case, and `/resources/gadget-usefulness-scorecard` for evidence-led gadget evaluation. Direct PDFs are supporting downloads, not substitutes for the context, cautions, sources, and related stories on those pages.

| Priority | Lane             | Linkable Asset                       | Landing Page                                      | Supporting URL                                                      | Best-Fit Audience                                                                               | Readiness                   |
|----------|------------------|--------------------------------------|---------------------------------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|-----------------------------|
| 1        | Drones & FPV     | Drone Flight Field Notes             | `/topics/drones-fpv`                              | `/downloads/captain-colin-drone-flight-field-notes.pdf`             | FPV clubs, drone educators, field-practice guides, creator flight groups                        | Local release ready         |
| 2        | Drones & Gadgets | Personal Aircraft Buyer Verification | `/resources/personal-aircraft-buyer-verification` | `/downloads/captain-colin-personal-aircraft-buyer-verification.pdf` | experimental-aircraft communities, buyer guides, practical-tech editors                         | Local release ready         |
| 3        | Gadgets & Toys   | Gadget Usefulness Scorecard          | `/resources/gadget-usefulness-scorecard`          | `/downloads/captain-colin-gadget-usefulness-scorecard.pdf`          | gadget newsletters, product-research guides, creator-tech educators, practical-tech communities | Local release ready         |
| 4        | Gadgets & Toys   | Evidence-led unusual-gadget hub      | `/topics/gadgets-toys`                            | `/blog/they-bought-a-full-size-temu-mega-drone`                     | gadget newsletters, curiosity roundups, practical-tech communities                              | Live-page refresh pending   |
| 5        | Cross-channel    | Captain Colin flight stories         | `/topics/drones-fpv`                              | YouTube companion links selected per published article              | drone-video roundups, Florida creator communities, FPV viewers                                  | Pairing is article-specific |

### Active Prospect Targets

- Maintain the validated `25`-page Drones & FPV cohort, one relevant target page per row.
- Maintain the validated `25`-page gadget and creator-tech cohort; prepare its ready rows only after the approved flagship article and scorecard are public.
- Treat the buyer guide and worksheet as a supporting authority asset until experimental-aircraft and consumer-aviation target pages are live-verified; do not turn them into a purchase recommendation or imply legal classification expertise.
- Position the gadget scorecard as a transparent conversation and editorial framework, not an objective lab score, certification, endorsement, or automatic buying recommendation.
- Prefer pages that already help beginners prepare, document, or learn from flights; local clubs and small editorial communities can be a better fit than high-volume directories.
- Record the exact page, its audience, why the worksheet helps, the current contact route, and the date the landing page and supporting PDF were verified live.
- Pause broad AI, recovery, Angular/Firebase, and labs outreach unless a substantial audience-specific artifact makes one of those older lanes timely again.

## Legacy Asset Inventory

The four original topic assets and their researched seed prospects are retained below as historical research. They are not the active campaign because they no longer match the site's sharper gadgets/FPV creator promise closely enough to justify immediate outreach.

| Pillar            | Asset                                     | URL                                     | Primary Audience                                                                         |
|-------------------|-------------------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------|
| AI setup          | AI Setup Checklist                        | `/topics/ai-setup`                      | newsletters, creator workflows, productivity communities, AI setup guides                |
| Recovery planning | Recovery And Emergency Planning Checklist | `/topics/recovery-planning`             | patient resources, caregiver resources, recovery communities, personal planning sites    |
| Angular/Firebase  | Angular And Firebase Architecture Note    | `/topics/angular-firebase-architecture` | frontend newsletters, Angular/Firebase communities, indie web builders, project writeups |
| Labs/projects     | Labs And Demo Showcase Checklist          | `/topics/labs-projects`                 | dev showcases, creative coding communities, personal site directories, project roundups  |

## Qualification Rules

- Prioritize editorial inclusion where the resource helps the target audience.
- Exclude paid link placements, link exchanges, automated posting, low-quality directories, and unrelated forums.
- Do not request exact-match anchor text.
- Any sponsored placement must use `rel="sponsored"` or `nofollow`.
- Prefer pages that already curate helpful external resources, tutorials, checklists, project writeups, or recovery/patient support resources.
- Record why the asset is relevant before sending a pitch.

## Legacy Prospect Targets

Original target volume for Week 10:

- AI setup: 25-40 qualified prospects.
- Recovery planning: 25-40 qualified prospects.
- Angular/Firebase: 25-40 qualified prospects.
- Labs/projects: 25-40 qualified prospects.

Prospect sources to research:

- newsletters and weekly roundups
- resource pages and curated lists
- community roundups
- patient/caregiver organizations and resource pages
- developer showcases
- GitHub project/resource pages
- personal-site and indie-web communities

## Prospect Tracker

Use this table as the working tracker. Add one row per target page, not just per domain.

| Lane           | Prospect Name | Exact Target URL | Contact Path | Audience-Fit Reason | Landing Page           | Live Verified | Status      | Last Contact | Notes |
|----------------|---------------|------------------|--------------|---------------------|------------------------|---------------|-------------|--------------|-------|
| Drones & FPV   |               |                  |              |                     | `/topics/drones-fpv`   | No            | Researching |              |       |
| Gadgets & Toys |               |                  |              |                     | `/topics/gadgets-toys` | No            | Researching |              |       |

## First Drone And FPV Cohort

Research captured: August 15, 2026. These are exact live pages, not domain-only ideas. They remain research records until the local worksheet release is deployed, its public landing page and PDF both return `200`, Colin reviews the relationship angle, and the contact/submission path is rechecked at action time. No message has been drafted in an external system or sent.

The first research cohort now contains **25 exact target pages**. The machine-readable source of truth is [`AUDITS/2026-08-15/DRONE-FPV-PROSPECTS.json`](./AUDITS/2026-08-15/DRONE-FPV-PROSPECTS.json), validated by `npm run test:outreach-prospects`.

- **10 ready after live verification:** six previously qualified pages plus Safety Third Racing, Flite Test, Fly Tribe Magazine, and UAS Weekly.
- **5 relationship or rights decisions:** Tampa Bay Drone Club, Model Aviation, RChobby Lab, FAU's STEM Drone Club, and Infinity Aero Club.
- **10 hold or recheck:** missing editorial routes, support-only channels, stale program evidence, a not-yet-earned authority threshold, or audience/paid-placement mismatch.
- **0 contacted:** no pitch, form, email, forum post, comment, account creation, or external draft was sent or created.

This is a qualified **research cohort**, not a claim that all 25 are immediately pitchable. Only the 10 ready rows can enter message preparation after the production gate below. A relationship or rights decision must be affirmative and specific; a hold remains a hold until its blocker is removed with fresh evidence.

### Tier A: Direct Editorial Or Resource Submission

| Priority | Prospect              | Exact Target Page                               | Verified Path                                                    | Why The Worksheet Fits                                                                                                                                                                                                   | Suggested First Ask                                                                                                                                                    | Status                        |
|----------|-----------------------|-------------------------------------------------|------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|
| 1        | FPV Freedom Coalition | `https://fpvfc.org/checklists`                  | `https://fpvfc.org/contact-us`                                   | The page already curates printable FPV preparation, racing, group, travel, and frequency resources. Colin's sheet adds a purpose, shot-plan, exit-plan, and debrief loop rather than replacing their preflight material. | Ask whether a complementary creator field/debrief sheet is useful to their education collection; invite factual feedback and accept a no-link answer.                  | Ready after live verification |
| 2        | GetFPV Learn          | `https://www.getfpv.com/learn/submit-content/`  | The same page links explicit article and video submission forms. | GetFPV explicitly accepts community FPV articles/videos, and its existing checklist article establishes audience fit.                                                                                                    | Pitch a short original field-notes article with the printable as the companion resource; follow its compensation and editorial terms instead of requesting a backlink. | Ready after live verification |
| 3        | Oscar Liang           | `https://oscarliang.com/become-a-guest-writer/` | On-page guest-writer contact form.                               | The page explicitly accepts FPV tutorials, practical tips, and projects from hobbyists.                                                                                                                                  | Propose a concise post-flight debrief workflow and disclose Colin's experience, aircraft, and evidence exactly as the form requests.                                   | Ready after live verification |

### Tier B: Community And Training Relationships

| Priority | Prospect                        | Exact Target Page                                                   | Verified Path                                                                                       | Why The Worksheet Fits                                                                                                      | Suggested First Ask                                                                                                                             | Status                                 |
|----------|---------------------------------|---------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------|
| 4        | PSL RC Hobby Group              | `https://pslrchobbygroup.com/groups/fpv-multirotor`                 | `https://pslrchobbygroup.com/contact`                                                               | The Port St. Lucie club has a dedicated beginner-to-advanced FPV area plus an existing Downloads & Resources section.       | Offer the printable to the multirotor lead for member/training feedback; ask about usefulness before asking for any resource-page inclusion.    | Ready after live verification          |
| 5        | Drone Flyers Club, The Villages | `https://droneflyersthevillagesfl.com/`                             | `https://droneflyersthevillagesfl.com/contact/` mentor form.                                        | The Florida club runs a monthly training meeting and already publishes a before-arrival preparation list.                   | Ask whether the field sheet would help a training meeting; invite instructors to mark missing or misleading fields.                             | Ready after live verification          |
| 6        | Florida Tech Drone Club         | `https://floridatech.campuslabs.com/engage/organization/drone-club` | Public club contact on the same Engage page.                                                        | The club has FPV, photography, and engineering branches, weekly workshops, flight outings, and community education.         | Offer a student-friendly copy for a workshop test and request practical feedback, not promotion.                                                | Ready after live verification          |
| 7        | Tampa Bay Drone Club            | `https://www.tampabaydroneclub.com/join/sponsor`                    | On-page organization/partnership form; the same site exposes member resources and a support center. | The club runs FPV racing, freestyle, night racing, open-fly events, and a member-resources area.                            | Use only if Colin wants a genuine local collaboration or event-resource relationship; lead with usefulness to pilots, not sponsorship or links. | Colin relationship decision required   |
| 8        | Drone Talk                      | `https://www.dronetalk.org/`                                        | Public Contact Us path plus member articles/blogs after its guidelines are reviewed.                | The community explicitly serves beginner pilots and FPV racers and maintains beginner, flight, regulation, and club guides. | Ask staff which editorial/community surface accepts a free field worksheet; do not drop it into a forum without context.                        | Recheck contact route after deployment |

### Tier C: Recheck Before Qualification

| Prospect             | Exact Target Page                                                                     | What Is Promising                                                                                               | Why It Is Not Ready                                                                                                                   |
|----------------------|---------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| WikiFPV              | `https://wikifpv.com/`                                                                | The site advertises a Submit Content path for new material and suggested improvements.                          | The live page timed out during direct verification, so the submission UI and ownership/contact path must be confirmed again.          |
| FPV Recycling        | `https://www.fpvrecycling.com/guides/getting-started/first-fpv-drone-beginners-guide` | Its current beginner guide covers simulators, gear, where to fly, TRUST, registration, and local-club practice. | A general contact path exists, but no editorial/resource submission policy was verified.                                              |
| MultiGP              | `https://www.multigp.com/contact-us/`                                                 | Large FPV racing/chapter network with community and STEM reach.                                                 | The verified path is a general support ticket, not a resource or editorial submission route; identify a relevant program owner first. |
| Rotor Riot           | `https://rotorriot.com/pages/learn-to-fly-drones`                                     | Strong beginner-learning audience and an existing downloads area.                                               | The only verified contact is customer support for orders and technical problems. Do not use that channel for outreach.                |
| Markham Park RC Club | `https://markhamrcc.com/`                                                             | South Florida club with free flight training and a public contact route.                                        | The current page does not establish a drone/FPV resource section, so audience fit needs direct confirmation before pitching.          |

### Cohort Expansion: Exact Pages 14-25

The following pages expand the initial 13-page seed into the validated 25-page cohort. Their ordering does not override the release gate or the statuses recorded in the machine-readable tracker.

#### Ready After Live Verification

| Priority | Prospect            | Exact Target Page                                                | Verified Path                                                                                     | Why The Worksheet Fits                                                                                                  | Suggested First Ask                                                                                            |
|----------|---------------------|------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| 14       | Safety Third Racing | `https://sites.google.com/view/safetythirdracing/home`           | The page invites email contact and links its FPV wiki, academy, and regional Meetup.              | The AMA-chartered club welcomes beginners through veterans and maintains build, flight, event, and reference resources. | Invite a coach or maintainer to test the sheet and say whether it complements the wiki or academy.             |
| 15       | Flite Test          | `https://www.flitetest.com/articles/get-your-articles-published` | Member article submission flow after login; current site still exposes Articles and registration. | Its guidelines ask for complete, repeatable educational articles and explicitly reject video-only FPV showcases.        | Submit a reproducible field-notes/debrief method with real examples, stills, and the printable as a companion. |
| 16       | Fly Tribe Magazine  | `https://www.flytribemagazine.com/submission`                    | On-page article instructions and `content@flytribemagazine.com`.                                  | The pilot-made magazine explicitly requests FPV stories, community coverage, original photos, and articles.             | Pitch a first-person Florida flight-practice story whose practical takeaway is the field-notes loop.           |
| 17       | UAS Weekly          | `https://uasweekly.com/writeforus/`                              | On-page pitch form with title, teaser/full text, author bio, headshot, and social links.          | It accepts original UAS, aerial-video, photography, and drone-racing contributions.                                     | Pitch a new field-practice and post-flight learning article; do not ask to republish the owned site article.   |

#### Relationship Or Rights Decision Required

| Priority | Prospect                          | Exact Target Page                                                                                        | Decision Before Contact                                                                        | Why It Is Not Action-Ready                                                                                                                                                                   |
|----------|-----------------------------------|----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 18       | Model Aviation                    | `https://www.modelaviation.com/basic-page/author-guidelines`                                             | Decide whether a distinct paid first-person article and its rights assignment are acceptable.  | The official AMA publication is relevant and current, but its page states that accepted paid work is assigned to Model Aviation and some submission mechanics are dated.                     |
| 19       | RChobby Lab                       | `https://rchobbylab.com/write-for-us/`                                                                   | Decide whether Colin wants a recurring paid contributor role separate from his owned campaign. | The role expects three articles per month and exclusive ownership of submitted writing and media; direct rendering also failed during verification, so this is not a one-off resource pitch. |
| 20       | FAU STEM Education Lab Drone Club | `https://www.fau.edu/education/academicdepartments/curriculum-instruction/resources/stemlab/drone-club/` | Choose whether to build a real education-feedback relationship with the named faculty sponsor. | The club has unusually strong resource fit, but it is specifically for College of Education students and should not receive a generic promotion request.                                     |
| 21       | Infinity Aero Club Tampa Bay      | `https://infinityaeroclub.org/`                                                                          | Choose whether Colin can support an ongoing local youth/community-education relationship.      | The nonprofit runs weekly drone and aviation training for youth and adults; the appropriate opening is instructor feedback and service, not a link request.                                  |

#### Added Holds

| Priority | Prospect                                    | Exact Target Page                                    | Why It Stays On Hold                                                                                                                                                                                      |
|----------|---------------------------------------------|------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 22       | DRONELIFE                                   | `https://dronelife.com/want-to-write-for-dronelife/` | It explicitly requires established authority. Revisit only after Colin has a public series of original flight debriefs; direct page rendering also failed during verification.                            |
| 23       | Fastech Club Drone Pilot Program            | `https://fastechclub.com/drone-pilot/`               | The live page still says **Coming Spring 2022** and contains dated claims, so current program operation must be confirmed first.                                                                          |
| 24       | Unified Scholastic Drone Racing Association | `https://www.usdra.io/`                              | The audience fit is real, but the visible route is league and paid-program support rather than independent curriculum/resource submissions.                                                               |
| 25       | Women Who Drone                             | `https://www.womenwhodrone.co/writeforus`            | The current asset is not specifically built for the publication's mission, and the page mixes contributor opportunities with paid guest-post and promotion routes. Do not force the fit or buy placement. |

## First Gadget And Creator-Tech Cohort

Research captured: August 15, 2026. The machine-readable source of truth is [`AUDITS/2026-08-15/GADGET-CREATOR-PROSPECTS.json`](./AUDITS/2026-08-15/GADGET-CREATOR-PROSPECTS.json), validated with the FPV cohort by `npm run test:outreach-prospects`.

- **8 ready after live verification:** current editorial or contributor routes whose audience can plausibly use an evidence-led gadget, camera, filmmaking, or regional creator story.
- **7 relationship or evidence decisions:** routes that require an original hack, long-term product use, a real workshop, a speaking or exhibit commitment, or deeper independent reporting.
- **10 hold or recheck:** wrong-audience, missing-evidence, closed-contributor, self-publishing, commercial-listing, and paid-placement routes.
- **0 contacted:** no pitch, form, email, comment, account, external draft, or event application was sent or created.

Only the eight rows below can enter message preparation after the public guide and PDF both return `200`, rights and relationships are disclosed, and the current contact path is rechecked on outreach day.

| Priority | Prospect                             | Exact Target Page                                                      | Audience-Led First Angle                                                                    |
|----------|--------------------------------------|------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| 1        | Make: article proposals              | `https://make.co/submit-an-article-or-book-idea/`                      | A visual, functional skill-builder using one documented gadget evaluation.                  |
| 2        | Core77 website submissions           | `https://www.core77.com/contact`                                       | A product-evaluation framework offered for design-minded editorial critique.                |
| 3        | PetaPixel story pitches              | `https://petapixel.com/contact/`                                       | A rights-cleared camera or FPV field-test story that separates evidence from unknowns.      |
| 4        | Fstoppers article suggestions        | `https://fstoppers.com/contact`                                        | A technique-led camera field-session article whose value stands without promotion.          |
| 5        | DIY Photography guest posts          | `https://www.diyphotography.net/write-for-diyp/`                       | An original image-led field test that distinguishes a first flight from a final review.     |
| 6        | Laptop Mag freelance pitches         | `https://www.laptopmag.com/news/how-to-pitch-your-ideas-to-laptop-mag` | A reported consumer-tech angle about the evidence buyers should demand after a gadget demo. |
| 7        | No Film School pitches               | `https://nofilmschool.com/pitch-to-no-film-school`                     | A first-person production-gear lesson grounded in an actual filmmaking session.             |
| 8        | South Florida Venture Tech Chronicle | `https://www.vtchronicle.com/about`                                    | A regional creator-tech case study about transparent evaluation and measurement.            |

The seven decision-gated rows are Hackaday, Cool Tools, Tampa Hackerspace, Tampa Devs, TechFlo, Maker Faire Orlando, and Popular Mechanics. Their blockers are substantive: Colin must have the required artifact or experience and must affirm the time, reporting, speaking, teaching, or exhibit commitment before any submission.

The ten holds include three deliberate negative controls. Instructables and Hackster are owned self-publication rather than independently earned authority; Gadget Flow is a product-listing route that does not fit a scorecard; ArabTechGate advertises paid dofollow placement. These routes stay on hold and do not count as backlinks, editorial validation, or creator trust.

### Two Allowed Pitch Angles

Community/training note:

> I made a one-page field sheet for planning one flight goal, recording the setup, protecting the return, and writing down one lesson before the next pack. Your group already helps pilots learn in the field, so I would value a trainer's honest feedback. If it is useful, you are welcome to share the public link; if not, the corrections are still helpful.

Editorial submission note:

> I would like to propose an original field-notes article for your FPV audience: a repeatable purpose, place, setup, exit, and debrief loop, with a printable companion sheet and links to current official FAA guidance. I can adapt it to your editorial requirements and will disclose my actual experience and evidence. I am not asking for specific anchor text or guaranteed placement.

Do not send either template unchanged. Add one sentence proving familiarity with the exact target page and remove any claim Colin cannot support from first-hand experience.

## Legacy Researched Seed Prospects

This July research is preserved for possible later requalification. These prospects remain `Researching`; none should be contacted from this list until the asset is substantial, the target URL is live, the audience fit is current, and the contact path is reconfirmed.

### AI Setup

| Prospect Name                | Target URL                               | Contact Path                                  | Fit Reason                                                                                      | Asset URL          | Status      | Notes                                                                                             |
|------------------------------|------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------|--------------------|-------------|---------------------------------------------------------------------------------------------------|
| The Rundown AI               | `https://www.therundown.ai/`             | Newsletter/site contact or editor/social path | Publishes AI guides, tools, and practical application content for a broad AI-workflow audience. | `/topics/ai-setup` | Researching | Pitch only if checklist is live and positioned as a practical setup resource, not a tool listing. |
| The Neuron                   | `https://www.theneuron.ai/`              | Site/social/editorial path                    | Covers AI tools, tutorials, and explainer content for professionals trying to apply AI at work. | `/topics/ai-setup` | Researching | Good fit for practical setup guidance and verification habits.                                    |
| Ben's Bites                  | `https://www.bensbites.com/`             | Substack/profile path                         | AI builder newsletter with startup, tool, and workflow audience.                                | `/topics/ai-setup` | Researching | Personalize around builder setup and reusable instructions.                                       |
| Superhuman AI                | `https://www.superhuman.ai/`             | Newsletter/contact path                       | Large AI newsletter focused on practical AI news, tools, and career workflows.                  | `/topics/ai-setup` | Researching | Strong audience fit, likely high competition.                                                     |
| Future Tools                 | `https://futuretools.io/`                | Submit/contact path                           | AI tool and AI news directory with an existing submit flow.                                     | `/topics/ai-setup` | Researching | May be tool-first; use only if guide/resource submissions are acceptable.                         |
| Futurepedia                  | `https://www.futurepedia.io/`            | Site/resource/contact path                    | AI tools plus resources, tutorials, and automation learning content.                            | `/topics/ai-setup` | Researching | Better fit for resource/tutorial sections than tool database.                                     |
| The Batch by DeepLearning.AI | `https://www.deeplearning.ai/the-batch/` | Editorial/newsletter contact path             | AI newsletter with educational readership and practical AI adoption interest.                   | `/topics/ai-setup` | Researching | High bar; use only with a very specific setup/use-case angle.                                     |
| Practical AI Podcast         | `https://changelog.com/practicalai`      | Changelog contact/community path              | Practical AI audience interested in applied workflows and responsible use.                      | `/topics/ai-setup` | Researching | Could be better as a community/resource share than direct editorial pitch.                        |
| AI Tool Report               | `https://www.aitoolreport.com/`          | Newsletter/contact path                       | AI tools and workflow newsletter audience.                                                      | `/topics/ai-setup` | Researching | Confirm editorial/contact route before pitching.                                                  |
| AI Tidbits                   | `https://www.aitidbits.ai/`              | Substack/profile path                         | AI newsletter audience interested in concise practical AI ideas.                                | `/topics/ai-setup` | Researching | Keep pitch brief and checklist-oriented.                                                          |
| Every: Chain of Thought      | `https://every.to/chain-of-thought`      | Publication/contact path                      | AI/productivity/business audience that may value setup and verification workflows.              | `/topics/ai-setup` | Researching | Editorial threshold is high; pitch only if asset is expanded with examples.                       |
| There's An AI For That       | `https://theresanaiforthat.com/`         | Site submit/contact path                      | AI discovery audience may value a setup checklist alongside tool selection.                     | `/topics/ai-setup` | Researching | Likely tool-directory fit only; verify before outreach.                                           |

### Recovery Planning

| Prospect Name                                   | Target URL                                                                                                    | Contact Path                    | Fit Reason                                                                                  | Asset URL                   | Status      | Notes                                                                     |
|-------------------------------------------------|---------------------------------------------------------------------------------------------------------------|---------------------------------|---------------------------------------------------------------------------------------------|-----------------------------|-------------|---------------------------------------------------------------------------|
| American Heart Association Support And Services | `https://www.heart.org/en/health-topics/consumer-healthcare/doctor-appointments-questions-to-ask-your-doctor` | Contact/media/community path    | Strong topical overlap around appointment preparation and trusted medical-resource framing. | `/topics/recovery-planning` | Researching | Pitch cautiously as patient organization aid, not medical advice.         |
| Mended Hearts                                   | `https://mendedhearts.org/`                                                                                   | Contact/chapter/community path  | Heart patient and family support organization; strong relevance for recovery planning.      | `/topics/recovery-planning` | Researching | Good fit if framed as personal checklist and patient story resource.      |
| HeartValveSurgery.com                           | `https://www.heart-valve-surgery.com/`                                                                        | Community/contact path          | Heart valve surgery patient community with educational and patient-story context.           | `/topics/recovery-planning` | Researching | Excellent topical fit; avoid clinical claims.                             |
| Family Caregiver Alliance                       | `https://www.caregiver.org/`                                                                                  | Contact/resource path           | National caregiver resource organization with practical caregiver planning audience.        | `/topics/recovery-planning` | Researching | Emphasize organization, questions, and caregiver support.                 |
| Caregiver Action Network                        | `https://www.caregiveraction.org/`                                                                            | Contact/resource path           | Caregiver education and support audience fits emergency/contact/medication organization.    | `/topics/recovery-planning` | Researching | Confirm whether external personal resources are accepted.                 |
| Patient Advocate Foundation                     | `https://www.patientadvocate.org/`                                                                            | Contact/resource directory path | Patient navigation, insurance, and financial/resource support audience.                     | `/topics/recovery-planning` | Researching | Fit around insurance and paperwork organization.                          |
| PAN Foundation                                  | `https://www.panfoundation.org/`                                                                              | Contact/community path          | Patient access and treatment-cost support organization with education initiatives.          | `/topics/recovery-planning` | Researching | Pitch only if resource pages accept patient-perspective planning content. |
| CaringBridge Resources                          | `https://www.caringbridge.org/resources/`                                                                     | Contact/editorial path          | Recovery storytelling and caregiver coordination audience.                                  | `/topics/recovery-planning` | Researching | Good fit for patient/family organization and communication angle.         |
| AARP Caregiving                                 | `https://www.aarp.org/caregiving/`                                                                            | Editorial/contact path          | Broad caregiver audience with practical planning needs.                                     | `/topics/recovery-planning` | Researching | High bar; pitch only after asset is polished and live.                    |
| National Council on Aging                       | `https://www.ncoa.org/`                                                                                       | Resource/contact path           | Older adult and caregiver resource audience; may fit planning and benefits navigation.      | `/topics/recovery-planning` | Researching | Use only where recovery planning/resource roundups are relevant.          |
| MyHeart                                         | `https://myheart.net/`                                                                                        | Contact/editorial path          | Cardiology education site; patient recovery planning may fit as personal support resource.  | `/topics/recovery-planning` | Researching | Must be clear it is not clinical advice.                                  |
| Patient Empowerment Network                     | `https://powerfulpatients.org/`                                                                               | Contact/resource path           | Patient education and empowerment audience with planning and care-team communication fit.   | `/topics/recovery-planning` | Researching | Verify fit beyond oncology-heavy content.                                 |

### Angular/Firebase

| Prospect Name               | Target URL                                             | Contact Path               | Fit Reason                                                                                                        | Asset URL                               | Status      | Notes                                                                  |
|-----------------------------|--------------------------------------------------------|----------------------------|-------------------------------------------------------------------------------------------------------------------|-----------------------------------------|-------------|------------------------------------------------------------------------|
| Awesome Angular             | `https://github.com/PatrickJS/awesome-angular`         | GitHub PR                  | Curated Angular resource list; architecture/SEO/Firebase note may fit advanced topics or deployment/SEO sections. | `/topics/angular-firebase-architecture` | Researching | Contribute only if asset is substantial and matches repo guidelines.   |
| Awesome Firebase            | `https://github.com/jthegedus/awesome-firebase`        | GitHub PR                  | Curated Firebase talks/tools/articles list; Firebase Functions SEO architecture may fit articles/examples.        | `/topics/angular-firebase-architecture` | Researching | Good fit after live URL and docs are stable.                           |
| JavaScript Weekly           | `https://javascriptweekly.com/`                        | Newsletter/editorial path  | JavaScript newsletter covers articles, news, and projects.                                                        | `/topics/angular-firebase-architecture` | Researching | Pitch only if the architecture note is expanded with concrete lessons. |
| Frontend Focus              | `https://frontendfoc.us/`                              | Newsletter/editorial path  | Front-end newsletter with browser, CSS, JavaScript, and web-build content.                                        | `/topics/angular-firebase-architecture` | Researching | Fit around crawlable Angular/Firebase route rendering.                 |
| This Week In React          | `https://thisweekinreact.com/`                         | Newsletter/community path  | Not Angular-specific, but front-end architecture and deployment lessons may fit broader web tooling.              | `/topics/angular-firebase-architecture` | Researching | Lower priority due React focus.                                        |
| Angular Weekly              | `https://www.angularweekly.com/`                       | Newsletter/contact path    | Angular-specific newsletter audience.                                                                             | `/topics/angular-firebase-architecture` | Researching | Verify site/contact path before pitching.                              |
| This Week in Angular        | `https://www.thisweekinangular.com/`                   | Newsletter/contact path    | Angular community roundup audience.                                                                               | `/topics/angular-firebase-architecture` | Researching | Strong fit if active and accepting submissions.                        |
| ng-conf                     | `https://www.ng-conf.org/`                             | Community/contact path     | Angular conference/community audience.                                                                            | `/topics/angular-firebase-architecture` | Researching | Better as community/share target than link request.                    |
| Angular Addicts Podcast     | `https://www.angularaddicts.com/`                      | Podcast/contact path       | Angular practitioner audience for architecture and Firebase deployment notes.                                     | `/topics/angular-firebase-architecture` | Researching | Could pitch as topic/resource, not backlink ask.                       |
| Firebase Blog/Community     | `https://firebase.blog/`                               | Community/social path      | Firebase audience; direct editorial inclusion may be unlikely.                                                    | `/topics/angular-firebase-architecture` | Researching | Use only with a polished case-study angle.                             |
| DZone Web Development       | `https://dzone.com/web-development`                    | Contributor/editorial path | Developer resource site that accepts technical articles and architecture notes.                                   | `/topics/angular-firebase-architecture` | Researching | Consider syndicating an expanded architecture article.                 |
| Smashing Magazine Front-End | `https://www.smashingmagazine.com/category/front-end/` | Editorial/contact path     | High-quality front-end publication; route SEO/crawler fallback lessons could become a full article.               | `/topics/angular-firebase-architecture` | Researching | High bar; needs long-form article, not just hub link.                  |

### Labs And Projects

| Prospect Name           | Target URL                                           | Contact Path                | Fit Reason                                                                         | Asset URL               | Status      | Notes                                                               |
|-------------------------|------------------------------------------------------|-----------------------------|------------------------------------------------------------------------------------|-------------------------|-------------|---------------------------------------------------------------------|
| Codrops Creative Hub    | `https://tympanus.net/codrops/`                      | Get in touch/editorial path | Curated creative web demos, tutorials, case studies, and showcases.                | `/topics/labs-projects` | Researching | Strong fit once demos/screenshots are polished.                     |
| Sidebar                 | `https://sidebar.io/`                                | Submit a Link               | Daily curated design/programming/resource links with visible submit path.          | `/topics/labs-projects` | Researching | Good fit for a polished project/demo showcase or architecture note. |
| Hackaday Submit A Tip   | `https://hackaday.com/submit-a-tip/`                 | Submit tip form             | Hardware/software hacker audience; best for distinctive demos or technical builds. | `/topics/labs-projects` | Researching | Use only for genuinely interesting build stories.                   |
| Product Hunt            | `https://www.producthunt.com/`                       | Launch/product submission   | Product/demo discovery audience.                                                   | `/topics/labs-projects` | Researching | Best for a packaged tool, not a generic hub.                        |
| Hacker News Show HN     | `https://news.ycombinator.com/showhn.html`           | Show HN submission          | Developer audience for demos, tools, and experiments.                              | `/topics/labs-projects` | Researching | Use only when a demo is stable and self-explanatory.                |
| Designer News           | `https://www.designernews.co/`                       | Community submission        | Design/developer community may fit creative labs and UI experiments.               | `/topics/labs-projects` | Researching | Check activity/fit before posting.                                  |
| Siteinspire             | `https://www.siteinspire.com/`                       | Submit/contact path         | Curated web design inspiration.                                                    | `/topics/labs-projects` | Researching | Only if visual design quality is high enough.                       |
| Godly                   | `https://godly.website/`                             | Submit/contact path         | Curated modern website inspiration.                                                | `/topics/labs-projects` | Researching | Verify whether submissions are editorial and unpaid.                |
| One Page Love           | `https://onepagelove.com/`                           | Submit/contact path         | One-page website and landing page showcase.                                        | `/topics/labs-projects` | Researching | Fit depends on a strong standalone demo page.                       |
| Awesome Creative Coding | `https://github.com/terkelg/awesome-creative-coding` | GitHub PR                   | Curated creative coding resources and demos.                                       | `/topics/labs-projects` | Researching | Good fit if labs include creative coding examples.                  |
| Awesome WebGL           | `https://github.com/sjfricke/awesome-webgl`          | GitHub PR                   | Curated WebGL resources; only fit for 3D/WebGL demos.                              | `/topics/labs-projects` | Researching | Use if labs include relevant WebGL/3D work.                         |
| Made With Firebase      | `https://madewithfirebase.com/`                      | Submit/contact path         | Firebase project showcase.                                                         | `/topics/labs-projects` | Researching | Good fit for Firebase-backed public site/lab story if active.       |

Status values:

- Researching
- Qualified
- Pitched
- Followed up
- Included
- Declined
- No fit

## Outreach Templates

Use these as starting points only. Personalize the first sentence and the fit reason.

### Resource Page Pitch

Subject: Resource suggestion for [page/topic]

Hi [name],

I found your [resource page] while looking for practical [topic] references. I put together a concise [asset name] here:

`https://colinmichaels.com/topics/[slug]`

It is built for [specific audience] and covers [one concrete benefit]. If you think it would help readers on [target page], you are welcome to include it.

Either way, thanks for maintaining the resource.

Colin

### Newsletter Or Roundup Pitch

Subject: Possible fit for [newsletter/roundup]

Hi [name],

I like how [newsletter/roundup] highlights [specific type of resource]. I recently published [asset name], a short practical checklist for [audience/outcome]:

`https://colinmichaels.com/topics/[slug]`

It may fit a future issue if you collect resources around [specific topic]. No pressure if it is not a match.

Thanks,
Colin

### Community Or Project Pitch

Subject: Checklist/resource for [community/project]

Hi [name],

I saw [specific context] and thought this might be useful for people working on [problem]. I created [asset name] as a practical reference:

`https://colinmichaels.com/topics/[slug]`

The most relevant part for your audience is [specific item]. If it helps, feel free to share or add it where resources are collected.

Best,
Colin

## September Execution Schedule

- Week 9: Confirm assets are live and internally linked.
- Week 10: Fill the prospect tracker with qualified targets and remove poor-fit entries.
- Week 11: Send the first personalized pitches to the strongest fits.
- Week 12: Review responses, Search Console impressions, indexed pages, CTR, and internal-link opportunities.

## Measurement And Release Gate

Do not begin outreach until one release record confirms all of the following on production:

- `/topics/drones-fpv` returns `200` and visibly links the worksheet plus the cited FAA resources in both initial crawler HTML and the hydrated page.
- `/downloads/captain-colin-drone-flight-field-notes.pdf` returns `200` with a PDF content type and opens as the reviewed one-page artifact.
- `/resources/personal-aircraft-buyer-verification` returns `200` with matching canonical, heading, cautions, official starting points, related paths, and downloadable two-page PDF in both initial crawler HTML and the hydrated page.
- `/downloads/captain-colin-personal-aircraft-buyer-verification.pdf` returns `200` with a PDF content type and opens as the reviewed two-page artifact.
- `/resources/gadget-usefulness-scorecard` returns `200` with matching canonical, heading, evidence labels, five scoring criteria, cautions, related paths, and downloadable one-page PDF in both initial crawler HTML and the hydrated page.
- `/downloads/captain-colin-gadget-usefulness-scorecard.pdf` returns `200` with a PDF content type and opens as the reviewed one-page artifact.
- The exact deployment date, landing-page URLs, PDF URLs, and verification evidence are recorded in the tracker.
- Every Tier A or Tier B contact path is rechecked on the day a personalized message is prepared.

After explicit authorization to contact anyone, record only actions that actually happened:

- personalized messages sent, their exact target pages, and the relationship or editorial angle used
- substantive replies and useful corrections, including replies that decline a link
- accepted contributor articles, approved resource inclusions, and the final live referring pages
- self-posts in forums or social feeds separately; do not count them as earned referring-domain wins

At the first 30-day review, record observed counts rather than promised growth:

- Search Console impressions, clicks, queries, and indexing status for the Drones & FPV hub and buyer-verification guide
- download events only if production analytics has a verified worksheet-download event; otherwise mark download measurement unavailable
- new referring pages verified directly or through an available backlink provider, with the source and check date
- internal links added from relevant published articles, the homepage, topic hubs, or related-page surfaces

Treat the first three carefully personalized sends as an early learning cohort. One substantive response is useful evidence, not a guaranteed target. One earned editorial inclusion or accepted original article is more valuable than multiple low-context directory links.
