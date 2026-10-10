"""
EcoPontos - API + servidor da página.
Rotas:
  GET  /               -> página principal
  GET  /api/ecopontos  -> lista os ecopontos (alimenta o mapa)
  POST /api/ecopontos  -> cadastra um novo ecoponto
"""
import json
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ecopontos.db"

TIPOS_VALIDOS = {"Público", "Privado"}

app = Flask(__name__)


# ---------- Banco de dados ----------

def get_db():
    """Abre uma conexão por requisição (reaproveitada via flask.g)."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row  # acessa colunas por nome
    return g.db


@app.teardown_appcontext
def close_db(_erro):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Cria a tabela (se não existir) e insere exemplos na 1ª execução."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ecopontos (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                nome               TEXT    NOT NULL,
                endereco           TEXT    NOT NULL,
                horario            TEXT    NOT NULL,
                materiais          TEXT    NOT NULL,  -- lista em JSON
                volume_preenchido  INTEGER NOT NULL DEFAULT 0
                                   CHECK (volume_preenchido BETWEEN 0 AND 100),
                tipo               TEXT    NOT NULL
                                   CHECK (tipo IN ('Público', 'Privado')),
                latitude           REAL    NOT NULL,
                longitude          REAL    NOT NULL,
                criado_em          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        total = conn.execute("SELECT COUNT(*) FROM ecopontos").fetchone()[0]
        if total == 0:
            # Dados de EXEMPLO (fictícios) só para o mapa não nascer vazio.
            # Troque ou apague quando tiver ecopontos reais.
            exemplos = [
                ("Ecoponto Exemplo Centro", "Rua Exemplo, 100 - Centro",
                 "Seg a Sex, 8h às 17h",
                 ["Entulho", "Madeira", "Podas"], 35, "Público",
                 -23.4543, -46.5337),
                ("Ecoponto Exemplo Bairro", "Av. Exemplo, 500 - Jardim",
                 "Seg a Sáb, 7h às 16h",
                 ["Plástico", "Metal", "Vidro", "Papel"], 80, "Privado",
                 -23.4620, -46.5200),
            ]
            for nome, end, hor, mats, vol, tipo, lat, lng in exemplos:
                conn.execute(
                    """INSERT INTO ecopontos
                       (nome, endereco, horario, materiais,
                        volume_preenchido, tipo, latitude, longitude)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (nome, end, hor, json.dumps(mats, ensure_ascii=False),
                     vol, tipo, lat, lng),
                )


def linha_para_dict(linha):
    """Converte uma linha do banco em dict pronto para JSON."""
    d = dict(linha)
    d["materiais"] = json.loads(d["materiais"])
    return d


# ---------- Validação ----------

def validar(dados):
    """Retorna (dados_limpos, erros). Erros é um dict campo -> mensagem."""
    erros = {}
    limpos = {}

    for campo in ("nome", "endereco", "horario"):
        valor = str(dados.get(campo, "")).strip()
        if not valor:
            erros[campo] = "Campo obrigatório."
        elif len(valor) > 150:
            erros[campo] = "Máximo de 150 caracteres."
        limpos[campo] = valor

    materiais = dados.get("materiais")
    if not isinstance(materiais, list) or not materiais:
        erros["materiais"] = "Selecione pelo menos um material."
    else:
        limpos["materiais"] = [str(m).strip() for m in materiais if str(m).strip()]

    if dados.get("tipo") not in TIPOS_VALIDOS:
        erros["tipo"] = "Escolha 'Público' ou 'Privado'."
    limpos["tipo"] = dados.get("tipo")

    try:
        volume = int(dados.get("volume_preenchido", 0))
        if not 0 <= volume <= 100:
            raise ValueError
        limpos["volume_preenchido"] = volume
    except (TypeError, ValueError):
        erros["volume_preenchido"] = "Informe um número de 0 a 100."

    try:
        lat = float(dados.get("latitude"))
        lng = float(dados.get("longitude"))
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError
        limpos["latitude"], limpos["longitude"] = lat, lng
    except (TypeError, ValueError):
        erros["localizacao"] = "Marque o local do ecoponto no mapa."

    return limpos, erros


# ---------- Rotas ----------

@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/ecopontos")
def listar_ecopontos():
    linhas = get_db().execute(
        "SELECT * FROM ecopontos ORDER BY id DESC"
    ).fetchall()
    return jsonify([linha_para_dict(l) for l in linhas])


@app.post("/api/ecopontos")
def criar_ecoponto():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie um JSON válido."}), 400

    limpos, erros = validar(dados)
    if erros:
        return jsonify({"erro": "Dados inválidos.", "campos": erros}), 400

    db = get_db()
    cursor = db.execute(
        """INSERT INTO ecopontos
           (nome, endereco, horario, materiais,
            volume_preenchido, tipo, latitude, longitude)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (limpos["nome"], limpos["endereco"], limpos["horario"],
         json.dumps(limpos["materiais"], ensure_ascii=False),
         limpos["volume_preenchido"], limpos["tipo"],
         limpos["latitude"], limpos["longitude"]),
    )
    db.commit()

    novo = db.execute(
        "SELECT * FROM ecopontos WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return jsonify(linha_para_dict(novo)), 201


if __name__ == "__main__":
    init_db()
    app.run(debug=True)