// src/types/express.d.ts
import { IUser } from "../types/index";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
