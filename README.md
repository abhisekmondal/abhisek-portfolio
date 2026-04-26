# Abhisek Mondal — DevOps Portfolio & Resume

A modern, dark-themed DevOps portfolio with a built-in ATS-friendly downloadable PDF resume.

## Tech Stack
- React 19 (CRA + Craco)
- Tailwind CSS
- React Router DOM
- Lucide Icons
- Fonts: Bricolage Grotesque, Manrope, JetBrains Mono

## Routes
- `/` — Portfolio (dark, dev-themed)
- `/resume` — ATS-friendly resume page with **Download PDF** button (uses browser print → Save as PDF)

## Edit Your Content
All resume content lives in **one file**:
```
src/data/resumeData.js
```
Edit profile, summary, skills, experience, certifications, and education there — both pages update automatically.

---

## Run Locally (Dev)

```bash
yarn install
yarn start
# open http://localhost:3000
```

> The `.env` file currently has `REACT_APP_BACKEND_URL` pointing to an Emergent preview URL. You can delete or ignore it — this portfolio doesn't use a backend.

## Production Build

```bash
yarn build
# output: ./build/
```

Deploy `./build/` to any static host (Netlify, Vercel, S3+CloudFront, GitHub Pages, etc.).

---

## Docker Deployment

```bash
docker build -t abhisek-portfolio .
docker run -p 8080:80 abhisek-portfolio
# open http://localhost:8080
```

This uses a multi-stage build with **nginx** for a lightweight (~25 MB) production image and includes SPA routing fallback so `/resume` works on direct refresh.

### docker-compose (optional)

```yaml
version: "3.9"
services:
  portfolio:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

---

## Generating the PDF Resume

1. Open the site → click **"View Resume"** (or go to `/resume`)
2. Click **"Download PDF"** button (top-right)
3. In the print dialog, select **"Save as PDF"** as the destination
4. Save — done. The print stylesheet renders a clean, A4, ATS-friendly version.

---

## License
Personal use. © Abhisek Mondal.
