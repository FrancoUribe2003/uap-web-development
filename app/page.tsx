'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const [error, setError] = useState<string | null>(null);

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('El mensaje no puede estar vacío');
      return;
    }

    if (input.length > 1000) {
      setError('El mensaje es demasiado largo (máximo 1000 caracteres)');
      return;
    }

    handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col">
      <header className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 shadow-2xl border-b-4 border-blue-800 p-4">
        <div className="flex items-center space-x-3">
          <div className="text-4xl">⚽</div>
          <div>
            <h1 className="text-3xl font-black text-blue-900 drop-shadow-lg">
              BOCA IA
            </h1>
            <p className="text-blue-800 font-bold">La máquina más bostera del mundo</p>
          </div>
          <div className="ml-auto text-2xl">🏆</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-blue-800 to-blue-900">
        {messages.length === 0 && (
          <div className="text-center mt-12">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 shadow-2xl border-4 border-blue-600 max-w-md mx-auto">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-xl font-black text-blue-900">¡DALE BOCA!</p>
              <p className="text-blue-800 font-bold mt-2">Soy tu asistente xeneize</p>
              <p className="text-blue-700 text-sm mt-1">El más grande necesita la mejor IA</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-xl border-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 border-blue-700'
                  : 'bg-gradient-to-r from-yellow-300 to-yellow-400 text-blue-900 border-blue-600'
              }`}
            >
              {message.role === 'user' && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-800 text-xs font-black uppercase">HINCHA</span>
                  <span className="text-blue-700">⚽</span>
                </div>
              )}
              {message.role === 'assistant' && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-800 text-xs font-black uppercase">BOCA IA</span>
                  <span className="text-blue-700">🤖</span>
                </div>
              )}
              <p className="whitespace-pre-wrap font-semibold text-blue-900">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 text-blue-900 shadow-xl border-4 border-blue-600 px-6 py-4 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-4 h-4 bg-blue-700 rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-blue-700 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-4 h-4 bg-blue-700 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm font-black">La máquina xeneize está pensando... 🤖⚽</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-800 to-blue-900 border-t-8 border-yellow-400 p-6">
        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-400 to-red-500 border-4 border-red-600 text-white rounded-xl shadow-lg">
            <span className="font-black">¡OJO CHE!</span> {error}
          </div>
        )}
        
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 rounded-2xl border-4 border-blue-600 shadow-2xl">
          <form onSubmit={validateAndSubmit} className="flex space-x-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Decile algo a la IA más boquense..."
              className="flex-1 p-4 border-4 border-blue-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-800 bg-white text-blue-900 placeholder-blue-500 font-bold text-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-yellow-300 font-black text-xl rounded-xl hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl border-4 border-blue-800 transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? '⏳' : '⚽'}
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-3 px-2">
            <p className="text-xs text-blue-800 font-bold flex items-center space-x-1">
              <span>⚽</span>
              <span>Máximo 1000 caracteres</span>
            </p>
            <p className="text-xs text-blue-700 font-bold flex items-center space-x-1">
              <span>💙💛</span>
              <span>DALE BOCA - Powered by Mistral</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}