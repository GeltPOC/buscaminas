import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Buscaminas',
  description: 'Juego de Buscaminas clásico'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-200">{children}</body>
    </html>
  )
}
