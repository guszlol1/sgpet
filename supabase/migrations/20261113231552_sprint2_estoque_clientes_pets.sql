-- Sprint 2: saldo e entradas atômicas; cadastro de clientes e seus pets.
-- A API existente usa service_role somente no back-end. RLS bloqueia acesso direto.
alter table public.produtos add column saldo integer not null default 0 check (saldo >= 0);

create table public.entradas_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id),
  usuario_id uuid not null references public.perfis(id),
  quantidade integer not null check (quantidade > 0),
  observacao text not null default '' check (char_length(observacao) <= 500),
  criado_em timestamptz not null default now()
);
create index entradas_estoque_produto_idx on public.entradas_estoque(produto_id, criado_em desc);
create index entradas_estoque_usuario_idx on public.entradas_estoque(usuario_id);
alter table public.entradas_estoque enable row level security;
grant select, insert, update, delete on public.entradas_estoque to service_role;

create function public.registrar_entrada_estoque(
  p_produto_id uuid, p_quantidade integer, p_usuario_id uuid, p_observacao text default ''
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_produto public.produtos%rowtype;
  v_entrada_id uuid;
  v_saldo integer;
begin
  if not exists (select 1 from public.perfis where id = p_usuario_id and papel = 'gerente') then
    raise exception 'Apenas gerente pode registrar entradas.' using errcode = '42501';
  end if;
  if p_quantidade is null or p_quantidade <= 0 or char_length(coalesce(p_observacao, '')) > 500 then
    raise exception 'Quantidade ou observação inválida.' using errcode = '22023';
  end if;
  -- O bloqueio também sincroniza com a remoção lógica do produto.
  select * into v_produto from public.produtos where id = p_produto_id and ativo for update;
  if not found then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
  if v_produto.saldo > 2147483647 - p_quantidade then
    raise exception 'Saldo acima do limite.' using errcode = '22003';
  end if;
  update public.produtos set saldo = saldo + p_quantidade where id = p_produto_id returning saldo into v_saldo;
  insert into public.entradas_estoque(produto_id, usuario_id, quantidade, observacao)
    values (p_produto_id, p_usuario_id, p_quantidade, btrim(coalesce(p_observacao, '')))
    returning id into v_entrada_id;
  return jsonb_build_object('entrada_id', v_entrada_id, 'produto_id', p_produto_id,
    'quantidade', p_quantidade, 'saldo', v_saldo, 'estoque_minimo', v_produto.estoque_minimo);
end;
$$;
revoke all on function public.registrar_entrada_estoque(uuid, integer, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_entrada_estoque(uuid, integer, uuid, text) to service_role;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  telefone text not null default '' check (telefone = '' or telefone ~ '^[0-9]{10,11}$'),
  email text not null default '' check (char_length(email) <= 254 and (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clientes_nome_idx on public.clientes(lower(nome));
alter table public.clientes enable row level security;
create trigger clientes_atualizado_em before update on public.clientes
  for each row execute function public.atualizar_atualizado_em();

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  especie text not null check (char_length(btrim(especie)) between 1 and 60),
  raca text not null default '' check (char_length(raca) <= 80),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pets_cliente_idx on public.pets(cliente_id);
alter table public.pets enable row level security;
create trigger pets_atualizado_em before update on public.pets
  for each row execute function public.atualizar_atualizado_em();
grant select, insert, update, delete on public.clientes, public.pets to service_role;

-- O cadastro conjunto é uma única transação: nenhum cliente fica salvo pela metade.
create function public.criar_cliente_com_pets(p_nome text, p_telefone text, p_email text, p_pets jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_cliente public.clientes%rowtype;
  v_pets jsonb;
begin
  if p_pets is null or jsonb_typeof(p_pets) <> 'array' then
    raise exception 'Informe os pets em uma lista.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_pets) not between 1 and 20 then
    raise exception 'Cadastre de 1 a 20 pets junto do cliente.' using errcode = '22023';
  end if;
  insert into public.clientes(nome, telefone, email)
    values (btrim(p_nome), coalesce(p_telefone, ''), lower(btrim(coalesce(p_email, '')))) returning * into v_cliente;
  insert into public.pets(cliente_id, nome, especie, raca)
    select v_cliente.id, btrim(p.nome), btrim(p.especie), btrim(coalesce(p.raca, ''))
    from jsonb_to_recordset(p_pets) as p(nome text, especie text, raca text);
  select coalesce(jsonb_agg(to_jsonb(p) order by p.nome), '[]'::jsonb) into v_pets
    from public.pets p where p.cliente_id = v_cliente.id;
  return to_jsonb(v_cliente) || jsonb_build_object('pets', v_pets);
end;
$$;
revoke all on function public.criar_cliente_com_pets(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.criar_cliente_com_pets(text, text, text, jsonb) to service_role;
