import EmBreve from '../../components/EmBreve';

export default function RelatoriosPage() {
  return (
    <EmBreve
      titulo="Relatório de vendas"
      sprint={3}
      descricao="Vendas do período escolhido, com quantidade de vendas e valor total."
    />
  );
}
