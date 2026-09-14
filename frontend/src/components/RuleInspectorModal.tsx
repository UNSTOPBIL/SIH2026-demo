"use client";

import React, { useEffect, useState } from "react";
import { X, Scale, ExternalLink, ShieldCheck } from "lucide-react";
import { StatutoryRuleDefinition } from "../types/scanner";

interface RuleInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleInspectorModal: React.FC<RuleInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/rules")
        .then((res) => res.json())
        .then((data) => {
          setRules(data.rules || []);
          setLoading(false);
        })
        .catch(() => {
          // Fallback static rules if API is offline
          setRules([
            {
              id: "mrp",
              name: "Maximum Retail Price (MRP)",
              section: "Rule 6(1)(e)",
              mandatory: true,
              statutory_basis: "Retail sale price inclusive of all taxes with standard Rupee symbol / INR prefix.",
            },
            {
              id: "net_quantity",
              name: "Net Quantity Declaration",
              section: "Rule 6(1)(c)",
              mandatory: true,
              statutory_basis: "Declared in standard metric units (g, kg, ml, l, piece).",
            },
            {
              id: "manufacturer",
              name: "Manufacturer / Packer / Marketer Details",
              section: "Rule 6(1)(a)",
              mandatory: true,
              statutory_basis: "Name and complete address of the manufacturer, packer, distributor, or marketer.",
            },
            {
              id: "date_marking",
              name: "Month & Year of Manufacture / Packing",
              section: "Rule 6(1)(d)",
              mandatory: true,
              statutory_basis: "Month and year of manufacture or packing clearly stated.",
            },
            {
              id: "consumer_care",
              name: "Consumer Care Contact Information",
              section: "Rule 6(1)(f)",
              mandatory: true,
              statutory_basis: "Name, address, telephone number, and email address of grievance officer.",
            },
            {
              id: "commodity_name",
              name: "Generic Commodity Name",
              section: "Rule 6(1)(b)",
              mandatory: true,
              statutory_basis: "Common or generic name of the commodity contained in the package.",
            },
            {
              id: "country_of_origin",
              name: "Country of Origin (Imported Goods)",
              section: "Rule 6(10)",
              mandatory: false,
              statutory_basis: "Mandatory for imported commodities, optional for domestic commodities.",
            },
          ]);
          setLoading(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-inspector-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-amber-400" />
            <div>
              <h3 id="rule-inspector-title" className="text-base font-bold text-white">
                Legal Metrology Statutory Guardrails
              </h3>
              <p className="text-xs text-gray-400">
                The Legal Metrology (Packaged Commodities) Rules, 2011 // Rule 6 Declarations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules inspector"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200/90 leading-relaxed">
            Every pre-packaged commodity in India is legally mandated to display declarations under <strong>Rule 6</strong> of the Legal Metrology (Packaged Commodities) Rules, 2011. Non-declaration or misleading declaration is punishable under <strong>Section 36</strong> with fines up to ₹1,00,000 or imprisonment.
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-400 text-xs font-mono">
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
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {section}
                        </span>
                        <span className="text-gray-600">|</span>
                        <h4 className="text-sm font-semibold text-white">
                          {title}
                        </h4>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${
                          isMandatory
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-gray-700/50 text-gray-400"
                        }`}
                      >
                        {isMandatory ? "Mandatory" : "Conditional"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                      {description}
                    </p>

                    {pattern && (
                      <div className="mt-2">
                        <span className="text-[11px] font-mono text-gray-500">
                          Primary Guardrail Regex:
                        </span>
                        <pre className="mt-0.5 rounded bg-black/60 p-1.5 font-mono text-[11px] text-amber-300/80 overflow-x-auto">
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
        <div className="border-t border-white/10 px-6 py-3 bg-black/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
