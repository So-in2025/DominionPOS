
import React, { useState, useEffect } from 'react';
import { format, startOfToday, endOfToday, subDays, startOfMonth, differenceInDays, endOfDay } from 'date-fns';

type Preset = 'today' | 'last7' | 'thisMonth' | 'last30';

interface DateRangePickerProps {
  value: { 
    primary: { start: Date; end: Date };
    comparison: { start: Date; end: Date } | null;
  };
  onChange: (range: DateRangePickerProps['value']) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [activePreset, setActivePreset] = useState<Preset>('last7');
  const isComparing = !!value.comparison;

  // Actualizar preset activo si el rango de fechas cambia externamente
  useEffect(() => {
    // Lógica para determinar si el rango `value.primary` coincide con algún preset
    // Esta es una simplificación; una implementación completa sería más robusta.
    const diff = differenceInDays(value.primary.end, value.primary.start);
    if (diff === 0) setActivePreset('today');
    else if (diff === 6) setActivePreset('last7');
    else if (diff === 29) setActivePreset('last30');
    else {
        // Podríamos también comprobar `thisMonth`
        setActivePreset(null as any);
    }
  }, [value.primary]);

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset);
    let start, end;
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    switch (preset) {
      case 'today': start = todayStart; end = todayEnd; break;
      case 'last7': start = subDays(todayStart, 6); end = todayEnd; break;
      case 'thisMonth': start = startOfMonth(todayStart); end = todayEnd; break;
      case 'last30': start = subDays(todayStart, 29); end = todayEnd; break;
    }
    onChange({ ...value, primary: { start, end } });
  };
  
  const handleDateChange = (date: Date | null, type: 'primary' | 'comparison', boundary: 'start' | 'end') => {
    if (!date) return;
    if(type === 'primary') setActivePreset(null as any);

    const newRange = JSON.parse(JSON.stringify(value)); // Deep copy to handle dates

    if (boundary === 'start') {
        newRange[type].start = date.toISOString();
    } else {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        newRange[type].end = endDate.toISOString();
    }
    
    onChange({
        primary: { start: new Date(newRange.primary.start), end: new Date(newRange.primary.end) },
        comparison: newRange.comparison ? { start: new Date(newRange.comparison.start), end: new Date(newRange.comparison.end) } : null,
    });
  };

  const handleCompareToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
        const diff = differenceInDays(value.primary.end, value.primary.start);
        const compareEnd = subDays(value.primary.start, 1);
        const compareStart = subDays(compareEnd, diff);
        onChange({ 
            ...value, 
            comparison: { start: compareStart, end: endOfDay(compareEnd) } 
        });
    } else {
        onChange({ ...value, comparison: null });
    }
};

  const PresetButton: React.FC<{ preset: Preset, children: React.ReactNode }> = ({ preset, children }) => (
    <button
      onClick={() => handlePresetClick(preset)}
      className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
        activePreset === preset && !isComparing
          ? 'bg-dp-blue text-dp-light dark:bg-dp-gold dark:text-dp-dark'
          : 'bg-dp-soft-gray text-dp-dark-gray hover:bg-gray-300 dark:bg-dp-charcoal dark:text-dp-light-gray dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
  
  const DateInputs: React.FC<{ range: {start: Date, end: Date}, type: 'primary' | 'comparison'}> = ({ range, type }) => (
      <div className="flex items-center gap-2 text-sm">
        <input
            type="date"
            value={format(range.start, 'yyyy-MM-dd')}
            onChange={e => handleDateChange(e.target.valueAsDate, type, 'start')}
            className="p-1 rounded-md border bg-dp-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-dp-blue dark:focus:ring-dp-gold focus:outline-none"
        />
        <span className="text-gray-500">-</span>
         <input
            type="date"
            value={format(range.end, 'yyyy-MM-dd')}
            onChange={e => handleDateChange(e.target.valueAsDate, type, 'end')}
            className="p-1 rounded-md border bg-dp-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-dp-blue dark:focus:ring-dp-gold focus:outline-none"
        />
      </div>
  );

  return (
    <div className="bg-dp-light dark:bg-dp-charcoal p-2 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
                <PresetButton preset="today">Hoy</PresetButton>
                <PresetButton preset="last7">Últimos 7 días</PresetButton>
                <PresetButton preset="thisMonth">Este Mes</PresetButton>
                <PresetButton preset="last30">Últimos 30 días</PresetButton>
            </div>
            <DateInputs range={value.primary} type="primary" />
             <div className="flex items-center gap-2 pl-2 border-l-2 dark:border-gray-700">
                <input type="checkbox" id="compare-toggle" checked={isComparing} onChange={handleCompareToggle} className="w-4 h-4 rounded text-dp-blue dark:ring-offset-dp-charcoal dark:focus:ring-dp-gold focus:ring-dp-blue"/>
                <label htmlFor="compare-toggle" className="text-sm font-medium">Comparar</label>
            </div>
        </div>
        {isComparing && value.comparison && (
             <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 pt-2 border-t dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-full md:w-auto">Periodo anterior:</span>
                <DateInputs range={value.comparison} type="comparison" />
             </div>
        )}
    </div>
  );
};

export default DateRangePicker;
