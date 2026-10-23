import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RotaProtegida from './routes/RotaProtegida';
import LoginPage from './pages/Login/LoginPage';
import ProdutosPage from './pages/Produtos/ProdutosPage';
import EstoquePage from './pages/Estoque/EstoquePage';
import ClientesPage from './pages/Clientes/ClientesPage';
import VendasPage from './pages/Vendas/VendasPage';
import RelatoriosPage from './pages/Relatorios/RelatoriosPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route path="/produtos" element={<ProdutosPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/vendas" element={<VendasPage />} />

          <Route element={<RotaProtegida papeis={['gerente']} />}>
            <Route path="/estoque" element={<EstoquePage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/produtos" replace />} />
    </Routes>
  );
}
