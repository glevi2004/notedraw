import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Determine if request is for the app subdomain
// Production: app.notedraw.com
// Local: app.localhost
function isAppDomain(host: string): boolean {
  // Production
  if (host.startsWith('app.notedraw.com')) return true
  if (host.startsWith('www.app.notedraw.com')) return true
  
  // Local development (app.localhost) - but not notedraw.local
  if (host.startsWith('app.localhost')) return true
  if (host.startsWith('app.localhost:')) return true
  
  return false
}

// Determine if request is for the marketing domain
// Production: notedraw.com
// Local: notedraw.local
function isMarketingDomain(host: string): boolean {
  // Production
  if (host.startsWith('notedraw.com')) return true
  if (host.startsWith('www.notedraw.com')) return true
  
  // Local development (notedraw.local)
  if (host.startsWith('notedraw.local')) return true
  if (host.startsWith('notedraw.local:')) return true
  
  // Default localhost (without app. prefix) is marketing
  if ((host.startsWith('localhost:') || host === 'localhost') && !host.startsWith('app.localhost')) return true
  if (host.startsWith('127.0.0.1')) return true
  
  return false
}

// Get the redirect URL for the other domain
function getRedirectUrl(
  toApp: boolean,
  pathname: string,
  host: string
): string {
  const isLocal = host.includes('.local') || host.includes('localhost')
  const protocol = isLocal ? 'http' : 'https'
  
  if (toApp) {
    const appHost = isLocal ? 'app.localhost:3000' : 'app.notedraw.com'
    return `${protocol}://${appHost}${pathname}`
  } else {
    const marketingHost = isLocal ? 'notedraw.local:3000' : 'notedraw.com'
    return `${protocol}://${marketingHost}${pathname}`
  }
}

export default clerkMiddleware((auth, req: NextRequest) => {
  const host = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname
  
  // Skip middleware for API routes, static files, and internal Next.js routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Handle app subdomain (app.notedraw.com in prod, app.localhost in dev)
  if (isAppDomain(host)) {
    // Allow all app routes (/dashboard, /workspace, /app/*)
    // Clerk middleware will handle authentication
    return NextResponse.next()
  }

  // Handle marketing domain (notedraw.com in prod, notedraw.local in dev)
  if (isMarketingDomain(host)) {
    // Redirect app-specific routes to app subdomain
    if (
      pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
      pathname === '/workspace' || pathname.startsWith('/workspace/') ||
      pathname.startsWith('/app/')
    ) {
      return NextResponse.redirect(new URL(getRedirectUrl(true, pathname, host)))
    }
    
    // Allow all marketing routes (/, /docs, /blog, etc.)
    return NextResponse.next()
  }

  // Default: allow the request to proceed
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
