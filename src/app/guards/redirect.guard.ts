import { CanActivateFn } from '@angular/router';

export const redirectGuard: CanActivateFn = (route, state) => {
  if(!route.params['externalUrl']) return true;
 const url = decodeURIComponent(route.params['externalUrl']);
  window.open(url, '_blank');
  return false;
};
