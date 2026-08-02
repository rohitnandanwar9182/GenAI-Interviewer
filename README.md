# Interview AI

An AI-powered interview prep tool. Upload your resume + a job description, and it generates
a match score, likely technical/behavioral questions (with model answers), skill gaps, a
day-by-day prep plan, and a tailored resume PDF — using Google's Gemini API.

- **Backend**: Node.js, Express 5, MongoDB/Mongoose, JWT auth, Puppeteer (PDF generation)
- **Frontend**: React 19, Vite, React Router, Sass

This repo is a monorepo with two independent apps: `Backend/` and `Frontend/`.

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

The frontend needs no `.env` — it's hardcoded to call the backend at `http://localhost:3000`
(see `Frontend/src/features/*/services/*.api.js`). If you change the backend port, update
those two files too.

## 5. Run it

**Option A — one command from the root** (runs both servers together, color-coded output):

```bash
npm run dev
```

**Option B — two terminals** (clearer separate logs):

```bash
# Terminal 1
cd Backend
npm run dev

# Terminal 2
cd Frontend
npm run dev
```

**Option C — VS Code Tasks**: `Terminal ▸ Run Task ▸ Run All (Backend + Frontend)`.

Once running:
- Backend API: http://localhost:3000
- Frontend app: http://localhost:5173 (Vite will print the exact URL/port)

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
| POST   | `/api/interview` (multipart, field `resume`) | ✔ | Generate interview report from resume PDF + job description |
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
