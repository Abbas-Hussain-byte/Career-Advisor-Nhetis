import React from 'react';

// Standard "Career-Ready" Colors
export const colors = {
    primary: "#0A2540", // Deep Navy (Professional)
    secondary: "#00D4FF", // Bright Cyan (Tech/Future)
    accent: "#635BFF", // Stripe Blurple (Creative)
    success: "#32D74B",
    warning: "#FFD60A",
    error: "#FF453A",
    background: "#F6F9FC",
    surface: "#FFFFFF",
    text: "#1A1F2C"
};

// Reusable Button Component
export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
    // Dynamic Tailwind class construction is tricky, better to use full strings or clsx/classnames
    let variantStyles = "";
    if (variant === 'primary') variantStyles = "bg-[#0A2540] text-white hover:opacity-90";
    else if (variant === 'secondary') variantStyles = "bg-[#00D4FF] text-[#0A2540] hover:brightness-110";
    else if (variant === 'outline') variantStyles = "border-2 border-[#0A2540] text-[#0A2540] hover:bg-[#0A2540] hover:text-white";

    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-md flex items-center justify-center gap-2 ${variantStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Card Component with Glassmorphism
export const Card = ({ children, className = '' }: any) => (
    <div className={`bg-white bg-opacity-80 backdrop-blur-lg rounded-xl shadow-xl p-6 border border-white/20 ${className}`}>
        {children}
    </div>
);
