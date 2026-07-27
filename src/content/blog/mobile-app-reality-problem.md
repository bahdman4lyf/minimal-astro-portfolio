---
title: "Your Mobile App Doesn't Have a Feature Problem. It Has a Reality Problem."
description: "Simulators teach you to build for fast Wi-Fi and a user who never leaves the screen. Four lessons from shipping live delivery tracking to the phone with one bar of signal."
publishedAt: 2026-07-27
tags: ["mobile", "react-native", "real-time", "gps", "ux"]
---

Most mobile tutorials teach you to build for a world that doesn't exist: fast Wi-Fi, a fresh device, a user who taps exactly where you expect and never leaves the screen. Then you ship, and real users show up with a three-year-old phone, one bar of signal, and the habit of locking their screen mid-task.

The gap between those two worlds is where most mobile engineering actually lives. I learned this the hard way building a live delivery-tracking app, and it reshaped how I think about the whole discipline.

## The demo that lied to me

The feature was simple on paper: show a driver's location on a map, update it in real time, draw the route to the customer. In the simulator it was beautiful. The marker glided across the map, the route drew cleanly, every location ping landed on time.

Then I tested it on a real phone in a moving car, driving through parts of the city where the signal drops without warning. It fell apart immediately. The marker froze, then teleported. The map stuttered. When the connection came back, the app tried to replay every queued update at once and locked up for a second.

Nothing had changed in my code between the simulator and the car. What changed was reality. And reality has properties the happy path never taught me:

- **GPS lies.** Individual readings jump tens of meters even when the device is standing still.
- **The network dies mid-trip** and comes back with a backlog.
- **Users background the app** and expect correct state when they return.

A tracking app isn't a map problem. It's a "what happens when everything goes slightly wrong" problem. That framing applies to almost every serious mobile feature.

## Lesson 1: Never trust a single location reading

The naive version pipes every GPS event straight to the marker:

```typescript
Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, (loc) => {
  setDriverPosition({
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  });
});
```

This is why the marker jitters. Raw GPS is noisy, and you're rendering every twitch. The fix is to smooth the signal and reject readings that are obviously wrong before they ever hit the UI:

```typescript
const MAX_JUMP_METERS = 100;      // ignore physically impossible jumps
const SMOOTHING = 0.3;            // 0 = ignore new data, 1 = trust it fully

function nextPosition(prev: Coord | null, incoming: Coord, accuracy: number): Coord {
  // Drop low-confidence fixes entirely
  if (accuracy > 50) return prev ?? incoming;
  if (!prev) return incoming;

  // Reject teleports — a bad fix, not real movement
  if (distanceMeters(prev, incoming) > MAX_JUMP_METERS) return prev;

  // Exponential smoothing so the marker eases instead of snapping
  return {
    latitude: prev.latitude + (incoming.latitude - prev.latitude) * SMOOTHING,
    longitude: prev.longitude + (incoming.longitude - prev.longitude) * SMOOTHING,
  };
}
```

The marker now moves like something physical instead of a cursor being yanked around. Users never notice this code exists — which is exactly the point.

## Lesson 2: Reconnects should not replay history

When the socket dropped and reconnected, my first instinct was to flush every buffered update so "nothing was lost." That's what caused the freeze: dozens of stale positions animating in sequence while the user watched a driver retrace a trip that already happened.

The user doesn't care where the driver *was* during the outage. They care where the driver *is now*. So on reconnect, throw the backlog away and jump to current truth:

```typescript
socket.on("reconnect", async () => {
  const current = await fetchLatestDriverPosition(tripId); // one authoritative read
  bufferedUpdates.length = 0;                              // discard the stale queue
  setDriverPosition(current);
});
```

The principle generalizes far beyond maps: **for real-time state, freshness beats completeness.** A chat app might replay missed messages, but a live-status view almost never should.

## Lesson 3: Design the "in-between" states on purpose

The happy path has two states — loading and loaded — and tutorials stop there. Real apps live in the messy middle: connected-but-stale, offline-with-cached-data, reconnecting, permission-denied. If you don't design these deliberately, your UI invents them for you, usually as a blank screen or a spinner that never resolves.

The rule that saved me: **never let the screen look broken, even when it is.** Keep the last known good state visible and layer status on top of it.

```typescript
{connectionState === "reconnecting" && (
  <Banner tone="warning">Reconnecting — showing last known location</Banner>
)}
<MapView>
  <Marker
    coordinate={driverPosition}
    opacity={connectionState === "live" ? 1 : 0.5}  // dim when data is stale
  />
</MapView>
```

A dimmed, slightly-behind marker with an honest banner builds more trust than a frozen "live" marker that's silently lying. Users forgive a network that's clearly struggling. They don't forgive an app that pretends everything is fine and then isn't.

## Lesson 4: The lifecycle is not optional

On mobile, your app is constantly interrupted — a call comes in, the user checks a notification, the screen locks. When they return, they expect current reality, not a snapshot from three minutes ago. Wiring into the app lifecycle turns a broken-feeling return into a seamless one:

```typescript
useEffect(() => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      resyncTrip();     // reconnect socket, fetch fresh position
    } else {
      pauseTracking();  // stop draining battery in the background
    }
  });
  return () => sub.remove();
}, []);
```

This single pattern also fixes a battery complaint you'll otherwise get in every review: an app quietly holding a GPS stream open while it's not even on screen.

## The takeaway

None of this shows up in a demo. Nobody opens your app and thinks, "wow, the marker interpolates smoothly and discards stale reconnect buffers." They just feel that it works, everywhere, even when their signal is bad. That feeling *is* the product.

So if you're moving into mobile, or trying to level up, shift where you spend your attention:

1. **Treat inputs as adversarial.** GPS, the network, and the user's timing will all betray you. Validate and smooth before you render.
2. **Prefer fresh over complete** for anything real-time.
3. **Design every in-between state** — reconnecting, stale, offline — as a first-class part of the UI.
4. **Respect the lifecycle.** Assume you'll be backgrounded at the worst possible moment.

The web gives you a refresh button. Mobile gives you one shot and a review score. The engineers who internalize that stop building for the simulator and start building for the car with one bar of signal — which is where your users actually are.
