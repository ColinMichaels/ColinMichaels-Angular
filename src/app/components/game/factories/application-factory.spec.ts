import { ApplicationFactory } from './application-factory';

describe('ApplicationFactory', () => {
  it('should create an instance', () => {
    expect(new ApplicationFactory()).toBeTruthy();
  });
});
