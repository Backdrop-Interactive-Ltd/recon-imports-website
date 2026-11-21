# Recon Imports Website

## Development and hosting policy

Development continues locally; GitHub is the reviewed source-code backup. Future
production hosting is planned for a LimdaHost VPS. Keep the existing Cloudflare
website unchanged until a separately approved migration. The owner reports the
Worker GitHub Builds connection is disconnected; do not reconnect it or run
Cloudflare deployment commands. Pushes and production changes require separate authorization.

## Retained Cloudflare Workers tooling

See [DEPLOY-04B setup and verification](docs/deployment/deploy-04b-workers.md).
`npm run build:workers` creates an isolated, sanitized OpenNext artifact;
`npm run preview:workers` runs it locally. These commands do not deploy.
The standard Next.js development, build and Node/VPS commands remain available.

## Local development

For this existing local installation, run:

```powershell
npm run dev
```

This verifies or starts the existing PostgreSQL 18 cluster in `.local/postgres`,
waits for `recon_local` at loopback port 54329, then starts Next.js. It never
initializes a cluster, creates a database, migrates, seeds, or resets records.
Repeat this command after closing VS Code or restarting the computer. PostgreSQL
runs independently of the terminal; closing Next.js does not remove its data.

`npm run dev:local` remains an equivalent alternative. Both commands verify local
database readiness before Next.js and stop on database errors. `npm run db:local` only
starts/verifies the existing persistent cluster and exits. If startup reports a
live but unavailable cluster, mismatched identity, missing files, or incorrect
credentials, investigate the error and `.local/postgres-startup.log`; do not reset
the cluster or delete its PID file. A fresh checkout needs separately authorized
database provisioning or a verified backup restore before these commands work.

For a fresh clone, run `npm ci` with development dependencies installed; this
creates the ignored Prisma client. Supply private environment configuration using
`.env.example` as a guide, then arrange separately authorized PostgreSQL 18
provisioning or a compatible verified restore and required local media. A source
checkout contains no database records or accounts. Never substitute production
credentials for the local database. The automatic cluster-start helper requires
Windows x64. Linux VPS startup will use a separately managed database connection
and `npm run build` / `npm start`, with configuration reviewed before migration.

Open http://localhost:3000/admin/login and use `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `.env`. Database files persist in `.local/postgres`.
This database is for local development and is separate from the live website.

Keep `.env`, the PostgreSQL database, and `public/uploads` backed up separately
from source control. Use PostgreSQL-aware backups rather than copying a running
cluster. Restore uploaded files with the matching database references. Never
delete these directories as part of a restart, build, or dependency reinstall.
Use durable database/media storage for deployment; local uploads are not synced
to Cloudinary automatically.

In Site Settings, wait for uploads to complete, then click **Save Site Settings**.
An upload confirmation alone does not save the logo/favicon selection. On a
database loading error the settings form is disabled instead of showing editable
fallback branding. Public fallback content remains available during outages.

Disposable EID/DATA runner builds use `.local/builds/<task>` and restore recognized
Next-generated type-metadata changes. They do not replace normal `.next` output.
Do not use an isolated test build as the normal website build. Before `npm start`,
create a normal build against the intended verified database. Test-only settings
and uploads remain in task-specific `.local/` storage.

### Standard local URL and EID-04 testing

All supported development commands use **http://localhost:3000** for Next.js and
NextAuth. Only one development server may use this URL at a time. Startup checks
both IPv4 and IPv6 listeners. It asks you to type **STOP** before stopping verified
RECON Next.js development conflicts; unrelated/unverified processes cause refusal.
PostgreSQL and terminal/editor processes are never selected for termination.

For employee UI testing against the already-provisioned disposable EID-04 target:

```powershell
node scripts/eid04-disposable.mjs dev
```

This verifies the private EID-04 manifest/marker and selects the restricted runtime
connection without using the owner's `.env` database URL. It does not create,
reset, seed or migrate databases. The disposable PostgreSQL instance must already
be available. Open http://localhost:3000/admin/login?callbackUrl=/admin/employees.
Use synthetic disposable test credentials only in that isolated mode. Normal
`npm run dev` uses `recon_local`, whose twelve migrations, including the employee
migrations, were verified in RCI-CF-CPU-04. Ordinary Team CMS development uses the
original local environment; disposable mode remains an explicit testing alternative.

### Existing Git repository

The original repository is https://github.com/Backdrop-Interactive-Ltd/recon-imports-website.
Its history has been recovered in this workspace. Do not initialize a new repository
or replace this folder with another checkout. Local completed development is
preserved on local `main`, which retains the original history and tracks
`origin/main`. Review each completed task, run checks and create a local commit.
Push reviewed commits only after owner authorization and confirmation that no
automatic deployment connection remains active.

Use git status, git diff and git log to inspect the checkpoint. Review changes,
backups, branch strategy and deployment requirements before any future push or merge.
Do not use a hard reset or Git cleanup to resolve local differences.

.gitignore excludes environment files except the template, .local/, uploaded media,
compiler caches, copy sidecars, database archives and common secret/key files.
The generated Prisma client is created automatically by npm install/npm ci and
before every production build; keep build dependencies installed in the build job.
Its generated output, Next type declarations and runtime caches are ignored.
Schema, migrations and required configuration remain tracked. Store database backups, uploads and
credentials separately; Git does not back up database records or ignored assets.

Modern premium car showroom and inventory management platform built with **Next.js**, featuring a fully custom backend CMS, dynamic vehicle management, homepage content controls, lead management, and admin dashboard functionality.

---

# Live Website

https://www.reconimports.com
---

# Features

## Public Website
- Dynamic homepage hero slider
- Vehicle category carousel
- Featured vehicle showcase
- Dynamic stock listings
- Vehicle detail pages
- Brand-based browsing
- Responsive premium UI
- Smooth animations and interactions
- Dynamic site settings
- SEO-ready structure
- Optimized Cloudinary image delivery
- Mobile responsive layout

---

## Vehicle Inventory System
- Add/Edit/Delete vehicles
- Multiple vehicle images
- Featured vehicles
- Published/unpublished controls
- Vehicle specifications
- Fuel/transmission/body type support
- Suggested related vehicles
- Dynamic stock filtering

---

## Admin Dashboard
Protected admin panel with authentication.

### Admin Features
- Dashboard overview
- Brand management
- Vehicle category management
- Vehicle inventory management
- Homepage hero slider management
- Site settings CMS
- Media library
- Admin user management
- Newsletter management
- Sell car lead management
- Requirement lead management
- Auction sheet request management

---

# Homepage CMS Features

## Editable Homepage Sections
- Hero slider
- Vehicle categories
- Featured deals section
- Brand showcase
- Contact/footer information
- Social media links
- Theme colors
- Logos & favicon

---

# Forms & Lead Management

## Sell Your Car
Customers can submit:
- Vehicle details
- Images
- Contact information

## Send Requirements
Customers can submit:
- Desired vehicle requirements
- Budget expectations
- Preferred specifications

## Verify Auction Sheet
Includes:
- Manual payment verification
- Payment method tracking
- Transaction ID storage
- Admin approval workflow

---

# Authentication & Security
- Auth.js / NextAuth authentication
- Protected admin routes
- Secure password hashing with bcrypt
- Zod validation
- Server-side admin protection
- Cloudinary secure uploads

---

# Tech Stack

## Frontend
- Next.js 16
- React 19
- TypeScript
- CSS Modules
- Responsive CSS

## Backend
- Prisma ORM
- PostgreSQL
- Auth.js / NextAuth
- Zod Validation

## Media & Uploads
- Cloudinary
- Automatic image optimization
- WebP/AVIF delivery

## Deployment
- VPS Hosting
- PM2
- Nginx
- Cloudflare

---

# Image Optimization
All uploaded images are automatically optimized using Cloudinary:

- `f_auto`
- `q_auto`

This enables:
- WebP/AVIF delivery
- Faster page loading
- Better SEO performance
- Reduced bandwidth usage

---

# Admin CMS Capabilities

## Dynamic Site Settings
Manage:
- Logo
- Favicon
- Contact details
- Social links
- Footer content
- Theme colors
- SEO defaults

## Vehicle Categories
Manage:
- Category name
- Description
- Images
- Routes
- Homepage visibility
- Icons

---

# Project Structure

```bash
app/
admin/
components/
lib/
prisma/
public/
