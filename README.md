# Water Resource Site

Static site replica based on the Nature-based Solutions Initiative page style.

## Project Structure

- `index.html`: homepage
- `styles.css`: shared styles
- `main.js`: mobile menu behavior
- `*.html`: additional navigation pages

## Run Locally

This project is a static website. You can run it in either of these ways.

### Option 1: Open Directly

Open [index.html](/Users/abby/Desktop/waterresources/index.html) in your browser.

On macOS:

```bash
open index.html
```

### Option 2: Run a Local Static Server

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Navigation Pages

The header navigation links point to separate static pages, for example:

- `research.html`
- `outputs.html`
- `education.html`
- `team.html`
- `news.html`
- `about.html`
- `join-us.html`
- `support.html`

These pages already share the same layout and can be filled with content later.

## Push to GitHub

If you already have this repo connected to GitHub:

```bash
git add .
git commit -m "Update site"
git push
```

## Deploy with GitHub Pages

1. Push the project to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select branch `main` and folder `/ (root)`.
7. Save.

After deployment, GitHub Pages will give you a public site URL.

## Notes

- This project does not require Node.js or npm.
- All pages are plain HTML, CSS, and JavaScript.
- To update the site, edit the HTML/CSS files and push again.
