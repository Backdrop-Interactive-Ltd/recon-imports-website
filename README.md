# Recon Imports Website

## Local development

For this existing local installation, run:

```powershell
npm run dev:local
```

This verifies or starts the existing PostgreSQL 18 cluster in `.local/postgres`,
waits for `recon_local` at loopback port 54329, then starts Next.js. It never
initializes a cluster, creates a database, migrates, seeds, or resets records.
Repeat this command after closing VS Code or restarting the computer. PostgreSQL
runs independently of the terminal; closing Next.js does not remove its data.

`npm run dev` remains available for Next.js alone. `npm run db:local` now only
starts/verifies the existing persistent cluster and exits. If startup reports a
live but unavailable cluster, mismatched identity, missing files, or incorrect
credentials, investigate the error and `.local/postgres-startup.log`; do not reset
the cluster or delete its PID file. A fresh checkout needs separately authorized
database provisioning or a verified backup restore before these commands work.

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

### Existing Git repository

The original repository is https://github.com/Backdrop-Interactive-Ltd/recon-imports-website.
Its history has been recovered in this workspace. Do not initialize a new repository
or replace this folder with another checkout. Local completed development is
preserved on the recovery/local-development-2026-11 branch; main retains the
original history. Commits on the recovery branch are local until separately reviewed
and authorized for a push.

Use git status, git diff and git log to inspect the checkpoint. Review changes,
backups, branch strategy and deployment requirements before any future push or merge.
Do not use a hard reset or Git cleanup to resolve local differences.

.gitignore excludes environment files except the template, .local/, uploaded media,
compiler caches, copy sidecars, database archives and common secret/key files.
The generated Prisma client remains tracked because this application imports it
and installation does not yet guarantee automatic generation. Schema, migrations
and required configuration remain tracked. Store database backups, uploads and
credentials separately; Git does not back up database records or ignored assets.

Modern premium car showroom and inventory management platform built with **Next.js**, featuring a fully custom backend CMS, dynamic vehicle management, homepage content controls, lead management, and admin dashboard functionality.

---

# Live Website

🌐 https://reconimports.com

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
