'use client'

import { usePathname } from 'next/navigation'
import { Heading } from '@/components/heading'
import { Link } from '@/components/link'

const settingsNavigation = [
  { name: 'General', href: '/settings' },
  { name: 'Disclosures', href: '/settings/disclosures' },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="mx-auto max-w-4xl">
      <Heading>Settings</Heading>

      {/* Settings Navigation */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {settingsNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`border-b-2 py-2 px-1 text-sm font-medium ${
                pathname === item.href
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="mt-8">
        {children}
      </div>
    </div>
  )
}