'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  HomeIcon,
  AdjustmentsVerticalIcon,
  BuildingOffice2Icon,
  CubeTransparentIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="#">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <LightBulbIcon />
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="/logout">
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

interface User {
  id: string
  email?: string
}

interface Profile {
  first_name?: string
  last_name?: string
  avatar_url?: string
}


export function ApplicationLayout({
  children,
  user,
  profile,
}: {
  children: React.ReactNode
  user: User | null
  profile: Profile | null
}) {
  const pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar 
                  src={profile?.avatar_url || "/users/placeholder.svg"} 
                  square 
                  alt={profile?.first_name || user?.email?.split('@')[0] || 'User'}
                />
              </DropdownButton>
              <AccountDropdownMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <img src="/event-pilot.svg" alt="Event Pilot" className="h-6 w-auto" />
                <ChevronDownIcon />
              </DropdownButton>
              <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
                {/* <DropdownItem href="/settings">
                  <Cog8ToothIcon />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider /> */}
                <DropdownItem href="#">
                  <Avatar slot="icon" initials="TJ" className="bg-red-500 text-white" />
                  <DropdownLabel>Tijuana, BC</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="#">
                  <Avatar slot="icon" initials="SD" className="bg-purple-500 text-white" />
                  <DropdownLabel>San Diego, CA</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="#">
                  <PlusIcon />
                  <DropdownLabel>New Office&hellip;</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === '/'}>
                <HomeIcon />
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/estimates" current={pathname.startsWith('/estimates')}>
                <DocumentTextIcon />
                <SidebarLabel>Estimates</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/invoices" current={pathname.startsWith('/invoices')}>
                <ClipboardDocumentIcon />
                <SidebarLabel>Invoices</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/products" current={pathname.startsWith('/products')}>
                <CubeTransparentIcon />
                <SidebarLabel>Products</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/contacts" current={pathname.startsWith('/contacts')}>
                <UserGroupIcon />
                <SidebarLabel>Contacts</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/organizations" current={pathname.startsWith('/organizations')}>
                <BuildingOffice2Icon />
                <SidebarLabel>Organizations</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/activity-logs" current={pathname.startsWith('/activity-logs')}>
                <ClockIcon />
                <SidebarLabel>Activity Logs</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
                <AdjustmentsVerticalIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>
            </SidebarSection>

            {/* <SidebarSection className="max-lg:hidden">
              <SidebarHeading>Upcoming Events</SidebarHeading>
              {events.length > 0 ? (
                events.map((event) => (
                  <SidebarItem key={event.id} href={event.url}>
                    {event.name}
                  </SidebarItem>
                ))
              ) : (
                <div className="px-2 py-1 text-sm text-zinc-500">
                  Loading events...
                </div>
              )}
            </SidebarSection> */}

            <SidebarSpacer />

            {/* <SidebarSection>
              <SidebarItem href="#">
                <QuestionMarkCircleIcon />
                <SidebarLabel>Support</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="#">
                <SparklesIcon />
                <SidebarLabel>Changelog</SidebarLabel>
              </SidebarItem>
            </SidebarSection> */}
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar src="/users/placeholder.svg" className="size-10" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950">
                      {profile?.first_name && profile?.last_name 
                        ? `${profile.first_name} ${profile.last_name}`.trim()
                        : profile?.first_name || (user?.email ? user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'User')
                      }
                    </span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500">
                      {user?.email || 'user@example.com'}
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
