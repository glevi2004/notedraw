/**
 * Throttle utility for controlling save frequency
 * 
 * Throttling (vs debouncing) ensures saves happen periodically during active editing,
 * not just after the user stops. This is what Excalidraw uses.
 */

export interface ThrottleOptions {
  /** Execute on the leading edge (first call) */
  leading?: boolean;
  /** Execute on the trailing edge (after wait period) */
  trailing?: boolean;
}

export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  /** Cancel pending execution */
  cancel(): void;
  /** Flush pending execution immediately */
  flush(): void;
  /** Check if there's a pending execution */
  pending(): boolean;
}

/**
 * Creates a throttled function that only invokes func at most once per wait milliseconds
 * 
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @param options Options to control execution on leading/trailing edge
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;

  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    
    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);
    lastArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      if (leading) {
        func.apply(this, args);
      }
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
      }, remaining);
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
    lastArgs = null;
  };

  throttled.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (lastArgs) {
      previous = leading ? Date.now() : 0;
      func.apply(null, lastArgs);
      lastArgs = null;
    }
  };

  throttled.pending = () => {
    return timeout !== null;
  };

  return throttled;
}
