import {Component, OnInit} from '@angular/core';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {NgForOf, NgIf} from '@angular/common';
import {TooltipOptions} from '../../services/tooltip.service';
import {MarkdownReaderComponent} from '../markdown-reader/markdown-reader.component';
import {NotificationService} from '../../services/notification.service';
import {MediaItem} from '../../services/media.service';
import {faTools} from '@fortawesome/free-solid-svg-icons';
import {TailwindClassGeneratorService} from '../../services/tailwind-class-generator.service';

export interface TooltipExampleSet  {
  title:string;
  message?:string;
  tooltips: TooltipOptions[];
}

@Component({
  selector: 'app-tooltip-examples',
  imports: [
    TooltipDirective,
    NgIf,
    NgForOf,
    MarkdownReaderComponent,
  ],
  preserveWhitespaces: true,
  templateUrl: './tooltip-examples.component.html',
  styles: `
    :host ::ng-deep .tooltip-content p {
      margin: 0;
      font-size: 0.875rem;
      color: white;
    }

    :host ::ng-deep .tooltip-content strong {
      font-weight: 600;
    }

    :host ::ng-deep .tooltip-content em {
      font-style: italic;
    }

    :host ::ng-deep .tooltip-content a {
      color: #38bdf8;
      text-decoration: underline;
    }

    .tooltip-default {
      @apply rounded text-center flex flex-col justify-center text-[10px] text-wrap truncate;
    }
  `
})


export class TooltipExamplesComponent implements OnInit{
  showDocs: any;
  docs = `tooltip.doc.md`;

  defaultTooltips: TooltipOptions[] =[];
  customTooltips: TooltipOptions[] = [];
  customTooltips2: TooltipOptions[] = [];
  allTooltips: TooltipExampleSet[] = [];

  constructor(private notify: NotificationService, private tailwindGenerator: TailwindClassGeneratorService) {
  }
  ngOnInit() {
    console.log('Tailwind classes ready:', this.randomTailwindColorClasses);

    this.registerTooltips();
  }

  registerTooltips(){
    this.defaultTooltips = [
      {
        text: 'TOP',
        position: 'top',
        size: 'sm',
        cssClass: 'tooltip-default bg-zinc-500'
      },
      {
        text: 'BOTTOM',
        position: 'bottom',
        cssClass: 'tooltip-default bg-zinc-500'
      },
      {
        text: 'LEFT',
        position: 'left',
        size: 'sm',
        cssClass: 'tooltip-default bg-zinc-500'
      },
      {
        text: 'RIGHT',
        position: 'right',
        size: 'sm',
        cssClass: 'tooltip-default bg-zinc-500'
      }
    ]
    this.customTooltips = [
      {
        text: 'Top',
        cssClass: 'tooltip-default bg-blue-500',
        position: 'top',
        size: 'sm',
        toolTipClass: 'bg-blue-500',
      },
      {
        text: 'Bottom',
        cssClass: 'tooltip-default bg-green-500',
        position: 'bottom',
        size: 'sm',
        toolTipClass: 'bg-purple-500'
      },
      {
        text: 'Left',
        cssClass: 'tooltip-default bg-teal-500/20',
        position: 'left',
        size: 'sm',
        toolTipClass: 'bg-orange-500'
      },
      {
        text: 'Right',
        cssClass: 'tooltip-default bg-zinc-500',
        position: 'right',
        size: 'sm',
        toolTipClass: 'bg-green-500'
      }
    ]
    this.customTooltips2  = [
      {
        text: 'Top',
        cssClass: 'tooltip-default '  + this.randomTailwindColorClasses,
        position: 'top',
        size: 'sm',
        toolTipClass: this.randomTailwindColorClasses,
      },
      {
        text: 'Bottom',
        cssClass: 'tooltip-default ' + this.randomTailwindColorClasses,
        position: 'bottom',
        size: 'sm',
        toolTipClass: this.randomTailwindColorClasses,
      },
      {
        text: 'Left',
        cssClass: 'tooltip-default ' + this.randomTailwindColorClasses,
        position: 'left',
        size: 'sm',
        toolTipClass: this.randomTailwindColorClasses,
      },
      {
        text: 'Right',
        cssClass: 'tooltip-default ' + this.randomTailwindColorClasses,
        position: 'right',
        size: 'sm',
        toolTipClass: this.randomTailwindColorClasses,
      }
    ]
    this.allTooltips = [
      { title: 'Default', message: 'Default Tooltips', tooltips: this.defaultTooltips },
      { title: 'Colored', message: '', tooltips: this.customTooltips },
      { title: 'Shape', message: '', tooltips: this.customTooltips2 },
      { title: 'No Arrow', message: '', tooltips: this.customTooltips },
    ];
  }

  showNotify(tooltip: TooltipOptions, message: string) {
    this.notify.show({
      title: tooltip.text,
      message: message,
      classList: tooltip.cssClass,
      type: 'warning',
      media: new MediaItem({
        id: '',
        title: tooltip.text,
        content: {
          type: 'icon',
          data: {
            type: "fontawesome",
            name: "",
            svgPath: faTools
          }
        }
      })
    });
  }

  buildNotifyMessage(tooltip: TooltipOptions) {
   return `tClass:[${tooltip.toolTipClass}] css:[${tooltip.cssClass}]`;
  }

  get randomTailwindColorClasses () {
    // Fetch the tailwind classes, or fallback to default values
    const tailwindClasses = this.tailwindGenerator?.randomTailwindColorClasses || 'text-default bg-default';
    console.warn('tailwindClasses', tailwindClasses);
    return tailwindClasses;
  }

}
