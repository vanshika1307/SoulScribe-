import React, { useState, useEffect, useRef } from 'react';
import { generateJournalPrompts, generateDecorativeAsset } from './services/geminiService';
import { JournalEntry, Sticker, TodoItem, GeneratorMode } from './types';
import { v4 as uuidv4 } from 'uuid';

// --- Helper Components ---

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
  </div>
);

const BackgroundPattern = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Cute scattered background elements */}
        <div className="absolute top-[5%] left-[5%] text-4xl opacity-30 rotate-[-15deg]">🎀</div>
        <div className="absolute top-[15%] right-[10%] text-3xl opacity-30 rotate-[15deg]">💖</div>
        <div className="absolute bottom-[20%] left-[15%] text-5xl opacity-20 rotate-[45deg]">🎀</div>
        <div className="absolute bottom-[10%] right-[20%] text-4xl opacity-30 rotate-[-10deg]">💕</div>
        <div className="absolute top-[40%] left-[2%] text-3xl opacity-25 rotate-[12deg]">🤍</div>
        <div className="absolute top-[60%] right-[5%] text-4xl opacity-30 rotate-[-5deg]">🎀</div>
        <div className="absolute top-[80%] left-[8%] text-3xl opacity-30 rotate-[20deg]">💖</div>
        <div className="absolute top-[25%] left-[30%] text-2xl opacity-20 rotate-[30deg]">🌸</div>
        <div className="absolute bottom-[35%] right-[35%] text-4xl opacity-20 rotate-[-20deg]">🌸</div>
        <div className="absolute top-[10%] left-[40%] text-2xl opacity-20 rotate-[-40deg]">✨</div>
        <div className="absolute bottom-[5%] left-[50%] text-3xl opacity-20 rotate-[10deg]">✨</div>
    </div>
  )
}

// --- Main App ---

const App: React.FC = () => {
  // State
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entry, setEntry] = useState<JournalEntry>({
    id: 'init',
    date: new Date().toISOString().split('T')[0],
    content: '',
    todos: [],
    stickers: []
  });
  
  // UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMode, setGenMode] = useState<GeneratorMode>(GeneratorMode.None);
  const [promptInput, setPromptInput] = useState('');
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  
  // Dragging State
  const [draggedStickerId, setDraggedStickerId] = useState<string | null>(null);
  const notebookRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount/date change
  useEffect(() => {
    const savedData = localStorage.getItem(`journal-${currentDate}`);
    if (savedData) {
      setEntry(JSON.parse(savedData));
    } else {
      setEntry({
        id: uuidv4(),
        date: currentDate,
        content: '',
        todos: [
          { id: uuidv4(), text: 'Drink water', completed: false },
          { id: uuidv4(), text: 'Take a deep breath', completed: false }
        ],
        stickers: []
      });
    }
    setAiPrompts([]); // Clear prompts on new page
  }, [currentDate]);

  // Save to local storage on change
  useEffect(() => {
    if (entry.id !== 'init') {
      localStorage.setItem(`journal-${currentDate}`, JSON.stringify(entry));
    }
  }, [entry, currentDate]);

  // --- Handlers ---

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntry(prev => ({ ...prev, content: e.target.value }));
  };

  const toggleTodo = (id: string) => {
    setEntry(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));
  };

  const addTodo = (text: string) => {
    if (!text.trim()) return;
    setEntry(prev => ({
      ...prev,
      todos: [...prev.todos, { id: uuidv4(), text, completed: false }]
    }));
  };

  const deleteTodo = (id: string) => {
    setEntry(prev => ({
      ...prev,
      todos: prev.todos.filter(t => t.id !== id)
    }));
  };

  const handleGeneratePrompts = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    try {
      const prompts = await generateJournalPrompts(promptInput);
      setAiPrompts(prompts);
      setGenMode(GeneratorMode.None);
      setPromptInput('');
    } catch (e) {
      alert("Failed to generate prompts. Check your API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAsset = async (type: 'sticker' | 'washi') => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    try {
      const assetUrl = await generateDecorativeAsset(promptInput, type);
      if (assetUrl) {
        const newSticker: Sticker = {
          id: uuidv4(),
          imageUrl: assetUrl,
          x: Math.random() * 200 + 50, // Random initial position
          y: Math.random() * 200 + 50,
          rotation: (Math.random() * 20) - 10,
          scale: 1,
          type
        };
        setEntry(prev => ({ ...prev, stickers: [...prev.stickers, newSticker] }));
      }
      setGenMode(GeneratorMode.None);
      setPromptInput('');
    } catch (e) {
      alert("Failed to generate image. Ensure you are using a paid API key for image models if required, or check quota.");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPromptToJournal = (prompt: string) => {
    setEntry(prev => ({
      ...prev,
      content: prev.content + (prev.content ? '\n\n' : '') + `✨ ${prompt}\n`
    }));
  };

  // Sticker Drag Logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    setDraggedStickerId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedStickerId || !notebookRef.current) return;
    
    const rect = notebookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEntry(prev => ({
      ...prev,
      stickers: prev.stickers.map(s => 
        s.id === draggedStickerId 
          ? { ...s, x: x - 50, y: y - 50 } // Center offset
          : s
      )
    }));
  };

  const handleMouseUp = () => {
    setDraggedStickerId(null);
  };

  const removeSticker = (id: string) => {
    setEntry(prev => ({
      ...prev,
      stickers: prev.stickers.filter(s => s.id !== id)
    }));
  };

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 font-hand text-ink select-none relative z-10" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      
      <BackgroundPattern />

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-6 relative z-20">
        <div>
          <h1 className="text-4xl font-title text-stone-800 drop-shadow-sm">SoulScribe</h1>
          <p className="text-stone-700 font-sans text-sm font-medium">Your digital sanctuary</p>
        </div>
        <div className="flex items-center gap-4 bg-white/70 p-2 rounded-xl backdrop-blur-md shadow-sm border border-white/50">
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - 1);
              setCurrentDate(d.toISOString().split('T')[0]);
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded-full transition"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <input 
            type="date" 
            value={currentDate} 
            onChange={(e) => setCurrentDate(e.target.value)}
            className="bg-transparent font-bold font-sans text-stone-700 outline-none cursor-pointer"
          />
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + 1);
              setCurrentDate(d.toISOString().split('T')[0]);
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded-full transition"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </header>

      {/* Main Notebook Area */}
      <div className="relative w-full max-w-6xl flex flex-col lg:flex-row gap-8 z-10">
        
        {/* Left: Toolbar & AI Assistant */}
        <aside className="lg:w-1/4 flex flex-col gap-6">
          
          {/* Tools Panel */}
          <div className="bg-[#fdfbf7]/95 backdrop-blur-sm p-6 rounded-lg shadow-lg rotate-[-1deg] border border-stone-200 relative overflow-hidden">
             {/* Tape effect */}
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-200/80 rotate-2 opacity-80" style={{clipPath: 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)'}}></div>

            <h2 className="text-2xl font-bold mb-4 text-stone-700">Creative Tools</h2>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setGenMode(GeneratorMode.Prompts)}
                className="flex items-center gap-3 p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Get Writing Ideas
              </button>
              <button 
                onClick={() => setGenMode(GeneratorMode.Sticker)}
                className="flex items-center gap-3 p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-note-sticky"></i> Create Sticker
              </button>
              <button 
                onClick={() => setGenMode(GeneratorMode.Washi)}
                className="flex items-center gap-3 p-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition text-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <i className="fa-solid fa-scroll"></i> Create Washi Tape
              </button>
            </div>
          </div>

          {/* AI Prompts Display */}
          {aiPrompts.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-lg shadow-md rotate-1 relative animate-fade-in font-hand border border-stone-100">
               <div className="absolute -top-2 right-4 w-4 h-4 rounded-full bg-red-400 shadow-inner"></div>
              <h3 className="text-xl font-bold mb-2 text-stone-600">Ideas for Today:</h3>
              <ul className="space-y-2">
                {aiPrompts.map((p, idx) => (
                  <li key={idx} className="group flex items-start gap-2">
                    <span className="mt-1 text-stone-400">•</span>
                    <button 
                      onClick={() => applyPromptToJournal(p)}
                      className="text-left hover:text-indigo-600 hover:underline decoration-wavy transition"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generator Modal / Panel */}
          {genMode !== GeneratorMode.None && (
            <div className="bg-white p-6 rounded-lg shadow-2xl border-2 border-stone-800 relative animate-slide-up z-30">
              <button 
                onClick={() => setGenMode(GeneratorMode.None)} 
                className="absolute top-2 right-2 text-stone-400 hover:text-stone-800"
              >
                <i className="fa-solid fa-times"></i>
              </button>
              
              <h3 className="text-xl font-bold mb-3">
                {genMode === GeneratorMode.Prompts ? "How are you feeling?" : 
                 genMode === GeneratorMode.Sticker ? "Describe your sticker:" : "Describe the pattern:"}
              </h3>
              
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={
                    genMode === GeneratorMode.Prompts ? "e.g., Anxious about work, Happy about rain..." :
                    genMode === GeneratorMode.Sticker ? "e.g., A sleeping cat, a cup of coffee..." :
                    "e.g., Cherry blossoms, geometric shapes..."
                }
                className="w-full p-3 bg-stone-800 text-white placeholder-stone-400 border-2 border-stone-800 rounded-lg font-sans text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-3 resize-none h-24 transition-colors"
              />
              
              <button
                onClick={() => {
                   if (genMode === GeneratorMode.Prompts) handleGeneratePrompts();
                   else handleGenerateAsset(genMode === GeneratorMode.Sticker ? 'sticker' : 'washi');
                }}
                disabled={isGenerating || !promptInput}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex justify-center items-center gap-2 shadow-md"
              >
                {isGenerating ? <LoadingSpinner /> : (
                  <>
                    <i className="fa-solid fa-bolt"></i> Generate
                  </>
                )}
              </button>
            </div>
          )}

        </aside>

        {/* Right: The Notebook */}
        <main className="flex-1 relative perspective-1000">
            {/* Notebook Cover/Pages */}
            <div 
                ref={notebookRef}
                className="relative bg-[#fdfbf7] shadow-2xl rounded-r-2xl rounded-l-md min-h-[800px] flex overflow-hidden border-l-[12px] border-l-stone-800/20"
                style={{
                    boxShadow: '10px 10px 30px rgba(0,0,0,0.1), inset 10px 0 20px rgba(0,0,0,0.05)'
                }}
            >
                {/* Spiral/Spine Effect */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-stone-300 via-stone-100 to-transparent z-10"></div>
                
                {/* Page Content Container */}
                <div className="flex-1 p-8 pl-12 flex flex-col md:flex-row gap-8 relative z-0">

                     {/* Background Lines */}
                     <div className="absolute inset-0 z-[-1] pointer-events-none opacity-50"
                          style={{
                              backgroundImage: 'linear-gradient(#a0aec0 1px, transparent 1px)',
                              backgroundSize: '100% 2rem',
                              marginTop: '3rem'
                          }}
                     ></div>
                     
                     {/* Vertical Red Margin Line */}
                     <div className="absolute top-0 bottom-0 left-24 w-px bg-red-300/50 z-[-1]"></div>

                     {/* Left Page Column: Journaling */}
                     <div className="flex-1 relative">
                        <div className="flex justify-between items-end mb-4 pb-2 border-b-2 border-stone-800/10">
                            <span className="text-stone-400 font-bold text-xl tracking-widest uppercase">
                                {new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                            <span className="text-3xl font-bold text-stone-700">
                                {new Date(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>

                        <textarea
                            value={entry.content}
                            onChange={handleContentChange}
                            placeholder="Dear Journal, today I..."
                            className="w-full h-[600px] bg-transparent resize-none outline-none text-2xl leading-[2rem] text-stone-800 font-cursive"
                            style={{
                                lineHeight: '2rem'
                            }}
                        />
                     </div>

                     {/* Right Page Column: Todos & Decor */}
                     <div className="w-full md:w-1/3 border-l-2 border-stone-800/5 pl-6 md:block flex flex-col">
                        <div className="bg-yellow-50/80 p-4 rounded shadow-sm rotate-1 border border-yellow-200 mb-8 relative">
                            {/* Tape */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-stone-200/50 rotate-[-2deg]"></div>
                            
                            <h3 className="font-bold text-xl mb-3 text-stone-600 border-b border-stone-300 pb-1">To-Do List</h3>
                            <ul className="space-y-2">
                                {entry.todos.map(todo => (
                                    <li key={todo.id} className="flex items-start gap-2 group">
                                        <button 
                                            onClick={() => toggleTodo(todo.id)}
                                            className={`mt-1 w-5 h-5 border-2 rounded-sm flex items-center justify-center transition ${todo.completed ? 'border-green-500 bg-green-50' : 'border-stone-400'}`}
                                        >
                                            {todo.completed && <i className="fa-solid fa-check text-green-600 text-xs"></i>}
                                        </button>
                                        <span className={`flex-1 text-lg leading-6 transition ${todo.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                                            {todo.text}
                                        </span>
                                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-400 transition">
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 mt-2">
                                    <i className="fa-solid fa-plus text-stone-300"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Add task..."
                                        className="bg-transparent outline-none border-b border-transparent focus:border-stone-300 w-full font-hand text-lg"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addTodo(e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                </li>
                            </ul>
                        </div>

                        {/* Decoration Hint */}
                        <div className="text-center p-4 border-2 border-dashed border-stone-300 rounded-lg text-stone-400 text-sm">
                            <i className="fa-regular fa-image text-2xl mb-2 block"></i>
                            Drag AI stickers here from the sidebar
                        </div>
                     </div>
                </div>

                {/* Stickers Layer (Absolute positioned on top of the page) */}
                {entry.stickers.map(sticker => (
                    <div
                        key={sticker.id}
                        className="absolute cursor-move group touch-none"
                        style={{
                            left: sticker.x,
                            top: sticker.y,
                            transform: `rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                            zIndex: draggedStickerId === sticker.id ? 50 : 10,
                            // Washi tape specific styling vs Sticker styling
                            filter: sticker.type === 'washi' ? 'opacity(0.9)' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, sticker.id)}
                    >
                        <img 
                            src={sticker.imageUrl} 
                            alt="decoration" 
                            className={`pointer-events-none select-none ${sticker.type === 'washi' ? 'h-12 w-48 object-cover opacity-90 mix-blend-multiply' : 'w-32 h-32 object-contain'}`}
                        />
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                removeSticker(sticker.id);
                            }}
                            className="absolute -top-2 -right-2 bg-red-400 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                        >
                            <i className="fa-solid fa-times"></i>
                        </button>
                    </div>
                ))}
            </div>
            
            {/* Book bottom pages stack effect */}
            <div className="h-4 w-[98%] mx-auto bg-white border border-t-0 border-stone-300 rounded-b-md shadow-md mt-[-2px] z-[-1]"></div>
            <div className="h-3 w-[96%] mx-auto bg-white border border-t-0 border-stone-300 rounded-b-md shadow-sm mt-[-2px] z-[-2]"></div>

        </main>
      </div>

        {/* Introduction / Empty State Helper */}
        {entry.content === '' && entry.stickers.length === 0 && !isGenerating && (
             <div className="fixed bottom-8 right-8 bg-white p-4 rounded-xl shadow-xl border border-stone-200 max-w-xs animate-bounce-in z-50">
                 <div className="flex items-start gap-3">
                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl">
                         <i className="fa-solid fa-robot"></i>
                     </div>
                     <div>
                         <p className="text-sm text-stone-600">
                             <b>Welcome to SoulScribe!</b> <br/>
                             I'm your AI companion. Click "Get Writing Ideas" if you're stuck, or "Create Sticker" to decorate!
                         </p>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default App;