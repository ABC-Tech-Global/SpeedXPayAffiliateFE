// @vitest-environment jsdom
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('qrcode', () => {
  return {
    default: {
      toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,TEST'),
    },
  }
})

import QRCode from '@/components/QRCode'

describe('QRCode component', () => {
  it('renders an image with data URL generated from value', async () => {
    render(<QRCode value="otpauth://totp/App:alice?secret=ABC123&issuer=App" size={128} alt="2FA QR" />)
    const img = await screen.findByAltText('2FA QR')
    expect(img).toBeTruthy()
    await waitFor(() => {
      expect((img as HTMLImageElement).src).toContain('data:image/png;base64,TEST')
    })
  })
})
