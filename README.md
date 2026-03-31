# Water Resource Site

Static multi-page website built with plain HTML, CSS, and JavaScript.

This project is a customized site based on the visual style of the Nature-based Solutions Initiative page. It now includes:

- a homepage for `CIROH-NbS InEvalTool`
- a shared navigation and footer across pages
- a `Partners` dropdown menu
- a `Tool` navigation page
- a customized contact/footer section for UH Manoa / Oleson Lab

## Tech Stack

- HTML
- CSS
- JavaScript

No framework, package manager, or build step is required.

## Project Layout

```text
waterresources/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   └── partners-tool-demo.png
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
│   ├── strategic-partners.html
│   ├── support.html
│   ├── team.html
│   ├── technical-partners.html
│   └── tool.html
├── index.html
├── README.md
└── .gitignore
```

## Main Pages

- `index.html`: homepage
- `pages/research.html`: Partners page
- `pages/tool.html`: Tool page
- `pages/evidence-tool.html`: CIROH-NbS InEvalTool placeholder page

## Navigation Notes

The top navigation includes:

- Partners
- Outputs
- Education
- Team
- News
- About
- Join Us
- Tool
- Support

The `Partners` menu includes a dropdown with:

- Strategic partners
- Technical partners
- aina group

These dropdown items currently jump to sections inside:

- `pages/research.html`

## Partners Page

The Partners page currently contains three sections:

- Strategic partners
- Technical partners
- aina group

Each section is styled as a simple single-column table so it can later be expanded into a fuller table layout.

## Tutorial: How to Open and View This Website

This project is a static website. That means there is no app to install and no coding knowledge is required just to view it.

There are two easy ways to open it.

### Method 1: Open the Homepage File Directly

This is the easiest method for someone who just wants to quickly look at the site.

1. Download or clone the repository to your computer.
2. Open the project folder.
3. Find the file named `index.html`.
4. Double-click `index.html`.
5. The website should open in your default browser.

On macOS, you can also open it from Terminal with:

```bash
open index.html
```

### Method 2: Run a Simple Local Server

This is the recommended method because page links and assets usually behave more reliably this way.

1. Open Terminal.
2. Move into the project folder:

```bash
cd Water-Resource-Site
```

3. Start a local server:

```bash
python3 -m http.server 8000
```

4. Open a browser and go to:

```text
http://localhost:8000
```

5. You should now see the homepage.

### If Someone Else Wants to View the Site

If another person has the repository link, they can do:

```bash
git clone https://github.com/xiaoyugan-777/Water-Resource-Site.git
cd Water-Resource-Site
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### If the Website Does Not Open

- Make sure you are inside the correct project folder
- Make sure `index.html` exists
- If `python3` does not work, check whether Python is installed
- If a browser page is blank, refresh it once

## Edit the Site

- Homepage content: `index.html`
- Shared styling: `assets/css/styles.css`
- Shared menu behavior: `assets/js/main.js`
- Subpages: `pages/`
- Homepage image: `assets/images/partners-tool-demo.png`

After editing, refresh the browser to see the changes.

## Weekly Progress

Use this section to record what was completed each week.

### Week of 2025-03-24

- Worked on: established the website template
- Updated: replaced several buttons and labels with project-specific information
- Updated: updated the Contact section
- Updated: added the Partners dropdown menu
- Updated: built and updated the Partners page
- Updated: replaced the homepage hero image
- Fixed:
- Next step:

### Week of [YYYY-MM-DD]

- Worked on:
- Updated:
- Fixed:
- Next step:

## Footer / Contact

The footer is currently customized to:

- Oleson Lab
- Department of Natural Resources and Environmental Management at UH Manoa
- 1910 East-West Rd Room 101
- Honolulu, HI 96822
- `koleson@hawaii.edu`

Copyright text:

- `© 2025 Oleson Ecological Economics Lab, UH Manoa`

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
2. Open the repository on GitHub.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select branch `main`.
6. Select folder `/ (root)`.
7. Save.

GitHub will then provide a public Pages URL.

## Notes

- The homepage hero image is stored locally in `assets/images/partners-tool-demo.png`.
- The site is fully static and does not require Node.js or npm.
- Several pages are still placeholders and can be filled with final content later.
