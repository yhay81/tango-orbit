$ErrorActionPreference = 'Stop'

$sql = @"
SELECT
  event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT user_hash) AS users
FROM events
GROUP BY event_name
ORDER BY event_name;
"@

wrangler d1 execute tango-orbit --remote --command $sql --json

