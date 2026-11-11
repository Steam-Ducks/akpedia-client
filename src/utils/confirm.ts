import Swal from 'sweetalert2'

export interface ConfirmOptions {
  title: string
  text: string
  confirmText?: string
  cancelText?: string
}

/** Asks the user to confirm an action in a SweetAlert dialog; true only on the confirm button. */
export async function confirmAction({
  title,
  text,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: '#711d3c',
  })
  return result.isConfirmed
}
