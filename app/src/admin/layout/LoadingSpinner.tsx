import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div role="status" className="flex items-center justify-center py-10">
      <Loader2 className="h-8 w-8 animate-spin text-[#071A2D]" />
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default LoadingSpinner;
