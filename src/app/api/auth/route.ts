import { storeAuthKey } from '@/app/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge';
export const preferredRegion = [
    "cle1",
    "iad1",
    "pdx1",
    "sfo1",
    "sin1",
    "syd1",
    "hnd1",
    "kix1",
];

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    const authToken = process.env.NEXT_PUBLIC_AUTH_TOKEN;
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, message: '认证未配置' },
        { status: 500 }
      );
    }
    
    if (password === authToken) {
      const response = NextResponse.json(
        { success: true, message: '认证成功' },
        { status: 200 }
      );
      
      response.cookies.set(storeAuthKey, authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'strict',
      });
      
      return response;
    } else {
      return NextResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('认证错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(storeAuthKey);
  const response = NextResponse.json(
    { success: true, message: '删除成功' },
    { status: 200 }
  );
  
  return response;
}