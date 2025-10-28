import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextRequest } from 'next/server';

// Configurar cliente para OpenRouter
const config = new Configuration({
  apiKey: process.env.OPENROUTER_API_KEY,
  basePath: process.env.OPENROUTER_BASE_URL,
});

const openai = new OpenAIApi(config);

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 API route iniciada');
    
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY no configurada');
      return new Response('Server configuration error', { status: 500 });
    }

    const { messages } = await req.json();
    console.log('📨 Mensajes recibidos:', messages?.length);
    console.log('📋 Contenido de mensajes:', JSON.stringify(messages, null, 2));

    // Validaciones mejoradas con más info
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Messages no es array:', typeof messages);
      return new Response('Messages are required', { status: 400 });
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(`📝 Validando mensaje ${i}:`, message.role);
      
      if (!message.content || typeof message.content !== 'string') {
        console.error(`❌ Mensaje ${i} inválido - content:`, message.content, 'tipo:', typeof message.content);
        return new Response(`Invalid message format at index ${i}`, { status: 400 });
      }
      
      // SOLO validar longitud para mensajes del usuario, no de la IA
      if (message.role === 'user' && message.content.length > 1000) {
        console.error(`❌ Mensaje de usuario ${i} muy largo:`, message.content.length);
        return new Response(`User message too long at index ${i}`, { status: 400 });
      }

      // Verificar que tenga role
      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        console.error(`❌ Mensaje ${i} sin role válido:`, message.role);
        return new Response(`Invalid role at index ${i}`, { status: 400 });
      }
    }

    console.log('✅ Todas las validaciones pasaron');
    console.log('🌐 Llamando a OpenRouter...');

    // Usar OpenAI SDK con configuración de OpenRouter
    const response = await openai.createChatCompletion({
      model: process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    console.log('✅ Procesando stream...');

    // Convertir usando AI SDK
    const stream = OpenAIStream(response);
    
    return new StreamingTextResponse(stream);
    
  } catch (error) {
    console.error('💥 Error completo:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
}