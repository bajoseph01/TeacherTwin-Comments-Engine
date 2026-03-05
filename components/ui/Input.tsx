import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="font-mono text-xs text-sage uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      <input 
        className={`
          bg-transparent border-b border-sage text-prussian font-mono py-2 focus:outline-none focus:border-b-2 focus:border-chartreuse placeholder-sage/50 transition-colors
          ${className}
        `}
        {...props}
      />
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full h-full">
      {label && (
        <label className="font-mono text-xs text-sage uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      <textarea 
        className={`
          bg-offWhite border border-sage p-4 text-nearBlack font-mono text-sm focus:outline-none focus:border-prussian resize-none h-full transition-colors
          ${className}
        `}
        {...props}
      />
    </div>
  );
};
