# Privacy design

- Search runs against `public/dictionary.json` in the browser.
- Search queries and saved word IDs remain in `localStorage`.
- The server accepts only allowlisted event names and a random client UUID header.
- The UUID is SHA-256 hashed before insertion.
- IP addresses, user agents, search queries, word IDs, names, and email addresses are not stored in D1.
- Events are deleted after 35 days by a daily scheduled job.
- There are no advertising or third-party analytics SDKs.
