/* DescarteAqui - interface, mapa e formulário */

// =====================================================
// 1. INTERFACE (menu, rolagem, cards, avisos)
// =====================================================

const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Menu do celular ----------
const botaoMenu = document.getElementById("btn-menu");
const menuCelular = document.getElementById("menu-celular");

function alternarMenu(abrir) {
  menuCelular.hidden = !abrir;
  botaoMenu.classList.toggle("aberto", abrir);
  botaoMenu.setAttribute("aria-expanded", String(abrir));
  botaoMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
}

botaoMenu.addEventListener("click", () => alternarMenu(menuCelular.hidden));
// Tocar em um link fecha o menu
menuCelular.addEventListener("click", (evento) => {
  if (evento.target.closest("a")) alternarMenu(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") alternarMenu(false);
});

// ---------- Barra de progresso + sombra do menu ----------
const topo = document.getElementById("topo");
const barraProgresso = document.getElementById("progresso-rolagem");

function atualizarProgresso() {
  const maximo = document.documentElement.scrollHeight - window.innerHeight;
  const fracao = maximo > 0 ? window.scrollY / maximo : 0;
  barraProgresso.style.transform = `scaleX(${Math.min(fracao, 1)})`;
  topo.classList.toggle("rolou", window.scrollY > 8);
}
window.addEventListener("scroll", atualizarProgresso, { passive: true });
window.addEventListener("resize", atualizarProgresso);
atualizarProgresso();

// ---------- Destaca no menu a seção que está na tela ----------
const linksMenu = [...document.querySelectorAll(".link-menu")];

if ("IntersectionObserver" in window) {
  const observadorSecoes = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        linksMenu.forEach((link) =>
          link.classList.toggle("ativo", link.getAttribute("href") === `#${entrada.target.id}`)
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px" } // conta a seção que cruza o meio da tela
  );
  document.querySelectorAll("section[id]").forEach((secao) => observadorSecoes.observe(secao));

  // ---------- Cards aparecem em sequência ao chegar neles ----------
  const cards = [...document.querySelectorAll("#grade-cards .card-educacao")];
  if (!semMovimento && cards.length) {
    cards.forEach((card) => card.classList.add("espera"));
    const observadorCards = new IntersectionObserver(
      (entradas, observador) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        cards.forEach((card, i) => {
          card.style.transitionDelay = `${i * 80}ms`;
          card.classList.replace("espera", "visivel");
        });
        observador.disconnect();
      },
      { threshold: 0.1 }
    );
    observadorCards.observe(document.getElementById("grade-cards"));
  }
}

// ---------- Aviso flutuante ----------
const aviso = document.getElementById("aviso");
let temporizadorAviso = null;

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.classList.add("visivel");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove("visivel"), 4500);
}

// ---------- Números que "contam" até o valor ----------
function contarAte(elemento, alvo) {
  const inicio = Number(elemento.textContent) || 0;
  if (semMovimento || inicio === alvo) {
    elemento.textContent = alvo;
    return;
  }
  const duracao = 900;
  const t0 = performance.now();
  function passo(agora) {
    const t = Math.min((agora - t0) / duracao, 1);
    const suave = 1 - Math.pow(1 - t, 3); // desacelera no fim
    elemento.textContent = Math.round(inicio + (alvo - inicio) * suave);
    if (t < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

// =====================================================
// 2. MAPA
// =====================================================

// Centro inicial (mesma região dos exemplos do banco). Altere se quiser.
const CENTRO_INICIAL = [-23.4543, -46.5337];

const mapa = L.map("mapa-ecopontos").setView(CENTRO_INICIAL, 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

let marcadorTemporario = null; // pino de "escolha o local" do formulário
let marcadorVoce = null;       // posição do visitante ("perto de mim")
let linhaVoce = null;          // linha entre o visitante e o ecoponto mais perto
const pinos = [];              // { dados, marcador } de cada ecoponto

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

// Pino desenhado em CSS, na cor do volume. Com espaço sobrando, ganha a "onda".
function iconePino(cor, comOnda = false, classeExtra = "") {
  const onda = comOnda ? `<span class="pino-onda" style="--cor:${cor}"></span>` : "";
  return L.divIcon({
    className: "pino-icone",
    html: `${onda}<span class="pino ${classeExtra}" style="--cor:${cor}"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 36],
    popupAnchor: [0, -34],
    tooltipAnchor: [14, -20],
  });
}

function montarPopup(e) {
  const cor = corDoVolume(e.volume_preenchido);
  const materiais = e.materiais
    .map((m) => `<span class="popup-tag">${escapar(m)}</span>`)
    .join("");
  const rota = `https://www.google.com/maps/dir/?api=1&destination=${e.latitude},${e.longitude}`;

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
        <div class="barra-preenchida" data-pct="${e.volume_preenchido}"
             style="width:${e.volume_preenchido}%; background:${cor}"></div>
      </div>
      <a class="popup-rota" href="${rota}" target="_blank" rel="noopener">Como chegar</a>
    </div>`;
}

function adicionarPino(ecoponto) {
  const cor = corDoVolume(ecoponto.volume_preenchido);
  const marcador = L.marker([ecoponto.latitude, ecoponto.longitude], {
    icon: iconePino(cor, ecoponto.volume_preenchido < 50),
    title: ecoponto.nome,
  })
    .addTo(mapa)
    .bindPopup(montarPopup(ecoponto), { maxWidth: 280 });

  pinos.push({ dados: ecoponto, marcador });
  return marcador;
}

// A barra do popup enche do zero toda vez que ele abre
mapa.on("popupopen", (evento) => {
  const barra = evento.popup.getElement().querySelector(".barra-preenchida");
  if (!barra || semMovimento) return;
  barra.style.width = "0%";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => (barra.style.width = `${barra.dataset.pct}%`))
  );
});

// ---------- Filtro por material ----------
const statusMapa = document.getElementById("mapa-status");
const filtroMaterial = document.getElementById("filtro-material");

function pinosVisiveis() {
  const material = filtroMaterial.value;
  return pinos.filter((p) => !material || p.dados.materiais.includes(material));
}

// Monta as opções do filtro com os materiais que existem no banco
function atualizarOpcoesFiltro() {
  const escolhido = filtroMaterial.value;
  const materiais = [...new Set(pinos.flatMap((p) => p.dados.materiais))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  filtroMaterial.length = 1; // mantém só "Todos os materiais"
  materiais.forEach((m) => filtroMaterial.add(new Option(m, m)));
  filtroMaterial.value = materiais.includes(escolhido) ? escolhido : "";
}

function atualizarStatus() {
  const total = pinos.length;
  const visiveis = pinosVisiveis().length;
  const plural = (n) => (n === 1 ? "Ecoponto" : "Ecopontos");

  if (total === 0) {
    statusMapa.textContent = "Nenhum Ecoponto cadastrado ainda. Cadastre o primeiro no formulário abaixo.";
  } else if (filtroMaterial.value) {
    statusMapa.textContent =
      `${visiveis} de ${total} ${plural(total)} ` +
      `${visiveis === 1 ? "aceita" : "aceitam"} ${filtroMaterial.value}.`;
  } else {
    statusMapa.textContent = `${total} ${plural(total)} no mapa.`;
  }
}

function aplicarFiltro(enquadrar = true) {
  const visiveis = pinosVisiveis();
  pinos.forEach((p) => {
    if (visiveis.includes(p)) p.marcador.addTo(mapa);
    else mapa.removeLayer(p.marcador);
  });
  atualizarStatus();

  // Ajusta o zoom para mostrar todos os pinos do filtro
  if (enquadrar && visiveis.length) {
    mapa.fitBounds(L.latLngBounds(visiveis.map((p) => p.marcador.getLatLng())), {
      padding: [60, 60],
      maxZoom: 15,
    });
  }
}

filtroMaterial.addEventListener("change", () => aplicarFiltro());

// ---------- Painel de números do topo ----------
function atualizarPainel() {
  const total = pinos.length;
  const somaVolume = pinos.reduce((soma, p) => soma + p.dados.volume_preenchido, 0);
  const livre = total ? Math.round(100 - somaVolume / total) : 0;
  const materiais = new Set(pinos.flatMap((p) => p.dados.materiais)).size;

  contarAte(document.getElementById("num-ecopontos"), total);
  contarAte(document.getElementById("num-livre"), livre);
  contarAte(document.getElementById("num-materiais"), materiais);
}

// ---------- Carregar ecopontos (GET) ----------
async function carregarEcopontos() {
  try {
    const resposta = await fetch("/api/ecopontos");
    if (!resposta.ok) throw new Error();
    const lista = await resposta.json();
    lista.forEach(adicionarPino);
    atualizarOpcoesFiltro();
    aplicarFiltro(lista.length > 1); // com 1 pino só, mantém o zoom inicial
    atualizarPainel();
  } catch {
    statusMapa.textContent =
      "Não foi possível carregar os Ecopontos. Recarregue a página em alguns instantes.";
  }
}

// ---------- Achar o Ecoponto mais perto ----------
const botaoPerto = document.getElementById("btn-perto");
const TEXTO_BOTAO_PERTO = botaoPerto.textContent;

function formatarDistancia(metros) {
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

function mostrarMaisPerto(posicao) {
  const voce = L.latLng(posicao.coords.latitude, posicao.coords.longitude);

  if (marcadorVoce) marcadorVoce.setLatLng(voce);
  else {
    marcadorVoce = L.circleMarker(voce, {
      radius: 9, color: "#fff", weight: 3, fillColor: "#1d6fd1", fillOpacity: 1,
    }).addTo(mapa).bindTooltip("Você está aqui");
  }

  const visiveis = pinosVisiveis();
  if (!visiveis.length) {
    mapa.flyTo(voce, 14);
    statusMapa.textContent = "Ainda não há Ecopontos para comparar com a sua localização.";
    return;
  }

  // Menor distância em linha reta entre você e cada pino visível
  let maisPerto = visiveis[0];
  let menor = Infinity;
  visiveis.forEach((p) => {
    const d = mapa.distance(voce, p.marcador.getLatLng());
    if (d < menor) { menor = d; maisPerto = p; }
  });

  // Linha tracejada ligando você ao Ecoponto
  if (linhaVoce) mapa.removeLayer(linhaVoce);
  linhaVoce = L.polyline([voce, maisPerto.marcador.getLatLng()], {
    color: "#1d6fd1", weight: 3, dashArray: "6 8", interactive: false,
  }).addTo(mapa);

  // Enquadra os dois pontos, reservando espaço em cima para o popup caber.
  // Sem animação: assim o popup abre já na posição final.
  const folgaPopup = Math.min(290, mapa.getSize().y * 0.5);
  mapa.fitBounds(L.latLngBounds([voce, maisPerto.marcador.getLatLng()]), {
    paddingTopLeft: [50, folgaPopup],
    paddingBottomRight: [50, 60],
    maxZoom: 16,
    animate: false,
  });
  maisPerto.marcador.openPopup();
  statusMapa.textContent =
    `O mais perto de você é ${maisPerto.dados.nome}, a ${formatarDistancia(menor)} em linha reta.`;
}

botaoPerto.addEventListener("click", () => {
  if (!navigator.geolocation) {
    statusMapa.textContent = "Este navegador não informa a localização. Procure sua região no mapa.";
    return;
  }
  botaoPerto.disabled = true;
  botaoPerto.textContent = "Localizando...";

  navigator.geolocation.getCurrentPosition(
    (posicao) => {
      mostrarMaisPerto(posicao);
      botaoPerto.disabled = false;
      botaoPerto.textContent = TEXTO_BOTAO_PERTO;
    },
    (erro) => {
      statusMapa.textContent =
        erro.code === erro.PERMISSION_DENIED
          ? "Localização não permitida. Libere o acesso no navegador ou procure sua região no mapa."
          : "Não foi possível obter sua localização agora. Tente de novo ou procure sua região no mapa.";
      botaoPerto.disabled = false;
      botaoPerto.textContent = TEXTO_BOTAO_PERTO;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---------- Local escolhido (clique, busca ou arrastar o pino) ----------
const campoLat = document.getElementById("latitude");
const campoLng = document.getElementById("longitude");

function definirLocal(latlng) {
  campoLat.value = latlng.lat.toFixed(6);
  campoLng.value = latlng.lng.toFixed(6);

  if (marcadorTemporario) {
    marcadorTemporario.setLatLng(latlng);
  } else {
    marcadorTemporario = L.marker(latlng, {
      icon: iconePino("#a67c52", false, "novo"),
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(mapa);
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

// =====================================================
// 3. FORMULÁRIO
// =====================================================

const form = document.getElementById("form-ecoponto");
const mensagem = document.getElementById("form-mensagem");
const sliderVolume = document.getElementById("volume_preenchido");
const rotuloVolume = document.getElementById("volume-valor");
const previaVolume = document.getElementById("volume-previa");

// Número e barra de prévia acompanham o slider (mesmas cores do mapa)
function atualizarPreviaVolume() {
  const pct = Number(sliderVolume.value);
  rotuloVolume.textContent = pct;
  previaVolume.style.width = `${pct}%`;
  previaVolume.style.background = corDoVolume(pct);
}
sliderVolume.addEventListener("input", atualizarPreviaVolume);

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

    // Sucesso: pino novo no mapa, números atualizados, formulário limpo
    const novoMarcador = adicionarPino(corpo);
    filtroMaterial.value = ""; // garante que o pino novo não fique escondido pelo filtro
    atualizarOpcoesFiltro();
    aplicarFiltro(false);
    atualizarPainel();

    if (marcadorTemporario) {
      mapa.removeLayer(marcadorTemporario);
      marcadorTemporario = null;
    }
    mapa.flyTo([corpo.latitude, corpo.longitude], 15);
    mapa.once("moveend", () => novoMarcador.openPopup());

    form.reset();
    atualizarPreviaVolume();
    mostrarBusca("");
    mostrarMensagem("Ecoponto cadastrado com sucesso! Obrigado por ajudar 💚", true);
    mostrarAviso("Ecoponto cadastrado. Ele já está no mapa 💚");
    document.getElementById("mapa").scrollIntoView({ behavior: "smooth" });
  } catch {
    mostrarMensagem("Falha de conexão com o servidor. Tente novamente.", false);
  } finally {
    botao.disabled = false;
    botao.textContent = "Cadastrar Ecoponto";
  }
});

carregarEcopontos();
