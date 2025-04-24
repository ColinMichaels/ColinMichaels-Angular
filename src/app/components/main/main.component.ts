import { Component } from '@angular/core';
import {ResumeComponent} from '../resume/resume.component';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-main',
  imports: [ResumeComponent, NgClass],
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
