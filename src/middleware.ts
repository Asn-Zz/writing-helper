import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { storeAuthKey } from '@/app/lib/auth';

const protectedPaths = [
  '/chat',
];

export function middleware(req: NextRequest) {
  const token = req.cookies.get(storeAuthKey);
  const url = req.nextUrl.clone();
  
  const isProtectedPath = protectedPaths.some(path => url.pathname.startsWith(path));
  
  if (isProtectedPath && !token) {
    if (url.pathname.startsWith('/api')) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'authentication failed' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    url.searchParams.set('redirect_url', url.pathname);
    url.pathname = '/';
    return NextResponse.redirect(url);
  }  

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
