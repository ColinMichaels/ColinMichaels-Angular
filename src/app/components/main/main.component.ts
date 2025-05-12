import { Component } from '@angular/core';
import {ResumeComponent} from '../resume/resume.component';
import {NgClass} from '@angular/common';
import {SocialsComponent} from '../socials/socials.component';

@Component({
  selector: 'app-main',
  imports: [ResumeComponent, NgClass, SocialsComponent],
  templateUrl: './main.component.html',
  standalone: true,
  styles: ``
})
export class MainComponent {
  isResume= false;

  toggleResume() {
    this.isResume = !this.isResume;
  }
}
