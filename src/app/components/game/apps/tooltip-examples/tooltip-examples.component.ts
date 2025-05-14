import { Component } from '@angular/core';
import {TooltipDirective} from '../../directives/tooltip.directive';
import {NgForOf, NgIf} from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {Tooltip} from 'chart.js';
import {TooltipOptions, TooltipService} from '../../services/tooltip.service';

@Component({
  selector: 'app-tooltip-examples',
  imports: [
    TooltipDirective,
    NgIf,
    MarkdownComponent,
    NgForOf
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
  `
})
export class TooltipExamplesComponent {
  showDocs: any;
  docsPath = 'assets/docs/';

  docs = this.docsPath +`tooltip.doc.md`;


  tooltips: TooltipOptions[] = [
    {
      text: 'TOP',
      position: 'top',
      size: 'sm',
      cssClass: 'bg-blue-500'
    },
    {
      text: 'BOTTOM',
      position: 'bottom',
    },
    {
      text: 'LEFT',
      position: 'left',
      size: 'sm',
      cssClass: 'bg-blue-500'
    },
    {
      text: 'RIGHT',
      position: 'right',
      size: 'sm',
    }
  ]
  customTooltips: TooltipOptions[] = [
    {
      text: 'Custom Tooltip',
      position: 'top',
      size: 'sm',
      cssClass: 'bg-blue-500'
    }
  ]

}
