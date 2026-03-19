import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Define which routes REQUIRE a login
const isProtectedRoute = createRouteMatcher([
  '/manga-list(.*)', 
  // Add any other private routes here, like '/settings' or '/profile'
]);

export default clerkMiddleware(async (auth, request) => {
  // 2. If the user is trying to access a protected route, protect it
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
  // 3. Otherwise, do nothing (this allows public access to everything else)
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};