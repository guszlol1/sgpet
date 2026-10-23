import { createTheme } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

const tema = createTheme(
  {
    palette: {
      primary: { main: '#1f6f78' },
      secondary: { main: '#e07a3f' },
      background: { default: '#f5f7f8' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Roboto", "Segoe UI", system-ui, sans-serif',
      h5: { fontWeight: 600 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiTextField: { defaultProps: { fullWidth: true } },
    },
  },
  ptBR
);

export default tema;
