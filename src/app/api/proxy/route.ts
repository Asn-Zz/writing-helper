import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('URL parameter is missing', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch (error) {
    return new NextResponse('Invalid URL parameter', { status: 400 });
  }

  // Basic validation to prevent misuse as an open proxy
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return new NextResponse('Protocol not allowed', { status: 403 });
  }

  try {
    // Dynamically set the Referer based on the target URL's origin
    const host = targetUrl.host.split('.').slice(1).join('.');
    const referer = targetUrl.origin.replace(targetUrl.host, host) + '/';    

    const response = await fetch(url, {
      headers: {
        'Referer': referer,
      },
    });

    if (!response.ok) {
      // Pass through the status from the upstream server
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: { 'Content-Type': response.headers.get('content-type') || 'text/plain' },
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable', // Cache for a day
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new NextResponse(`Error fetching image from proxy: ${error.message}`, { status: 500 });
  }
}
