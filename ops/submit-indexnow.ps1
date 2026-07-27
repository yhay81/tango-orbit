param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$key = 'ed94ef6b38874556a9d042ea6e7431e7'
$hostName = ([Uri]$BaseUrl).Host
$body = @{
  host = $hostName
  key = $key
  keyLocation = "$BaseUrl/$key.txt"
  urlList = @(
    "$BaseUrl/",
    "$BaseUrl/sources",
    "$BaseUrl/privacy"
  )
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'https://api.indexnow.org/indexnow' `
  -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body

