import { NextResponse, type NextRequest } from 'next/server';

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

async function handler(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.getAll("source");
    searchParams.delete("source");
    const params = searchParams.toString();
        
    if (!path) {
        return NextResponse.json({ error: "Missing source query parameter." }, { status: 400 });
    }

    const targetUrl = `https://weread.qq.com/api/store/${path}${params ? `?${params}` : ''}`;

    try {      
        const response = await fetch(targetUrl, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return new NextResponse(response.body, response);
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to fetch from upstream API.', details: error.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 });
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
