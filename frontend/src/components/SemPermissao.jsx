import { Box, Button, Typography } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { Link as RouterLink } from 'react-router-dom';

export default function SemPermissao() {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <LockOutlined color="disabled" sx={{ fontSize: 56 }} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Seu perfil não tem acesso a esta tela
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Fale com o gerente da loja se precisar deste acesso.
      </Typography>
      <Button component={RouterLink} to="/produtos" variant="outlined">
        Voltar para produtos
      </Button>
    </Box>
  );
}
