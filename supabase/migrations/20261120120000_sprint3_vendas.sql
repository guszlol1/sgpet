-- Sprint 3: registro de vendas (PDV) com baixa de estoque e relatório por período.
-- Como nas sprints anteriores, o acesso é feito só pelo back-end (service_role); RLS bloqueia o resto.

create table public.vendas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.perfis(id),
  cliente_id      uuid references public.clientes(id),
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'pix', 'cartao')),
  valor_total     numeric(12, 2) not null check (valor_total > 0),
  data_hora       timestamptz not null default now()
);
comment on table public.vendas is 'Vendas registradas no PDV.';
create index vendas_data_hora_idx on public.vendas(data_hora);
create index vendas_usuario_idx on public.vendas(usuario_id);
create index vendas_cliente_idx on public.vendas(cliente_id);
alter table public.vendas enable row level security;

-- Cada item guarda o preço do momento da venda: mudar o preço do produto depois
-- não altera vendas antigas. Os itens também são o histórico de saída do estoque.
create table public.itens_venda (
  id             uuid primary key default gen_random_uuid(),
  venda_id       uuid not null references public.vendas(id) on delete cascade,
  produto_id     uuid not null references public.produtos(id),
  quantidade     integer not null check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario > 0),
  subtotal       numeric(12, 2) not null,
  constraint itens_venda_subtotal_ck check (subtotal = quantidade * preco_unitario),
  constraint itens_venda_produto_unico unique (venda_id, produto_id)
);
comment on table public.itens_venda is 'Itens de cada venda (saídas do estoque).';
create index itens_venda_produto_idx on public.itens_venda(produto_id);
alter table public.itens_venda enable row level security;

grant select, insert, update, delete on public.vendas, public.itens_venda to service_role;

-- Registra a venda numa única transação: valida, trava os produtos, calcula o total
-- com os preços do banco, grava a venda e os itens e dá baixa no saldo.
-- Qualquer erro desfaz tudo: nenhum saldo é alterado se a venda falhar.
create function public.registrar_venda(
  p_usuario_id uuid, p_cliente_id uuid, p_forma_pagamento text, p_itens jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_item record;
  v_produto public.produtos%rowtype;
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_itens jsonb := '[]'::jsonb;
  v_venda public.vendas%rowtype;
begin
  if not exists (select 1 from public.perfis where id = p_usuario_id) then
    raise exception 'Usuário sem perfil no sistema.' using errcode = '42501';
  end if;
  if p_forma_pagamento is null or p_forma_pagamento not in ('dinheiro', 'pix', 'cartao') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) not between 1 and 100 then
    raise exception 'Informe de 1 a 100 itens.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) i
    where i ->> 'produto_id' is null
       or jsonb_typeof(i -> 'quantidade') is distinct from 'number'
       or (i ->> 'quantidade')::numeric <> trunc((i ->> 'quantidade')::numeric)
       or (i ->> 'quantidade')::numeric <= 0
  ) then
    raise exception 'Cada item precisa de produto e quantidade inteira maior que zero.'
      using errcode = '22023';
  end if;
  if p_cliente_id is not null and not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'Cliente não encontrado.' using errcode = 'SGP02';
  end if;

  -- Itens repetidos do mesmo produto são somados. A ordem por id evita deadlock
  -- entre duas vendas simultâneas que travam os mesmos produtos.
  for v_item in
    select (i ->> 'produto_id')::uuid as produto_id,
           sum((i ->> 'quantidade')::integer)::integer as quantidade
    from jsonb_array_elements(p_itens) i
    group by 1
    order by 1
  loop
    select * into v_produto from public.produtos where id = v_item.produto_id and ativo for update;
    if not found then
      raise exception 'Produto não encontrado.' using errcode = 'P0002', detail = v_item.produto_id::text;
    end if;
    if v_produto.saldo < v_item.quantidade then
      raise exception 'Estoque insuficiente.' using errcode = 'SGP01',
        detail = jsonb_build_object('produto_id', v_produto.id, 'nome', v_produto.nome,
          'saldo', v_produto.saldo, 'solicitado', v_item.quantidade)::text;
    end if;
    v_subtotal := v_produto.preco * v_item.quantidade;
    v_total := v_total + v_subtotal;
    v_itens := v_itens || jsonb_build_object(
      'produto_id', v_produto.id, 'nome', v_produto.nome, 'codigo_barras', v_produto.codigo_barras,
      'quantidade', v_item.quantidade, 'preco_unitario', v_produto.preco, 'subtotal', v_subtotal,
      'saldo', v_produto.saldo - v_item.quantidade, 'estoque_minimo', v_produto.estoque_minimo);
  end loop;

  insert into public.vendas(usuario_id, cliente_id, forma_pagamento, valor_total)
    values (p_usuario_id, p_cliente_id, p_forma_pagamento, v_total)
    returning * into v_venda;

  insert into public.itens_venda(venda_id, produto_id, quantidade, preco_unitario, subtotal)
    select v_venda.id, (e ->> 'produto_id')::uuid, (e ->> 'quantidade')::integer,
           (e ->> 'preco_unitario')::numeric, (e ->> 'subtotal')::numeric
    from jsonb_array_elements(v_itens) e;

  update public.produtos p
    set saldo = p.saldo - (e ->> 'quantidade')::integer
    from jsonb_array_elements(v_itens) e
    where p.id = (e ->> 'produto_id')::uuid;

  return jsonb_build_object(
    'id', v_venda.id, 'data_hora', v_venda.data_hora, 'usuario_id', v_venda.usuario_id,
    'cliente_id', v_venda.cliente_id, 'forma_pagamento', v_venda.forma_pagamento,
    'valor_total', v_venda.valor_total, 'itens', v_itens);
end;
$$;
revoke all on function public.registrar_venda(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_venda(uuid, uuid, text, jsonb) to service_role;

-- Vendas de um intervalo [p_inicio, p_fim), com itens, atendente e cliente.
-- Devolve um único JSON para não esbarrar no limite de linhas da API do Supabase.
create function public.relatorio_vendas(p_inicio timestamptz, p_fim timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'data_hora', v.data_hora,
      'forma_pagamento', v.forma_pagamento,
      'valor_total', v.valor_total,
      'cliente_id', v.cliente_id,
      'cliente_nome', c.nome,
      'usuario_nome', u.nome,
      'itens', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'produto_id', i.produto_id, 'nome', p.nome, 'quantidade', i.quantidade,
            'preco_unitario', i.preco_unitario, 'subtotal', i.subtotal) order by p.nome), '[]'::jsonb)
        from public.itens_venda i join public.produtos p on p.id = i.produto_id
        where i.venda_id = v.id)
    ) order by v.data_hora, v.id), '[]'::jsonb)
  from public.vendas v
  join public.perfis u on u.id = v.usuario_id
  left join public.clientes c on c.id = v.cliente_id
  where v.data_hora >= p_inicio and v.data_hora < p_fim;
$$;
revoke all on function public.relatorio_vendas(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.relatorio_vendas(timestamptz, timestamptz) to service_role;
