import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { TextArea, Input } from './ui/Input';
import { analyzeWritingStyle } from '../services/geminiService';
import { PersonaProfile, FileInput } from '../types';
import { getErrorMessage } from '../utils/errorMessage';
import { IconAnalyze, IconProcessing, IconUpload, IconFile, IconImage, IconPdf, IconDownload } from './Icons';

interface Props {
  onAnalysisComplete: (persona: PersonaProfile) => void;
}

type InputMode = 'TEXT' | 'FILE';

interface UploadedFile {
  name: string;
  type: string;
  content: string; // Base64
  preview?: string;
}

export const PersonaAnalyzer: React.FC<Props> = ({ onAnalysisComplete }) => {
  const [mode, setMode] = useState<InputMode>('FILE');
  const [textSamples, setTextSamples] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for holding the result before confirming
  const [editableProfile, setEditableProfile] = useState<PersonaProfile | null>(null);

  const handleAnalyze = async () => {
    if (!textSamples.trim() && uploadedFiles.length === 0) {
        setError("Input data required. Enter text or attach files.");
        return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setEditableProfile(null); // Clear previous results while analyzing

    try {
      const serviceFiles: FileInput[] = uploadedFiles.map(f => ({
          mimeType: f.type,
          data: f.content.split(',')[1] 
      }));

      const result = await analyzeWritingStyle(textSamples, serviceFiles);
      
      // Store the input text/context in the profile for Phase 2 cross-referencing
      const contextNote = textSamples 
        ? textSamples 
        : `(Analysis derived from ${uploadedFiles.length} uploaded files. Gender map will be inferred from these file contexts if possible.)`;

      setEditableProfile({ 
          ...result, 
          isReady: true,
          rawSamples: contextNote 
      });
    } catch (err) {
      setError(`Analysis failed: ${getErrorMessage(err, "Unknown API error")}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmProfile = () => {
    if (editableProfile) {
        onAnalysisComplete(editableProfile);
    }
  };

  const handleExportProfile = () => {
    if (!editableProfile) return;
    const jsonString = JSON.stringify(editableProfile, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `teacher-persona-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files) as File[];
          processFiles(files);
      }
  };

  const processFiles = (files: File[]) => {
      files.forEach(file => {
          // Special handling for JSON Persona Import
          if (file.type === 'application/json' || file.name.endsWith('.json')) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  try {
                      const jsonContent = e.target?.result as string;
                      const parsed = JSON.parse(jsonContent);
                      
                      // Basic validation to ensure it's a PersonaProfile
                      if (parsed.tone && parsed.vocabulary && parsed.structure) {
                          setEditableProfile({
                              ...parsed,
                              isReady: true,
                              rawSamples: parsed.rawSamples || "(Imported from JSON Persona File)"
                          });
                          setError(null); // Clear errors if import succeeds
                      } else {
                          setError("Invalid JSON Persona file format.");
                      }
                  } catch (err) {
                      setError("Failed to parse JSON file.");
                  }
              };
              reader.readAsText(file);
              return; // Skip adding to uploadedFiles list
          }

          // Normal file processing for PDF/Images
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              setUploadedFiles(prev => [...prev, {
                  name: file.name,
                  type: file.type,
                  content: result
              }]);
          };
          reader.readAsDataURL(file);
      });
  };

  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFiles(Array.from(e.dataTransfer.files) as File[]);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  // Helper to update specific fields in the generated profile
  const updateProfile = (field: keyof PersonaProfile, value: any) => {
      if (!editableProfile) return;
      setEditableProfile({
          ...editableProfile,
          [field]: value
      });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2 border-l-2 border-chartreuse pl-4">
        <h2 className="font-serif text-3xl text-prussian">Phase 1: Analysis</h2>
        <p className="font-sans text-sage text-lg max-w-xl">
          Ingest teacher writing samples (PDFs, Images, or Text) to calibrate the engine.
        </p>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT COLUMN: INPUT */}
        <div className="flex flex-col gap-6 h-full">
            <div className="flex border-b border-sage/30">
                <button 
                    onClick={() => setMode('FILE')}
                    className={`px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${mode === 'FILE' ? 'bg-sage/10 text-prussian border-b-2 border-chartreuse' : 'text-sage hover:text-prussian'}`}
                >
                    File Ingestion
                </button>
                <button 
                    onClick={() => setMode('TEXT')}
                    className={`px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${mode === 'TEXT' ? 'bg-sage/10 text-prussian border-b-2 border-chartreuse' : 'text-sage hover:text-prussian'}`}
                >
                    Manual Entry
                </button>
            </div>

            <div className="flex-grow">
                {mode === 'TEXT' ? (
                     <TextArea 
                        placeholder="Paste 5-10 examples of your previous comments here..."
                        value={textSamples}
                        onChange={(e) => setTextSamples(e.target.value)}
                        className="min-h-[300px]"
                    />
                ) : (
                    <div className="flex flex-col gap-4">
                         <div 
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-sage/40 hover:border-chartreuse hover:bg-sage/5 transition-all cursor-pointer h-48 flex flex-col items-center justify-center gap-4 group"
                        >
                            <input 
                                type="file" 
                                multiple 
                                accept="application/pdf,image/*,.txt,application/json"
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <div className="p-4 bg-offWhite border border-sage/20 rounded-full group-hover:scale-110 transition-transform">
                                <IconUpload className="w-6 h-6 text-prussian" />
                            </div>
                            <div className="text-center">
                                <p className="font-mono text-xs text-prussian uppercase tracking-widest">Initiate Data Transfer</p>
                                <p className="font-sans text-xs text-sage mt-1">PDF, PNG, JPG, TXT</p>
                                <p className="font-mono text-[10px] text-chartreuse mt-2 bg-prussian/5 inline-block px-2">OR IMPORT JSON PERSONA</p>
                            </div>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="font-mono text-xs text-sage uppercase mb-1">Staged Files</p>
                                {uploadedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-sage/20 p-3">
                                        <div className="flex items-center gap-3">
                                            {file.type.includes('pdf') ? <IconPdf className="w-5 h-5 text-prussian" /> : 
                                             file.type.includes('image') ? <IconImage className="w-5 h-5 text-prussian" /> : 
                                             <IconFile className="w-5 h-5 text-prussian" />}
                                            <span className="font-mono text-xs text-nearBlack truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => removeFile(idx)}
                                            className="text-xs font-mono text-sage hover:text-red-600 uppercase"
                                        >
                                            [Remove]
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleAnalyze} isLoading={isAnalyzing}>
              {isAnalyzing ? "Processing Data..." : "Initiate Protocol"} <IconAnalyze className="w-4 h-4 ml-2" />
            </Button>
            {error && <p className="font-mono text-red-600 text-xs mt-2 border-l-2 border-red-600 pl-2">{error}</p>}
          </div>
        </div>

        {/* RIGHT COLUMN: STATUS OR RESULT EDITOR */}
        <div className={`
            bg-white border transition-all duration-500 overflow-hidden relative flex flex-col
            ${editableProfile ? 'border-chartreuse shadow-lg min-h-[600px]' : 'border-sage/30 justify-center items-center min-h-[400px]'}
        `}>
          
          {/* SCENARIO 1: PROCESSING */}
          {isAnalyzing && (
             <div className="absolute inset-0 z-10 bg-white flex flex-col justify-center items-center gap-6">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="text-chartreuse"
                >
                    <IconProcessing className="w-16 h-16" />
                </motion.div>
                <div className="font-mono text-xs text-prussian uppercase tracking-widest animate-pulse">
                    Parsing {mode === 'FILE' ? 'Document Structure' : 'Text Patterns'}...
                </div>
             </div>
          )}

          {/* SCENARIO 2: EDITABLE RESULT */}
          {editableProfile && !isAnalyzing ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col h-full"
              >
                  <div className="bg-prussian p-6 flex justify-between items-center">
                      <h3 className="font-serif text-2xl text-white">Identity Construct Identified</h3>
                      <div className="px-2 py-1 border border-chartreuse text-chartreuse font-mono text-[10px] uppercase tracking-widest">
                          Review Required
                      </div>
                  </div>
                  
                  <div className="p-6 flex-grow overflow-y-auto space-y-6">
                      <p className="font-sans text-sage text-sm italic border-b border-sage/20 pb-4">
                          The engine has extracted the following persona profile. Review and refine fields before entering Production Phase.
                      </p>

                      <Input 
                        label="Tone & Voice Trajectory"
                        value={editableProfile.tone}
                        onChange={(e) => updateProfile('tone', e.target.value)}
                      />

                      <TextArea 
                        label="Structural Formula"
                        rows={3}
                        value={editableProfile.structure}
                        onChange={(e) => updateProfile('structure', e.target.value)}
                      />

                      <TextArea 
                        label="Formatting Constraints"
                        rows={2}
                        value={editableProfile.formatting}
                        onChange={(e) => updateProfile('formatting', e.target.value)}
                      />

                      <div>
                          <label className="font-mono text-xs text-sage uppercase tracking-wider mb-1 block">
                              Vocabulary Bank (Comma Separated)
                          </label>
                          <textarea
                             className="w-full bg-offWhite border border-sage p-4 text-nearBlack font-mono text-sm focus:outline-none focus:border-prussian resize-none transition-colors"
                             rows={4}
                             value={editableProfile.vocabulary.join(', ')}
                             onChange={(e) => updateProfile('vocabulary', e.target.value.split(',').map(s => s.trim()))}
                          />
                      </div>
                  </div>

                  <div className="p-6 border-t border-sage/20 bg-offWhite/30 flex flex-wrap justify-end gap-4">
                      <Button variant="secondary" onClick={() => setEditableProfile(null)}>
                          Discard & Reset
                      </Button>
                      <Button variant="secondary" onClick={handleExportProfile}>
                          Export JSON <IconDownload className="w-4 h-4 ml-2" />
                      </Button>
                      <Button onClick={handleConfirmProfile}>
                          Confirm & Proceed to Phase 2
                      </Button>
                  </div>
              </motion.div>
          ) : (
            // SCENARIO 3: STANDBY
            !isAnalyzing && (
                <div className="opacity-50 grayscale flex flex-col items-center">
                    <div className="font-serif text-6xl text-offWhite mb-4 select-none">A.I.</div>
                    <p className="font-mono text-xs text-sage uppercase tracking-widest text-center">
                        System Standby<br/>Awaiting Input
                    </p>
                    {/* Aesthetic grid lines for standby */}
                    <div className="absolute top-0 left-8 bottom-0 w-px bg-offWhite/50 pointer-events-none" />
                    <div className="absolute top-8 left-0 right-0 h-px bg-offWhite/50 pointer-events-none" />
                    <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-sage/20 pointer-events-none" />
                </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
