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
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        const response = await fetch(`https://html2web.codepoem.top/api/cos/files/image/${file.name}?type=file`, {
            method: 'POST',
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
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const formData = await req.formData();
        const key = formData.get('key') as string | null;

        if (!key) {
            return NextResponse.json({ error: 'No file key.' }, { status: 400 });
        }

        const response = await fetch(`https://html2web.codepoem.top/api/cos/files/image/${key}?type=file`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.NEXT_PUBLIC_AUTH_TOKEN || '',
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to delete image: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}

