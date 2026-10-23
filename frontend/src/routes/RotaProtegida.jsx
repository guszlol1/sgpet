import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import SemPermissao from '../components/SemPermissao';

// Exige login. Com `papeis`, também exige um dos perfis informados.
export default function RotaProtegida({ papeis }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (papeis && !papeis.includes(usuario.papel)) return <SemPermissao />;

  return <Outlet />;
}
