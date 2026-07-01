// app/admin/page.tsx
import { prisma } from '@/lib/prisma'

// Forçamos o Next.js a sempre buscar dados novos ao acessar essa página
export const dynamic = 'force-dynamic'

export default async function AdminPanel() {
  // Busca todas as reservas no banco, incluindo os dados do tutor (user) e do pet
  const reservas = await prisma.booking.findMany({
    include: {
      user: true,
      pet: true,
    },
    orderBy: {
      createdAt: 'desc', // Mostra as mais recentes primeiro
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabeçalho do Painel */}
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel de Gestão</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie as reservas do seu Hotel Pet</p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-semibold text-sm border border-indigo-100">
            {reservas.length} Reservas Totais
          </div>
        </header>

        {/* Tabela de Reservas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Tutor</th>
                  <th className="px-6 py-4">Pet (Porte)</th>
                  <th className="px-6 py-4">Check-in / Check-out</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma reserva encontrada ainda.
                    </td>
                  </tr>
                ) : (
                  reservas.map((reserva: any) => (
                    <tr key={reserva.id} className="hover:bg-gray-50 transition-colors">
                      {/* Dados do Tutor */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{reserva.user.name}</div>
                        <div className="text-xs text-gray-500">{reserva.user.email}</div>
                      </td>
                      
                      {/* Dados do Pet */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{reserva.pet.name}</div>
                        <div className="text-xs text-gray-500">{reserva.pet.size}</div>
                      </td>
                      
                      {/* Datas */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium">In:</span> {reserva.checkIn.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                        <div>
                          <span className="font-medium">Out:</span> {reserva.checkOut.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </td>
                      
                      {/* Valor */}
                      <td className="px-6 py-4 font-medium text-gray-900">
                        R$ {reserva.totalPrice.toFixed(2)}
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          reserva.status === 'CONFIRMADA' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {reserva.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}