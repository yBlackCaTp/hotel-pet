'use client'

import { useEffect, useState } from 'react'
import { criarReserva, obterPrecoPreview, obterDatasBloqueadas } from './actions'
import DateRangePicker from '@/components/DateRangePicker'

export default function Home() {
  const [etapa, setEtapa] = useState<'formulario' | 'confirmacao'>('formulario')
  const [mensagem, setMensagem] = useState<{ status: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  
  const [pets, setPets] = useState([{ name: '', size: 'PEQUENO' }])

  const [datasReserva, setDatasReserva] = useState({ checkIn: '', checkOut: '' })
  const [diasBloqueados, setDiasBloqueados] = useState<Set<string>>(new Set())

  useEffect(() => {
    obterDatasBloqueadas().then((dias) => setDiasBloqueados(new Set(dias)))
  }, [])
  
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

  const calcularDiarias = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0
    const inicio = new Date(checkIn + 'T00:00:00')
    const fim = new Date(checkOut + 'T00:00:00')
    const diffMs = fim.getTime() - inicio.getTime()
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
  }

  const NUMERO_WHATSAPP = '5583987488166'

  function montarMensagemWhatsApp(linkPagamento: string) {
    const diarias = calcularDiarias(dadosReserva.checkInDate, dadosReserva.checkOutDate)
    const nomesCaes = pets.map(p => `${p.name} (${p.size})`).join(', ')
    const dataCheckIn = new Date(dadosReserva.checkInDate + 'T00:00:00').toLocaleDateString('pt-BR')
    const dataCheckOut = new Date(dadosReserva.checkOutDate + 'T00:00:00').toLocaleDateString('pt-BR')

    const linhaPagamento = linkPagamento ? `\n*Link para pagamento:* ${linkPagamento}\n` : ''

    const texto = `Olá! Gostaria de confirmar minha reserva na Cãodomínio 🐾

*Tutor:* ${dadosReserva.name}
*E-mail:* ${dadosReserva.email}
*Cão(ães):* ${nomesCaes}
*Check-in:* ${dataCheckIn} às ${dadosReserva.checkInTime}
*Check-out:* ${dataCheckOut} às ${dadosReserva.checkOutTime}
*Diárias:* ${diarias}
*Valor total:* R$ ${dadosReserva.precoEstimado.toFixed(2)}
${linhaPagamento}
Aguardo confirmação, obrigado!`

    return encodeURIComponent(texto)
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
    const checkInDate = datasReserva.checkIn
    const checkOutDate = datasReserva.checkOut

    if (!checkInDate || !checkOutDate) {
      setMensagem({ status: 'erro', texto: 'Selecione as datas de check-in e check-out.' })
      setIsSubmitting(false)
      return
    }

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
      setAceitouTermos(false)
      setEtapa('confirmacao')
    } else {
      setMensagem({ status: 'erro', texto: precoRes.error || 'Erro ao calcular o valor das diárias.' })
    }
    setIsSubmitting(false)
  }

  async function confirmarEEnviar() {
    if (!aceitouTermos) {
      setMensagem({ status: 'erro', texto: 'Você precisa aceitar o Termo de Responsabilidade para continuar.' })
      return
    }

    setIsSubmitting(true)
    setMensagem({ status: 'sucesso', texto: 'Processando sua reserva...' })

    // Agora passamos os dados de forma exata para não haver erro no TypeScript
    const resultado = await criarReserva({
      name: dadosReserva.name,
      email: dadosReserva.email,
      pets: pets,
      checkInDate: dadosReserva.checkInDate,
      checkInTime: dadosReserva.checkInTime,
      checkOutDate: dadosReserva.checkOutDate,
      checkOutTime: dadosReserva.checkOutTime,
      termosAceitos: aceitouTermos
    })

    if (resultado.success && resultado.bookingId) {
      const linkPagamento = `${window.location.origin}/pagamento/${resultado.bookingId}`
      const mensagem = montarMensagemWhatsApp(linkPagamento)

      console.log('[Cãodomínio] Link de pagamento gerado:', linkPagamento)
      console.log('[Cãodomínio] Mensagem final (decodificada):', decodeURIComponent(mensagem))

      window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensagem}`, '_blank')
      setMensagem({ status: 'sucesso', texto: 'Reserva enviada! Confira a aba do WhatsApp que abrimos para você.' })
      setIsSubmitting(false)
    } else {
      setMensagem({ status: 'erro', texto: resultado.error || 'Erro ao processar sua reserva no servidor.' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-teal-200">
      <nav className="absolute top-0 w-full z-50 py-6 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-stone-800 tracking-tighter">
          CÃO<span className="text-teal-700">DOMÍNIO</span>
        </h1>
        <span className="bg-stone-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
          Vagas Disponíveis
        </span>
      </nav>

      <main className="relative min-h-screen flex items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 via-stone-100 to-amber-50"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.12),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(217,119,6,0.10),transparent_45%)]"></div>
        </div>

        <div className="relative z-20 max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-center lg:text-left space-y-6">
            <h2 className="text-5xl md:text-6xl font-extrabold text-stone-900 leading-tight">
              O conforto que o seu cão <span className="text-teal-700 italic">merece.</span>
            </h2>
            <p className="text-lg md:text-xl text-stone-700 max-w-lg mx-auto lg:mx-0">
              Hospedagem VIP com acompanhamento em tempo real, rotina de exercícios e muito carinho.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl transition-all">

            <div className="flex items-center gap-2 mb-6">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${etapa === 'formulario' ? 'bg-teal-700' : 'bg-teal-200'}`}></div>
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${etapa === 'confirmacao' ? 'bg-teal-700' : 'bg-stone-200'}`}></div>
            </div>

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
                <form onSubmit={irParaConfirmacao} className="space-y-5 animate-fadeIn">
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <input required name="name" type="text" placeholder="Seu Nome Completo" className="w-full rounded-xl border-stone-200 bg-white/80 p-3 text-sm focus:ring-teal-600 border shadow-sm" />
                    <input required name="email" type="email" placeholder="seu.email@exemplo.com" className="w-full rounded-xl border-stone-200 bg-white/80 p-3 text-sm focus:ring-teal-600 border shadow-sm" />
                  </div>

                  <div className="bg-white/40 p-4 rounded-2xl border border-white/60 space-y-3">
                    <label className="block text-xs font-bold text-stone-500 uppercase">Hóspedes ({pets.length})</label>
                    
                    {pets.map((pet, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            required
                            type="text"
                            placeholder={`Nome do ${index + 1}º Cão`}
                            value={pet.name}
                            onChange={(e) => atualizarPet(index, 'name', e.target.value)}
                            className="w-full rounded-xl border-stone-200 bg-white/90 p-3 text-sm focus:ring-teal-600 border shadow-sm"
                          />
                          {index > 0 && (
                            <button type="button" onClick={() => removerPet(index)} className="text-red-500 hover:text-red-700 font-bold px-2" title="Remover">
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {[
                            { value: 'PEQUENO', label: 'Porte P' },
                            { value: 'MEDIO', label: 'Porte M' },
                            { value: 'GRANDE', label: 'Porte G' },
                          ].map((opcao) => (
                            <button
                              key={opcao.value}
                              type="button"
                              onClick={() => atualizarPet(index, 'size', opcao.value)}
                              className={`flex-1 rounded-xl border p-2 text-xs font-bold transition-all ${
                                pet.size === opcao.value
                                  ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                                  : 'bg-white/90 border-stone-200 text-stone-500 hover:border-teal-300'
                              }`}
                            >
                              {opcao.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <button type="button" onClick={adicionarPet} className="text-teal-700 hover:text-teal-900 text-sm font-bold pt-1 transition-colors">
                      + Adicionar outro cão
                    </button>
                  </div>

                  <div className="bg-white/40 p-4 rounded-2xl border border-white/60 space-y-3">
                    <label className="block text-xs font-bold text-stone-500 uppercase">Período da estadia</label>
                    <DateRangePicker
                      checkInValue={datasReserva.checkIn}
                      checkOutValue={datasReserva.checkOut}
                      diasBloqueados={diasBloqueados}
                      onChange={(checkIn, checkOut) => setDatasReserva({ checkIn, checkOut })}
                    />
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Horário check-in</label>
                        <input required name="checkInTime" type="time" defaultValue="14:00" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 ml-1">Horário check-out</label>
                        <input required name="checkOutTime" type="time" defaultValue="12:00" className="w-full rounded-xl border-stone-200 bg-white/80 p-2.5 text-sm border focus:ring-teal-600" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:bg-stone-400">
                    {isSubmitting && (
                      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin-slow"></span>
                    )}
                    {isSubmitting ? 'Calculando diárias...' : 'Verificar Resumo da Reserva'}
                  </button>

                  <a
                    href="https://wa.me/5500000000000?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20hospedagem%20para%20meu%20c%C3%A3o."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full text-teal-700 hover:text-teal-900 font-bold text-sm py-2 transition-colors"
                  >
                    Prefere tirar dúvidas antes? Fale no WhatsApp →
                  </a>
                </form>
              </>
            ) : (
              // --- TELA DE RESUMO / CONFIRMAÇÃO ---
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Resumo da sua Reserva</h3>
                  <p className="text-stone-500 text-sm">Confirme as informações antes de enviar pelo WhatsApp.</p>
                </div>

                <div className="bg-white/90 rounded-2xl p-5 border border-stone-100 space-y-4 shadow-sm text-sm">
                  <div className="grid grid-cols-2 gap-2 border-b border-stone-100 pb-3">
                    <div><span className="text-stone-400 block text-xs font-bold uppercase">Responsável</span> <strong className="text-stone-800">{dadosReserva.name}</strong></div>
                    <div><span className="text-stone-400 block text-xs font-bold uppercase">E-mail</span> <strong className="text-stone-800 truncate block">{dadosReserva.email}</strong></div>
                  </div>

                  <div className="border-b border-stone-100 pb-3">
                    <span className="text-stone-400 block text-xs font-bold uppercase mb-1">Cães Hóspedes ({pets.length})</span>
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

                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-full">
                      🗓️ {calcularDiarias(dadosReserva.checkInDate, dadosReserva.checkOutDate)} diária(s)
                    </span>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs text-teal-800">
                    <span>
                      {calcularDiarias(dadosReserva.checkInDate, dadosReserva.checkOutDate)} diária(s) × {pets.length} cão(ães)
                    </span>
                    <span>
                      ≈ R$ {(dadosReserva.precoEstimado / Math.max(1, calcularDiarias(dadosReserva.checkInDate, dadosReserva.checkOutDate) * pets.length)).toFixed(2)} / diária por cão
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-teal-100 pt-3">
                    <span className="text-teal-800 font-bold text-xs uppercase tracking-wider">Valor Total</span>
                    <span className="text-2xl font-black text-teal-700">R$ {dadosReserva.precoEstimado.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-stone-500 uppercase mb-2">Termo de Responsabilidade</p>
                  <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside marker:text-stone-400">
                    <li>Declaro que o cão está com vacinas e controle de pulgas/carrapatos em dia.</li>
                    <li>Estou ciente de que, em caso de sinais evidentes de doença, infestação ou agressividade extrema no check-in, a Cãodomínio pode recusar a entrada, aplicando a política de cancelamento/reembolso.</li>
                    <li>Autorizo atendimento veterinário emergencial caso necessário, com custos repassados a mim.</li>
                  </ul>

                  <label className="flex items-start gap-2.5 mt-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-stone-300 text-teal-700 focus:ring-teal-600 shrink-0"
                    />
                    <span className="text-sm font-semibold text-stone-800">
                      Li e aceito o Termo de Responsabilidade acima.
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button type="button" disabled={isSubmitting} onClick={() => setEtapa('formulario')} className="col-span-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-4 rounded-xl transition-all">
                    Voltar
                  </button>
                  <button type="button" disabled={isSubmitting || !aceitouTermos} onClick={confirmarEEnviar} className="col-span-2 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg text-center disabled:bg-stone-300 disabled:shadow-none disabled:cursor-not-allowed">
                    {isSubmitting && (
                      <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin-slow"></span>
                    )}
                    {isSubmitting ? 'Abrindo WhatsApp...' : 'Confirmar via WhatsApp'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* DIFERENCIAIS */}
      <section className="relative z-10 bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-teal-700 font-bold text-sm uppercase tracking-widest">Por que a Cãodomínio</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-stone-900 mt-2">
              Cuidado de verdade, não só um lugar pra dormir
            </h3>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: '📹', title: 'Câmeras ao vivo', desc: 'Acompanhe seu cão em tempo real pelo celular, a qualquer hora.' },
              { emoji: '🩺', title: 'Suporte veterinário', desc: 'Equipe preparada para cuidar de rotinas e emergências.' },
              { emoji: '🎾', title: 'Rotina de exercícios', desc: 'Passeios e brincadeiras diárias para gastar energia.' },
              { emoji: '🍖', title: 'Alimentação cuidada', desc: 'Seguimos a dieta do seu cão ou oferecemos ração premium.' },
            ].map((item) => (
              <div key={item.title} className="bg-stone-50 rounded-2xl p-6 border border-stone-100 hover:border-teal-200 hover:shadow-md transition-all">
                <span className="text-3xl">{item.emoji}</span>
                <h4 className="font-bold text-stone-900 mt-3 mb-1">{item.title}</h4>
                <p className="text-stone-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section className="relative z-10 bg-stone-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-teal-700 font-bold text-sm uppercase tracking-widest">Quem já confiou</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-stone-900 mt-2">
              Tutores e cães satisfeitos
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { nome: 'Marina S.', pet: 'tutora da Bela', texto: 'Recebia fotos e vídeos todos os dias. Fiquei super tranquila deixando minha cachorra lá.' },
              { nome: 'Rafael T.', pet: 'tutor do Thor', texto: 'Atendimento atencioso e o espaço é limpo e seguro. Já é meu hotel de confiança para o Thor.' },
              { nome: 'Camila O.', pet: 'tutora do Rex e da Mel', texto: 'Reservei em minutos pelo site e o processo de pagamento foi rápido e simples.' },
            ].map((dep) => (
              <div key={dep.nome} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="text-amber-500 text-sm mb-3">★★★★★</div>
                <p className="text-stone-600 text-sm leading-relaxed mb-4">"{dep.texto}"</p>
                <p className="text-stone-900 font-bold text-sm">{dep.nome}</p>
                <p className="text-stone-400 text-xs">{dep.pet}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RODAPÉ / CONTATO */}
      <footer className="relative z-10 bg-stone-900 text-stone-300 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10">
          <div>
            <h4 className="text-white font-black text-xl tracking-tighter mb-3">
              CÃO<span className="text-teal-400">DOMÍNIO</span>
            </h4>
            <p className="text-sm text-stone-400 max-w-xs">
              Hospedagem VIP para cães, com acompanhamento em tempo real e muito carinho.
            </p>
          </div>

          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Contato</h5>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
                  WhatsApp: (00) 00000-0000
                </a>
              </li>
              <li>
                <a href="mailto:contato@caodominio.com" className="hover:text-teal-400 transition-colors">
                  contato@caodominio.com
                </a>
              </li>
              <li>Rua Exemplo, 123 — Sua Cidade/UF</li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Horário</h5>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>Check-in: 08h às 20h, todos os dias</li>
              <li>Check-out: 08h às 12h</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-stone-800 mt-10 pt-6 text-xs text-stone-500">
          © {new Date().getFullYear()} Cãodomínio. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}