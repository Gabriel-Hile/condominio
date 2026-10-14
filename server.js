const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const [blocos] = await db.query("SELECT COUNT(*) AS total FROM blocos");
  const [apartamentos] = await db.query("SELECT COUNT(*) AS total FROM apartamentos");
  const [moradores] = await db.query("SELECT COUNT(*) AS total FROM moradores");
  const [pagamentos] = await db.query("SELECT COUNT(*) AS total FROM pagamentos");
  const [manutencoes] = await db.query("SELECT COUNT(*) AS total FROM manutencoes");
  const [pendentes] = await db.query("SELECT COUNT(*) AS total FROM referencias r JOIN apartamentos a ON 1=1 LEFT JOIN pagamentos p ON p.referencia_id = r.id AND p.apartamento_id = a.id WHERE p.id IS NULL AND (r.ano < YEAR(CURDATE()) OR (r.ano = YEAR(CURDATE()) AND r.mes <= MONTH(CURDATE())))");
  res.json({
    blocos: blocos[0].total,
    apartamentos: apartamentos[0].total,
    moradores: moradores[0].total,
    pagamentos: pagamentos[0].total,
    manutencoes: manutencoes[0].total,
    pendentes: pendentes[0].total
  });
}));

app.get("/api/blocos", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT b.*, COUNT(a.id) AS apartamentos_cadastrados FROM blocos b LEFT JOIN apartamentos a ON a.bloco_id = b.id GROUP BY b.id ORDER BY b.descricao");
  res.json(rows);
}));

app.post("/api/blocos", asyncRoute(async (req, res) => {
  const descricao = String(req.body.descricao || "").trim();
  const quantidade = Number(req.body.quantidade_apartamentos);
  if (!descricao || !Number.isInteger(quantidade) || quantidade < 1) return res.status(400).json({ erro: "Informe a descrição e uma quantidade válida de apartamentos." });
  const [existente] = await db.query("SELECT id FROM blocos WHERE LOWER(descricao) = LOWER(?)", [descricao]);
  if (existente.length) return res.status(409).json({ erro: "Este bloco já está cadastrado." });
  const [result] = await db.query("INSERT INTO blocos (descricao, quantidade_apartamentos) VALUES (?, ?)", [descricao, quantidade]);
  res.status(201).json({ id: result.insertId, mensagem: "Bloco cadastrado com sucesso." });
}));

app.put("/api/blocos/:id", asyncRoute(async (req, res) => {
  const descricao = String(req.body.descricao || "").trim();
  const quantidade = Number(req.body.quantidade_apartamentos);
  if (!descricao || !Number.isInteger(quantidade) || quantidade < 1) return res.status(400).json({ erro: "Informe a descrição e uma quantidade válida de apartamentos." });
  const [existente] = await db.query("SELECT id FROM blocos WHERE LOWER(descricao) = LOWER(?) AND id <> ?", [descricao, req.params.id]);
  if (existente.length) return res.status(409).json({ erro: "Este bloco já está cadastrado." });
  const [result] = await db.query("UPDATE blocos SET descricao = ?, quantidade_apartamentos = ? WHERE id = ?", [descricao, quantidade, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Bloco não encontrado." });
  res.json({ mensagem: "Bloco atualizado com sucesso." });
}));

app.delete("/api/blocos/:id", asyncRoute(async (req, res) => {
  const [apartamentos] = await db.query("SELECT id FROM apartamentos WHERE bloco_id = ?", [req.params.id]);
  if (apartamentos.length) return res.status(409).json({ erro: "Não é possível excluir um bloco que possui apartamentos cadastrados." });
  const [result] = await db.query("DELETE FROM blocos WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Bloco não encontrado." });
  res.json({ mensagem: "Bloco excluído com sucesso." });
}));

app.get("/api/apartamentos", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT a.*, b.descricao AS bloco, m.nome AS morador FROM apartamentos a JOIN blocos b ON b.id = a.bloco_id LEFT JOIN moradores m ON m.apartamento_id = a.id ORDER BY b.descricao, a.numero");
  res.json(rows);
}));

app.post("/api/apartamentos", asyncRoute(async (req, res) => {
  const blocoId = Number(req.body.bloco_id);
  const numero = String(req.body.numero || "").trim();
  if (!blocoId || !numero) return res.status(400).json({ erro: "Informe o bloco e o número do apartamento." });
  const [blocos] = await db.query("SELECT id FROM blocos WHERE id = ?", [blocoId]);
  if (!blocos.length) return res.status(400).json({ erro: "Bloco não cadastrado." });
  const [existente] = await db.query("SELECT id FROM apartamentos WHERE bloco_id = ? AND LOWER(numero) = LOWER(?)", [blocoId, numero]);
  if (existente.length) return res.status(409).json({ erro: "Este apartamento já existe neste bloco." });
  const [result] = await db.query("INSERT INTO apartamentos (bloco_id, numero) VALUES (?, ?)", [blocoId, numero]);
  res.status(201).json({ id: result.insertId, mensagem: "Apartamento cadastrado com sucesso." });
}));

app.put("/api/apartamentos/:id", asyncRoute(async (req, res) => {
  const blocoId = Number(req.body.bloco_id);
  const numero = String(req.body.numero || "").trim();
  if (!blocoId || !numero) return res.status(400).json({ erro: "Informe o bloco e o número do apartamento." });
  const [existente] = await db.query("SELECT id FROM apartamentos WHERE bloco_id = ? AND LOWER(numero) = LOWER(?) AND id <> ?", [blocoId, numero, req.params.id]);
  if (existente.length) return res.status(409).json({ erro: "Este apartamento já existe neste bloco." });
  const [result] = await db.query("UPDATE apartamentos SET bloco_id = ?, numero = ? WHERE id = ?", [blocoId, numero, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Apartamento não encontrado." });
  res.json({ mensagem: "Apartamento atualizado com sucesso." });
}));

app.delete("/api/apartamentos/:id", asyncRoute(async (req, res) => {
  const [moradores] = await db.query("SELECT id FROM moradores WHERE apartamento_id = ?", [req.params.id]);
  const [pagamentos] = await db.query("SELECT id FROM pagamentos WHERE apartamento_id = ?", [req.params.id]);
  if (moradores.length || pagamentos.length) return res.status(409).json({ erro: "Não é possível excluir um apartamento com morador ou pagamentos registrados." });
  const [result] = await db.query("DELETE FROM apartamentos WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Apartamento não encontrado." });
  res.json({ mensagem: "Apartamento excluído com sucesso." });
}));

app.get("/api/moradores", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT m.*, a.numero AS apartamento, b.descricao AS bloco FROM moradores m JOIN apartamentos a ON a.id = m.apartamento_id JOIN blocos b ON b.id = a.bloco_id ORDER BY m.nome");
  res.json(rows);
}));

app.post("/api/moradores", asyncRoute(async (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const cpf = String(req.body.cpf || "").replace(/\D/g, "");
  const telefone = String(req.body.telefone || "").trim();
  const apartamentoId = Number(req.body.apartamento_id);
  if (!nome || cpf.length !== 11 || !telefone || !apartamentoId) return res.status(400).json({ erro: "Informe nome, CPF com 11 números, telefone e apartamento." });
  const [duplicado] = await db.query("SELECT id FROM moradores WHERE cpf = ?", [cpf]);
  if (duplicado.length) return res.status(409).json({ erro: "Este CPF já está cadastrado." });
  const [ocupado] = await db.query("SELECT id FROM moradores WHERE apartamento_id = ?", [apartamentoId]);
  if (ocupado.length) return res.status(409).json({ erro: "Este apartamento já possui um morador principal cadastrado." });
  const [result] = await db.query("INSERT INTO moradores (nome, cpf, telefone, apartamento_id) VALUES (?, ?, ?, ?)", [nome, cpf, telefone, apartamentoId]);
  res.status(201).json({ id: result.insertId, mensagem: "Morador cadastrado com sucesso." });
}));

app.put("/api/moradores/:id", asyncRoute(async (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const cpf = String(req.body.cpf || "").replace(/\D/g, "");
  const telefone = String(req.body.telefone || "").trim();
  const apartamentoId = Number(req.body.apartamento_id);
  if (!nome || cpf.length !== 11 || !telefone || !apartamentoId) return res.status(400).json({ erro: "Informe nome, CPF com 11 números, telefone e apartamento." });
  const [duplicado] = await db.query("SELECT id FROM moradores WHERE cpf = ? AND id <> ?", [cpf, req.params.id]);
  if (duplicado.length) return res.status(409).json({ erro: "Este CPF já está cadastrado." });
  const [ocupado] = await db.query("SELECT id FROM moradores WHERE apartamento_id = ? AND id <> ?", [apartamentoId, req.params.id]);
  if (ocupado.length) return res.status(409).json({ erro: "Este apartamento já possui um morador principal cadastrado." });
  const [result] = await db.query("UPDATE moradores SET nome = ?, cpf = ?, telefone = ?, apartamento_id = ? WHERE id = ?", [nome, cpf, telefone, apartamentoId, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Morador não encontrado." });
  res.json({ mensagem: "Morador atualizado com sucesso." });
}));

app.delete("/api/moradores/:id", asyncRoute(async (req, res) => {
  const [result] = await db.query("DELETE FROM moradores WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Morador não encontrado." });
  res.json({ mensagem: "Morador excluído com sucesso." });
}));

app.get("/api/referencias", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT * FROM referencias ORDER BY ano DESC, mes DESC");
  res.json(rows);
}));

app.post("/api/referencias", asyncRoute(async (req, res) => {
  const mes = Number(req.body.mes);
  const ano = Number(req.body.ano);
  const valor = Number(req.body.valor);
  const vencimento = Number(req.body.vencimento);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2020 || !Number.isFinite(valor) || valor <= 0 || !Number.isInteger(vencimento) || vencimento < 1 || vencimento > 28) return res.status(400).json({ erro: "Confira mês, ano, valor e vencimento. O dia de vencimento deve ficar entre 1 e 28." });
  const [existente] = await db.query("SELECT id FROM referencias WHERE mes = ? AND ano = ?", [mes, ano]);
  if (existente.length) return res.status(409).json({ erro: "Esta referência já está cadastrada." });
  const [result] = await db.query("INSERT INTO referencias (mes, ano, valor, vencimento) VALUES (?, ?, ?, ?)", [mes, ano, valor, vencimento]);
  res.status(201).json({ id: result.insertId, mensagem: "Referência cadastrada com sucesso." });
}));

app.get("/api/pagamentos", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT p.id, p.data_pagamento, a.numero AS apartamento, b.descricao AS bloco, m.nome AS morador, r.mes, r.ano, r.valor, r.vencimento FROM pagamentos p JOIN apartamentos a ON a.id = p.apartamento_id JOIN blocos b ON b.id = a.bloco_id LEFT JOIN moradores m ON m.apartamento_id = a.id JOIN referencias r ON r.id = p.referencia_id ORDER BY p.data_pagamento DESC, p.id DESC");
  res.json(rows);
}));

app.post("/api/pagamentos", asyncRoute(async (req, res) => {
  const apartamentoId = Number(req.body.apartamento_id);
  const referenciaId = Number(req.body.referencia_id);
  if (!apartamentoId || !referenciaId) return res.status(400).json({ erro: "Selecione o apartamento e o mês de referência." });
  const [apartamentos] = await db.query("SELECT id FROM apartamentos WHERE id = ?", [apartamentoId]);
  if (!apartamentos.length) return res.status(400).json({ erro: "Apartamento não cadastrado." });
  const [referencias] = await db.query("SELECT id FROM referencias WHERE id = ?", [referenciaId]);
  if (!referencias.length) return res.status(400).json({ erro: "Referência não cadastrada." });
  const [duplicado] = await db.query("SELECT id FROM pagamentos WHERE apartamento_id = ? AND referencia_id = ?", [apartamentoId, referenciaId]);
  if (duplicado.length) return res.status(409).json({ erro: "O pagamento deste apartamento para esta referência já foi registrado." });
  await db.query("INSERT INTO pagamentos (apartamento_id, referencia_id, data_pagamento) VALUES (?, ?, CURDATE())", [apartamentoId, referenciaId]);
  res.status(201).json({ mensagem: "Pagamento registrado com sucesso." });
}));

app.get("/api/tipos-manutencao", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT t.*, COUNT(m.id) AS total_manutencoes FROM tipos_manutencao t LEFT JOIN manutencoes m ON m.tipo_id = t.id GROUP BY t.id ORDER BY t.descricao");
  res.json(rows);
}));

app.post("/api/tipos-manutencao", asyncRoute(async (req, res) => {
  const descricao = String(req.body.descricao || "").trim();
  if (!descricao) return res.status(400).json({ erro: "Informe a descrição do tipo de manutenção." });
  const [existente] = await db.query("SELECT id FROM tipos_manutencao WHERE LOWER(descricao) = LOWER(?)", [descricao]);
  if (existente.length) return res.status(409).json({ erro: "Este tipo de manutenção já está cadastrado." });
  const [result] = await db.query("INSERT INTO tipos_manutencao (descricao) VALUES (?)", [descricao]);
  res.status(201).json({ id: result.insertId, mensagem: "Tipo de manutenção cadastrado com sucesso." });
}));

app.delete("/api/tipos-manutencao/:id", asyncRoute(async (req, res) => {
  const [usado] = await db.query("SELECT id FROM manutencoes WHERE tipo_id = ?", [req.params.id]);
  if (usado.length) return res.status(409).json({ erro: "Este tipo já possui manutenções registradas." });
  const [result] = await db.query("DELETE FROM tipos_manutencao WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Tipo de manutenção não encontrado." });
  res.json({ mensagem: "Tipo de manutenção excluído com sucesso." });
}));

app.get("/api/manutencoes", asyncRoute(async (req, res) => {
  const [rows] = await db.query("SELECT m.*, t.descricao AS tipo FROM manutencoes m JOIN tipos_manutencao t ON t.id = m.tipo_id ORDER BY m.data DESC, m.id DESC");
  res.json(rows);
}));

app.post("/api/manutencoes", asyncRoute(async (req, res) => {
  const tipoId = Number(req.body.tipo_id);
  const data = String(req.body.data || "");
  const local = String(req.body.local || "").trim();
  const descricao = String(req.body.descricao || "").trim();
  if (!tipoId || !data || !local) return res.status(400).json({ erro: "Tipo, data e local são obrigatórios." });
  const [tipos] = await db.query("SELECT id FROM tipos_manutencao WHERE id = ?", [tipoId]);
  if (!tipos.length) return res.status(400).json({ erro: "Tipo de manutenção não cadastrado." });
  await db.query("INSERT INTO manutencoes (tipo_id, data, local, descricao) VALUES (?, ?, ?, ?)", [tipoId, data, local, descricao || null]);
  res.status(201).json({ mensagem: "Manutenção registrada com sucesso." });
}));

app.delete("/api/manutencoes/:id", asyncRoute(async (req, res) => {
  const [result] = await db.query("DELETE FROM manutencoes WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: "Manutenção não encontrada." });
  res.json({ mensagem: "Manutenção excluída com sucesso." });
}));

app.use((err, req, res, next) => {
  console.error("Erro na API:", err);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ erro: "Já existe um registro com esses dados." });
  res.status(500).json({ erro: "Ocorreu um erro no servidor. Verifique o terminal." });
});

app.listen(port, () => {
  console.log(`Sistema disponível em http://localhost:${port}`);
});