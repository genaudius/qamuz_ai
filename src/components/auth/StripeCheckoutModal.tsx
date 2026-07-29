import React, { useState } from 'react';
import { X, ShieldCheck, CreditCard, Lock, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth, UserPlan } from '../../context/AuthContext';

export const StripeCheckoutModal: React.FC = () => {
  const { isCheckoutModalOpen, closeCheckoutModal, selectedPlanForCheckout, upgradePlan, user } = useAuth();

  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isCheckoutModalOpen || !selectedPlanForCheckout) return null;

  const planDetails: Record<UserPlan, { name: string; price: string; period: string; features: string[] }> = {
    free: {
      name: 'Plan Gratuito',
      price: '$0.00',
      period: 'por siempre',
      features: ['5 créditos mensuales', 'Calidad Estándar', 'Reproducción ilimitada']
    },
    creator: {
      name: 'Plan Creador AI',
      price: '$9.99',
      period: 'al mes',
      features: [
        '100 Créditos Mensuales de IA',
        'Generación de Música con Vocal Studio',
        'Videos Cinemáticos HD',
        'Descarga de Audio MP3/WAV',
        'Licencia Comercial Básica'
      ]
    },
    pro: {
      name: 'Plan Studio Pro',
      price: '$19.99',
      period: 'al mes',
      features: [
        'Créditos Ilimitados de IA',
        'Videos Cinemáticos 4K Ultra HD',
        'Portadas & Arte Ultra HD Qamuz AI',
        'Exportación de Pistas STEMS',
        'Soporte Prioritario VIP 24/7',
        'Licencia Comercial Total'
      ]
    }
  };

  const plan = planDetails[selectedPlanForCheckout];

  // Format Card Number (4 groups of 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiry(raw);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cardNumber.replace(/\s/g, '').length < 16) {
      setError('Número de tarjeta incompleto (16 dígitos requeridos).');
      return;
    }

    if (!expiry || expiry.length < 5) {
      setError('Fecha de expiración inválida (MM/AA).');
      return;
    }

    if (cvc.length < 3) {
      setError('Código CVC incompleto (3 dígitos).');
      return;
    }

    setIsProcessing(true);

    // Simulate Stripe payment request & processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      upgradePlan(selectedPlanForCheckout);

      setTimeout(() => {
        setIsSuccess(false);
        closeCheckoutModal();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#181818] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1DB954] text-black font-black flex items-center justify-center shadow-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Suscripción Segura QAMUZ</h3>
                <span className="text-[10px] bg-[#635BFF]/20 text-[#635BFF] border border-[#635BFF]/30 px-2 py-0.5 rounded font-black uppercase">
                  Stripe
                </span>
              </div>
              <p className="text-xs text-zinc-400">Procesado por Stripe Payment Gateway</p>
            </div>
          </div>

          <button
            onClick={closeCheckoutModal}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="p-10 flex flex-col items-center text-center gap-4 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#1DB954] border border-emerald-500/40 flex items-center justify-center shadow-2xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">¡Pago Confirmado!</h3>
            <p className="text-sm text-zinc-300 max-w-xs">
              Tu plan <span className="text-[#1DB954] font-bold">{plan.name}</span> ha sido activado exitosamente.
            </p>
            <span className="text-xs text-zinc-500">Cargando tus nuevos créditos de IA...</span>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Plan Summary */}
            <div className="md:col-span-5 bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#1DB954] bg-emerald-500/10 px-2 py-1 rounded w-fit">
                  Resumen del Plan
                </span>
                <h4 className="font-extrabold text-white text-lg">{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-400">{plan.period}</span>
                </div>

                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-zinc-800">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-400 bg-black/40 p-2 rounded-lg border border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cancela en cualquier momento sin compromisos de permanencia.</span>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmitPayment} className="md:col-span-7 flex flex-col gap-3">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-300">Titular de la tarjeta</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Nombre impreso en tarjeta"
                  className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700/80 focus:outline-none focus:border-[#1DB954]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-300">Número de Tarjeta</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-[#242424] text-white text-xs rounded-xl p-2.5 pr-10 border border-zinc-700/80 focus:outline-none focus:border-[#1DB954] font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-300">Exp (MM/AA)</label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="12/28"
                    className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700/80 focus:outline-none focus:border-[#1DB954] font-mono text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-300">CVC</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700/80 focus:outline-none focus:border-[#1DB954] font-mono text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-300">C. Postal</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="28001"
                    className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700/80 focus:outline-none focus:border-[#1DB954] font-mono text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full mt-2 bg-[#635BFF] hover:bg-[#534be0] text-white font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-[#635BFF]/20 active:scale-98 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {isProcessing ? (
                  <span>Procesando pago seguro...</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pagar {plan.price} y Activar Plan</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-500 mt-1">
                <span>Visa</span>
                <span>•</span>
                <span>Mastercard</span>
                <span>•</span>
                <span>American Express</span>
                <span>•</span>
                <span>Stripe Encrypted</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
