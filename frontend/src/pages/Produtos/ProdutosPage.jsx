import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { listarProdutos, removerProduto } from '../../api/produtos';
import ConfirmarDialog from '../../components/ConfirmarDialog';
import ProdutoFormDialog from './ProdutoFormDialog';

const formatarPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format;

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// US03: busca por nome (parcial, sem diferenciar acentos e maiúsculas) ou por código de barras.
function filtrar(produtos, busca) {
  const termo = normalizar(busca.trim());
  if (!termo) return produtos;
  return produtos.filter(
    (p) => normalizar(p.nome).includes(termo) || p.codigoBarras.includes(termo)
  );
}

export default function ProdutosPage() {
  const { ehGerente } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [busca, setBusca] = useState('');
  // formulario: null (fechado) | { produto: null } (novo) | { produto } (edição)
  const [formulario, setFormulario] = useState(null);
  const [aRemover, setARemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  const buscarProdutos = useCallback(
    () =>
      listarProdutos()
        .then(setProdutos)
        .catch((e) => setErroCarga(e.message))
        .finally(() => setCarregando(false)),
    []
  );

  useEffect(() => {
    buscarProdutos();
  }, [buscarProdutos]);

  function carregar() {
    setCarregando(true);
    setErroCarga('');
    buscarProdutos();
  }

  const visiveis = useMemo(() => filtrar(produtos, busca), [produtos, busca]);
  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [produtos]
  );

  function aoSalvar(salvo, editado) {
    setProdutos((atual) =>
      (editado ? atual.map((p) => (p.id === salvo.id ? salvo : p)) : [...atual, salvo]).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      )
    );
    setFormulario(null);
    setAviso({ tipo: 'success', texto: editado ? 'Produto atualizado.' : 'Produto cadastrado.' });
  }

  async function confirmarRemocao() {
    setRemovendo(true);
    try {
      await removerProduto(aRemover.id);
      setProdutos((atual) => atual.filter((p) => p.id !== aRemover.id));
      setAviso({ tipo: 'success', texto: 'Produto removido.' });
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message });
    } finally {
      setRemovendo(false);
      setARemover(null);
    }
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5">Produtos</Typography>
          <Typography variant="body2" color="text.secondary">
            {carregando ? 'Carregando...' : `${produtos.length} produto(s) cadastrado(s)`}
          </Typography>
        </Box>
        {ehGerente && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormulario({ produto: null })}>
            Novo produto
          </Button>
        )}
      </Stack>

      <TextField
        placeholder="Buscar por nome ou código de barras"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {erroCarga ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={carregar}>
              Tentar de novo
            </Button>
          }
        >
          {erroCarga}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Código de barras</TableCell>
                <TableCell align="right">Preço</TableCell>
                <TableCell align="right">Estoque mín.</TableCell>
                {ehGerente && <TableCell align="right">Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando &&
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={ehGerente ? 6 : 5}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))}

              {!carregando && visiveis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ehGerente ? 6 : 5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {busca ? 'Nenhum produto encontrado para esta busca.' : 'Nenhum produto cadastrado ainda.'}
                  </TableCell>
                </TableRow>
              )}

              {!carregando &&
                visiveis.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.nome}</TableCell>
                    <TableCell>
                      <Chip label={p.categoria} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{p.codigoBarras}</TableCell>
                    <TableCell align="right">{formatarPreco(p.preco)}</TableCell>
                    <TableCell align="right">{p.estoqueMinimo}</TableCell>
                    {ehGerente && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => setFormulario({ produto: p })} aria-label={`Editar ${p.nome}`}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton size="small" color="error" onClick={() => setARemover(p)} aria-label={`Remover ${p.nome}`}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {formulario && (
        <ProdutoFormDialog
          key={formulario.produto?.id ?? 'novo'}
          produto={formulario.produto}
          categorias={categorias}
          aoFechar={() => setFormulario(null)}
          aoSalvar={aoSalvar}
        />
      )}

      <ConfirmarDialog
        aberto={Boolean(aRemover)}
        titulo="Remover produto"
        mensagem={aRemover ? `Remover "${aRemover.nome}"? Ele deixará de aparecer na lista.` : ''}
        rotuloConfirmar="Remover"
        processando={removendo}
        aoConfirmar={confirmarRemocao}
        aoCancelar={() => setARemover(null)}
      />

      <Snackbar
        open={Boolean(aviso)}
        autoHideDuration={4000}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {aviso ? (
          <Alert severity={aviso.tipo} variant="filled" onClose={() => setAviso(null)}>
            {aviso.texto}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
