# Recon Imports Website

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
