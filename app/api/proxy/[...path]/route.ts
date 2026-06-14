import { NextRequest, NextResponse } from 'next/server';

// Proxy all requests to the workflow backend, keeping the API key server-side.
// Browser → POST /api/proxy/api/workflow/kickoff
//         with headers: X-Workflow-URL, X-API-Key
//   → Proxy → POST {workflowUrl}/api/workflow/kickoff
//            with header: Authorization: Bearer {apiKey}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'PUT');
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'DELETE');
}

async function proxyRequest(
  req: NextRequest,
  pathSegments: string[],
  method: string,
): Promise<NextResponse> {
  const workflowUrl = req.headers.get('X-Workflow-URL');
  const apiKey = req.headers.get('X-API-Key');

  if (!workflowUrl || !apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Workflow-URL or X-API-Key headers' },
      { status: 400 },
    );
  }

  // Reconstruct path + query string
  const path = pathSegments.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${workflowUrl.replace(/\/$/, '')}/${path}${search}`;

  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  const contentType = req.headers.get('Content-Type');
  if (contentType) {
    forwardHeaders['Content-Type'] = contentType;
  } else if (method !== 'GET' && method !== 'HEAD') {
    forwardHeaders['Content-Type'] = 'application/json';
  }

  const init: RequestInit = {
    method,
    headers: forwardHeaders,
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);

    const body = await upstream.arrayBuffer();

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
