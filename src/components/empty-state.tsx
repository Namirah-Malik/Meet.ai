"use client"

import { motion, Variants } from "framer-motion"; // Added Variants type
import { Sparkles, Bot, Zap } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState = ({ onCreateClick }: EmptyStateProps) => {
  // 1. Explicitly type your variants to avoid TypeScript inference issues
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const floatingVariants: Variants = {
    initial: { y: 0 },
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const pulseVariants: Variants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-96 px-6 py-12 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <motion.div className="relative z-10 text-center space-y-8 max-w-md">
        <motion.div variants={itemVariants} className="flex justify-center">
          <motion.div
            variants={floatingVariants}
            initial="initial"
            animate="animate"
            className="relative"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 blur-lg"
              variants={pulseVariants}
              animate="animate"
            />

            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Bot className="w-12 h-12 text-white" />
              </motion.div>

              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </motion.div>

              <motion.div
                className="absolute -bottom-2 -left-2"
                animate={{ scale: [1, 1.2, 1], rotate: -360 }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-blue-300" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* 2. FIXED: Removed the inline object from variants. 
           It now uses itemVariants which is correctly typed. */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Create your first agent
          </h2>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-lg text-gray-600 leading-relaxed"
        >
          Create an agent to join your meetings. Each agent will follow your instructions and can interact with participants during the call.
        </motion.p>

        <motion.div variants={itemVariants} className="space-y-3 py-6">
          {[
            { icon: "🤖", text: "Intelligent agent behavior" },
            { icon: "💬", text: "Real-time participant interaction" },
            { icon: "⚡", text: "Custom instructions & rules" },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3 text-left justify-center"
              whileHover={{ x: 5 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-gray-700 font-medium">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          variants={itemVariants}
          onClick={onCreateClick}
          className="w-full py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* 3. FIXED: Adjusted the 'animate' prop. 
             Passing a string variant name 'visible' might conflict with the 'x' array. 
             Kept it simple for the shine effect. */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
            animate={{ x: [-200, 400] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />

          <span className="relative flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create Your First Agent
          </span>
        </motion.button>

        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-1 pt-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};