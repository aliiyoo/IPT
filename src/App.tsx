import { FormEvent, useMemo, useState, useEffect } from "react"

const API_BASE = "http://127.0.0.1:8000/api"

type Page = "home" | "store" | "login" | "order-success"
type IconName = "arrow" | "bag" | "check" | "chevron" | "gamepad" | "heart" | "key" | "mail" | "menu" | "search" | "shield" | "sparkles" | "user" | "x" | "trash" | "external"

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bag: (
      <>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    gamepad: (
      <>
        <path d="M8.5 7h7a5.5 5.5 0 0 1 5.2 7.3l-1 3a2.4 2.4 0 0 1-4.1.8L14 16h-4l-1.6 2.1a2.4 2.4 0 0 1-4.1-.8l-1-3A5.5 5.5 0 0 1 8.5 7Z" />
        <path d="M7 11v4M5 13h4M16.5 11.5h.01M18.5 14h.01" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M15 8l2 2M17 6l2 2" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4.5 6v5.5c0 4.7 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.8 7.5-9.5V6L12 3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </>
    ),
    external: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export interface Variant {
  id: number
  sku: string
  attributes: Record<string, string>
  price: string | number
  stock_count: number
}

export interface Product {
  id: number
  name: string
  slug: string
  description: string
  base_price: string | number
  cover_image: string
  is_digital: boolean
  is_active: boolean
  vendor?: {
    id: number
    name: string
    slug: string
  }
  category?: {
    id: number
    name: string
    slug: string
  }
  variants: Variant[]
}

export interface CartItem {
  product: Product
  variant: Variant
  quantity: number
}

export interface FulfilledOrder {
  id: number
  status: string
  total: string
  items: Array<{
    id: number
    snapshot_name: string
    quantity: number
    unit_price: string
    fulfillments: Array<{
      id: number
      key_code: string
      email_sent_at: string
      brevo_message_id: string
    }>
  }>
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Pixel Pink home">
      <span className="brand-mark">
        <Icon name="gamepad" size={24} />
      </span>
      <span>
        PIXEL<span>PINK</span>
      </span>
    </button>
  )
}

function Header({
  page,
  setPage,
  cartCount,
  openCart,
}: {
  page: Page
  setPage: (p: Page) => void
  cartCount: number
  openCart: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const go = (p: Page) => {
    setPage(p)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={() => go("home")} />
        <nav
          className={menuOpen ? "nav open" : "nav"}
          aria-label="Main navigation"
        >
          <button
            className={page === "home" ? "active" : ""}
            onClick={() => go("home")}
          >
            Home
          </button>
          <button
            className={page === "store" ? "active" : ""}
            onClick={() => go("store")}
          >
            Browse Products
          </button>
          <button
            onClick={() => {
              if (page !== "home") go("home")
              setTimeout(() => {
                document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" })
              }, 100)
            }}
          >
            How it works
          </button>
        </nav>
        <div className="header-actions">
          <button className="login-link" onClick={() => go("login")}>
            <Icon name="user" size={17} /> Log in
          </button>
          <button
            className="cart-button"
            onClick={openCart}
            aria-label={`Cart with ${cartCount} items`}
          >
            <Icon name="bag" size={19} />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <Icon name={menuOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  )
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product
  onAddToCart: (product: Product, variant: Variant) => void
}) {
  const [liked, setLiked] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants?.[0]?.id || 0
  )

  const currentVariant = useMemo(() => {
    return product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0]
  }, [product.variants, selectedVariantId])

  const priceFormatted = currentVariant
    ? Number(currentVariant.price).toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : Number(product.base_price).toLocaleString("en-PH")

  return (
    <article className="game-card">
      <div className="card-art">
        <img
          src={product.cover_image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80"}
          alt={product.name}
          className="card-img"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80"
          }}
        />
        <span className="game-badge">DIGITAL KEY</span>
        <button
          className={liked ? "heart liked" : "heart"}
          onClick={() => setLiked(!liked)}
          aria-label="Add to wishlist"
        >
          <Icon name="heart" size={18} />
        </button>
      </div>

      <div className="game-info">
        <span className="vendor-badge-pill">
          {product.vendor?.name || "AUTHENTIC VENDOR"}
        </span>
        <h3>{product.name}</h3>
        <p className="line-clamp-2">{product.description}</p>

        {product.variants && product.variants.length > 0 && (
          <select
            className="variant-select"
            value={currentVariant?.id}
            onChange={(e) => setSelectedVariantId(Number(e.target.value))}
          >
            {product.variants.map((v) => {
              const label = Object.entries(v.attributes)
                .map(([_, val]) => val)
                .join(" • ")
              return (
                <option key={v.id} value={v.id}>
                  {label ? `${label} — ₱${Number(v.price).toLocaleString()}` : `₱${Number(v.price).toLocaleString()}`}
                </option>
              )
            })}
          </select>
        )}

        <div className="game-meta">
          <span>
            {currentVariant && currentVariant.stock_count > 0 ? (
              <strong style={{ color: "#22c55e", fontSize: "10px" }}>
                ✓ {currentVariant.stock_count} in stock
              </strong>
            ) : (
              "Digital delivery"
            )}
          </span>
          <strong>₱{priceFormatted}</strong>
        </div>

        <button
          className="add-button"
          onClick={() => {
            if (currentVariant) {
              onAddToCart(product, currentVariant)
            }
          }}
        >
          Add to cart <Icon name="bag" size={16} />
        </button>
      </div>
    </article>
  )
}

function Home({
  products,
  setPage,
  onAddToCart,
}: {
  products: Product[]
  setPage: (p: Page) => void
  onAddToCart: (p: Product, v: Variant) => void
}) {
  // Homepage displays only a curated selection (4-6 Featured Products from different vendors)
  const featured = useMemo(() => {
    if (!products.length) return []
    // Pick 1-2 per vendor
    const game = products.find((p) => p.vendor?.slug === "gamehub-digital")
    const gift = products.find((p) => p.vendor?.slug === "topup-central")
    const soft = products.find((p) => p.vendor?.slug === "codevault-software")
    const others = products.filter((p) => p !== game && p !== gift && p !== soft).slice(0, 3)
    return [game, gift, soft, ...others].filter(Boolean) as Product[]
  }, [products])

  return (
    <main>
      <section className="hero">
        <div className="hero-glow one" />
        <div className="hero-glow two" />
        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow">
              <Icon name="sparkles" size={15} /> YOUR INSTANT DIGITAL VAULT
            </div>
            <h1>
              Authentic keys.
              <br />
              <em>Instantly yours.</em>
            </h1>
            <p>
              Discover handpicked game keys, top-up gift cards, and official software
              licenses from trusted digital vendors. Pay with GCash, Maya, or Card via
              PayMongo and receive keys in seconds.
            </p>
            <div className="hero-buttons">
              <button
                className="primary-button"
                onClick={() => setPage("store")}
              >
                Browse all products <Icon name="arrow" size={18} />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  document
                    .querySelector("#how")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See how it works
              </button>
            </div>
            <div className="trust-row">
              <span>
                <Icon name="check" size={15} /> Instant email delivery
              </span>
              <span>
                <Icon name="check" size={15} /> PayMongo secure checkout
              </span>
              <span>
                <Icon name="check" size={15} /> 100% verified digital keys
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card back-card">
              <img
                src="https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80"
                alt="Steam Wallet"
                className="card-img"
              />
            </div>
            <div className="hero-card main-card">
              <div className="hero-card-badge">HOT SELLER</div>
              <img
                src="https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=600&q=80"
                alt="Minecraft Digital Edition"
                className="card-img large"
              />
              <div className="hero-card-info">
                <div>
                  <small>GAMEHUB DIGITAL</small>
                  <strong>Minecraft Digital Edition</strong>
                </div>
                <span>₱1,249</span>
              </div>
            </div>
            <div className="floating-key">
              <span>
                <Icon name="key" size={20} />
              </span>
              <div>
                <strong>Key delivered!</strong>
                <small>Ready to activate</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products (Curated selection) */}
      <section className="featured">
        <div className="section-heading">
          <div>
            <span className="kicker">CURATED PICKS</span>
            <h2>Featured Products</h2>
          </div>
          <button onClick={() => setPage("store")}>
            View all 15 products <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="game-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how">
        <div className="how-intro">
          <span className="kicker" style={{ color: "#ff8fa3" }}>API POWERED &amp; SECURE</span>
          <h2>
            From browse to delivery
            <br />
            in just seconds.
          </h2>
          <p>
            No physical shipping or waiting. Powered by PayMongo Checkout Sessions for
            fraud-protected transactions and Brevo Transactional Email for instant code dispatch.
          </p>
        </div>
        <div className="steps">
          <div className="step">
            <span>01</span>
            <div className="step-icon">
              <Icon name="search" />
            </div>
            <h3>Pick your variant</h3>
            <p>Select your gaming platform, denomination, or license duration.</p>
          </div>
          <div className="step">
            <span>02</span>
            <div className="step-icon">
              <Icon name="shield" />
            </div>
            <h3>Pay via PayMongo</h3>
            <p>Pay securely with GCash, Maya, cards, or online banking.</p>
          </div>
          <div className="step">
            <span>03</span>
            <div className="step-icon">
              <Icon name="mail" />
            </div>
            <h3>Brevo Key Dispatch</h3>
            <p>Digital keys are allocated instantly and emailed directly to your inbox.</p>
          </div>
        </div>
      </section>

      {/* Vendors Highlight */}
      <section className="vendor-banner">
        <div className="vendor-icon">
          <Icon name="gamepad" size={34} />
        </div>
        <div>
          <span className="kicker">3 TRUSTED DIGITAL STORES</span>
          <h2>Multi-Vendor Digital Marketplace</h2>
          <p>
            Shop verified collections from GameHub Digital, TopUp Central, and CodeVault Software.
          </p>
        </div>
        <div className="vendor-stats">
          <div>
            <strong>15</strong>
            <span>Products</span>
          </div>
          <div>
            <strong>56</strong>
            <span>Variations</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>Digital Delivery</span>
          </div>
        </div>
        <button onClick={() => setPage("store")}>
          Explore marketplace <Icon name="arrow" size={17} />
        </button>
      </section>
    </main>
  )
}

function StorePage({
  products,
  onAddToCart,
}: {
  products: Product[]
  onAddToCart: (p: Product, v: Variant) => void
}) {
  const [query, setQuery] = useState("")
  const [selectedVendor, setSelectedVendor] = useState<string>("All")

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchVendor =
        selectedVendor === "All" ||
        p.vendor?.name.toLowerCase().includes(selectedVendor.toLowerCase()) ||
        p.category?.name.toLowerCase().includes(selectedVendor.toLowerCase())

      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor?.name.toLowerCase().includes(query.toLowerCase())

      return matchVendor && matchQuery
    })
  }, [products, selectedVendor, query])

  return (
    <main className="market-page">
      <section className="market-hero">
        <span className="kicker">COMPLETE DIGITAL CATALOG</span>
        <h1>
          Browse All <em>Products.</em>
        </h1>
        <p>15 handpicked digital titles, wallet gift cards, and authentic software licenses.</p>
        <label className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search game titles, gift cards, software licenses, vendors..."
          />
        </label>
      </section>

      <section className="market-content">
        <div className="market-toolbar">
          <div className="filters">
            {[
              "All",
              "GameHub Digital",
              "TopUp Central",
              "CodeVault Software",
            ].map((v) => (
              <button
                key={v}
                className={selectedVendor === v ? "active" : ""}
                onClick={() => setSelectedVendor(v)}
              >
                {v === "All" ? "All Products (15)" : v}
              </button>
            ))}
          </div>
          <span>
            {filtered.length} {filtered.length === 1 ? "product" : "products"} available
          </span>
        </div>

        {filtered.length ? (
          <div className="game-grid">
            {filtered.map((prod) => (
              <ProductCard key={prod.id} product={prod} onAddToCart={onAddToCart} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="search" size={32} />
            <h3>No products found</h3>
            <p>Try a different keyword or vendor filter.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
}: {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  onUpdateQuantity: (variantId: number, qty: number) => void
  onRemoveItem: (variantId: number) => void
  onCheckout: () => void
  isCheckingOut: boolean
}) {
  if (!isOpen) return null

  const subtotal = cart.reduce((acc, item) => {
    return acc + Number(item.variant.price) * item.quantity
  }, 0)

  return (
    <>
      <div className="cart-backdrop" onClick={onClose} />
      <div className="cart-drawer">
        <div className="cart-header">
          <h2>Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
          <button className="cart-close-btn" onClick={onClose} aria-label="Close cart">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="cart-empty-view">
              <Icon name="bag" size={48} />
              <h3>Your cart is empty</h3>
              <p>Choose your games, gift cards, or licenses from our catalog.</p>
            </div>
          ) : (
            cart.map((item) => {
              const variantLabel = Object.entries(item.variant.attributes)
                .map(([_, v]) => v)
                .join(" • ")
              const itemTotal = Number(item.variant.price) * item.quantity

              return (
                <div key={item.variant.id} className="cart-item">
                  <img
                    src={item.product.cover_image}
                    alt={item.product.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-details">
                    <div>
                      <h4 className="cart-item-title">{item.product.name}</h4>
                      <span className="cart-item-variant">{variantLabel || "Standard"}</span>
                      <div className="cart-item-price">
                        ₱{itemTotal.toLocaleString("en-PH")}
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-qty-ctrl">
                        <button
                          className="cart-qty-btn"
                          onClick={() =>
                            onUpdateQuantity(item.variant.id, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span className="cart-qty-val">{item.quantity}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() =>
                            onUpdateQuantity(item.variant.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="cart-item-remove"
                        onClick={() => onRemoveItem(item.variant.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-subtotal-row">
              <span>Total Amount:</span>
              <span>₱{subtotal.toLocaleString("en-PH")}</span>
            </div>
            <button
              className="cart-checkout-btn"
              onClick={onCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                "Connecting to PayMongo..."
              ) : (
                <>
                  Checkout with PayMongo <Icon name="arrow" size={18} />
                </>
              )}
            </button>
            <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: "#888" }}>
              Instant digital key delivery via Brevo email
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function OrderSuccessModal({
  order,
  onClose,
  onSimulatePay,
}: {
  order: FulfilledOrder | null
  onClose: () => void
  onSimulatePay?: (orderId: number) => void
}) {
  if (!order) return null

  const isFulfilled = order.status === "fulfilled" || order.status === "paid"

  return (
    <div className="order-modal-backdrop">
      <div className="order-modal">
        <div className="order-modal-header">
          <div className="order-modal-icon">
            <Icon name={isFulfilled ? "key" : "shield"} size={32} />
          </div>
          <h2>{isFulfilled ? "Order Fulfilled!" : `Order #${order.id} Created`}</h2>
          <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
            {isFulfilled
              ? "Your digital codes have been generated and sent via Brevo email."
              : "Status: Awaiting Payment via PayMongo."}
          </p>
        </div>

        <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Order Items &amp; Keys:</h4>
          {order.items?.map((item) => (
            <div key={item.id} className="key-box">
              <strong style={{ fontSize: "13px" }}>{item.snapshot_name}</strong>
              {item.fulfillments?.length > 0 ? (
                item.fulfillments.map((f) => (
                  <div key={f.id} style={{ marginTop: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#666" }}>Digital Activation Code:</div>
                    <code className="key-code-display">{f.key_code}</code>
                    <small style={{ color: "#22c55e", display: "block", marginTop: "4px" }}>
                      ✓ Delivered via Brevo (ID: {f.brevo_message_id})
                    </small>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>
                  Code will be revealed immediately after payment confirmation.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
          {!isFulfilled && onSimulatePay && (
            <button
              className="primary-button"
              style={{ flex: 1 }}
              onClick={() => onSimulatePay(order.id)}
            >
              Simulate Instant Payment (Test)
            </button>
          )}
          <button
            className="text-button"
            style={{ flex: 1, textAlign: "center" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function Login({ setPage }: { setPage: (p: Page) => void }) {
  const [submitted, setSubmitted] = useState(false)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="login-art">
          <div className="login-brand">
            <Brand onClick={() => setPage("home")} />
          </div>
          <div className="login-art-content">
            <span className="login-spark">
              <Icon name="sparkles" size={30} />
            </span>
            <h2>
              Your digital library is
              <br />
              <em>ready for you.</em>
            </h2>
            <p>
              Sign in to manage your orders, reveal your digital keys, or access the Seller Center.
            </p>
          </div>
          <div className="pixel-shape shape-one" />
          <div className="pixel-shape shape-two" />
          <div className="login-quote">
            “Purchased a Steam wallet code and had the key in 3 seconds.”
            <span>— Verified Customer</span>
          </div>
        </div>
        <div className="login-form-wrap">
          <button className="back-button" onClick={() => setPage("home")}>
            ← Back to store
          </button>
          {submitted ? (
            <div className="success-state">
              <span>
                <Icon name="check" size={32} />
              </span>
              <h1>Welcome back.</h1>
              <p>Demo authentication successful. Your account is linked.</p>
              <button
                className="primary-button"
                onClick={() => setPage("store")}
              >
                Explore store <Icon name="arrow" size={18} />
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <span className="kicker">ACCOUNT ACCESS</span>
              <h1>Log in to PixelPink</h1>
              <p>
                Demo credentials: <strong>customer</strong> / <strong>customer123</strong> or <strong>admin</strong> / <strong>admin123</strong>
              </p>
              <label>
                Username or Email
                <input type="text" defaultValue="customer" required />
              </label>
              <label>
                Password
                <input type="password" defaultValue="customer123" required />
              </label>
              <div className="form-options">
                <label>
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <button type="button">Forgot password?</button>
              </div>
              <button className="submit-button" type="submit">
                Log in <Icon name="arrow" size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Brand onClick={() => setPage("home")} />
          <p>Instant digital gaming codes, top-ups, and licenses.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => setPage("store")}>Browse Products</button>
          <button onClick={() => setPage("home")}>How it works</button>
          <button onClick={() => setPage("login")}>Account</button>
          <a
            href="http://127.0.0.1:8000/admin/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#ed2b70", textDecoration: "none", fontSize: "11px", fontWeight: "bold" }}
          >
            Django Admin ↗
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 PixelPink Digital Storefront Prototype</span>
        <div>
          <span>
            Payment Gateway: <strong>PayMongo API</strong>
          </span>
          <span>
            Fulfillment Dispatch: <strong>Brevo v3 API</strong>
          </span>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>("home")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState("")

  // Cart state persisted to localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("pixelpink_cart")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Order fulfillment modal
  const [activeOrder, setActiveOrder] = useState<FulfilledOrder | null>(null)

  useEffect(() => {
    localStorage.setItem("pixelpink_cart", JSON.stringify(cart))
  }, [cart])

  // Fetch products from Django DRF API
  useEffect(() => {
    fetch(`${API_BASE}/products/`)
      .then((res) => res.json())
      .then((data) => {
        // Handle DRF list response or paginated results
        const items = Array.isArray(data) ? data : data.results || []
        setProducts(items)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch products from Django API:", err)
        setLoading(false)
      })
  }, [])

  const navigate = (next: Page) => {
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const addToCart = (product: Product, variant: Variant) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id)
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, variant, quantity: 1 }]
    })

    const attrSummary = Object.values(variant.attributes).join(" • ")
    setToast(`Added ${product.name} (${attrSummary || "Item"}) to cart`)
    setTimeout(() => setToast(""), 2800)
  }

  const updateQuantity = (variantId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(variantId)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: qty } : item
      )
    )
  }

  const removeFromCart = (variantId: number) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId))
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setIsCheckingOut(true)

    try {
      const payload = {
        items: cart.map((i) => ({
          variant_id: i.variant.id,
          quantity: i.quantity,
        })),
        email: "customer@example.com",
        name: "Demo Customer",
        success_url: window.location.origin + "?checkout_success=true",
        cancel_url: window.location.origin,
      }

      const res = await fetch(`${API_BASE}/checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Checkout failed.")
        setIsCheckingOut(false)
        return
      }

      // Clear cart
      setCart([])
      setIsCartOpen(false)

      if (data.checkout_url && !data.checkout_url.includes("mock_session")) {
        // Redirect to real PayMongo Hosted Checkout Page
        window.location.href = data.checkout_url
      } else {
        // Mock / Development mode: fetch created order and show success modal
        const orderRes = await fetch(`${API_BASE}/orders/${data.order_id}/`)
        const orderData = await orderRes.json()
        setActiveOrder(orderData)
      }
    } catch (e: any) {
      alert("Error initiating checkout: " + e.message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleSimulatePayment = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/simulate-payment/`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        setActiveOrder(data.order)
        setToast("Order paid! Digital keys fulfilled and emailed via Brevo.")
        setTimeout(() => setToast(""), 3500)
      }
    } catch (e) {
      console.error("Simulation failed:", e)
    }
  }

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="app">
      <Header
        page={page}
        setPage={navigate}
        cartCount={totalCartCount}
        openCart={() => setIsCartOpen(true)}
      />

      {page === "home" && (
        <Home
          products={products}
          setPage={navigate}
          onAddToCart={addToCart}
        />
      )}

      {page === "store" && (
        <StorePage
          products={products}
          onAddToCart={addToCart}
        />
      )}

      {page === "login" && <Login setPage={navigate} />}

      {page !== "login" && <Footer setPage={navigate} />}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      {/* Order & Keys Modal */}
      <OrderSuccessModal
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onSimulatePay={handleSimulatePayment}
      />

      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={16} />
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}
