import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'abbreviation',
  standalone: true
})
export class AbbreviationPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const words = value.trim().split(/\s+/);
    let result = '';

    if (words.length === 1) {
      result = words[0].substring(0, 2);
    } else if (words.length === 2) {
      result = words[0][0] + words[1][0];
    } else {
      result = words[0][0] + words[words.length - 1][0];
    }

    return result.toUpperCase();
  }
}
