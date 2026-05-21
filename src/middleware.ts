import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Whitelist public pages and public API endpoints
  if (pathname.startsWith('/public') || pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
