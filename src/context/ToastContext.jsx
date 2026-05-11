import React, { createContext, useContext, useState, useCallback } from 'react'

// ─── Toast Context ────────────────────────────────────────────────────────────
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { ...toast, id }])
    if (toast.type !== 'pending') {
      setTimeout(() => removeToast(id), 5000)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const updateToast = useCallback((id, update) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...update } : t))
    if (update.type && update.type !== 'pending') {
      setTimeout(() => removeToast(id), 5000)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
