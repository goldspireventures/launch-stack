# scripts/smoke-uat.ps1
#
# End-to-end visual / UAT smoke test for the Goldspire Launch Stack.
#
# Hits every page in Console, Admin, and Heartline as the persona that should
# be able to see it. Verifies a 200 HTTP code AND that the response body does
# NOT include obvious framework error markers ("Application error", "500",
# "TRPCClientError", "Cannot read properties of undefined", "Error:").
#
# Failures are aggregated and reported at the end with the curl URL so you can
# eyeball the page yourself.
#
# Pre-reqs:
#   - All three dev servers running on :3000, :3001, :3002.
#   - Demo data seeded: pnpm --filter @goldspire/db seed
#
# Usage:
#   pwsh ./scripts/smoke-uat.ps1
#
# Exit codes:
#   0 — every page returned 200 + clean body
#   1 — at least one failure

$ErrorActionPreference = 'Continue'
$failures = @()
$passes = 0
# Substrings that indicate a *server-side* error rendered to the page.
# We avoid generic Next.js CSS / class names that appear in every bundle
# (e.g. `next-error-h1` is in the fallback 404 inline CSS on every page).
$ERROR_SUBSTRINGS = @(
    '<h2>Application error',
    '<h2 data-nextjs-error',
    'Internal Server Error',
    'TRPCClientError',
    'TRPC_ERROR',
    'Cannot read properties of undefined',
    'Cannot read property',
    '<title>500'
)

# A note on cookies: localhost ignores port for cookies, so a cookie set for
# :3001 is read by :3002 and :3000 in a real browser. curl honors what we
# pass in via -H "Cookie:".

function Test-Page {
    param(
        [string]$Url,
        [string]$Label,
        [string]$Cookie = ''
    )
    $headers = @{}
    if ($Cookie) { $headers['Cookie'] = $Cookie }
    $headerArgs = @()
    foreach ($k in $headers.Keys) { $headerArgs += '-H'; $headerArgs += "$($k): $($headers[$k])" }

    # We want both the body and the status code. curl writes the body to
    # stdout and the status code to stderr via -w; we capture both.
    $body = & curl.exe -s -L --max-redirs 3 @headerArgs $Url
    $code = & curl.exe -s -L --max-redirs 3 -o NUL -w "%{http_code}" @headerArgs $Url

    $codeOk = $code -eq '200'
    $bodyOk = $true
    if ($body) {
        foreach ($needle in $ERROR_SUBSTRINGS) {
            if ($body -match [regex]::Escape($needle)) {
                $bodyOk = $false
                $script:failures += @{ Url = $Url; Label = $Label; Reason = "body contained '$needle'"; Code = $code }
                break
            }
        }
    }
    if (-not $codeOk) {
        $script:failures += @{ Url = $Url; Label = $Label; Reason = "HTTP $code"; Code = $code }
    }
    if ($codeOk -and $bodyOk) {
        $script:passes++
        Write-Host ("  [{0,4}] {1,-32} {2}" -f $code, $Label, $Url) -ForegroundColor Green
    } else {
        Write-Host ("  [{0,4}] {1,-32} {2}" -f $code, $Label, $Url) -ForegroundColor Red
    }
}

# ─── Cookie sets per persona ────────────────────────────────────────────

$studioOwner = 'goldspire_persona=studio.owner; goldspire_active_tenant=goldspire'
$heartlineOwner = 'goldspire_persona=heartline.owner; goldspire_active_tenant=heartline'
$heartlineAdmin = 'goldspire_persona=heartline.admin; goldspire_active_tenant=heartline'
$novacareOwner = 'goldspire_persona=novacare.owner; goldspire_active_tenant=nova-care'
$customerSarah = 'goldspire_persona=heartline.customer.sarah; goldspire_active_tenant=heartline'
$customerJamie = 'goldspire_persona=heartline.customer.jamie; goldspire_active_tenant=heartline'

# ─── Console (port 3001, studio.owner) ──────────────────────────────────

Write-Host ""
Write-Host "Studio Console (http://localhost:3001) as Studio Owner" -ForegroundColor Cyan
$consolePages = @(
    @{ Path='/'; Label='Overview' },
    @{ Path='/login'; Label='Login' },
    @{ Path='/onboard'; Label='Onboarding wizard' },
    @{ Path='/apps'; Label='Apps' },
    @{ Path='/tenants'; Label='Tenants' },
    @{ Path='/blueprints'; Label='Blueprints' },
    @{ Path='/deals'; Label='Deals' },
    @{ Path='/deals/new'; Label='New deal' },
    @{ Path='/plans'; Label='Plans' },
    @{ Path='/reports'; Label='Reports' },
    @{ Path='/analytics'; Label='Analytics' },
    @{ Path='/catalog/feature-flags'; Label='Flag catalog' },
    @{ Path='/audit'; Label='Audit' },
    @{ Path='/settings'; Label='Settings' }
)
foreach ($p in $consolePages) {
    Test-Page "http://localhost:3001$($p.Path)" $p.Label $studioOwner
}

# ─── Admin (port 3002) as Heartline Owner ───────────────────────────────

Write-Host ""
Write-Host "Admin (http://localhost:3002) as Heartline Owner" -ForegroundColor Cyan
$adminPages = @(
    @{ Path='/dashboard'; Label='Dashboard' },
    @{ Path='/login'; Label='Login' },
    @{ Path='/users'; Label='Users' },
    @{ Path='/products'; Label='Products' },
    @{ Path='/subscriptions'; Label='Subscriptions' },
    @{ Path='/feature-flags'; Label='Feature flags' },
    @{ Path='/reports'; Label='Reports' },
    @{ Path='/analytics'; Label='Analytics' },
    @{ Path='/messages'; Label='Messages' },
    @{ Path='/notifications'; Label='Notifications' },
    @{ Path='/audit'; Label='Audit' },
    @{ Path='/settings'; Label='Settings' },
    @{ Path='/select-tenant'; Label='Tenant picker' }
)
foreach ($p in $adminPages) {
    Test-Page "http://localhost:3002$($p.Path)" $p.Label $heartlineOwner
}

Write-Host ""
Write-Host "Admin as Nova Care Owner (tenant switch sanity)" -ForegroundColor Cyan
Test-Page 'http://localhost:3002/dashboard' 'Nova Care dashboard' $novacareOwner

# ─── Heartline (port 3000) ──────────────────────────────────────────────

Write-Host ""
Write-Host "Heartline (http://localhost:3000) as customer Sarah (free)" -ForegroundColor Cyan
$customerPages = @(
    @{ Path='/'; Label='Landing' },
    @{ Path='/login'; Label='Login' },
    @{ Path='/onboarding'; Label='Onboarding' },
    @{ Path='/discover'; Label='Discover' },
    @{ Path='/likes'; Label='Likes (free)' },
    @{ Path='/matches'; Label='Matches' },
    @{ Path='/messages'; Label='Messages' },
    @{ Path='/profile'; Label='Profile' },
    @{ Path='/premium'; Label='Premium' }
)
foreach ($p in $customerPages) {
    Test-Page "http://localhost:3000$($p.Path)" $p.Label $customerSarah
}

Write-Host ""
Write-Host "Heartline as Jamie (Plus member — sees inbound likes)" -ForegroundColor Cyan
Test-Page 'http://localhost:3000/likes' 'Likes (plus)' $customerJamie

# ─── Auth gates ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Auth gates / cross-app redirects" -ForegroundColor Cyan
Test-Page 'http://localhost:3001/' 'Console as tenant admin (should redirect)' $heartlineAdmin
Test-Page 'http://localhost:3002/dashboard' 'Admin as customer (should redirect)' $customerSarah

# ─── Summary ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host ("=" * 70)
if ($failures.Count -eq 0) {
    Write-Host ("All {0} pages OK." -f $passes) -ForegroundColor Green
    exit 0
} else {
    Write-Host ("{0} passed, {1} failed." -f $passes, $failures.Count) -ForegroundColor Yellow
    Write-Host ""
    foreach ($f in $failures) {
        Write-Host ("  FAIL  {0,-30}  {1,-40}  {2}" -f $f.Label, $f.Url, $f.Reason) -ForegroundColor Red
    }
    exit 1
}
