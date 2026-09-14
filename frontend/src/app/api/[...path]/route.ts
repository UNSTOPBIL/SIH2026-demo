import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes timeout to prevent ECONNRESET

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = `http://127.0.0.1:8000/api/${path.join("/")}${request.nextUrl.search}`;
  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = `http://127.0.0.1:8000/api/${path.join("/")}${request.nextUrl.search}`;
  try {
    const contentType = request.headers.get("content-type") || "";
    const body = await request.arrayBuffer();
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body,
      cache: "no-store",
    });
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
