import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import WarehouseOutlined from '@mui/icons-material/WarehouseOutlined';
import PetsOutlined from '@mui/icons-material/PetsOutlined';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined';

const TODOS = ['gerente', 'atendente'];
const GERENTE = ['gerente'];

// Itens do menu lateral e quem pode acessar cada tela (conforme a Declaração de Escopo).
export const itensMenu = [
  { caminho: '/produtos', rotulo: 'Produtos', Icone: Inventory2Outlined, papeis: TODOS },
  { caminho: '/estoque', rotulo: 'Estoque', Icone: WarehouseOutlined, papeis: GERENTE },
  { caminho: '/clientes', rotulo: 'Clientes e pets', Icone: PetsOutlined, papeis: TODOS },
  { caminho: '/vendas', rotulo: 'Vendas (PDV)', Icone: PointOfSaleOutlined, papeis: TODOS },
  { caminho: '/relatorios', rotulo: 'Relatórios', Icone: AssessmentOutlined, papeis: GERENTE },
];
