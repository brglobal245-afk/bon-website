import React from 'react'
import { useToast } from '../context/ToastContext'
import { CheckCircle, XCircle, Clock, X, ExternalLink } from 'lucide-react'
import { BON_CHAIN } from '../config'

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="toast">
      {toasts.map(toast => (
        <div key={toast.id} className="toast-item" style={{
          borderColor: toast.type === 'success' ? 'rgba(0,192,118,0.3)'
            : toast.type === 'error' ? 'rgba(255,59,92,0.3)'
            : 'rgba(240,165,0,0.3)'
        }}>
          {toast.type === 'success' && <CheckCircle size={18} color="#00C076" style={{flexShrink:0}} />}
          {toast.type === 'error' && <XCircle size={18} color="#FF3B5C" style={{flexShrink:0}} />}
          {toast.type === 'pending' && <div className="spinner" style={{color:'#F0A500'}} />}

          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, color:'#E8EAF2', marginBottom:2}}>
              {toast.title}
            </div>
            {toast.message && (
              <div style={{fontSize:12, color:'#8892A4'}}>{toast.message}</div>
            )}
            {toast.txHash && (
              <a
                href={`${BON_CHAIN.blockExplorers.default.url}/tx/${toast.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{fontSize:11, color:'#F0A500', display:'flex', alignItems:'center', gap:3, marginTop:2, textDecoration:'none'}}
              >
                View on Explorer <ExternalLink size={10} />
              </a>
            )}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            style={{background:'none', border:'none', cursor:'pointer', color:'#404858', padding:2, flexShrink:0}}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
