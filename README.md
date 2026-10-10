# 🌱 EcoPontos

> Plataforma web de **educação ambiental** e **mapa colaborativo de Ecopontos**, criada para ensinar a população a descartar corretamente entulho, madeira, plásticos e outros resíduos, e para facilitar a localização de pontos de descarte.

Projeto desenvolvido como **itinerário extensionista universitário**, com foco em impacto social e sustentabilidade.


## 📑 Sumário

- [Sobre o projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura de pastas](#-estrutura-de-pastas)
- [Como rodar localmente](#-como-rodar-localmente)
- [Documentação da API](#-documentação-da-api)
- [Banco de dados](#-banco-de-dados)
- [Personalização](#-personalização)
- [Hospedagem gratuita](#-hospedagem-gratuita)
- [Segurança](#-segurança)
- [Ideias para o futuro](#-ideias-para-o-futuro)
- [Autoria e licença](#-autoria-e-licença)

---

## 🌍 Sobre o projeto

O descarte irregular de resíduos causa alagamentos, focos de doenças e poluição. Muitas vezes, a pessoa quer descartar certo, mas **não sabe como** nem **onde**.

O EcoPontos resolve isso em duas frentes:

1. **Informar:** cards com orientações claras de descarte para cada tipo de material.
2. **Localizar:** um mapa interativo com Ecopontos cadastrados pela própria comunidade, mostrando horário, materiais aceitos e quanto espaço ainda há disponível.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---|---|
| 🎯 **Hero imersivo** | Apresentação do projeto com espaço para a logo e chamadas para o mapa e para a parte educativa. |
| 📚 **Educação ambiental** | Cards com instruções de descarte para entulho, madeira, plásticos e outros materiais. |
| 🗺️ **Mapa interativo** | Mapa com Leaflet + OpenStreetMap exibindo os Ecopontos salvos no banco de dados. |
| 💬 **Popup informativo** | Nome, endereço, horário, materiais aceitos, tipo (Público/Privado) e **barra de volume preenchido** (verde, amarela ou vermelha). |
| 📝 **Cadastro colaborativo** | Formulário que envia os dados via `fetch` para a API em Python. O local é marcado com um clique no mapa. |
| ♻️ **20 tipos de materiais** | Entulho, madeira, plástico, metal, vidro, papel e papelão, podas, eletrônicos, óleo de cozinha, pilhas e baterias, lâmpadas, pneus, móveis, colchões, roupas e têxteis, isopor, gesso, tintas e solventes, embalagens longa vida e eletrodomésticos. |
| ✅ **Validação dupla** | Os dados são validados no servidor e o banco aplica regras (`CHECK`) de integridade. |
| 📱 **Responsivo** | Layout adaptado para celular, tablet e desktop. |

---

## 🛠️ Tecnologias

**Front-end**
- HTML5, CSS3 e JavaScript (Vanilla)
- [Tailwind CSS](https://tailwindcss.com/) via CDN
- [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) (100% gratuito)
- Fontes: Fraunces e Inter (Google Fonts)

**Back-end**
- Python 3 + [Flask](https://flask.palletsprojects.com/)
- SQLite (módulo `sqlite3`, já incluso no Python)

---

## 📂 Estrutura de pastas

```
ecopontos/
├── app.py               # API + servidor da página (Flask)
├── requirements.txt     # Dependências Python
├── ecopontos.db         # Banco SQLite (criado automaticamente)
├── .gitignore
├── README.md
├── templates/
│   └── index.html       # Página principal
└── static/
    ├── script.js        # Mapa, popups e envio do formulário
    ├── style.css        # Estilos complementares ao Tailwind
    └── img/             # (crie) logos e imagens do projeto
```

---

## 🚀 Como rodar localmente

### Pré-requisitos

- [Python 3.10+](https://www.python.org/downloads/)
  - No Windows, marque **"Add python.exe to PATH"** durante a instalação.
- [Git](https://git-scm.com/) (opcional, para clonar o repositório)

### 1. Obter o projeto

```bash
git clone https://github.com/Isaaquevalim/descarteConsciente.git
cd descarte
```

### 2. Criar e ativar o ambiente virtual

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

> Se aparecer erro de "execução de scripts desabilitada", rode uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Windows (CMD):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Linux / macOS / Git Bash:**
```bash
python3 -m venv venv
source venv/bin/activate        # no Git Bash: source venv/Scripts/activate
```

Quando o ambiente estiver ativo, o terminal mostra `(venv)` no início da linha.

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Executar

```bash
python app.py
```

Abra **http://127.0.0.1:5000** no navegador. 🎉

Na primeira execução, o arquivo `ecopontos.db` é criado sozinho, com 2 Ecopontos **fictícios** de exemplo.

---

## 🔌 Documentação da API

### `GET /api/ecopontos`

Lista todos os Ecopontos (do mais recente para o mais antigo).

**Resposta `200 OK`:**
```json
[
  {
    "id": 1,
    "nome": "Ecoponto Exemplo Centro",
    "endereco": "Rua Exemplo, 100 - Centro",
    "horario": "Seg a Sex, 8h às 17h",
    "materiais": ["Entulho", "Madeira", "Podas"],
    "volume_preenchido": 35,
    "tipo": "Público",
    "latitude": -23.4543,
    "longitude": -46.5337,
    "criado_em": "2026-10-09 22:00:00"
  }
]
```

### `POST /api/ecopontos`

Cadastra um novo Ecoponto.

**Corpo da requisição (JSON):**
```json
{
  "nome": "Ecoponto Vila Nova",
  "endereco": "Rua das Flores, 50 - Vila Nova",
  "horario": "Seg a Sáb, 7h às 16h",
  "materiais": ["Plástico", "Vidro", "Papel e Papelão"],
  "tipo": "Público",
  "volume_preenchido": 20,
  "latitude": -23.45,
  "longitude": -46.53
}
```

| Campo | Regra |
|---|---|
| `nome`, `endereco`, `horario` | Texto obrigatório, até 150 caracteres |
| `materiais` | Lista com pelo menos 1 item |
| `tipo` | `"Público"` ou `"Privado"` |
| `volume_preenchido` | Inteiro de 0 a 100 |
| `latitude`, `longitude` | Coordenadas válidas (-90 a 90 e -180 a 180) |

**Respostas:**
- `201 Created`: retorna o Ecoponto criado.
- `400 Bad Request`: JSON inválido ou campos incorretos.

```json
{
  "erro": "Dados inválidos.",
  "campos": { "materiais": "Selecione pelo menos um material." }
}
```

---

## 🗄️ Banco de dados

Tabela `ecopontos` (criada automaticamente por `init_db()`):

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | INTEGER | Chave primária, autoincremento |
| `nome` | TEXT | Obrigatório |
| `endereco` | TEXT | Obrigatório |
| `horario` | TEXT | Obrigatório |
| `materiais` | TEXT | Lista salva em JSON |
| `volume_preenchido` | INTEGER | `CHECK` entre 0 e 100 |
| `tipo` | TEXT | `CHECK` em ('Público', 'Privado') |
| `latitude` / `longitude` | REAL | Posição no mapa |
| `criado_em` | TEXT | Data de cadastro (automática) |

**Remover os exemplos:** apague a lista `exemplos` em `init_db()` (no `app.py`) e exclua o arquivo `ecopontos.db`. Ele será recriado vazio.

---

## 🎨 Personalização

### Logos e imagens

No `templates/index.html`, procure por **`INSIRA AQUI`**. Cada trecho tem um comentário grande indicando o que colocar e o tamanho recomendado:

- favicon;
- logo do menu;
- logo principal do hero;
- imagem de fundo do hero (sugestão: [Unsplash](https://unsplash.com/), busque "recycling" ou "sustainability");
- imagens dos cards educativos;
- logo da universidade no rodapé.

### Novos materiais aceitos

No formulário (`index.html`), copie uma linha como esta e altere o `value` e o texto:

```html
<label class="chip"><input type="checkbox" name="materiais" value="Novo Material" /> Novo Material</label>
```

Não é preciso alterar o back-end.

### Cores

A paleta (verdes, tons de terra e off-white) fica no `tailwind.config` dentro do `<head>` do `index.html`.

### Centro do mapa

No `static/script.js`, altere a constante `CENTRO_INICIAL` para a cidade do seu projeto.

---

## 🔒 Segurança

- Textos exibidos nos popups passam por escape de HTML (proteção contra XSS).
- Consultas SQL usam parâmetros (`?`), evitando SQL Injection.
- Todos os dados são revalidados no servidor, mesmo que já validados no navegador.
- Em produção, o modo `debug` **não** é ativado (ele só liga ao rodar `python app.py` localmente).

---

## 🔭 Ideias para o futuro

- [ ] Busca por endereço no mapa (geocodificação)
- [ ] Botão "Usar minha localização"
- [ ] Painel para atualizar o volume preenchido de um Ecoponto
- [ ] Filtro de Ecopontos por tipo de material
- [ ] Moderação de novos cadastros antes de aparecerem no mapa
- [ ] Mais cards educativos (óleo, pilhas, eletrônicos, pneus)

---

## 👥 Autoria e licença

**Autores:** Isaque Valim, Ryan Catão, Igor de Campos, Vinícius Vieira, Gabriel Nascimento, Nilson Francisco, Gabriel José Couto, Eduardo Felipe, João Victor Andrade, Pedro da Costa Aguiar
**Instituição:** Centro Universitário Braz Cubas
**Curso / Disciplina:** Itinerário Extensionista II
**Orientação:** Janaina Binhame de Souza Oliveira

Mapa por © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

Licença: [ ESCOLHA UMA LICENÇA, por exemplo MIT, e adicione o arquivo LICENSE ]

---

<p align="center">Feito com 💚 para uma cidade mais limpa.</p>
