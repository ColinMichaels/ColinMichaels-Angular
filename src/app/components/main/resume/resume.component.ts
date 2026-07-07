import {Component} from '@angular/core';
import {ContactSectionComponent} from './resume-section/contact-section.component';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAngular, faBitbucket, faCss3, faGithub} from '@fortawesome/free-brands-svg-icons';
import {faAward, faBriefcase, faCheckDouble, faContactCard, faSchool} from '@fortawesome/free-solid-svg-icons';
import {SectionHeaderComponent} from './resume-section/section-header.component';

@Component({
  selector: 'app-resume',
  imports: [
    ContactSectionComponent,
    FaIconComponent,
    SectionHeaderComponent
  ],
  standalone: true,
  template: `
    <section class="mx-auto flex flex-col  text-white/90">

      <!-- Experience Card -->
      <div class="resume-section">

        <app-section-header
          sectionTitle="Experience" [icon]="faBriefcase"/>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 text-base">
          <div class="resume-experience">
            <h3 class="font-bold">WordPress Administrator – Atria Wealth Solutions</h3>
            <p class="r-loc-date">Remote | Mar 2021 – Jan 2022</p>
            <ul>
              <li>Managed 150+ financial websites.</li>
              <li>Built and maintained custom plugins and themes.</li>
            </ul>
          </div>
          <div class="resume-experience">
            <h3 class="font-bold">UI/UX Developer – NextEra Energy</h3>
            <p class="r-loc-date">Juno Beach, FL | Jan 2020 – Feb 2021</p>
            <ul>
              <li>Angular apps with Material Design integration.</li>
              <li>Prototyping with UXPin, Sketch; WordPress showcase site.</li>
            </ul>
          </div>
          <div class="resume-experience">
            <h3 class="font-bold">Application Developer – The Learning Experience</h3>
            <p class="r-loc-date">Deerfield Beach, FL | Jun 2019 – Dec 2019</p>
            <ul>
              <li>Laravel app for registration. Bootstrap and jQuery for UI.</li>
            </ul>
          </div>
          <div class="resume-experience">
            <h3 class="font-bold">Lead Developer – OGK Creative</h3>
            <p class="r-loc-date">Delray Beach, FL | Oct 2017 – Jun 2019</p>
            <ul>
              <li>Managed digital team. VueJS, Bootstrap, SCSS used for frontend builds.</li>
            </ul>
          </div>
          <div class="resume-experience">
            <h3 class="font-bold">Sr. Application Developer – ION Media Networks</h3>
            <p class="r-loc-date">West Palm Beach, FL | Jan 2016 – Oct 2017</p>
            <ul>
              <li>Built Laravel apps, managed web infrastructure.</li>
            </ul>
          </div>
          <div class="resume-experience">
            <h3 class="font-bold">Application Developer – 15th Judicial Circuit</h3>
            <p class="r-loc-date">West Palm Beach, FL | Jan 2015 – Jan 2016</p>
            <ul>
              <li>Developed court apps with PHP, Bootstrap, MySQL.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Education Card -->
      <div class="resume-section">
        <app-section-header
          sectionTitle="Education" [icon]="faSchool"/>

        <div class="resume-experience">

          <div class="flex flex-col justify-center items-center">

            <div>
              <h3 class="font-bold">Indian River State College</h3>
              <p class="r-loc-date"> AS – Computer Info Tech (2010–2012)</p>
            </div>

            <div>
              <h3 class="font-bold">Full Sail University</h3>
              <p class="r-loc-date"> AS – Recording Arts (1998–1999)</p>
            </div>

          </div>

        </div>
      </div>

      <!-- Skills Card -->
      <div class="resume-section">
        <app-section-header
          sectionTitle="Skills" [icon]="faCheckDouble"/>

        <div class="grid sm:grid-cols-2 gap-x-8 text-sm">
          <div>
            <ul class="list-disc list-inside">
              <li><strong>Languages:</strong>
                <fa-icon class="icon" [icon]="faAngular"/>
                Angular, Typescript,
                <fa-icon class="icon" [icon]="faCss3"/>
                Css3
              </li>
              <li><strong>Version Control:</strong>
                <fa-icon class="icon" [icon]="faGithub"/>
                Git,
                <fa-icon class="icon" [icon]="faBitbucket"/>
                Bitbucket
              </li>
            </ul>
          </div>
          <div>
            <ul class="list-disc list-inside">
              <li><strong>Frameworks:</strong> Laravel, WordPress, Tailwind</li>
              <li><strong>Tools:</strong> Photoshop, Sketch, Postman, NPM</li>
            </ul>
          </div>

        </div>
      </div>

      <!-- Achievements Card -->
      <div class="resume-section">
        <app-section-header
          sectionTitle="Achievements" [icon]="faAward"/>

        <ul class="list-disc list-inside text-base">
          <li>Latin Grammy Winner 2006 – Album: Calle 13</li>
        </ul>
      </div>

      <div class="resume-section hidden">

        <app-section-header [hidden]="true"
          sectionTitle="Contact" [icon]="faContactCard"/>

        <!-- Contact Card --> <!-- HAS GAME PARTS -->
        <app-contact-section [hidden]="true"></app-contact-section>

      </div>

    </section>`
})
export class ResumeComponent {

  protected readonly faAngular = faAngular;
  protected readonly faCss3 = faCss3;
  protected readonly faAward = faAward;
  protected readonly faGithub = faGithub;
  protected readonly faBitbucket = faBitbucket;
  protected readonly faContactCard = faContactCard;
  protected readonly faCheckDouble = faCheckDouble;
  protected readonly faSchool = faSchool;
  protected readonly faBriefcase = faBriefcase;
}
