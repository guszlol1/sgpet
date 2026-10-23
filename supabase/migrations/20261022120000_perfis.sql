-- 3.1 Login e perfis
-- Cada usuário do Supabase Auth tem um perfil com o papel na loja.

create table public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null,
  papel     text not null default 'atendente'
            check (papel in ('gerente', 'atendente')),
  criado_em timestamptz not null default now()
);

comment on table public.perfis is 'Perfil de cada usuário do sistema (gerente ou atendente).';

-- O acesso aos dados é feito só pelo back-end, com a chave service_role.
-- RLS ligado e sem políticas bloqueia o acesso direto com a chave anon.
alter table public.perfis enable row level security;

-- Cria o perfil automaticamente quando um usuário é criado no Supabase Auth.
-- O papel vem de app_metadata, que só pode ser definido com a chave service_role
-- (o usuário não consegue se promover a gerente). O nome vem de user_metadata.
create function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), new.email),
    case
      when new.raw_app_meta_data ->> 'papel' = 'gerente' then 'gerente'
      else 'atendente'
    end
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_para_novo_usuario();
