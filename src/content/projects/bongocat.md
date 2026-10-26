---
title: bongocat
tagline: A Linux daemon that counts your keystrokes straight from the kernel.
stack: [Go, Linux evdev, GTK 4, systemd]
repo: https://github.com/Chazzychouse/bongocat
order: 5
---

## The problem

I wanted live keypress and click counts in my status bar, plus an on-screen overlay of the keys
I'm pressing for screen recordings, without a heavyweight app or anything that hooks into a
particular desktop environment.

## What I built

![The kernel's input devices feed two programs: the counter daemon, which drives the Waybar module, and the GTK 4 key overlay.](/figures/bongocat.svg)

A small Go daemon reads raw input events from the kernel's evdev devices (`/dev/input/event*`)
and keeps per-session and lifetime counts of keypresses and left and right clicks. It runs as a
systemd user service and drives a [Waybar](https://github.com/Alexays/Waybar) module, where a
click toggles between session and lifetime totals. A separate GTK 4 overlay draws the most
recent keys with Cairo. An install script builds it, copies the config and enables the service,
and `--uninstall` removes it all.

## Key decisions

- **Read the kernel directly.** Reading evdev works the same under any Wayland compositor or X11
  session. The daemon auto-detects keyboards (devices with letter keys) and mice (devices with
  relative X/Y motion and a left button).
- **Don't double count.** If a [Makima](https://github.com/cyber-sushi/makima) virtual keyboard
  (a key remapper) is present, the daemon reads only that device, because every physical
  keypress also shows up there.
- **Push, don't poll.** The daemon signals Waybar on every event, so the bar updates in real
  time without polling. Lifetime counts are saved to disk every 10 seconds and on shutdown.

## What I'd do next

- Package it for the Arch User Repository.
- Per-key statistics and a heatmap view.
