CREATE DATABASE IF NOT EXISTS gestao_condominio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestao_condominio;

CREATE TABLE IF NOT EXISTS blocos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(80) NOT NULL UNIQUE,
  quantidade_apartamentos INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apartamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bloco_id INT NOT NULL,
  numero VARCHAR(20) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY apartamento_bloco (bloco_id, numero),
  CONSTRAINT fk_apartamento_bloco FOREIGN KEY (bloco_id) REFERENCES blocos(id)
);

CREATE TABLE IF NOT EXISTS moradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cpf CHAR(11) NOT NULL UNIQUE,
  telefone VARCHAR(25) NOT NULL,
  apartamento_id INT NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_morador_apartamento FOREIGN KEY (apartamento_id) REFERENCES apartamentos(id)
);

CREATE TABLE IF NOT EXISTS referencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mes TINYINT NOT NULL,
  ano SMALLINT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  vencimento TINYINT NOT NULL,
  UNIQUE KEY referencia_mes_ano (mes, ano)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartamento_id INT NOT NULL,
  referencia_id INT NOT NULL,
  data_pagamento DATE NOT NULL,
  UNIQUE KEY pagamento_apartamento_referencia (apartamento_id, referencia_id),
  CONSTRAINT fk_pagamento_apartamento FOREIGN KEY (apartamento_id) REFERENCES apartamentos(id),
  CONSTRAINT fk_pagamento_referencia FOREIGN KEY (referencia_id) REFERENCES referencias(id)
);

CREATE TABLE IF NOT EXISTS tipos_manutencao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descricao VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS manutencoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_id INT NOT NULL,
  data DATE NOT NULL,
  local VARCHAR(120) NOT NULL,
  descricao VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_manutencao_tipo FOREIGN KEY (tipo_id) REFERENCES tipos_manutencao(id)
);

INSERT IGNORE INTO referencias (mes, ano, valor, vencimento) VALUES
(1, 2026, 350.00, 10),
(2, 2026, 350.00, 10),
(3, 2026, 350.00, 10),
(4, 2026, 350.00, 10),
(5, 2026, 350.00, 10),
(6, 2026, 350.00, 10),
(7, 2026, 350.00, 10),
(8, 2026, 350.00, 10),
(9, 2026, 350.00, 10),
(10, 2026, 350.00, 10),
(11, 2026, 350.00, 10),
(12, 2026, 350.00, 10);

INSERT IGNORE INTO tipos_manutencao (descricao) VALUES
('Elétrica'),
('Hidráulica'),
('Elevador'),
('Pintura'),
('Limpeza');
