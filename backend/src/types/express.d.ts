import { User as UserModel } from '../models/User';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends UserModel {}

    interface Request {
      user?: User;
    }
  }
}

export {};
