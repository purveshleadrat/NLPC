# Cross-tenant isolation suite. Run against a server already listening on $base.
#   ./scripts/tenant-isolation-test.ps1
#
# Authentication is tenant-level: a tenant has one shared password and no user accounts.
# These tests therefore prove tenant separation, not per-person separation - there is no
# such thing here.

$ErrorActionPreference = 'Continue'
$base = 'http://localhost:4000'
$pass = 0; $fail = 0

function Call($method, $path, $body, $token, $extraHeaders) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    if ($extraHeaders) { $extraHeaders.GetEnumerator() | ForEach-Object { $headers[$_.Key] = $_.Value } }
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = 30 }
    if ($body) { $params['Body'] = ($body | ConvertTo-Json -Compress); $params['ContentType'] = 'application/json' }
    try {
        $r = Invoke-WebRequest @params
        return @{ code = [int]$r.StatusCode; body = $r.Content }
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
        return @{ code = $code; body = "$($_.Exception.Message)" }
    }
}

function Check($name, $expected, $actual, $extra) {
    if ($expected -eq $actual) { $script:pass++; "  PASS  $name (got $actual)" }
    else { $script:fail++; "  FAIL  $name -- expected $expected, got $actual  $extra" }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

"=== 1. Two tenants sign up ==="
$a = Call POST '/auth/signup' @{ tenantName='Acme'; tenantSlug="acme-$stamp"; password='correct-horse-1' }
Check 'tenant A signup' 201 $a.code $a.body
$tokA = ($a.body | ConvertFrom-Json).accessToken

$b = Call POST '/auth/signup' @{ tenantName='Globex'; tenantSlug="globex-$stamp"; password='correct-horse-2' }
Check 'tenant B signup' 201 $b.code $b.body
$tokB = ($b.body | ConvertFrom-Json).accessToken

$clash = Call POST '/auth/signup' @{ tenantName='Dupe'; tenantSlug="acme-$stamp"; password='correct-horse-9' }
Check 'duplicate slug rejected' 409 $clash.code $clash.body

"=== 2. The shared login works for any number of callers ==="
$login1 = Call POST '/auth/login' @{ tenantSlug="acme-$stamp"; password='correct-horse-1' }
Check 'first caller logs in' 200 $login1.code
$login2 = Call POST '/auth/login' @{ tenantSlug="acme-$stamp"; password='correct-horse-1' }
Check 'second caller, same credentials' 200 $login2.code
$tok1 = ($login1.body | ConvertFrom-Json).accessToken
$tok2 = ($login2.body | ConvertFrom-Json).accessToken
Check 'both tokens usable at once' 200 (Call GET '/initiatives' $null $tok1).code
Check 'both tokens usable at once (2)' 200 (Call GET '/initiatives' $null $tok2).code

"=== 3. Unauthenticated access is refused ==="
Check 'no token -> 401' 401 (Call GET '/initiatives' $null $null).code

"=== 4. Tenant A creates an initiative ==="
$ini = Call POST '/initiatives' @{ name='Checkout rewrite' } $tokA
Check 'A creates initiative' 201 $ini.code $ini.body
$iniId = ($ini.body | ConvertFrom-Json).id
$iniTenant = ($ini.body | ConvertFrom-Json).tenantId

"=== 5. Listing is tenant-scoped ==="
$listA = Call GET '/initiatives' $null $tokA
Check 'A sees its own initiative' 1 (($listA.body | ConvertFrom-Json) | Measure-Object).Count $listA.body
$listB = Call GET '/initiatives' $null $tokB
Check 'B sees none of As data' 0 (($listB.body | ConvertFrom-Json) | Measure-Object).Count $listB.body

"=== 6. THE IDOR TEST: B quotes As initiative id directly ==="
Check 'B fetching As initiative -> 404' 404 (Call GET "/initiatives/$iniId" $null $tokB).code
Check 'B reading As sources -> 404' 404 (Call GET "/sources?initiativeId=$iniId" $null $tokB).code
Check 'B writing into As initiative -> 404' 404 (Call POST "/sources?initiativeId=$iniId" @{ type='meeting_note'; title='injected'; rawText='x'; docDate='2026-01-01' } $tokB).code

"=== 7. Header spoofing is rejected ==="
Check 'As tenant header on Bs token -> 403' 403 (Call GET '/initiatives' $null $tokB @{ 'X-Tenant-Id' = $iniTenant }).code

"=== 8. A can still use its own data ==="
Check 'A writes its own source' 201 (Call POST "/sources?initiativeId=$iniId" @{ type='meeting_note'; title='Kickoff'; rawText='We chose Postgres'; docDate='2026-01-01' } $tokA).code
Check 'A reads it back' 200 (Call GET "/sources?initiativeId=$iniId" $null $tokA).code

"=== 9. SSRF guard on tenant-supplied base URLs ==="
Check 'metadata endpoint rejected' 400 (Call POST '/connections' @{ provider='JIRA'; label='evil'; baseUrl='http://169.254.169.254/latest/meta-data'; accountId='x@y.z'; secret='t' } $tokA).code
Check 'localhost rejected' 400 (Call POST '/connections' @{ provider='JIRA'; label='evil2'; baseUrl='https://localhost:8080'; accountId='x@y.z'; secret='t' } $tokA).code
Check 'plain http rejected' 400 (Call POST '/connections' @{ provider='JIRA'; label='evil3'; baseUrl='http://mysite.atlassian.net'; accountId='x@y.z'; secret='t' } $tokA).code

"=== 10. A valid connection, and its secret never comes back ==="
$conn = Call POST '/connections' @{ provider='JIRA'; label='Prod Jira'; baseUrl='https://mysandbox.atlassian.net'; accountId='me@example.com'; secret='super-secret-token-value' } $tokA
Check 'valid Jira connection created' 201 $conn.code $conn.body
Check 'secret absent from response' $false ($conn.body -match 'super-secret-token-value') $conn.body
Check 'secret absent from listing' $false ((Call GET '/connections' $null $tokA).body -match 'super-secret-token-value')

"=== 11. Connections are tenant-scoped ==="
$connB = Call GET '/connections' $null $tokB
Check 'B sees none of As connections' 0 (($connB.body | ConvertFrom-Json) | Measure-Object).Count $connB.body
$connId = ($conn.body | ConvertFrom-Json).id
Check 'B rotating As connection -> 404' 404 (Call POST "/connections/$connId/secret" @{ secret='hijacked' } $tokB).code
Check 'B deleting As connection -> 404' 404 (Call DELETE "/connections/$connId" $null $tokB).code

"=== 12. Multiple connections per tenant (no one-per-provider limit) ==="
Check 'second Jira connection allowed' 201 (Call POST '/connections' @{ provider='JIRA'; label='Second Jira'; baseUrl='https://other.atlassian.net'; accountId='me@example.com'; secret='another-token' } $tokA).code
$gh1 = Call POST '/connections' @{ provider='GITHUB'; label='Backend repo'; baseUrl='https://api.github.com'; accountId='myorg'; repo='backend'; secret='ghp_x' } $tokA
Check 'GitHub connection allowed' 201 $gh1.code $gh1.body
$gh2 = Call POST '/connections' @{ provider='GITHUB'; label='Frontend repo'; baseUrl='https://api.github.com'; accountId='myorg'; repo='frontend'; secret='ghp_y' } $tokA
Check 'second GitHub repo allowed' 201 $gh2.code $gh2.body

"=== 13. Initiative binds to several connections ==="
Check 'bind backend repo' 201 (Call POST "/initiatives/$iniId/connections?connectionId=$(($gh1.body | ConvertFrom-Json).id)" $null $tokA).code
Check 'bind frontend repo' 201 (Call POST "/initiatives/$iniId/connections?connectionId=$(($gh2.body | ConvertFrom-Json).id)" $null $tokA).code
$binds = Call GET "/initiatives/$iniId/connections" $null $tokA
Check 'initiative spans 2 repos' 2 (($binds.body | ConvertFrom-Json) | Measure-Object).Count $binds.body

"=== 14. Login failures are indistinguishable ==="
Check 'wrong password -> 401' 401 (Call POST '/auth/login' @{ tenantSlug="acme-$stamp"; password='wrong' }).code
Check 'unknown tenant -> 401' 401 (Call POST '/auth/login' @{ tenantSlug="nope-$stamp"; password='correct-horse-1' }).code

"=== 15. Session renewal ==="
$renew = Call POST '/auth/renew' $null $tokA
Check 'renew with a valid token' 200 $renew.code $renew.body
$renewed = ($renew.body | ConvertFrom-Json).accessToken
Check 'renewed token works' 200 (Call GET '/initiatives' $null $renewed).code
Check 'renewed token is still tenant A' 1 (((Call GET '/initiatives' $null $renewed).body | ConvertFrom-Json) | Measure-Object).Count
Check 'renew without a token -> 401' 401 (Call POST '/auth/renew' $null $null).code
Check 'renew with a forged token -> 401' 401 (Call POST '/auth/renew' $null 'not-a-token').code

"=== 16. Forged and malformed tokens ==="
Check 'forged signature -> 401' 401 (Call GET '/initiatives' $null 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOiJhbnkifQ.bogus').code
Check 'garbage token -> 401' 401 (Call GET '/initiatives' $null 'not-a-token').code

""
"==================== $pass passed, $fail failed ===================="
if ($fail -gt 0) { exit 1 }
