# Water Resource Site

Static multi-page site built with plain HTML, CSS, and JavaScript.

The project reproduces the visual style of the Nature-based Solutions Initiative page and includes a homepage plus placeholder pages for all header navigation items.

## Tech Stack

- HTML
- CSS
- JavaScript

No build step, package manager, or framework is required.

## Project Layout

```text
waterresources/
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── pages/
│   ├── about.html
│   ├── bibliography.html
│   ├── case-study-platform.html
│   ├── conferences.html
│   ├── education.html
│   ├── evidence-tool.html
│   ├── join-us.html
│   ├── knowledge-hub.html
│   ├── nbs-guidelines.html
│   ├── news.html
│   ├── outputs.html
│   ├── privacy-policy.html
│   ├── research.html
│   ├── support.html
│   └── team.html
├── index.html
├── README.md
└── .gitignore
```

## Pages

`index.html` is the homepage.

All additional navigation pages live in `pages/` and share the same layout:

- Research
- Outputs
- Education
- Team
- News
- About
- Join Us
- Support
- Bibliography
- Case Study Platform
- Knowledge Hub
- Evidence Tool
- NbS Guidelines
- Conferences
- Privacy Policy

## Run Locally

### Option 1: Open Directly

Open `index.html` in any browser.

On macOS:

```bash
open index.html
```

### Option 2: Use a Local Server

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

This option is better when you want to test navigation and asset loading in a browser environment closer to deployment.

## Edit the Site

- Update the homepage in `index.html`
- Update shared styles in `assets/css/styles.css`
- Update menu behavior in `assets/js/main.js`
- Update individual subpages in `pages/`

Because this is a static site, changes are reflected immediately after refreshing the browser.

## GitHub Workflow

Typical update flow:

```bash
git add .
git commit -m "Describe your change"
git push
```

Repository:

- [Water-Resource-Site](https://github.com/xiaoyugan-777/Water-Resource-Site)

## Deploy with GitHub Pages

1. Push the latest code to `main`.
2. Open the GitHub repository.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select branch `main`.
6. Select folder `/ (root)`.
7. Save.

After deployment, GitHub will provide a public Pages URL.

## Notes

- The project currently uses remote image URLs for some visual content.
- Navigation pages are set up and ready for content expansion.
- The layout is shared through one CSS file for easier maintenance.
