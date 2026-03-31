# Water Resource Site

Static multi-page website built with plain HTML, CSS, and JavaScript.

This project is a customized site based on the visual style of the Nature-based Solutions Initiative page. It now includes:

- a homepage for `CIROH-NbS InEvalTool`
- a shared navigation and footer across pages
- a `Partners` dropdown menu
- a `Tool` navigation page
- a customized contact/footer section for UH Manoa / Oleson Lab

## Weekly Progress

Use this section to record what was completed each week.

### Week 1

- Built the website template and shared multi-page layout
- Customized navigation labels and project-specific buttons
- Added the `Partners` dropdown menu and section-based navigation
- Built and formatted the `Partners` page content
- Replaced the homepage hero image with the project image
- Updated the footer contact information and organization labels

### Week 2

- Worked on:
- Updated:
- Fixed:
- Next step:


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

This project is a static website. That means there is nothing to install just to view it.

If someone has no coding experience, use the steps below.

### Easiest Way: Download ZIP from GitHub and Open It

1. Open the GitHub repository in a browser:
   [Water-Resource-Site](https://github.com/xiaoyugan-777/Water-Resource-Site)
2. Click the green `Code` button.
3. Click `Download ZIP`.
4. Wait for the ZIP file to finish downloading.
5. Find the ZIP file in the `Downloads` folder.
6. Double-click the ZIP file to unzip it.
7. Open the unzipped folder named something like `Water-Resource-Site-main`.
8. Find the file named `index.html`.
9. Double-click `index.html`.
10. The website should open in the browser.

### Better Way: Open It with a Local Server

This method is better because navigation and images usually behave more reliably.

1. Download the project using the ZIP steps above.
2. Open the unzipped project folder.
3. Open Terminal.
4. Type `cd ` and then drag the project folder into the Terminal window.
5. Press `Enter`.
6. Run:

```bash
python3 -m http.server 8000
```

7. Open a browser and go to:

```text
http://localhost:8000
```

8. You should now see the homepage.

### For People Who Already Know Git

They can also use:

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

- Make sure the file you open is `index.html`
- Make sure you are inside the correct project folder
- If `python3` does not work, Python may not be installed
- If the browser shows an old version, refresh the page

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
