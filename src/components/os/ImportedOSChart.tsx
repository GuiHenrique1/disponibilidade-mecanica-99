import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, LabelList
} from 'recharts';
import { DadosDisponibilidade } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ImportedOSChartProps {
  dados: DadosDisponibilidade;
  totalFrota: number;
  metaDisponibilidade?: number;
}

// Custom Label para valores acima das barras
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === null || value === undefined) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="#374151"
      textAnchor="middle"
      fontSize="13"
      fontWeight="bold"
      style={{ pointerEvents: 'none' }}
    >
      {value}
    </text>
  );
};

export const ImportedOSChart: React.FC<ImportedOSChartProps> = ({
  dados,
  totalFrota,
  metaDisponibilidade = 90,
}) => {
  const isMobile = useIsMobile();

  const metaValue = Math.round((metaDisponibilidade / 100) * totalFrota);

  const barData = Array.from({ length: 24 }, (_, index) => {
    const horaData = dados.disponibilidadePorHora.find(h => h.hora === index);
    const totalDisponiveis = horaData?.totalDisponiveis || 0;
    const totalParados = horaData?.totalIndisponiveis || 0;
    
    return {
      hora: `${index}h`,
      horaNumero: index,
      disponiveis: totalDisponiveis,
      parados: totalParados,
      meta: metaValue,
      acimaMeta: horaData?.totalDisponiveis !== null ? (horaData.totalDisponiveis >= metaValue) : false,
      isHoraFutura: horaData?.isHoraFutura || false,
      temDados: horaData?.totalDisponiveis !== null
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Se for hora futura ou sem dados, mostrar tooltip diferente
      if (data.isHoraFutura || !data.temDados) {
        return (
          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium">{`${label}`}</p>
            <p className="text-sm text-muted-foreground">
              Horário ainda não alcançado
            </p>
          </div>
        );
      }

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{`${label}`}</p>
          <p className="text-sm text-green-600">
            {`Disponíveis: ${data.disponiveis} veículos`}
          </p>
          <p className="text-sm text-red-600">
            {`Parados: ${data.parados} veículos`}
          </p>
          <p className="text-sm text-gray-600">
            {`Meta: ${metaValue} veículos (${metaDisponibilidade}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          Disponibilidade Mecânica por Hora - Dados Importados
        </CardTitle>
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Acima da Meta ({metaDisponibilidade}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Abaixo da Meta</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
            <span>Horas Futuras</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={isMobile ? 400 : 500}>
          <BarChart
            data={barData}
            margin={{ 
              top: isMobile ? 40 : 50, 
              right: isMobile ? 15 : 30, 
              left: isMobile ? 5 : 20, 
              bottom: isMobile ? 90 : 5 
            }}
            barCategoryGap="10%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="hora"
              fontSize={isMobile ? 10 : 12}
              interval={0}
              angle={isMobile ? -90 : -45}
              textAnchor="end"
              height={isMobile ? 90 : 60}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              fontSize={isMobile ? 10 : 12}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              label={{ 
                value: 'Veículos Disponíveis', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="disponiveis" 
              radius={[4, 4, 0, 0]}
              maxBarSize={isMobile ? 25 : 45}
            >
              <LabelList dataKey="disponiveis" content={CustomLabel} />
              {barData.map((entry, index) => {
                // Colorir conforme especificado: verde se acima da meta, vermelho se abaixo, cinza para futuras
                if (entry.isHoraFutura || !entry.temDados) {
                  return <Cell key={`cell-${index}`} fill="#e5e7eb" opacity={0.4} />;
                }
                return (
                  <Cell key={`cell-${index}`} fill={entry.acimaMeta ? '#10b981' : '#ef4444'} />
                );
              })}
            </Bar>
            <ReferenceLine
              y={metaValue}
              stroke="#ef4444"
              strokeWidth={isMobile ? 2 : 3}
              strokeDasharray="5,5"
              label={{
                value: `Meta: ${metaValue} (${metaDisponibilidade}%)`,
                position: isMobile ? "top" : "right",
                fill: "#ef4444",
                fontSize: isMobile ? 10 : 12,
                fontWeight: "bold",
                offset: isMobile ? 5 : 10
              }}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Estatísticas resumidas */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalFrota}</div>
            <div className="text-sm text-muted-foreground">Total Frota</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dados.mediaDisponibilidade.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Disponibilidade Média</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dados.mediaVeiculosDisponiveis.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Veículos Disponíveis (Média)</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              dados.mediaDisponibilidade >= metaDisponibilidade ? 'text-green-600' : 'text-red-600'
            }`}>
              {dados.mediaDisponibilidade >= metaDisponibilidade ? 'ATINGIDA' : 'NÃO ATINGIDA'}
            </div>
            <div className="text-sm text-muted-foreground">Status da Meta</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Importar Cell do recharts
import { Cell } from 'recharts';