import { Pipe, PipeTransform } from '@angular/core';
import {InputTransformerService} from '../components/game/services/input-transformer.service';

@Pipe({
  name: 'slugify',
})
export class SlugifyPipe implements PipeTransform {
constructor(private inputTransformerService: InputTransformerService) {
}
  transform(value: string): string {
    return this.inputTransformerService.transformToSlug(value);
  }
}
