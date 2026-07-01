// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

const FERIADOS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
]

async function calcularPrecoTotal(checkInStr: string, checkOutStr: string, petsCount: number): Promise<number> {
  const dataEntrada = new Date(checkInStr + 'T00:00:00')
  const dataSaida = new Date(checkOutStr + 'T00:00:00')
  
  const regrasManuais = await prisma.pricingRule.findMany()

  let precoTotal = 0
  let dataAtual = new Date(dataEntrada)

  while (dataAtual < dataSaida) {
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0')
    const dia = String(dataAtual.getDate()).padStart(2, '0')
    const dataFormatada = `${mes}-${dia}`

    const regraSuprema = regrasManuais.find(regra => 
      dataAtual >= regra.startDate && dataAtual <= regra.endDate
    )

    if (regraSuprema) {
      precoTotal += regraSuprema.price
    } else if (FERIADOS.includes(dataFormatada)) {
      precoTotal += 80
    } else {
      precoTotal += 60
    }

    dataAtual.setDate(dataAtual.getDate() + 1)
  }

  return precoTotal * petsCount
}

export async function obterPrecoPreview(checkInDate: string, checkOutDate: string, petsCount: number) {
  try {
    const price = await calcularPrecoTotal(checkInDate, checkOutDate, petsCount)
    return { success: true, price }
  } catch (error) {
    return { success: false, price: 0 }
  }
}

export async function criarReserva(dados: {
  name: string
  email: string
  pets: { name: string; size: string }[]
  checkInDate: string
  checkInTime: string
  checkOutDate: string
  checkOutTime: string
}) {
  try {
    const petsCount = dados.pets.length
    const totalPrice = await calcularPrecoTotal(dados.checkInDate, dados.checkOutDate, petsCount)

    const user = await prisma.user.upsert({
      where: { email: dados.email },
      update: { name: dados.name },
      create: { name: dados.name, email: dados.email },
    })

    const nomesPetsCombinados = dados.pets.map(p => p.name).join(' & ')
    const portesPetsCombinados = dados.pets.map(p => p.size).join(', ')

    const pet = await prisma.pet.create({
      data: {
        name: nomesPetsCombinados,
        breed: petsCount > 1 ? 'Múltiplos' : 'Ignorado no MVP',
        size: portesPetsCombinados,
        isCastrated: true,
        hasBehaviorIssues: false,
        userId: user.id,
      },
    })

    const finalCheckIn = new Date(`${dados.checkInDate}T${dados.checkInTime}:00`)
    const finalCheckOut = new Date(`${dados.checkOutDate}T${dados.checkOutTime}:00`)

    const booking = await prisma.booking.create({
      data: {
        checkIn: finalCheckIn,
        checkOut: finalCheckOut,
        totalPrice,
        // A linha "petsCount" foi removida daqui para não dar erro na Vercel!
        userId: user.id,
        petId: pet.id,
        status: 'PENDENTE',
      },
    })

    return { success: true, bookingId: booking.id, price: totalPrice, petName: nomesPetsCombinados }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao salvar no banco de dados.' }
  }
}

// --- FUNÇÕES DO PAINEL ADMIN ---
export async function criarRegra(formData: FormData) {
  const name = formData.get('name') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const price = Number(formData.get('price'))

  try {
    await prisma.pricingRule.create({
      data: { name, startDate: new Date(startDate + 'T00:00:00'), endDate: new Date(endDate + 'T00:00:00'), price },
    })
    revalidatePath('/admin') 
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Erro ao criar regra' }
  }
}

export async function deletarRegra(id: string) {
  try {
    await prisma.pricingRule.delete({ where: { id } })
    revalidatePath('/admin')
  } catch (error) {
    console.error(error)
  }
}