export const petVazio = () => ({ nome: '', especie: '', raca: '' });
export function validarPet(form) {
  const erros = {},
    dados = { nome: form.nome.trim(), especie: form.especie.trim(), raca: form.raca.trim() };
  if (!dados.nome || dados.nome.length > 80)
    erros.nome = 'Informe o nome do pet com até 80 caracteres.';
  if (!dados.especie || dados.especie.length > 60)
    erros.especie = 'Informe a espécie com até 60 caracteres.';
  if (dados.raca.length > 80) erros.raca = 'A raça deve ter no máximo 80 caracteres.';
  return { valido: Object.keys(erros).length === 0, erros, dados };
}
export function validarCliente(form, comPets = true) {
  const erros = {},
    dados = {
      nome: form.nome.trim(),
      telefone: form.telefone.replace(/[()\s.-]/g, ''),
      email: form.email.trim().toLowerCase(),
    };
  if (!dados.nome || dados.nome.length > 120)
    erros.nome = 'Informe o nome do cliente com até 120 caracteres.';
  if (dados.telefone && !/^\d{10,11}$/.test(dados.telefone))
    erros.telefone = 'Informe DDD e telefone com 10 ou 11 dígitos.';
  if (dados.email && (dados.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)))
    erros.email = 'Informe um e-mail válido.';
  if (comPets) {
    if (!form.pets?.length || form.pets.length > 20)
      erros.pets = 'Cadastre de 1 a 20 pets junto do cliente.';
    else
      dados.pets = form.pets.map((pet, i) => {
        const r = validarPet(pet);
        for (const [campo, mensagem] of Object.entries(r.erros))
          erros['pets.' + i + '.' + campo] = mensagem;
        return r.dados;
      });
  }
  return { valido: Object.keys(erros).length === 0, erros, dados };
}
export function filtrarClientes(clientes, busca) {
  const normalizar = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const termo = normalizar(busca.trim());
  return clientes.filter((c) =>
    normalizar([c.nome, c.email, c.telefone, ...c.pets.map((p) => p.nome)].join(' ')).includes(
      termo
    )
  );
}
