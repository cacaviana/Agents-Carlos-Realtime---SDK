// src/lib/services/backend.js

const baseUrl = import.meta.env.VITE_BACKEND_URL || "https://app-orion-dev.azurewebsites.net";

// Modifique a função getEphemeralToken para incluir logs de depuração
export async function getEphemeralToken() {
  try {
    console.log("Solicitando token ephemeral do backend");
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na resposta do servidor: ${response.status}`, errorText);
      throw new Error(`Token request failed: ${errorText}`);
    }

    const data = await response.json();
    console.log("Token recebido:", data);
    
    // Verifica estrutura do token
    if (!data.client_secret?.value) {
      console.error("Estrutura do token inválida:", data);
    }
    
    return data.client_secret?.value;
  } catch (error) {
    console.error("Erro ao obter token efêmero:", error);
    throw error;
  }
}
