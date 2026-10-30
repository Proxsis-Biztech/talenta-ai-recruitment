'use client';

import { useState } from 'react';
import { Mic, Settings, ArrowLeft, Send, Zap, Volume2 } from 'lucide-react';

export default function Page() {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<
    { type: 'user' | 'system'; content: string }[]
  >([]);
  const [inputValue, setInputValue] = useState('');

  const handleStartInterview = () => {
    setIsRecording(!isRecording);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages([...messages, { type: 'user', content: inputValue }]);
      setInputValue('');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { type: 'system', content: 'Question received. Please continue...' },
        ]);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-[#1a2332] text-foreground">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 flex h-screen flex-col lg:flex-row">
        {/* Left panel - Interview Settings */}
        <div className="w-full lg:w-96 border-r border-border/50 backdrop-blur-xl bg-card/30 p-6 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-amber-400 flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-balance">AI HR</h1>
                <p className="text-xs text-muted-foreground">Interview Room</p>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-300">Status: Ready</span>
          </div>

          {/* Interview Settings Section */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Interview Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Interviewer Voice
                </label>
                <select className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm">
                  <option>Professional Voice</option>
                  <option>Friendly Voice</option>
                  <option>Executive Voice</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Interview Language
                </label>
                <select className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
            </div>
          </div>

          {/* Voice Console */}
          <div className="space-y-4 flex-1 flex flex-col">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice Console
            </h2>

            <div className="flex-1 rounded-2xl bg-gradient-to-b from-card/50 to-background/50 border border-border/50 backdrop-blur-sm p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-border/80 transition-all">
              {/* Animated background rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`absolute w-20 h-20 border-2 border-primary/20 rounded-full transition-all duration-300 ${isRecording ? 'animate-pulse scale-110' : ''}`}></div>
                <div className={`absolute w-32 h-32 border border-primary/10 rounded-full transition-all duration-300 ${isRecording ? 'scale-125' : ''}`}></div>
              </div>

              {/* Mic icon */}
              <div
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50'
                    : 'bg-gradient-to-br from-muted to-muted/50'
                }`}
              >
                <Mic
                  className={`w-7 h-7 transition-colors ${
                    isRecording ? 'text-white' : 'text-muted-foreground'
                  }`}
                />
              </div>

              {/* Status text */}
              <p className="text-center text-sm font-medium text-muted-foreground mt-6 relative z-10">
                {isRecording ? 'RECORDING' : 'DISCONNECTED'}
              </p>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                isRecording
                  ? 'bg-red-500/80 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-r from-primary via-amber-300 to-primary hover:shadow-lg hover:shadow-primary/50 text-primary-foreground'
              }`}
            >
              <Mic className="w-4 h-4" />
              {isRecording ? 'Stop Interview' : 'Start Interview'}
            </button>
          </div>
        </div>

        {/* Right panel - Live Transcript */}
        <div className="flex-1 flex flex-col border-t lg:border-t-0 border-border/50 backdrop-blur-xl bg-background/50">
          {/* Header */}
          <div className="border-b border-border/50 px-8 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Conversation</h2>
              <p className="text-xs text-muted-foreground mt-1">Live transcript</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-xs font-medium text-blue-300">Realtime active</span>
            </div>
          </div>

          {/* Transcript area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Waiting to connect
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Start the interview and every question, answer, and system cue
                  will appear here in real time.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'system' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs px-4 py-3 rounded-xl ${
                      msg.type === 'user'
                        ? 'bg-primary/20 border border-primary/30 text-foreground'
                        : 'bg-card border border-border/50 text-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border/50 px-8 py-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  ) {
                    handleSendMessage();
                  }
                }}
                placeholder="Type your response..."
                className="flex-1 bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-sm"
              />
              <button
                onClick={handleSendMessage}
                className="bg-gradient-to-r from-primary to-amber-300 hover:shadow-lg hover:shadow-primary/50 text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
