import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { OrdemServico } from '@/types';

// Mapeamento de tipos de manutenção
const tipoManutencaoMap: Record<string, OrdemServico['tipoManutencao']> = {
  'borracharia': 'Pneu',
  'componentes': 'Corretiva',
  'eletrica': 'Elétrica',
  'itr': 'ITR',
  'lavador': 'Outros',
  'mecanica': 'Corretiva',
  'oficina externa': 'MANUTENÇÃO EXTERNA',
  'oficina volante': 'SOS',
  'preventiva': 'Preventiva',
};

interface RawData {
  'Implemento'?: string;
  'Classe Mecânica'?: string;
  'Equipamento'?: string;
  'data@entrada'?: string;
  'data@saida'?: string;
  'Seção trab.'?: string;
  'Prognostico'?: string;
  'Solicitante'?: string;
}

function parseDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) return { date: '', time: '' };

  // Tentar diferentes formatos de data/hora
  const cleanStr = dateTimeStr.trim();
  
  // Formato: DD/MM/AAAA HH:MM ou DD-MM-AAAA HH:MM
  const dateTimeRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/;
  const dateTimeMatch = cleanStr.match(dateTimeRegex);
  
  if (dateTimeMatch) {
    const [, day, month, year, hour, minute] = dateTimeMatch;
    return {
      date: `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`,
      time: `${hour.padStart(2, '0')}:${minute}`
    };
  }

  // Formato apenas data: DD/MM/AAAA ou DD-MM-AAAA
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
  const dateMatch = cleanStr.match(dateRegex);
  
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return {
      date: `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`,
      time: '00:00'
    };
  }

  // Se não conseguiu fazer parse, retornar data atual
  const now = new Date();
  return {
    date: `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`,
    time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  };
}

function mapTipoManutencao(secaoTrabalho: string): OrdemServico['tipoManutencao'] {
  if (!secaoTrabalho) return 'Outros';
  
  const normalized = secaoTrabalho.toLowerCase().trim();
  return tipoManutencaoMap[normalized] || 'Outros';
}

function determineTipoVeiculo(implemento: string, classeMecanica: string, defaultTipo: 'frota' | 'composicao'): 'frota' | 'composicao' {
  if (implemento && implemento.toLowerCase().includes('composic')) {
    return 'composicao';
  }
  
  if (classeMecanica && (
    classeMecanica.toLowerCase().includes('cavalo') || 
    classeMecanica.toLowerCase().includes('frota')
  )) {
    return 'frota';
  }
  
  return defaultTipo;
}

function processRawData(rawData: RawData[], defaultTipoVeiculo: 'frota' | 'composicao'): OrdemServico[] {
  return rawData
    .filter(row => row['Equipamento']) // Filtrar linhas sem equipamento
    .map(row => {
      const dataEntrada = parseDateTime(row['data@entrada'] || '');
      const dataSaida = parseDateTime(row['data@saida'] || '');
      
      const tipoVeiculo = determineTipoVeiculo(
        row['Implemento'] || '',
        row['Classe Mecânica'] || '',
        defaultTipoVeiculo
      );

      const hasDataSaida = dataSaida.date && dataSaida.date !== dataEntrada.date;
      
      const ordemServico: OrdemServico = {
        id: generateUUID(),
        tipoVeiculo,
        veiculoId: generateUUID(), // Gerar ID fictício para o veículo
        placaReferente: row['Equipamento'] || '',
        motoristaId: row['Solicitante'] || undefined,
        dataAbertura: dataEntrada.date,
        horaAbertura: dataEntrada.time,
        dataFechamento: hasDataSaida ? dataSaida.date : undefined,
        horaFechamento: hasDataSaida ? dataSaida.time : undefined,
        tipoManutencao: mapTipoManutencao(row['Seção trab.'] || ''),
        descricaoServico: row['Prognostico'] || 'Sem descrição',
        status: hasDataSaida ? 'Concluída' : 'Aberta',
        createdAt: new Date(),
      };

      return ordemServico;
    });
}

export async function processFileData(
  file: File,
  totalFrota: number,
  tipoVeiculo: 'frota' | 'composicao'
): Promise<OrdemServico[]> {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      // Processar CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              console.warn('Avisos ao processar CSV:', results.errors);
            }
            
            const ordensServico = processRawData(results.data as RawData[], tipoVeiculo);
            resolve(ordensServico);
          } catch (error) {
            reject(new Error(`Erro ao processar dados CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
          }
        },
        error: (error) => {
          reject(new Error(`Erro ao ler arquivo CSV: ${error.message}`));
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Processar Excel
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Usar a primeira planilha
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Converter para JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          
          if (jsonData.length < 2) {
            reject(new Error('A planilha deve conter pelo menos um cabeçalho e uma linha de dados.'));
            return;
          }
          
          // Primeira linha como cabeçalho
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);
          
          // Converter para formato de objeto
          const rawData: RawData[] = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          
          const ordensServico = processRawData(rawData, tipoVeiculo);
          resolve(ordensServico);
        } catch (error) {
          reject(new Error(`Erro ao processar arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo Excel.'));
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Formato de arquivo não suportado. Use apenas CSV ou XLSX.'));
    }
  });
}

// Adicionar dependência uuid se não estiver disponível
declare global {
  interface Window {
    crypto: Crypto;
  }
}

// Implementação simples de UUID v4 caso a biblioteca não esteja disponível
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para gerar UUID será usada diretamente como generateUUID