# Histórico de Desenvolvimento (Development History) - Minuano

Este documento registra a evolução do projeto **Minuano, clima e tempo**, detalhando o que foi feito, as decisões de design, correções de bugs e otimizações realizadas. Ele serve de base de contexto para futuras sessões de desenvolvimento com assistentes de IA ou desenvolvedores humanos.

---

## 📅 Sessão 1 (09 de Julho de 2026)

### 1. Definição do Projeto e Arquitetura
* **Objetivo**: Criar um WebApp de previsão do tempo focado em comparar previsões de múltiplos modelos/fontes meteorológicas, ideal para proprietários de sítios e áreas rurais (que necessitam de precisão cirúrgica de chuva e temperatura para planejamento de atividades).
* **Escopo Tecnológico**: HTML5, CSS3 moderno (Vanilla) e JavaScript puro (ES6+), rodando sem processo de compilação/build complexo, utilizando dependências leves via CDN (Leaflet.js para mapas e Chart.js para gráficos).
* **Nome Definido**: **Minuano, clima e tempo** (em homenagem ao vento frio característico da Serra Gaúcha).
* **Localização Inicial Padrão**: Latitude: `-29.1201`, Longitude: `-50.9686` (Sítio na Serra Gaúcha, RS).

### 2. Implementação das Fontes de Clima (`weather-services.js`)
* **O que foi feito**: Criado um cliente de dados meteorológicos para consultar a API gratuita do **Open-Meteo** e opcionalmente a API do **OpenWeatherMap** (caso fornecida uma chave).
* **Como funciona**:
  * Realiza uma consulta em lote (batch) de múltiplos modelos na Open-Meteo: `best_match` (blended), `ecmwf_ifs025` (Europeu), `gfs_seamless` (Americano) e `icon_seamless` (Alemão).
  * Padroniza as respostas de todas as fontes para uma única estrutura (Data Contract) contendo o clima atual, a previsão diária de 7 dias e previsões horárias.
  * Mapeia os códigos meteorológicos WMO (Organização Meteorológica Mundial) para descrições amigáveis em português e nomes de ícones consistentes.

### 3. Construção do Layout Base (`index.html`)
* **O que foi feito**: Criado o esqueleto do site com marcação semântica.
* **Elementos chaves**:
  * Cabeçalho moderno com barra de pesquisa integrada (com autocompletar de cidades) e controles de GPS, unidade (°C/°F), salvamento de localização favorita ("Meu Sítio") e configurações.
  * Carrossel horizontal de seleção de dias da semana (Hoje + 6 dias).
  * Grid de duas colunas:
    * **Coluna Esquerda**: Card de clima detalhado (temperatura principal, sensação térmica, umidade, vento, pressão e chance de chuva) do dia selecionado e abas para alternar a fonte principal.
    * **Coluna Direita**: Painel do gráfico horários interativo (Chart.js) com checkboxes para ligar/desligar a visualização de cada linha de modelo.
  * Seção do mapa interativo (Leaflet.js) no rodapé.
  * Modal para gerenciar configurações (chaves de API e coordenadas manuais).

### 4. Estilização Premium (`style.css`)
* **O que foi feito**: Criado um tema escuro e moderno baseado no estilo *glassmorphism* (cartões translúcidos com desfoque de fundo e bordas sutis).
* **Diferenciais Estéticos**:
  * Uso da fonte premium *Outfit* do Google Fonts.
  * Efeitos dinâmicos de plano de fundo (`#dynamic-bg`): gradientes e tons que mudam suavemente conforme a condição climática atual da fonte selecionada (limpo, chuvoso ou nublado).
  * Micro-animações e estados de hover nos cartões e botões, incluindo uma flutuação sutil no ícone do cabeçalho.

### 5. Lógica e Interações do App (`app.js`)
* **O que foi feito**: Centralizada a coordenação de estados e eventos.
* **Recursos**:
  * Inicialização inteligente que lê as configurações salvas no `localStorage` (local favorito e chave de API).
  * Renderização de mapa com estilo escuro (CartoDB Dark Matter tiles) usando Leaflet.js.
  * Desenho dinâmico das curvas de temperatura no gráfico Chart.js, ocultando ou exibindo linhas conforme a marcação das caixas de seleção.
  * Inclusão padrão da chave de API do OpenWeatherMap do usuário (`53667e4cb341e3eaef49a0d4e9a868bf`).

### 6. Depuração: Erro no Mapeamento de Chaves da API (Bug Fix)
* **Problema**: O site inicializava, mas caía no bloco catch exibindo "Erro ao carregar dados". 
* **Causa**: Ao fazer a requisição multimodelos na Open-Meteo, descobriu-se que o modelo padrão (`best_match`) também retorna com sufixo (ex: `temperature_2m_best_match` em vez do padrão `temperature_2m`). Isso gerava um valor `undefined` que quebrava o mapeamento do JavaScript com um `TypeError`.
* **Solução**: Atualizado o `weather-services.js` para mapear corretamente todas as chaves contendo os sufixos corretos e ajustados os fallbacks para sempre usarem as chaves do `best_match` caso um modelo específico não possua dados ou falhe regionalmente.

### 7. Otimização para Dispositivos Móveis e Tablets
* **Problema**: A interface ficava muito espremida em celulares na vertical e precisava se portar melhor em tablets. O usuário possui um **Xiaomi 11T Pro** (smartphone) e um **Mi Pad 5 Pro** (tablet).
* **Solução (no `style.css`)**:
  * **Tablets (ex: Mi Pad 5 Pro)**: Em retrato, a grade de duas colunas dobra para coluna única. O cabeçalho foi ajustado para empilhar a busca abaixo da logo e manter os controles organizados.
  * **Celulares (ex: Xiaomi 11T Pro)**: 
    * Ocultamento de texto nos botões de controle do cabeçalho (exibindo apenas ícones) para caber horizontalmente sem quebrar o layout.
    * Redução proporcional do tamanho das fontes (temperatura principal de `80px` para `56px`), do grid de métricas (vento, umidade, etc.) e dos cartões do carrossel horizontal de dias (com scroll touch ativado).
    * Altura do gráfico e do mapa limitadas em celulares para evitar "rolagem infinita", permitindo que o usuário interaja sem ficar preso na tela de mapa.

### 8. Alteração do Tema do Mapa (Modo Claro)
* **Objetivo**: Colocar o mapa de geolocalização no modo claro por preferência do usuário.
* **Solução**: 
  * Em [app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js), alterada a URL dos tiles do Leaflet de `dark_all` para `light_all` (CartoDB Positron - tema claro e limpo).
  * Em [style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css), removidas as sobreposições de cores escuras nos controles do Leaflet (permitindo que voltem ao visual padrão branco e cinza claro) e atualizado o fundo de carregamento do container do mapa para um tom cinza claro (`#f3f4f6`).

### 9. Tema de Mapa Customizável nas Configurações
* **Objetivo**: Adicionar a opção para o usuário escolher se prefere o mapa no modo Claro ou Escuro.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionado um elemento `<select id="map-theme-select">` dentro do modal de configurações para escolha entre Claro e Escuro.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Adicionado estilo `.select-control` para estilizar a caixa de seleção e as classes condicionais `.leaflet-container.dark-theme-map` para reverter e estilizar o mapa e os botões em cores escuras caso o tema escuro seja ativado.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Adicionada a variável `mapTheme` de estado, carregada e salva no `localStorage`. Criada a função `updateMapTheme()` que altera a URL dos tiles e gerencia a classe `.dark-theme-map` no elemento do mapa na hora em que o usuário clica em "Salvar", sem precisar reinstanciar o mapa.

### 10. Correção de Segurança (Secret Scanning)
* **Objetivo**: Remover a chave de API exposta para passar na proteção do GitHub (Push Protection).
* **Solução**: Removida a chave hardcoded no arquivo `app.js` e reescrito o commit raiz (`git commit --amend`) para apagar a credencial do histórico do Git.
