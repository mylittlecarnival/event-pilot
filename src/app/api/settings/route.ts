import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .order('key')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Convert to key-value object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.value

      // Parse value based on data type
      if (setting.data_type === 'boolean') {
        value = value === 'true'
      } else if (setting.data_type === 'number') {
        value = parseFloat(value)
      } else if (setting.data_type === 'json') {
        try {
          value = JSON.parse(value)
        } catch {
          // Keep as string if JSON parsing fails
        }
      }

      acc[setting.key] = {
        value,
        data_type: setting.data_type,
        description: setting.description
      }
      return acc
    }, {} as Record<string, { value: string | number | boolean | object; data_type: string; description: string }>)

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error('Error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser()

    // Convert value to string for storage
    let stringValue = value
    if (typeof value === 'boolean') {
      stringValue = value.toString()
    } else if (typeof value === 'number') {
      stringValue = value.toString()
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value)
    }

    // Update or insert setting
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key,
        value: stringValue,
        updated_by_email: user?.email
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in PUT /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const settings = await request.json()

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser()

    // Prepare bulk update operations
    const operations = Object.entries(settings).map(([key, value]) => {
      let stringValue = value
      if (typeof value === 'boolean') {
        stringValue = value.toString()
      } else if (typeof value === 'number') {
        stringValue = value.toString()
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value)
      }

      return {
        key,
        value: stringValue,
        updated_by_email: user?.email
      }
    })

    // Bulk upsert settings
    const { data, error } = await supabase
      .from('settings')
      .upsert(operations, {
        onConflict: 'key'
      })
      .select()

    if (error) {
      console.error('Error bulk updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: data.length })
  } catch (error) {
    console.error('Error in POST /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}