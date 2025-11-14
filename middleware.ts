import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if required environment variables are present
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
    console.error('Missing Supabase environment variables - allowing all requests')
    // In production, if env vars are missing, allow access to avoid blocking the site
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Try to get user, but don't fail if there's an error
    let user = null
    try {
      const { data: { user: userData } } = await supabase.auth.getUser()
      user = userData
    } catch (authError) {
      console.error('Auth error in middleware:', authError)
      // Continue without authentication if there's an error
    }

    // Define protected routes (everything except auth pages and approval pages)
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                       request.nextUrl.pathname.startsWith('/register') ||
                       request.nextUrl.pathname.startsWith('/forgot-password')

    const isApprovalRoute = request.nextUrl.pathname.startsWith('/approve/') ||
                            request.nextUrl.pathname.startsWith('/approve-invoice/') ||
                            request.nextUrl.pathname.startsWith('/invoice-payment/')

    // If user is not authenticated and trying to access protected route (but allow approval routes)
    if (!user && !isAuthRoute && !isApprovalRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // If there's an error, allow the request to continue to avoid blocking the site
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
