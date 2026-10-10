# Interview AI

An AI-powered interview prep tool. Upload your resume and provide a job description, a
self-description, or both. It generates a match score, likely technical/behavioral questions
(with model answers), skill gaps, a day-by-day prep plan, and a tailored resume PDF — using
Google's Gemini API.

- **Backend**: Node.js, Express 5, MongoDB/Mongoose, JWT auth, Puppeteer (PDF generation)
- **Frontend**: React 19, Vite, React Router, Sass

This repo contains the React frontend in `Frontend/` and the Express backend in `Backend/`.
For Render production, `render.yaml` deploys them as separate services from this same repository.

---

## 1. Prerequisites

- **Node.js 18+** (Node 20/22 recommended) — check with `node -v`
- **npm** (comes with Node)
- **MongoDB** — either:
  - a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster, or
  - MongoDB running locally (`mongodb://127.0.0.1:27017`)
- **A Google Gemini API key** — get one free at https://aistudio.google.com/apikey

## 2. Open in VS Code

Open the **root folder** (`interview-ai-yt-main`) in VS Code — not the `Backend` or `Frontend`
subfolder — so the included `.vscode/` tasks, launch config, and root scripts work.

```
code interview-ai-yt-main
```

## 3. Install dependencies

From the integrated terminal, at the repo root:

```bash
npm run install:all
```

This installs the root tooling plus both `Backend/node_modules` and `Frontend/node_modules`.
(Alternatively use the **Terminal ▸ Run Task ▸ Install All** command in VS Code.)

> **Puppeteer note:** the backend depends on Puppeteer (used to render resume PDFs), which
> downloads its own copy of Chrome during `npm install`. If your network blocks that download
> (common on corporate networks) the install will fail with a Chrome download error. Fix it by
> either:
> 1. Retrying on unrestricted network, or
> 2. Setting `PUPPETEER_SKIP_DOWNLOAD=true` before installing and pointing
>    `PUPPETEER_EXECUTABLE_PATH` (in `Backend/.env`) at a Chrome/Chromium already on your
>    machine — see `Backend/.env.example` for the exact variable.
>    ```bash
>    PUPPETEER_SKIP_DOWNLOAD=true npm install --prefix Backend
>    ```

## 4. Configure environment variables

The backend needs a `.env` file (it's git-ignored, so it isn't in the zip). Copy the template
and fill in real values:

```bash
cp Backend/.env.example Backend/.env
```

Edit `Backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/interview-ai
JWT_SECRET=some-long-random-string
GOOGLE_GENAI_API_KEY=your-gemini-api-key
```

For local development, the frontend calls the backend at `http://localhost:3000`. The two-service
Render setup uses `VITE_API_URL` in the frontend build and `FRONTEND_URL` in the backend to connect
the services; both are wired automatically by `render.yaml`. The backend needs `MONGO_URI`,
`JWT_SECRET`, and `GOOGLE_GENAI_API_KEY`; configure these in `Backend/.env` locally and as
environment variables on Render. Do not commit `.env` files or API keys.

## 5. Run it

Run both development servers with one command from the repository root:

```bash
npm run dev
```

This starts the Express API at `http://localhost:3000` and Vite at `http://localhost:5173`.
The root `npm start` command starts only Express, which serves the built frontend and API on one
port.

## Deploy frontend and backend to Render

The root `render.yaml` defines both Render services in this existing repository: an Express web
service for the backend and a static site for the Vite frontend. No second repository is needed.

1. Push this repository to its existing GitHub remote.
2. In the Render Dashboard, choose **New +** → **Blueprint** and select this repository.
3. Provide `MONGO_URI` (for example, your MongoDB Atlas connection string), `JWT_SECRET`, and
   `GOOGLE_GENAI_API_KEY` when Render prompts for the backend's secret environment variables.
4. Apply the Blueprint. Render builds and deploys both services; the frontend API URL and backend
   CORS origin are connected using Render service references.

The frontend is configured to send API requests and credentialed cookies to the backend. The
backend allows the deployed frontend origin, and the frontend's rewrite rule supports React
client-side routes on refresh. Both services use Render's free plan; the backend may spin down
when idle. Upgrade its plan in Render if always-on availability is needed.

## 6. Debugging in VS Code

A launch config is included: open the **Run and Debug** panel (`Ctrl+Shift+D` /
`Cmd+Shift+D`) and choose **Debug Backend (server.js)** to run the backend with breakpoints.
It automatically loads `Backend/.env`.

For the frontend, use your browser's DevTools, or the VS Code "JavaScript Debugger" attached
to the Vite dev server URL.

---

## Project structure

```
interview-ai-yt-main/
├── .vscode/              # tasks, launch config, recommended extensions
├── package.json          # root convenience scripts (install:all, dev, ...)
├── Backend/
│   ├── server.js         # entry point — loads env, connects DB, starts Express
│   ├── .env.example      # copy to .env and fill in
│   └── src/
│       ├── app.js            # Express app + route mounting
│       ├── config/            # DB connection
│       ├── controllers/       # auth + interview route handlers
│       ├── middlewares/       # JWT auth guard, multer file upload
│       ├── models/            # Mongoose schemas (user, interviewReport, blacklist)
│       ├── routes/            # /api/auth, /api/interview
│       └── services/          # Gemini calls + Puppeteer PDF generation
└── Frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx / main.jsx / app.routes.jsx
        └── features/
            ├── auth/          # login/register, auth context, protected routes
            └── interview/     # home, interview report page, API calls
```

## API overview

| Method | Route                                    | Auth | Description                          |
|--------|-------------------------------------------|------|---------------------------------------|
| POST   | `/api/auth/register`                     | –    | Create account                        |
| POST   | `/api/auth/login`                        | –    | Log in                                |
| GET    | `/api/auth/logout`                       | ✔    | Log out (blacklists token)            |
| GET    | `/api/auth/get-me`                       | ✔    | Current user                          |
| POST   | `/api/interview` (multipart, field `resume`) | ✔ | Generate a report from a required resume PDF and a job description, self-description, or both |
| GET    | `/api/interview`                         | ✔    | List your reports                     |
| GET    | `/api/interview/report/:interviewId`     | ✔    | Get one report                        |
| POST   | `/api/interview/resume/pdf/:interviewReportId` | ✔ | Generate a tailored resume PDF |

Auth uses an httpOnly `token` cookie set on login/register, so the frontend's axios instances
must send credentials — already configured via `withCredentials: true` in the API files.

## Troubleshooting

- **`MongooseServerSelectionError` on startup** — MongoDB isn't reachable. Check `MONGO_URI`
  in `Backend/.env`, and that MongoDB (local or Atlas) is actually running/accessible.
- **`Error: API key must be set when using the Gemini API.`** — `GOOGLE_GENAI_API_KEY` is
  missing/empty in `Backend/.env`.
- **CORS errors in the browser console** — make sure the frontend is running on
  `http://localhost:5173` (Vite's default). The backend's CORS config in `src/app.js` only
  allows that exact origin; change it there if you run Vite on a different port.
- **Puppeteer/Chrome install errors** — see the Puppeteer note in step 3 above.
