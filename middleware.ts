import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value
  const csrf = req.cookies.get("csrf")?.value
  const proto = req.headers.get("x-forwarded-proto")
  const isHttps = proto === "https"
  const path = req.nextUrl.pathname

  if ((path === "/login" || path === "/signup") && token) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (path === "/" && token) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    const res = NextResponse.redirect(url)
    if (!csrf) {
      res.cookies.set({
        name: "csrf",
        value: crypto.randomUUID(),
        httpOnly: false,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
      })
    }
    return res
  }

  if (path.startsWith("/dashboard") && !token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    const res = NextResponse.redirect(url)
    if (!csrf) {
      res.cookies.set({
        name: "csrf",
        value: crypto.randomUUID(),
        httpOnly: false,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
      })
    }
    return res
  }

  const res = NextResponse.next()
  if (!csrf) {
    res.cookies.set({
      name: "csrf",
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
    })
  }
  return res
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/signup"],
}
