import {
  ChevronDown,
  MapPin,
  Search,
  ShoppingCart,
} from 'lucide-react'

export function AmazonHeader() {
  return (
    <>
      {/* Primary header */}
      <div className="bg-[#131921] text-white">
        <div className="flex items-center gap-3 px-3 md:px-4 py-2">
          <Logo />

          <div className="hidden md:flex items-center gap-1 px-2 py-1 hover:outline hover:outline-1 hover:outline-white/80 cursor-pointer">
            <MapPin className="size-4 mt-3 text-white/70" aria-hidden="true" />
            <div className="leading-none">
              <p className="text-[0.65rem] text-white/70">Deliver to</p>
              <p className="text-[0.85rem] font-bold">Berkeley 94704</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 flex items-stretch h-10 rounded-md overflow-hidden bg-white text-[#0F1111] focus-within:ring-2 focus-within:ring-[#FF9900]">
            <button
              type="button"
              className="flex items-center gap-1 px-3 bg-[#F3F3F3] text-[0.78rem] text-[#0F1111] border-r border-[#cdcdcd] hover:bg-[#e7e9ec]"
            >
              <span>All</span>
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>
            <input
              type="text"
              defaultValue="best dandruff shampoo for stress flare-ups"
              aria-label="Search Amazon"
              className="flex-1 px-3 outline-none text-[0.92rem]"
            />
            <button
              type="button"
              aria-label="search"
              className="bg-[#FEBD69] hover:bg-[#F3A847] px-4 flex items-center justify-center"
            >
              <Search className="size-5 text-[#0F1111]" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="hidden md:block px-2 py-1 text-left hover:outline hover:outline-1 hover:outline-white/80"
          >
            <p className="text-[0.65rem] text-white/70 leading-tight">
              Hello, Sign in
            </p>
            <p className="text-[0.85rem] font-bold leading-tight">
              Account &amp; Lists{' '}
              <ChevronDown
                className="size-3 inline-block"
                aria-hidden="true"
              />
            </p>
          </button>

          <button
            type="button"
            className="hidden md:block px-2 py-1 text-left hover:outline hover:outline-1 hover:outline-white/80"
          >
            <p className="text-[0.65rem] text-white/70 leading-tight">
              Returns
            </p>
            <p className="text-[0.85rem] font-bold leading-tight">
              &amp; Orders
            </p>
          </button>

          <button
            type="button"
            className="flex items-end gap-1 px-2 py-1 hover:outline hover:outline-1 hover:outline-white/80"
            aria-label="cart"
          >
            <span className="relative">
              <ShoppingCart className="size-7" aria-hidden="true" />
              <span className="absolute -top-1 left-3 text-[#F08804] font-bold text-[0.85rem]">
                0
              </span>
            </span>
            <span className="hidden md:inline text-[0.85rem] font-bold">
              Cart
            </span>
          </button>
        </div>
      </div>

      {/* Secondary nav */}
      <div className="bg-[#232F3E] text-white text-[0.78rem]">
        <div className="flex items-center gap-3 px-3 md:px-4 py-1.5 overflow-x-auto whitespace-nowrap">
          {[
            'All',
            "Today's Deals",
            'Customer Service',
            'Registry',
            'Gift Cards',
            'Sell',
            'Best Sellers',
            'Beauty &amp; Personal Care',
          ].map((label) => (
            <span
              key={label}
              className="px-1 py-0.5 hover:outline hover:outline-1 hover:outline-white/80 cursor-default"
              dangerouslySetInnerHTML={{ __html: label }}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function Logo() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label="amazon"
      className="px-2 py-1 hover:outline hover:outline-1 hover:outline-white/80 leading-none"
    >
      <span className="font-bold text-[1.65rem] tracking-tight lowercase relative">
        amazon
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 left-1 right-3 h-2"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 12'><path d='M2 4 Q30 14 58 4' stroke='%23FF9900' stroke-width='2.2' fill='none' stroke-linecap='round'/><path d='M50 2 L58 4 L54 10' stroke='%23FF9900' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
          }}
        />
      </span>
    </a>
  )
}
