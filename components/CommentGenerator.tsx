import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { generateStudentComment, generateBulkComments } from '../services/geminiService';
import { PersonaProfile, StudentData, FileInput } from '../types';
import { IconProduction, IconUpload, IconProcessing, IconCopyAll, IconDoc } from './Icons';

interface Props {
  persona: PersonaProfile;
}

export const CommentGenerator: React.FC<Props> = ({ persona }) => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentMarks, setCurrentMarks] = useState(''); 
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addStudentManual = () => {
    if (!currentName) return;
    const subjectData: Record<string, string> = {};
    currentMarks.split(',').forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) subjectData[key.trim()] = value.trim();
    });

    const newStudent: StudentData = {
      id: Date.now().toString(),
      name: currentName,
      subjectData,
    };

    setStudents([...students, newStudent]);
    setCurrentName('');
    setCurrentMarks('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const fileList = Array.from(e.target.files) as File[];
        setSelectedFileCount(fileList.length);
        await processBulkGeneration(fileList);
    }
  };

  const processBulkGeneration = async (files: File[]) => {
      setIsBulkProcessing(true);
      setProcessingError(null);
      
      const filePromises = files.map(file => {
          return new Promise<FileInput>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  if (e.target?.result) {
                      resolve({
                          mimeType: file.type,
                          data: (e.target.result as string).split(',')[1]
                      });
                  } else {
                      reject(new Error("File read failed"));
                  }
              };
              reader.readAsDataURL(file);
          });
      });

      try {
          const loadedFiles = await Promise.all(filePromises);
          
          // Direct call to bulk generation with ARRAY of files
          const generatedStudents = await generateBulkComments(
              persona,
              loadedFiles
          );
          
          if (generatedStudents.length === 0) {
              setProcessingError("No visible student data found in images.");
          } else {
              setStudents(prev => [...prev, ...generatedStudents]);
          }
      } catch (err) {
          setProcessingError("Bulk generation failed. Verify API quota or image clarity.");
      } finally {
          setIsBulkProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSelectedFileCount(0);
      }
  };

  const handleRegenerate = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    setIsGenerating(studentId);
    try {
        let comment = "";
        if (student.subjectData && Object.keys(student.subjectData).length > 0) {
             comment = await generateStudentComment(
                persona, 
                student.name, 
                student.subjectData
            );
        } else {
             comment = "Regeneration for image-based rows requires re-uploading the specific context. (Feature limited in this version).";
        }

      const updatedStudents = [...students];
      const idx = updatedStudents.findIndex(s => s.id === studentId);
      updatedStudents[idx].generatedComment = comment;
      setStudents(updatedStudents);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(null);
    }
  };

  // Handler for manual edits to the comment
  const handleCommentUpdate = (studentId: string, newComment: string) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, generatedComment: newComment } : s
    ));
  };

  // Bulk Copy Functionality
  const handleCopyAll = () => {
    if (students.length === 0) return;
    
    const allText = students
      .filter(s => s.generatedComment)
      .map(s => `${s.name.toUpperCase()}\n${s.generatedComment}`)
      .join('\n\n' + '-'.repeat(20) + '\n\n');

    navigator.clipboard.writeText(allText).then(() => {
        setCopySuccess("All comments copied to clipboard");
        setTimeout(() => setCopySuccess(null), 3000);
    });
  };

  // Export to Word (HTML Hack)
  const handleExportDoc = () => {
      if (students.length === 0) return;

      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>TeacherTwin Report Export</title>
            <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
                .student-block { margin-bottom: 24pt; page-break-inside: avoid; }
                h2 { color: #002D62; font-size: 14pt; border-bottom: 1px solid #6D8C84; padding-bottom: 4pt; margin-bottom: 12pt; }
                p { line-height: 1.5; text-align: justify; }
            </style>
        </head>
        <body>
            <h1 style="color: #002D62; font-size: 18pt; text-align: center; margin-bottom: 30pt;">Class Report Comments</h1>
            ${students.filter(s => s.generatedComment).map(s => `
                <div class="student-block">
                    <h2>${s.name}</h2>
                    <p>${s.generatedComment}</p>
                </div>
            `).join('')}
        </body>
        </html>
      `;

      const blob = new Blob([content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_Comments_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
       <div className="flex flex-col gap-2 border-l-2 border-chartreuse pl-4">
        <h2 className="font-serif text-3xl text-prussian">Phase 2: Production</h2>
        <div className="flex gap-4 items-center">
            <span className="font-mono text-xs text-sage uppercase">Active Persona:</span>
            <span className="bg-sage/10 px-2 py-1 font-mono text-xs text-prussian border border-sage/20">
                {persona.tone.split(' ').slice(0, 3).join(' ')}...
            </span>
        </div>
      </div>

      {/* Input / Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Manual Input Column */}
        <div className="md:col-span-4 bg-white p-6 border border-sage/20 flex flex-col justify-between opacity-50 hover:opacity-100 transition-opacity">
            <h3 className="font-mono text-xs text-sage uppercase tracking-widest mb-4">Manual Entry (Single)</h3>
            <div className="flex flex-col gap-4">
                <Input 
                    label="Student Name" 
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    placeholder="e.g. Sarah Smith"
                />
                <Input 
                    label="Marks Data" 
                    value={currentMarks}
                    onChange={(e) => setCurrentMarks(e.target.value)}
                    placeholder="e.g. Math: 82, Oral: 65"
                />
            </div>
            <div className="mt-6">
                <Button onClick={addStudentManual} disabled={!currentName} variant="secondary" className="w-full">
                    + Add Single Entry
                </Button>
            </div>
        </div>

        {/* OR Divider */}
        <div className="md:col-span-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-px h-full bg-sage/20 hidden md:block"></div>
                 <div className="h-px w-full bg-sage/20 block md:hidden"></div>
            </div>
            <span className="bg-offWhite p-2 z-10 font-serif text-sage italic">or</span>
        </div>

        {/* Marksheet Upload Column (Primary) */}
        <div className="md:col-span-7 bg-white border-2 border-prussian relative group overflow-hidden shadow-lg">
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*,application/pdf"
                multiple // Enable multiple files
                onChange={handleFileUpload}
            />
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isBulkProcessing}
                className="w-full h-full p-8 flex flex-col items-center justify-center gap-6 hover:bg-sage/5 transition-colors text-center"
            >
                {isBulkProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="text-chartreuse"
                        >
                            <IconProcessing className="w-16 h-16" />
                        </motion.div>
                         <p className="font-mono text-sm text-prussian uppercase tracking-widest animate-pulse">
                            Analysing {selectedFileCount} Images...<br/>
                            <span className="text-[10px] opacity-70">Detecting Trajectory & Gender</span>
                         </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-prussian p-6 rounded-none group-hover:scale-105 transition-transform duration-300">
                             <IconUpload className="w-8 h-8 text-chartreuse" />
                        </div>
                        <div className="space-y-2">
                            <p className="font-serif text-xl text-prussian">
                                Upload Class Marksheets
                            </p>
                            <p className="font-mono text-xs text-sage uppercase tracking-widest">
                                Multi-Select Supported • Year-to-Date Trajectory Analysis
                            </p>
                            <p className="text-[10px] font-sans text-sage/70">
                                Tip: Select current marks + previous term averages together.
                            </p>
                        </div>
                    </>
                )}
            </button>
            {processingError && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-50 p-2 text-center border-t border-red-100">
                    <p className="text-[10px] font-mono text-red-600">{processingError}</p>
                </div>
            )}
        </div>
      </div>

      {/* Queue / Results Table */}
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto bg-white border border-sage/20">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-sage/50 bg-offWhite/50">
                <th className="font-serif text-prussian p-4 text-lg w-1/4">Student</th>
                <th className="font-mono text-xs text-sage uppercase p-4 w-2/3">Generated Output (Editable)</th>
                <th className="font-mono text-xs text-sage uppercase p-4 w-1/12 text-right">Action</th>
                </tr>
            </thead>
            <tbody>
                {students.length === 0 && (
                    <tr>
                        <td colSpan={3} className="p-16 text-center text-sage font-mono text-sm">
                            <div className="opacity-50 flex flex-col items-center gap-4">
                                <div className="w-20 h-20 border border-sage/30 flex items-center justify-center rotate-45">
                                    <span className="text-3xl -rotate-45">00</span>
                                </div>
                                <p>Awaiting Visual Input.</p>
                            </div>
                        </td>
                    </tr>
                )}
                {students.map((student) => (
                <tr key={student.id} className="border-b border-sage/10 hover:bg-offWhite transition-colors group">
                    <td className="p-6 align-top">
                        <span className="font-bold text-prussian block mb-1 text-lg">{student.name}</span>
                        <span className="text-[10px] font-mono text-sage">{student.id.split('-')[1] || 'MANUAL'}</span>
                        {student.subjectData && (
                            <span className="block mt-2 text-[10px] font-mono text-sage bg-sage/10 p-1 w-fit">Manual Entry Data</span>
                        )}
                    </td>
                    
                    <td className="p-6 align-top">
                    {student.generatedComment ? (
                        <div className="relative group/comment w-full">
                            <textarea
                                className="w-full min-h-[8rem] bg-transparent font-serif text-nearBlack leading-relaxed text-lg border-l-2 border-chartreuse pl-4 focus:outline-none focus:bg-offWhite/50 focus:border-prussian transition-colors resize-y"
                                value={student.generatedComment}
                                onChange={(e) => handleCommentUpdate(student.id, e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center">
                            <span className="text-sage/30 italic text-sm font-sans">Waiting for generation protocol...</span>
                        </div>
                    )}
                    </td>
                    
                    <td className="p-6 align-top text-right">
                        {!student.generatedComment ? (
                            <Button 
                            variant="icon" 
                            onClick={() => handleRegenerate(student.id)}
                            isLoading={isGenerating === student.id}
                            title="Generate Comment"
                        >
                            <IconProduction className="w-5 h-5" />
                        </Button>
                        ) : (
                            <div className="flex flex-col items-end gap-3">
                                <button 
                                    className="text-xs font-mono uppercase text-sage hover:text-chartreuse transition-colors flex items-center gap-1 font-bold"
                                    onClick={() => navigator.clipboard.writeText(student.generatedComment || '')}
                                >
                                    Copy Text
                                </button>
                                {student.subjectData && (
                                    <button 
                                        className="text-xs font-mono uppercase text-sage hover:text-prussian transition-colors flex items-center gap-1"
                                        onClick={() => handleRegenerate(student.id)}
                                        title="Regenerate"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        {/* BULK ACTIONS FOOTER */}
        {students.length > 0 && (
             <div className="flex flex-wrap justify-between items-center bg-prussian p-4 text-offWhite shadow-lg">
                <div className="font-mono text-xs text-sage uppercase tracking-widest">
                    Bulk Actions ({students.filter(s => s.generatedComment).length} generated)
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleCopyAll}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-chartreuse hover:text-prussian transition-colors font-mono text-xs uppercase"
                    >
                        <IconCopyAll className="w-4 h-4" />
                        Copy All
                    </button>
                    <button 
                        onClick={handleExportDoc}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-chartreuse hover:text-prussian transition-colors font-mono text-xs uppercase border-l border-sage/30"
                    >
                        <IconDoc className="w-4 h-4" />
                        Export to Word
                    </button>
                </div>
                {copySuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="fixed bottom-8 right-8 bg-chartreuse text-prussian px-6 py-3 shadow-xl font-bold font-sans uppercase z-50"
                    >
                        {copySuccess}
                    </motion.div>
                )}
             </div>
        )}
      </div>
    </div>
  );
};