import {Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {TooltipDirective} from '../../../game/directives/tooltip.directive';

export class Transformer {
  private readonly cipher = {
    '1': 'b',
    '2': 'a',
    '3': 'd',
    '4': 'c',
    '5': 'f',
    '6': 'e',
    '7': 'h',
    '8': 'g',
    '9': 'j',
    '10': 'i',
    'a' :'1',
    'b' :'2',
    'c' :'3',
    'd' :'4',
    'e' :'5',
    'f' :'6',
    'g' :'7',
    'h' :'8',
    'i' :'9',
    'j' :'10',
    'k' :'k',
    'l' :'l',
    'm' :'m',
    'n' :'n',
    'o' :'o',
    'p' :'p',
    'q' :'q',
    'r' :'r',
    's' :'s',
  };

  private readonly reverseCipher = Object.fromEntries(
    Object.entries(this.cipher).map(([key, value]) => [value, key])
  );

  // Function to encode or decode a single value
  private transformValue(text: string, isEncode: boolean): string {
    const map = isEncode ? this.cipher : this.reverseCipher; // Select the appropriate cipher
    return text
      .split('') // Split into characters
      .map((char) => map[char as keyof typeof map] || char) // Replace characters using the map
      .join('');
  }

  // Function to transform the object's values
  public transformObject(obj: Record<string, string>, isEncode: boolean): Record<string, string> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      acc[key] = this.transformValue(value, isEncode); // Encode or decode the value
      return acc;
    }, {} as Record<string, string>);
  }
}

@Component({
  selector: 'app-contact-section',
  imports: [
    TooltipDirective
  ],
  styles: ``,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      [appTooltip]="tooltips[0].message"
      [tooltipCssClass]="'bg-black/80 text-white'"
      [class.hidden]="this.hidden"
      class="resume-section text-center">
      <h5 class="font-bold mb-2">{{ this.contact['name'] }}</h5>
      <p class="text-sm text-white/90">
        <a [href]="'/#/' + this.contact['website']" class="text-green-600 hover:underline"
           target="_self">{{ this.contact['website'] }}
        </a> |
        <a [href]="'mailto:' + this.contact['email']"  target="_blank" [appTooltip]="tooltips[3].message"
            [tooltipPosition]="'bottom'" [tooltipCssClass]="'bg-red-500/80 text-white'"
           class="text-green-600 hover:underline">{{ this.contact['email'] }}
        </a>
        | <span [innerHTML]="this.contact['phone'] "></span>
      </p>
      <a
        [appTooltip]="tooltips[2].message"
        [href]="this.contact['link']"
        target="_self" download
        class="mac-button animate hover:bg-red-500 hover:animate-ping cursor-no-drop">
        Decode
      </a>
    </div>
  `
})
export class ContactSectionComponent implements OnInit{
  @Input() hidden: any;

  contact: Record<string, string> = {
    name : 'Colin Michaels',
    title : 'Application Developer',
    location : 'Jupiter, FL',
    email : 'colin@colinmichaels.com',
    phone : '954-600-8303',
    website : 'colinmichaels.com',
    link : 'https://docs.google.com/document/d/e/2PACX-1vToj6gV8rRmJq0_k6zdA50VNFZlEdJaDI_37t7gJA1Yg3WK2YsDZZLXQdp89eCGlLZURlcI2RdlYHvF/pub'
  }

  tooltips= [
    {
      id: 1,
      message: 'Hmm I wonder why you cant read this?'
    },
    {
      id: 2,
      message: 'I would look at the code, but I\'m not sure what you mean.'
    },
    {
      id: 3,
      message: 'look for some clues'
    },
    {
      id: 4,
      message: 'email me at <EMAIL> and I\'ll send you the code'
    }
  ]
  constructor() {
  }

  ngOnInit() {

    this.contact = new Transformer().transformObject(this.contact,true);
    console.warn('contact',this.contact);
  }



}
