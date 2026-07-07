import {environment as localEnvironment} from './environment.local';

export const environment = {
  ...localEnvironment,
  firebaseEmulators: undefined,
};
