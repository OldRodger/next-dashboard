import type { MiddlewareConfig } from "next/server";
import { auth } from "./auth";

export default auth;
export const config: MiddlewareConfig = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
