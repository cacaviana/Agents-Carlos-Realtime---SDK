import { getEphemeralToken } from "./backend";
import { RealtimeSession } from "@openai/agents/realtime";

/**
 * Inicia uma sessão com um agente específico
 * @param {Object} agent - O agente a ser conectado na sessão
 * @param {Object} options - Opções adicionais para a sessão
 * @returns {Promise<RealtimeSession>} A sessão iniciada
 */
export async function startSession(agent, options = {}) {
    try {
        const token = await getEphemeralToken();
        if (!token) {
            throw new Error("Token efêmero não obtido");
        }

        // Criar a sessão com o agente
        const session = new RealtimeSession(agent, {
            model: options.model || 'gpt-4o-realtime-preview-2025-06-03',
            
        });

        // Conectar a sessão com o token
        await session.connect({
            apiKey: token, // Usar o token efêmero como apiKey
        });
        
        console.log("Sessão iniciada com sucesso");
        return session;
    } catch (error) {
        console.error("Erro ao iniciar sessão:", error);
        throw error;
    }
}

/**
 * Encerra uma sessão
 * @param {RealtimeSession} session - A sessão a ser encerrada
 */
export async function closeSession(session) {
    try {
        if (session) {
            // Verificando qual método está disponível no objeto session
            if (typeof session.disconnect === 'function') {
                await session.disconnect();
            } else if (typeof session.close === 'function') {
                await session.close();
            } else if (typeof session.stop === 'function') {
                await session.stop();
            } else {
                console.warn("Método para encerrar sessão não encontrado, tentando destruir recursos manualmente");
                // Tenta limpar recursos relacionados ao áudio
                if (typeof session.stopAudio === 'function') {
                    await session.stopAudio();
                }
            }
            console.log("Sessão encerrada com sucesso");
        }
    } catch (error) {
        console.error("Erro ao encerrar sessão:", error);
    }
}