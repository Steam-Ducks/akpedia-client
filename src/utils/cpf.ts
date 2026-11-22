/** The digits of a CPF typed with or without punctuation. */
export const cpfDigits = (value: string): string => value.replace(/\D/g, '')

/** "12345678901" -> "123.456.789-01". Anything that is not 11 digits is shown as it is. */
export const formatCpf = (value: string | null | undefined): string => {
  if (!value) return ''
  const digits = cpfDigits(value)
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** The check digit computed from the first `length` digits. */
const checkDigit = (digits: string, length: number): number => {
  let sum = 0
  for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/**
 * What is wrong with a CPF typed with or without punctuation, or `null` when it has 11 digits
 * and the right check digits. The server checks the same, and also that no one else has it.
 */
export const cpfProblem = (value: string): string | null => {
  const digits = cpfDigits(value)
  if (digits.length !== 11) return 'O CPF deve ter 11 dígitos.'
  const valid =
    new Set(digits).size > 1 &&
    checkDigit(digits, 9) === Number(digits[9]) &&
    checkDigit(digits, 10) === Number(digits[10])
  return valid ? null : 'CPF inválido: confira os dígitos.'
}
