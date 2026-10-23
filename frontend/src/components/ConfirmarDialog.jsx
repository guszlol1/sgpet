import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export default function ConfirmarDialog({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  processando = false,
  aoConfirmar,
  aoCancelar,
}) {
  return (
    <Dialog open={aberto} onClose={processando ? undefined : aoCancelar} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText>{mensagem}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={aoCancelar} disabled={processando}>
          Cancelar
        </Button>
        <Button onClick={aoConfirmar} color="error" variant="contained" disabled={processando}>
          {rotuloConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
