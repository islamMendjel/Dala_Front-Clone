<div align="center">

<img src="https://dala.craftedbygc.com/images/favicons/favicon-32x32.png" width="32" alt="Dala logo" />

# Dala — Front-End Clone

A pixel-faithful, fully animated recreation of the [Dala](https://dala.craftedbygc.com/) landing page, rebuilt from scratch with vanilla JS, Three.js, and GSAP.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-dala--clone.space--z.ai-black?style=for-the-badge&logo=vercel)](https://dala-clone.space-z.ai/)
[![Original](https://img.shields.io/badge/Original%20Site-dala.craftedbygc.com-6C47FF?style=for-the-badge)](https://dala.craftedbygc.com/)
[![Built with Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r132-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.x-88CE02?style=for-the-badge)](https://gsap.com/)

</div>

---

</div>

<div align="center">

<img src="./preview.gif" alt="Dala Clone Preview" width="100%" />

> *[Live Demo](https://dala-clone.space-z.ai)*

</div>

---

## ✨ What's Cloned

| Feature | Status |
|---|---|
| WebGL particle brain (Three.js) | ✅ |
| Scroll-driven GSAP animations | ✅ |
| Animated loading sequence | ✅ |
| Responsive layout | ✅ |
| Team carousel | ✅ |
| Investor section | ✅ |
| Cookie consent banner | ✅ |
| Mobile navigation | ✅ |
| Dark-first design system | ✅ |

---

## 🛠 Tech Stack

| Tool | Role |
|---|---|
| **Vanilla JS** | Core logic, no framework |
| **Vite 5** | Dev server & bundler |
| **Three.js r132** | 3D WebGL particle scene |
| **GSAP 3** | All animations & scroll triggers |
| **Playwright** | Spec extraction tooling |

---

## 📁 Project Structure

```
Dala_Front-Clone/
├── src/                  # JS source modules
├── Dala_files/           # Cloned assets (fonts, images, CSS)
├── agent_assets/webgl/   # WebGL / Three.js scene assets
├── tools/
│   ├── extract-specs.mjs     # Playwright-based spec extractor
│   └── build-reference.mjs   # Reference HTML builder
├── index.html            # Entry point
├── Dala.server.html      # Server-rendered variant
├── reference.html        # Auto-generated reference snapshot
└── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>=18`
- npm `>=9`

### Install & Run

```bash
# Clone the repo
git clone https://github.com/islamMendjel/Dala_Front-Clone.git
cd Dala_Front-Clone

# Install dependencies
npm install

# Start dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Build for Production

```bash
npm run build
```

Output goes to `dist/`.

### Other Scripts

```bash
npm run specs      # Extract specs from the original site via Playwright
npm run reference  # Build the reference HTML snapshot
```

---

## 🔧 How It Works

The clone uses a **spec-extraction pipeline** to faithfully reproduce the original:

1. **`extract-specs.mjs`** — uses Playwright to scrape layout, timing, and animation data from the live Dala site.
2. **`build-reference.mjs`** — generates `reference.html` as a frozen snapshot for comparison.
3. The Three.js brain scene is reconstructed in `agent_assets/webgl/` with matching particle count, color palette, and camera behavior.
4. GSAP ScrollTrigger drives all section reveals, counters, and stagger effects to match the originals frame by frame.

---

## 📸 Screenshots

| Hero | Manifesto | Team |
|---|---|---|
| *(Add screenshot)* | *(Add screenshot)* | *(Add screenshot)* |

> Replace the placeholders above by dropping images into `docs/screenshots/` and updating the paths.

---

## 🙏 Credits

- Original design & concept: [Dala](https://dala.craftedbygc.com/) by [Crafted by GC](https://craftedbygc.com/)
- This project is a **front-end study clone** — not affiliated with or endorsed by Dala Technologies Limited.

---

## 📄 License

This repository is for educational and portfolio purposes only. All design rights belong to their respective owners.
