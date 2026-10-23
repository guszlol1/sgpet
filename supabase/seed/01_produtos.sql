-- Produtos fictícios para desenvolvimento e apresentação.
-- Os usuários de teste são criados pelo script backend/scripts/criar-usuarios.js.

insert into public.produtos (nome, categoria, preco, codigo_barras, estoque_minimo) values
  ('Ração Premium Cães Adultos 15 kg', 'Ração',      249.90, '7890000000017', 5),
  ('Ração Gatos Castrados 10 kg',      'Ração',      189.90, '7890000000024', 5),
  ('Sachê Gatos Sabor Frango 85 g',    'Ração',        3.49, '7890000000031', 30),
  ('Petisco Bifinho Carne 500 g',      'Petiscos',    24.90, '7890000000048', 10),
  ('Shampoo Neutro Pet 500 ml',        'Higiene',     29.90, '7890000000055', 8),
  ('Areia Higiênica 4 kg',             'Higiene',     19.90, '7890000000062', 12),
  ('Coleira Ajustável Média',          'Acessórios',  34.90, '7890000000079', 4),
  ('Bolinha de Borracha',              'Brinquedos',  12.90, '7890000000086', 6),
  ('Antipulgas Cães 10 a 20 kg',       'Saúde',       79.90, '7890000000093', 6),
  ('Comedouro Inox 500 ml',            'Acessórios',  27.90, '7890000000109', 4);
