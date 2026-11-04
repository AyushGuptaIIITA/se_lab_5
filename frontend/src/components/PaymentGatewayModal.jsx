import React, { useState } from 'react';
import { 
  X, CreditCard, QrCode, Building2, CheckCircle2, ShieldCheck, 
  Loader2, ArrowRight, Sparkles, AlertCircle, Smartphone, Lock
} from 'lucide-react';

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount = 200,
  doctorName = 'Specialist',
  specialization = 'Consultation',
  onPaymentSuccess
}) {
  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'upi' | 'netbanking'
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

  // Quick fill demo bypass card: 123412341234
  const fillDemoBypassCard = () => {
    setCardNumber('123412341234');
    setCardExpiry('12/28');
    setCardCvv('123');
    setCardName('Demo Patient');
    setError(null);
  };

  const handleProcessPayment = (method) => {
    setError(null);
    setLoading(true);

    // Check card bypass rule: 123412341234
    const isDemoBypass = method === 'card' && cardNumber.replace(/\s/g, '') === '123412341234';

    setTimeout(() => {
      setLoading(false);
      const txnId = `TXN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const paymentResult = {
        status: 'paid',
        method,
        transactionId: txnId,
        amount,
        cardLast4: method === 'card' ? (cardNumber.replace(/\s/g, '').slice(-4) || '1234') : null,
        paidAt: new Date().toISOString(),
        isDemoBypass
      };

      setSuccessData(paymentResult);

      setTimeout(() => {
        onPaymentSuccess(paymentResult);
      }, 1200);
    }, isDemoBypass ? 300 : 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">TeleMed Secure Payment Gateway</h3>
              <p className="text-xs text-blue-100">256-Bit Encrypted Healthcare Checkout</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="px-6 py-3.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-semibold">Consultation with </span>
            <strong className="text-slate-900">{doctorName}</strong>
            <span className="text-blue-600 block text-[11px] font-medium">{specialization}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Fee</span>
            <span className="text-lg font-black text-blue-700">₹{amount}</span>
          </div>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900">Payment Verified & Successful!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Transaction ID: <span className="font-mono font-bold text-slate-700">{successData.transactionId}</span>
              </p>
              {successData.isDemoBypass && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  ⚡ Demo Card 123412341234 Bypass Activated
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-700 font-semibold">Confirming your consultation appointment now...</p>
          </div>
        ) : (
          <div className="p-6 space-y-5 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'card' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'upi' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'netbanking' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Net Banking</span>
              </button>
            </div>

            {/* TAB 1: CARDS */}
            {activeTab === 'card' && (
              <div className="space-y-3.5">
                {/* Demo Card Bypass Pill */}
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-purple-900 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Demo Bypass Card: 123412341234</span>
                    </span>
                    <p className="text-[11px] text-purple-700">One-click instant payment test bypass</p>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoBypassCard}
                    className="px-3 py-1.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-2xs transition-colors"
                  >
                    Auto-Fill
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Card Number (कार्ड नंबर) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1234 1234 1234 or 16-digit card"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white font-mono"
                    />
                    <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="Name as on card"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-xs bg-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || !cardNumber}
                  onClick={() => handleProcessPayment('card')}
                  className="w-full mt-2 py-3 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing Secure Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹{amount} with Card</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: UPI */}
            {activeTab === 'upi' && (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block mx-auto shadow-2xs">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 mx-auto flex flex-col items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-800" />
                    <span className="text-[10px] font-bold text-blue-700 mt-1">SCAN TO PAY ₹{amount}</span>
                  </div>
                </div>

                <div className="text-left space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Or Enter Virtual Payment Address (UPI ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi, name@okhdfcbank"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="glass-input flex-1 px-3 py-2 rounded-xl text-xs bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setUpiId('telemed.patient@upi')}
                      className="px-3 py-2 rounded-xl text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                    >
                      Demo UPI
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleProcessPayment('upi')}
                  className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying UPI Mandate...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Pay ₹{amount} via UPI</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 3: NET BANKING */}
            {activeTab === 'netbanking' && (
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Select Your Bank (बैंक चुनें)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50">
                  {banks.map(bank => (
                    <label 
                      key={bank}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-colors ${
                        selectedBank === bank ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-white text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bank"
                        checked={selectedBank === bank}
                        onChange={() => setSelectedBank(bank)}
                        className="text-blue-600"
                      />
                      <span>{bank}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleProcessPayment('netbanking')}
                  className="w-full mt-2 py-3 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Redirecting to Bank Portal...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹{amount} via {selectedBank.split(' ')[0]}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center space-x-4 text-[10px] text-slate-400 font-semibold">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>PCI-DSS Level 1 Compliant</span>
              </span>
              <span>•</span>
              <span>100% Refundable on Cancellation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
