import {AfterViewInit, Component, ChangeDetectionStrategy} from '@angular/core';
import {TypewriterService} from '../../game/services/typewriter.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home-terminal-window',
  imports: [],
  template: `
    <div class="bg-black text-green-500 shadow-xl shadow-black/20  min-h-[30vh]
      rounded-b-xl p-6 text-left text-xs font-mono">
      <p class="mb-4 text-emerald-400">More about me......</p>
      <p [innerHTML]="typedText"></p>
    </div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class HomeTerminalWindowComponent implements AfterViewInit {
  typedText = '';

  constructor(private readonly typewriter: TypewriterService
  ) {
    this.typewriter.enableSound(false);
    this.typewriter.setVolume(0.01);
    this.typewriter.typedText$.pipe(takeUntilDestroyed())
      .subscribe(text => this.typedText = text);
  }

  ngAfterViewInit() {
    this.typewriter.clear();
    this.typewriter.enqueueLine({
      text: `Beyond coding, I channel my creativity through FPV drone piloting, videography, and photography. These
      pursuits enhance my ability to approach problems from unique perspectives and bring a dynamic edge to my
      projects.<br><br>`,
      agent: 'user'
    });
    this.typewriter.enqueueLine({
      text: `I believe in continuous learning and am always exploring new technologies and methodologies to refine my
      craft. Whether it's developing a new application or capturing the perfect aerial shot, I approach each
      project with enthusiasm and a commitment to excellence.<br><br>`,
      agent: 'user'
    })
    this.typewriter.enqueueLine({
      text: `colin&#64;colinmichaels.com ~<span class="animate-blink">%</span>`,
      agent: 'user',
      showPath: true
    })
  }


}
