import { NextResponse, type NextRequest } from "next/server";

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

const publicCode = '6666'
const apiMapping: Record<string, string> = {
  "to-markdown": publicCode,
  "to-podcast": publicCode,
};

async function handler(req: NextRequest) {
  let body;
  if (req.method.toUpperCase() !== "GET") {
    body = await req.json();
  }
  const searchParams = req.nextUrl.searchParams;
  const path = searchParams.getAll("slug");
  searchParams.delete("slug");
  const params = searchParams.toString();

  const key = path[0];
  const API_PROXY_BASE_URL = apiMapping[key];
  if (!API_PROXY_BASE_URL) return new NextResponse("Not Found", { status: 404 });
  path.shift(); // remove key from path  

  return NextResponse.json(
    { success: true },
    { status: 200 }
  );
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };