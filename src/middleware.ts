import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const config = {
  matcher: ['/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
