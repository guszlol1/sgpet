import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PetsIcon from '@mui/icons-material/Pets';
import { useAuth } from '../contexts/AuthContext';
import { itensMenu } from '../routes/menu';

const LARGURA_MENU = 232;

export default function Layout() {
  const { usuario, sair } = useAuth();
  const tema = useTheme();
  const telaGrande = useMediaQuery(tema.breakpoints.up('md'));
  const [menuAberto, setMenuAberto] = useState(false);

  const itensVisiveis = itensMenu.filter((item) => item.papeis.includes(usuario.papel));

  const menu = (
    <>
      <Toolbar />
      <List sx={{ px: 1 }}>
        {itensVisiveis.map(({ caminho, rotulo, Icone }) => (
          <ListItemButton
            key={caminho}
            component={NavLink}
            to={caminho}
            onClick={() => setMenuAberto(false)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'inherit' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icone />
            </ListItemIcon>
            <ListItemText primary={rotulo} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!telaGrande && (
            <IconButton color="inherit" edge="start" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
              <MenuIcon />
            </IconButton>
          )}
          <PetsIcon />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            SGPet
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{usuario.nome}</Typography>
            <Chip
              label={usuario.papel === 'gerente' ? 'Gerente' : 'Atendente'}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
            />
          </Box>
          <Tooltip title="Sair">
            <IconButton color="inherit" onClick={sair} aria-label="Sair">
              <LogoutOutlined />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={telaGrande ? 'permanent' : 'temporary'}
        open={telaGrande || menuAberto}
        onClose={() => setMenuAberto(false)}
        sx={{
          width: LARGURA_MENU,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: LARGURA_MENU, boxSizing: 'border-box' },
        }}
      >
        {menu}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
