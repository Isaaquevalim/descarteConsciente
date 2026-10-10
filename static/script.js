/* EcoPontos - lógica do mapa e do formulário */

// ---------- Mapa ----------
// Centro inicial (mesma região dos exemplos do banco). Altere se quiser.
const CENTRO_INICIAL = [-23.4543, -46.5337];

const mapa = L.map("mapa-ecopontos").setView(CENTRO_INICIAL, 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

let marcadorTemporario = null; // pino de "escolha o local" do formulário

// ---------- Utilitários ----------

// Evita HTML malicioso vindo do banco (XSS) ao montar o popup
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}

// Verde (< 50%), amarelo (< 80%), vermelho (>= 80%)
function corDoVolume(pct) {
  if (pct < 50) return "#4a8a3c";
  if (pct < 80) return "#d9a21b";
  return "#c0392b";
}

function montarPopup(e) {
  const cor = corDoVolume(e.volume_preenchido);
  const materiais = e.materiais
    .map((m) => `<span class="popup-tag">${escapar(m)}</span>`)
    .join("");

  return `
    <div class="popup-eco">
      <h3>${escapar(e.nome)}</h3>
      <p><strong>📍 Endereço:</strong> ${escapar(e.endereco)}</p>
      <p><strong>🕒 Horário:</strong> ${escapar(e.horario)}</p>
      <p><strong>🏷️ Tipo:</strong> ${escapar(e.tipo)}</p>
      <p><strong>♻️ Aceita:</strong></p>
      <div class="popup-tags">${materiais}</div>
      <p class="mt-2"><strong>Volume preenchido: ${e.volume_preenchido}%</strong></p>
      <div class="barra-fundo" role="progressbar"
           aria-valuenow="${e.volume_preenchido}" aria-valuemin="0" aria-valuemax="100">
        <div class="barra-preenchida"
             style="width:${e.volume_preenchido}%; background:${cor}"></div>
      </div>
    </div>`;
}

function adicionarPino(ecoponto) {
  L.marker([ecoponto.latitude, ecoponto.longitude])
    .addTo(mapa)
    .bindPopup(montarPopup(ecoponto), { maxWidth: 280 });
}

// ---------- Carregar ecopontos (GET) ----------
const statusMapa = document.getElementById("mapa-status");
let totalEcopontos = 0;

function atualizarStatus() {
  statusMapa.textContent =
    totalEcopontos === 0
      ? "Nenhum Ecoponto cadastrado ainda."
      : `${totalEcopontos} Ecoponto(s) no mapa.`;
}

async function carregarEcopontos() {
  try {
    const resposta = await fetch("/api/ecopontos");
    if (!resposta.ok) throw new Error();
    const lista = await resposta.json();
    lista.forEach(adicionarPino);
    totalEcopontos = lista.length;
    atualizarStatus();
  } catch {
    statusMapa.textContent =
      "Não foi possível carregar os Ecopontos. Verifique se o servidor está rodando.";
  }
}

// ---------- Local escolhido (clique, busca ou arrastar o pino) ----------
const campoLat = document.getElementById("latitude");
const campoLng = document.getElementById("longitude");

function definirLocal(latlng) {
  campoLat.value = latlng.lat.toFixed(6);
  campoLng.value = latlng.lng.toFixed(6);

  if (marcadorTemporario) {
    marcadorTemporario.setLatLng(latlng);
  } else {
    marcadorTemporario = L.marker(latlng, { opacity: 0.8, draggable: true }).addTo(mapa);
    // Arrastar o pino atualiza lat/lng (ajuste fino)
    marcadorTemporario.on("dragend", () => definirLocal(marcadorTemporario.getLatLng()));
  }
  marcadorTemporario
    .bindTooltip("Local do novo Ecoponto (arraste para ajustar)")
    .openTooltip();
}

mapa.on("click", (evento) => definirLocal(evento.latlng));

// ---------- Busca de endereço (Nominatim / OpenStreetMap) ----------
const campoEndereco = document.getElementById("endereco");
const botaoBuscar = document.getElementById("btn-buscar-endereco");
const mensagemBusca = document.getElementById("busca-mensagem");

function mostrarBusca(html, erro = false) {
  // Só recebe textos fixos nossos (nunca texto digitado pelo usuário)
  mensagemBusca.innerHTML = html;
  mensagemBusca.className = "mt-1 text-sm " + (erro ? "text-red-700" : "text-floresta-600");
}

async function buscarEndereco() {
  const consulta = campoEndereco.value.trim();
  if (consulta.length < 4) {
    mostrarBusca("Digite o endereço (rua, número, bairro e cidade).", true);
    return;
  }

  botaoBuscar.disabled = true;
  botaoBuscar.textContent = "Buscando...";
  mostrarBusca("");

  try {
    const limites = mapa.getBounds(); // prioriza resultados perto da área do mapa
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({
      q: consulta,
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      "accept-language": "pt-BR",
      viewbox: [limites.getWest(), limites.getNorth(), limites.getEast(), limites.getSouth()].join(","),
      bounded: "0",
    });

    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error();
    const resultados = await resposta.json();

    if (resultados.length === 0) {
      mostrarBusca("Endereço não encontrado. Inclua bairro e cidade, ou clique direto no mapa.", true);
      return;
    }

    const posicao = L.latLng(parseFloat(resultados[0].lat), parseFloat(resultados[0].lon));
    definirLocal(posicao);
    mapa.flyTo(posicao, 17);
    mostrarBusca('Local marcado! Confira e arraste o pino se precisar. <a href="#mapa" class="underline font-semibold">Ver no mapa ↑</a>');
  } catch {
    mostrarBusca("Não foi possível buscar agora. Clique direto no mapa para marcar o local.", true);
  } finally {
    botaoBuscar.disabled = false;
    botaoBuscar.textContent = "🔍 Buscar no mapa";
  }
}

botaoBuscar.addEventListener("click", buscarEndereco);

// Enter no campo de endereço busca, em vez de enviar o formulário
campoEndereco.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    buscarEndereco();
  }
});

// ---------- Formulário ----------
const form = document.getElementById("form-ecoponto");
const mensagem = document.getElementById("form-mensagem");
const sliderVolume = document.getElementById("volume_preenchido");
const rotuloVolume = document.getElementById("volume-valor");

sliderVolume.addEventListener("input", () => {
  rotuloVolume.textContent = sliderVolume.value;
});

function mostrarMensagem(texto, sucesso) {
  mensagem.textContent = texto;
  mensagem.className =
    "text-sm font-medium " + (sucesso ? "text-floresta-600" : "text-red-700");
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarMensagem("", true);

  const materiais = [
    ...form.querySelectorAll('input[name="materiais"]:checked'),
  ].map((c) => c.value);

  const dados = {
    nome: form.nome.value,
    endereco: form.endereco.value,
    horario: form.horario.value,
    materiais,
    tipo: form.tipo.value,
    volume_preenchido: Number(sliderVolume.value),
    latitude: campoLat.value,
    longitude: campoLng.value,
  };

  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const resposta = await fetch("/api/ecopontos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      // Junta as mensagens de erro de cada campo vindas do servidor
      const detalhes = corpo.campos ? Object.values(corpo.campos).join(" ") : "";
      mostrarMensagem(`${corpo.erro || "Erro ao cadastrar."} ${detalhes}`, false);
      return;
    }

    // Sucesso: pino novo no mapa, limpa formulário
    adicionarPino(corpo);
    totalEcopontos += 1;
    atualizarStatus();
    mapa.flyTo([corpo.latitude, corpo.longitude], 15);

    if (marcadorTemporario) {
      mapa.removeLayer(marcadorTemporario);
      marcadorTemporario = null;
    }
    form.reset();
    mostrarBusca("");
    rotuloVolume.textContent = "0";
    mostrarMensagem("Ecoponto cadastrado com sucesso! Obrigado por ajudar 💚", true);
    document.getElementById("mapa").scrollIntoView({ behavior: "smooth" });
  } catch {
    mostrarMensagem("Falha de conexão com o servidor. Tente novamente.", false);
  } finally {
    botao.disabled = false;
    botao.textContent = "Cadastrar Ecoponto";
  }
});

carregarEcopontos();