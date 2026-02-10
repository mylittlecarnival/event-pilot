# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run db:reset:dev` - Fresh migration + seed for dev database (drops all, reruns migrations, seeds)
- `npm run db:push:dev` - Push migrations to dev database
- `npm run db:push:prod` - Push migrations to prod database
- `npm run db:seed:dev` - Run seed file on dev database
- `npm run db:new` - Create new migration file

### Environment Setup
Requires environment variables:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase anonymous key

**Stripe Payment Processing:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key

**Email Notifications (Mailgun):**
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Mailgun domain
- `MAILGUN_FROM_EMAIL` - Email sender address

**Application:**
- `NEXT_PUBLIC_SITE_URL` - Base URL for payment/approval links

## Architecture Overview

### Application Structure
Event Pilot is a Next.js 15 application using the App Router with TypeScript, Tailwind CSS, and Supabase for backend services.

**Core Technologies:**
- Next.js 15.5.2 with Turbopack
- TypeScript with strict mode
- Tailwind CSS 4.1.13 for styling
- Supabase for authentication and database
- Headless UI components for UI primitives
- Heroicons for iconography
- Lucide React icons for additional iconography
- Motion library for animations
- PDF generation (jsPDF, html2canvas)
- File storage and management
- Mailgun.js for email notifications
- Stripe for payment processing (@stripe/stripe-js, @stripe/react-stripe-js, stripe)
- @tanstack/react-table for advanced table features (expandable rows in requests page)

**Route Structure:**
- `src/app/(app)/` - Protected application routes requiring authentication
- `src/app/(auth)/` - Authentication routes (login, register, forgot-password)
- `src/app/api/` - API routes for server-side operations
- `src/app/approve/` - External estimate approval workflow routes
- `src/app/approve-invoice/` - External invoice approval workflow routes
- `src/app/invoice-payment/` - External invoice payment workflow routes
- `src/app/logout/` - Logout functionality

**Main Application Areas:**
- **Dashboard** - Main landing page (`/`)
- **Estimates** - Quote and estimate management (`/estimates`)
  - Individual estimate details (`/estimates/[id]`)
  - External approval workflow (`/approve/[id]`)
- **Invoices** - Invoice management (`/invoices`)
  - Individual invoice details (`/invoices/[id]`)
  - New invoice creation (`/invoices/new`)
  - Invoice refund functionality (`/invoices/[id]/refund`)
  - External invoice approval workflow (`/approve-invoice/[hash]`)
  - External invoice payment workflow (`/invoice-payment/[hash]`)
- **Requests** - Website request management (`/requests`)
  - Index page only (no individual request detail pages)
  - Expandable rows display full request details inline
  - Convert to estimate and delete functionality
- **Products** - Product/service catalog (`/products`)
  - Individual product details (`/products/[id]`)
  - New product creation (`/products/new`)
- **Contacts** - Customer contact management (`/contacts`)
  - Individual contact details (`/contacts/[id]`)
  - New contact creation (`/contacts/new`)
- **Organizations** - Company/organization management (`/organizations`)
  - Individual organization details (`/organizations/[id]`)
  - New organization creation (`/organizations/new`)
- **Activity Logs** - Audit trail and activity tracking (`/activity-logs`)
- **Settings** - Application configuration (`/settings`)
  - Address settings (`/settings/address`)
  - Disclosures management (`/settings/disclosures`)

### Component Architecture

**Layout Components:**
- `ApplicationLayout` - Main authenticated app layout with sidebar navigation
- `SidebarLayout` - Reusable sidebar layout wrapper
- `AuthLayout` - Authentication page layout

**Supabase Integration:**
- `src/lib/supabase/server.ts` - Server-side Supabase client with cookie handling
- `src/lib/supabase/client.ts` - Client-side Supabase client
- `src/lib/supabase/client-actions.ts` - Client-side database operations
- `src/lib/supabase/admin.ts` - Admin-level Supabase operations
- `src/lib/supabase/storage.ts` - File storage operations and management

**API Layer:**
- `src/lib/api/` - API abstraction layer for different entities
  - `organizations.ts` - Organization management operations
  - `contacts.ts` - Contact management operations
  - `products.ts` - Product catalog operations
  - `estimates.ts` / `estimates-server.ts` - Estimate management (client/server)
  - `estimate-approvals-server.ts` - Estimate approval workflow operations
  - `invoices.ts` / `invoices-server.ts` - Invoice management (client/server)
  - `invoice-approvals-server.ts` - Invoice approval workflow operations
  - `invoice-payments-server.ts` - Invoice payment workflow operations
  - `requests.ts` - Request management operations (client-side)
  - `activity-logs.ts` / `activity-logs-server.ts` - Activity tracking (client/server)
  - `disclosures.ts` / `disclosures-server.ts` - Disclosure management (client/server)
  - `settings.ts` - Application settings management
- Server components use server-side Supabase client
- Client components use client-side actions for data fetching

**API Routes:**
- `src/app/api/estimates/[id]/recalculate-service-fee/` - Calls stored procedure for service fee calculation
- `src/app/api/invoice-payment/create/` - Creates payment link for invoice
- `src/app/api/invoice-payment/create-payment-intent/` - Creates Stripe PaymentIntent
- `src/app/api/invoice-payment/process-payment/` - Processes completed payments
- `src/app/api/invoice-payment/[hash]/` - Retrieves payment details by hash

**Utility Libraries:**
- `src/lib/pdf-generator.ts` - PDF generation utilities for estimates/invoices
- `src/lib/actions.ts` - Shared server actions
- `src/lib/auth.ts` - Authentication utilities
- `src/lib/email/mailgun.ts` - Email integration with Mailgun
  - `sendEstimateApprovalEmail()` - Send estimate approval requests
  - `sendInvoiceApprovalEmail()` - Send invoice approval requests
  - `sendInvoicePaymentEmail()` - Send payment request emails
  - HTML and plain text templates with Outlook/Microsoft compatibility

**Component Library:**
The project includes a comprehensive set of reusable UI components in `src/components/`, built on Headless UI:
- Form components (input, textarea, select, checkbox, radio, switch, toggle)
  - All form inputs use primary color (#EB2426) for focus states
  - Focus indicators use border color change instead of rings
  - Consistent styling across all form elements
- Navigation components (navbar, sidebar, dropdown)
- Display components (table, badge, avatar, alert, description-list, stat, spinner, pagination)
- Layout components (dialog, fieldset, divider, stacked-layout, sidebar-layout)
- Data input components (combobox, listbox, time-picker, image-upload)
- Application-specific components:
  - `new-estimate-modal.tsx` - Modal for creating new estimates (simplified, no guest count/event type)
  - `new-invoice-modal.tsx` - Modal for creating new invoices
  - `approval-request-modal.tsx` - Modal for sending estimate approval requests
  - `invoice-approval-request-modal.tsx` - Modal for sending invoice approval requests
  - `disclosure-selection-modal.tsx` - Modal for selecting disclosures
  - `approval-disclosures.tsx` - Component for displaying estimate approval disclosures
  - `invoice-approval-disclosures.tsx` - Component for displaying invoice approval disclosures
  - `digital-signature.tsx` - Digital signature component for approvals
  - `stripe-payment-form.tsx` - Stripe Elements payment form with PaymentElement integration

**UI Patterns:**
- Placeholder images for missing featured images across products, estimates, and invoices
- Gradient backgrounds with camera icon for missing product images
- Consistent image placeholder design: `bg-gradient-to-br from-zinc-100 to-zinc-200`

### Development Patterns

**Authentication Flow:**
- Server-side authentication using Supabase with cookie-based sessions
- Protected routes wrapped in authentication checks via middleware
- Middleware excludes static assets (images, SVG, PNG, etc.) from auth checks
- Public assets accessible without authentication for login/approval pages
- User profile data loaded in layout components
- Logo component (`src/app/logo.tsx`) uses `/event-pilot.svg` for branding

**Data Fetching:**
- Server components use `createClient()` from `src/lib/supabase/server.ts`
- Client components use actions from `src/lib/supabase/client-actions.ts`
- API routes handle server-side operations
- Dual client/server API pattern for complex operations

**File Management:**
- Supabase Storage integration for file uploads
- PDF generation capabilities for estimates and invoices
- Image handling with html2canvas for document generation

**Activity Tracking:**
- Comprehensive audit logging system
- Activity logs track user actions across the application
- Server-side and client-side activity tracking patterns

**Disclosure Management:**
- Master disclosure templates in settings
- Estimate-specific disclosure snapshots for approvals
- Invoice-specific disclosure snapshots for approvals (separate from estimates)
- Disclosure approval workflow integrated with both estimate and invoice approvals
- Server-side disclosure management with full CRUD operations
- Automatic cleanup: resending approvals replaces existing disclosures to prevent duplicates
- Complete separation between estimate and invoice disclosure systems
- Disclosure selection modal integrated into both estimate and invoice approval requests
- Real-time disclosure approval tracking within approval workflows
- Settings-based disclosure template management with full CRUD operations

**Estimate Management:**
- New estimate items are automatically positioned at the first sort order (sort_order: 0)
- Existing items are shifted down when new items are added
- Consistent button styling across estimate interface
- Simplified new estimate modal (removed guest count and event type fields)

**Invoice Management:**
- Invoice items can be reordered via drag-and-drop functionality
- Database constraints prevent modifications to paid invoices
- Invoice status synchronization via PostgreSQL triggers
- Complete invoice approval workflow matching estimate functionality
- PDF generation capabilities for invoices
- Receipt section displays approval signatures and verification details
- Invoice status includes 'Cancelled' option for duplicate invoice management
- Comprehensive invoice creation modal with all necessary fields

**Estimate Approval Workflow:**
- External approval pages accessible via unique hash URLs (`/approve/[hash]`)
- Digital signature collection with metadata (IP address, geolocation, timestamp, user agent)
- Comprehensive approval receipt display showing signature data and verification details
- Email notifications via Mailgun integration
- Approval status tracking with activity logging
- Most recent approval displayed first (ordered by created_at desc)
- Clean approval experience without testing artifacts or visual glitches
- Signature approval receipt section integrated into estimate details page
- Real-time approval status updates and signature verification

**Invoice Approval Workflow:**
- External invoice approval pages accessible via unique hash URLs (`/approve-invoice/[hash]`)
- Complete parity with estimate approval functionality
- Digital signature collection identical to estimate workflow
- Invoice-specific disclosure management (separate from estimates)
- Automatic invoice status updates via database triggers
- Receipt section shows approval signatures and parsed signature details
- Email notifications and activity logging for invoice approvals
- Dedicated invoice approval request modal with disclosure integration
- Real-time signature validation and geolocation metadata collection
- Approval state management with proper loading and error handling

**Invoice Payment Workflow:**
- External payment pages accessible via unique hash URLs (`/invoice-payment/[hash]`)
- Stripe integration using Stripe Elements and PaymentElement
- Server-side PaymentIntent creation via API routes
- Client-side payment collection without redirects
- Real-time form validation and error handling
- Payment status automatically updates invoice via database triggers
- Email notifications sent via Mailgun when payment links are created
- Payment metadata tracking (transaction IDs, payment methods, timestamps)
- Activity logging for all payment-related actions
- Secure payment processing with PCI compliance through Stripe
- Support for multiple payment methods through Stripe Elements
- Automatic redirect from invoice approval to payment page with absolute URL handling

**Request Management:**
- Website request submission tracking and management (`/requests`)
- Index page only with no individual detail pages (all details shown in expandable rows)
- Table uses exact styling as estimates page (`src/components/table.tsx`)
- Expandable rows display comprehensive request information:
  - Contact Information (name, email, phone, organization, referred by)
  - Event Details (date, time, type, guest count)
  - Event Location (full address with street, city, state, zip, county)
  - Requested Items (products with descriptions and quantities)
  - Notes
- Two status values: **Pending** (default, yellow badge) and **Accepted** (green badge)
- Action buttons in expandable section:
  - **Convert to Estimate** - Standard button (logic to be implemented)
  - **Delete Request** - Red button with `color="red"`
- Request data includes relationship to products via `request_items` table
- Uses @tanstack/react-table for expandable row functionality
- Text wrapping handled with `min-w-0`, `flex-shrink-0`, and `text-wrap` utilities
- Chevron icons from lucide-react for expand/collapse indicators

**Email Integration:**
- Mailgun integration for all external communications
- Three email types with dedicated templates:
  - Estimate approval requests
  - Invoice approval requests
  - Invoice payment requests
- Table-based button layout for maximum email client compatibility
- Buttons work across Gmail, Outlook (Windows/Mac), and Apple Mail
- Fallback text links displayed below buttons with full URLs
- HTML templates with Outlook/Microsoft 365 VML compatibility
- Plain text fallback for all email types
- Dynamic content based on event details and custom messages
- Sender configuration via environment variables

**Stripe Payment Integration:**
- Server-side PaymentIntent creation for security
- Client-side payment collection using Stripe Elements
- PaymentElement for unified payment method support
- No redirect flow - all payment handling on single page
- Real-time validation and error handling
- Automatic payment status updates via webhooks/API
- PCI compliance handled by Stripe

**Styling:**
- Tailwind CSS 4.x with TypeScript configuration (`tailwind.config.ts`)
- Dark mode support (class-based, manual control via `darkMode: 'class'`)
- Component-based styling patterns
- Primary brand color: `#EB2426` (red) defined in CSS variables
- Custom focus states using primary color instead of default blue
- Border-based focus indicators (ring-0) on all form inputs
- Consistent color scheme using CSS variables mapped to Tailwind utilities
- Motion library integration for smooth animations
- shadcn/ui compatible theme configuration with CSS variable system
- Placeholder images for missing product/item images with gradient backgrounds

**TypeScript Configuration:**
- Strict TypeScript with ES2017 target
- Path alias `@/*` maps to `src/*`
- Next.js plugin for enhanced TypeScript support
- Tailwind CSS config uses TypeScript (`tailwind.config.ts`) with type safety
- Centralized type definitions in `src/types/`
  - `activity-logs.ts`
  - `estimates.ts`
  - `invoices.ts`
  - `requests.ts` - Request and RequestItem interfaces
  - `disclosures.ts`
  - `estimate-approvals.ts`
  - `invoice-approvals.ts`
  - `invoice-payments.ts`

### Database Implementation Notes

**PostgreSQL Triggers:**
- `sync_estimate_status()` function automatically updates estimate status when estimate_approvals change
- `sync_invoice_status()` function automatically updates invoice status when invoice_approvals change
- Triggers handle INSERT/UPDATE/DELETE operations on approval tables
- Status synchronization ensures UI and database consistency
- Database constraints prevent modifications to paid invoices via `trg_invoice_items_lock_after_paid`

**PostgreSQL Stored Procedures:**
- `update_service_fee_for_estimate()` - Recalculates service fees for estimates
- Called via API route `/api/estimates/[id]/recalculate-service-fee`

**Database Schema:**
- `disclosures` - Master disclosure templates for settings
- `estimate_disclosures` - Unified disclosure tracking for both estimates and invoices
- `estimate_approvals` - Estimate approval tracking with signature metadata
- `invoice_approvals` - Invoice approval tracking with signature metadata
- `invoice_payments` - Payment tracking with Stripe integration
- `requests` - Website request submissions tracking
- `request_items` - Items requested per request with product references
- Additional tables: `estimates`, `invoices`, `contacts`, `organizations`, `products`, `activity_logs`

**Migrations:**
- `/src/lib/database/migrations/001_create_disclosures.sql`
  - Creates `disclosures` table for master templates
  - Creates `estimate_disclosures` table supporting both estimates and invoices
  - Includes RLS policies, indexes, and default disclosure data
  - Supports disclosure snapshots to preserve content even if templates change

**Type System Updates:**
- Invoice status uses TEXT type instead of enum for flexibility
- Database functions updated to handle TEXT-based status values
- Consistent with estimate status handling patterns

### File Naming Conventions
- React components use kebab-case filenames
- API routes follow Next.js App Router conventions
- Server actions and utilities use descriptive naming
- Page files use Next.js page.tsx convention