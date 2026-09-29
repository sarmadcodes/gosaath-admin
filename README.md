# GoSaath Admin

The University Admin panel: how an institution runs and moderates GoSaath
once real students are using it.

Scoped to one institution. The server decides the scope from the signed-in
admin's role, and this panel never sends an institution id, so a university
admin cannot widen it and nobody is tempted to try.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

It needs the backend. From `../gosaath-backend`:

```bash
npm run dev:local    # local MongoDB, seeded, no Atlas needed
```

That seeds a university admin to sign in with. The credentials are printed
when it starts.

## What is here

- **Overview** — members, commutes, seats, and the two queues that are
  waiting on somebody
- **Verification** — review a student card and approve or reject with a
  reason the applicant is told
- **Members** — search, and one member at a time
- **Reports** — dismiss, warn, suspend or escalate
- **Campuses** — add, rename, deactivate

## What is deliberately not here

Analytics dashboards, charts, billing, and multi-institution management. The
platform-level panel is a separate surface for the GoSaath team.

Phone numbers are not in any list. They are revealed one person at a time,
with a reason, recorded in the audit log against the admin who asked.
