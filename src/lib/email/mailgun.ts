// Mailgun email service for sending estimate approval emails
// Install: npm install mailgun.js form-data

interface EstimateApprovalEmailData {
  to: string
  contactName: string
  estimateNumber: string
  approvalLink: string
  companyName?: string
  eventDate?: string
  eventType?: string
  customMessage?: string
}

interface InvoiceApprovalEmailData {
  to: string
  contactName: string
  invoiceNumber: string
  approvalLink: string
  companyName?: string
  eventDate?: string
  eventType?: string
  customMessage?: string
}

interface InvoicePaymentEmailData {
  to: string
  contactName: string
  invoiceNumber: string
  paymentLink: string
  amount: number
  companyName?: string
  eventDate?: string
  eventType?: string
}

export async function sendEstimateApprovalEmail(data: EstimateApprovalEmailData): Promise<void> {
  // Check for required environment variables
  const mailgunApiKey = process.env.MAILGUN_API_KEY
  const mailgunDomain = process.env.MAILGUN_DOMAIN
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${mailgunDomain}`

  if (!mailgunApiKey || !mailgunDomain) {
    throw new Error('Mailgun configuration missing. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.')
  }

  try {
    // Dynamic import to avoid issues if mailgun.js is not installed
    const formData = await import('form-data')
    const Mailgun = await import('mailgun.js')

    const mailgun = new Mailgun.default(formData.default)
    const mg = mailgun.client({
      username: 'api',
      key: mailgunApiKey,
      url: 'https://api.mailgun.net' // Use EU endpoint if needed: https://api.eu.mailgun.net
    })

    const emailHtml = generateApprovalEmailHtml(data)
    const emailText = generateApprovalEmailText(data)

    const messageData = {
      from: fromEmail,
      to: data.to,
      subject: `Estimate Approval Required - ${data.estimateNumber}`,
      text: emailText,
      html: emailHtml
    }

    const response = await mg.messages.create(mailgunDomain, messageData)
    console.log('Approval email sent successfully:', response.id)

  } catch (error) {
    console.error('Error sending approval email:', error)
    throw new Error(`Failed to send approval email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function sendInvoiceApprovalEmail(data: InvoiceApprovalEmailData): Promise<void> {
  // Check for required environment variables
  const mailgunApiKey = process.env.MAILGUN_API_KEY
  const mailgunDomain = process.env.MAILGUN_DOMAIN
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${mailgunDomain}`

  if (!mailgunApiKey || !mailgunDomain) {
    throw new Error('Mailgun configuration missing. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.')
  }

  try {
    // Dynamic import to avoid issues if mailgun.js is not installed
    const formData = await import('form-data')
    const Mailgun = await import('mailgun.js')

    const mailgun = new Mailgun.default(formData.default)
    const mg = mailgun.client({
      username: 'api',
      key: mailgunApiKey,
      url: 'https://api.mailgun.net' // Use EU endpoint if needed: https://api.eu.mailgun.net
    })

    const emailHtml = generateInvoiceApprovalEmailHtml(data)
    const emailText = generateInvoiceApprovalEmailText(data)

    const messageData = {
      from: fromEmail,
      to: data.to,
      subject: `Invoice Approval Required - ${data.invoiceNumber}`,
      text: emailText,
      html: emailHtml
    }

    const response = await mg.messages.create(mailgunDomain, messageData)
    console.log('Invoice approval email sent successfully:', response.id)

  } catch (error) {
    console.error('Error sending invoice approval email:', error)
    throw new Error(`Failed to send invoice approval email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function generateApprovalEmailHtml(data: EstimateApprovalEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Estimate Approval Required</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background-color: #059669; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 10px; border: none; cursor: pointer; font-size: 16px; }
    .button.reject { background-color: #dc2626; }
    .details { background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Estimate Approval Required</h1>
    <p>Estimate ${data.estimateNumber}</p>
  </div>

  <div class="content">
    <p>Dear ${data.contactName},</p>

    <p>We've prepared an estimate for your upcoming event and need your approval to proceed.</p>

    ${data.customMessage ? `
    <div class="details">
      <h3>Personal Message:</h3>
      <p>${data.customMessage}</p>
    </div>
    ` : ''}

    ${data.eventDate || data.eventType ? `
    <div class="details">
      <h3>Event Details:</h3>
      ${data.eventType ? `<p><strong>Event Type:</strong> ${data.eventType}</p>` : ''}
      ${data.eventDate ? `<p><strong>Event Date:</strong> ${new Date(data.eventDate).toLocaleDateString()}</p>` : ''}
    </div>
    ` : ''}

    <p>Please review the estimate and let us know your decision:</p>

    <div style="text-align: center; margin: 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#059669" style="border-radius: 6px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${data.approvalLink}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="11%" stroke="f" fillcolor="#059669">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">
                      Review &amp; Respond to Estimate
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${data.approvalLink}" target="_blank" style="background-color: #059669; border: 16px solid #059669; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-align: center; text-decoration: none; border-radius: 6px; -webkit-text-size-adjust: none;">Review &amp; Respond to Estimate</a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p>This secure link will allow you to review all the details and approve or reject the estimate with any feedback.</p>

    <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 20px;">
      <em>If the button above doesn't work, copy and paste this link into your browser:</em><br>
      <a href="${data.approvalLink}" style="color: #059669; word-break: break-all;">${data.approvalLink}</a>
    </p>

    <p>If you have any questions, please don't hesitate to contact us.</p>

    <p>Best regards,<br>
    ${data.companyName || 'Event Pilot Team'}</p>
  </div>

  <div class="footer">
    <p>This email was sent regarding estimate ${data.estimateNumber}. If you believe you received this email in error, please contact us.</p>
  </div>
</body>
</html>
  `.trim()
}

function generateApprovalEmailText(data: EstimateApprovalEmailData): string {
  return `
Estimate Approval Required - ${data.estimateNumber}

Dear ${data.contactName},

We've prepared an estimate for your upcoming event and need your approval to proceed.

${data.customMessage ? `Personal Message: ${data.customMessage}

` : ''}${data.eventType ? `Event Type: ${data.eventType}` : ''}
${data.eventDate ? `Event Date: ${new Date(data.eventDate).toLocaleDateString()}` : ''}

Please review the estimate and respond using this secure link:
${data.approvalLink}

This link will allow you to review all the details and approve or reject the estimate with any feedback.

If you have any questions, please don't hesitate to contact us.

Best regards,
${data.companyName || 'Event Pilot Team'}

---
This email was sent regarding estimate ${data.estimateNumber}. If you believe you received this email in error, please contact us.
  `.trim()
}

function generateInvoiceApprovalEmailHtml(data: InvoiceApprovalEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice Approval Required</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background-color: #059669; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 10px; border: none; cursor: pointer; font-size: 16px; }
    .button.reject { background-color: #dc2626; }
    .details { background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Invoice Approval Required</h1>
    <p>Invoice ${data.invoiceNumber}</p>
  </div>

  <div class="content">
    <p>Dear ${data.contactName},</p>

    <p>We've prepared an invoice for your event and need your approval to proceed.</p>

    ${data.customMessage ? `
    <div class="details">
      <h3>Personal Message:</h3>
      <p>${data.customMessage}</p>
    </div>
    ` : ''}

    ${data.eventDate || data.eventType ? `
    <div class="details">
      <h3>Event Details:</h3>
      ${data.eventType ? `<p><strong>Event Type:</strong> ${data.eventType}</p>` : ''}
      ${data.eventDate ? `<p><strong>Event Date:</strong> ${new Date(data.eventDate).toLocaleDateString()}</p>` : ''}
    </div>
    ` : ''}

    <p>Please review the invoice and let us know your decision:</p>

    <div style="text-align: center; margin: 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#059669" style="border-radius: 6px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${data.approvalLink}" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="11%" stroke="f" fillcolor="#059669">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">
                      Review &amp; Approve Invoice
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${data.approvalLink}" target="_blank" style="background-color: #059669; border: 16px solid #059669; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-align: center; text-decoration: none; border-radius: 6px; -webkit-text-size-adjust: none;">Review &amp; Approve Invoice</a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p>This secure link will allow you to review all the details and approve or reject the invoice with any feedback.</p>

    <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 20px;">
      <em>If the button above doesn't work, copy and paste this link into your browser:</em><br>
      <a href="${data.approvalLink}" style="color: #059669; word-break: break-all;">${data.approvalLink}</a>
    </p>

    <p>If you have any questions, please don't hesitate to contact us.</p>

    <p>Best regards,<br>
    ${data.companyName || 'Event Pilot Team'}</p>
  </div>

  <div class="footer">
    <p>This email was sent regarding invoice ${data.invoiceNumber}. If you believe you received this email in error, please contact us.</p>
  </div>
</body>
</html>
  `.trim()
}

function generateInvoiceApprovalEmailText(data: InvoiceApprovalEmailData): string {
  return `
Invoice Approval Required - ${data.invoiceNumber}

Dear ${data.contactName},

We've prepared an invoice for your event and need your approval to proceed.

${data.customMessage ? `Personal Message: ${data.customMessage}

` : ''}${data.eventType ? `Event Type: ${data.eventType}` : ''}
${data.eventDate ? `Event Date: ${new Date(data.eventDate).toLocaleDateString()}` : ''}

Please review the invoice and respond using this secure link:
${data.approvalLink}

This link will allow you to review all the details and approve or reject the invoice with any feedback.

If you have any questions, please don't hesitate to contact us.

Best regards,
${data.companyName || 'Event Pilot Team'}

---
This email was sent regarding invoice ${data.invoiceNumber}. If you believe you received this email in error, please contact us.
  `.trim()
}

export async function sendInvoicePaymentEmail(data: InvoicePaymentEmailData): Promise<void> {
  // Check for required environment variables
  const mailgunApiKey = process.env.MAILGUN_API_KEY
  const mailgunDomain = process.env.MAILGUN_DOMAIN
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${mailgunDomain}`

  if (!mailgunApiKey || !mailgunDomain) {
    throw new Error('Mailgun configuration missing. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.')
  }

  try {
    // Dynamic import to avoid issues if mailgun.js is not installed
    const formData = await import('form-data')
    const Mailgun = await import('mailgun.js')

    const mailgun = new Mailgun.default(formData.default)
    const mg = mailgun.client({
      username: 'api',
      key: mailgunApiKey,
      url: 'https://api.mailgun.net' // Use EU endpoint if needed: https://api.eu.mailgun.net
    })

    const emailHtml = generateInvoicePaymentEmailHtml(data)
    const emailText = generateInvoicePaymentEmailText(data)

    const messageData = {
      from: fromEmail,
      to: data.to,
      subject: `Payment Required - Invoice ${data.invoiceNumber}`,
      text: emailText,
      html: emailHtml
    }

    const response = await mg.messages.create(mailgunDomain, messageData)
    console.log('Payment email sent successfully:', response.id)

  } catch (error) {
    console.error('Error sending payment email:', error)
    throw new Error(`Failed to send payment email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function generateInvoicePaymentEmailHtml(data: InvoicePaymentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Required</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
    .content { padding: 20px 0; }
    .button { display: inline-block; background-color: #059669; color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 10px; border: none; cursor: pointer; font-size: 16px; }
    .details { background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
    .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payment Required</h1>
    <p>Invoice ${data.invoiceNumber}</p>
  </div>

  <div class="content">
    <p>Dear ${data.contactName},</p>

    <p>Your invoice has been approved and is now ready for payment. Please complete payment to finalize your booking.</p>

    <div class="amount">
      Amount Due: $${data.amount.toFixed(2)}
    </div>

    ${data.eventDate || data.eventType ? `
    <div class="details">
      <h3>Event Details:</h3>
      ${data.eventType ? `<p><strong>Event Type:</strong> ${data.eventType}</p>` : ''}
      ${data.eventDate ? `<p><strong>Event Date:</strong> ${new Date(data.eventDate).toLocaleDateString()}</p>` : ''}
    </div>
    ` : ''}

    <p>Please click the secure payment link below to complete your payment:</p>

    <div style="text-align: center; margin: 30px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#059669" style="border-radius: 6px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${data.paymentLink}" style="height:54px;v-text-anchor:middle;width:250px;" arcsize="11%" stroke="f" fillcolor="#059669">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">
                      Pay Invoice Now
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${data.paymentLink}" target="_blank" style="background-color: #059669; border: 16px solid #059669; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-align: center; text-decoration: none; border-radius: 6px; -webkit-text-size-adjust: none;">Pay Invoice Now</a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p>This secure payment link will allow you to pay using your credit card or other payment methods. Your payment information is processed securely through Stripe.</p>

    <p style="text-align: center; font-size: 14px; color: #6b7280; margin-top: 20px;">
      <em>If the button above doesn't work, copy and paste this link into your browser:</em><br>
      <a href="${data.paymentLink}" style="color: #059669; word-break: break-all;">${data.paymentLink}</a>
    </p>

    <p>If you have any questions about this invoice or need assistance with payment, please don't hesitate to contact us.</p>

    <p>Thank you for your business!</p>

    <p>Best regards,<br>
    ${data.companyName || 'Event Pilot Team'}</p>
  </div>

  <div class="footer">
    <p>This email was sent regarding invoice ${data.invoiceNumber}. If you believe you received this email in error, please contact us.</p>
  </div>
</body>
</html>
  `.trim()
}

function generateInvoicePaymentEmailText(data: InvoicePaymentEmailData): string {
  return `
Payment Required - Invoice ${data.invoiceNumber}

Dear ${data.contactName},

Your invoice has been approved and is now ready for payment. Please complete payment to finalize your booking.

Amount Due: $${data.amount.toFixed(2)}

${data.eventType ? `Event Type: ${data.eventType}` : ''}
${data.eventDate ? `Event Date: ${new Date(data.eventDate).toLocaleDateString()}` : ''}

Please use this secure payment link to complete your payment:
${data.paymentLink}

This secure payment link will allow you to pay using your credit card or other payment methods. Your payment information is processed securely through Stripe.

If you have any questions about this invoice or need assistance with payment, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${data.companyName || 'Event Pilot Team'}

---
This email was sent regarding invoice ${data.invoiceNumber}. If you believe you received this email in error, please contact us.
  `.trim()
}