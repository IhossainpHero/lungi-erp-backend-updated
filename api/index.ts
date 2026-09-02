import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../dist/app.js";
import connectDB from "../dist/config/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  return (app as any)(req, res);
}
