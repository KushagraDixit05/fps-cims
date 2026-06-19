"use client";
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  dateFrom: string | null;
  dateTo:   string | null;
  onFrom:   (d: string | null) => void;
  onTo:     (d: string | null) => void;
}

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function DateRangePicker({ dateFrom, dateTo, onFrom, onTo }: Props) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hover, setHover] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function handleDay(ymd: string) {
    if (!dateFrom || (dateFrom && dateTo)) {
      // Start fresh
      onFrom(ymd);
      onTo(null);
    } else {
      // dateFrom is set, no dateTo yet
      if (ymd < dateFrom) {
        onFrom(ymd);
        onTo(dateFrom);
      } else {
        onTo(ymd);
      }
    }
  }

  function inRange(ymd: string): boolean {
    const lo = dateFrom;
    const hi = dateTo ?? (hover && dateFrom && !dateTo ? (hover > dateFrom ? hover : null) : null);
    if (!lo || !hi) return false;
    return ymd > lo && ymd < hi;
  }

  function isFrom(ymd: string) { return ymd === dateFrom; }
  function isTo(ymd: string)   { return ymd === dateTo; }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toYMD(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const todayYMD = toYMD(today);
  const hasRange = !!(dateFrom || dateTo);

  return (
    <div className="pb-1">
      {/* Selected range summary */}
      {hasRange && (
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[11px]" style={{ color: 'var(--accent)' }}>
            {dateFrom ? parseYMD(dateFrom).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
            {' → '}
            {dateTo   ? parseYMD(dateTo).toLocaleDateString('en-IN',   { day:'numeric', month:'short' }) : '…'}
          </span>
          <button
            onClick={() => { onFrom(null); onTo(null); }}
            className="p-0.5 rounded"
            style={{ color: 'var(--text-lo)' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button onClick={prevMonth} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-lo)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-hi)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-lo)')}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-hi)' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-lo)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-hi)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-lo)')}
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[9px] font-bold uppercase" style={{ color: 'var(--text-lo)' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid grid-cols-7"
        onMouseLeave={() => setHover(null)}
      >
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`e-${i}`} />;

          const from    = isFrom(ymd);
          const to      = isTo(ymd);
          const inRng   = inRange(ymd);
          const isToday = ymd === todayYMD;
          const isEndpoint = from || to;

          return (
            <button
              key={ymd}
              onClick={() => handleDay(ymd)}
              onMouseEnter={() => setHover(ymd)}
              className="relative flex items-center justify-center"
              style={{
                height: 28,
                background: isEndpoint
                  ? 'var(--accent)'
                  : inRng
                    ? 'rgba(52,224,138,0.15)'
                    : 'transparent',
                borderRadius: from ? '6px 0 0 6px' : to ? '0 6px 6px 0' : isEndpoint ? 6 : 0,
                color: isEndpoint
                  ? '#05080A'
                  : 'var(--text-hi)',
              }}
            >
              <span className="text-[11px] font-medium leading-none z-10 relative">
                {parseInt(ymd.split('-')[2], 10)}
              </span>
              {/* Today dot */}
              {isToday && !isEndpoint && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
