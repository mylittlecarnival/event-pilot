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
  MagnifyingGlassIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import {
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  getEstimateItems,
  createEstimateItem,
  updateEstimateItem,
  deleteEstimateItem,
  searchProductsAndEstimateItems
} from '@/lib/api/estimates'
import { logEstimateAction, getEntityActivityLogs } from '@/lib/api/activity-logs'
// import { recalculateServiceFee } from '@/lib/api/settings' // Temporarily disabled
import type {
  Estimate,
  EstimateItem,
  CreateEstimateData,
  CreateEstimateItemData,
  SearchResultItem
} from '@/types/estimates'
import { createInvoice, createInvoiceItem, getInvoicesByEstimateId, updateInvoice } from '@/lib/api/invoices'
import { logInvoiceAction } from '@/lib/api/activity-logs'
import { getDefaultProducts } from '@/lib/api/products'
import type { CreateInvoiceData, CreateInvoiceItemData } from '@/types/invoices'
import type { ActivityLog } from '@/types/activity-logs'
import { getOrganizations, type Organization } from '@/lib/api/organizations'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { ApprovalRequestModal } from '@/components/approval-request-modal'
import { TimePicker } from '@/components/time-picker'
import { generateEstimatePDF } from '@/lib/pdf-generator'
import { uploadFile } from '@/lib/supabase/storage'

export default function EstimateEdit() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  // State
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showResendConfirmModal, setShowResendConfirmModal] = useState(false)
  const [showConvertConfirmModal, setShowConvertConfirmModal] = useState(false)
  const [existingInvoicesCount, setExistingInvoicesCount] = useState(0)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)


  // Form data
  const [formData, setFormData] = useState<CreateEstimateData>({
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
  
  const filteredContacts = useMemo(
    () => formData.organization_id 
      ? contacts.filter(contact => contact.organization_id === formData.organization_id)
      : contacts,
    [contacts, formData.organization_id]
  )

  const estimateTotal = useMemo(
    () => estimateItems.reduce((sum, item) => sum + (item.qty || 0) * (item.unit_price || 0), 0),
    [estimateItems]
  )

  // Load activity logs
  const loadActivityLogs = useCallback(async (estimateId: string) => {
    setLoadingLogs(true)
    try {
      const logs = await getEntityActivityLogs('estimate', estimateId)
      setActivityLogs(logs)
    } catch (error) {
      console.error('Error loading activity logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [orgsData, contactsData] = await Promise.all([
        getOrganizations(),
        getContacts()
      ])
      setOrganizations(orgsData)
      setContacts(contactsData)

      if (!isNew) {
        const [estimateData, itemsData] = await Promise.all([
          getEstimate(id),
          getEstimateItems(id)
        ])

        if (estimateData) {
          setEstimate(estimateData)

          // Default products are now added in the modal, so just load items
          setEstimateItems(itemsData)

          setFormData({
            organization_id: estimateData.organization_id,
            contact_id: estimateData.contact_id,
            status: estimateData.status,
            organization: estimateData.organization || 'no',
            guests: estimateData.guests || 1,
            event_type: estimateData.event_type,
            event_address_street: estimateData.event_address_street,
            event_address_unit: estimateData.event_address_unit,
            event_city: estimateData.event_city,
            event_state: estimateData.event_state || 'California',
            event_zipcode: estimateData.event_zipcode,
            event_county: estimateData.event_county,
            event_date: estimateData.event_date,
            event_start_time: estimateData.event_start_time,
            event_end_time: estimateData.event_end_time,
            comment: estimateData.comment,
            referred_by: estimateData.referred_by,
          })
          
          // Load activity logs for existing estimates
          loadActivityLogs(estimateData.id)
        }
        setEstimateItems(itemsData)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      console.error('Error loading data:', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [id, isNew, loadActivityLogs])

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
      const results = await searchProductsAndEstimateItems(query)
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

  // Auto-recalculate service fee when non-service-fee items change
  const nonServiceFeeItemsString = useMemo(() => {
    return JSON.stringify(
      estimateItems
        .filter(item => !item.is_service_fee)
        .map(item => ({ qty: item.qty, unit_price: item.unit_price }))
    )
  }, [estimateItems])

  // Form handlers
  const handleInputChange = (field: keyof CreateEstimateData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleOrganization = () => {
    const newValue = formData.organization === 'yes' ? 'no' : 'yes'
    setFormData(prev => ({
      ...prev,
      organization: newValue,
      organization_id: newValue === 'no' ? null : prev.organization_id,
      contact_id: newValue === 'no' ? null : prev.contact_id,
    }))
  }

  const handleOrganizationChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      organization_id: value || null,
      contact_id: null, // Clear contact when organization changes
    }))
  }

  // Product and item handlers
  const addItemToEstimate = useCallback(async (item: SearchResultItem) => {
    if (!estimate?.id && !isNew) return

    const newItem: CreateEstimateItemData = {
      estimate_id: estimate?.id || '',
      product_id: item.source === 'product' ? item.id : item.product_id || null,
      qty: 1,
      unit_price: item.unit_price || 0,
      item_name: item.name,
      item_description: item.description,
      item_sku: item.sku,
      item_featured_image: item.featured_image,
      is_custom: item.source === 'estimate_item' ? (item.is_custom || false) : false,
      sort_order: 0,
    }

    try {
      if (isNew) {
        // For new estimates, add to local state at first position
        const tempItem: EstimateItem = {
          id: `temp_${Date.now()}`,
          estimate_id: '',
          product_id: newItem.product_id || null,
          qty: newItem.qty,
          unit_price: newItem.unit_price || null,
          item_name: newItem.item_name || null,
          item_description: newItem.item_description || null,
          item_sku: newItem.item_sku || null,
          item_featured_image: newItem.item_featured_image || null,
          is_custom: newItem.is_custom || false,
          sort_order: 0,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
        }
        // Add to beginning and update sort orders for existing items
        setEstimateItems(prev => {
          const updatedItems = prev.map(item => ({
            ...item,
            sort_order: (item.sort_order ?? 0) + 1
          }))
          return [tempItem, ...updatedItems]
        })
      } else {
        // For existing estimates, update sort orders of existing items first
        const updatePromises = estimateItems.map((item, index) => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateEstimateItem(item.id, { sort_order: index + 1 })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)

        const createdItem = await createEstimateItem(newItem)
        if (createdItem) {
          // Add to beginning and update sort orders for existing items
          setEstimateItems(prev => {
            const updatedItems = prev.map(item => ({
              ...item,
              sort_order: (item.sort_order ?? 0) + 1
            }))
            return [createdItem, ...updatedItems]
          })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product'
      console.error('Failed to add product to estimate:', error)
      setError(errorMessage)
    }

    setSearchTerm('')
    setSearchResults([])
  }, [estimate?.id, isNew, estimateItems.length])

  const addCustomItem = useCallback(async () => {
    if (!estimate?.id && !isNew) return

    const newItem: CreateEstimateItemData = {
      estimate_id: estimate?.id || '',
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
        // For new estimates, add to local state at first position
        const tempItem: EstimateItem = {
          id: `temp_${Date.now()}`,
          estimate_id: '',
          product_id: null,
          qty: 1,
          unit_price: 0,
          item_name: 'Custom Item',
          item_description: '',
          item_sku: '',
          item_featured_image: null,
          is_custom: true,
          sort_order: 0,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
        }
        // Add to beginning and update sort orders for existing items
        setEstimateItems(prev => {
          const updatedItems = prev.map(item => ({
            ...item,
            sort_order: (item.sort_order ?? 0) + 1
          }))
          return [tempItem, ...updatedItems]
        })
      } else {
        // For existing estimates, update sort orders of existing items first
        const updatePromises = estimateItems.map((item, index) => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateEstimateItem(item.id, { sort_order: index + 1 })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)

        const createdItem = await createEstimateItem(newItem)
        if (createdItem) {
          // Add to beginning and update sort orders for existing items
          setEstimateItems(prev => {
            const updatedItems = prev.map(item => ({
              ...item,
              sort_order: (item.sort_order ?? 0) + 1
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
  }, [estimate?.id, isNew, estimateItems.length])

  const updateItem = useCallback(async (index: number, field: keyof EstimateItem, value: string | number | null) => {
    const updatedItems = [...estimateItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setEstimateItems(updatedItems)

    // Update in database if not a new estimate
    if (!isNew && updatedItems[index].id && !updatedItems[index].id.startsWith('temp_')) {
      try {
        await updateEstimateItem(updatedItems[index].id, { [field]: value })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update item'
        console.error('Failed to update item:', error)
        setError(errorMessage)
      }
    }
  }, [estimateItems, isNew])

  const removeItem = useCallback(async (index: number) => {
    const item = estimateItems[index]

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.item_name || 'this item'}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    const updatedItems = estimateItems.filter((_, i) => i !== index)
    setEstimateItems(updatedItems)

    // Delete from database if not a new estimate and item has an ID
    if (!isNew && item.id && !item.id.startsWith('temp_')) {
      try {
        await deleteEstimateItem(item.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete item'
        console.error('Failed to delete item:', error)
        setError(errorMessage)
        // Restore the item if deletion failed
        setEstimateItems(estimateItems)
      }
    }
  }, [estimateItems, isNew])

  // Add credit card fee
  const addCreditCardFee = useCallback(async () => {
    // Check if a credit card fee already exists
    const existingFee = estimateItems.find(item => item.is_service_fee)
    if (existingFee) {
      alert('A credit card fee has already been added to this estimate.')
      return
    }

    // Calculate 3.5% of subtotal (excluding service fees)
    const subtotal = estimateItems
      .filter(item => !item.is_service_fee)
      .reduce((sum, item) => sum + (item.qty * (item.unit_price || 0)), 0)

    const feeAmount = Math.round(subtotal * 0.035 * 100) / 100 // 3.5% rounded to 2 decimal places

    if (feeAmount <= 0) {
      alert('Cannot add credit card fee: No items in estimate.')
      return
    }

    const newFeeItem: CreateEstimateItemData = {
      estimate_id: estimate?.id || '',
      qty: 1,
      unit_price: feeAmount,
      item_name: 'Credit Card Service Fee',
      item_description: 'Service fee (3.5%)',
      item_sku: null,
      item_featured_image: null,
      is_custom: true,
      is_service_fee: true,
      sort_order: estimateItems.length,
    }

    try {
      if (isNew) {
        // For new estimates, add to local state
        const tempItem: EstimateItem = {
          id: `temp_fee_${Date.now()}`,
          estimate_id: '',
          product_id: null,
          qty: 1,
          unit_price: feeAmount,
          item_name: 'Credit Card Service Fee',
          item_description: 'Service fee (3.5%)',
          item_sku: null,
          item_featured_image: null,
          is_custom: true,
          is_service_fee: true,
          sort_order: estimateItems.length,
          created_at: new Date().toISOString(),
          created_by_email: null,
          updated_at: new Date().toISOString(),
          updated_by_email: null,
        }
        setEstimateItems(prev => [...prev, tempItem])
      } else {
        // For existing estimates, save to database
        const createdItem = await createEstimateItem(newFeeItem)
        if (createdItem) {
          setEstimateItems(prev => [...prev, createdItem])
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add credit card fee'
      console.error('Failed to add credit card fee:', error)
      setError(errorMessage)
    }
  }, [estimateItems, estimate?.id, isNew])

  // Recalculate existing service fee when items change
  const recalculateServiceFee = useCallback(async () => {
    const serviceFeeIndex = estimateItems.findIndex(item => item.is_service_fee)
    if (serviceFeeIndex === -1) return // No service fee to recalculate

    // Calculate new subtotal (excluding service fees)
    const subtotal = estimateItems
      .filter(item => !item.is_service_fee)
      .reduce((sum, item) => sum + (item.qty * (item.unit_price || 0)), 0)

    const newFeeAmount = Math.round(subtotal * 0.035 * 100) / 100 // 3.5% rounded to 2 decimal places

    // Update the service fee amount
    const serviceFeeItem = estimateItems[serviceFeeIndex]
    if (serviceFeeItem.unit_price !== newFeeAmount) {
      await updateItem(serviceFeeIndex, 'unit_price', newFeeAmount)
    }
  }, [estimateItems, updateItem])

  // useEffect to trigger recalculation when items change
  useEffect(() => {
    // Only recalculate if there's a service fee and we're not in a new estimate
    if (!isNew && estimateItems.some(item => item.is_service_fee)) {
      recalculateServiceFee()
    }
  }, [nonServiceFeeItemsString, recalculateServiceFee, isNew, estimateItems])

  const handleReorder = useCallback(async (newItems: EstimateItem[]) => {
    // Temporarily simplified - no service fee handling
    setEstimateItems(newItems)

    // Auto-save reordering for existing estimates
    if (!isNew && estimate?.id) {
      try {
        const updatePromises = newItems.map((item, index) => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateEstimateItem(item.id, { ...item, sort_order: index })
          }
          return Promise.resolve(null)
        })
        await Promise.all(updatePromises)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save item order'
        console.error('Failed to auto-save item order:', error)
        setError(errorMessage)
      }
    }
  }, [isNew, estimate?.id])

  // Save estimate
  const saveEstimate = useCallback(async () => {
    if (saving) return

    setSaving(true)
    setError(null)
    setSaved(false)
    
    try {
      if (isNew) {
        const newEstimate = await createEstimate(formData)
        if (newEstimate) {
          setEstimate(newEstimate)

          // Create estimate items from existing items
          const itemPromises = estimateItems.map(item =>
            createEstimateItem({
              ...item,
              estimate_id: newEstimate.id,
            })
          )

          // Get default products and add them to the estimate
          const defaultProducts = await getDefaultProducts()
          const defaultItemPromises = defaultProducts.map((product, index) => {
            const estimateItemData = {
              estimate_id: newEstimate.id,
              product_id: product.id,
              qty: 1, // Default quantity
              unit_price: product.unit_price || 0,
              item_name: product.name,
              item_description: product.description,
              item_sku: product.sku,
              item_featured_image: product.featured_image,
              is_custom: false,
              sort_order: estimateItems.length + index + 1, // Add after existing items
            }
            return createEstimateItem(estimateItemData)
          })

          // Create all estimate items (existing items + default products)
          const allItemPromises = [...itemPromises, ...defaultItemPromises]
          const createdItems = await Promise.all(allItemPromises)
          setEstimateItems(createdItems.filter(Boolean) as EstimateItem[])

          // Redirect to the edit page for the newly created estimate
          router.push(`/estimates/${newEstimate.id}`)
          return
        }
      } else if (estimate) {
        // Check if status changed
        const statusChanged = estimate.status !== formData.status
        const oldStatus = estimate.status
        const newStatus = formData.status

        await updateEstimate(estimate.id, formData)

        // Log status change separately if it occurred
        if (statusChanged) {
          try {
            await logEstimateAction(
              estimate.id,
              'Status Changed',
              {
                estimate_number: estimate.estimate_number,
                old_status: oldStatus,
                new_status: newStatus,
                organization_id: estimate.organization_id,
                contact_id: estimate.contact_id
              }
            )
          } catch (logError) {
            console.error('Failed to log status change:', logError)
            // Don't fail the entire operation if logging fails
          }
        }

        // Update estimate items efficiently
        const updatePromises = estimateItems.map(item => {
          if (item.id && !item.id.startsWith('temp_')) {
            return updateEstimateItem(item.id, item)
          } else {
            return createEstimateItem({
              ...item,
              estimate_id: estimate.id,
            })
          }
        })

        await Promise.all(updatePromises)
        console.log('Estimate saved successfully!')
        
        // Refresh activity logs after saving
        if (estimate) {
          loadActivityLogs(estimate.id)
        }
      }
      
      // Show success message
      setSaved(true)
      // Clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save estimate'
      console.error('Save error:', error)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }, [saving, formData, estimateItems, isNew, estimate, loadActivityLogs, router])

  // Delete estimate
  const deleteEstimateHandler = useCallback(async () => {
    if (!estimate || isNew || deleting) return

    // Check if there are invoices associated with this estimate
    try {
      const associatedInvoices = await getInvoicesByEstimateId(estimate.id)

      if (associatedInvoices.length > 0) {
        const invoiceNumbers = associatedInvoices.map(invoice => `#${invoice.invoice_number}`).join(', ')
        alert(
          `This estimate cannot be deleted because it is assigned to the following invoice(s):\n\n${invoiceNumbers}\n\nPlease delete or disconnect the invoice(s) first before deleting this estimate.`
        )
        return
      }
    } catch (error) {
      console.error('Error checking for associated invoices:', error)
      setError('Failed to check for associated invoices. Please try again.')
      return
    }

    // Show confirmation dialog with text input
    const confirmationText = 'delete'
    const userInput = window.prompt(
      `Are you sure you want to delete this estimate?\n\nThis action cannot be undone and will permanently remove:\n- Estimate #${estimate.estimate_number}\n- All associated items\n- All estimate data\n\nType "${confirmationText}" to confirm deletion:`
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
      await deleteEstimate(estimate.id)
      // Redirect to estimates list after successful deletion
      router.push('/estimates')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete estimate'
      console.error('Delete error:', error)
      setError(errorMessage)
    } finally {
      setDeleting(false)
    }
  }, [estimate, isNew, deleting, router])

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

  // Handle Request Approval button click
  const handleRequestApproval = () => {
    if (estimate?.status === 'approved') {
      setShowResendConfirmModal(true)
    } else {
      setShowApprovalModal(true)
    }
  }

  // Activity log helper functions
  const getActionBadgeClass = useCallback((actionName: string): string => {
    const action = actionName.toLowerCase()

    if (action.includes('created')) {
      return 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20'
    } else if (action.includes('updated')) {
      return 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10'
    } else if (action.includes('status changed')) {
      return 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20'
    } else if (action.includes('deleted')) {
      return 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10'
    } else if (action.includes('converted')) {
      return 'bg-purple-50 text-purple-700 inset-ring inset-ring-purple-700/10'
    } else if (action.includes('sent')) {
      return 'bg-indigo-50 text-indigo-700 inset-ring inset-ring-indigo-700/10'
    } else if (action.includes('approved')) {
      return 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20'
    } else if (action.includes('rejected')) {
      return 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10'
    } else if (action.includes('refund')) {
      return 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20'
    } else {
      return 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10'
    }
  }, [])

  const formatActivityDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }, [])

  const formatUserName = useCallback((firstName: string | null, lastName: string | null): string => {
    if (!firstName && !lastName) return 'Unknown User'
    return `${firstName || ''} ${lastName || ''}`.trim()
  }, [])

  // Convert estimate to invoice
  // Check for existing invoices before showing modal
  const handleConvertToInvoice = useCallback(async () => {
    if (!estimate || isNew || converting) return

    try {
      const existingInvoices = await getInvoicesByEstimateId(estimate.id)
      setExistingInvoicesCount(existingInvoices.length)
      setShowConvertConfirmModal(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check existing invoices')
    }
  }, [estimate, isNew, converting])

  const convertToInvoice = useCallback(async () => {
    if (!estimate || isNew || converting) return

    setConverting(true)
    setError(null)

    try {
      // Check for existing invoices for this estimate and set them to canceled
      const existingInvoices = await getInvoicesByEstimateId(estimate.id)
      if (existingInvoices.length > 0) {
        console.log(`Found ${existingInvoices.length} existing invoice(s) for estimate ${estimate.estimate_number}`)

        // Update all existing invoices to "canceled" status
        const cancelPromises = existingInvoices.map(existingInvoice => {
          console.log(`Setting invoice ${existingInvoice.invoice_number} to canceled status`)
          return updateInvoice(existingInvoice.id, { status: 'canceled' })
        })

        await Promise.all(cancelPromises)
        console.log('All existing invoices set to canceled status')
      }

      // Create invoice data from estimate data
      const invoiceData: CreateInvoiceData = {
        organization_id: estimate.organization_id,
        contact_id: estimate.contact_id,
        status: 'draft', // Start as draft
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
        estimate_id: estimate.id, // Link to original estimate
      }

      // Create the invoice
      const newInvoice = await createInvoice(invoiceData)
      if (!newInvoice) {
        throw new Error('Failed to create invoice')
      }

      // Create invoice items from estimate items (copy all items including service fees)
      const itemPromises = estimateItems.map(item => {
        const invoiceItemData: CreateInvoiceItemData = {
          invoice_id: newInvoice.id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          item_name: item.item_name,
          item_description: item.item_description,
          item_sku: item.item_sku,
          item_featured_image: item.item_featured_image,
          is_custom: item.is_custom,
          is_service_fee: item.is_service_fee, // Copy service fee status
          sort_order: item.sort_order,
        }
        return createInvoiceItem(invoiceItemData)
      })

      // Create invoice items (only copy from estimate - no default products)
      await Promise.all(itemPromises)

      // Log the conversion in both estimate and invoice activity logs
      try {
        await Promise.all([
          logEstimateAction(
            estimate.id,
            'Converted to Invoice',
            {
              estimate_number: estimate.estimate_number,
              invoice_id: newInvoice.id,
              invoice_number: newInvoice.invoice_number,
            }
          ),
          logInvoiceAction(
            newInvoice.id,
            'Created from Estimate',
            {
              invoice_number: newInvoice.invoice_number,
              estimate_id: estimate.id,
              estimate_number: estimate.estimate_number,
              organization_id: newInvoice.organization_id,
              contact_id: newInvoice.contact_id,
            }
          )
        ])
      } catch (logError) {
        console.error('Failed to log conversion:', logError)
        // Don't fail the entire operation if logging fails
      }

      // Redirect to the new invoice
      router.push(`/invoices/${newInvoice.id}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert estimate to invoice'
      console.error('Conversion error:', error)
      setError(errorMessage)
    } finally {
      setConverting(false)
    }
  }, [estimate, estimateItems, isNew, converting, router])

  // Generate PDF function
  const generatePDF = useCallback(async () => {
    if (!estimate || isNew || generatingPDF) return

    setGeneratingPDF(true)
    setError(null)

    try {
      // Generate PDF blob
      const pdfBlob = await generateEstimatePDF({
        estimate,
        estimateItems
      })

      // Create filename with estimate number and status
      const filename = `${estimate.estimate_number}_${estimate.status.toUpperCase().replace(/\s+/g, '_')}.pdf`

      // Upload to Supabase storage - try Estimates bucket first, fallback to estimates lowercase, then invoices
      let result = await uploadFile({
        bucket: 'Estimates',
        path: filename,
        file: pdfBlob,
        contentType: 'application/pdf'
      })

      // If Estimates bucket doesn't exist, try lowercase estimates
      if (result.error && result.error.includes('Bucket not found')) {
        console.log('Estimates bucket not found, trying lowercase estimates bucket...')
        result = await uploadFile({
          bucket: 'estimates',
          path: filename,
          file: pdfBlob,
          contentType: 'application/pdf'
        })
      }

      // If still not found, try invoices bucket
      if (result.error && result.error.includes('Bucket not found')) {
        console.log('estimates bucket not found, trying invoices bucket...')
        result = await uploadFile({
          bucket: 'invoices',
          path: `estimates/${filename}`,
          file: pdfBlob,
          contentType: 'application/pdf'
        })
      }

      if (result.error) {
        console.error('Storage upload failed:', result.error)
        setError(`Failed to save PDF to storage: ${result.error}. Please contact administrator to create the 'estimates' bucket.`)
        return
      }

      console.log('PDF uploaded successfully to:', result.path)

      // Create download link and trigger download
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Log the PDF generation activity
      try {
        await logEstimateAction(
          estimate.id,
          'PDF Generated',
          {
            estimate_number: estimate.estimate_number,
            filename,
            file_path: result.path,
            organization_id: estimate.organization_id,
            contact_id: estimate.contact_id
          }
        )
      } catch (logError) {
        console.error('Failed to log PDF generation:', logError)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF'
      console.error('PDF generation error:', error)
      setError(errorMessage)
    } finally {
      setGeneratingPDF(false)
    }
  }, [estimate, estimateItems, isNew, generatingPDF])

  // Recalculate service fee based on current settings
  // const handleRecalculateServiceFee = useCallback(async () => {
  //   if (!estimate?.id) return

  //   try {
  //     await recalculateServiceFee(estimate.id)
  //     // Refresh estimate items to show updated service fee
  //     const updatedItems = await getEstimateItems(estimate.id)
  //     setEstimateItems(updatedItems)
  //   } catch (error) {
  //     console.error('Error recalculating service fee:', error)
  //     setError(error instanceof Error ? error.message : 'Failed to recalculate service fee')
  //   }
  // }, [estimate?.id])

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
        <Link href="/estimates" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500">
          <ChevronLeftIcon className="size-4 text-zinc-400" />
          Estimates
        </Link>
      </div>
      
      <div className="mt-4 lg:mt-8">
        <div className="flex items-center gap-4">
          <Heading>
            {isNew ? 'Create Estimate' : `Estimate #${estimate?.estimate_number || id}`}
          </Heading>
          {!isNew && estimate && (
            <>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                estimate.status === 'draft' ? 'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10' :
                estimate.status === 'sent for approval' ? 'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10' :
                estimate.status === 'approved' ? 'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20' :
                estimate.status === 'rejected' ? 'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10' : 'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20'
              }`}>
                {estimate.status === 'sent for approval' ? 'Sent for Approval' :
                 estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
              </span>
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title={generatingPDF ? 'Generating PDF...' : 'Generate PDF'}
              >
                <DocumentTextIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>



        <div className="isolate mt-2.5 flex flex-wrap justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap gap-x-10 gap-y-4 py-1.5">
            {!isNew && estimate && (
              <>
                <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6">
                  <CalendarIcon className="size-4 shrink-0 text-zinc-400" />
                  <span>{formData.event_date ? formatDate(formData.event_date) : 'Not set'}</span>
                </span>
                <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6">
                  <CurrencyDollarIcon className="size-4 shrink-0 text-zinc-400" />
                  <span>{formatCurrency(estimateTotal)}</span>
                </span>
                {formData.guests && (
                  <span className="flex items-center gap-3 text-base/6 text-zinc-950 sm:text-sm/6">
                    <UserGroupIcon className="size-4 shrink-0 text-zinc-400" />
                    <span>{formData.guests} guests</span>
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-4">
            {error && (
              <div className="flex items-center text-sm text-red-600">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {saved && (
              <div className="flex items-center text-sm text-green-600">
                <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Estimate Saved Successfully
              </div>
            )}
            <Button onClick={saveEstimate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Estimate'}
            </Button>
            {!isNew && estimate && (
              <div className="flex items-center gap-4">
                <Button
                  outline
                  onClick={handleRequestApproval}
                  disabled={saving || deleting || converting || !selectedContact}
                >
                  Request Approval
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Subheading>Summary</Subheading>
        <Divider className="mt-4" />
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
              <div className="mt-2 text-zinc-500">No customer selected</div>
            )}
          </DescriptionDetails>
          
          <DescriptionTerm>Event Location</DescriptionTerm>
          <DescriptionDetails>
            {formData.event_address_street ? (
              <>
                <MapPinIcon className="inline size-4 mr-1 text-grey-900" />
                {formData.event_address_street}
                {formData.event_address_unit && `, #${formData.event_address_unit}`}
                {formData.event_city && ` ${formData.event_city}`}
                {formData.event_city && formData.event_state && ', '}
                {formData.event_state && formData.event_state}
                {formData.event_zipcode && ` ${formData.event_zipcode}`}
              </>
            ) : (
              <span className="text-zinc-500">No address specified</span>
            )}
          </DescriptionDetails>
          
          <DescriptionTerm>Event Details</DescriptionTerm>
          <DescriptionDetails>
            {formData.event_date && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-zinc-400" />
                <span>{new Date(formData.event_date).toLocaleDateString()}</span>
                {(formData.event_start_time || formData.event_end_time) && (
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-4 text-zinc-400" />
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
                <UserGroupIcon className="size-4 text-zinc-400" />
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
              <label className="block text-sm/6 font-medium text-zinc-950">Organization</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Contact</label>
            <div className="mt-2">
              <Select
                value={formData.contact_id || ''}
                onChange={(e) => handleInputChange('contact_id', e.target.value || null)}
              >
                <option value="">Select Contact</option>
                {filteredContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} ({contact.email})
                  </option>
                ))}
              </Select>
              {formData.contact_id && !filteredContacts.find(c => c.id === formData.contact_id) && (
                <div className="mt-1 text-sm text-red-600">
                  ⚠️ Contact not available for this organization - will be cleared on save
                </div>
              )}
            </div>
          </div>

          {/* Referred By */}
          <div>
            <label className="block text-sm/6 font-medium text-zinc-950">Referred By</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Street Address</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Unit/Apartment</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">City</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">State</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Zipcode</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">County</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Number of Guests</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Event Type</label>
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
            <label className="block text-sm/6 font-medium text-zinc-950">Event Date</label>
            <div className="mt-2">
              <Input
                type="date"
                value={formData.event_date || ''}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
              />
            </div>
          </div>

          {/* Event Times */}
          <div className="sm:col-span-2 lg:col-span-3">
            <TimePicker
              startTime={formData.event_start_time}
              endTime={formData.event_end_time}
              onStartTimeChange={(time) => handleInputChange('event_start_time', time)}
              onEndTimeChange={(time) => handleInputChange('event_end_time', time)}
              disabled={saving}
            />
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
                placeholder="Search products and previous estimates..."
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
                      onClick={() => addItemToEstimate(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm/6 font-medium text-gray-900">{item.name}</h4>
                            {item.source === 'estimate_item' && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10">
                                From Previous Estimates
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
        <Subheading>Estimate Items</Subheading>
        <Divider className="mt-4" />

        {estimateItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm/6 text-zinc-500">
              No items added yet. Search for products above to get started.
            </p>
          </div>
        ) : (
                <div className="mt-3 overflow-x-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 pb-3 px-3 text-sm font-semibold text-zinc-950">
                
                    <div className="col-span-1"></div>
                    <div className="col-span-5">Product Image, Name, Description</div>
                    <div className="col-span-1 hidden sm:block">Qty</div>
                    <div className="col-span-2 hidden sm:block">Unit Price</div>
                    <div className="col-span-2 text-left">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {/* All Items (Reorderable) */}
                  <Reorder.Group
                    axis="y"
                    values={estimateItems}
                    onReorder={handleReorder}
                    className="space-y-1 mt-4"
                  >
                    {estimateItems.map((item, index) => (
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

                          <div className="col-span-5">
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
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price || ''}
                                onChange={(e) => {
                                  const inputValue = e.target.value
                                  // Allow valid decimal format: up to 2 decimal places
                                  if (/^\d*\.?\d{0,2}$/.test(inputValue) || inputValue === '') {
                                    const value = parseFloat(inputValue) || 0
                                    updateItem(index, 'unit_price', value)
                                  }
                                }}
                                onBlur={(e) => {
                                  let value = parseFloat(e.target.value) || 0
                                  // Round to 2 decimal places and ensure consistent formatting
                                  value = Math.round(value * 100) / 100
                                  updateItem(index, 'unit_price', value)
                                }}
                                className="text-right"
                                placeholder="0.00"
                                readOnly={item.is_service_fee}
                              />
                            </InputGroup>
                          </div>

                          <div className="col-span-2 text-left text-zinc-950 text-sm/6 flex items-center justify-start">
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

                  {/* Service fee section temporarily removed */}
                </div>
              )}

        {/* Total */}
        <div className="mt-8 flex justify-end items-center gap-4">
          {!isNew && estimateItems.length > 0 && !estimateItems.some(item => item.is_service_fee) && (
            <Button
              onClick={addCreditCardFee}
              disabled={saving || deleting || converting}
              outline
            >
              Add Credit Card Fee (3.5%)
            </Button>
          )}
          <div className="text-right">
            <div className="text-lg/8 font-semibold text-zinc-950">
              Total: {formatCurrency(estimateTotal)}
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
      {!isNew && estimate && estimate.estimate_approvals && estimate.estimate_approvals.length > 0 && estimate.estimate_approvals.some(approval => approval.signature) && (
        <div className="mt-12">
          <Subheading>Approval Receipt</Subheading>

          {(() => {
            // Show only the latest approval (most recent)
            const latestApproval = estimate.estimate_approvals[0] // Already ordered by created_at desc
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

      {/* Activity Log Section */}
      {/* {!isNew && estimate && (
        <div className="mt-12">
          <Subheading>Activity Log</Subheading>
          <Divider className="mt-4" />
          
          {loadingLogs ? (
            <div className="mt-6 text-center py-8">
              <div className="text-zinc-500">Loading activity logs...</div>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="mt-6 text-center py-8">
              <div className="text-zinc-500">No activity logs found for this estimate.</div>
            </div>
          ) : (
            <div className="">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatActivityDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatUserName(log.user_first_name, log.user_last_name)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getActionBadgeClass(log.action_name)}`}>
                            {log.action_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {Object.keys(log.metadata).length > 0 ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:text-blue-800">
                                View Details
                              </summary>
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            </details>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )} */}

      {!isNew && estimate && (
        <div className="mt-12 flex justify-between">
          <button
            onClick={handleConvertToInvoice}
            disabled={saving || deleting || converting}
            className="text-sm text-emerald-600 hover:text-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? 'Converting...' : 'Convert to Invoice'}
          </button>
          <button
            onClick={deleteEstimateHandler}
            disabled={deleting || saving}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete estimate'}
          </button>
        </div>
      )}

      {/* Approval Request Modal */}
      {estimate && (
        <ApprovalRequestModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          estimate={estimate}
        />
      )}

      {/* Resend Confirmation Modal */}
      <Dialog open={showResendConfirmModal} onClose={() => setShowResendConfirmModal(false)}>
        <DialogTitle>Estimate Already Approved</DialogTitle>
        <DialogDescription>
          This estimate has already been approved. Are you sure you want to send another approval request?
          This is typically done when the estimate has been modified after approval.
        </DialogDescription>
        <DialogBody>
          <p className="text-sm text-gray-600">
            The client will receive a new approval link and the previous approval status may be affected.
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
            Send New Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert to Invoice Confirmation Modal */}
      <Dialog open={showConvertConfirmModal} onClose={() => setShowConvertConfirmModal(false)}>
        <DialogTitle>Convert Estimate to Invoice</DialogTitle>
        <DialogDescription>
          {existingInvoicesCount > 0 ? (
            `This estimate already has ${existingInvoicesCount} existing invoice${existingInvoicesCount > 1 ? 's' : ''}. Creating a new invoice will mark the previous invoice${existingInvoicesCount > 1 ? 's' : ''} as cancelled.`
          ) : (
            'This will create a new invoice with all the current estimate details and items.'
          )}
        </DialogDescription>
        <DialogBody>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• A new invoice will be created with all current estimate details</p>
            <p>• The estimate will remain unchanged</p>
            {existingInvoicesCount > 0 && (
              <p className="text-amber-600 font-medium">• {existingInvoicesCount} existing invoice{existingInvoicesCount > 1 ? 's' : ''} will be marked as cancelled</p>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowConvertConfirmModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowConvertConfirmModal(false)
              convertToInvoice()
            }}
            disabled={converting}
          >
            {existingInvoicesCount > 0 ? 'Create Duplicate Invoice' : 'Convert to Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}