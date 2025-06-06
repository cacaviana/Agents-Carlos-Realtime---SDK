import { RealtimeAgent } from "@openai/agents/realtime";
import { startSession, closeSession } from "../../services/connect/startagent";

/**
 * Cria e inicia um agente básico
 * @returns {Promise<{agent: RealtimeAgent, session: Object}>} O agente e a sessão criados
 */
export async function createBasicAgent() {
    // Criar o agente com as configurações desejadas
    const agent = new RealtimeAgent({
        name: "Simple Agent",
        instructions: "You are a simple agent that can answer questions and provide information based on the user's input. Keep your responses concise and relevant.",
        tools: []
    });

    try {
        // Iniciar a sessão com o agente
        const session = await startSession(agent);
        
        // Retornar tanto o agente quanto a sessão
        return { agent, session };
    } catch (error) {
        console.error("Erro ao criar agente básico:", error);
        throw error;
    }
}

/**
 * Exemplo de uso do agente básico
 */
export async function useBasicAgent() {
    try {
        const { agent, session } = await createBasicAgent();
        
        // Aqui você pode adicionar lógica para interagir com o agente
        console.log("Agente básico iniciado com sucesso");
        
        // Exemplo de como encerrar a sessão quando não for mais necessária
        // await closeSession(session);
        
        return { agent, session };
    } catch (error) {
        console.error("Erro ao usar agente básico:", error);
    }
}