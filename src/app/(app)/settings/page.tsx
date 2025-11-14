'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Divider } from '@/components/divider'
import { Field, Label } from '@/components/fieldset'
import { Heading, Subheading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Switch, SwitchField } from '@/components/switch'
import { Text } from '@/components/text'
import { Textarea } from '@/components/textarea'
import { Address } from './address'
import { getCreditCardFeeSettings, updateCreditCardFeeSettings, type CreditCardFeeSettings } from '@/lib/api/settings'

export default function Settings() {
  const [feeSettings, setFeeSettings] = useState<CreditCardFeeSettings>({
    enabled: false,
    type: 'percentage',
    rate: 0.035,
    name: 'Credit Card Service Fee'
  })
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(true)
  const [savingFeeSettings, setSavingFeeSettings] = useState(false)
  const [savedFeeSettings, setSavedFeeSettings] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)

  // Load credit card fee settings
  useEffect(() => {
    const loadFeeSettings = async () => {
      try {
        const settings = await getCreditCardFeeSettings()
        setFeeSettings(settings)
      } catch (error) {
        console.error('Error loading fee settings:', error)
        setFeeError(error instanceof Error ? error.message : 'Failed to load fee settings')
      } finally {
        setLoadingFeeSettings(false)
      }
    }

    loadFeeSettings()
  }, [])

  const handleSaveFeeSettings = async () => {
    setSavingFeeSettings(true)
    setFeeError(null)
    setSavedFeeSettings(false)

    try {
      await updateCreditCardFeeSettings(feeSettings)
      setSavedFeeSettings(true)
      setTimeout(() => setSavedFeeSettings(false), 3000)
    } catch (error) {
      console.error('Error saving fee settings:', error)
      setFeeError(error instanceof Error ? error.message : 'Failed to save fee settings')
    } finally {
      setSavingFeeSettings(false)
    }
  }

  const formatRateDisplay = () => {
    if (feeSettings.type === 'percentage') {
      return (feeSettings.rate * 100).toFixed(2)
    }
    return feeSettings.rate.toFixed(2)
  }

  return (
    <div>

      {/* <Divider className="my-10" soft /> USE THIS TO SEPARATE SECTIONS */}

      {/* Credit Card Service Fee Section */}
      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>Credit Card Service Fee</Subheading>
          <Text>Automatically add a service fee to estimates for credit card processing.</Text>
          <span className="text-xs text-red-500">Still in development-not fully functional yet.</span>
        </div>
        <div className="space-y-4">
          {!loadingFeeSettings ? (
            <>
              <SwitchField>
                <Label>Enable automatic service fee</Label>
                <Switch
                  checked={feeSettings.enabled}
                  onChange={(enabled) => setFeeSettings(prev => ({ ...prev, enabled }))}
                />
              </SwitchField>

              {feeSettings.enabled && (
                <>
                  <Field>
                    <Label>Fee Name</Label>
                    <Input
                      value={feeSettings.name}
                      onChange={(e) => setFeeSettings(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Credit Card Service Fee"
                    />
                  </Field>

                  <Field>
                    <Label>Fee Type</Label>
                    <Select
                      value={feeSettings.type}
                      onChange={(e) => setFeeSettings(prev => ({
                        ...prev,
                        type: e.target.value as 'percentage' | 'fixed',
                        rate: e.target.value === 'percentage' ? 0.035 : 5.00
                      }))}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </Select>
                  </Field>

                  <Field>
                    <Label>
                      {feeSettings.type === 'percentage' ? 'Fee Percentage (%)' : 'Fixed Fee Amount ($)'}
                    </Label>
                    <Input
                      type="number"
                      value={formatRateDisplay()}
                      onChange={(e) => {
                        const inputValue = parseFloat(e.target.value)
                        if (!isNaN(inputValue)) {
                          const actualRate = feeSettings.type === 'percentage'
                            ? inputValue / 100
                            : inputValue
                          setFeeSettings(prev => ({ ...prev, rate: actualRate }))
                        }
                      }}
                      step="0.01"
                      min="0"
                      placeholder={feeSettings.type === 'percentage' ? '3.5' : '5.00'}
                    />
                    <Text className="mt-1 text-sm">
                      {feeSettings.type === 'percentage'
                        ? `Enter as percentage (e.g., 3.5 for 3.5%)`
                        : `Enter as dollar amount (e.g., 5.00 for $5.00)`}
                    </Text>
                  </Field>

                  {/* Preview */}
                  <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="text-sm space-y-1">
                      <div><strong>Preview:</strong> {feeSettings.name}</div>
                      {feeSettings.type === 'percentage' ? (
                        <div>On a $100 subtotal: ${(100 * feeSettings.rate).toFixed(2)} fee ({(feeSettings.rate * 100).toFixed(2)}%)</div>
                      ) : (
                        <div>Fixed fee: ${feeSettings.rate.toFixed(2)}</div>
                      )}
                    </div>
                  </div>

                  {/* Save Fee Settings */}
                  <div className="flex items-center gap-4">
                    {feeError && (
                      <div className="text-sm text-red-600">{feeError}</div>
                    )}
                    {savedFeeSettings && (
                      <div className="text-sm text-green-600">Fee settings saved!</div>
                    )}
                    <Button
                      type="button"
                      onClick={handleSaveFeeSettings}
                      disabled={savingFeeSettings}
                      outline
                    >
                      {savingFeeSettings ? 'Saving...' : 'Save Fee Settings'}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-sm text-zinc-500">Loading fee settings...</div>
          )}
        </div>
      </section>

      {/* <Divider className="my-10" soft /> USE THIS TO SEPARATE SECTIONS */}

      {/* <div className="flex justify-end gap-4">
        <Button type="reset" plain>
          Reset
        </Button>
        <Button type="submit">Save changes</Button>
      </div> */}
    </div>
  )
}
