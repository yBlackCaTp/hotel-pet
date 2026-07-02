'use client'

import { useEffect, useState } from 'react'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'

interface PagamentoBrickProps {
  bookingId: string
  amount: number
  payerEmail: string
}

interface ResultadoPagamento {
  status: string
  statusDetail?: string
  qrCode?: string
  qrCodeBase64?: string
}

// Guarda em nível de módulo: garante que initMercadoPago só roda uma vez,
// mesmo que o componente monte mais de uma vez (Strict Mode, navegação, etc.)
let mpJaInicializado = false

export default function PagamentoBrick({ bookingId, amount, payerEmail }: PagamentoBrickProps) {
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<ResultadoPagamento | null>(null)

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
    if (!publicKey) {
      setErro('Chave pública do Mercado Pago (NEXT_PUBLIC_MP_PUBLIC_KEY) não configurada no .env.')
      return
    }
    if (!mpJaInicializado) {
      initMercadoPago(publicKey, { locale: 'pt-BR' })
      mpJaInicializado = true
    }
    setPronto(true)
  }, [])

  if (erro) {
    return <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-4">{erro}</p>
  }

  // Pagamento aprovado na hora (cartão)
  if (resultado?.status === 'approved') {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-stone-900">Pagamento aprovado!</h3>
        <p className="text-stone-500 text-sm mt-2">Sua reserva está confirmada. Obrigado!</p>
      </div>
    )
  }

  // Pix gerado, aguardando pagamento
  if (resultado?.qrCode) {
    return (
      <div className="text-center py-4 space-y-4">
        <h3 className="text-lg font-bold text-stone-900">Pague com Pix</h3>
        {resultado.qrCodeBase64 && (
          <img
            src={`data:image/png;base64,${resultado.qrCodeBase64}`}
            alt="QR Code Pix"
            className="mx-auto w-52 h-52 border border-stone-200 rounded-xl"
          />
        )}
        <div className="text-left">
          <p className="text-xs text-stone-500 mb-1">Ou copie o código Pix:</p>
          <textarea
            readOnly
            value={resultado.qrCode}
            rows={3}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full text-xs p-2 border border-stone-200 rounded-lg bg-stone-50 font-mono"
          />
        </div>
        <p className="text-xs text-stone-400">Assim que o pagamento for identificado, sua reserva é confirmada automaticamente.</p>
      </div>
    )
  }

  // Recusado, em análise, etc.
  if (resultado && resultado.status !== 'approved') {
    return (
      <div className="text-center py-6">
        <p className="text-amber-700 font-bold">Pagamento não concluído</p>
        <p className="text-stone-500 text-sm mt-1">Status: {resultado.statusDetail || resultado.status}</p>
        <button
          onClick={() => setResultado(null)}
          className="mt-4 text-teal-700 font-bold text-sm underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!pronto) {
    return <p className="text-stone-400 text-sm text-center py-10">Carregando formulário de pagamento...</p>
  }

  return (
    <Payment
      initialization={{ amount, payer: { email: payerEmail } }}
      customization={{
        paymentMethods: {
          creditCard: 'all',
          debitCard: 'all',
          bankTransfer: 'all', // habilita Pix
        },
      }}
      onSubmit={async ({ formData }) => {
        const res = await fetch('/api/pagamento/processar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, formData }),
        })
        const data = await res.json()

        if (!res.ok) {
          setErro(data.error || 'Erro ao processar pagamento.')
          return
        }

        setResultado({
          status: data.status,
          statusDetail: data.statusDetail,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
        })
      }}
      onError={(error) => {
        console.error('Erro no Payment Brick:', error)
        setErro('Ocorreu um erro ao carregar o formulário de pagamento. Recarregue a página.')
      }}
    />
  )
}
