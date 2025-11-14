'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/input'
import React from 'react'

interface DigitalSignatureProps {
  onSignatureChange: (signatureData: SignatureData | null) => void
  onValidationChange: (isValid: boolean) => void
  onGenerateSignature: (generateFn: () => Promise<SignatureData | null>) => void
}

export interface SignatureData {
  typed_name: string
  signature_approved: boolean
  signature_image_data: string
  ip_address?: string
  user_agent?: string
  timestamp: string
  geolocation?: {
    latitude: number
    longitude: number
    accuracy: number
  }
}

export function DigitalSignature({ onSignatureChange, onValidationChange, onGenerateSignature }: DigitalSignatureProps) {
  const [typedName, setTypedName] = useState('')
  const [signatureApproved, setSignatureApproved] = useState(false)
  const signatureRef = useRef<HTMLDivElement>(null)

  // Function to generate signature - can be called externally
  const generateSignature = useCallback(async (): Promise<SignatureData | null> => {
    if (!typedName.trim() || !signatureApproved) {
      return null
    }

    try {
      console.log('Starting signature generation...')

      // Generate signature image from the styled text
      if (signatureRef.current) {
        console.log('signatureRef.current found, attempting html2canvas...')

        // Alternative: Generate signature using Canvas API directly
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) throw new Error('Could not get canvas context')

        // Set canvas size
        canvas.width = 400
        canvas.height = 100

        // Set background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Set text properties
        ctx.fillStyle = '#000000'
        ctx.font = '36px "Dancing Script", cursive'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'

        // Draw the signature text
        ctx.fillText(typedName.trim(), 20, canvas.height / 2)

        console.log('Canvas signature generation completed successfully')
        const imageData = canvas.toDataURL('image/png')
        console.log('Canvas to data URL completed')
        console.log('Image data length:', imageData.length)
        console.log('Image data starts with:', imageData.substring(0, 50))

        // Test if image is valid by creating an Image object
        const testImg = new Image()
        testImg.onload = () => {
          console.log('✅ Image is valid! Dimensions:', testImg.width, 'x', testImg.height)
        }
        testImg.onerror = () => {
          console.error('❌ Image data is invalid!')
        }
        testImg.src = imageData

        // Collect metadata
        const signatureData: SignatureData = {
          typed_name: typedName.trim(),
          signature_approved: true,
          signature_image_data: imageData,
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          geolocation: await getGeolocation()
        }

        console.log('Signature data created successfully')

        return signatureData
      }
    } catch (error) {
      console.error('Error generating signature:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    }

    return null
  }, [typedName, signatureApproved])

  const isValid = typedName.trim() !== '' && signatureApproved

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedName(e.target.value)
    onSignatureChange(null)
  }

  const handleApprovalChange = (checked: boolean) => {
    setSignatureApproved(checked)
    onSignatureChange(null)
  }

  // Notify parent of validation state changes
  React.useEffect(() => {
    onValidationChange(isValid)
  }, [isValid, onValidationChange])

  // Provide generate function to parent
  React.useEffect(() => {
    onGenerateSignature(generateSignature)
  }, [generateSignature, onGenerateSignature])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Digital Signature</h3>
        <p style={{ fontSize: '14px', marginBottom: '16px', color: '#4b5563' }}>
          Please type your full name and approve the use of your digital signature to approve this estimate.
        </p>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="signature-name" style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
          Full Name *
        </label>
        <Input
          id="signature-name"
          type="text"
          value={typedName}
          onChange={handleNameChange}
          placeholder="Enter your full name"
          disabled={false}
        />
      </div>

      {/* Signature Preview */}
      {typedName.trim() && (
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
            Signature Preview
          </label>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', backgroundColor: '#f9fafb' }}>
            <div
              ref={signatureRef}
              style={{
                fontSize: '36px',
                color: '#000000',
                fontFamily: "'Dancing Script', cursive",
                display: 'inline-block',
                backgroundColor: 'transparent'
              }}
            >
              {typedName}
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Consent */}
      {typedName.trim() && (
        <fieldset>
          <legend style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
            Digital Signature Approval
          </legend>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', height: '24px', alignItems: 'center', flexShrink: '0' }}>
              <input
                id="signature-approval"
                type="checkbox"
                name="signature-approval"
                checked={signatureApproved}
                onChange={(e) => handleApprovalChange(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  appearance: 'none',
                  borderRadius: '2px',
                  border: '1px solid',
                  borderColor: signatureApproved ? '#000000' : '#d1d5db',
                  backgroundColor: signatureApproved ? '#000000' : '#ffffff',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              />
              {signatureApproved && (
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{
                    width: '14px',
                    height: '14px',
                    position: 'absolute',
                    pointerEvents: 'none',
                    stroke: 'white',
                    strokeWidth: '2',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }}
                >
                  <path d="M3 8L6 11L11 3.5" />
                </svg>
              )}
            </div>
            <div>
              <label htmlFor="signature-approval" style={{ fontSize: '14px', fontWeight: '500', color: '#111827', cursor: 'pointer' }}>
                I approve the above in place of my written signature
              </label>
            </div>
          </div>
        </fieldset>
      )}


      {/* Add the font import to the head */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
      `}</style>
    </div>
  )
}

// Helper functions
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return 'unknown'
  }
}

async function getGeolocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      () => {
        resolve(undefined)
      },
      { timeout: 5000 }
    )
  })
}