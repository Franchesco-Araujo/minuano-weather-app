# Minuano - Clima e Tempo (Weather Compare App)

Este projeto é um aplicativo web (Single Page Application) moderno e responsivo, projetado para visualizar e comparar previsões do tempo de múltiplos modelos meteorológicos e provedores em um único lugar. É ideal para planejamento em locais específicos, como sítios, fazendas ou áreas rurais, pois permite buscar tanto por cidades quanto por coordenadas exatas (Latitude/Longitude), além de comparar previsões lado a lado.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído usando tecnologias web puras (Vanilla stack), focando na simplicidade de execução, legibilidade do código e alta performance:

- **HTML5**: Estrutura semântica para acessibilidade e organização.
- **CSS3 (Vanilla)**: Design premium adaptativo com suporte a temas, efeitos de desfoque (glassmorphism), animações e layout flexível (Grid/Flexbox).
- **JavaScript (ES6+)**: Lógica de controle de estado, requisições HTTP assíncronas e manipulação do DOM.
- **Chart.js (via CDN)**: Renderização dos gráficos de linha de previsão horária e comparativos.
- **Leaflet.js (via CDN)**: Renderização de mapa interativo de código aberto para conferência do ponto geográfico.
- **Lucide Icons (via CDN)**: Conjunto de ícones vetoriais modernos e consistentes.

---

## 📂 Estrutura de Arquivos

```text
weather-app/
├── index.html            # Estrutura de visualização da página (Layout)
├── style.css             # Regras de design, cores, fontes e responsividade
├── app.js                # Lógica principal, geolocalização e controle da interface
├── weather-services.js   # Integração de requisições com APIs meteorológicas
└── README.md             # Documentação do projeto (este arquivo)
```

---

## 🔌 APIs Integradas

1. **Open-Meteo Geocoding API** (`https://geocoding-api.open-meteo.com`):
   - **Função**: Traduzir buscas por texto (ex: "Fazenda Souza") em coordenadas reais de latitude/longitude.
   - **Vantagem**: Aberta, keyless (não precisa de token).

2. **Open-Meteo Weather Forecast API** (`https://api.open-meteo.com`):
   - **Função**: Coletar dados de previsão de diversos modelos globais de alta resolução.
   - **Modelos Utilizados**:
     - **ECMWF** (Europeu, considerado o mais preciso globalmente).
     - **GFS** (Americano, amplamente usado globalmente).
     - **ICON** (Alemão, excelente resolução na Europa/Américas).
   - **Vantagem**: Livre de chaves, permitindo comparações diretas sem custos ou limites estritos.

3. **OpenWeatherMap API (Opcional)** (`https://api.openweathermap.org`):
   - **Função**: Oferecer uma fonte alternativa proprietária de dados climáticos.
   - **Vantagem**: Caso o usuário tenha uma chave de API (API Key) gratuita ou paga, o app a utiliza no navegador. É salva em `localStorage` para segurança do usuário.

---

## 🔧 Como Executar

Por ser um aplicativo estático (HTML/CSS/JS puro), você não precisa instalar nenhuma dependência (como `npm install`) para executá-lo no dia a dia:

1. **Execução Direta**:
   - Basta abrir o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Safari, Edge).
2. **Servidor Local (Recomendado para desenvolvimento)**:
   - Se estiver usando o VS Code, utilize a extensão "Live Server".
   - Ou utilize o Python via terminal: `python -m http.server 8000` na pasta raiz e acesse `http://localhost:8000`.

---

## 📝 Guia de Manutenção e Melhorias

### Como adicionar uma nova fonte de clima:
1. Abra o arquivo `weather-services.js`.
2. Adicione uma nova função de busca no objeto `WeatherServices` (ex: `fetchMyNewService(lat, lon)`).
3. Padronize a resposta da nova API para retornar o formato esperado pelo app:
   - **Clima Atual**: `{ temp: N, condition: "Sunny", humidity: N, windSpeed: N, feelsLike: N, pressure: N }`
   - **Previsão Diária**: Lista de dias com `date`, `maxTemp`, `minTemp`, `conditionCode`.
   - **Previsão Horária**: Lista de horas para o dia selecionado com `time`, `temp`, `precipitationProbability`.
4. Adicione a nova fonte na lista de provedores ativos no `app.js` para atualizar o gráfico e os cards comparativos.

### Ajustar estilos visuais:
- Todas as cores principais, tamanhos de bordas e configurações de vidro (glassmorphism) estão definidas no topo de `style.css` em `:root`. Altere esses valores para modificar a identidade visual do app de uma só vez (ex: mudar o laranja padrão de destaque).
