# Data: SearchResult

## Description

A single web page returned by `!Search` or `!Similar`.

## Fields

- title: the page title, if available
- url: the page URL
- publishedDate: the publication date, if available
- author: the page author, if available
- text: the full page text, included only when requested

## Notes

- Defined as a TypeScript interface in `src/commands/search.ts`
- The Exa `/search` response carries a `results` array of these
