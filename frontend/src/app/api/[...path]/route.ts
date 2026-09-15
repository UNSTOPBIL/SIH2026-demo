import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds (Vercel max execution time)

const BACKEND_BASE = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = `${BACKEND_BASE}/api/${path.join("/")}${request.nextUrl.search}`;
  try {
    const res = await fetch(targetUrl, {
      cache: "no-store",
    });
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Content-Disposition": res.headers.get("Content-Disposition") || "",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { detail: `Backend proxy error: ${e.message}` },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = `${BACKEND_BASE}/api/${path.join("/")}${request.nextUrl.search}`;
  try {
    const contentType = request.headers.get("content-type") || "";
    const body = await request.arrayBuffer();

    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const fetchOptions: RequestInit = {
      method: "POST",
      headers,
      cache: "no-store",
    };
    if (body && body.byteLength > 0) {
      fetchOptions.body = body;
    }

    const res = await fetch(targetUrl, fetchOptions);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { detail: `Backend proxy error: ${e.message}` },
      { status: 502 }
    );
  }
}
