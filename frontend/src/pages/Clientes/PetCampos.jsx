import { Stack, TextField } from '@mui/material';
export default function PetCampos({ pet, erros = {}, aoAlterar, desabilitado }) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Nome do pet"
        value={pet.nome}
        onChange={(e) => aoAlterar('nome', e.target.value)}
        required
        disabled={desabilitado}
        error={Boolean(erros.nome)}
        helperText={erros.nome}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Espécie"
          value={pet.especie}
          onChange={(e) => aoAlterar('especie', e.target.value)}
          required
          disabled={desabilitado}
          error={Boolean(erros.especie)}
          helperText={erros.especie || 'Ex.: Cão, Gato, Ave'}
        />
        <TextField
          label="Raça (opcional)"
          value={pet.raca}
          onChange={(e) => aoAlterar('raca', e.target.value)}
          disabled={desabilitado}
          error={Boolean(erros.raca)}
          helperText={erros.raca}
        />
      </Stack>
    </Stack>
  );
}
