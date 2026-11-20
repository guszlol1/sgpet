const { erros } = require('../../shared/erros');
const COLUNAS =
  'id, nome, telefone, email, criado_em, atualizado_em, pets(id, cliente_id, nome, especie, raca, criado_em, atualizado_em)';
function petParaApi(p) {
  return {
    id: p.id,
    clienteId: p.cliente_id,
    nome: p.nome,
    especie: p.especie,
    raca: p.raca || '',
  };
}
function clienteParaApi(c) {
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone || '',
    email: c.email || '',
    pets: (c.pets || []).map(petParaApi).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  };
}
function tratarErro(error) {
  if (error.code === '23503') throw erros.naoEncontrado('Cliente não encontrado.');
  if (['23514', '23502', '22023'].includes(error.code))
    throw erros.requisicaoInvalida('Dados do cadastro inválidos.');
  throw error;
}
function criarClientesRepository({ supabaseAdmin }) {
  return {
    async listar() {
      const { data, error } = await supabaseAdmin.from('clientes').select(COLUNAS).order('nome');
      if (error) tratarErro(error);
      return data.map(clienteParaApi);
    },
    async obter(id) {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select(COLUNAS)
        .eq('id', id)
        .maybeSingle();
      if (error) tratarErro(error);
      return data && clienteParaApi(data);
    },
    async criar(dados) {
      const { data, error } = await supabaseAdmin.rpc('criar_cliente_com_pets', {
        p_nome: dados.nome,
        p_telefone: dados.telefone,
        p_email: dados.email,
        p_pets: dados.pets,
      });
      if (error) tratarErro(error);
      return clienteParaApi(data);
    },
    async atualizar(id, dados) {
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .update(dados)
        .eq('id', id)
        .select(COLUNAS)
        .maybeSingle();
      if (error) tratarErro(error);
      return data && clienteParaApi(data);
    },
    async adicionarPet(clienteId, dados) {
      const { data, error } = await supabaseAdmin
        .from('pets')
        .insert({ ...dados, cliente_id: clienteId })
        .select('id, cliente_id, nome, especie, raca')
        .single();
      if (error) tratarErro(error);
      return petParaApi(data);
    },
    async atualizarPet(clienteId, petId, dados) {
      const { data, error } = await supabaseAdmin
        .from('pets')
        .update(dados)
        .eq('id', petId)
        .eq('cliente_id', clienteId)
        .select('id, cliente_id, nome, especie, raca')
        .maybeSingle();
      if (error) tratarErro(error);
      return data && petParaApi(data);
    },
  };
}
module.exports = { criarClientesRepository };
