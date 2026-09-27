'use client';

import React, { useState, useEffect } from 'react';
import { Quote, Sparkles, RefreshCw, Copy, Check, Sun, Award } from 'lucide-react';

interface MotivationQuote {
  quote: string;
  author: string;
  tag?: string;
}

const INSPIRATIONAL_QUOTES: MotivationQuote[] = [
  {
    quote: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
    author: "Dr. A.P.J. Abdul Kalam",
    tag: "Vision"
  },
  {
    quote: "If you want to walk fast, walk alone. But if you want to walk far, walk together.",
    author: "Ratan Tata",
    tag: "Teamwork"
  },
  {
    quote: "Arise, awake, and stop not till the goal is reached.",
    author: "Swami Vivekananda",
    tag: "Determination"
  },
  {
    quote: "Quality means doing it right when no one is looking.",
    author: "Henry Ford",
    tag: "Workmanship"
  },
  {
    quote: "None can destroy iron, but its own rust can. Likewise, none can destroy a person, but their own mindset can.",
    author: "Ratan Tata",
    tag: "Mindset"
  },
  {
    quote: "There is no substitute for hard work. 1% inspiration and 99% perspiration.",
    author: "Thomas A. Edison",
    tag: "Hard Work"
  },
  {
    quote: "Don't take rest after your first victory because if you fail in second, more lips are waiting to say that your first victory was just luck.",
    author: "Dr. A.P.J. Abdul Kalam",
    tag: "Perseverance"
  },
  {
    quote: "Energy and persistence conquer all things.",
    author: "Benjamin Franklin",
    tag: "Power & Grit"
  },
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    tag: "Passion"
  },
  {
    quote: "Ups and downs in life are very important to keep us going, because a straight line even in an ECG means we are not alive.",
    author: "Ratan Tata",
    tag: "Resilience"
  },
  {
    quote: "Excellence is not an act, but a habit. Consistent effort produces extraordinary precision.",
    author: "Aristotle",
    tag: "Excellence"
  },
  {
    quote: "Difficulties in your life do not come to destroy you, but to help you realize your hidden potential and power.",
    author: "Dr. A.P.J. Abdul Kalam",
    tag: "Strength"
  },
  {
    quote: "I do not believe in taking the right decisions. I take decisions and then make them right.",
    author: "Ratan Tata",
    tag: "Leadership"
  },
  {
    quote: "Take risks in your life. If you win, you can lead; if you lose, you can guide.",
    author: "Swami Vivekananda",
    tag: "Courage"
  },
  {
    quote: "A satisfied customer is the best business strategy of all. Build trust with every delivery.",
    author: "Michael LeBoeuf",
    tag: "Customer Focus"
  },
  {
    quote: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
    tag: "Growth"
  },
  {
    quote: "To succeed in your mission, you must have single-minded devotion to your goal.",
    author: "Dr. A.P.J. Abdul Kalam",
    tag: "Focus"
  },
  {
    quote: "Great things in business are never done by one person; they are done by a dedicated team.",
    author: "Steve Jobs",
    tag: "Collaboration"
  },
  {
    quote: "Precision, reliability, and safety are the hallmarks of true industrial mastery.",
    author: "Power Lines Electrical Works",
    tag: "Integrity"
  },
  {
    quote: "It always seems impossible until it is done.",
    author: "Nelson Mandela",
    tag: "Possibility"
  },
  {
    quote: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
    tag: "Execution"
  },
  {
    quote: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
    tag: "Initiative"
  },
  {
    quote: "Do not wait; the time will never be 'just right'. Start where you stand, and work with whatever tools you have.",
    author: "Napoleon Hill",
    tag: "Drive"
  },
  {
    quote: "Strength does not come from physical capacity. It comes from an indomitable will.",
    author: "Mahatma Gandhi",
    tag: "Willpower"
  },
  {
    quote: "Look at the sky. We are not alone. The whole universe is friendly to us and conspires only to give the best to those who dream and work.",
    author: "Dr. A.P.J. Abdul Kalam",
    tag: "Optimism"
  }
];

export default function DailyQuote() {
  const [mounted, setMounted] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    
    // Deterministic daily index: changes automatically at midnight
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const dailyIndex = (today.getFullYear() * 365 + dayOfYear) % INSPIRATIONAL_QUOTES.length;
    setQuoteIndex(dailyIndex);

    // Format today's date for display
    try {
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      };
      setFormattedDate(today.toLocaleDateString('en-IN', options));
    } catch {
      setFormattedDate(today.toDateString());
    }
  }, []);

  const currentQuote = INSPIRATIONAL_QUOTES[quoteIndex] || INSPIRATIONAL_QUOTES[0];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % INSPIRATIONAL_QUOTES.length);
  };

  const handleCopy = () => {
    const text = `"${currentQuote.quote}" — ${currentQuote.author}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!mounted) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-100 border border-amber-200/60 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-widest">
          <Sun className="w-4 h-4 text-amber-600 animate-spin" />
          <span>Daily Inspiration</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
      {/* Decorative background watermarks */}
      <div className="absolute -right-4 -bottom-6 text-amber-200/25 pointer-events-none select-none">
        <Quote className="w-32 h-32 rotate-12" />
      </div>
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-200/30 via-orange-100/20 to-transparent rounded-bl-full pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Tag, Date & Quote Content */}
        <div className="space-y-2.5 max-w-3xl">
          {/* Header Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
              <Sparkles className="w-3 h-3" />
              Daily Inspiration
            </span>

            {currentQuote.tag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200/60">
                <Award className="w-2.5 h-2.5 text-amber-600" />
                {currentQuote.tag}
              </span>
            )}

            {formattedDate && (
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500" />
                {formattedDate}
              </span>
            )}
          </div>

          {/* Main Quote */}
          <div className="relative pl-3 border-l-2 border-amber-400">
            <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed italic tracking-tight">
              &ldquo;{currentQuote.quote}&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-4 h-0.5 bg-amber-500 rounded-full" />
              <p className="text-xs font-bold text-amber-900 tracking-wide">
                {currentQuote.author}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Interactive Actions */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={handleCopy}
            title="Copy Quote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-800 bg-white hover:bg-amber-100/60 border border-slate-200 hover:border-amber-300 transition-all shadow-xs cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleNextQuote}
            title="Next Inspiring Quote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-300/80 transition-all shadow-xs cursor-pointer group/btn"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-700 transition-transform group-hover/btn:rotate-180 duration-500" />
            <span className="text-[11px]">Next Quote</span>
          </button>
        </div>
      </div>
    </div>
  );
}
