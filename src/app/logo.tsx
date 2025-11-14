export function Logo({ className, ...props }: React.ComponentPropsWithoutRef<'img'>) {
  return (
    <img
      src="/event-pilot.svg"
      alt="Event Pilot"
      className={className}
      {...props}
    />
  )
}
