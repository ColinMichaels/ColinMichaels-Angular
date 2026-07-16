import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs/esm';
import relativeTime from 'dayjs/esm/plugin/relativeTime';

dayjs.extend(relativeTime);

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | number | undefined): string {
    if (!value) return '';

    try {
      return dayjs(value).fromNow();
    } catch {
      console.warn('Invalid timestamp passed to timeAgo pipe:', value);
      return '';
    }
  }
}
