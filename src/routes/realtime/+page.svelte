<script>
    import { onMount, onDestroy } from 'svelte';
    import { createBasicAgent } from '../../services/agents/basicAgent';
    import { closeSession } from '../../services/connect/startagent';
  
    let isAgentReady = false;
    let isListening = false;
    let statusMessage = "Agente não iniciado";
    let session = null;
    let agent = null;
    let lastMessage = "";
  
    // Iniciar o agente
    async function startAgent() {
      try {
        statusMessage = "Iniciando agente...";
        const result = await createBasicAgent();
        agent = result.agent;
        session = result.session;
        
        // Adicionar listeners para eventos do agente
        session.on('ready', handleAgentReady);
        session.on('message', handleAgentMessage);
        session.on('error', handleAgentError);
        
        isAgentReady = true;
        statusMessage = "Agente pronto! Pode falar.";
      } catch (error) {
        statusMessage = `Erro ao iniciar agente: ${error.message}`;
        console.error("Erro ao iniciar agente:", error);
      }
    }
  
    // Encerrar o agente
    async function stopAgent() {
      if (session) {
        try {
          // Primeiro tenta parar o áudio, se disponível
          if (typeof session.stopAudio === 'function') {
            try {
              await session.stopAudio();
            } catch (audioError) {
              console.warn("Erro ao parar áudio:", audioError);
            }
          }
          
          // Tenta fechar a sessão através da função auxiliar
          await closeSession(session);
          
          // Atualiza o estado da UI independentemente do sucesso da função closeSession
          isAgentReady = false;
          isListening = false;
          statusMessage = "Agente encerrado";
          session = null;
          agent = null;
        } catch (error) {
          console.error("Erro ao encerrar agente:", error);
          statusMessage = `Erro ao encerrar: ${error.message}`;
          
          // Mesmo com erro, atualiza o estado da UI para evitar comportamento inconsistente
          isAgentReady = false;
          isListening = false;
          session = null;
          agent = null;
        }
      }
    }
  
    // Alternar entre pausar e continuar a escuta
    function toggleListening() {
      if (!session) return;
      
      if (isListening) {
        session.pauseAudio();
        statusMessage = "Microfone pausado";
      } else {
        session.resumeAudio();
        statusMessage = "Ouvindo...";
      }
      
      isListening = !isListening;
    }
  
    // Handlers para eventos
    function handleAgentReady() {
      isListening = true;
      statusMessage = "Agente pronto e ouvindo";
    }
  
    function handleAgentMessage(message) {
      lastMessage = message.content;
    }
  
    function handleAgentError(error) {
      statusMessage = `Erro: ${error.message}`;
      console.error("Erro no agente:", error);
    }
  
    // Limpar recursos ao destruir o componente
    onDestroy(() => {
      if (session) {
        closeSession(session).catch(err => 
          console.error("Erro ao encerrar sessão:", err)
        );
      }
    });
  </script>
  
  <main>
    <h1>MentorAI - Agente de Voz</h1>
    
    <div class="status-container">
      <p class="status">Status: {statusMessage}</p>
    </div>
    
    <div class="controls">
      {#if !isAgentReady}
        <button on:click={startAgent}>Iniciar Agente</button>
      {:else}
        <button on:click={toggleListening}>
          {isListening ? 'Pausar Microfone' : 'Continuar Ouvindo'}
        </button>
        <button on:click={stopAgent} class="stop">Encerrar Agente</button>
      {/if}
    </div>
    
    {#if lastMessage}
      <div class="message-container">
        <h3>Última Mensagem:</h3>
        <p class="message">{lastMessage}</p>
      </div>
    {/if}
  </main>
  
  <style>
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
  
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
  
    .status-container {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
  
    .status {
      margin: 0;
      text-align: center;
      font-weight: 500;
    }
  
    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 30px;
    }
  
    button {
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 12px 20px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
  
    button:hover {
      background-color: #3367d6;
    }
  
    button.stop {
      background-color: #ea4335;
    }
  
    button.stop:hover {
      background-color: #d33426;
    }
  
    .message-container {
      background-color: #e8f0fe;
      border-radius: 8px;
      padding: 15px;
    }
  
    .message {
      font-size: 18px;
      line-height: 1.5;
    }
  </style>