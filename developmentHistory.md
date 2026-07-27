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

### 18. Pinagem de Localização Direta no Mapa (Clique no Mapa)
* **Objetivo**: Permitir que o usuário defina as coordenadas e consulte a previsão do tempo clicando em qualquer ponto no mapa interativo.
* **Solução**:
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Adicionada a chave de tradução `map-coordinates` para suportar rótulos localizados (ex: "Coordenadas do Mapa", "Map Coordinates", "Coordenadas del Mapa").
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Adicionado um ouvinte de evento `click` no `mapInstance` do Leaflet na função `initMap()`. Ao clicar, as coordenadas globais `currentLat` e `currentLon` são atualizadas, o marcador visual é reposicionado com `markerInstance.setLatLng()`, o nome da localidade é atualizado com o rótulo traduzido, a UI da barra superior de coordenadas é redesenhada e uma nova previsão é buscada na hora com `fetchAndRenderWeather()`.

### 19. Opção de Tema Geral (Claro e Escuro) para o Site
* **Objetivo**: Implementar suporte completo a temas visuais Claro (Premium Light) e Escuro (Premium Dark) para o site inteiro, selecionável pelo usuário no menu.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionado o controle de seleção `<select id="site-theme-select">` no modal de configurações.
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Adicionadas as chaves de tradução correspondentes ao seletor de aparência do site para suporte a múltiplos idiomas.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Criados overrides sob a classe `body.light-theme` alterando as variáveis do sistema de design (fundo dos cards, cores dos textos, bordas, sombras e os degradês de planos de fundo baseados no clima). Criados os estilos e contrastes ideais para caixas de seleção, resultados de busca, barras de status, botões ativos/inativos e gradiente de texto grande no modo claro.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Adicionada a variável `siteTheme` de estado, persistida em `localStorage`. Configurado o carregamento e salvamento do tema para adicionar/remover a classe `.light-theme` no elemento body. Modificado o gerador do gráfico do Chart.js para alterar dinamicamente a paleta de cores dos eixos (grades e fontes) e estilo do tooltip flutuante ao salvar a aparência.

### 20. Efeitos Atmosféricos Dinâmicos de Chuva e Nuvens no Plano de Fundo
* **Objetivo**: Adicionar nuvens e chuva caindo no fundo da tela quando a probabilidade de chuva do dia selecionado passar de 40%.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionadas as divs `#clouds-overlay` e `#rain-overlay` dentro do container `#dynamic-bg`.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Criados estilos de animação CSS premium. As nuvens utilizam gradientes radiais suaves desfocados com `filter: blur()` flutuando lentamente pela tela. A chuva utiliza traços inclinados (15°) com opacidades variadas que caem do topo ao rodapé. Adaptadas as cores dos elementos nos temas Claro e Escuro.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Adicionada a função `updateWeatherOverlays(rainProb)` chamada no final de `updateDynamicBackground()`. Se a probabilidade do dia selecionado for maior que 40%, ela remove a classe `hidden` e gera dinamicamente múltiplos elementos de nuvens (com tamanhos, alturas e delays aleatórios para iniciar em fases diferentes) e gotas de chuva (com inclinações, opacidades e delays aleatórios). Caso contrário, oculta e limpa o DOM para manter a performance ideal de renderização. Sincronizada a atualização das nuvens e chuvas ao trocar de provedor e ao trocar de dia nas abas.

### 21. Efeitos Atmosféricos Adicionais: Sol Brilhando e Nuvens Sem Chuva
* **Objetivo**: Adicionar um efeito visual de sol brilhando pulsante em dias ensolarados, e mostrar apenas nuvens flutuantes (sem chuva) em dias nublados, além de fazer com que o plano de fundo gradiente mude dinamicamente para corresponder ao dia selecionado.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionada a div `#sun-overlay` dentro de `#dynamic-bg`.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Criada a estilização para `.sun-overlay` com um gradiente radial gigante e suave posicionado no canto superior direito, com animação `@keyframes pulseSun` para gerar um efeito dinâmico e sutil de pulsação luminosa (adaptada para temas Claro e Escuro).
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**: Modificado `updateDynamicBackground()` para aplicar o tema do gradiente com base no código WMO do **dia selecionado** em vez de fixar no clima de hoje. Atualizada a função `updateWeatherOverlays()` para gerenciar três estados atmosféricos: Sol (ensolarado), Nuvens (nublado) e Chuva (nublado + chuva), ativando-os e limpando-os sob demanda conforme o código WMO correspondente ao dia selecionado e a probabilidade de precipitação.

### 22. Correção de Nome Duplicado (Minuano) no Cabeçalho
* **Objetivo**: Evitar a duplicação do nome "Minuano" no título do cabeçalho da página devido à aplicação dinâmica de traduções.
* **Solução**:
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Removido a string estática "Minuano" do início da chave `app-subtitle` em todas as traduções (`pt`, `en`, `es`). Dessa forma, a tradução do subtítulo injeta apenas o texto complementar (ex: `, clima e tempo`), mantendo o nome principal estático no HTML principal.

### 23. Calendário Agrícola & Lunar Interativo (Culturas do Sul)
* **Objetivo**: Adicionar uma nova seção interativa abaixo do mapa dedicada ao cultivo de plantas típicas da Região Sul (RS), exibindo épocas de cultivo, dicas e a fase da lua ideal, além de calcular a fase lunar atual e fornecer recomendações de adubação, poda e plantio.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Criada a estrutura da seção `agricultural-section` contendo um cabeçalho, um cartão dinâmico de informações lunares (`#moon-phase-card`), filtros de botões por categoria e um menu de seleção de filtragem por mês.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Criada uma estilização elegante e responsiva para o calendário agrícola. Os cartões de culturas usam efeitos de foco de escala e cores de categorias personalizadas (Frutífera, Hortaliça, Tubérculo, Cereal, Leguminosa). O cartão lunar tem destaque com um ícone de lua brilhante amarelo pulsante.
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Adicionadas todas as traduções de títulos da seção, botões de categorias, nomes dos meses e strings auxiliares para Português, Inglês e Espanhol.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**:
    * Criada a constante global `CROPS_DATA` contendo as informações das culturas do Sul (Uva, Couve, Batata, Milho, Cebola, Feijão, Pêssego e Tomate) com textos localizados.
    * Criada a função `getMoonPhaseInfo(date)` que calcula dinamicamente a fase da lua para a data de hoje baseada em ciclos sinódicos lunares e retorna dicas agrícolas tradicionais para a lua correspondente.
    * Criada a função `renderAgriculturalCalendar()` que filtra a lista de cultivos pelas opções selecionadas e monta dinamicamente os cartões com os ícones Lucide correspondentes (ex: `grape` para Uva, `leaf` para Hortaliças, `sprout` para Leguminosas, etc.).
    * Sincronizada a atualização da seção e dos textos traduzidos no carregamento da página, no clique dos filtros e nas trocas de idiomas do menu.

### 24. Expansão de Banco de Dados de Culturas e Barra de Pesquisa Reativa
* **Objetivo**: Adicionar novas culturas típicas do Sul recomendadas pelo usuário e implementar uma barra de busca para filtrar culturas dinamicamente por texto.
* **Solução**:
  * **HTML ([index.html](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/index.html))**: Adicionado o campo de busca de texto `#agro-search-input` dentro da barra de filtros.
  * **CSS ([style.css](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/style.css))**: Adicionada a estilização para `.agro-search-wrapper` e `.agro-search-icon` com um visual moderno em formato de pílula integrada aos filtros e com foco dinâmico.
  * **Traduções ([translations.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/translations.js))**: Adicionada a tradução `"agro-search-placeholder"` para PT, EN e ES.
  * **JS ([app.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/app.js))**:
    * Expandido o array `CROPS_DATA` com novas culturas: **Maçã, Banana, Caqui, Repolho, Cenoura, Alface, Mandioca, Laranja, Bergamota, Figo, Noz Pecã, Café e Açaí**, contendo suas respectivas particularidades de solo, fase lunar, época de plantio e sensibilidade ao clima do Sul.
    * Implementada a lógica de filtragem por caixa de texto na função `renderAgriculturalCalendar()` para filtrar no dígito (`input` event listener).
    * Atualizado o placeholder traduzido na troca de idiomas em `applyTranslations()`.

### 25. Otimização do Cálculo da Probabilidade de Chuva Diária
* **Objetivo**: Tornar a porcentagem de probabilidade de chuva exibida nos cartões diários mais realista e alinhada com serviços meteorológicos tradicionais (como Google Weather), evitando exibir picos isolados de 24h como probabilidade geral do dia.
* **Solução**:
  * **JS ([weather-services.js](file:///C:/Users/tifra/.gemini/antigravity/scratch/weather-app/weather-services.js))**: Modificado o mapeamento em `fetchOpenMeteoMultiModel` para calcular a média de probabilidade de chuva (`avgRainProb`) com base nas horas relevantes do dia. Para o dia atual ("Hoje"), descarta automaticamente as horas que já passaram e calcula a média das horas restantes do dia.


