---
title: csvQL
tagline: SQL for spreadsheets, in the terminal.
stack: [Go, Bubble Tea, sqlparser, excelize]
repo: https://github.com/Chazzychouse/csvQL
order: 2
---

## The problem

A lot of real data lives in CSV exports and Excel workbooks. Answering a quick question about
one usually means opening a spreadsheet app and clicking through filters, or writing a throwaway
script. I wanted to point SQL at the file and ask.

## What I built

csvQL is a terminal app and CLI that loads CSV files, whole directories of them, or every sheet
of an `.xlsx` workbook as tables, then runs SQL against them. The interactive mode is a
full-screen terminal UI: a data grid with virtual scrolling, a query bar with autocomplete for
tables, columns and values, and a side panel that shows the selected cell, the inferred schema
and the loaded tables. One-off queries also run straight from the command line.

## Key decisions

- **A real SQL parser, not string matching.** Queries go through a SQL parser, and `WHERE`
  clauses are evaluated over its syntax tree: comparisons, `AND`/`OR`/`NOT`, `IS NULL` and
  `BETWEEN`.
- **Types are inferred, then respected.** Each column's type is inferred from a sample of its
  values, so `amount > 100` compares numbers rather than strings.
- **Messy headers get cleaned up.** Header rows are detected automatically (or chosen with
  `--header-row`), and header names are turned into valid SQL identifiers.
- **Reshaping built in.** Spreadsheets often spread dates across columns. `:unpivot` turns those
  columns into rows, so they can be filtered like any other data, and `:reset` puts them back.

## What I'd do next

- Add `ORDER BY`, `GROUP BY` with aggregates, and joins across files.
- Write query results back out to CSV.
