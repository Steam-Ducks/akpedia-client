/** The digits of a CPF typed with or without punctuation. */
export const cpfDigits = (value: string): string => value.replace(/\D/g, '')

/** "12345678901" -> "123.456.789-01". Anything that is not 11 digits is shown as it is. */
export const formatCpf = (value: string | null | undefined): string => {
  if (!value) return ''
  const digits = cpfDigits(value)
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
