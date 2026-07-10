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

### 11. Transição 100% Keyless (Remoção do OpenWeatherMap)
* **Objetivo**: Tornar a aplicação totalmente independente de chaves de API externas, garantindo que o código seja 100% seguro para hospedagem pública no Git, sem chaves e plug-and-play para qualquer usuário.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Removidos a aba `tab-openweathermap` do seletor, o checkbox `toggle-owm` do gráfico e a seção "Chaves de API Opcionais" no modal de configurações.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Removidas regras inativas de estilos relacionadas ao OpenWeatherMap (`.owm-color`).
  * **Serviços ([weather-services.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/weather-services.js))**: Excluídas as funções `fetchOpenWeatherMap` e `mapOWMCodeToWMO`.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Removidas as variáveis globais de chaves de API, a checagem no `loadSettings()` e `saveSettings()`, as condicionais em `fetchAndRenderWeather()` e as configurações de renderização da linha correspondente do OpenWeatherMap no Chart.js.

### 12. Nome da Localidade no Cartão Hoje/Detalhado
* **Objetivo**: Facilitar a visualização de qual localidade pertence a previsão detalhada diretamente no cartão esquerdo.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Envolvida a aba de dia em um container `.card-header-titles` contendo o rótulo do dia e um novo elemento `<span class="selected-city-label" id="detail-city-label">`.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Adicionada a estilização para `.card-header-titles` (flexbox vertical) e `.selected-city-label` (cor secundária e tamanho 13px).
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Atualizada a função `renderDetailedCard()` para preencher dinamicamente o textContent de `#detail-city-label` com o valor de `currentLocationName`.

### 13. Horário de Início da Chuva
* **Objetivo**: Mostrar a que hora do dia a chuva deve iniciar para ajudar a planejar atividades ao ar livre.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionado um elemento `<span class="metric-sub" id="detail-rain-sub">` abaixo do valor da probabilidade de chuva no item de métrica.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Adicionada a estilização para `.metric-sub` (tamanho 10px, margem superior de 1px).
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Adicionada lógica de varredura das 24 horas do dia ativo na função `renderDetailedCard()`. A hora da primeira ocorrência onde a probabilidade de chuva é maior ou igual a 30% é extraída e exibida como o início da chuva (ex: "Início: 14:00"). Se a máxima diária for inferior, exibe "Sem chuva".

### 14. Alinhamento dos Painéis Principais (Cartões)
* **Objetivo**: Corrigir o desalinhamento vertical do topo entre o cartão de clima detalhado e o gráfico horários (o cartão esquerdo começava mais abaixo devido ao seletor de modelos posicionado acima dele).
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Movido o contêiner de seleção de fontes/provedores `.provider-tabs-wrapper` para dentro do cartão detalhado de clima `.weather-detail-card`. Agora, ambos os cartões principais começam no mesmo nível do grid, garantindo simetria perfeita.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Removida a margem inferior redundante do `.provider-tabs-wrapper` (`margin-bottom: 0`), já que o próprio gap vertical interno do cartão (`gap: 24px`) gerencia o espaçamento de forma proporcional.

### 15. Redução de tamanho da etiqueta de provedor (badge)
* **Objetivo**: Tornar a etiqueta de identificação do modelo/provedor de dados (`.provider-badge`) mais discreta e equilibrada na interface.
* **Solução**:
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Reduzido o tamanho da fonte de `11px` para `9px` e o padding interno de `4px 10px` para `3px 8px`.

### 16. Exibição da Altitude (Elevação) do Local
* **Objetivo**: Mostrar a altitude da localidade selecionada em metros, uma informação valiosa em regiões serranas (como a Serra Gaúcha).
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionado um elemento `<span id="altitude-info">` na barra de status de coordenadas para exibir a elevação.
  * **Serviços ([weather-services.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/weather-services.js))**: Adicionada a leitura do campo `elevation` presente na raiz da resposta JSON do Open-Meteo e repassada na resposta padronizada de cada modelo.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Modificado o `fetchAndRenderWeather()` para ler o valor de `elevation` do modelo ativo, atualizando o conteúdo de `#current-elevation` e tornando o container visível (removendo `.hidden`). Adicionada a ocultação do elemento no `showLoadingState()`.

### 17. Opção de Idioma Configurável (PT-BR, EN, ES)
* **Objetivo**: Permitir que o usuário selecione e alterne o idioma do aplicativo entre Português, Inglês e Espanhol no menu de configurações.
* **Solução**:
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Novo arquivo com dicionário estruturado de chaves para as strings de interface em `pt`, `en` e `es`, além dos nomes dos dias da semana.
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionada a opção de escolha `<select id="app-lang-select">` no menu de configurações, importado o script `translations.js` e adicionados atributos `data-i18n` aos elementos estáticos de texto.
  * **Serviços ([weather-services.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/weather-services.js))**: Modificado `WMO_CODES` e a função `translateWMO()` para traduzir a condição climática em tempo real baseado no `window.appLang` selecionado.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Criada a variável global `appLang` de estado, adicionada a função `applyTranslations()` para varrer elementos `data-i18n` e placeholders. Ajustada a formatação de datas via `toLocaleDateString` baseado no locale do idioma ativo. Adaptados os textos das notificações flutuantes (toasts) e alertas para os idiomas suportados.
