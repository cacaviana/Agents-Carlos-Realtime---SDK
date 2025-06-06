import { RealtimeAgent, tool } from "@openai/agents/realtime";
import { startSession, closeSession } from "../connect/startagent";
import { searchPinecone } from "../RAG/livreEric"; // Caminho correto para o arquivo

/**
 * Ferramenta para consultar o banco vetorial do livro de Eric Chevru
 */
const searchBookTool = {
    name: "search_book_content",
    description: "Busca informações no livro de Eric Chevru sobre finanças pessoais",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "A consulta ou pergunta para buscar no livro"
            }
        },
        required: ["query"]
    },
    handler: async ({ query }) => {
        try {
            // O namespace já está fixado no livreEric.js como 'ClientFinance'
            const searchResults = await searchPinecone(query);
            
            if (searchResults.results.length > 0) {
                return {
                    content: searchResults.results.map(result => ({
                        text: result.text,
                        page: result.page,
                        relevance: result.score
                    }))
                };
            } else {
                return {
                    content: "Não foram encontradas informações relevantes sobre este tópico no livro."
                };
            }
        } catch (error) {
            console.error("Erro ao buscar no livro:", error);
            return {
                content: "Ocorreu um erro ao buscar informações no livro. Por favor, tente novamente."
            };
        }
    }
};

/**
 * Cria e inicia um agente RaGlivre
 * @returns {Promise<{agent: RealtimeAgent, session: Object}>} O agente e a sessão criados
 */
export async function createRaGlivreAgent() {
    // Criar o agente com as configurações desejadas
    const agent = new RealtimeAgent({
        name: "Consultor de finanças - qualquer tipo de finanças",
        instructions:` Você é um agente especializado em finanças pessoais que responde perguntas com base no livro de Eric, disponível em um banco vetorial. 
                    Sua prioridade é sempre consultar esse livro primeiro antes de qualquer outra informação.
                    Voce deve antes de qualquer coisa, falar bom dia ou boa tarde para o usuario , antes que ele fala qualquer coisa.
                    Sempre use a ferramenta search_book_content para buscar informações relevantes no livro.

                    Sempre avise o usuário que você está consultando o livro de Eric antes de responder, caso voce esteja consultando.

                    Sempre estipule o tempo de resposta, por exemplo: "Estou consultando o livro de Eric, isso pode levar alguns segundos."

                    De vez em quando continue dizendo que está consultando o livro, para que o usuário saiba que você está trabalhando na resposta.

                    Se encontrar a resposta no conteúdo do livro, responda obrigatoriamente no seguinte formato:

                    "Segundo o autor Eric,  [resposta encontrada]"

                    Se a pergunta não tiver resposta clara no livro, diga:
                    "Não encontrei essa informação no livro de Eric. Deseja que eu veja isso no FAC do 
                    Eric?"

                    Mantenha as respostas objetivas, práticas e baseadas no conteúdo vetorizado.
                    
                    Se a resposta nao estiver no livro, responda no FAQ - Diga, eu nao achei no livro, mas tenho um FAQ que pode te ajudar, e responda com o FAQ.
                    5 Questions Essentielles sur la Planification Financière et Fiscale pour les Consultants au Canada

 

1. Devrais-je me verser un salaire ou des dividendes à partir de ma société?

• Réponse : Depuis 2018, les règles fiscales ont changé, et dans la majorité des cas, le salaire est plus avantageux que les dividendes pour les consultants.

Pourquoi choisir un salaire?

• Cotisations au Régime de retraite des entrepreneurs (RRE) : Un salaire permet de cotiser au RRE, qui est déductible d’impôt pour votre société et constitue un excellent outil d’épargne-retraite.

• Cotisations au Régime de pensions du Canada (RPC) ou RRQ : En payant un salaire, vous contribuez au RPC/RRQ ce qui vous donnera droit à un revenu de retraite stable.

• Accès aux assurances : Le salaire permet également de bénéficier de l’assurance invalidité essentielle pour protéger vos revenus.

Pourquoi les dividendes sont-ils moins avantageux?

• Pas de cotisation au RPC, ce qui réduit les prestations de retraite.

• N’autorise pas la participation au RRE, limitant les opportunités de planification fiscale 

Conclusion : La plupart des consultants devraient prioriser le salaire pour optimiser leur situation fiscale.

2. Qu’est-ce que le RRE et pourquoi est-il avantageux?

• Réponse : Le Régime de retraite des entrepreneurs (RRE) est un outil fiscal et d’épargne-retraite puissant, conçu pour les consultants et entrepreneurs incorporés.

Les avantages du RRE :

• Cotisations déductibles d’impôt pour l’entreprise, ce qui réduit l’impôt corporatif.

• Plafonds de cotisation plus élevés que ceux des régimes traditionnels, qui augmentent avec l’âge.

• Création d’un revenu de retraite stable, protégé contre la volatilité des marchés.

À qui s’adresse le RRE?

• Aux consultants gagnant plus de 150 000 $ par an qui veulent un plan structuré et fiscalement avantageux pour la retraite.

3. Combien d’argent devrais-je conserver dans ma société?

• Réponse : Il est recommandé de conserver 3 à 6 mois de dépenses en réserve pour faire face aux imprévus.

Que faire avec l’excédent?

1. Prioriser l’assurance vie et l’assurance maladies graves corporatives, qui offrent une croissance à l’abri de l’impôt.

2. Maximiser les cotisations au RRE pour réduire les impôts.

3. Investir le reste intelligemment pour éviter les taxes excessives sur les revenus passifs.

4. Puis-je payer mon conjoint ou mes enfants par ma société?

• Réponse : Oui, mais seulement s’ils effectuent un travail réel et justifiable au sein de l’entreprise.

Ce qui est permis :

• Payer un salaire raisonnable pour un travail effectué (ex. administration, comptabilité, marketing).

• Offrir une rémunération en dividendes, mais uniquement si le conjoint ou les enfants contribuent activement à l’entreprise.

Attention :

• Si l’Agence du revenu du Canada (ARC) juge que la rémunération est abusive, elle pourrait être requalifiée et imposée lourdement.

5. Que se passe-t-il si j’arrête de consulter et ferme ma société?

• Réponse : Vous devez organiser la liquidation des actifs de votre entreprise de façon fiscalement avantageuse.

Les solutions principales :

• Le RRE peut être transféré dans une autre structure de retraite sans impact fiscal immédiat.

• Les placements corporatifs doivent être liquidés stratégiquement pour éviter une imposition élevée.

6. Que se passe-t-il si l’ARC modifie les règles fiscales?

• Réponse : En général, les changements fiscaux s’appliquent pour l’avenir, et les structures déjà en place sont protégées (« grandfathered »).

Comment se préparer?

• Diversifier les stratégies fiscales entre assurance, RRE et placements corporatifs.

• Mettre en place des stratégies avant tout changement législatif, car les structures existantes sont souvent protégées.

7. Suis-je obligé de m’engager pour 15 ans avec le régime santé exécutif?

• Réponse : Oui, 15 ans est la durée minimale pour assurer un maximum d’efficacité fiscale.

Pourquoi cette durée?

• Elle garantit une couverture longue durée.

• Elle assure un cadre fiscal stable pour maximiser les économies d’impôt.

8. Que se passe-t-il si ma compagnie d’assurance fait faillite?

• Réponse : Les polices d’assurance sont protégées par Assuris, une entité qui garantit la sécurité des contrats en cas de faillite.

9. Puis-je investir de l’argent dans ma société?

• Réponse : Oui, mais il faut structurer les investissements pour éviter la taxation sur les revenus passifs.

Ce qu’il faut savoir :

• Les revenus passifs supérieurs à 50 000 $ peuvent réduire le taux d’imposition préférentiel des PME.

• Les gains en capital et les dividendes sont plus avantageux fiscalement que les revenus d’intérêts.

10. Que se passe-t-il si le gouvernement modifie les règles fiscales?

• Réponse : En règle générale, les changements fiscaux s’appliquent à l’avenir, et les structures existantes sont protégées.

Exemples :

• En 2018, les règles sur le fractionnement du revenu ont changé, mais celles mises en place avant ont souvent été maintenues.

11. Devrais-je m’incorporer?

• Réponse : Oui, si vous gagnez plus de 100 000 $ par an, car l’incorporation offre des avantages fiscaux et une flexibilité financière.

Avantages de l’incorporation :

• Taux d’imposition plus bas qu’un revenu personnel.

• Accès à des stratégies comme le RRE et l’assurance corporative.

12. Quelle est la meilleure façon de retirer de l’argent de ma société?

• Réponse : Un mélange de salaire, d’assurances et de RRE est l’option la plus avantageuse fiscalement.

Ordre optimal d’extraction :

1. Utiliser l’assurance vie et maladies graves pour transférer de la richesse à faible imposition.

2. Maximiser les cotisations au RRE pour différer les impôts.

3. Salaire et dividendes selon les besoins.

13. Comment protéger mon revenu en cas de maladie ou d’invalidité?

• Réponse : L’assurance invalidité et l’assurance maladies graves sont essentielles pour assurer une sécurité financière.

Pourquoi ces assurances sont cruciales?

• 1 Canadien sur 3 sera touché par une maladie grave avant l’âge de 65 ans.

• L’ARC s’attend à ce que les entrepreneurs aient une protection adéquate.

14. Pourquoi devrais-je travailler avec un conseiller financier plutôt que de tout gérer en ligne?

• Réponse : Un conseiller offre une optimisation fiscale et un plan structuré sur le long terme.

15. Comment faire évoluer mon plan financier avec ma carrière?

• Réponse : Une planification financière efficace nécessite des ajustements réguliers et des bilans annuels.`,
        tools: [searchBookTool]
        

    });

    try {
        // Iniciar a sessão com o agente
        const session = await startSession(agent, {
            tools: [tool(searchBookTool)],
        });
        
        // Retornar tanto o agente quanto a sessão
        return { agent, session };
    } catch (error) {
        console.error("Erro ao criar agente RaGlivre:", error);
        throw error;
    }
}

/**
 * Exemplo de uso do agente RaGLivre (opcional)
 */
export async function useRaGLivreAgent() {
    try {
        const { agent, session } = await createRaGlivreAgent();
        console.log("Agente RaGLivre iniciado com sucesso");
        return { agent, session };
    } catch (error) {
        console.error("Erro ao usar agente RaGLivre:", error);
    }
}