import type { Metadata } from 'next'
import { RegisterPage } from '@/components/pages/register-page'

export const metadata: Metadata = { title: 'List your business', description: 'Register your business in the Find Botswana directory.' }

export default function Page() {
  return <RegisterPage />
}
