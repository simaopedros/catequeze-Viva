import type { Request, Response, NextFunction } from "express";
import { resetPasswordAndInvalidateSessions } from "../operations/userOperations";
import {
  getExpressRequestPath,
  normalizeRequestPath,
} from "../security/authRateLimitPaths";

/** Keep Wasp's public endpoint from bypassing single-use consumption. */
export function passwordResetMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const path = normalizeRequestPath(getExpressRequestPath(req));
  if (req.method !== "POST" || !path.endsWith("/auth/email/reset-password")) {
    return next();
  }
  void resetPasswordAndInvalidateSessions(req.body, {})
    .then((result) => res.json(result))
    .catch(next);
}
