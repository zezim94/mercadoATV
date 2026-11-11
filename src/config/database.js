import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getDB = async () => {
  return await SQLite.openDatabaseAsync("estoque.db");
};

// ---- Migração única: converte datas antigas (UTC) para horário local ----
const MIGRATION_KEY = "@migracao_tz_localtime_v1";

const migrarTimezone = async (db) => {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done === "true") return;

    // As linhas antigas foram gravadas em UTC pelo CURRENT_TIMESTAMP.
    // O modificador 'localtime' do SQLite assume que o valor está em UTC
    // e converte para o fuso do aparelho. Exatamente o que precisamos.
    await db.execAsync(`
      UPDATE movimentacoes
      SET data = datetime(data, 'localtime')
      WHERE data IS NOT NULL;
    `);

    await AsyncStorage.setItem(MIGRATION_KEY, "true");
    console.log("Migração de timezone concluída.");
  } catch (error) {
    console.error("Erro na migração de timezone:", error);
  }
};

export const initDB = async () => {
  try {
    const db = await getDB();

    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS fornecedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cnpj TEXT,
        cep TEXT,
        endereco TEXT,
        numero TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT,
        telefone TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        categoria_id INTEGER,
        preco REAL NOT NULL CHECK (preco >= 0),
        quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
        estoque_minimo INTEGER NOT NULL DEFAULT 5,
        fornecedor_id INTEGER,
        imagem TEXT,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
        quantidade INTEGER NOT NULL CHECK (quantidade > 0),
        observacao TEXT,
        data TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
      );
    `);

    // Converte registros antigos (gravados em UTC) para o fuso do aparelho.
    // Roda uma única vez — controlado pelo AsyncStorage.
    await migrarTimezone(db);

    console.log("Banco de dados validado e pronto!");
  } catch (error) {
    console.error("Erro ao inicializar o banco:", error);
  }
};

// --- FUNÇÕES REUTILIZÁVEIS DE PRODUTOS ---

export const getProdutoById = async (id) => {
  const db = await getDB();
  return await db.getFirstAsync("SELECT * FROM produtos WHERE id = ?", [id]);
};

export const insertProduto = async (produto) => {
  const db = await getDB();
  return await db.runAsync(
    "INSERT INTO produtos (nome, categoria_id, preco, estoque_minimo, fornecedor_id, imagem, quantidade) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      produto.nome,
      produto.categoria_id,
      produto.preco,
      produto.estoque_minimo,
      produto.fornecedor_id,
      produto.imagem,
      produto.quantidade,
    ],
  );
};

export const updateProduto = async (id, produto) => {
  const db = await getDB();
  return await db.runAsync(
    "UPDATE produtos SET nome=?, categoria_id=?, preco=?, estoque_minimo=?, fornecedor_id=?, imagem=?, quantidade=? WHERE id=?",
    [
      produto.nome,
      produto.categoria_id,
      produto.preco,
      produto.estoque_minimo,
      produto.fornecedor_id,
      produto.imagem,
      produto.quantidade,
      id,
    ],
  );
};

export const deleteProduto = async (id) => {
  const db = await getDB();
  return await db.runAsync("DELETE FROM produtos WHERE id = ?", [id]);
};

// --- FUNÇÕES REUTILIZÁVEIS DE FORNECEDORES ---

export const getFornecedores = async (busca = "") => {
  const db = await getDB();
  const query = busca
    ? `SELECT * FROM fornecedores WHERE nome LIKE '%${busca}%' OR cnpj LIKE '%${busca}%' ORDER BY nome ASC`
    : "SELECT * FROM fornecedores ORDER BY nome ASC";
  return await db.getAllAsync(query);
};

export const insertFornecedor = async (forn) => {
  const db = await getDB();
  return await db.runAsync(
    "INSERT INTO fornecedores (nome, cnpj, cep, endereco, numero, bairro, cidade, estado, telefone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      forn.nome,
      forn.cnpj,
      forn.cep,
      forn.endereco,
      forn.numero,
      forn.bairro,
      forn.cidade,
      forn.estado,
      forn.telefone,
      forn.email,
    ],
  );
};

export const updateFornecedor = async (id, forn) => {
  const db = await getDB();
  return await db.runAsync(
    "UPDATE fornecedores SET nome=?, cnpj=?, cep=?, endereco=?, numero=?, bairro=?, cidade=?, estado=?, telefone=?, email=? WHERE id=?",
    [
      forn.nome,
      forn.cnpj,
      forn.cep,
      forn.endereco,
      forn.numero,
      forn.bairro,
      forn.cidade,
      forn.estado,
      forn.telefone,
      forn.email,
      id,
    ],
  );
};

export const deleteFornecedor = async (id) => {
  const db = await getDB();
  return await db.runAsync("DELETE FROM fornecedores WHERE id = ?", [id]);
};

// --- FUNÇÕES REUTILIZÁVEIS DE CATEGORIAS ---

export const getCategorias = async () => {
  const db = await getDB();
  return await db.getAllAsync("SELECT * FROM categorias ORDER BY nome ASC");
};

export const insertCategoria = async (nome) => {
  const db = await getDB();
  return await db.runAsync("INSERT INTO categorias (nome) VALUES (?)", [nome]);
};

// --- FUNÇÕES REUTILIZÁVEIS DE MOVIMENTAÇÕES ---

export const getProdutosParaMovimentacao = async (busca = "") => {
  const db = await getDB();
  const query = busca
    ? `SELECT id, nome, quantidade, preco FROM produtos WHERE nome LIKE '%${busca}%' ORDER BY nome ASC`
    : "SELECT id, nome, quantidade, preco FROM produtos ORDER BY nome ASC";
  return await db.getAllAsync(query);
};

export const registrarMovimentacao = async (
  produtoId,
  tipo,
  qtd,
  observacao,
  quantidadeAtualBanco,
) => {
  const db = await getDB();

  if (tipo === "SAIDA" && quantidadeAtualBanco < qtd) {
    throw new Error(`Estoque Insuficiente: só há ${quantidadeAtualBanco} un.`);
  }

  // Grava a data explicitamente no fuso do aparelho.
  // Funciona tanto em bancos novos (que já têm o DEFAULT) quanto
  // em bancos antigos (onde o DEFAULT antigo é UTC).
  await db.runAsync(
    `INSERT INTO movimentacoes (produto_id, tipo, quantidade, observacao, data)
     VALUES (?, ?, ?, ?, datetime('now', 'localtime'))`,
    [produtoId, tipo, qtd, observacao],
  );

  const operador = tipo === "ENTRADA" ? "+" : "-";
  await db.runAsync(
    `UPDATE produtos SET quantidade = quantidade ${operador} ? WHERE id = ?`,
    [qtd, produtoId],
  );
};

// --- FUNÇÕES DE RELATÓRIOS ---

export const getDashboardStats = async () => {
  const db = await getDB();

  const prodStats = await db.getFirstAsync(`
    SELECT
      COUNT(id) as total_produtos,
      SUM(quantidade * preco) as valor_total,
      SUM(CASE WHEN quantidade <= estoque_minimo THEN 1 ELSE 0 END) as baixo_estoque
    FROM produtos
  `);

  const movStats = await db.getAllAsync(`
    SELECT tipo, SUM(quantidade) as total_qtd
    FROM movimentacoes
    GROUP BY tipo
  `);

  let totalEntradas = 0;
  let totalSaidas = 0;
  movStats.forEach((m) => {
    if (m.tipo === "ENTRADA") totalEntradas = m.total_qtd || 0;
    if (m.tipo === "SAIDA") totalSaidas = m.total_qtd || 0;
  });

  const catStats = await db.getAllAsync(`
    SELECT c.nome, COUNT(p.id) as qtd
    FROM categorias c
    LEFT JOIN produtos p ON c.id = p.categoria_id
    GROUP BY c.id
    HAVING qtd > 0
    ORDER BY qtd DESC
  `);

  const ultimasMovs = await db.getAllAsync(`
    SELECT m.id, m.tipo, m.quantidade, m.data, p.nome as produto_nome
    FROM movimentacoes m
    JOIN produtos p ON m.produto_id = p.id
    ORDER BY m.data DESC
    LIMIT 10
  `);

  return {
    totalProdutos: prodStats.total_produtos || 0,
    valorTotal: prodStats.valor_total || 0,
    baixoEstoque: prodStats.baixo_estoque || 0,
    totalEntradas,
    totalSaidas,
    categorias: catStats,
    ultimasMovimentacoes: ultimasMovs,
  };
};