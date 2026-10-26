# Chase R. Cartwright

Chesapeake, VA · Open to remote or relocation
chazzychouse.dev@gmail.com · github.com/Chazzychouse

## Summary

Backend software engineer with 4 years of professional experience, most of it modernizing a
long-lived Classic ASP and SQL Server product from the inside: building a modern .NET service
layer, moving pages onto it one at a time, and shipping the product's public API. Most at home
where application code meets the database. Interested in databases, operating systems and
testing that proves software is correct rather than hoping it is. Came to software from
electrical engineering and C++, after years in sales and hospitality.

## Experience

### Issuetrak — Software Engineer II
*May 2024 – May 2026* · Software Engineer I, May 2023 – May 2024 ·
Software Engineer Intern, Oct 2022 – May 2023

- Designed and built a modern .NET service layer for a Classic ASP product, then moved dozens
  of legacy pages onto React front ends backed by it (strangler fig pattern), modernizing the
  product screen by screen with no rewrite.
- Built, tested, shipped and maintained the Issuetrak Public API, and a Zapier integration app
  on top of it that connects customers to third-party tools.
- Built an internal revenue application with a daily HubSpot sync.
- Worked on and oversaw the migration from legacy Entity Framework to Dapper (explicit
  transactions and stored procedure calls), guiding the junior engineer assigned to it. This
  cleared the way to move from .NET Framework to modern .NET.
- Wrote and maintained SQL Server stored procedures that held core business logic, from
  calculating an issue's working hours to the commands behind every state transition, along
  with the queries the Classic ASP pages read through ADO.
- Hired full-time as Software Engineer I after a 7-month internship; promoted to Software
  Engineer II one year later.

### Telecommunications startup — Software Engineer
*May 2026 – Oct 2026*

- Designed a strategy for enforcing the domain's state machine in the database, so invalid
  state transitions would be rejected by the database itself rather than by scattered checks
  in a Prisma-based application.
- Helped establish the team's development workflow.

## Projects

### Ingest the World — geospatial data platform
Python · FastAPI · PostgreSQL/PostGIS · React/TypeScript · Terraform · Azure & Azure Government

- Platform that ingests geospatial files of any size (sensor readings up to multi-GB rasters,
  point clouds and 3D models), routes each to the right store, extracts searchable metadata,
  and serves it through a STAC-style search API.
- Put authorization in the database: one SQL function decides who can read what, attribute
  (clearance) based and enforced on every query, with an audit event for every catalog access.
- Wrote the platform's guarantees as numbered invariants and tested them with Hypothesis state
  machines that drive the real API and Postgres. Fault-injecting fakes are checked against
  Azurite and the Service Bus emulator, and mutation testing proves the suite catches planted
  bugs.
- One Terraform module deploys to both commercial Azure and Azure Government. Login uses
  provider-neutral OIDC (Keycloak locally, Entra in the cloud).

### csvQL — SQL for spreadsheets in the terminal
Go · github.com/Chazzychouse/csvQL

- Interactive terminal app and CLI for querying CSV and XLSX files with SQL, with
  autocomplete, a schema panel and unpivot support.

### sportal — live football tracker
TypeScript · Effect · React · pnpm monorepo · CI/CD

- Live game tracker and multi-game viewer shipped as desktop, web and hub apps from one monorepo,
  with automated tests, dependency-boundary checks and release workflows.

### gpui-tunes — native desktop music player
Rust · GPUI · cpal

- Desktop player in the style of classic iTunes for a local audio library, written in Rust with
  native GPU-rendered UI and direct audio output.

### bongocat — Linux input-statistics daemon
Go · Linux evdev

- Daemon that reads keyboard and mouse events straight from the kernel's input devices and
  shows live counts in the Waybar status bar. Ships with an installer.

## Skills

**Languages:** C#, SQL (T-SQL, PostgreSQL), TypeScript/JavaScript, Python, Go, Rust, C++,
VBScript
**Frontend:** React, jQuery, Classic ASP
**Backend & data:** .NET / ASP.NET, Dapper, Entity Framework, ADO, REST API design, FastAPI,
NestJS, Effect, Prisma, SQL Server, PostgreSQL/PostGIS, SQLite
**Integrations:** HubSpot, Zapier
**Testing:** property-based testing (Hypothesis, fast-check), stateful simulation, mutation
testing, Vitest, Playwright, pytest
**Infrastructure:** Docker, Terraform, Azure, GitHub Actions, GitLab CI, Linux

## Education

**Tidewater Community College** — Electrical Engineering and Computer Science coursework,
Spring 2021 – Fall 2022 (plus credits from earlier study)
Two electives short of an Associate of Science in Computer Science.

## Earlier Experience

**Real Estate Agent (licensed, independent contractor)** — A Better Way Realty, 2018 – 2022
Ran a self-directed sales business: found clients, negotiated contracts and managed
transactions from listing to closing.

**Head Waiter** — Wild Wing Cafe, Chesapeake, VA, 2015 – 2023 (full time, then part time
alongside software work)
Led the floor during high-volume service and trained new staff.
