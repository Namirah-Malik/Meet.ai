"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="flex flex-col items-center gap-4 p-8 bg-red-900/20 rounded-lg border border-red-500/50 max-w-md">
        <div className="text-red-500 text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-red-400 text-center">
          Error Loading Agents
        </h1>
        <p className="text-red-300 text-center text-sm">
          Something went wrong while loading the agents. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}