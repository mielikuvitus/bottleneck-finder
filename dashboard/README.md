# Dashboard

An unstyled React (Vite) dashboard for recorded load-test runs. The design is
still to come: see [COMPONENTS.md](COMPONENTS.md) for every component and the
data it shows, and [src/styles/tokens.css](src/styles/tokens.css) for the
colour, spacing and type variables.

```sh
npm install     # first time only
npm run data    # copy runs and screenshots into public/data (after npm run analyze)
npm run dev     # http://localhost:5173/monzo/dashboard/ (opens on "Select a run"; ?run=<name> opens a run)
                # http://localhost:5173/monzo/dashboard/components: every component at once (dev only)
npm run build   # static site in dist/
```

The dashboard is built to live at `/monzo/dashboard/` on my domain (`base`
in [vite.config.js](vite.config.js)): upload the contents of `dist/` to that
folder. To host it somewhere else, change `base`.

From the project root: `npm run dashboard:data` and `npm run dashboard`.
