import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { prisma } from '@/lib/prisma'

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })

export async function POST(req: Request) {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN não está definido no .env')
      return NextResponse.json({ error: 'Pagamentos não configurados no servidor.' }, { status: 500 })
    }

    const { bookingId, formData } = await req.json()

    if (!bookingId || !formData) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    // Busca a reserva no banco: o valor a cobrar SEMPRE vem daqui, nunca do que o navegador manda
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { pet: true, user: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
    }

    if (booking.status === 'CONFIRMADA') {
      return NextResponse.json({ error: 'Esta reserva já foi paga.' }, { status: 400 })
    }

    const payment = new Payment(client)

    const resultado = await payment.create({
      body: {
        transaction_amount: booking.totalPrice,
        description: `Hospedagem Cãodomínio: ${booking.pet.name}`,
        payment_method_id: formData.payment_method_id,
        token: formData.token,
        installments: Number(formData.installments) || 1,
        issuer_id: formData.issuer_id,
        payer: {
          email: formData.payer?.email || booking.user.email,
          identification: formData.payer?.identification,
        },
        external_reference: booking.id,
      },
    })

    const status = resultado.status // 'approved' | 'in_process' | 'pending' | 'rejected'

    if (status === 'approved') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMADA' },
      })
    }

    // Se for Pix, o Mercado Pago devolve o QR Code dentro de point_of_interaction
    const qrCode = resultado.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = resultado.point_of_interaction?.transaction_data?.qr_code_base64

    return NextResponse.json({
      status,
      statusDetail: resultado.status_detail,
      paymentId: resultado.id,
      qrCode,
      qrCodeBase64,
    })
  } catch (error) {
    console.error('Erro ao processar pagamento:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Erro ao processar pagamento.' }, { status: 500 })
  }
}
