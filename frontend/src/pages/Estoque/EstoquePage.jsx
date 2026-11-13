import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { listarEstoque } from '../../api/estoque';
import EntradaDialog from './EntradaDialog';
import { filtrarEstoque } from './validarEntrada';
export default function EstoquePage() {
  const [produtos, setProdutos] = useState([]),
    [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(''),
    [busca, setBusca] = useState(''),
    [somenteBaixos, setSomenteBaixos] = useState(false);
  const [dialogo, setDialogo] = useState(null),
    [aviso, setAviso] = useState('');
  const buscar = useCallback(
    () =>
      listarEstoque()
        .then(setProdutos)
        .catch((e) => setErro(e.message))
        .finally(() => setCarregando(false)),
    []
  );
  useEffect(() => {
    buscar();
  }, [buscar]);
  function carregar() {
    setCarregando(true);
    setErro('');
    return buscar();
  }
  const visiveis = useMemo(
    () => filtrarEstoque(produtos, busca, somenteBaixos),
    [produtos, busca, somenteBaixos]
  );
  const baixos = produtos.filter((p) => p.alertaEstoqueBaixo).length;
  async function aoSalvar(entrada) {
    setDialogo(null);
    setAviso('Entrada registrada. Novo saldo: ' + entrada.saldo + ' unidade(s).');
    await carregar();
  }
  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5">Estoque</Typography>
          <Typography variant="body2" color="text.secondary">
            Saldo e reposição de mercadorias
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={carregando || Boolean(erro) || produtos.length === 0}
          onClick={() => setDialogo({ produto: null })}
        >
          Registrar entrada
        </Button>
      </Stack>
      {!carregando && !erro && baixos > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {baixos} produto(s) com saldo igual ou abaixo do estoque mínimo.
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por nome ou código"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <FormControlLabel
          sx={{ minWidth: 200 }}
          control={
            <Switch checked={somenteBaixos} onChange={(e) => setSomenteBaixos(e.target.checked)} />
          }
          label="Somente estoque baixo"
        />
      </Stack>
      {carregando ? (
        <CircularProgress aria-label="Carregando estoque" />
      ) : erro ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={carregar}>
              Tentar novamente
            </Button>
          }
        >
          {erro}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>Código de barras</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="right">Mínimo</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell align="right">Reposição</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                visiveis.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>{p.codigoBarras}</TableCell>
                    <TableCell align="right">{p.saldo}</TableCell>
                    <TableCell align="right">{p.estoqueMinimo}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={p.alertaEstoqueBaixo ? 'warning' : 'success'}
                        label={p.alertaEstoqueBaixo ? 'Estoque baixo' : 'Regular'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => setDialogo({ produto: p })}
                        aria-label={'Registrar entrada de ' + p.nome}
                      >
                        Registrar entrada
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {dialogo && (
        <EntradaDialog
          produtos={produtos}
          produtoInicial={dialogo.produto}
          aoFechar={() => setDialogo(null)}
          aoSalvar={aoSalvar}
        />
      )}
      <Snackbar open={Boolean(aviso)} autoHideDuration={5000} onClose={() => setAviso('')}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')}>
          {aviso}
        </Alert>
      </Snackbar>
    </>
  );
}
