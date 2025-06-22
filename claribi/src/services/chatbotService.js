import api from './api';

const chatbotService = {
  // Send a query to the chatbot and get a response
  sendQuery: async (projectId, reportId, query) => {
    try {
      console.log(`Sending query to chatbot: project=${projectId}, report=${reportId}, query="${query}"`);
      
      // Match the endpoint to the Flask blueprint configuration
      const response = await api.post('/api/chatbot/query', {
        project_id: projectId,
        report_id: reportId,
        query: query
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Chatbot response:', response);
      return response;
    } catch (error) {
      console.error('Error sending query to chatbot:', error);
      console.error('Error details:', error.response || error.message);
      
      return {
        data: {
          success: false,
          error: error.response?.data?.error || error.message || 'Failed to get response from chatbot'
        }
      };
    }
  }
};

export default chatbotService; 