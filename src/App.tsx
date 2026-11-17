import { FormEvent, useMemo, useState, useEffect, useRef } from "react"

const API_BASE = "http://127.0.0.1:8000/api"

type Page = "home" | "store" | "product-detail" | "seller" | "orders" | "login"
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

export interface OrderRecord {
  id: number
  status: string
  total: string
  created_at: string
  items?: Array<{
    id: number
    snapshot_name: string
    quantity: number
    unit_price: string
    fulfillments?: Array<{
      id: number
      key_code: string
      email_sent_at: string
      message_id?: string
    }>
  }>
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
  cartCount,
  openCart,
  onLogout,
}: {
  page: Page
  setPage: (p: Page) => void
  user: AuthUser | null
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
    if (!product.variants || product.variants.length === 0) {
      return Number(product.base_price)
    }
    const prices = product.variants.map((v) => Number(v.price))
    return Math.min(...prices)
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
            <strong style={{ fontSize: "18px", color: "#ed2b70" }}>
              ₱{minPrice.toLocaleString("en-PH")}
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
  onAddToCart,
  onBack,
}: {
  product: Product
  onAddToCart: (product: Product, variant: Variant, quantity: number) => void
  onBack: () => void
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    product.variants?.[0]?.id || 0
  )
  const [quantity, setQuantity] = useState(1)

  const activeVariant = useMemo(() => {
    return product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0]
  }, [product.variants, selectedVariantId])

  const priceFormatted = activeVariant
    ? Number(activeVariant.price).toLocaleString("en-PH")
    : Number(product.base_price).toLocaleString("en-PH")

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
              src={product.cover_image}
              alt={product.name}
              className="detail-main-img"
            />
          </div>
          <div className="detail-thumbs">
            <div className="detail-thumb active">
              <img src={product.cover_image} alt="Thumbnail 1" />
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
            <div className="detail-price-val">₱{priceFormatted}</div>
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
                        ₱{Number(v.price).toLocaleString("en-PH")}
                      </span>
                      <span className="variation-btn-stock">
                        {v.stock_count > 0 ? `✓ In Stock (${v.stock_count})` : "Out of Stock"}
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
          <div className="buy-box-price">₱{priceFormatted}</div>
          <div className="buy-box-stock-status">
            <Icon name="check" size={16} /> In Stock - Instant Email Delivery
          </div>
          <div className="buy-box-delivery">
            Delivered immediately to your registered email via <strong>PixelPink Instant Email Service</strong> upon checkout.
          </div>

          <div className="buy-box-qty-row">
            <span>Quantity:</span>
            <select
              className="buy-box-qty-select"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="buy-box-actions">
            <button
              className="buy-box-btn-cart"
              onClick={() => {
                if (activeVariant) {
                  onAddToCart(product, activeVariant, quantity)
                }
              }}
            >
              <Icon name="bag" size={18} /> Add to Cart
            </button>
            <button
              className="buy-box-btn-buy"
              onClick={() => {
                if (activeVariant) {
                  onAddToCart(product, activeVariant, quantity)
                }
              }}
            >
              Buy Now
            </button>
          </div>

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
              <strong>PayMongo Secure</strong>
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
function SellerCenterPage({
  user,
  products,
  onRefreshProducts,
}: {
  user: AuthUser
  products: Product[]
  onRefreshProducts: () => void
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
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

  const handleAddVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: "New Variant", price: 999, stock_count: 10 }],
    }))
  }

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault()
    try {
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
          sku: `${formData.name.slice(0, 3).toUpperCase()}-${v.name.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
          attributes: { edition: v.name },
          price: v.price,
          stock_count: v.stock_count,
        })),
      }

      const res = await fetch(`${API_BASE}/vendor/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Username": user.username,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        alert("Product and digital keys created successfully!")
        setShowAddModal(false)
        onRefreshProducts()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to create product.")
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  return (
    <main className="seller-page">
      <div className="seller-header-banner">
        <div className="seller-title-group">
          <h1>Seller Center — {user.vendor?.name || user.username}</h1>
          <p>Manage your digital catalog, inspect available keys, and add product variations.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowAddModal(true)}
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
            </tr>
          </thead>
          <tbody>
            {sellerProducts.map((p) => {
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
                  <td>₱{Number(p.base_price).toLocaleString()}</td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="seller-modal">
            <div className="seller-modal-header">
              <h2>Add Product &amp; Variations</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ border: 0, background: "none", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="seller-form">
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
                  <div key={i} className="variant-row-input">
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
                      Keys to Generate
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
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Publish Product &amp; Generate Keys
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
function MyOrdersPage({ user }: { user: AuthUser }) {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/orders/?username=${user.username}&email=${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : data.results || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  const handleRefund = async (orderId: number) => {
    if (!confirm("Are you sure you want to request a refund for this order?")) return
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/refund/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Customer requested digital key return" }),
      })
      if (res.ok) {
        alert("Refund processed successfully via PayMongo.")
        // Refresh orders
        const refreshed = await fetch(`${API_BASE}/orders/?username=${user.username}`).then((r) => r.json())
        setOrders(Array.isArray(refreshed) ? refreshed : refreshed.results || [])
      }
    } catch (e: any) {
      alert("Refund error: " + e.message)
    }
  }

  return (
    <main className="orders-page">
      <div className="orders-header">
        <h1>My Orders &amp; Digital Keys</h1>
        <p style={{ color: "#666" }}>
          View all your purchases, activation keys, and order history.
        </p>
      </div>

      {loading ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: "20px" }}>
          <Icon name="key" size={48} />
          <h3 style={{ marginTop: "12px" }}>No orders yet</h3>
          <p style={{ color: "#666" }}>Your purchased digital codes will appear here immediately after payment.</p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card-top">
              <div>
                <strong>Order #{order.id}</strong>
                <span style={{ color: "#888", marginLeft: "12px" }}>
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className={`order-status-pill ${order.status}`}>{order.status}</span>
                <strong style={{ fontSize: "16px", color: "#ed2b70" }}>
                  ₱{Number(order.total).toLocaleString()}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: "18px" }}>
              {order.items?.map((item) => (
                <div key={item.id} style={{ marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>
                    {item.snapshot_name} (x{item.quantity}) — ₱{Number(item.unit_price).toLocaleString()}
                  </div>

                  {item.fulfillments && item.fulfillments.length > 0 ? (
                    item.fulfillments.map((f) => (
                      <div key={f.id} className="key-box" style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "11px", color: "#666" }}>Digital Activation Code:</div>
                        <code className="key-code-display">{f.key_code}</code>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>
                          <span>✓ Sent via PixelPink Email</span>
                          <span>Delivered: {f.email_sent_at ? new Date(f.email_sent_at).toLocaleTimeString() : "Instant"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                      Key code masked until payment confirmation.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {order.status !== "refunded" && (
              <div style={{ textAlign: "right", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f6ecf0" }}>
                <button
                  onClick={() => handleRefund(order.id)}
                  style={{
                    border: 0,
                    background: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Request Refund (PayMongo API)
                </button>
              </div>
            )}
          </div>
        ))
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
              licenses from trusted digital vendors. Pay with GCash, Maya, or Card via
              PayMongo and receive keys via PixelPink Email in seconds.
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
                  <small>MOJANG STUDIOS</small>
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
            No physical shipping or waiting. Powered by PayMongo Checkout Sessions for
            fraud-protected transactions and PixelPink Instant Email for direct code dispatch.
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

/* === Login Page with One-Click Demo Role Selection === */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ""

function LoginPage({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: AuthUser, accessToken?: string) => void
}) {
  const [username, setUsername] = useState("customer")
  const [password, setPassword] = useState("customer123")
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
              Role-Based
              <br />
              <em>Access Portal.</em>
            </h2>
            <p>
              Log in as a <strong>Customer</strong> to shop and view your digital keys, or as a{" "}
              <strong>Seller</strong> to manage your products and inventory in the Seller Center.
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
            <p>Choose a demo role below for instant one-click login:</p>

            {/* Quick Demo Role Logins */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => handleLogin("customer", "customer123")}
                style={{
                  padding: "10px",
                  border: "1px solid #ebdbe2",
                  background: "#fff8fa",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#ed2b70",
                  cursor: "pointer",
                }}
              >
                👤 Customer Login
              </button>
              <button
                type="button"
                onClick={() => handleLogin("gamehub", "vendor123")}
                style={{
                  padding: "10px",
                  border: "1px solid #211822",
                  background: "#211822",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                🏪 GameHub Seller
              </button>
              <button
                type="button"
                onClick={() => handleLogin("topup", "vendor123")}
                style={{
                  padding: "10px",
                  border: "1px solid #211822",
                  background: "#211822",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                🏪 TopUp Seller
              </button>
              <button
                type="button"
                onClick={() => handleLogin("codevault", "vendor123")}
                style={{
                  padding: "10px",
                  border: "1px solid #211822",
                  background: "#211822",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                🏪 CodeVault Seller
              </button>
            </div>

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
              <p>Explore the store and pick your digital games, gift cards, or licenses.</p>
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
              Instant digital key delivery to your email
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
                ₱{Number(item.unit_price * item.quantity).toLocaleString("en-PH")}
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
              ₱{Number(order.total).toLocaleString("en-PH")}
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

/* === Main Application Component === */
export default function App() {
  const [page, setPage] = useState<Page>("home")
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
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
      setPage("seller")
    } else {
      setPage("store")
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
    setPage("home")
  }

  // Auth Guards: If not logged in, clicking product or cart redirects to login
  const handleSelectProduct = (p: Product) => {
    if (!user) {
      showToast("Please log in to view product details and purchase.")
      setPage("login")
      return
    }
    setSelectedProduct(p)
    setPage("product-detail")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleAddToCart = (product: Product, variant: Variant, quantity = 1) => {
    if (!user) {
      showToast("Please log in to add products to your cart.")
      setPage("login")
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

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!user) {
      setIsCartOpen(false)
      setPage("login")
      return
    }
    setIsCheckingOut(true)

    try {
      const payload = {
        items: cart.map((i) => ({
          variant_id: i.variant.id,
          quantity: i.quantity,
        })),
        email: user.email || "customer@example.com",
        name: user.username,
        success_url: window.location.origin + "?checkout_success=true",
        cancel_url: window.location.origin,
      }

      const res = await fetch(`${API_BASE}/checkout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

      // Clear cart
      setCart([])
      setIsCartOpen(false)

      if (data.checkout_url && !data.checkout_url.includes("mock_session")) {
        // Redirect to PayMongo Hosted Checkout Page
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

  return (
    <div className="app">
      <Header
        page={page}
        setPage={setPage}
        user={user}
        cartCount={totalCartCount}
        openCart={() => {
          if (!user) {
            showToast("Please log in to access your cart.")
            setPage("login")
          } else {
            setIsCartOpen(true)
          }
        }}
        onLogout={handleLogout}
      />

      {page === "home" && (
        <Home
          products={products}
          setPage={setPage}
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
        <ProductDetailPage
          product={selectedProduct}
          onAddToCart={handleAddToCart}
          onBack={() => setPage("store")}
        />
      )}

      {page === "seller" && user && (
        <SellerCenterPage
          user={user}
          products={products}
          onRefreshProducts={fetchCatalog}
        />
      )}

      {page === "orders" && user && <MyOrdersPage user={user} />}

      {page === "login" && <LoginPage onLoginSuccess={handleLoginSuccess} />}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
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

      {page !== "login" && (
        <footer>
          <div className="footer-top">
            <div>
              <Brand onClick={() => setPage("home")} />
              <p style={{ color: "#a89aa2", fontSize: "12px", marginTop: "8px" }}>
                Instant authentic digital codes, prepaid gift cards, and official licenses.
              </p>
            </div>
            <div className="footer-links">
              <button onClick={() => setPage("store")}>Browse Products</button>
              <button onClick={() => setPage("home")}>How it works</button>
              <button onClick={() => setPage("login")}>Account</button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 PixelPink | Digital Storefront. All rights reserved.</span>
            <div>
              <span>Payment Gateway: <strong>PayMongo Secure</strong></span>
              <span>Delivery: <strong>Instant Email Delivery</strong></span>
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
