'use client'

import { useState, useEffect } from 'react'
import { getActivityLogsWithDetails } from '@/lib/api/activity-logs'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import type { ActivityLogWithDetails } from '@/types/activity-logs'


function getActionBadgeClass(actionName: string): string {
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
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function formatUserName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return 'Unknown User'
  return `${firstName || ''} ${lastName || ''}`.trim()
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogWithDetails[]>([])
  const [allLogs, setAllLogs] = useState<ActivityLogWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getActivityLogsWithDetails()
        setAllLogs(data)
        setLogs(data)
      } catch (error) {
        console.error('Error fetching activity logs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  // Filter logs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setLogs(allLogs)
    } else {
      const filtered = allLogs.filter(log =>
        log.action_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.entity_number && log.entity_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.organization_name && log.organization_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.contact_first_name && log.contact_first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.contact_last_name && log.contact_last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user_first_name && log.user_first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user_last_name && log.user_last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setLogs(filtered)
    }
  }, [searchTerm, allLogs])

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between gap-4">
          <Heading>Activity Logs</Heading>
        </div>
        <div className="mt-8 text-center py-12">
          <div className="text-zinc-500">
            Loading activity logs...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heading>Activity Logs</Heading>
          <span className="text-sm text-zinc-500">
            ({logs.length} {logs.length === 1 ? 'entry' : 'entries'})
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="max-w-md">
          <InputGroup>
            <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search logs by action, entity, user, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Date</TableHeader>
            <TableHeader>User</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Entity</TableHeader>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Contact</TableHeader>
            <TableHeader>Details</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                {searchTerm ? (
                  `No activity logs found matching "${searchTerm}". Try adjusting your search.`
                ) : (
                  'No activity logs found.'
                )}
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-zinc-500">
                  {formatDate(log.created_at)}
                </TableCell>
                <TableCell>
                  {formatUserName(log.user_first_name, log.user_last_name)}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getActionBadgeClass(log.action_name)}`}>
                    {log.action_name}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getEntityTypeBadgeClass(log.entity_type)}`}>
                      {log.entity_type}
                    </span> */}
                    {log.entity_number && (
                      <span className="text-sm text-zinc-600">
                        {log.entity_number}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {log.organization_name || '—'}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {log.contact_first_name && log.contact_last_name
                    ? `${log.contact_first_name} ${log.contact_last_name}`
                    : '—'}
                </TableCell>
                <TableCell>
                  {Object.keys(log.metadata).length > 0 ? (
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 hover:text-blue-800">
                        View Details
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
