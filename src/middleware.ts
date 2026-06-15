import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api/auth|admin/login|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Whitelist public pages, root path, and public API endpoints
  if (pathname === '/' || pathname.startsWith('/public') || pathname.startsWith('/api/public')) {
    return NextResponse.next();
  }

  // Redirect legacy/common /login path to /admin/login
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
