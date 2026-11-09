import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAccountStatus } from '@/services/account'
import type { CpfRefusal } from '@/services/api'
import { refreshSession } from '@/services/auth'

/**
 * Whether the server refuses the CPF on the user's account. While it does, the app stays behind a
 * dialog where the user asks an admin for the right CPF.
 */
export const useCpfStore = defineStore('cpf', () => {
  const problem = ref<CpfRefusal | null>(null)
  const checking = ref(false)

  /** Asks the server. A failure keeps what is known: the pages' own calls report a refusal too. */
  const check = async () => {
    checking.value = true
    try {
      problem.value = (await fetchAccountStatus()).cpfProblem
    } catch {
      // Nothing to do: the next refused call brings the dialog up.
    } finally {
      checking.value = false
    }
  }

  /** A call was refused for the CPF. */
  const refused = (code: CpfRefusal) => {
    problem.value = code
  }

  /**
   * Checks again with a new token: the server reads the CPF from the token, so a CPF an admin
   * just corrected only counts once the token is renewed.
   */
  const recheck = async () => {
    checking.value = true
    try {
      await refreshSession()
    } finally {
      await check()
    }
  }

  return { problem, checking, check, refused, recheck }
})
