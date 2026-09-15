"use client";

import React, { useEffect, useState } from "react";
import { X, Scale } from "lucide-react";
import { FocusTrap } from "./FocusTrap";

interface GuardrailRule {
  id: string;
  name?: string;
  label?: string;
  section?: string;
  rule_ref?: string;
  required?: boolean;
  mandatory?: boolean;
  description?: string;
  statutory_basis?: string;
  primary_regex?: string;
  patterns?: string[];
}

interface RuleInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleInspectorModal: React.FC<RuleInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/rules")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load rules");
        return res.json();
      })
      .then((data) => {
        setRules(data.rules || data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Rule fetch failed:", err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-inspector-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FocusTrap onEscape={onClose} className="w-full sm:max-w-3xl flex justify-center">
        <div
          className="glass-panel w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl border border-white/10 dark:border-white/10 light:border-slate-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] shadow-2xl animate-sheet-up sm:animate-in sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Sheet Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 dark:bg-white/20 light:bg-slate-300 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 px-6 py-4 bg-white/[0.02] dark:bg-white/[0.02] light:bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <Scale className="h-5 w-5 text-amber-400" />
              <div>
                <h3 id="rule-inspector-title" className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Legal Metrology Statutory Guardrails
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-400 light:text-slate-500">
                  The Legal Metrology (Packaged Commodities) Rules, 2011 // Rule 6 Declarations
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close rules inspector"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 light:bg-amber-50 light:border-amber-200 p-3.5 text-xs text-amber-200/90 dark:text-amber-200/90 light:text-amber-900 leading-relaxed">
              Every pre-packaged commodity in India is legally mandated to display declarations under <strong>Rule 6</strong> of the Legal Metrology (Packaged Commodities) Rules, 2011. Non-declaration or misleading declaration is punishable under <strong>Section 36</strong> with fines up to ₹1,00,000 or imprisonment.
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 light:text-slate-500 text-xs font-mono">
                Loading statutory definitions...
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, idx) => {
                  const title = rule.label || rule.name || rule.id || `Rule 6 Declaration`;
                  const section = rule.rule_ref || rule.section || `Rule 6`;
                  const isMandatory = (rule.required ?? rule.mandatory ?? true);
                  const description = rule.description || rule.statutory_basis;
                  const pattern = rule.primary_regex || (rule.patterns && rule.patterns[0]);

                  return (
                    <div
                      key={rule.id || idx}
                      className="rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.02] dark:bg-white/[0.02] light:bg-white light:shadow-xs p-4 hover:border-amber-500/30 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 dark:text-amber-400 light:text-amber-700">
                            {section}
                          </span>
                          <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">|</span>
                          <h4 className="text-sm font-semibold text-white dark:text-white light:text-slate-900">
                            {title}
                          </h4>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${
                            isMandatory
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 light:bg-amber-100 light:text-amber-800"
                              : "bg-gray-700/50 text-gray-400 light:bg-slate-100 light:text-slate-600 light:border light:border-slate-200/80"
                          }`}
                        >
                          {isMandatory ? "Mandatory" : "Conditional"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-300 dark:text-gray-300 light:text-slate-600 leading-relaxed">
                        {description}
                      </p>

                      {pattern && (
                        <div className="mt-2">
                          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-500 light:text-slate-500">
                            Primary Guardrail Regex:
                          </span>
                          <pre className="mt-0.5 rounded bg-black/60 dark:bg-black/60 light:bg-slate-50 p-1.5 font-mono text-[11px] text-amber-300/80 dark:text-amber-300/80 light:text-amber-800 border border-transparent dark:border-transparent light:border-slate-200 overflow-x-auto">
                            {pattern}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-white/10 dark:border-white/10 light:border-slate-200 px-6 py-3 bg-black/30 dark:bg-black/30 light:bg-slate-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 dark:bg-white/10 light:bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-slate-800 transition active:scale-95"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};
