import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import { criarCliente, atualizarCliente } from '../../api/clientes';
import { validarCliente, petVazio } from './validarCliente';
import PetCampos from './PetCampos';
export default function ClienteFormDialog({ cliente, aoFechar, aoSalvar }) {
  const editando = Boolean(cliente);
  const [form, setForm] = useState({
    nome: cliente?.nome || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    pets: [petVazio()],
  });
  const [erros, setErros] = useState({}),
    [erro, setErro] = useState(''),
    [salvando, setSalvando] = useState(false);
  const alterar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setErros({});
  };
  function alterarPet(i, campo, valor) {
    setForm((f) => ({
      ...f,
      pets: f.pets.map((p, indice) => (indice === i ? { ...p, [campo]: valor } : p)),
    }));
    setErros({});
  }
  async function salvar(e) {
    e.preventDefault();
    const r = validarCliente(form, !editando);
    setErros(r.erros);
    setErro('');
    if (!r.valido) return;
    setSalvando(true);
    try {
      await aoSalvar(
        editando ? await atualizarCliente(cliente.id, r.dados) : await criarCliente(r.dados)
      );
    } catch (falha) {
      setErros(falha.detalhes || {});
      setErro(falha.message);
      setSalvando(false);
    }
  }
  return (
    <Dialog open fullWidth maxWidth="sm" onClose={salvando ? undefined : aoFechar}>
      <form onSubmit={salvar} noValidate>
        <DialogTitle>{editando ? 'Editar cliente' : 'Novo cliente e pets'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {erro && <Alert severity="error">{erro}</Alert>}
            <TextField
              label="Nome do cliente"
              value={form.nome}
              onChange={alterar('nome')}
              autoFocus
              required
              disabled={salvando}
              error={Boolean(erros.nome)}
              helperText={erros.nome}
            />
            <TextField
              label="Telefone (opcional)"
              value={form.telefone}
              onChange={alterar('telefone')}
              disabled={salvando}
              error={Boolean(erros.telefone)}
              helperText={erros.telefone || 'DDD e telefone'}
            />
            <TextField
              label="E-mail (opcional)"
              type="email"
              value={form.email}
              onChange={alterar('email')}
              disabled={salvando}
              error={Boolean(erros.email)}
              helperText={erros.email}
            />
            {!editando && (
              <>
                <Divider />
                <Typography variant="subtitle1">Pets do cliente</Typography>
                {erros.pets && <Alert severity="error">{erros.pets}</Alert>}
                {form.pets.map((pet, i) => (
                  <Box key={i}>
                    <Stack
                      direction="row"
                      sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography variant="subtitle2">{'Pet ' + (i + 1)}</Typography>
                      {form.pets.length > 1 && (
                        <IconButton
                          aria-label={'Remover pet ' + (i + 1)}
                          disabled={salvando}
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              pets: f.pets.filter((_, indice) => indice !== i),
                            }));
                            setErros({});
                          }}
                        >
                          <DeleteOutline />
                        </IconButton>
                      )}
                    </Stack>
                    <PetCampos
                      pet={pet}
                      desabilitado={salvando}
                      aoAlterar={(campo, valor) => alterarPet(i, campo, valor)}
                      erros={Object.fromEntries(
                        ['nome', 'especie', 'raca'].map((c) => [c, erros['pets.' + i + '.' + c]])
                      )}
                    />
                  </Box>
                ))}
                <Button
                  disabled={salvando || form.pets.length >= 20}
                  onClick={() => setForm((f) => ({ ...f, pets: [...f.pets, petVazio()] }))}
                >
                  Adicionar outro pet
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar cliente'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
