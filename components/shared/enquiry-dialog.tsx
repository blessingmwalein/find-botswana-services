'use client'

import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { TextAreaField, TextField } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { createEnquiry } from '@/lib/store/actions'
import type { Business, EnquiryTarget } from '@/lib/types'
import { firstError, hasErrors, minLength, required, validEmail, validPhone, type FieldErrors } from '@/lib/validation'

export interface EnquiryTargetRef {
  type: EnquiryTarget
  id: string
  name: string
}

interface Values {
  name: string
  email: string
  phone: string
  preferredDate: string
  message: string
}

function validate(v: Values): FieldErrors<Values> {
  return {
    name: firstError(required(v.name, 'Your name')),
    email: firstError(required(v.email, 'Email'), validEmail(v.email)),
    phone: validPhone(v.phone),
    message: firstError(required(v.message, 'Message'), minLength(v.message, 10, 'Message')),
  }
}

/**
 * Enquiry form. Submitting stores the enquiry in the demo dataset (visible in the business owner's inbox) —
 * nothing is emailed or texted, and the confirmation says so.
 */
export function EnquiryDialog({ open, onOpenChange, business, target }: { open: boolean; onOpenChange: (o: boolean) => void; business: Business; target: EnquiryTargetRef }) {
  const toast = useToast()
  const isService = target.type === 'service'
  const initial: Values = { name: '', email: '', phone: '', preferredDate: '', message: '' }
  const [values, setValues] = useState<Values>(initial)
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const errors = validate(values)
  const show = (k: keyof Values) => (submitted || touched[k] ? errors[k] : undefined)
  const bind = (k: keyof Values) => ({
    value: values[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: show(k),
  })

  const reset = () => {
    setValues(initial)
    setTouched({})
    setSubmitted(false)
    setDone(false)
    setFormError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors(errors)) return
    const result = createEnquiry({
      businessId: business.id,
      targetType: target.type,
      targetId: target.id,
      name: values.name,
      email: values.email,
      phone: values.phone,
      preferredDate: isService ? values.preferredDate : undefined,
      message: values.message,
    })
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setDone(true)
    toast.success('Enquiry saved to the demo inbox')
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTimeout(reset, 200)
      }}
      title={done ? 'Enquiry recorded' : isService ? 'Request this service' : 'Send an enquiry'}
      description={done ? undefined : `To ${business.name} about “${target.name}”.`}
      footer={
        done ? (
          <Button variant="brand" size="md" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="soft" size="md" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="brand" size="md" type="submit" form="enquiry-form">
              {isService ? 'Send request' : 'Send enquiry'}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto size-10 text-brand" />
          <h3 className="mt-4 font-semibold text-forest">Saved for {business.name}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">Your enquiry now appears in this business’s demo inbox. This is a product demonstration — no email, SMS or call was sent to anyone.</p>
        </div>
      ) : (
        <form id="enquiry-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <TextField label="Your name" required autoComplete="name" placeholder="Full name" {...bind('name')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Email" type="email" required autoComplete="email" placeholder="you@example.com" {...bind('email')} />
            <TextField label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+267 71 234 567" {...bind('phone')} />
          </div>
          {isService && <TextField label="Preferred date (optional)" type="date" min={new Date().toISOString().slice(0, 10)} {...bind('preferredDate')} />}
          <TextAreaField label="Message" required rows={4} placeholder={isService ? 'Describe what you need and where.' : 'What would you like to know?'} {...bind('message')} />
          {formError && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {formError}
            </p>
          )}
          <p className="text-[11px] leading-4 text-ink-faint">Demo only: enquiries are stored in this browser and shown in the business owner workspace. Nothing is delivered.</p>
        </form>
      )}
    </Modal>
  )
}
