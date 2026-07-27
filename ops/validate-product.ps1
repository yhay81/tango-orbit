$ErrorActionPreference = 'Stop'

$required = @(
  'EXPERIMENT.md',
  'METRICS.md',
  'PRIVACY.md',
  'SECURITY.md',
  'STACK.md',
  'THIRD_PARTY_LICENSES.md',
  'public/dictionary.json',
  'src/generated/dictionary.ts'
)

foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required release file: $path"
  }
}

$dictionary = Get-Content -Raw -LiteralPath 'public/dictionary.json' | ConvertFrom-Json
if ($dictionary.entries -ne $dictionary.words.Count) {
  throw 'Dictionary entry count does not match the generated word array.'
}
if ($dictionary.entries -lt 20000) {
  throw 'Dictionary unexpectedly contains fewer than 20,000 entries.'
}
if ($dictionary.source.digest -notmatch '^sha256:[0-9a-f]{64}$') {
  throw 'Dictionary source digest is missing or malformed.'
}
if ($dictionary.source.licence -ne 'https://creativecommons.org/licenses/by-sa/4.0/') {
  throw 'Dictionary licence metadata is missing.'
}

$surfacePaths = @('src/ui', 'public/app.js', 'public/app.css')
$surfaceText = foreach ($path in $surfacePaths) {
  if (Test-Path -LiteralPath $path -PathType Container) {
    Get-ChildItem -LiteralPath $path -File -Recurse | Get-Content -Raw
  } else {
    Get-Content -Raw -LiteralPath $path
  }
}
$joinedSurface = $surfaceText -join "`n"
if ($joinedSurface -match 'style=') {
  throw 'Inline style attributes are not permitted.'
}
if ($joinedSurface -match '30日|MVP|実験中|収益性|検証プロジェクト') {
  throw 'Experiment or portfolio meta copy leaked into the product surface.'
}

Write-Output "Release contract passed: $($dictionary.entries) entries, $($dictionary.date)."

