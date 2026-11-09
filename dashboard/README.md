# Dashboard

An unstyled React (Vite) dashboard for recorded load-test runs. The design is
still to come: see [COMPONENTS.md](COMPONENTS.md) for every component and the
data it shows, and [public/tokens.css](../public/tokens.css) (shared with the
bank site) for the colour, shadow, spacing and type variables.

```sh
npm install     # first time only
npm run data    # copy runs, screenshots and the bank site into public/data (after npm run analyze and npm run build in the project root)
npm run dev     # http://localhost:5173/monzo/dashboard/ (opens on "Select a run"; ?run=<name> opens a run)
                # http://localhost:5173/monzo/dashboard/components: every component at once
npm run build   # static site in dist/
```

The dashboard is built to live at `/monzo/dashboard/` on my domain (`base`
in [vite.config.js](vite.config.js)): upload the contents of `dist/` to that
folder. To host it somewhere else, change `base`. The host must answer
`/monzo/dashboard/components` with the dashboard's `index.html`, which on
Vercel takes a rewrite in `vercel.json`, above any catch-all rule.

From the project root: `npm run dashboard:data` and `npm run dashboard`.
