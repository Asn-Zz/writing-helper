import { NextRequest, NextResponse } from 'next/server';

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

const COS_URL = process.env.NEXT_PUBLIC_CDN_URL ? process.env.NEXT_PUBLIC_CDN_URL.replace('static', 'cos/files') : '';

async function handler(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const path = searchParams.getAll("path");
        searchParams.delete("path");
        const params = searchParams.toString();
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const targetUrl = `${COS_URL}/${path.join('/')}?${params || ''}&type=file`;
        const response = await fetch(targetUrl, {
            method: request.method,
            body: file,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.NEXT_PUBLIC_AUTH_TOKEN || '',
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}

export { handler as POST, handler as DELETE };




