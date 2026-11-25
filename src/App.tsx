import { Component, FormEvent, useMemo, useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet"
import L from "leaflet"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

// Fix default Leaflet marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api"

type Page = "home" | "store" | "product-detail" | "seller" | "orders" | "login" | "register"
type IconName =
  | "arrow"
  | "bag"
  | "check"
  | "chevron"
  | "gamepad"
  | "heart"
  | "key"
  | "mail"
  | "menu"
  | "search"
  | "shield"
  | "sparkles"
  | "user"
  | "x"
  | "trash"
  | "plus"
  | "store"
  | "star"

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
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    store: (
      <>
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
      </>
    ),
    star: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
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
  price_credits?: string | number | null
  stock_count: number
}

export interface Product {
  id: number
  name: string
  slug: string
  brand?: string
  manufacturer?: string
  description: string
  about_this_item?: string[]
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

export interface AuthUser {
  id: number
  username: string
  email: string
  role: "customer" | "vendor" | "seller"
  is_seller: boolean
  vendor?: {
    id: number
    name: string
    slug: string
  }
}

export interface CartItem {
  product: Product
  variant: Variant
  quantity: number
}

export interface PaymentOrderRecord {
  id: string
  status: string
  productName: string
  variant: Record<string, string>
  quantity: number
  creditsSpent: number
  keyDeliveryStatus: "pending" | "sent" | "failed"
  maskedEmail: string
  createdAt: string
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPeso(value: unknown): string {
  const parsed = finiteNumber(value)
  return parsed === null
    ? "—"
    : `₱${parsed.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCredits(value: unknown): string {
  const parsed = finiteNumber(value)
  return parsed === null ? "—" : parsed.toLocaleString("en-PH")
}

class ProductDetailErrorBoundary extends Component<
  { children: React.ReactNode; onBack: () => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="product-detail-page">
          <p>Couldn't load this product.</p>
          <button className="text-button" onClick={this.props.onBack}>Back to products</button>
        </main>
      )
    }
    return this.props.children
  }
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="PixelPink home">
      <span className="brand-mark">
        <Icon name="gamepad" size={24} />
      </span>
      <span>
        Pixel<span>Pink</span>
      </span>
    </button>
  )
}

function Header({
  page,
  setPage,
  user,
  walletBalance,
  cartCount,
  openCart,
  onLogout,
}: {
  page: Page
  setPage: (p: Page) => void
  user: AuthUser | null
  walletBalance: number | null
  cartCount: number
  openCart: () => void
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const go = (p: Page) => {
    setPage(p)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const isSeller = user?.is_seller || user?.role === "vendor" || user?.role === "seller"

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

          {/* Browse Products requires login */}
          <button
            className={page === "store" ? "active" : ""}
            onClick={() => {
              if (!user) {
                go("login")
              } else {
                go("store")
              }
            }}
          >
            Browse Products
          </button>

          {/* Role-based Nav link */}
          {user && (
            isSeller ? (
              <button
                className={page === "seller" ? "active" : ""}
                onClick={() => go("seller")}
                style={{ color: "#ed2b70", fontWeight: 700 }}
              >
                <Icon name="store" size={15} /> Seller Center
              </button>
            ) : (
              <button
                className={page === "orders" ? "active" : ""}
                onClick={() => go("orders")}
              >
                My Orders
              </button>
            )
          )}

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
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="wallet-badge">
                {walletBalance === null ? "Wallet ..." : `${formatCredits(walletBalance)} credits`}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  background: "#fcedf3",
                  color: "#ed2b70",
                  padding: "6px 12px",
                  borderRadius: "20px",
                }}
              >
                <Icon name="user" size={14} />
                <span>{user.username}</span>
                {isSeller && (
                  <span
                    style={{
                      background: "#ed2b70",
                      color: "white",
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      marginLeft: "4px",
                    }}
                  >
                    SELLER
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                style={{
                  border: "1px solid #ebdbe2",
                  background: "white",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="login-link" onClick={() => go("login")}>
              <Icon name="user" size={17} /> Log in
            </button>
          )}

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

/* === Clean Product Card for Catalog Grid (No Dropdowns) === */
function ProductGridCard({
  product,
  onSelectProduct,
}: {
  product: Product
  onSelectProduct: (p: Product) => void
}) {
  const minPrice = useMemo(() => {
    const prices = (product.variants || [])
      .map((variant) => finiteNumber(variant.price_credits))
      .filter((price): price is number => price !== null)
    return prices.length ? Math.min(...prices) : null
  }, [product])
  const minPeso = useMemo(() => {
    const prices = (product.variants || [])
      .map((variant) => finiteNumber(variant.price))
      .filter((price): price is number => price !== null)
    return prices.length ? Math.min(...prices) : finiteNumber(product.base_price)
  }, [product])

  return (
    <article
      className="game-card"
      style={{ cursor: "pointer" }}
      onClick={() => onSelectProduct(product)}
    >
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
      </div>

      <div className="game-info">
        <span className="vendor-badge-pill">
          {product.brand || product.vendor?.name || "AUTHENTIC VENDOR"}
        </span>
        <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>{product.name}</h3>
        <p className="line-clamp-2" style={{ minHeight: "34px", fontSize: "12px", color: "#666" }}>
          {product.description}
        </p>

        <div className="game-meta" style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f6ecf0" }}>
          <div>
            <div style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Starting at</div>
            <strong style={{ fontSize: "15px", color: "#ed2b70" }}>
              {formatPeso(minPeso)} · {formatCredits(minPrice)} credits
            </strong>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#22c55e", background: "#f0fdf4", padding: "4px 8px", borderRadius: "6px" }}>
            In Stock
          </span>
        </div>
      </div>
    </article>
  )
}

/* === Amazon-Style Product Detail Page === */
function ProductDetailPage({
  product,
  walletBalance,
  onAddToCart,
  onBuyNow,
  onBack,
}: {
  product: Product
  walletBalance: number | null
  onAddToCart: (product: Product, variant: Variant, quantity: number) => void
  onBuyNow: (product: Product, variant: Variant, quantity: number) => void
  onBack: () => void
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants?.[0]?.id || 0
  )
  const [quantity, setQuantity] = useState(1)

  const activeVariant = useMemo(() => {
    return product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0]
  }, [product.variants, selectedVariantId])

  const pesoPrice = formatPeso(activeVariant?.price ?? product.base_price)
  const creditsPrice = formatCredits(activeVariant?.price_credits)

  return (
    <main className="product-detail-page">
      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <button onClick={onBack}>← Back to Store</button>
        <span>/</span>
        <span>{product.category?.name || "Digital Products"}</span>
        <span>/</span>
        <span style={{ color: "#211822", fontWeight: 700 }}>{product.name}</span>
      </div>

      <div className="detail-grid-amazon">
        {/* Left Column: Gallery */}
        <div className="detail-gallery">
          <div className="detail-main-img-box">
            <img
              src={product.cover_image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80"}
              alt={product.name}
              className="detail-main-img"
            />
          </div>
          <div className="detail-thumbs">
            <div className="detail-thumb active">
              <img src={product.cover_image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80"} alt="Thumbnail 1" />
            </div>
            <div className="detail-thumb">
              <img
                src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=80"
                alt="Thumbnail 2"
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Title, Amazon-style Variation Buttons & Bullet Points */}
        <div className="detail-info">
          <div className="detail-brand-kicker">
            Visit the {product.brand || product.vendor?.name} Store
          </div>
          <h1 className="detail-title">{product.name}</h1>

          <div className="detail-rating-row">
            <span className="detail-rating-stars">★★★★★ 5.0</span>
            <span>•</span>
            <span>Verified Digital Merchant ({product.vendor?.name})</span>
            <span>•</span>
            <span style={{ color: "#16a34a", fontWeight: "bold" }}>Official License</span>
          </div>

          <div className="detail-price-section">
            <div className="detail-price-label">Price</div>
            <div className="detail-price-val">{pesoPrice}</div>
            <div className="detail-credit-price">{creditsPrice} credits</div>
            <div className="detail-balance">Your balance: {walletBalance === null ? "—" : `${formatCredits(walletBalance)} credits`}</div>
          </div>

          {/* Amazon-Style Variation Buttons */}
          {product.variants && product.variants.length > 0 && (
            <div className="variation-selector-box">
              <div className="variation-label-row">
                <span className="variation-label-title">Select Edition / Platform:</span>
                <span className="variation-label-selected">
                  {activeVariant ? Object.values(activeVariant.attributes).join(" • ") : ""}
                </span>
              </div>

              <div className="variation-buttons-grid">
                {product.variants.map((v) => {
                  const label = Object.values(v.attributes).join(" • ") || v.sku
                  const isActive = v.id === activeVariant?.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`variation-btn ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedVariantId(v.id)}
                    >
                      <span className="variation-btn-name">{label}</span>
                      <span className="variation-btn-price">
                        {formatPeso(v.price)} · {formatCredits(v.price_credits)} credits
                      </span>
                      <span className="variation-btn-stock" style={{ color: v.stock_count > 0 ? "#16a34a" : "#dc2626" }}>
                        {v.stock_count > 0 ? `✓ In Stock (${v.stock_count})` : "✕ Out of Stock"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* About this item (Amazon-style bulleted list) */}
          <div className="about-item-box">
            <h3>About this item</h3>
            {product.about_this_item && product.about_this_item.length > 0 ? (
              <ul className="about-item-list">
                {product.about_this_item.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Amazon-Style Sticky Buy Box */}
        <div className="buy-box">
          <div className="buy-box-price">{pesoPrice}</div>
          <div className="buy-box-credit-price">{creditsPrice} credits</div>
          {(() => {
            const isOutOfStock = !activeVariant || (activeVariant.stock_count ?? 0) <= 0
            const availableQty = activeVariant ? Math.min(activeVariant.stock_count ?? 0, 5) : 0
            const qtyOptions = availableQty > 0 ? Array.from({ length: availableQty }, (_, i) => i + 1) : [1]
            return (
              <>
                <div className="buy-box-stock-status" style={{ color: isOutOfStock ? '#c0392b' : '#27ae60' }}>
                  {isOutOfStock ? (
                    <><Icon name="x" size={16} /> Out of Stock</>
                  ) : (
                    <><Icon name="check" size={16} /> In Stock ({activeVariant!.stock_count} available) - Instant Email Delivery</>
                  )}
                </div>
                <div className="buy-box-delivery">
                  {isOutOfStock
                    ? 'Currently unavailable. Check back soon.'
                    : 'Delivered to your account email after payment confirmation.'}
                </div>

                <div className="buy-box-qty-row">
                  <span>Quantity:</span>
                  <select
                    className="buy-box-qty-select"
                    value={quantity}
                    disabled={isOutOfStock}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {qtyOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="buy-box-actions">
                  <button
                    className="buy-box-btn-cart"
                    disabled={isOutOfStock}
                    style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    onClick={() => {
                      if (activeVariant && !isOutOfStock) {
                        onAddToCart(product, activeVariant, quantity)
                      }
                    }}
                  >
                    <Icon name="bag" size={18} /> {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <button
                    className="buy-box-btn-buy"
                    disabled={isOutOfStock}
                    style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    onClick={() => {
                      if (activeVariant && !isOutOfStock) {
                        onBuyNow(product, activeVariant, quantity)
                      }
                    }}
                  >
                    {isOutOfStock ? 'Unavailable' : 'Buy Now'}
                  </button>
                </div>
              </>
            )
          })()}

          <div className="buy-box-meta">
            <div className="buy-box-meta-row">
              <span>Dispatches from</span>
              <strong>PixelPink Cloud</strong>
            </div>
            <div className="buy-box-meta-row">
              <span>Sold by</span>
              <strong>{product.vendor?.name}</strong>
            </div>
            <div className="buy-box-meta-row">
              <span>Payment Gateway</span>
              <strong>Wallet credits</strong>
            </div>
          </div>

          <div className="buy-box-trust">
            <Icon name="shield" size={18} />
            <span>Buyer Protection Guarantee: Unrevealed keys eligible for refund within 24h.</span>
          </div>
        </div>
      </div>
    </main>
  )
}

/* === Seller Center Dashboard === */
interface SellerVariantFormItem {
  id?: number
  sku?: string
  name: string
  price: number
  stock_count: number
}

function SellerCenterPage({
  user,
  accessToken,
  products,
  onRefreshProducts,
}: {
  user: AuthUser
  accessToken?: string | null
  products: Product[]
  onRefreshProducts: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultFormData = {
    name: "",
    brand: user.vendor?.name || "",
    manufacturer: user.vendor?.name || "",
    description: "",
    base_price: 999,
    cover_image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    about_text: "Genuine digital license with instant activation.\nOfficial support and permanent access.",
    variants: [
      { name: "Standard Edition", price: 999, stock_count: 10 },
      { name: "Deluxe Edition", price: 1499, stock_count: 10 },
    ] as SellerVariantFormItem[],
  }

  const [formData, setFormData] = useState(defaultFormData)

  // Filter products belonging to this seller
  const sellerProducts = useMemo(() => {
    if (user.username === "admin") return products // admin can see all
    return products.filter(
      (p) =>
        p.vendor?.id === user.vendor?.id ||
        p.vendor?.slug === user.vendor?.slug ||
        (user.vendor?.name && p.vendor?.name.toLowerCase().includes(user.vendor.name.toLowerCase()))
    )
  }, [products, user])

  const totalKeys = useMemo(() => {
    return sellerProducts.reduce(
      (acc, p) => acc + (p.variants?.reduce((s, v) => s + v.stock_count, 0) || 0),
      0
    )
  }, [sellerProducts])

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      brand: user.vendor?.name || "",
      manufacturer: user.vendor?.name || "",
      description: "",
      base_price: 999,
      cover_image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
      about_text: "Genuine digital license with instant activation.\nOfficial support and permanent access.",
      variants: [
        { name: "Standard Edition", price: 999, stock_count: 10 },
        { name: "Deluxe Edition", price: 1499, stock_count: 10 },
      ],
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p)
    const existingVariants: SellerVariantFormItem[] =
      p.variants && p.variants.length > 0
        ? p.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name:
              v.attributes?.edition ||
              v.attributes?.platform ||
              v.attributes?.option ||
              (v.attributes ? Object.values(v.attributes)[0] : "") ||
              v.sku ||
              "Standard Edition",
            price: Number(v.price) || 0,
            stock_count: v.stock_count || 0,
          }))
        : [{ name: "Standard Edition", price: Number(p.base_price) || 999, stock_count: 10 }]

    const aboutText = Array.isArray(p.about_this_item)
      ? p.about_this_item.join("\n")
      : typeof p.about_this_item === "string"
      ? p.about_this_item
      : ""

    setFormData({
      name: p.name,
      brand: p.brand || user.vendor?.name || "",
      manufacturer: p.manufacturer || p.brand || user.vendor?.name || "",
      description: p.description || "",
      base_price: Number(p.base_price) || 0,
      cover_image: p.cover_image || "",
      about_text: aboutText,
      variants: existingVariants,
    })
    setShowModal(true)
  }

  const handleAddVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: "New Variant", price: prev.base_price || 999, stock_count: 10 },
      ],
    }))
  }

  const handleRemoveVariantRow = (index: number) => {
    if (formData.variants.length <= 1) {
      alert("A product must have at least one variation.")
      return
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }))
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const isEdit = Boolean(editingProduct)
      const payload = {
        name: formData.name,
        brand: formData.brand,
        manufacturer: formData.manufacturer,
        description: formData.description,
        base_price: formData.base_price,
        cover_image: formData.cover_image,
        about_this_item: formData.about_text.split("\n").filter(Boolean),
        username: user.username,
        variants: formData.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          sku:
            v.sku ||
            `${formData.name.slice(0, 3).toUpperCase()}-${v.name.slice(0, 4).toUpperCase()}-${Math.floor(
              Math.random() * 900 + 100
            )}`,
          attributes: { edition: v.name },
          name: v.name,
          price: v.price,
          stock_count: v.stock_count,
        })),
      }

      const url = isEdit
        ? `${API_BASE}/vendor/products/${editingProduct!.id}/`
        : `${API_BASE}/vendor/products/`
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Username": user.username,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        alert(isEdit ? "Product updated successfully!" : "Product and digital keys created successfully!")
        setShowModal(false)
        setEditingProduct(null)
        onRefreshProducts()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || (isEdit ? "Failed to update product." : "Failed to create product."))
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (p: Product) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${p.name}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const res = await fetch(`${API_BASE}/vendor/products/${p.id}/`, {
        method: "DELETE",
        headers: {
          "X-Username": user.username,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })
      if (res.ok) {
        alert(`Product "${p.name}" has been deleted.`)
        onRefreshProducts()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Failed to delete product.")
      }
    } catch (err: any) {
      alert("Error deleting product: " + err.message)
    }
  }

  return (
    <main className="seller-page">
      <div className="seller-header-banner">
        <div className="seller-title-group">
          <h1>Seller Center — {user.vendor?.name || user.username}</h1>
          <p>Manage your digital catalog, inspect available keys, and update product variations.</p>
        </div>
        <button
          className="primary-button"
          onClick={handleOpenAddModal}
          style={{ background: "#ed2b70", border: 0 }}
        >
          <Icon name="plus" size={16} /> Add New Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="seller-stats-grid">
        <div className="seller-stat-card">
          <small>Active Products</small>
          <strong>{sellerProducts.length}</strong>
        </div>
        <div className="seller-stat-card">
          <small>Total Digital Keys</small>
          <strong style={{ color: "#16a34a" }}>{totalKeys}</strong>
        </div>
        <div className="seller-stat-card">
          <small>Fulfillment Status</small>
          <strong style={{ color: "#ed2b70" }}>100% Automated</strong>
        </div>
        <div className="seller-stat-card">
          <small>Store Rating</small>
          <strong>4.9 ★</strong>
        </div>
      </div>

      <div className="seller-actions-bar">
        <h2>Your Store Catalog ({sellerProducts.length} Items)</h2>
      </div>

      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand / Vendor</th>
              <th>Variations</th>
              <th>Starting Price</th>
              <th>Total Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sellerProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
                  No products in your catalog yet. Click "+ Add New Product" to create your first listing!
                </td>
              </tr>
            ) : (
              sellerProducts.map((p) => {
                const stock = p.variants?.reduce((s, v) => s + v.stock_count, 0) || 0
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="seller-table-prod-cell">
                        <img src={p.cover_image} alt={p.name} className="seller-table-thumb" />
                        <div>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: "11px", color: "#888" }}>{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.brand || p.vendor?.name}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#ed2b70" }}>
                        {p.variants?.length || 0} variations
                      </span>
                    </td>
                    <td>{formatPeso(p.base_price)}</td>
                    <td>
                      <span style={{ color: stock > 0 ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                        {stock} keys available
                      </span>
                    </td>
                    <td>
                      <span style={{ background: "#dcfce7", color: "#16a34a", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                        ACTIVE
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="seller-btn-edit"
                          title="Edit product details & variations"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="seller-btn-delete"
                          title="Delete product"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="seller-modal">
            <div className="seller-modal-header">
              <h2>{editingProduct ? `Edit Product: ${editingProduct.name}` : "Add Product & Variations"}</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingProduct(null)
                }}
                style={{ border: 0, background: "none", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="seller-form">
              <div className="seller-form-grid">
                <label>
                  Product Title *
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Cyberpunk 2077 Digital Code"
                  />
                </label>

                <label>
                  Brand / Publisher
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. CD Projekt Red"
                  />
                </label>

                <label>
                  Base Price (₱) *
                  <input
                    type="number"
                    required
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  />
                </label>

                <label>
                  Cover Image URL
                  <input
                    type="url"
                    value={formData.cover_image}
                    onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  />
                </label>

                <label className="seller-form-full">
                  Description
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </label>

                <label className="seller-form-full">
                  About this item (1 bullet point per line)
                  <textarea
                    rows={3}
                    value={formData.about_text}
                    onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                  />
                </label>
              </div>

              {/* Dynamic Variations Builder */}
              <div className="variant-builder-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <strong style={{ fontSize: "14px" }}>Product Variations &amp; Key Stock:</strong>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    style={{
                      border: "1px solid #ed2b70",
                      background: "white",
                      color: "#ed2b70",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Add Another Variation
                  </button>
                </div>

                {formData.variants.map((v, i) => (
                  <div key={i} className="variant-row-input" style={{ position: "relative" }}>
                    <label>
                      Variation Name (e.g. Xbox / Steam / ₱500)
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...formData.variants]
                          updated[i].name = e.target.value
                          setFormData({ ...formData, variants: updated })
                        }}
                      />
                    </label>
                    <label>
                      Price (₱)
                      <input
                        type="number"
                        required
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...formData.variants]
                          updated[i].price = Number(e.target.value)
                          setFormData({ ...formData, variants: updated })
                        }}
                      />
                    </label>
                    <label>
                      Keys to Generate / Stock
                      <input
                        type="number"
                        required
                        value={v.stock_count}
                        onChange={(e) => {
                          const updated = [...formData.variants]
                          updated[i].stock_count = Number(e.target.value)
                          setFormData({ ...formData, variants: updated })
                        }}
                      />
                    </label>
                    {formData.variants.length > 1 && (
                      <button
                        type="button"
                        className="variant-remove-btn"
                        onClick={() => handleRemoveVariantRow(i)}
                        title="Remove variation"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="seller-modal-footer">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingProduct(null)
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Publish Product & Generate Keys"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

/* === Customer My Orders Page === */
function MyOrdersPage({
  accessToken,
  setWalletBalance,
}: {
  accessToken: string | null
  setWalletBalance: (balance: number) => void
}) {
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refundingId, setRefundingId] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    fetch(`${API_BASE}/orders/`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Orders could not be loaded.")
        setOrders(Array.isArray(data) ? data : [])
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Orders could not be loaded."))
      .finally(() => setLoading(false))
  }, [accessToken])

  const handleResend = async (orderId: string) => {
    if (!accessToken) return
    setError("")
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/resend-key-email/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Email delivery retry failed.")
      setOrders((current) => current.map((order) => order.id === orderId
        ? { ...order, keyDeliveryStatus: data.keyDeliveryStatus }
        : order))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email delivery retry failed.")
    }
  }

  const handleRefund = async (orderId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to refund this order? Your credits will be returned and the digital key will be invalidated."
    )
    if (!confirmed || !accessToken) return

    setRefundingId(orderId)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/refund/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Refund request failed.")

      // Update order status in UI
      setOrders((current) =>
        current.map((o) =>
          o.id === orderId ? { ...o, status: "refunded" } : o
        )
      )
      // Update navbar wallet balance immediately
      if (typeof data.new_balance === "number") {
        setWalletBalance(data.new_balance)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refund request failed.")
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <main className="orders-page">
      <div className="orders-header">
        <h1>My Orders &amp; Digital Keys</h1>
        <p style={{ color: "#666" }}>
          View purchases and the status of each email delivery.
        </p>
      </div>

      {loading ? (
        <p>Loading your orders...</p>
      ) : error ? (
        <p className="payment-error" role="alert">{error}</p>
      ) : !accessToken ? (
        <p className="payment-error" role="alert">Sign in again to view your orders.</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: "20px" }}>
          <Icon name="key" size={48} />
          <h3 style={{ marginTop: "12px" }}>No orders yet</h3>
          <p style={{ color: "#666" }}>Your paid orders will appear here.</p>
        </div>
      ) : (
        orders.map((order) => {
          const orderDate = new Date(order.createdAt)
          const ageMs = Date.now() - orderDate.getTime()
          const withinRefundWindow = ageMs < 72 * 60 * 60 * 1000
          const canRefund = (order.status === "paid" || order.status === "fulfilled") && withinRefundWindow
          const refundExpired = (order.status === "paid" || order.status === "fulfilled") && !withinRefundWindow

          return (
            <div key={order.id} className="order-card">
              <div className="order-card-top">
                <div>
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <span style={{ color: "#888", marginLeft: "12px" }}>
                    {orderDate.toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className={`order-status-pill ${order.status}`}>{order.status}</span>
                  <strong style={{ fontSize: "16px", color: "#ed2b70" }}>
                    {formatCredits(order.creditsSpent)} credits
                  </strong>
                </div>
              </div>

              <div className="payment-order-row">
                <div>
                  <strong>{order.productName} × {order.quantity}</strong>
                  <span>Delivered to {order.maskedEmail || "your account email"}</span>
                </div>
                <span className={`delivery-status ${order.keyDeliveryStatus}`}>{order.keyDeliveryStatus}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "14px" }}>
                {refundExpired && (
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    Refund window expired (3 days).
                  </span>
                )}
                {canRefund && (
                  <button
                    className="payment-retry-button"
                    style={{ background: "#fff3f7", color: "#c0392b", border: "1px solid #f5a7ba" }}
                    disabled={refundingId === order.id}
                    onClick={() => handleRefund(order.id)}
                  >
                    {refundingId === order.id ? "Processing..." : "Request Refund"}
                  </button>
                )}
                {order.keyDeliveryStatus === "failed" && (
                  <button className="payment-retry-button" onClick={() => handleResend(order.id)}>
                    Resend key email
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </main>
  )
}

/* === Public Landing Page === */
function Home({
  products,
  setPage,
  onSelectProduct,
}: {
  products: Product[]
  setPage: (p: Page) => void
  onSelectProduct: (p: Product) => void
}) {
  const featured = useMemo(() => {
    if (!products.length) return []
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
              licenses from trusted digital vendors. Pay with wallet credits and receive
              your key by email after the payment event is confirmed.
            </p>
            <div className="hero-buttons">
              <button
                className="primary-button"
                onClick={() => setPage("store")}
              >
                Browse catalog <Icon name="arrow" size={18} />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  document.querySelector("#how")?.scrollIntoView({ behavior: "smooth" })
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
                <Icon name="check" size={15} /> Credit wallet checkout
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
                  <small>MOJANG STUDIOS</small>
                  <strong>Minecraft Digital Edition</strong>
                </div>
                <span>1,249 credits</span>
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

      {/* Featured Products */}
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
            <ProductGridCard key={p.id} product={p} onSelectProduct={onSelectProduct} />
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
            No physical shipping or waiting. Confirm a credit payment and receive your
            digital key by email after verification.
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
            <h3>Pay with credits</h3>
            <p>Your wallet balance is checked and debited only after a verified payment event.</p>
          </div>
          <div className="step">
            <span>03</span>
            <div className="step-icon">
              <Icon name="mail" />
            </div>
            <h3>PixelPink Email Dispatch</h3>
            <p>Digital keys are allocated instantly and emailed directly to your inbox.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

/* === Store Catalog Page (Clean Grid) === */
function StorePage({
  products,
  onSelectProduct,
}: {
  products: Product[]
  onSelectProduct: (p: Product) => void
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
        p.brand?.toLowerCase().includes(query.toLowerCase()) ||
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
            placeholder="Search game titles, gift cards, software licenses, brands..."
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
              <ProductGridCard
                key={prod.id}
                product={prod}
                onSelectProduct={onSelectProduct}
              />
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

/* === Login Page === */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

function LoginPage({
  onLoginSuccess,
  onNavigateRegister,
}: {
  onLoginSuccess: (user: AuthUser, accessToken?: string) => void
  onNavigateRegister: () => void
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const handleLogin = async (u = username, p = password) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        onLoginSuccess(data.user, data.access)
      } else {
        setError(data.error || "Login failed. Check your credentials.")
      }
    } catch (e: any) {
      setError("Network error: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Google Sign-In callback — called by GSI after the user picks an account
  const handleGoogleCredential = async (response: any) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/auth/google/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        onLoginSuccess(data.user, data.access)
      } else {
        setError(data.error || "Google login failed.")
      }
    } catch (e: any) {
      setError("Network error: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Mount the Google GSI button once the script loads
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return

    const initGSI = () => {
      const google = (window as any).google
      if (!google?.accounts?.id) return
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
      google.accounts.id.renderButton(googleBtnRef.current!, {
        theme: "outline",
        size: "large",
        width: "100%",
        text: "continue_with",
        shape: "rectangular",
      })
    }

    if ((window as any).google?.accounts?.id) {
      initGSI()
    } else {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initGSI
      document.head.appendChild(script)
    }
  }, [])  // eslint-disable-line

  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="login-art">
          <div className="login-brand">
            <Brand onClick={() => {}} />
          </div>
          <div className="login-art-content">
            <span className="login-spark">
              <Icon name="sparkles" size={30} />
            </span>
            <h2>
              PixelPink 
              <br />
              <em>Digital Store.</em>
            </h2>
            <p>
              Discover top-up gift cards, game keys, and premium software. Securely checkout using credits and receive your digital keys instantly via email. Shop as a <strong>Customer</strong> or <strong>Seller</strong>.
            </p>
          </div>
          <div className="pixel-shape shape-one" />
          <div className="pixel-shape shape-two" />
        </div>

        <div className="login-form-wrap">
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
          >
            <span className="kicker">AUTHENTICATION REQUIRED</span>
            <h1>Log in to your account</h1>
            <p>Sign in to access your digital vault and orders.</p>

            {error && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px", background: "#fef2f2", padding: "8px", borderRadius: "8px" }}>
                {error}
              </div>
            )}

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? "Authenticating..." : "Log in"} <Icon name="arrow" size={18} />
            </button>

            {/* Google OAuth divider + button */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "18px 0 14px",
                    color: "#bbb",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ flex: 1, height: "1px", background: "#eadfe4" }} />
                  OR CONTINUE WITH
                  <span style={{ flex: 1, height: "1px", background: "#eadfe4" }} />
                </div>
                {/* GSI renders a real Google button into this div */}
                <div ref={googleBtnRef} style={{ width: "100%" }} />
              </>
            )}

            <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#716871" }}>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onNavigateRegister}
                style={{
                  border: 0,
                  background: "none",
                  color: "#ed2b70",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                }}
              >
                Sign Up
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

/* === Register Page === */
function RegisterPage({
  onRegisterSuccess,
  onNavigateLogin,
}: {
  onRegisterSuccess: (user: AuthUser, accessToken?: string) => void
  onNavigateLogin: () => void
}) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"customer" | "vendor">("customer")
  const [storeName, setStoreName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (role === "vendor" && !storeName.trim()) {
      setError("Store Name is required for Seller accounts.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
          ...(role === "vendor" ? { store_name: storeName.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        onRegisterSuccess(data.user, data.access)
      } else {
        const firstErr =
          data.error ||
          data.detail ||
          (typeof data === "object"
            ? Object.values(data).flat().join(" ")
            : "Registration failed.")
        setError(String(firstErr))
      }
    } catch (err: any) {
      setError("Network error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="login-art">
          <div className="login-brand">
            <Brand onClick={() => {}} />
          </div>
          <div className="login-art-content">
            <span className="login-spark">
              <Icon name="sparkles" size={30} />
            </span>
            <h2>
              Join
              <br />
              <em>PixelPink.</em>
            </h2>
            <p>
              Create a <strong>Customer</strong> account to buy instant digital keys with wallet credits, or register as a <strong>Seller</strong> to launch your own storefront.
            </p>
          </div>
          <div className="pixel-shape shape-one" />
          <div className="pixel-shape shape-two" />
        </div>

        <div className="login-form-wrap">
          <form className="login-form" onSubmit={handleRegister}>
            <span className="kicker">CREATE ACCOUNT</span>
            <h1>Sign up for PixelPink</h1>
            <p>Fill in your details below to get started.</p>

            {error && (
              <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px", background: "#fef2f2", padding: "8px", borderRadius: "8px" }}>
                {error}
              </div>
            )}

            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </label>

            <label>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                minLength={6}
                required
              />
            </label>

            <label>
              Account Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "customer" | "vendor")}
                style={{
                  padding: "11px 14px",
                  borderRadius: "10px",
                  border: "1px solid #eadfe4",
                  background: "#fffcfd",
                  fontSize: "13px",
                }}
              >
                <option value="customer">Customer</option>
                <option value="vendor">Seller</option>
              </select>
            </label>

            {role === "vendor" && (
              <label>
                Store Name
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. PixelVault Keys"
                  required
                />
              </label>
            )}

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"} <Icon name="arrow" size={18} />
            </button>

            <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#716871" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onNavigateLogin}
                style={{
                  border: 0,
                  background: "none",
                  color: "#ed2b70",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                }}
              >
                Log In
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}

/* === Cart Drawer Component === */
function CartDrawer({
  isOpen,
  onClose,
  cart,
  walletBalance,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
}: {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  walletBalance: number | null
  onUpdateQuantity: (variantId: number, qty: number) => void
  onRemoveItem: (variantId: number) => void
  onCheckout: () => void
  isCheckingOut: boolean
}) {
  if (!isOpen) return null

  const selectedLine = cart[0]
  const subtotal = selectedLine
    ? (finiteNumber(selectedLine.variant.price_credits) ?? 0) * selectedLine.quantity
    : 0

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
              <p>Explore the store and pick your digital games, gift cards, or licenses.</p>
            </div>
          ) : (
            cart.map((item) => {
              const variantLabel = Object.entries(item.variant.attributes)
                .map(([_, v]) => v)
                .join(" • ")
              const itemTotal = (finiteNumber(item.variant.price_credits) ?? 0) * item.quantity

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
                        {formatCredits(itemTotal)} credits
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
              <span>Selected line total:</span>
              <span>{formatCredits(subtotal)} credits</span>
            </div>
            <div className="cart-wallet-row">
              <span>Available balance</span>
              <strong>{walletBalance === null ? "Loading..." : `${formatCredits(walletBalance)} credits`}</strong>
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
                  Checkout with credits <Icon name="arrow" size={18} />
                </>
              )}
            </button>
            <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: "#888" }}>
              One product line is paid per checkout session
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* === Order Confirmation / Key Reveal Modal === */
function OrderSuccessModal({
  order,
  onClose,
  onSimulatePay,
}: {
  order: any | null
  onClose: () => void
  onSimulatePay?: (orderId: number) => void
}) {
  if (!order) return null

  const isFulfilled = order.status === "fulfilled" || order.status === "paid"

  return (
    <div className="order-modal-backdrop">
      <div className="order-modal" style={{ textAlign: "center" }}>
        <div className="order-modal-header" style={{ marginBottom: "20px" }}>
          <div
            className="order-modal-icon"
            style={{
              background: isFulfilled ? "#ecfdf5" : "#fef2f2",
              color: isFulfilled ? "#16a34a" : "#ed2b70",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name={isFulfilled ? "check" : "shield"} size={34} />
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 10px", color: "#211822" }}>
            {isFulfilled ? "Payment successful!" : `Order #${order.id} Created`}
          </h2>

          <p
            style={{
              color: isFulfilled ? "#15803d" : "#666",
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: 1.5,
              margin: "0 0 8px",
            }}
          >
            {isFulfilled
              ? "Payment successful! Your digital keys have been sent to your email."
              : "Status: Awaiting payment via PayMongo."}
          </p>

          {isFulfilled && (
            <p style={{ color: "#716871", fontSize: "13px", margin: "4px 0 0" }}>
              Please check your registered inbox for your activation codes and instructions.
            </p>
          )}
        </div>

        {/* Order Summary (No Keys Displayed) */}
        <div
          style={{
            borderTop: "1px solid #f2e9ed",
            borderBottom: "1px solid #f2e9ed",
            padding: "16px 0",
            margin: "20px 0",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "12px", color: "#888" }}>
            <span>Order Number</span>
            <strong>#{order.id}</strong>
          </div>

          {order.items?.map((item: any) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{item.snapshot_name}</span>
                <span style={{ color: "#888", marginLeft: "6px" }}>x{item.quantity}</span>
              </div>
              <strong style={{ color: "#211822" }}>
                {formatPeso((finiteNumber(item.unit_price) ?? 0) * item.quantity)}
              </strong>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px dashed #eadfe4",
              fontSize: "15px",
              fontWeight: 800,
            }}
          >
            <span>Total Paid</span>
            <span style={{ color: "#ed2b70", fontSize: "18px" }}>
              {formatPeso(order.total)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
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
            className="primary-button"
            style={{ flex: 1, textAlign: "center" }}
            onClick={onClose}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}

/* ===================================================================
   Billing Address Verifier — Nominatim (OpenStreetMap) + Leaflet
   =================================================================== */

/** Inner component: once the map mounts, fly to the looked-up coords */
function MapFlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], 15)
  }, [lat, lon, map])
  return null
}

interface NominatimAddress {
  road?: string
  house_number?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  state?: string
  region?: string
  postcode?: string
  country?: string
}

interface BillingForm {
  street: string
  city: string
  state: string
  postcode: string
  country: string
  displayName: string
}

function BillingAddressVerifier({
  onVerifiedLocationChange,
}: {
  onVerifiedLocationChange?: (location: string) => void
}) {
  const [query, setQuery] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [form, setForm] = useState<BillingForm>({
    street: "", city: "", state: "", postcode: "", country: "", displayName: "",
  })

  useEffect(() => {
    const resolved =
      form.displayName.trim() ||
      [form.street, form.city, form.state, form.postcode, form.country]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")
    onVerifiedLocationChange?.(resolved)
  }, [form, onVerifiedLocationChange])

  const handleVerify = async () => {
    const q = query.trim()
    if (!q) return
    setVerifying(true)
    setVerifyError("")
    setCoords(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`
      const res = await fetch(url, {
        headers: { "User-Agent": "PixelPink-Billing/1.0" },
      })
      if (!res.ok) throw new Error("Nominatim request failed.")
      const results = await res.json()
      if (!Array.isArray(results) || results.length === 0) {
        setVerifyError("⚠ Couldn't verify this address. Please enter it manually.")
        return
      }
      const hit = results[0]
      const addr: NominatimAddress = hit.address || {}
      const street = [addr.house_number, addr.road].filter(Boolean).join(" ")
      setCoords({ lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) })
      setForm({
        street:      street || addr.suburb || "",
        city:        addr.city || addr.town || addr.village || "",
        state:       addr.state || addr.region || "",
        postcode:    addr.postcode || "",
        country:     addr.country || "",
        displayName: hit.display_name || "",
      })
    } catch {
      setVerifyError("⚠ Couldn't verify this address. Please enter it manually.")
    } finally {
      setVerifying(false)
    }
  }

  const updateField = (field: keyof BillingForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="billing-verifier">
      <h3 className="billing-verifier-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "middle" }}>
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        Billing Address Verification
      </h3>

      {/* Search bar */}
      <div className="billing-search-row">
        <input
          className="billing-search-input"
          type="text"
          placeholder="e.g. 1600 Amphitheatre Parkway, Mountain View"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          disabled={verifying}
        />
        <button
          className="billing-verify-btn"
          onClick={handleVerify}
          disabled={verifying || !query.trim()}
        >
          {verifying ? "Verifying…" : "Verify Address"}
        </button>
      </div>

      {verifyError && (
        <p className="billing-verify-error">{verifyError}</p>
      )}

      {/* Map — only shown after a successful lookup */}
      {coords && (
        <div className="billing-map-wrapper">
          <MapContainer
            center={[coords.lat, coords.lon]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: "220px", width: "100%", borderRadius: "12px" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[coords.lat, coords.lon]} />
            <MapFlyTo lat={coords.lat} lon={coords.lon} />
          </MapContainer>
        </div>
      )}

      {/* Editable address form */}
      <div className="billing-form-grid">
        {([
          ["Street", "street"],
          ["City", "city"],
          ["State / Region", "state"],
          ["Postcode", "postcode"],
          ["Country", "country"],
        ] as [string, keyof BillingForm][]).map(([label, key]) => (
          <label key={key} className="billing-form-field">
            <span>{label}</span>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </label>
        ))}
        <label className="billing-form-field billing-full-address">
          <span>Full Address (from map)</span>
          <input
            type="text"
            value={form.displayName}
            readOnly
            placeholder="Populated after verification"
            style={{ color: "#888", cursor: "default" }}
          />
        </label>
      </div>
    </div>
  )
}

type GatewaySession = {
  sessionId: string
  status: string
  customerName: string
  customerEmail: string
  productName: string
  quantity: number
  creditsRequired: number
  walletBalance: number
  expiresAt: string
}

function CustomGatewayPage({
  sessionId,
  accessToken,
  walletBalance,
  onPaymentComplete,
  onNavigate,
}: {
  sessionId: string
  accessToken: string | null
  walletBalance: number | null
  onPaymentComplete: () => Promise<number | null>
  onNavigate: (path: string) => void
}) {
  const [session, setSession] = useState<GatewaySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [verifiedLocation, setVerifiedLocation] = useState("")

  useEffect(() => {
    let active = true
    const loadSession = async () => {
      if (!accessToken) {
        setError("Your session has expired. Sign in again to continue.")
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`${API_BASE}/gateway/sessions/${sessionId}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Checkout session could not be loaded.")
        if (active) {
          setSession(data)
          if (data.status === "paid") {
            window.location.assign(`/payment/success?session_id=${encodeURIComponent(sessionId)}`)
          }
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Checkout session could not be loaded.")
      } finally {
        if (active) setLoading(false)
      }
    }
    loadSession()
    return () => { active = false }
  }, [sessionId, accessToken])

  const simulatePayment = async () => {
    if (!accessToken) return
    setPaying(true)
    setError("")
    try {
      const response = await fetch(`${API_BASE}/gateway/sessions/${sessionId}/simulate-payment/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verifiedLocation }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Payment could not be completed.")
      if (data.status !== "paid") throw new Error(data.status === "insufficient_credits" ? "Your balance changed. Add credits before paying." : "This session can no longer be paid.")
      try {
        await onPaymentComplete()
      } catch {
        setError("Payment succeeded, but the latest wallet balance could not be loaded.")
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      onNavigate(`/payment/success?session_id=${encodeURIComponent(sessionId)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment could not be completed.")
      setPaying(false)
    }
  }

  const expired = session ? new Date(session.expiresAt).getTime() <= Date.now() || session.status === "expired" : false
  const unavailable = !session || session.status !== "pending" || expired

  return (
    <main className="payment-shell">
      <div className="payment-topline"><Brand onClick={() => onNavigate("/")} /><span>SECURE TEST CHECKOUT</span></div>
      <section className="payment-panel">
        <div className="payment-panel-heading">
          <span className="payment-kicker">PIXELPINK GATEWAY</span>
          <h1>{loading ? "Loading checkout" : expired ? "Session expired" : session?.status === "paid" ? "Payment complete" : session?.status === "failed" ? "Payment failed" : "Confirm your payment"}</h1>
          <p>Credits are deducted only after the signed payment event is verified.</p>
        </div>
        {session && (
          <div className="payment-summary">
            <div><span>Name</span><strong>{session.customerName}</strong></div>
            <div><span>Email</span><strong>{session.customerEmail || "No email on account"}</strong></div>
            <div><span>Product</span><strong>{session.productName}</strong></div>
            <div><span>Quantity</span><strong>{session.quantity}</strong></div>
            <div><span>Available balance</span><strong>{formatCredits(walletBalance ?? session.walletBalance)} credits</strong></div>
            <div className="payment-total"><span>Total</span><strong>{formatCredits(session.creditsRequired)} credits</strong></div>
          </div>
        )}
        {(error || expired || session?.status === "failed") && (
          <p className="payment-error" role="alert">{error || (expired ? "This checkout session has expired." : "Payment was not completed.")}</p>
        )}
        <BillingAddressVerifier onVerifiedLocationChange={setVerifiedLocation} />
        <button className="payment-action" onClick={simulatePayment} disabled={loading || paying || unavailable || !accessToken}>
          {paying ? <><span className="payment-spinner" /> Processing payment</> : "Confirm and simulate payment"}
        </button>
        <button className="payment-secondary" onClick={() => onNavigate("/")}>Cancel and return to store</button>
      </section>
    </main>
  )
}

type PaymentOrderSummary = {
  id: string
  status: string
  productName: string
  quantity: number
  creditsSpent: number
  keyDeliveryStatus: "pending" | "sent" | "failed"
  maskedEmail: string
}

function PaymentSuccessPage({
  sessionId,
  accessToken,
  walletBalance,
  onNavigate,
}: {
  sessionId: string | null
  accessToken: string | null
  walletBalance: number | null
  onNavigate: (path: string) => void
}) {
  const [order, setOrder] = useState<PaymentOrderSummary | null>(null)
  const [sessionStatus, setSessionStatus] = useState("pending")
  const [error, setError] = useState("")
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let active = true
    let timer = 0
    const poll = async () => {
      if (!sessionId || !accessToken) {
        setError("Sign in again with the purchasing account to view this order.")
        return
      }
      try {
        const headers = { Authorization: `Bearer ${accessToken}` }
        const sessionResponse = await fetch(`${API_BASE}/checkout/${sessionId}/`, { headers })
        const sessionData = await sessionResponse.json()
        if (!sessionResponse.ok) throw new Error(sessionData.error || "Order session could not be loaded.")
        if (active) setSessionStatus(sessionData.status)
        if (!sessionData.orderId) {
          if (active && !["failed", "expired", "cancelled"].includes(sessionData.status)) {
            timer = window.setTimeout(poll, 1200)
          }
          return
        }
        const orderResponse = await fetch(`${API_BASE}/orders/${sessionData.orderId}/`, { headers })
        const orderData = await orderResponse.json()
        if (!orderResponse.ok) throw new Error(orderData.error || "Order status could not be loaded.")
        if (active) setOrder(orderData)
        if (active && !["sent", "failed"].includes(orderData.keyDeliveryStatus)) {
          timer = window.setTimeout(poll, 1200)
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Order status could not be loaded.")
      }
    }
    poll()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [sessionId, accessToken])

  const resendEmail = async () => {
    if (!order || !accessToken) return
    setResending(true)
    setError("")
    try {
      const response = await fetch(`${API_BASE}/orders/${order.id}/resend-key-email/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Email delivery retry failed.")
      setOrder({ ...order, keyDeliveryStatus: data.keyDeliveryStatus })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Email delivery retry failed.")
    } finally {
      setResending(false)
    }
  }

  const deliveryStatus = order?.keyDeliveryStatus
  const paymentFailed = ["failed", "expired", "cancelled"].includes(sessionStatus) && !order

  return (
    <main className="payment-shell success-shell">
      <div className="payment-topline"><Brand onClick={() => onNavigate("/")} /><span>ORDER DELIVERY</span></div>
      <section className="payment-panel success-panel">
        <span className={`delivery-mark ${deliveryStatus === "sent" ? "sent" : deliveryStatus === "failed" || paymentFailed ? "failed" : "waiting"}`}>
          {deliveryStatus === "sent" ? <Icon name="check" size={30} /> : <Icon name={paymentFailed ? "x" : "mail"} size={28} />}
        </span>
        <span className="payment-kicker">{paymentFailed ? "PAYMENT NOT COMPLETED" : "PAYMENT CONFIRMED"}</span>
        <h1>{deliveryStatus === "sent" ? "Your key is on its way" : deliveryStatus === "failed" ? "Email delivery failed" : paymentFailed ? "Payment could not be completed" : "Confirming your order"}</h1>
        {order ? (
          <div className="success-order-summary">
            <strong>{order.productName}</strong>
            <span>Quantity {order.quantity} · {formatCredits(order.creditsSpent)} credits</span>
          </div>
        ) : !paymentFailed ? <p>Waiting for the verified payment event.</p> : null}
        {deliveryStatus === "sent" && <p>Payment successful. Your digital key was emailed to <strong>{order?.maskedEmail}</strong>.</p>}
        {deliveryStatus === "pending" && <p>The order is paid. Checking the Email API delivery status...</p>}
        {deliveryStatus === "failed" && <p>The order remains paid. Retry delivery using the same email idempotency key.</p>}
        {order && <p className="success-balance">Your balance: {walletBalance === null ? "—" : `${formatCredits(walletBalance)} credits`}</p>}
        {error && <p className="payment-error" role="alert">{error}</p>}
        {deliveryStatus === "failed" && <button className="payment-action" onClick={resendEmail} disabled={resending}>{resending ? "Retrying delivery..." : "Resend key email"}</button>}
        <button className="payment-secondary" onClick={() => onNavigate("/")}>Return to store</button>
      </section>
    </main>
  )
}

/* === Main Application Component === */
export default function App() {
  const [page, setPage] = useState<Page>("home")
  const [route, setRoute] = useState(() => `${window.location.pathname}${window.location.search}`)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState("")
  const [toast, setToast] = useState("")

  // Authentication State
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("pixelpink_user")
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("pixelpink_access_token"))
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

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
  const [activeOrder, setActiveOrder] = useState<any | null>(null)

  const navigate = (target: string) => {
    const url = new URL(target, window.location.origin)
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href)
      return
    }
    const nextRoute = `${url.pathname}${url.search}${url.hash}`
    window.history.pushState({}, "", nextRoute)
    setRoute(nextRoute)
    if (url.pathname === "/") setPage("home")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigatePage = (nextPage: Page) => {
    if (route.startsWith("/products/") && nextPage !== "product-detail") navigate("/")
    setPage(nextPage)
  }

  useEffect(() => {
    const handlePopState = () => setRoute(`${window.location.pathname}${window.location.search}`)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    localStorage.setItem("pixelpink_cart", JSON.stringify(cart))
  }, [cart])

  const fetchCatalog = () => {
    fetch(`${API_BASE}/products/`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results || []
        setProducts(items)
      })
      .catch((err) => console.error("Catalog fetch error:", err))
  }

  useEffect(() => {
    fetchCatalog()
  }, [])

  const refreshWallet = async (token = accessToken) => {
    if (!token) {
      setWalletBalance(null)
      return null
    }
    const response = await fetch(`${API_BASE}/wallet/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error("Wallet balance could not be refreshed.")
    const data = await response.json()
    const balance = finiteNumber(data.balance)
    if (balance === null) throw new Error("Wallet API returned an invalid balance.")
    setWalletBalance(balance)
    return balance
  }

  useEffect(() => {
    if (!accessToken) {
      setWalletBalance(null)
      return
    }
    let active = true
    refreshWallet(accessToken)
      .catch(() => {
        if (active) setWalletBalance(null)
      })
    return () => { active = false }
  }, [accessToken])

  const routePath = route.split("?")[0]
  const productSlug = routePath.match(/^\/products\/([^/]+)\/?$/)?.[1]

  useEffect(() => {
    if (!productSlug) return
    setPage("product-detail")
    setProductError("")
    const listedProduct = products.find((item) => item.slug === productSlug)
    if (listedProduct) {
      setSelectedProduct(listedProduct)
      setProductLoading(false)
      return
    }

    let active = true
    setProductLoading(true)
    fetch(`${API_BASE}/products/${encodeURIComponent(productSlug)}/`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || "This product could not be found.")
        if (active) setSelectedProduct(data)
      })
      .catch((reason) => {
        if (active) setProductError(reason instanceof Error ? reason.message : "This product could not be loaded.")
      })
      .finally(() => {
        if (active) setProductLoading(false)
      })
    return () => { active = false }
  }, [productSlug, products])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const handleLoginSuccess = (loggedInUser: AuthUser, token?: string) => {
    setUser(loggedInUser)
    setAccessToken(token || null)
    localStorage.setItem("pixelpink_user", JSON.stringify(loggedInUser))
    if (token) {
      localStorage.setItem("pixelpink_access_token", token)
    } else {
      localStorage.removeItem("pixelpink_access_token")
    }
    showToast(`Welcome back, ${loggedInUser.username}!`)
    if (loggedInUser.is_seller || loggedInUser.role === "vendor") {
      navigatePage("seller")
    } else {
      navigatePage("store")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout/`, { method: "POST" })
    } catch {}
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem("pixelpink_user")
    localStorage.removeItem("pixelpink_access_token")
    showToast("Logged out successfully.")
    navigatePage("home")
  }

  // Auth Guards: If not logged in, clicking product or cart redirects to login
  const handleSelectProduct = (p: Product) => {
    if (!user) {
      showToast("Please log in to view product details and purchase.")
      navigatePage("login")
      return
    }
    setSelectedProduct(p)
    setProductError("")
    setProductLoading(false)
    setPage("product-detail")
    navigate(`/products/${encodeURIComponent(p.slug)}`)
  }

  const handleAddToCart = (product: Product, variant: Variant, quantity = 1) => {
    if (!user) {
      showToast("Please log in to add products to your cart.")
      navigatePage("login")
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id)
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product, variant, quantity }]
    })

    const attrSummary = Object.values(variant.attributes).join(" • ")
    showToast(`Added ${product.name} (${attrSummary || "Item"}) to cart`)
    setIsCartOpen(true)
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

  const handleCheckoutItem = async (selectedItem: CartItem) => {
    if (!user) {
      setIsCartOpen(false)
      navigatePage("login")
      return
    }
    setIsCheckingOut(true)

    try {
      const idempotencyKey = crypto.randomUUID()
      const payload = {
        productId: selectedItem.variant.id,
        quantity: selectedItem.quantity,
      }

      const res = await fetch(`${API_BASE}/checkout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Checkout failed.")
        setIsCheckingOut(false)
        return
      }

      if (!data.checkoutUrl) {
        throw new Error("The payment provider did not return a checkout URL.")
      }

      setCart((current) => current.filter((item) => item.variant.id !== selectedItem.variant.id))
      setIsCartOpen(false)
      navigate(data.checkoutUrl)
    } catch (e: any) {
      alert("Error initiating checkout: " + e.message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleCheckout = async () => {
    if (cart[0]) await handleCheckoutItem(cart[0])
  }

  const handleBuyNow = async (product: Product, variant: Variant, quantity: number) => {
    await handleCheckoutItem({ product, variant, quantity })
  }

  const handleSimulatePayment = async (orderId: number) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/simulate-payment/`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        setActiveOrder(data.order)
        showToast("Order paid! Your digital keys have been sent to your email.")
      } else {
        alert(data.error || "Simulation failed.")
        if (data.order) {
          setActiveOrder(data.order)
        }
      }
    } catch (e: any) {
      console.error("Simulation failed:", e)
      alert(`Simulation error: ${e.message}`)
    }
  }

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const customCheckoutSessionId = routePath.match(/^\/pay\/([^/]+)\/?$/)?.[1]
  const successSessionId = new URLSearchParams(route.split("?")[1] || "").get("session_id")

  if (customCheckoutSessionId) {
    return (
      <CustomGatewayPage
        sessionId={customCheckoutSessionId}
        accessToken={accessToken}
        walletBalance={walletBalance}
        onPaymentComplete={() => refreshWallet()}
        onNavigate={navigate}
      />
    )
  }
  if (routePath === "/payment/success") {
    return <PaymentSuccessPage sessionId={successSessionId} accessToken={accessToken} walletBalance={walletBalance} onNavigate={navigate} />
  }

  return (
    <div className="app">
      <Header
        page={page}
        setPage={navigatePage}
        user={user}
        walletBalance={walletBalance}
        cartCount={totalCartCount}
        openCart={() => {
          if (!user) {
            showToast("Please log in to access your cart.")
            navigatePage("login")
          } else {
            setIsCartOpen(true)
          }
        }}
        onLogout={handleLogout}
      />

      {page === "home" && (
        <Home
          products={products}
          setPage={navigatePage}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {page === "store" && (
        <StorePage
          products={products}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {page === "product-detail" && selectedProduct && (
        <ProductDetailErrorBoundary key={selectedProduct.slug} onBack={() => navigatePage("store")}>
          <ProductDetailPage
            product={selectedProduct}
            walletBalance={walletBalance}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onBack={() => navigatePage("store")}
          />
        </ProductDetailErrorBoundary>
      )}
      {page === "product-detail" && !selectedProduct && (
        <main className="product-detail-page">
          <p role={productError ? "alert" : undefined}>{productError || (productLoading ? "Loading product..." : "Couldn't load this product.")}</p>
          <button className="text-button" onClick={() => navigatePage("store")}>Back to products</button>
        </main>
      )}

      {page === "seller" && user && (
        <SellerCenterPage
          user={user}
          accessToken={accessToken}
          products={products}
          onRefreshProducts={fetchCatalog}
        />
      )}

      {page === "orders" && user && <MyOrdersPage accessToken={accessToken} setWalletBalance={setWalletBalance} />}

      {page === "login" && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => navigatePage("register")}
        />
      )}

      {page === "register" && (
        <RegisterPage
          onRegisterSuccess={handleLoginSuccess}
          onNavigateLogin={() => navigatePage("login")}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        walletBalance={walletBalance}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      <OrderSuccessModal
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onSimulatePay={handleSimulatePayment}
      />

      {page !== "login" && page !== "register" && (
        <footer>
          <div className="footer-top">
            <div>
              <Brand onClick={() => navigatePage("home")} />
              <p style={{ color: "#a89aa2", fontSize: "12px", marginTop: "8px" }}>
                Instant authentic digital codes, prepaid gift cards, and official licenses.
              </p>
            </div>
            <div className="footer-links">
              <button onClick={() => navigatePage("store")}>Browse Products</button>
              <button onClick={() => navigatePage("home")}>How it works</button>
              <button onClick={() => navigatePage("login")}>Account</button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 PixelPink | Digital Storefront. All rights reserved.</span>
            <div>
              <span>Payment: <strong>Wallet credits</strong></span>
              <span>Delivery: <strong>Email API</strong></span>
            </div>
          </div>
        </footer>
      )}

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
