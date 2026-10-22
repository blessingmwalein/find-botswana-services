import type { Business, Product, Service } from './types'

/**
 * Public visibility rules.
 *
 *  - A business is public when it is approved AND its listing is published.
 *  - A product/service is public when it is published AND its business is public.
 *  - Verification is independent: it only decorates a listing with a badge.
 */
export function isBusinessPublic(b: Business): boolean {
  return b.approvalStatus === 'approved' && b.listingStatus === 'published'
}

export function isProductPublic(p: Product, business: Business | undefined): boolean {
  return p.publicationStatus === 'published' && !!business && isBusinessPublic(business)
}

export function isServicePublic(s: Service, business: Business | undefined): boolean {
  return s.publicationStatus === 'published' && !!business && isBusinessPublic(business)
}

/** Single, human-facing lifecycle label derived from approval + listing state. */
export type BusinessLifecycle =
  | 'published'
  | 'pending'
  | 'draft'
  | 'changes_requested'
  | 'rejected'
  | 'suspended'
  | 'unpublished'

export function businessLifecycle(b: Business): BusinessLifecycle {
  if (b.approvalStatus === 'rejected') return 'rejected'
  if (b.approvalStatus === 'changes_requested') return 'changes_requested'
  if (b.approvalStatus === 'pending') return b.submittedAt ? 'pending' : 'draft'
  if (b.listingStatus === 'published') return 'published'
  if (b.listingStatus === 'suspended') return 'suspended'
  return 'unpublished'
}

/** True when a business is waiting in the administrator approval queue. */
export function isInApprovalQueue(b: Business): boolean {
  return b.approvalStatus === 'pending' && !!b.submittedAt
}

export interface ChecklistItem {
  label: string
  done: boolean
}

/** What a complete listing contains — drives both the completeness score and the owner's to-do list. */
export function completenessChecklist(b: Business, productCount: number, serviceCount: number): ChecklistItem[] {
  return [
    { label: 'Write a full description (80+ characters)', done: b.description.length >= 80 },
    { label: 'Add a short description for search results', done: b.shortDescription.length > 0 },
    { label: 'Add a phone number', done: !!b.phone },
    { label: 'Add an email address', done: !!b.email },
    { label: 'Add a website', done: !!b.website },
    { label: 'Add a street address', done: !!b.address },
    { label: 'Add opening hours', done: !!b.openingHours },
    { label: 'Add your registration reference', done: !!b.registrationRef },
    { label: 'Add a social media handle', done: !!b.social && Object.keys(b.social).length > 0 },
    { label: 'List at least one product or service', done: productCount + serviceCount >= 1 },
    { label: 'List at least three products or services', done: productCount + serviceCount >= 3 },
    { label: 'Choose a category', done: b.categoryIds.length > 0 },
  ]
}

/** Listing completeness (0–100) based on how much of the profile has been filled in. */
export function listingCompleteness(b: Business, productCount: number, serviceCount: number): number {
  const checks = completenessChecklist(b, productCount, serviceCount)
  return Math.round((checks.filter((c) => c.done).length / checks.length) * 100)
}
