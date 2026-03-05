
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phase, PersonaProfile } from './types';
import { INITIAL_PERSONA, APP_NAME, APP_VERSION } from './constants';
import { PersonaAnalyzer } from './components/PersonaAnalyzer';
import { CommentGenerator } from './components/CommentGenerator';

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>(Phase.ANALYSIS);
  const [persona, setPersona] = useState<PersonaProfile>(INITIAL_PERSONA);

  const handleAnalysisComplete = (newPersona: PersonaProfile) => {
    setPersona(newPersona);
    setPhase(Phase.PRODUCTION);
  };

  const handleImportPersona = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.tone && parsed.vocabulary && parsed.structure) {
            handleAnalysisComplete({
              ...parsed,
              isReady: true,
              rawSamples: parsed.rawSamples || "(Imported from JSON Persona File)"
            });
          } else {
            alert("Invalid JSON Persona file format.");
          }
        } catch (err) {
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-offWhite text-nearBlack selection:bg-chartreuse selection:text-nearBlack overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-sage/20 bg-offWhite sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-end">
          <div>
            <h1 className="font-serif text-4xl text-prussian tracking-tighter leading-none">
              {APP_NAME}
            </h1>
            <div className="flex gap-4 mt-2 items-center">
              <span className="font-mono text-xs text-sage tracking-widest">{APP_VERSION}</span>
              <div className={`h-2 w-2 ${phase === Phase.PRODUCTION ? 'bg-chartreuse animate-pulse' : 'bg-sage'}`}></div>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-8 items-center">
            {phase === Phase.ANALYSIS && (
                <>
                    <input type="file" accept=".json" className="hidden" id="persona-import" onChange={handleImportPersona} />
                    <label htmlFor="persona-import" className="cursor-pointer font-mono text-xs uppercase text-sage hover:text-prussian underline decoration-chartreuse">
                        Import Persona
                    </label>
                </>
            )}
            <div className={`flex flex-col items-end ${phase === Phase.ANALYSIS ? 'opacity-100' : 'opacity-40'}`}>
              <span className="font-mono text-xs uppercase text-sage mb-1">Phase 01</span>
              <span className="font-bold text-prussian">ANALYSIS</span>
            </div>
            <div className={`w-px bg-sage/30 h-10`}></div>
            <div className={`flex flex-col items-end ${phase === Phase.PRODUCTION ? 'opacity-100' : 'opacity-40'}`}>
              <span className="font-mono text-xs uppercase text-sage mb-1">Phase 02</span>
              <span className="font-bold text-prussian">PRODUCTION</span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">
          {phase === Phase.ANALYSIS && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="h-full"
            >
              <PersonaAnalyzer onAnalysisComplete={handleAnalysisComplete} />
            </motion.div>
          )}

          {phase === Phase.PRODUCTION && (
            <motion.div
              key="production"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Persona Sidebar */}
                <div className="lg:col-span-1 border-r border-sage/20 pr-8 hidden lg:block">
                    <div className="sticky top-32 space-y-8">
                        <div>
                            <h3 className="font-serif text-xl text-prussian mb-4">Persona Profile</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="font-mono text-xs text-sage uppercase">Tone</label>
                                    <p className="font-sans font-bold text-prussian leading-tight">{persona.tone}</p>
                                </div>
                                <div>
                                    <label className="font-mono text-xs text-sage uppercase">Structure</label>
                                    <p className="font-sans text-sm text-nearBlack leading-tight mt-1">{persona.structure}</p>
                                </div>
                                <div>
                                    <label className="font-mono text-xs text-sage uppercase">Formatting</label>
                                    <p className="font-mono text-xs text-nearBlack mt-1 break-words">{persona.formatting}</p>
                                </div>
                                <div>
                                    <label className="font-mono text-xs text-sage uppercase">Vocabulary Bank</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {persona.vocabulary.map((word, i) => (
                                            <span key={i} className="bg-white border border-sage/30 px-2 py-1 text-xs font-mono text-prussian">
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setPhase(Phase.ANALYSIS)}
                            className="text-xs font-mono text-sage underline decoration-chartreuse hover:text-prussian"
                        >
                            RE-CALIBRATE PROTOCOL
                        </button>
                    </div>
                </div>

                {/* Generator Area */}
                <div className="lg:col-span-3">
                   <CommentGenerator persona={persona} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-prussian text-offWhite py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
                <h4 className="font-serif text-2xl mb-2">{APP_NAME}</h4>
                <p className="font-mono text-xs text-sage max-w-md">
                    Constructed for pedagogical precision. <br/>
                    Rationalist aesthetics meets generative intelligence.
                </p>
            </div>
            <div className="flex gap-8">
                <div className="text-right">
                    <div className="font-mono text-xs text-chartreuse uppercase mb-1">Status</div>
                    <div className="font-sans font-bold">OPERATIONAL</div>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
