import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InputTransformerService {

  transformToUppercase(value: string): string {
    return value.trim().toUpperCase();
  }

  transformToSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-');
  }
}

