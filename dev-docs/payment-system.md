# Invoice Payment System Implementation Instructions

## Overview
This document outlines the implementation of a new invoice payment system that separates invoice approval from payment processing. The system maintains the existing approval workflow while adding a dedicated payment flow with Stripe integration.

## Current Flow (DO NOT CHANGE)
1. User approves invoice
2. Shows "Invoice Approved" confirmation
3. `invoice_approvals.status` updates to "approved"
4. Supabase trigger updates `invoice.status` to match `invoice_approvals.status`

## New Payment Flow (TO BE ADDED)
1. After invoice approval confirmation, redirect user to payment screen
2. Payment screen is a hash-based one-time-use page (similar to invoice_approvals)
3. User completes payment via Stripe
4. Payment status is tracked and updated in database
5. Payment link becomes invalid after successful payment

## Database Schema Changes

### Option 1: Add payment_status column to invoices table
```sql
ALTER TABLE invoices 
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid'));
```

### Option 2: Create separate invoice_payments table (RECOMMENDED)
```sql
CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payment_hash VARCHAR(255) UNIQUE NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add payment_status to invoices for quick access
ALTER TABLE invoices 
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid'));

-- Create index for performance
CREATE INDEX idx_invoice_payments_hash ON invoice_payments(payment_hash);
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
```

## Supabase Triggers

### Update invoice payment_status trigger
```sql
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update invoice payment_status when payment is completed
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE invoices 
        SET payment_status = 'paid', updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();
```

## Page Structure

### 1. Create invoice-payment page
**File:** `app/invoice-payment/[hash]/page.tsx`

**Features:**
- Hash-based URL similar to invoice_approvals
- One-time use functionality
- Stripe payment integration
- Full payment only (no partial payments)
- Show "Invoice Paid" when payment is complete or link is expired

**Reference:** Use `app/invoice_approvals/[hash]/page.tsx` as template for:
- Hash validation logic
- One-time use implementation
- Confirmation page structure
- Error handling

### 2. Update invoice approval flow
**File:** Current invoice approval confirmation page

**Changes:**
- After showing "Invoice Approved", redirect to payment page
- Generate payment hash and create invoice_payments record
- Pass invoice details to payment page

### 3. Update invoice display page
**File:** `app/invoices/[id]/page.tsx`

**Changes:**
- Add payment status badge next to existing status in header
- Badge should show "Paid" or "Unpaid" based on `invoice.payment_status`
- Style badge to complement existing status display

## Implementation Steps

### Phase 1: Database Setup
1. [ ] Create `invoice_payments` table with required fields
2. [ ] Add `payment_status` column to `invoices` table
3. [ ] Create Supabase trigger for payment status updates
4. [ ] Test database schema changes

### Phase 2: Payment Page Creation
1. [ ] Create `app/invoice-payment/[hash]/page.tsx`
2. [ ] Implement hash validation (reference invoice_approvals logic)
3. [ ] Add Stripe payment integration
4. [ ] Implement one-time use functionality
5. [ ] Create payment confirmation/completion state
6. [ ] Add error handling for invalid/expired hashes

### Phase 3: Integration
1. [ ] Update invoice approval flow to redirect to payment page
2. [ ] Generate payment hash and create invoice_payments record on approval
3. [ ] Update invoice display page to show payment status badge
4. [ ] Test end-to-end flow

### Phase 4: Testing
1. [ ] Test invoice approval → payment flow
2. [ ] Test payment completion and status updates
3. [ ] Test one-time use hash functionality
4. [ ] Test payment status badge display
5. [ ] Test edge cases (expired hashes, failed payments, etc.)

## Key Requirements

### Payment Page Requirements
- **Full payments only** - no partial payment functionality
- **One-time use** - hash becomes invalid after payment
- **Stripe integration** - handle payment processing
- **Error states** - handle failed payments, expired links
- **Confirmation** - show "Invoice Paid" after completion

### UI/UX Requirements
- **Separate processes** - approval and payment are distinct steps
- **Status badge** - clearly show payment status alongside approval status
- **User flow** - smooth transition from approval to payment
- **Feedback** - clear status indicators throughout process

### Security Requirements
- **Hash validation** - secure, non-guessable payment URLs
- **One-time use** - prevent replay attacks
- **Payment verification** - verify payment completion with Stripe
- **Access control** - ensure only authorized users can access payment pages

## Reference Files
- `app/invoice_approvals/[hash]/page.tsx` - for hash-based page structure
- Current invoice approval confirmation flow
- `app/invoices/[id]/page.tsx` - for adding payment status badge
- Existing Stripe integration patterns in the codebase

## Notes
- Maintain backward compatibility with existing approval system
- Ensure payment status is always in sync with actual payment state
- Consider adding payment history/audit trail if needed
- Payment amounts should match invoice totals exactly
- Handle currency formatting consistently with existing invoice display