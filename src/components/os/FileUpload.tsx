import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrdemServico } from '@/types';
import { processFileData } from '@/utils/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onDataProcessed: (ordensServico: OrdemServico[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataProcessed }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalFrota, setTotalFrota] = useState<number>(100);
  const [tipoVeiculo, setTipoVeiculo] = useState<'frota' | 'composicao'>('frota');
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformatdocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      setError('Formato de arquivo inválido. Use apenas arquivos CSV ou XLSX.');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const ordensServico = await processFileData(file, totalFrota, tipoVeiculo);
      onDataProcessed(ordensServico);
      
      toast({
        title: "Arquivo processado com sucesso!",
        description: `${ordensServico.length} ordens de serviço foram importadas.`,
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar arquivo';
      setError(errorMessage);
      toast({
        title: "Erro ao processar arquivo",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Planilha de Ordens de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalFrota">Total da Frota</Label>
            <Input
              id="totalFrota"
              type="number"
              min="1"
              value={totalFrota}
              onChange={(e) => setTotalFrota(Number(e.target.value))}
              placeholder="Ex: 100"
            />
          </div>
          
          <div>
            <Label htmlFor="tipoVeiculo">Tipo de Veículo</Label>
            <Select value={tipoVeiculo} onValueChange={(value: 'frota' | 'composicao') => setTipoVeiculo(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frota">Frota (Cavalos Mecânicos)</SelectItem>
                <SelectItem value="composicao">Composição</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Arraste e solte um arquivo CSV ou XLSX aqui, ou clique para selecionar
          </p>
          <Button 
            onClick={handleUploadClick} 
            disabled={isProcessing}
            variant="outline"
          >
            {isProcessing ? 'Processando...' : 'Selecionar Arquivo'}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="mb-1"><strong>Colunas necessárias na planilha:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Implemento:</strong> "Composição" para tipo composição</li>
            <li><strong>Classe Mecânica:</strong> "cavalo mecanico" ou "frota" para tipo frota</li>
            <li><strong>Equipamento:</strong> Placa do veículo</li>
            <li><strong>data@entrada:</strong> Data/hora de abertura</li>
            <li><strong>data@saida:</strong> Data/hora de fechamento (opcional)</li>
            <li><strong>Seção trab.:</strong> Tipo de manutenção</li>
            <li><strong>Prognostico:</strong> Descrição do serviço</li>
            <li><strong>Solicitante:</strong> Nome do motorista (opcional)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};