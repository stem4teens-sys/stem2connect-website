# Updating the hackathon website

Keep using this repository and its `main` branch as before.

- Edit `hackathon/index.html` for hackathon content and links.
- Edit `hackathon/styles.css` for hackathon styling.
- Shared fonts, images, and animation files stay in their existing locations.
- Commit the changes to `main`. GitHub Actions publishes the main site and
  the hackathon app automatically. Check both deployment runs in **Actions**.

The hackathon workflow packages the existing page at its own site's root,
includes shared assets, and makes its home links point back to the main site.
There is no second copy of the page to edit and no manual Azure upload.
The existing main-site workflow and `/hackathon/` page continue to work.

The added 3D effects and styles are compiled automatically by both workflows.
Keep editing their source files; generated `assets/runtime/` and
`enhancements.css` do not need manual editing.

For a local check, first run `bash .github/scripts/build-effects.sh`, then
run `python3 .github/scripts/build-hackathon.py`, then
`python3 -m http.server 4177 --directory .github/.build/hackathon`.
The output directory is generated and ignored by Git. The build refuses to
overwrite an existing output directory; use a new `--output` path for a repeat
local build, or remove only the previous generated output before rebuilding.

Azure and the domain's DNS provider are needed only for initial domain setup
or later changes to hosting/domain settings. Routine content edits stay in GitHub.
