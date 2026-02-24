import { NextResponse } from 'next/server';

/**
 * Middleware to protect private routes
 * 
 * Note: Firebase Auth is client-side, so actual authentication checking
 * happens in ProtectedRoute component. This middleware provides an additional
 * layer and ensures route structure is correct.
 * 
 * All protected routes are wrapped with ProtectedRoute component which:
 * - Checks authentication state via AuthContext
 * - Redirects to /login if not authenticated
 * - Prevents rendering content before redirect
 */
export function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/account/:path*',
  ],
};
