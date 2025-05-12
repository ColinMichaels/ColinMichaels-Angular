import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

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
    } catch (err) {
      console.warn('Invalid timestamp passed to timeAgo pipe:', value);
      return '';
    }
  }
}
