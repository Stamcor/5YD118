# Example — interface

What other modules may rely on. Keep it small and stable. Anything not listed here is
internal and may change without notice.

Import from `apps/api/src/modules/example/public.ts`. Fakes for consumers are in
`apps/api/src/modules/example/testing.ts`.

## Services (provided)

| Service key     | Type           | Purpose |
| --------------- | -------------- | ------- |
| `example.thing` | `ThingService` | …       |

## Ports (required, implemented by another module)

## Events (published)

| Type | Payload | When |
| ---- | ------- | ---- |

## Error codes added

## HTTP contract

`packages/contracts/src/example.ts`: …

## Web routes owned
