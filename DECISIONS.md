# Decisions

## Narrow general dictionary

The service validates fast general English-Japanese lookup, not parity with Weblio's publisher dictionaries, translation, or examples.

## Local-first lookup

The compact dictionary is 22,620 entries and small enough to cache in the browser. Local search avoids request latency and prevents query collection.

## Visual work surface

The first screen is a search dock and three working regions: candidates, the current word with orbiting relations, and saved words. There is no oversized marketing hero or experiment copy in the product.

## Licence-preserving updates

The compact dictionary remains CC BY-SA 4.0. A weekly workflow checks the latest upstream release, verifies its digest, regenerates data, and opens a reviewable pull request.
