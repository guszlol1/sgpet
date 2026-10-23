-- 3.2 Cadastro de produtos

create table public.produtos (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (char_length(nome) between 1 and 120),
  categoria      text not null check (char_length(categoria) between 1 and 60),
  preco          numeric(10, 2) not null check (preco > 0),
  codigo_barras  text not null check (codigo_barras ~ '^[0-9]{8,14}$'),
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  -- Remoção lógica: o produto removido some do sistema, mas continua no banco
  -- para não quebrar o histórico de vendas (Sprint 3).
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

comment on table public.produtos is 'Produtos vendidos na loja.';

-- O código de barras não se repete entre produtos ativos.
-- Um produto removido libera o código para ser cadastrado de novo.
create unique index produtos_codigo_barras_ativo_idx
  on public.produtos (codigo_barras)
  where ativo;

create index produtos_nome_idx on public.produtos (lower(nome));

alter table public.produtos enable row level security;

create function public.atualizar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger produtos_atualizado_em
  before update on public.produtos
  for each row execute function public.atualizar_atualizado_em();
