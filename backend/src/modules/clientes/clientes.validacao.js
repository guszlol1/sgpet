const { textoAparado } = require('../../shared/validacao');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function objeto(valor) {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
}
function validarPet(entrada) {
  const body = objeto(entrada),
    erros = {};
  const nome = textoAparado(body.nome),
    especie = textoAparado(body.especie),
    raca = textoAparado(body.raca);
  if (!nome || nome.length > 80) erros.nome = 'Informe o nome do pet com até 80 caracteres.';
  if (!especie || especie.length > 60) erros.especie = 'Informe a espécie com até 60 caracteres.';
  if (body.raca != null && typeof body.raca !== 'string') erros.raca = 'Informe a raça em texto.';
  else if (raca.length > 80) erros.raca = 'A raça deve ter no máximo 80 caracteres.';
  return { valido: Object.keys(erros).length === 0, erros, dados: { nome, especie, raca } };
}
function validarCliente(entrada, { comPets = false } = {}) {
  const body = objeto(entrada),
    erros = {};
  const nome = textoAparado(body.nome),
    telefoneTexto = textoAparado(body.telefone);
  const telefone = telefoneTexto.replace(/[()\s.-]/g, ''),
    email = textoAparado(body.email).toLowerCase();
  if (!nome || nome.length > 120) erros.nome = 'Informe o nome do cliente com até 120 caracteres.';
  if (
    (body.telefone != null && typeof body.telefone !== 'string') ||
    (telefone && !/^\d{10,11}$/.test(telefone))
  )
    erros.telefone = 'Informe DDD e telefone com 10 ou 11 dígitos.';
  if (
    (body.email != null && typeof body.email !== 'string') ||
    (email && (email.length > 254 || !EMAIL.test(email)))
  )
    erros.email = 'Informe um e-mail válido.';
  const dados = { nome, telefone, email };
  if (comPets) {
    if (!Array.isArray(body.pets) || body.pets.length < 1 || body.pets.length > 20) {
      erros.pets = 'Cadastre de 1 a 20 pets junto do cliente.';
    } else {
      dados.pets = body.pets.map((pet, i) => {
        const r = validarPet(pet);
        for (const [campo, mensagem] of Object.entries(r.erros))
          erros['pets.' + i + '.' + campo] = mensagem;
        return r.dados;
      });
    }
  }
  return { valido: Object.keys(erros).length === 0, erros, dados };
}
module.exports = { validarCliente, validarPet };
