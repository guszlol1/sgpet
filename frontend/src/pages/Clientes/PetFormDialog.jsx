import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { adicionarPet, atualizarPet } from '../../api/clientes';
import { petVazio, validarPet } from './validarCliente';
import PetCampos from './PetCampos';
export default function PetFormDialog({ cliente, pet, aoFechar, aoSalvar }) {
  const [form, setForm] = useState(
    pet ? { nome: pet.nome, especie: pet.especie, raca: pet.raca } : petVazio()
  );
  const [erros, setErros] = useState({}),
    [erro, setErro] = useState(''),
    [salvando, setSalvando] = useState(false);
  async function salvar(e) {
    e.preventDefault();
    const r = validarPet(form);
    setErros(r.erros);
    setErro('');
    if (!r.valido) return;
    setSalvando(true);
    try {
      await aoSalvar(
        pet
          ? await atualizarPet(cliente.id, pet.id, r.dados)
          : await adicionarPet(cliente.id, r.dados)
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
        <DialogTitle>{pet ? 'Editar pet' : 'Adicionar pet'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">{'Cliente: ' + cliente.nome}</Typography>
            {erro && <Alert severity="error">{erro}</Alert>}
            <PetCampos
              pet={form}
              erros={erros}
              desabilitado={salvando}
              aoAlterar={(campo, valor) => {
                setForm((f) => ({ ...f, [campo]: valor }));
                setErros({});
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar pet'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
