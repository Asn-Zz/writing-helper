import { NextRequest, NextResponse } from 'next/server';

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
        const text = await handleOcr(file, apiConfig);

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json({ error: `File processing failed: ${error.message || 'Unable to read file content'}` }, { status: 500 });
    }
}

async function handleOcr(file: File, apiConfig: any) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { apiUrl, apiKey, model } = apiConfig;
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "只提取文本，不需要任何解释",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${file.type};base64,${buffer.toString('base64')}`,
                            },
                        },
                    ],
                },
            ],
            temperature: 0,
            stream: false,
        }),
    };
    const response = await fetch(apiUrl, payload);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}