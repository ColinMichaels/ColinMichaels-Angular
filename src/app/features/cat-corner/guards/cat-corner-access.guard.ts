import {inject, Injectable} from '@angular/core';
import {CanMatch} from '@angular/router';
import {map, Observable, take} from 'rxjs';

import {CatCornerAccessService} from '../services/cat-corner-access.service';

@Injectable({
  providedIn: 'root',
})
export class CatCornerAccessGuard implements CanMatch {
  private readonly access = inject(CatCornerAccessService);

  canMatch(): Observable<boolean> {
    return this.access.authorization$.pipe(
      take(1),
      map(authorization => authorization.isAuthorized)
    );
  }
}
