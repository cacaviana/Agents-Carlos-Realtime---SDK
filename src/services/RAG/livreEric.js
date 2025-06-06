/**
 * Módulo para interação com o banco vetorial no Azure
 */

/**
 * Realiza uma busca no banco vetorial hospedado no Azure
 * @param {string} query - A consulta a ser pesquisada
 * @param {Object} options - Opções adicionais para a busca
 * @returns {Promise<Object>} Os resultados da consulta
 */
export async function searchPinecone(query, options = {}) {
    try {
        // Namespace fixo conforme especificado
        const namespace = 'ClientFinance';
        
        // Codificar a query para uso na URL
        const encodedQuery = encodeURIComponent(query);
        
        // Construir a URL da API com os parâmetros
        const apiUrl = `https://app-vectordb-ia.azurewebsites.net/openai/assistant/clientfinance?question=${encodedQuery}&namespace=${namespace}`;
        
        // Parâmetros da requisição
        const requestParams = {
            method: 'POST',
            headers: {
                'accept': 'application/json',
            },
            // O cURL mostra um POST sem corpo (-d ''), então enviamos um corpo vazio
            body: ''
        };

        // Fazer a requisição para a API externa
        const response = await fetch(apiUrl, requestParams);
        
        if (!response.ok) {
            throw new Error(`Falha na busca: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Formatar os resultados conforme necessário para seu uso
        return formatSearchResults(data);
    } catch (error) {
        console.error("Erro ao consultar o banco vetorial:", error);
        throw error;
    }
}

/**
 * Formata os resultados da busca para o formato esperado pelos agentes
 * @param {Object} rawData - Os dados brutos retornados pela API
 * @returns {Object} Dados formatados
 */
function formatSearchResults(rawData) {
    // Formata a resposta da API do Azure para o formato padrão usado pelos agentes
    // Ajuste este formato conforme a estrutura real retornada pela sua API
    
    try {
        // Exemplo de formatação baseado em uma resposta típica do Azure
        const formattedResults = [];
        
        // Verifica se há resultados e itera sobre eles
        if (rawData.results && Array.isArray(rawData.results)) {
            rawData.results.forEach(item => {
                formattedResults.push({
                    text: item.content || item.text,
                    page: item.metadata?.page || item.page,
                    score: item.score || item.relevance || 1.0
                });
            });
        } else if (rawData.content) {
            // Caso a API retorne um único resultado ou formato diferente
            formattedResults.push({
                text: rawData.content,
                page: rawData.page || rawData.metadata?.page || "Não especificada",
                score: rawData.score || 1.0
            });
        }
        
        return {
            results: formattedResults,
            totalResults: formattedResults.length,
            rawResponse: rawData
        };
    } catch (error) {
        console.error("Erro ao formatar resultados:", error);
        return {
            results: [],
            totalResults: 0,
            rawResponse: rawData,
            error: "Erro ao processar resposta"
        };
    }
}