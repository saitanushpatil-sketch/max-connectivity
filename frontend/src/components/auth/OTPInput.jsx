import { useRef, useEffect, useState } from 'react';

const BOX_COUNT = 6;

export default function OTPInput({ value = '', onChange, onComplete, error = false, success = false, disabled = false }) {
  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(() => Array(BOX_COUNT).fill(''));

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!value) {
      setDigits(Array(BOX_COUNT).fill(''));
      return;
    }
    const chars = value.replace(/\D/g, '').slice(0, BOX_COUNT).split('');
    const next = Array(BOX_COUNT).fill('').map((_, i) => chars[i] || '');
    setDigits(next);
  }, [value]);

  const emitChange = (nextDigits) => {
    const code = nextDigits.join('');
    onChange?.(code);
    if (code.length === BOX_COUNT) onComplete?.(code);
  };

  const setDigitAt = (index, char) => {
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    emitChange(next);
    return next;
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigitAt(index, '');
      return;
    }
    const char = raw.slice(-1);
    setDigitAt(index, char);
    if (index < BOX_COUNT - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        setDigitAt(index, '');
      } else if (index > 0) {
        setDigitAt(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < BOX_COUNT - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, BOX_COUNT);
    if (!pasted) return;
    const next = Array(BOX_COUNT).fill('').map((_, i) => pasted[i] || '');
    setDigits(next);
    emitChange(next);
    const focusIdx = Math.min(pasted.length, BOX_COUNT - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  const borderColor = error ? '#FF006E' : success ? '#06D6A0' : '#252535';
  const glow = error
    ? '0 0 12px rgba(255,0,110,0.4)'
    : success
      ? '0 0 12px rgba(6,214,160,0.4)'
      : 'none';

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="font-mono text-xl text-center rounded-sm transition-all"
          style={{
            width: 44,
            height: 52,
            background: '#0A0A0F',
            border: `1.5px solid ${borderColor}`,
            color: error ? '#FF006E' : success ? '#06D6A0' : '#00F5FF',
            boxShadow: glow,
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
          }}
          onFocusCapture={(e) => {
            if (!error && !success) {
              e.target.style.borderColor = '#00F5FF';
              e.target.style.boxShadow = '0 0 14px rgba(0,245,255,0.45)';
            }
          }}
          onBlurCapture={(e) => {
            if (!error && !success) {
              e.target.style.borderColor = '#252535';
              e.target.style.boxShadow = 'none';
            }
          }}
        />
      ))}
    </div>
  );
}
