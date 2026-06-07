export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <span className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
            Scolar
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
