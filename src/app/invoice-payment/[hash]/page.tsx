'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Heading, Subheading } from '@/components/heading'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { StripePaymentForm } from '@/components/stripe-payment-form'
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import type { InvoicePayment } from '@/types/invoice-payments'

interface PaymentPageState {
  payment: InvoicePayment | null
  loading: boolean
  error: string | null
  processing: boolean
  completed: boolean
}

export default function InvoicePaymentPage() {
  const params = useParams()
  const hash = params.hash as string

  const [state, setState] = useState<PaymentPageState>({
    payment: null,
    loading: true,
    error: null,
    processing: false,
    completed: false
  })

  // Load payment data
  useEffect(() => {
    async function loadPayment() {
      if (!hash) {
        setState(prev => ({ ...prev, loading: false, error: 'Invalid payment link' }))
        return
      }

      try {
        const response = await fetch(`/api/invoice-payment/${hash}`)
        if (!response.ok) {
          const errorData = await response.json()
          setState(prev => ({ ...prev, loading: false, error: errorData.error || 'Payment link not found or already processed' }))
          return
        }

        const { data: payment } = await response.json()
        setState(prev => ({
          ...prev,
          payment,
          loading: false,
          completed: payment.status === 'paid' || payment.invoice?.payment_status === 'paid'
        }))
      } catch (error) {
        console.error('Error loading payment:', error)
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load payment details' }))
      }
    }

    loadPayment()
  }, [hash])

  const handlePaymentSuccess = () => {
    setState(prev => ({ ...prev, processing: false, completed: true }))
  }

  const handlePaymentError = (error: string) => {
    setState(prev => ({ ...prev, processing: false, error }))
  }

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: '#111827' }}></div>
          <p className="mt-2" style={{ color: '#4b5563' }}>Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (state.error || !state.payment || !state.payment.invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-md mx-auto text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold" style={{ color: '#111827' }}>Unable to Load Payment</h1>
          <p className="mt-2" style={{ color: '#4b5563' }}>
            {state.error || 'Payment link not found or already processed'}
          </p>
        </div>
      </div>
    )
  }

  if (state.completed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-md mx-auto text-center">
          <CheckCircleIcon className="h-16 w-16 mx-auto mb-4" style={{ color: '#059669' }} />
          <Heading>Payment Complete</Heading>
          <p className="mt-2" style={{ color: '#4b5563' }}>
            Your payment has been processed successfully. Thank you for your business!
          </p>
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <p className="text-sm font-medium" style={{ color: '#111827' }}>
              Invoice #{state.payment.invoice.invoice_number}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#059669' }}>
              ${state.payment.amount.toFixed(2)} Paid
            </p>
          </div>
        </div>
      </div>
    )
  }

  const invoice = state.payment.invoice

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="px-6 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-6">
                <img
                  src="/mlc_logo.png"
                  alt="My Little Carnival"
                  className="h-16 w-auto mx-auto"
                />
              </div>
              <Heading>Complete Payment</Heading>
              <p className="mt-2" style={{ color: '#4b5563' }}>
                Secure payment for Invoice #{invoice.invoice_number}
              </p>
            </div>

            {/* Single Column Layout */}
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Invoice Details */}
              <div>
                <Subheading>Invoice Details</Subheading>
                <div className="mt-4">
                  <DescriptionList>
                    <DescriptionTerm>Invoice Number</DescriptionTerm>
                    <DescriptionDetails>{invoice.invoice_number}</DescriptionDetails>

                    <DescriptionTerm>Bill To</DescriptionTerm>
                    <DescriptionDetails>
                      <div>
                        <p className="font-medium">
                          {invoice.contact?.name || 'Customer'}
                        </p>
                        <p className="text-sm" style={{ color: '#4b5563' }}>{invoice.contact?.email}</p>
                        {invoice.organization && (
                          <p className="text-sm" style={{ color: '#4b5563' }}>{invoice.organization.name}</p>
                        )}
                      </div>
                    </DescriptionDetails>

                    {invoice.due_date && (
                      <>
                        <DescriptionTerm>Due Date</DescriptionTerm>
                        <DescriptionDetails>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" style={{ color: '#4b5563' }} />
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        </DescriptionDetails>
                      </>
                    )}

                    <DescriptionTerm>Amount Due</DescriptionTerm>
                    <DescriptionDetails>
                      <span className="text-2xl font-bold" style={{ color: '#111827' }}>
                        ${state.payment.amount.toFixed(2)}
                      </span>
                    </DescriptionDetails>
                  </DescriptionList>
                </div>
              </div>

              {/* Payment Form */}
              <div>
                <Subheading>Payment Information</Subheading>
                <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                  Your payment information is securely processed by Stripe.
                </p>

                <div className="mt-4 border border-gray-200 rounded-lg p-6">
                  <StripePaymentForm
                    paymentHash={hash}
                    amount={state.payment.amount}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                </div>

                {state.error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                      <XCircleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-xs text-red-800">{state.error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}