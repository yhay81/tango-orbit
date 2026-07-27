# Product metrics

Events are intentionally content-free:

- `visited`: app loaded after the dictionary became usable
- `searched`: a search was explicitly submitted or an orbit word was opened
- `word_saved`: a word was added to the local wordbook
- `reviewed`: a local review session started
- `returned`: the same browser returned after at least 20 hours

The event schema accepts exactly one `event` field. Search terms, dictionary entry IDs, meanings, and saved words are never sent.

## Early signal

- At least 5 distinct browsers search.
- At least 2 distinct browsers save a word.

These are acquisition and interaction signals, not product success.

## Decision evidence

The final 30-day decision uses direct participant confirmation of seven-day usage, reduction in incumbent usage, and next-month intent.
