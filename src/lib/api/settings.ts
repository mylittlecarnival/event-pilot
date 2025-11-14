export interface Setting {
  value: string | number | boolean | object
  data_type: 'string' | 'number' | 'boolean' | 'json'
  description: string
}

export interface Settings {
  [key: string]: Setting
}

export interface CreditCardFeeSettings {
  enabled: boolean
  type: 'percentage' | 'fixed'
  rate: number
  name: string
}

/**
 * Fetch all application settings
 */
export async function getSettings(): Promise<Settings> {
  const response = await fetch('/api/settings', {
    cache: 'no-store' // Always fetch fresh settings
  })

  if (!response.ok) {
    throw new Error('Failed to fetch settings')
  }

  return response.json()
}

/**
 * Update a single setting
 */
export async function updateSetting(key: string, value: string | number | boolean | object): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update setting')
  }
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(settings: Record<string, string | number | boolean | object>): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update settings')
  }
}

/**
 * Get credit card fee settings in a convenient format
 */
export async function getCreditCardFeeSettings(): Promise<CreditCardFeeSettings> {
  const settings = await getSettings()

  return {
    enabled: settings.credit_card_fee_enabled?.value === true || settings.credit_card_fee_enabled?.value === 'true',
    type: (settings.credit_card_fee_type?.value === 'fixed' || settings.credit_card_fee_type?.value === 'percentage') ? settings.credit_card_fee_type.value : 'percentage',
    rate: typeof settings.credit_card_fee_rate?.value === 'number' ? settings.credit_card_fee_rate.value : 0.035,
    name: typeof settings.credit_card_fee_name?.value === 'string' ? settings.credit_card_fee_name.value : 'Credit Card Service Fee'
  }
}

/**
 * Update credit card fee settings
 */
export async function updateCreditCardFeeSettings(feeSettings: Partial<CreditCardFeeSettings>): Promise<void> {
  const settingsToUpdate: Record<string, string | number | boolean | object> = {}

  if (feeSettings.enabled !== undefined) {
    settingsToUpdate.credit_card_fee_enabled = feeSettings.enabled
  }
  if (feeSettings.type !== undefined) {
    settingsToUpdate.credit_card_fee_type = feeSettings.type
  }
  if (feeSettings.rate !== undefined) {
    settingsToUpdate.credit_card_fee_rate = feeSettings.rate
  }
  if (feeSettings.name !== undefined) {
    settingsToUpdate.credit_card_fee_name = feeSettings.name
  }

  await updateSettings(settingsToUpdate)
}

/**
 * Trigger service fee recalculation for an estimate
 */
export async function recalculateServiceFee(estimateId: string): Promise<void> {
  // Temporarily disabled for debugging
  console.log('Service fee recalculation disabled for debugging')
  return Promise.resolve()
}