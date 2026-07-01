// app/actions.ts
'use server'

import { prisma } from '@/lib/prisma'

// Lista simplificada de feriados fixos (formato: MM-DD) para o cálculo automático
const FERIADOS = [
  '01-01', // Ano Novo
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
]

// Função para calcular o valor total das diárias
function calcularPrecoTotal(checkInStr: string, checkOutStr: string): number {
  const dataEntrada = new Date(checkInStr + 'T00:00:00')
  const dataSaida = new Date(checkOutStr + 'T00:00:00')
  
  let precoTotal = 0
  let dataAtual = new Date(dataEntrada)

  // Percorre dia a dia da estadia (calculando por diária/noite)
  while (dataAtual < dataSaida) {
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0')
    const dia = String(dataAtual.getDate()).padStart(2, '0')
    const dataFormatada = `${mes}-${dia}`

    // Se o dia atual for feriado, cobra 80. Se não, cobra 60.
    if (FERIADOS.includes(dataFormatada)) {
      precoTotal += 80
    } else {
      precoTotal += 60
    }

    // Avança para o próximo dia
    dataAtual.setDate(dataAtual.getDate() + 1)
  }

  return precoTotal
}

export async function criarReserva(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const petName = formData.get('petName') as string
  const size = formData.get('size') as string
  const checkIn = formData.get('checkIn') as string
  const checkOut = formData.get('checkOut') as string

  // 1. Calcular o preço final com base nas datas
  const totalPrice = calcularPrecoTotal(checkIn, checkOut)

  try {
    // 2. Procura o utilizador pelo e-mail ou cria um novo se não existir
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: { name, email },
    })

    // 3. Cria o perfil do Pet vinculado a esse utilizador
    const pet = await prisma.pet.create({
      data: {
        name: petName,
        breed: 'Ignorado no MVP', // Campo padrão apenas para preencher o banco
        size,
        isCastrated: true,       // Padrão para o formulário inicial
        hasBehaviorIssues: false,
        userId: user.id,
      },
    })

    // 4. Salva a reserva com o preço calculado e status PENDENTE
    const booking = await prisma.booking.create({
      data: {
        checkIn: new Date(checkIn + 'T00:00:00'),
        checkOut: new Date(checkOut + 'T00:00:00'),
        totalPrice,
        userId: user.id,
        petId: pet.id,
        status: 'PENDENTE',
      },
    })

    return { success: true, bookingId: booking.id, price: totalPrice }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao salvar no banco de dados.' }
  }
}