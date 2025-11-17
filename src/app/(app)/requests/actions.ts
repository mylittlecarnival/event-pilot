'use server'

import { deleteRequest as deleteRequestAPI, convertRequestToEstimate as convertRequestToEstimateAPI } from '@/lib/api/requests-server'
import { revalidatePath } from 'next/cache'

export async function deleteRequest(id: string) {
  try {
    await deleteRequestAPI(id)
    revalidatePath('/requests')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteRequest action:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete request'
    }
  }
}

export async function convertRequestToEstimate(id: string) {
  try {
    const estimateId = await convertRequestToEstimateAPI(id)
    revalidatePath('/requests')
    revalidatePath('/estimates')
    return { success: true, estimateId }
  } catch (error) {
    console.error('Error in convertRequestToEstimate action:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert request to estimate'
    }
  }
}
