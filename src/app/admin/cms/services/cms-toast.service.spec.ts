import {CmsToastService} from './cms-toast.service';

describe('CmsToastService', () => {
  it('lets an operation dismiss its own error without clearing unrelated feedback', () => {
    const service = new CmsToastService();
    const unrelatedId = service.error('Unable to save another change.');
    const importId = service.error('Unable to import post package.');

    service.dismiss(importId);

    expect(service.toasts()).toEqual([
      {id: unrelatedId, type: 'error', message: 'Unable to save another change.'},
    ]);
    service.dismiss(importId);
    expect(service.toasts().length).toBe(1);
  });
});
