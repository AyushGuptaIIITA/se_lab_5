import React from 'react';
import { Sun, Sunset, Moon, Pill, Utensils, AlertCircle } from 'lucide-react';

/**
 * Visual Daily Pill Schedule for rural patients & caregivers.
 * Categorizes medications into Morning, Afternoon, and Night routines.
 */
export default function DailyPillSchedule({ medications = [] }) {
  if (!medications || medications.length === 0) return null;

  // Classify medications based on frequency or instructions
  const classify = (med) => {
    const freq = (med.frequency || '').toLowerCase();
    const inst = (med.instructions || '').toLowerCase();

    let morning = false;
    let afternoon = false;
    let night = false;

    if (freq.includes('thrice') || freq.includes('3 times') || freq.includes('every 8 hours')) {
      morning = true;
      afternoon = true;
      night = true;
    } else if (freq.includes('twice') || freq.includes('2 times') || freq.includes('every 12 hours')) {
      morning = true;
      night = true;
    } else if (freq.includes('bedtime') || freq.includes('night') || inst.includes('bedtime') || inst.includes('night')) {
      night = true;
    } else if (freq.includes('once') || freq.includes('morning') || inst.includes('morning') || inst.includes('breakfast')) {
      morning = true;
    } else {
      // Default to morning
      morning = true;
    }

    let foodTiming = 'After food';
    if (inst.includes('before') || inst.includes('empty stomach') || inst.includes('30 min')) {
      foodTiming = 'Before food';
    } else if (inst.includes('with food') || inst.includes('during meal')) {
      foodTiming = 'With meals';
    } else if (inst.includes('sos') || inst.includes('needed')) {
      foodTiming = 'As needed';
    }

    return { morning, afternoon, night, foodTiming };
  };

  const morningMeds = [];
  const afternoonMeds = [];
  const nightMeds = [];

  medications.forEach(m => {
    const { morning, afternoon, night, foodTiming } = classify(m);
    if (morning) morningMeds.push({ ...m, foodTiming });
    if (afternoon) afternoonMeds.push({ ...m, foodTiming });
    if (night) nightMeds.push({ ...m, foodTiming });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
          <Utensils className="w-4 h-4 text-blue-600" />
          <span>Patient Visual Daily Pill Schedule (Rural Comprehension)</span>
        </h4>
        <span className="text-[11px] text-slate-500 font-medium">Daily Medicine Routine</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Morning Routine */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">Morning (सुबह)</p>
                <p className="text-[10px] text-amber-700">8:00 AM · Breakfast</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {morningMeds.length}
            </span>
          </div>

          {morningMeds.length === 0 ? (
            <p className="text-[11px] text-amber-600/80 italic py-2">No morning medicines</p>
          ) : (
            <div className="space-y-1.5">
              {morningMeds.map((med, i) => (
                <div key={i} className="p-2 rounded-xl bg-white border border-amber-200/80 text-xs space-y-0.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 truncate">{med.name}</p>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    🍲 {med.foodTiming} · <span className="text-slate-400">{med.duration}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Afternoon Routine */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
                <Sunset className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-950">Afternoon (दोपहर)</p>
                <p className="text-[10px] text-blue-700">1:00 PM · Lunch</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
              {afternoonMeds.length}
            </span>
          </div>

          {afternoonMeds.length === 0 ? (
            <p className="text-[11px] text-blue-600/80 italic py-2">No afternoon medicines</p>
          ) : (
            <div className="space-y-1.5">
              {afternoonMeds.map((med, i) => (
                <div key={i} className="p-2 rounded-xl bg-white border border-blue-200/80 text-xs space-y-0.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 truncate">{med.name}</p>
                    <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    🍲 {med.foodTiming} · <span className="text-slate-400">{med.duration}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Night Routine */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-950">Night (रात)</p>
                <p className="text-[10px] text-indigo-700">9:00 PM · Bedtime</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
              {nightMeds.length}
            </span>
          </div>

          {nightMeds.length === 0 ? (
            <p className="text-[11px] text-indigo-600/80 italic py-2">No night medicines</p>
          ) : (
            <div className="space-y-1.5">
              {nightMeds.map((med, i) => (
                <div key={i} className="p-2 rounded-xl bg-white border border-indigo-200/80 text-xs space-y-0.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 truncate">{med.name}</p>
                    <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    🍲 {med.foodTiming} · <span className="text-slate-400">{med.duration}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
