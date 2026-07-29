import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Phone, 
  Smartphone, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Download, 
  Check, 
  QrCode, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const SecurityModal: React.FC = () => {
  const { 
    user, 
    verifyEmail, 
    verifyPhone, 
    enableTwoFactor, 
    disableTwoFactor, 
    isSecurityModalOpen, 
    closeSecurityModal 
  } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'verification' | '2fa'>('verification');

  // Email verification state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // 2FA state
  const [twoFactorMethod, setTwoFactorMethod] = useState<'authenticator' | 'sms'>('authenticator');
  const [twoFactorStep, setTwoFactorStep] = useState<'select' | 'setup' | 'backup'>('select');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>(user?.twoFactorBackupCodes || []);
  const [copiedCodes, setCopiedCodes] = useState(false);

  if (!isSecurityModalOpen) return null;

  // Handlers for Email Verification
  const handleSendEmailOtp = () => {
    setEmailOtpSent(true);
    setEmailError('');
  };

  const handleVerifyEmail = async () => {
    setEmailError('');
    const ok = await verifyEmail(emailCode);
    if (ok) {
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } else {
      setEmailError('Código inválido. Ingrese un código de 4 a 6 dígitos.');
    }
  };

  // Handlers for Phone Verification
  const handleSendPhoneOtp = () => {
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      setPhoneError('Por favor ingresa un número de teléfono válido.');
      return;
    }
    setPhoneOtpSent(true);
    setPhoneError('');
  };

  const handleVerifyPhone = async () => {
    setPhoneError('');
    const ok = await verifyPhone(phoneNumber, phoneCode);
    if (ok) {
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 3000);
    } else {
      setPhoneError('Código SMS inválido. Ingrese un código de 4 a 6 dígitos.');
    }
  };

  // Handlers for 2FA
  const handleActivate2FA = async () => {
    setTwoFactorError('');
    if (!twoFactorCode || twoFactorCode.trim().length < 4) {
      setTwoFactorError('Por favor ingresa un código de 6 dígitos.');
      return;
    }

    const res = await enableTwoFactor(twoFactorMethod, twoFactorCode);
    if (res.success && res.backupCodes) {
      setBackupCodes(res.backupCodes);
      setTwoFactorStep('backup');
    } else {
      setTwoFactorError(res.error || 'Código incorrecto. Por favor intenta de nuevo.');
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([
      `QAMUZ AI - CÓDIGOS DE RECUPERACIÓN DE EMERGENCIA (2FA)\n` +
      `Usuario: ${user?.email}\n` +
      `Fecha: ${new Date().toLocaleDateString()}\n\n` +
      `Códigos de un solo uso:\n` +
      backupCodes.join('\n')
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `qamuz-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#181818] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121212]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-[#1DB954] border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Seguridad y Verificación de Cuenta</h2>
              <p className="text-xs text-zinc-400">
                Protege tu identidad, verificación de teléfono/email y autenticación en 2 pasos
              </p>
            </div>
          </div>

          <button 
            onClick={closeSecurityModal}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Security Recommendation Banner */}
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-3 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-extrabold text-amber-300">Recomendación importante:</strong> Se recomienda encarecidamente verificar tu correo y activar la <strong className="text-amber-100">Autenticación en Dos Pasos (2FA)</strong> para blindar tu perfil de artista y saldo de créditos.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-[#141414] px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('verification')}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'verification'
                ? 'border-[#1DB954] text-[#1DB954]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Verificación (Email y Teléfono)</span>
            {(user?.emailVerified || user?.phoneVerified) && (
              <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('2fa')}
            className={`pb-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === '2fa'
                ? 'border-[#1DB954] text-[#1DB954]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Autenticación en 2 Pasos (2FA)</span>
            {user?.twoFactorEnabled ? (
              <span className="bg-emerald-500/20 text-[#1DB954] border border-emerald-500/40 text-[9px] px-1.5 py-0.2 font-black rounded uppercase">
                Activo
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 font-bold rounded uppercase">
                Recomendado
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: EMAIL & PHONE VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              
              {/* EMAIL VERIFICATION BOX */}
              <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-400 border border-zinc-700">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Correo Electrónico</p>
                      <p className="text-xs text-zinc-400">{user?.email}</p>
                    </div>
                  </div>

                  {user?.emailVerified ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-[#1DB954] border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verificado</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Pendiente</span>
                    </span>
                  )}
                </div>

                {!user?.emailVerified && (
                  <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                    {!emailOtpSent ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-zinc-400">
                          Recibe un código de verificación en tu bandeja de entrada para validar tu cuenta.
                        </p>
                        <button
                          onClick={handleSendEmailOtp}
                          className="bg-[#1DB954] hover:bg-emerald-400 text-black text-xs font-extrabold px-4 py-2 rounded-full transition-transform hover:scale-105 shrink-0"
                        >
                          Enviar Código
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-400 font-bold">
                          ✓ Código enviado a {user?.email}. (Ej: Ingresa <code className="bg-black px-1 rounded text-white">123456</code>)
                        </p>
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            placeholder="Código de 6 dígitos"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            className="bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#1DB954] max-w-xs"
                          />
                          <button
                            onClick={handleVerifyEmail}
                            className="bg-[#1DB954] hover:bg-emerald-400 text-black text-xs font-extrabold px-4 py-2 rounded-lg transition-colors"
                          >
                            Verificar
                          </button>
                        </div>
                        {emailError && <p className="text-xs text-rose-400 font-medium">{emailError}</p>}
                      </div>
                    )}
                  </div>
                )}

                {emailSuccess && (
                  <p className="text-xs font-bold text-emerald-400 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                    ¡Correo electrónico verificado exitosamente!
                  </p>
                )}
              </div>

              {/* PHONE VERIFICATION BOX */}
              <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sky-400 border border-zinc-700">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Número de Teléfono</p>
                      <p className="text-xs text-zinc-400">{user?.phone || 'Sin número registrado'}</p>
                    </div>
                  </div>

                  {user?.phoneVerified ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/20 text-[#1DB954] border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verificado</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-bold px-3 py-1 rounded-full">
                      <span>No verificado</span>
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  {!phoneOtpSent ? (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-400">
                        Añade y verifica tu número telefónico para recuperar tu cuenta y recibir alertas SMS de seguridad.
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="tel"
                          placeholder="+1 555 123 4567 o +52 55 1234 5678"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full max-w-sm bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                        />
                        <button
                          onClick={handleSendPhoneOtp}
                          className="bg-sky-500 hover:bg-sky-400 text-black text-xs font-extrabold px-4 py-2 rounded-lg transition-transform hover:scale-105 shrink-0"
                        >
                          Enviar SMS
                        </button>
                      </div>
                      {phoneError && <p className="text-xs text-rose-400 font-medium">{phoneError}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-sky-400 font-bold">
                        ✓ SMS de prueba enviado a {phoneNumber}. (Ej: Ingresa <code className="bg-black px-1 rounded text-white">654321</code>)
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="Código SMS de 6 dígitos"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          className="bg-[#242424] text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-xs"
                        />
                        <button
                          onClick={handleVerifyPhone}
                          className="bg-sky-500 hover:bg-sky-400 text-black text-xs font-extrabold px-4 py-2 rounded-lg transition-colors"
                        >
                          Confirmar Teléfono
                        </button>
                      </div>
                      {phoneError && <p className="text-xs text-rose-400 font-medium">{phoneError}</p>}
                    </div>
                  )}
                </div>

                {phoneSuccess && (
                  <p className="text-xs font-bold text-emerald-400 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                    ¡Número de teléfono verificado exitosamente!
                  </p>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: TWO-FACTOR AUTHENTICATION (2FA) */}
          {activeTab === '2fa' && (
            <div className="space-y-6">
              
              {/* CURRENT STATUS */}
              {user?.twoFactorEnabled ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-[#1DB954] flex items-center justify-center border border-emerald-500/30">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-extrabold text-white text-base">2FA Activo y Protegido</p>
                        <p className="text-xs text-emerald-300">
                          Método: {user.twoFactorMethod === 'authenticator' ? 'Aplicación Authenticator (TOTP)' : 'Código SMS'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={disableTwoFactor}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Desactivar 2FA
                    </button>
                  </div>

                  {/* Backup Codes list */}
                  {user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0 && (
                    <div className="pt-3 border-t border-emerald-500/20 space-y-3">
                      <p className="text-xs font-bold text-zinc-200">Tus Códigos de Recuperación de Emergencia:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/60 p-3 rounded-lg border border-zinc-800 font-mono text-xs text-emerald-400 text-center">
                        {user.twoFactorBackupCodes.map((c, i) => (
                          <div key={i} className="bg-zinc-900/80 py-1 rounded border border-zinc-800">{c}</div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyBackupCodes}
                          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedCodes ? '¡Copiados!' : 'Copiar Códigos'}</span>
                        </button>
                        <button
                          onClick={handleDownloadBackupCodes}
                          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Guardar TXT</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* STEP 1: METHOD SELECTION */}
                  {twoFactorStep === 'select' && (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Selecciona el método de autenticación en dos pasos que prefieres para proteger tu sesión:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        <div 
                          onClick={() => setTwoFactorMethod('authenticator')}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                            twoFactorMethod === 'authenticator'
                              ? 'bg-emerald-950/40 border-[#1DB954] ring-1 ring-[#1DB954]'
                              : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <QrCode className="w-6 h-6 text-[#1DB954]" />
                            <input 
                              type="radio" 
                              checked={twoFactorMethod === 'authenticator'} 
                              onChange={() => setTwoFactorMethod('authenticator')} 
                            />
                          </div>
                          <p className="font-extrabold text-white text-sm">App Authenticator (Recomendado)</p>
                          <p className="text-xs text-zinc-400">
                            Usa Google Authenticator, Authy o 1Password para generar códigos temporales offline.
                          </p>
                        </div>

                        <div 
                          onClick={() => setTwoFactorMethod('sms')}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${
                            twoFactorMethod === 'sms'
                              ? 'bg-emerald-950/40 border-[#1DB954] ring-1 ring-[#1DB954]'
                              : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Smartphone className="w-6 h-6 text-sky-400" />
                            <input 
                              type="radio" 
                              checked={twoFactorMethod === 'sms'} 
                              onChange={() => setTwoFactorMethod('sms')} 
                            />
                          </div>
                          <p className="font-extrabold text-white text-sm">Mensaje SMS de Texto</p>
                          <p className="text-xs text-zinc-400">
                            Recibe un código de confirmación por SMS en tu número de teléfono móvil registrado.
                          </p>
                        </div>

                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => setTwoFactorStep('setup')}
                          className="flex items-center gap-2 bg-[#1DB954] hover:bg-emerald-400 text-black text-xs font-extrabold px-6 py-2.5 rounded-full transition-transform hover:scale-105 shadow-lg"
                        >
                          <span>Continuar Configuración</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: SETUP & CONFIRM CODE */}
                  {twoFactorStep === 'setup' && (
                    <div className="bg-[#121212] p-5 rounded-xl border border-zinc-800 space-y-5">
                      
                      {twoFactorMethod === 'authenticator' ? (
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-white">
                            1. Escanea este código QR con tu aplicación de autenticación:
                          </p>

                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 p-4 rounded-xl border border-zinc-800">
                            {/* Simulated QR canvas */}
                            <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center shrink-0">
                              <div className="w-full h-full border-4 border-black p-1 flex flex-col justify-between">
                                <div className="flex justify-between">
                                  <div className="w-6 h-6 bg-black" />
                                  <div className="w-6 h-6 bg-black" />
                                </div>
                                <div className="text-[8px] font-black text-center text-black">QAMUZ-2FA</div>
                                <div className="flex justify-between">
                                  <div className="w-6 h-6 bg-black" />
                                  <div className="w-2 h-2 bg-black self-end" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <p className="text-zinc-300">¿No puedes escanear el código QR? Ingresa la clave secreta manualmente:</p>
                              <div className="bg-zinc-900 px-3 py-2 rounded font-mono text-emerald-400 text-sm font-bold border border-zinc-700">
                                QAMUZ-2FA-9821-4402
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white">
                            1. Se enviará un SMS con tu código de 2FA a tu teléfono registrado ({user?.phone || '+1 555-0192'}):
                          </p>
                          <p className="text-xs text-zinc-400">
                            Asegúrate de tener recepción móvil para recibir el mensaje de texto.
                          </p>
                        </div>
                      )}

                      {/* CODE CONFIRMATION INPUT */}
                      <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <p className="text-xs font-bold text-zinc-200">
                          2. Ingresa el código de 6 dígitos para activar la protección 2FA:
                        </p>
                        <div className="flex items-center gap-3">
                          <input 
                            type="text"
                            placeholder="Ej: 123456"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            className="bg-[#242424] text-white text-base font-mono rounded-lg px-4 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#1DB954] max-w-xs"
                          />
                          <button
                            onClick={handleActivate2FA}
                            className="bg-[#1DB954] hover:bg-emerald-400 text-black text-xs font-extrabold px-5 py-2.5 rounded-lg transition-transform hover:scale-105 shadow"
                          >
                            Activar 2FA
                          </button>
                        </div>
                        {twoFactorError && <p className="text-xs text-rose-400 font-medium">{twoFactorError}</p>}
                      </div>

                      <button
                        onClick={() => setTwoFactorStep('select')}
                        className="text-xs text-zinc-400 hover:text-white underline pt-2"
                      >
                        ← Volver a elegir método
                      </button>

                    </div>
                  )}

                  {/* STEP 3: BACKUP CODES GENERATION */}
                  {twoFactorStep === 'backup' && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-5 rounded-xl space-y-4 animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>¡2FA Activado Correctamente!</span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Guarda estos <strong className="text-white">Códigos de Recuperación de Emergencia</strong> en un lugar seguro. Si pierdes acceso a tu teléfono o app autenticadora, podrás usar cada código una sola vez para iniciar sesión:
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/80 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-400 text-center">
                        {backupCodes.map((code, idx) => (
                          <div key={idx} className="bg-zinc-900 p-2 rounded border border-zinc-800">{code}</div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyBackupCodes}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-zinc-700 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>{copiedCodes ? '¡Copiados!' : 'Copiar'}</span>
                          </button>
                          <button
                            onClick={handleDownloadBackupCodes}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-zinc-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar TXT</span>
                          </button>
                        </div>

                        <button
                          onClick={closeSecurityModal}
                          className="bg-[#1DB954] text-black text-xs font-extrabold px-5 py-2 rounded-full hover:scale-105 transition-transform"
                        >
                          Finalizar
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
