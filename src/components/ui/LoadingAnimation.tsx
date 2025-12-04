import React from "react";

interface LoadingAnimationProps {
  className?: string;
  size?: number;
}

export function LoadingAnimation({ className = "", size = 120 }: LoadingAnimationProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[var(--accent-9)]"
      >
        <style>
          {`
            @keyframes bubble {
              0% {
                transform: translateY(0) scale(0.5);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: translateY(-60px) scale(1.2);
                opacity: 0;
              }
            }
            .bubble-1 {
              animation: bubble 2s infinite ease-out;
              animation-delay: 0s;
              transform-origin: center;
            }
            .bubble-2 {
              animation: bubble 2s infinite ease-out;
              animation-delay: 0.6s;
              transform-origin: center;
            }
            .bubble-3 {
              animation: bubble 2s infinite ease-out;
              animation-delay: 1.2s;
              transform-origin: center;
            }
            
            @keyframes rock {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-2deg); }
              75% { transform: rotate(2deg); }
            }
            .pot-body {
              animation: rock 3s infinite ease-in-out;
              transform-origin: bottom center;
            }

            @keyframes jump {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              5% { transform: translateY(-5px) rotate(-3deg); }
              10% { transform: translateY(0) rotate(0deg); }
              15% { transform: translateY(-3px) rotate(3deg); }
              20% { transform: translateY(0) rotate(0deg); }
            }
            .pot-lid {
              animation: jump 2s infinite;
              transform-origin: center;
            }
          `}
        </style>

        {/* Bubbles (Steam) - Using Accent Color */}
        <circle cx="85" cy="60" r="6" className="bubble-1 text-accent fill-current" />
        <circle cx="115" cy="50" r="4" className="bubble-2 text-accent fill-current" />
        <circle cx="100" cy="70" r="5" className="bubble-3 text-accent fill-current" />

        <g className="pot-body">
          {/* Pot Body */}
          <path
            d="M50 90 L150 90 C150 90 150 160 100 160 C50 160 50 90 50 90 Z"
            fill="currentColor"
          />

          {/* Pot Rim/Lip */}
          <rect x="45" y="85" width="110" height="10" rx="2" fill="currentColor" />

          {/* Pot Handles */}
          <path
            d="M45 100 C35 100 35 120 45 120"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M155 100 C165 100 165 120 155 120"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Pot Lid - Animated Separately */}
          <g className="pot-lid">
            <path
              d="M55 85 C55 85 60 65 100 65 C140 65 145 85 145 85"
              fill="currentColor"
              className="opacity-90"
            />
            {/* Lid Handle */}
            <rect x="90" y="60" width="20" height="8" rx="2" fill="currentColor" />
          </g>
        </g>
      </svg>
      <p className="mt-4 text-sm font-medium text-neutral-500 animate-pulse">
        Cooking up something good...
      </p>
    </div>
  );
}
