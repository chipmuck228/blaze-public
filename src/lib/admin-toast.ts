import { toast } from "sonner"
export { getErrorMessage } from "@/lib/typed-error"

const SUCCESS_DURATION = 4000
const ERROR_DURATION = 7000

type ToastOptions = {
  description?: string
  duration?: number
}

export const adminToast = {
  success(title: string, options?: ToastOptions) {
    toast.success(title, {
      description: options?.description,
      duration: options?.duration ?? SUCCESS_DURATION,
    })
  },

  error(title: string, options?: ToastOptions) {
    toast.error(title, {
      description: options?.description,
      duration: options?.duration ?? ERROR_DURATION,
    })
  },

  warning(title: string, options?: ToastOptions) {
    toast.warning(title, {
      description: options?.description,
      duration: options?.duration ?? 5000,
    })
  },

  info(title: string, options?: ToastOptions) {
    toast.info(title, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    })
  },
}

type AdminConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}

/** Sonner-based confirmation — replaces window.confirm in admin UI */
export function adminConfirm(options: AdminConfirmOptions): Promise<boolean> {
  const {
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
  } = options

  return new Promise((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const toastId = toast(title, {
      description,
      duration: Infinity,
      action: {
        label: confirmLabel,
        onClick: () => {
          toast.dismiss(toastId)
          settle(true)
        },
      },
      cancel: {
        label: cancelLabel,
        onClick: () => {
          toast.dismiss(toastId)
          settle(false)
        },
      },
      onDismiss: () => settle(false),
    })
  })
}
