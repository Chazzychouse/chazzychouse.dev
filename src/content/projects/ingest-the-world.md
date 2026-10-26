---
title: Ingest the World
tagline: A geospatial data platform where the database decides who sees what.
stack: [Python, FastAPI, PostgreSQL/PostGIS, React, TypeScript, Terraform, Azure]
repo: https://github.com/Chazzychouse/ingest-the-world
order: 1
highlights:
  - >-
    Platform that ingests geospatial files of any size (sensor readings up to multi-GB rasters,
    point clouds and 3D models), routes each to the right store, extracts searchable metadata,
    and serves it through a STAC-style search API.
  - >-
    Put authorization in the database: one SQL function decides who can read what, attribute
    (clearance) based and enforced on every query, with an audit event for every catalog access.
  - >-
    Wrote the platform's guarantees as numbered invariants and tested them with Hypothesis state
    machines that drive the real API and Postgres. Fault-injecting fakes are checked against
    Azurite and the Service Bus emulator, and mutation testing proves the suite catches planted
    bugs.
  - >-
    One Terraform module deploys to both commercial Azure and Azure Government. Login uses
    provider-neutral OIDC (Keycloak locally, Entra in the cloud).
---

## The problem

Teams that work with geospatial data receive files of every shape: a few bytes of sensor
readings, multi-gigabyte rasters and point clouds, 3D models too big to open casually. Each one
has to land in the right store, be described well enough to find again, and be visible only to
people cleared to see it, on commercial Azure and on Azure Government alike.

## What I built

![The ingest pipeline, from a signed upload through the queue and worker to the catalog and the search API.](/figures/ingest-pipeline.svg)

A client asks for an upload and gets a signed URL that limits what it may write. When the file
lands, an event goes on a queue. A worker scans it, works out what kind of file it is, reads only
as much of its header as it needs to extract metadata, promotes it to raw storage and catalogs it
as a STAC item in Postgres with PostGIS. A FastAPI service serves search and item reads to a
React app that signs in with OIDC.

## Key decisions

- **The database decides who sees what.** One SQL function works out which collections a user
  may read from their roles and clearance. Every query filters through it, and the Python code
  never re-implements the rule. Every catalog access writes one audit event before responding.
- **Guarantees are written down and tested.** Properties like "no leaks", "every access is
  audited" and "processing an event twice changes nothing" are numbered invariants. Hypothesis
  state machines drive the real API and Postgres with random users and operations, checking the
  invariants after every step. The pipeline simulator runs the worker over a queue and blob store
  that drop, duplicate and fail, then replays every event.
- **Fakes are held to the real thing.** Each external dependency has one behavioural test suite
  that runs against both the seeded fake and the real emulator (Azurite, the Service Bus
  emulator), so the fakes can't drift from reality.
- **The tests are tested.** Mutation testing plants known bugs and checks that the right
  invariant catches each one.
- **One deployment for two clouds.** A single Terraform module targets commercial Azure or
  Azure Government with one variable. Sign-in is provider-neutral OIDC: Keycloak locally, Entra
  ID in the cloud.

## What I'd do next

- Finish the derive stage, which turns each original into web-ready copies, each rendered in an
  isolated process: Cloud-Optimized GeoTIFFs and thumbnails for rasters (under way now), then
  GeoParquet for vector data, COPC for point clouds and 3D Tiles for meshes.
- Serve those copies safely: downloads and thumbnails through short-lived, access-checked links,
  and map tiles from a tile server that applies the same access rules as search.
- Make the map live, with footprints as vector tiles, raster previews and processing status
  pushed to the browser. After that, a 3D viewer that places models on the map.
