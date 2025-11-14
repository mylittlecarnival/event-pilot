'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Reorder } from 'motion/react'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Input, InputGroup } from '@/components/input'
import { Select } from '@/components/select'
import { Switch, SwitchField } from '@/components/switch'
import { Label } from '@headlessui/react'
import { Textarea } from '@/components/textarea'
import { Heading, Subheading } from '@/components/heading'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Link } from '@/components/link'
import {
  ChevronLeftIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import {
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceItems,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  searchProductsAndInvoiceItems
} from '@/lib/api/invoices'
import { logInvoiceAction } from '@/lib/api/activity-logs'
import type {
  Invoice,
  InvoiceItem,
  CreateInvoiceData,
  CreateInvoiceItemData,
  SearchResultItem
} from '@/types/invoices'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { getEstimates, getEstimate } from '@/lib/api/estimates'
import type { Estimate } from '@/types/estimates'
import { generateInvoiceNumberForEstimate, removeEstimateSuffixFromInvoiceNumber } from '@/lib/api/invoices'
import { InvoiceApprovalRequestModal } from '@/components/invoice-approval-request-modal'

export default function InvoiceEdit() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  // State
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showResendConfirmModal, setShowResendConfirmModal] = useState(false)

  // Form data
  const [formData, setFormData] = useState<CreateInvoiceData>({
    organization_id: null,
    contact_id: null,
    status: 'draft',
    organization: 'no',
    guests: 1,
    event_type: null,
    event_address_street: null,
    event_address_unit: null,
    event_city: null,
    event_state: 'California',
    event_zipcode: null,
    event_county: null,
    event_date: null,
    event_start_time: null,
    event_end_time: null,
    comment: null,
    referred_by: null,
    estimate_id: null,
  })

  // Computed values (memoized for performance)
  const selectedOrganization = useMemo(
    () => organizations.find(org => org.id === formData.organization_id),
    [organizations, formData.organization_id]
  )
  
  const selectedContact = useMemo(
    () => contacts.find(contact => contact.id === formData.contact_id),
    [contacts, formData.contact_id]
  )

  const selectedEstimate = useMemo(
    () => estimates.find(estimate => estimate.id === formData.estimate_id),
    [estimates, formData.estimate_id]
  )
  
  const filteredContacts = useMemo(
    () => formData.organization_id
      ? contacts.filter(contact => contact.organization_id === formData.organization_id)
      : contacts,
    [contacts, formData.organization_id]
  )

  const filteredEstimates = useMemo(
    () => {
      // If no organization or contact is selected, show no estimates
      if (!formData.organization_id && !formData.contact_id) {
        return []
      }

      return estimates.filter(estimate => {
        // Match by organization if one is selected
        if (formData.organization_id && estimate.organization_id === formData.organization_id) {
          return true
        }

        // Match by contact if one is selected
        if (formData.contact_id && estimate.contact_id === formData.contact_id) {
          return true
        }

        return false
      })
    },
    [estimates, formData.organization_id, formData.contact_id]
  )

  const invoiceTotal = useMemo(
    () => invoiceItems.reduce((sum, item) => sum + (item.qty || 0) * (item.unit_price || 0), 0),
    [invoiceItems]
  )

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [orgsData, contactsData, estimatesData] = await Promise.all([
        getOrganizations(),
        getContacts(),
        getEstimates()
      ])
      setOrganizations(orgsData)
      setContacts(contactsData)
      setEstimates(estimatesData)

      if (!isNew) {
        const [invoiceData, itemsData] = await Promise.all([
          getInvoice(id),
          getInvoiceItems(id)
        ])
        
        if (invoiceData) {
          setInvoice(invoiceData)
          setFormData({
            organization_id: invoiceData.organization_id,
            contact_id: invoiceData.contact_id,
            status: invoiceData.status,
            organization: invoiceData.organization || 'no',
            guests: invoiceData.guests || 1,
            event_type: invoiceData.event_type,
            event_address_street: invoiceData.event_address_street,
            event_address_unit: invoiceData.event_address_unit,
            event_city: invoiceData.event_city,
            event_state: invoiceData.event_state || 'California',
            event_zipcode: invoiceData.event_zipcode,
            event_county: invoiceData.event_county,
            event_date: invoiceData.event_date,
            event_start_time: invoiceData.event_start_time,
            event_end_time: invoiceData.event_end_time,
            comment: invoiceData.comment,
            referred_by: invoiceData.referred_by,
            estimate_id: invoiceData.estimate_id,
          })
        }
        setInvoiceItems(itemsData)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      console.error('Error loading data:', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Search products and estimate items
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchProductsAndInvoiceItems(query)
      setSearchResults(results)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search'
      console.error('Error searching:', error)
      setError(errorMessage)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchTerm, handleSearch])

  // Form handlers
  const handleInputChange = (field: keyof CreateInvoiceData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleOrganization = () => {
    const newValue = formData.organization === 'yes' ? 'no' : 'yes'
    setFormData(prev => ({
      ...prev,
      organization: newValue,
      organization_id: newValue === 'no' ? null : prev.organization_id,
      contact_id: newValue === 'no' ? null : prev.contact_id,
      estimate_id: null, // Clear estimate when organization/contact context changes
    }))
  }

  const handleOrganizationChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      organization_id: value || null,
      contact_id: null, // Clear contact when organization changes
      estimate_id: null, // Clear estimate when organization changes
    }))
  }

  const handleContactChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_id: value || null,
      estimate_id: null, // Clear estimate when contact changes
    }))
  }

  // Populate invoice from estimate
  const populateFromEstimate = useCallback(async (estimateId: string) => {
    try {
      const estimate = await getEstimate(estimateId)
      if (!estimate) {
        setError('Failed to load estimate details')
        return
      }

      // Copy all estimate data to form data (except products which are handled separately)
      setFormData(prev => ({
        ...prev,
        estimate_id: estimateId,
        organization_id: estimate.organization_id,
        contact_id: estimate.contact_id,
        organization: estimate.organization,
        guests: estimate.guests,
        event_type: estimate.event_type,
        event_address_street: estimate.event_address_street,
        event_address_unit: estimate.event_address_unit,
        event_city: estimate.event_city,
        event_state: estimate.event_state,
        event_zipcode: estimate.event_zipcode,
        event_county: estimate.event_county,
        event_date: estimate.event_date,
        event_start_time: estimate.event_start_time,
        event_end_time: estimate.event_end_time,
        comment: estimate.comment,
        referred_by: estimate.referred_by,
      }))
    } catch (error) {
      console.error('Error loading estimate details:', error)
      setError('Failed to load estimate details')
    }
  }, [])

  const handleEstimateChange = (value: string) => {
    if (value) {
      // Populate form data from selected estimate
      populateFromEstimate(value)
    } else {
      // Only clear the estimate connection - leave all invoice data intact
      setFormData(prev => ({
        ...prev,
        estimate_id: null,
      }))
    }
  }

  // Product and item handlers
  const addItemToInvoice = useCallback(async (item: SearchResultItem) => {
    if (!invoice?.id && !isNew) return

    const newItem: CreateInvoiceItemData = {
      invoice_id: invoice?.id || '',
      product_id: item.source === 'product' ? item.id : item.product_id || null,
      qty: 1,
      unit_price: item.unit_price || 0,
      item_name: item.name,
      item_description: item.description,
      item_sku: item.sku,
      item_featured_image: item.featured_image,
      is_custom: item.source === 'invoice_item' ? (item.is_custom || false) : false,
      sort_order: 0,
    }

    try {
      if (isNew) {
        // For new invoices, add to local state at first position
        const tempItem: InvoiceItem = {
          id: `temp_${Date.now()}`,
          invoice_id: '',
          product_id: newItem.product_id || null,
          qty: newItem.qty,
          unit_price: newItem.unit_price || null,
          item_name: newItem.item_name || null,
          item_description: newItem.item_description || null,
          item_sku: newItem.item_sku || null,
          item_featured_image: newItem.item_featured_image || null,
          is_custom: newItem.is_custom || false,
          is_service_fee: false,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
          sort_order: 0,
        }
        // Add to beginning and update sort orders for existing items
        setInvoiceItems(prev => {
          const updatedItems = prev.map(item => ({
            ...item,
            sort_order: item.sort_order + 1
          }))
          return [tempItem, ...updatedItems]
        })
      } else {
        // For existing invoices, update sort orders of existing items first
        const updatePromises = invoiceItems.map((item, index) => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateInvoiceItem(item.id, { sort_order: index + 1 })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)

        const createdItem = await createInvoiceItem(newItem)
        if (createdItem) {
          // Add to beginning and update sort orders for existing items
          setInvoiceItems(prev => {
            const updatedItems = prev.map(item => ({
              ...item,
              sort_order: item.sort_order + 1
            }))
            return [createdItem, ...updatedItems]
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product'
      console.error('Failed to add product to invoice:', error)
      setError(errorMessage)
    }

    setSearchTerm('')
    setSearchResults([])
  }, [invoice?.id, isNew])

  const addCustomItem = useCallback(async () => {
    if (!invoice?.id && !isNew) return

    const newItem: CreateInvoiceItemData = {
      invoice_id: invoice?.id || '',
      qty: 1,
      unit_price: 0,
      item_name: 'Custom Item',
      item_description: '',
      item_sku: '',
      item_featured_image: null,
      is_custom: true,
      sort_order: 0,
    }

    try {
      if (isNew) {
        // For new invoices, add to local state at first position
        const tempItem: InvoiceItem = {
          id: `temp_${Date.now()}`,
          invoice_id: '',
          product_id: null,
          qty: 1,
          unit_price: 0,
          item_name: 'Custom Item',
          item_description: '',
          item_sku: '',
          item_featured_image: null,
          is_custom: true,
          is_service_fee: false,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
          sort_order: 0,
        }
        // Add to beginning and update sort orders for existing items
        setInvoiceItems(prev => {
          const updatedItems = prev.map(item => ({
            ...item,
            sort_order: item.sort_order + 1
          }))
          return [tempItem, ...updatedItems]
        })
      } else {
        // For existing invoices, update sort orders of existing items first
        const updatePromises = invoiceItems.map((item, index) => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateInvoiceItem(item.id, { sort_order: index + 1 })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)

        const createdItem = await createInvoiceItem(newItem)
        if (createdItem) {
          // Add to beginning and update sort orders for existing items
          setInvoiceItems(prev => {
            const updatedItems = prev.map(item => ({
              ...item,
              sort_order: item.sort_order + 1
            }))
            return [createdItem, ...updatedItems]
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add custom item'
      console.error('Failed to add custom item:', error)
      setError(errorMessage)
    }
  }, [invoice?.id, isNew])

  // Add credit card fee
  const addCreditCardFee = useCallback(async () => {
    if (!invoice?.id && !isNew) return

    // Calculate 3.5% of current total (excluding existing service fees)
    const subtotal = invoiceItems
      .filter(item => !item.is_service_fee)
      .reduce((sum, item) => sum + (item.qty || 0) * (item.unit_price || 0), 0)

    const feeAmount = subtotal * 0.035

    const newItem: CreateInvoiceItemData = {
      invoice_id: invoice?.id || '',
      qty: 1,
      unit_price: feeAmount,
      item_name: 'Credit Card Service Fee',
      item_description: 'Service fee (3.5%)',
      item_sku: null,
      item_featured_image: null,
      is_custom: true,
      is_service_fee: true,
      sort_order: invoiceItems.length,
    }

    try {
      if (isNew) {
        // For new invoices, add to local state at first position
        const tempItem: InvoiceItem = {
          id: `temp_fee_${Date.now()}`,
          invoice_id: '',
          product_id: null,
          qty: 1,
          unit_price: feeAmount,
          item_name: 'Credit Card Service Fee',
          item_description: 'Service fee (3.5%)',
          item_sku: null,
          item_featured_image: null,
          is_custom: true,
          is_service_fee: true,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
          sort_order: invoiceItems.length,
        }
        // Add to end of items
        setInvoiceItems(prev => [...prev, tempItem])
      } else {
        // For existing invoices, create the credit card fee item
        const createdItem = await createInvoiceItem(newItem)
        if (createdItem) {
          // Add to end of items
          setInvoiceItems(prev => [...prev, createdItem])
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add credit card fee'
      console.error('Failed to add credit card fee:', error)
      setError(errorMessage)
    }
  }, [invoice?.id, isNew, invoiceItems])

  const updateItem = useCallback(async (index: number, field: keyof InvoiceItem, value: string | number | null) => {
    const updatedItems = [...invoiceItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setInvoiceItems(updatedItems)

    // Update in database if not a new estimate
    if (!isNew && updatedItems[index].id && !updatedItems[index].id.startsWith('temp_')) {
      try {
        await updateInvoiceItem(updatedItems[index].id, { [field]: value })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update item'
        console.error('Failed to update item:', error)
        setError(errorMessage)
      }
    }
  }, [invoiceItems, isNew])

  const removeItem = useCallback(async (index: number) => {
    const item = invoiceItems[index]

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.item_name || 'this item'}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    const updatedItems = invoiceItems.filter((_, i) => i !== index)
    setInvoiceItems(updatedItems)

    // Delete from database if not a new invoice and item has an ID
    if (!isNew && item.id && !item.id.startsWith('temp_')) {
      try {
        console.log('Attempting to delete invoice item:', { id: item.id, item_name: item.item_name })
        await deleteInvoiceItem(item.id)
        console.log('Successfully deleted invoice item:', item.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete item'
        console.error('Failed to delete invoice item:', {
          error,
          item_id: item.id,
          item_name: item.item_name,
          is_service_fee: item.is_service_fee,
          full_error: error
        })
        setError(errorMessage)
        // Restore the item if deletion failed
        setInvoiceItems(invoiceItems)
      }
    }
  }, [invoiceItems, isNew])

  const handleReorder = useCallback(async (newItems: InvoiceItem[]) => {
    // Update sort_order for all items
    const itemsWithUpdatedOrder = newItems.map((item, index) => ({
      ...item,
      sort_order: index
    }))

    setInvoiceItems(itemsWithUpdatedOrder)

    // Auto-save reordering for existing invoices
    if (!isNew && invoice?.id) {
      try {
        const updatePromises = itemsWithUpdatedOrder.map((item) => {
          if (item.id && !item.id.startsWith('temp_')) {
            console.log('Updating item:', item.id, 'with sort_order:', item.sort_order)
            return updateInvoiceItem(item.id, { sort_order: item.sort_order })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)
      } catch (error) {
        // Handle database type/enum errors gracefully
        if (error instanceof Error && (
          error.message.includes('invalid input value for enum invoice_status') ||
          error.message.includes('type "invoice_status" does not exist')
        )) {
          console.warn('Invoice status database constraint error - database cleanup needed:', error)
          setError('Items reordered locally. Database cleanup needed for permanent save.')
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Failed to save item order'
          console.error('Failed to auto-save item order:', error)
          setError(errorMessage)
        }
      }
    }
  }, [isNew, invoice?.id])

  // Save estimate
  const saveInvoice = useCallback(async () => {
    if (saving) return

    setSaving(true)
    setError(null)
    setSaved(false)
    
    try {
      if (isNew) {
        // Create new invoice (invoice number should NOT change based on estimate connection)
        const newInvoice = await createInvoice(formData)
        if (newInvoice) {
          setInvoice(newInvoice)

          // Create invoice items
          const itemPromises = invoiceItems.map(item =>
            createInvoiceItem({
              ...item,
              invoice_id: newInvoice.id,
            })
          )
          const createdItems = await Promise.all(itemPromises)
          setInvoiceItems(createdItems.filter(Boolean) as InvoiceItem[])

          // Redirect to the edit page for the newly created invoice
          router.push(`/invoices/${newInvoice.id}`)
          return
        }
      } else if (invoice) {
        // Check if estimate connection changed
        const estimateChanged = invoice.estimate_id !== formData.estimate_id
        let updatedFormData = { ...formData }

        if (estimateChanged) {
          const newInvoiceNumber = invoice.invoice_number

          // Note: Invoice number should NOT change when associating with estimates
          // The invoice number remains the same regardless of estimate association

          updatedFormData = { ...formData, invoice_number: newInvoiceNumber }
        }

        // Check if status changed
        const statusChanged = invoice.status !== formData.status
        const oldStatus = invoice.status
        const newStatus = formData.status

        await updateInvoice(invoice.id, updatedFormData)

        // Update local invoice state with new number if it changed
        if (estimateChanged && updatedFormData.invoice_number !== invoice.invoice_number) {
          setInvoice(prev => prev ? { ...prev, invoice_number: updatedFormData.invoice_number! } : null)
        }

        // Log status change separately if it occurred
        if (statusChanged) {
          try {
            await logInvoiceAction(
              invoice.id,
              'Status Changed',
              {
                invoice_number: invoice.invoice_number,
                old_status: oldStatus,
                new_status: newStatus,
                organization_id: invoice.organization_id,
                contact_id: invoice.contact_id
              }
            )
          } catch (logError) {
            console.error('Failed to log status change:', logError)
            // Don't fail the entire operation if logging fails
          }
        }

        // Update estimate items efficiently
        const updatePromises = invoiceItems.map(item => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateInvoiceItem(item.id, item)
          } else {
            return createInvoiceItem({
              ...item,
              invoice_id: invoice.id,
            })
          }
        })

        await Promise.all(updatePromises)
        console.log('Invoice saved successfully!')
      }
      
      // Show success message
      setSaved(true)
      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save invoice'
      console.error('Save error:', error)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }, [saving, formData, invoiceItems, isNew, invoice])

  // Delete estimate
  const deleteInvoiceHandler = useCallback(async () => {
    if (!invoice || isNew || deleting) return

    // Show confirmation dialog with text input
    const confirmationText = 'delete'
    const userInput = window.prompt(
      `Are you sure you want to delete this invoice?\n\nThis action cannot be undone and will permanently remove:\n- Invoice #${invoice.invoice_number}\n- All associated items\n- All invoice data\n\nType "${confirmationText}" to confirm deletion:`
    )

    if (userInput !== confirmationText) {
      if (userInput !== null) {
        alert('Deletion cancelled. You must type "delete" exactly to confirm.')
      }
      return
    }

    setDeleting(true)
    setError(null)

    try {
      await deleteInvoice(invoice.id)
      // Redirect to invoices list after successful deletion
      router.push('/invoices')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice'
      console.error('Delete error:', error)
      setError(errorMessage)
    } finally {
      setDeleting(false)
    }
  }, [invoice, isNew, deleting, router])

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }, [])

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }, [])

  // Status badge helper function
  const getStatusBadgeClass = useCallback((status: string): string => {
    const statusClasses: Record<string, string> = {
      draft: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
      sent: 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
      'sent for approval': 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
      'payment requested': 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10',
      approved: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
      rejected: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
      expired: 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20',
      paid: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
      canceled: 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10',
    }
    return statusClasses[status] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
  }, [])

  // Payment status badge helper function
  const getPaymentStatusBadgeClass = useCallback((paymentStatus: string): string => {
    const statusClasses: Record<string, string> = {
      paid: 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20',
      unpaid: 'bg-orange-50 text-orange-700 inset-ring inset-ring-orange-600/20',
      pending: 'bg-yellow-50 text-yellow-700 inset-ring inset-ring-yellow-600/20',
      failed: 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10',
      refunded: 'bg-purple-50 text-purple-700 inset-ring inset-ring-purple-600/20',
    }
    return statusClasses[paymentStatus] || 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
  }, [])

  // Status text helper function
  const getStatusText = useCallback((status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      'sent for approval': 'Payment Requested',
      'payment requested': 'Payment Requested',
      approved: 'Approved',
      rejected: 'Rejected',
      expired: 'Expired',
      paid: 'Paid',
      canceled: 'Canceled',
    }
    return statusMap[status] || status
  }, [])

  // Payment status text helper function
  const getPaymentStatusText = useCallback((paymentStatus: string): string => {
    const statusMap: Record<string, string> = {
      paid: 'Paid',
      unpaid: 'Unpaid',
      pending: 'Pending',
      failed: 'Failed',
      refunded: 'Refunded',
    }
    return statusMap[paymentStatus] || paymentStatus
  }, [])

  // Handle Request Approval button click
  const handleRequestApproval = () => {
    if (invoice?.status === 'approved') {
      setShowResendConfirmModal(true)
    } else {
      setShowApprovalModal(true)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    )
  }

  return (
    <>
      <div className="max-lg:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500 ">
          <ChevronLeftIcon className="size-4 text-zinc-400 " />
          Invoices
        </Link>
      </div>
      
      <div className="mt-4 lg:mt-8">
        <div className="flex items-center gap-4">
          <Heading>
            {isNew ? 'Create Invoice' : `Invoice #${invoice?.invoice_number || id}`}
          </Heading>
          {!isNew && invoice && (
            <div className="flex items-center gap-2">
              {invoice.payment_status !== 'paid' && (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
              )}
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPaymentStatusBadgeClass(invoice.payment_status || 'unpaid')}`}>
                {getPaymentStatusText(invoice.payment_status || 'unpaid')}
              </span>
            </div>
          )}
        </div>
        
        <div className="isolate mt-2.5 flex flex-wrap justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap gap-x-10 gap-y-4 py-1.5">
            {!isNew && invoice && (
              <>
                <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6 ">
                  <CalendarIcon className="size-4 shrink-0 text-zinc-400 " />
                  <span>{formData.event_date ? formatDate(formData.event_date) : 'Not set'}</span>
                </span>
                <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6 ">
                  <CurrencyDollarIcon className="size-4 shrink-0 text-zinc-400 " />
                  <span>{formatCurrency(invoiceTotal)}</span>
                </span>
                {formData.guests && (
                  <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6 ">
                    <UserGroupIcon className="size-4 shrink-0 text-zinc-400 " />
                    <span>{formData.guests} guests</span>
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-4">
            {error && (
              <div className="flex items-center text-sm text-red-600 ">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center text-sm text-green-600 ">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Invoice Saved Successfully
              </div>
            )}
            <Button onClick={saveInvoice} disabled={saving}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </Button>
            {!isNew && invoice && (
              <Button
                outline
                onClick={handleRequestApproval}
                disabled={saving || deleting || !selectedContact}
              >
                Request Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Summary</Subheading>
        <Divider className="mt-4" />

        {/* Estimate Connection */}
        <div className="mt-6">
          <label className="block text-sm/6 font-medium text-zinc-950 ">
            Connect to Estimate
          </label>
          <div className="mt-2">
            <Select
              value={formData.estimate_id || ''}
              onChange={(e) => handleEstimateChange(e.target.value)}
            >
              <option value="">
                {!formData.organization_id && !formData.contact_id
                  ? 'Select organization or contact first'
                  : 'No estimate selected'
                }
              </option>
              {filteredEstimates.map(estimate => (
                <option key={estimate.id} value={estimate.id}>
                  #{estimate.estimate_number} - {estimate.status}
                  {estimate.organizations?.name && ` - ${estimate.organizations.name}`}
                  {estimate.contacts && ` - ${estimate.contacts.first_name} ${estimate.contacts.last_name}`}
                </option>
              ))}
            </Select>
          </div>
          {selectedEstimate && (
            <div className="mt-2 text-sm text-zinc-600 ">
              Connected to{' '}
              <Link
                href={`/estimates/${selectedEstimate.id}`}
                className="text-blue-600 hover:text-blue-500 underline"
              >
                Estimate #{selectedEstimate.estimate_number}
              </Link>
              {' '}({selectedEstimate.status})
            </div>
          )}
        </div>

        <Divider className="mt-6" />
        <DescriptionList>
          <DescriptionTerm>Bill To</DescriptionTerm>
          <DescriptionDetails>
            <SwitchField>
              <Label className="text-sm/6">
                {formData.organization === 'yes' ? 'Organization' : 'Individual'}
              </Label>
              <Switch
                checked={formData.organization === 'yes'}
                onChange={toggleOrganization}
              />
            </SwitchField>
            {formData.organization === 'yes' && selectedOrganization ? (
              <div className="mt-2">
                <span className="font-medium">{selectedOrganization.name}</span>
                {selectedOrganization.address_street && (
                  <>
                    <br />
                    {selectedOrganization.address_street}
                  </>
                )}
                {selectedOrganization.address_city && (
                  <>
                    <br />
                    {selectedOrganization.address_city}
                    {selectedOrganization.address_state && `, ${selectedOrganization.address_state}`}
                    {selectedOrganization.address_postal_code && ` ${selectedOrganization.address_postal_code}`}
                  </>
                )}
                {selectedOrganization.phone && (
                  <>
                    <br />
                    {selectedOrganization.phone}
                  </>
                )}
              </div>
            ) : formData.organization === 'no' && selectedContact ? (
              <div className="mt-2">
                <span className="font-medium">
                  {selectedContact.first_name} {selectedContact.last_name}
                </span>
                {selectedContact.address_street && (
                  <>
                    <br />
                    {selectedContact.address_street}
                  </>
                )}
                {selectedContact.address_city && (
                  <>
                    <br />
                    {selectedContact.address_city}
                    {selectedContact.address_state && `, ${selectedContact.address_state}`}
                    {selectedContact.address_postal_code && ` ${selectedContact.address_postal_code}`}
                  </>
                )}
                {selectedContact.phone && (
                  <>
                    <br />
                    {selectedContact.phone}
                  </>
                )}
              </div>
            ) : (
              <div className="mt-2 text-zinc-500 ">No customer selected</div>
            )}
          </DescriptionDetails>
          
          <DescriptionTerm>Event Location</DescriptionTerm>
          <DescriptionDetails>
            {formData.event_address_street ? (
              <>
                <MapPinIcon className="inline size-4 mr-1 text-grey-900 " />
                {formData.event_address_street}
                {formData.event_address_unit && `, #${formData.event_address_unit}`}
                {formData.event_city && formData.event_city}
                {formData.event_city && formData.event_state && ', '}
                {formData.event_state && formData.event_state}
                {formData.event_zipcode && ` ${formData.event_zipcode}`}
              </>
            ) : (
              <span className="text-zinc-500 ">No address specified</span>
            )}
          </DescriptionDetails>
          
          <DescriptionTerm>Event Details</DescriptionTerm>
          <DescriptionDetails>
            {formData.event_date && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-zinc-400 " />
                <span>{new Date(formData.event_date).toLocaleDateString()}</span>
                {(formData.event_start_time || formData.event_end_time) && (
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-zinc-400 " />
                    <span>
                      {formData.event_start_time && new Date(`2000-01-01T${formData.event_start_time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {formData.event_start_time && formData.event_end_time && ' - '}
                      {formData.event_end_time && new Date(`2000-01-01T${formData.event_end_time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                )}
              </div>
            )}
            {formData.event_type && (
              <div className="mt-1">{formData.event_type}</div>
            )}
            {formData.guests && (
              <div className="mt-1 flex items-center gap-2">
                <UserGroupIcon className="size-4 text-zinc-400 " />
                <span>{formData.guests} guests</span>
              </div>
            )}
          </DescriptionDetails>
        </DescriptionList>
      </div>


      <div className="mt-12">
        <Subheading>Contact Details</Subheading>
        <Divider className="mt-4" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {/* Organization */}
          {formData.organization === 'yes' && (
            <div>
              <label className="block text-sm/6 font-medium text-zinc-950 ">Organization</label>
              <div className="mt-2">
                <Select
                  value={formData.organization_id || ''}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Contact</label>
            <div className="mt-2">
              <Select
                value={formData.contact_id || ''}
                onChange={(e) => handleContactChange(e.target.value)}
              >
                <option value="">Select Contact</option>
                {filteredContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} ({contact.email})
                  </option>
                ))}
              </Select>
              {formData.contact_id && !filteredContacts.find(c => c.id === formData.contact_id) && (
                <div className="mt-1 text-sm text-red-600 ">
                  ⚠️ Contact not available for this organization - will be cleared on save
                </div>
              )}
            </div>
          </div>

          {/* Referred By */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Referred By</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.referred_by || ''}
                onChange={(e) => handleInputChange('referred_by', e.target.value)}
                placeholder="How did they hear about us?"
              />
            </div>
          </div>

          {/* Status */}
          {/* <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Status</label>
            <div className="mt-2">
              <Select
                value={formData.status || 'draft'}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="paid">Paid</option>
                <option value="canceled">Canceled</option>
              </Select>
            </div>
          </div> */}
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Event Location</Subheading>
        <Divider className="mt-4" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {/* Event Address - Street Address */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm/6 font-medium text-zinc-950 ">Street Address</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.event_address_street || ''}
                onChange={(e) => handleInputChange('event_address_street', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
          </div>

          {/* Event Address - Unit/Apartment */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Unit/Apartment</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.event_address_unit || ''}
                onChange={(e) => handleInputChange('event_address_unit', e.target.value)}
                placeholder="Apt 4B"
              />
            </div>
          </div>

          {/* Event Address - City */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">City</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.event_city || ''}
                onChange={(e) => handleInputChange('event_city', e.target.value)}
                placeholder="Los Angeles"
              />
            </div>
          </div>

          {/* Event Address - State */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">State</label>
            <div className="mt-2">
              <Select
                value={formData.event_state || ''}
                onChange={(e) => handleInputChange('event_state', e.target.value)}
              >
                      <option value="">Select State</option>
                      <option value="Alabama">Alabama</option>
                      <option value="Alaska">Alaska</option>
                      <option value="Arizona">Arizona</option>
                      <option value="Arkansas">Arkansas</option>
                      <option value="California">California</option>
                      <option value="Colorado">Colorado</option>
                      <option value="Connecticut">Connecticut</option>
                      <option value="Delaware">Delaware</option>
                      <option value="Florida">Florida</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Hawaii">Hawaii</option>
                      <option value="Idaho">Idaho</option>
                      <option value="Illinois">Illinois</option>
                      <option value="Indiana">Indiana</option>
                      <option value="Iowa">Iowa</option>
                      <option value="Kansas">Kansas</option>
                      <option value="Kentucky">Kentucky</option>
                      <option value="Louisiana">Louisiana</option>
                      <option value="Maine">Maine</option>
                      <option value="Maryland">Maryland</option>
                      <option value="Massachusetts">Massachusetts</option>
                      <option value="Michigan">Michigan</option>
                      <option value="Minnesota">Minnesota</option>
                      <option value="Mississippi">Mississippi</option>
                      <option value="Missouri">Missouri</option>
                      <option value="Montana">Montana</option>
                      <option value="Nebraska">Nebraska</option>
                      <option value="Nevada">Nevada</option>
                      <option value="New Hampshire">New Hampshire</option>
                      <option value="New Jersey">New Jersey</option>
                      <option value="New Mexico">New Mexico</option>
                      <option value="New York">New York</option>
                      <option value="North Carolina">North Carolina</option>
                      <option value="North Dakota">North Dakota</option>
                      <option value="Ohio">Ohio</option>
                      <option value="Oklahoma">Oklahoma</option>
                      <option value="Oregon">Oregon</option>
                      <option value="Pennsylvania">Pennsylvania</option>
                      <option value="Rhode Island">Rhode Island</option>
                      <option value="South Carolina">South Carolina</option>
                      <option value="South Dakota">South Dakota</option>
                      <option value="Tennessee">Tennessee</option>
                      <option value="Texas">Texas</option>
                      <option value="Utah">Utah</option>
                      <option value="Vermont">Vermont</option>
                      <option value="Virginia">Virginia</option>
                      <option value="Washington">Washington</option>
                      <option value="West Virginia">West Virginia</option>
                      <option value="Wisconsin">Wisconsin</option>
                      <option value="Wyoming">Wyoming</option>
              </Select>
            </div>
          </div>

          {/* Event Address - Zipcode */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Zipcode</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.event_zipcode || ''}
                onChange={(e) => handleInputChange('event_zipcode', e.target.value)}
                placeholder="90210"
              />
            </div>
          </div>

          {/* Event Address - County */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">County</label>
            <div className="mt-2">
              <Input
                type="text"
                value={formData.event_county || ''}
                onChange={(e) => handleInputChange('event_county', e.target.value)}
                placeholder="Los Angeles County"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Event Details</Subheading>
        <Divider className="mt-4" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {/* Number of Guests */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Number of Guests</label>
            <div className="mt-2">
              <Input
                type="number"
                value={formData.guests || 1}
                onChange={(e) => handleInputChange('guests', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Event Type</label>
            <div className="mt-2">
              <Select
                value={formData.event_type || ''}
                onChange={(e) => handleInputChange('event_type', e.target.value || null)}
              >
                <option value="">Select Event Type</option>
                <option value="Birthday Party">Birthday Party</option>
                <option value="Church / Congregation">Church / Congregation</option>
                <option value="Corporate Event">Corporate Event</option>
                <option value="School Carnival">School Carnival</option>
                <option value="Social Event">Social Event</option>
                <option value="Community Event">Community Event</option>
              </Select>
            </div>
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Event Date</label>
            <div className="mt-2">
              <Input
                type="date"
                value={formData.event_date || ''}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
              />
            </div>
          </div>

          {/* Event Start Time */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">Start Time</label>
            <div className="mt-2">
              <Input
                type="time"
                value={formData.event_start_time || ''}
                onChange={(e) => handleInputChange('event_start_time', e.target.value)}
              />
            </div>
          </div>

          {/* Event End Time */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950 ">End Time</label>
            <div className="mt-2">
              <Input
                type="time"
                value={formData.event_end_time || ''}
                onChange={(e) => handleInputChange('event_end_time', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Add Products</Subheading>        
        <div className="mt-3 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <InputGroup>
              <MagnifyingGlassIcon className="size-4" />
              <Input
                name="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products and previous invoices..."
                aria-label="Search"
              />
            </InputGroup>
          </div>
          <Button onClick={addCustomItem}>
            <PlusIcon className="size-4" />
            Add Custom Item
          </Button>
        </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-6 divide-y divide-gray-200 ring-1 ring-gray-200 rounded-lg">
                  {searchResults.map(item => (
                    <div
                      key={`${item.source}-${item.id}`}
                      className="p-4 hover:bg-gray-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => addItemToInvoice(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm/6 font-medium text-gray-900">{item.name}</h4>
                            {item.source === 'invoice_item' && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10">
                                From Previous Invoices
                              </span>
                            )}
                          </div>
                          <p className="text-sm/6 text-gray-500">{item.description}</p>
                          <p className="text-xs/6 text-gray-400">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm/6 font-medium text-gray-900">
                            {formatCurrency(item.unit_price || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

      <div className="mt-12">
        <Subheading>Invoice Items</Subheading>
        <Divider className="mt-4" />

        {invoiceItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm/6 text-zinc-500 ">
              No items added yet. Search for products above to get started.
            </p>
          </div>
        ) : (
                <div className="mt-3 overflow-x-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 border-b border-zinc-200  pb-3 px-3 text-sm font-semibold text-zinc-950 ">
                
                    <div className="col-span-7">Product Image, Name, Description</div>
                    <div className="col-span-1 hidden sm:block">Qty</div>
                    <div className="col-span-2 hidden sm:block">Unit Price</div>
                    <div className="col-span-2">Total</div>
                    <div className="col-span-1 text-right"></div>
                  </div>
                  <Reorder.Group
                    axis="y"
                    values={invoiceItems}
                    onReorder={handleReorder}
                    className="space-y-1 mt-4"
                  >
                    {invoiceItems.map((item, index) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        className={`group ${item.is_service_fee
                          ? "border border-amber-200 rounded-lg bg-amber-50 transition-colors duration-150"
                          : "border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-150"
                        }`}
                        whileDrag={{ 
                          scale: 1.02,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                          zIndex: 10,
                          rotate: 1
                        }}
                        style={{ 
                          cursor: "grab"
                        }}
                      >
                        <div className="grid grid-cols-12 gap-4 p-4 items-start">
                          <div className="col-span-1 flex items-center justify-center">
                            {item.is_service_fee ? (
                              <div className="text-amber-500">
                                <CurrencyDollarIcon className="h-5 w-5" />
                              </div>
                            ) : item.item_featured_image ? (
                              <Avatar src={item.item_featured_image} className="size-10" square />
                            ) : (
                              <div className="size-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                                <span className="text-xs font-medium text-zinc-500">
                                  {(item.item_name || 'P').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="col-span-6">
                            <div className="mb-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={item.item_name || ''}
                                  onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                  placeholder="Item name"
                                  className="flex-1"
                                />
                                {item.is_service_fee && (
                                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                    Service Fee
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <Textarea
                                value={item.item_description || ''}
                                onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                                rows={5}
                                placeholder="Item description"
                              />
                            </div>
                          </div>

                          <div className="col-span-1 text-right hidden sm:block">
                            <Input
                              type="number"
                              value={item.qty || 1}
                              onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                              min="1"
                              step="1"
                              className="w-full text-right"
                              readOnly={item.is_service_fee}
                            />
                          </div>

                          <div className="col-span-2 text-right hidden sm:block">
                            <InputGroup>
                              <CurrencyDollarIcon />
                              <Input
                                type="text"
                                value={item.unit_price || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, '')
                                  updateItem(index, 'unit_price', value ? parseFloat(value) : 0)
                                }}
                                className="text-right"
                                placeholder="0.00"
                                readOnly={item.is_service_fee}
                              />
                            </InputGroup>
                          </div>

                          <div className="col-span-1 text-right text-zinc-950 text-sm/6 flex items-center justify-end">
                            {formatCurrency((item.qty || 0) * (item.unit_price || 0))}
                          </div>

                          <div className="col-span-1 flex items-center justify-end">
                            <Button
                              onClick={() => removeItem(index)}
                              plain
                              className="text-red-600 hover:text-red-500"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}

        {/* Total */}
        <div className="mt-8 flex justify-end items-center gap-4">
          {!isNew && invoiceItems.length > 0 && !invoiceItems.some(item => item.is_service_fee) && (
            <Button
              onClick={addCreditCardFee}
              disabled={saving || deleting}
              outline
            >
              Add Credit Card Fee (3.5%)
            </Button>
          )}
          <div className="text-right">
            <div className="text-lg/8 font-semibold text-zinc-950 ">
              Total: {formatCurrency(invoiceTotal)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Additional Comments</Subheading>
        <div className="mt-3">
          <Textarea
            value={formData.comment || ''}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            rows={4}
            placeholder="Any additional information about the event..."
          />
        </div>
      </div>

      {/* Approval Receipt Section */}
      {!isNew && invoice && invoice.invoice_approvals && invoice.invoice_approvals.length > 0 && invoice.invoice_approvals.some(approval => approval.signature) && (
        <div className="mt-12">
          <Subheading>Approval Receipt</Subheading>

          {(() => {
            // Show only the latest approval (most recent)
            const latestApproval = invoice.invoice_approvals[0] // Already ordered by created_at desc
            return (
              <div key={latestApproval.id} className="mt-3">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h5 className="font-medium text-gray-800 mb-2">Raw Signature Object:</h5>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 mb-4">
                  {JSON.stringify(latestApproval.signature, null, 2)}
                </pre>

                {latestApproval.signature ? (
                  <div>
                    {(() => {
                      // Handle both object and string signatures
                      let sig: unknown = latestApproval.signature

                      // If it's a string, try to parse it as JSON
                      if (typeof latestApproval.signature === 'string') {
                        try {
                          sig = JSON.parse(latestApproval.signature)
                        } catch (e) {
                          console.error('Failed to parse signature JSON:', e)
                          return <p className="text-red-600">Failed to parse signature JSON</p>
                        }
                      }

                      const typedSig = sig as {
                        typed_name?: string;
                        timestamp?: string;
                        ip_address?: string;
                        user_agent?: string;
                        signature_approved?: boolean;
                        geolocation?: { latitude?: number; longitude?: number; accuracy?: number };
                        signature_image_data?: string
                      }

                      return (
                        <div className="space-y-2 text-sm">
                          <p><strong>Typed Name:</strong> {typedSig.typed_name || 'N/A'}</p>
                          <p><strong>Timestamp:</strong> {typedSig.timestamp || 'N/A'}</p>
                          <p><strong>IP Address:</strong> {typedSig.ip_address || 'N/A'}</p>
                          <p><strong>User Agent:</strong> {typedSig.user_agent || 'N/A'}</p>
                          <p><strong>Signature Approved:</strong> {typedSig.signature_approved ? 'Yes' : 'No'}</p>
                          {typedSig.geolocation && (
                            <p><strong>Geolocation:</strong> Lat: {typedSig.geolocation.latitude}, Lng: {typedSig.geolocation.longitude}, Accuracy: {typedSig.geolocation.accuracy}m</p>
                          )}
                          {typedSig.signature_image_data && (
                            <div className="mt-4">
                              <h6 className="font-medium mb-2">Signature:</h6>
                              <img
                                src={typedSig.signature_image_data}
                                alt="Customer Signature"
                                className="border-2 border-gray-400 bg-white rounded shadow-md"
                                style={{ maxWidth: '500px', height: 'auto' }}
                                onError={(e) => {
                                  console.error('Image failed to load:', e)
                                  e.currentTarget.style.display = 'none'
                                }}
                                onLoad={() => console.log('Image loaded successfully')}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
            )
          })()}
        </div>
      )}

      {!isNew && invoice && (
        <div className="mt-12 flex justify-end">
          <button
            onClick={deleteInvoiceHandler}
            disabled={deleting || saving}
            className="text-sm text-red-600 hover:text-red-800   disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete invoice'}
          </button>
        </div>
      )}

      {/* Invoice Approval Request Modal */}
      {invoice && (
        <InvoiceApprovalRequestModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          invoice={invoice}
        />
      )}

      {/* Resend Confirmation Modal */}
      <Dialog open={showResendConfirmModal} onClose={() => setShowResendConfirmModal(false)}>
        <DialogTitle>Invoice Already Approved</DialogTitle>
        <DialogDescription>
          This invoice has already been approved. Are you sure you want to send another payment request?
          This is typically done when the invoice has been modified after approval.
        </DialogDescription>
        <DialogBody>
          <p className="text-sm text-gray-600">
            The client will receive a new payment link and the previous approval status may be affected.
          </p>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowResendConfirmModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowResendConfirmModal(false)
              setShowApprovalModal(true)
            }}
          >
            Send Payment Request
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}