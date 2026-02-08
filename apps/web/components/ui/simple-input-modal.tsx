'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  helperText?: string;
  submitLabel?: string;
  className?: string;
}

export function SimpleInputModal({
  open,
  onOpenChange,
  title,
  value,
  onChange,
  onSubmit,
  placeholder = '',
  helperText,
  submitLabel = 'Done',
  className,
}: SimpleInputModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSubmit();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-[320px] bg-popover rounded-xl shadow-2xl overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[15px] font-medium text-popover-foreground">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-popover-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-10 px-3 bg-card border border-input rounded-lg text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
          />

          {/* Helper Text */}
          {helperText && (
            <p className="text-[13px] text-muted-foreground leading-snug">
              {helperText}
            </p>
          )}

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[14px] rounded-lg transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
