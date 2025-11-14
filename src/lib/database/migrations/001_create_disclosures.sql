-- Create disclosures table for managing master disclosure templates
CREATE TABLE disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_email VARCHAR(255),
  updated_by_email VARCHAR(255)
);

-- Create estimate_disclosures table for tracking disclosure approvals per estimate/invoice
CREATE TABLE estimate_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NULL,
  disclosure_id UUID REFERENCES disclosures(id) NULL, -- NULL for custom disclosures
  contact_id UUID REFERENCES contacts(id),

  -- Snapshot fields (preserved even if original disclosure changes)
  disclosure_title VARCHAR(255) NOT NULL,
  disclosure_content TEXT NOT NULL,

  -- Approval tracking
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ NULL,

  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT estimate_or_invoice_required CHECK (
    (estimate_id IS NOT NULL AND invoice_id IS NULL) OR
    (estimate_id IS NULL AND invoice_id IS NOT NULL)
  )
);

-- Add indexes for performance
CREATE INDEX idx_disclosures_active ON disclosures(is_active, sort_order);
CREATE INDEX idx_estimate_disclosures_estimate_id ON estimate_disclosures(estimate_id);
CREATE INDEX idx_estimate_disclosures_invoice_id ON estimate_disclosures(invoice_id);
CREATE INDEX idx_estimate_disclosures_contact_id ON estimate_disclosures(contact_id);

-- Add RLS policies
ALTER TABLE disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_disclosures ENABLE ROW LEVEL SECURITY;

-- Policies for disclosures (admin only for create/update, read for authenticated users)
CREATE POLICY "Users can view active disclosures" ON disclosures
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage disclosures" ON disclosures
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies for estimate_disclosures
CREATE POLICY "Users can view estimate disclosures" ON estimate_disclosures
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage estimate disclosures" ON estimate_disclosures
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert some default disclosures
INSERT INTO disclosures (title, content, sort_order) VALUES
('Liability Waiver', 'By approving this estimate, you acknowledge that our company is not liable for any damages, injuries, or losses that may occur during the event. Participants engage in activities at their own risk.', 1),
('Weather Policy', 'In case of inclement weather, we will work with you to reschedule or modify the event. If cancellation is necessary due to weather conditions beyond our control, a rescheduling fee may apply.', 2),
('Damage Policy', 'You are responsible for any damage to our equipment or property caused by you, your guests, or event participants. Damage costs will be assessed and billed separately.', 3),
('Age Requirements', 'All participants must meet minimum age requirements for activities as specified in this estimate. Adult supervision is required for minors at all times.', 4),
('Payment Terms', 'A deposit is required to secure your booking. Final payment is due before event setup begins. Late payments may result in service delays or cancellation.', 5);