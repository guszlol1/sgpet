import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { buscarRelatorioVendas } from '../../api/relatorios';
import { formatarMoeda } from '../Vendas/carrinho';
import {
  ROTULO_PAGAMENTO,
  descreverItens,
  formatarDataHora,
  periodoPadrao,
  validarPeriodo,
} from './periodo';

function CardResumo({ titulo, valor, detalhe }) {
  return (
    <Card variant="outlined" sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {titulo}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5 }}>
          {valor}
        </Typography>
        {detalhe && (
          <Typography variant="caption" color="text.secondary">
            {detalhe}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const formatarDia = (iso) => iso.split('-').reverse().join('/');

export default function RelatoriosPage() {
  const [filtro, setFiltro] = useState(periodoPadrao),
    [errosFiltro, setErrosFiltro] = useState({});
  const [relatorio, setRelatorio] = useState(null),
    [carregando, setCarregando] = useState(true),
    [erro, setErro] = useState('');

  const buscar = useCallback(
    (periodo) =>
      buscarRelatorioVendas(periodo.dataInicio, periodo.dataFim)
        .then((dados) => {
          setRelatorio(dados);
          setErro('');
        })
        .catch((e) => {
          setErro(e.message);
          setErrosFiltro(e.detalhes || {});
        })
        .finally(() => setCarregando(false)),
    []
  );

  useEffect(() => {
    buscar(periodoPadrao());
  }, [buscar]);

  function consultar(periodo) {
    setCarregando(true);
    setErro('');
    return buscar(periodo);
  }

  function aoBuscar(evento) {
    evento.preventDefault();
    const { valido, erros } = validarPeriodo(filtro);
    setErrosFiltro(erros);
    if (valido) consultar(filtro);
  }

  const alterar = (campo) => (e) => setFiltro({ ...filtro, [campo]: e.target.value });

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Relatório de vendas</Typography>
        <Typography variant="body2" color="text.secondary">
          Vendas do período, com quantidade e valor total
        </Typography>
      </Box>

      <Stack
        component="form"
        onSubmit={aoBuscar}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'flex-start' } }}
      >
        <TextField
          type="date"
          label="Data inicial"
          value={filtro.dataInicio}
          onChange={alterar('dataInicio')}
          error={Boolean(errosFiltro.dataInicio)}
          helperText={errosFiltro.dataInicio}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: { sm: 220 } }}
        />
        <TextField
          type="date"
          label="Data final"
          value={filtro.dataFim}
          onChange={alterar('dataFim')}
          error={Boolean(errosFiltro.dataFim)}
          helperText={errosFiltro.dataFim}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: { sm: 220 } }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<SearchIcon />}
          disabled={carregando}
          sx={{ height: 56 }}
        >
          Consultar
        </Button>
      </Stack>

      {carregando ? (
        <CircularProgress aria-label="Carregando relatório" />
      ) : erro ? (
        <Alert severity="error">{erro}</Alert>
      ) : (
        relatorio && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <CardResumo
                titulo="Quantidade de vendas"
                valor={relatorio.quantidadeVendas}
                detalhe={`${relatorio.quantidadeItens} item(ns) vendido(s)`}
              />
              <CardResumo
                titulo="Valor total do período"
                valor={formatarMoeda(relatorio.valorTotal)}
                detalhe={`${formatarDia(relatorio.periodo.dataInicio)} a ${formatarDia(relatorio.periodo.dataFim)}`}
              />
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Data/hora</TableCell>
                    <TableCell>Pagamento</TableCell>
                    <TableCell>Itens</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Atendente</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      Valor total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relatorio.vendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        Nenhuma venda no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    relatorio.vendas.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatarDataHora(v.dataHora)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={ROTULO_PAGAMENTO[v.formaPagamento]} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{v.quantidadeItens} item(ns)</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {descreverItens(v.itens)}
                          </Typography>
                        </TableCell>
                        <TableCell>{v.clienteNome || '—'}</TableCell>
                        <TableCell>{v.atendenteNome}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatarMoeda(v.valorTotal)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      )}
    </>
  );
}
