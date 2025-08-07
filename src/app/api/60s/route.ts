import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
        return NextResponse.json({ error: "Missing 'path' query parameter." }, { status: 400 });
    }

    const targetUrl = `https://api.dao.js.cn/${path}?cache=true`;

    try {      
        const response = await fetch(targetUrl);

        const data = await response.json();
        
        return NextResponse.json(data, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800', // Cache for 1 hour
            }
        });

    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: 'Failed to fetch from upstream API.', details: error.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 });
    }
}
