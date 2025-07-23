import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

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
            throw new Error('unsupported file');
        }

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}