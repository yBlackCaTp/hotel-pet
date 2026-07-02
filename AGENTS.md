'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseISO(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime()
}

interface DateRangePickerProps {
  checkInValue: string
  checkOutValue: string
  diasBloqueados?: Set<string>
  onChange: (checkIn: string, checkOut: string) => void
}

export default function DateRangePicker({ checkInValue, checkOutValue, diasBloqueados, onChange }: DateRangePickerProps) {
  const bloqueados = diasBloqueados ?? new Set<string>()
  const [open, setOpen] = useState(false)
  const [checkIn, setCheckIn] = useState<Date | null>(() => parseISO(checkInValue))
  const [checkOut, setCheckOut] = useState<Date | null>(() => parseISO(checkOutValue))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [mesExibido, setMesExibido] = useState(() => {
    const base = parseISO(checkInValue) ?? hoje
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const isBloqueado = (date: Date) => bloqueados.has(toISO(date))

  // Se já escolheu o check-in e está selecionando o check-out, nenhuma data
  // depois do primeiro dia bloqueado pode ser escolhida (evita reserva "pulando" um bloqueio)
  const primeiroBloqueioAposCheckin = useMemo(() => {
    if (!checkIn) return null
    const cursor = new Date(checkIn)
    cursor.setDate(cursor.getDate() + 1)
    for (let i = 0; i < 730; i++) {
      if (bloqueados.has(toISO(cursor))) return cursor
      cursor.setDate(cursor.getDate() + 1)
    }
    return null
  }, [checkIn, bloqueados])

  function isDesabilitado(date: Date) {
    if (isBefore(date, hoje)) return true
    if (isBloqueado(date)) return true
    if (checkIn && !checkOut && primeiroBloqueioAposCheckin && date.getTime() >= primeiroBloqueioAposCheckin.getTime()) {
      return true
    }
    return false
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selecionar(date: Date) {
    if (isDesabilitado(date)) return

    // Sem check-in ainda, ou já tínhamos um período completo: começa nova seleção
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(date)
      setCheckOut(null)
      onChange(toISO(date), '')
      return
    }

    // Clicou em uma data igual ou anterior ao check-in: reinicia a partir dela
    if (date.getTime() <= checkIn.getTime()) {
      setCheckIn(date)
      setCheckOut(null)
      onChange(toISO(date), '')
      return
    }

    // Data válida de check-out (sempre pelo menos 1 dia depois)
    setCheckOut(date)
    onChange(toISO(checkIn), toISO(date))
    setOpen(false)
  }

  function getDiasDoMes(ano: number, mes: number) {
    const primeiroDia = new Date(ano, mes, 1)
    const inicioSemana = primeiroDia.getDay()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const dias: (Date | null)[] = []
    for (let i = 0; i < inicioSemana; i++) dias.push(null)
    for (let d = 1; d <= diasNoMes; d++) dias.push(new Date(ano, mes, d))
    return dias
  }

  const dias = getDiasDoMes(mesExibido.getFullYear(), mesExibido.getMonth())

  const podeVoltar =
    mesExibido.getFullYear() > hoje.getFullYear() ||
    (mesExibido.getFullYear() === hoje.getFullYear() && mesExibido.getMonth() > hoje.getMonth())

  function irMesAnterior() {
    setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() - 1, 1))
  }
  function irProximoMes() {
    setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 1))
  }

  function classesData(date: Date) {
    const isPassado = isBefore(date, hoje)
    const bloqueado = isBloqueado(date)
    const isInicio = isSameDay(date, checkIn)
    const isFim = isSameDay(date, checkOut)
    const referenciaFim = checkOut ?? hoverDate
    const emIntervalo =
      checkIn && referenciaFim && date.getTime() > checkIn.getTime() && date.getTime() < referenciaFim.getTime()

    if (isPassado) return 'text-stone-300 cursor-not-allowed'
    if (bloqueado) return 'text-red-300 line-through cursor-not-allowed'
    if (isDesabilitado(date)) return 'text-stone-300 cursor-not-allowed'
    if (isInicio || isFim) return 'bg-teal-700 text-white font-bold rounded-full shadow-sm'
    if (emIntervalo) return 'bg-teal-50 text-teal-800 rounded-none'
    return 'text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer'
  }

  const displayCheckIn = checkIn ? `${pad(checkIn.getDate())}/${pad(checkIn.getMonth() + 1)}` : 'Selecionar'
  const displayCheckOut = checkOut ? `${pad(checkOut.getDate())}/${pad(checkOut.getMonth() + 1)}` : 'Selecionar'

  return (
    <div className="relative" ref={containerRef}>
      <div className="grid grid-cols-2 gap-px bg-stone-200 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`bg-white/95 p-2.5 text-left transition-all ${open ? 'ring-2 ring-inset ring-teal-600' : ''}`}
        >
          <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide">Check-in</span>
          <span className={`block text-sm font-semibold ${checkIn ? 'text-stone-800' : 'text-stone-400'}`}>
            {displayCheckIn}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`bg-white/95 p-2.5 text-left transition-all ${open ? 'ring-2 ring-inset ring-teal-600' : ''}`}
        >
          <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wide">Check-out</span>
          <span className={`block text-sm font-semibold ${checkOut ? 'text-stone-800' : 'text-stone-400'}`}>
            {displayCheckOut}
          </span>
        </button>
      </div>

      {/* Inputs ocultos para o FormData nativo continuar funcionando sem mudar o resto do fluxo */}
      <input type="hidden" name="checkInDate" value={checkIn ? toISO(checkIn) : ''} readOnly />
      <input type="hidden" name="checkOutDate" value={checkOut ? toISO(checkOut) : ''} readOnly />

      {open && (
        <div
          className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-stone-100 p-4 w-[300px]"
          onMouseLeave={() => setHoverDate(null)}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={irMesAnterior}
              disabled={!podeVoltar}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent text-stone-600 text-lg"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-stone-800">
              {MESES[mesExibido.getMonth()]} {mesExibido.getFullYear()}
            </span>
            <button
              type="button"
              onClick={irProximoMes}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600 text-lg"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-stone-400 uppercase pb-1">
                {d}
              </span>
            ))}
            {dias.map((date, i) => (
              <button
                type="button"
                key={i}
                disabled={!date || isDesabilitado(date)}
                onMouseEnter={() => date && setHoverDate(date)}
                onClick={() => date && selecionar(date)}
                className={`h-8 w-8 mx-auto flex items-center justify-center text-xs transition-colors ${
                  date ? classesData(date) : ''
                }`}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-stone-400 text-center mt-3">
            {!checkIn ? 'Selecione a data de entrada' : !checkOut ? 'Agora selecione a data de saída' : 'Período selecionado ✓'}
          </p>
          {bloqueados.size > 0 && (
            <p className="text-[10px] text-stone-400 text-center mt-1">
              <span className="text-red-300 line-through">Datas riscadas</span> estão indisponíveis
            </p>
          )}
        </div>
      )}
    </div>
  )
}
