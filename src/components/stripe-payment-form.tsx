'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/button'
import { Alert, AlertDescription } from '@/components/alert'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
}

const stripePromise = loadStripe(stripePublishableKey)

interface PaymentFormProps {
  clientSecret: string
  paymentHash: string
  amount: number
  onPaymentSuccess: () => void
  onPaymentError: (error: string) => void
}

function PaymentForm({ paymentHash, amount, onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Real-time validation
  const validateForm = async () => {
    if (!stripe || !elements) {
      return false
    }

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Please complete all required fields')
      return false
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setError('Payment system not ready. Please refresh the page.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setValidationErrors([])

    try {
      // Validate form before submission
      const isValid = await validateForm()
      if (!isValid) {
        return
      }

      // Confirm payment with Stripe (never redirect, handle everything in-page)
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required', // Only redirect if required, handle everything on-page when possible
        confirmParams: {
          return_url: window.location.href, // This won't be used due to redirect: 'never'
        },
      })

      if (confirmError) {
        // Handle specific error types for better UX
        if (confirmError.type === 'validation_error') {
          setError('Please check your payment information and try again')
        } else if (confirmError.type === 'card_error') {
          setError(confirmError.message || 'Card was declined')
        } else {
          setError(confirmError.message || 'Payment failed')
        }
        onPaymentError(confirmError.message || 'Payment failed')
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update payment status in our database
        const response = await fetch('/api/invoice-payment/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_hash: paymentHash,
            payment_intent_id: paymentIntent.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to process payment')
        }

        onPaymentSuccess()
      } else {
        setError('Payment was not completed. Please try again.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed'
      setError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
          fields: {
            billingDetails: {
              address: {
                postalCode: 'auto',
              },
            },
          },
        }}
      />

      {error && (
        <Alert color="red">
          {/* <ExclamationTriangleIcon /> */}
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
      </Button>
    </form>
  )
}

interface StripePaymentFormProps {
  paymentHash: string
  amount: number
  onPaymentSuccess: () => void
  onPaymentError: (error: string) => void
}

export function StripePaymentForm({ paymentHash, amount, onPaymentSuccess, onPaymentError }: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/invoice-payment/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_hash: paymentHash,
            amount,
            currency: 'usd',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to initialize payment')
        }

        const { client_secret } = await response.json()
        setClientSecret(client_secret)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
        setError(errorMessage)
        onPaymentError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [paymentHash, amount, onPaymentError])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    )
  }

  if (error || !clientSecret) {
    return (
      <Alert color="red">
        <ExclamationTriangleIcon />
        <AlertDescription>{error || 'Failed to initialize payment'}</AlertDescription>
      </Alert>
    )
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#111827',
      colorBackground: '#ffffff',
      colorText: '#374151',
      colorDanger: '#dc2626',
    },
  }

  const options = {
    clientSecret,
    appearance,
    loader: 'auto' as const,
  }

  return (
    <Elements
      stripe={stripePromise}
      options={options}
    >
      <PaymentForm
        clientSecret={clientSecret}
        paymentHash={paymentHash}
        amount={amount}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
      />
    </Elements>
  )
}