import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = "edge";
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
        const apiConfigString = formData.get('apiConfig') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        if (!apiConfigString) {
            return NextResponse.json({ error: 'API configuration is missing.' }, { status: 400 });
        }

        const apiConfig = JSON.parse(apiConfigString);
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
        const textExtensions = ['.txt', '.md', '.markdown', '.doc', '.docx', '.rtf', '.text'];

        let text = '';

        if (textExtensions.includes(fileExt)) {
            const arrayBuffer = await file.arrayBuffer();
            if (['.txt', '.md', '.markdown', '.text', '.rtf'].includes(fileExt)) {
                text = Buffer.from(arrayBuffer).toString('utf-8');
            } else if (['.doc', '.docx'].includes(fileExt)) {
                const buffer = Buffer.from(arrayBuffer);
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;
            }
        } else {
            const ocrFormData = new FormData();
            ocrFormData.append('file', file);
            ocrFormData.append('apiConfig', JSON.stringify(apiConfig));

            const ocrResponse = await fetch(new URL('/api/file-ocr', req.url), {
                method: 'POST',
                body: ocrFormData,
            });

            if (!ocrResponse.ok) {
                const errorData = await ocrResponse.json();
                throw new Error(errorData.error || 'OCR request failed');
            }

            const ocrData = await ocrResponse.json();
            text = ocrData.text;
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}