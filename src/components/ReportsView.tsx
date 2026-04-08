import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Movement } from '../types';

type Props = {
  movements: Movement[];
};

export function ReportsView({ movements }: Props) {
  const movementsByDay = useMemo(() => {
    const grouped: Record<string, number> = {};

    movements.forEach((m: any) => {
      const date = new Date(m.timestamp).toLocaleDateString('pt-BR');
      grouped[date] = (grouped[date] || 0) + m.quantity;
    });

    return Object.entries(grouped)
      .map(([date, total]) => ({ date, total }))
      .reverse();
  }, [movements]);

  const itemsRanking = useMemo(() => {
    const grouped: Record<string, number> = {};

    movements.forEach((m: any) => {
      const itemName = m.item?.name || 'Item não identificado';
      grouped[itemName] = (grouped[itemName] || 0) + m.quantity;
    });

    return Object.entries(grouped)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [movements]);

  const movementTypes = useMemo(() => {
    let checkIn = 0;
    let checkOut = 0;

    movements.forEach((m: any) => {
      if (m.type === 'check-in') checkIn += m.quantity;
      if (m.type === 'check-out') checkOut += m.quantity;
    });

    return [
      { name: 'Entradas', value: checkIn },
      { name: 'Saídas', value: checkOut },
    ];
  }, [movements]);

  const pieColors = ['#16a34a', '#1E3A8A'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Movimentações por dia</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Check-in vs Check-out</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={movementTypes}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {movementTypes.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Itens mais movimentados</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itemsRanking} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={180} />
              <Tooltip />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}