import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading,
  disabled,
  ...props 
}) => {
  const baseStyles = "font-sans uppercase tracking-widest text-sm font-bold transition-all duration-150 ease-linear flex items-center justify-center gap-2 px-6 py-4";
  
  const variants = {
    primary: "border border-prussian text-prussian hover:bg-chartreuse hover:text-nearBlack hover:border-transparent active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "text-sage border-b-2 border-transparent hover:border-chartreuse hover:text-prussian px-0 py-2",
    icon: "p-2 border border-sage hover:bg-chartreuse hover:border-chartreuse text-prussian"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-pulse">PROCESSING...</span>
      ) : children}
    </button>
  );
};
