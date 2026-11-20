import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout';
import { listarProdutosVenda, registrarVenda } from '../../api/vendas';
import { listarClientes } from '../../api/clientes';
import {
  FORMAS_PAGAMENTO,
  adicionarAoCarrinho,
  alterarQuantidade,
  filtrarProdutosVenda,
  formatarMoeda,
  montarVenda,
  produtoPorCodigo,
  removerDoCarrinho,
  totaisDoCarrinho,
  validarVenda,
} from './carrinho';

const ROTULO_PAGAMENTO = Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f.valor, f.rotulo]));

function mensagemDoErro(e) {
  const detalhes = Object.values(e.detalhes || {});
  return detalhes.length > 0 ? `${e.message} ${detalhes.join(' ')}` : e.message;
}

export default function VendasPage() {
  const [produtos, setProdutos] = useState([]),
    [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true),
    [erroCarga, setErroCarga] = useState('');
  const [carrinho, setCarrinho] = useState([]),
    [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState(null),
    [formaPagamento, setFormaPagamento] = useState('');
  const [enviando, setEnviando] = useState(false),
    [erro, setErro] = useState(''),
    [aviso, setAviso] = useState('');
  const [ultimaVenda, setUltimaVenda] = useState(null);
  const campoBusca = useRef(null);

  const carregarProdutos = useCallback(
    () =>
      listarProdutosVenda()
        .then((lista) => {
          setProdutos(lista);
          setErroCarga('');
        })
        .catch((e) => setErroCarga(e.message))
        .finally(() => setCarregando(false)),
    []
  );

  useEffect(() => {
    carregarProdutos();
    // A lista de clientes é opcional no PDV: se falhar, a venda segue sem cliente.
    listarClientes()
      .then(setClientes)
      .catch(() => setClientes([]));
  }, [carregarProdutos]);

  const totais = useMemo(() => totaisDoCarrinho(carrinho), [carrinho]);

  function aplicar({ carrinho: novo, erro: problema }) {
    setCarrinho(novo);
    setErro(problema);
  }

  function adicionar(produto) {
    aplicar(adicionarAoCarrinho(carrinho, produto));
    setBusca('');
    setUltimaVenda(null);
  }

  function aoTeclarBusca(evento) {
    // Leitor de código de barras: digita o código e envia Enter.
    if (evento.key !== 'Enter') return;
    const produto = produtoPorCodigo(produtos, busca);
    if (produto) {
      evento.defaultMuiPrevented = true;
      evento.preventDefault();
      adicionar(produto);
    }
  }

  function limpar() {
    setCarrinho([]);
    setCliente(null);
    setFormaPagamento('');
    setErro('');
    setBusca('');
    campoBusca.current?.focus();
  }

  async function finalizar() {
    if (enviando) return;
    const problema = validarVenda(carrinho, formaPagamento);
    if (problema) {
      setErro(problema);
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const venda = await registrarVenda(montarVenda(carrinho, formaPagamento, cliente?.id));
      setUltimaVenda(venda);
      setAviso(
        `Venda concluída: ${formatarMoeda(venda.valorTotal)} em ${ROTULO_PAGAMENTO[venda.formaPagamento]}.`
      );
      limpar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
      // Atualiza os saldos (após a baixa, ou porque outra venda mudou o estoque).
      carregarProdutos();
    }
  }

  // Atalho F2 para finalizar a venda sem tirar a mão do teclado.
  const finalizarRef = useRef(finalizar);
  useEffect(() => {
    finalizarRef.current = finalizar;
  });
  useEffect(() => {
    function aoTeclar(evento) {
      if (evento.key === 'F2') {
        evento.preventDefault();
        finalizarRef.current();
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  if (carregando) return <CircularProgress aria-label="Carregando produtos" />;
  if (erroCarga) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => carregarProdutos()}>
            Tentar novamente
          </Button>
        }
      >
        {erroCarga}
      </Alert>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Vendas (PDV)</Typography>
        <Typography variant="body2" color="text.secondary">
          Busque o produto ou leia o código de barras, escolha o pagamento e finalize com F2
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Autocomplete
            options={produtos}
            value={null}
            inputValue={busca}
            onInputChange={(e, valor, motivo) => motivo !== 'reset' && setBusca(valor)}
            onChange={(e, produto) => produto && adicionar(produto)}
            filterOptions={(opcoes, { inputValue }) =>
              filtrarProdutosVenda(opcoes, inputValue).slice(0, 30)
            }
            getOptionLabel={(p) => p.nome}
            getOptionDisabled={(p) => p.saldo === 0}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            autoHighlight
            noOptionsText="Nenhum produto encontrado"
            renderOption={({ key, ...props }, p) => (
              <Box component="li" key={key} {...props}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">{p.nome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.codigoBarras} · {p.saldo === 0 ? 'sem estoque' : `${p.saldo} em estoque`}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatarMoeda(p.preco)}
                </Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={campoBusca}
                autoFocus
                label="Buscar produto por nome ou código de barras"
                onKeyDown={aoTeclarBusca}
              />
            )}
          />

          {erro && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErro('')}>
              {erro}
            </Alert>
          )}

          {ultimaVenda?.alertasEstoque?.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setUltimaVenda(null)}>
              Estoque mínimo atingido após a venda:{' '}
              {ultimaVenda.alertasEstoque
                .map((a) => `${a.nome} (saldo ${a.saldo}, mínimo ${a.estoqueMinimo})`)
                .join('; ')}
              .
            </Alert>
          )}

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="right">Preço</TableCell>
                  <TableCell align="center">Quantidade</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {totais.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      Nenhum produto na venda.
                    </TableCell>
                  </TableRow>
                ) : (
                  totais.itens.map((item) => (
                    <TableRow key={item.produtoId} hover>
                      <TableCell>
                        <Typography variant="body2">{item.nome}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.codigoBarras} · {item.saldo} disponível(is)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatarMoeda(item.preco)}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            aria-label={'Diminuir ' + item.nome}
                            disabled={item.quantidade <= 1}
                            onClick={() =>
                              aplicar(alterarQuantidade(carrinho, item.produtoId, item.quantidade - 1))
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            size="small"
                            value={item.quantidade}
                            onChange={(e) =>
                              e.target.value !== '' &&
                              aplicar(alterarQuantidade(carrinho, item.produtoId, e.target.value))
                            }
                            onFocus={(e) => e.target.select()}
                            slotProps={{
                              htmlInput: {
                                inputMode: 'numeric',
                                'aria-label': 'Quantidade de ' + item.nome,
                                style: { textAlign: 'center' },
                              },
                            }}
                            sx={{ width: 72 }}
                          />
                          <IconButton
                            size="small"
                            aria-label={'Aumentar ' + item.nome}
                            disabled={item.quantidade >= item.saldo}
                            onClick={() =>
                              aplicar(alterarQuantidade(carrinho, item.produtoId, item.quantidade + 1))
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{formatarMoeda(item.subtotal)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remover">
                          <IconButton
                            size="small"
                            aria-label={'Remover ' + item.nome}
                            onClick={() => setCarrinho(removerDoCarrinho(carrinho, item.produtoId))}
                          >
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Paper variant="outlined" sx={{ p: 2.5, width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <Stack spacing={2.5}>
            <Autocomplete
              options={clientes}
              value={cliente}
              onChange={(e, valor) => setCliente(valor)}
              getOptionLabel={(c) => c.nome}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText="Nenhum cliente encontrado"
              renderInput={(params) => <TextField {...params} label="Cliente (opcional)" />}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Forma de pagamento
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                value={formaPagamento}
                onChange={(e, valor) => valor && setFormaPagamento(valor)}
                aria-label="Forma de pagamento"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <ToggleButton key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography color="text.secondary">
                {totais.quantidadeItens} item(ns)
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }} aria-live="polite">
                  {formatarMoeda(totais.valorTotal)}
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : <ShoppingCartCheckout />}
              disabled={enviando || carrinho.length === 0 || !formaPagamento}
              onClick={finalizar}
            >
              Finalizar venda (F2)
            </Button>
            <Button color="inherit" disabled={enviando || carrinho.length === 0} onClick={limpar}>
              Cancelar venda
            </Button>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar open={Boolean(aviso)} autoHideDuration={5000} onClose={() => setAviso('')}>
        <Alert severity="success" variant="filled" onClose={() => setAviso('')}>
          {aviso}
        </Alert>
      </Snackbar>
    </>
  );
}
