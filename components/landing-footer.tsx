export function LandingFooter() {
  return (
    <footer className="w-full py-6 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
                <path d="M2 9v1c0 1.1.9 2 2 2h1" />
                <path d="M16 11h0" />
              </svg>
              SecurePay
            </div>
            <p className="text-sm text-muted-foreground">
              Secure payment processing with advanced ML anomaly detection.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <nav className="flex gap-4 text-sm">
              <a href="#" className="hover:underline">
                Terms
              </a>
              <a href="#" className="hover:underline">
                Privacy
              </a>
              <a href="#" className="hover:underline">
                Contact
              </a>
            </nav>
            <p className="text-xs text-muted-foreground">© 2023 SecurePay. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
