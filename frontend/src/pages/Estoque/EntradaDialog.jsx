import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { registrarEntrada } from '../../api/estoque';
import { validarEntrada } from './validarEntrada';
export default function EntradaDialog({ produtos, produtoInicial, aoFechar, aoSalvar }) {
  const [form, setForm] = useState({
    produtoId: produtoInicial?.id || '',
    quantidade: '',
    observacao: '',
  });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const alterar = (campo) => (e) => {
    setForm((atual) => ({ ...atual, [campo]: e.target.value }));
    setErros({});
  };
  async function salvar(e) {
    e.preventDefault();
    const r = validarEntrada(form);
    setErros(r.erros);
    setErro('');
    if (!r.valido) return;
    setSalvando(true);
    try {
      await aoSalvar(await registrarEntrada(r.dados));
    } catch (falha) {
      setErros(falha.detalhes || {});
      setErro(falha.message);
      setSalvando(false);
    }
  }
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={salvando ? undefined : aoFechar}>
      <form onSubmit={salvar} noValidate>
        <DialogTitle>Registrar entrada de mercadorias</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {erro && <Alert severity="error">{erro}</Alert>}
            <TextField
              select
              label="Produto"
              value={form.produtoId}
              onChange={alterar('produtoId')}
              required
              disabled={salvando}
              error={Boolean(erros.produtoId)}
              helperText={erros.produtoId}
            >
              {produtos.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nome + ' — ' + p.codigoBarras}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantidade recebida"
              value={form.quantidade}
              onChange={alterar('quantidade')}
              autoFocus
              required
              disabled={salvando}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              error={Boolean(erros.quantidade)}
              helperText={
                erros.quantidade || 'Unidades inteiras; esta quantidade será somada ao saldo.'
              }
            />
            <TextField
              label="Observação (opcional)"
              multiline
              minRows={2}
              value={form.observacao}
              onChange={alterar('observacao')}
              disabled={salvando}
              error={Boolean(erros.observacao)}
              helperText={erros.observacao}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? 'Registrando...' : 'Registrar entrada'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
