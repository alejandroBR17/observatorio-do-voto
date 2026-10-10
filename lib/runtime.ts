import { getDatabase } from './database';
export const env = {
  get DB() {
    return getDatabase();
  },
};
