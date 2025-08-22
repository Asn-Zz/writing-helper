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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const url = body.url as string | null;

        if (!url) {
            return NextResponse.json({ error: 'No url uploaded.' }, { status: 400 });
        }

        const response = await fetch(`https://113tech.com/vd.php`, {
            method: 'POST',
            body: JSON.stringify({ url }),
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to parse url: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Parse url error:', error);
        return NextResponse.json({ error: `Parse url failed: ${error.message || 'Unable to parse url'}` }, { status: 500 });
    }
}