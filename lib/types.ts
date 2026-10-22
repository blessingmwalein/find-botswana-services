// Shared entity types for the Find Botswana demo dataset.
// All records are fictional; relationships are expressed through stable string IDs.

/** Tint keys map to the soft accent colours already used for avatars in the original design. */
export type ToneKey = 'sage' | 'sand' | 'clay' | 'sky' | 'mist' | 'stone'

/** Deterministic placeholder artwork (rendered as CSS/SVG — no external image requests). */
export interface ArtRef {
  tone: ToneKey
  pattern: 0 | 1 | 2 | 3 | 4
  label?: string
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'
export type ListingStatus = 'draft' | 'published' | 'unpublished' | 'suspended'
export type VerificationStatus = 'unverified' | 'verified'
export type PublicationStatus = 'draft' | 'published' | 'unpublished'

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export interface DayHours {
  open: string // "08:00"
  close: string // "17:00"
}
export type OpeningHours = Record<DayKey, DayHours | null>

export type LocalityType = 'city' | 'town' | 'village' | 'settlement'

export interface Region {
  id: string
  slug: string
  name: string
  /** Seat of the district (informational). */
  seat: string
  description: string
  lat: number
  lng: number
  enabled: boolean
}

export interface Town {
  id: string
  slug: string
  name: string
  regionId: string
  lat: number
  lng: number
  localityType: LocalityType
  description?: string
  /** Neighbourhood names used to build plausible street addresses. */
  areas: string[]
  enabled: boolean
}

export interface Category {
  id: string
  slug: string
  name: string
  /** Single glyph shown in the mint tile (same glyph style as the original design). */
  icon: string
  parentId: string | null
  description: string
  sortOrder: number
  enabled: boolean
}

export type BusinessType =
  | 'Retailer'
  | 'Wholesaler'
  | 'Manufacturer'
  | 'Distributor'
  | 'Contractor'
  | 'Service provider'
  | 'Importer'
  | 'Cooperative'

export interface SocialLinks {
  facebook?: string
  instagram?: string
  linkedin?: string
  whatsapp?: string
}

export type PreferredContact = 'phone' | 'email' | 'whatsapp'
export interface ContactPreferences {
  showPhone: boolean
  showEmail: boolean
  acceptEnquiries: boolean
  preferredContact: PreferredContact
}

export interface Business {
  id: string
  slug: string
  name: string
  logo: { initials: string; tone: ToneKey }
  cover: ArtRef
  /** First entry is the primary category. */
  categoryIds: string[]
  businessType: BusinessType
  shortDescription: string
  description: string
  phone: string
  alternatePhone?: string
  email: string
  website?: string
  regionId: string
  townId: string
  address: string
  lat: number
  lng: number
  /** null = opening hours not supplied. */
  openingHours: OpeningHours | null
  approvalStatus: ApprovalStatus
  listingStatus: ListingStatus
  verificationStatus: VerificationStatus
  featured: boolean
  isFictional: true
  yearEstablished?: number
  registrationRef?: string
  social?: SocialLinks
  contactPreferences: ContactPreferences
  ownerUserId?: string
  createdAt: string
  updatedAt: string
  submittedAt?: string
  rejectionReason?: string
  changeRequest?: string
}

export type PriceType = 'fixed' | 'from' | 'quote'
export type ProductAvailability = 'in_stock' | 'low_stock' | 'made_to_order' | 'seasonal' | 'out_of_stock'

export interface Product {
  id: string
  slug: string
  businessId: string
  name: string
  categoryId: string
  description: string
  image: ArtRef
  gallery: ArtRef[]
  unit: string
  /** BWP; undefined for quote-only listings. */
  price?: number
  currency: 'BWP'
  priceType: PriceType
  availability: ProductAvailability
  specifications: { label: string; value: string }[]
  sku: string
  publicationStatus: PublicationStatus
  createdAt: string
  updatedAt: string
}

export type PricingModel = 'fixed' | 'hourly' | 'daily' | 'project' | 'monthly' | 'quote'
export type ServiceAvailability = 'available' | 'limited' | 'waitlist' | 'unavailable'
export type ServiceCoverage = 'local' | 'regional' | 'nationwide'

export interface Service {
  id: string
  slug: string
  businessId: string
  name: string
  categoryId: string
  description: string
  image: ArtRef
  coverage: ServiceCoverage
  townIds: string[]
  regionIds: string[]
  serviceAreaNote: string
  price?: number
  priceMax?: number
  currency: 'BWP'
  pricingModel: PricingModel
  availability: ServiceAvailability
  publicationStatus: PublicationStatus
  createdAt: string
  updatedAt: string
}

export type UserRole = 'administrator' | 'moderator' | 'business_owner' | 'consumer'
export type UserStatus = 'active' | 'inactive' | 'invited'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  townId: string
  businessIds: string[]
  createdAt: string
  lastActiveAt: string
}

export type EnquiryTarget = 'business' | 'product' | 'service'
export type EnquiryStatus = 'new' | 'read' | 'replied' | 'closed'

export interface Enquiry {
  id: string
  businessId: string
  targetType: EnquiryTarget
  targetId: string
  name: string
  email: string
  phone?: string
  message: string
  preferredDate?: string
  status: EnquiryStatus
  createdAt: string
}

export type ActivityEntity = 'business' | 'product' | 'service' | 'category' | 'region' | 'town' | 'user' | 'enquiry' | 'system'

export interface Activity {
  id: string
  at: string
  actorName: string
  actorRole: string
  /** Dot-notation verb, e.g. "business.approved". */
  action: string
  entityType: ActivityEntity
  entityId: string
  entityName: string
  message: string
}

export interface Settings {
  siteName: string
  tagline: string
  contactEmail: string
  /** Items per page in public directories. */
  pageSize: number
  /** New business submissions need administrator approval. */
  requireApproval: boolean
  showDemoBanner: boolean
  showVerifiedBadges: boolean
  allowEnquiries: boolean
  /** How many featured businesses appear on the home page. */
  featuredLimit: number
}

export interface Dataset {
  businesses: Business[]
  products: Product[]
  services: Service[]
  categories: Category[]
  regions: Region[]
  towns: Town[]
  users: User[]
  enquiries: Enquiry[]
  activities: Activity[]
  settings: Settings
}

export type CollectionKey = Exclude<keyof Dataset, 'settings'>
