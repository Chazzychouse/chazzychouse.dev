---
title: sportal
tagline: A live football tracker that also runs the TV wall.
stack: [TypeScript, Effect, React, Electron, WebSocket]
repo: https://github.com/Chazzychouse/sportal
order: 3
---

## The problem

On a football Saturday there are more good games than screens. I wanted one tool that knows
the state of every game right now, and that can arrange the games I'm watching across a desk,
a TV and a phone, all agreeing on what's happening.

## What I built

sportal is a pnpm monorepo with three apps:

![sportal's desktop shell in a 2×2 layout: each tile has its game's score and clock, one is on air with sound, one game is final. The broadcasts in the tiles are blurred.](/figures/sportal.webp)

- **The Hub** is one server process. It polls ESPN's scoreboard for the day's games, takes live
  updates from ESPN's push feed, folds them into one in-memory slate of games, and serves it to
  clients over a single WebSocket, as requests and live queries.
- **The web app** is a React tracker that works in any browser: scores, game situations
  (down and distance, field position), play-by-play, team stats and win probability.
- **The desktop shell** is an Electron app whose tiles are the streaming providers' own web
  players. sportal only positions, tunes and mutes them. It never touches the video, so DRM is
  left alone.

## Key decisions

- **Measure before choosing a feed.** ESPN has several feeds, and none documents its lag. I
  recorded them side by side through an NFL Sunday window and timed each play from the snap to
  when each feed first showed it. FastCast, ESPN's push feed, was fastest: a median of 28 s over
  382 plays, against 41 s for the scoreboard the Hub had been polling. So FastCast became the
  live source, and the scoreboard poll still lists the day's games.

  ![An early snapshot of the feed-lag measurement: lag per play for each ESPN feed, and a summary table of median and p90 lag per feed.](/figures/sportal-feed-lag.webp)

- **Feeds are untrusted.** The score feeds are unofficial and can change shape without notice.
  Everything entering through the provider boundary is decoded against a schema on the way in.
- **One definition per concept.** Each domain concept is declared once, as an Effect Schema.
  That one declaration is its type, its decoder and its wire format.
- **Updates can arrive out of order.** The slate is a pure function from the current state plus
  a delivery to the next state, and it orders snapshots by game time, so a stale update can
  never move a game backwards. The pure core is tested directly.
- **Time is injected.** All time comes from Effect's clock, so tests replay a recorded game at
  any speed. The same mechanism gives each TV tile a spoiler delay that holds back scores to
  match its stream.
- **The structure is checked.** Dependency rules and dead-code checks run in CI next to the
  tests, so the architecture can't quietly erode.

## What I'd do next

- Keep the slate between Hub restarts.
- Run the Hub in the cloud as well as at home, which the design already allows.
