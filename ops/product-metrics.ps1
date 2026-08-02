[CmdletBinding()]
param([switch]$Local)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = @"
SELECT
  COUNT(DISTINCT CASE WHEN is_qa = 0 THEN user_hash END) AS users,
  COUNT(CASE WHEN is_qa = 0 THEN 1 END) AS events,
  COUNT(CASE WHEN is_qa = 1 THEN 1 END) AS qa_rows
FROM events;
"@

$Output = & $Wrangler d1 execute tango-orbit $Target --command $Sql --json
if ($LASTEXITCODE -ne 0) { throw "D1 metrics query failed" }
$Row = ((($Output -join [Environment]::NewLine) | ConvertFrom-Json)[0]).results[0]

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "tango-orbit"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = [int]$Row.users
        events = [int]$Row.events
    }
    qa = [ordered]@{ rows = [int]$Row.qa_rows }
} | ConvertTo-Json -Depth 4
