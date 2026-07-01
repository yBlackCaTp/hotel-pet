import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializa o Mercado Pago com a chave que está no seu .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export async function POST(req: Request) {
  try {
    const { bookingId, totalPrice, petName } = await req.json();

    const preference = new Preference(client);
    
    // Voltamos para o formato oficial exigido pela API (snake_case)
    const result = await preference.create({
      body: {
        items: [
          {
            id: bookingId,
            title: `Hospedagem Pet: ${petName}`,
            quantity: 1,
            unit_price: Number(totalPrice), // Formato correto!
          }
        ],
        back_urls: { 
          success: 'http://localhost:3000/sucesso', 
          failure: 'http://localhost:3000/erro',
        },
        // O auto_return foi removido temporariamente pois a API 
        // bloqueia redirecionamentos automáticos para "localhost".
      },
    });

    return NextResponse.json({ initPoint: result.init_point });
    
  } catch (error) {
    console.error("Erro no Mercado Pago:", error);
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 });
  }
}