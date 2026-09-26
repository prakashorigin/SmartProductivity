# SmartProductivity frontend

Run from the repository root with `npm run frontend`, or install/run independently:

```bash
npm ci
npm run dev
```

Vite serves `http://localhost:4000` and proxies `/api` to `http://localhost:6000`. Set `VITE_API_URL` only when the API has a separate deployment origin; never put server secrets in `VITE_*` variables. Copy `.env.example` to `.env` only if you need an explicit API URL.

The frontend entry and route table live in `src/app`; lazy-loaded screens live in `src/pages`, shared UI in `src/components`, and data/state code in `src/services` and `src/store`. The app uses React Router, Redux Toolkit, Tailwind CSS, Axios, Recharts, and Lucide icons. Run `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` before a release. Authentication/store and API modules are TypeScript; page components are JSX/JavaScript.
