import { NextResponse } from 'next/server';

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

export async function handler(request: Request, { params }: { params: { source: string } }) {
    const { source } = await params;
    
    if (!source) {
        return NextResponse.json({ error: "Missing 'source' query parameter." }, { status: 400 });
    }

    const searchParams = new URL(request.url).searchParams;
    const targetUrl = `https://api.dao.js.cn/${source}${searchParams ? `?${searchParams.toString()}` : ''}`;

    try {      
        const response = await fetch(targetUrl);
        const data = await response.json();
        
        return NextResponse.json(data, {
            status: response.status,
            statusText: response.statusText,
        });

    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to fetch from upstream API.', details: error.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 });
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
