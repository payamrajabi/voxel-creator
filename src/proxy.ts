import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed Middleware → Proxy (file is `proxy.ts`, not `middleware.ts`;
// tied to CVE-2025-29927). clerkMiddleware() makes `auth()` work in route
// handlers and powers the <SignedIn>/<SignedOut> components.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Everything except Next internals and static files (unless in a query param)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
