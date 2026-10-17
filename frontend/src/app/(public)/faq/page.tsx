'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Layers, 
  Award, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 'dup-1',
    category: 'Duplicate Handling',
    question: 'How does CivicPulse detect and cluster duplicate complaints?',
    answer: 'When a resident reports an issue, our spatial engine scans a 120-meter radius for existing complaints within the same category. Next, our neural embedding model calculates visual cosine similarity on the submitted imagery. If similarity exceeds 85%, the new report is automatically clustered into the master ticket. The citizen still gets their own distinct tracking reference, but field crews receive one unified emergency ticket to avoid redundant crew deployment.'
  },
  {
    id: 'dup-2',
    category: 'Duplicate Handling',
    question: 'Does merging my complaint as a duplicate lower its urgency?',
    answer: 'No! In fact, the opposite occurs. Every confirmed duplicate citizen report adds multiplier points to the Priority Score (up to +25 points). A pothole reported by 6 separate residents within a few hours elevates rapidly from Medium to High Priority, triggering accelerated municipal dispatch.'
  },
  {
    id: 'score-1',
    category: 'Priority Scores',
    question: 'How is the Priority Score (0 to 100) mathematically calculated?',
    answer: 'The Priority Score is calculated using a deterministic multi-factor rubric: Category Severity Base (up to 35 pts) + Duplicate Count Multiplier (up to 25 pts) + Sensitive Zone Proximity (up to 20 pts for school, hospital, and transit corridors) + Elapsed Unresolved Age (up to 15 pts) + Verified Photo EXIF data (up to 5 pts). Scores ≥ 70 are classified High, 40–69 Medium, and < 40 Low.'
  },
  {
    id: 'score-2',
    category: 'Priority Scores',
    question: 'What are the municipal response SLAs for each priority tier?',
    answer: 'High Priority (≥70) incidents trigger automated notification to on-duty crews within 30 minutes, with target field containment under 4 hours. Medium Priority (40–69) targets crew inspection within 24 hours. Low Priority (<40) issues are batched into routine bi-weekly maintenance schedules.'
  },
  {
    id: 'evid-1',
    category: 'Evidence Verification',
    question: 'What is the Resolution Evidence Card and verified "After Photo"?',
    answer: 'Before a ticket can be transitioned to "Resolved", municipal field technicians must upload high-resolution photographic proof of completed work (e.g., cleared culvert, sealed pothole, restored luminaire). Citizens can inspect this side-by-side with their original submission.'
  },
  {
    id: 'evid-2',
    category: 'Evidence Verification',
    question: 'What is the 72-Hour "Reopen Issue" protection policy?',
    answer: 'Citizens have an active 72-hour reopen window following ticket closure. If a repair fails or debris was only partially cleared, you can click "Reopen Issue" with an explanation note. The ticket is immediately elevated back to supervisory inspection without requiring you to re-file.'
  },
  {
    id: 'priv-1',
    category: 'Privacy & Data',
    question: 'Is my personal contact information displayed publicly?',
    answer: 'Never. CivicPulse strictly implements ISO 18091 and Open311 data minimization. You can file completely anonymously, or provide contact details solely for SMS dispatch updates. Names, phone numbers, and facial features captured in photos are encrypted and never shown on public map feeds.'
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>('dup-1');

  const categories = ['All', 'Duplicate Handling', 'Priority Scores', 'Evidence Verification', 'Privacy & Data'];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen py-8 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2 sm:space-y-3 border-b border-[var(--border-subtle)] pb-6 sm:pb-8">
        <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[var(--brand-primary)] font-semibold">
          MUNICIPAL KNOWLEDGE BASE // SC-01
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          Documentation covering automated category suggestions, deterministic priority scoring, spatial duplicate clustering, and field verification protocols.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 sm:left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search FAQs (e.g. duplicate, priority score, after photo)..."
          className="w-full pl-10 sm:pl-11 pr-16 sm:pr-20 py-2.5 sm:py-3 bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs sm:text-sm focus:outline-none focus:border-[var(--text-primary)] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 sm:top-3.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Category Filter Bar - Horizontal Scroll on Mobile with Edge-to-Edge bleed */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider whitespace-nowrap border shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-[var(--text-primary)] text-[var(--canvas-base)] border-[var(--text-primary)] font-semibold'
                : 'bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Searchable Accordion List */}
      <div className="border border-[var(--border-subtle)] bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)] rounded-sm overflow-hidden">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className={`transition-colors ${
                  isExpanded ? 'bg-[var(--surface-elevated)]/60' : 'hover:bg-[var(--surface-elevated)]/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4 sm:p-6 text-left flex items-start justify-between gap-3 sm:gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="font-mono text-[9px] sm:text-[10px] font-semibold text-[var(--brand-primary)] uppercase tracking-widest block">
                      {faq.category}
                    </span>
                    <h3 className="text-xs sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {faq.question}
                    </h3>
                  </div>

                  <div className="w-6 h-6 sm:w-7 sm:h-7 border border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-2 sm:pt-3 border-t border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 sm:p-12 text-center space-y-2">
            <HelpCircle className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Matching Questions Found</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Try adjusting your search terms or reach out through our Contact Directory.
            </p>
          </div>
        )}
      </div>

      {/* Direct Assistance Callout */}
      <div className="p-4 sm:p-6 bg-[var(--surface-card)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 text-xs rounded-sm">
        <div>
          <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] block">Need direct municipal assistance?</span>
          <span className="text-[var(--text-secondary)] text-[11px] sm:text-xs">Our public works operations desk is available during municipal hours.</span>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 stitch-btn-accent font-mono text-xs uppercase tracking-wider font-semibold shrink-0 w-full sm:w-auto text-center"
        >
          <span>Contact Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
