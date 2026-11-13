import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { listarClientes } from '../../api/clientes';
import ClienteFormDialog from './ClienteFormDialog';
import PetFormDialog from './PetFormDialog';
import { filtrarClientes } from './validarCliente';
export default function ClientesPage() {
  const [clientes, setClientes] = useState([]),
    [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(''),
    [busca, setBusca] = useState(''),
    [dialogo, setDialogo] = useState(null),
    [aviso, setAviso] = useState('');
  const buscar = useCallback(
    () =>
      listarClientes()
        .then(setClientes)
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
  const visiveis = useMemo(() => filtrarClientes(clientes, busca), [clientes, busca]);
  async function aoSalvar() {
    setDialogo(null);
    setAviso('Cadastro salvo com sucesso.');
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
          <Typography variant="h5">Clientes e pets</Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastros dos clientes e de seus animais
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogo({ tipo: 'cliente', cliente: null })}
        >
          Novo cliente
        </Button>
      </Stack>
      <TextField
        label="Buscar cliente, telefone, e-mail ou pet"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        sx={{ mb: 2 }}
      />
      {carregando ? (
        <CircularProgress aria-label="Carregando clientes" />
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
      ) : visiveis.length === 0 ? (
        <Alert severity="info">
          {clientes.length
            ? 'Nenhum cadastro encontrado para esta busca.'
            : 'Nenhum cliente cadastrado ainda. Cadastre o primeiro cliente e seus pets.'}
        </Alert>
      ) : (
        visiveis.map((c) => (
          <Accordion
            key={c.id}
            defaultExpanded={clientes.length === 1}
            disableGutters
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls={'cliente-' + c.id}
              id={'resumo-' + c.id}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography>{c.nome}</Typography>
                <Chip size="small" label={c.pets.length + ' pet(s)'} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails id={'cliente-' + c.id} sx={{ overflowX: 'auto' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {'Telefone: ' +
                  (c.telefone || 'Não informado') +
                  ' · E-mail: ' +
                  (c.email || 'Não informado')}
              </Typography>
              <Table size="small" aria-label={'Pets de ' + c.nome}>
                <TableHead>
                  <TableRow>
                    <TableCell>Pet</TableCell>
                    <TableCell>Espécie</TableCell>
                    <TableCell>Raça</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {c.pets.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.nome}</TableCell>
                      <TableCell>{p.especie}</TableCell>
                      <TableCell>{p.raca || 'Não informada'}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          aria-label={'Editar pet ' + p.nome}
                          onClick={() => setDialogo({ tipo: 'pet', cliente: c, pet: p })}
                        >
                          Editar pet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
            <AccordionActions>
              <Button
                onClick={() => setDialogo({ tipo: 'cliente', cliente: c })}
                aria-label={'Editar cliente ' + c.nome}
              >
                Editar cliente
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setDialogo({ tipo: 'pet', cliente: c, pet: null })}
                aria-label={'Adicionar pet para ' + c.nome}
              >
                Adicionar pet
              </Button>
            </AccordionActions>
          </Accordion>
        ))
      )}
      {dialogo?.tipo === 'cliente' && (
        <ClienteFormDialog
          cliente={dialogo.cliente}
          aoFechar={() => setDialogo(null)}
          aoSalvar={aoSalvar}
        />
      )}
      {dialogo?.tipo === 'pet' && (
        <PetFormDialog
          cliente={dialogo.cliente}
          pet={dialogo.pet}
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
