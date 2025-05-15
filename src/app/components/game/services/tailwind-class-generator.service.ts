// tailwind-class-generator.service.ts
import {Injectable} from '@angular/core';

export type TailwindVariant = 'hover' | 'focus' | 'active' | '';
export type GradientDirection = 'r' | 'l' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br';

@Injectable({ providedIn: 'root' })
export class TailwindClassGeneratorService {
  colors = [
    'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
    'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink',
    'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone',
  ];

  saturations = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

   directions: GradientDirection[] = ['r', 'l', 't', 'b', 'tl', 'tr', 'bl', 'br'];

  private randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private wrapVariant(variant: TailwindVariant, className: string): string {
    return variant ? `${variant}:${className}` : className;
  }

  private randomColor(saturation?: number): string {
    const color = this.randomFrom(this.colors);
    const level = saturation ?? this.randomFrom(this.saturations);
    return color && level ? `${color}-${level}` : 'zinc-500';
  }

  generateRandomTextAndBg(variant: TailwindVariant = ''): { text: string; bg: string } {
    const text = this.wrapVariant(variant, `text-${this.randomColor()}`);
    const bg = this.wrapVariant(variant, `bg-${this.randomColor()}`);
    return { text, bg };
  }

  generateRandomGradient(variant: TailwindVariant = ''): string {
    const direction = this.randomFrom(this.directions);
    const from = this.wrapVariant(variant, `from-${this.randomColor()}`);
    const to = this.wrapVariant(variant, `to-${this.randomColor()}`);
    const via = Math.random() < 0.5 ? this.wrapVariant(variant, `via-${this.randomColor()}`) : '';

    return ['bg-gradient-to-' + direction, from, via, to].filter(Boolean).join(' ');
  }

 private get randomTwText () {
    return this.generateRandomTextAndBg('').text;
  }

 private get randomTwBg () {
    return this.generateRandomTextAndBg('').bg;
  }

 public get randomTailwindColorClasses () {
   const textClass = this.randomTwText || 'text-default';
   const bgClass = this.randomTwBg || 'bg-default';
   return `${textClass} ${bgClass}`;
 }
}
