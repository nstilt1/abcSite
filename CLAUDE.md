@AGENTS.md

# Project Context & Reference Architecture
This project (Folder A: `abc/frontend`) is a TypeScript/Next.js application managed with Bun. It is being built by referencing two legacy/alternative JavaScript/Node projects:

Reference Admin: ../../hyperformance_dashboard/frontend (JS/Node/Next.js)

Reference User: ../../hyperformancesolutions/frontend (JS/Node/Next.js)

**Actionable Rule**: When creating components in abc/frontend, mirror the UI/UX patterns of the reference folders but **strictly convert all logic to TypeScript and ensure compatibility** with the Bun runtime.

## Technical Stack
* **Frontend**: Next.js (App Router), TypeScript, Bun, Tailwind CSS, Shadcn UI.

* **Backend**: Rust Workspace (in ../backend).

* **Data Persistence**: JSON files stored in AWS S3/Cloudfront.

* **Build System**: AWS Amplify. At build time, S3 content is synced to src/content/* and JSON is baked into the static source.

## Data Workflow (Admin & Build)
1. **Admin Fetch**: Fetch JSON from Cloudfront using ?t={timestamp} to bypass cache.

2. **State Management**: Edits/New items are saved to Local Storage until deployment.

3. **Deployment**:

  * `POST` request sends modified JSONs to S3.

  * Trigger AWS Amplify rebuild.

  * **Build-time**: Tiptap JSON is compiled to HTML; JSON files are imported directly into the bundle (no client-side S3 fetching for users).

## Content Models & Type Definitions
1. Downloads (`downloads.json`)
*Note: This is the primary source for Software Products.*

* Generic Fields: `name`, `slug`, `tiptap` (HTML), `thumbnailUrl`, `heroImageUrl`, `shortDescription`, `dateAdded`, `version`, `visible` (default true), `sourceCodeUrl?`.

* `downloadInfo`:

  * Type A: `allPlatformsDownloadLink`, `allPlatformsDownloadSha256`

  * Type B: Platform-specific links/hashes (Windows, macOS, Linux).

* `software_licensor` (SoftwareLicensorAttributes):

  * `software_licensor_product_id`: string

  * `software_licensor_license_types`: Map<string, string> (e.g., "Perpetual": "price_id"). Use Stripe-compatible price formats.

2. Products (products.json)
Software Type: Dynamically derived from downloads.json where software_licensor != null.

Inventoried Type: Includes stock: number. Display "Out of Stock" if 0.

API Driven Type: Includes endpointURL, sourceImage. Uses WASM/WGPU for real-time hue/sat shader previews on scaled-down images.

3. Web Apps & Blogs
Web Apps: name, shortDescription, thumbnailUrl, heroImageUrl, tiptap, urls[], sourceCodeLink.

Blogs: slug, name, shortDescription, tiptap, keywords[], date.

UI & Routing Requirements
Layout: All galleries (Downloads, Shop, Blogs, Web Apps) must use 3-column grids.

Shop Page Hierarchy:

"Software" section (Rows of 3, sourced from downloads.json).

"Physical Goods" section (Rows of 3, sourced from products.json).

Dynamic Routes:

/downloads/[slug]

/products/[slug]

/blogs/[slug]

/webapps/[slug]

E-commerce & Cart Logic
Authentication: Required for "Add to Cart".

Validation:

No duplicate licenses (Check get_license() before checkout).

If a user owns Product id X (Perpetual), they cannot add it again.

Performance: Cache validation errors in Local Storage to prevent redundant API calls unless the cart changes.

Cart Constraints: Maximum of one license per software item in cart.