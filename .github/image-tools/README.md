# Website image build

Keep editing the website's existing HTML and original files in `assets/`.
The original `img src` paths remain the source of truth and the browser fallback.
GitHub Actions automatically creates smaller image copies, updates `srcset`,
and checks the initial image download budget before deploying both sites.

The image build uses lossless WebP encoding after resizing to the displayed
size at up to three times screen resolution. The team portraits have two
resolutions so high-density screens can select the larger copy. The favicon
uses a smaller PNG. No original image files are modified or deleted.

Generated filenames include their content hash, so Azure can cache them for
a year while an updated source image automatically gets a new URL.

Run the normal build with `bash .github/scripts/build-effects.sh`. Size profiles
live in `.github/scripts/build-images.cjs`. The committed manifest records
original hashes and generated file sizes. `node_modules/` is ignored and is
never part of the website source commit.
