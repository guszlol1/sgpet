import { Box, Chip, Paper, Typography } from '@mui/material';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';

// Tela provisória para funcionalidades das próximas sprints.
export default function EmBreve({ titulo, descricao, sprint }) {
  return (
    <>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {titulo}
      </Typography>
      <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
        <Box sx={{ mb: 2 }}>
          <ConstructionOutlined color="disabled" sx={{ fontSize: 56 }} />
        </Box>
        <Chip label={`Previsto para a Sprint ${sprint}`} color="secondary" variant="outlined" sx={{ mb: 2 }} />
        <Typography color="text.secondary">{descricao}</Typography>
      </Paper>
    </>
  );
}
