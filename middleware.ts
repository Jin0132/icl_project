import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ICL Project Hub", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD?.trim();
  if (!sitePassword) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authorization.slice("Basic ".length);
  let decoded = "";

  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return unauthorized();
  }

  const password = decoded.slice(separatorIndex + 1);
  if (password !== sitePassword) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
