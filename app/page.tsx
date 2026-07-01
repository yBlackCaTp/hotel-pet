'use client'

import { useState } from 'react'
import { criarReserva, obterPrecoPreview } from './actions'

export default function Home() {
  const [etapa, setEtapa] = useState<'formulario' | 'confirmacao'>('formulario')
  const [mensagem, setMensagem] = useState<{ status: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [pets, setPets] = useState([{ name: '', size: 'PEQUENO' }])
  
  const [dadosReserva, setDadosReserva] = useState({
    name: '', email: '', 
    checkInDate: '', checkInTime: '14:00',
    checkOutDate: '', checkOutTime: '12:00',
    precoEstimado: 0
  })

  const adicionarPet = () => setPets([...pets, { name: '', size: 'PEQUENO' }])
  
  const removerPet = (index: number) => {
    setPets(pets.filter((_, i) => i !== index))
  }

  const atualizarPet = (index: number, campo: 'name' | 'size', valor: string) => {
    const novosPets = [...pets]
    novosPets[index][campo] = valor
    setPets(novosPets)
  }

  async function irParaConfirmacao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMensagem(null)
    setIsSubmitting(true)

    if (pets.some(p => p.name.trim() === '')) {
      setMensagem({ status: 'erro', texto: 'Por favor, preencha o nome de todos os pets.' })
      setIsSubmitting(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const checkInDate = formData.get('checkInDate') as string
    const checkOutDate = formData.get('checkOutDate') as string

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setMensagem({ status: 'erro', texto: 'A data de check-out deve ser maior que a de check-in.' })
      setIsSubmitting(false)
      return
    }

    const precoRes = await obterPrecoPreview(checkInDate, checkOutDate, pets.length)

    if (precoRes.success) {
      setDadosReserva({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        checkInDate,
        checkInTime: formData.get('checkInTime') as string,
        checkOutDate,
        checkOutTime: formData.get('checkOutTime') as string,
        precoEstimado: precoRes.price
      })
      setEtapa('confirmacao')
    } else {
      setMensagem({ status: 'erro', texto: 'Erro ao calcular o valor das diárias.' })
    }
    setIsSubmitting(false)
  }

  async function confirmarEEnviar() {
    setIsSubmitting(true)
    setMensagem({ status: 'sucesso', texto: 'Processando reserva e gerando pagamento seguro...' })

    // Agora passamos os dados de forma exata para não haver erro no TypeScript
    const resultado = await criarReserva({
      name: dadosReserva.name,
      email: dadosReserva.email,
      pets: pets,
      checkInDate: dadosReserva.checkInDate,
      checkInTime: dadosReserva.checkInTime,
      checkOutDate: dadosReserva.checkOutDate,
      checkOutTime: dadosReserva.checkOutTime
    })

    if (resultado.success) {
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: resultado.bookingId, 
          totalPrice: resultado.price,
          petName: resultado.petName
        }),
      });
      
      const data = await res.json();
      if (data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setMensagem({ status: 'erro', texto: 'Erro ao gerar link de pagamento.' })
        setIsSubmitting(false)
      }
    } else {
      setMensagem({ status: 'erro', texto: 'Erro ao processar sua reserva no servidor.' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-teal-200">
      <nav className="absolute top-0 w-full z-50 py-6 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-stone-800 tracking-tighter">
          HOTEL<span className="text-teal-700">PET.</span>
        </h1>
        <span className="bg-stone-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
          Vagas Disponíveis
        </span>
      </nav>

      <main className="relative min-h-screen flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-stone-100/40 mix-blend-multiply z-10"></div>
          <div className="w-full h-full bg-[url('/hero-bg.jpg')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        </div>

        <div className="relative z-20 max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-center lg:text-left space-y-6">
            <h2 className="text-5xl md:text-6xl font-extrabold text-stone-900 leading-tight">
              O conforto que o seu pet <span className="text-teal-700 italic">merece.</span>
            </h2>
            <p className="text-lg md:text-xl text-stone-700 max-w-lg mx-auto lg:mx-0">
              Hospedagem VIP com acompanhamento em tempo real, rotina de exercícios e muito carinho.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl transition-all">
            
            {mensagem && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${
                mensagem.status === 'sucesso' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {mensagem.texto}
              </div>
            )}

            {etapa === 'formulario' ? (
              <>
                <h3 className="text-2xl font-bold text-stone-900 mb-6">Solicitar Hospedagem</h3>
                <form onSubmit={irParaConfirmacao} className="space-y-5">
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <input required name="name" type="text" placeholder="Seu Nome Completo" className="w-full rounded-xl border-stone-200 bg-white/80 p-3 text-sm focus:ring-teal-600 border shadow-sm" />
                    <input required name="email" type="email" placeholder="seu.email@exemplo.com" className="w-full rounded-xl border-stone-200 bg-white/80 p-3 text-sm focus:ring-teal-600 border shadow-sm" />
                  </div>

                  <div className="bg-white/40 p-4 rounded-2xl border border-white/60 space-y-3">
                    <label className="block text-xs font-bold text-stone-500 uppercase">Hóspedes ({pets.length})</label>
                    
                    {pets.map((pet, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input 
                          required 
                          type="text" 
                          placeholder={`Nome do ${index + 1}º Pet`} 
                          value={pet.name}
                          onChange={(e) => atualizarPet(index, 'name', e.target.value)}
                          className="w-full rounded-xl border-stone-200 bg-white/90 p-3 text-sm focus:ring-teal-600 border shadow-sm" 
                        />
                        <select 
                          value={pet.size}
                          onChange={(e) => atualizarPet(index, 'size', e.target.value)}
                          className="w-[120px] rounded-xl border-stone-200 bg-white/90 p-3 text-sm focus:ring-teal-600 border shadow-sm text-stone-600"
                        >
                          <option value="PEQUENO">Porte P</option>
                          <option value="MEDIO">Porte M</option>
                          <option value="GRANDE">Porte G</option>
                        </select>
                        
                        {index > 0 && (
                          <button type="button" onClick={() => removerPet(index)} className="text-red-500 hover:text-red-700 font-bold px-2" title="Remover">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button type="button" onClick={adicionarPet} className="text-teal-700 hover:text-teal-900 text-sm font-bold pt-1 transition-colors">
                      + Adicionar outro pet
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-white/40 p-4 rounded-2xl border border-white/60">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Check-in</label>
                      <input required name="checkInDate" type="date" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600 mb-2" />
                      <input required name="checkInTime" type="time" defaultValue="14:00" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Check-out</label>
                      <input required name="checkOutDate" type="date" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600 mb-2" />
                      <input required name="checkOutTime" type="time" defaultValue="12:00" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600" />
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:bg-stone-400">
                    {isSubmitting ? 'Calculando diárias...' : 'Verificar Resumo da Reserva'}
                  </button>
                </form>
              </>
            ) : (
              // --- TELA DE RESUMO / CONFIRMAÇÃO ---
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Resumo da sua Reserva</h3>
                  <p className="text-stone-500 text-sm">Confirme as informações antes de seguir para o pagamento.</p>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 border border-stone-100 space-y-4 shadow-sm text-sm">
                  <div className="grid grid-cols-2 gap-2 border-b border-stone-100 pb-3">
                    <div><span className="text-stone-400 block text-xs font-bold uppercase">Responsável</span> <strong className="text-stone-800">{dadosReserva.name}</strong></div>
                    <div><span className="text-stone-400 block text-xs font-bold uppercase">E-mail</span> <strong className="text-stone-800 truncate block">{dadosReserva.email}</strong></div>
                  </div>

                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-stone-400 block text-xs font-bold uppercase mb-1">Pets Hóspedes ({pets.length})</span>
                    <div className="space-y-1">
                      {pets.map((pet, i) => (
                        <div key={i} className="flex justify-between">
                          <strong className="text-stone-800">{pet.name}</strong>
                          <span className="text-stone-600 text-xs py-0.5 px-2 bg-stone-200 rounded-md font-bold">{pet.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-stone-400 block text-xs font-bold uppercase">Entrada (Check-in)</span>
                      <strong className="text-stone-800">{new Date(dadosReserva.checkInDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {dadosReserva.checkInTime}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-xs font-bold uppercase">Saída (Check-out)</span>
                      <strong className="text-stone-800">{new Date(dadosReserva.checkOutDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {dadosReserva.checkOutTime}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="text-teal-800 font-bold text-xs uppercase tracking-wider block">Valor Total</span>
                    <span className="text-stone-500 text-xs">Calculado para {pets.length} pet(s)</span>
                  </div>
                  <span className="text-2xl font-black text-teal-700">R$ {dadosReserva.precoEstimado.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button type="button" disabled={isSubmitting} onClick={() => setEtapa('formulario')} className="col-span-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-4 rounded-xl transition-all">
                    Voltar
                  </button>
                  <button type="button" disabled={isSubmitting} onClick={confirmarEEnviar} className="col-span-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg text-center">
                    {isSubmitting ? 'Redirecionando...' : 'Confirmar e Pagar'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}