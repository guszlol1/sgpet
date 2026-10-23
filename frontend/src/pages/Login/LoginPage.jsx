import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [enviando, setEnviando] = useState(false);

  const destino = local.state?.de || '/produtos';
  if (usuario) return <Navigate to={destino} replace />;

  async function enviar(evento) {
    evento.preventDefault();
    const novosErros = {};
    if (!email.trim()) novosErros.email = 'Informe o e-mail.';
    if (!senha) novosErros.senha = 'Informe a senha.';
    setErrosCampos(novosErros);
    setErro('');
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(e.message);
      setErrosCampos(e.detalhes || {});
      setEnviando(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #1f6f78 0%, #164f56 100%)',
      }}
    >
      <Paper elevation={6} sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 400 }}>
        <Stack spacing={1} sx={{ mb: 3, alignItems: 'center' }}>
          <PetsIcon color="primary" sx={{ fontSize: 44 }} />
          <Typography variant="h5">SGPet</Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema de Gestão Pet UFSCar
          </Typography>
        </Stack>

        <Box component="form" onSubmit={enviar} noValidate>
          <Stack spacing={2}>
            {erro && <Alert severity="error">{erro}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(errosCampos.email)}
              helperText={errosCampos.email}
            />
            <TextField
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              error={Boolean(errosCampos.senha)}
              helperText={errosCampos.senha}
            />
            <Button type="submit" variant="contained" size="large" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
