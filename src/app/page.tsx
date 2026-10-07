import { LoginForm } from './LoginForm'

// Los códigos son alfanuméricos; se limpia lo que llegue por la URL antes de mostrarlo.
function cleanCode(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 50)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { code } = await searchParams

  return (
    <LoginForm
      initialCode={cleanCode(code)}
      coupleNames={process.env.NEXT_PUBLIC_COUPLE_NAMES ?? 'Boda'}
      weddingDate={process.env.NEXT_PUBLIC_WEDDING_DATE ?? ''}
    />
  )
}
