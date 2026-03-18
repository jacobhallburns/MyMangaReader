import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Define which routes are public
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // 2. If the route is NOT public, protect it
  if (!isPublicRoute(request)) {
    // Correct usage for v6+: call .protect() directly on the auth object
    await auth.protect(); 
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};