import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa';

const LoadingOverlay = ({ 
  show, 
  message = "Processing your request..." 
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-lg shadow-lg p-6 m-4 max-w-sm w-full flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="text-blue-500 text-3xl mb-4"
            >
              <FaSpinner />
            </motion.div>
            <motion.p
              className="text-gray-700 font-medium text-center"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.p>
            <motion.div
              className="mt-4 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: ["10%", "95%"] }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  repeatType: "reverse",
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay; 