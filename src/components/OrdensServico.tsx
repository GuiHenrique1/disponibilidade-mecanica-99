import React, { useState } from 'react';
import { OrdemServico, CavaloMecanico, Composicao } from '@/types';
import { useAppData } from '@/hooks/useAppData';
import { useOSForm } from '@/hooks/useOSForm';
import { OSDialog } from './os/OSDialog';
import { OSList } from './os/OSList';
import { FileUpload } from './os/FileUpload';
import { ImportedOSTable } from './os/ImportedOSTable';
import { ImportedOSChart } from './os/ImportedOSChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calcularDisponibilidade } from '@/utils/disponibilidadeCalculator';

export const OrdensServico: React.FC = () => {
  const { 
    ordensServico, 
    cavalos, 
    composicoes, 
    motoristas,
    addOrdemServico, 
    updateOrdemServico, 
    deleteOrdemServico,
    refreshData 
  } = useAppData();

  // Estado para dados importados
  const [importedOS, setImportedOS] = useState<OrdemServico[]>([]);
  const [totalFrotaImportada, setTotalFrotaImportada] = useState<number>(100);

  // Log para debug
  console.log('OrdensServico - Dados carregados:', {
    ordensServico: ordensServico.length,
    cavalos: cavalos.length,
    composicoes: composicoes.length,
    motoristas: motoristas.length
  });

  const {
    isDialogOpen,
    setIsDialogOpen,
    editingOS,
    setEditingOS,
    formData,
    setFormData,
    validationError,
    resetForm,
    handleTipoVeiculoChange,
    handleVeiculoChange,
    handleComposicaoChange,
    handleFinalize,
    handleEdit,
    handleSubmit,
    handleDelete
  } = useOSForm(ordensServico, (updatedOS: OrdemServico[]) => {
    // Esta função não é mais necessária pois o context gerencia o estado
    // Mantemos para compatibilidade com o hook existente
  }, cavalos, composicoes, motoristas);

  // Função vazia para compatibilidade - o sistema está sempre atualizado
  const handleRefresh = async () => {
    // Sistema sempre atualizado - não necessário botão de refresh
  };

  // Processar dados importados quando recebidos
  const handleDataProcessed = (data: OrdemServico[]) => {
    setImportedOS(data);
    // Assumir que o total da frota é igual ao número de equipamentos únicos importados
    const equipamentosUnicos = [...new Set(data.map(os => os.placaReferente))];
    setTotalFrotaImportada(equipamentosUnicos.length);
  };

  // Calcular disponibilidade dos dados importados
  const dadosDisponibilidadeImportados = React.useMemo(() => {
    if (importedOS.length === 0) return null;
    
    // Usar data atual para análise (19-08-2025 como solicitado)
    const dataAnalise = '19-08-2025';
    
    // Determinar tipo de veículo predominante nos dados importados
    const tiposVeiculo = importedOS.map(os => os.tipoVeiculo);
    const tipoVeiculoPredominante = tiposVeiculo.filter(tipo => tipo === 'frota').length >= 
                                    tiposVeiculo.filter(tipo => tipo === 'composicao').length ? 'frota' : 'composicao';
    
    return calcularDisponibilidade(
      totalFrotaImportada,
      importedOS,
      dataAnalise,
      tipoVeiculoPredominante
    );
  }, [importedOS, totalFrotaImportada]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
        
        <OSDialog
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          editingOS={editingOS}
          formData={formData}
          setFormData={setFormData}
          cavalos={cavalos}
          composicoes={composicoes}
          motoristas={motoristas}
          validationError={validationError}
          onSubmit={handleSubmit}
          onTipoVeiculoChange={handleTipoVeiculoChange}
          onVeiculoChange={handleVeiculoChange}
          onComposicaoChange={handleComposicaoChange}
          onResetForm={resetForm}
          onSetEditingOS={setEditingOS}
        />
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">OS Manuais</TabsTrigger>
          <TabsTrigger value="imported">Importar Planilha</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <OSList
            ordensServico={ordensServico}
            cavalos={cavalos}
            composicoes={composicoes}
            motoristas={motoristas}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFinalize={handleFinalize}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="imported" className="space-y-6">
          {/* Upload de arquivo */}
          <FileUpload onDataProcessed={handleDataProcessed} />
          
          {/* Exibir resultados se houver dados importados */}
          {importedOS.length > 0 && (
            <>
              {/* Tabela de OS abertas */}
              <ImportedOSTable ordensServico={importedOS} />
              
              {/* Gráfico de disponibilidade */}
              {dadosDisponibilidadeImportados && (
                <ImportedOSChart
                  dados={dadosDisponibilidadeImportados}
                  totalFrota={totalFrotaImportada}
                  metaDisponibilidade={90}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
