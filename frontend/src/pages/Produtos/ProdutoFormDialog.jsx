import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  TextField,
} from '@mui/material';
import { atualizarProduto, criarProduto } from '../../api/produtos';
import { paraFormulario, produtoVazio, validarProduto } from './validarProduto';

// Formulário de inclusão (produto = null) ou edição de produto.
// O componente é montado de novo a cada abertura (prop key), o que limpa o estado.
export default function ProdutoFormDialog({ produto, categorias, aoFechar, aoSalvar }) {
  const editando = Boolean(produto);
  const [form, setForm] = useState(() => (editando ? paraFormulario(produto) : produtoVazio));
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (evento) => {
    setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  async function salvar(evento) {
    evento.preventDefault();
    const { valido, erros: errosValidacao, dados } = validarProduto(form);
    setErros(errosValidacao);
    setErroGeral('');
    if (!valido) return;

    setSalvando(true);
    try {
      const salvo = editando ? await atualizarProduto(produto.id, dados) : await criarProduto(dados);
      aoSalvar(salvo, editando);
    } catch (e) {
      setErros(e.detalhes);
      setErroGeral(e.message);
      setSalvando(false);
    }
  }

  const campo = (nome, rotulo, extras = {}) => ({
    label: rotulo,
    value: form[nome],
    onChange: alterar(nome),
    error: Boolean(erros[nome]),
    helperText: erros[nome] || extras.ajuda || ' ',
    disabled: salvando,
  });

  return (
    <Dialog open onClose={salvando ? undefined : aoFechar} maxWidth="sm" fullWidth>
      <form onSubmit={salvar} noValidate>
        <DialogTitle>{editando ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        <DialogContent>
          {erroGeral && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erroGeral}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField {...campo('nome', 'Nome')} autoFocus required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...campo('categoria', 'Categoria', { ajuda: 'Ex.: Ração, Higiene, Acessórios' })}
                required
                slotProps={{ htmlInput: { list: 'categorias-existentes' } }}
              />
              <datalist id="categorias-existentes">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...campo('preco', 'Preço')}
                required
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
                  htmlInput: { inputMode: 'decimal' },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...campo('codigoBarras', 'Código de barras', { ajuda: 'De 8 a 14 dígitos' })}
                required
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 14 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...campo('estoqueMinimo', 'Estoque mínimo', { ajuda: 'Alerta quando o saldo chegar a este valor' })}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
