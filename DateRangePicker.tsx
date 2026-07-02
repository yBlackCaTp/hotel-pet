import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializa o Mercado Pago com a chave que está no seu .env
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

function obterUrlBase() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function POST(req: Request) {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      console.error('MP_ACCESS_TOKEN não está definido no .env');
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN não configurado no servidor.' }, { status: 500 });
    }

    const { bookingId, totalPrice, petName } = await req.json();

    const preference = new Preference(client);
    const urlBase = obterUrlBase();
    
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
          success: `${urlBase}/sucesso`, 
          failure: `${urlBase}/erro`,
        },
        // O auto_return foi removido temporariamente pois a API 
        // bloqueia redirecionamentos automáticos para "localhost".
      },
    });

    return NextResponse.json({ initPoint: result.init_point });
    
  } catch (error) {
    console.error("Erro no Mercado Pago:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 });
  }
}