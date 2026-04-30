# aweskill Core Development Rules

- Simple: prefer the smallest change that solves the real problem
- Clear: optimize for the next reader, not for cleverness
- Honest: keep the filesystem model explicit and avoid hidden state
- Focused: preserve boundaries between `bundle`, `agent`, `store`, and `doctor`, and keep top-level convenience commands minimal
- Durable: choose behavior that is easy to test and reason about
