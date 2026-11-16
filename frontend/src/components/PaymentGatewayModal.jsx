import React, { useState } from 'react';
import { 
  X, CreditCard, QrCode, Building2, CheckCircle2, ShieldCheck, 
  Loader2, ArrowRight, Sparkles, AlertCircle, Smartphone, Lock, Info
} from 'lucide-react';

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount = 200,
  doctorName = 'Specialist',
  specialization = 'Consultation',
  onPaymentSuccess
}) {
  const [activeTab, setActiveTab] = useState('card');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // UPI state
  const [upiId, setUpiId] = useState('');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  if (!isOpen) return null;

  const banks = [
    'State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank',
    'Axis Bank', 'Punjab National Bank (PNB)', 'Kotak Mahindra Bank', 'Bank of Baroda'
  ];

  // ── Auto-formatters ──────────────────────────────────────────────────────────
  const formatCardNumber = (val) => {
    // Keep only digits, max 16
    const digits = val.replace(/\D/g, '').slice(0, 16);
    // Insert space every 4 digits
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const rawCard = cardNumber.replace(/\s/g, '');

  // ── Demo bypass fill ─────────────────────────────────────────────────────────
  const fillDemoBypassCard = () => {
    setCardNumber('1234 1234 1234');
    setCardExpiry('12/28');
    setCardCvv('123');
    setCardName('Demo Patient');
    setError(null);
  };

  // ── Process payment ──────────────────────────────────────────────────────────
  const handleProcessPayment = (method) => {
    setError(null);

    // Basic card validation (skip for demo bypass)
    if (method === 'card' && rawCard !== '123412341234') {
      if (rawCard.length < 12) { setError('Please enter a valid card number.'); return; }
      if (cardExpiry.length < 4) { setError('Please enter a valid expiry date.'); return; }
      if (cardCvv.length < 3) { setError('Please enter your CVV.'); return; }
      if (!cardName.trim()) { setError('Please enter the cardholder name.'); return; }
    }
    if (method === 'upi' && !upiId.trim()) {
      setError('Please enter or scan a UPI ID.'); return;
    }

    setLoading(true);
    const isDemoBypass = method === 'card' && rawCard === '123412341234';

    setTimeout(() => {
      setLoading(false);
      const txnId = `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const paymentResult = {
        status: 'paid',
        method,
        transactionId: txnId,
        amount,
        cardLast4: method === 'card' ? (rawCard.slice(-4) || '1234') : null,
        paidAt: new Date().toISOString(),
        isDemoBypass
      };

      setSuccessData(paymentResult);
      setTimeout(() => { onPaymentSuccess(paymentResult); }, 1200);
    }, isDemoBypass ? 300 : 1500);
  };

  // ── Tab config ───────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'card', label: 'Card', Icon: CreditCard },
    { key: 'upi',  label: 'UPI / QR', Icon: Smartphone },
    { key: 'netbanking', label: 'Net Banking', Icon: Building2 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">

        {/* ── Header ── */}
        <div className="shrink-0 px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">TeleMed Secure Checkout</h3>
              <p className="text-[11px] text-blue-200">256-bit encrypted · PCI-DSS Level 1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-white disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Order Summary ── */}
        <div className="shrink-0 px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Consultation with</p>
            <p className="text-sm font-black text-slate-900">{doctorName}</p>
            <p className="text-[11px] text-blue-600 font-semibold">{specialization}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount</p>
            <p className="text-2xl font-black text-blue-700">&#x20B9;{amount}</p>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1">

          {/* Success screen */}
          {successData ? (
            <div className="p-8 text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-11 h-11 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">Your appointment is now confirmed.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-800">{successData.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Amount Paid</span>
                  <span className="font-bold text-emerald-700">&#x20B9;{successData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Method</span>
                  <span className="font-bold text-slate-800 capitalize">{successData.method}</span>
                </div>
              </div>
              {successData.isDemoBypass && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  Demo Card 123412341234 Bypass Activated
                </span>
              )}
              <p className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Confirming your consultation now...
              </p>
            </div>

          ) : (
            <div className="p-6 space-y-5">

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* ── Tabs ── */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100">
                {tabs.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setActiveTab(key); setError(null); }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                      activeTab === key
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ══════════ TAB: CARD ══════════ */}
              {activeTab === 'card' && (
                <div className="space-y-4">

                  {/* Demo bypass hint */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 border border-purple-100">
                    <div>
                      <p className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        Demo Bypass: <span className="font-mono tracking-widest">1234 1234 1234</span>
                      </p>
                      <p className="text-[11px] text-purple-600 mt-0.5">One-click instant test payment</p>
                    </div>
                    <button
                      type="button"
                      onClick={fillDemoBypassCard}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
                    >
                      Auto-Fill
                    </button>
                  </div>

                  {/* Card number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 1234 1234 1234"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm font-mono tracking-widest text-slate-900"
                      />
                      <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        CVV
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Cardholder name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Name as printed on card"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-slate-900"
                    />
                  </div>

                  {/* Pay button */}
                  <button
                    type="button"
                    disabled={loading || !cardNumber}
                    onClick={() => handleProcessPayment('card')}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Authorizing Payment...</span></>
                    ) : (
                      <><span>Pay &#x20B9;{amount} Securely</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {/* ══════════ TAB: UPI ══════════ */}
              {activeTab === 'upi' && (
                <div className="space-y-4">
                  {/* QR placeholder */}
                  <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="w-32 h-32 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                      <QrCode className="w-24 h-24 text-slate-700" />
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      Scan to Pay &#x20B9;{amount}
                    </span>
                    <span className="text-[10px] text-slate-400">Use any UPI app — GPay, PhonePe, Paytm, BHIM</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="font-semibold uppercase tracking-wider">or enter UPI ID</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Virtual Payment Address (UPI ID)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="mobile@upi  or  name@okhdfcbank"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm font-mono text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setUpiId('telemed.demo@upi')}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        Demo
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleProcessPayment('upi')}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying UPI...</span></>
                    ) : (
                      <><span>Pay &#x20B9;{amount} via UPI</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {/* ══════════ TAB: NET BANKING ══════════ */}
              {activeTab === 'netbanking' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Select Your Bank
                    </label>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      {banks.map(bank => (
                        <label
                          key={bank}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-colors ${
                            selectedBank === bank
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-700 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <input
                            type="radio"
                            name="bank"
                            checked={selectedBank === bank}
                            onChange={() => setSelectedBank(bank)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedBank === bank ? 'border-white bg-white' : 'border-slate-300'
                          }`}>
                            {selectedBank === bank && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                          </div>
                          {bank}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>You will be redirected to your bank's secure login portal to complete the payment.</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleProcessPayment('netbanking')}
                    className="w-full py-3.5 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Redirecting to Bank...</span></>
                    ) : (
                      <><span>Pay &#x20B9;{amount} via {selectedBank.split(' ')[0]}</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {/* Footer trust badges */}
              <div className="flex items-center justify-center gap-5 pt-1 text-[10px] text-slate-400 font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  PCI-DSS Compliant
                </span>
                <span>•</span>
                <span>100% Refundable on Cancellation</span>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
