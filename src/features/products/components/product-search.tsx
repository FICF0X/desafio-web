'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { Input } from '@/components/ui/input'

interface ProductSearchProps {
  defaultValue?: string
}

export function ProductSearch({ defaultValue = '' }: ProductSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      const value = e.target.value

      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }

      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <Input
      type="search"
      placeholder="Search by name or SKU…"
      defaultValue={defaultValue}
      onChange={handleChange}
      className="max-w-sm"
      aria-label="Search products"
    />
  )
}
