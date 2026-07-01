// app/app/page.tsx
'use client'

import { useState } from 'react'
import { criarReserva } from './actions'

export default function Home() {
  const [mensagem, setMensagem] = useState<{ status: 'sucesso' | 'erro'; texto: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setMensagem(null)
    
    const entrada = formData.get('checkIn') as string
    const saida = formData.get('checkOut') as string
    
    if (!entrada || !saida || new Date(entrada) >= new Date(saida)) {
      setMensagem({ status: 'erro', texto: 'A data de check-out deve ser maior que a de check-in.' })
      return
    }

    // 1. Salva no banco de dados (Neon)
    const resultado = await criarReserva(formData)

    if (resultado.success) {
      setMensagem({ 
        status: 'sucesso', 
        texto: 'Reserva criada! Redirecionando para o pagamento...' 
      })

      // 2. Chama a nossa API do Mercado Pago
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: resultado.bookingId, 
          totalPrice: resultado.price,
          petName: formData.get('petName')
        }),
      });
      
      const data = await res.json();
      
      // 3. Redireciona o cliente para a tela de pagamento
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setMensagem({ status: 'erro', texto: 'Erro ao gerar link do Mercado Pago.' })
      }

    } else {
      setMensagem({ status: 'erro', texto: 'Ocorreu um erro ao processar sua reserva.' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            🐾 Hotel Pet Boutique
          </h1>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            10 Vagas Disponíveis
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Nossas Tarifas</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                <span className="text-gray-600">Dias Comuns</span>
                <span className="font-bold text-indigo-600">R$ 60,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Feriados Natal/Ano Novo</span>
                <span className="font-bold text-amber-600">R$ 80,00</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Solicitar Pré-Reserva</h2>
            
            {mensagem && (
              <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${
                mensagem.status === 'sucesso' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {mensagem.texto}
              </div>
            )}

            <form action={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
                  <input required name="name" type="text" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Ana Silva" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input required name="email" type="email" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ana@email.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pet</label>
                  <input required name="petName" type="text" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Thor" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porte do Pet</label>
                  <select name="size" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="PEQUENO">Pequeno (Até 10kg)</option>
                    <option value="MEDIO">Médio (11kg a 25kg)</option>
                    <option value="GRANDE">Grande (Acima de 25kg)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                  <input required name="checkIn" type="date" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                  <input required name="checkOut" type="date" className="w-full rounded-lg border-gray-200 p-2.5 text-sm bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm">
                Confirmar e Salvar Reserva
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}