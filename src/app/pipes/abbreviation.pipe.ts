import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'abbreviation',
  standalone: true
})
export class AbbreviationPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const words = value.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    if (words.length === 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
}
