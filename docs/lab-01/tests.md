# Lab 1 — Test Plan and Evidence (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| #   | Tool      | Test                                                        | Result |
| --- | --------- | ----------------------------------------------------------- | ------ |
| 1   | Supertest | GET /api/health returns 200, status=ok                      |        |
| 2   | Supertest | GET /api/categories returns 4 seeded categories in id order |        |
| 3   | Vitest    | Heading renders                                             |        |
| 4   | Vitest    | Success state shows Online + category list                  |        |
| 5   | Vitest    | Error state shows Offline + message                         |        |

## Test Evidence (Terminal Output)

**Backend Tests (server)**

```text
> toktickit-server@1.0.0 test
> vitest run

 ✓ tests/lab-01/health.test.ts (1 test) 20ms
 ✓ tests/lab-01/categories.test.ts (1 test) 48ms

 Test Files  2 passed (2)
      Tests  2 passed (2)

**Frontend Tests (client)**
> toktickit-client@1.0.0 test
> vitest run

 ✓ tests/lab-01/App.test.tsx (3 tests) 234ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```
