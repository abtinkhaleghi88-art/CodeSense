# CodeSense

**Where you know what you code.**

CodeSense is a retro-futuristic web app that helps developers and learners understand any piece of code in seconds. Submit code via raw paste, photo upload, or a GitHub URL, and receive a clear three-part AI explanation:

1. **Language** — what programming language it is
2. **How It Works** — a step-by-step breakdown of the functionality
3. **Why It Was Written** — the likely purpose and intent behind the code

Every analysis is automatically saved to your personal history so you can revisit it anytime.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + React 19 |
| Styling | Tailwind CSS v4 + custom retro-terminal design tokens |
| Router | TanStack Router (file-based) |
| Backend | [Lovable Cloud](https://lovable.dev) (Supabase — Auth + Postgres) |
| AI | Lovable AI Gateway (Google Gemini 2.5 Flash) |
| Build Tool | Vite 7 |
| Package Manager | Bun |

---

## Features

- 🔐 **Authentication** — email + password sign-up and sign-in
- 📝 **Raw Code** — paste any code snippet (up to 50,000 characters) for instant analysis
- 📸 **Photo Upload** — drag-and-drop or browse an image of code; vision AI reads it for you
- 🐙 **GitHub Integration** — paste a GitHub repo URL, browse the file tree, and analyze any file
- 🎨 **Retro Terminal UI** — green-on-black CRT aesthetic with laser-scanner animations during analysis
- 🌗 **Dark / Light Mode** — toggle themes with persistence
- 📜 **History** — revisit, search, and delete past analyses

---

## AI Engine & Rate Limits

CodeSense routes every analysis through the **Lovable AI Gateway**, using **Google Gemini 2.5 Flash** as the underlying model. Gemini 2.5 Flash is multimodal, so the same model handles both pasted source code and photo-of-code uploads (vision + text) without needing a separate OCR step.

To prevent API abuse and keep infrastructure costs sustainable, CodeSense enforces a built-in per-user rate limit:

- **30 analyses per user, per UTC day**
- The quota is checked **server-side** inside the `analyzeCode` server function before any AI call is made — so the limit cannot be bypassed from the client.
- A live **quota badge** in the top navigation shows your remaining analyses (e.g. `QUOTA 27/30`) with a pixelated progress bar that matches the terminal theme.
- The badge updates in real time after each successful analysis — no page refresh required.
- The counter resets at **00:00 UTC** every day.

When the quota is exhausted, new analyses are rejected with a clear error and the badge switches to a red `EXHAUSTED` state until the next reset.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed locally
- A Lovable Cloud (Supabase) project connected

### 1. Clone the repository

```bash
git clone <repo-url>
cd codesense
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Copy the provided `.env` file (or create one) and ensure it contains your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> ⚠️ **Never commit `.env` files.** They are already ignored in `.gitignore`.

### 4. Run the development server

```bash
bun run dev
```

The app will be available at `http://localhost:3000`.

### 5. Build for production

```bash
bun run build
```

---

## Project Structure

```
src/
  components/
    codesense/          # Core UI components (tabs, analysis panel, scanner)
    ui/                 # shadcn/ui components
  integrations/
    supabase/           # Supabase clients, auth middleware, types
  lib/
    analyses.functions.ts  # Server functions (AI analysis, history CRUD)
    theme.tsx           # Dark / light mode provider
  routes/
    _authenticated/
      app.tsx           # Main workspace (tabs + analysis)
      history.tsx       # Saved analyses page
    auth.tsx            # Sign in / sign up
    index.tsx           # Landing redirect
  styles.css            # Global styles + design tokens
```

---

## License

Private — built with [Lovable](https://lovable.dev).
