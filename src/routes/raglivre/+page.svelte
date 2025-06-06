<script>
    import { onMount, onDestroy } from 'svelte';
    import { createRaGlivreAgent } from '../../services/agents/raglivreAgent';
    import { closeSession } from '../../services/connect/startagent';
  
    let isAgentReady = false;
    let isListening = false;
    let statusMessage = "Agent financier non démarré";
    let session = null;
    let agent = null;
    let lastMessage = "";
    let userQuery = ""; // Pour saisie manuelle
    let toolCallHistory = []; // Historique des appels d'outils
    let lastToolCalled = null; // Dernier outil appelé
    let showFaq = false; // Pour afficher/masquer la FAQ
  
    // Démarrer l'agent RAG
    async function startAgent() {
      try {
        statusMessage = "Démarrage de l'agent financier...";
        const result = await createRaGlivreAgent();
        agent = result.agent;
        session = result.session;
        
        // Ajouter des écouteurs pour les événements de l'agent
        session.on('ready', handleAgentReady);
        session.on('message', handleAgentMessage);
        session.on('error', handleAgentError);
        
        // Écouteur spécifique pour les appels d'outils
        session.on('tool_call', handleToolCall);
        
        // Ajouter un écouteur pour tous les événements pour débogage
        session.on('*', handleAllEvents);
        
        isAgentReady = true;
        statusMessage = "Agent financier prêt ! Vous pouvez parler ou taper votre question.";
        console.log("Agent démarré:", agent);
      } catch (error) {
        statusMessage = `Erreur lors du démarrage de l'agent: ${error.message}`;
        console.error("Erreur lors du démarrage de l'agent:", error);
      }
    }
    
    // Gestionnaire pour tous les événements (débogage)
    function handleAllEvents(event) {
      const { type, ...data } = event;
      console.log(`[ÉVÉNEMENT ${type}]`, data);
      
      // Vérifier les événements liés aux outils
      if (type.includes('tool') || type === 'thinking') {
        console.log("Appel d'outil potentiel détecté dans l'événement:", type, data);
      }
    }
  
    // Arrêter l'agent
    async function stopAgent() {
      if (session) {
        try {
          // D'abord essayer d'arrêter l'audio, si disponible
          if (typeof session.stopAudio === 'function') {
            try {
              await session.stopAudio();
            } catch (audioError) {
              console.warn("Erreur lors de l'arrêt de l'audio:", audioError);
            }
          }
          
          // Essayer de fermer la session via la fonction auxiliaire
          await closeSession(session);
          
          // Mettre à jour l'état de l'interface indépendamment du succès de closeSession
          isAgentReady = false;
          isListening = false;
          statusMessage = "Agent arrêté";
          toolCallHistory = [];
          lastToolCalled = null;
          session = null;
          agent = null;
        } catch (error) {
          console.error("Erreur lors de l'arrêt de l'agent:", error);
          statusMessage = `Erreur lors de l'arrêt: ${error.message}`;
          
          // Même en cas d'erreur, mettre à jour l'état de l'interface pour éviter un comportement incohérent
          isAgentReady = false;
          isListening = false;
          session = null;
          agent = null;
        }
      }
    }
  
    // Basculer entre pause et reprise de l'écoute
    function toggleListening() {
      if (!session) return;
      
      if (isListening) {
        session.pauseAudio();
        statusMessage = "Microphone en pause";
      } else {
        session.resumeAudio();
        statusMessage = "Écoute en cours...";
      }
      
      isListening = !isListening;
    }
    
    // Envoyer une requête manuelle
    async function sendQuery() {
      if (!session || !userQuery.trim()) return;
      
      try {
        statusMessage = "Envoi de la requête...";
        lastToolCalled = null; // Réinitialiser le dernier outil appelé
        console.log("Envoi de la requête:", userQuery);
        
        // Enregistrer qu'une nouvelle requête a été initiée
        toolCallHistory.push({
          timestamp: new Date(),
          type: 'query',
          content: userQuery
        });
        toolCallHistory = toolCallHistory; // Pour déclencher la mise à jour de l'interface
        
        await session.sendMessage(userQuery);
        userQuery = ""; // Effacer le champ après l'envoi
      } catch (error) {
        console.error("Erreur lors de l'envoi de la requête:", error);
        statusMessage = `Erreur de requête: ${error.message}`;
      }
    }

    // Basculer l'affichage de la FAQ
    function toggleFaq() {
      showFaq = !showFaq;
    }
  
    // Gestionnaires pour les événements
    function handleAgentReady() {
      isListening = true;
      statusMessage = "Agent financier prêt et à l'écoute";
    }
  
    function handleAgentMessage(message) {
      console.log("Message complet reçu:", message);
      
      // Vérifier s'il y a eu utilisation de l'outil dans la réponse
      if (!lastToolCalled) {
        console.warn("AVERTISSEMENT: L'agent a répondu sans appeler l'outil search_book_content!");
        statusMessage = "Avertissement: Réponse sans consultation du livre!";
      }
      
      lastMessage = message.content;
      
      // Enregistrer le message dans l'historique
      toolCallHistory.push({
        timestamp: new Date(),
        type: 'response',
        content: message.content,
        usedTool: lastToolCalled ? true : false
      });
      toolCallHistory = toolCallHistory; // Pour déclencher la mise à jour de l'interface
    }
  
    function handleAgentError(error) {
      statusMessage = `Erreur: ${error.message}`;
      console.error("Erreur dans l'agent:", error);
    }
    
    function handleToolCall(toolCall) {
      console.log("OUTIL APPELÉ:", toolCall);
      
      // Extraire les informations de l'outil appelé
      const toolName = toolCall.name || toolCall.function?.name || "inconnu";
      const toolParams = toolCall.parameters || toolCall.arguments || {};
      
      // Mettre à jour l'état et l'interface
      lastToolCalled = toolName;
      statusMessage = `Consultation du livre de finances avec l'outil: ${toolName}`;
      
      // Enregistrer l'appel de l'outil dans l'historique
      toolCallHistory.push({
        timestamp: new Date(),
        type: 'tool_call',
        name: toolName,
        parameters: typeof toolParams === 'string' ? toolParams : JSON.stringify(toolParams)
      });
      toolCallHistory = toolCallHistory; // Pour déclencher la mise à jour de l'interface
      
      // Vérifier si c'est l'outil attendu
      if (toolName === 'search_book_content') {
        console.log("✓ PINECONE APPELÉ CORRECTEMENT!");
      } else {
        console.warn("⚠️ L'outil appelé n'est pas Pinecone:", toolName);
      }
    }
  
    // Nettoyer les ressources lors de la destruction du composant
    onDestroy(() => {
      if (session) {
        closeSession(session).catch(err => 
          console.error("Erreur lors de la fermeture de session:", err)
        );
      }
    });
  </script>
  
  <main>
    <h1>Consultant en Finance - Livre d'Eric</h1>
    
    <div class="status-container">
      <p class="status">Statut: {statusMessage}</p>
      {#if lastToolCalled}
        <p class="tool-info">Dernier outil appelé: <span class="tool-name">{lastToolCalled}</span></p>
      {/if}
    </div>
    
    <div class="controls">
      {#if !isAgentReady}
        <button on:click={startAgent}>Démarrer le Consultant</button>
      {:else}
        <button on:click={toggleListening}>
          {isListening ? 'Mettre en Pause le Microphone' : 'Reprendre l\'Écoute'}
        </button>
        <button on:click={stopAgent} class="stop">Arrêter le Consultant</button>
        
        <!-- Formulaire pour consultation par texte -->
        <div class="query-form">
          <input 
            type="text" 
            bind:value={userQuery} 
            placeholder="Tapez votre question sur les finances..."
            on:keypress={(e) => e.key === 'Enter' && sendQuery()}
          />
          <button on:click={sendQuery} class="send">Envoyer</button>
        </div>
      {/if}
    </div>
    
    <button on:click={toggleFaq} class="faq-toggle">
      {showFaq ? 'Masquer la FAQ' : 'Afficher la FAQ'}
    </button>
    
    {#if showFaq}
      <div class="faq-container">
        <h2>Questions Essentielles sur la Planification Financière et Fiscale</h2>
        
        <div class="faq-item">
          <h3>1. Devrais-je me verser un salaire ou des dividendes à partir de ma société?</h3>
          <p><strong>Réponse :</strong> Depuis 2018, les règles fiscales ont changé, et dans la majorité des cas, le salaire est plus avantageux que les dividendes pour les consultants.</p>
          
          <h4>Pourquoi choisir un salaire?</h4>
          <ul>
            <li><strong>Cotisations au Régime de retraite des entrepreneurs (RRE) :</strong> Un salaire permet de cotiser au RRE, qui est déductible d'impôt pour votre société et constitue un excellent outil d'épargne-retraite.</li>
            <li><strong>Cotisations au Régime de pensions du Canada (RPC) ou RRQ :</strong> En payant un salaire, vous contribuez au RPC/RRQ ce qui vous donnera droit à un revenu de retraite stable.</li>
            <li><strong>Accès aux assurances :</strong> Le salaire permet également de bénéficier de l'assurance invalidité essentielle pour protéger vos revenus.</li>
          </ul>
          
          <h4>Pourquoi les dividendes sont-ils moins avantageux?</h4>
          <ul>
            <li>Pas de cotisation au RPC, ce qui réduit les prestations de retraite.</li>
            <li>N'autorise pas la participation au RRE, limitant les opportunités de planification fiscale.</li>
          </ul>
          
          <p><strong>Conclusion :</strong> La plupart des consultants devraient prioriser le salaire pour optimiser leur situation fiscale.</p>
        </div>
        
        <div class="faq-item">
          <h3>2. Qu'est-ce que le RRE et pourquoi est-il avantageux?</h3>
          <p><strong>Réponse :</strong> Le Régime de retraite des entrepreneurs (RRE) est un outil fiscal et d'épargne-retraite puissant, conçu pour les consultants et entrepreneurs incorporés.</p>
          
          <h4>Les avantages du RRE :</h4>
          <ul>
            <li>Cotisations déductibles d'impôt pour l'entreprise, ce qui réduit l'impôt corporatif.</li>
            <li>Plafonds de cotisation plus élevés que ceux des régimes traditionnels, qui augmentent avec l'âge.</li>
            <li>Création d'un revenu de retraite stable, protégé contre la volatilité des marchés.</li>
          </ul>
          
          <h4>À qui s'adresse le RRE?</h4>
          <p>Aux consultants gagnant plus de 150 000 $ par an qui veulent un plan structuré et fiscalement avantageux pour la retraite.</p>
        </div>
        
        <!-- Autres questions de la FAQ -->
        <div class="faq-item">
          <h3>3. Combien d'argent devrais-je conserver dans ma société?</h3>
          <p><strong>Réponse :</strong> Il est recommandé de conserver 3 à 6 mois de dépenses en réserve pour faire face aux imprévus.</p>
          
          <h4>Que faire avec l'excédent?</h4>
          <ol>
            <li>Prioriser l'assurance vie et l'assurance maladies graves corporatives, qui offrent une croissance à l'abri de l'impôt.</li>
            <li>Maximiser les cotisations au RRE pour réduire les impôts.</li>
            <li>Investir le reste intelligemment pour éviter les taxes excessives sur les revenus passifs.</li>
          </ol>
        </div>
        
        <!-- Autres questions... -->
        <div class="faq-item">
          <h3>4. Puis-je payer mon conjoint ou mes enfants par ma société?</h3>
          <p><strong>Réponse :</strong> Oui, mais seulement s'ils effectuent un travail réel et justifiable au sein de l'entreprise.</p>
          
          <h4>Ce qui est permis :</h4>
          <ul>
            <li>Payer un salaire raisonnable pour un travail effectué (ex. administration, comptabilité, marketing).</li>
            <li>Offrir une rémunération en dividendes, mais uniquement si le conjoint ou les enfants contribuent activement à l'entreprise.</li>
          </ul>
          
          <p><strong>Attention :</strong> Si l'Agence du revenu du Canada (ARC) juge que la rémunération est abusive, elle pourrait être requalifiée et imposée lourdement.</p>
        </div>
        
        <!-- Suite des questions... -->
      </div>
    {/if}
    
    {#if lastMessage}
      <div class="message-container">
        <h3>Réponse du Consultant:</h3>
        <p class="message">{lastMessage}</p>
        {#if !lastToolCalled}
          <p class="warning">⚠️ Cette réponse a été générée sans consulter la base de données du livre!</p>
        {/if}
      </div>
    {/if}
    
    {#if toolCallHistory.length > 0}
      <div class="debug-container">
        <h3>Journal des Outils (Débogage):</h3>
        <div class="tool-log">
          {#each toolCallHistory as entry}
            <div class="log-entry {entry.type}">
              <span class="timestamp">{entry.timestamp.toLocaleTimeString()}</span>
              {#if entry.type === 'tool_call'}
                <span class="event-type">🔧 OUTIL:</span> 
                <span class="tool-name">{entry.name}</span>
                <div class="params">Paramètres: {entry.parameters}</div>
              {:else if entry.type === 'query'}
                <span class="event-type">❓ REQUÊTE:</span> {entry.content}
              {:else}
                <span class="event-type">💬 RÉPONSE:</span> 
                {entry.usedTool ? '✓' : '⚠️'} {entry.content.substring(0, 50)}...
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="info-container">
      <h3>À propos de ce consultant:</h3>
      <p>Cet assistant utilise le contenu du livre d'Eric sur les finances personnelles pour répondre à vos questions. Il consulte une base de données vectorielle contenant les connaissances du livre.</p>
    </div>
  </main>
  
  <style>
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #333;
    }
  
    h1 {
      color: #0d47a1;
      text-align: center;
      margin-bottom: 30px;
    }
    
    h2 {
      color: #0d47a1;
      margin-top: 20px;
    }
    
    h3 {
      color: #1565c0;
      margin-bottom: 10px;
    }
    
    h4 {
      color: #1976d2;
      margin-bottom: 5px;
      margin-top: 15px;
    }
  
    .status-container {
      background-color: #e3f2fd;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
  
    .status {
      margin: 0;
      text-align: center;
      font-weight: 500;
    }
    
    .tool-info {
      margin: 10px 0 0 0;
      text-align: center;
      font-size: 14px;
    }
    
    .tool-name {
      font-weight: bold;
      color: #0d47a1;
    }
    
    .warning {
      color: #c62828;
      font-weight: bold;
      margin-top: 10px;
      padding: 5px;
      background-color: #ffebee;
      border-radius: 4px;
    }
  
    .controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .query-form {
      display: flex;
      width: 100%;
      max-width: 600px;
      margin-top: 10px;
    }
    
    input {
      flex-grow: 1;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #bbdefb;
      border-radius: 4px 0 0 4px;
    }
  
    button {
      background-color: #1565c0;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 12px 20px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    button.send {
      border-radius: 0 4px 4px 0;
    }
  
    button:hover {
      background-color: #0d47a1;
    }
  
    button.stop {
      background-color: #c62828;
    }
  
    button.stop:hover {
      background-color: #b71c1c;
    }
    
    button.faq-toggle {
      background-color: #0277bd;
      width: 200px;
      margin: 0 auto 20px;
      display: block;
    }
    
    .faq-toggle:hover {
      background-color: #01579b;
    }
  
    .message-container {
      background-color: #e1f5fe;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
  
    .message {
      font-size: 18px;
      line-height: 1.5;
    }
    
    .faq-container {
      background-color: #e1f5fe;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      max-height: 500px;
      overflow-y: auto;
    }
    
    .faq-item {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #bbdefb;
    }
    
    .faq-item:last-child {
      border-bottom: none;
    }
    
    .faq-item ul, .faq-item ol {
      padding-left: 20px;
      margin: 10px 0;
    }
    
    .faq-item li {
      margin-bottom: 5px;
    }
    
    .debug-container {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      font-family: monospace;
    }
    
    .tool-log {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      background-color: #fff;
    }
    
    .log-entry {
      padding: 8px;
      margin-bottom: 8px;
      border-left: 4px solid #ccc;
      font-size: 14px;
    }
    
    .log-entry.tool_call {
      border-left-color: #0d47a1;
      background-color: #e3f2fd;
    }
    
    .log-entry.query {
      border-left-color: #1976d2;
      background-color: #e3f2fd;
    }
    
    .log-entry.response {
      border-left-color: #ff9800;
      background-color: #fff3e0;
    }
    
    .timestamp {
      font-size: 12px;
      color: #666;
      margin-right: 8px;
    }
    
    .event-type {
      font-weight: bold;
    }
    
    .params {
      margin-top: 4px;
      font-size: 12px;
      color: #444;
      word-break: break-all;
    }
    
    .info-container {
      background-color: #e3f2fd;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
  </style>