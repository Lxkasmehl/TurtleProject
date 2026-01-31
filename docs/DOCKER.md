# TurtleTracker – Docker

This guide describes what was implemented with Docker and how to use it.

## Docker in plain terms

### What is Docker?

Think of Docker as **pre-packaged runtimes** for your app:

- **Without Docker:** You install Python, Node, OpenCV, etc. on your PC. You run `python app.py`, `npm run dev`, etc. in separate terminals. If something is missing or the wrong version, it breaks.
- **With Docker:** You describe “this container has Python 3.11 + these packages” and “this one has Node 20”. Docker builds **images** from that and runs them in isolated **containers**. Your PC only needs Docker installed; Python/Node versions live inside the containers.

So: **Docker = run your app in predefined boxes (containers) instead of installing everything directly on your machine.**

### When do I use Docker? Development vs production

- **Development (daily coding):**  
  You can keep your **current workflow**: three terminals, `npm run dev` (frontend), `npm run dev` (auth-backend), `python app.py` (backend). That’s often nicer for fast reload and debugging.  
  Docker is **optional** for dev; use it if you like “one command and everything runs” or if you don’t want to install Python/Node locally.

- **Production / deployment / “someone else runs it”:**  
  Here Docker is **very useful**: you (or a server) run `docker compose up`, and the whole stack (frontend + auth-backend + backend) runs the same way everywhere. No “on my machine it works” problems.

**Summary:** Use Docker for **deployment and consistent runs**; for **development** you can still work without Docker. You choose.

### How does my workflow change with Docker?

| Without Docker | With Docker |
|----------------|------------|
| Install Node + Python (+ deps) on your PC | Install only Docker Desktop |
| Open 3 terminals, start frontend, auth-backend, backend | One terminal: `docker compose up --build` |
| Frontend: http://localhost:5173, Backends: 3001, 5000 | Frontend: http://localhost (port 80), Backends: 3001, 5000 |
| Change code → save → server reloads (hot reload) | Change code → rebuild image and restart container (or use volumes for live reload if you set that up) |

So: **with Docker you trade a bit of “instant” dev feedback for a single, reproducible way to run the whole app.** For production, that’s exactly what you want.

### What is Docker Desktop (Windows)?

**Docker Desktop** is the Windows app that gives you:

1. **Docker Engine** – the thing that actually runs containers.
2. **Docker Compose** – reads `docker-compose.yml` and starts all services together.
3. A simple way to see running containers, images, and logs (optional; you can also use the terminal).

So: **Docker Desktop = the program you install on Windows so that `docker` and `docker compose` work.** Without it (on Windows), you don’t have Docker. Once it’s running (icon in the taskbar), your terminal commands like `docker compose up --build` use it.

---

## What was implemented?

1. **Dockerfiles** for each service:
   - **backend/** – Python 3.11, Flask, OpenCV/FAISS, Port 5000
   - **auth-backend/** – Node 20, TypeScript build, Port 3001
   - **frontend/** – Multi-stage: Vite build, then Nginx for static files, Port 80

2. **docker-compose.yml** in the project root:
   - Starts all three services
   - Volumes for persistent data (Auth DB, backend data / review queue)
   - Shared environment variables (e.g. `JWT_SECRET`)

3. **.dockerignore** in each service so builds stay fast and no unnecessary files end up in the image.

## .env files: root vs backend/auth-backend

- **When using Docker**: Only the **`.env` in the project root** (next to `docker-compose.yml`) is used. Docker Compose reads it and injects those variables into the containers. The existing `backend/.env` and `auth-backend/.env` are **not** read by the containers (they are not in the image and not mounted).
- **When running locally** (without Docker): Use **`backend/.env`** and **`auth-backend/.env`** as before. The root `.env` is only for Docker Compose.

You do **not** need to change your existing `backend/.env` or `auth-backend/.env`. For Docker, add a root `.env` (e.g. copy from `.env.docker.example`) and set the values there; you can copy over the same secrets from your existing files if you like.

## What you need to install

- **Docker Desktop** (Windows/Mac) or **Docker Engine** + **Docker Compose** (Linux)  
  Download: https://www.docker.com/products/docker-desktop/

- On Windows: enable Docker Desktop and use WSL 2 if prompted by the installer.

## Quick start

```bash
# 1. Copy the example env file and adjust if needed (JWT_SECRET, Google Sheets, etc.)
cp .env.docker.example .env

# 2. Build and start everything
docker compose up --build
```

Then open **http://localhost** in your browser. The APIs run at:

- Frontend: http://localhost (Port 80)
- Auth Backend: http://localhost:3001
- Turtle Backend: http://localhost:5000

## Environment variables (.env)

| Variable | Description | Default |
|----------|--------------|---------|
| `JWT_SECRET` | Shared secret for Auth and Turtle backend | Must be changed in production |
| `FRONTEND_URL` | CORS origin for Auth backend | `http://localhost` |
| `SESSION_SECRET` | Session secret for Auth backend | Should be changed |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheet ID (optional) | – |
| `VITE_AUTH_API_URL` / `VITE_API_URL` | Only needed if APIs are not on localhost (e.g. different host/port) | localhost:3001 / 5000 |

## Google Sheets

If you use Google Sheets:

1. Download the service account JSON from the Google Cloud Console.
2. Place the file at `backend/credentials/google-sheets-credentials.json`.
3. In `.env`: set `GOOGLE_SHEETS_SPREADSHEET_ID` to your spreadsheet ID (from the sheet’s URL).

The `backend/credentials/` directory is mounted into the backend container via a volume (see `docker-compose.yml`).

## Data / Volumes

- **auth-data**: Stores the Auth backend database (`auth.json`).
- **backend-data**: Stores backend data (review queue, uploads, vocabulary/index).

Volumes persist when you run `docker compose down`. To remove them:

```bash
docker compose down -v
```

(Warning: this deletes Auth and backend data.)

## Useful commands

```bash
# Start in the background
docker compose up -d --build

# View logs
docker compose logs -f

# Rebuild a single service
docker compose up -d --build backend

# Stop everything
docker compose down
```

## Why Docker?

- **Consistent environment**: Same Python/Node versions and dependencies everywhere.
- **Simple deployment**: One command starts the full app (frontend + both backends).
- **No manual install** of Python, Node, OpenCV, etc. on the host.
- **Reproducibility**: Others can run the project without a long setup guide.

When deploying to a server (e.g. a VPS) later, Docker + `docker compose up` is enough there. For production you should also use HTTPS (e.g. behind a reverse proxy like Nginx or Traefik) and secure secrets.
