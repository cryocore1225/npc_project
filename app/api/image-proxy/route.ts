import { NextRequest, NextResponse } from 'next/server'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('url')?.trim()
  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      cache: 'no-store',
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 },
      )
    }

    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Upstream response is not an image' }, { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 })
  }
}
