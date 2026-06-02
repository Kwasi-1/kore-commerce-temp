import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

const MOCK_CASHIERS = [
  { id: '1', name: 'Kwame Mensah', role: 'Cashier', initials: 'KM', color: 'bg-blue-500' },
  { id: '2', name: 'Abena Osei', role: 'Senior Cashier', initials: 'AO', color: 'bg-emerald-500' },
  { id: '3', name: 'David Tetteh', role: 'Cashier', initials: 'DT', color: 'bg-amber-500' },
  { id: '4', name: 'Sarah Kumi', role: 'Cashier', initials: 'SK', color: 'bg-purple-500' },
];

export default function CashierLockScreen() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [selectedCashier, setSelectedCashier] = useState<typeof MOCK_CASHIERS[0] | null>(null);
  
  const [pin, setPin] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isError, setIsError] = useState(false);

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
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
            className={`absolute inset-0 w-full transition-all duration-500 ease-in-out flex flex-col items-center ${
              step === 'select' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-full pointer-events-none'
            }`}
          >
            {/* Carousel Container */}
            <div className="w-full overflow-x-auto pb-6 scrollbar-hide snap-x flex gap-4 px-4 justify-center">
              {MOCK_CASHIERS.map((cashier) => (
                <button
                  key={cashier.id}
                  onClick={() => handleSelectCashier(cashier)}
                  className="snap-center shrink-0 flex flex-col items-center gap-3 p-6 rounded-[24px] bg-card border border-border/50 hover:border-primary/50 shadow-sm hover:shadow-md transition-all group w-[160px]"
                >
                  <div className={`h-20 w-20 rounded-full ${cashier.color} flex items-center justify-center text-white text-2xl font-black shadow-inner ring-4 ring-background group-hover:scale-105 transition-transform duration-300`}>
                    {cashier.initials}
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-[15px] leading-tight text-foreground">{cashier.name}</h3>
                    <p className="text-[12px] font-semibold text-muted-foreground mt-1">{cashier.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Enter PIN */}
          <div 
            className={`absolute inset-0 w-full transition-all duration-500 ease-in-out flex flex-col items-center ${
              step === 'pin' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-full pointer-events-none'
            }`}
          >
            {selectedCashier && (
              <div className="bg-card border border-border rounded-[28px] p-8 max-w-sm w-full shadow-lg flex flex-col items-center relative">
                
                <button 
                  onClick={handleBack}
                  className="absolute top-5 left-5 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-secondary"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className={`h-16 w-16 rounded-full ${selectedCashier.color} flex items-center justify-center text-white text-xl font-black shadow-sm mb-4`}>
                  {selectedCashier.initials}
                </div>
                <h3 className="font-bold text-lg">{selectedCashier.name}</h3>
                
                <div className="flex gap-3 mt-8 mb-4">
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
                      className={`w-14 h-16 text-center text-2xl font-black rounded-xl border-2 focus:outline-none transition-all ${
                        isError ? 'border-destructive bg-destructive/5 text-destructive' : 'border-input bg-background focus:border-primary focus:ring-4 focus:ring-primary/20'
                      }`}
                    />
                  ))}
                </div>
                {isError && <p className="text-destructive text-sm font-bold animate-pulse">Incorrect PIN. Try again.</p>}
                {!isError && <p className="text-muted-foreground text-sm font-medium">Hint: Try 1234</p>}
              </div>
            )}
          </div>
          
        </div>

        {/* Footer Link */}
        <div className="mt-8">
          <Button variant="link" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-primary font-semibold">
            Login as Admin or Manager instead
          </Button>
        </div>
        
      </div>
    </div>
  );
}
