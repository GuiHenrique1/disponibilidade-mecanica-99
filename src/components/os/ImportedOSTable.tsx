import React from 'react';
import { OrdemServico } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ImportedOSTableProps {
  ordensServico: OrdemServico[];
}

export const ImportedOSTable: React.FC<ImportedOSTableProps> = ({ ordensServico }) => {
  // Filtrar apenas as OS abertas
  const osAbertas = ordensServico.filter(os => os.status === 'Aberta');

  const getStatusBadge = (status: OrdemServico['status']) => {
    const variants = {
      'Aberta': 'destructive',
      'Concluída': 'default',
      'Cancelada': 'secondary'
    } as const;

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  const getTipoVeiculoBadge = (tipo: 'frota' | 'composicao') => {
    return (
      <Badge variant={tipo === 'frota' ? 'outline' : 'secondary'}>
        {tipo === 'frota' ? 'Frota' : 'Composição'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Ordens de Serviço Abertas Importadas ({osAbertas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {osAbertas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma ordem de serviço aberta encontrada nos dados importados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Data Abertura</TableHead>
                  <TableHead>Hora Abertura</TableHead>
                  <TableHead>Tipo Manutenção</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osAbertas.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell className="font-mono text-xs">
                      {os.id.split('-')[0]}...
                    </TableCell>
                    <TableCell>
                      {getTipoVeiculoBadge(os.tipoVeiculo)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {os.placaReferente}
                    </TableCell>
                    <TableCell>{os.dataAbertura}</TableCell>
                    <TableCell>{os.horaAbertura}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {os.tipoManutencao}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={os.descricaoServico}>
                      {os.descricaoServico}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(os.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};