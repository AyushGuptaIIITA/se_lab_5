import React, { useState, useEffect } from 'react';
import { Globe, MapPin, Building, Home, Search, Loader2 } from 'lucide-react';
import { 
  POPULAR_COUNTRIES, 
  INDIAN_STATES, 
  fetchStates, 
  fetchDistricts, 
  lookupPostalPincode 
} from '../services/locationApi';

export default function LocationSelector({
  country = 'India',
  state = '',
  district = '',
  village = '',
  pincode = '',
  onChange,
  disabled = false,
  showPincode = true
}) {
  const [countries] = useState(POPULAR_COUNTRIES);
  const [statesList, setStatesList] = useState(INDIAN_STATES);
  const [districtsList, setDistrictsList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [lookingUpPincode, setLookingUpPincode] = useState(false);

  // Load States whenever Country changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingStates(true);
      const res = await fetchStates(country || 'India');
      if (mounted) {
        setStatesList(res || INDIAN_STATES);
        setLoadingStates(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [country]);

  // Load Districts whenever State changes
  useEffect(() => {
    let mounted = true;
    if (!state) {
      setDistrictsList([]);
      return;
    }
    const load = async () => {
      setLoadingDistricts(true);
      const res = await fetchDistricts(country || 'India', state);
      if (mounted) {
        setDistrictsList(res || []);
        setLoadingDistricts(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [country, state]);

  // Pincode auto-lookup
  const handlePincodeChange = async (val) => {
    onChange('pincode', val);
    if (val.trim().length === 6) {
      setLookingUpPincode(true);
      const info = await lookupPostalPincode(val);
      setLookingUpPincode(false);
      if (info) {
        if (info.state) onChange('state', info.state);
        if (info.district) onChange('district', info.district);
        if (info.villages?.length > 0) {
          setVillagesList(info.villages);
          onChange('village', info.villages[0]);
        }
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Country Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Country (देश) *</span>
          </label>
          <select
            value={country || 'India'}
            disabled={disabled}
            onChange={(e) => {
              onChange('country', e.target.value);
              onChange('state', '');
              onChange('district', '');
              onChange('village', '');
            }}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs bg-white font-medium"
          >
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* State Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>State / Province (राज्य) *</span>
            {loadingStates && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
          </label>
          <select
            value={state}
            disabled={disabled || loadingStates}
            onChange={(e) => {
              onChange('state', e.target.value);
              onChange('district', '');
              onChange('village', '');
            }}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs bg-white font-medium"
          >
            <option value="">Select State...</option>
            {statesList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* District Dropdown */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>District / City (ज़िला / शहर) *</span>
            {loadingDistricts && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
          </label>
          <select
            value={district}
            disabled={disabled || !state}
            onChange={(e) => {
              onChange('district', e.target.value);
            }}
            className="glass-input w-full px-3 py-2.5 rounded-xl text-xs bg-white font-medium"
          >
            <option value="">Select District...</option>
            {districtsList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Village / Town Dropdown with input fallback */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>Village / Town / Area (गाँव / कस्बा) *</span>
          </label>
          {villagesList.length > 0 ? (
            <div className="space-y-1">
              <select
                value={village}
                disabled={disabled}
                onChange={(e) => onChange('village', e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs bg-white font-medium"
              >
                <option value="">Select Village / Post Area...</option>
                {villagesList.map((v, i) => (
                  <option key={`${v}-${i}`} value={v}>{v}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setVillagesList([])}
                className="text-[10px] text-blue-600 hover:underline"
              >
                Type custom village/town name instead
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder="e.g. Rampur, Sunderpur, Village/Locality"
              value={village}
              disabled={disabled}
              onChange={(e) => onChange('village', e.target.value)}
              className="glass-input w-full px-3 py-2.5 rounded-xl text-xs bg-white font-medium"
            />
          )}
        </div>
      </div>

      {/* Pincode with Auto-fill helper */}
      {showPincode && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              PIN Code (डाक पिन कोड)
            </label>
            {lookingUpPincode && (
              <span className="text-[10px] text-blue-600 font-semibold flex items-center space-x-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking Postal API...</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              placeholder="6-digit PIN code (e.g. 221001)"
              value={pincode}
              disabled={disabled}
              onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            💡 Enter 6-digit PIN code to automatically detect State, District & Villages via Indian Postal API
          </span>
        </div>
      )}
    </div>
  );
}
