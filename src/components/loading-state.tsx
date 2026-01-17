// components/loading-state.tsx
"use client";

import { useEffect, useState } from "react";

interface LoadingStateProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  duration?: number;
}

export const LoadingState = ({
  isLoading,
  title = "Loading Agents",
  subtitle = "This may take a few seconds...",
  duration = 5000,
}: LoadingStateProps) => {
  const [showLoader, setShowLoader] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShowLoader(false);
    }
  }, [isLoading, duration]);

  if (!showLoader) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-md flex items-center justify-center z-50">
      <div className="text-center">
        {/* Cool Animated Spinner */}
        <div className="relative w-32 h-32 mb-8 mx-auto">
          {/* Outer orbiting particles */}
          <div className="absolute inset-0">
            <div
              className="absolute w-3 h-3 bg-blue-500 rounded-full top-0 left-1/2 -translate-x-1/2"
              style={{
                animation: "orbit 3s linear infinite",
              }}
            ></div>
            <div
              className="absolute w-3 h-3 bg-cyan-400 rounded-full top-0 left-1/2 -translate-x-1/2"
              style={{
                animation: "orbit 3s linear infinite 1s",
              }}
            ></div>
            <div
              className="absolute w-3 h-3 bg-blue-400 rounded-full top-0 left-1/2 -translate-x-1/2"
              style={{
                animation: "orbit 3s linear infinite 2s",
              }}
            ></div>
          </div>

          {/* Rotating rings */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 border-r-cyan-400 animate-spin"></div>

          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-400 border-l-cyan-500"
            style={{
              animation: "spin 4s linear infinite reverse",
            }}
          ></div>

          <div
            className="absolute inset-4 rounded-full border-1 border-cyan-400/50"
            style={{
              animation: "pulse 2s ease-in-out infinite",
            }}
          ></div>

          {/* Center glowing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-500/50 animate-pulse"></div>
          </div>
        </div>

        {/* Text Content */}
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-300 mb-8">
          {subtitle}
        </p>

        {/* Animated progress bar with wave effect */}
        <div className="w-64 mx-auto">
          <div className="relative h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full"
              style={{
                animation: `progress ${duration}ms linear forwards`,
              }}
            ></div>
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                animation: "shimmer 2s infinite",
              }}
            ></div>
          </div>
        </div>

        {/* Floating particles effect */}
        <div className="mt-12 flex justify-center gap-3">
          <div
            className="w-2 h-2 bg-cyan-400 rounded-full"
            style={{
              animation: "float 3s ease-in-out infinite",
            }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-500 rounded-full"
            style={{
              animation: "float 3s ease-in-out infinite 0.2s",
            }}
          ></div>
          <div
            className="w-2 h-2 bg-cyan-300 rounded-full"
            style={{
              animation: "float 3s ease-in-out infinite 0.4s",
            }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-400 rounded-full"
            style={{
              animation: "float 3s ease-in-out infinite 0.6s",
            }}
          ></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateY(-45px) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: rotate(360deg) translateY(-45px) rotate(-360deg);
            opacity: 1;
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-12px);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};