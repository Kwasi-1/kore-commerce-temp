import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { MOCK_CASHIERS } from '@/api/mock';

export default function CashierLockScreen() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [selectedCashier, setSelectedCashier] = useState<typeof MOCK_CASHIERS[0] | null>(null);
  
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isError, setIsError] = useState(false);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Handle PIN input
  const handleChange = (index: number, value: string) => {
    setIsError(false);
    if (!/^[0-9]*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto focus next input
    if (value !== '' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newPin.every(digit => digit !== '')) {
      handleVerifyPin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyPin = (fullPin: string) => {
    // Mock verify: assume '1234' is correct
    if (fullPin === '1234') {
      // Login as this cashier
      login(
        'mock-cashier-token',
        'mock-cashier-refresh',
        {
          id: selectedCashier!.id,
          name: selectedCashier!.name,
          role: 'cashier',
        },
        {
          id: 'tenant-1',
          name: 'Vysion Store',
          plan: 'pro',
        }
      );
      navigate('/pos/register');
    } else {
      setIsError(true);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleSelectCashier = (cashier: typeof MOCK_CASHIERS[0]) => {
    setSelectedCashier(cashier);
    setStep('pin');
    setPin(['', '', '', '']);
    setIsError(false);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedCashier(null);
  };

  return (
    <div className="font-header min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-3xl flex flex-col items-center z-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-card shadow-sm border border-border mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Point of Sale Locked</h1>
          <p className="text-muted-foreground mt-2 font-medium">
            {step === 'select' ? 'Select your profile to start your shift' : 'Enter your 4-digit PIN to unlock'}
          </p>
        </div>

        {/* Content Container with Animation */}
        <div className="w-full relative min-h-[300px]">
          
          {/* STEP 1: Select Profile */}
          <div 
            className={`absolute inset-0 w-full transition-all duration-500 ease-in-out flex flex-col items-center justify-center ${
              step === 'select' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-full pointer-events-none'
            }`}
          >
            <div className="relative w-full max-w-[800px] flex items-center group/carousel">
              
              {/* Left Arrow (Desktop) */}
              <button 
                onClick={scrollLeft}
                className="hidden md:flex absolute -left-8 z-20 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border shadow-sm text-foreground hover:bg-secondary hover:scale-105 transition-all opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Carousel Container */}
              <div 
                ref={scrollContainerRef}
                className="w-full overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory flex gap-2 md:gap-4 px-[10%] md:px-[5%] items-center"
                style={{ 
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
              >
                {/* Spacer element for better centering of few items */}
                <div className="w-4 shrink-0 md:hidden" />
                
                {MOCK_CASHIERS.map((cashier) => (
                  <button
                    key={cashier.id}
                    onClick={() => handleSelectCashier(cashier)}
                    className="snap-center shrink-0 flex flex-col items-center gap-4 p-4 bg-transparent transition-transform hover:scale-105 w-[140px]"
                  >
                    <div className={`h-[84px] w-[84px] rounded-full ${cashier.color} flex items-center justify-center text-white text-[28px] font-medium shadow-sm`}>
                      {cashier.initials}
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-[15px] leading-tight text-foreground whitespace-nowrap">{cashier.name}</h3>
                    </div>
                  </button>
                ))}
                
                {/* Spacer element */}
                <div className="w-4 shrink-0 md:hidden" />
              </div>

              {/* Right Arrow (Desktop) */}
              <button 
                onClick={scrollRight}
                className="hidden md:flex absolute -right-8 z-20 h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border shadow-sm text-foreground hover:bg-secondary hover:scale-105 transition-all opacity-0 group-hover/carousel:opacity-100"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* STEP 2: Enter PIN */}
          <div 
            className={`absolute inset-0 w-full transition-all duration-500 ease-in-out flex flex-col items-center ${
              step === 'pin' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-full pointer-events-none'
            }`}
          >
            {selectedCashier && (
              <div className="bg-card border-none rounded-[28px] p-8 max-w-sm w-full flex flex-col items-center relative">
                
                <button 
                  onClick={handleBack}
                  className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className={`h-[72px] w-[72px] rounded-full ${selectedCashier.color} flex items-center justify-center text-white text-2xl font-medium shadow-sm mb-4`}>
                  {selectedCashier.initials}
                </div>
                <h3 className="font-semibold text-[16px]">{selectedCashier.name}</h3>
                
                <div className="flex gap-4 mt-8 mb-4">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`md:w-[68px] md:h-[68px] w-[60px] h-[60px] text-center text-3xl font-medium rounded-xl border transition-all ${
                        isError ? 'border-destructive bg-destructive/5 text-destructive' : 'border-border/60 bg-transparent focus:border-foreground/30 focus:outline-none'
                      }`}
                    />
                  ))}
                </div>
                {isError && <p className="text-destructive text-[13px] font-medium mt-2 animate-pulse">Incorrect PIN. Try again.</p>}
                {!isError && <p className="text-muted-foreground text-[13px] font-medium mt-2">Hint: Try 1234</p>}
              </div>
            )}
          </div>
          
        </div>

        {/* Footer Link */}
        <div className="mt-8">
          <Button variant="link" onClick={() => navigate('/login')} className="text-muted-foreground font-semibold">
            Login as Admin or Manager instead
          </Button>
        </div>
        
      </div>
    </div>
  );
}
