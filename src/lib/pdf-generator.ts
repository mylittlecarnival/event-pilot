'use client'

import jsPDF from 'jspdf'
import type { Estimate, EstimateItem } from '@/types/estimates'

export interface PDFGenerationOptions {
  estimate: Estimate
  estimateItems: EstimateItem[]
  message?: string
}

export async function generateEstimatePDF(options: PDFGenerationOptions): Promise<Blob> {
  const { estimate, estimateItems, message } = options

  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let yPosition = 30

  // Helper function to add text with word wrapping
  const addText = (text: string, x: number, y: number, maxWidth?: number) => {
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth)
      pdf.text(lines, x, y)
      return y + (lines.length * 6)
    } else {
      pdf.text(text, x, y)
      return y + 6
    }
  }

  // Header Section - matching approve page
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  addText('Estimate Approval Request', pageWidth / 2, yPosition, undefined)

  yPosition += 15

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  addText('Please review the estimate details below and approve or reject this quote.', pageWidth / 2, yPosition, undefined)

  yPosition += 25

  // Estimate Header with border box
  pdf.setDrawColor(200, 200, 200)
  pdf.rect(15, yPosition - 5, pageWidth - 30, 25)

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  addText(`Estimate #${estimate.estimate_number}`, 20, yPosition + 5)

  // Status badge
  const statusText = estimate.status === 'sent for approval' ? 'Sent for Approval' :
                    estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  addText(`Status: ${statusText}`, pageWidth - 60, yPosition + 5)

  yPosition += 35

  // Bill To Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  yPosition = addText('Bill To', 20, yPosition)
  yPosition += 5

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')

  // Contact Information
  if (estimate.contacts) {
    yPosition = addText(`Contact: ${estimate.contacts.first_name} ${estimate.contacts.last_name}`, 20, yPosition)
    if (estimate.contacts.email) {
      yPosition = addText(`Email: ${estimate.contacts.email}`, 20, yPosition)
    }
    if ((estimate.contacts as { phone?: string }).phone) {
      yPosition = addText(`Phone: ${(estimate.contacts as { phone?: string }).phone}`, 20, yPosition)
    }
  }

  // Address
  const contactsWithAddress = estimate.contacts as {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_postal_code?: string;
  }
  if (contactsWithAddress?.address_street || contactsWithAddress?.address_city) {
    yPosition = addText('Address:', 20, yPosition)
    if (contactsWithAddress.address_street) {
      yPosition = addText(contactsWithAddress.address_street, 25, yPosition)
    }
    if (contactsWithAddress.address_city) {
      const cityStateZip = `${contactsWithAddress.address_city}, ${contactsWithAddress.address_state || ''} ${contactsWithAddress.address_postal_code || ''}`.trim()
      yPosition = addText(cityStateZip, 25, yPosition)
    }
  }

  // Organization
  if (estimate.organizations) {
    yPosition = addText(`Organization: ${estimate.organizations.name}`, 20, yPosition)
  }

  yPosition += 15

  // Event Details
  if (estimate.event_date || estimate.guests || estimate.event_type) {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Event Details', 20, yPosition)
    yPosition += 5

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    if (estimate.event_type) {
      yPosition = addText(`Event Type: ${estimate.event_type}`, 20, yPosition)
    }

    if (estimate.event_date) {
      yPosition = addText(`Event Date: ${new Date(estimate.event_date).toLocaleDateString()}`, 20, yPosition)
    }

    if (estimate.event_start_time || estimate.event_end_time) {
      let timeText = 'Event Time: '
      if (estimate.event_start_time) {
        timeText += new Date(`2000-01-01T${estimate.event_start_time}`).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })
      }
      if (estimate.event_start_time && estimate.event_end_time) {
        timeText += ' - '
      }
      if (estimate.event_end_time) {
        timeText += new Date(`2000-01-01T${estimate.event_end_time}`).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })
      }
      yPosition = addText(timeText, 20, yPosition)
    }

    if (estimate.guests) {
      yPosition = addText(`Number of Guests: ${estimate.guests}`, 20, yPosition)
    }

    yPosition += 15
  }

  // Event Location
  const hasLocation = estimate.event_address_street || estimate.event_city || estimate.event_state
  if (hasLocation) {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Event Location', 20, yPosition)
    yPosition += 5

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    if (estimate.event_address_street) {
      let addressLine = estimate.event_address_street
      if (estimate.event_address_unit) {
        addressLine += ` ${estimate.event_address_unit}`
      }
      yPosition = addText(addressLine, 20, yPosition)
    }

    const cityStateZip = []
    if (estimate.event_city) cityStateZip.push(estimate.event_city)
    if (estimate.event_state) cityStateZip.push(estimate.event_state)
    if (estimate.event_zipcode) cityStateZip.push(estimate.event_zipcode)

    if (cityStateZip.length > 0) {
      yPosition = addText(cityStateZip.join(', '), 20, yPosition)
    }

    if (estimate.event_county) {
      yPosition = addText(`${estimate.event_county} County`, 20, yPosition)
    }

    yPosition += 15
  }

  // Items & Services Table
  if (estimateItems.length > 0) {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Items & Services', 20, yPosition)
    yPosition += 10

    // Table headers
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Product / Service', 20, yPosition)
    pdf.text('Qty', pageWidth - 80, yPosition)
    pdf.text('Unit Price', pageWidth - 50, yPosition)
    pdf.text('Total', pageWidth - 20, yPosition)

    yPosition += 5

    // Draw header line
    pdf.setDrawColor(0, 0, 0)
    pdf.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 5

    pdf.setFont('helvetica', 'normal')

    let total = 0

    estimateItems.forEach(item => {
      const itemTotal = (item.qty || 1) * (item.unit_price || 0)
      total += itemTotal

      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        pdf.addPage()
        yPosition = 20
      }

      // Item name (bold)
      pdf.setFont('helvetica', 'bold')
      const itemName = item.item_name || 'Unnamed Item'
      yPosition = addText(itemName, 20, yPosition, pageWidth - 120)

      // Item description
      if (item.item_description && item.item_description.trim()) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        yPosition = addText(item.item_description, 20, yPosition, pageWidth - 120)
        pdf.setFontSize(10)
      }

      // SKU
      if (item.item_sku && item.item_sku.trim()) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        yPosition = addText(`SKU: ${item.item_sku}`, 20, yPosition)
        pdf.setFontSize(10)
      }

      // Calculate the baseline for quantity, price, and total
      const baselineY = yPosition - 5

      // Qty, Price, Total (right-aligned)
      pdf.setFont('helvetica', 'normal')
      pdf.text((item.qty || 1).toString(), pageWidth - 80, baselineY, { align: 'right' })
      pdf.text(`$${(item.unit_price || 0).toFixed(2)}`, pageWidth - 50, baselineY, { align: 'right' })
      pdf.text(`$${itemTotal.toFixed(2)}`, pageWidth - 20, baselineY, { align: 'right' })

      yPosition += 8

      // Draw separator line
      pdf.setDrawColor(230, 230, 230)
      pdf.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 3
    })

    // Total section
    yPosition += 5
    pdf.setDrawColor(0, 0, 0)
    pdf.line(pageWidth - 60, yPosition, pageWidth - 20, yPosition)
    yPosition += 8

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Total', pageWidth - 60, yPosition, { align: 'right' })
    pdf.text(`$${total.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' })

    yPosition += 15
  }

  // Custom Message
  if (message && message.trim()) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage()
      yPosition = 20
    }

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Message:', 20, yPosition)

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(message, 20, yPosition, pageWidth - 40)
  }

  // Additional Comments
  if (estimate.comment && estimate.comment.trim()) {
    if (yPosition > pageHeight - 60) {
      pdf.addPage()
      yPosition = 20
    }

    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Additional Comments:', 20, yPosition)

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(estimate.comment, 20, yPosition, pageWidth - 40)
  }

  // Convert to blob
  const pdfBlob = pdf.output('blob')
  return pdfBlob
}